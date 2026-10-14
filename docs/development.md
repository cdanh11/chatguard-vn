# Phát triển trên Brave đang đăng nhập

Thay file production trên đĩa không tự cập nhật extension đã được Brave nạp. Backend Python, service worker, giao diện panel và bộ đọc đã chèn vào Facebook là các thành phần khác nhau. Reload extension hoặc phát triển bằng WXT mới cập nhật phần chạy trong trình duyệt.

## Thiết lập một lần

1. Chạy `scripts/start-backend.ps1 -Dev` và `scripts/start-extension-dev.ps1` ở hai terminal. Không chạy thêm nếu hai server đã hoạt động. Backend lắng nghe ở loopback cổng 8000, WXT ở loopback cổng 3001; script không mở profile trình duyệt mới.
2. Trong `brave://extensions`, tắt bản ChatGuard production, bật Developer mode và chọn **Load unpacked** với thư mục `apps/extension/.output/chrome-mv3-dev`. Không dùng đồng thời hai bản. Người dùng cần thao tác bước này vì công cụ browser hiện tại không truy cập được trang quản lý extension.
3. Tải lại đúng tab Facebook thử, bấm biểu tượng ChatGuard, lưu token local và cấu hình, chọn đối tượng rồi bật bảo vệ. Khóa Groq chỉ nằm trên backend. Consent Groq cần được chọn rõ ràng.
4. Mở cài đặt → **Thông tin kỹ thuật** để xem **DEV**, version và `reader-…`. Bản production ghi **Bản build**. Mã reader được tạo từ nội dung các file bộ đọc, không chứa dữ liệu hoặc định danh người dùng.

## Trong lúc sửa mã

- Giao diện được WXT cập nhật; sửa background cập nhật extension. Bộ đọc được chèn bằng activeTab, không đăng ký thường trực: cấu hình dev phát lệnh reload extension khi mã reader thay đổi, thay vì dùng cơ chế mặc định chỉ cập nhật script đã đăng ký. Không reload hay đọc các tab Facebook khác.
- Cập nhật extension có thể ngắt phiên, đóng panel hoặc xóa cấu hình session. Bấm biểu tượng trên đúng tab, chọn lại người và bật bảo vệ khi cần. Không tự khôi phục quyền đọc sau cập nhật.
- Bộ đọc trả mã build khi kết nối. Hook biên dịch lấy stamp mới trên mỗi build; manifest lấy đúng stamp từ artifact reader vừa được biên dịch. Không dùng `vite.define` từ cấu hình builder ban đầu vì WXT giữ cấu hình đó khi rebuild từng phần. Extension từ chối bắt đầu nếu mã không khớp; thông báo Reload ChatGuard VN trong trang Tiện ích rồi kết nối lại. Chỉ tải lại Facebook không bảo đảm nạp quyền/manifest mới cho extension.
- DEV so sánh manifest và reader đã biên dịch để reload extension khi có thay đổi. Khi worker reconnect mà artifact không đổi, không phát lệnh cập nhật script chưa đăng ký và không tạo vòng reload. Hai dòng WXT “Content script is not registered yet” chỉ là đường cập nhật không áp dụng cho executeScript, không phải bằng chứng về nguyên nhân crash.
- Nếu bản đang nạp thiếu quyền `alarms`, background vẫn phục vụ cấu hình nhưng từ chối bắt đầu đọc. Reload extension để trình duyệt nạp manifest mới; không cần thay khóa Groq trên backend. Chưa xác nhận exception gốc từ ảnh là thiếu quyền, nên không coi đây là kết luận duy nhất về crash cũ.
- Mở biểu tượng/panel hoặc kết nối lại cùng tab với reader cùng build giữ nguyên người đã chọn và bộ đệm, kể cả khi ô chat đã đóng. Điều này không phải cập nhật extension; không cần bật lại bảo vệ mỗi lần mở panel.
- Backend có `--reload` khi dùng `-Dev`. Lượt phân tích đang chạy có thể bị gián đoạn lúc đổi mã; thử lại khi server sẵn sàng. Sửa `.env` vẫn cần khởi động lại backend.
- Khi phát hành/demo ổn định, dừng server dev, chạy `npm run build` trong `apps/extension`, tắt bản DEV và dùng lại `.output/chrome-mv3`.

## Quyền và khả năng kiểm thử

WXT dev thêm quyền `tabs`, host localhost và CSP cho server phát triển. Production dùng `activeTab` và `alarms` để hẹn phân tích khi worker nghỉ, không có quyền Facebook thường trực. Dev chỉ dùng trên máy phát triển với dữ liệu thử.

Công cụ hiện điều khiển được trang Facebook của hai tài khoản đã được cho phép, nhưng không trực tiếp thao tác panel native hoặc trang quản lý extension. Tự cập nhật không mở rộng khả năng điều khiển UI này. Kiểm thử panel tự động chạy trên Chromium cách ly; trạng thái phân tích của phiên Brave có thể kiểm tra qua API local cần token, không lưu nội dung chat.

`npm run test:e2e:startup` kiểm tra khởi động bình thường và manifest thiếu `alarms` bằng bản sao/profile cách ly. Chọn `CHATGUARD_TEST_BUILD=chrome-mv3-dev` để kiểm tra DEV khi server WXT đang chạy. Không thay manifest trong profile của người dùng.

`npm run test:e2e:dev-sync` kiểm tra cập nhật từng phần qua giao thức WXT local: tạm thêm comment vào `reader-version.ts`, xác nhận hai stamp khớp và không lặp reload, rồi phục hồi file. Lệnh này phát cập nhật DEV nên không chạy trong lúc đang ghi demo cần giữ nguyên phiên. Thay hook trong `wxt.config.ts` cần khởi động lại tiến trình WXT để hook mới có hiệu lực.
