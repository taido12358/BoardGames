# CLAUDE.md

## Project

BoardGame — nền tảng boardgame full-stack dùng chung (ASP.NET Core 8 + PostgreSQL/Redis/RabbitMQ/OpenSearch/MinIO + SignalR, frontend Vite/React/TypeScript). Mỗi boardgame là một `IGameEngine` cắm vào Platform generic; game đầu tiên là **Vây Bắt** (`Games/VayBat/`).

## IMPORTANT

Thư mục `rules/` là **nguồn sự thật chính** của dự án. Trước khi sửa code, PHẢI kiểm tra rule liên quan trong `rules/`.

Không đưa tài liệu dài, log, lịch sử, hay coding standard chi tiết vào file này — mọi thứ thuộc về `rules/`.

`rules/` thay thế thư mục `rule/` (số ít) cũ — `rule/` đã bị xoá, không dùng lại tên đó.

## Rules

Thư mục rules chính: `./rules/`

Index: `./rules/README.md`

## Coding Rules

`./rules/coding/`

## Architecture

`./rules/architecture/`

## Workflow

`./rules/workflow/`

## Current Tasks

`./rules/tasks/current.md`

## Project History

`./rules/history/`

## Logs

`./rules/logs/`

## References

`./rules/references/`

## Mandatory Behavior

Trước khi làm một task:

1. Đọc `rules/README.md`
2. Đọc `rules/tasks/current.md`
3. Đọc coding rule liên quan
4. Đọc architecture rule liên quan
5. Xem code hiện có
6. Implement thay đổi nhỏ nhất phù hợp
7. Test
8. Cập nhật trạng thái task
9. Viết development log (`rules/logs/YYYY-MM-DD.md`)
10. Cập nhật `rules/history/` chỉ khi có quyết định kiến trúc/kỹ thuật đáng nhớ

Không tự suy diễn quy tắc dự án từ trí nhớ khi thông tin đã có trong `rules/`. Không nạp toàn bộ `rules/` cho mọi task — dùng targeted loading theo bảng trong `rules/README.md`.
