# ADR-005: Prisma và quy trình thay đổi database schema

- **Status:** Proposed
- **Date:** 2026-11-02
- **Related:** [ADR-002: PostgreSQL](002-postgresql.md)

## Context

HiveShelf cần quản lý thay đổi schema bằng migration có version control,
dựng lại được database từ đầu và cô lập dữ liệu development với automated tests.

Task US-0.4a chỉ thiết lập nền tảng database.
Mô hình nghiệp vụ được triển khai trong US-3.1a.

## Decision

### Công nghệ và vị trí

- PostgreSQL major 17 theo ADR-002.
- Prisma major 7; phiên bản cụ thể được quản lý qua pnpm-lock.yaml.
- Kết nối PostgreSQL bằng @prisma/adapter-pg và pg.
- Schema: apps/api/prisma/schema.prisma.
- Migration: apps/api/prisma/migrations.
- Generated client: apps/api/src/generated/prisma, không commit.
- Generator tạo TypeScript ESM; TypeScript rewrite import extension khi build.

### Quy ước schema

- Model dùng PascalCase, field dùng camelCase.
- Bảng và cột dùng snake_case thông qua @@map và @map.
- Khóa chính dùng PostgreSQL UUID, mặc định sinh UUID v4 tại DB
  bằng gen_random_uuid().
- Timestamp dùng timestamptz(3); trao đổi thời gian theo UTC.
- @updatedAt được Prisma xử lý, không phải database trigger.
- Soft delete được quyết định theo yêu cầu từng model.
- SystemInfo là model kỹ thuật phục vụ migration và seed.

### Migration và seed

- Mọi thay đổi schema được commit cùng migration SQL.
- Local dùng migrate dev để tạo và áp dụng migration.
- Môi trường triển khai dùng migrate deploy.
- Không sửa migration đã chia sẻ hoặc áp dụng.
- Không dùng db push thay cho migration trong quy trình dự án.
- SQL tùy chỉnh được tạo bằng --create-only, review rồi mới áp dụng.
- Seed dùng upsert với key ổn định; hiện chỉ có dữ liệu kỹ thuật bootstrap.
- db:reset kiểm tra môi trường và đích local, yêu cầu xác nhận,
  áp dụng lại migration rồi gọi seed tường minh.
- Reset không thay thế backup/restore dữ liệu.

### Runtime và health

- PrismaService kết nối trong onModuleInit và disconnect trong onModuleDestroy.
- API khởi động thất bại nếu không kết nối được DB lúc startup.
- /health/live không truy vấn DB.
- /health/ready và /health kiểm tra SELECT 1 qua Prisma.
- Readiness trả 503 khi lỗi hoặc vượt deadline 3 giây.
- Deadline HTTP không tự hủy query; driver và PostgreSQL có timeout riêng.
- Readiness hiện kiểm tra kết nối, không xác nhận phiên bản schema.

### Automated tests và CI

- DATABASE_URL_TEST bắt buộc và phải khác database development.
- URL nền chỉ cho phép DB hiveshelf_test trên loopback và schema public.
- Global setup tạo DB hiveshelf_test_<uuid> riêng cho mỗi lần chạy.
- Migration và seed chạy trên DB tạm trước e2e.
- URL DB tạm được truyền tới worker bằng provide/inject.
- Teardown xóa DB tạm; setup lỗi cũng thực hiện cleanup.
- Role test cần quyền tạo database.
- GitHub Actions dùng PostgreSQL 17 service riêng.
- Job test chạy pnpm test sau job CI.

## Alternatives Considered

- TypeORM: phù hợp cách mô hình hóa bằng entity/decorator;
  dự án chọn Prisma schema và generated client cho quy trình hiện tại.
- Drizzle: phù hợp hướng SQL và TypeScript schema;
  dự án ưu tiên bộ công cụ Prisma Migrate và Studio.
- MikroORM: entity và Unit of Work là lựa chọn hợp lệ;
  task hiện chưa cần mô hình quản lý entity đó.
- Knex: có query builder và migration;
  dự án ưu tiên generated client từ một schema thống nhất.

## Consequences

- Schema và migration có lịch sử review rõ ràng.
- Có thể dựng database từ migration đã commit.
- Generated client cần được tạo trước build/typecheck.
- E2e cần PostgreSQL hoạt động.
- Timeout truy vấn và giới hạn DB test hiện tại cần được đánh giá
  khi bổ sung workload hoặc môi trường mới.
- Backup/restore production và full-text search là các task riêng.
