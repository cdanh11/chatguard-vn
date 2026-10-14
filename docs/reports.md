# Bản nháp và báo cáo phiên

Cập nhật: 14/10/2026. Có trong panel; không cần API key, request AI mới hoặc quyền downloads.

## Xem bản nháp

Khi đang bảo vệ, mở **Bản nháp & báo cáo → Xem bản nháp**. Ban đầu hiển thị 25 tin gần nhất, theo thứ tự nguồn trong bộ đệm. **Xem thêm 25 tin trước** mở thêm phần đã có; không tự nạp Facebook hoặc đọc cuộc khác.

Vai gửi có nhãn Bạn / Đối phương / Chưa rõ bên gửi. Chỉ có văn bản đọc được, không chứa nội dung ảnh/voice. Giới hạn vẫn là 100/24.000 hoặc 300/72.000 ký tự; bản nháp không phải bản sao đầy đủ hộp thư.

## Tải báo cáo

1. Chọn **Nội dung báo cáo**: mặc định chỉ cảnh báo/bằng chứng; toàn bộ bản nháp là lựa chọn riêng.
2. Chọn JSON để kiểm tra dữ liệu hoặc HTML để đọc/in bằng trình duyệt.
3. Bấm **Tải báo cáo**. Background xác minh lại cuộc và phiên hiện tại rồi panel tạo file trên máy.

File lấy buffer mới nhất tại thời điểm xử lý, không chỉ ảnh chụp panel từ lần poll trước. Yêu cầu của phiên đã dừng hoặc người đã đổi bị từ chối. Xuất file không làm dừng theo dõi, gọi Groq, nạp lịch sử hoặc tự gửi file.

## Dữ liệu được xuất

| Trường | Ý nghĩa |
|---|---|
| `schema_version` | Phiên bản định dạng, hiện là 1 |
| `product`, `generated_at` | Sản phẩm và thời điểm xuất, không phải thời điểm gửi tin |
| `selection` | `evidence` hoặc `conversation` |
| `scope` | Nền tảng, số tin bộ đệm/số tin xuất, giới hạn, mô tả độ phủ |
| `assessment` | Trạng thái, mức, provider, số tin đã phân tích, lý do, signals/actions/limitations |
| `messages` | Tin trong phạm vi xuất; ID tạm `m1…`, vai gửi và văn bản |

ID được đánh theo vị trí trong bộ đệm nên báo cáo chỉ bằng chứng có thể chứa `m2`, `m7` mà không có `m1`. ID trong signals luôn trỏ tới nguồn đã xuất. Không kèm token, tên hồ sơ từ metadata, ID Facebook hoặc ID phiên; **văn bản có thể vẫn chứa tên, số điện thoại hay thông tin riêng tư**.

Kết quả có `status=current`, `stale` hoặc `unavailable`. `current` nghĩa khớp revision/nguồn đang đọc, không phải an toàn hoặc đã phân tích mọi tin. `stale` đánh dấu kết quả trước khi có tin mới/đóng chat; `update_pending` cho biết đang chờ hoặc đang phân tích. Kết quả sai phiên/mất bằng chứng không được xuất như hiện tại. Không có đánh giá thì báo rõ; phạm vi chỉ bằng chứng có thể không chứa tin nào.

## HTML và quản lý file

HTML là tài liệu tĩnh, escape mọi văn bản động, có CSP chặn script và tài nguyên ngoài. Link trong chat hiển thị như văn bản, không tự tải nội dung. File có thể in bằng trình duyệt; chưa có bộ xuất PDF riêng.

File tải xuống do người dùng quản lý. **Tắt & xóa** xóa dữ liệu phiên, không xóa file đã tải, bản sao đã chia sẻ hoặc dữ liệu Groq đã nhận. Không dùng file để train mặc định và không tự nhập báo cáo như JSON kịch bản demo.

## Kiểm thử

Unit tests kiểm tra mặc định chỉ bằng chứng, full-buffer, allowlist metadata, alias ID, trạng thái cũ, kết quả không khớp và escape HTML. `npm run test:e2e:reports` tải file thật trong profile cách ly, kiểm tra đúng nguồn, phiên cũ bị từ chối, HTML không thực thi nội dung chat và không tràn ngang ở panel 360px.

Xem [quyền riêng tư](privacy.md), [cách dùng](extension-ux.md), [kết quả kiểm thử](verification.md).
