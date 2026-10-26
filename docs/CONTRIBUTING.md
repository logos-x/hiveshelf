# Quy ước đóng góp

## Nhánh

- `main` luôn ở trạng thái build được; không commit trực tiếp.
- Đặt tên: `<loại>/us-<epic>-<số>-<mô-tả-ngắn>`, ví dụ `feat/us-1-2-dang-ky-tai-khoan`.
- Loại: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.

## Commit (Conventional Commits)

Định dạng: `<loại>(<phạm vi>): <mô tả ngắn, thể mệnh lệnh>`
Ví dụ: `feat(api): add contribution submit endpoint`
Hook commitlint sẽ từ chối commit sai định dạng.

## Pull Request

- Một PR giải quyết một user story hoặc một phần nhỏ của nó.
- Mô tả có dòng `Closes #<số issue>` để tự đóng issue khi merge.
- CI (lint, typecheck, build) phải xanh trước khi merge.

## Nguyên tắc WIP

- Chỉ làm một đầu việc tại một thời điểm; xong và merge rồi mới nhận việc mới.
- Giữ PR nhỏ, dễ review; việc dở dang thì để ở nhánh riêng, không trộn vào PR khác.
