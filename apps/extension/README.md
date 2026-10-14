# ChatGuard VN · Extension

Cập nhật: 14/10/2026. WXT/React/TypeScript, Manifest V3; Chrome/Brave nền Chromium 120 trở lên.

## Build và phát triển

```powershell
npm ci
npm run typecheck
npm test
npm run build
```

Load unpacked `.output/chrome-mv3` để dùng production. `npm run dev` tạo `.output/chrome-mv3-dev`, server loopback cổng 3001 và không mở profile mới. Chỉ bật một bản ChatGuard; xem [phát triển DEV](../../docs/development.md).

## Các thành phần

| Vị trí | Trách nhiệm |
|---|---|
| `entrypoints/guard.content.ts` | Chèn qua activeTab, chỉ đọc cuộc đã bật bảo vệ |
| `lib/adapters.ts`, `lib/facebook.ts` | Metadata và vùng tin đã xác minh |
| `lib/scope.ts` | Phạm vi, loại trùng, thứ tự, trần 100/300 và revision |
| `entrypoints/background.ts` | Phiên, API, timer/alarm, badge, hủy tác vụ, xác minh phiên xuất |
| `lib/analysis-policy.ts`, `lib/monitoring.ts` | Ngân sách Groq, bằng chứng, retry, gom tin |
| `lib/report.ts` | Báo cáo JSON/HTML bằng trường cho phép, ID tạm, HTML escape |
| `entrypoints/sidepanel/` | Theo dõi, cấu hình, bằng chứng, bản nháp và tải báo cáo |
| `wxt.config.ts` | Quyền, stamp reader từ artifact, đồng bộ partial rebuild DEV |

Nội dung/token local dùng `chrome.storage.session`. Không chứa khóa Groq, không có host Facebook thường trực, không lấy cookie hoặc gọi endpoint nội bộ. Nạp lịch sử chỉ cuộn đúng cuộc sau thao tác người dùng.

Đóng panel giữ phiên. Đóng ô chat giữ người và chờ nếu DOM bị gỡ; tải lại/đóng tab dừng phiên. Tắt & xóa không xóa báo cáo đã tải. Chưa có tạm dừng giữ ngữ cảnh.

## Kiểm thử trình duyệt

Giữ backend đang chạy; dùng Chromium hỗ trợ unpacked extension hoặc đặt `CHROMIUM_EXECUTABLE` tới executable đã có:

```powershell
npm run test:e2e
npm run test:e2e:facebook
npm run test:e2e:background
npm run test:e2e:recruitment
npm run test:e2e:reports
npm run test:e2e:startup
```

`test:e2e:dev-sync` cần WXT DEV, tạm sửa comment rồi phục hồi; có thể làm phiên DEV reload. `CHATGUARD_TEST_BUILD=chrome-mv3-dev` chọn DEV cho startup test. Tests dùng profile/dữ liệu tổng hợp cách ly, không dùng tài khoản thật.

Xem [cách dùng](../../docs/extension-ux.md), [bản nháp/báo cáo](../../docs/reports.md), [Facebook](../../docs/facebook-mvp.md).
