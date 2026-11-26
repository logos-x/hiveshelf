# Spike cookie xác thực giữa Next.js và NestJS

- Ngày ghi báo cáo: 2026-11-26.
- Kết luận đề xuất: [ADR-008](../adr/008-auth-cookie-topology.md), trạng thái Proposed.
- Bằng chứng browser và các lần chạy test dưới đây do người thực hiện xác nhận
  trong quá trình hướng dẫn; chưa có ảnh chụp hoặc báo cáo browser tự động lưu trong repo.
- Tổng thời gian làm việc thực tế chưa được ghi nhận; chưa thể xác nhận đạt timebox
  1,5 ngày. Dừng mở rộng spike, chuyển phần chưa kiểm chứng sang DEPLOY-1/US-1.3a.

## Phạm vi và hiện trạng mã thử

| Hướng | Luồng browser                                        | Scope cookie                    |
| ----- | ---------------------------------------------------- | ------------------------------- |
| A     | Web `/api/*` → Next.js rewrite → NestJS              | Host web; không khai báo Domain |
| B     | Web → API ở subdomain khác, `credentials: "include"` | `Domain=hiveshelf.test`         |

Web ở `https://web.hiveshelf.test:8443`, API ở
`https://api.hiveshelf.test:8443`. Hai host dùng HTTPS nên cùng site nhưng khác
origin. Caddy kết thúc TLS và chuyển tiếp về web `localhost:3000`, API `localhost:3001`.
Caddy không xử lý `/api/*` riêng; rewrite này do Next.js thực hiện.

Mã thử chọn Alice/Bob tùy ý, không xác minh danh tính và không dùng cho đăng nhập thật:

- [Controller](../../apps/api/src/auth-spike/auth-spike.controller.ts): POST tạo
  phiên, GET `me`, DELETE thu hồi phiên và xóa cookie tại `/auth-spike`.
- [Session service](../../apps/api/src/auth-spike/auth-spike-session.service.ts):
  token ngẫu nhiên 32 byte, phiên trong bộ nhớ, TTL 10 phút; mất khi API restart.
- [Guard bật/tắt](../../apps/api/src/auth-spike/auth-spike.guard.ts): endpoint trả
  404 khi tắt hoặc chạy production. Schema chặn bật spike trong production.
- [Rewrite](../../apps/web/next.config.ts): `/api/:path*` → `API_INTERNAL_URL/:path*`.
- [Helper SSR](../../apps/web/src/lib/auth-spike.ts): `server-only`, dùng
  `await cookies()`, chỉ chuyển tiếp `hs_access` hợp lệ tới API nội bộ;
  `cache: "no-store"`, không theo redirect. API trả 401 thì trả user null.
- [Trang thử SSR](../../apps/web/src/app/%5Blocale%5D/auth-spike/page.tsx):
  `/vi/auth-spike`, hiển thị user hoặc chưa có phiên hợp lệ; không hiển thị token.

## Kết quả kiểm chứng local

Chrome và Safari đã thử; chưa ghi nhận phiên bản cụ thể. Firefox chưa thử.

| Kiểm tra                                             | A / Chrome | A / Safari | B / Chrome | B / Safari |
| ---------------------------------------------------- | ---------- | ---------- | ---------- | ---------- |
| Tạo phiên, cookie được lưu đúng scope/thuộc tính     | Pass       | Pass       | Pass       | Pass       |
| Browser gửi cookie; me trả đúng user                 | Pass       | Pass       | Pass       | Pass       |
| Reload trang; SSR chuyển tiếp cookie, nhận đúng user | Pass       | Pass       | Pass       | Pass       |
| JavaScript không đọc được cookie HttpOnly            | Pass       | Pass       | Pass       | Pass       |

- A / Chrome: Set-Cookie đi qua rewrite; hai phiên thường/ẩn danh Alice và Bob
  giữ đúng user sau reload. Cửa sổ ẩn danh chưa tạo phiên hiển thị chưa đăng nhập.
- B: request trực tiếp API thành công với CORS cho đúng origin web và
  `Access-Control-Allow-Credentials: true`; cookie domain chung đến được web cho SSR.
- A / Safari: đã kiểm tra lại sau sửa lỗi logout; DELETE trả 204, browser xóa
  `hs_access`, reload SSR về chưa đăng nhập.
- Safari có phản hồi chậm trong môi trường local, chưa xác định nguyên nhân.
- Chưa thử logout B trên browser, hai phiên độc lập B, hoặc ca đối chứng cookie
  chỉ thuộc host API khiến request trang web không mang cookie đó.

### Cookie và CSRF

Cookie thử `hs_access`: `HttpOnly; Secure; SameSite=Lax; Path=/`, TTL 600 giây.
A bỏ Domain; B dùng `hiveshelf.test`. Xóa cookie phải dùng cùng tên/domain/path.
`document.cookie` không thấy cookie HttpOnly, nên xác nhận logout bằng Storage,
Set-Cookie xóa cookie và kết quả `me`/SSR, không dùng riêng JavaScript để kết luận.

[Origin guard](../../apps/api/src/auth-spike/auth-spike-origin.guard.ts) yêu cầu
Origin khớp chính xác allowlist WEB_ORIGIN trên mọi phương thức ngoài
GET/HEAD/OPTIONS. Thiếu Origin, Origin null, site khác và subdomain cùng site
ngoài allowlist đều đã trả 403 khi POST. Không tin Origin từ forwarded header.
SameSite bổ sung bảo vệ; CORS không thay thế kiểm tra CSRF. Không dùng GET để ghi.

### Kiểm thử tự động

Người thực hiện xác nhận pass từng nhóm test và typecheck API/web liên quan:

| Nhóm                                 | Số test | Phạm vi                                          |
| ------------------------------------ | ------- | ------------------------------------------------ |
| `auth-spike-env.spec.ts`             | 6       | Mặc định tắt, parse cờ, cấm bật production       |
| `auth-spike-session.service.spec.ts` | 7       | Tạo, cách ly user, hết hạn, thu hồi              |
| Hai file guard spec                  | 37      | Bật/tắt và Origin cho POST/PUT/PATCH/DELETE      |
| `auth-spike.http.spec.ts`            | 17      | Cookie A/B, me, logout, Origin, endpoint khi tắt |

HTTP test khởi tạo riêng AuthSpikeModule, không cần database và gửi Cookie thủ công;
không kiểm chứng chính sách cookie của browser. Test đã phát hiện logout xóa nhầm
`hs_cookie`; đã sửa thành `hs_access`, chạy lại HTTP test và thử lại Safari A.
Người thực hiện xác nhận `pnpm lint`, `pnpm typecheck`, `pnpm test` và `pnpm build`
đều pass trên local. E2E chạy thành công sau khi chỉnh cổng database test
từ cấu hình cũ 15432 về cổng PostgreSQL local 5432.
CI trên PR chưa được xác nhận.

## Chạy lại

1. Cài mkcert và Caddy; chạy `mkcert -install` để tin cậy CA local.
2. Thêm `127.0.0.1 web.hiveshelf.test api.hiveshelf.test` vào `/etc/hosts`.
3. Tạo chứng chỉ ngoài repo:

   ```sh
   mkdir -p /private/tmp/hiveshelf-auth-spike
   mkcert -cert-file /private/tmp/hiveshelf-auth-spike/local-cert.pem \
     -key-file /private/tmp/hiveshelf-auth-spike/local-key.pem \
     localhost 127.0.0.1 web.hiveshelf.test api.hiveshelf.test
   ```

4. Tạo `/private/tmp/hiveshelf-auth-spike/Caddyfile`:

   ```caddyfile
   {
       auto_https disable_redirects
   }

   https://web.hiveshelf.test:8443 {
       bind 127.0.0.1
       tls /private/tmp/hiveshelf-auth-spike/local-cert.pem /private/tmp/hiveshelf-auth-spike/local-key.pem
       reverse_proxy localhost:3000
   }

   https://api.hiveshelf.test:8443 {
       bind 127.0.0.1
       tls /private/tmp/hiveshelf-auth-spike/local-cert.pem /private/tmp/hiveshelf-auth-spike/local-key.pem
       reverse_proxy localhost:3001
   }
   ```

5. Env API: `AUTH_SPIKE_ENABLED=true`,
   `WEB_ORIGIN=http://localhost:3000,https://web.hiveshelf.test:8443`.
   A: bỏ hẳn AUTH_SPIKE_COOKIE_DOMAIN, không gán chuỗi rỗng.
   B: `AUTH_SPIKE_COOKIE_DOMAIN=hiveshelf.test`.
6. Env web: `API_INTERNAL_URL=http://localhost:3001`;
   `NEXT_PUBLIC_SITE_URL=https://web.hiveshelf.test:8443`;
   `NEXT_PUBLIC_API_URL=https://api.hiveshelf.test:8443` để CSP cho phép thử B.
   A gọi đường dẫn tương đối `/api/*`. Kiểm tra các env override nếu CSP vẫn dùng URL cũ.
7. Chạy `pnpm infra:up`, rồi `pnpm dev`; ở terminal khác chạy
   `caddy run --config /private/tmp/hiveshelf-auth-spike/Caddyfile --adapter caddyfile`.
8. Mở `/vi/auth-spike` trên host web. Trong Console của trang, tạo phiên:

   ```js
   // A; với B thay URL bằng https://api.hiveshelf.test:8443/auth-spike/session
   // và credentials bằng "include".
   fetch("/api/auth-spike/session", {
     method: "POST",
     credentials: "same-origin",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ user: "alice" }),
   }).then(async (response) => console.log(response.status, await response.json()));
   ```

   Gọi GET đường dẫn tương ứng `/auth-spike/me` với cùng credentials: mong đợi
   200/Alice; hard reload trang SSR vẫn là Alice. DELETE đường dẫn session với
   cùng credentials: mong đợi 204, cookie biến mất, me trả 401 và SSR chưa đăng nhập.
   Browser tự thêm Origin; curl cho request ghi phải thêm Origin hợp lệ.

9. Restart dev server sau khi sửa env. Xóa mọi cookie hs_access cũ ở host web/API
   và domain chung khi chuyển A/B; tránh hai cookie cùng tên khác scope.
   Sau API restart phải tạo lại phiên. Safari Console có thể hiện Promise pending;
   đợi kết quả Network/HTTP, không coi riêng Promise pending là lỗi.
10. Chạy lại test có mục tiêu từ repo root:

    ```sh
    pnpm --filter @hiveshelf/api exec vitest run src/auth-spike src/config/auth-spike-env.spec.ts
    pnpm --filter @hiveshelf/api typecheck
    pnpm --filter @hiveshelf/web typecheck
    ```

Không commit .env thật, token, cookie jar, khóa riêng hay chứng chỉ local.
Thư mục tạm có thể mất; tạo lại chứng chỉ/Caddyfile nếu cần. Xong spike, tắt
AUTH_SPIKE_ENABLED; trang web/helper thử hiện chưa được bảo vệ bằng cờ này.

## Việc còn lại và giới hạn kết luận

- A/B trên local đã có bằng chứng do người thử xác nhận; đây chưa phải sign-off staging.
- Không dựng topology browser gọi trực tiếp API ở hai site độc lập. B không đại diện
  cho web vercel.app và API onrender.com; A giữ request browser trên origin web.
- DEPLOY-1: thử rewrite trên hosting thật, nhiều Set-Cookie cùng response,
  Origin qua proxy, HTTPS, domain/path, cache và hai user, logout A/B,
  Chrome/Firefox/Safari; ghi phiên bản và lưu bằng chứng, kể cả khi thất bại.
- US-1.3a: auth thật, refresh rotation, lưu/thu hồi phiên bền vững, xử lý access
  hết hạn khi SSR. Chưa có refresh cookie trong spike.
- Người thực hiện đã xác nhận tự review diff và lint/typecheck/test/build pass
  trên local. Còn cần mở PR với Closes số issue thật, kiểm tra CI và review trước
  khi merge.
