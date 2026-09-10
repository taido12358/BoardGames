# Coding: Testing

## Chiến lược theo tầng

| Tầng | Đối tượng | Công cụ |
|---|---|---|
| Unit (backend) | **Engine** (`IGameEngine` — luật chơi), helper (`GameJson`) | xUnit |
| Unit (frontend) | Logic thuần phía client — helper hiển thị/gợi ý UI của từng game (`games/<ten>/types.ts`), `platform/gameStore.ts` | Vitest (`frontend/`, mới 2026-09-11 — `npm run test`) |
| Integration (service) | Service tầng dưới + DB thật, khoá hàng thật (`FOR UPDATE`/`SKIP LOCKED`) — gọi thẳng `RoomService`, KHÔNG qua HTTP/[Authorize] | xUnit + Testcontainers (`Platform/RoomServiceIntegrationTests.cs`, 2026-09-11 — cần Docker) |
| Integration (HTTP) | Controller THẬT qua `WebApplicationFactory` — đúng pipeline routing/model binding/`[Authorize]`/cookie JWT, DB thật (Testcontainers) | xUnit + `Microsoft.AspNetCore.Mvc.Testing` (`Platform/Auth/AuthControllerIntegrationTests.cs` + `AdminControllerIntegrationTests.cs`, mới 2026-09-11 — cần Docker, xem mục "Test HTTP tích hợp qua WebApplicationFactory" bên dưới) |
| E2E | 2 client thật chơi một ván qua trình duyệt | Playwright (Chromium) + 2 SignalR client — **chưa có trong repo**, chỉ live-test thủ công qua Chrome DevTools/2 tab tới giờ |

Ưu tiên đầu tư theo thứ tự: **engine unit test** (rẻ, giá trị cao nhất — luật chơi là phần dễ sai nhất) → integration cho luồng `MakeMove` → E2E smoke.

## Unit test cho engine (bắt buộc với mỗi game)

Engine thuần logic (không DB/Redis/hub) nên test rất rẻ. Mỗi engine tối thiểu phải test:

- `NewGame()` trả `(mapJson, stateJson)` đúng shape, parse được.
- Nước đi hợp lệ → state mới đúng, `MoveOutcome(true)`.
- Nước đi sai luật (sai lượt, sai quân, ô không hợp lệ) → `MoveOutcome(false)` **kèm message**, state không đổi.
- **Input rác**: JSON sai cú pháp, thiếu field, `PieceId: null` → trả fail, ❌ không throw (rule đã có ở `VayBatEngine.ApplyMove`).
- Điều kiện kết thúc ván (thắng/thua/hoà).

## Unit test frontend (Vitest, mới 2026-09-11)

`frontend/` trước đó không có test tự động nào (chỉ `tsc`/ESLint bắt lỗi type/style, không bắt
được lỗi logic). Đã thêm Vitest (`vite.config.ts` mục `test`, environment `jsdom` + setup
`src/test-setup.ts` polyfill `localStorage` thủ công — jsdom mới không tự cấp phát
`localStorage` hoạt động được nếu không có flag `--localstorage-file` của Node).

Ưu tiên test: **logic thuần, không cần render component** — helper hiển thị/gợi ý nước đi của
từng game (`games/<ten>/types.ts`, vd `legalMoves`/`occupancy` của VayBat, `isQuanPit`/`ownerOf`
của Ô Ăn Quan) và store dùng chung (`platform/gameStore.ts`, vd merge `isMine` trong
`upsertRoom`, giới hạn `chatMessages`). Đây là "rẻ, giá trị cao" giống tinh thần ưu tiên engine
unit test ở backend — các hàm này thuần, dễ test, và sai ở đây làm UI gợi ý sai (dù server vẫn
validate lại nên không phải lỗ hổng bảo mật, chỉ là trải nghiệm tệ).

**Test component React** (React Testing Library, cài cùng ngày 2026-09-11) — bắt đầu với
`games/oanquan/OAnQuanBoard.test.tsx` (8 test: chọn ô/chọn chiều rải gửi đúng move, không cho
chọn ô đối phương/khi chưa tới lượt, hiện đúng kết quả thắng/hoà, khán giả không thấy nút CHƠI
LẠI) làm ví dụ mẫu cho việc test component sau này. **Bài học khi viết test component đầu
tiên**: dự án không bật `globals: true` của Vitest (import `describe`/`it`/`expect` tường minh),
nên cơ chế tự dọn DOM sau mỗi test của React Testing Library (dựa vào `afterEach` toàn cục)
KHÔNG tự kích hoạt — phải tự gọi `cleanup()` trong `afterEach` ở `src/test-setup.ts`, nếu không
DOM của test trước còn sót lại khi test sau render tiếp, gây lỗi "Found multiple elements" hàng
loạt (đã tự bắt được ngay lần chạy đầu, sửa 1 chỗ trong setup là hết).

Thêm `platform/ChatPanel.test.tsx` (7 test — mở/thu gọn, hiện đúng số tin/nội dung/người gửi,
disable nút Gửi khi rỗng/chỉ khoảng trắng, gửi tin gọi đúng `sendChatMessage(roomId, textĐãTrim)`
rồi xoá ô nhập). **Bài học thứ 2**: `Element.prototype.scrollTo` không tồn tại trong jsdom (jsdom
không làm layout/scroll thật) — bất kỳ component nào gọi `ref.current.scrollTo(...)` (như
`ChatPanel` tự cuộn xuống tin mới nhất) sẽ crash test với "scrollTo is not a function". Polyfill
no-op 1 lần trong `test-setup.ts` (cùng chỗ với polyfill `localStorage`) thay vì mock riêng lẻ
trong từng file test đụng phải — component tương lai dùng `scrollTo`/`scrollIntoView` sẽ tự động
không bị ảnh hưởng.

Thêm `components/AdminPage.test.tsx` (6 test — mock `global.fetch` theo URL thay vì mock cả
`adminStore.ts`, để kiểm đúng contract request/response thật: đang kiểm tra quyền, không phải
admin thì không gọi `rooms`/`stats`, admin thấy đúng thống kê + bảng phòng, trống khi không có
phòng khớp lọc, hiện lỗi khi fetch phòng thất bại, bấm chip lọc gọi lại đúng query `status=...`).
**Bài học**: 1 test fail vì "Đang chờ" khớp CẢ badge trạng thái của 1 dòng bảng LẪN nút chip lọc
cùng tên (chip lọc luôn hiển thị, không phụ thuộc dữ liệu) — sửa bằng cách giới hạn truy vấn
(`within(row)`) vào đúng dòng `<tr>` thay vì tìm text toàn trang, một lỗi test hay gặp khi UI có
nhiều chỗ dùng lại cùng một bảng nhãn hiển thị (`STATUS_LABEL`).

Thêm `games/bang/BangBoard.test.tsx` (8 test, tập trung vào luồng bỏ bài khi vượt giới hạn tay
bài cuối lượt — tính năng thêm ngày 2026-09-10 vẫn chưa có test): bấm KẾT THÚC LƯỢT khi
`hand.length > hp` vào đúng chế độ chọn bài (không gửi move ngay), chọn đủ số lá rồi xác nhận gửi
đúng `{type: "END_TURN", discardCardIds: [...]}`, nút xác nhận disable khi chưa chọn đủ, không
cho chọn quá số lá overflow, Hủy quay lại bình thường không gửi move, không vào chế độ bỏ bài khi
tay bài chưa vượt giới hạn, và 2 test màn thắng (có/không nút CHƠI LẠI cho khán giả). **Bài học
thứ 3**: `Element.prototype.scrollIntoView` cũng không tồn tại trong jsdom giống `scrollTo`
(component `GameLogPanel` dùng chung cho VayBat/Bang tự cuộn xuống log mới) — polyfill no-op
thêm vào `test-setup.ts` cùng chỗ với `scrollTo`.

Thêm `games/vaybat/VayBatBoard.test.tsx` (7 test) — component khó nhất trong repo để test vì
dùng API hình học SVG thật (`createSVGPoint`/`getScreenCTM`/`matrixTransform`) mà jsdom không
triển khai. Giải quyết bằng mock tối giản coi toạ độ client == toạ độ SVG (identity transform,
khai báo trực tiếp trong file test này, KHÔNG đưa vào `test-setup.ts` dùng chung vì chỉ
`VayBatBoard` cần hình học SVG). Test: chọn quân của mình rồi tap ô kề hợp lệ gửi đúng
`{pieceId, to}`, không chọn được quân đối phương, không đi được khi chưa tới lượt, khán giả
không chọn được quân nào, hiện đúng thông báo thắng/số lượt Đỏ đã dùng, ẩn nút CHƠI LẠI cho
khán giả.

**Bài học thứ 4 — jsdom không có `PointerEvent`**: `fireEvent.pointerDown()` của RTL rơi về
`Event` trần khi jsdom thiếu global `PointerEvent`, mất hẳn `clientX`/`clientY` — khiến
`toSvg()` của component tính ra `NaN` và không bao giờ khớp node nào (chọn quân luôn thất bại
âm thầm, không throw lỗi gì để lộ ra). Phát hiện bằng cách log trực tiếp `useGameStore.getState()`
giữa 2 bước click, rồi cô lập bằng 1 test thử nghiệm tối giản kiểm tra `event.clientX` sau
`fireEvent.pointerDown`. Khắc phục: tự dựng `new MouseEvent("pointerdown", {clientX, clientY,
bubbles: true})` rồi `fireEvent(el, event)` thay vì gọi `fireEvent.pointerDown` — React lắng
nghe native event theo `type` chuỗi nên vẫn khớp đúng `onPointerDown`, chỉ mất `pointerId`
(không ảnh hưởng vì `setPointerCapture` đã mock no-op). Riêng `setPointerCapture` cũng phải mock
ghi đè HẲN (không chỉ polyfill khi thiếu) vì bản jsdom hiện tại có triển khai nhưng ném lỗi khi
`pointerId` không khớp một pointer thật đang hoạt động — lỗi này chặn hẳn `setSelected()` chạy
tiếp vì nó đứng ngay trước trong cùng nhánh code.

Thêm `games/zodiacrace/ZodiacRaceBoard.test.tsx` (9 test, game thứ tư — xem ADR trong
`rules/history/decisions.md`) + `games/zodiacrace/types.test.ts` (7 test). Không phát sinh bài
học jsdom mới (component đơn giản hơn VayBat/Bang, không dùng SVG geometry/pointer capture).
**Bài học nhỏ khi viết test**: đường đua ngắn (10 ô cho test) khiến chỉ số ô 1-6 trùng với mặt
xúc xắc 1-6 — `getByText("5")` mơ hồ giữa ô số 5 trên đường đua và giá trị xúc xắc hiển thị, sửa
bằng `getByText("5", { selector: "span.font-bold" })` thay vì tìm text toàn trang (cùng lớp bài
học `within(row)` ở `AdminPage.test.tsx` — nhãn hiển thị trùng nhau ở nhiều chỗ trên UI).

**Nợ kỹ thuật frontend còn lại**: không còn cho các board đã có — cả 4 board component
(`OAnQuanBoard`, `BangBoard`, `VayBatBoard`, `ZodiacRaceBoard`) đều đã có test. Việc tiếp theo
(nếu có) là bổ sung ca test khi tính năng mới được thêm, không phải một đợt phủ test riêng.

Thêm `components/GameDetails.test.tsx` (10 test, mới 2026-09-11) — component route-level đầu
tiên trong bộ test (`useParams`/`useNavigate`/`useSearchParams`), bọc `render()` trong
`<MemoryRouter initialEntries={["/games/:gameKey"]}>` + khai `<Routes><Route path="/games/:gameKey" .../></Routes>`
(pattern mới, tái dùng được cho component route-level khác sau này) — cần khai thêm 1 `Route`
"bắt hết" (`/games/:gameKey/room/:roomId`, element bất kỳ) nếu component tự `navigate()` sau khi
action xong (vd tạo phòng xong), nếu không React Router log warning "No routes matched" (không
làm fail test nhưng nhiễu output). Test này trực tiếp là regression cho bug `ARTWORK_BG` (mục
trên) — render THẬT component cho cả 4 gameKey và kiểm class nền, bắt được đúng dạng lỗi thật đã
xảy ra (mất class do thiếu key), khác `artworkTheme.test.ts` chỉ kiểm tra hằng số ở mức unit.

Thêm `platform/authStore.test.ts` (mới 2026-09-11, 12 test) — luồng đăng nhập OTP (khôi phục
phiên, gửi mã, xác minh mã, đăng xuất, đếm ngược gửi lại) CHƯA từng có test dù là logic quan
trọng nhất (chặn cả app nếu sai). Dùng `vi.useFakeTimers()` để test đếm ngược 60s không cần chờ
thật.

**Bài học nghiêm trọng nhất về `vi.stubGlobal`/`vi.unstubAllGlobals`**: test đầu tiên viết luôn
gọi `vi.unstubAllGlobals()` trong `afterEach` (tưởng là "dọn dẹp đúng cách" sau khi tự
`vi.stubGlobal("fetch", ...)` trong từng test) — nhưng `unstubAllGlobals()` revert LUÔN MỌI
global đã bị stub, KỂ CẢ stub `localStorage` dùng CHUNG cho toàn bộ bộ test khai trong
`test-setup.ts` (setupFiles chạy lại cho mỗi test file, nên stub đó tồn tại trong phạm vi file
hiện tại). Hậu quả: test ĐẦU TIÊN trong file luôn qua, nhưng mọi test SAU ĐÓ gọi
`verifyOtp`/`restoreSession` (có `syncPlayerName` → `localStorage.setItem`) đều fail với lỗi
"Không kết nối được máy chủ" — SAI HOÀN TOÀN so với nguyên nhân thật (không phải lỗi mạng, là
`localStorage.setItem is not a function` bị nuốt bởi `catch` chung của action). Debug bằng cách
tự gọi `fetch()` thủ công ngay trước khi gọi action để xác nhận mock fetch vẫn đúng (loại trừ khả
năng do fetch), rồi mới nghi ngờ sang `localStorage`. **Quy tắc rút ra**: KHÔNG BAO GIỜ gọi
`vi.unstubAllGlobals()` trong `afterEach` của một test file riêng lẻ khi `test-setup.ts` (global
setup) cũng dùng `vi.stubGlobal` cho thứ khác (`localStorage`) — chỉ cần gọi lại
`vi.stubGlobal("fetch", ...)` (hoặc dùng lại hàm `stubFetch()` riêng) ở ĐẦU MỖI TEST để ghi đè
mock cũ, không cần "unstub" gì giữa các lần.

## Integration test

- Chạy trên PostgreSQL thật (compose/Testcontainers), không InMemory provider — dự án dựa vào JSONB và raw SQL bootstrap, InMemory không kiểm chứng được.
- Case bắt buộc: bootstrap SQL chạy idempotent trên DB đã có data cũ (chính là lớp bug `ADD COLUMN IF NOT EXISTS`, xem [`database.md`](./database.md)).
- Redis/RabbitMQ tắt → `MakeMove` vẫn phải thành công và broadcast (kiểm chứng nguyên tắc "hạ tầng phụ không chặn luồng chính").

### Test HTTP tích hợp qua `WebApplicationFactory` (mới 2026-09-11)

`RoomServiceIntegrationTests` gọi thẳng `RoomService` — bỏ qua toàn bộ tầng controller/
`[Authorize]`/cookie JWT, nên KHÔNG BAO GIỜ phát hiện được lỗi cấu hình sai ở tầng đó (routing,
model binding, role check qua middleware thật). Trước 2026-09-11, phân quyền Admin (
`[Authorize(Roles = "Admin")]`) chỉ được verify tới tầng tạo/validate JWT thuần
(`TokenServiceTests`) — chưa từng chạy qua đúng pipeline HTTP thật. `Platform/Auth/AuthApiFactory.cs`
(`WebApplicationFactory<Program>` + Testcontainers Postgres, dùng CHUNG 1 factory cho mọi test
trong class qua `IClassFixture` — mỗi test tự dùng email ngẫu nhiên riêng nên an toàn) lấp khoảng
trống này cho `AuthController`/`AdminController` (2 controller không đụng Redis/RabbitMQ/
OpenSearch/MinIO — cả 3 service đó đều kết nối lazy nên host vẫn boot bình thường không có chúng).

**Bài học hạ tầng test quan trọng nhất khi dựng cái này** — `Program.cs` đọc `ADMIN_EMAILS`/
`JWT_SECRET` **NGAY LÚC BOOT** (`var tokenService = new TokenService(builder.Configuration);`,
chạy TRƯỚC `builder.Build()`) để fail sớm nếu thiếu secret. `WebApplicationFactory.ConfigureWebHost`
→ `ConfigureAppConfiguration` chỉ ghi đè đúng cho config đọc **LAZY** (vd `AddDbContext`'s
optionsAction — 1 closure, chỉ evaluate lúc `DbContext` được resolve qua DI, đã sau `Build()`) —
KHÔNG kịp ghi đè giá trị đã đọc eager trước đó. Tự xác nhận bằng cách in trực tiếp
`builder.Configuration["ADMIN_EMAILS"]` ra file ngay tại dòng đọc trong `Program.cs`: ra rỗng dù
factory đã `AddInMemoryCollection` giá trị khác từ trước — chứng minh override không có tác dụng
với đọc eager. Cách sửa ĐÚNG: đăng ký lại `TokenService` qua `ConfigureTestServices` (chạy SAU
`ConfigureServices` của `Program.cs`, override đúng vì DI resolve theo đăng ký CUỐI CÙNG) bằng
factory LAZY — `services.AddSingleton(sp => new TokenService(sp.GetRequiredService<IConfiguration>()));`
— resolve `IConfiguration` từ DI ở thời điểm dùng thật (sau `Build()`, đã gộp đủ override), thay
vì dựng sẵn 1 `IConfiguration` riêng với secret khác. **Không được dùng secret khác** cho instance
thay thế: `AddJwtBearer` trong `Program.cs` đã chốt `TokenValidationParameters` từ secret của
`TokenService` GỐC lúc app khởi động — nếu instance thay thế ký token bằng secret khác, mọi
request có cookie sẽ trả 401 (ký/xác thực lệch khoá, tự phát hiện được khi thử secret ngẫu nhiên
trước khi chốt cách trên).

Bài học phụ: `request-otp` có cooldown 60s/email (`AuthController.ResendCooldownSeconds`) — nhiều
test admin chạy trong vài trăm ms nếu dùng CHUNG 1 email admin sẽ khiến các lần sau bị 429, và
`ExtractOtpCode()` (đọc log OTP capture qua `ILoggerProvider` tự viết, tương đương
`docker compose logs backend | grep "OTP cho"` nhưng chạy trong-process) đọc nhầm mã của lần
trước đã bị consume → verify-otp thất bại âm thầm (không assert response status trong helper dùng
chung) → test sau đó tưởng đang test "đăng nhập admin" nhưng thực ra request KHÔNG có cookie hợp
lệ. Sửa bằng cách cấp phát 1 email admin RIÊNG cho mỗi test cần role Admin
(`AuthApiFactory.NextAdminEmail()`). Và: `.env` thật ở root repo (đọc qua `DotEnv.Load()`) có thể
có `EMAIL_PROVIDER=smtp` + SMTP thật — override `EMAIL_PROVIDER=""` trong config test (đây LÀ đọc
lazy, qua `SmtpOtpSender` — singleton DI, resolve lần đầu lúc request thật tới, nên override qua
`ConfigureAppConfiguration` hoạt động bình thường) để test không thật sự gửi email qua mạng.

## E2E

- Kịch bản smoke chuẩn (đã dùng để verify bug "không thể di chuyển quân"): 2 client **tên khác nhau** → tạo/join phòng → `Status` chuyển `Playing` → client A đi một nước → client B nhận `GameStateUpdated` → UI cập nhật.
- Kịch bản regression: 2 tab trùng tên → tab hai phải thấy trạng thái rõ ràng (Waiting/khán giả), không im lặng.

### Live-test nhiều "người chơi" thật mà KHÔNG cần nhiều tài khoản Gmail thật (phát hiện 2026-09-11)

Trước đây nhiều lần ghi nhận việc live-test bị chặn vì "cần N tài khoản Gmail thật khác nhau"
(`JoinRoomAsync` coi cùng `userId` là reconnect, không phải người chơi thứ 2). Thực ra **không
cần Gmail thật** — Docker Compose local mặc định `Auth__DevLogOtp: true` VÀ `SmtpOtpSender` tự
fallback log OTP ra `docker compose logs backend` (dòng `"...OTP cho {email}...: {code}"`) bất cứ
khi nào SMTP chưa cấu hình đủ (`EMAIL_PROVIDER`/`SMTP_USER`/`SMTP_PASS` rỗng). Vì `.env` thật của
máy dev này CÓ cấu hình SMTP thật (gửi qua Gmail thật của người dùng), phải tự ghi đè biến môi
trường CHỈ cho phiên chạy của mình (không sửa file `.env`):
`EMAIL_PROVIDER= docker compose up -d --force-recreate backend` — các service khác không đổi,
chỉ backend cần recreate để nhận biến mới.

Sau đó có thể tạo bao nhiêu "người chơi" tuỳ ý bằng email bịa bất kỳ (vd `p1@test.local`), đọc mã
OTP qua `docker compose logs backend --tail N | grep "OTP cho"`, lấy JWT qua
`curl -i .../api/auth/verify-otp` (giá trị cookie `bg_auth` CHÍNH LÀ JWT thô — server cũng nhận
`Authorization: Bearer <jwt>` cho REST, xem comment trong `Program.cs` "Vẫn nhận Authorization
header cho tool/test"). Dùng JWT đó làm `accessTokenFactory` cho `@microsoft/signalr`
(`HubConnectionBuilder().withUrl("http://localhost:5000/hubs/game", {accessTokenFactory: () =>
jwt})`) — package này đã có sẵn trong `frontend/node_modules`, không cần cài thêm gì, viết 1
script Node nhỏ (`.cjs`, chạy ngoài `frontend/` để tránh đụng `package.json`/lockfile) gọi
`JoinRoom`/`MakeMove` y hệt frontend thật, log lại `GameStateUpdated` để verify hành vi.

Đã dùng cách này live-test THÀNH CÔNG cả Ô Ăn Quan (rải/relay/ăn quan qua SignalR thật) và Đua Xe
Hoàng Đạo (2 người đua tới khi có người thắng) lần đầu tiên qua hệ thống sống thật (không chỉ
unit test) — xem `rules/logs/2026-09-11.md` Task 21. Sau khi xong, `docker compose down` để trả
lại đúng trạng thái trước đó (không chạy) — KHÔNG sửa `.env`, không cần dọn dữ liệu test trong
volume Postgres (vô hại, không ảnh hưởng ai). Kỹ thuật này áp dụng được cho MỌI kịch bản E2E
trước đây bị gắn nhãn "cần nhiều tài khoản thật" (ngắt kết nối giữa ván, ghép trận nhanh đồng
thời, sảnh realtime nhiều tab) — không còn là blocker thật sự, chỉ là việc chưa làm.

## Quy tắc viết test

- Tên test mô tả hành vi: `ApplyMove_WrongTurn_ReturnsFailWithMessage`.
- Cấu trúc Arrange–Act–Assert; một test một hành vi.
- Test độc lập nhau, không phụ thuộc thứ tự chạy; tự dọn data mình tạo.
- Sửa bug → viết test tái hiện bug **trước khi** fix; test đó ở lại vĩnh viễn làm regression guard.
- Test phải chạy trong CI (xem [`../workflow/deployment.md`](../workflow/deployment.md)); test flaky phải sửa hoặc xoá, không để đỏ-xanh ngẫu nhiên.

## Linting & formatting

**Máy làm việc của máy** — không tranh luận style trong review; formatter quyết.

- Backend C#: `.editorconfig` ở root quy định style; `dotnet format` trước khi commit. Build không được sinh warning mới; hướng tới `TreatWarningsAsErrors` khi đã sạch.
- Frontend: ESLint (`@typescript-eslint`) + Prettier. `npm run lint` và `tsc --noEmit` phải sạch.
- ❌ Không tắt rule bằng `eslint-disable`/`#pragma warning disable` tràn lan — mỗi lần disable phải theo dòng cụ thể kèm lý do.
- Lint/format/type-check chạy trong CI, fail là chặn merge.

## Code review checklist

Người review (hoặc tự review trước khi mở PR) đối chiếu:

**Đúng đắn**
- [ ] Luật chơi/logic enforce ở server, không tin client (xem [`security.md`](./security.md))
- [ ] Mọi đường lỗi trả message rõ ràng đến người dùng — không nuốt im lặng
- [ ] Lỗi Redis/RabbitMQ/OpenSearch không chặn luồng chính (try-catch + log Warning)
- [ ] Deserialize input từ client có bọc try-catch
- [ ] Async đúng: không `.Result`/`.Wait()`, không floating promise

**Schema/DB** (nếu PR đổi schema)
- [ ] Có `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (không chỉ CREATE TABLE)
- [ ] Cột NOT NULL mới có `DEFAULT`
- [ ] Không thêm cột game-specific vào bảng generic (thuộc về JSONB)
- [ ] `{}` trong SQL raw escape thành `{{}}`

**Frontend**
- [ ] Ba state loading/empty/error đều được render
- [ ] Lỗi network/SignalR hiện lên UI, không chỉ console
- [ ] Không mutate state trực tiếp

**Chung**
- [ ] Có test cho hành vi mới / test tái hiện bug được fix
- [ ] Không còn code debug (`console.log`, `Console.WriteLine`), code chết, import thừa
- [ ] Không secret trong diff (xem [`security.md`](./security.md))
- [ ] Tài liệu liên quan (`CLAUDE.md`, `rules/`) cập nhật cùng PR

## Định nghĩa "xong" (Definition of Done)

Một thay đổi được coi là xong khi: build + lint + test xanh, đã tự chạy thử luồng ảnh hưởng (với bug realtime: đã test 2 client), tài liệu cập nhật, PR được review.
