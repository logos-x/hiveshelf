# ADR-006: Mô hình Work/Edition và phiên bản chương

- **Trạng thái:** Proposed
- **Ngày:** 2026-11-05
- **Cập nhật:** 2026-11-26

## Bối cảnh

Trang sách và reader cần định danh ổn định khi nội dung được sửa, đồng thời
chừa điểm nối cho đóng góp P2, bản dịch P5 và audio chưa chốt phase.
P1 triển khai mô hình nội dung và ba API đọc công khai cho danh sách sách,
chi tiết sách và nội dung chương. Mỗi Work có tối đa một Edition. Trình đọc
chỉ nhận phiên bản chương đang xuất bản. Phạm vi này tạo metadata MediaAsset
và dữ liệu mẫu, đồng thời tạm hoãn các trường tham chiếu User để catalog có
thể triển khai trước auth. Chi tiết schema được mô tả trong [ERD P1](../erd.md).

Trước thay đổi này, Prisma chỉ có bảng kỹ thuật SystemInfo. Các quyết định
dưới đây hướng dẫn triển khai schema nội dung và API. ADR giữ trạng thái
Proposed để review văn bản.

## Quyết định

Work đại diện một sách độc lập: giữ slug công khai, tiêu đề gốc và trạng thái truy cập.
Edition chứa ngôn ngữ nội dung BCP 47, tiêu đề, mô tả, bìa và trạng thái xuất bản.
Genre/Tag gắn Work; P1 lưu danh sách tên tác giả tại Work.authorNames, mặc định
mảng rỗng khi chưa có thông tin; chưa tạo bảng hoặc hồ sơ tác giả riêng. User locale sau này
độc lập với Edition.languageTag. Validation/chuẩn hóa BCP 47 đặt tại tầng ứng
dụng dùng chung cho seed/service; không bảo vệ ghi raw SQL trực tiếp.

Enforce unique Edition.workId, tối đa một Edition/Work. Các bản ngôn ngữ khác
nhau của cùng tác phẩm gốc được quản lý như những sách độc lập, mỗi sách có
Work, Edition, slug, metadata và mục lục riêng. Ba API công khai dùng Work.slug;
không có bộ chuyển Edition hoặc tự động liên kết các bản dịch trong phạm vi
hiện tại. Đổi locale giao diện không đổi sách đang xem.

sourceEditionId được giữ trong schema để tránh thay đổi ngoài phạm vi card;
hiện luôn NULL và không dùng để nối các sách khác Work. FK cùng Work và CHECK
chống tự trỏ vẫn được giữ. Nếu cần workflow liên kết bản dịch ở phase sau,
phải review mô hình quan hệ và migration riêng; không mặc định nới unique workId.

Chapter giữ định danh, slug, thứ tự và publishedVersionId nullable. Title và HTML
thuộc ChapterVersion bất biến; sửa tạo version mới, xuất bản chuyển pointer
trong transaction. FK ghép bảo đảm pointer thuộc đúng Chapter. Reader chỉ trả
published version, không chọn version mới nhất theo số hoặc ngày tạo.

EditionSource là snapshot nguồn nhập và căn cứ sử dụng, gắn Edition; mỗi version
tham chiếu một nguồn cùng Edition bằng FK ghép. Đổi nguồn tạo snapshot mới.
citation là thông tin nguồn dạng văn bản tự do, có thể nhập “Sưu tầm”.
rightsBasis và rightsStatement cho phép NULL khi chưa có thông tin quyền sử
dụng; không tự suy ra PUBLIC_DOMAIN hoặc PERMISSION từ citation. Trang chi
tiết hiển thị citation, sourceUrl và rightsStatement của các nguồn được phiên
bản chương đang xuất bản tham chiếu, loại trùng theo ID nguồn. Khi thiếu ghi
chú quyền sử dụng, giao diện hiển thị thông báo đã dịch. Form quản trị nhập
thông tin không thuộc card trang chi tiết.
Không thêm license/sourceNote tổng hợp ở Work/Edition và không đồng nhất phạm vi
công cộng với một mã giấy phép. EditionSource không thay ContributionSource P2.

Quyền đọc yêu cầu Work AVAILABLE, Edition PUBLISHED và chương có published
pointer. DRAFT/ARCHIVED và Work BLOCKED không được trả công khai. Xuất bản
Edition yêu cầu có chương đã xuất bản và bìa READY. Card tạo schema MediaAsset
và fixture bìa; workflow upload thuộc story khác. Các trường nguồn công khai
giới hạn như trên; thông tin xử lý chặn và các trường nội bộ khác không trả ra.

Ngoại lệ triển khai: tạm bỏ Work.blockedById, ChapterVersion.createdById và
MediaAsset.uploadedById để catalog không phụ thuộc auth. CHECK Work hiện chỉ
kiểm tra blockedAt/blockReason theo accessStatus. Auth sẽ thêm cột nullable/FK,
review CHECK và chỉ backfill khi biết đúng người thực hiện; không gán User giả.
Không tạo Contribution hoặc AudioTrack trước phase tương ứng. Giữ SystemInfo;
quy ước UUID, snake_case và migration theo [ADR-005](005-prisma-migration-workflow.md).

## Hệ quả

- **Tốt:** Mỗi sách có URL và ngôn ngữ nội dung rõ ràng, giữ Chapter ID và URL khi sửa;
  bản nháp không làm thay đổi nội dung đang đọc; nguồn truy được theo version.
- **Đánh đổi:** Cần FK ghép, transaction chuyển pointer và quản lý snapshot;
  các bản ngôn ngữ có metadata và mục lục riêng, chưa có liên kết bản dịch hoặc
  bộ chuyển bản. Dữ liệu ban đầu không truy nguyên được User.
  sourceEditionId chưa biểu diễn phiên bản nguồn hoặc ánh xạ chương nhiều–nhiều.
  Audio có thể tham chiếu ChapterVersion và kế thừa ngôn ngữ qua Chapter → Edition,
  nhưng schema giọng đọc, phân đoạn và provenance chưa được quyết định.

## Phương án đã cân nhắc

- **Một bảng Book:** Đơn giản ban đầu nhưng trộn tác phẩm với ngôn ngữ và nguồn.
- **Nhiều Edition trong một Work:** Tăng contract chọn bản ngôn ngữ và phạm vi
  quản trị. Chọn quản lý mỗi bản ngôn ngữ như một sách độc lập, giữ unique workId;
  không triển khai bộ chuyển Edition trong card trang chi tiết.
- **Ghi đè chương hoặc đọc version mới nhất:** Mất snapshot hoặc lộ bản nháp.
- **Giấy phép chung trên Work:** Không biểu diễn được nguồn/căn cứ khác nhau
  giữa các lần nhập và các bản ngôn ngữ; chọn provenance theo version.

## Khi nào xem xét lại

Khi mở auth, đóng góp P2, workflow liên kết bản dịch hoặc audio; khi một version cần nhiều nguồn
hay giấy phép tổng hợp; khi cần đổi slug/redirect hoặc chính sách retention.
Allowlist HTML, anchor và pipeline sanitize phải được chốt trước khi mở nhập/sửa
nội dung; card hiện chỉ dùng seed tự viết, không coi đó là sanitizer.
