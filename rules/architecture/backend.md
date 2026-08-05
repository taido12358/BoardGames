# Architecture: Backend

## Phân tầng

```
Controller / Hub  →  Engine (IGameEngine) + Services  →  DbContext / hạ tầng
```

- **Controller (`GamesController`)**: nhận request lobby, validate input, gọi xuống, map sang DTO. Không chứa luật chơi.
- **Hub (`GameHub`)**: nhận invoke realtime, xác định phòng/người chơi, gọi engine, persist, broadcast. Không chứa luật chơi.
- **Engine (`IGameEngine`)**: toàn bộ luật của một game — validate nước đi, tính state mới. Engine **thuần logic**: không chạm DB, Redis, hub; nhận JSON vào, trả JSON + outcome ra. Đăng ký `AddSingleton` → phải stateless.
- **Services** (`RedisCacheService`, `RabbitMqPublisher`, `OpenSearchService`, `MinioStorageService`, `SmtpOtpSender`): hạ tầng thuần, không business logic.

## Luồng xử lý một nước đi (`MakeMove`) — thứ tự bắt buộc

1. **Validate bằng engine.** Không tin client gửi state hợp lệ.
2. **Ghi DB.** PostgreSQL là nguồn sự thật duy nhất — nếu bước này fail, coi như nước đi chưa xảy ra.
3. **(Cố gắng) cache Redis.** Bọc try-catch; fail thì log Warning rồi đi tiếp.
4. **Broadcast `GameStateUpdated`.** Luôn chạy nếu bước 2 thành công — không phụ thuộc bước 3.
5. **(Cố gắng) publish RabbitMQ.** Bọc try-catch; fail thì log rồi đi tiếp.

**Hạ tầng phụ (Redis/RabbitMQ/OpenSearch) không bao giờ được chặn luồng chính** — đây là nguyên nhân gốc của bug "không thể di chuyển quân" đã sửa (lỗi Redis từng chặn cả broadcast). Chi tiết bug: [`../history/decisions.md`](../history/decisions.md).

Không để exception thô propagate qua hub: engine bọc deserialization trong try-catch, trả `MoveOutcome(false, lý_do)`; hub chuyển lý do đó về client. Mọi đường thất bại đều trả **message rõ ràng** — không nuốt im lặng.

## Ghế: 2 người vs N người (từ khi có Bang, 2026-08-05)

`GameRoom` hỗ trợ song song hai mô hình ghế, chọn theo `engine.MaxPlayers` — **generic ở Platform**, không phải đặc thù của một game:

- **≤ 2 người** (VayBat): `RedPlayer`/`WhitePlayer` (tên hiển thị) + `RedPlayerId`/`WhitePlayerId` (user id — xác thực), side `"RED"`/`"WHITE"` — đường gốc, không đổi hành vi hiển thị.
- **> 2 người** (Bang): `SeatCount`/`SeatsJson` (tên hiển thị theo ghế) song song `SeatUserIdsJson` (user id theo ghế — xác thực), side `"P0".."P{N-1}"`. Số ghế chọn lúc tạo phòng qua `options.seatCount` (kẹp trong `[MinPlayers, MaxPlayers]`), xem `GamesController.ResolveSeatCount`.

Khi ghế N-người đủ, `GameHub` gọi `engine.ApplyMove(...)` với **side đặc biệt `"SYSTEM"`** và moveJson `{"type":"__start_game__","seats":[...]}` — đây là quy ước Platform để engine tự chia state ban đầu (vai trò/nhân vật/bài với Bang) khi đã biết đủ tên người chơi thật (điều `NewGame()` chưa biết được, vì gọi trước khi ai vào phòng). `seats` gửi cho engine là TÊN HIỂN THỊ (engine chỉ cần text để hiện, không cần user id). Engine ≤2 người không cần hiểu quy ước này (Hub không bao giờ gửi cho chúng).

## Danh tính ghế: lấy từ JWT, không tin client (từ 2026-08-05)

`GameHub` và `GamesController` đều có `[Authorize]`. `JoinRoom`/`MakeMove` **không nhận tham số `playerName`** — danh tính (`Guid` user id + display name) luôn lấy từ `Context.User` qua `ClaimsPrincipalExtensions.TryGetUserId()`/`GetDisplayName()` (`Platform/Auth/`).

- Cột `RedPlayer`/`WhitePlayer`/`SeatsJson` (tên hiển thị) tách hẳn khỏi `RedPlayerId`/`WhitePlayerId`/`SeatUserIdsJson` (user id — nguồn xác thực thật). `GameHub.ResolveSide`/`JoinTwoSeat`/`JoinMultiSeat` so khớp bằng **id**, chỉ cập nhật tên hiển thị song song cho UI.
- Bài học: trước đây hub tin `playerName` do client tự gửi trong mỗi lời gọi để gán/khớp ghế — dù app đã có JWT, hub chưa từng dùng nó. Bất kỳ ai gọi `JoinRoom`/`MakeMove` với đúng chuỗi tên là ngồi được ghế người khác hoặc đi quân thay họ. Chi tiết ADR: [`../history/decisions.md`](../history/decisions.md).
- Áp dụng cho MỌI game (generic ở Platform) — engine không cần biết gì về cơ chế này.

## Thông tin ẩn: state RIÊNG cho từng người xem (từ khi có Bang, 2026-08-05)

`GameHub` không còn broadcast một bản JSON y hệt cho cả phòng — mỗi connection nhận state đã qua `IGameEngine.RedactStateForViewer(stateJson, side)` (default interface method: trả nguyên state nếu engine không override, như VayBat). Cơ chế:

- Hub giữ map tĩnh `connectionId -> (roomId, userId)` (cập nhật lúc `JoinRoom`/`LeaveRoom`/`OnDisconnectedAsync`) — **userId từ JWT**, không phải tên client tự gửi.
- Sau mỗi thay đổi state, hub lặp qua các connection của phòng, tính `side` của từng người (theo user id), gọi `RedactStateForViewer`, gửi riêng bằng `Clients.Client(connectionId)` thay vì `Clients.Group(roomId)`.
- Engine có thông tin ẩn (Bang) tự xây payload riêng (bài/vai trò của người khác không bao giờ được serialize ra, không chỉ ẩn bằng CSS) — xem `BangRules.BuildViewerPayload`.

## Vòng đời phòng chơi: `Waiting` → `Playing` → `Finished` (từ 2026-08-05)

- `Finished` không chỉ nghĩa "đã chơi xong" — còn dùng cho **phòng bị huỷ** (`POST /api/games/{id}/cancel`, chủ phòng huỷ khi còn `Waiting`) và **phòng bỏ dở tự dọn** (`Services/StaleRoomCleanupService`, `BackgroundService` chạy mỗi 5 phút, đánh dấu `Finished` mọi phòng `Waiting` không đổi gì quá 30 phút). Cả hai đều tái dùng đúng status có sẵn — `GamesController.List()` đã lọc `Status != Finished` nên phòng tự biến mất khỏi sảnh, không cần thêm status hay sửa chỗ khác.
- Lý do chọn tái dùng `Finished` thay vì thêm status mới (`Cancelled`/`Abandoned`): giữ tập giá trị `Status` nhỏ, mọi nơi đã xử lý "phòng kết thúc" (ẩn khỏi sảnh, board hiện đúng trạng thái) tự động đúng luôn, không cần rà lại từng chỗ so sánh chuỗi status.

## Toàn bộ luồng qua hạ tầng (mẫu Hello World / VayBat)

```
Client gửi ý định đi → Backend (C# Rule Engine validate) → PostgreSQL (room + replay)
  → Redis (cache state) → RabbitMQ (event) → [khi kết thúc] OpenSearch (index) + MinIO (replay)
  → SignalR (broadcast state cho cả phòng) → React board
```

Rule Engine chạy ở server (`Games/<Game>/<Game>Rules.cs`) — chống gian lận, đảm bảo tất định. Client chỉ có bản engine "nhẹ" để gợi ý UI; server luôn validate lại.

## Middleware & Program.cs

- Thứ tự pipeline chuẩn: exception handling → CORS → routing → auth → endpoint/hub.
- CORS mở cho origin frontend (dev: `http://localhost:5173`, cộng `WEB_BASE_URL` từ env) và bật credentials (bắt buộc cho SignalR + cookie auth).
- Schema bootstrap bằng raw SQL trong `Program.cs` — không `EnsureCreated()`/migration, xem [`database.md`](./database.md).
- `TokenService` (JWT) khởi tạo **eagerly** lúc boot, không lazy qua DI — config sai (secret rỗng/ngắn) làm app chết ngay lúc start với message rõ, không đợi đến request đầu tiên.

## Auth architecture

Đăng nhập OTP qua email, JWT trong cookie `HttpOnly`. `Platform/Auth/` chứa `AuthController`, `TokenService`, entity `AuthOtp`/`AppUser`. Chi tiết luồng và quy tắc bảo mật: [`../coding/security.md`](../coding/security.md).

## Async

Toàn bộ I/O là `async/await`; không `.Result`/`.Wait()`. Method hub trả `Task`, không `async void`.
