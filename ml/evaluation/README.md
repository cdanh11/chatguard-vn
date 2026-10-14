# Đánh giá

Có regression nhỏ trên hội thoại tổng hợp ở `apps/api/demo/scenarios.json`, chạy `python evaluate.py` trong `apps/api` và xuất báo cáo vào `outputs`. Đây là ca do nhóm tự viết để phát hiện lỗi, chưa có bộ đánh giá chất lượng độc lập.

Kế hoạch dữ liệu, phân công và chỉ số: [Kế hoạch sản phẩm](../../docs/product-plan.md#9-đánh-giá-và-dữ-liệu). Ca chỉnh prompt/rules và các biến thể cùng họ không được đưa vào test giữ kín.

Cần đo: bỏ sót, cảnh báo nhầm, thời điểm cảnh báo, độ đúng bằng chứng, khả năng nhận thiếu ngữ cảnh, chất lượng tiếng Việt, độ trễ và chi phí.

So sánh mô hình gốc, mô hình gốc kèm ví dụ và mô hình fine-tune trên cùng đầu vào.

Kiểm tra riêng bộ đọc: chuyển A → B → A, tin tải lại, kết quả đến muộn, dừng thu thập và xóa dữ liệu.
