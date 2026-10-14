# Nguồn tình huống và giới hạn dữ liệu

Cập nhật: 14/10/2026.

## Dữ liệu đang có

`apps/api/demo/scenarios.json` chứa 9 hội thoại tổng hợp: CTV, bạn học, giả danh cơ quan, xin OTP, nhắc trả nợ, lời nhắc cảnh giác, thay đổi phí, giữ giấy tờ/cô lập và phỏng vấn bình thường.

Không lấy hộp thư hoặc hội thoại riêng từ mạng xã hội. `expected` là nhãn regression của baseline, chưa phải nhãn chuyên gia hoặc kết luận về người thật. Demo không phải test độc lập cho chất lượng AI.

Fixture unit/E2E cũng tổng hợp. Thử Facebook thật chỉ với tài khoản được phép và nội dung đóng vai; kiểm tra adapter không tự tạo dataset train.

## Nguồn tham khảo thủ đoạn

- [Cẩm nang phòng chống lừa đảo của Bộ Công an, bản do Công an Lâm Đồng đăng](https://congan.lamdong.gov.vn/Uploaded/files/thong-bao/2025/C%E1%BA%A9m%20nang%20phong%20chong%20lua%20dao%20-%20BCA%20222.pdf).
- [Bộ Công an: cảnh báo nhận quà kèm QR giả](https://www.bocongan.gov.vn/bai-viet/canh-bao-thu-doan-tang-qua-trung-thu-du-quet-ma-qr-de-chiem-doat-tai-san-1789980256).

Nguồn dùng để tham khảo mô tả thủ đoạn; không tuyên bố câu chat demo trích nguyên văn. Khi mở rộng, ghi nguồn, quyền sử dụng, ngày thu thập, mức ẩn danh và hướng dẫn nhãn.

## Groq và dữ liệu ra ngoài

[Quickstart](https://console.groq.com/docs/quickstart), [hạn mức](https://console.groq.com/docs/rate-limits), [chính sách dữ liệu](https://console.groq.com/docs/your-data). Khả năng truy cập model/quota phụ thuộc tài khoản và thời điểm; không bảo đảm miễn phí vô hạn. Mock không thay thế gọi thật.

API key dùng cho inference, không tự train. Alias ID chỉ giảm định danh metadata; văn bản vẫn có thể chứa thông tin cá nhân. Xuất báo cáo cục bộ không gọi Groq hoặc tự đưa dữ liệu vào ML.

Xem [dataset](../ml/data/README.md), [đánh giá](../ml/evaluation/README.md), [quyền riêng tư](privacy.md).
