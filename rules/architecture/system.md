# Architecture: System Overview

## Tổng quan

Full-stack boardgame platform: backend .NET 8 + frontend Vite/React. Mọi boardgame dùng chung một platform generic; mỗi game là một `IGameEngine` riêng — thêm game mới **không sửa** code platform.

**Stack:**

| Thành phần | Công nghệ |
|---|---|
| Backend | ASP.NET Core 8 |
| Database | PostgreSQL (JSONB cho dữ liệu game-specific) |
| Realtime | SignalR |
| Cache | Redis |
| Queue | RabbitMQ (event phụ trợ, không dùng cho luồng chơi realtime) |
| Search | OpenSearch (lịch sử ván đã kết thúc) |
| File storage | MinIO (replay) |
| Frontend | Vite + React + TypeScript |
| State (frontend) | Zustand |
| UI | Tailwind CSS |
| Container | Docker / Docker Compose |
| Deploy | Kubernetes (`k8s/`) |

**Ports (cố định — đổi phải cập nhật `CLAUDE.md` + tài liệu):**

| Service | Port |
|---|---|
| Backend API | `5000` |
| Frontend | `5173` |
| PostgreSQL | `5432` |
| Redis | `6379` |
| RabbitMQ | `5672` / UI `15672` |
| OpenSearch | `9200` |
| MinIO | `9000` / console `9001` |

> Ghi chú vận hành cục bộ: nếu máy dev đã có project khác chiếm sẵn `5432`/`6379` (đã gặp với một project tên `taskflow`), map sang port host khác trong `docker-compose.yml` (container port giữ nguyên) và cập nhật `ConnectionStrings` trong `appsettings.Development.json` cho khớp — đây là workaround cục bộ, không phải đổi chuẩn port của dự án.

## Cấu trúc thư mục

```
BoardGames/
├── CLAUDE.md                    — Điều hướng cho AI assistant (bản đồ, không phải kho tri thức)
├── rules/                       — Kho tri thức phát triển chi tiết (file này thuộc đây)
├── docker-compose.yml           — Toàn bộ infra ở root
├── k8s/                         — Manifest Kubernetes
├── backend/BoardGame.Api/
│   ├── Program.cs                — Entry point, DI, schema bootstrap (raw SQL)
│   ├── Data/AppDbContext.cs      — EF Core context (PostgreSQL)
│   ├── Services/                 — Hạ tầng dùng chung: Redis, RabbitMQ, OpenSearch, MinIO, SMTP OTP, DotEnv
│   ├── Platform/                 — ❖ Lõi generic dùng chung cho MỌI game
│   │   ├── Abstractions/           IGameEngine, GameEngineRegistry, MoveOutcome
│   │   ├── Models/                 GameRoom, GameMove, GameRecord (generic, JSONB)
│   │   ├── Auth/                   AuthController, TokenService, AuthOtp, AppUser (đăng nhập OTP qua email)
│   │   ├── GamesController.cs      REST lobby (game-agnostic)
│   │   ├── GameHub.cs               SignalR realtime (dispatch theo gameKey)
│   │   └── RoomDto.cs / GameJson.cs
│   └── Games/                    — ❖ Mỗi game một thư mục tự chứa
│       ├── VayBat/                 game 1 (2 người): VayBatTypes/Rules/Engine.cs
│       └── Bang/                   game 2 (4-8 người, hidden-role): BangTypes/Cards/Characters/Roles/Deck/Rules/Engine.cs
└── frontend/src/
    ├── App.tsx
    ├── platform/                 — ❖ store/hub/auth/Thư viện trò chơi dùng chung
    ├── games/                    — ❖ mỗi game một thư mục (vd `vaybat/`, `bang/`)
    └── components/                 GameView, GameLibrary, GameDetails, GameCard…
```

> `hooks/useGameHub.ts` + `store/helloStore.ts` (demo "Hello World" phía frontend) đã xoá 2026-08-05. Backend demo (`Controllers/HelloController.cs`, `/api/hello`, hub method `SendHello`) vẫn còn — xem [`../references/important-files.md`](../references/important-files.md).

## Nguyên tắc phân tầng (bắt buộc)

1. **Platform không được biết game cụ thể.** Mọi tham chiếu từ `Platform/` đến game phải đi qua `IGameEngine` / `GameEngineRegistry`.
2. **Game không được biết game khác.** `Games/VayBat/` không import từ `Games/<GameKhác>/`.
3. **Dữ liệu game-specific nằm trong JSONB** (`MapJson`, `StateJson`, `MoveJson`) — không thêm cột riêng vào bảng generic (`GameRooms`, `GameMoves`). Chi tiết: [`database.md`](./database.md).
4. **Services chỉ chứa hạ tầng**, không chứa business logic của game.

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

1. **Backend** — tạo `Games/<TênGame>/`: định nghĩa Map/State/Move, viết luật thuần (rules file riêng, test được không cần DB), và một lớp `<TênGame>Engine : IGameEngine`. Đăng ký DI trong `Program.cs`: `builder.Services.AddSingleton<IGameEngine, <TênGame>Engine>();`. Engine trả `(mapJson, stateJson)` từ `NewGame()` — shape tuỳ game, lưu JSONB.
2. **Frontend** — tạo `games/<ten>/` (types + Board component) và thêm nhánh `case "<key>"` trong `components/GameView.tsx`.
3. Platform (room, lobby, hub, replay, persistence) **không cần đụng tới** — TRỪ khi game cần khả năng Platform chưa có (2 trường hợp đã gặp, cả hai đều generic, không đặc thù game):
   - **> 2 người chơi** → dùng ghế generic `SeatCount`/`SeatsJson` (không phải `RedPlayer`/`WhitePlayer`), side `"P0".."P{N-1}"`. Engine nhận nước đi hệ thống `side: "SYSTEM"` khi phòng vừa đủ ghế để tự chia state ban đầu.
   - **Có thông tin ẩn** (bài trên tay, vai trò…) → override `IGameEngine.RedactStateForViewer(stateJson, side)`, không dựa vào frontend ẩn bằng CSS.
   Chi tiết: [`backend.md`](./backend.md) mục "Ghế: 2 người vs N người" / "Thông tin ẩn".

Hai game tham chiếu: `VayBat` (2 người, không thông tin ẩn — mẫu đơn giản nhất) và `Bang` (4-8 người, thông tin ẩn — mẫu đầy đủ các khả năng generic của Platform). Danh sách file cụ thể: [`../references/important-files.md`](../references/important-files.md).
