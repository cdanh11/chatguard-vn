# Dữ liệu ChatGuard VN

Cập nhật: 14/10/2026. Thư mục này bị Git bỏ qua, ngoại trừ README và `.gitkeep`. Demo công khai ở `apps/api/demo/scenarios.json`, không phải hội thoại người dùng thật.

## Quy định

- Ghi nguồn, quyền sử dụng, cách thu thập và loại dữ liệu: thực được phép / tái dựng / tổng hợp.
- Không mặc định dùng hội thoại theo dõi hoặc báo cáo người dùng để train.
- Không commit thông tin nhận dạng, OTP, tài khoản, khóa, ảnh hộp thư hoặc file xuất riêng tư.
- Ẩn thông tin cá nhân trước huấn luyện. Alias ID trong Groq/báo cáo không đồng nghĩa văn bản đã ẩn danh.
- Nhãn dựa trên nội dung có tại thời điểm đánh giá, không dùng tin tương lai để gán nhãn tin trước.
- Chia train/dev/test theo hội thoại gốc và họ kịch bản; mọi biến thể/tiền tố cùng nguồn ở cùng tập. Khóa test trước chỉnh prompt/rules.

## Ca có nhãn

Cần `case_id`, `scenario_family`, `data_origin`, `license_or_consent`, messages có vai gửi, tín hiệu kỳ vọng, evidence IDs, cặp trước/sau nếu có, mốc cảnh báo đầu tiên có cơ sở, hành động nên/không nên đề xuất và chú thích bất đồng.

Có ca bình thường/dễ nhầm: câu hỏi về phí, phủ định, trích dẫn, đính chính, báo giá hợp lệ, hẹn phỏng vấn, bản sao giấy tờ, thiếu vai gửi, viết tắt/không dấu. Không tự gán nhãn tội phạm cho người thật.

## Bàn giao nhóm

AI/ML 1 phụ trách taxonomy, hướng dẫn nhãn, nguồn và hard negatives. AI/ML 2 phụ trách chia tập, đánh giá và phân tích lỗi. Cùng duyệt bất đồng; không đưa ca chỉnh prompt vào test độc lập.

Xem [kế hoạch](../../docs/product-plan.md), [nguồn demo](../../docs/data-sources.md), [đánh giá](../evaluation/README.md), [huấn luyện](../training/README.md).
