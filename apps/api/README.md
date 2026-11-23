# HiveShelf API

Backend NestJS sử dụng Prisma và PostgreSQL 17.

Hướng dẫn setup, migration, seed, health và automated tests:
[README tại root](../../README.md).

Quyết định kiến trúc:
[ADR-005](../../docs/adr/005-prisma-migration-workflow.md).

## Nội dung chương

Policy và allowlist: [ADR-007](../../docs/adr/007-sanitized-chapter-html.md).

Mọi đường tạo ChapterVersion dùng `createChapterVersion` tại
`src/common/content/chapter-version.writer.ts`.
Caller truyền HTML nguồn; writer sanitize, sinh paragraph anchors,
tính SHA-256 từ HTML cuối cùng và gán contentFormatVersion.

Không ghi trực tiếp contentHtml/contentHash/contentFormatVersion bằng Prisma,
nested writes hoặc raw SQL. Không sửa snapshot cũ để cập nhật nội dung.
Module không tự cấp versionNumber hoặc tự publish; caller quản lý transaction
và xử lý xung đột khi workflow có nhiều thao tác.

### Audit và chuyển dữ liệu cũ

Chạy từ thư mục gốc repo. Các script dùng DATABASE_URL theo loader env của API.
Xác định đúng DB đích trước khi chạy; không ghi connection string vào tài liệu/log.

```bash
pnpm --filter @hiveshelf/api content:audit
pnpm --filter @hiveshelf/api content:migrate
```

Audit chỉ đọc, kiểm tra HTML canonical, hash và format version.
Exit code: 0 nếu published pointers không cần review; 2 nếu còn published version
cần review; 1 nếu script không hoàn tất. Snapshot lịch sử vẫn có thể được báo cáo.
Published pointer ở đây bao gồm cả chương thuộc Edition chưa công khai.

content:migrate mặc định dry-run. Review chapter/version IDs, số lượng ứng viên
và htmlWouldChange trước khi ghi. Với môi trường có dữ liệu cần giữ, chuẩn bị
bản sao lưu theo quy trình vận hành của môi trường đó trước khi apply.

```bash
pnpm --filter @hiveshelf/api content:migrate --apply
pnpm --filter @hiveshelf/api content:audit
pnpm --filter @hiveshelf/api content:migrate
```

Apply tạo snapshot qua writer rồi đổi published pointer; không đổi trạng thái
Edition hoặc sửa snapshot cũ. Toàn bộ lần chạy nằm trong một transaction
Serializable; lỗi làm rollback. Hash sai hoặc format không hỗ trợ khiến script dừng.
Không chạy đồng thời với tiến trình sửa/import nội dung.

Sau chuyển đổi, publishedVersionsNeedingReview phải bằng 0 và dry-run không còn
ứng viên. Snapshot lịch sử format cũ được giữ lại, không tự tái xuất bản.

Script chuyển đổi hiện dành cho lượng dữ liệu nhỏ, transaction timeout 30 giây.
Cần thiết kế theo batch trước khi dùng với catalog lớn.
Audit không phải snapshot nhất quán khi có thao tác ghi đồng thời.

### Kiểm thử

```bash
pnpm --filter @hiveshelf/api exec vitest run src/common/content/
pnpm --filter @hiveshelf/api exec vitest run --config vitest.config.e2e.ts src/catalog/catalog.e2e-spec.ts
```

Test bao phủ payload XSS, whitelist, URL, Unicode, anchors, hash và lưu/đọc qua DB/API.
Ba mẫu trình bày là nội dung tự viết đại diện, chưa phải ba sách thực tế đã nhập.
