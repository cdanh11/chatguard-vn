# Quyền riêng tư và vòng đời dữ liệu

Cập nhật: 14/10/2026. Mô tả bản local hiện tại; không tuyên bố đã đáp ứng toàn bộ yêu cầu phát hành công khai.

## Phạm vi thu thập

Trước khi bật bảo vệ, extension chỉ lấy metadata để liệt kê cuộc đang mở. Nội dung chỉ đọc sau thao tác chọn/bật và khi xác minh đúng người. Giới hạn theo cuộc do phần mềm thực thi; quyền trình duyệt vẫn ở mức tab/trang.

Không yêu cầu mật khẩu, cookie, token Facebook hoặc PIN Messenger. Không tự gửi tin, mở cuộc khác hoặc gọi API nội bộ Facebook. Việc đọc không bao gồm ảnh/voice và không bảo đảm toàn bộ lịch sử.

## Dữ liệu nằm ở đâu?

| Nơi | Dữ liệu và vòng đời |
|---|---|
| Trang Facebook | DOM do nền tảng quản lý; extension không xóa hộp thư Facebook |
| Content script | Bộ đệm của đúng cuộc, xóa khi dừng/route đổi hoặc script bị hủy |
| `chrome.storage.session` | Nội dung, kết quả, cấu hình và token local trong phiên; không đồng bộ tài khoản |
| Backend local | Request và kết quả trong bộ nhớ, không DB/chat log; status chỉ metadata tối đa 12 mốc |
| Groq khi có consent | Phần văn bản chọn và ID tạm, theo chính sách nhà cung cấp |
| Báo cáo tải xuống | File do người dùng chủ động tạo và quản lý; tồn tại độc lập với phiên |
| `.env` backend | Khóa Groq/token local; Git bỏ qua, không đưa vào extension hoặc báo cáo |

`storage.session` bị xóa khi extension reload/cập nhật/tắt hoặc trình duyệt restart; worker bị dừng riêng không đồng nghĩa xóa phiên. Xem [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage?hl=en).

## Groq và sự đồng ý

Rules chạy qua backend trên máy, không gọi AI bên ngoài. Groq chỉ hoạt động khi có khóa backend, chọn provider và đồng ý gửi văn bản. Đổi/lưu cấu hình dừng phiên; không tự bật consent hoặc đổi provider khi lỗi.

Ngân sách Groq tối đa 40 tin/6.000 ký tự mỗi lượt, có thể gồm mốc phí cũ. ID thật được thay bằng alias, nhưng nội dung chat không được tự động ẩn toàn bộ thông tin cá nhân. Dùng dữ liệu tổng hợp khi demo và đọc [chính sách Groq](https://console.groq.com/docs/your-data) trước gửi nội dung thật.

## Dừng, xóa và xuất

**Tắt & xóa** / **Đổi người** hủy lịch và yêu cầu ứng dụng đang quản lý, xóa buffer/kết quả phiên; phản hồi đến muộn không được gắn lại vào phiên. Không thể cam kết hủy xử lý hoặc xóa bản sao đã được nhà cung cấp nhận chỉ bằng việc abort request local.

Đóng panel không dừng bảo vệ. Đóng ô chat nhỏ giữ lựa chọn và buffer, chờ nếu DOM biến mất. Đóng/tải lại tab hoặc đổi route dừng phiên theo hành vi hiện tại. Chưa có pause giữ ngữ cảnh riêng.

Xuất JSON/HTML là thao tác riêng, không gọi AI; file không kèm metadata định danh/token nhưng giữ nguyên văn bản được chọn. Xóa phiên không xóa file đã tải hoặc đã chia sẻ. Xem [báo cáo](reports.md).

## Huấn luyện và chẩn đoán

Không tự dùng hội thoại, file xuất, phản hồi hoặc thử Facebook thật làm dữ liệu train. Cần nguồn/quyền sử dụng và chính sách dữ liệu riêng trước khi xây dataset.

Không log chat, prompt, khóa hoặc response body provider. Status cần token và dùng dấu vân tay định danh để đối chiếu phiên; đó là metadata có thể liên kết trong thời gian chạy, không phải cam kết ẩn danh tuyệt đối. Lỗi schema không echo input.

Xem [API](api-contract.md), [quy định dữ liệu](../ml/data/README.md), [phạm vi MVP](mvp.md).
