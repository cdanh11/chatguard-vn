import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import analysis
from app.main import app, requests_at


HEADERS = {"X-ChatGuard-Token": "test-token"}
BODY = {"conversation_id": "demo:ctv", "session_id": "groq-test", "revision": 3,
        "provider": "groq", "external_consent": True,
        "messages": [{"id": "m1", "sender": "other", "text": "e ck 300k kich hoat tk"}]}
ASSESSMENT = {"level": "review", "summary": "Cần xác minh yêu cầu nạp tiền.",
              "signals": [{"kind": "payment", "title": "Yêu cầu nạp tiền", "evidence_ids": ["m1"]}],
              "actions": ["Xác minh qua kênh độc lập."], "limitations": ["Chưa xác minh danh tính."]}


@pytest.fixture
def groq_mock(monkeypatch):
    monkeypatch.setenv("CHATGUARD_API_TOKEN", "test-token")
    monkeypatch.setenv("GROQ_API_KEY", "fake-groq-key")
    monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-120b")
    requests_at.clear()
    calls = []
    response = {"status": 200, "body": {"choices": [{"finish_reason": "stop", "message": {
        "content": json.dumps(ASSESSMENT), "reasoning": "not exposed"}}]}}

    def handle(request):
        calls.append(request)
        return httpx.Response(response["status"], json=response["body"])

    real_client = httpx.AsyncClient
    monkeypatch.setattr(analysis.httpx, "AsyncClient", lambda **kwargs: real_client(
        transport=httpx.MockTransport(handle), **kwargs))
    with TestClient(app) as client:
        yield client, calls, response


def test_groq_protocol_and_response(groq_mock):
    client, calls, _ = groq_mock
    response = client.post("/api/analyze", json=BODY, headers=HEADERS)
    assert response.status_code == 200
    result = response.json()
    assert result["provider"] == "groq"
    assert result["session_id"] == "groq-test" and result["revision"] == 3
    assert result["signals"][0]["evidence_ids"] == ["m1"]
    assert "reasoning" not in result
    request = calls[0]
    assert str(request.url) == "https://api.groq.com/openai/v1/chat/completions"
    assert request.headers["authorization"] == "Bearer fake-groq-key"
    payload = json.loads(request.content)
    assert payload["model"] == "openai/gpt-oss-120b"
    assert payload["stream"] is False and payload["include_reasoning"] is False
    assert payload["response_format"]["json_schema"]["strict"] is True
    assert json.loads(payload["messages"][1]["content"]) == BODY["messages"]
    schema = payload["response_format"]["json_schema"]["schema"]
    assert set(schema["required"]) == set(schema["properties"])
    assert schema["additionalProperties"] is False
    signal = schema["$defs"]["Signal"]
    assert "title" in signal["properties"]
    assert set(signal["required"]) == set(signal["properties"])


@pytest.mark.parametrize("upstream,expected", [(401, 503), (403, 503), (429, 429), (400, 502), (500, 502)])
def test_groq_errors_are_redacted_and_never_fallback(groq_mock, upstream, expected):
    client, _, response = groq_mock
    response.update(status=upstream, body={"error": {"message": "private-provider-body fake-groq-key"}})
    result = client.post("/api/analyze", json=BODY, headers=HEADERS)
    assert result.status_code == expected
    assert "provider" not in result.json()
    assert "private-provider-body" not in result.text and "fake-groq-key" not in result.text
    if upstream == 429:
        assert result.headers["retry-after"] == "60"


@pytest.mark.parametrize("failure", ["fake_evidence", "truncated", "refused", "invalid_json", "oversized"])
def test_groq_invalid_assessment_is_rejected(groq_mock, failure):
    client, _, response = groq_mock
    choice = response["body"]["choices"][0]
    content = json.loads(choice["message"]["content"])
    if failure == "fake_evidence":
        content["signals"][0]["evidence_ids"] = ["invented"]
    if failure == "truncated":
        choice["finish_reason"] = "length"
    if failure == "refused":
        choice["message"]["refusal"] = "refused"
    if failure == "oversized":
        content["summary"] = "x" * 1201
    choice["message"]["content"] = "not json" if failure == "invalid_json" else json.dumps(content)
    result = client.post("/api/analyze", json=BODY, headers=HEADERS)
    assert result.status_code == 502 and "provider" not in result.json()


def test_groq_does_not_send_without_consent(groq_mock):
    client, calls, _ = groq_mock
    result = client.post("/api/analyze", json={**BODY, "external_consent": False}, headers=HEADERS)
    assert result.status_code == 403 and calls == []


def test_old_provider_is_not_silently_reinterpreted(groq_mock):
    client, calls, _ = groq_mock
    result = client.post("/api/analyze", json={**BODY, "provider": "removed-provider"}, headers=HEADERS)
    assert result.status_code == 422 and calls == []
