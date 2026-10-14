# Kết quả xác minh MVP

Cập nhật: 14/10/2026. Windows, Python 3.11, Node.js 24, Chromium riêng cho kiểm thử. Các mục dưới giữ ngày/pha thử để không nhầm regression cũ với nghiệm thu bản mới hoặc accuracy thực tế.

## Bản nháp/báo cáo và đồng bộ tài liệu — 2026-10-14

- Extension: 30 unit tests, typecheck và production build đạt. Sáu test báo cáo mới kiểm tra default chỉ bằng chứng, full-buffer, trường metadata cho phép, alias ID, trạng thái cũ/khác phiên, duplicate ID và HTML escape/CSP.
- Report E2E đạt: tải JSON/HTML thật, không thêm lượt phân tích, đúng vai/nguồn, full-buffer chỉ khi chọn, HTML không chạy script/ảnh từ chat và panel 360px không tràn ngang. Phiên đã dừng/đổi người bị từ chối xuất; file đã tải còn do người dùng quản lý.
- Giữ lại một phản hồi TAB_STATE thực rồi trả sau STOP: panel không phục hồi bản nháp cũ. Các lệnh thay đổi phạm vi làm poll đang chờ mất hiệu lực.
- Fixture Facebook đạt thêm: bản nháp mở 25 rồi 50 tin, báo cáo full xuất đủ 300 tin A và không có B hoặc ID gốc. Các kiểm tra giữ A, nạp 30 → 300, đóng/mở và tắt/xóa vẫn đạt.
- `scripts/check.ps1` đạt: 45 tests API, 30 tests extension, typecheck/build. API không đổi schema/provider trong đợt báo cáo; đánh giá độc lập vẫn chưa có.
- Smoke MVP, background/alarm và startup đạt lại sau bổ sung báo cáo. Worker dừng thật rồi được alarm đánh thức; manifest thiếu alarms vẫn không crash.
- Tài liệu hiện phân biệt export phòng thử với export panel, trần schema API với trần Groq client, bộ nhớ phiên với file đã tải và test fixture với phiên thật.
- Audit tài liệu: đủ 18 Markdown cũ được cập nhật, thêm 4 tài liệu; 22 file và 96 link nội bộ được kiểm tra, không có link/heading bị hỏng hoặc lệnh npm không tồn tại.
- Lệnh đầy đủ: `scripts/check.ps1` cho API/unit/typecheck/build; E2E chạy trong `apps/extension` với backend local đang mở, xem [README extension](../apps/extension/README.md).

## Review kế hoạch và regression bổ sung — 2026-10-14

- API: 45 tests đạt. Extension: 24 unit tests đạt, typecheck và production build đạt.
- Bộ đệm Groq giữ được phát biểu không thu phí từ đầu cuộc cùng yêu cầu tiền về sau trong trần 40 tin/6.000 ký tự. Test kiểm tra đúng thứ tự, không lặp ID và không giữ self làm mốc yêu cầu của đối phương.
- Baseline đối chiếu phí dẫn hai tin nguồn, bỏ qua các ca câu hỏi/phủ định/trích dẫn/ngoại lệ đã định nghĩa. Có regression tránh nhầm chữ “dụng” trong “tuyển dụng” với từ “đừng” sau chuẩn hóa không dấu.
- Chính sách yêu cầu giao giấy tờ gốc/kiểm soát liên lạc ưu tiên an toàn cả với kết quả Groq hợp lệ; không fallback khi provider lỗi. Test đối chứng có phỏng vấn bình thường, bản sao giấy tờ và lời nhắc đừng giao hộ chiếu.
- `test:e2e:recruitment` đạt với API local thật và panel: cặp tin trước/sau hiển thị, hành động không tiếp tục hỏi thử, và ca phỏng vấn bình thường chưa có dấu hiệu. Toàn bộ dữ liệu tổng hợp, không phải người dùng thật gặp nguy hiểm.
- `python evaluate.py`: 9/9 nhãn phòng thử khớp baseline. Đây là regression do tác giả viết, không phải độ chính xác thực tế hoặc test độc lập.
- Tái hiện lỗi DEV: manifest cập nhật stamp trong khi Vite giữ define từ config cũ trên partial rebuild. Đã chuyển stamp sang build hook và lấy version manifest từ artifact reader. `test:e2e:dev-sync` đạt: stamp cùng thay đổi, reload extension, reconnect không vòng lặp và không phát đường cập nhật script chưa đăng ký.
- `test:e2e:startup` đạt cả production và DEV: manifest thiếu `alarms` không crash, vẫn dùng được cấu hình, từ chối START trước khi đọc, trả hướng dẫn reload. Không coi đây là xác nhận duy nhất về exception trong ảnh Brave cũ.
- Smoke MVP, fixture Facebook và background worker/alarm đều đạt trên Chromium cách ly sau thay đổi. Chưa xác nhận native panel Brave của người dùng đã nạp bản sửa cuối; cần Reload extension khi đang giữ runtime cũ.

## Bổ sung Brave và đồng bộ — 2026-10-14

- Chế độ nền: 23 tests extension đạt. Production build trong profile Chromium cách ly phân tích khi panel đã đóng, gộp 4/5 tin đúng, ưu tiên OTP, hiện badge `!` và nút trên trang, mở lại giữ kết quả.
- Sau thay đổi lịch/badge, cả popup fixture và smoke MVP đạt lại: chỉ người chọn, 300 tin, đóng/mở, consent Groq, quota/thử lại, phản hồi muộn, đổi tab và mất backend.
- Đã dừng đúng service worker test qua protocol, quan sát `running → stopping → stopped`; alarm đánh thức lại, hoàn tất lượt đang chờ với cùng session mà không mở panel. Tắt/xóa làm mất badge, chỉ báo và alarm. Đây là kiểm thử profile riêng/dữ liệu tổng hợp, chưa phải kiểm chứng phiên Brave của người dùng với bản mới.

- Người dùng xác nhận bản sửa giữ đối tượng hoạt động khi đóng chat. Đây là phản hồi từ phiên Brave, tách biệt với kiểm thử fixture.
- UX mới tách cài đặt khỏi theo dõi, thu gọn bằng chứng/tùy chọn và bật bộ đọc qua thao tác bảo vệ rõ ràng. Fixture đạt ở 360px: không tràn ngang, cảnh báo ở viewport đầu, mở/đóng cài đặt không reset phiên, đổi người chưa đọc trước khi bật.

- Sau khi người dùng nạp DEV, API ghi nhận đúng cuộc được chọn: lượt đầu 5 tin/revision 2, lượt cập nhật tự động 20 tin/revision 6. Đã xác minh cập nhật tin mới ở phiên DEV; mức cảnh báo thay đổi theo ngữ cảnh, không dùng để suy ra accuracy.
- Phát hiện mở toolbar chạy ATTACH và làm reset phiên. Đã sửa kết nối cùng tab cùng build để giữ phiên; regression popup fixture đạt khi kết nối lại đang bảo vệ và khi chat đã đóng. Người dùng đã xác nhận đóng chat vẫn giữ theo dõi.
- API status bổ sung dấu vân tay session và tối đa 12 mốc metadata trong RAM để phân biệt reset phiên; không trả session ID gốc. API 32 tests, typecheck/build và popup fixture đạt sau sửa.

- Người dùng xác nhận 10 tin trong panel và có kết quả Groq sau reload. API local xác nhận lượt gần nhất có 10 tin, Groq/review và dấu vân tay đúng cuộc được chọn.
- API: 32 tests đạt, gồm từ chối evidence self/unknown và làm sạch danh sách trống của Groq. Extension: 19 tests đạt; typecheck/build đạt.
- Thêm dấu build reader, chặn bắt đầu khi reader không khớp, dọn listener của reader đã hủy và khôi phục đúng mức lịch sử khi mở lại panel.
- Kiểm tra giao thức WXT local: thay reader phát lệnh reload extension; worker kết nối lại không gây vòng reload. Người dùng đã nạp DEV theo [hướng dẫn](development.md).
- Groq thật với 4 tin tổng hợp có cả self và other: HTTP 200, high_concern, evidence chỉ thuộc other, giới hạn không rỗng. Không dùng một ca này làm độ chính xác của mô hình.
- Hai kiểm thử trình duyệt đạt sau sửa: popup Facebook fixture và demo MVP. Thêm kiểm tra kết nối lại bộ đọc, mở lại panel giữ mức 300. Mock Groq dùng bằng chứng của other.
- Kiểm thử demo đạt: giữ cảnh báo trong thời gian gộp lượt Groq với nhãn đánh giá chưa cập nhật; sửa nội dung cũ làm bỏ đánh giá cũ; quota/thử lại, kết quả đến muộn, đổi tab, mất backend và consent vẫn hoạt động.

## Bổ sung Facebook — 2026-10-13

- API: 29 tests đạt; extension: 19 tests đạt; typecheck/build đạt. Thêm kiểm tra chỉ đọc A trong 5 ô chat, ID trùng/không khớp, đóng/mở lại, thứ tự lịch sử 300 tin, trần request và không gửi ID Facebook tới Groq.
- Kiểm thử trình duyệt MVP cũ đạt sau thay đổi. Kiểm thử popup fixture đạt: 320 tin giữ 300 cuối, bỏ qua B–E, xem bằng chứng, đóng/mở giữ A, nạp lịch sử từng đợt 30 → 300 đúng thứ tự, tắt/xóa. Fixture dùng profile cách ly và không truy cập tài khoản thật.
- Probe chỉ đọc từ cùng mã bộ đọc production nhận được 10 tin văn bản từ mỗi phía của cuộc thử Facebook, xác định đúng self/other. Chỉ hai tài khoản được người dùng cho phép đã trao đổi kịch bản tổng hợp.
- Gửi dữ liệu kịch bản đã thay ID vào API local: phía nhận yêu cầu nạp tiền trả `high_concern`; phía hỏi để kiểm chứng trả `no_signal` sau sửa baseline. Không phải số liệu accuracy và không phải xác nhận danh tính lừa đảo.
- Tại thời điểm 2026-10-13, phiên Brave báo 0 tin dù probe đọc được 10. Đã giải quyết sau reload theo xác minh 2026-10-14 ở trên.

Chi tiết: [Luồng Facebook](facebook-mvp.md), [Review và giới hạn còn lại](facebook-review.md).

## Kiểm chứng nền local trước tích hợp Facebook

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
