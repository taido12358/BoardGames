# Current Task

## Objective

**2026-09-10, chỉ thị mới (`/goal`, tự động, không hỏi lại người dùng)**: liên tục nâng cấp web —
thêm game/hoàn thiện game còn dang dở, xoá trang không cần thiết, code lại giao diện quản lý
game, tự commit/push lên `master` sau mỗi việc hoàn chỉnh. Chạy theo vòng lặp nhiều phiên nhỏ,
mỗi phiên: chọn 1 việc cụ thể trong backlog/known-issues → làm → build+test xanh → cập nhật
rules → commit+push. Không chờ xác nhận người dùng cho từng bước.

## Status

IN_PROGRESS (vòng lặp liên tục, không có điểm "DONE" cố định)

## Việc đã xong trong đợt này

1. **Xoá demo "Hello World" khỏi backend** — xem [`../tasks/backlog.md`](../tasks/backlog.md) mục
   "Dọn dẹp — ĐÃ LÀM (2026-09-10)". `dotnet build`/`dotnet test` (97/97) và `tsc`/`vite build` xanh.
2. **`/health` kiểm tra thật DB/Redis/RabbitMQ** thay vì trả tĩnh — cùng mục backlog trên.
3. **Bang: UI chọn bài để bỏ khi vượt giới hạn tay bài** (`BangBoard.tsx`/`ActionBar.tsx`/
   `HandFan.tsx`) — xem mục "Đơn giản hoá có chủ đích" trong backlog (nay đã gạch mục này).
   Chỉ verify bằng `tsc`/`vite build` xanh, CHƯA live-test qua Docker Compose (người dùng xác
   nhận không cần bật stack/OTP chỉ để xem UI thuần React này).

## Việc đang làm / tiếp theo (thứ tự ưu tiên gợi ý, không bắt buộc theo đúng thứ tự)

- `Games/VayBat/VayBatRules.cs` (luật thuần) chưa có unit test — xem backlog.
- Cân nhắc thêm game thứ ba (asset zodiac có sẵn ở `frontend/public/assets/games/zodiac/`,
  chưa gắn game nào) — quy mô lớn, chỉ làm khi các việc "hoàn thiện game cũ" đã ổn.
- "Code lại giao diện quản lý game": hiện repo **không có trang admin/quản lý** riêng (chỉ có
  Thư viện trò chơi `GameLibrary`/`GameDetails` phía người chơi) — cần làm rõ phạm vi (trang
  quản trị mới, hay cải tiến Thư viện trò chơi hiện có) trước khi code; xem
  [`../architecture/frontend.md`](../architecture/frontend.md) và hỏi lại nếu chỉ thị tiếp theo
  không đủ rõ.

## Việc dở dang từ đợt trước (2026-09-05, tạm gác — không chặn việc mới)

Rebuild cơ chế phòng/ghép trận đã xong code (commit `07155fc`, `15ae7b2`), nhưng **live test qua
Docker Compose bị dừng giữa chừng ở bước đăng nhập OTP** và **Docker Compose của phiên đó đã
tắt** (không còn chạy — kiểm tra lại bằng `docker compose ps` trước khi giả định gì về trạng thái
container). Việc còn thiếu, cần 2 danh tính Gmail khác nhau thật để test (không dùng lại được vì
`JoinRoomAsync` coi cùng `userId` là reconnect, không phải người chơi thứ 2):
- Ngắt mạng giữa ván (VayBat xử thua, Bang auto end-turn/auto-fail-respond)
- Ghép trận nhanh 2 người đồng thời, đua `Cancel`/`JoinRoom`
- Sảnh realtime 2 tab

Chỉ verify được các kịch bản này qua code review + test tự động đã có (không tự chạy live 2 danh
tính được vì không có tài khoản Gmail thứ 2) — chấp nhận giới hạn này, không phải việc chặn.

## Known Issues (từ đợt trước, chưa liên quan việc đang làm)

- **Mất dữ liệu dev thật (2026-09-05)**: một agent trước đã lỡ chạy `DROP TABLE "GameRooms"
  CASCADE` trên DB dev thật lúc thử migration — mất 9 phòng thật, không backup, không khôi phục
  được. `Users`/`AuthOtps` không ảnh hưởng. Bài học đã ghi ở `rules/logs/2026-09-05.md` và làm
  feedback hành vi model — KHÔNG chạy lệnh phá huỷ trên DB có khả năng chứa dữ liệu thật mà không
  hỏi trước.
- Migration SQL cho rebuild phòng/ghép trận đã verify RIÊNG trên DB cách ly (`migtest`), xác nhận
  đúng và idempotent — nhưng chưa từng chạy trên dữ liệu dev thật (dữ liệu đó mất trước khi chạy).

## Ghi chú môi trường

- Docker Compose **hiện KHÔNG chạy** (đã tắt từ cuối phiên trước) — nếu cần môi trường sống,
  phải `docker compose up` lại. Việc trong đợt này chỉ verify bằng `dotnet build`/`dotnet test`/
  `tsc`/`vite build` (không cần hạ tầng sống), trừ khi việc cụ thể cần test tích hợp thật.
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
