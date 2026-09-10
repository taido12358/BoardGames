# Milestones

Rút trực tiếp từ `git log` (nhánh `master`). Ngày là ngày commit thật.

## 2026-06-29 — Khởi tạo platform + game đầu tiên (Vây Bắt)

- `first commit`, `First game`, `Reallocate folders, re-manage files` — dựng khung Platform/Games, stack ASP.NET Core + React + PostgreSQL/Redis/RabbitMQ/OpenSearch/MinIO, game đầu tiên **Vây Bắt trên đồ thị** (`Games/VayBat/`).

## 2026-06-30 — Ổn định schema bootstrap

- Loạt fix quanh việc bỏ EF `EnsureCreated()` chuyển sang raw SQL bootstrap idempotent trong `Program.cs` (lỗi `FormatException`, cột thiếu `GameKey`/`MoveJson`, cột thừa `PieceId`/`MaxRedTurns`, escape `{{}}` cho jsonb literal). Toàn bộ nguyên nhân + fix: [`../workflow/debugging.md`](../workflow/debugging.md).

## 2026-07-04 — Fix bug "không thể di chuyển quân"

- `cff9303` (PR #1, `7183150`): chẩn đoán và fix triệt để bug người chơi tưởng không đi được quân — nguyên nhân gốc là `playerName` trùng giữa các tab cùng trình duyệt (`localStorage`) khiến ghế thứ hai không được lấp; kèm fix Redis không được chặn broadcast, lỗi SignalR phải hiện lên UI. Verify bằng 2 client SignalR + Playwright/Chromium thật, không chỉ đọc code. Chi tiết: [`../workflow/debugging.md`](../workflow/debugging.md).

## 2026-07-05 — Đăng nhập không mật khẩu qua OTP email

- `bda11f2`: thêm luồng đăng nhập OTP 6 số gửi qua Gmail SMTP (MailKit), hash SHA-256 lưu DB, JWT trong cookie HttpOnly — giải quyết tận gốc lớp bug "trùng `playerName` giữa các tab" bằng cách chuyển định danh người chơi sang email/user id ổn định.
- `8aafaa1`: tổng quát hoá `GmailOtpSender` → `SmtpOtpSender`, đọc `EMAIL_PROVIDER`/`SMTP_*` từ env thay vì hard-code Gmail — cho phép đổi SMTP provider mà không sửa code.

## 2026-08-05 — Thiết lập hệ thống tài liệu `rules/`

- Gộp thư mục `rule/` (26 file phẳng) thành `rules/` phân theo coding/architecture/workflow/tasks/logs/history/references; viết lại `CLAUDE.md` thành file điều hướng thuần. Chi tiết: [`../logs/2026-08-05.md`](../logs/2026-08-05.md).

## 2026-08-05 — Game 002: BANG! (hidden-role, 4-8 người)

- Triển khai đầy đủ game thứ hai (`gameKey: "bang"`) theo yêu cầu trong `van-de.md`: 8 nhân vật Western với khả năng riêng, 15 loại bài, phân bố vai trò 4-8 người, khoảng cách bàn tròn, luật server-authoritative đầy đủ (Bang!/Trượt!/Đấu súng/Người da đỏ!/Súng Gatling/Hoảng loạn!/Cat Balou/vũ khí/Mustang/Thùng rượu), UI 100% tiếng Việt.
- Mở rộng Platform generic (không phá VayBat) để hỗ trợ game > 2 người và thông tin ẩn: ghế `SeatCount`/`SeatsJson`, nước đi hệ thống `side: "SYSTEM"` để chia state ban đầu, `IGameEngine.RedactStateForViewer` + broadcast SignalR riêng theo từng connection. Chi tiết quyết định: [`decisions.md`](./decisions.md).
- Tạo project test đầu tiên của repo (`backend/BoardGame.Api.Tests`, xUnit) — 85 test phủ luật Bang, bao gồm test bảo vệ thông tin ẩn bằng cách soi chuỗi JSON đã serialize.
- Verify sống: `dotnet build`/`dotnet test` xanh, `npm run build` xanh, `docker compose up --build` chạy được, 4 SignalR client thật join một phòng Bang → server tự chia bài → không client nào nhận được bài người khác → nước đi ngoài tầm bị từ chối đúng thiết kế.
- Theme nhân vật: Western gốc theo spec (không dùng asset 12-cung-hoàng-đạo đã có sẵn trong repo — quyết định của người dùng, xem [`../tasks/backlog.md`](../tasks/backlog.md)).

## 2026-08-05 — Thư viện trò chơi (thay `<select>` chọn game)

- Thay giao diện chọn game kiểu `<select>` (`platform/Lobby.tsx`, đã xoá) bằng Thư viện trò chơi dạng thẻ trực quan: `GameLibrary` (tìm kiếm + lọc + lưới thẻ) → `GameDetails` (hướng dẫn theo tab + tạo/vào phòng) — UI 100% tiếng Việt.
- Thêm `react-router-dom` v6 — dự án lần đầu có router thật (`/games`, `/games/:gameKey`); trước đó điều hướng chỉ bằng state. Chi tiết quyết định: [`decisions.md`](./decisions.md).
- Kiến trúc metadata/hướng dẫn generic theo `gameKey` (`platform/gameLibraryTypes.ts` + `platform/gameRegistry.ts` + `games/<ten>/{metadata,instructions}.ts`) — thêm game mới vào thư viện không phải sửa `GameLibrary`/`GameDetails`.
- Tái sử dụng nguyên vẹn API/hub hiện có: `GET /api/games/engines`, `GET /api/games`, `POST /api/games`, `joinRoom` qua SignalR — không thêm API mới.
- Verify sống qua Chrome (Docker Compose thật, không mock): tìm kiếm, bộ lọc, mở chi tiết game, tạo phòng Bang, vào lại phòng Vây Bắt cũ và chơi thật (board render đúng, không đổi hành vi ván đấu), nút back trình duyệt hoạt động đúng.

## 2026-08-05 — Vá lỗ hổng danh tính ghế + dọn phòng rác

Rà soát theo yêu cầu người dùng ("kiểm tra và đề xuất hướng làm về ghép phòng, vào phòng")
phát hiện lỗ hổng bảo mật thật: `GameHub` vẫn tin `playerName` client tự gửi để gán ghế dù
app đã có JWT — ai cũng "cướp" được ghế người khác. Đã vá triệt để:

- `GameHub`/`GamesController` thêm `[Authorize]`; `JoinRoom`/`MakeMove` bỏ hẳn tham số
  `playerName`, danh tính luôn lấy từ JWT (`Context.User`) qua `ClaimsPrincipalExtensions` mới.
- `GameRoom` thêm `RedPlayerId`/`WhitePlayerId`/`SeatUserIdsJson` (user id — xác thực) song
  song với các cột tên hiển thị cũ (không đổi UI). Chi tiết ADR: [`decisions.md`](./decisions.md).
- `StaleRoomCleanupService` (mới) dọn phòng `Waiting` bỏ dở > 30 phút; thêm
  `POST /api/games/{id}/cancel` cho chủ phòng tự huỷ phòng đang chờ.
- Verify sống: unauthenticated request bị từ chối 401, tạo/vào/huỷ phòng qua Chrome trên
  Docker Compose thật đều đúng, `dotnet test` 85/85 xanh, cleanup service tự chạy và dọn
  đúng 1 phòng rác thật ngay khi container khởi động lại.
- Đề xuất còn lại (chưa làm, xem [`../tasks/backlog.md`](../tasks/backlog.md)): ghép trận
  nhanh (quick match), danh sách phòng cập nhật realtime qua SignalR thay vì polling, xử lý
  mất kết nối/AFK giữa ván.

## 2026-09-05 — Rebuild toàn bộ cơ chế phòng/ghép trận

Theo yêu cầu người dùng ("web chưa hợp lý, muốn xây lại cơ chế từ đầu"), rebuild cơ chế
phòng/ghép trận ở cả backend lẫn frontend — hoàn thành nốt Giai đoạn 2 & 3 còn treo từ
2026-08-05 (ghép trận nhanh, sảnh realtime, xử lý mất kết nối/AFK) trong cùng một đợt với việc
hợp nhất cấu trúc code Platform và rebuild UI:

- Mô hình ghế thống nhất (`SeatSlot[]` cho mọi game, kể cả VayBat) thay 2 mô hình song song
  cũ; `IGameEngine` thêm `SideForSeat`/`OnRoomFull`/`OnSeatTimedOut`; `Platform/RoomService.cs`
  (mới) gom logic phòng/ghế/ván từng rải rác 4 chỗ giữa `GameHub`/`GamesController`.
  `GameRoom.OwnerUserId` tường minh thay suy luận "ghế 0 = chủ phòng". Chi tiết ADR (supersedes
  ADR ghế generic 2026-08-05): [`decisions.md`](./decisions.md).
- `RoomStatus` tách `Cancelled`/`Abandoned` khỏi `Finished` (5 giá trị). `SeatTimeoutService`
  (mới) xử lý mất kết nối/AFK: grace period 45s rồi giao engine tự quyết (`OnSeatTimedOut`) —
  VayBat xử thua ngay, Bang tự động end-turn/nhận hệ quả "không đáp trả" mặc định.
- `POST /api/games/quick-match` (khoá `FOR UPDATE SKIP LOCKED`); group SignalR `"lobby"` +
  event `"LobbyUpdated"` thay 2 vòng polling độc lập ở frontend.
- Frontend: route trong-ván thật `/games/:gameKey/room/:roomId` (F5 giữa ván không còn mất
  context, vào lại được phòng `Playing`); fix bug thật SignalR không re-`JoinRoom` sau khi tự
  reconnect; `RoomShell` dùng chung banner/leave-button giữa các game; UI tuỳ chọn tạo phòng
  chuyển ra khỏi `GameDetails.tsx` vào registry mỗi game.
- Verify: `dotnet build`/`dotnet test` 97/97 xanh (85 cũ + 12 mới), `tsc`/`vite build` xanh.
  **Chưa verify sống qua Docker Compose** — xem [`../tasks/current.md`](../tasks/current.md).
- **Sự cố**: agent thực thi lỡ chạy `DROP TABLE "GameRooms" CASCADE` trên database dev thật
  (không phải DB test cách ly) lúc thử migration SQL — mất 9 phòng dev thật, không backup nên
  không khôi phục được. Migration sau đó được verify đúng cách trên DB cách ly. Chi tiết:
  [`../logs/2026-09-05.md`](../logs/2026-09-05.md).

## 2026-09-10/11 — Chỉ thị `/goal` liên tục: hoàn thiện 2 game cũ, hạ tầng, Game 003 (Ô Ăn Quan)

Theo chỉ thị `/goal` tự động nhiều phiên liên tiếp ("tiếp tục nâng cấp web... tự suy nghĩ hướng
phát triển"), không hỏi lại người dùng cho từng bước:

- **Dọn dẹp + hoàn thiện Vây Bắt/Bang**: xoá demo "Hello World" khỏi backend (frontend đã xoá
  2026-08-05); `/health` kiểm tra thật DB/Redis/RabbitMQ; Bang có UI chọn bài để bỏ khi vượt giới
  hạn tay bài; chat trong phòng (Platform generic, dùng chung mọi game); nút "CHƠI LẠI" ở màn
  thắng/thua + banner mời qua SignalR. 17 unit test mới cho `VayBatRules`.
- **Trang quản trị `/admin`** (bản READ-ONLY đầu tiên) — role "Admin" đầu tiên trong hệ thống,
  gán qua JWT claim lúc đăng nhập theo `ADMIN_EMAILS` (env). ADR: [`decisions.md`](./decisions.md).
- **Hạ tầng CI/CD + chất lượng code**: `.github/workflows/ci.yml` (build+test backend, lint+build
  frontend, build thử Docker image) — verify chạy thật trên GitHub Actions, không chỉ local.
  ESLint cho frontend bắt được 1 bug Rules of Hooks thật trong `VayBatBoard.tsx` ngay lần chạy
  đầu. Test tích hợp Postgres thật (Testcontainers) cho `RoomService` — trả nợ kỹ thuật cũ nhất
  trong backlog, verify khoá `FOR UPDATE`/`SKIP LOCKED` bằng cuộc gọi đồng thời thật; tách
  `Data/SchemaBootstrapper.cs` khỏi `Program.cs` để test tái dùng đúng SQL thật (copy nguyên vẹn,
  verify byte-for-byte, smoke-test qua container Postgres tạm — vùng code này từng gây sự cố mất
  dữ liệu 2026-09-05 nên làm rất thận trọng).
- **Game 003: Ô Ăn Quan** (`gameKey: "oanquan"`) — trò chơi dân gian Việt Nam, 2 người, bàn 12 ô
  (10 ô dân + 2 ô quan). Luật đầy đủ: rải quân 2 chiều tuỳ chọn, bốc-tiếp-rải (relay) khi rơi vào
  ô đã có quân, ăn quân khi rơi vào ô trống mà ô kế có quân (kể cả ăn quan — phần thưởng lớn),
  rơi đúng ô quan luôn kết thúc lượt ngay, luật "hết vốn" (vay 5 quân từ điểm đã ăn), kết thúc
  ván khi ăn hết cả 2 ô quan. Luật dân gian có vài dị bản giữa các nguồn — đã tra cứu Wikipedia
  tiếng Anh/tiếng Việt trước khi chọn phiên bản "chỉ ăn 1 lần mỗi lượt, không ăn chuỗi" (nguồn
  chắc chắn nhất), ghi rõ trong code + backlog. 18 unit test luật thuần.
- Cân nhắc làm debug panel Bang (spec §51) trước Ô Ăn Quan nhưng quyết định KHÔNG tự làm vì spec
  yêu cầu bypass danh tính ghế ("switch giữa test player") — đúng lớp lỗ hổng đã vá 2026-08-05;
  để lại chờ xác nhận người dùng, ưu tiên việc an toàn hơn (Testcontainers, rồi game mới).
- Verify: `dotnet build`/`dotnet test` xanh (141/141 — 123 cũ + 18 mới), `npm run lint`/
  `tsc`/`vite build` xanh. **Chưa verify sống qua Chrome/Docker Compose** cho Ô Ăn Quan — theo
  đúng tiền lệ đã thống nhất trong đợt này (UI thuần không cần bật stack/OTP chỉ để xem), nhưng
  đây là game MỚI (rủi ro cao hơn một UI tweak nhỏ) nên cần ưu tiên live-test khi có dịp, xem
  [`../tasks/current.md`](../tasks/current.md).
