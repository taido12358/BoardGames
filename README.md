# 🎲 BoardGame

Nền tảng boardgame full-stack dùng chung — mỗi trò chơi cắm vào Platform generic qua một
interface duy nhất (`IGameEngine`), nên thêm game mới không phải sửa hạ tầng phòng/ghép trận/
realtime/lưu trữ. Hiện có 4 game: **Vây Bắt Trên Đồ Thị**, **BANG!**, **Ô Ăn Quan**, **Đua Xe
Hoàng Đạo**.

Luồng một nước đi đi qua toàn bộ hạ tầng:

> Client gửi ý định đi → **Backend (C# Rule Engine validate)** → **PostgreSQL** (lưu room +
> replay) → **Redis** (cache state) → **RabbitMQ** (event) → *(khi ván kết thúc)* **OpenSearch**
> (index lịch sử) + **MinIO** (lưu replay) → **SignalR** (broadcast state realtime) → **React** board.

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
│       ├── Data/               # AppDbContext (EF Core / PostgreSQL) + SchemaBootstrapper.cs (raw SQL)
│       ├── Services/           # Redis, RabbitMQ, OpenSearch, MinIO (dùng chung)
│       ├── Platform/           # ❖ Lõi dùng chung cho MỌI game
│       │   ├── Abstractions/   #   IGameEngine, GameEngineRegistry, MoveOutcome
│       │   ├── Models/         #   GameRoom, GameMove, GameRecord (generic, JSONB)
│       │   ├── Auth/           #   Đăng nhập OTP qua email, JWT cookie HttpOnly
│       │   ├── RoomService.cs  #   Toàn bộ logic phòng/ghế/ván (join/create/cancel/quick-match)
│       │   ├── GamesController.cs  # REST lobby (game-agnostic)
│       │   ├── AdminController.cs  # Trang quản trị read-only (role "Admin" qua JWT claim)
│       │   ├── GameHub.cs      #   SignalR realtime (dispatch theo gameKey, chat, rematch)
│       │   ├── RoomDto.cs / GameJson.cs
│       └── Games/              # ❖ Mỗi game một thư mục tự chứa
│           ├── VayBat/         #   game 1 — 2 người, không thông tin ẩn
│           │   ├── VayBatTypes.cs   # Map/State/Move
│           │   ├── VayBatRules.cs   # luật thuần (đã test)
│           │   └── VayBatEngine.cs  # adapter implement IGameEngine
│           ├── Bang/           #   game 2 — 4-8 người, hidden-role
│           ├── OAnQuan/        #   game 3 — 2 người, dân gian Việt Nam
│           └── ZodiacRace/     #   game 4 — 2-6 người, đua xúc xắc
├── frontend/                   # React + TypeScript + Vite
│   └── src/
│       ├── App.tsx
│       ├── platform/           # ❖ store/hub/lobby/chat/types dùng chung
│       ├── games/              # ❖ mỗi game một thư mục
│       │   ├── vaybat/  bang/  oanquan/  zodiacrace/
│       ├── components/         # GameLibrary/GameDetails/RoomRoute/AdminPage (route theo gameKey)
└── k8s/                        # Manifests Kubernetes (không đổi)
```

### ➕ Thêm một boardgame mới
1. **Backend** — tạo `Games/<Tên>/`: định nghĩa Map/State/Move, viết luật thuần,
   và một lớp `…Engine : IGameEngine`. Đăng ký 1 dòng ở `Program.cs`:
   `builder.Services.AddSingleton<IGameEngine, TenEngine>();`
2. **Frontend** — tạo `games/<ten>/` (types + metadata.ts + Board component), đăng ký vào
   `platform/gameRegistry.ts`, thêm 1 nhánh `case "<key>"` trong `components/RoomRoute.tsx`.

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

## 🎯 Game 001 — Vây Bắt Trên Đồ Thị (online, server-authoritative)

Game thật đầu tiên, chạy xuyên suốt toàn bộ hạ tầng (xem luồng ở đầu file).

**Rule Engine chạy ở server** (`backend/.../Games/VayBat/VayBatRules.cs`) — chống
gian lận và đảm bảo tất định. Client chỉ có bản engine "nhẹ" để gợi ý nước đi
(UI), mọi nước đi đều được server validate lại.

### Luật chơi
- Phe **Đỏ** (3 quân, đi săn) vây bắt phe **Trắng** (1 quân, trốn chạy) trên đồ thị phi hướng.
- Di chuyển theo cạnh nối tới đỉnh kề **còn trống**; không nhảy cóc, không ăn quân.
- **Đỏ thắng**: vây Trắng tới mức hết nước đi (trước/đúng lượt thứ X).
- **Trắng thắng**: sống sót qua X lượt Đỏ, hoặc Đỏ rơi vào stalemate.

### Cách thử
1. Mở 2 tab trình duyệt tại http://localhost:5173, mỗi tab đăng nhập bằng một email khác nhau
   (đăng nhập không mật khẩu — nhập email, nhận mã OTP 6 số qua SMTP hoặc log backend nếu chưa
   cấu hình SMTP, xem `.env.example`).
2. Tab 1: vào Thư viện trò chơi → chọn **Vây Bắt Trên Đồ Thị** → **Tạo phòng** (bạn cầm Đỏ).
3. Tab 2: vào cùng phòng đó (bạn cầm Trắng) → trận bắt đầu.
4. Click quân của mình khi tới lượt → các đỉnh đi được sáng xanh → click để đi (hoặc kéo-thả).

### API (lobby — generic cho mọi game)
Toàn bộ endpoint dưới đây yêu cầu đăng nhập (JWT cookie `HttpOnly` — đăng nhập qua UI, hoặc gọi
`POST /api/auth/request-otp` + `POST /api/auth/verify-otp` rồi dùng `-b`/`-c` của curl để giữ
cookie). Danh tính người chơi luôn lấy từ token, không nhận `playerName` từ client.

```bash
curl http://localhost:5000/api/games/engines    # danh sách game được hỗ trợ

# Tạo phòng (options tuỳ game; Vây Bắt dùng maxRedTurns) — cần cookie đăng nhập, xem trên
curl -X POST http://localhost:5000/api/games -H "Content-Type: application/json" -b cookies.txt \
  -d '{"gameKey":"vaybat","options":{"maxRedTurns":15}}'

curl -b cookies.txt http://localhost:5000/api/games            # danh sách phòng đang mở
curl -b cookies.txt "http://localhost:5000/api/games/search?q=RED"  # tìm lịch sử ván đã xong
```
Nước đi realtime qua SignalR hub `/hubs/game` (cookie tự gửi kèm): `JoinRoom(roomId)`,
`MakeMove(roomId, moveJson)` (moveJson tuỳ game, vd. `{"pieceId":"R0","to":5}`),
`LeaveRoom(roomId)`, `SendChatMessage(roomId, text)`.

## 🤠 Game 002 — BANG! (hidden-role, 4-8 người chơi, server-authoritative)

Game bài Western vai trò ẩn lấy cảm hứng từ BANG! — chỉ tái hiện cơ chế luật chơi, không
dùng tên thương hiệu/artwork của bản gốc (UI dùng icon Unicode + CSS, không có ảnh thẻ
bài thật). Tích hợp vào ĐÚNG kiến trúc Platform hiện có, không tạo hạ tầng riêng — xem
`rules/architecture/backend.md` cho chi tiết mở rộng Platform (ghế generic > 2 người +
ẩn thông tin riêng tư).

- **Người chơi**: 4-8, chọn số ghế lúc tạo phòng (`options.seatCount`).
- **Vai trò** (ẩn, trừ Cảnh sát trưởng luôn công khai): Cảnh sát trưởng, Phó cảnh sát,
  Kẻ ngoài vòng pháp luật, Kẻ phản bội — phân bố theo bảng chuẩn 4-8 người
  (`Games/Bang/BangRoles.cs`).
- **Nhân vật** (8, tên Western gốc theo yêu cầu, không dùng theme khác): Wyatt, Calamity,
  Billy, Jesse, Doc, Jack, Rose, Morgan — mỗi người một khả năng riêng, cài đặt hoàn
  toàn ở backend (`Games/Bang/BangCharacters.cs` + `BangRules.cs`), không hard-code ở React.
- **Bài**: Bang!/Trượt!/Bia/Súng Gatling/Đấu súng/Hoảng loạn!/Cat Balou/Xe ngựa/Wells
  Fargo/Người da đỏ!/vũ khí (Volcanic/Schofield/Remington)/Mustang/Thùng rượu — danh sách
  đầy đủ + số lượng: `Games/Bang/BangCards.cs`.
- **Khoảng cách**: tính quanh bàn tròn, chỉ đếm người còn sống, `BangRules.CalculateDistance`
  — Mustang/Morgan cộng thêm khoảng cách người khác nhìn thấy mình.
- **Luật server-authoritative**: mọi hành động (đánh bài, phản hồi Bang!, kết thúc lượt)
  đi qua `BangRules.HandleMove`, client chỉ gửi Ý ĐỊNH — xem `rules/coding/security.md`.
- **Thông tin ẩn**: server tính state RIÊNG cho từng người xem trước khi gửi qua SignalR
  (`IGameEngine.RedactStateForViewer`) — bài/vai trò người khác không bao giờ có trong
  response, không chỉ ẩn bằng CSS.
- **Giao diện**: 100% tiếng Việt (thuật ngữ, log, lỗi, nút bấm) — code/tên biến tiếng Anh.

### Cách thử

1. Mở 4-8 tab trình duyệt (hoặc profile khác nhau) tại http://localhost:5173, mỗi tab đăng
   nhập một email khác nhau.
2. Mỗi tab: Thư viện trò chơi → chọn **BANG!**, chọn số người chơi → **Tạo phòng**
   (tab đầu) / **Vào** phòng đó (các tab sau).
3. Khi đủ ghế, server tự chia vai trò/nhân vật/bài — ván bắt đầu ngay (Cảnh sát trưởng
   đi trước).

### Test

- Unit test luật chơi (không cần Docker): `dotnet test backend/BoardGame.Api.Tests` —
  bao phủ phân vai, gán nhân vật, khoảng cách (đúng ví dụ 6 người), tầm vũ khí, Bang!/
  Trượt!/Bia/Đấu súng/Người da đỏ!, loại người chơi, điều kiện thắng, và — quan trọng
  nhất — bảo vệ thông tin ẩn (JSON gửi cho một người xem không bao giờ chứa bài của
  người khác, kiểm bằng cách soi thẳng chuỗi JSON đã serialize).
- Đã verify sống bằng 4 SignalR client thật qua Docker Compose: vào phòng → server tự
  chia bài → không client nào nhận được bài người khác → nước đi ngoài tầm bị server
  từ chối đúng như thiết kế.

## 🌾 Game 003 — Ô Ăn Quan (dân gian Việt Nam, 2 người, server-authoritative)

Trò chơi dân gian quen thuộc — bàn cờ 12 ô (10 ô dân + 2 ô quan), rải quân vòng quanh bàn và
tranh ăn quân đối phương. Không có yếu tố may rủi (không xúc xắc/bài), không có thông tin ẩn.

- **Bàn cờ**: `[Quan0][5 ô dân P0][Quan1][5 ô dân P1]` xếp thành 1 vòng. Ban đầu mỗi ô dân có
  5 quân, mỗi ô quan có 10 quân.
- **Rải quân**: chọn 1 ô dân của mình, chọn chiều (trái/phải), rải mỗi ô 1 quân vòng quanh bàn.
  Nếu quân cuối rơi vào ô đã có sẵn quân thì "bốc" cả ô rải tiếp (relay) — trừ khi đó là ô quan
  (luôn kết thúc lượt ngay). Nếu quân cuối rơi vào ô trống, xét ăn quân ở ô kế tiếp.
- **Kết thúc ván**: khi cả 2 ô quan đã bị ăn hết quân gốc — quân còn lại trên bàn thuộc về chủ ô,
  ai nhiều quân hơn thắng (bằng nhau thì hoà).
- Luật đầy đủ + các lựa chọn khi nguồn dân gian có dị bản: `Games/OAnQuan/OAnQuanRules.cs`
  (đọc chú thích đầu file) và ADR trong `rules/history/decisions.md`.

### Cách thử

1. Mở 2 tab, đăng nhập 2 tài khoản khác nhau tại http://localhost:5173.
2. Tab 1: Thư viện trò chơi → **Ô Ăn Quan** → **Tạo phòng**. Tab 2: vào cùng phòng đó.
3. Đến lượt, chạm 1 ô dân của mình (đang có quân) → chọn "← Trái" hoặc "Phải →" để rải.

### Test

- Unit test luật chơi (không cần Docker): `dotnet test backend/BoardGame.Api.Tests` — 18 test
  phủ rải quân/bốc tiếp/ăn quân/ăn quan/luật "hết vốn"/kết thúc ván, cả 2 chiều rải.

## 🎲 Game 004 — Đua Xe Hoàng Đạo (đua xúc xắc, 2-6 người, server-authoritative)

Trò đua xúc xắc tự thiết kế (MVP tối giản) — mỗi người một xe mang biểu tượng cung hoàng đạo
(Unicode ♈-♓, không dùng ảnh), đổ xúc xắc di chuyển trên đường đua tuyến tính, ai về đích trước
thắng ngay. Không có yếu tố chiến thuật, không có thông tin ẩn — chơi nhanh, nhiều người.

- **Đường đua**: 30 ô liên tiếp, một số ô có "thùng hàng" (📦) — dừng đúng ô đó (không phải đi
  ngang qua) được +1 điểm thu thập (chỉ để vui, chưa ảnh hưởng thắng/thua ở v1).
- **Lượt chơi**: tới lượt, bấm "Đổ xúc xắc" — xe tự động tiến 1-6 ô. Không cần đổ đúng số để về
  đích (không có luật "dội ngược").
- **Vì sao không dùng bộ asset zodiac có sẵn** (`frontend/public/assets/games/zodiac/` — map/
  shop card/equipment/crate/cart): tên thư mục gợi ý một hệ kinh tế phức tạp không có spec nào
  để tra cứu đúng/sai (khác Ô Ăn Quan có luật dân gian thật) — xem ADR đầy đủ trong
  `rules/history/decisions.md`.

### Cách thử

1. Mở 2-6 tab, đăng nhập các tài khoản khác nhau tại http://localhost:5173.
2. Tab 1: Thư viện trò chơi → **Đua Xe Hoàng Đạo** → chọn số người chơi → **Tạo phòng**. Các tab
   khác vào cùng phòng.
3. Khi đủ người, tới lượt ai thì người đó bấm "🎲 ĐỔ XÚC XẮC".

### Test

- Unit test luật chơi + adapter (không cần Docker): `dotnet test backend/BoardGame.Api.Tests` —
  27 test phủ di chuyển/về đích/thùng hàng/lượt chơi/hợp đồng JSON/`OnRoomFull`/`OnSeatTimedOut`.

## 📜 Lịch sử ván đấu

Trang `/history` (link "📜 Lịch sử" trên header, bất kỳ ai đăng nhập cũng xem được — không phải
tính năng quản trị) — tìm kiếm full-text lịch sử ván đã kết thúc qua OpenSearch (`GET
/api/games/search?q=`), theo tên người chơi/người thắng/trạng thái. Hạ tầng OpenSearch + endpoint
backend đã có sẵn từ đầu dự án nhưng chưa từng có giao diện dùng tới cho tới khi trang này được
thêm — chỉ đọc, không có thao tác thay đổi dữ liệu nào.

## Triển khai Kubernetes

```bash
# Build & nạp image (ví dụ với minikube/kind)
docker build -t boardgame/backend:latest  ./backend/BoardGame.Api
docker build -t boardgame/frontend:latest ./frontend

kubectl apply -f k8s/
kubectl get pods -n boardgame
```

> Thêm `boardgame.local` vào file hosts để truy cập qua Ingress.
