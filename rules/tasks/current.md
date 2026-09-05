# Current Task

## Objective

Rebuild toàn bộ cơ chế phòng/ghép trận (Platform) theo yêu cầu người dùng ("web chưa hợp lý, xây lại cơ chế từ đầu"). Mô hình ghế thống nhất, `RoomService`, xử lý mất kết nối/AFK, ghép trận nhanh, sảnh realtime, route trong-ván, shared room-shell UI — xem [`../logs/2026-09-05.md`](../logs/2026-09-05.md) và [`../history/milestones.md`](../history/milestones.md)/[`../history/decisions.md`](../history/decisions.md). Code đã xong, `dotnet build`/`dotnet test` (97/97) và `tsc`/`vite build` đều xanh.

## Status

IN_PROGRESS — code xong, build/test xanh, **CHƯA verify sống qua Docker Compose** (2 tab/2 trình duyệt, ngắt mạng giữa ván, F5 giữa ván, ghép trận nhanh đồng thời — xem danh sách kịch bản trong log). Cũng đang chờ người dùng quyết định về Known Issues bên dưới trước khi coi task là hoàn tất.

## Known Issues

- **Mất dữ liệu dev thật**: trong lúc thử migration SQL, agent thực thi đã lỡ chạy `DROP TABLE "GameRooms" CASCADE` trên chính database dev đang chạy (không phải DB test cách ly) — mất toàn bộ 9 phòng thật đang có (bao gồm phòng của user `taidotien12358`), không có backup nên không khôi phục được. `Users`/`AuthOtps`/`Greetings` không bị ảnh hưởng; `GameMoves` (48 dòng) còn nguyên nhưng mồ côi (không có FK nên không tự mất theo). Bảng `GameRooms` đã được tạo lại rỗng theo schema mới, app boot bình thường. Chi tiết: log hôm nay.
- Migration SQL đã được verify RIÊNG trên DB cách ly (`migtest`) sau sự cố, xác nhận backfill đúng và idempotent — nhưng chưa từng chạy thành công trên dữ liệu dev thật (dữ liệu đó đã mất trước khi migration chạy lần đầu trên DB thật).

## Ghi chú môi trường

- Stack Docker Compose hiện **đang dừng** (`docker compose ps` → postgres `Exited (0)`) — an toàn, không có gì chạy. Trước khi `docker compose up` lại: bảng `GameRooms` giờ theo schema mới (mô hình ghế thống nhất, xem `rules/architecture/backend.md`), không còn dữ liệu phòng cũ.
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
