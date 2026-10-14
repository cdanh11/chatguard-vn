# Huấn luyện và cải thiện mô hình

Cập nhật: 14/10/2026. **Chưa có pipeline fine-tune hoặc model đã train của ChatGuard VN.** Groq dùng mô hình có sẵn để inference; nhập API key không thực hiện huấn luyện.

## Làm trước khi train

1. Chốt taxonomy: phí/ứng tiền, mã truy cập, áp lực, thay đổi phí và yêu cầu kiểm soát cụ thể.
2. Xây dữ liệu có nguồn, vai gửi, bằng chứng và nhãn theo diễn biến; bổ sung hard negatives tiếng Việt.
3. Đo rules và Groq với prompt cố định trên cùng ngữ cảnh; ghi model, ngày chạy, cấu hình và lỗi.
4. Chọn cải tiến bằng dev, đánh giá trên test giữ kín. Phân biệt lỗi DOM, chọn ngữ cảnh và mô hình trước khi fine-tune.

## Khi nào xét fine-tune?

Khi có dữ liệu được phép dùng, lỗi lặp đo được và baseline đủ ổn để so sánh. SFT/QLoRA là hướng thử sau đó; không tải model lớn vào máy 8 GB để chạy MVP. Chọn GPU/runtime và phiên bản thư viện khi có bài toán cụ thể.

Không lấy báo cáo riêng tư làm dataset tự động, không trộn biến thể cùng họ giữa train/test, không commit weights/checkpoints.

Xem [dữ liệu](../data/README.md), [đánh giá](../evaluation/README.md), [phân công](../../docs/product-plan.md#10-phân-công-nhóm-3-người).
