# ADR-002: Lựa chọn PostgreSQL làm hệ quản trị cơ sở dữ liệu

- **Status:** Accepted
- **Date:** 2026-10-30
- **Deciders:** HiveShelf Development Team

## 1. Context

HiveShelf là nền tảng quản lý và chia sẻ tài nguyên số, cần một hệ quản trị cơ sở dữ liệu quan hệ (Relational Database Management System – RDBMS) để lưu trữ dữ liệu nghiệp vụ.

Hệ thống cần quản lý nhiều loại dữ liệu có quan hệ với nhau, bao gồm:

- User accounts và authentication.
- Roles và permissions.
- Books, documents và digital resources.
- Categories, tags và metadata.
- User libraries và reading activities.
- Contributions và editorial workflows.
- Comments, reviews và notifications.
- Billing và subscription information.

Các yêu cầu đối với database:

- Hỗ trợ quan hệ dữ liệu và transaction.
- Đảm bảo tính toàn vẹn dữ liệu.
- Hỗ trợ indexing và truy vấn phức tạp.
- Hỗ trợ JSON/JSONB cho dữ liệu bán cấu trúc.
- Có khả năng mở rộng khi hệ thống phát triển.
- Dễ dàng triển khai local bằng Docker.
- Hỗ trợ môi trường development, testing và production.

## 2. Decision

HiveShelf lựa chọn **PostgreSQL** làm hệ quản trị cơ sở dữ liệu quan hệ chính.

Phiên bản Docker image được sử dụng:

```yaml
image: postgres:17-alpine
```

Lựa chọn PostgreSQL 17 nhằm ghim major version, giúp môi trường development và CI nhất quán, hạn chế thay đổi hành vi khi cập nhật image.

### 2.1. Database architecture

Trong môi trường development, HiveShelf sử dụng một PostgreSQL instance với hai database độc lập:

| Database         | Purpose                    |
| ---------------- | -------------------------- |
| `hiveshelf`      | Main application database  |
| `hiveshelf_test` | Automated testing database |

Hai database sử dụng chung PostgreSQL instance nhưng có dữ liệu và schema độc lập.

Database test không sử dụng chung dữ liệu với database development.

### 2.2. Docker Compose

PostgreSQL được triển khai thông qua Docker Compose:

```yaml
postgres:
  image: postgres:17-alpine
  container_name: hiveshelf-postgres
  restart: unless-stopped
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-hiveshelf}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-hiveshelf_dev}
    POSTGRES_DB: ${POSTGRES_DB:-hiveshelf}
    POSTGRES_DB_TEST: ${POSTGRES_DB_TEST:-hiveshelf_test}
  ports:
    - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./infra/postgres/init:/docker-entrypoint-initdb.d:ro
  healthcheck:
    test:
      - CMD-SHELL
      - pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}
    interval: 5s
    timeout: 5s
    retries: 10
```

### 2.3. Database initialization

Các script khởi tạo database được quản lý tại:

```text
infra/
└── postgres/
    └── init/
        └── 01-create-test-db.sh
```

Nội dung script:

```bash
#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -c "CREATE DATABASE \"${POSTGRES_DB_TEST}\" OWNER \"${POSTGRES_USER}\";"
```

Script được PostgreSQL Docker entrypoint thực thi khi khởi tạo data directory lần đầu.

Lưu ý: Các script trong `/docker-entrypoint-initdb.d/` chỉ tự động chạy khi PostgreSQL khởi tạo một data directory mới. Việc thay đổi script không tự động cập nhật database đã tồn tại.

### 2.4. Environment variables

Các biến môi trường được quản lý thông qua `.env`:

```env
POSTGRES_USER=hiveshelf
POSTGRES_PASSWORD=hiveshelf_dev
POSTGRES_DB=hiveshelf
POSTGRES_DB_TEST=hiveshelf_test
POSTGRES_PORT=5432
```

Các giá trị mặc định chỉ dành cho môi trường development.

Không sử dụng credentials mặc định trong production.

## 3. Alternatives Considered

### Option 1: PostgreSQL

Ưu điểm:

- Hỗ trợ đầy đủ relational database features.
- ACID transactions và referential integrity.
- Hỗ trợ JSONB.
- Có hệ sinh thái ORM và database tooling phong phú.
- Phù hợp với các hệ thống có nhiều quan hệ dữ liệu.
- Có thể triển khai dễ dàng bằng Docker.

Nhược điểm:

- Cần quản lý migration và database schema.
- Cần tối ưu indexing và query khi dữ liệu tăng trưởng.
- Cần có kế hoạch backup và recovery cho production.

**Decision:** Chọn PostgreSQL.

### Option 2: MySQL

Ưu điểm:

- Phổ biến và có hệ sinh thái lớn.
- Dễ triển khai và vận hành.
- Hiệu năng tốt với nhiều workload phổ biến.

Nhược điểm:

- Một số tính năng JSON và truy vấn nâng cao không linh hoạt bằng PostgreSQL.
- PostgreSQL phù hợp hơn với định hướng sử dụng relational data kết hợp JSONB của HiveShelf.

**Decision:** Không lựa chọn.

### Option 3: MongoDB

Ưu điểm:

- Linh hoạt với dữ liệu document.
- Phù hợp với dữ liệu có cấu trúc thay đổi thường xuyên.

Nhược điểm:

- HiveShelf có nhiều quan hệ dữ liệu và ràng buộc toàn vẹn.
- Cần xử lý thêm các quan hệ nghiệp vụ mà RDBMS hỗ trợ tự nhiên.

**Decision:** Không lựa chọn làm database chính.

## 4. Consequences

### Positive

- Có một nguồn dữ liệu quan hệ thống nhất cho toàn hệ thống.
- Đảm bảo transaction và tính toàn vẹn dữ liệu.
- Hỗ trợ các truy vấn phức tạp.
- Có thể sử dụng JSONB cho metadata và dữ liệu bán cấu trúc.
- Dễ dàng triển khai local và CI bằng Docker.
- Có database riêng cho automated testing.

### Negative

- Cần quản lý database migrations.
- Cần kiểm soát thay đổi schema giữa các môi trường.
- Cần thiết lập backup, restore và monitoring khi triển khai production.
- Cần đảm bảo database test được cô lập khỏi dữ liệu development.

## 5. Implementation

Các thành phần liên quan:

| Component               | Technology                    |
| ----------------------- | ----------------------------- |
| Database engine         | PostgreSQL                    |
| Major version           | 17                            |
| Docker image            | `postgres:17-alpine`          |
| Container orchestration | Docker Compose                |
| Persistent storage      | Docker named volume           |
| Main database           | `hiveshelf`                   |
| Test database           | `hiveshelf_test`              |
| Initialization          | PostgreSQL entrypoint scripts |

Database connection:

```text
Host: localhost
Port: 5432
Database: hiveshelf
Username: hiveshelf
```

Trong môi trường Docker nội bộ, các service kết nối thông qua hostname:

```text
postgres:5432
```

Database test được sử dụng cho automated tests và không được phép làm thay đổi dữ liệu của database development.

## 6. Validation

Các kiểm tra đã thực hiện ngày 2026-10-30:

| Check                             | Result               |
| --------------------------------- | -------------------- |
| Pull `postgres:17-alpine`         | Passed               |
| Start PostgreSQL container        | Passed               |
| PostgreSQL healthcheck            | Passed               |
| Persistent volume creation        | Passed               |
| Initialization script execution   | Pending verification |
| `hiveshelf` database              | Pending verification |
| `hiveshelf_test` database         | Pending verification |
| Automated test database isolation | Pending verification |

Các kiểm tra cần hoàn thành:

- Xác nhận database `hiveshelf_test` được tạo thành công.
- Kiểm tra quyền sở hữu database.
- Kiểm tra kết nối từ NestJS API.
- Kiểm tra automated tests sử dụng đúng database test.
- Kiểm tra migration workflow.

## 7. Future Considerations

Trong tương lai, HiveShelf cần xem xét:

- Database migration strategy.
- Automated backup và recovery.
- Connection pooling.
- Query optimization và indexing.
- Monitoring database performance.
- Read replicas khi nhu cầu đọc tăng cao.
- Database isolation trong CI và integration testing.

Mọi thay đổi major version PostgreSQL cần được đánh giá, kiểm thử và ghi nhận trong ADR mới nếu có ảnh hưởng đáng kể đến kiến trúc hoặc khả năng tương thích.
