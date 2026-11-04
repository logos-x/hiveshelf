# ADR-001: Modular monolith và monorepo với pnpm, Turborepo

- **Trạng thái:** Accepted
- **Ngày:** 2026-11-04

## Bối cảnh

HiveShelf do một developer phát triển, cần thay đổi API, giao diện và contract
cùng nhau với chi phí vận hành thấp. Repo đã có `apps/api` (NestJS), `apps/web`
(Next.js), `packages/shared` và `packages/config`; các module Prisma, storage,
email nằm trong cùng ứng dụng API. Các module nghiệp vụ Phase 1 chưa hoàn thiện.

## Quyết định

Tổ chức backend theo hướng **modular monolith**: một ứng dụng NestJS, chia module
theo trách nhiệm, giao tiếp trong tiến trình. Web là ứng dụng riêng; lựa chọn này
không yêu cầu web và API chạy chung tiến trình hoặc deploy cùng nhau.

Giữ một monorepo dùng pnpm workspaces, dependency nội bộ `workspace:*` và
Turborepo để điều phối build/dev/check. Module nghiệp vụ nên cung cấp giao diện
rõ ràng, hạn chế truy cập chi tiết nội bộ của nhau; đây là quy ước kiến trúc,
chưa có kiểm tra tự động đầy đủ cho ranh giới module.

## Hệ quả

- **Tốt:** Thay đổi API/web/shared trong cùng PR; dùng chung tooling; giảm công
  sức version package nội bộ và vận hành hệ thống phân tán.
- **Đánh đổi:** Backend cùng đơn vị triển khai, không scale từng module độc lập;
  phụ thuộc chéo dễ tăng nếu không giữ ranh giới. Task graph/cache của Turbo
  cũng cần bảo trì khi thêm package hoặc biến môi trường build.

## Phương án đã cân nhắc

- **Microservices:** Chưa có nhu cầu scale hay phát hành từng miền độc lập đủ rõ
  để bù chi phí network, contract liên dịch vụ, transaction phân tán và giám sát.
- **Polyrepo:** Tách quyền sở hữu tốt khi có nhiều nhóm, nhưng hiện tăng chi phí
  đồng bộ contract, tooling và thay đổi xuyên API/web.
- **Monolith không chia module:** Khởi đầu đơn giản nhưng khó giữ ranh giới
  nghiệp vụ khi mở rộng; chọn module ngay trong một ứng dụng.

## Khi nào xem xét lại

Đánh giá tách service khi số liệu tải, yêu cầu cô lập lỗi hoặc nhu cầu phát hành
độc lập chứng minh lợi ích; đánh giá polyrepo khi quyền sở hữu và vòng đời nhóm
thay đổi. Không tách chỉ vì số lượng file tăng.

Bằng chứng: [workspace](../../pnpm-workspace.yaml), [task graph](../../turbo.json),
[AppModule](../../apps/api/src/app.module.ts), [shared](003-shared-package-bundling.md).
