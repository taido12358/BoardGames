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

## Ghế: một mô hình DUY NHẤT cho mọi game (từ rebuild 2026-09-05)

`GameRoom.SeatsJson` (jsonb) là mảng `SeatSlot?` độ dài cố định = `SeatCount`, dùng cho MỌI game kể cả VayBat (`SeatCount=2`) — không còn rẽ nhánh `engine.MaxPlayers <= 2` ở Platform. Mỗi phần tử `null` (ghế trống) hoặc `SeatSlot { UserId, DisplayName, Connected, LastSeenAt }` (`Platform/Models/SeatSlot.cs`, mã hoá/giải mã qua `SeatCodec`).

- `IGameEngine.SideForSeat(int seatIndex)` (default `$"P{index}"`) là nơi DUY NHẤT quyết định "side" ứng với 1 chỉ số ghế — Platform không còn biết/quan tâm "RED"/"WHITE" hay "P0".."P{N-1}" nghĩa là gì. `VayBatEngine` override index 0→`"RED"`, 1→`"WHITE"` để giữ nguyên hành vi/contract cũ với `VayBatRules`/frontend `VayBatBoard`.
- Số ghế chọn lúc tạo phòng qua `options.seatCount` (kẹp trong `[MinPlayers, MaxPlayers]`) — logic nằm trong `RoomService.ResolveSeatCount` (trước đây là `GamesController.ResolveSeatCount`).
- Khi ghế đủ (không còn `null`), `RoomService.MaybeStartGame` gọi `engine.OnRoomFull(mapJson, stateJson, seatDisplayNames)` — thay thế hoàn toàn quy ước ngầm cũ (side `"SYSTEM"` + `moveJson.type=="__start_game__"`, chỉ tồn tại trong comment chứ không phải type-safe). Mặc định (VayBat): không làm gì, `NewGame()` đã đủ để chơi ngay. Bang override để chia bài/vai trò khi đã biết tên thật mọi người.
- Đây là ADR thay thế (supersedes) ADR "Ghế generic — 2 mô hình song song" 2026-08-05 — xem [`../history/decisions.md`](../history/decisions.md).

## Danh tính ghế: lấy từ JWT, không tin client (từ 2026-08-05, không đổi khi rebuild 2026-09-05)

`GameHub` và `GamesController` đều có `[Authorize]`. `JoinRoom`/`MakeMove`/`QuickMatch` **không nhận tham số `playerName`/`userId`** — danh tính (`Guid` user id + display name) luôn lấy từ `Context.User`/`User` qua `ClaimsPrincipalExtensions.TryGetUserId()`/`GetDisplayName()` (`Platform/Auth/`).

- `SeatSlot.UserId` (xác thực, từ JWT) và `SeatSlot.DisplayName` (chỉ để hiển thị) nằm trong CÙNG một object nhưng vai trò tách biệt — mọi so khớp ghế (`RoomService.AssignSeat`/`ResolveSide`) đều so bằng `UserId`, không bao giờ so tên. `RoomDto`/`SeatSlotDto` gửi ra client **không bao giờ** chứa `UserId` thô (chỉ `DisplayName`/`Connected`/`LastSeenAt`) — tránh lộ định danh nội bộ, và tránh việc frontend lại quay về so sánh theo tên như trước.
- `GameRoom.OwnerUserId` (mới, tường minh) thay cho suy luận "chủ phòng = ai ở ghế 0" trước đây — `RoomService.CancelRoomAsync` check thẳng `room.OwnerUserId == userId`.
- Bài học gốc (2026-08-05): trước đây hub tin `playerName` do client tự gửi để gán/khớp ghế — dù app đã có JWT, hub chưa từng dùng nó. Chi tiết ADR: [`../history/decisions.md`](../history/decisions.md).
- Áp dụng cho MỌI game (generic ở Platform) — engine không cần biết gì về cơ chế này.

## `RoomService` — một chỗ duy nhất cho logic phòng/ghế/ván (từ rebuild 2026-09-05)

Trước rebuild, `GameHub` và `GamesController` mỗi nơi tự rẽ nhánh `engine.MaxPlayers <= 2` riêng (4 bản sao). `Platform/RoomService.cs` (scoped) gom toàn bộ: `CreateRoomAsync`, `JoinRoomAsync`, `MakeMoveAsync`, `CancelRoomAsync`, `QuickMatchAsync`, `ApplySeatTimeoutAsync`, `MarkSeatDisconnectedAsync`. RoomService **không chứa side-effect SignalR/Redis/RabbitMQ** — `GameHub`/`GamesController`/`SeatTimeoutService` gọi xuống rồi tự lo phần transport/best-effort của mình sau khi RoomService trả kết quả (giữ đúng thứ tự bắt buộc ở trên: validate → ghi DB trong RoomService → cache/broadcast/publish ở nơi gọi). Khoá race dùng `SELECT ... FOR UPDATE` trong transaction EF (`JoinRoomAsync`/`MakeMoveAsync`/`CancelRoomAsync`/`ApplySeatTimeoutAsync`/`MarkSeatDisconnectedAsync`); `QuickMatchAsync` dùng `FOR UPDATE SKIP LOCKED` khi quét nhiều phòng ứng viên (khác `FOR UPDATE` chặn cứng vì ở đây không nhắm 1 phòng cụ thể).

## Mất kết nối / AFK giữa ván (từ rebuild 2026-09-05)

- `GameHub.OnDisconnectedAsync`: chỉ đánh dấu `SeatSlot.Connected=false` (qua `RoomService.MarkSeatDisconnectedAsync`) khi đó là **connection cuối cùng** của user trong phòng (nhiều tab của cùng người không bị coi là mất kết nối), rồi broadcast lại state để người còn lại thấy ngay.
- `Services/SeatTimeoutService.cs` (mới, `BackgroundService`, quét mỗi ~10s): ghế `Connected=false` quá `DisconnectGracePeriod` (45s) trong phòng `Playing` → gọi `IGameEngine.OnSeatTimedOut(mapJson, stateJson, side)`, engine tự quyết xử lý (VayBat: xử thua ngay vì chỉ 2 người, không thể tiếp tục; Bang: tự động kết thúc lượt nếu đang là lượt hành động của họ, tự áp dụng hệ quả "không đáp trả" nếu đang bị yêu cầu phản hồi — trả `Ok=false` nếu không liên quan, service thử lại lần quét sau). Nếu **mọi** ghế mất kết nối quá `AbandonedPlayingAfter` (10 phút) mà vẫn chưa có kết quả → `Status=Abandoned` (không ép `Winner` giả).
- `GameHub.LeaveRoom` (rời tạm thời, ví dụ bấm nút "Thoát") **không** vacate ghế và không đánh dấu mất kết nối — chỉ dọn `Groups`/map connection nội bộ. Ghế chỉ thật sự "mất" qua `OnDisconnectedAsync`/`SeatTimeoutService`.

## Ghép trận nhanh (từ rebuild 2026-09-05)

`POST /api/games/quick-match` (`{gameKey}`) → `RoomService.QuickMatchAsync`: quét tối đa 5 phòng `Waiting` cùng `gameKey` (cũ nhất trước), chọn phòng đầu tiên còn ghế trống; hết thì tạo phòng mới. Dùng `FOR UPDATE SKIP LOCKED` để nhiều người bấm "Tìm trận" cùng lúc không chặn nhau.

## Danh sách phòng realtime (từ rebuild 2026-09-05)

Group SignalR `"lobby"` (`GameHub.SubscribeLobby`/`UnsubscribeLobby`) thay cho polling `GET /api/games` định kỳ ở frontend. Mỗi khi phòng đổi trạng thái ảnh hưởng sảnh (tạo/đầy ghế/huỷ/kết thúc/dọn rác), nơi gây ra thay đổi phát `"LobbyUpdated"` (`RoomSummaryDto`) vào group này — `GamesController` qua `IHubContext<GameHub>` (REST không có `Clients` của riêng 1 lần gọi), `GameHub`/`SeatTimeoutService` qua `Clients`/`IHubContext<GameHub>` tương ứng. **Lưu ý quan trọng**: đây là broadcast dùng chung cho cả nhóm, server không biết đang gửi cho ai nên `IsMine` trong payload này LUÔN `false` — chỉ `GET /api/games` (REST, per-caller) mới có `IsMine` đúng theo từng người gọi; frontend không được ghi đè `isMine` đã biết bằng giá trị từ `LobbyUpdated`.

## Thông tin ẩn: state RIÊNG cho từng người xem (từ khi có Bang, 2026-08-05)

`GameHub` không còn broadcast một bản JSON y hệt cho cả phòng — mỗi connection nhận state đã qua `IGameEngine.RedactStateForViewer(stateJson, side)` (default interface method: trả nguyên state nếu engine không override, như VayBat). Cơ chế:

- Hub giữ map tĩnh `connectionId -> (roomId, userId)` (cập nhật lúc `JoinRoom`/`LeaveRoom`/`OnDisconnectedAsync`) — **userId từ JWT**, không phải tên client tự gửi.
- Sau mỗi thay đổi state, hub lặp qua các connection của phòng, tính `side` của từng người (theo user id), gọi `RedactStateForViewer`, gửi riêng bằng `Clients.Client(connectionId)` thay vì `Clients.Group(roomId)`.
- Engine có thông tin ẩn (Bang) tự xây payload riêng (bài/vai trò của người khác không bao giờ được serialize ra, không chỉ ẩn bằng CSS) — xem `BangRules.BuildViewerPayload`.

## Vòng đời phòng chơi: `Waiting` → `Playing` → `Finished` | `Cancelled` | `Abandoned` (5 giá trị từ rebuild 2026-09-05)

`Platform/Models/RoomStatus.cs` — hằng số + `IsOpen(status)` (= `Waiting`/`Playing`, dùng thay mọi chỗ trước đây so `!= "Finished"`):

- **`Finished`**: có kết quả thật (`Winner != null`) — chơi xong hoặc bị xử thua do timeout (`OnSeatTimedOut`). Chỉ trạng thái này mới index vào OpenSearch (lịch sử ván).
- **`Cancelled`**: chủ phòng tự huỷ lúc còn `Waiting` (`POST /api/games/{id}/cancel`).
- **`Abandoned`**: hệ thống tự dọn — phòng `Waiting` bỏ dở > 30 phút (`StaleRoomCleanupService`) HOẶC phòng `Playing` mà mọi ghế mất kết nối quá lâu không thể tự phân thắng thua (`SeatTimeoutService`, xem mục AFK ở trên).

Trước rebuild, cả 3 trường hợp trên đều dùng chung `Finished` (ADR cũ 2026-08-05, lý do lúc đó: giữ tập giá trị nhỏ). Rebuild 2026-09-05 tách riêng vì gộp chung làm lịch sử/OpenSearch lẫn lộn thắng-thua-thật với phòng bị huỷ/bỏ hoang — xem ADR mới trong [`../history/decisions.md`](../history/decisions.md). `GamesController.List()` lọc theo `RoomStatus.IsOpen` (allow-list `Waiting`/`Playing`) thay vì đen-list `!= Finished` — an toàn hơn khi có status mới sau này. `List()` cũng trả cả phòng `Playing` (không chỉ `Waiting`) để chủ ghế cũ có thể "vào lại ván đang chơi" nếu bị văng ra.

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
