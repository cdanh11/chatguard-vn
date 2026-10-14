# Chạy một vòng bảo vệ

Cập nhật: 14/10/2026. Phòng thử gồm 9 kịch bản tổng hợp và không gửi tin cho người thật.

## Cài đặt

Yêu cầu: Windows PowerShell, Python 3.11 và Node.js 22+; Internet chỉ cần khi cài thư viện hoặc dùng Groq. Không cần Docker, GPU hoặc model weights.

Từ thư mục repo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-backend.ps1
```

Giữ cửa sổ backend mở. Token máy chủ được in để nhập vào tiện ích; không phải khóa Groq.

1. Mở `chrome://extensions`, bật Developer mode.
2. Chọn Load unpacked và thư mục `apps/extension/.output/chrome-mv3`.
3. Ghim ChatGuard VN trên thanh tiện ích.
4. Mở `http://127.0.0.1:8000/demo/#ctv`.
5. Bấm biểu tượng tiện ích để mở Side Panel. Nhập token máy chủ, giữ chế độ bộ luật và lưu.
6. Nếu chưa thấy cuộc trò chuyện, bấm **Kết nối tab đang mở**. Kiểm tra tên, rồi **Bật bảo vệ cuộc này**.
7. Phát từng tin. Khi tổ hợp dấu hiệu xuất hiện, cảnh báo được hiển thị. Mở **Xem N tin liên quan** để xem câu gốc.
8. Chuyển sang Minh: phiên dừng và nội dung cũ bị xóa. Phát tin của Minh không được tự phân tích.
9. Quay lại CTV, bấm bật lại. Mở **Bản nháp & báo cáo** để đọc phần đã nhận và tải JSON/HTML khi cần. Chọn toàn bộ bản nháp chỉ khi muốn đưa tất cả tin trong buffer vào file.
10. Để kết thúc bấm **Tắt & xóa**. File đã tải do bạn quản lý và không bị xóa theo phiên.

Bấm **Kiểm tra kết nối** trong cấu hình để kiểm tra backend/token (không gọi Groq, không kiểm tra quota). Bấm **Xem tin này** dưới bằng chứng để cuộn và tô sáng tin gốc trong phòng thử. Đóng/mở lại panel giữ phiên trong cùng phiên trình duyệt. Nút **Làm lại** xóa phiên bảo vệ; cần bật lại chủ động.

## Nhập tình huống của nhóm

Trong phòng thử, chọn file JSON ở cuối trang. Nội dung mẫu:

```json
{"name":"Tình huống tuyển CTV", "messages":[
  {"sender":"other", "text":"Em chuyển khoản 300k kích hoạt tài khoản nhé"},
  {"sender":"self", "text":"Tôi cần xác minh công ty trước"}
]}
```

Cho phép `self`, `other`, `unknown`; 1–100 tin, mỗi tin tối đa 4.000 ký tự, tổng tối đa 24.000 ký tự, file tối đa 160 KB. File được kiểm tra và đọc tại trình duyệt; không tự upload. Chuyển sang cuộc nhập sẽ dừng phiên cũ. Bật lại bảo vệ rồi phát tin. **Xuất hội thoại hiện tại** tải file chứa những tin đã phát và tin tự thêm; lưu ý nếu bạn tự nhập nội dung riêng tư. Các cuộc nhập tồn tại tới lúc tải lại trang.

Trang thử không gửi tin cho người thật. Các ca được biên soạn, không phải bản chép tin nhắn của nạn nhân.

Định dạng JSON kịch bản demo khác báo cáo phiên. Báo cáo có mức đánh giá, nguồn bằng chứng và trạng thái cập nhật; không nhập báo cáo như dataset hoặc kịch bản tự động. Xem [bản nháp/báo cáo](reports.md).

## Groq tùy chọn

- Tạo khóa tại https://console.groq.com/keys trên tài khoản GroqCloud.
- Điền `GROQ_API_KEY` trong `apps/api/.env`, giữ `GROQ_MODEL=openai/gpt-oss-120b`, rồi khởi động lại backend. Model khác cần hỗ trợ strict structured outputs.
- Trong tiện ích chọn Groq và xác nhận đồng ý gửi ngữ cảnh. Lưu cấu hình sẽ dừng mọi phiên; cần bật lại.
- Không tự gắn billing; hạn mức và khả năng truy cập không được đảm bảo.
- Dùng dữ liệu tổng hợp khi thử. Chính sách xử lý dữ liệu: https://console.groq.com/docs/your-data .
- Hạn mức có cả lượt gọi và token; xem https://console.groq.com/docs/rate-limits . Không gọi lại ngay liên tục khi nhận 429.
- Lỗi hạn mức/kết nối được hiển thị; không âm thầm đổi sang bộ luật và gọi đó là kết quả AI.
- Mỗi lượt Groq dùng tối đa 40 tin/6.000 ký tự: phần gần nhất và một số phát biểu cũ về phí còn trong bộ đệm; chờ tối thiểu 30 giây giữa các lượt. Đây là mức tiết kiệm cho MVP, không bảo đảm tránh mọi quota. Khi 429, chờ thời gian hiển thị rồi bấm thử lại. Số tin thực sự được phân tích hiện bên dưới kết quả.

## Facebook thật

Bộ đọc thử nghiệm hiện tập trung vào ô chat nhỏ trên Facebook. Đã đối chiếu DOM của hai tài khoản thử; không suy ra mọi tài khoản/giao diện đều được hỗ trợ. Xem [chọn một người và mức lịch sử 100/300](facebook-mvp.md). Chat nhóm, ảnh/audio và bố cục toàn trang chưa được xác minh đầy đủ.

Bạn tự đăng nhập. Dùng tài khoản thứ hai do bạn sở hữu hoặc một người đồng ý tham gia. Có thể lấy kịch bản từ `apps/api/demo/scenarios.json`; không dùng link, OTP hay giao dịch thật.

Kết nối tab, chọn đúng một đối tượng và bật bảo vệ; bộ đọc Facebook được bật qua thao tác này. Danh sách chỉ lấy metadata, không đọc nội dung các cuộc chưa chọn. Nếu định danh header và tin không khớp, không đọc. Đóng ô chat giữ lựa chọn nhưng có thể gián đoạn nhận tin; mở lại đúng cuộc để nối lại. Xem [giao diện và thao tác](extension-ux.md). Cần kiểm chứng luồng extension thật, không suy ra từ demo/fixture.

Nếu thử một mình và chưa có tài khoản thứ hai, dùng phòng thử local để trình bày toàn bộ vòng đời. Không cần tạo tài khoản giả hay đưa thông tin đăng nhập cho người khác.

## Kiểm tra

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check.ps1
```

Tập thử nhỏ kiểm tra cơ chế; không phải số liệu độ chính xác cho sử dụng thực tế.

Đánh giá baseline trên nhãn tổng hợp hiện có (không gọi dịch vụ ngoài): từ `apps/api`, chạy `.\.venv\Scripts\python.exe evaluate.py`. Báo cáo nằm tại `outputs/baseline-evaluation.json`. Nhãn do nhóm biên soạn, chưa phải tập test độc lập. Chưa có huấn luyện model trong vòng MVP này.

Kiểm tra trên trình duyệt (tùy chọn, giữ backend đang chạy):

```powershell
cd apps/extension
npx playwright install chromium
npm run test:e2e
npm run test:e2e:recruitment
npm run test:e2e:reports
```

Nếu đã có Chromium hỗ trợ unpacked extension, đặt `CHROMIUM_EXECUTABLE` tới file thực thi để bỏ qua bước tải. Bài thử dùng profile tạm riêng, dữ liệu tổng hợp và xóa profile khi kết thúc; không dùng tài khoản Facebook của bạn. Side Panel được mở như trang extension để kiểm tra tự động, nên thao tác bấm biểu tượng mở Side Panel vẫn cần kiểm tra thủ công trong Chrome.
