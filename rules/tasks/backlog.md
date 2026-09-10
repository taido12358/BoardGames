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
- ~~Chưa có test tích hợp chạm Postgres thật cho `RoomService`/khoá `FOR UPDATE`/`SKIP LOCKED`~~
  — ĐÃ LÀM (2026-09-11): `Platform/RoomServiceIntegrationTests.cs` (Testcontainers, 5 test) —
  xem mục "Test tích hợp Postgres thật (Testcontainers)" bên dưới.

## Game thứ hai — BANG! — ĐÃ LÀM (2026-08-05)

~~Game hidden-role kiểu BANG!~~ đã triển khai đầy đủ (`gameKey: "bang"`, 4-8 người, theme
Western gốc theo `van-de.md`). Chi tiết: [`../history/milestones.md`](../history/milestones.md),
[`../architecture/backend.md`](../architecture/backend.md), README.md mục "Game 002".

**Còn treo lại từ quyết định theme:** asset 12-cung-hoàng-đạo đã commit sẵn ở
`frontend/public/assets/games/zodiac/` (24 icon nam/nữ theo 12 cung + khung thư mục
equipment/shop cards/crates/carts/dice/effects/tokens) **không được dùng** cho BANG! —
người dùng chọn theme Western gốc theo spec thay vì reskin zodiac. Game thứ ba (Ô Ăn Quan,
2026-09-11) CŨNG không dùng asset này (dùng CSS/số quân thuần, giống VayBat/Bang — theo đúng
tinh thần "không dùng artwork bản quyền" nhất quán trong repo, và bộ asset này không hợp theme
dân gian VN của Ô Ăn Quan). **Game thứ tư (Đua Xe Hoàng Đạo, 2026-09-11) VẪN không dùng file ảnh
này** — xem mục "Game thứ tư" bên dưới và ADR trong `../history/decisions.md` để biết lý do đầy
đủ (tên thư mục shop/equipment/crate gợi ý 1 hệ kinh tế phức tạp không có spec để tra cứu, chỉ
mượn tên "hoàng đạo" + icon Unicode 12 cung, không mượn cơ chế). Asset ảnh thật (shop/trang bị/
thùng hàng/xe) vẫn còn nguyên, chưa gắn với game nào — chỉ dùng nếu sau này có input rõ ràng từ
người dùng muốn 1 game thật sự khai thác chúng.

## Game thứ tư — Đua Xe Hoàng Đạo — ĐÃ LÀM (2026-09-11)

~~Game thứ tư dùng asset zodiac~~ — thay vì cố tái hiện hệ shop/trang bị mà bộ asset gợi ý (không
có spec, rủi ro đoán sai cao), tự thiết kế MVP tối giản: đua xúc xắc + đường đua tuyến tính, ai
về đích trước thắng ngay, 2-6 người (`gameKey: "zodiacrace"`). Xem ADR đầy đủ trong
`../history/decisions.md`. Backend: `Games/ZodiacRace/` (Types/Rules/Engine), 27 test
(`ZodiacRaceRulesTests`/`ZodiacRaceEngineTests`). Frontend: `games/zodiacrace/` đầy đủ
(types/metadata/CreateOptions/Board), 16 test, accent theme mới `"zodiac"`. `dotnet test`:
179/179 pass. `npm run test`/`lint`/`build`: 70/70 pass + sạch.

**Đã live-test thành công (2026-09-11, cùng ngày)** qua hệ thống sống thật (Docker Compose +
script Node dùng `@microsoft/signalr` giả lập 2 người chơi qua hub thật) — phát hiện quan trọng:
blocker "cần tài khoản Gmail thật" không còn đúng nữa, xem `rules/coding/testing.md` mục
"Live-test nhiều người chơi thật mà KHÔNG cần nhiều tài khoản Gmail thật". Cùng dịp này cũng
live-test luôn Ô Ăn Quan (chưa từng live-test từ lúc thêm 2026-09-11) — cả 2 game hoạt động đúng
trên hệ thống thật, không chỉ unit test.

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
- Debug panel (spec §51) chưa làm. **Cân nhắc 2026-09-11**: spec yêu cầu "switch between test
  players" (xem/điều khiển bất kỳ ghế nào bất kể đăng nhập là ai) — đúng dạng bypass danh tính
  đã bị vá làm lỗ hổng bảo mật 2026-08-05 ("ai cũng giả được người khác chỉ bằng cách gửi đúng
  chuỗi tên"). Dù chỉ định bật ở Development, chủ động xây lại một dạng bypass tương tự (kể cả
  có gate `IsDevelopment()`) là việc có rủi ro bảo mật thật nếu gate sai — nên HỎI XÁC NHẬN người
  dùng trước khi làm, không tự quyết như các việc UI/tính năng thường khác.

## Game thứ ba — Ô Ăn Quan — ĐÃ LÀM (2026-09-11)

Trò chơi dân gian Việt Nam (`gameKey: "oanquan"`, 2 người, bàn 12 ô: 10 ô dân + 2 ô quan). Chi
tiết đầy đủ: [`../history/milestones.md`](../history/milestones.md), ADR về lựa chọn luật khi
nguồn dân gian có dị bản: [`../history/decisions.md`](../history/decisions.md).

**Đơn giản hoá có chủ đích so với luật gốc** (không phải bug — xem chú thích đầu
`Games/OAnQuan/OAnQuanRules.cs` và ADR trong `decisions.md`):
- Chỉ ăn được 1 lần mỗi lượt — không hỗ trợ "ăn chuỗi/ăn liên hoàn" nhiều ô liên tiếp trong cùng
  1 lượt, vì các nguồn tra cứu không thống nhất mô tả chính xác cơ chế này; chọn bản chắc chắn
  đúng (chỉ 1 lần ăn) thay vì tự đoán một cơ chế có rủi ro sai luật dân gian quen thuộc.
- Quân "quan" ban đầu = 10 quân (một biến thể phổ biến; biến thể khác dùng 5).
- Không dùng asset 12-cung-hoàng-đạo có sẵn trong repo — dùng CSS/số quân thuần (giống
  VayBat/Bang), vừa nhất quán "không dùng artwork bản quyền", vừa không hợp theme dân gian VN.
- Không có `CreateOptions.tsx` (không có tuỳ chọn tạo phòng riêng — bàn cờ luôn cố định, không
  như `maxRedTurns` của VayBat hay số ghế của Bang).
- **CHƯA live-test qua Chrome/Docker Compose** — chỉ verify bằng `dotnet build`/`dotnet test`
  (18 test luật thuần mới, tất cả pass) + `npm run lint`/`tsc`/`vite build`. Đây là game MỚI
  (rủi ro cao hơn một thay đổi UI nhỏ trên game đã có) nên nên ưu tiên live-test 2 client thật
  khi có dịp (xem `rules/tasks/current.md` mục "Ghi chú môi trường").

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
- Docker job chỉ BUILD để bắt sớm lỗi Dockerfile, KHÔNG push image lên registry nào — repo chưa
  có thông tin registry/secret. Deploy thật vẫn là thao tác thủ công theo `rules/workflow/deployment.md`.

**Đã bổ sung sau đó (2026-09-11, cùng ngày)**: cache NuGet packages trong job backend bằng
`actions/cache@v4` trực tiếp (`path: ~/.nuget/packages`, key = hash mọi `*.csproj` trong
`backend/`) — KHÔNG cần `packages.lock.json` như dự tính ban đầu ở trên (dự án không dùng
`--use-lock-file`, thêm lock file riêng chỉ cho mục đích cache là rườm rà không cần thiết); hash
trực tiếp file `.csproj` đơn giản hơn và tự động invalidate đúng lúc khi thêm/đổi version
package. Job frontend đã có cache `npm` sẵn từ đầu qua `actions/setup-node@v4` (`cache: "npm"`),
không cần thêm gì.

## ESLint cho frontend — ĐÃ LÀM (2026-09-11)

~~Không có bước "lint" riêng — frontend chưa có ESLint config/script~~ — đã thêm
`frontend/eslint.config.js` (flat config chuẩn Vite React-TS: `@eslint/js` + `typescript-eslint`
+ `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`), script `npm run lint`, wire vào
CI (`.github/workflows/ci.yml`, job frontend, chạy trước `npm run build`).

**Lint bắt được 1 bug thật ngay lần chạy đầu** (không phải chỉ style): `VayBatBoard.tsx` gọi 3
`useMemo` SAU một `return null` sớm (`if (!room) return null`) — vi phạm Rules of Hooks (số hook
gọi ra khác nhau giữa lần render `room=null` và `room` có giá trị, React sẽ crash "Rendered more
hooks than during the previous render" nếu component này từng nhận render với `room=null` mà
không unmount trước đó). Đã sửa: tính `map`/`state` dạng optional, gọi mọi hook KHÔNG điều kiện,
`return null` thật sự chỉ sau khi mọi hook đã chạy — xem `rules/logs/2026-09-11.md` để biết chi
tiết vì sao bug này chưa từng crash trong thực tế (may mắn nhờ cách `RoomRoute.tsx` unmount board
trước khi `room` kịp về null), nhưng vẫn là vi phạm thật cần sửa.

**Chưa làm (có chủ đích):** 2 warning `react-refresh/only-export-components` ở
`GameRoomHubContext.tsx`/`RoomShell.tsx` (file export cả component lẫn hook/helper) — không sửa
vì đây là cảnh báo trải nghiệm dev (fast refresh), không phải lỗi đúng/sai; tách file chỉ để hết
warning này sẽ phá cấu trúc "mọi thứ dùng chung 1 phòng nằm 1 chỗ" đã chọn có chủ đích trước đó.

**`npm audit`:** lúc cài devDependencies mới phát hiện 8 lỗ hổng có sẵn từ trước (không phải do
lint gây ra) — chạy `npm audit fix` (không `--force`) xử lý được 4 (baseline-browser-mapping,
browserslist, nanoid, postcss). Còn lại 2 gói cần bump major (`vite` → 8, `react-router-dom` → 7)
mới hết — CHƯA làm vì đây là breaking change cần test riêng, không gộp vào cùng commit lint; ghi
làm việc riêng bên dưới.

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

## Nâng cấp dependency frontend có breaking change

`npm audit` (2026-09-11) phát hiện 2 lỗ hổng cần bump major version mới hết:

- ~~`react-router-dom` 6.x → 7.x~~ — ĐÃ LÀM (2026-09-11, cùng ngày, tách commit riêng vì đây là
  thay đổi runtime thật, không gộp vào việc thêm ESLint). Upgrade **hoàn toàn không cần đổi code**
  — `react-router-dom` v7 vẫn giữ nguyên toàn bộ export quen thuộc (`BrowserRouter`/`Routes`/
  `Route`/`Link`/`useNavigate`/`useParams`/`useSearchParams`/`Navigate`) làm package tương thích
  ngược cho ai chưa migrate sang gói `react-router` hợp nhất mới — dự án chỉ dùng đúng tập API cơ
  bản đó nên không chạm lớp "Data Router"/loader/action mới của v7. Verify: `tsc`/`vite build`/
  `npm run lint` sạch (không có thay đổi type nào từ TypeScript, xác nhận mọi export vẫn khớp).
  **Chưa live-test qua Chrome/Docker Compose** — cùng lý do các việc UI khác trong đợt này.
- `vite` 5.x → 8.x (kéo theo `esbuild` mới) — CHƯA làm, vẫn để riêng. Vite 6/7/8 đổi khá nhiều
  (Rolldown, Node version tối thiểu, plugin API) — rủi ro breaking cao hơn nhiều so với
  react-router-dom, trong khi lỗ hổng thực tế (esbuild dev-server cho phép website khác gửi
  request/đọc response) chỉ ảnh hưởng lúc chạy `npm run dev` cục bộ, không lộ ra ở bundle production
  (`npm run build` + nginx). Đánh đổi rủi ro/lợi ích chưa đủ hấp dẫn để làm ngay — để dành khi có
  lý do cụ thể hơn (cần tính năng mới của Vite, hoặc lỗ hổng leo thang mức nghiêm trọng cao hơn).

## Test tích hợp Postgres thật (Testcontainers) — ĐÃ LÀM (2026-09-11)

Trả nợ kỹ thuật ghi từ 2026-08-05/2026-09-05: `RoomService` dùng `SELECT ... FOR UPDATE` (khoá
hàng, xem `JoinRoomAsync`/`MakeMoveAsync`/`CancelRoomAsync`/`ApplySeatTimeoutAsync`) và
`FOR UPDATE SKIP LOCKED` (`QuickMatchAsync`) — hành vi chỉ có ý nghĩa khi test chạm Postgres
THẬT với nhiều connection đồng thời; EF Core InMemory hay test luật thuần không mô phỏng được.

**Thay đổi:**
- **Tách schema bootstrap khỏi `Program.cs`** thành `Data/SchemaBootstrapper.cs` (`Sqls` +
  `ApplyAsync`) — COPY NGUYÊN VẸN nội dung SQL (verify bằng `diff` byte-for-byte trước khi ghép
  file, không gõ lại tay — xem `rules/logs/2026-09-11.md` để biết quy trình chi tiết, vì đây
  đúng vùng code đã từng gây sự cố mất dữ liệu 2026-09-05). Lý do tách: test tích hợp cần chạy
  ĐÚNG SQL thật đang chạm DB thật, không phải một bản sao có thể lệch dần. Đã smoke-test lại qua
  container Postgres tạm (không phải DB dev) trước khi tin tưởng refactor không đổi hành vi.
- `Platform/RoomServiceIntegrationTests.cs` (mới, `Testcontainers.PostgreSql`) — 5 test, mỗi test
  tự dựng 1 container Postgres RIÊNG (cô lập tuyệt đối, đổi lấy tốc độ — ~25s cho cả bộ):
  `CreateRoomAsync` persist đúng; `JoinRoomAsync` với 5 người tranh 3 ghế trống đồng thời không ai
  bị gán trùng ghế; `CancelRoomAsync` gọi huỷ đồng thời 5 lần chỉ đúng 1 lần thành công; `QuickMatchAsync`
  4 người tranh 1 ghế trống cuối chỉ đúng 1 người ghép được; `ApplySeatTimeoutAsync` gọi đồng thời
  5 lần cho cùng 1 ghế chỉ tạo đúng 1 kết quả. Mỗi test đều đọc lại bằng `AppDbContext` KHÁC để
  xác nhận đã persist thật xuống Postgres, không phải chỉ đúng trong bộ nhớ của lần gọi vừa rồi.
- Thêm `Microsoft.EntityFrameworkCore` 8.0.6 làm PackageReference TRỰC TIẾP trong
  `BoardGame.Api.Tests.csproj` — phát hiện 1 vấn đề version-resolution có sẵn từ trước (không
  phải do việc này gây ra): `BoardGame.Api.csproj` có `Npgsql.EntityFrameworkCore.PostgreSQL`
  8.0.4 VÀ `Microsoft.EntityFrameworkCore.Design` 8.0.6 (đóng gói `PrivateAssets="all"`) cùng
  lúc — bản thân `BoardGame.Api.dll` compile xong dùng EF Core 8.0.6, nhưng project nào
  `ProjectReference` tới nó (như Tests) chỉ thấy được nhánh 8.0.4 vì nhánh 8.0.6 bị
  `PrivateAssets` chặn không lan truyền. Trước đây đây chỉ là WARNING vô hại (MSB3277) vì chưa
  có code test nào THẬT SỰ đụng tới kiểu của `Microsoft.EntityFrameworkCore` — file test đầu
  tiên dùng `DbContextOptionsBuilder<AppDbContext>` mới làm lộ ra thành lỗi biên dịch cứng
  (`CS1705`). Không có bản Npgsql 8.0.6 trong dòng 8.0.x để tự sửa gốc — pin trực tiếp trong
  Tests project là cách chuẩn cho tình huống này.

**Tests:** `dotnet test backend/BoardGame.sln --configuration Release`: 123/123 pass (118 cũ +
5 mới), 25.6s. Xác nhận không có container/volume nào sót lại sau khi chạy (`docker ps -a`) —
Testcontainers tự dọn qua reaper "Ryuk".

**Lưu ý cho CI**: 5 test này CẦN Docker socket khả dụng lúc `dotnet test` chạy. GitHub Actions
`ubuntu-latest` có Docker cài sẵn mặc định nên `.github/workflows/ci.yml` không cần cấu hình gì
thêm — đã verify chạy thật trên Actions (xem `rules/logs/2026-09-11.md`). Nếu sau này đổi runner
(self-hosted không có Docker, hoặc macOS/Windows runner) thì 5 test này sẽ fail vì không kết nối
được Docker daemon — lúc đó cần `[Trait]`/filter riêng để skip có điều kiện, chưa cần làm bây giờ.

## Unit test frontend (Vitest) — ĐÃ LÀM bản đầu (2026-09-11)

Frontend trước đó KHÔNG có test tự động nào (chỉ `tsc`/ESLint). Thêm Vitest — chi tiết đầy đủ:
[`../coding/testing.md`](../coding/testing.md) mục "Unit test frontend". Wire vào CI (`npm run
test`, job frontend, chạy sau lint trước build).

**Đã bổ sung sau đó cùng ngày**: cài React Testing Library, viết `OAnQuanBoard.test.tsx` (8 test)
+ `ChatPanel.test.tsx` (7 test) + `AdminPage.test.tsx` (6 test, mock `global.fetch`) làm ví dụ
mẫu test component — xem `rules/coding/testing.md` mục "Test component React" cho chi tiết + các
bài học hạ tầng test tự bắt được (`afterEach(cleanup)` thủ công, polyfill
`Element.prototype.scrollTo`, giới hạn truy vấn `within(row)` khi nhãn hiển thị lặp lại nhiều
chỗ trên trang). `BangBoard.tsx`/`VayBatBoard.tsx` vẫn chưa có test tự động (nợ kỹ thuật còn lại,
không phải bỏ qua) — chỉ verify bằng `tsc`/build/lint + review thủ công, làm dần khi sửa/thêm
tính năng ở các component đó. `VayBatBoard.tsx` khó test hơn (SVG geometry API jsdom không có).

**Đã bổ sung tiếp cùng ngày**: `BangBoard.test.tsx` (8 test, luồng bỏ bài khi vượt giới hạn tay
bài — tính năng thêm sớm hơn cùng ngày, xem mục ngay phía trên, chưa có test tự động lúc đó).
Phát hiện thêm 1 lỗ hổng jsdom cùng dạng `scrollTo`: `Element.prototype.scrollIntoView` không
tồn tại (`GameLogPanel` dùng chung VayBat/Bang) — polyfill no-op thêm vào `test-setup.ts`.

**Đã bổ sung tiếp lần nữa cùng ngày**: `VayBatBoard.test.tsx` (7 test) — trả nốt nợ kỹ thuật
cuối cùng của mảng test component frontend. Cần mock hình học SVG (`createSVGPoint`/
`getScreenCTM`) cục bộ trong file test (không đưa vào `test-setup.ts` vì chỉ component này
cần). Phát hiện bug hạ tầng test nặng nhất tới giờ: jsdom không có global `PointerEvent` nên
`fireEvent.pointerDown` mất `clientX`/`clientY`, chọn quân thất bại HOÀN TOÀN ÂM THẦM (không
lỗi/warning gì) — phải cô lập bằng test thử nghiệm riêng mới lộ ra, khắc phục bằng cách tự dựng
`new MouseEvent("pointerdown", {...})` thay cho `fireEvent.pointerDown`. Chi tiết đầy đủ +
lý do kỹ thuật: `rules/coding/testing.md` mục "Unit test frontend (Vitest)" bài học thứ 4.
Không còn nợ kỹ thuật test component frontend nào.

**`npm audit`**: cài `vitest`/`jsdom` không phát sinh lỗ hổng MỚI ngoài `esbuild`/`vite` đã biết
(vitest tự kéo theo 1 bản `vite-node` nội bộ dùng chung gốc `esbuild` cũ) — không đổi quyết định
đã ghi ở mục "Nâng cấp dependency frontend có breaking change" (dev-tooling, không lộ ra
production, để dành nếu có lý do cụ thể hơn).
