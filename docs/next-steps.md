# Lộ trình phát triển

Ưu tiên và phân công hiện tại theo [kế hoạch ChatGuard VN](product-plan.md): củng cố vòng đời đang có, đánh giá đối chiếu phí/ưu tiên an toàn, sau đó bản nháp/xuất báo cáo và tạm dừng giữ phiên. Chưa làm lại nền dự án từ đầu.

## Mốc 1 — Vòng đời local

Extension chọn một cuộc, nhận tin mới, gọi backend, hiển thị bằng chứng; dừng/xóa khi đổi cuộc. Có bộ luật minh họa để không phụ thuộc dịch vụ ngoài và adapter Groq tùy chọn.

## Mốc 2 — Kiểm chứng Facebook

Thử trên tài khoản được phép, xác định DOM, ID tin và bên gửi; thêm fixture đã làm sạch. Kiểm tra tải lại, cuộn, sửa/thu hồi tin, chuyển cuộc nhanh và kết quả đến muộn. Không dùng endpoint nội bộ hoặc cơ chế lấy token.

## Mốc 3 — AI và đánh giá

Hai thành viên AI/ML xây bộ nhãn, baseline, hội thoại nhiều mốc thời gian và hard negatives. Khóa test theo họ kịch bản. Fine-tune/QLoRA chỉ xét sau khi đo được lỗi và có dữ liệu phù hợp; máy 8 GB không dùng để tải và huấn luyện mô hình lớn.

## Mốc 4 — Trước phát hành

Kiểm tra điều khoản Meta và Chrome Web Store, cơ chế xác thực/phân quyền nếu đưa server lên mạng, lưu giữ/xóa dữ liệu, chất lượng và trải nghiệm người dùng. Backend hiện chỉ dành cho loopback máy cá nhân.
