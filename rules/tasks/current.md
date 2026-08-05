# Current Task

## Objective

Không có task tính năng nào đang dang dở. Task gần nhất — game thứ hai **BANG!** (hidden-role, 4-8 người) — đã hoàn tất, xem [`../logs/2026-08-05.md`](../logs/2026-08-05.md) (phiên 2) và [`../history/milestones.md`](../history/milestones.md).

## Status

NONE — sẵn sàng nhận task tiếp theo. Xem [`backlog.md`](./backlog.md) cho việc chưa làm (đơn giản hoá có chủ đích trong Bang chưa hoàn thiện, nợ kỹ thuật khác).

## Ghi chú môi trường

- Stack Docker Compose đang **chạy** trên máy dev sau khi verify (`docker compose ps` để xem, `docker compose down` để tắt khi không cần nữa) — cổng Postgres/Redis theo remap cục bộ 5433/6380 (xem dưới).
- `docker-compose.yml`, `backend/BoardGame.Api/appsettings.Development.json` vẫn có thay đổi cục bộ chưa commit — map Postgres/Redis sang port `5433`/`6380` để tránh xung đột với project khác (`taskflow`) trên máy dev này. Xem [`../workflow/development.md`](../workflow/development.md#xung-đột-port-cục-bộ-ghi-chú-không-phải-chuẩn-dự-án). Quyết định giữ hay commit thay đổi này thuộc về người dùng.
- `van-de.md` (spec Bang, root) vẫn **chưa commit** — giữ nguyên làm tài liệu tham chiếu, không tự ý xoá/commit thay người dùng.

## Template cho task tiếp theo

```markdown
## Objective
[Việc cần làm]

## Status
IN_PROGRESS

## Requirements
- ...

## Files Involved
- ...

## Implementation Plan
1. ...

## Completed
- ...

## Remaining
- ...

## Known Issues
- ...

## Tests
- [ ] ...
```
