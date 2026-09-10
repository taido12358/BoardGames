# Backlog

Việc chưa làm, chưa có ai nhận. Không phải kế hoạch chi tiết — chỉ liệt kê để không quên.

## Ghép phòng / vào phòng — Giai đoạn 2 & 3 — ĐÃ LÀM (2026-09-05, rebuild toàn bộ cơ chế phòng/ghép trận)

Giai đoạn 1 (bảo mật danh tính ghế + dọn phòng rác + huỷ phòng, 2026-08-05) đã xong trước đó.
Giai đoạn 2 & 3 (ghép trận nhanh, danh sách phòng realtime, xử lý mất kết nối/AFK) + rebuild
cấu trúc code Platform + rebuild UI đã hoàn tất trong 1 đợt duy nhất — xem
[`../history/milestones.md`](../history/milestones.md) và ADR liên quan trong
[`../history/decisions.md`](../history/decisions.md).

**Đơn giản hoá có chủ đích:**
- Bang AFK dài hạn: mỗi lần tới lượt/bị nhắm, người rớt mạng tự động bỏ qua/nhận hệ quả mặc
  định (`IGameEngine.OnSeatTimedOut`) — KHÔNG có cơ chế "loại hẳn khỏi ván" (vd out khỏi vòng
  chơi, chuyển máy chủ điều khiển bot). Nếu về sau thấy cần, làm thêm ở `BangEngine`/`BangRules`,
  không cần đổi Platform.
- `SeatTimeoutService` quét toàn bộ phòng `Playing` mỗi ~10s (không index theo phòng có ghế
  disconnect) — chấp nhận ở quy mô hiện tại (đúng tiền lệ đã chấp nhận cho `BroadcastState`
  quét theo connection trước đây); cần tối ưu nếu số phòng đồng thời lớn lên nhiều.
- Chưa có test tích hợp chạm Postgres thật cho `RoomService`/khoá `FOR UPDATE`/`SKIP LOCKED`
  (project chưa có tiền lệ test chạm DB, chỉ test luật thuần) — chỉ verify thủ công qua
  Docker Compose. Nợ kỹ thuật, nên bổ sung Testcontainers nếu làm tiếp phần này.

## Game thứ hai — BANG! — ĐÃ LÀM (2026-08-05)

~~Game hidden-role kiểu BANG!~~ đã triển khai đầy đủ (`gameKey: "bang"`, 4-8 người, theme
Western gốc theo `van-de.md`). Chi tiết: [`../history/milestones.md`](../history/milestones.md),
[`../architecture/backend.md`](../architecture/backend.md), README.md mục "Game 002".

**Còn treo lại từ quyết định theme:** asset 12-cung-hoàng-đạo đã commit sẵn ở
`frontend/public/assets/games/zodiac/` (24 icon nam/nữ theo 12 cung + khung thư mục
equipment/shop cards/crates/carts/dice/effects/tokens) **không được dùng** cho BANG! —
người dùng chọn theme Western gốc theo spec thay vì reskin zodiac. Asset này vẫn còn đó,
chưa gắn với game nào; có thể dùng cho game thứ ba hoặc reskin BANG! sau này nếu muốn.

**Đơn giản hoá có chủ đích so với spec/luật gốc** (không phải bug — xem chú thích đầu
`Games/Bang/BangRules.cs`):
- Bia (Beer) vẫn hồi máu được kể cả khi chỉ còn 2 người sống (luật gốc: vô hiệu lúc đó).
- ~~Không có UI chọn bài cụ thể để bỏ khi vượt giới hạn tay bài~~ — ĐÃ LÀM (2026-09-10):
  `BangBoard.tsx` giờ vào "chế độ bỏ bài" khi bấm KẾT THÚC LƯỢT lúc tay bài vượt `hp`, cho chọn
  đúng số lá cần bỏ (chạm để chọn/bỏ chọn trong `HandFan`, xác nhận qua `ActionBar`) rồi mới gửi
  `END_TURN` kèm `discardCardIds` — trước đó server luôn tự bỏ từ đầu danh sách vì client chưa
  từng gửi field này dù backend đã hỗ trợ sẵn.
- ~~Không có chat trong phòng Bang (Platform chưa có kênh chat generic)~~ — ĐÃ LÀM (2026-09-10):
  `GameHub.SendChatMessage` (generic, broadcast qua nhóm SignalR của phòng, KHÔNG lưu DB — mất
  khi phòng đóng/tải lại trang) + `platform/ChatPanel.tsx` mount MỘT LẦN ở `RoomRoute.tsx` cho
  mọi game (không phải riêng Bang) — VayBat có chat cùng lúc luôn, không cần code riêng. Cả
  player lẫn spectator chat được, theo đúng bảng phân quyền trong `rules/coding/security.md`.
- ~~Không có nút "CHƠI LẠI" ở màn thắng/thua~~ — ĐÃ LÀM (2026-09-10): `RoomService.CreateRematchAsync`
  (tạo phòng mới cùng `gameKey`/`seatCount`, chỉ cho người TỪNG chơi ván đó) + `POST /api/games/
  {id}/rematch` + `GameHub.AnnounceRematch` (báo cho người khác còn đang xem màn thắng/thua ở
  phòng cũ qua SignalR — họ thấy banner "🔄 X đã tạo phòng chơi lại" kèm nút vào thẳng). UI dùng
  chung `RoomShell.RematchButton`/`RematchInviteBanner` cho cả 2 game.
  **Đơn giản hoá có chủ đích**: không giữ lại tuỳ chọn tạo phòng ban đầu (vd `maxRedTurns` của
  VayBat) — chỉ giữ được `seatCount` (lưu thẳng trên `GameRoom`, generic); không tự động ghép cả
  nhóm vào lại (chỉ người bấm "CHƠI LẠI" được xếp ghế 0 trước, người khác phải tự bấm "VÀO PHÒNG"
  ở banner — không có gì đảm bảo họ giữ đúng ghế cũ/thứ tự cũ). Không có test DB thật cho
  `CreateRematchAsync` (cùng lý do "chưa có test tích hợp chạm Postgres" đã ghi ở mục "Việc kỹ
  thuật chưa làm" — nợ kỹ thuật có sẵn, không phải riêng tính năng này).
- Debug panel (spec §51) chưa làm — có thể thêm sau nếu cần, chỉ nên bật ở Development.

## Thư viện trò chơi — ĐÃ LÀM (2026-08-05)

`<select>` chọn game cũ đã thay bằng Thư viện trò chơi dạng thẻ (`GameLibrary`/`GameDetails`).
Chi tiết: [`../history/milestones.md`](../history/milestones.md), [`../architecture/frontend.md`](../architecture/frontend.md).

**Đơn giản hoá có chủ đích:**
- Artwork thẻ game là gradient CSS + emoji lớn (`accent`/`emblem` trong metadata), không phải
  ảnh minh hoạ thật — repo chưa có asset artwork cho từng game (đúng tinh thần "không dùng
  artwork bản quyền"; nếu sau này có ảnh thật, chỉ cần thay phần render artwork trong
  `GameCard.tsx`/`GameDetails.tsx`, không đổi kiến trúc).
- Chip lọc "Phổ biến"/"Mới" trong spec gốc **không làm** — không có dữ liệu backend thật để
  tính (không bịa số liệu, theo đúng nguyên tắc dự án). Chip "Đang có người chơi" và các chip
  số-người-chơi/thể-loại dùng dữ liệu thật (rooms/metadata).
- Trang chi tiết game không có route riêng cho "đang trong ván" (`/games/bang/room/:id`) — vào
  ván vẫn không có URL riêng, giữ đúng hành vi cũ (chỉ phần "trước khi vào ván" có URL mới).

## Dọn dẹp — ĐÃ LÀM (2026-09-10)

- **Xoá demo "Hello World" khỏi backend** (frontend đã xoá từ 2026-08-05, backend giữ lại lúc đó vì "chưa ai yêu cầu") — theo yêu cầu tổng quát của người dùng "xoá trang không cần thiết". Xoá `Controllers/HelloController.cs`, `Models/Greeting.cs`, bảng `Greetings` khỏi schema bootstrap (chỉ ngừng tạo mới, không `DROP TABLE` — theo nguyên tắc thay đổi phá huỷ 2 bước của `rules/workflow/deployment.md`), hub method `GameHub.SendHello`. Giữ nguyên phần hạ tầng dùng thật cho game trong `RedisCacheService`/`RabbitMqPublisher`/`MinioStorageService`/`OpenSearchService`.
- **`/health` giờ kiểm tra thật** DB (`CanConnectAsync`)/Redis (`PingAsync`)/RabbitMQ (thử mở channel) song song, timeout 3s mỗi phần, trả `503` kèm chi tiết từng phần nếu có phần down — trước đây chỉ trả tĩnh `{ status: "healthy" }`.

## Trang quản lý game (`/admin`) — ĐÃ LÀM bản READ-ONLY (2026-09-10)

Repo trước đó không có trang quản trị nào. Đã làm bản đầu: xem tổng quan phòng/ván toàn hệ
thống + thống kê nhanh, lọc theo trạng thái/game — xem ADR "Role Admin đầu tiên trong hệ thống"
trong [`../history/decisions.md`](../history/decisions.md) cho quyết định phân quyền, và
[`../references/important-files.md`](../references/important-files.md) cho danh sách file.

**Chưa làm (có chủ đích, để đợt sau nếu cần)**:
- Không có thao tác phá huỷ (huỷ/xoá phòng thủ công từ `/admin`) — tránh lặp lại sự cố mất dữ
  liệu dev thật 2026-09-05; cần hỏi xác nhận người dùng trước khi thêm, kèm log ai-làm-gì-lúc-nào.
- Không có UI cấp/thu hồi quyền Admin (quản lý qua env `ADMIN_EMAILS`, sửa thủ công + khởi động
  lại backend + admin đăng nhập lại) — chấp nhận được ở quy mô hiện tại (vài người vận hành biết
  trước), làm UI quản lý role riêng chỉ khi số người cần quyền tăng lên nhiều.
- Chưa có audit log riêng cho hành động xem trang quản trị (chỉ log qua `ILogger` thường ở
  endpoint `rooms`, không có bảng audit log persist) — đủ dùng vì hiện tại toàn bộ hành động là
  READ-ONLY.

## CI/CD — ĐÃ LÀM bản tối thiểu (2026-09-11)

~~CI/CD pipeline tự động: chưa có thư mục `.github/workflows/`~~ — đã thêm `.github/workflows/ci.yml`
đúng 3 bước tối thiểu mô tả trong `rules/workflow/deployment.md`: (1) `dotnet build`+`dotnet test`
trên `backend/BoardGame.sln`, (2) frontend `npm ci` → `npm run build` (đã gồm `tsc --noEmit`,
xem `package.json`), (3) build thử 2 Docker image (backend + frontend, không push đi đâu — chưa
có registry/secret nào cấu hình) chỉ khi push thẳng lên `master`. Trigger trên `push`/`pull_request`
nhắm `master`.

**Chưa làm (có chủ đích):**
- Không có bước "lint" riêng — frontend chưa có ESLint config/script (`package.json` chỉ có
  `dev`/`build`/`preview`). Thêm lint là việc riêng, không lặng lẽ bỏ qua.
- Không cache NuGet packages (không có `packages.lock.json` để làm cache key ổn định) — restore
  cục bộ từng thấy chậm/timeout tải gói (`Microsoft.CodeAnalysis.CSharp`), CI có thể gặp tương
  tự; thêm cache sau nếu CI thật sự chậm/hay fail vì restore.
- Docker job chỉ BUILD để bắt sớm lỗi Dockerfile, KHÔNG push image lên registry nào — repo chưa
  có thông tin registry/secret. Deploy thật vẫn là thao tác thủ công theo `rules/workflow/deployment.md`.

## Test — ĐÃ LÀM (2026-09-10, đợt 2)

`TokenService.CreateToken` (role "Admin" cho `/admin`) giờ có `Platform/Auth/TokenServiceTests.cs`
(4 test) — verify round-trip THẬT qua `JwtSecurityTokenHandler.ValidateToken`, không chỉ gọi
`CreateToken` rồi đọc field nội bộ (claim quyết định authorization, sai sót khó phát hiện qua
code review thường). Tổng test backend: 118/118 pass.

## Test — ĐÃ LÀM (2026-09-10)

`Games/VayBat/VayBatRules.cs` (luật thuần: kề/trống, nước đi hợp lệ, áp nước đi, điều kiện
thắng/thua, khởi tạo state) giờ có `VayBat/VayBatRulesTests.cs` (17 test) — trước đó
`VayBatEngineTests.cs` (2026-09-05) mới chỉ phủ `SideForSeat`/`OnSeatTimedOut` (lớp adapter),
chưa test luật lõi. Tổng test backend: 114/114 pass.
