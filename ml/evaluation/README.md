# Đánh giá ChatGuard VN

Cập nhật: 14/10/2026. Có regression 9 hội thoại tổng hợp trong `apps/api/demo/scenarios.json`; chưa có bộ đánh giá chất lượng độc lập.

Từ `apps/api`:

```powershell
.\.venv\Scripts\python.exe evaluate.py
```

Báo cáo ở `outputs/baseline-evaluation.json`, bị Git bỏ qua. Kết quả 9/9 khớp nhãn demo là regression do nhóm viết, không phải accuracy thực tế. Script chỉ dùng rules, không gọi Groq.

## Bộ đánh giá tiếp theo

| Nhóm | Cần đo |
|---|---|
| Nội dung | Precision/recall theo tín hiệu, false positive/negative, thiếu ngữ cảnh |
| Bằng chứng | ID đúng nguồn/vai gửi, cặp trước–sau đúng thứ tự |
| Diễn biến | Tin đầu tiên đủ cơ sở cảnh báo; không dùng thông tin tương lai |
| Ngôn ngữ | Viết tắt, không dấu, vùng miền, câu hỏi, phủ định, trích dẫn, đính chính |
| Vận hành | Độ trễ đọc/lịch/API/UI, quota/lỗi tách khỏi mức đánh giá |
| Phạm vi | Không đọc/trộn cuộc khác, không lặp tin, loại kết quả muộn |
| Dữ liệu | Dừng/xóa, báo cáo đúng phiên/phạm vi, HTML không chạy nội dung chat |

Tách test theo họ kịch bản, không dùng ca chỉnh prompt/rules để báo kết quả độc lập. Báo số ca và lỗi cùng tỷ lệ; không đặt accuracy tùy ý. So sánh rules, Groq/prompt và chọn ngữ cảnh trên cùng phiên bản dataset; chỉ thêm fine-tune khi thực sự tồn tại.

Xem [kiểm thử kỹ thuật](../../docs/verification.md), [dữ liệu](../data/README.md), [kế hoạch đánh giá](../../docs/product-plan.md#9-đánh-giá-và-dữ-liệu).
