# Tài liệu ChatGuard VN

Cập nhật: 14/10/2026. Chỉ mục cho trạng thái triển khai, cách dùng và phần phát triển tiếp theo.

## Dùng thử

- [README dự án](../README.md): chạy local và giới hạn chính.
- [Hướng dẫn demo](demo-guide.md): một vòng từ chọn người đến xuất/xóa.
- [Giao diện extension](extension-ux.md): thao tác thường ngày.
- [Facebook và lịch sử 100/300](facebook-mvp.md): phạm vi hỗ trợ và đóng ô chat.
- [Chạy khi đóng panel](background-mode.md): lịch, badge và worker.
- [Bản nháp/báo cáo JSON–HTML](reports.md): xem, tải, trạng thái đánh giá và quản lý file.
- [Quyền riêng tư](privacy.md): dữ liệu ở đâu, gửi gì và xóa được gì.

## Phát triển và nghiệm thu

- [Phạm vi MVP](mvp.md) và [kế hoạch sản phẩm](product-plan.md).
- [Kiến trúc](architecture.md), [hợp đồng API](api-contract.md), [phát triển DEV](development.md).
- [README extension](../apps/extension/README.md), [README backend](../apps/api/README.md).
- [Review Facebook](facebook-review.md) và [kết quả kiểm thử](verification.md).
- [Các bước tiếp theo](next-steps.md).

## AI/ML

- [Nguồn tình huống](data-sources.md).
- [Quy định dữ liệu](../ml/data/README.md).
- [Đánh giá](../ml/evaluation/README.md).
- [Huấn luyện](../ml/training/README.md).

Đọc “đã có trong mã”, “đã thử trên fixture” và “đã xác minh phiên thật” như ba mức bằng chứng khác nhau. Regression tổng hợp không phải độ chính xác thực tế; Groq inference không phải model đã được nhóm train.
