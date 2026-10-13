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

Service worker có thể bị dừng. Trạng thái nằm trong session storage; nếu tác vụ bị gián đoạn, người dùng thử phân tích lại. Không giữ worker sống vô hạn và không cam kết giám sát khi tab đóng.

Mở lại panel khôi phục tab đã chọn. Panel kiểm tra trạng thái mỗi giây: tái đặt lượt chờ nếu timer mất và báo gián đoạn nếu lượt đang chạy quá 35 giây. Cơ chế phục hồi này cần panel đang mở; chưa cam kết chạy liên tục trong nền.

Buffer giữ 100 tin/24.000 ký tự. Bộ luật dùng buffer này; Groq dùng phần cuối liên tục, tối đa 40 tin/6.000 ký tự, không cắt giữa tin. Hạn chờ Groq lưu trong session storage qua lần mở panel/worker. Tin mới hủy kết quả cũ và được gộp vào lượt kế tiếp; bản này chưa có bộ nhớ tóm tắt lịch sử dài. Nếu dấu hiệu nằm ngoài phần gửi Groq thì có thể bị bỏ sót.

## Adapter

Demo dùng các thuộc tính có định danh ổn định. Facebook chỉ nhận route toàn trang và một grid tin nhắn duy nhất, yêu cầu ID tin ổn định; nhãn người gửi không xác định được sẽ là `unknown`. Không đoán ID bằng nội dung, không lấy cookie/token hay gọi API nội bộ.

Facebook là thử nghiệm cần hiệu chỉnh; interface thay đổi hoặc metadata thiếu có thể khiến bộ đọc dừng. Ưu tiên không đọc nhầm hơn cố thu thập bằng mọi cách.

## Phân tích

Rules là baseline có giới hạn, không phải AI đã train. Groq nhận JSON và trả schema cố định; đoạn chat không được làm chỉ dẫn. Không có phần trăm tự sinh. Bằng chứng hiển thị được lấy lại từ tin gốc, không dùng trích dẫn do mô hình bịa.
