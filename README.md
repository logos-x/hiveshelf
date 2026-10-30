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

| Ứng dụng       | Công nghệ             | Cổng mặc định | Biến môi trường                                   | Mục đích                                                                           |
| -------------- | --------------------- | ------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **`apps/api`** | NestJS 12, Node.js    | `3001`        | `PORT=3001`<br>`WEB_ORIGIN=http://localhost:3000` | REST API, xử lý nghiệp vụ, xác thực, cơ sở dữ liệu. Endpoint kiểm tra: `GET /ping` |
| **`apps/web`** | Next.js 16 (React 19) | `3000`        | `API_URL=http://localhost:3001`                   | Giao diện người dùng web, Server-Side Rendering & Server Components                |

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

### 3. Chạy dự án ở môi trường phát triển (Dev)

Chạy đồng thời cả **API** (`http://localhost:3001`) và **Web** (`http://localhost:3000`):

```bash
pnpm dev
```

- Sau khi khởi động:
  - Truy cập Web tại: [http://localhost:3000](http://localhost:3000) (trang chủ tự động kết nối và hiển thị trạng thái API ping).
  - Kiểm tra API tại: [http://localhost:3001/ping](http://localhost:3001/ping) (trả về JSON `{ "status": "ok", "service": "hiveshelf-api" }`).

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

---

## Quy ước đóng góp

Xem chi tiết về quy tắc đặt tên nhánh, commit chuẩn Conventional Commits và luồng Pull Request tại [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).
