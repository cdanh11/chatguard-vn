# ChatGuard VN

Tiện ích trình duyệt ứng dụng AI phân tích hội thoại tiếng Việt và cảnh báo dấu hiệu thao túng, lừa đảo trực tuyến.

Dự án phát triển công cụ hỗ trợ người dùng nhận diện dấu hiệu thao túng và lừa đảo trong hội thoại trực tuyến.

## Trạng thái

Repo nền: đã có cấu trúc thư mục và tài liệu; chưa có ứng dụng chạy được, dependencies hoặc mô hình đã huấn luyện.

## Công nghệ dự kiến

- Extension: WXT, React, TypeScript, Chrome Manifest V3.
- Backend: Python, FastAPI, Pydantic.
- AI: đo mô hình nền, sau đó thử SFT/QLoRA với Transformers, TRL và PEFT.

## Cấu trúc

```text
apps/extension/   Tiện ích trình duyệt
apps/api/         Dịch vụ phân tích
ml/data/          Quy định dữ liệu (không commit dữ liệu thực)
ml/training/      Huấn luyện mô hình
ml/evaluation/    Đánh giá độc lập
docs/             Phạm vi và kiến trúc
```

## Tài liệu

- [Phạm vi MVP](docs/mvp.md)
- [Kiến trúc](docs/architecture.md)
- [Quy định dữ liệu](ml/data/README.md)

## Bắt đầu phát triển

Các thành phần hiện là khung thư mục. Khi triển khai, bổ sung manifest, dependencies, lockfile và lệnh chạy vào README tương ứng.

`.env.example` mô tả các biến dự kiến; chưa có ứng dụng tự nạp chúng. Khóa mô hình chỉ đặt ở backend. Không commit `.env`, hội thoại riêng tư hoặc model weights.

## Nguyên tắc

- Người dùng chọn cuộc trò chuyện và chủ động bật/tắt bảo vệ.
- Chỉ đọc cuộc đã chọn; dừng khi không xác minh được định danh.
- Cảnh báo có bằng chứng gốc và giới hạn ngữ cảnh rõ ràng.
- Không kết luận người gửi là tội phạm hoặc cuộc trò chuyện chắc chắn an toàn.
- Không thu thập mật khẩu, cookie, token hay PIN Facebook.
- Kiểm tra điều khoản nền tảng trước khi phát hành.
