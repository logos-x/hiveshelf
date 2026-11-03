# Quy ước storage key

| Loại             | Mẫu key                           |
| ---------------- | --------------------------------- |
| Bìa sách         | covers/{editionId}/{fileId}.{ext} |
| Avatar           | avatars/{userId}/{fileId}.{ext}   |
| Audio            | audio/{trackId}/{fileId}.{ext}    |
| Smoke            | smoke/{uuid}.txt                  |
| Integration test | test/{uuid}/...                   |

## Quy tắc đặt key

- Dùng chữ thường và các ký tự a-z, 0-9, dấu gạch ngang,
  gạch dưới, dấu chấm và dấu gạch chéo.
- Không bắt đầu bằng dấu gạch chéo.
- Không chứa hai dấu chấm liên tiếp hoặc ký tự điều khiển.
- Dùng UUID hoặc ULID do ứng dụng tạo; không dùng tên file
  do người dùng gửi lên.
- Phần mở rộng lấy từ loại file đã được kiểm tra.
- ID trong key phải ổn định, không dùng tên hiển thị có thể thay đổi.
- Mỗi thực thể có prefix riêng để hỗ trợ quản lý theo nhóm.

## Truy cập

Bucket phải private. Client truy cập object qua signed URL.
TTL tính bằng giây, trong khoảng 1 đến 604800.

API chạy trên host dùng endpoint local như http://localhost:9000.
Nếu API chuyển vào Docker, cần xem lại endpoint ký URL để URL
trả về vẫn truy cập được từ trình duyệt.

## Phạm vi hiện tại

Adapter kiểm tra key cơ bản. Quy ước đặt tên chi tiết được
áp dụng tại nơi tạo key.

Kiểm tra magic bytes, giới hạn dung lượng và audio range
thuộc các story tiếp theo.
