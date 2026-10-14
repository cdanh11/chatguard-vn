# Kiến trúc MVP

```text
Người dùng bấm extension → mở Side Panel
  → Kết nối tab (activeTab): chèn content script, chỉ đọc metadata
  → Bật bảo vệ: chọn conversation ID, tạo session ID
  → Adapter đọc vùng tin → Scope loại trùng, giới hạn ngữ cảnh, revision
  → Background lưu phiên, chờ gom tin, gọi API local có token
  → Pydantic kiểm tra đầu vào → rules hoặc Groq có consent
  → Kiểm tra evidence IDs
  → Chỉ hiển thị nếu conversation + session + revision vẫn khớp
```

## Dữ liệu và trạng thái

Nội dung chỉ trong DOM, bộ nhớ content script, `chrome.storage.session`, request và bộ nhớ server. Không ghi DB, log hoặc đồng bộ. Chế độ Groq gửi dữ liệu tới dịch vụ ngoài; phải đồng ý rõ. Đổi cấu hình dừng phiên để không tiếp tục với quyền cũ.

Service worker có thể bị dừng. Lịch phân tích nằm trong session storage và alarm; worker kiểm tra đúng phiên rồi đặt lại lịch khi khởi động. Không giữ worker sống vô hạn và không cam kết giám sát khi tab Facebook đóng. Đóng ô chat nhỏ giữ người đã chọn; khi log không còn được xác minh, trạng thái là chờ và không đọc người khác.

Mở lại panel khôi phục tab đã chọn. Panel kiểm tra trạng thái mỗi giây để hiển thị; việc xếp lịch, gọi API và cập nhật badge không phụ thuộc panel. Timer ưu tiên đáp ứng nhanh, alarm phục hồi khi worker nghỉ; trình duyệt hoặc máy ngủ có thể làm trễ. Quyền `alarms` chưa được nạp thì từ chối START với hướng dẫn reload, không crash tiến trình nền.

Buffer giữ mặc định 100 tin/24.000 ký tự, tùy chọn 300 tin/72.000 ký tự. Bộ luật dùng buffer này; Groq nhận tối đa 40 tin/6.000 ký tự. Giữ tối đa 8 phát biểu cũ về không thu phí (tổng tối đa 1.500 ký tự), dành phần còn lại cho tin gần nhất, không cắt giữa tin và giữ thứ tự nguồn. Đây là chọn ngữ cảnh có khoảng trống, chưa phải bộ nhớ ngữ nghĩa đầy đủ. Hạn chờ Groq lưu trong session storage. Tin mới được gộp vào lượt kế tiếp; đánh giá trước chỉ giữ nếu toàn bộ nguồn cũ còn nguyên vẹn và luôn báo chưa cập nhật. Dấu hiệu ngoài phần gửi vẫn có thể bị bỏ sót.

## Adapter

Demo dùng các thuộc tính có định danh ổn định. Facebook dùng metadata header ô chat nhỏ, liên kết hồ sơ dạng số, `role=log` và tiền tố `data-message-id` để xác minh đối tượng. Khám phá bỏ qua toàn bộ cây tin nhắn; chỉ sau chọn/bật mới đọc nội dung trong log khớp. Nhãn bên gửi không hiểu được là `unknown`. Không đoán ID bằng tên/nội dung, không lấy cookie/token hay gọi API nội bộ.

Facebook là thử nghiệm cần hiệu chỉnh; interface thay đổi hoặc metadata thiếu có thể khiến bộ đọc dừng. Ưu tiên không đọc nhầm hơn cố thu thập bằng mọi cách.

## Phân tích

Rules là baseline có giới hạn, không phải AI đã train. Groq nhận JSON với ID tin đã thay bằng mã tạm và trả schema cố định; đoạn chat không được làm chỉ dẫn. Backend ánh xạ mã tạm về ID gốc sau khi xác minh. Không có phần trăm tự sinh. Bằng chứng hiển thị được lấy lại từ tin gốc, không dùng trích dẫn do mô hình bịa.

`app/claims.py` suy ra ledger phí trong từng lượt, chỉ từ `other`: không thu phí → yêu cầu tiền về sau, dẫn hai ID nguồn. Áp dụng cho rules và sau kết quả Groq hợp lệ; không chạy thay thế khi Groq lỗi. Không lưu ledger riêng hoặc suy ra gian dối. Bộ mẫu giới hạn bỏ qua câu hỏi, một số phủ định/trích dẫn/ngoại lệ; chưa xử lý mọi cách nói.

Yêu cầu giao giấy tờ gốc hoặc cấm liên lạc người thân có chính sách ưu tiên an toàn. Áp dụng sau kết quả Groq đã hợp lệ; không dùng chính sách này làm fallback khi API lỗi. Không gợi ý tiếp tục hỏi thử hoặc đi gặp trong các ca đó. `self` và `unknown` không được dùng làm bằng chứng quy yêu cầu cho đối phương.
