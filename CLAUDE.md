# BoardGame Project

## Tổng quan kiến trúc

Full-stack boardgame platform với backend .NET 8 + frontend (Vite/React). Mọi boardgame dùng chung một platform generic; mỗi game là một `IGameEngine` riêng.

**Stack:**
- Backend: ASP.NET Core 8, EF Core + PostgreSQL (JSONB), SignalR (realtime), Redis (cache state), RabbitMQ (event queue), OpenSearch (lịch sử tìm kiếm), MinIO (file storage)
- Frontend: Vite + React, port 5173
- Infra: Docker Compose (`docker-compose.yml` ở root)

**Ports:**
- Backend API: `http://localhost:5000`
- Frontend: `http://localhost:5173`
- PostgreSQL: 5432, Redis: 6379, RabbitMQ: 5672/15672, OpenSearch: 9200, MinIO: 9000/9001

## Cấu trúc thư mục

```
backend/BoardGame.Api/
  Data/AppDbContext.cs          — EF Core context (PostgreSQL)
  Platform/
    Models/GameRoom.cs          — Entity phòng chơi (generic)
    Models/GameMove.cs          — Entity nước đi
    Models/GameRecord.cs        — OpenSearch record
    GamesController.cs          — REST API lobby
    GameHub.cs                  — SignalR hub realtime
    RoomDto.cs / GameJson.cs    — DTO & serialization helpers
    Abstractions/IGameEngine.cs — Interface mỗi boardgame phải implement
    Abstractions/GameEngineRegistry.cs
  Games/VayBat/                 — Game "Vay Bát" (game đầu tiên)
  Services/                     — RedisCacheService, RabbitMqPublisher, OpenSearchService, MinioStorageService
  Program.cs                    — Entry point, DI, schema bootstrap
```

## Schema bootstrap (KHÔNG dùng migrations)

Dự án dùng **chỉ raw SQL** trong `Program.cs` thay vì EF Migrations hoặc `EnsureCreated()`.

`EnsureCreated()` đã bị xoá vì gây `FormatException` khi Npgsql parse introspection query phức tạp trên PostgreSQL 16 (xem lỗi đã sửa bên dưới).

**Quy tắc khi thêm cột/bảng mới:**
- Thêm `CREATE TABLE IF NOT EXISTS` hoặc `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` vào block `ExecuteSqlRaw` trong `Program.cs`
- Luôn kèm `DEFAULT` value cho cột NOT NULL để chạy được trên bảng đã có data

## Lỗi đã sửa

### `FormatException: Input string was not in a correct format` khi khởi động (2026-06-30)
**Nguyên nhân:** `db.Database.EnsureCreated()` chạy introspection query phức tạp (~960 ký tự) mà Npgsql không parse được response của PostgreSQL 16.

**Fix:** Xoá hoàn toàn `EnsureCreated()`, thay bằng raw SQL `CREATE TABLE IF NOT EXISTS` cho tất cả bảng kể cả `Greetings`. Toàn bộ schema do một block `ExecuteSqlRaw` duy nhất quản lý.

### `column g.GameKey does not exist` (2026-06-30)
**Nguyên nhân:** `GameRooms` table tạo trước khi cột `GameKey` được thêm vào model. `CREATE TABLE IF NOT EXISTS` bỏ qua nếu bảng đã tồn tại nên cột không bao giờ được thêm.

**Fix:** Thêm dòng sau vào block raw SQL trong `Program.cs`:
```sql
ALTER TABLE "GameRooms" ADD COLUMN IF NOT EXISTS "GameKey" text NOT NULL DEFAULT '';
```

### `column "MoveJson" of relation "GameMoves" does not exist` (2026-06-30)
**Nguyên nhân:** Bảng `GameMoves` tạo từ schema cũ thiếu cột `MoveJson` (và có thể `Side`, `MoveNumber`). `CREATE TABLE IF NOT EXISTS` bỏ qua vì bảng đã tồn tại.

**Fix:** Thêm vào block raw SQL trong `Program.cs`:
```sql
ALTER TABLE "GameMoves" ADD COLUMN IF NOT EXISTS "MoveJson" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "GameMoves" ADD COLUMN IF NOT EXISTS "Side" text NOT NULL DEFAULT '';
ALTER TABLE "GameMoves" ADD COLUMN IF NOT EXISTS "MoveNumber" integer NOT NULL DEFAULT 0;
```

**Nguyên tắc chung khi thêm cột mới vào bất kỳ bảng nào:** Luôn kèm `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` vào block bootstrap để idempotent với DB cũ.

### `null value in column "PieceId" of relation "GameMoves" violates not-null constraint` (2026-06-30)
**Nguyên nhân:** Cột `PieceId` bị thêm trực tiếp vào bảng `GameMoves` trong DB từ schema cũ. Entity `GameMove` không có property này (dữ liệu nằm trong `MoveJson` JSONB), nên EF Core không đưa nó vào INSERT — PostgreSQL báo lỗi NOT NULL.

**Fix:** Thêm vào block raw SQL trong `Program.cs`:
```sql
ALTER TABLE "GameMoves" DROP COLUMN IF EXISTS "PieceId";
```

**Nguyên tắc:** Dữ liệu game-specific (như `PieceId`) thuộc về `MoveJson` JSONB, không được thêm thành cột riêng trong `GameMoves`.

### `null value in column "MaxRedTurns" violates not-null constraint` (2026-06-30)
**Nguyên nhân:** Cột `MaxRedTurns` bị thêm trực tiếp vào bảng `GameRooms` trong DB từ schema cũ. Entity `GameRoom` hiện tại không có property này (dữ liệu nằm trong `MapJson` JSONB), nên EF Core không đưa nó vào câu INSERT — PostgreSQL báo lỗi NOT NULL.

**Fix:** Thêm dòng sau vào block raw SQL trong `Program.cs`:
```sql
ALTER TABLE "GameRooms" DROP COLUMN IF EXISTS "MaxRedTurns";
```

**Nguyên tắc:** Dữ liệu game-specific (như `MaxRedTurns`) thuộc về `MapJson`/`StateJson` JSONB, không được thêm thành cột riêng trong `GameRooms`.

### `IDX10703: Cannot create a SymmetricSecurityKey, key length is zero` (2026-07-05)
**Nguyên nhân:** `appsettings.json` chứa `"Jwt": { "Secret": "" }` làm placeholder. `config["Jwt:Secret"]` trả về `""` (không phải `null`) nên guard `?? throw` không bắt được; trong Docker (`ASPNETCORE_ENVIRONMENT=Production`) không load `appsettings.Development.json` (nơi có dev secret) → tạo key rỗng, nổ ở request đầu tiên.

**Fix (3 phần):**
1. `TokenService`: validate bằng `string.IsNullOrWhiteSpace` + kiểm tra ≥ 32 byte, message chỉ rõ cách đặt `Jwt__Secret`.
2. `Program.cs`: khởi tạo `TokenService` ngay lúc boot (không lazy qua DI) → config sai là app chết ngay khi start với message rõ, không đợi request.
3. `docker-compose.yml`: backend nhận `Jwt__Secret` (default dev), `Auth__DevLogOtp` (default true), `Gmail__User/AppPassword` từ `.env`.

**Nguyên tắc:** Config placeholder trong appsettings là chuỗi rỗng, không phải null — mọi validate config bắt buộc dùng `IsNullOrWhiteSpace`, và secret bắt buộc thì validate lúc boot (fail-fast), không để lazy đến request đầu.

**Bug cùng cụm đã sửa kèm:** cookie auth từng đặt `Secure = !IsDevelopment()` → compose (Production, http://localhost) browser sẽ từ chối cookie → đăng nhập hỏng im lặng. Đổi thành `Secure = Request.IsHttps`.

### "Không thể di chuyển quân" dù đã vào ván (2026-07-03)
**Chẩn đoán (đã verify end-to-end bằng 2 client SignalR + Chromium/Playwright):** logic đi quân (tap-tap & kéo-thả) hoạt động đúng. Triệu chứng xảy ra khi ván **chưa thực sự bắt đầu** (`Status` kẹt `Waiting`) hoặc người chơi là khán giả — UI cũ im lặng nuốt click, không báo gì.

**Nguyên nhân gốc thường gặp:** `playerName` lưu trong `localStorage` → **mọi tab cùng trình duyệt dùng chung tên**. Tab thứ hai vào phòng bị backend coi là reconnect của người chơi cũ (`room.RedPlayer == playerName` → seated RED lần nữa), ghế Trắng không bao giờ được lấp, `Status` mãi `Waiting`, `myTurn` luôn false. Test 2 người trên cùng máy phải dùng **tên khác nhau** (đổi tên trong sảnh) hoặc trình duyệt khác/tab ẩn danh. Biến thể: đổi tên rồi vào lại phòng cũ → cả 2 ghế mang tên cũ → thành khán giả (👁 Xem).

**Các fix đã áp dụng:**
- `GameHub.MakeMove` / `GamesController`: bọc mọi thao tác Redis trong try-catch — Redis chỉ là cache, lỗi Redis không được chặn broadcast `GameStateUpdated` (triệu chứng cũ: nước đi lưu DB nhưng client không nhận update → tưởng không đi được).
- `useGameRoomHub`: lỗi `invoke` (mất kết nối SignalR) hiện lên UI qua `setError` thay vì chỉ `console.error`.
- `VayBatBoard`: hiển thị rõ trạng thái khi không đi được — "⏳ Chờ đối thủ đi…", "👁 đang xem", banner Waiting kèm ghi chú hai tab dùng chung tên.

## Đăng nhập (OTP qua Gmail, 2026-07-05)

Đăng nhập không mật khẩu: nhập email → backend gửi mã 6 số qua Gmail SMTP → nhập mã → JWT đặt trong **cookie HttpOnly** (`bg_auth`, SameSite=Lax; JS không đọc được token — không dùng localStorage).

**Cấu hình qua file `.env` ở root** (mẫu: `.env.example` — file example nằm trong git, KHÔNG điền credential thật vào đó): `JWT_SECRET`, `EMAIL_PROVIDER=smtp`, `SMTP_HOST/PORT/USER/PASS/FROM`, `WEB_BASE_URL`. Docker compose tự đọc `.env`; chạy `dotnet run` local thì `Services/DotEnv.cs` nạp `.env` vào biến môi trường lúc boot (biến môi trường có sẵn luôn thắng). `WEB_BASE_URL` được thêm vào CORS origins và gắn link trong email.

**Backend** (`Platform/Auth/` + `Services/SmtpOtpSender.cs`):
- `POST /api/auth/request-otp` — tạo OTP (chỉ lưu SHA-256 hash trong bảng `AuthOtps`), gửi mail. Rate limit: 60s giữa 2 lần, tối đa 5 lần/giờ/email. Mã mới vô hiệu mã cũ.
- `POST /api/auth/verify-otp` — hết hạn 5 phút, tối đa 5 lần nhập sai, so sánh fixed-time. Thành công → tạo/tìm `Users` (unique theo email), set cookie JWT.
- `GET /api/auth/me` — khôi phục phiên từ cookie. `PUT /api/auth/display-name`, `POST /api/auth/logout`.
- JWT secret: `JWT_SECRET` trong `.env` (ưu tiên) hoặc `Jwt:Secret` (dev default trong `appsettings.Development.json`). JwtBearer đọc token từ cookie qua `OnMessageReceived` (vẫn nhận Authorization header cho tool/test).

**Gửi mail**: MailKit → SMTP theo `SMTP_HOST:SMTP_PORT` (mặc định `smtp.gmail.com:587` STARTTLS; port 465 tự chuyển SslOnConnect). Với Gmail, `SMTP_PASS` là **App Password** của Google (https://myaccount.google.com/apppasswords, cần bật 2FA), `SMTP_FROM` dạng `Tên <email>` — email phải trùng `SMTP_USER`. Chưa cấu hình (`EMAIL_PROVIDER` trống): nếu `Auth:DevLogOtp` bật (mặc định ở Development và trong docker-compose) thì OTP log ra console/`docker compose logs backend`; ngược lại trả 503.

**Frontend**: `platform/authStore.ts` (zustand) + `platform/LoginPage.tsx`. `App.tsx` gọi `restoreSession()` khi mở trang; chưa đăng nhập → hiện LoginPage. Đăng nhập xong `displayName` được sync vào `gameStore.playerName` (email là định danh duy nhất → hết lớp bug hai tab trùng tên ngẫu nhiên, nhưng hai tab cùng trình duyệt vẫn chung phiên/tên — test 2 người vẫn cần 2 trình duyệt/profile).

## Giao diện game (VayBatBoard)

**Drag & drop (2026-06-30):** Dùng Pointer Events API (không phải HTML5 DnD — không hoạt động với SVG):
- `onPointerDown` trên SVG → phát hiện quân gần con trỏ, capture pointer bằng `setPointerCapture`
- `onPointerMove` → cập nhật vị trí ghost piece (quân ma theo ngón tay/chuột)
- `onPointerUp` → snap vào ô hợp lệ gần nhất (threshold 40px SVG units)
- Click/tap vẫn hoạt động song song: nhấn quân → chọn; nhấn ô xanh → đi
- `touch-action: none` (`touch-none` Tailwind) trên SVG ngăn browser cuộn trang khi chơi trên điện thoại

**Layout mobile-first:** `max-w-md mx-auto`, flex-col. Status bar → Board → Messages → Leave button

## Thêm game mới

1. Tạo thư mục `Games/<TênGame>/` với `<TênGame>Engine.cs` implement `IGameEngine`
2. Đăng ký trong `Program.cs`: `builder.Services.AddSingleton<IGameEngine, <TênGame>Engine>();`
3. Engine phải trả về `(mapJson, stateJson)` từ `NewGame()` — shape tuỳ game, lưu JSONB

### `RabbitMqPublisher`: không dùng `AutomaticRecoveryEnabled = true` cùng với `GetChannel()` thủ công
Hai cơ chế reconnect tranh nhau Dispose/recreate cùng một connection object → `ObjectDisposedException`. Dùng một trong hai: hoặc auto-recovery (bỏ GetChannel), hoặc GetChannel thủ công (tắt AutomaticRecoveryEnabled). Hiện tại dùng GetChannel thủ công, `AutomaticRecoveryEnabled = false`.

### `RabbitMqPublisher`: dùng `Volatile.Read/Write` thay vì từ khoá `volatile` cho DCLP
Field `_channel` dùng `Volatile.Read(ref _channel)` bên ngoài lock và `Volatile.Write(ref _channel, newCh)` bên trong lock để tránh torn read trên ARM (Apple Silicon / AWS Graviton).

### `VayBatEngine.ApplyMove`: bọc deserialization trong try-catch
`GameJson.Deserialize<VayBatMove>(moveJson)` có thể throw `JsonException` (JSON sai cú pháp) hoặc `NullReferenceException` (`PieceId: null` → `pieceId[0]`). Bọc trong try-catch, trả về `MoveOutcome(false, ...)` thay vì để exception propagate qua hub.

### `FormatException: Expected an ASCII digit` trên SQL có `'{}'::jsonb` (2026-06-30)
**Nguyên nhân:** EF Core's `ExecuteSqlRaw` parse `{N}` trong SQL string làm parameter placeholder. `'{}'::jsonb` chứa `{}` (brace rỗng) khiến EF Core throw `FormatException: Expected an ASCII digit` client-side, trước khi gửi SQL lên DB.

**Fix:** Dùng `'{{}}'::jsonb` trong tất cả raw SQL string truyền vào `ExecuteSqlRaw`. EF Core dùng `{{`/`}}` làm escape sequence cho literal `{`/`}`, PostgreSQL nhận được `'{}'::jsonb` đúng cú pháp.

**Nguyên tắc:** Mọi SQL có `{}` (jsonb empty object literal) truyền vào `ExecuteSqlRaw` phải viết là `{{}}`.

## Chạy local

```bash
docker compose up --build   # khởi toàn bộ stack
# hoặc chỉ infra:
docker compose up postgres redis rabbitmq opensearch minio -d
dotnet run --project backend/BoardGame.Api
```
