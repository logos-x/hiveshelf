# Bản vẽ ERD P1

- [erd-p1.drawio](erd-p1.drawio): bốn trang với bảng, cột và đường nối chỉnh sửa được.
- [Tổng quan](erd-p1-overview.svg), [xác thực](erd-p1-auth.svg),
  [quản lý sách](erd-p1-content.svg), [người đọc](erd-p1-reader.svg): ảnh vector
  nhúng trong [đặc tả ERD](../erd.md). Mỗi SVG cũng nhúng dữ liệu draw.io của trang đó.

Mở file `.drawio` bằng **File → Open From → Device** trong draw.io. Có thể kéo
bảng, sửa từng cột và thay đổi đường nối; đây không phải ảnh raster đặt vào canvas.
Sau khi sửa thủ công, xuất lại SVG và giữ đúng tên để Markdown dùng bản mới.
Giữ thuộc tính nhúng dữ liệu sơ đồ khi xuất nếu muốn mở lại SVG để chỉnh sửa.

PK = khóa chính; FK = khóa ngoại; UK = unique; `?` = nullable.
Nhãn `1 → 0..N` đọc theo chiều mũi tên từ bảng nguồn đến bảng đích.
`REF / P1` là bảng tham chiếu được lược cột; định nghĩa đầy đủ ở trang khác.
Các cột `createdAt`/`updatedAt` dùng chung và ràng buộc phức hợp được mô tả trong
`docs/erd.md`; các nhãn tương lai như `shareSlug`, `note` chưa mở UI trong MVP.

## Quy trình cập nhật

File `erd-p1.drawio` là nguồn bản vẽ được quản lý trong repo. Không cần script
sinh hình để chỉnh sửa các sơ đồ này.

1. Cập nhật mô hình dữ liệu, Mermaid và ràng buộc trong `docs/erd.md`.
2. Mở `erd-p1.drawio`, sửa các bảng/cột/quan hệ tương ứng và bố cục nếu cần.
3. Xuất từng trang thành SVG, giữ nguyên tên file; chỉ xuất trang hiện tại và
   bật tùy chọn nhúng dữ liệu sơ đồ nếu muốn mở lại SVG để chỉnh sửa.
4. Xem lại `docs/erd.md`, kiểm tra hình và đặc tả khớp nhau, rồi commit `.drawio`,
   các SVG đã đổi và tài liệu trong cùng thay đổi.

Không commit PNG xem thử, cache Python hoặc công cụ sinh hình cá nhân. Khi chỉnh
bản vẽ thủ công, tránh chạy công cụ cá nhân có thể ghi đè `.drawio` và SVG.
