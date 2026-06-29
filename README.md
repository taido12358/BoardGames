# 🎲 BoardGame — Hello World

Mẫu **"hello world"** minh hoạ đầy đủ hạ tầng công nghệ của dự án. Một greeting
được tạo ra sẽ đi qua toàn bộ stack:

> **PostgreSQL** (lưu) → **Redis** (cache) → **RabbitMQ** (event) →
> **OpenSearch** (index) → **MinIO** (artifact) → **SignalR** (realtime tới UI)

## Công nghệ

| Thành phần | Công nghệ          |
| ---------- | ------------------ |
| Backend    | ASP.NET Core       |
| Realtime   | SignalR            |
| Database   | PostgreSQL         |
| Cache      | Redis              |
| Queue      | RabbitMQ           |
| Search     | OpenSearch         |
| Storage    | MinIO              |
| Container  | Docker             |
| Deploy     | Kubernetes         |
| Frontend   | React + TypeScript |
| State      | Zustand            |
| UI         | Tailwind           |

## Cấu trúc thư mục

Kiến trúc tách **Platform** (hạ tầng dùng chung cho mọi game) khỏi **Games**
(mỗi boardgame tự chứa). Platform chỉ làm việc qua `IGameEngine` nên thêm game
mới **không phải sửa** platform.

```
BoardGame/
├── README.md
├── docker-compose.yml          # Chạy toàn bộ stack bằng 1 lệnh
├── backend/                    # ASP.NET Core Web API
│   └── BoardGame.Api/
│       ├── Program.cs          # DI + đăng ký engine của từng game
│       ├── Data/               # AppDbContext (EF Core / PostgreSQL)
│       ├── Services/           # Redis, RabbitMQ, OpenSearch, MinIO (dùng chung)
│       ├── Controllers/        # HelloController (demo hạ tầng)
│       ├── Models/             # Greeting (demo)
│       ├── Platform/           # ❖ Lõi dùng chung cho MỌI game
│       │   ├── Abstractions/   #   IGameEngine, GameEngineRegistry, MoveOutcome
│       │   ├── Models/         #   GameRoom, GameMove, GameRecord (generic, JSONB)
│       │   ├── GamesController.cs  # REST lobby (game-agnostic)
│       │   ├── GameHub.cs      #   SignalR realtime (dispatch theo gameKey)
│       │   ├── RoomDto.cs / GameJson.cs
│       └── Games/              # ❖ Mỗi game một thư mục tự chứa
│           └── VayBat/         #   game001
│               ├── VayBatTypes.cs   # Map/State/Move
│               ├── VayBatRules.cs   # luật thuần (đã test)
│               └── VayBatEngine.cs  # adapter implement IGameEngine
├── frontend/                   # React + TypeScript + Vite
│   └── src/
│       ├── App.tsx
│       ├── platform/           # ❖ store/hub/lobby/types dùng chung
│       ├── games/              # ❖ mỗi game một thư mục
│       │   └── vaybat/         #   types.ts + VayBatBoard.tsx
│       ├── components/         # GameView (route theo gameKey)
│       ├── store/ · hooks/     # helloStore, useGameHub (demo)
└── k8s/                        # Manifests Kubernetes (không đổi)
```

### ➕ Thêm một boardgame mới
1. **Backend** — tạo `Games/<Tên>/`: định nghĩa Map/State/Move, viết luật thuần,
   và một lớp `…Engine : IGameEngine`. Đăng ký 1 dòng ở `Program.cs`:
   `builder.Services.AddSingleton<IGameEngine, TenEngine>();`
2. **Frontend** — tạo `games/<ten>/` (types + Board component) và thêm 1 nhánh
   `case "<key>"` trong `components/GameView.tsx`.

Platform (room, lobby, hub, replay, persistence) **không cần đụng tới**.

## Chạy nhanh với Docker Compose

```bash
docker compose up --build
```

| Dịch vụ            | URL                                    |
| ------------------ | -------------------------------------- |
| Frontend           | http://localhost:5173                  |
| Backend (Swagger)  | http://localhost:5000/swagger          |
| RabbitMQ UI        | http://localhost:15672 (guest/guest)   |
| OpenSearch         | http://localhost:9200                  |
| MinIO Console      | http://localhost:9001 (minioadmin/...) |

## Chạy ở chế độ phát triển (không Docker cho app)

```bash
# 1. Bật riêng phần hạ tầng
docker compose up postgres redis rabbitmq opensearch minio

# 2. Backend
cd backend/BoardGame.Api
dotnet run        # http://localhost:5000

# 3. Frontend
cd frontend
npm install
npm run dev       # http://localhost:5173
```

## Thử nghiệm API

```bash
# Tạo greeting (đi qua toàn bộ stack)
curl -X POST http://localhost:5000/api/hello \
  -H "Content-Type: application/json" \
  -d '{"message":"Xin chào BoardGame!"}'

# Lấy greeting mới nhất (ưu tiên Redis)
curl http://localhost:5000/api/hello

# Tìm kiếm full-text (OpenSearch)
curl "http://localhost:5000/api/hello/search?q=chào"
```

## 🎯 Game 001 — Vây Bắt Trên Đồ Thị (online, server-authoritative)

Game thật đầu tiên, chạy xuyên suốt toàn bộ hạ tầng giống mẫu Hello World:

> Client gửi ý định đi → **Backend (C# Rule Engine validate)** → **PostgreSQL**
> (room + replay) → **Redis** (cache state) → **RabbitMQ** (event) → *(khi kết
> thúc)* **OpenSearch** (index) + **MinIO** (replay) → **SignalR** (broadcast
> state cho cả phòng) → **React** board.

**Rule Engine chạy ở server** (`backend/.../Games/VayBat/VayBatRules.cs`) — chống
gian lận và đảm bảo tất định. Client chỉ có bản engine "nhẹ" để gợi ý nước đi
(UI), mọi nước đi đều được server validate lại.

### Luật chơi
- Phe **Đỏ** (3 quân, đi săn) vây bắt phe **Trắng** (1 quân, trốn chạy) trên đồ thị phi hướng.
- Di chuyển theo cạnh nối tới đỉnh kề **còn trống**; không nhảy cóc, không ăn quân.
- **Đỏ thắng**: vây Trắng tới mức hết nước đi (trước/đúng lượt thứ X).
- **Trắng thắng**: sống sót qua X lượt Đỏ, hoặc Đỏ rơi vào stalemate.

### Cách thử
1. Mở 2 tab trình duyệt tại http://localhost:5173 (tab Game).
2. Tab 1: đặt tên → **Tạo phòng** (bạn cầm Đỏ).
3. Tab 2: đặt tên khác → bấm **Vào** phòng đó (bạn cầm Trắng) → trận bắt đầu.
4. Click quân của mình khi tới lượt → các đỉnh đi được sáng xanh → click để đi.

> Bản demo offline 1 file (không cần backend, có cả AI để test một mình):
> `taido/game001.html`.

### API (lobby — generic cho mọi game)
```bash
curl http://localhost:5000/api/games/engines    # danh sách game được hỗ trợ

# Tạo phòng (options tuỳ game; Vây Bắt dùng maxRedTurns)
curl -X POST http://localhost:5000/api/games -H "Content-Type: application/json" \
  -d '{"gameKey":"vaybat","options":{"maxRedTurns":15},"playerName":"An"}'

curl http://localhost:5000/api/games            # danh sách phòng đang mở
curl "http://localhost:5000/api/games/search?q=RED"  # tìm lịch sử ván đã xong
```
Nước đi realtime qua SignalR hub `/hubs/game`: `JoinRoom(roomId, name)`,
`MakeMove(roomId, moveJson, name)` (moveJson tuỳ game, vd. `{"pieceId":"R0","to":5}`),
`LeaveRoom(roomId)`.

> ⚠️ **Schema DB đã đổi** khi tách Platform/Games (bảng `GameRooms`/`GameMoves`
> thành generic). Nếu trước đó bạn đã chạy bản cũ, hãy reset volume một lần:
> `docker compose down -v` rồi `docker compose up --build`.

## Triển khai Kubernetes

```bash
# Build & nạp image (ví dụ với minikube/kind)
docker build -t boardgame/backend:latest  ./backend/BoardGame.Api
docker build -t boardgame/frontend:latest ./frontend

kubectl apply -f k8s/
kubectl get pods -n boardgame
```

> Thêm `boardgame.local` vào file hosts để truy cập qua Ingress.
