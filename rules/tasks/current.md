# Current Task

## Objective

Rebuild toàn bộ cơ chế phòng/ghép trận (Platform) theo yêu cầu người dùng ("web chưa hợp lý, xây lại cơ chế từ đầu"). Mô hình ghế thống nhất, `RoomService`, xử lý mất kết nối/AFK, ghép trận nhanh, sảnh realtime, route trong-ván, shared room-shell UI — xem [`../logs/2026-09-05.md`](../logs/2026-09-05.md) và [`../history/milestones.md`](../history/milestones.md)/[`../history/decisions.md`](../history/decisions.md). Code đã xong, `dotnet build`/`dotnet test` (97/97) và `tsc`/`vite build` đều xanh. Đã commit (`07155fc`, `15ae7b2`).

## Status

IN_PROGRESS — đang live test qua Docker Compose, **dừng giữa chừng ở bước đăng nhập OTP** (xem "Việc cần làm tiếp theo" bên dưới, và chi tiết đầy đủ trong log). Đọc kỹ mục "Ghi chú môi trường" trước khi resume — Docker Compose hiện đang **chạy sẵn**, không cần `up` lại.

## Việc cần làm tiếp theo (resume đúng thứ tự)

1. Đăng nhập bằng OTP cho `learncode12358@gmail.com` qua tab Chrome đang mở tại `http://localhost:5173` (hoặc mở lại nếu tab đã đóng) — bấm "Gửi lại mã", xin mã 6 số mới từ người dùng (mã cũ dùng lần trước bị báo hết hạn/không tồn tại).
2. Test single-identity (không cần 2 tài khoản): vào Thư viện trò chơi → tạo phòng VayBat → xác nhận route `/games/vaybat/room/:id` hoạt động đúng → F5 giữa lúc đang chờ đối thủ → phải vào lại đúng phòng đó (test `RoomRoute` mount logic).
3. Các kịch bản cần **2 danh tính khác nhau thật** (2 tab cùng 1 tài khoản KHÔNG test được — `JoinRoomAsync` coi cùng `userId` là reconnect vào đúng ghế cũ, không phải người chơi thứ 2): ngắt mạng giữa ván (VayBat xử thua, Bang auto end-turn/auto-fail-respond), ghép trận nhanh 2 người đồng thời, đua `Cancel`/`JoinRoom`, sảnh realtime 2 tab. **Cần hỏi người dùng có tài khoản Gmail thứ 2 để test hay chấp nhận bỏ qua** (chỉ verify bằng code review + test tự động đã có, không live test được).
4. Xong (hoặc xác nhận giới hạn) → cập nhật Status file này → DONE, viết tiếp log, hỏi người dùng có muốn `docker compose down` không.

## Known Issues

- **Mất dữ liệu dev thật**: trong lúc thử migration SQL, agent thực thi đã lỡ chạy `DROP TABLE "GameRooms" CASCADE` trên chính database dev đang chạy (không phải DB test cách ly) — mất toàn bộ 9 phòng thật đang có (bao gồm phòng của user `taidotien12358`), không có backup nên không khôi phục được. `Users`/`AuthOtps`/`Greetings` không bị ảnh hưởng; `GameMoves` (48 dòng) còn nguyên nhưng mồ côi (không có FK nên không tự mất theo). Bảng `GameRooms` đã được tạo lại rỗng theo schema mới, app boot bình thường. Chi tiết: log hôm nay.
- Migration SQL đã được verify RIÊNG trên DB cách ly (`migtest`) sau sự cố, xác nhận backfill đúng và idempotent — nhưng chưa từng chạy thành công trên dữ liệu dev thật (dữ liệu đó đã mất trước khi migration chạy lần đầu trên DB thật).
- **Regression thật phát hiện + sửa trong lúc live test** (commit `15ae7b2`): sửa sai trước đó đổi `'{{}}'::jsonb` → `'{}'::jsonb` trong `Program.cs` làm schema bootstrap lỗi `FormatException` ("Expected an ASCII digit") vì `ExecuteSqlRaw` parse chuỗi SQL như composite format string. Đã sửa lại đúng, verify `docker compose up` backend `healthy`.

## Ghi chú môi trường

- Stack Docker Compose hiện **đang CHẠY ĐẦY ĐỦ** (backend/frontend/postgres/redis/rabbitmq healthy, opensearch/minio up) — KHÔNG cần `docker compose up` lại, chỉ cần resume test. Kiểm tra bằng `docker compose ps`. `GameRooms` hiện rỗng (schema mới, đúng dự kiến sau sự cố mất dữ liệu).
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
