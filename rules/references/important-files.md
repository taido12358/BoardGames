# Important Files

Mọi đường dẫn dưới đây đã xác nhận tồn tại trong repo (2026-08-05). Nếu di chuyển/đổi tên file, cập nhật file này cùng PR.

## Application Entry Points

- Backend: `backend/BoardGame.Api/Program.cs` — DI, đăng ký engine từng game, schema bootstrap raw SQL, middleware pipeline.
- Frontend: `frontend/src/main.tsx` → `frontend/src/App.tsx`.

## Configuration

- Environment: `.env` (gitignored, local) / `.env.example` (committed, mẫu) — nạp bởi `backend/BoardGame.Api/Services/DotEnv.cs` khi chạy ngoài Docker.
- Backend config: `backend/BoardGame.Api/appsettings.json`, `appsettings.Development.json`.
- Docker: `docker-compose.yml` (root), `backend/BoardGame.Api/Dockerfile`, `frontend/Dockerfile`, `.dockerignore` ở mỗi phía.
- Kubernetes: `k8s/*.yaml` (namespace, config, mỗi service hạ tầng, backend, frontend, ingress).
- Frontend build: `frontend/vite.config.ts`, `frontend/tailwind.config.js`, `frontend/tsconfig.json`.

## Database

- Context: `backend/BoardGame.Api/Data/AppDbContext.cs`.
- Schema: **không có file migration** — toàn bộ `CREATE TABLE`/`ALTER TABLE` nằm trong block raw SQL của `Program.cs` (xem [`../architecture/database.md`](../architecture/database.md)).
- Entity generic: `backend/BoardGame.Api/Platform/Models/GameRoom.cs`, `GameMove.cs`, `GameRecord.cs`.
- Entity auth: `backend/BoardGame.Api/Platform/Auth/AppUser.cs`, `AuthOtp.cs`.
- Entity demo: `backend/BoardGame.Api/Models/Greeting.cs`.

## Platform (generic, dùng chung mọi game)

- `backend/BoardGame.Api/Platform/Abstractions/IGameEngine.cs` — contract mọi game phải implement.
- `backend/BoardGame.Api/Platform/Abstractions/GameEngineRegistry.cs`.
- `backend/BoardGame.Api/Platform/GameHub.cs` — SignalR hub (`/hubs/game`).
- `backend/BoardGame.Api/Platform/GamesController.cs` — REST lobby (`/api/games`).
- `backend/BoardGame.Api/Platform/RoomDto.cs`, `GameJson.cs`.
- `backend/BoardGame.Api/Platform/Auth/` — `AuthController.cs`, `TokenService.cs` (JWT), `ClaimsPrincipalExtensions.cs` (đọc user id/display name từ `ClaimsPrincipal` — dùng ở `GameHub`/`GamesController` để xác thực ghế), OTP.

## Games

- `backend/BoardGame.Api/Games/VayBat/` — game đầu tiên (2 người): `VayBatTypes.cs` (Map/State/Move), `VayBatRules.cs` (luật thuần), `VayBatEngine.cs` (adapter `IGameEngine`).
- `backend/BoardGame.Api/Games/Bang/` — game thứ hai (4-8 người, hidden-role): `BangTypes.cs` (state/player/move/projection riêng-cho-người-xem), `BangCards.cs` (catalog + bộ bài), `BangCharacters.cs`, `BangRoles.cs` (bảng phân bố vai trò), `BangDeck.cs` (rút/xáo), `BangRules.cs` (luật thuần — engine lớn nhất trong repo, đọc comment đầu file trước khi sửa), `BangEngine.cs` (adapter `IGameEngine` + xử lý nước đi hệ thống "SYSTEM"/chia bài + `RedactStateForViewer`).

## Services (hạ tầng)

- `backend/BoardGame.Api/Services/RedisCacheService.cs`
- `backend/BoardGame.Api/Services/RabbitMqPublisher.cs`
- `backend/BoardGame.Api/Services/OpenSearchService.cs`
- `backend/BoardGame.Api/Services/MinioStorageService.cs`
- `backend/BoardGame.Api/Services/SmtpOtpSender.cs` — gửi OTP đăng nhập qua SMTP (MailKit).
- `backend/BoardGame.Api/Services/DotEnv.cs` — nạp `.env` khi chạy `dotnet run` ngoài Docker.
- `backend/BoardGame.Api/Services/StaleRoomCleanupService.cs` — `BackgroundService` dọn phòng `Waiting` bỏ dở quá 30 phút (đánh dấu `Finished`).

## Frontend

- Platform (dùng chung mọi game): `frontend/src/platform/` — `authStore.ts`, `gameStore.ts`, `LoginPage.tsx`, `useGameRoomHub.ts`, `GameRoomHubContext.tsx`, `ScrollToTop.tsx`, `types.ts`, `gameLibraryTypes.ts`, `gameRegistry.ts`. (`Lobby.tsx` — `<select>` chọn game cũ — đã xoá 2026-08-05, thay bằng Thư viện trò chơi.)
- Điều hướng theo game: `frontend/src/components/GameView.tsx` — có `room` thì render board theo `gameKey`; chưa có thì render `<Routes>` (`GameLibrary`/`GameDetails`).
- Thư viện trò chơi: `frontend/src/components/{GameLibrary,GameCard,GameDetails,GameInstructions}.tsx`.
- Game VayBat: `frontend/src/games/vaybat/` — `types.ts`, `metadata.ts` (thẻ + hướng dẫn), `VayBatBoard.tsx`.
- Game Bang: `frontend/src/games/bang/` — `types.ts`, `metadata.ts` (thẻ + hướng dẫn), `BangBoard.tsx`, `components/`.
- Trang demo "Hello World" phía frontend đã xoá (2026-08-05, theo yêu cầu người dùng) — `hooks/useGameHub.ts`, `store/helloStore.ts` không còn trong repo. Backend demo (`Controllers/HelloController.cs`, model `Greeting`, bảng `Greetings`, hub method `GameHub.SendHello`, endpoint `/api/hello`) **vẫn còn nguyên** — chỉ trang UI bị xoá, chưa ai yêu cầu dọn phần backend.
- Asset tĩnh game chưa có code: `frontend/public/assets/games/zodiac/` — xem [`../tasks/backlog.md`](../tasks/backlog.md).

## Tests

- `backend/BoardGame.Api.Tests/` (thêm 2026-08-05) — xUnit, hiện chỉ phủ `Games/Bang/` (`Bang/*.cs`: roles, characters, deck, distance, luồng chơi, bảo vệ thông tin ẩn, hợp đồng JSON enum). `Games/VayBat/` chưa có test — nợ kỹ thuật ghi trong [`../tasks/backlog.md`](../tasks/backlog.md).
- Chiến lược test đầy đủ (mong muốn cho mọi game): [`../coding/testing.md`](../coding/testing.md).

## Tài liệu

- `CLAUDE.md` (root) — điều hướng cho AI assistant, trỏ vào `rules/`.
- `rules/` — kho tri thức chi tiết (thư mục chứa file này).
- `README.md` (root) — giới thiệu dự án cho người mới, hướng dẫn chạy nhanh.
- `van-de.md` (root, **chưa commit**) — spec draft cho game thứ hai, xem [`../tasks/backlog.md`](../tasks/backlog.md).
