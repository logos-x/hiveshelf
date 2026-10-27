# ADR-003: Cách đóng gói @hiveshelf/shared

- Trạng thái: Accepted
- Ngày: 27/10/2026

## Bối cảnh

Monorepo bao gồm:

- `apps/api`: NestJS (chạy Node.js ESM/CommonJS hybrid với `moduleResolution: nodenext`).
- `apps/web`: Next.js (chạy ESM với Turbopack/Webpack và `moduleResolution: bundler`).

Cần một package `@hiveshelf/shared` dùng chung types, enums, và Zod schemas cho cả hai ứng dụng, đảm bảo hoạt động trơn tru trong cả môi trường development lẫn production.

## Quyết định

Build `@hiveshelf/shared` bằng `tsup` ra **Dual Package: CJS + ESM + TypeScript Declaration Files (.d.ts)**.
Cấu hình trong `package.json` của shared:

- Hỗ trợ trường `exports` hiện đại:
  - `import`: `./dist/index.mjs` (cho Next.js và Node ESM)
  - `require`: `./dist/index.js` (cho CommonJS fallback)
  - `types`: `./dist/index.d.ts`
- Cung cấp top-level `main`, `module`, `types` để tương thích ngược với các công cụ không đọc `exports`.

## Lý do

- **Độ tin cậy cao**: Tránh hoàn toàn các lỗi `ERR_REQUIRE_ESM` hoặc `ERR_REQUIRE_CYCLE_MODULE` khi các công cụ của NestJS hoặc thư viện phụ thuộc nạp module.
- **Tối ưu tốc độ build**: Không bắt compiler của Next.js hay NestJS phải transpile lại source TypeScript thô của shared package.
- **Môi trường dev và production đồng nhất**: Code chạy ở dev là code đã được build giống hệt như khi đóng gói release/deploy.

## Phương án đã loại

- **Trỏ thẳng vào source (`./src/index.ts`) kết hợp `transpilePackages`**:
  - _Lý do loại_: Dù Next.js hỗ trợ `transpilePackages`, NestJS CLI (`nest build` / `nest start`) không tự động transpile các file TypeScript nằm ngoài thư mục `sourceRoot` (`src/`) nếu không cấu hình tsconfig project references hoặc build hook phức tạp. Phương án này dễ gây gãy build ở API và làm chậm thời gian khởi động của Next.js.

## Hệ quả & Giải pháp kỹ thuật đi kèm

- **Quá trình phát triển (Dev Workflow)**:
  - Khi code trong `shared`, cần tiến trình `tsup --watch` để biên dịch tức thì ra `dist/`.
  - Đã cấu hình Turborepo (`turbo.json` với `"dependsOn": ["^build"]`) để khi chạy `pnpm dev`, Turborepo tự động chạy song song watch cho `shared`, `api`, và `web`.
- **NestJS Auto-restart**:
  - Mặc định `nest start --watch` chỉ watch thư mục `apps/api/src/`. Vì vậy, `apps/api` sử dụng `nodemon` cấu hình watch cả `src/` và `../../packages/shared/dist/` để tự động restart khi `shared` thay đổi.

## Ràng buộc

- `@hiveshelf/shared` là **Framework-agnostic**: chỉ chứa type, enum, Zod schema, validation rules và hằng số thuần túy; tuyệt đối không phụ thuộc vào NestJS, React, Next.js, DOM hoặc database client (Prisma).
- **Đồng bộ phiên bản Zod**: Toàn bộ workspace (`shared`, `api`, `web`) phải dùng chung một major version của Zod (hiện tại là `^4.6.7`) để tránh xung đột type inference và lỗi `instanceof` lúc runtime.
