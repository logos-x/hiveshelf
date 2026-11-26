# ADR-008: Cookie xác thực cùng origin qua Next.js rewrite

- **Trạng thái:** Proposed
- **Ngày:** 2026-11-26
- **Ánh xạ story:** ADR-006 dự kiến trong story; dùng 008 vì 006 đã được cấp cho Work/Edition.

## Bối cảnh

W2 cần thống nhất cách browser và Server Component nhận danh tính trước khi làm
đăng nhập thật. Web/API có thể triển khai ở các domain độc lập; không giả định
cookie cross-site luôn được browser chấp nhận. Spike thử A cùng origin qua
rewrite và B hai subdomain cùng site trên HTTPS local bằng mkcert/Caddy.
[Báo cáo](../spikes/auth-cookie.md) ghi kết quả người thử xác nhận, cách chạy lại,
giới hạn và kiểm chứng còn thiếu. Chưa xác nhận timebox thực tế hoặc CI toàn repo.

## Quyết định

Đề xuất **A** cho W2: browser gọi `/api/*` trên origin web;
[Next.js rewrite](../../apps/web/next.config.ts) sang API_INTERNAL_URL do server cấu hình.
API phát cookie không có Domain để browser lưu theo host web, không theo host API.
Không dùng domain API làm URL auth trực tiếp trong client của hướng A.

[Server Component](../../apps/web/src/lib/auth-spike.ts) dùng `await cookies()`,
chỉ chuyển tiếp cookie auth cần thiết tới API nội bộ, không cache kết quả me giữa
người dùng và không phát/refresh cookie trong render. Refresh phải có luồng
browser-facing trả Set-Cookie, chi tiết thuộc US-1.3a.

Quy ước dự kiến cho auth thật, phân biệt với hiện trạng chỉ có hs_access trong spike:

| Cookie       | Thuộc tính chung                          | Path phía browser    | Thời hạn                         |
| ------------ | ----------------------------------------- | -------------------- | -------------------------------- |
| `hs_access`  | HttpOnly; Secure; SameSite=Lax; bỏ Domain | `/` để SSR nhận được | Ngắn; spike là 10 phút           |
| `hs_refresh` | HttpOnly; Secure; SameSite=Lax; bỏ Domain | `/api/auth` cho A    | Dài hơn access, chốt tại US-1.3a |

Refresh phải xoay vòng, có lưu/thu hồi phiên bền vững và xử lý reuse ở US-1.3a;
chưa triển khai trong spike. Logout xóa cookie đúng tên/domain/path và thu hồi phiên.
Refresh path phải theo URL browser nhìn thấy, không theo đường dẫn API sau rewrite.

CSRF: SameSite=Lax kết hợp kiểm tra Origin khớp chính xác allowlist trên
POST/PUT/PATCH/DELETE, gồm tạo phiên và logout. Từ chối Origin thiếu/null/không hợp lệ;
GET không thay đổi trạng thái. CORS không thay thế CSRF. Client ngoài browser hoặc
webhook nếu phát sinh cần contract riêng; không nới guard cho endpoint cookie.

## Hệ quả

- **Tốt:** Cùng origin cho browser kể cả API ở domain khác; client W2 dùng URL tương
  đối. Local đã thử phát/gửi cookie, HttpOnly và SSR trên Chrome/Safari cho A/B.
- **Đánh đổi:** Thêm lượt proxy; phụ thuộc hosting giữ Set-Cookie, Cookie và Origin
  đúng. API nội bộ phải được cấu hình tin cậy; dữ liệu me không được cache dùng chung.
  Bằng chứng local chưa xác nhận hành vi trên hosting hoặc nhiều Set-Cookie.
- Mã spike chọn user tùy ý và lưu phiên trong RAM, không dùng production. Cờ API mặc
  định tắt, cấm bật production; trang/helper thử cần bỏ hoặc giới hạn trước phát hành.

## Phương án đã cân nhắc

- **B — domain chung:** Local hoạt động với Domain=hiveshelf.test, CORS origin cụ thể
  và credentials: include. Chưa chọn làm mặc định vì cần domain gốc chung và mở scope
  cookie tới các subdomain; SameSite không bảo vệ khỏi mọi subdomain cùng site.
- **Browser gọi API khác site:** Chưa dựng thử; không chọn mặc định vì phụ thuộc
  chính sách cookie cross-site của browser, cần kiểm chứng riêng nếu quay lại hướng này.

## Khi nào xem xét lại

DEPLOY-1 kiểm tra hosting rewrite, nhiều Set-Cookie, HTTPS/domain/path, Origin qua
proxy, logout, cách ly cache/user và Chrome/Firefox/Safari, lưu phiên bản/bằng chứng.
Firefox và browser logout B chưa thử; refresh rotation thuộc US-1.3a.
Xem lại nếu proxy không giữ header đúng, chi phí/giới hạn proxy không phù hợp,
hoặc có domain chung với yêu cầu sản phẩm cần gọi API trực tiếp. Chỉ chuyển
Accepted sau review; local pass không tự đồng nghĩa đã chấp nhận hoặc deploy thành công.
