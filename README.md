# ChatGuard VN

Tiện ích Chrome hỗ trợ nhận diện dấu hiệu thao túng và lừa đảo trong một cuộc trò chuyện do người dùng chọn.

## Trạng thái MVP

- Có extension WXT/React, backend FastAPI và phòng thử hội thoại tổng hợp.
- Có vòng chọn người → bật bảo vệ → đọc tin → phân tích → cảnh báo có bằng chứng → tắt/xóa phiên.
- Có kiểm tra backend, phục hồi khi mở lại bảng tiện ích, nhập/xuất hội thoại JSON, xem tin bằng chứng và xử lý quota/thử lại.
- Mặc định dùng **bộ luật minh họa**, không phải mô hình AI đã huấn luyện.
- Có tích hợp Groq tùy chọn, cần khóa API và đồng ý gửi ngữ cảnh. Không có khóa thì không gọi AI bên ngoài.
- Bộ đọc ô chat nhỏ Facebook đã được đối chiếu với DOM thật của hai tài khoản thử. Panel liệt kê metadata các cuộc đang mở, chỉ đọc nội dung người được chọn; đóng ô chat giữ lựa chọn và chờ đúng cuộc được tải lại. Giao diện khác vẫn cần kiểm chứng.
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
- Ngữ cảnh và token local lưu bằng `chrome.storage.session`, không đồng bộ tài khoản. Chỉ một người được theo dõi; tắt/xóa trước khi chọn người mới. Đóng ô chat nhỏ giữ lựa chọn; đóng/tải lại tab Facebook hoặc đổi đường dẫn dừng phiên.
- Backend chỉ lắng nghe `127.0.0.1`, dùng token, giới hạn đầu vào/lượt gọi và không ghi nội dung chat vào log hay cơ sở dữ liệu.
- Chế độ Groq gửi phần ngữ cảnh được chọn tới Groq sau khi đồng ý. Ưu tiên dữ liệu tổng hợp khi thử; xem [chính sách dữ liệu Groq](https://console.groq.com/docs/your-data).
- Mức 1 giữ tối đa 100 tin/24.000 ký tự; mức 2 giữ tối đa 300 tin/72.000 ký tự. Nút nạp lịch sử chỉ cuộn trong đúng cuộc đã chọn và báo số tin thực tế. Groq nhận tối đa 40 tin gần nhất/6.000 ký tự mỗi lượt, cách nhau tối thiểu 30 giây; ID thật được thay bằng mã tạm trước khi gửi. Không cam kết lấy đủ lịch sử hoặc đọc tin khi Facebook đã gỡ ô chat khỏi DOM; không tự gửi tin.
- Cảnh báo không xác minh danh tính, không chứng minh một người phạm tội hoặc cuộc trò chuyện an toàn.

Không commit `.env`, dữ liệu riêng tư, model weights hoặc checkpoints. Khóa Groq chỉ đặt trong `apps/api/.env`, không trong extension.

## Tài liệu

- [Phạm vi MVP](docs/mvp.md)
- [Kiến trúc](docs/architecture.md)
- [Giao diện và thao tác](docs/extension-ux.md)
- [Nguồn dữ liệu tổng hợp](docs/data-sources.md)
- [Các bước tiếp theo](docs/next-steps.md)
- [Quy định dữ liệu](ml/data/README.md)
