# Trải nghiệm tiện ích

Cập nhật: 14/10/2026. Tập trung vào một cuộc trò chuyện, thao tác thường ngày và bằng chứng.

Màn hình chính tập trung vào cuộc đang được bảo vệ và điều cần làm tiếp theo. Cấu hình dịch vụ, token, ngân sách tin và chẩn đoán không xuất hiện trên đường dùng thường ngày.

## Bắt đầu

- Lần đầu: nhập token và chọn nơi phân tích trong cài đặt. Groq vẫn yêu cầu đồng ý rõ ràng gửi văn bản ra ngoài.
- Mở biểu tượng trên tab chat. Nếu chỉ có một người khả dụng, hiện tên và nút **Bật bảo vệ cuộc này**. Nếu có nhiều người, chọn một người trước khi bật. Khám phá vẫn chỉ đọc metadata.
- Bấm bật trên Facebook đồng thời bật bộ đọc cho cuộc được chọn, không cần tìm thêm công tắc kỹ thuật. Không tự bật consent Groq.
- Chưa có cuộc khả dụng: chỉ dẫn mở ô chat rồi kết nối. Danh sách có thể làm mới, không tự chọn người khác khi đang theo dõi.

## Đang theo dõi

Thẻ trên cùng có tên, trạng thái, số tin và thao tác **Đổi người** / **Tắt & xóa**. Không hiển thị dropdown người hoặc nút bật đã bị vô hiệu hóa. Đổi người dừng/xóa phiên trước, cho chọn lại và vẫn cần bấm bật mới đọc nội dung người mới.

Đóng chat giữ thẻ tên và thông báo chờ mở lại đúng cuộc. Mở cài đặt rồi quay lại không thay đổi phiên. Lưu cấu hình sẽ dừng phiên và được ghi rõ trên màn hình cài đặt.

## Cảnh báo

- Hiện mức đánh giá, tóm tắt và hai bước kiểm chứng đầu tiên. Tóm tắt dài có nút đọc đầy đủ; đoạn ngắn không bị cắt âm thầm.
- Bằng chứng được gộp theo ID tin để tránh lặp cùng một câu ở nhiều dấu hiệu. Mở **Xem N tin liên quan** để đọc và chuyển tới tin trên Facebook. ID kỹ thuật không hiển thị.
- Khi có tin mới và đang chờ phân tích, giữ đánh giá trước kèm nhãn chưa cập nhật nếu toàn bộ văn bản làm ngữ cảnh trước vẫn nguyên vẹn. Sửa/xóa tin, mất ngữ cảnh cũ hoặc đổi phạm vi sẽ bỏ đánh giá cũ. Kết quả đến muộn không ghi đè phiên mới.
- Mức chưa thấy dấu hiệu không được trình bày như xác nhận an toàn. Không xác minh danh tính.

## Phần phụ

**Tùy chọn cuộc trò chuyện** chứa mức 100/300 và đọc thêm tin cũ. **Giới hạn đánh giá** mở khi cần. Nút cài đặt ở header mở một màn hình riêng; build DEV và mã reader nằm trong **Thông tin kỹ thuật**.

**Bản nháp & báo cáo** xuất hiện khi đang bảo vệ. Mở bản nháp để xem 25 tin gần nhất, chọn xem thêm 25 tin trước nếu cần. Không hiển thị toàn bộ 300 tin lên màn hình chính.

Mặc định tải chỉ cảnh báo và bằng chứng; có lựa chọn toàn bộ bản nháp trong bộ đệm. Chọn JSON để kiểm tra dữ liệu hoặc HTML để đọc/in rồi bấm **Tải báo cáo**. Việc tải kiểm tra lại đúng phiên, không gọi AI và không làm dừng bảo vệ. Nếu chưa có đánh giá, file ghi rõ chưa có kết quả; không tự diễn giải thành an toàn.

File không kèm metadata tên hồ sơ/token/ID Facebook nhưng câu chat có thể chứa thông tin riêng tư. Cảnh báo này nằm ngay cạnh nút tải; không thêm modal vào mỗi lần xem bản nháp. Xem [báo cáo](reports.md).

Có thể đóng panel và nhận dấu `!` từ toolbar/nút nhỏ trên trang. Tần suất mỗi tin hoặc gộp 5 tin nằm trong cài đặt. Xem [theo dõi trong nền](background-mode.md).

Kiểm thử trình duyệt kiểm tra layout 360px không tràn ngang, cảnh báo thấy trong viewport đầu, mở/đóng cài đặt giữ session, đổi người chưa đọc trước khi bật, bằng chứng, đóng/mở chat, lịch sử và các lỗi vận chuyển. Ảnh ở `outputs/` là dữ liệu tổng hợp, không commit.

Tạm dừng giữ ngữ cảnh chưa có; **Tắt & xóa** và **Đổi người** đều kết thúc dữ liệu phiên. Không dùng cùng nhãn cho hai hành vi khác nhau.
