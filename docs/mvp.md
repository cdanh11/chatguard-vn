# Phạm vi MVP

## Đã triển khai trong mã

- Chrome desktop, WXT/React và FastAPI local.
- Chọn một người trong các ô chat; bật/tắt, không tự chuyển người, dừng/xóa khi tắt hoặc đổi đường dẫn. Đóng ô chat nhỏ giữ lựa chọn và chờ đúng người xuất hiện lại.
- Chỉ văn bản đã tải; giữ mặc định 100 tin/24.000 ký tự, tùy chọn 300 tin/72.000 ký tự; không chờ đủ giới hạn để phân tích.
- Backend token, schema giới hạn, evidence IDs và ngăn chỉ dẫn trong chat được coi là lệnh.
- Bộ luật minh họa không gọi bên ngoài; Groq tùy chọn có đồng ý riêng và báo lỗi rõ.
- Phòng thử với ca tuyển CTV, giả danh cơ quan, xin OTP và các ca bình thường/dễ nhầm.
- Kiểm tra backend/token trước bật; phục hồi bảng tiện ích; chỉ một tab được chọn tại một thời điểm.
- Nhập/xuất JSON tại trình duyệt, mở tin bằng chứng, làm lại kịch bản sẽ dừng và xóa phiên.
- Groq giới hạn 40 tin/6.000 ký tự/lượt, cách tối thiểu 30 giây; gộp tin mới, hiển thị chờ, lỗi quota và nút thử lại theo Retry-After. Không tự lặp lại lượt lỗi.
- Kiểm tra cấu trúc/bằng chứng ở cả API và extension; phản hồi đến sau khi dừng bị loại.
- Có lệnh đánh giá baseline trên các ca tổng hợp, xuất báo cáo JSON để nhóm AI/ML tiếp nối.

## Cần kiểm chứng thêm

- Đã đối chiếu DOM của hai tài khoản thử; còn cần khép kín kiểm thử extension Brave đang báo 0 tin sau khi người dùng reload bản build và Facebook.
- Độ bền khi dùng Groq lâu dài với hạn mức thực (đã có một lượt gọi thật thành công).
- Chất lượng phân tích tiếng Việt trên dữ liệu độc lập.
- Điều khoản nền tảng và chính sách trước phát hành.

## Ngoài phạm vi

Cam kết toàn bộ lịch sử; giám sát khi đóng tab; xác minh danh tính; Instagram/Threads; ứng dụng di động; ảnh/audio; tự gửi tin, chặn người hoặc giao dịch; huấn luyện mô hình lớn trên máy 8 GB.

## Nghiệm thu

Facebook: chọn A, mở/nhắn B không đọc B; đóng A giữ lựa chọn, mở lại A nối đúng ID; không lặp tin khi dựng lại DOM; lịch sử ghép đúng thứ tự. Demo đổi route dừng và cần bật lại. Không hiện kết quả phiên đã tắt; lỗi kết nối không biến thành “an toàn”; tắt/xóa không giữ nội dung phiên. Fixture, probe DOM và phiên extension thật phải được báo cáo tách biệt.
