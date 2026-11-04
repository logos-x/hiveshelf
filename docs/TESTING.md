# Hướng dẫn kiểm thử

## Công cụ

- API: Vitest, Nest Testing và Supertest.
- Web: Vitest, React Testing Library, jest-dom và jsdom.
- Shared: Vitest cho Zod schema và logic thuần.
- API e2e sử dụng PostgreSQL thật.
- Playwright sẽ được bổ sung ở Phase 1, chưa cài trong P0.

## Chuẩn bị môi trường

Chạy các lệnh từ root repo.

Yêu cầu Node.js 24, pnpm theo packageManager trong package.json
và Docker Compose.

```bash
nvm use
pnpm install --frozen-lockfile
```

Nếu chưa có file môi trường, tạo từ `.env.example` ở root
và `apps/api/.env.example` cho API. Không ghi đè cấu hình đang dùng.

DATABASE_URL và DATABASE_URL_TEST phải trỏ đến hai database khác nhau.

Ví dụ với hạ tầng local mặc định:

```dotenv
DATABASE_URL=postgresql://hiveshelf:hiveshelf_dev@localhost:5432/hiveshelf
DATABASE_URL_TEST=postgresql://hiveshelf:hiveshelf_dev@localhost:5432/hiveshelf_test
```

Điều chỉnh user, password và port theo môi trường của bạn.

Thứ tự ưu tiên cấu hình API:

1. Biến môi trường của tiến trình.
2. apps/api/.env.local.
3. apps/api/.env.
4. Root .env.

API không tự nạp root .env.local.

Khởi động PostgreSQL:

```bash
docker compose up -d --wait postgres
```

Database hiveshelf_test phải tồn tại. Script khởi tạo Docker chỉ chạy
khi data directory được tạo lần đầu. Với volume cũ thiếu DB test,
tạo bổ sung DB thay vì reset volume.

Role trong DATABASE_URL_TEST cần quyền tạo database.

## Chạy toàn bộ test

```bash
pnpm test
```

Lệnh chạy:

- Shared: schema và unit test.
- Web: component và unit test.
- API: unit test, sau đó e2e với DB thật.

Turbo tự build package phụ thuộc và generate Prisma client.
API test không dùng cache; web/shared có thể dùng cache.

Buộc tất cả test chạy lại:

```bash
pnpm exec turbo run test --force
```

Lệnh mặc định không chạy integration S3/SMTP.

## Chạy từng package

Khi chạy trực tiếp test API, chuẩn bị shared và Prisma client:

```bash
pnpm --filter @hiveshelf/shared build
pnpm db:generate
```

| Lệnh                                   | Phạm vi                |
| -------------------------------------- | ---------------------- |
| pnpm --filter @hiveshelf/shared test   | Shared unit/schema     |
| pnpm --filter @hiveshelf/web test      | Web unit/component     |
| pnpm --filter @hiveshelf/api test:unit | API unit, không cần DB |
| pnpm --filter @hiveshelf/api test:e2e  | API e2e với DB thật    |
| pnpm --filter @hiveshelf/api test      | API unit và e2e        |
| pnpm --filter @hiveshelf/api test:int  | Integration S3/SMTP    |

Ví dụ chạy một file:

```bash
pnpm --filter @hiveshelf/shared test src/schemas/liveness.spec.ts
pnpm --filter @hiveshelf/web test src/components/ui/alert.spec.tsx
pnpm --filter @hiveshelf/api test:unit test/database.guard.spec.ts
```

Chạy watch:

```bash
pnpm --filter @hiveshelf/shared test:watch
pnpm --filter @hiveshelf/web test:watch
pnpm --filter @hiveshelf/api test:watch
```

API test:watch và test:cov hiện chỉ áp dụng cho unit test.

Integration S3/SMTP cần MinIO, bucket và Mailpit hoạt động,
cùng cấu hình STORAGE_DRIVER=s3 và EMAIL_DRIVER=smtp.
Xem phần kiểm tra storage/email trong README.

## Vị trí và tên file

| Loại test          | Vị trí                                                                           | Tên                       |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------- |
| API unit           | Cạnh source/helper trong `apps/api/src`, `apps/api/scripts` hoặc `apps/api/test` | `*.spec.ts`               |
| API e2e            | apps/api/test                                                                    | *.e2e-spec.ts             |
| API integration    | apps/api/src                                                                     | *.int.spec.ts             |
| Web unit/component | Cạnh source trong apps/web/src                                                   | *.spec.ts hoặc *.spec.tsx |
| Shared unit/schema | Cạnh source trong packages/shared/src                                            | *.spec.ts                 |

Dùng describe theo module/component/schema.
Tên it mô tả hành vi và điều kiện cụ thể.
Import các hàm Vitest rõ ràng trong test mới.
Không export file test từ entry point của package.

## Cô lập database và dữ liệu

DATABASE_URL_TEST là kết nối tới database nền hiveshelf_test.
Guard chỉ chấp nhận PostgreSQL trên loopback, database hiveshelf_test
và schema public nếu URL chỉ định schema.

Mỗi lần chạy e2e:

1. Xác thực URL nền và bảo đảm khác DB development.
2. Tạo database hiveshelf_test_<uuid>.
3. Chạy migrate deploy.
4. Chạy seed hai lần để kiểm tra idempotency.
5. Truyền URL DB tạm tới worker và application.
6. Xóa DB tạm sau khi suite kết thúc, kể cả khi assertion fail.

Setup thất bại sau khi tạo DB cũng thực hiện cleanup.

Các lần chạy độc lập có thể chạy đồng thời.
Trong một lần chạy, các test vẫn dùng chung DB tạm:

- Tạo fixture riêng cho từng test.
- Dùng khóa/email/mã tham chiếu không trùng.
- Cleanup dữ liệu do test tạo trong afterEach hoặc finally.
- Không phụ thuộc dữ liệu hoặc thứ tự của test khác.
- Không chạy các test ghi chung fixture bằng it.concurrent.

Nếu tiến trình bị kill cưỡng bức hoặc máy tắt, teardown có thể không chạy.
Kiểm tra database còn sót có tiền tố hiveshelf_test_ trước khi dọn thủ công.
Chỉ xóa đúng DB tạm đã xác nhận không còn được sử dụng.

API health e2e dùng storage/email memory nên không cần MinIO/Mailpit.

## Những logic bắt buộc có test

- Quyền: được phép, bị từ chối và truy cập tài nguyên của người khác.
- Trạng thái: chuyển trạng thái hợp lệ, không hợp lệ và thao tác lặp.
- Thanh toán: tính tiền, thành công, thất bại và xử lý callback lặp
  hoặc idempotency khi tính năng có yêu cầu.
- Validation: dữ liệu hợp lệ, sai kiểu, thiếu trường và giá trị biên.

Khi sửa lỗi nghiệp vụ, bổ sung test tái hiện lỗi nếu phù hợp.

Mock dịch vụ bên ngoài ở unit test.
Không gọi dịch vụ thanh toán thật trong automated test mặc định.

## Kim tự tháp test

- Nhiều unit test cho logic thuần: nhanh và dễ xác định lỗi.
- Ít integration test hơn để kiểm tra kết nối giữa các thành phần.
- Một số e2e cho luồng chính và hợp đồng HTTP.

Web component test ưu tiên role, accessible name và hành vi hiển thị.
Tránh phụ thuộc vào cấu trúc DOM hoặc chuỗi CSS.

jsdom không thay thế trình duyệt thật và không kiểm chứng layout.
Async Server Components cần chiến lược kiểm thử phù hợp;
không mặc định render trực tiếp bằng component test.

## CI

Job CI chạy lint, typecheck, build và integration/smoke hiện có.
Job test chạy sau CI, sử dụng PostgreSQL 17 service và pnpm test.

Test fail làm job test thất bại.
Ruleset/branch protection của main phải yêu cầu cả CI và test thành công
để chặn merge khi kiểm tra thất bại.

Không commit file .env thật hoặc secret.
