# Lộ trình phát triển

Cập nhật: 14/10/2026. Đi từ nền đang chạy, không xây lại dự án từ đầu.

Ưu tiên theo [kế hoạch ChatGuard VN](product-plan.md): củng cố vòng đời, đo chất lượng đối chiếu phí/an toàn, nghiệm thu bản nháp/báo cáo đã có, sau đó mới tạm dừng giữ phiên và ledger mở rộng.

## Mốc 1 — Vòng đời local

Extension chọn một cuộc, nhận tin mới, gọi backend, hiển thị bằng chứng; dừng/xóa khi đổi cuộc. Có bộ luật minh họa để không phụ thuộc dịch vụ ngoài và adapter Groq tùy chọn.

Đã bổ sung bản nháp và JSON/HTML trong panel, export kiểm tra đúng phiên, không gọi AI. Tiếp theo cần phản hồi UX trên trình duyệt thật, kiểm tra giữ cấu hình/phiên qua cập nhật và đánh giá độ dễ hiểu của cảnh báo. Xem [báo cáo](reports.md).

## Mốc 2 — Kiểm chứng Facebook

Thử trên tài khoản được phép, xác định DOM, ID tin và bên gửi; thêm fixture đã làm sạch. Kiểm tra tải lại, cuộn, sửa/thu hồi tin, chuyển cuộc nhanh và kết quả đến muộn. Không dùng endpoint nội bộ hoặc cơ chế lấy token.

## Mốc 3 — AI và đánh giá

Hai thành viên AI/ML xây bộ nhãn, baseline, hội thoại nhiều mốc thời gian và hard negatives. Khóa test theo họ kịch bản. Fine-tune/QLoRA chỉ xét sau khi đo được lỗi và có dữ liệu phù hợp; máy 8 GB không dùng để tải và huấn luyện mô hình lớn.

## Mốc 4 — Trước phát hành

Kiểm tra điều khoản Meta và Chrome Web Store, cơ chế xác thực/phân quyền nếu đưa server lên mạng, lưu giữ/xóa dữ liệu, chất lượng và trải nghiệm người dùng. Backend hiện chỉ dành cho loopback máy cá nhân.

Backlog rõ: pause/resume giữ buffer với điểm gián đoạn, ledger lương/địa điểm/doanh nghiệp, phản hồi có nguồn kiểm chứng, PDF riêng, nền tảng khác. Mỗi mục cần tiêu chí nghiệm thu và dữ liệu phù hợp, không thêm chỉ để tăng số lượng tính năng.
