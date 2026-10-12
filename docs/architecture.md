# Kiến trúc dự kiến

```text
Cuộc trò chuyện được chọn
  → Content script: xác minh, đọc, loại trùng
  → Quản lý phiên và ngữ cảnh
  → Background chuyển yêu cầu API
  → API: xác thực, kiểm tra schema, giới hạn
  → Quy tắc hỗ trợ + mô hình
  → Kiểm tra bằng chứng
  → Side Panel hiển thị cảnh báo
```

- Quyền trình duyệt ở mức trang/tab; giới hạn theo cuộc do ứng dụng thực thi.
- Mọi yêu cầu và kết quả có định danh phiên và phiên bản ngữ cảnh.
- Cấu hình lưu local; nội dung hội thoại ưu tiên lưu theo phiên trên thiết bị.
- Chỉ gửi phần cần thiết tới backend khi được người dùng cho phép.
- Tin nhắn là dữ liệu không tin cậy, không phải lệnh cho mô hình.
- Không lưu khóa mô hình trong extension hoặc nội dung chat trong log máy chủ.

Cần kiểm chứng: bộ đọc giao diện thật, chuyển cuộc, tải lịch sử, phục hồi service worker, chất lượng tiếng Việt và điều khoản nền tảng.
