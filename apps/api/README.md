# Local Analysis API

FastAPI + Pydantic + httpx. Server local `127.0.0.1:8000`, không có database hoặc lịch sử tin nhắn máy chủ.

Từ root repo dùng `scripts/setup.ps1` và `scripts/start-backend.ps1`.

Các endpoint:

- `GET /api/health` — trạng thái, cần `X-ChatGuard-Token`.
- `POST /api/analyze` — `{conversation_id, session_id, revision, messages, provider, external_consent}`; cần token.
- `GET /demo/` — trang hội thoại tổng hợp, không gửi tin cho người thật.

`provider=rules` là baseline luật minh họa. `provider=groq` cần `GROQ_API_KEY` trong `.env` và `external_consent=true`; không tự chuyển chế độ nếu lỗi.

Giới hạn: 100 tin, 4.000 ký tự/tin, 24.000 ký tự tổng; 20 lượt/phút trên một tiến trình local. Bằng chứng phải có ID thật. Không echo nội dung riêng tư trong lỗi validation.

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

Không triển khai server này lên Internet trước khi bổ sung thiết kế xác thực, phân quyền và vận hành phù hợp. Không dùng `--host 0.0.0.0` để demo.
