import pytest
from fastapi.testclient import TestClient

from app.analysis import validate_evidence
from app.main import app, requests_at
from app.schemas import AnalyzeRequest, Assessment, Signal


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("CHATGUARD_API_TOKEN", "test-token")
    requests_at.clear()
    with TestClient(app) as client:
        yield client


def payload(texts, sender="other", **kwargs):
    return {"conversation_id": "demo:a", "session_id": "session-1", "revision": 1,
            "messages": [{"id": f"m{i}", "sender": sender, "text": text} for i, text in enumerate(texts)], **kwargs}


HEADERS = {"X-ChatGuard-Token": "test-token"}


def test_recruitment_escalation(client):
    body = payload(["Tuyen ctv lam nhiem vu nhan hoa hong", "e ck 300k kich hoat, xong hoan lai", "suat cuoi, dung hoi admin khac"])
    result = client.post("/api/analyze", json=body, headers=HEADERS).json()
    assert result["level"] == "high_concern"
    assert result["provider"] == "rules"
    assert result["session_id"] == "session-1"
    assert all(set(s["evidence_ids"]) <= {"m0", "m1", "m2"} for s in result["signals"])


def test_normal_and_self_are_not_accusations(client):
    body = payload(["Gửi mình bài tập nhé", "Chiều gặp ở thư viện"])
    assert client.post("/api/analyze", json=body, headers=HEADERS).json()["level"] == "no_signal"
    body = payload(["Gửi OTP, chuyển khoản ngay"], sender="self")
    assert client.post("/api/analyze", json=body, headers=HEADERS).json()["level"] == "no_signal"


def test_negation(client):
    body = payload(["Đừng cung cấp OTP cho người lạ"])
    assert client.post("/api/analyze", json=body, headers=HEADERS).json()["level"] == "no_signal"


def test_authorization_and_origins(client):
    body = payload(["hello"])
    assert client.post("/api/analyze", json=body).status_code == 401
    assert client.post("/api/analyze", json=body, headers={**HEADERS, "Origin": "https://evil.example"}).status_code == 403
    assert client.post("/api/analyze", json=body, headers={**HEADERS, "Origin": "chrome-extension://" + "a" * 32}).status_code == 200


def test_external_requires_consent_and_key(client, monkeypatch):
    body = payload(["hello"], provider="groq")
    assert client.post("/api/analyze", json=body, headers=HEADERS).status_code == 403
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    body["external_consent"] = True
    assert client.post("/api/analyze", json=body, headers=HEADERS).status_code == 503


def test_duplicate_and_oversized_input(client):
    body = payload(["one", "two"])
    body["messages"][1]["id"] = "m0"
    assert client.post("/api/analyze", json=body, headers=HEADERS).status_code == 422
    body = payload(["a" * 4000] * 7)
    assert client.post("/api/analyze", json=body, headers=HEADERS).status_code == 422


def test_unknown_sender(client):
    result = client.post("/api/analyze", json=payload(["gửi otp"], sender="unknown"), headers=HEADERS)
    assert result.json()["level"] == "insufficient_context"


def test_invalid_evidence_rejected():
    request = AnalyzeRequest(**payload(["hello"]))
    assessment = Assessment(level="high_concern", summary="test", signals=[Signal(kind="test", title="test", evidence_ids=["fake"])], actions=[], limitations=[])
    with pytest.raises(ValueError):
        validate_evidence(assessment, request)


def test_rate_limit(client):
    body = payload(["hello"])
    for _ in range(20):
        assert client.post("/api/analyze", json=body, headers=HEADERS).status_code == 200
    assert client.post("/api/analyze", json=body, headers=HEADERS).status_code == 429


def test_validation_does_not_echo_private_content(client):
    body = payload(["private-secret"])
    body["messages"][0]["id"] = ""
    response = client.post("/api/analyze", json=body, headers=HEADERS)
    assert response.status_code == 422
    assert "private-secret" not in response.text


def test_health_requires_auth_and_does_not_disclose_secrets(client, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "private-key-health-test")
    assert client.get("/api/health").status_code == 401
    response = client.get("/api/health", headers=HEADERS)
    assert response.status_code == 200
    assert response.json()["groq_configured"] is True
    assert "private-key-health-test" not in response.text
    monkeypatch.setenv("GROQ_API_KEY", "   ")
    assert client.get("/api/health", headers=HEADERS).json()["groq_configured"] is False


def test_extended_history_is_explicit_and_bounded(client):
    body = payload(["Tin bình thường"] * 300)
    assert client.post("/api/analyze", json=body, headers=HEADERS).status_code == 422
    body["history_limit"] = 300
    response = client.post("/api/analyze", json=body, headers=HEADERS)
    assert response.status_code == 200
    assert response.json()["analyzed_count"] == 300
    body = payload(["a" * 4000] * 19, history_limit=300)
    assert client.post("/api/analyze", json=body, headers=HEADERS).status_code == 422


def test_oversized_body_is_rejected_before_parsing(client):
    response = client.post("/api/analyze", content=b"x" * 400001, headers=HEADERS)
    assert response.status_code == 413


def test_clarifying_payment_question_is_not_a_payment_demand(client):
    response = client.post("/api/analyze", json=payload(["Tại sao tôi phải chuyển khoản trước?"]), headers=HEADERS)
    assert response.json()["level"] == "no_signal"
    response = client.post("/api/analyze", json=payload(["Bạn chuyển khoản giúp mình được không?"]), headers=HEADERS)
    assert response.json()["level"] == "review"
    response = client.post("/api/analyze", json=payload(["Tại sao bạn chưa chuyển khoản?"]), headers=HEADERS)
    assert response.json()["level"] == "review"


def test_diagnostics_are_authenticated_and_do_not_store_chat_or_original_ids(client):
    body = payload(["private-text-123"], conversation_id="private-person-id")
    client.post("/api/analyze", json=body, headers=HEADERS)
    assert client.get("/api/status").status_code == 401
    response = client.get("/api/status", headers=HEADERS)
    assert response.json()["last"]["analyzed_count"] == 1
    assert "private-text-123" not in response.text
    assert "private-person-id" not in response.text
