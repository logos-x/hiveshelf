# ADR-003: Cách đóng gói @hiveshelf/shared

- **Trạng thái:** Accepted
- **Ngày:** 2026-10-27
- **Cập nhật:** 2026-11-04 — làm rõ runtime ESM và quy trình build/watch.

## Bối cảnh

API NestJS hiện chạy Node.js ESM (`type: module`, `moduleResolution: nodenext`);
web Next.js dùng bundler. Cả hai cần types, enum, hằng số và Zod schema dùng chung
trong development và production mà không phải tự biên dịch source của package.

## Quyết định

Build `@hiveshelf/shared` bằng **tsup**, xuất CJS, ESM và TypeScript declarations.
Conditional exports tại entry gốc dùng `import: ./dist/index.mjs`,
`require: ./dist/index.js`, `types: ./dist/index.d.ts`; giữ `main`, `module`,
`types` cho tooling cũ. CJS là đầu ra tương thích bổ sung, không phải runtime
chính của API hiện tại. Khai báo `sideEffects: false`; code phải giữ tính chất này.

Shared chỉ chứa contract và logic thuần, không phụ thuộc NestJS, React, Next.js,
DOM hoặc Prisma. Các consumer dùng API export công khai, không import sâu vào
source/dist. Giữ Zod cùng major trong workspace, kiểm tra lockfile khi nâng cấp.

## Hệ quả

- **Tốt:** Consumer đọc JavaScript đã build và declarations; tách bước biên dịch
  shared khỏi compiler ứng dụng, hỗ trợ cả ESM và công cụ cần CJS.
- **Đánh đổi:** Phải build shared trước consumer và giữ hai đầu ra tương thích;
  dual build không bảo đảm loại bỏ mọi lỗi module hoặc vấn đề runtime identity.
  Tránh thêm trạng thái singleton phụ thuộc việc hai đầu ra là cùng một instance.
- **Dev:** Turbo dùng `dependsOn: ["^build"]` để build dependency trước khi chạy
  app. `pnpm dev` đồng thời khởi chạy script dev của các workspace; shared dùng
  `tsup --watch`. API dùng nodemon theo dõi `src` và `shared/dist` để restart.
  Chạy app riêng không tự khởi chạy shared watcher; cần build/watch shared riêng.

## Phương án đã cân nhắc

- **Export TypeScript source + transpilePackages:** Next.js có thể transpile,
  nhưng pipeline API hiện chỉ build ứng dụng; cần thêm cấu hình biên dịch source
  ngoài app. Chọn package đã build để thống nhất contract giữa các consumer.
- **ESM-only:** Hợp với runtime API/web hiện tại và giảm số đầu ra; chưa đổi vì
  muốn giữ nhánh tương thích CJS đã chọn ở US-0.1c.
- **CJS-only:** Dùng được với nhiều công cụ Node nhưng thiếu đầu ra ESM trực tiếp
  cho bundler; giữ dual build với chi phí cấu hình hiện còn nhỏ.

## Khi nào xem xét lại

Cân nhắc ESM-only khi xác nhận toàn bộ consumer/tooling không cần CJS; xem lại
chiến lược build khi thời gian rebuild hoặc lỗi nạp hai đầu ra gây trở ngại thực tế.

Bằng chứng: [exports](../../packages/shared/package.json),
[tsup](../../packages/shared/tsup.config.ts), [Turbo](../../turbo.json),
[nodemon](../../apps/api/nodemon.json), [API runtime](../../apps/api/package.json).
