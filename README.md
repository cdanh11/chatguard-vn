# ChatGuard VN

Tiện ích Chrome hỗ trợ nhận diện dấu hiệu thao túng và lừa đảo trong một cuộc trò chuyện do người dùng chọn.

## Trạng thái MVP

- Có extension WXT/React, backend FastAPI và phòng thử hội thoại tổng hợp.
- Có vòng bật bảo vệ → đọc tin → phân tích → cảnh báo có bằng chứng → dừng/xóa khi đổi cuộc.
- Có kiểm tra backend, phục hồi khi mở lại bảng tiện ích, nhập/xuất hội thoại JSON, xem tin bằng chứng và xử lý quota/thử lại.
- Mặc định dùng **bộ luật minh họa**, không phải mô hình AI đã huấn luyện.
- Có tích hợp Groq tùy chọn, cần khóa API và đồng ý gửi ngữ cảnh. Không có khóa thì không gọi AI bên ngoài.
- Adapter Facebook đang thử nghiệm; phải kiểm chứng/hiệu chỉnh trên giao diện thực trước khi tuyên bố hỗ trợ. Lỗi xác định phạm vi sẽ dừng thu thập.
- Chưa có model fine-tune, số liệu chất lượng thực tế, ứng dụng di động hoặc bản phát hành công khai.

## Chạy local

Yêu cầu Windows, Node.js 22+ và Python 3.11. Không cần Docker, GPU hay model weights.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-backend.ps1
```

Mở `chrome://extensions`, bật Developer mode và Load unpacked thư mục `apps/extension/.output/chrome-mv3`.

Mở `http://127.0.0.1:8000/demo/#ctv`, bấm biểu tượng ChatGuard VN. Nhập token local từ cửa sổ backend, lưu, kết nối tab và bật bảo vệ. Phát từng tin trong phòng thử để quan sát kết quả.

Hướng dẫn chi tiết: [Chạy một vòng bảo vệ](docs/demo-guide.md).

## Cấu trúc

```text
apps/extension/   WXT + React + TypeScript, Manifest V3
apps/api/         FastAPI, schema, baseline rules, adapter Groq, demo, tests
ml/data/          Quy định dữ liệu (không commit hội thoại riêng tư)
ml/training/      Kế hoạch huấn luyện
ml/evaluation/    Kế hoạch đánh giá
scripts/         Cài đặt, chạy và kiểm tra trên Windows
docs/            Phạm vi, kiến trúc, nguồn tình huống và giới hạn
```

## Kiểm tra

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check.ps1
```

Tests kiểm tra schema, quyền truy cập, bằng chứng, phạm vi cuộc trò chuyện, loại trùng và kết quả đến muộn. Bộ tình huống nhỏ không đủ để công bố độ chính xác ngoài thực tế.

## Quyền riêng tư và giới hạn

- Không yêu cầu mật khẩu, cookie, token Facebook hoặc PIN Messenger.
- Content script chỉ được chèn khi người dùng chủ động kết nối tab; đọc nội dung chỉ sau khi bật bảo vệ.
- Quyền Chrome ở mức trang/tab; giới hạn theo cuộc do phần mềm thực thi.
- Ngữ cảnh và token local lưu bằng `chrome.storage.session`, không đồng bộ tài khoản; đổi cuộc sẽ xóa phiên cũ và cần bật lại.
- Backend chỉ lắng nghe `127.0.0.1`, dùng token, giới hạn đầu vào/lượt gọi và không ghi nội dung chat vào log hay cơ sở dữ liệu.
- Chế độ Groq gửi phần ngữ cảnh được chọn tới Groq sau khi đồng ý. Ưu tiên dữ liệu tổng hợp khi thử; xem [chính sách dữ liệu Groq](https://console.groq.com/docs/your-data).
- Bộ đệm tối đa 100 tin/24.000 ký tự; Groq nhận tối đa 40 tin gần nhất/6.000 ký tự mỗi lượt, cách nhau tối thiểu 30 giây. Giao diện hiển thị số tin đã phân tích. Không tải tự động toàn bộ lịch sử, không đọc chat nổi hoặc tự gửi tin.
- Cảnh báo không xác minh danh tính, không chứng minh một người phạm tội hoặc cuộc trò chuyện an toàn.

Không commit `.env`, dữ liệu riêng tư, model weights hoặc checkpoints. Khóa Groq chỉ đặt trong `apps/api/.env`, không trong extension.

## Tài liệu

- [Phạm vi MVP](docs/mvp.md)
- [Kiến trúc](docs/architecture.md)
- [Nguồn dữ liệu tổng hợp](docs/data-sources.md)
- [Các bước tiếp theo](docs/next-steps.md)
- [Quy định dữ liệu](ml/data/README.md)
