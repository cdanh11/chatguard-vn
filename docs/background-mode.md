# Theo dõi khi đóng panel

Sau khi kết nối và bật bảo vệ cho một người, có thể đóng panel phải của ChatGuard. Bộ đọc trong tab và tác vụ phân tích không phụ thuộc panel. Kết quả gần nhất nằm trong `chrome.storage.session`; mở lại panel hiển thị cùng phiên, không khởi động lại việc theo dõi.

## Báo trạng thái

Trên biểu tượng tiện ích của tab đang theo dõi và nút ChatGuard nhỏ ở góc trái dưới trang:

| Dấu | Ý nghĩa |
| --- | --- |
| `!` đỏ | Có dấu hiệu đáng lo |
| `!` vàng | Cần kiểm chứng |
| `•` | Đang theo dõi, chưa có cảnh báo hiện tại; không xác nhận an toàn |
| `…` | Đang chờ hoặc đang phân tích |
| `Ⅱ` | Giữ người đã chọn, chờ mở lại ô chat |
| `?` | Thiếu ngữ cảnh hoặc chưa cập nhật được kết quả |

Cảnh báo trước vẫn hiện `!` khi đang chờ cập nhật và văn bản đã phân tích còn nguyên; tooltip ghi rõ chưa cập nhật. Khi ngữ cảnh cũ bị sửa/xóa hoặc đổi phạm vi, không giữ cảnh báo đó. Bấm nút trên trang để mở panel; nếu trình duyệt không cho mở bằng thao tác này, nút hướng dẫn mở từ biểu tượng toolbar. Không dùng âm thanh hoặc thông báo hệ điều hành, không xin quyền notifications.

Chỉ báo trên trang chứa trạng thái tổng quát, không chứa tên, nội dung chat hay định danh tài khoản. Không đọc các cuộc khác để hiển thị nó. Tắt/xóa hoặc đổi người xóa badge, chỉ báo và lịch chờ của phiên cũ.

## Tần suất

Trong cài đặt, chọn **Sau mỗi tin nhắn** (mặc định) hoặc **Gộp 5 tin**. Lượt đầu được ưu tiên; nhóm chưa đủ 5 thay đổi sẽ được xếp lịch sau khoảng 45 giây từ thay đổi đầu, không lùi thời hạn mỗi lần thêm tin. Yêu cầu tiền/OTP trong tin mới được ưu tiên sớm; bộ lọc ưu tiên chỉ quyết định lịch, không tự kết luận có lừa đảo.

Các lượt Groq cách ít nhất 30 giây, mỗi lượt tối đa 40 tin/6.000 ký tự. Bộ luật local cách ít nhất 3,1 giây để phù hợp giới hạn API 20 lượt/phút. Tin đến trong thời gian chờ được gộp vào ngữ cảnh mới nhất. Không hứa trả kết quả ngay sau mọi tin hoặc đúng một thời điểm tuyệt đối.

## Vòng đời tiến trình nền

Lịch lưu trong session state; `chrome.alarms` đánh thức worker nếu timer trong RAM đã mất. Timer dùng cho phản hồi nhanh khi worker còn chạy. Khi worker khởi động, tiện ích kiểm tra reader và session đã được người dùng chọn, khôi phục lịch còn hợp lệ; không tự chèn reader hoặc chọn người mới. Một lượt chỉ được nhận xử lý một lần dù timer và alarm cùng tới hạn.

Alarm có thể trễ, không đánh thức máy đang ngủ; không phải tác vụ chạy khi trình duyệt đã thoát. Đây là hành vi nền của [Chrome alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms) và [service worker](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle). Yêu cầu Chrome/Brave nền Chromium 120 trở lên; permission thêm duy nhất là `alarms`, không có host Facebook thường trực.

Đóng panel khác với đóng ô chat Facebook. Nếu Facebook gỡ log tin khỏi DOM khi đóng ô chat, giữ lựa chọn và chờ mở lại đúng cuộc mới đọc tiếp. Tab Facebook/backend local phải còn mở. Tải lại tab, đổi route, cập nhật extension hoặc khởi động lại trình duyệt có thể yêu cầu bật lại bảo vệ; không lưu hội thoại qua các phiên trình duyệt.

## Kiểm thử

`npm run test:e2e:background` chạy production build trong profile Chromium cách ly với hội thoại tổng hợp. Đóng trang panel trước khi gửi tin; kiểm tra lượt đầu, nhóm 4/5, ưu tiên OTP, badge và mở lại kết quả. Phần vòng đời dùng DevTools protocol chỉ trong browser/profile test riêng để dừng đúng worker và quan sát các trạng thái thực, không điều khiển browser người dùng.
