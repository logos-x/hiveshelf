# Architecture Decision Records

ADR lưu bối cảnh, lựa chọn, phương án đã loại và điều kiện xem xét lại một quyết
định kiến trúc. Mỗi ADR tập trung một quyết định, khoảng một trang (mục tiêu
40–70 dòng Markdown, không tính đây là giới hạn trang in cố định). Hướng dẫn vận
hành và thiết kế chi tiết được dẫn link thay vì chép vào ADR.

## Mục lục

| ADR                                        | Quyết định                                       | Trạng thái |
| ------------------------------------------ | ------------------------------------------------ | ---------- |
| [001](001-modular-monolith-monorepo.md)    | Modular monolith và monorepo với pnpm, Turborepo | Accepted   |
| [002](002-postgresql.md)                   | PostgreSQL và Prisma                             | Accepted   |
| [003](003-shared-package-bundling.md)      | Cách đóng gói `@hiveshelf/shared`                | Accepted   |
| [004](004-s3-compatible-object-storage.md) | S3-compatible Object Storage                     | Accepted   |
| [005](005-prisma-migration-workflow.md)    | Prisma và quy trình thay đổi database schema     | Proposed   |

ADR-004/005 là tài liệu có sẵn; giữ nguyên ID và trạng thái. ADR-004 còn dài hơn
mục tiêu một trang, việc rút gọn được để riêng để giữ phạm vi cập nhật ADR-001..003.
Trạng thái ADR thể hiện việc chấp nhận quyết định, không thay thế kết quả kiểm
thử hoặc trạng thái triển khai; có implementation không tự đổi Proposed thành Accepted.

## Quy ước

- File dùng `NNN-kebab-case.md`, tiêu đề `ADR-NNN: Tên quyết định`; số tăng dần
  trên toàn repo, không reset theo phase, không tái sử dụng hoặc đổi số ADR cũ.
- Tạo từ [TEMPLATE.md](TEMPLATE.md), chọn số chưa dùng tiếp theo và cập nhật mục
  lục trong cùng PR. Các số ở backlog dưới đây là dự kiến; kiểm tra lại trước khi tạo.
- Dùng tiếng Việt, giữ tên kỹ thuật khi cần; ghi ngày ISO `YYYY-MM-DD`.
  Ngày là ngày quyết định/đề xuất; khi sửa tài liệu giữ ngày gốc và thêm ngày cập nhật.
- Mỗi ADR có bối cảnh, quyết định, hệ quả tốt/đánh đổi, phương án đã cân nhắc,
  trạng thái, ngày và điều kiện xem xét lại; dẫn source để phân biệt hiện trạng
  với thiết kế dự kiến. Không để nội dung mẫu còn sót trong ADR hoàn chỉnh.
- Tóm lược động cơ lựa chọn, không chép toàn bộ config hoặc nhật ký kiểm thử;
  giới hạn khoảng 20–30 phút cho bản nháp mỗi ADR.

## Vòng đời trạng thái

- **Proposed:** Đang đề xuất/review; chưa coi là quyết định được chấp nhận.
- **Accepted:** Chủ dự án đã chấp nhận lựa chọn; cập nhật trạng thái qua PR.
- **Superseded:** Được ADR mới thay thế. ADR cũ giữ nguyên ID, nội dung quyết
  định và thêm link `Được thay thế bởi ADR-NNN`; ADR mới ghi `Thay thế ADR-NNN`.

Luồng thông thường: **Proposed → Accepted → Superseded**. Khi quyết định thay đổi,
tạo ADR mới, cập nhật trạng thái và link hai chiều ở ADR cũ cùng mục lục; không
viết đè lịch sử lý do. Sửa lỗi hoặc làm rõ nội dung không đổi quyết định có thể
cập nhật tại chỗ, ghi ngày cập nhật. Đề xuất chưa được chấp nhận giữ Proposed
và ghi rõ kết quả review nếu tạm hoãn.

## ADR dự kiến cho Phase 1

Story ban đầu dự kiến số 004–007, nhưng 004/005 đã được dùng cho storage và
migration. Ánh xạ sang 006–009 để bảo toàn lịch sử; đây là backlog câu hỏi,
chưa phải bốn ADR đã Accepted.

| ID dự kiến (ID trong story) | Chủ đề                              | Câu hỏi cần trả lời                                                                                                                                    |
| --------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 006 (004)                   | Mô hình Work/Edition                | Vì sao tách tác phẩm và ấn bản khi P1 tối đa một Edition/Work? Metadata, trạng thái thuộc đâu; khi nào nới unique workId để hỗ trợ bản dịch?           |
| 007 (005)                   | Nội dung chương là HTML đã sanitize | Vì sao HTML thay vì Markdown/JSON editor? Sanitize ở đâu, allowlist nào; version policy, anchor và nội dung cũ được xử lý thế nào khi đổi policy?      |
| 008 (006)                   | Cookie httpOnly giữa Next và Nest   | Topology domain và luồng browser/SSR ra sao? Cấu hình cookie, CORS, CSRF; refresh rotation, logout và thu hồi phiên phối hợp thế nào?                  |
| 009 (007)                   | Adapter dịch vụ ngoài               | Contract, lỗi, retry/idempotency và kiểm thử adapter quy định thế nào? Kế thừa storage/email hiện có ra sao; khi nào cần adapter thanh toán/quảng cáo? |

Đối chiếu [ERD P1 đang để review](../erd.md) khi viết 006–008; Work/Edition và
auth chưa có trong Prisma schema hiện tại. ADR-009 bổ sung nguyên tắc adapter,
không thay thế quyết định nhà cung cấp storage ở ADR-004. Storage/email đã có
module và driver trong API; thanh toán/quảng cáo chưa được chốt phase, chỉ ghi
câu hỏi mở, không đưa implementation của chúng vào phạm vi Phase 1.
