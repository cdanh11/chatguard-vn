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
- Background điều phối khi panel đóng, có alarm phục hồi lịch và badge/chỉ báo khi cần kiểm chứng. Đóng ô chat giữ phạm vi nhưng chờ nếu log biến mất.
- Đối chiếu điều kiện phí bằng cặp tin trước/sau; Groq giữ một số phát biểu cũ về phí trong giới hạn 40 tin/6.000 ký tự. Đây là baseline, chưa phải ledger tổng quát.
- Ưu tiên an toàn khi có yêu cầu giao giấy tờ gốc hoặc cấm liên lạc người thân; không gán nhãn mua bán người.

## Cần kiểm chứng thêm

- Phiên Brave đã đọc được 10 tin và có kết quả Groq sau reload. Cần tiếp tục kiểm tra độ bền với cập nhật DEV và thay đổi giao diện; kiểm thử Chromium cách ly không thay thế xác nhận trên phiên Brave thật.
- Độ bền khi dùng Groq lâu dài với hạn mức thực (đã có một lượt gọi thật thành công).
- Chất lượng phân tích tiếng Việt trên dữ liệu độc lập.
- Điều khoản nền tảng và chính sách trước phát hành.

## Ngoài phạm vi

Cam kết toàn bộ lịch sử; giám sát khi đóng tab; xác minh danh tính; Instagram/Threads; ứng dụng di động; ảnh/audio; tự gửi tin, chặn người hoặc giao dịch; huấn luyện mô hình lớn trên máy 8 GB.

Tạm dừng giữ ngữ cảnh, xem bản nháp/xuất báo cáo ngay trong panel, feedback và ledger nhiều loại là bước tiếp theo. Xuất JSON ở phòng thử không phải xuất báo cáo bảo vệ. Xem [kế hoạch sản phẩm](product-plan.md).

## Nghiệm thu

Facebook: chọn A, mở/nhắn B không đọc B; đóng A giữ lựa chọn, mở lại A nối đúng ID; không lặp tin khi dựng lại DOM; lịch sử ghép đúng thứ tự. Demo đổi route dừng và cần bật lại. Không hiện kết quả phiên đã tắt; lỗi kết nối không biến thành “an toàn”; tắt/xóa không giữ nội dung phiên. Fixture, probe DOM và phiên extension thật phải được báo cáo tách biệt.
