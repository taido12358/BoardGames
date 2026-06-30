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

### `null value in column "MaxRedTurns" violates not-null constraint` (2026-06-30)
**Nguyên nhân:** Cột `MaxRedTurns` bị thêm trực tiếp vào bảng `GameRooms` trong DB từ schema cũ. Entity `GameRoom` hiện tại không có property này (dữ liệu nằm trong `MapJson` JSONB), nên EF Core không đưa nó vào câu INSERT — PostgreSQL báo lỗi NOT NULL.

**Fix:** Thêm dòng sau vào block raw SQL trong `Program.cs`:
```sql
ALTER TABLE "GameRooms" DROP COLUMN IF EXISTS "MaxRedTurns";
```

**Nguyên tắc:** Dữ liệu game-specific (như `MaxRedTurns`) thuộc về `MapJson`/`StateJson` JSONB, không được thêm thành cột riêng trong `GameRooms`.

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

## Chạy local

```bash
docker compose up --build   # khởi toàn bộ stack
# hoặc chỉ infra:
docker compose up postgres redis rabbitmq opensearch minio -d
dotnet run --project backend/BoardGame.Api
```
