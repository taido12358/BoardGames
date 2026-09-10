# Important Files

Mọi đường dẫn dưới đây đã xác nhận tồn tại trong repo (cập nhật 2026-09-05, rebuild cơ chế phòng/ghép trận). Nếu di chuyển/đổi tên file, cập nhật file này cùng PR.

## Application Entry Points

- Backend: `backend/BoardGame.Api/Program.cs` — DI, đăng ký engine từng game, schema bootstrap raw SQL, middleware pipeline.
- Frontend: `frontend/src/main.tsx` → `frontend/src/App.tsx`.

## Configuration

- Environment: `.env` (gitignored, local) / `.env.example` (committed, mẫu) — nạp bởi `backend/BoardGame.Api/Services/DotEnv.cs` khi chạy ngoài Docker. Có `ADMIN_EMAILS` (mới 2026-09-10 — CSV email được cấp role "Admin" lúc đăng nhập, xem `AdminController.cs`).
- Backend config: `backend/BoardGame.Api/appsettings.json`, `appsettings.Development.json`.
- Docker: `docker-compose.yml` (root), `backend/BoardGame.Api/Dockerfile`, `frontend/Dockerfile`, `.dockerignore` ở mỗi phía.
- CI: `.github/workflows/ci.yml` (mới 2026-09-11) — build+test backend, lint+build frontend trên mọi push/PR nhắm `master`, build thử (không push) 2 Docker image khi push thẳng `master`.
- Kubernetes: `k8s/*.yaml` (namespace, config, mỗi service hạ tầng, backend, frontend, ingress).
- Frontend build: `frontend/vite.config.ts`, `frontend/tailwind.config.js`, `frontend/tsconfig.json`, `frontend/eslint.config.js` (mới 2026-09-11 — `npm run lint`, wire vào CI).

## Database

- Context: `backend/BoardGame.Api/Data/AppDbContext.cs`.
- Schema: **không có file migration** — toàn bộ `CREATE TABLE`/`ALTER TABLE` nằm trong block raw SQL của `Program.cs` (xem [`../architecture/database.md`](../architecture/database.md)).
- Entity generic: `backend/BoardGame.Api/Platform/Models/GameRoom.cs`, `GameMove.cs`, `GameRecord.cs`.
- Entity auth: `backend/BoardGame.Api/Platform/Auth/AppUser.cs`, `AuthOtp.cs`.

## Platform (generic, dùng chung mọi game)

- `backend/BoardGame.Api/Platform/Abstractions/IGameEngine.cs` — contract mọi game phải implement (nay có thêm `SideForSeat`/`OnRoomFull`/`OnSeatTimedOut`, default interface method).
- `backend/BoardGame.Api/Platform/Abstractions/GameEngineRegistry.cs`.
- `backend/BoardGame.Api/Platform/RoomService.cs` (mới, 2026-09-05) — toàn bộ logic phòng/ghế/ván (join/create/cancel/quick-match/timeout), gom về một chỗ thay cho việc `GameHub`/`GamesController` mỗi nơi tự rẽ nhánh riêng trước đây. `CreateRematchAsync` (mới 2026-09-10) — tạo phòng mới cùng `gameKey`/`seatCount` cho người TỪNG chơi ván `Finished`, không tự mời lại đối thủ (đó là việc của `GameHub.AnnounceRematch`).
- `backend/BoardGame.Api/Platform/GameHub.cs` — SignalR hub (`/hubs/game`), giờ chỉ là lớp transport gọi `RoomService`. `SendChatMessage` (mới 2026-09-10) — chat GENERIC trong phòng, chỉ broadcast qua nhóm SignalR, KHÔNG lưu DB (mất khi phòng đóng/tải lại trang); player lẫn spectator đều gọi được, chỉ cần đã `JoinRoom` đúng phòng. `AnnounceRematch` (mới 2026-09-10) — rebroadcast cho người khác còn ở phòng cũ biết có phòng chơi lại, không tự tạo phòng.
- `backend/BoardGame.Api/Platform/GamesController.cs` — REST lobby (`/api/games`, có thêm `POST /quick-match`, `POST /{id}/rematch` mới 2026-09-10), cũng chỉ gọi `RoomService`.
- `backend/BoardGame.Api/Platform/RoomDto.cs`, `GameJson.cs`, `GameMapper` (trong `RoomDto.cs`) — tính `MySide`/`IsMine` theo caller.
- `backend/BoardGame.Api/Platform/Models/SeatSlot.cs` (mới) — `SeatSlot` record + `SeatCodec` (mã hoá/giải mã `GameRoom.SeatsJson`).
- `backend/BoardGame.Api/Platform/Models/RoomStatus.cs` (mới) — hằng số 5 trạng thái + `IsOpen`.
- `backend/BoardGame.Api/Platform/Auth/` — `AuthController.cs`, `TokenService.cs` (JWT), `ClaimsPrincipalExtensions.cs` (đọc user id/display name/email từ `ClaimsPrincipal` — dùng ở `GameHub`/`GamesController`/`RoomService`/`AdminController` để xác thực ghế), OTP.
- `backend/BoardGame.Api/Platform/AdminController.cs` (mới, 2026-09-10) — `/api/admin/*` READ-ONLY: `check` (bất kỳ ai đăng nhập gọi được, trả `isAdmin` — frontend dùng để ẩn/hiện mục "Quản trị"), `rooms`/`stats` (`[Authorize(Roles = "Admin")]`, 403 tự động nếu không phải admin). Role "Admin" gán vào **claim JWT lúc đăng nhập** (`TokenService.CreateToken`, không phải kiểm tra config mỗi request) nếu email nằm trong env `ADMIN_EMAILS` (CSV, rỗng mặc định — xem `.env.example`) — đúng pattern ở `rules/coding/security.md` mục "Phân quyền" (role qua claim + `[Authorize(Roles=...)]`, không hard-code danh sách trong logic từng action). Đánh đổi: đổi `ADMIN_EMAILS` chỉ có hiệu lực từ lần đăng nhập MỚI. Không dùng cột DB mới cho quyền. Chủ ý không có thao tác phá huỷ (huỷ/xoá phòng) — xem chú thích đầu file.

## Games

- `backend/BoardGame.Api/Games/VayBat/` — game đầu tiên (2 người): `VayBatTypes.cs` (Map/State/Move), `VayBatRules.cs` (luật thuần), `VayBatEngine.cs` (adapter `IGameEngine`, override `SideForSeat`/`OnSeatTimedOut`).
- `backend/BoardGame.Api/Games/Bang/` — game thứ hai (4-8 người, hidden-role): `BangTypes.cs` (state/player/move/projection riêng-cho-người-xem), `BangCards.cs` (catalog + bộ bài), `BangCharacters.cs`, `BangRoles.cs` (bảng phân bố vai trò), `BangDeck.cs` (rút/xáo), `BangRules.cs` (luật thuần — engine lớn nhất trong repo, đọc comment đầu file trước khi sửa), `BangEngine.cs` (adapter `IGameEngine`, override `OnRoomFull`/`OnSeatTimedOut` + `RedactStateForViewer`).

## Services (hạ tầng)

- `backend/BoardGame.Api/Services/RedisCacheService.cs`
- `backend/BoardGame.Api/Services/RabbitMqPublisher.cs`
- `backend/BoardGame.Api/Services/OpenSearchService.cs`
- `backend/BoardGame.Api/Services/MinioStorageService.cs`
- `backend/BoardGame.Api/Services/SmtpOtpSender.cs` — gửi OTP đăng nhập qua SMTP (MailKit).
- `backend/BoardGame.Api/Services/DotEnv.cs` — nạp `.env` khi chạy `dotnet run` ngoài Docker.
- `backend/BoardGame.Api/Services/StaleRoomCleanupService.cs` — `BackgroundService` dọn phòng `Waiting` bỏ dở quá 30 phút (đánh dấu `Abandoned`, trước 2026-09-05 là `Finished`).
- `backend/BoardGame.Api/Services/SeatTimeoutService.cs` (mới, 2026-09-05) — `BackgroundService` xử lý mất kết nối/AFK giữa ván (gọi `IGameEngine.OnSeatTimedOut` sau grace period).

## Frontend

- Platform (dùng chung mọi game): `frontend/src/platform/` — `authStore.ts`, `gameStore.ts` (có `chatMessages`/`rematchInvite`, mới 2026-09-10), `useGameRoomHub.ts`, `useLobbyHub.ts` (mới), `GameRoomHubContext.tsx`, `RoomShell.tsx` (banner/leave button dùng chung giữa các game — có thêm `RematchButton`/`RematchInviteBanner`, mới 2026-09-10), `ChatPanel.tsx` (mới 2026-09-10 — chat GENERIC, mount 1 lần ở `RoomRoute.tsx` cho mọi game), `ScrollToTop.tsx`, `types.ts`, `gameLibraryTypes.ts`, `gameRegistry.ts`.
- Điều hướng theo game: `frontend/src/components/GameView.tsx` (luôn render `<Routes>`) + `RoomRoute.tsx` (mới, route `/games/:gameKey/room/:roomId` — route trong-ván thật, thay cho rẽ nhánh theo `gameStore.room` trước đây; render board + `ChatPanel` cùng lúc).
- Thư viện trò chơi: `frontend/src/components/{GameLibrary,GameCard,GameDetails,GameInstructions}.tsx`.
- Quản trị (mới, 2026-09-10): `frontend/src/components/AdminPage.tsx` (route `/admin`, xem `GameView.tsx`) + `frontend/src/platform/adminStore.ts`. Chỉ hiện link "Quản trị" trong `App.tsx` khi `adminStore.isAdmin` — server (`AdminController`) mới là lớp chặn thật.
- Game VayBat: `frontend/src/games/vaybat/` — `types.ts`, `metadata.ts` (thẻ + hướng dẫn), `CreateOptions.tsx` (mới — UI tuỳ chọn tạo phòng, tách khỏi `GameDetails.tsx`), `VayBatBoard.tsx`.
- Game Bang: `frontend/src/games/bang/` — `types.ts`, `metadata.ts` (thẻ + hướng dẫn), `CreateOptions.tsx` (mới), `BangBoard.tsx`, `components/`.
- Demo "Hello World" (frontend + backend) đã xoá hoàn toàn (2026-09-10) — trước đó frontend đã xoá 2026-08-05, backend giữ lại vì "chưa ai yêu cầu"; nay dọn nốt theo yêu cầu tổng quát "xoá trang không cần thiết": `Controllers/HelloController.cs`, `Models/Greeting.cs`, bảng `Greetings` (ngừng tạo mới trong schema bootstrap, không DROP bảng cũ), hub method `GameHub.SendHello`, endpoint `/api/hello` không còn. `RedisCacheService`/`RabbitMqPublisher`/`MinioStorageService`/`OpenSearchService` vẫn còn — chỉ bỏ phần API/method/const dành riêng cho demo, phần dùng thật cho game (cache state, `PublishGameEvent`, `SaveReplayAsync`, `IndexGameAsync`/`SearchGamesAsync`) giữ nguyên.
- Asset tĩnh game chưa có code: `frontend/public/assets/games/zodiac/` — xem [`../tasks/backlog.md`](../tasks/backlog.md).

## Tests

- `backend/BoardGame.Api.Tests/` (thêm 2026-08-05) — xUnit, 118 test. `Bang/*.cs`: roles, characters, deck, distance, luồng chơi, bảo vệ thông tin ẩn, hợp đồng JSON enum, `BangSeatTimeoutTests.cs` (mới 2026-09-05 — `OnSeatTimedOut`). `VayBat/VayBatEngineTests.cs` (2026-09-05 — `SideForSeat`/`OnSeatTimedOut`, lớp adapter) + `VayBat/VayBatRulesTests.cs` (2026-09-10, 17 test — luật thuần: kề/trống, nước đi hợp lệ, áp nước đi, thắng/thua, khởi tạo state). `Platform/Auth/TokenServiceTests.cs` (mới 2026-09-10, 4 test — round-trip JWT thật cho claim role "Admin", xem ADR trong `../history/decisions.md`). `Platform/RoomStatusTests.cs` (mới). Chưa có test tích hợp chạm Postgres thật cho `RoomService`/khoá `FOR UPDATE`/`SKIP LOCKED` — nợ kỹ thuật, ghi trong [`../tasks/backlog.md`](../tasks/backlog.md).
- Chiến lược test đầy đủ (mong muốn cho mọi game): [`../coding/testing.md`](../coding/testing.md).

## Tài liệu

- `CLAUDE.md` (root) — điều hướng cho AI assistant, trỏ vào `rules/`.
- `rules/` — kho tri thức chi tiết (thư mục chứa file này).
- `README.md` (root) — giới thiệu dự án cho người mới, hướng dẫn chạy nhanh.
- `van-de.md` (root, **chưa commit**) — spec draft cho game thứ hai, xem [`../tasks/backlog.md`](../tasks/backlog.md).
