# Decisions (ADR)

## ADR: Ô Ăn Quan — chọn biến thể "chỉ ăn 1 lần mỗi lượt" do luật dân gian có dị bản

Date: 2026-09-11

### Context

Thêm game thứ ba, "Ô Ăn Quan" (trò chơi dân gian Việt Nam). Trước khi viết luật, đã tra cứu 3
nguồn (Wikipedia tiếng Anh, Wikipedia tiếng Việt, một trang hướng dẫn) để xác nhận luật chính
xác — vì đây là trò chơi quen thuộc với người Việt, sai luật sẽ bị nhận ra ngay và khó sửa "cho
đúng" sau khi đã có người chơi thật trên đó.

Phát hiện: các nguồn KHÔNG thống nhất về "ăn liên hoàn" (chain capture). Wikipedia tiếng Anh
(trích dẫn nguyên văn) chỉ mô tả một lần ăn duy nhất mỗi lượt: *"When the next square to be
distributed is empty, the player wins all the pieces in the square after that."* — không nhắc gì
tới việc lặp lại. Wikipedia tiếng Việt có nhắc *"có thể ăn liên tiếp nếu điều kiện lặp lại"*
nhưng không mô tả chính xác cơ chế lặp lại đó là gì (đi tiếp bao xa, dừng khi nào).

### Decision

Chọn triển khai bản **chỉ ăn 1 lần mỗi lượt** (không ăn chuỗi/ăn liên hoàn nhiều ô liên tiếp
trong cùng một lượt) — khớp với mô tả chắc chắn nhất (Wikipedia tiếng Anh, trích dẫn nguyên
văn), ghi rõ đây là lựa chọn có chủ đích trong comment đầu `OAnQuanRules.cs` và trong
`rules/tasks/backlog.md`, không lặng lẽ implement một cơ chế "ăn chuỗi" tự đoán mà không chắc
đúng luật dân gian thật.

Các quyết định luật khác cũng chọn theo cùng tinh thần "chọn bản chắc chắn đúng, ghi rõ lựa
chọn khi có dị bản":
- Quân "quan" ban đầu = 10 quân (một biến thể phổ biến; biến thể khác dùng 5) — không nguồn nào
  mâu thuẫn nhau về SỐ, chỉ khác nhau GIÁ TRỊ mặc định, nên đây là lựa chọn ít rủi ro hơn "ăn
  chuỗi".
- Rải quân dừng ĐÚNG vào một ô quan luôn kết thúc lượt ngay lập tức (không ăn, không bốc tiếp
  rải dù ô quan đó đã có sẵn quân) — cả 3 nguồn đồng thuận về điểm này, không phải lựa chọn có
  tranh cãi.

### Alternatives

- Implement "ăn chuỗi" theo suy đoán cách hiểu hợp lý nhất (lặp lại kiểm tra "ô trống rồi ô đầy"
  xa dần) — bị loại vì không có nguồn nào mô tả đủ chi tiết để tự tin đúng luật dân gian thật;
  rủi ro implement sai một luật mà người chơi Việt Nam đã quen thuộc cao hơn giá trị thêm được.

### Reason

Đây là trò chơi dân gian có tính "phải đúng luật quen thuộc" cao hơn các game tự thiết kế khác
trong repo (VayBat/Bang là luật do dự án tự định nghĩa, không có "đúng/sai" tuyệt đối so với một
chuẩn bên ngoài) — ưu tiên một phiên bản CHẮC CHẮN ĐÚNG (dù đơn giản hơn) thay vì một phiên bản
đầy đủ hơn nhưng có rủi ro sai lệch so với luật thật mà không ai kiểm chứng được ngay.

### Consequences

Nếu sau này có người chơi phản hồi rằng thiếu "ăn chuỗi" so với luật họ quen chơi, cân nhắc thêm
lại như một tuỳ chọn luật (không phải mặc định) sau khi tìm được nguồn mô tả chính xác cơ chế —
không tự đoán lại. Việc này không phải bug, đã ghi rõ trong `rules/tasks/backlog.md`.

---

## ADR: Role "Admin" đầu tiên trong hệ thống — claim JWT lúc đăng nhập, không phải cột DB

Date: 2026-09-10

### Context

Chỉ thị `/goal` yêu cầu "code lại giao diện quản lý game" — repo trước đó không có khái niệm
role/quyền quản trị nào (chỉ có "chủ phòng" — quyền theo TỪNG phòng, không toàn cục). Cần một
trang quản trị xem tổng quan phòng/ván toàn hệ thống, và cần quyết định: quyền admin xác định
bằng gì?

`rules/coding/security.md` mục "Phân quyền" đã ghi sẵn định hướng cho tình huống này (viết
trước khi tính năng này tồn tại): *"Role quản trị (khi thêm...): định nghĩa ở tầng auth (claim
trong token), kiểm tra bằng policy/`[Authorize(Roles=...)]` — không hard-code danh sách tên
trong logic."*

### Decision

- Danh sách admin cấu hình qua env `ADMIN_EMAILS` (CSV, rỗng mặc định — xem `.env.example`).
- `TokenService.CreateToken` đọc danh sách này **1 lần lúc boot** (constructor), gắn claim
  `ClaimTypes.Role = "Admin"` vào JWT **lúc đăng nhập** nếu email khớp — không phải cột DB mới
  trên `AppUser`, không phải kiểm tra config lại mỗi request trong controller.
- `AdminController` dùng `[Authorize(Roles = "Admin")]` chuẩn ASP.NET Core cho các endpoint cần
  quyền (`rooms`, `stats`); endpoint `check` (dùng để ẩn/hiện UI) chỉ cần `[Authorize]` thường,
  trả `isAdmin: User.IsInRole("Admin")` cho bất kỳ ai đăng nhập.
- Ghi claim bằng **`ClaimTypes.Role` (URI đầy đủ)**, không dùng tên ngắn `"role"` — pipeline JWT
  của app (`AddJwtBearer` + `TokenValidationParameters` tự chế, không cấu hình
  `MapInboundClaims` tường minh) không đảm bảo tự map tên ngắn chuẩn JWT sang URI .NET lúc đọc
  lại token (dấu hiệu: `ClaimsPrincipalExtensions.TryGetUserId` đã phải kiểm cả `ClaimTypes.NameIdentifier`
  lẫn `"sub"` phòng hờ, thay vì tin tưởng mapping xảy ra). Ghi thẳng URI đầy đủ thì
  `[Authorize(Roles=...)]`/`User.IsInRole` khớp được bất kể có mapping hay không — an toàn hơn
  là giả định hành vi mapping của handler đang dùng.
- Verify bằng test round-trip THẬT qua `JwtSecurityTokenHandler.ValidateToken` (không chỉ gọi
  `CreateToken` rồi đọc field nội bộ) — `TokenServiceTests.cs`, vì đây là claim quyết định
  authorization có hoạt động đúng hay không, sai sót ở đây khó phát hiện qua code review thường.

### Alternatives

- Cột `IsAdmin`/`Role` trên bảng `Users` — bị loại: cần thay đổi schema (dự án không dùng
  migration, mọi đổi schema phải backward-compatible và rất thận trọng sau sự cố mất dữ liệu dev
  thật 2026-09-05), và cần thêm UI/API để gán quyền (vòng lặp "ai cấp quyền cho ai" khi chưa có
  admin nào) — quá nhiều cho nhu cầu hiện tại (một vài người vận hành biết trước).
- Kiểm tra `ADMIN_EMAILS` trực tiếp trong từng action của `AdminController` (so sánh email mỗi
  request) — bị loại vì đúng là "hard-code danh sách tên trong logic" mà security.md đã cảnh
  báo tránh; cũng không tận dụng được cơ chế `[Authorize(Roles=...)]` có sẵn của framework.

### Reason

Theo đúng định hướng đã ghi sẵn trong `rules/coding/security.md` trước khi tính năng này được
làm — tận dụng cơ chế role/claim chuẩn của ASP.NET Core thay vì tự chế kiểm tra quyền rải rác,
và tránh đổi schema DB cho một tính năng có thể chưa cần thiết lâu dài.

### Consequences

- Đổi `ADMIN_EMAILS` chỉ có hiệu lực từ **lần đăng nhập MỚI** — token cũ (còn hạn tới 7 ngày,
  xem `Jwt:ExpireDays`) giữ nguyên role lúc phát hành. Người vừa được thêm vào danh sách phải
  đăng xuất/đăng nhập lại mới thấy mục "Quản trị".
- Role thêm sau (nếu có, vd "Moderator") nên theo cùng pattern claim + `[Authorize(Roles=...)]`
  — không quay lại kiểu kiểm tra config thủ công.
- `AdminController` hiện CHỈ đọc (không có thao tác phá huỷ) — mở rộng thêm hành động phá huỷ
  (huỷ phòng bất kỳ…) phải log ai-làm-gì-lúc-nào theo đúng security.md, và nên hỏi xác nhận
  trước khi làm (bài học sự cố mất dữ liệu 2026-09-05).

---

## ADR: Rebuild cơ chế phòng/ghép trận — hợp nhất mô hình ghế + `SideForSeat`/`OnRoomFull`/`OnSeatTimedOut`

Date: 2026-09-05

### Context

Người dùng nhận định "web chưa hợp lý" và yêu cầu xây lại từ đầu cơ chế phòng/ghép trận. Khảo sát xác nhận: `GameRoom` có 2 mô hình ghế song song (`RedPlayer(Id)`/`WhitePlayer(Id)` cho ≤2 người, `SeatCount/SeatsJson/SeatUserIdsJson` cho >2 người), buộc `GameHub`/`GamesController` rẽ nhánh `engine.MaxPlayers <= 2` ở 4 chỗ khác nhau (`JoinRoom`, `MakeMove`/`ResolveSide`, `Create`, `Cancel`). Quy ước "phòng vừa đủ ghế" cho game N người dùng side đặc biệt `"SYSTEM"` + `moveJson.type=="__start_game__"` — chỉ tồn tại trong comment, không type-safe.

### Decision

**Supersedes ADR "Ghế generic (SeatCount/SeatsJson) cho game > 2 người, song song với RedPlayer/WhitePlayer" (2026-08-05, bên dưới)** — thời điểm đó cố tình giữ 2 đường song song để "không phá VayBat" khi mới thêm Bang; nay hợp nhất hẳn về 1 đường vì đã có `IGameEngine.SideForSeat` làm lớp dịch, không cần giữ đường cũ nữa.

- `GameRoom.SeatsJson` là mảng `SeatSlot?` (`{UserId, DisplayName, Connected, LastSeenAt}`) độ dài = `SeatCount`, dùng cho MỌI game kể cả VayBat. Xoá `RedPlayer(Id)`/`WhitePlayer(Id)`/`SeatUserIdsJson`.
- Thêm `IGameEngine.SideForSeat(int seatIndex)` (default `$"P{index}"`) — `VayBatEngine` override 0→"RED", 1→"WHITE" để giữ nguyên contract với `VayBatRules`/frontend.
- Thêm `IGameEngine.OnRoomFull(mapJson, stateJson, seatDisplayNames)` thay quy ước ngầm `side="SYSTEM"` — `BangEngine` override để chia bài/vai trò (giữ nguyên `ApplyMove` xử lý `side=="SYSTEM"` cho tương thích ngược với test hiện có, nhưng entry point chính thức giờ là `OnRoomFull`).
- Thêm `IGameEngine.OnSeatTimedOut(mapJson, stateJson, side)` cho cơ chế AFK (xem ADR riêng bên dưới).
- Thêm `Platform/RoomService.cs` gom toàn bộ logic join/create/cancel/quick-match/timeout — `GameHub`/`GamesController` chỉ còn là lớp transport mỏng gọi xuống.
- Thêm `GameRoom.OwnerUserId` tường minh, thay suy luận "chủ phòng = ai ở ghế 0".

### Alternatives rejected

- Giữ 2 mô hình song song, chỉ thêm `SideForSeat` cho phần hiển thị — loại vì không giải quyết gốc vấn đề (Hub/Controller vẫn phải rẽ nhánh để biết đọc cột nào).
- Đổi hẳn `moveJson.type=="__start_game__"` thành convention mạnh hơn (vd enum move type dùng chung) thay vì method riêng trên interface — loại vì Platform vẫn phải biết cấu trúc `moveJson` của từng game, vi phạm nguyên tắc "Platform không biết game cụ thể".

### Reason

`SideForSeat` là lớp dịch mỏng đủ để Platform hoàn toàn generic mà không cần engine đổi vocabulary side đang dùng — rủi ro thấp, không phá gameplay VayBat/Bang (đã verify: 97/97 test cũ + mới pass, side "RED"/"WHITE" không đổi phía engine/frontend).

### Consequences

Migration dữ liệu cũ cần backfill `SeatsJson`/`OwnerUserId` từ cột cũ trước khi xoá cột (raw SQL idempotent trong `Program.cs`, guard bằng kiểm tra `information_schema.columns` vì cột cũ sẽ không còn ở lần chạy sau). Phòng tạo trước rebuild thiếu `RedPlayerId`/`SeatUserIdsJson` (đã mất từ fix JWT 2026-08-05 hoặc cũ hơn) → `OwnerUserId` vẫn `NULL` sau backfill — chấp nhận (dữ liệu test/dev), đúng tiền lệ ADR "Danh tính ghế" bên dưới.

## ADR: Tách `Cancelled`/`Abandoned` khỏi `Finished`

Date: 2026-09-05

### Context

Trước rebuild, cả "chơi xong thật" (`MakeMove` trả `Winner`), "chủ phòng tự huỷ" (`Cancel`), và "hệ thống dọn rác" (`StaleRoomCleanupService`) đều set `Status="Finished"` — không phân biệt được sau khi đã xảy ra, làm lịch sử/OpenSearch lẫn lộn thắng-thua-thật với rác dọn dẹp.

### Decision

`RoomStatus` có 5 giá trị: `Waiting|Playing|Finished|Cancelled|Abandoned`. `Cancel` → `Cancelled`. `StaleRoomCleanupService` (phòng `Waiting` bỏ dở) và cơ chế AFK mới (phòng `Playing` mọi ghế mất kết nối quá lâu không thể tự phân thắng thua, xem `SeatTimeoutService`) → `Abandoned`. Chỉ `Finished` mới index vào OpenSearch. `GamesController.List()` đổi từ đen-list (`!= Finished`) sang allow-list `RoomStatus.IsOpen` (`Waiting`/`Playing`).

### Alternatives rejected

Giữ nguyên gộp chung `Finished`, chỉ thêm field `CancelReason` riêng — loại vì vẫn phải sửa mọi nơi đọc `Status` để phân biệt, phức tạp hơn việc tách hẳn giá trị.

### Reason

Tách giá trị rõ ràng hơn field phụ, và allow-list an toàn hơn đen-list khi thêm status mới về sau (quên thêm status mới vào đen-list sẽ vô tình hiện phòng đó trong sảnh; quên thêm vào allow-list chỉ làm phòng đó bị ẩn — an toàn hơn).

### Consequences

Phòng cũ đã bị đánh dấu `Finished` trước rebuild (do huỷ hoặc dọn rác) KHÔNG được hồi tố phân loại lại — chấp nhận nhầm lẫn lịch sử, chỉ áp dụng phân loại mới từ thời điểm deploy.

## ADR: Cơ chế mất kết nối/AFK giữa ván (`SeatTimeoutService` + `IGameEngine.OnSeatTimedOut`)

Date: 2026-09-05

### Context

Trước rebuild, `GameHub.OnDisconnectedAsync`/`LeaveRoom` chỉ dọn map connection nội bộ — không đụng DB, không báo phòng, không có timeout. Người giữ lượt rớt mạng làm ván kẹt vĩnh viễn, đặc biệt Bang (có tình huống chờ đúng người phản hồi Bang!/Đấu súng/Người da đỏ/Súng Gatling).

### Decision

`SeatSlot.Connected`/`LastSeenAt` theo dõi trạng thái kết nối từng ghế. `GameHub.OnDisconnectedAsync` đánh dấu `Connected=false` khi là connection cuối cùng của user trong phòng, broadcast ngay. `Services/SeatTimeoutService.cs` (`BackgroundService`, quét ~10s) sau `DisconnectGracePeriod` (45s) gọi `IGameEngine.OnSeatTimedOut(map, state, side)` — engine tự quyết (Platform không biết luật cụ thể): VayBat xử thua ngay (2 người, không thể tiếp tục); Bang tự động kết thúc lượt nếu đang là lượt hành động, tự áp dụng hệ quả "không đáp trả" có sẵn trong luật nếu đang bị yêu cầu phản hồi, no-op nếu không liên quan. Sau `AbandonedPlayingAfter` (10 phút) mọi ghế vẫn mất kết nối mà chưa có kết quả → `Status=Abandoned`.

### Alternatives rejected

Timer per-room (`System.Threading.Timer` riêng mỗi phòng) — loại vì mất state khi restart app, không nhất quán với pattern `BackgroundService` quét định kỳ đã dùng cho `StaleRoomCleanupService`.
Bang tự chế move giả `RESPOND`/`END_TURN` đi qua `HandleMove` public (validate quyền như người chơi thật gọi) — loại vì phức tạp không cần thiết, `OnSeatTimedOut` gọi thẳng logic nội bộ đã có.

### Reason

Đặt hook ở `IGameEngine` (không xử lý cứng trong Platform) đúng nguyên tắc "Platform không biết game cụ thể" — chỉ engine mới biết "một ghế biến mất" nghĩa là gì trong luật của nó.

### Consequences

Người rớt mạng dài hạn trong Bang: mỗi lần tới lượt/bị nhắm lại tự động bỏ qua/nhận hệ quả mặc định — KHÔNG có cơ chế "loại khỏi ván" (ghi vào backlog nếu cần làm sau, tránh scope creep lần này).

## ADR: Ghép trận nhanh dùng `FOR UPDATE SKIP LOCKED`; sảnh realtime qua group SignalR `"lobby"`

Date: 2026-09-05

### Context

Trước rebuild không có "ghép trận nhanh" nào; danh sách phòng chỉ polling `GET /api/games` (2 vòng lặp độc lập, khác nhịp, ở `GameLibrary.tsx` và `GameDetails.tsx`).

### Decision

`POST /api/games/quick-match` → `RoomService.QuickMatchAsync`: quét tối đa 5 phòng `Waiting` cùng `gameKey` (cũ nhất trước) bằng `SELECT ... FOR UPDATE SKIP LOCKED`, chọn phòng đầu còn ghế trống, hết thì tạo mới. `SKIP LOCKED` (khác `FOR UPDATE` chặn cứng của `JoinRoom`/`MakeMove`) vì đây quét nhiều ứng viên — cần bỏ qua row đang bị transaction khác khoá thay vì chờ, tránh 2 người quick-match cùng lúc chặn nhau.

Sảnh: group SignalR `"lobby"` (`GameHub.SubscribeLobby`/`UnsubscribeLobby`), event `"LobbyUpdated"` (`RoomSummaryDto`) phát mỗi khi phòng đổi trạng thái ảnh hưởng sảnh. Frontend bỏ hẳn 2 vòng poll, dùng `useLobbyHub`.

### Alternatives rejected

`FOR UPDATE` thường (chặn cứng) cho quick-match — loại vì quét nhiều candidate cùng lúc, 2 người quick-match đồng thời sẽ xếp hàng chờ nhau không cần thiết.
Group riêng theo từng `gameKey` (`lobby:<gameKey>`) — loại vì đơn giản hơn khi dùng 1 group chung, payload đã có `gameKey` để client tự lọc, và số phòng thay đổi trong 1 khoảng thời gian là nhỏ (quy mô dự án hiện tại).

### Reason

Tái dùng đúng transaction pattern đã có (`FOR UPDATE`) nhưng đổi chế độ khoá phù hợp với truy vấn nhiều-ứng-viên; SignalR group đã sẵn có hạ tầng (kết nối dùng chung `useGameRoomHub`), không cần thêm cơ chế polling/WebSocket riêng.

### Consequences

`LobbyUpdated` là broadcast dùng chung — `IsMine` trong đó LUÔN `false` (server không biết gửi cho ai trong 1 broadcast group). Frontend (`gameStore.upsertRoom`) không được ghi đè `isMine` đã biết bằng giá trị từ sự kiện này — chỉ REST per-caller mới đáng tin cho field đó. Đây là điểm dễ tưởng nhầm là bug khi đọc code lần đầu — đã ghi rõ trong comment `GamesController.PublishLobbyUpdated`.

## ADR: Danh tính ghế lấy từ JWT (`Context.User`), không tin `playerName` client gửi

Date: 2026-08-05

### Context

Rà soát luồng "ghép phòng/vào phòng" theo yêu cầu người dùng, phát hiện: `GameHub.JoinRoom`/`MakeMove` nhận `playerName` làm THAM SỐ từ client và dùng thẳng để gán/khớp ghế — dù app đã có đăng nhập JWT (từ 2026-07-05) và cookie đã có sẵn trên mọi request tới hub. Hệ quả: bất kỳ ai gọi hub trực tiếp (qua devtools/script) với đúng chuỗi tên là ngồi được vào ghế người khác hoặc gửi nước đi thay họ — dù đã đăng nhập hay chưa (Hub/Controller không có `[Authorize]`). Đây đúng là lớp lỗi mà việc thêm auth được kỳ vọng giải quyết (xem ADR "playerName tự nhập" bên dưới) nhưng `GameHub` chưa từng được cập nhật để thực sự dùng nó.

### Decision

Thêm `[Authorize]` cho `GameHub` và `GamesController`. `JoinRoom(roomId)`/`MakeMove(roomId, moveJson)` bỏ hẳn tham số `playerName` — danh tính (user id + display name) luôn lấy từ `Context.User`/`User` (JWT cookie, qua `ClaimsPrincipalExtensions` mới). `GameRoom` thêm cột song song: `RedPlayerId`/`WhitePlayerId`/`SeatUserIdsJson` (user id — nguồn xác thực) tách khỏi `RedPlayer`/`WhitePlayer`/`SeatsJson` (tên hiển thị, giữ nguyên cho UI).

### Alternatives

- Đổi hẳn `RedPlayer`/`SeatsJson` từ tên hiển thị sang user id, bỏ cột tên — bị loại vì UI (lobby, board, log) đang hiển thị trực tiếp các cột này; đổi kiểu dữ liệu sẽ phải sửa toàn bộ nơi hiển thị cùng lúc, rủi ro cao hơn nhiều so với thêm cột song song.
- Chỉ thêm `[Authorize]` mà vẫn giữ `playerName` tham số (dùng JWT chỉ để xác nhận "đã đăng nhập", không dùng để xác định "đăng nhập với ai") — bị loại vì không giải quyết vấn đề gốc: request vẫn có thể tự xưng bất kỳ tên nào.

### Reason

Tách "tên hiển thị" (đổi được, trùng được, chỉ để UI đọc) khỏi "danh tính xác thực" (user id ổn định từ JWT, không đổi được) là đúng nguyên tắc bảo mật chuẩn — đồng thời không phá bất kỳ UI nào đang hiển thị tên, vì cột tên hiển thị vẫn còn nguyên, chỉ không còn là nguồn xác thực.

### Consequences

- Phòng tạo TRƯỚC bản fix này (không có `RedPlayerId`/`SeatUserIdsJson`) sẽ mất gắn kết chủ cũ — người join tiếp theo sẽ "chiếm" ghế vì cột id đang `null`. Chấp nhận được vì đây là dữ liệu test/dev tại thời điểm sửa, không có dữ liệu người dùng thật cần giữ.
- Mọi lời gọi `POST /api/games`, `GET /api/games*`, `/hubs/game` giờ đều yêu cầu đăng nhập — đúng với thực tế app đã luôn yêu cầu đăng nhập trước khi vào màn game (`App.tsx`), không mất khả năng dùng nào.
- Engine (`IGameEngine`) không cần biết gì về cơ chế này — vẫn chỉ nhận `side` dạng chuỗi như trước, không đổi contract.

---

## ADR: Dọn phòng "Waiting" bỏ dở + cho phép chủ phòng tự huỷ

Date: 2026-08-05

### Context

Cùng đợt rà soát ghép phòng: DB thực tế có nhiều phòng `Waiting` tồn tại hàng giờ (từ các phiên test trước), không ai dọn, hiển thị lẫn với phòng thật trong sảnh gây nhiễu. Không có cách nào để chủ phòng tự huỷ phòng mình lỡ tạo.

### Decision

Thêm `StaleRoomCleanupService` (`BackgroundService`, chạy mỗi 5 phút): đánh dấu `Finished` mọi phòng `Waiting` không đổi gì quá 30 phút. Thêm `POST /api/games/{id}/cancel`: chủ phòng (so theo user id, không phải tên) huỷ được phòng của mình khi còn `Waiting` → cũng đánh dấu `Finished`.

### Alternatives

- Xoá hẳn phòng khỏi DB thay vì đánh dấu `Finished` — bị loại vì phá khả năng xem lại lịch sử/replay, và không cần thiết (đánh dấu `Finished` đã đủ để ẩn khỏi sảnh).
- Dọn phòng ngay trong `GamesController.List()` (lazy, không cần BackgroundService) — cân nhắc nhưng chọn BackgroundService vì dọn được cả những phòng không ai bao giờ gọi `List()` nữa (game key hiếm người chơi), và tách trách nhiệm rõ ràng (đọc danh sách khác với dọn dữ liệu).

### Reason

Tái dùng status `Finished` có sẵn (không thêm giá trị status mới) giữ mọi nơi đã xử lý "phòng kết thúc" tự động đúng, không cần rà lại từng chỗ so sánh chuỗi status.

### Consequences

30 phút là ngưỡng cố định — nếu sau này có game chơi lâu hơn hoặc cần ngưỡng khác theo từng game, phải tham số hoá `StaleAfter` (hiện đang hard-code, generic cho mọi game).

---

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
