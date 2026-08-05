# Decisions (ADR)

## ADR: Thêm `react-router-dom` v6 cho Thư viện trò chơi

Date: 2026-08-05

### Context

Giao diện chọn game cũ là một `<select>` phẳng trong `Lobby.tsx`, không có URL riêng cho từng game. Cần trang "Thư viện trò chơi" + trang chi tiết mỗi game với URL chia sẻ được (`/games/bang`) và nút back trình duyệt hoạt động tự nhiên. Trước đó dự án **không có router nào** — `App.tsx` chỉ đổi `tab` bằng state, không đụng URL.

### Decision

Thêm `react-router-dom@^6.30` (không phải v7). `App.tsx` bọc `<BrowserRouter>`; `GameView.tsx` dùng `<Routes>` cho `/games` và `/games/:gameKey` khi chưa vào phòng nào.

### Alternatives

- Tự viết điều hướng bằng `history.pushState` + `popstate` thủ công (không thêm dependency) — bị loại vì phải tự xử lý lại các case router chuẩn đã giải quyết (nested route, `useParams`, `useSearchParams`, redirect) trong khi `react-router-dom` là lựa chọn tiêu chuẩn cho đúng nhu cầu này.
- `react-router-dom` v7 (bản mới nhất lúc thêm) — bị loại: v7 có CVE mức high (RSC Mode CSRF Bypass) mà dù không áp dụng cho app này (SPA thuần, không dùng RSC/framework mode), gây nhiễu khi audit. v6 cũng có 2 CVE mức moderate (open-redirect qua backslash trong `Link`/`useNavigate`, SSR hydration injection) nhưng **cả hai đều không áp dụng**: app này không SSR, và mọi giá trị truyền vào `navigate()`/`Link` trong app đều là `gameKey` lấy từ backend (`engines` list), không phải input tự do của người dùng.

### Reason

v6 là API ổn định, tài liệu đầy đủ, đúng nhu cầu (SPA thuần phía client), khớp tinh thần "chọn dependency ổn định" đã có của dự án (React 18 chứ không phải 19, v.v.).

### Consequences

Mọi giá trị đưa vào `navigate()`/route path phải là dữ liệu **đã qua backend xác thực** (như `gameKey` từ `/api/games/engines`), không được nội suy trực tiếp input người dùng chưa kiểm tra vào đường dẫn — để không chạm vào lớp CVE open-redirect dù rủi ro thực tế đã thấp.

---

## ADR: Ghế generic (SeatCount/SeatsJson) cho game > 2 người, song song với RedPlayer/WhitePlayer

Date: 2026-08-05

### Context

Thêm game BANG! (4-8 người). `GameRoom`/`GameHub` khi đó chỉ hỗ trợ đúng 2 ghế cứng
(`RedPlayer`/`WhitePlayer`, side `"RED"`/`"WHITE"`) — không đủ cho game nhiều người.

### Decision

Thêm `GameRoom.SeatCount` (int) + `GameRoom.SeatsJson` (jsonb, mảng tên theo ghế), side
generic `"P0".."P{N-1}"`. `GameHub`/`GamesController` chọn mô hình ghế theo `engine.MaxPlayers`:
≤ 2 dùng đường cũ (không đổi 1 dòng hành vi), > 2 dùng ghế generic.

### Alternatives

- Sửa `RedPlayer`/`WhitePlayer` thành một mảng chung ngay từ đầu (bỏ 2 cột cũ) — bị loại
  vì rủi ro phá `VayBat` (buộc phải sửa lại toàn bộ `GameHub`/`VayBatEngine`/frontend cùng
  lúc) trong khi mục tiêu là "không được phá Vây Bắt".
- Thêm bảng `GameSeats` riêng (1-nhiều với `GameRooms`) — bị loại vì phức tạp hoá không
  cần thiết cho nhu cầu hiện tại (một mảng tên trong JSONB là đủ, nhất quán với cách dự
  án đã dùng JSONB cho `MapJson`/`StateJson`).

### Reason

Giữ nguyên đường cũ cho game 2 người là rủi ro thấp nhất để không phá VayBat; JSONB cho
ghế N-người nhất quán với cách dự án đã lưu dữ liệu generic khác.

### Consequences

Muốn biết ghế của một người chơi trong hub, dùng `GameHub.ResolveSide` (không tự viết lại
logic so sánh `RedPlayer`/`WhitePlayer` ở chỗ khác). Chi tiết: [`../architecture/backend.md`](../architecture/backend.md).

---

## ADR: State gửi RIÊNG theo từng connection SignalR (không còn broadcast nhóm một bản chung)

Date: 2026-08-05

### Context

BANG! có thông tin ẩn bắt buộc (bài trên tay, vai trò chưa lộ) mà `GameHub` cũ không hỗ
trợ — `Clients.Group(roomId).SendAsync("GameStateUpdated", dto)` gửi đúng một bản JSON
y hệt cho mọi người trong phòng, không có cách nào ẩn field theo người nhận.

### Decision

Thêm `IGameEngine.RedactStateForViewer(stateJson, side)` (default interface method — trả
nguyên state nếu không override, nên `VayBatEngine` không cần sửa gì). `GameHub` giữ map
tĩnh connection → (roomId, playerName), và khi cần broadcast thì lặp qua từng connection
của phòng, gọi `RedactStateForViewer` theo đúng ghế của người đó, gửi bằng
`Clients.Client(connectionId)` thay vì `Clients.Group(roomId)`.

### Alternatives

- Gửi state đầy đủ cho mọi người, ẩn ở frontend bằng CSS/logic React — bị loại thẳng vì
  đúng chống chỉ định của spec: dữ liệu vẫn nằm trong response, ai mở DevTools cũng đọc
  được bài/vai trò người khác.
- Tạo SignalR group riêng cho từng người chơi trong phòng (`room:{id}:seat:{n}`) thay vì
  map connection thủ công — cân nhắc nhưng chưa chọn: vẫn phải tính state riêng cho từng
  group trước khi gửi nên không giảm được độ phức tạp, lại thêm quản lý vòng đời group.

### Reason

Đúng yêu cầu bảo mật cốt lõi của game hidden-role: server không bao giờ được gửi dữ liệu
mà người nhận không có quyền thấy, kể cả khi client hứa "sẽ ẩn nó đi".

### Consequences

Engine nào có thông tin ẩn phải tự implement `RedactStateForViewer` và tự đảm bảo payload
trả về không chứa field nhạy cảm của người khác (xem `BangRules.BuildViewerPayload` làm
mẫu + `BangHiddenInfoTests.cs` cách test bằng soi chuỗi JSON). Chi phí: mỗi lần broadcast
giờ là N lời gọi `SendAsync` (N = số connection trong phòng) thay vì 1 — chấp nhận được ở
quy mô phòng chơi nhỏ (tối đa 8 người), chưa cần tối ưu.

---

## ADR: Không dùng EF Migrations — schema bootstrap bằng raw SQL idempotent

Date: 2026-06-30

### Context

`db.Database.EnsureCreated()` chạy introspection query phức tạp (~960 ký tự) mà Npgsql không parse được response của PostgreSQL 16, gây `FormatException` ngay khi khởi động.

### Decision

Xoá hoàn toàn `EnsureCreated()` và không dùng EF Migrations. Toàn bộ schema (tạo bảng, thêm cột, xoá cột, index) quản lý bằng **một block `ExecuteSqlRaw` duy nhất** trong `Program.cs`, chạy lúc app khởi động, viết idempotent (`IF NOT EXISTS` mọi nơi).

### Alternatives

- Dùng EF Migrations chuẩn — bị loại vì cần thời gian thiết lập lại và không giải quyết trực tiếp lỗi Npgsql/PostgreSQL 16 đang gặp; cũng thêm một cơ chế nguồn-sự-thật thứ hai (migration history table) trong khi dự án ưu tiên đơn giản.
- Hạ cấp xuống PostgreSQL phiên bản cũ hơn — bị loại vì né tránh vấn đề thay vì giải quyết, và khoá dự án vào version cũ.

### Reason

Raw SQL bootstrap đơn giản, không phụ thuộc introspection phức tạp của EF, và idempotent nên chạy lại an toàn trên DB đã có data — quan trọng vì dự án không có quy trình migration riêng cho từng môi trường.

### Consequences

Mọi thay đổi schema về sau (thêm bảng/cột) bắt buộc phải tự viết `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` kèm `DEFAULT` cho NOT NULL — quy tắc thực thi ở [`../coding/database.md`](../coding/database.md). Đây là nguồn gốc của một chuỗi bug ban đầu (cột thiếu `GameKey`/`MoveJson`, cột thừa `PieceId`/`MaxRedTurns`) trước khi quy tắc được thiết lập chặt — xem [`../workflow/debugging.md`](../workflow/debugging.md).

---

## ADR: Dữ liệu game-specific nằm trong cột JSONB, không phải cột riêng của bảng generic

Date: 2026-06-30

### Context

Cột `PieceId` (thuộc `GameMoves`) và `MaxRedTurns` (thuộc `GameRooms`) bị thêm trực tiếp vào DB từ một schema cũ. Entity C# hiện tại không có property tương ứng (dữ liệu đã được thiết kế để nằm trong JSONB `MoveJson`/`MapJson`), nên EF Core không đưa cột đó vào câu INSERT → PostgreSQL báo lỗi NOT NULL.

### Decision

Bảng platform (`GameRooms`, `GameMoves`) là **generic tuyệt đối** — không bao giờ thêm cột đặc thù cho một game cụ thể. Mọi dữ liệu riêng của game (vị trí quân, số lượt tối đa, luật riêng…) nằm trong cột JSONB (`MapJson`, `StateJson`, `MoveJson`).

### Alternatives

- Thêm cột riêng cho từng game vào bảng chung, cột nào không dùng thì để NULL/default — bị loại vì phá vỡ tính generic của Platform (mục tiêu kiến trúc số 1: Platform không được biết game cụ thể) và làm bảng phình ra vô hạn khi thêm game mới.
- Bảng riêng cho từng game (`VayBatMoves`, `ChessMoves`…) — bị loại vì Platform code (lobby, replay, GamesController) cần xử lý mọi game đồng nhất qua một bảng.

### Reason

JSONB cho phép mỗi game tự định nghĩa shape dữ liệu của mình mà không đổi schema chung, đúng tinh thần "Platform không biết game cụ thể" (xem [`../architecture/system.md`](../architecture/system.md)).

### Consequences

Khi thêm game mới, không bao giờ thêm cột vào `GameRooms`/`GameMoves`. Code review phải chặn PR nào thêm cột game-specific vào bảng generic (đã đưa vào checklist ở [`../coding/testing.md`](../coding/testing.md)).

---

## ADR: `playerName` tự nhập → đăng nhập bằng OTP email làm định danh người chơi

Date: 2026-07-04 (phát hiện) / 2026-07-05 (fix triệt để)

### Context

Người chơi định danh bằng `playerName` tự nhập, lưu trong `localStorage`. Hai tab cùng trình duyệt dùng chung `localStorage` → cùng tên → backend coi tab thứ hai là reconnect của người chơi cũ, ghế thứ hai không bao giờ được lấp, `Status` phòng mãi `Waiting`. Triệu chứng bề mặt: người chơi tưởng "không thể di chuyển quân" dù UI không báo lỗi gì rõ ràng.

### Decision

Ngày 2026-07-04, fix tạm thời ở tầng UI/lỗi: hiện rõ trạng thái Waiting/khán giả, không nuốt lỗi Redis, hiện lỗi SignalR lên UI — giảm độ khó hiểu của triệu chứng nhưng chưa giải quyết gốc.

Ngày 2026-07-05, fix gốc: thay `playerName` tự nhập bằng đăng nhập **OTP qua email** (JWT cookie HttpOnly), định danh người chơi theo `email`/user id ổn định thay vì display name tự chọn.

### Alternatives

- Sinh `playerId` ngẫu nhiên lưu `localStorage` thay vì dùng tên — bị loại vì vẫn chung `localStorage` giữa các tab cùng trình duyệt, không giải quyết gốc vấn đề "2 tab = 1 danh tính".
- Yêu cầu người dùng luôn đổi tên thủ công mỗi tab — bị loại vì dựa vào người dùng nhớ làm đúng, không phải giải pháp kỹ thuật.

### Reason

Auth thật (email + OTP) cho định danh ổn định, duy nhất, không phụ thuộc trình duyệt lưu gì — giải quyết đúng gốc rễ thay vì vá triệu chứng.

### Consequences

Vẫn còn giới hạn đã biết: hai tab **cùng trình duyệt** chia sẻ chung phiên đăng nhập (cookie), nên test 2 người chơi trên cùng máy vẫn cần 2 trình duyệt/profile khác nhau — ghi trong [`../workflow/development.md`](../workflow/development.md). Quy tắc phân quyền/seat assignment cập nhật theo user id: [`../coding/security.md`](../coding/security.md).

---

## ADR: Hạ tầng phụ (Redis/RabbitMQ/OpenSearch) không bao giờ được chặn luồng chính

Date: 2026-07-04

### Context

`GameHub.MakeMove`/`GamesController` từng để lỗi Redis chặn luôn việc broadcast `GameStateUpdated` — nước đi đã ghi DB thành công nhưng client không nhận được cập nhật, tạo cảm giác "không đi được quân" dù dữ liệu đã đúng.

### Decision

PostgreSQL là nguồn sự thật duy nhất. Mọi thao tác lên Redis, RabbitMQ, OpenSearch, MinIO bắt buộc bọc try-catch, log Warning rồi tiếp tục — không bao giờ được chặn ghi DB hay chặn broadcast SignalR.

### Alternatives

- Coi lỗi hạ tầng phụ là lỗi nghiêm trọng, trả 500 cho client — bị loại vì biến hạ tầng vốn chỉ là "tăng tốc/phụ trợ" thành single point of failure cho toàn bộ luồng chơi.

### Reason

Đúng vai trò thiết kế: Redis là cache, RabbitMQ là event phụ trợ cho indexing — không phải một phần của đường đi chính (critical path) của một nước đi.

### Consequences

Thứ tự xử lý `MakeMove` cố định: validate → ghi DB → (best-effort) cache → broadcast → (best-effort) publish, xem [`../architecture/backend.md`](../architecture/backend.md). Checklist review bắt buộc kiểm tra điểm này với mọi PR đụng tới hub/controller.

---

## ADR: Pointer Events API cho tương tác kéo-thả trên board SVG

Date: 2026-06-30

### Context

Board game vẽ bằng SVG cần kéo-thả quân cờ. HTML5 Drag & Drop API không hoạt động đúng với phần tử SVG trên nhiều trình duyệt/thiết bị cảm ứng.

### Decision

Dùng Pointer Events API (`onPointerDown`/`onPointerMove`/`onPointerUp` + `setPointerCapture`) thay cho HTML5 DnD, kèm `touch-action: none` trên SVG để không cuộn trang khi chơi trên điện thoại. Click/tap vẫn hoạt động song song với kéo-thả.

### Alternatives

- HTML5 Drag & Drop API — bị loại vì không tương thích SVG đáng tin cậy.
- Thư viện kéo-thả bên thứ ba (react-dnd, dnd-kit…) — chưa cần thiết ở quy mô hiện tại (board đơn giản), thêm dependency không tương xứng lợi ích.

### Reason

Pointer Events là chuẩn web gốc, hoạt động thống nhất chuột/cảm ứng/bút, không cần thư viện ngoài.

### Consequences

Mọi board game mới thêm vào dự án nên theo cùng pattern (xem [`../architecture/frontend.md`](../architecture/frontend.md)) để giữ nhất quán trải nghiệm kéo-thả giữa các game.

---

## ADR: RabbitMQ dùng reconnect thủ công (`GetChannel()`), tắt `AutomaticRecoveryEnabled`

Date: không xác định chính xác từ git log — ghi nhận lại từ quy tắc đã có trong `rule/rule-queue.md`/`CLAUDE.md` cũ

### Context

Bật `AutomaticRecoveryEnabled = true` đồng thời với cơ chế `GetChannel()` reconnect thủ công khiến hai cơ chế tranh nhau dispose/recreate cùng một connection object, gây `ObjectDisposedException`.

### Decision

Chọn một trong hai cơ chế, không dùng cả hai cùng lúc. Hiện tại: reconnect thủ công (`GetChannel()`), `AutomaticRecoveryEnabled = false`. Field `_channel` dùng `Volatile.Read/Write` cho double-checked locking (an toàn trên ARM) thay vì từ khoá `volatile`.

### Alternatives

- Chuyển hẳn sang auto-recovery của RabbitMQ client, bỏ `GetChannel()` thủ công — khả thi nhưng chưa thực hiện; nếu đổi hướng này phải bỏ hoàn toàn code reconnect thủ công, không giữ cả hai.

### Reason

Tránh xung đột hai cơ chế quản lý vòng đời connection cùng lúc; `Volatile.Read/Write` tránh torn read trên kiến trúc ARM (Apple Silicon/AWS Graviton) mà từ khoá `volatile` không đảm bảo trong pattern DCLP này.

### Consequences

Bất kỳ thay đổi nào vào `RabbitMqPublisher` phải giữ nguyên lựa chọn "một cơ chế reconnect duy nhất" — xem [`../coding/backend.md`](../coding/backend.md).
