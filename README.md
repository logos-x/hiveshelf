# HiveShelf

[![CI](https://github.com/logos-x/hiveshelf/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/<repo>/actions/workflows/ci.yml)

Website đọc ebook cộng đồng: người dùng đóng góp nội dung, hệ thống biên tập và xuất bản.

## Cấu trúc dự án

Monorepo được quản lý bằng [pnpm workspaces](https://pnpm.io/workspaces) và [Turborepo](https://turbo.build/repo):

```text
.
├── apps/
│   ├── api/             # Backend NestJS (REST API)
│   └── web/             # Frontend Next.js (App Router, Tailwind CSS, shadcn/base-ui)
├── packages/
│   ├── shared/          # Types, validation schemas và hằng số dùng chung
│   └── config/          # Cấu hình TypeScript, ESLint, Prettier chia sẻ
└── docs/                # Tài liệu nghiệp vụ, quy ước và thiết kế hệ thống
```

### Thông tin các ứng dụng

| Ứng dụng       | Công nghệ             | Cổng mặc định | Biến môi trường                                                                         | Mục đích                                                                           |
| -------------- | --------------------- | ------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **`apps/api`** | NestJS 12, Node.js    | `3001`        | `PORT=3001`<br>`WEB_ORIGIN=http://localhost:3000`                                       | REST API, xử lý nghiệp vụ, xác thực, cơ sở dữ liệu. Endpoint kiểm tra: `GET /ping` |
| **`apps/web`** | Next.js 16 (React 19) | `3000`        | `API_INTERNAL_URL=http://localhost:3001`<br>`NEXT_PUBLIC_API_URL=http://localhost:3001` | Giao diện người dùng web, Server-Side Rendering & Server Components                |

---

## Yêu cầu môi trường

- **Node.js**: `>= 24 < 25` (khuyến nghị dùng `nvm` qua file `.nvmrc`)
- **Package Manager**: `pnpm >= 9` (`11.21.0`)

---

## Bắt đầu nhanh

### 1. Chuẩn bị môi trường & cài đặt dependencies

```bash
nvm use                  # Chuyển sang Node 24 theo .nvmrc
pnpm install             # Cài đặt toàn bộ dependencies trong monorepo
```

### 2. Thiết lập biến môi trường

Sao chép các file môi trường mẫu:

```bash
# Cấu hình cho API
cp apps/api/.env.example apps/api/.env

# Cấu hình cho Web
cp apps/web/.env.example apps/web/.env.local
```

### 3. Khởi động hạ tầng dev (Postgres, MinIO, Mailpit)

Yêu cầu: **Docker** (kèm Compose v2). Không cần cài Postgres hay MinIO lên máy.

```bash
cp .env.example .env     # chỉ cần làm một lần
pnpm infra:up
```

| Dịch vụ             | Địa chỉ                                                     |
| ------------------- | ----------------------------------------------------------- |
| Postgres            | `localhost:5432` (DB `hiveshelf`, DB test `hiveshelf_test`) |
| MinIO API / Console | http://localhost:9000 / http://localhost:9001               |
| Mailpit UI / SMTP   | http://localhost:8025 / `localhost:1025`                    |

Tài khoản đăng nhập MinIO Console và mật khẩu DB nằm trong `.env`. Chúng chỉ dùng cục bộ, không dùng lại cho staging/prod.

**Khi bị trùng cổng:**

1. Tìm tiến trình đang chiếm cổng: `lsof -i :5432` (macOS/Linux) hoặc `netstat -ano | findstr :5432` (Windows).
2. Sửa cổng trong `.env` (ví dụ `POSTGRES_PORT=5433`).
3. Cập nhật cổng tương ứng trong `DATABASE_URL`, `DATABASE_URL_TEST`, `S3_ENDPOINT`.
4. Chạy lại `pnpm infra:up`.

### 4. Khởi tạo database

Sau khi Postgres đã khởi động, chạy từ thư mục gốc để sinh Prisma Client, áp dụng các migration đã commit và seed dữ liệu khung:

```bash
pnpm db:generate
pnpm db:deploy
pnpm db:seed
```

### 5. Chạy dự án ở môi trường phát triển (Dev)

Chạy đồng thời cả **API** (`http://localhost:3001`) và **Web** (`http://localhost:3000`):

```bash
pnpm dev
```

- Sau khi khởi động:
  - Truy cập Web tại: [http://localhost:3000](http://localhost:3000) (trang chủ tự động kết nối và hiển thị trạng thái API ping).
  - Kiểm tra API tại: [http://localhost:3001/health/live](http://localhost:3001/health/live)
    hoặc [http://localhost:3001/health/ready](http://localhost:3001/health/ready) (trả về JSON `{ "status": "ok" }`).

Hoặc có thể chạy riêng từng ứng dụng nếu cần:

```bash
pnpm --filter @hiveshelf/api dev   # Chỉ chạy API (cổng 3001)
pnpm --filter @hiveshelf/web dev   # Chỉ chạy Web (cổng 3000)
```

---

## Các lệnh cơ bản

Các lệnh điều phối qua Turborepo từ thư mục gốc:

| Lệnh             | Mục đích                                          |
| ---------------- | ------------------------------------------------- |
| `pnpm dev`       | Chạy dev server cho tất cả các app song song      |
| `pnpm build`     | Build production cho toàn bộ ứng dụng và packages |
| `pnpm lint`      | Kiểm tra lỗi code với ESLint toàn monorepo        |
| `pnpm typecheck` | Kiểm tra kiểu dữ liệu TypeScript (`tsc --noEmit`) |
| `pnpm test`      | Chạy unit test (`vitest`)                         |
| `pnpm format`    | Tự động định dạng code bằng Prettier              |
|                  |                                                   |

Các lệnh quản lý hạ tầng dev (gọi `docker compose`):

| Lệnh               | Mục đích                                       |
| ------------------ | ---------------------------------------------- |
| `pnpm infra:up`    | Khởi động Postgres, MinIO, Mailpit             |
| `pnpm infra:down`  | Dừng hạ tầng, **giữ** dữ liệu                  |
| `pnpm infra:logs`  | Xem log các dịch vụ                            |
| `pnpm infra:reset` | **Xóa toàn bộ dữ liệu dev** và dựng lại từ đầu |

### Database workflow

Chạy các lệnh sau từ thư mục gốc, sau khi cấu hình biến môi trường và khởi động Postgres.

- `pnpm db:generate`: sinh Prisma Client từ schema.
- `pnpm db:migrate --name <name>`: tạo và áp dụng migration local.
- `pnpm db:deploy`: áp dụng migration đã commit.
- `pnpm db:seed`: seed dữ liệu khung, có thể chạy nhiều lần.
- `pnpm db:status`: kiểm tra trạng thái migration.
- `pnpm db:studio`: mở Prisma Studio.
- `pnpm db:reset`: xóa dữ liệu schema public của DB local được cho phép,
  áp dụng lại migration và chạy seed.

`db:reset` chỉ cho phép database `hiveshelf` hoặc `hiveshelf_test`
trên host local; từ chối môi trường production và yêu cầu xác nhận.

Reset dựng lại schema và dữ liệu seed; không phục hồi dữ liệu đã xóa.

### Tạo migration mới

1. Sửa apps/api/prisma/schema.prisma.
2. Chạy từ root:

   ```bash
   pnpm db:migrate --name describe_schema_change
   pnpm db:generate
   ```

3. Review migration.sql, kiểm tra tác động dữ liệu.
4. Chạy lint, typecheck, build, unit tests và e2e.
5. Commit schema cùng migration.

Không sửa migration đã chia sẻ hoặc áp dụng.
Không dùng db push thay migration trong quy trình dự án.

### Migration SQL tùy chỉnh

```bash
pnpm db:migrate --name describe_custom_sql --create-only
```

Sửa và review migration.sql, sau đó áp dụng:

```bash
pnpm db:migrate
```

US-4.3 có thể cần unaccent hoặc pg_trgm.
Khi triển khai tính năng đó, tạo extension và index bằng migration SQL;
task hiện tại chưa cài extension.

### Quy ước review schema

- Model PascalCase, field camelCase; bảng/cột snake_case.
- Dùng @map/@@map khi cần.
- PK UUID v4 sinh tại DB; FK phải có kiểu tương thích.
- Timestamp dùng timestamptz(3).
- @updatedAt hoạt động qua Prisma, không phải DB trigger.
- Unique/index và hành vi xóa quan hệ phải có lý do rõ ràng.
- Soft delete được quyết định theo từng model.
- Migration phải dựng được schema trên DB trống.

### Kiểm tra database và API

- /health/live: liveness, không truy vấn DB.
- /health/ready: readiness, SELECT 1 qua Prisma.
- /health: alias readiness.
- Readiness lỗi trả HTTP 503 theo error envelope của API.
- API cần kết nối DB thành công lúc startup.
- SELECT 1 không xác nhận schema đã được migrate đầy đủ.

### Chạy automated tests

DB hiveshelf_test phải tồn tại và DATABASE_URL_TEST phải khác DB dev.

```bash
pnpm --filter @hiveshelf/api test
pnpm --filter @hiveshelf/api test:e2e
```

Global setup kiểm tra URL test, áp dụng migration và seed hai lần trước e2e.
Không chạy đồng thời nhiều suite cùng ghi dữ liệu trên một DB test.

Biến môi trường của tiến trình có ưu tiên cao nhất, sau đó:
apps/api/.env.local → apps/api/.env → root .env.

Script Docker tạo DB test chỉ tự chạy khi data directory được khởi tạo lần đầu.
Nếu volume cũ thiếu DB test, tạo bổ sung DB; không cần reset volume.

Chi tiết kiến trúc: docs/adr/005-prisma-migration-workflow.md.

---

## Quy ước đóng góp

Xem chi tiết về quy tắc đặt tên nhánh, commit chuẩn Conventional Commits và luồng Pull Request tại [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).
