# Facebook: chọn một người và đọc ô chat nhỏ

Cập nhật: 14/10/2026. Ưu tiên ô chat nhỏ Facebook desktop tiếng Việt đã được kiểm chứng, không cam kết mọi bố cục Messenger.

## Luồng sử dụng

1. Giữ backend local đang chạy. Nạp/reload bản build vào Brave hoặc Chrome.
2. Mở ô chat nhỏ của người cần bảo vệ trên Facebook, bấm biểu tượng ChatGuard.
3. Biểu tượng mở Side Panel và kết nối tab để lấy metadata các cuộc đang mở; chưa đọc nội dung chat.
4. Lần đầu lưu token local trong cài đặt. Nếu có nhiều người, chọn **Đối tượng theo dõi**; nếu chỉ có một, kiểm tra tên hiện trên thẻ. Mặc định 100 tin, có thể chọn 300 trong **Tùy chọn cuộc trò chuyện** trước khi bật.
5. Bấm **Bật bảo vệ cuộc này**. Tên người được chọn khóa trong panel; các ô khác không được đọc.
6. Trong **Tùy chọn cuộc trò chuyện**, có thể bấm **Đọc thêm tin cũ**. Tiện ích chỉ cuộn trong log tin của cuộc đã xác minh, tối đa 32 lượt thử, dừng khi đủ ngân sách hoặc không tải thêm được.
7. Mở **Bản nháp & báo cáo** để xem phần đã đọc và tải JSON/HTML nếu cần; mặc định chỉ bằng chứng. Báo cáo không lấy thêm lịch sử hoặc gọi AI.
8. **Tắt & xóa** hủy tác vụ, xóa ngữ cảnh và cảnh báo. **Đổi người** cũng dừng/xóa phiên rồi cho chọn người mới; chưa đọc người mới cho đến khi bấm bật. File đã tải vẫn do bạn quản lý.

Bấm bảo vệ Facebook là thao tác cho phép bật bộ đọc cho cuộc đó; không cần bật công tắc Facebook riêng. Consent gửi tới Groq vẫn riêng biệt. Xem [trải nghiệm tiện ích](extension-ux.md).

Nếu đang dùng bản build cũ, reload extension rồi tải lại Facebook. Content script đã chèn trong tab có thể vẫn là bản cũ dù các file build trên đĩa đã thay đổi. Extension reload có thể xóa token/cấu hình session; nhập lại token local trong `apps/api/.env` nếu cần, không nhập khóa Groq vào panel.

Trong lúc sửa mã, dùng [chế độ phát triển trên Brave](development.md). Mở Cấu hình → Thông tin kỹ thuật để xem build reader; bản không khớp bị chặn bắt đầu bảo vệ. Khi báo lệch bản, Reload extension trước rồi kết nối lại; chỉ tải lại Facebook không nạp manifest mới cho extension.

## Đóng ô chat và theo dõi

Đóng/thu nhỏ ô chat không tự chuyển sang B và không xóa người A đã chọn. Khi không còn xác minh được log của A, panel hiện **Giữ lựa chọn · chờ tin**; dữ liệu đã đọc và đánh giá cũ vẫn thuộc phiên A. Mở lại A sẽ tự nối lại nếu định danh được xác minh. Đánh giá cũ được ghi rõ chưa cập nhật lúc ô chat đóng.

Không cam kết đọc tin mới trong lúc đóng nếu Facebook đã gỡ vùng tin khỏi DOM. Không mở ngầm các cuộc khác, lấy cookie/token, chặn lưu lượng mạng hay dùng API nội bộ. Đóng/tải lại tab Facebook, đổi đường dẫn hoặc khởi động lại trình duyệt khác với đóng ô chat nhỏ và có thể kết thúc phiên.

## Ngân sách lịch sử

| Mức | Bộ đệm trong phiên | Bộ luật | Groq |
| --- | --- | --- | --- |
| 1 | Tối đa 100 tin, 24.000 ký tự | Toàn bộ bộ đệm | Tối đa 40 tin, 6.000 ký tự: gần nhất + mốc phí cũ |
| 2 | Tối đa 300 tin, 72.000 ký tự | Toàn bộ bộ đệm | Tối đa 40 tin, 6.000 ký tự: gần nhất + mốc phí cũ |

Giữ nguyên tin, không cắt giữa câu để đủ ngân sách. Số tin thực tế có thể thấp hơn do ký tự, ảnh/audio, lịch sử chưa tải hoặc DOM ảo hóa. Có thể giữ tối đa 8 mốc không thu phí cũ trong bộ đệm, tổng 1.500 ký tự; phần còn lại dành cho tin gần nhất. Kết quả chỉ mô tả phần được gửi, không phải lịch sử liên tục đầy đủ. Dấu hiệu ngoài phần chọn vẫn có thể bị bỏ sót; chưa có bộ nhớ tóm tắt lịch sử dài.

## Phạm vi và định danh

Bộ đọc đã đối chiếu với ô chat nhỏ tiếng Việt: `role=log`, header **Cài đặt đoạn chat**, liên kết hồ sơ dạng số và `data-message-id` có tiền tố đối tượng. Khám phá đối tượng bỏ qua toàn bộ nhánh nội dung tin, kể cả nhãn trợ năng. Tên/ảnh/vị trí ô chat không đủ làm định danh. Nếu có hai vùng cùng ID hoặc ID tin không khớp header, không đọc.

Chỉ văn bản. Chưa xác minh đầy đủ trên chat nhóm, bố cục toàn trang, tài khoản/giao diện khác, tiếng Anh, sửa/thu hồi qua mọi kiểu DOM hoặc chạy dài ngày. Nút xem bằng chứng chỉ tìm tin còn được trang tải, không tự truy vấn lịch sử vô hạn.

## Kiểm chứng

`npm run test:e2e:facebook` dùng Chromium cách ly với 5 ô chat và 320 tin tổng hợp; kiểm tra giữ 300 tin cuối, chỉ A, bỏ qua B–E, đóng/mở lại, bằng chứng, nạp lịch sử và tắt/xóa. Fixture được phục vụ tại route Facebook bằng Playwright, không liên hệ Facebook thật. Bản test tạm thêm quyền host để mô phỏng thao tác cấp `activeTab` từ toolbar; manifest production không có quyền Facebook thường trực. Thao tác toolbar thật cần kiểm chứng riêng.

`GET /api/status` cần token local, chỉ trả metadata lượt phân tích gần nhất: số tin, provider, mức cảnh báo, revision, thời gian xử lý và dấu vân tay định danh. Không trả nội dung chat, tên, ID gốc hoặc khóa. Metadata chỉ ở RAM, mất khi backend khởi động lại.

Status cũng có dấu vân tay session và tối đa 12 mốc metadata gần nhất để kiểm tra theo dõi có bị reset không; không trả session ID gốc.

File báo cáo thay ID bằng `m1…` và bỏ metadata tên hồ sơ/ID cuộc/phiên. Văn bản nguyên gốc vẫn có thể chứa thông tin riêng tư; đọc [quyền riêng tư](privacy.md) và [định dạng báo cáo](reports.md) trước khi chia sẻ file.
