# Analysis API

Dự kiến: Python + FastAPI + Pydantic.

- Xác thực yêu cầu, kiểm tra schema, giới hạn ngữ cảnh và chi phí.
- Giữ khóa API mô hình ở backend.
- Phân tích với đầu ra có cấu trúc; xác minh evidence IDs.
- Không ghi nội dung hội thoại vào log; không mặc định lưu lịch sử trên máy chủ.
- Kết quả gắn với phiên yêu cầu; có timeout và xử lý lỗi.

Chưa có endpoint, dependencies hoặc cơ chế xác thực. Cần bổ sung trước khi đưa API ra Internet.
