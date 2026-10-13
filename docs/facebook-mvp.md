# Facebook: chọn một người và đọc ô chat nhỏ

## Luồng sử dụng

1. Giữ backend local đang chạy. Nạp/reload bản build vào Brave hoặc Chrome.
2. Mở ô chat nhỏ của người cần bảo vệ trên Facebook, bấm biểu tượng ChatGuard.
3. Biểu tượng mở Side Panel và kết nối tab để lấy metadata các cuộc đang mở; chưa đọc nội dung chat.
4. Lưu token local, bật tùy chọn bộ đọc Facebook. Chọn **Đối tượng theo dõi** và mức lịch sử 100 hoặc 300.
5. Bấm **Bật bảo vệ cuộc này**. Tên người được chọn khóa trong panel; các ô khác không được đọc.
6. Có thể bấm **Nạp lịch sử của người đã chọn**. Tiện ích chỉ cuộn trong log tin của cuộc đã xác minh, tối đa 32 lượt thử, dừng khi đủ ngân sách hoặc không tải thêm được.
7. **Tắt & xóa** hủy tác vụ, xóa ngữ cảnh và cảnh báo; cần tắt trước khi chọn người mới.

Nếu đang dùng bản build cũ, reload extension rồi tải lại Facebook. Content script đã chèn trong tab có thể vẫn là bản cũ dù các file build trên đĩa đã thay đổi. Extension reload có thể xóa token/cấu hình session; nhập lại token local trong `apps/api/.env` nếu cần, không nhập khóa Groq vào panel.

Trong lúc sửa mã, dùng [chế độ phát triển trên Brave](development.md) để tự cập nhật thay vì build production rồi Reload thủ công mỗi lần. Cuối panel có dấu bản reader; bản không khớp sẽ bị chặn bắt đầu bảo vệ.

## Đóng ô chat và theo dõi

Đóng/thu nhỏ ô chat không tự chuyển sang B và không xóa người A đã chọn. Khi không còn xác minh được log của A, panel hiện **Giữ lựa chọn · chờ tin**; dữ liệu đã đọc và đánh giá cũ vẫn thuộc phiên A. Mở lại A sẽ tự nối lại nếu định danh được xác minh. Đánh giá cũ được ghi rõ chưa cập nhật lúc ô chat đóng.

Không cam kết đọc tin mới trong lúc đóng nếu Facebook đã gỡ vùng tin khỏi DOM. Không mở ngầm các cuộc khác, lấy cookie/token, chặn lưu lượng mạng hay dùng API nội bộ. Đóng/tải lại tab Facebook, đổi đường dẫn hoặc khởi động lại trình duyệt khác với đóng ô chat nhỏ và có thể kết thúc phiên.

## Ngân sách lịch sử

| Mức | Bộ đệm trong phiên | Bộ luật | Groq |
| --- | --- | --- | --- |
| 1 | Tối đa 100 tin, 24.000 ký tự | Toàn bộ bộ đệm | Tối đa 40 tin cuối, 6.000 ký tự |
| 2 | Tối đa 300 tin, 72.000 ký tự | Toàn bộ bộ đệm | Tối đa 40 tin cuối, 6.000 ký tự |

Giữ nguyên tin, không cắt giữa câu để đủ ngân sách. Số tin thực tế có thể thấp hơn do ký tự, ảnh/audio, lịch sử chưa tải hoặc DOM ảo hóa. Kết quả Groq chỉ mô tả phần được gửi; dấu hiệu ngoài 40 tin cuối có thể bị bỏ sót. Chưa có bộ nhớ tóm tắt lịch sử dài.

## Phạm vi và định danh

Bộ đọc đã đối chiếu với ô chat nhỏ tiếng Việt: `role=log`, header **Cài đặt đoạn chat**, liên kết hồ sơ dạng số và `data-message-id` có tiền tố đối tượng. Khám phá đối tượng bỏ qua toàn bộ nhánh nội dung tin, kể cả nhãn trợ năng. Tên/ảnh/vị trí ô chat không đủ làm định danh. Nếu có hai vùng cùng ID hoặc ID tin không khớp header, không đọc.

Chỉ văn bản. Chưa xác minh đầy đủ trên chat nhóm, bố cục toàn trang, tài khoản/giao diện khác, tiếng Anh, sửa/thu hồi qua mọi kiểu DOM hoặc chạy dài ngày. Nút xem bằng chứng chỉ tìm tin còn được trang tải, không tự truy vấn lịch sử vô hạn.

## Kiểm chứng

`npm run test:e2e:facebook` dùng Chromium cách ly với 5 ô chat và 320 tin tổng hợp; kiểm tra giữ 300 tin cuối, chỉ A, bỏ qua B–E, đóng/mở lại, bằng chứng, nạp lịch sử và tắt/xóa. Fixture được phục vụ tại route Facebook bằng Playwright, không liên hệ Facebook thật. Bản test tạm thêm quyền host để mô phỏng thao tác cấp `activeTab` từ toolbar; manifest production không có quyền Facebook thường trực. Thao tác toolbar thật cần kiểm chứng riêng.

`GET /api/status` cần token local, chỉ trả metadata lượt phân tích gần nhất: số tin, provider, mức cảnh báo, revision, thời gian xử lý và dấu vân tay định danh. Không trả nội dung chat, tên, ID gốc hoặc khóa. Metadata chỉ ở RAM, mất khi backend khởi động lại.
