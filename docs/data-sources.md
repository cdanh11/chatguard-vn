# Nguồn tình huống và giới hạn dữ liệu

Các hội thoại trong `apps/api/demo/scenarios.json` là dữ liệu tổng hợp do dự án biên soạn. Không lấy hộp thư, hồ sơ hay tin nhắn riêng từ mạng xã hội. Không coi chúng là dữ liệu nạn nhân thực tế.

Nguồn mô tả thủ đoạn để tham khảo:

- Cẩm nang phòng chống lừa đảo của Bộ Công an, bản do Công an Lâm Đồng đăng: https://congan.lamdong.gov.vn/Uploaded/files/thong-bao/2025/C%E1%BA%A9m%20nang%20phong%20chong%20lua%20dao%20-%20BCA%20222.pdf
- Bộ Công an cảnh báo nhận quà kèm QR giả: https://www.bocongan.gov.vn/bai-viet/canh-bao-thu-doan-tang-qua-trung-thu-du-quet-ma-qr-de-chiem-doat-tai-san-1789980256

Các mẫu chỉ minh họa nhóm dấu hiệu: nhiệm vụ yêu cầu ứng tiền, ngăn kiểm chứng, giả danh cơ quan, xin mã truy cập; có thêm ca bình thường, phủ định và ca nhắc trả nợ dễ báo nhầm.

`expected` là kỳ vọng hoạt động của baseline trong demo, không phải kết luận pháp lý hay nhãn đã được chuyên gia thẩm định. Các ca này không phải tập test độc lập cho tuyên bố chất lượng AI.

Trước khi huấn luyện cần xây hướng dẫn gán nhãn, kiểm tra độc lập, đa dạng ngôn ngữ, tách theo họ kịch bản và có hội thoại bình thường khó. Xem `ml/data/README.md`.

API Groq: https://console.groq.com/docs/quickstart ; hạn mức: https://console.groq.com/docs/rate-limits ; dữ liệu: https://console.groq.com/docs/your-data . Kiểm tra lại khi sử dụng; kiểm thử mô phỏng không thay thế gọi API thật.
