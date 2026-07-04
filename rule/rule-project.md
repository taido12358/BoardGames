# Rule: Project Structure

> Quy tắc cấu trúc dự án, tổ chức thư mục, đặt tên module/package/component.

## Cấu trúc tổng thể

```
BoardGames/
  backend/BoardGame.Api/    — Backend .NET 8 (một project duy nhất)
  frontend/                 — Frontend Vite + React
  rule/                     — Tài liệu quy tắc phát triển
  docker-compose.yml        — Toàn bộ infra (root)
  CLAUDE.md                 — Hướng dẫn cho AI assistant
```

## Backend (`backend/BoardGame.Api/`)

| Thư mục | Vai trò |
|---|---|
| `Data/` | EF Core `AppDbContext`, cấu hình entity |
| `Platform/` | Phần generic dùng chung cho mọi boardgame: controller, hub, model, DTO |
| `Platform/Abstractions/` | Interface (`IGameEngine`) và registry |
| `Platform/Models/` | Entity dùng chung (`GameRoom`, `GameMove`, `GameRecord`) |
| `Games/<TênGame>/` | Mỗi game một thư mục riêng, chứa engine + model riêng của game |
| `Services/` | Service hạ tầng: Redis, RabbitMQ, OpenSearch, MinIO |

### Nguyên tắc phân tầng

1. **Platform không được biết game cụ thể.** Mọi tham chiếu từ `Platform/` đến game phải đi qua `IGameEngine` / `GameEngineRegistry`.
2. **Game không được biết game khác.** `Games/VayBat/` không import từ `Games/CoTuong/`.
3. **Dữ liệu game-specific nằm trong JSONB** (`MapJson`, `StateJson`, `MoveJson`) — không thêm cột riêng vào bảng generic (`GameRooms`, `GameMoves`).
4. **Services chỉ chứa hạ tầng**, không chứa business logic của game.

## Frontend

- Component dùng chung của platform (lobby, phòng chơi, hub hook) tách khỏi component riêng của từng game (board).
- Mỗi game có board component riêng, ví dụ `VayBatBoard`.
- Hook giao tiếp realtime tập trung tại `useGameRoomHub`.

## Đặt tên

| Loại | Quy tắc | Ví dụ |
|---|---|---|
| Namespace C# | `BoardGame.Api.<Thư mục>` | `BoardGame.Api.Platform.Abstractions` |
| Class C# | PascalCase | `GameEngineRegistry` |
| Interface C# | `I` + PascalCase | `IGameEngine` |
| Thư mục game | PascalCase, không dấu | `VayBat` |
| React component | PascalCase | `VayBatBoard.tsx` |
| React hook | `use` + camelCase | `useGameRoomHub.ts` |
| GameKey (định danh game) | camelCase hoặc kebab-case, ổn định, không đổi sau khi có data | `vaybat` |

## Thêm game mới

1. Tạo `Games/<TênGame>/<TênGame>Engine.cs` implement `IGameEngine`.
2. Đăng ký DI trong `Program.cs`: `builder.Services.AddSingleton<IGameEngine, <TênGame>Engine>();`
3. Engine trả về `(mapJson, stateJson)` từ `NewGame()` — shape tuỳ game, lưu JSONB.
4. Tạo board component tương ứng ở frontend.

## Xem thêm

- Quy tắc file: `rule-file.md`
- Quy tắc code chung: `rule-code.md`
- Quy tắc database: `rule-database.md`
