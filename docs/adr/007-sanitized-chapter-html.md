# ADR-007: Nội dung chương là HTML đã sanitize

- **Trạng thái:** Proposed
- **Ngày:** 2026-11-20
- **Cập nhật:** 2026-11-23
- **Liên quan:** [ADR-006](006-work-edition-model.md).
- **Ánh xạ:** ADR-005 trong story gốc; dùng ADR-007 theo mục lục repo.

## Bối cảnh

Nội dung chương đến từ Admin, script nhập sách và đóng góp cộng đồng.
Cần một pipeline server trước khi lưu để phòng stored XSS, đồng thời giữ
snapshot nội dung và vị trí đọc gắn với ChapterVersion.

## Quyết định

Lưu HTML fragment đã sanitize trong ChapterVersion.contentHtml.
Dùng sanitize-html với allowlist tường minh; dependency được khóa bằng lockfile.
Sanitizer và writer đặt tại apps/api/src/common/content, không phụ thuộc client.

Allowlist thẻ: p, br, h2, h3, h4, strong, b, em, i, blockquote, ul, ol, li, hr, a.
Thuộc tính từ input: a[href,title], ol[start], li[value].
start/value chỉ nhận số nguyên signed 32-bit; hệ thống chuẩn hóa cách biểu diễn.
Không giữ `style`, `class`, `id`, `data-*` hoặc event handlers từ input.
P1 không cho ảnh, SVG, MathML, iframe, form hoặc nội dung nhúng/thực thi.
Container nguy hiểm được loại cùng nội dung theo cấu hình và regression tests;
thẻ trình bày không hỗ trợ có thể được bỏ nhưng giữ văn bản an toàn.

href được parser xử lý entity rồi kiểm tra bằng URL parser, không truyền base URL.
Chỉ nhận URL tuyệt đối dùng http, https, mailto; không nhận URL tương đối,
fragment hoặc protocol-relative. URL có thể được chuẩn hóa.
Liên kết hợp lệ luôn có `rel="noopener noreferrer nofollow"`; không giữ target.
href không hợp lệ bị bỏ, văn bản liên kết được giữ.

Pipeline: HTML nguồn → sanitize và sinh anchors → SHA-256 UTF-8 → lưu snapshot.
sanitizeChapterHtml xác định và idempotent. Writer tự gán hash và format version.
Các phần tử p được gán id p-1, p-2, ... theo thứ tự sau khi làm sạch.
Anchor ổn định trong một version; bookmark cần chapterVersionId và paragraph index.
Không bảo đảm cùng paragraph index vẫn trỏ cùng nội dung sau khi sửa chương.

Contract hiện tại dùng contentFormatVersion=2; seed cũ từng dùng 1.
Sửa nội dung tạo version mới. API trả HTML đã lưu của published version.
Component ChapterContent giữ nguyên HTML và anchors, chỉ nhận nội dung từ API;
không dùng component này để preview trực tiếp HTML nguồn chưa sanitize.

Mọi đường tạo nội dung phải gọi createChapterVersion, kể cả seed/import.
ESLint chặn truy cập phương thức ghi trực tiếp trên chapterVersion ngoài writer;
ngoại lệ test constraint được khai báo tại từng dòng.
Rule hiện chưa bao phủ mọi alias, nested write hoặc raw SQL; các kiểu này
bị cấm cho nội dung chương và phải được kiểm tra khi review đường ghi.
TypeScript và lint không phải ranh giới chống người có quyền ghi DB trực tiếp.

Audit dữ liệu cũ trước rollout. Chuyển đổi bằng snapshot mới và đổi published
pointer trong transaction, giữ nguyên lịch sử; không sửa snapshot cũ.
Format version không tự chứng minh nội dung an toàn.
Không tự xuất bản lại snapshot lịch sử; cần kiểm tra contract trước khi publish.
Xem lệnh và giới hạn chuyển đổi trong [API README](../../apps/api/README.md).

CSP production enforce nonce ngẫu nhiên theo request cho Next.js và next-themes.
script-src không cho unsafe-inline/unsafe-eval; event handlers nội tuyến bị chặn.
P1 còn cho inline CSS để tương thích UI. Có nosniff và Referrer-Policy.
Nonce yêu cầu dynamic rendering; không cache HTML chứa nonce như trang tĩnh.
Xem cấu hình và kiểm chứng trong [Web README](../../apps/web/README.md).

## Hệ quả

Giữ được định dạng sách phổ biến và một policy server cho mọi nguồn.
Đánh đổi: mất định dạng ngoài allowlist, chưa có ảnh/footnote; cần bảo trì
dependency, regression tests và quy trình chuyển dữ liệu khi policy đổi.
Reader hiện có component nền tảng, chưa có trang đọc và workflow bookmark hoàn chỉnh.

## Phương án đã cân nhắc

Markdown đơn giản nhưng nguồn HTML vẫn cần chuyển đổi và sanitize nếu cho raw HTML.
EPUB là container nhập/xuất, phải tách tài nguyên và làm sạch trước khi phục vụ web.
JSON editor cần schema và renderer riêng, chưa cần trong P1.
Chỉ lọc ở client hoặc tự lọc HTML bằng regex không đáp ứng ranh giới bảo vệ.

## Khi nào xem xét lại

Khi mở ảnh, bảng, footnote, editor/nguồn nhập mới, đóng góp cộng đồng,
bookmark giữa các version hoặc khi có security advisory liên quan.
