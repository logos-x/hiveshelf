# ADR-004: Lựa chọn S3-compatible Object Storage

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** HiveShelf Development Team
- **Related:** ADR-002 (PostgreSQL)

## 1. Context

HiveShelf cần một giải pháp Object Storage để lưu trữ và quản lý các tệp tin, hình ảnh và tài nguyên số do người dùng đóng góp.

Hệ thống cần đáp ứng các yêu cầu:

- Hỗ trợ S3-compatible API để backend NestJS giao tiếp.
- Có thể chạy local bằng Docker Compose.
- Hỗ trợ quản lý bucket và quyền truy cập.
- Dễ dàng chuyển đổi sang Object Storage khác trong tương lai.
- Không yêu cầu thay đổi lớn trong kiến trúc backend khi thay đổi nhà cung cấp.
- Có thể sử dụng cho môi trường development và testing.

Ban đầu, HiveShelf lựa chọn MinIO làm giải pháp Object Storage.

Tuy nhiên, trong quá trình triển khai Docker Compose ngày 2026-10-30, gặp các vấn đề:

- Image `quay.io/minio/minio` trả về lỗi `401 UNAUTHORIZED` khi pull.
- Image `minio/mc` trả về lỗi `pull access denied` từ Docker Hub.

Điều này gây trở ngại cho việc thiết lập môi trường development.

## 2. Decision

HiveShelf lựa chọn **PGSTY SILO** làm giải pháp S3-compatible Object Storage thay thế MinIO trong môi trường development.

Image được sử dụng:

```yaml
image: docker.io/pgsty/silo:RELEASE.2026-10-26T00-00-00Z
```

Các cấu hình được giữ lại:

- S3-compatible API.
- Environment variables theo chuẩn `MINIO_*`.
- Service name: `minio`.
- Container name: `hiveshelf-minio`.
- Internal endpoint: `http://minio:9000`.
- API port: `9000`.
- Console port: `9001`.
- Persistent volume: `minio_data`.

Việc giữ nguyên tên service, endpoint và các biến môi trường giúp hạn chế ảnh hưởng đến cấu hình hiện tại của backend.

SILO được sử dụng thông qua giao diện S3-compatible, không để backend phụ thuộc vào các API nội bộ riêng của nhà cung cấp.

### 2.1. Docker Compose

Cấu hình Object Storage:

```yaml
minio:
  image: docker.io/pgsty/silo:RELEASE.2026-10-26T00-00-00Z
  container_name: hiveshelf-minio
  restart: unless-stopped
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${S3_ACCESS_KEY:-hiveshelf}
    MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY:-hiveshelf_dev_secret}
  ports:
    - "127.0.0.1:${MINIO_API_PORT:-9000}:9000"
    - "127.0.0.1:${MINIO_CONSOLE_PORT:-9001}:9001"
  volumes:
    - minio_data:/data
  healthcheck:
    test: ["CMD", "silo", "healthcheck", "ready"]
    interval: 5s
    timeout: 5s
    retries: 10
    start_period: 10s
```

Bucket được khởi tạo tự động thông qua service `minio-init`, sử dụng `mcli` có trong image SILO.

Bucket mặc định:

```text
hiveshelf-dev
```

Bucket được thiết lập ở chế độ private.

## 3. Alternatives Considered

### Option 1: MinIO

Ưu điểm:

- S3-compatible API.
- Hệ sinh thái và tài liệu phong phú.
- Phù hợp với kiến trúc Object Storage của HiveShelf.

Nhược điểm:

- Các image đang sử dụng gặp vấn đề truy cập repository.
- Khó thiết lập môi trường development ổn định với nguồn image hiện tại.

**Decision:** Không tiếp tục sử dụng image MinIO hiện tại.

### Option 2: PGSTY SILO

Ưu điểm:

- Duy trì khả năng tương thích với S3 API.
- Có thể thay thế MinIO trong cấu hình hiện tại.
- Hỗ trợ triển khai bằng Docker.
- Giữ được các biến môi trường và endpoint quen thuộc.

Nhược điểm:

- Là một bản fork, cần theo dõi phiên bản và mức độ tương thích.
- Cần kiểm thử các thao tác S3 thực tế với backend.
- Không nên mặc định rằng mọi tính năng riêng của MinIO đều được hỗ trợ giống hệt.

**Decision:** Chọn PGSTY SILO.

### Option 3: SeaweedFS

Ưu điểm:

- Hỗ trợ S3 API.
- Có khả năng mở rộng lưu trữ.
- Phù hợp với hệ thống cần phân tán dữ liệu.

Nhược điểm:

- Cấu hình và vận hành phức tạp hơn nhu cầu development hiện tại.
- Cần điều chỉnh thêm cấu hình Docker Compose và quy trình khởi tạo bucket.

**Decision:** Chưa lựa chọn ở giai đoạn hiện tại.

## 4. Consequences

### Positive

- Giải quyết trở ngại tải image MinIO trong quá trình thiết lập môi trường development.
- Giữ nguyên kiến trúc S3-compatible của HiveShelf.
- Hạn chế thay đổi cấu hình backend.
- Tiếp tục sử dụng Docker Compose để quản lý hạ tầng local.
- Có thể thay đổi Object Storage provider trong tương lai nếu backend sử dụng abstraction phù hợp.

### Negative

- Phụ thuộc vào một bản fork của MinIO.
- Cần kiểm thử tương thích S3 API.
- Cần theo dõi cập nhật bảo mật và phiên bản image.
- Có thể cần điều chỉnh khi chuyển đổi sang một Object Storage provider khác.

## 5. Implementation

Các thành phần liên quan:

| Component               | Technology          |
| ----------------------- | ------------------- |
| Object Storage          | PGSTY SILO          |
| S3 API                  | S3-compatible API   |
| Bucket initialization   | SILO `mcli`         |
| Container orchestration | Docker Compose      |
| Persistent storage      | Docker named volume |
| Default bucket          | `hiveshelf-dev`     |

Environment variables:

```env
S3_ACCESS_KEY=hiveshelf
S3_SECRET_KEY=hiveshelf_dev_secret
S3_BUCKET=hiveshelf-dev

MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
```

Các biến trên là giá trị mặc định cho môi trường development. Không sử dụng credentials mặc định trong production.

Backend kết nối thông qua S3 endpoint nội bộ:

```text
http://minio:9000
```

Không sử dụng `localhost` làm endpoint giữa các container.

## 6. Validation

Các kiểm tra đã thực hiện ngày 2026-10-30:

| Check                           | Result     |
| ------------------------------- | ---------- |
| Pull PostgreSQL image           | Passed     |
| Pull Mailpit image              | Passed     |
| Pull PGSTY SILO image           | Passed     |
| Start PostgreSQL                | Passed     |
| Start SILO                      | Passed     |
| Start Mailpit                   | Passed     |
| SILO healthcheck                | Passed     |
| PostgreSQL healthcheck          | Passed     |
| Mailpit healthcheck             | Passed     |
| Bucket initialization container | Exited (0) |

Các kiểm tra còn cần xác nhận:

- Xác minh bucket `hiveshelf-dev` thực sự tồn tại.
- Xác minh quyền truy cập S3.
- Kiểm tra upload, download và delete object.
- Kiểm tra kết nối từ NestJS.
- Kiểm tra quyền truy cập bucket private.

ADR được xem là đã quyết định về mặt kiến trúc; các kiểm tra S3 end-to-end tiếp tục được thực hiện trong quá trình tích hợp backend.

## 7. Future Considerations

Trong tương lai, HiveShelf có thể chuyển sang:

- Amazon S3.
- Cloudflare R2.
- Một S3-compatible Object Storage provider khác.

Backend nên sử dụng một lớp abstraction để không phụ thuộc trực tiếp vào implementation của SILO.

Mọi thay đổi Object Storage provider cần được đánh giá và ghi nhận bằng ADR mới khi có sự thay đổi đáng kể về kiến trúc.
