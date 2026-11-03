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
# Cấu hình hạ tầng dùng chung (Postgres, S3/MinIO, SMTP)
cp .env.example .env

# Cấu hình cho API
cp apps/api/.env.example apps/api/.env

# Cấu hình cho Web
cp apps/web/.env.example apps/web/.env.local
```

- Root `.env` chứa cấu hình hạ tầng dùng chung; `apps/api/.env` chứa `NODE_ENV`, `PORT`, `WEB_ORIGIN`, `LOG_LEVEL`, `STORAGE_DRIVER` và `EMAIL_DRIVER`.
- Với các lệnh API chạy từ `apps/api` (bao gồm `pnpm --filter @hiveshelf/api ...`), thứ tự ưu tiên là: biến môi trường của tiến trình → `apps/api/.env.local` → `apps/api/.env` → root `.env`. Prisma cũng dùng thứ tự này. Root `.env.local` không được API nạp.
- Web dùng các file môi trường trong `apps/web`, không tự nạp root `.env`. `API_INTERNAL_URL` dành cho server; `NEXT_PUBLIC_API_URL` và `NEXT_PUBLIC_SITE_URL` được đưa vào bundle khi build. Không đặt bí mật trong biến `NEXT_PUBLIC_*`.
- Kiểm tra cấu hình API: `pnpm --filter @hiveshelf/api env:check`. Lệnh này kiểm tra schema, không kiểm tra kết nối dịch vụ.
- Khi triển khai, cấp biến môi trường qua nền tảng chạy ứng dụng, đặt `NODE_ENV=production` và dùng thông tin truy cập riêng cho môi trường đó.

### 3. Khởi động hạ tầng dev (Postgres, MinIO, Mailpit)

Yêu cầu: **Docker** (kèm Compose v2). Không cần cài Postgres hay MinIO lên máy.

```bash
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
3. Cập nhật cổng tương ứng trong `DATABASE_URL`, `DATABASE_URL_TEST`, `S3_ENDPOINT`. `SMTP_PORT` đồng thời là cổng publish của Mailpit và cổng kết nối SMTP của API. Kiểm tra các file override trong `apps/api` nếu có.
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

## Storage và email

API đã đăng ký `StorageModule` và `EmailModule` trong `AppModule`. Các module export token `STORAGE_SERVICE` và `EMAIL_SERVICE` để inject vào service nghiệp vụ; driver được chọn bằng biến môi trường.

### Cấu hình local

Trong `apps/api/.env`:

```dotenv
STORAGE_DRIVER=s3
EMAIL_DRIVER=smtp
```

Các thông số kết nối nằm ở root `.env` (giá trị mẫu chỉ dành cho local):

```dotenv
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=hiveshelf-dev
S3_ACCESS_KEY=hiveshelf
S3_SECRET_KEY=hiveshelf_dev_secret
S3_FORCE_PATH_STYLE=true

SMTP_HOST=localhost
SMTP_PORT=1025
MAIL_FROM="HiveShelf <no-reply@hiveshelf.local>"
MAILPIT_UI_PORT=8025
```

Khởi động riêng các dịch vụ cần cho storage/email từ root:

```bash
docker compose up -d --wait minio minio-init mailpit
pnpm --filter @hiveshelf/api env:check
```

`minio-init` tạo bucket theo `S3_BUCKET` và đặt bucket ở chế độ private. Mở [MinIO Console](http://localhost:9001) để xem object và [Mailpit](http://localhost:8025) để xem email nhận qua SMTP local. Các địa chỉ này dùng cổng mặc định; điều chỉnh nếu đã đổi `.env`.

| Driver                  | Hành vi                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STORAGE_DRIVER=memory` | Lưu object trong RAM; mất khi tiến trình kết thúc. Signed URL có dạng `memory:///...`, chỉ dùng cho test, không truy cập qua HTTP.                                        |
| `STORAGE_DRIVER=s3`     | Dùng S3-compatible storage; yêu cầu `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`. `S3_ENDPOINT` dành cho endpoint tùy chỉnh như MinIO; `S3_REGION` mặc định `us-east-1`. |
| `EMAIL_DRIVER=memory`   | Render email vào `InMemoryEmailService.outbox`; không gửi qua SMTP. Có thể gọi `clear()` để xóa outbox trong test.                                                        |
| `EMAIL_DRIVER=smtp`     | Gửi email qua SMTP; yêu cầu `SMTP_HOST`, `MAIL_FROM`; `SMTP_PORT` mặc định `1025`.                                                                                        |

Schema mặc định cả hai driver là `memory` nếu không khai báo. File mẫu local chọn `s3` và `smtp` để dùng hạ tầng Docker. SMTP adapter hiện cấu hình `secure: false`, chưa có tùy chọn tài khoản/mật khẩu hay cấu hình TLS riêng qua env; cấu hình này phục vụ Mailpit local.

### Sử dụng trong API

Ví dụ service trong `apps/api/src`:

```ts
import { Inject, Injectable } from "@nestjs/common";
import { STORAGE_SERVICE, type StorageService } from "./storage/storage.service.ts";
import { EMAIL_SERVICE, type EmailService } from "./email/email.service.ts";

@Injectable()
export class ExampleService {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @Inject(EMAIL_SERVICE) private readonly email: EmailService,
  ) {}

  async run() {
    const key = "examples/hello.txt";
    await this.storage.put(key, Buffer.from("Hello HiveShelf"), "text/plain");
    const downloadUrl = await this.storage.getSignedUrl(key, 60);

    await this.email.send({
      template: "welcome",
      to: "reader@example.com",
      data: { name: "Reader", appUrl: "http://localhost:3000" },
    });

    return { downloadUrl };
  }
}
```

Storage hỗ trợ `put` với `Buffer` hoặc Node.js `Readable`, `get` trả về stream cùng metadata, `exists`, `delete` và signed URL tải xuống. `get` ném `StorageObjectNotFoundError` khi object không tồn tại; xóa object không tồn tại vẫn thành công. TTL của signed URL là số nguyên từ `1` đến `604800` giây; range read chưa được hỗ trợ. Endpoint S3 dùng để ký URL phải truy cập được từ nơi tải file. Xem [quy ước storage key](docs/storage-keys.md) khi đặt key cho dữ liệu nghiệp vụ.

Email hiện có template `welcome`, nhận `name` và `appUrl`; `to` nhận một địa chỉ hoặc mảng địa chỉ. Mỗi template có ba file trong `apps/api/src/email/templates/<name>/`: `subject.hbs`, `html.hbs`, `text.hbs`. Renderer dùng Handlebars strict mode, escape dữ liệu trong HTML và giữ nguyên dữ liệu trong subject/plain text. Khi thêm template, cập nhật `TemplateDataMap` trong `email.service.ts` và tạo đủ ba file. Nest CLI đã cấu hình copy các file `.hbs` khi build.

### Kiểm tra storage và email

Chạy từ root:

```bash
# Unit test: memory adapters, render template và các unit test API khác
pnpm --filter @hiveshelf/api test

# Integration test: cần S3, bucket và Mailpit đang chạy; driver phải là s3/smtp
pnpm --filter @hiveshelf/api test:int

# Smoke test theo driver đang cấu hình
pnpm --filter @hiveshelf/api dev:smoke
```

Integration test kiểm tra vòng đời object, signed URL và email nhận tại Mailpit (subject, người nhận, HTML, text), đồng thời dọn dữ liệu do test tạo. Test hết hạn signed URL chủ động chờ khoảng 6 giây. Nếu gặp `ECONNREFUSED` ở cổng `9000`, `1025` hoặc `8025`, kiểm tra `docker compose ps -a`, khởi động dịch vụ và đối chiếu endpoint/cổng trong env.

Smoke test upload, đọc, ký URL rồi xóa object; gửi một email và giữ email SMTP lại để xem trong Mailpit. Với driver memory, script kiểm tra URL giả lập và outbox. Script từ chối chạy khi `NODE_ENV=production`.

## Chạy automated tests cho database và API

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
