# Review tích hợp Facebook

Cập nhật: 14/10/2026. Review bắt đầu 13/10/2026; phạm vi chọn một người trong ô chat nhỏ, nhận tin văn bản, phân tích và giữ lựa chọn khi đóng ô chat. Các xác minh phiên thật dưới đây là lịch sử thử nghiệm, không chứng minh mọi phiên bản sau tự động đã được nạp trên Brave.

## Đã sửa

- Bộ đọc cũ tìm `role=grid` ở vùng main và phụ thuộc route toàn trang. Ô chat thật đã kiểm tra dùng `role=log`, ID cuộc từ header và `data-message-id` ở tin.
- Không dùng tên/ảnh/vị trí làm khóa. Khớp ID số của header với tiền tố ID tin; hai vùng cùng định danh hoặc ID không khớp sẽ không được đọc.
- Khám phá danh sách đối tượng không đi vào nhánh nội dung tin, kể cả nhãn trợ năng. Chỉ người được chọn mới có nội dung vào Scope và API.
- Đóng ô chat giữ lựa chọn và bộ đệm, chuyển trạng thái chờ; chỉ nối lại đúng định danh. Tắt/xóa vẫn xóa phiên.
- Ghép lịch sử tải ngược theo anchor ID, giữ thứ tự và loại trùng; giới hạn 100/300 tin và ký tự tương ứng.
- Bộ luật phân biệt câu hỏi kiểm chứng phí ở ngôi thứ nhất với yêu cầu chuyển tiền; câu gây áp lực “tại sao bạn chưa chuyển khoản?” vẫn được xem xét.
- Groq nhận mã tin tạm theo request; ID tài khoản/tin gốc chỉ được ánh xạ lại ở backend để hiển thị bằng chứng.
- Giới hạn body bằng đọc stream có trần trước khi parse; lỗi schema không lặp lại nội dung riêng tư.
- API có trạng thái chẩn đoán cần token, không chứa chat hoặc định danh gốc.
- Bản nháp/báo cáo dùng buffer đúng cuộc đã chọn, không thêm nguồn đọc Facebook. Background kiểm tra session/conversation khi xuất; file bỏ metadata tên/ID gốc và không tự gọi Groq. Xem [báo cáo](reports.md).

## Xác minh trên Brave — 2026-10-14

Sau khi người dùng reload, panel báo 10 tin và hiển thị kết quả Groq. API local xác nhận 2 lượt hoàn tất, lượt gần nhất phân tích 10 tin, provider Groq, mức review, dấu vân tay cuộc trùng đối tượng đã chọn. Luồng đọc → API → kết quả của phiên Brave đã được xác minh; không chỉ dựa trên probe.

Kết quả người dùng cung cấp có cả bằng chứng `self` do trước đó hai bên đổi vai thử nghiệm, và danh sách giới hạn rỗng. Bản sửa tiếp theo chỉ chấp nhận evidence của `other` trong Groq, thêm giới hạn cố định và làm sạch phần tử trống. Giao diện bỏ ID nội bộ khỏi bằng chứng. Người dùng đã nạp DEV; API nhận lượt Groq đúng cuộc và nhận lượt cập nhật tiếp theo với số tin tăng từ 5 lên 20.

Người dùng báo mở extension rồi đóng chat làm mất đối tượng. Review phát hiện toolbar và nút kết nối cùng gọi ATTACH: trước đây luôn chèn lại reader, xóa phiên. Đã sửa ATTACH trên cùng tab tái sử dụng reader đã xác minh cùng build, giữ session/người/bộ đệm. Chỉ reader thiếu hoặc sai build mới cần kết nối mới. Regression fixture kiểm tra cả kết nối lại lúc đang đọc và lúc chat đóng; session và người A không đổi.

## Chưa coi là hoàn tất

- Người dùng đã xác nhận giữ theo dõi khi đóng chat sau sửa ATTACH. Phiên bản UX mới đã kiểm thử local, vẫn cần phản hồi sử dụng trực tiếp trên Brave. Cập nhật background có thể ngắt phiên một lần; khác với mở panel trong cùng bản đang chạy.
- Chưa có 300 tin thật trong cuộc thử để xác minh đủ 300 trên Facebook. Kiểm thử đã đạt cho DOM mô phỏng tải từng đợt từ 30 lên 300 tin, không phải cam kết mọi tài khoản tải đủ lịch sử.
- Đóng panel đã được kiểm thử tiếp tục phân tích trong nền, phục hồi bằng alarm sau khi worker dừng và mở lại cùng session. Không bảo đảm nhận tin trong lúc Facebook đã gỡ ô chat khỏi DOM, khi tab đóng hoặc máy ngủ; lịch có thể trễ. Xem [chế độ nền](background-mode.md).
- Giao diện tài khoản khác, chat nhóm, bố cục toàn trang, tiếng Anh, sửa/thu hồi qua mọi kiểu DOM và chất lượng AI trên tập độc lập cần kiểm chứng thêm.

## Giới hạn công cụ kiểm thử

E2E dùng profile Chromium riêng và DOM tổng hợp; thao tác toolbar/native side panel và cập nhật bản đang nạp phải được nghiệm thu trong trình duyệt thật. Nạp/reload extension qua trang quản lý của trình duyệt. Thử với tài khoản được phép, không mở rộng sang hộp thư/cuộc khác hoặc dùng API nội bộ để lấy thêm dữ liệu.

Kiểm tra báo cáo riêng: chỉ dữ liệu A, bản nháp biến mất khi dừng, yêu cầu xuất A bị từ chối sau chuyển B, HTML không thực thi nội dung chat. Báo cáo trên thiết bị và dữ liệu Groq đã nhận nằm ngoài thao tác xóa phiên; xem [quyền riêng tư](privacy.md).
