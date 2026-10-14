# ChatGuard VN · API local

Cập nhật: 14/10/2026.

FastAPI/Pydantic và httpx, lắng nghe `127.0.0.1:8000`. Bộ luật minh họa hoặc Groq tùy chọn; không có database hội thoại hoặc pipeline train trong API.

## Chạy

Từ root repo chạy `scripts/setup.ps1`, sau đó `scripts/start-backend.ps1`. Thêm `-Dev` khi cần reload Python. Giữ terminal backend mở; token local dùng cho extension, khóa Groq chỉ đặt ở `apps/api/.env`.

Từ thư mục này:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe evaluate.py
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

`evaluate.py` kiểm tra 9 tình huống tổng hợp; không gọi Groq và không ước lượng accuracy thực tế.

## Endpoint và giới hạn

| Endpoint | Mục đích | Token |
|---|---|---|
| `GET /api/health` | Backend/model có cấu hình hay chưa; không gọi Groq | Có |
| `POST /api/analyze` | Phân tích ngữ cảnh một cuộc/phiên/revision | Có |
| `GET /api/status` | Metadata chẩn đoán trong RAM | Có |
| `GET /demo/` | Phòng thử tổng hợp | Không |

Header: `X-ChatGuard-Token`. `history_limit=100` mặc định hoặc `300`: tối đa 100 tin/24.000 ký tự hoặc 300 tin/72.000 ký tự; tối đa 4.000 ký tự/tin. Body tối đa 400.000 byte; API tối đa 20 lượt/phút trên một tiến trình.

Extension chọn ngữ cảnh Groq tối đa 40 tin/6.000 ký tự và cách lượt ít nhất 30 giây. Đây là chính sách client, khác với trần schema API. Xem [hợp đồng API](../../docs/api-contract.md).

## Phân tích và dữ liệu

- `rules`: baseline, đối chiếu phí trước/sau và một số yêu cầu kiểm soát cá nhân.
- `groq`: cần khóa backend và `external_consent=true`; không tự đổi provider khi lỗi.
- ID tin gửi Groq được thay bằng alias; văn bản chưa được tự động ẩn toàn bộ thông tin cá nhân.
- Bằng chứng quy hành vi cho đối phương chỉ lấy từ `other`; `self`/`unknown` cung cấp ngữ cảnh.
- Chính sách phí/an toàn áp dụng sau kết quả Groq hợp lệ; không thay provider đang lỗi.
- Status giữ số lượng/thời gian/provider/mức/revision và dấu vân tay cuộc/phiên, tối đa 12 mốc trong RAM; không log nội dung chat/khóa/phản hồi provider.

Xuất báo cáo ở extension không gọi endpoint mới hoặc gửi thêm nội dung tới server. Backend dành cho loopback; đưa lên Internet cần thiết kế xác thực và vận hành riêng.

Xem [kiến trúc](../../docs/architecture.md), [quyền riêng tư](../../docs/privacy.md), [kiểm thử](../../docs/verification.md).
