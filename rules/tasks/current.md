# Current Task

## Objective

Không có task tính năng nào đang dang dở. Task gần nhất — vá lỗ hổng bảo mật danh tính ghế (`GameHub` tin `playerName` client gửi) + dọn phòng rác + huỷ phòng — đã hoàn tất, xem [`../logs/2026-08-05.md`](../logs/2026-08-05.md) (phiên 5) và [`../history/milestones.md`](../history/milestones.md).

## Status

NONE — sẵn sàng nhận task tiếp theo. Xem [`backlog.md`](./backlog.md), đặc biệt mục "Ghép phòng / vào phòng — Giai đoạn 2 & 3" (ghép trận nhanh, danh sách phòng realtime, xử lý mất kết nối/AFK) — đề xuất đã có, chưa ai yêu cầu làm.

## Ghi chú môi trường

- Stack Docker Compose đang **chạy** trên máy dev, đã rebuild với bản fix danh tính ghế (`docker compose ps` để xem, `docker compose down` để tắt).
- Schema DB đã có cột mới `RedPlayerId`/`WhitePlayerId`/`SeatUserIdsJson` — phòng tạo TRƯỚC bản fix (nếu còn) không có dữ liệu này, xem lưu ý trong log phiên 5.
- `docker-compose.yml`, `backend/BoardGame.Api/appsettings.Development.json` có thể vẫn còn thay đổi cục bộ chưa commit (port remap 5433/6380) — xem [`../workflow/development.md`](../workflow/development.md#xung-đột-port-cục-bộ-ghi-chú-không-phải-chuẩn-dự-án).
- `van-de.md` (spec Bang, root) — trạng thái commit tuỳ người dùng.

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
