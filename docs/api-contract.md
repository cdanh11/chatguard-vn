# Hợp đồng API local

Cập nhật: 14/10/2026. Nguồn triển khai: `apps/api/app/schemas.py`, `main.py`, `analysis.py`, `claims.py`.

## Truy cập

Base URL `http://127.0.0.1:8000`. Các route `/api/*` cần header `X-ChatGuard-Token`. Origin web thường bị từ chối; origin extension hợp lệ không thay thế yêu cầu token. `/demo/` là nội dung tĩnh tổng hợp.

`GET /api/health` trả trạng thái, version, model và cờ có cấu hình Groq. Không gọi provider, không xác minh model access/quota/key thực sự hoạt động.

## POST /api/analyze

```json
{
  "conversation_id": "demo:ctv",
  "session_id": "local-session",
  "revision": 1,
  "history_limit": 100,
  "provider": "rules",
  "external_consent": false,
  "messages": [
    {"id": "msg-1", "sender": "other", "text": "Em đóng phí kích hoạt 300k nhé."}
  ]
}
```

- `revision >= 1`; ID tin duy nhất, text không rỗng và tối đa 4.000 ký tự.
- `sender`: `self`, `other`, `unknown`; `provider`: `rules`, `groq`.
- `history_limit`: 100 mặc định hoặc 300, tương ứng tổng trần 24.000/72.000 ký tự.
- Schema từ chối trường dư; body tối đa 400.000 byte; 20 lượt/phút/tiến trình local.
- Groq cần consent và khóa/model backend hợp lệ; không fallback âm thầm.

Extension chọn riêng tối đa 40 tin/6.000 ký tự cho Groq, giữ mốc phí cũ + đoạn gần nhất và cách lượt ít nhất 30 giây. Trần này ở client, không phải một giới hạn Groq-specific được schema API thực thi.

Response chứa lại `conversation_id`, `session_id`, `revision`, `provider`, `analyzed_count` và:

| Trường | Giá trị |
|---|---|
| `level` | `no_signal`, `review`, `high_concern`, `insufficient_context` |
| `summary` | Tóm tắt tiếng Việt, tối đa 1.200 ký tự |
| `signals` | Tối đa 12; mỗi signal có `kind`, `title`, 1–8 `evidence_ids` |
| `actions`, `limitations` | Mỗi danh sách tối đa 6 phần tử |

Evidence quy yêu cầu cho đối phương phải thuộc tin `other` trong đầu vào. Groq nhận ID alias theo request, backend ánh xạ lại sau kiểm tra. Chính sách đối chiếu phí/an toàn áp dụng sau kết quả hợp lệ; không biến lỗi provider thành đánh giá rules. Client chỉ áp dụng response đúng cuộc/phiên/revision.

## Lỗi

| HTTP | Ý nghĩa |
|---|---|
| 401 | Token local thiếu/sai |
| 403 | Origin bị từ chối hoặc thiếu consent Groq |
| 413 | Body vượt trần |
| 422 | Schema, ID trùng, text hoặc ngân sách không hợp lệ |
| 429 | Hạn mức local hoặc Groq; chưa có kết quả mới |
| 502 | Provider/đầu ra/bằng chứng không hợp lệ |
| 503 | Groq thiếu cấu hình hoặc key/model access không hợp lệ |

Groq 429 trả `Retry-After: 60`; client có chờ mặc định khi thiếu header. Không echo input hoặc provider body chứa thông tin riêng tư. `no_signal` là kết quả nội dung, không dùng làm mã thay thế lỗi.

## GET /api/status

Trả `completed`, `last`, `recent` tối đa 12 mốc, `stores_chat=false`. Mốc có fingerprint cuộc/phiên, revision/provider/số tin/mức/thời gian xử lý. Không có nội dung chat, ID gốc, tên hoặc khóa; mất khi backend restart.

## Báo cáo trong extension

Không có endpoint HTTP xuất báo cáo. `EXPORT_SNAPSHOT` là lệnh nội bộ từ extension page, phải khớp tab đang kết nối, session và conversation hiện tại. Panel dùng snapshot hợp lệ để tạo file, không đưa token vào file. Xem [định dạng báo cáo](reports.md), [kiến trúc](architecture.md), [quyền riêng tư](privacy.md).
