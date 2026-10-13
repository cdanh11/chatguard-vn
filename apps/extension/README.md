# Chrome extension

WXT + React + TypeScript, Manifest V3.

```powershell
npm ci
npm run typecheck
npm test
npm run build
```

Load unpacked `./.output/chrome-mv3` qua `chrome://extensions`.

- `guard.content.ts`: chèn thủ công bằng activeTab; chưa bật thì không đọc tin.
- `lib/adapters.ts`: demo ổn định và Facebook thử nghiệm, fail closed khi không xác minh được.
- `lib/scope.ts`: giới hạn theo cuộc, loại trùng, 100 tin/24.000 ký tự, kiểm tra phiên và revision.
- `background.ts`: điều phối API local, giới hạn quyền, hủy kết quả cũ.
- `sidepanel/`: cấu hình, quyền gửi dữ liệu, cảnh báo và bằng chứng.

Chỉ dùng `chrome.storage.session` cho token local và nội dung; không đưa khóa Groq vào extension. Chuyển cuộc dừng/xóa và cần bật lại. Reload tab cần kết nối lại. Không tự cuộn, gọi endpoint nội bộ Facebook hoặc truy cập cookie.

Adapter Facebook cần hiệu chỉnh trên giao diện thật, không được xem là đã hỗ trợ sản phẩm chỉ vì build thành công.
