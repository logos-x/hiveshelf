# ADR-002: PostgreSQL và Prisma

- **Trạng thái:** Accepted
- **Ngày:** 2026-10-30
- **Cập nhật:** 2026-11-04 — bổ sung lựa chọn Prisma và rút gọn theo source.

## Bối cảnh

HiveShelf cần quản lý tài khoản, nội dung và hoạt động đọc có nhiều quan hệ,
ràng buộc toàn vẹn và transaction. Đây là nhu cầu nghiệp vụ; Prisma schema hiện
chỉ có model kỹ thuật `SystemInfo`, chưa triển khai các model trong ERD Phase 1.
US-0.4a đã thiết lập Prisma, migration, seed và kết nối NestJS với PostgreSQL.

## Quyết định

Dùng **PostgreSQL 17** làm database chính và **Prisma 7** cho schema, generated
client và migration. API kết nối qua `PrismaService`, `@prisma/adapter-pg` và `pg`.
PostgreSQL đáp ứng quan hệ/transaction và có JSONB khi cần metadata linh hoạt;
Prisma cung cấp client có kiểu và bộ công cụ schema/migration thống nhất.

Schema và migration SQL nằm trong `apps/api/prisma`; generated client không
commit. Giữ dữ liệu test tách development; e2e hiện tạo database tạm riêng mỗi
lần chạy. Quy trình chi tiết được ghi ở [README](../../README.md#database-workflow)
và [ADR-005](005-prisma-migration-workflow.md), hiện có trạng thái Proposed.

Full-text search chưa được triển khai. Khi làm tìm kiếm, cho phép migration SQL
tùy chỉnh cho extension/index và truy vấn SQL tham số hóa qua Prisma khi client
không biểu đạt đủ. Cấu hình tiếng Việt, `unaccent`, GIN và nhu cầu `pg_trgm` phải
được kiểm chứng tại story tìm kiếm, không coi là đã có trong database.

## Hệ quả

- **Tốt:** Ràng buộc và transaction ở DB; schema/migration được review cùng code;
  client có kiểu giúp đồng bộ truy vấn với schema.
- **Đánh đổi:** Cần sinh client trước build/typecheck, vận hành PostgreSQL và quản
  lý migration. SQL tìm kiếm tùy chỉnh làm tăng phụ thuộc PostgreSQL và cần
  kiểm tra kiểu kết quả, index, hiệu năng riêng; ORM không thay thế hiểu biết SQL.

## Phương án đã cân nhắc

- **MongoDB:** Linh hoạt với document nhưng quan hệ và ràng buộc chéo thực thể
  là nhu cầu chính; PostgreSQL phù hợp hơn, JSONB đáp ứng phần bán cấu trúc.
- **MySQL:** Là lựa chọn quan hệ hợp lệ; chọn PostgreSQL cho hướng kết hợp dữ
  liệu quan hệ, JSONB và tìm kiếm bằng extension trong cùng hệ quản trị.
- **TypeORM:** Tích hợp NestJS thuận tiện qua entity/decorator; chọn Prisma để
  quản lý schema và generated client tập trung, thay vì mô hình entity này.
- **SQL/query builder thuần:** Kiểm soát SQL trực tiếp nhưng cần tự tổ chức nhiều
  phần mapping và tooling; chỉ dùng SQL tùy chỉnh ở nơi Prisma chưa đáp ứng.

## Khi nào xem xét lại

Đánh giá lại ORM khi truy vấn thực tế cần quá nhiều SQL tùy chỉnh hoặc gặp giới
hạn đo được; đánh giá search engine riêng khi PostgreSQL không đáp ứng yêu cầu
chất lượng/hiệu năng sau thử nghiệm. Không đổi database chỉ vì thêm loại dữ liệu.

Bằng chứng: [schema](../../apps/api/prisma/schema.prisma),
[PrismaService](../../apps/api/src/prisma/prisma.service.ts),
[hạ tầng local](../../docker-compose.yml), [thiết kế P1](../erd.md).
