import hmac
import hashlib
import os
import re
import time
from collections import deque
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .analysis import groq_assessment, rules_assessment
from .schemas import AnalyzeRequest, AnalyzeResponse

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")
app = FastAPI(title="ChatGuard VN — Local MVP", version="0.1.0")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "testserver"])
requests_at: deque[float] = deque()
activity: dict = {"completed": 0, "last": None, "recent": []}


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, _exc: RequestValidationError):
    # Do not echo chat text or secrets in errors.
    return JSONResponse(status_code=422, content={"detail": "Dữ liệu không hợp lệ: mặc định 100 tin/24.000 ký tự, mở rộng 300 tin/72.000 ký tự; ID tin phải duy nhất."})


@app.middleware("http")
async def request_guard(request: Request, call_next):
    origin = request.headers.get("origin", "")
    if request.url.path.startswith("/api/") and origin and not re.fullmatch(r"chrome-extension://[a-p]{32}", origin):
        return JSONResponse(status_code=403, content={"detail": "Origin không được phép."})
    if request.url.path == "/api/analyze":
        chunks = []
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > 400000:
                return JSONResponse(status_code=413, content={"detail": "Yêu cầu quá lớn."})
            chunks.append(chunk)
        request._body = b"".join(chunks)
    return await call_next(request)


def authorize(x_chatguard_token: str = Header(default="")):
    expected = os.getenv("CHATGUARD_API_TOKEN", "")
    if not expected or not hmac.compare_digest(x_chatguard_token, expected):
        raise HTTPException(status_code=401, detail="Token máy chủ thiếu hoặc không đúng.")


@app.get("/api/health", dependencies=[Depends(authorize)])
def health():
    return {"status": "ok", "version": "0.1.0", "groq_configured": bool(os.getenv("GROQ_API_KEY", "").strip()),
            "groq_model": os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
            "default_provider": "rules", "stores_chat": False}


@app.post("/api/analyze", response_model=AnalyzeResponse, dependencies=[Depends(authorize)])
async def analyze(request: AnalyzeRequest):
    now = time.monotonic()
    while requests_at and now - requests_at[0] > 60:
        requests_at.popleft()
    if len(requests_at) >= 20:
        raise HTTPException(status_code=429, detail="Tối đa 20 lượt/phút. Chờ trước khi thử lại.")
    if request.provider == "groq" and not request.external_consent:
        raise HTTPException(status_code=403, detail="Chưa đồng ý gửi ngữ cảnh tới Groq.")
    key = os.getenv("GROQ_API_KEY", "")
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    if request.provider == "groq" and (not key.strip() or not re.fullmatch(r"[a-zA-Z0-9._/-]+", model)):
        raise HTTPException(status_code=503, detail="Groq chưa được cấu hình hợp lệ; không tự động đổi chế độ.")
    requests_at.append(now)
    if request.provider == "rules":
        result = rules_assessment(request)
    else:
        try:
            result = await groq_assessment(request, key, model)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 429:
                raise HTTPException(status_code=429, detail="Groq đang giới hạn lượt hoặc token. Chờ rồi thử lại; chưa có đánh giá mới.",
                                    headers={"Retry-After": "60"}) from None
            if exc.response.status_code in {401, 403}:
                raise HTTPException(status_code=503, detail="Khóa Groq hoặc quyền truy cập model không hợp lệ. Kiểm tra cấu hình backend.") from None
            raise HTTPException(status_code=502, detail="Groq không xử lý được yêu cầu. Kiểm tra model/cấu hình; chưa có đánh giá mới.") from None
        except Exception:
            # Never log prompts, provider bodies or URLs containing credentials.
            raise HTTPException(status_code=502, detail="Không nhận được kết quả AI hợp lệ. Kiểm tra hạn mức/kết nối; chưa có đánh giá mới.") from None
    activity["completed"] += 1
    activity["last"] = {"conversation_fingerprint": hashlib.sha256(request.conversation_id.encode()).hexdigest()[:12],
                        "session_fingerprint": hashlib.sha256(request.session_id.encode()).hexdigest()[:12],
                        "revision": request.revision, "provider": request.provider,
                        "analyzed_count": len(request.messages), "level": result.level,
                        "elapsed_ms": round((time.monotonic() - now) * 1000)}
    activity["recent"] = [*activity["recent"], activity["last"]][-12:]
    return AnalyzeResponse(**result.model_dump(), conversation_id=request.conversation_id,
                           session_id=request.session_id, revision=request.revision,
                           provider=request.provider, analyzed_count=len(request.messages))


@app.get("/api/status", dependencies=[Depends(authorize)])
def status():
    # Diagnostics only: no chat text, names, original IDs, tokens or model response bodies.
    return {**activity, "stores_chat": False}


app.mount("/demo", StaticFiles(directory=ROOT / "demo", html=True), name="demo")
