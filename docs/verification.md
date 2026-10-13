# Kết quả xác minh MVP

Ngày kiểm tra: 2026-10-12. Windows, Python 3.11, Node.js 24, Chromium riêng cho kiểm thử.

- API: 24 kiểm thử đạt, gồm health/token không lộ khóa, token/origin, giới hạn ngữ cảnh, bằng chứng, lỗi cấu hình và giới hạn lượt gọi. Groq dùng HTTP transport mô phỏng để kiểm tra đúng endpoint, Bearer auth, JSON schema, consent, lỗi quota/khóa và từ chối kết quả không hợp lệ.
- Extension: 13 kiểm thử đạt, gồm bật/tắt, đổi phạm vi, loại trùng, giới hạn 100 tin/24.000 ký tự, giới hạn Groq 40 tin/6.000 ký tự, Retry-After, kiểm tra evidence và loại kết quả cũ.
- TypeScript và production build đạt. Manifest chỉ có host permission cho API local; trang chat dùng activeTab.
- Trình duyệt: cài bản unpacked vào profile tạm; nhập token, kết nối demo, bật bảo vệ, phát kịch bản CTV và nhận bằng chứng từ API thật.
- Chuyển cuộc dừng và xóa ngữ cảnh; bật lại trên cuộc bình thường trả mức chưa thấy dấu hiệu; tắt xóa kết quả. Không có lỗi JavaScript trên trang.
- Giao diện Groq: chưa đồng ý gửi dữ liệu sẽ chặn bật phân tích; chưa điền khóa sẽ báo lỗi cấu hình và không trả đánh giá thay thế.
- Chromium: kiểm tra backend, xem tin bằng chứng, tải lại panel và khôi phục phiên; nhập JSON sai bị từ chối, JSON đúng có thể phát/analyze; làm lại xóa phiên.
- Mô phỏng fetch trong worker của profile thử: 429/chờ/thử lại, từ chối evidence ngoài phạm vi, phản hồi đến muộn sau stop không xuất hiện, kết quả Groq hiển thị đúng provider, tin mới không gọi thêm trong thời gian chờ 30 giây. Đây là kiểm tra vận chuyển và trạng thái, không phải gọi Groq thật.
- Chọn tab thử thứ hai dừng/xóa phiên ở tab thứ nhất; backend mất kết nối chặn bật bảo vệ và không hiện đánh giá an toàn.
- `evaluate.py` chạy được, baseline khớp 6/6 nhãn ca demo do nhóm biên soạn. Chỉ xác nhận bộ ca minh họa chạy nhất quán, không dùng con số này làm độ chính xác thực tế.

Đây là kiểm tra cơ chế với dữ liệu tổng hợp, không phải số liệu về độ chính xác phát hiện lừa đảo.

Groq gọi thật đã xác minh với `openai/gpt-oss-120b`: backend trả HTTP 200 cho 3 tin tổng hợp về tuyển CTV, mức high_concern và evidence IDs hợp lệ. Đã sửa schema giữ trường `title` trong Signal; một lần gọi đạt không phải số liệu độ chính xác.

Chưa xác minh: DOM Facebook thực, thao tác biểu tượng mở Side Panel trên Chrome của người dùng, chạy dài ngày khi service worker bị đình chỉ, chất lượng trên tập độc lập. Không nên trình bày các mục này là đã hoàn tất.
