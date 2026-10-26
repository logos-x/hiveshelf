# HiveShelf

Website đọc ebook cộng đồng: người dùng đóng góp nội dung, hệ thống biên tập và xuất bản.

## Cấu trúc

- `apps/api`: backend NestJS
- `apps/web`: frontend Next.js
- `packages/shared`: type và hằng số dùng chung
- `packages/config`: cấu hình TypeScript, ESLint, Prettier dùng chung
- `docs`: tài liệu nghiệp vụ và thiết kế

## Bắt đầu

    nvm use          # Node theo .nvmrc
    pnpm install
    cp .env.example .env
    pnpm dev

## Lệnh cơ bản

| Lệnh             | Mục đích                     |
| ---------------- | ---------------------------- |
| `pnpm dev`       | Chạy api và web ở chế độ dev |
| `pnpm build`     | Build toàn bộ                |
| `pnpm lint`      | Kiểm tra ESLint              |
| `pnpm typecheck` | Kiểm tra kiểu TypeScript     |
| `pnpm test`      | Chạy test                    |
| `pnpm format`    | Định dạng code bằng Prettier |

Quy ước đóng góp: xem [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).
