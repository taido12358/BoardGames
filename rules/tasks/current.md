# Current Task

## Objective

**Chỉ thị `/goal` liên tục** (bắt đầu 2026-09-10, gia hạn 2026-09-11 — "tự suy nghĩ hướng phát
triển, lên kế hoạch chi tiết, triển khai kế hoạch đó cho đến khi người dùng bảo dừng"): tự chọn
việc trong backlog/khảo sát code, lên kế hoạch, làm, build+test xanh, cập nhật rules, commit+push
lên `master`, lặp lại. Không chờ xác nhận người dùng cho từng bước; chỉ dừng lại hỏi khi việc có
tính phá huỷ/không đảo ngược được hoặc mơ hồ tới mức đoán sai sẽ tốn kém (xem các lần đã hỏi:
live-test Docker Compose 2026-09-10). Người dùng có thể bảo dừng bất cứ lúc nào — không tự ý kết
thúc goal.

## Status

IN_PROGRESS (vòng lặp liên tục, không có điểm "DONE" cố định — dừng khi người dùng yêu cầu)

## Việc đã xong (tóm tắt — chi tiết đầy đủ nằm ở `../tasks/backlog.md` mục ĐÃ LÀM tương ứng + `../logs/`)

**2026-09-10:**
1. Xoá demo "Hello World" khỏi backend (frontend đã xoá từ trước).
2. `/health` kiểm tra thật DB/Redis/RabbitMQ thay vì trả tĩnh.
3. Bang: UI chọn bài để bỏ khi vượt giới hạn tay bài cuối lượt.
4. 17 unit test mới cho luật thuần `VayBatRules.cs`.
5. Trang quản trị `/admin` (READ-ONLY) — role "Admin" qua JWT claim, xem ADR trong `../history/decisions.md`.
6. Chat trong phòng (Platform generic, dùng chung VayBat + Bang).
7. Nút "CHƠI LẠI" ở màn thắng/thua (VayBat + Bang) + banner mời người khác qua SignalR.

**2026-09-11:**
8. CI/CD tối thiểu (`.github/workflows/ci.yml`) — build+test backend/frontend mọi push/PR vào
   `master`, build thử Docker image (không push) khi push thẳng `master`. Xem backlog mục
   "CI/CD — ĐÃ LÀM bản tối thiểu". **Đã verify chạy thật trên GitHub Actions** (không chỉ local) —
   run đầu tiên `success`.
9. ESLint cho frontend (`eslint.config.js` + `npm run lint`, wire vào CI) — bắt được 1 bug Rules
   of Hooks THẬT trong `VayBatBoard.tsx` ngay lần chạy đầu (đã sửa). `npm audit fix` xử lý 4/6 lỗ
   hổng dev dependency có sẵn; còn `vite`/`react-router-dom` cần bump major, để riêng (xem backlog
   mục "Nâng cấp dependency frontend có breaking change").
10. Test tích hợp Postgres thật cho `RoomService` (Testcontainers, 5 test) — trả nợ kỹ thuật cũ
    nhất trong backlog (từ 2026-08-05). Tách `Data/SchemaBootstrapper.cs` khỏi `Program.cs` để
    test tái dùng đúng SQL thật (copy nguyên vẹn, verify byte-for-byte, smoke-test qua container
    Postgres tạm trước khi tin — xem `rules/logs/2026-09-11.md` vì đây đúng vùng code từng gây sự
    cố mất dữ liệu 2026-09-05). Xem backlog mục "Test tích hợp Postgres thật (Testcontainers)".

11. **Game thứ ba: Ô Ăn Quan** (`gameKey: "oanquan"`) — trò chơi dân gian Việt Nam, 2 người, bàn
    12 ô. Luật đầy đủ (rải quân 2 chiều, relay, ăn quân/ăn quan, "hết vốn", kết thúc ván) + 18
    unit test luật thuần. Không dùng asset zodiac có sẵn (dùng CSS/số quân thuần, nhất quán với
    VayBat/Bang). Xem ADR về lựa chọn luật khi nguồn dân gian có dị bản trong
    `../history/decisions.md`, và backlog mục "Game thứ ba — Ô Ăn Quan — ĐÃ LÀM".
    `dotnet build`/`dotnet test`: 141/141 pass. `npm run lint`/`tsc`/`vite build`: sạch.
    **CHƯA live-test qua Chrome/Docker Compose** — ưu tiên cao hơn các UI tweak nhỏ trước đó vì
    đây là game HOÀN TOÀN MỚI, xem "Ghi chú môi trường" bên dưới.

12. **Nâng cấp `react-router-dom` 6→7** — hoàn toàn không cần đổi code (v7 giữ nguyên export
    quen thuộc làm tương thích ngược). Xử lý gọn 1/2 lỗ hổng `npm audit` còn lại. Xem backlog mục
    "Nâng cấp dependency frontend có breaking change" — `vite`/`esbuild` vẫn để riêng (rủi ro cao
    hơn, ảnh hưởng thực tế thấp vì chỉ lộ lúc `npm run dev`).

13. **Vitest cho frontend** (39 test) — frontend trước đó KHÔNG có test tự động nào. Test logic
    thuần: helper hiển thị/gợi ý của VayBat + Ô Ăn Quan, `gameStore.ts` (merge `isMine`, giới hạn
    chat, rematch invite) + React Testing Library cho `OAnQuanBoard.tsx` (8), `ChatPanel.tsx` (7),
    `AdminPage.tsx` (6, mock `global.fetch` theo URL) — 3 ví dụ mẫu test component, phát hiện 3
    vấn đề test thật: thiếu `afterEach(cleanup)` thủ công, jsdom không triển khai
    `Element.scrollTo`, và nhãn `STATUS_LABEL` lặp lại ở nhiều chỗ trên trang (chip lọc + badge
    bảng) cần `within(row)` để hết nhập nhằng — tất cả đã sửa. Wire vào CI. Xem backlog mục
    "Unit test frontend (Vitest)". `BangBoard.tsx`/`VayBatBoard.tsx` vẫn chưa có test component —
    nợ kỹ thuật ghi rõ, làm dần khi động tới (`VayBatBoard` khó hơn — SVG geometry jsdom không có).

14. **Test component `BangBoard.tsx`** (8 test) — trả nợ kỹ thuật ghi ở mục 13, tập trung vào
    luồng bỏ bài khi vượt giới hạn tay bài cuối lượt (thêm 2026-09-10, chưa có test tự động lúc
    đó). Phát hiện thêm 1 lỗ hổng jsdom giống `scrollTo` trước đây: `Element.scrollIntoView`
    không tồn tại (component `GameLogPanel`) — polyfill no-op thêm vào `test-setup.ts`. Xem
    `../coding/testing.md` mục "Unit test frontend (Vitest)".

15. **Test component `VayBatBoard.tsx`** (7 test) — component khó nhất để test (hình học SVG
    thật, jsdom không triển khai `createSVGPoint`/`getScreenCTM`). Phát hiện bug hạ tầng test
    nghiêm trọng hơn các lần trước: jsdom không có global `PointerEvent` nên
    `fireEvent.pointerDown` mất hẳn `clientX`/`clientY`, khiến chọn quân thất bại ÂM THẦM (không
    lỗi gì để lộ ra) — phải tự dựng `MouseEvent` kiểu `"pointerdown"` để thay thế. Xem
    `../coding/testing.md` mục "Unit test frontend (Vitest)" bài học thứ 4. **Không còn nợ kỹ
    thuật test component frontend** — cả 3 board game đều có test.

16. **Cache NuGet packages trong CI** — job backend thêm `actions/cache@v4` (`path:
    ~/.nuget/packages`, key = hash mọi `*.csproj`), không cần `packages.lock.json` như dự tính
    ban đầu (xem backlog mục "CI/CD"). Job frontend đã có cache npm sẵn từ đầu.

17. **Test riêng cho `GameMapper`** (`Platform/GameMapperTests.cs`, 11 test) — logic thuần
    (`MySideOf`/`ToDto`/`ToSummaryDto`/`SeatDtosOf`) tính `MySide`/`IsMine` theo caller, trước đó
    chỉ được exercise gián tiếp qua `RoomServiceIntegrationTests`, chưa có test trực tiếp dù đây
    là nơi quyết định đúng ghế/quyền hiển thị cho đúng người xem (`GameHub.BroadcastRoomStateAsync`
    dùng `MySideOf` để redact state — sai ở đây có thể lộ thông tin ẩn sai người). Test dùng lại
    engine thật (`VayBatEngine`/`BangEngine`) thay vì fake, đúng pattern
    `RoomServiceIntegrationTests` đã dùng. Gồm cả 2 test phòng thủ dữ liệu hỏng (`SeatsJson`
    rỗng/không parse được → trả ghế trống thay vì throw, xem `SeatCodec`).

18. **Game thứ tư: Đua Xe Hoàng Đạo** (`gameKey: "zodiacrace"`) — tự thiết kế MVP tối giản (đổ
    xúc xắc, đường đua tuyến tính, về đích trước thắng ngay), 2-6 người (ghế generic như Bang).
    KHÔNG dùng bộ asset ảnh `assets/games/zodiac/` (shop/trang bị/thùng hàng/xe thật) — chỉ dùng
    tên + icon Unicode 12 cung hoàng đạo, xem ADR đầy đủ (lý do không cố tái hiện hệ kinh tế phức
    tạp mà asset gợi ý — không có spec/nguồn nào để biết "đúng" là gì, khác hẳn Ô Ăn Quan) trong
    `../history/decisions.md`. Backend: `ZodiacRaceTypes/Rules/Engine.cs`, 27 test mới
    (`ZodiacRaceRulesTests`/`ZodiacRaceEngineTests`) — `ApplyRoll` nhận `Func<int> rollDice` thay
    vì `Random` trực tiếp để test kiểm soát chính xác kết quả xúc xắc; `NewGame()` cố tình chưa
    cấp phát mảng theo seat, `OnRoomFull` mới cấp phát thật (tránh lệch với
    `RoomService.ResolveSeatCount`, giống Bang). Frontend: `games/zodiacrace/` đầy đủ
    (types/metadata/CreateOptions/Board), 16 test mới. Đăng ký DI (`Program.cs`), route
    (`RoomRoute.tsx`), registry (`gameRegistry.ts`), accent theme mới `"zodiac"`.

19. **Live-test Ô Ăn Quan + Đua Xe Hoàng Đạo qua hệ thống sống thật** (không chỉ unit test) —
    phát hiện quan trọng: blocker "cần tài khoản Gmail thật" ghi từ 2026-09-05 KHÔNG còn đúng,
    Docker Compose local tự fallback log OTP ra console khi SMTP chưa cấu hình đủ. Ghi đè
    `EMAIL_PROVIDER=` (rỗng) CHỈ cho phiên chạy của mình (không sửa `.env` thật đang có SMTP
    Gmail thật) để bật fallback này, tạo tài khoản test bằng email bịa, dùng script Node nhỏ với
    `@microsoft/signalr` (đã có sẵn `frontend/node_modules`, dùng JWT lấy từ `verify-otp` làm
    `accessTokenFactory`) để giả lập 2 người chơi thật qua đúng hub thật. Kết quả: Ô Ăn Quan
    (rải quân/relay/ăn quan qua 3 nước đi thật) và Đua Xe Hoàng Đạo (chơi tới khi có người thắng,
    xác nhận đúng thu thập thùng hàng + clamp về đích) đều hoạt động đúng trên hệ thống sống
    thật. Xem kỹ thuật đầy đủ trong `../coding/testing.md` mục "Live-test nhiều người chơi thật".
    Dọn dẹp: `docker compose down` sau khi xong (không chạy trước đó), không sửa file cấu hình
    nào, dữ liệu test còn lại trong volume Postgres vô hại.

20. **Live-test 3 kịch bản treo từ 2026-09-05** (ngắt mạng giữa ván, ghép trận nhanh đồng thời,
    sảnh realtime 2 tab) — cùng kỹ thuật mục 19, xem chi tiết kết quả ở mục "Việc dở dang từ đợt
    trước" bên dưới (đã chuyển thành ĐÃ XONG). Không còn việc nào treo từ đợt 2026-09-05.

21. **Vá 2 lỗ hổng NuGet transitive High severity** — `dotnet list package --vulnerable
    --include-transitive` (kiểm tra định kỳ theo `rules/coding/security.md`, chưa từng chạy từ
    trước) phát hiện `System.Text.Json` 8.0.0 và `Microsoft.Extensions.Caching.Memory` 8.0.0 bị
    kéo về bản gốc có lỗ hổng dù không package nào trực tiếp khai báo chúng. Ghim thẳng bản vá
    mới nhất cùng dòng `8.0.x` (8.0.6/8.0.1) trong `BoardGame.Api.csproj` — rủi ro breaking rất
    thấp (bản vá trong dòng LTS, không nâng major, khác hẳn tình huống `vite`/`vitest` ở mục
    trên). Xem backlog mục "Vá lỗ hổng NuGet transitive High severity". `dotnet list package
    --vulnerable` sạch sau khi ghim, `dotnet test` 179/179 pass, smoke-test qua Docker Compose
    thật (đăng nhập OTP + gọi API xác thực) xác nhận JSON serialization vẫn đúng.

22. **Debug panel BANG!** (van-de.md §51) — rà lại quyết định "cần hỏi trước" cũ, xem ADR đầy đủ
    trong `../history/decisions.md`: đây là tính năng dev-only CHÍNH người dùng đã yêu cầu trong
    spec, không đụng dữ liệu thật, hoàn toàn đảo ngược được — khác bản chất với thao tác admin
    phá huỷ dữ liệu thật (vẫn tiếp tục cần hỏi). Backend: `BangRules.DebugForceDraw`/
    `DebugForceDamage`/`DebugForceEndTurn` (wrapper public tái dùng đúng logic thật, không viết
    lại), `BangDebugController.cs` (`/api/debug/bang/*`, gate `Debug:BangPanelEnabled` config
    thay vì chỉ `IsDevelopment()` — cùng lý do `SmtpOtpSender` cần cờ riêng, xem
    `rules/coding/security.md`), 10 test mới. Frontend: `BangDebugPanel.tsx` (chỉ hiện khi
    `GET /api/debug/bang/enabled` trả `true`), 6 test mới. Live-test qua hệ thống sống thật với 4
    tài khoản: force-draw/force-damage/force-end-turn/xem state đầy đủ đều hoạt động đúng, kể cả
    trigger đúng victory detection khi ép loại Sheriff.

23. **Sửa bug thật: `GameDetails.tsx` mất nền artwork cho Ô Ăn Quan/Đua Xe Hoàng Đạo** — phát
    hiện khi chủ động rà lại code tìm việc, không phải do ai báo. `GameDetails.tsx` tự khai báo
    bản sao RIÊNG của `ARTWORK_BG` (kiểu `Record<string, string>` lỏng) tách biệt khỏi
    `GameCard.tsx` — thiếu hẳn `"folk"`/`"zodiac"`, không lỗi biên dịch nào báo vì kiểu không ép
    đủ key. Gộp về `platform/artworkTheme.ts` dùng chung, ép kiểu đúng
    `Record<GameMetadata["accent"], string>` để bắt buộc đủ key ở compile-time cho game 5 sau
    này. Thêm `artworkTheme.test.ts` (2 test) làm regression guard runtime. Xem
    `../references/important-files.md` mục `artworkTheme.ts`.

24. **Test component `GameDetails.tsx`** (16 test, mới) — trang chi tiết game (hướng dẫn/tạo
    phòng/tìm trận nhanh/danh sách phòng chờ) trước đó CHƯA có test nào dù dùng nhiều nhất. Dùng
    `MemoryRouter` lần đầu trong bộ test (`useParams`/`useNavigate`/`useSearchParams`). Test nền
    artwork đúng accent cho CẢ 4 game bằng cách render THẬT component — bắt được đúng dạng lỗi đã
    xảy ra ở bug mục 23 (khác `artworkTheme.test.ts` chỉ kiểm tra hằng số) — cộng tạo phòng/tìm
    trận nhanh/huỷ phòng/hiện đúng phòng đang chờ, và 6 test chuyển tab hướng dẫn qua Bang (game
    duy nhất dùng đủ cả 6 `kind` của `InstructionSection`) — lần đầu test tới
    `GameInstructions.tsx`'s `RolesSection`/`CardsSection`/`CharactersSection`/
    `DistanceDemoSection` vốn chưa ai test.

25. **Test `authStore.ts`** (12 test, mới) — luồng đăng nhập OTP (khôi phục phiên/gửi mã/xác
    minh/đăng xuất/đếm ngược) CHƯA từng có test dù là logic quan trọng nhất (chặn cả app nếu
    sai). Phát hiện + tự sửa 1 bug hạ tầng test nghiêm trọng: `vi.unstubAllGlobals()` trong
    `afterEach` revert NHẦM stub `localStorage` dùng chung của `test-setup.ts`, không chỉ
    `fetch` của riêng file — khiến mọi test SAU test đầu tiên fail sai lý do ("lỗi mạng" giả,
    thật ra là `localStorage.setItem is not a function` bị nuốt bởi catch chung). Xem bài học
    đầy đủ trong `../coding/testing.md`.

26. **Test `LoginPage.tsx`** (12 test, mới) — trang ĐẦU TIÊN mọi người dùng thấy (nhập email →
    nhập mã OTP), chưa từng có test tự động dù `authStore.ts` (mục 25) đã có. Test cả 2 bước
    (email/mã), lọc ký tự không phải số khi gõ mã, disable nút khi chưa hợp lệ, đếm ngược gửi
    lại mã, đổi email, hiện lỗi.

27. **Test `RoomShell.tsx`** (26 test, mới) — mọi component "khung phòng" DÙNG CHUNG giữa cả 4
    game (`RoomStatusBanner`/`DisconnectBadge`/`ConnectionBanner`/`RoomErrorBanner`/
    `LeaveRoomButton`/`RematchButton`/`RematchInviteBanner`/`isOpenStatus`) — trước đó chỉ được
    exercise gián tiếp qua từng board riêng lẻ (không đủ nhánh, vd không board nào test trạng
    thái `Cancelled`/`Abandoned`). File dùng chung, blast-radius cao nhất trong frontend (1 bug
    ảnh hưởng cả 4 game cùng lúc) nên ưu tiên test trực tiếp, đủ nhánh thay vì dựa vào coverage
    gián tiếp từ board test.

28. **Test 5 action gọi API của `gameStore.ts`** (13 test mới, thêm vào `gameStore.test.ts` có
    sẵn) — `fetchEngines`/`fetchRooms`/`createRoom`/`cancelRoom`/`quickMatch` chưa từng có test
    TRỰC TIẾP dù đây là các action REST cốt lõi của cả sảnh lẫn tạo/vào phòng (trước đó
    `GameDetails.test.tsx` chỉ mock chúng thành `vi.fn()`, không test logic thật bên trong: xử lý
    HTTP lỗi, lỗi mạng, merge dữ liệu). Cùng khuôn `authStore.test.ts` — áp dụng ngay bài học
    KHÔNG dùng `vi.unstubAllGlobals()` (mục 25) ngay từ đầu, không lặp lại sự cố.

29. **Sửa bug a11y thật: `<label>` không gắn với input/nhóm nút** — phát hiện qua audit tĩnh
    (`grep` tìm mẫu HTML thiếu ngữ nghĩa, không cần trình duyệt) tại cả 3 form
    `games/*/CreateOptions.tsx`. VayBat có `<input>` đơn lẻ nhưng `<label>` thiếu `htmlFor`/`id`
    — sửa bằng cách thêm cặp `htmlFor`/`id`. Bang/ZodiacRace là nhóm NÚT chọn 1-trong-N (không
    phải input đơn lẻ) nên `<label htmlFor>` sai ngữ nghĩa — sửa bằng `role="group"` +
    `aria-labelledby` (đổi `<label>` thành `<span id=...>`). Thêm
    `platform/createOptionsAccessibility.test.tsx` (3 test) làm regression guard. Cũng phát hiện
    (nhưng KHÔNG có bug) khi audit rộng hơn: không có `<div onClick>` nào trong toàn bộ frontend,
    không có `<img>` nào thiếu `alt` (dự án không dùng `<img>` — đúng chủ trương không dùng
    artwork thật), input còn lại (`GameLibrary`/`ChatPanel`/`LoginPage`) đều đã có
    `aria-label`/`<label htmlFor>` đúng.

30. **Trang "Lịch sử ván đấu"** (`/history`) — trả nợ TÍNH NĂNG (không phải bug): backend đã có
    sẵn từ đầu dự án `GamesController.Search` (`GET /api/games/search?q=`) +
    `OpenSearchService.SearchGamesAsync` (tìm theo người thắng/tên người chơi/trạng thái, index
    mỗi khi ván kết thúc) nhưng CHƯA TỪNG có giao diện nào gọi tới — tìm thấy khi grep toàn
    frontend không ra kết quả nào tham chiếu endpoint này. Thêm `GameHistoryPage.tsx` (route
    `/history`, link "📜 Lịch sử" cho MỌI người đăng nhập — không phải tính năng quản trị, khác
    `/admin`), debounce 300ms khi gõ tìm kiếm. 6 test mới (`vi.useFakeTimers()` để test debounce
    không cần chờ thật). **Live-test qua hệ thống sống thật**: chơi 1 ván Đua Xe Hoàng Đạo tới
    khi có người thắng (dùng lại script Node từ việc live-test trước), xác nhận
    `GET /api/games/search` (rỗng/theo tên người chơi/theo winner) đều trả đúng bản ghi vừa
    index, và query không khớp gì trả `[]` đúng như frontend kỳ vọng.

31. **Trang đổi tên hiển thị** — trả nợ TÍNH NĂNG thứ hai (cùng kỹ thuật audit ở mục 30): backend
    có sẵn từ đầu dự án `PUT /api/auth/display-name` (`AuthController.cs`, validate rỗng/tối đa 30
    ký tự, refresh claim JWT) nhưng CHƯA từng có giao diện nào gọi tới — phát hiện khi grep toàn
    frontend không ra kết quả nào tham chiếu endpoint này (cùng đợt audit tìm ra `/history` ở mục
    30). Thêm `authStore.updateDisplayName` (4 test), `DisplayNameEditor.tsx` — sửa tên tại chỗ
    ngay trên header (bấm vào tên → input inline, Enter/Escape, Lưu/Huỷ), 8 test component. Gắn
    vào `App.tsx` thay `<span>{user.displayName}</span>` tĩnh cũ. **Live-test qua hệ thống sống
    thật** (Docker Compose, `EMAIL_PROVIDER=` rỗng tạm thời cho phiên test rồi phục hồi lại
    `.env` SMTP thật): đổi tên thành công → cookie JWT refresh đúng claim `name` mới (`/api/auth/me`
    phản ánh ngay), từ chối tên rỗng/quá 30 ký tự, 401 khi không có cookie — đều đúng như thiết
    kế.

32. **Test trực tiếp `adminStore.ts`** (12 test mới) — cùng nợ kỹ thuật dạng mục 28
    (`gameStore.ts`): 3 action REST (`checkAdmin`/`fetchRooms`/`fetchStats`) trước đó chỉ được
    exercise gián tiếp qua `AdminPage.test.tsx` (mock thành black-box qua `global.fetch`, không
    test riêng từng nhánh lỗi/query string). Test đủ nhánh: thành công, lỗi HTTP (403/401/500),
    lỗi mạng, đúng query string khi có/không filter, và xác nhận `fetchStats` cố ý im lặng bỏ qua
    lỗi (thống kê chỉ phụ trợ, không chặn trang — đúng thiết kế trong code, không phải thiếu sót).

33. **Test HTTP tích hợp qua `WebApplicationFactory`** (16 test mới) — trả nợ kỹ thuật lớn nhất
    còn lại trong tầng test backend: `RoomServiceIntegrationTests` (mục trước) chỉ gọi thẳng
    `RoomService`, bỏ qua HOÀN TOÀN tầng controller/`[Authorize]`/cookie JWT; phân quyền Admin
    (`[Authorize(Roles = "Admin")]`) trước đó chỉ verify tới tầng tạo/validate JWT thuần
    (`TokenServiceTests`), CHƯA BAO GIỜ chạy qua đúng pipeline HTTP thật — một lỗ hổng cấu hình ở
    tầng routing/middleware có thể lọt qua mọi test hiện có. Thêm `AuthApiFactory.cs`
    (`WebApplicationFactory<Program>` + Testcontainers Postgres, dùng chung 1 factory/container
    cho mọi test trong class) + `AuthControllerIntegrationTests.cs` (9 test: luồng OTP đầy đủ,
    sai mã, hết hạn, đổi tên hiển thị + refresh cookie, đăng xuất) +
    `AdminControllerIntegrationTests.cs` (7 test: role Admin/non-Admin qua middleware thật —
    200/403/401 đúng như thiết kế). Cần thêm `public partial class Program {}` marker cuối
    `Program.cs` (không đổi hành vi runtime) + gói `Microsoft.AspNetCore.Mvc.Testing`.
    **Gotcha hạ tầng test đáng kể nhất phiên này**: `ConfigureAppConfiguration` của
    `WebApplicationFactory` KHÔNG ghi đè được config mà `Program.cs` đọc EAGER lúc boot
    (`ADMIN_EMAILS`/`JWT_SECRET` qua `new TokenService(builder.Configuration)`, chạy trước
    `Build()`) — chỉ ghi đè đúng cho config đọc LAZY (vd `AddDbContext`). Tự xác nhận bằng cách in
    trực tiếp giá trị config ra file ngay tại điểm đọc — ra rỗng dù đã override. Sửa bằng
    `ConfigureTestServices` đăng ký lại `TokenService` qua factory LAZY resolve `IConfiguration`
    từ DI (không dựng sẵn secret khác — sẽ lệch khoá ký/xác thực với `AddJwtBearer` đã chốt từ
    instance gốc, gây 401 toàn bộ). Xem chi tiết đầy đủ trong `rules/coding/testing.md` mục "Test
    HTTP tích hợp qua WebApplicationFactory".

34. **Mở rộng test HTTP tích hợp sang `GamesController`** (13 test mới) — cùng hạ tầng
    `AuthApiFactory` vừa dựng ở mục 33, thêm `LoggedInClientAsync()` dùng chung (rút gọn
    `AdminControllerIntegrationTests` khỏi helper trùng lặp). Test sảnh chờ qua HTTP thật: tạo
    phòng (thành công/gameKey sai/thiếu gameKey/chưa đăng nhập), lấy chi tiết phòng (tồn tại/không
    tồn tại), huỷ phòng (đúng chủ/sai chủ → 403/không tồn tại → 404), ghép trận nhanh (2 người
    khác nhau vào ĐÚNG 1 phòng, tự chuyển `Playing`), danh sách phòng. Cố tình KHÔNG test
    `GET /api/games/search` — endpoint đó gọi thẳng OpenSearch thật không try/catch (khác mọi
    endpoint khác), cần OpenSearch chạy thật mới có ý nghĩa, đã có live-test thủ công riêng.

35. **Trang "Xem lại ván đấu" (Replay)** — trả nợ tính năng phát hiện qua audit spec gốc
    (`van-de.md` §37 "replay"): `MinioStorageService`/`GameHub.FinishGame` đã lưu đầy đủ artifact
    replay (seats/map/finalState/danh sách nước đi) mỗi khi ván kết thúc TỪ ĐẦU DỰ ÁN, nhưng
    `MinioStorageService` CHỈ CÓ GHI (`SaveReplayAsync`), chưa từng có cách đọc lại — không route
    backend, không UI nào tham chiếu. Thêm `MinioStorageService.GetReplayAsync` (đọc lại, bắt
    `ObjectNotFoundException`/`BucketNotFoundException` trả null; lỗi kết nối khác propagate lên
    để controller trả 503, không nuốt im lặng) + `GamesController.Replay`
    (`GET /api/games/{id}/replay`, 404 nếu chưa có/không tồn tại, 503 nếu MinIO lỗi). Cố tình
    KHÔNG dựng lại bàn cờ từng bước animate — engine không hỗ trợ tái tạo state ban đầu từ 1 map
    cố định (NewGame() sinh map MỚI mỗi lần, không nhận map có sẵn), cần thay đổi kiến trúc engine
    lớn hơn để làm đúng; phạm vi lần này chỉ hiện tóm tắt (thắng/người chơi/số nước đi) + danh
    sách nước đi theo thứ tự (side + JSON nước đi) — đã đúng nghĩa "xem lại được", để dành phần
    animate bàn cờ cho đợt sau nếu cần. Frontend: `GameReplayPage.tsx` (route `/replay/:roomId`),
    link "🎬 Xem lại" ở mỗi dòng ván ĐÃ KẾT THÚC trong `/history`.
    **Test:** 2 test HTTP tích hợp (`GamesControllerIntegrationTests`) verify hành vi phòng thủ
    KHÔNG BAO GIỜ lộ 500 (chấp nhận 404 HOẶC 503 tuỳ MinIO có sẵn trong môi trường test hay không —
    môi trường CI sạch sẽ luôn ra 503, môi trường dev có thể có MinIO thật còn sót từ live-test
    trước đó nên ra 404 thật) + 401 khi chưa đăng nhập. 6 test component `GameReplayPage.test.tsx`
    (tải thành công/404/503/lỗi mạng/ván không có nước đi). Cập nhật `GameHistoryPage.test.tsx`
    bọc `MemoryRouter` (trang giờ có `<Link>`).
    **Live-test qua hệ thống sống thật**: rebuild + recreate container `backend` (code mới). Thử
    trước bằng kỹ thuật "ngắt kết nối đột ngột kích hoạt SeatTimeoutService" (VayBat) — ván kết
    thúc đúng (`winner: "WHITE"`) nhưng `GET /replay` trả 404! Điều tra ra **phát hiện quan trọng
    ngoài dự kiến**: `GameHub.FinishGame` (lưu replay + index OpenSearch) CHỈ được gọi từ nhánh
    thắng-qua-nước-đi-thật trong `GameHub.MakeMove` — cả `SeatTimeoutService.ScanOnce` (thắng do
    timeout) LẪN `BangDebugController.Mutate` (thắng ép qua debug panel) đều tự set
    `room.Status`/`room.Winner` trực tiếp, KHÔNG gọi `FinishGame` — nghĩa là các ván thắng qua 2
    đường này vô hình với CẢ `/history` (mục 30) LẪN replay (mục này), không phải bug riêng của
    replay. Xem thêm ở backlog mục "SeatTimeoutService/BangDebugController không lưu
    replay/index lịch sử". Live-test lại đúng bằng thắng qua nước đi thật: chơi 1 ván Đua Xe Hoàng
    Đạo tới khi có người thắng (script Node/SignalR gọi `MakeMove` lặp lại `{type:"ROLL"}` qua hub
    thật cho tới khi 1 bên về đích), `GET /api/games/{id}/replay` trả đúng seats/winner/map/
    finalState/toàn bộ 11 nước đi thật (gồm cả nước "__room_full__" hệ thống tự chèn lúc đủ ghế).

36. **Sửa gap: SeatTimeoutService/BangDebugController không lưu replay/index lịch sử** — phát
    hiện ở mục 35, xem ADR/chi tiết đầy đủ trong `rules/tasks/backlog.md` mục cùng tên (đã chuyển
    ĐÃ SỬA). `GameHub.FinishGame` chuyển thành `public static`, gọi thêm từ
    `SeatTimeoutService.ScanOnce` + `BangDebugController.Mutate`. Verify lại bằng live-test đúng
    kịch bản đã phát hiện ra gap (VayBat seat-timeout): trước sửa `GET /replay` trả 404 sau khi
    ván thắng qua timeout, sau sửa trả đúng dữ liệu thật.

**Sự cố CI (2026-09-11)**: commit thêm tính năng Replay (mục 35) làm CI FAIL ở bước Test dù build
sạch và local luôn pass. Thử sai 1 lần (đoán do 3 class test tự dùng `IClassFixture<AuthApiFactory>`
riêng gây quá tải container CI — gộp vào 1 `ICollectionFixture` dùng chung, thay đổi đúng nhưng
KHÔNG PHẢI nguyên nhân chính, CI vẫn fail). Nguyên nhân THẬT: `docker compose` còn chạy sẵn trên
máy dev (từ live-test trước) che giấu 1 bug thật trong `MinioStorageService.GetObjectAsync` — khi
không kết nối được MinIO, SDK trả về stream RỖNG thay vì throw, khiến `GetReplayAsync` trả `""`
(không phải `null`), gây `GameJson.Element("")` ném `JsonException` không ai bắt → lộ 500. Chỉ tái
hiện được sau khi chủ động `docker compose down` + chạy lại ĐÚNG lệnh CI dùng
(`--configuration Release`). Xem chi tiết đầy đủ + bài học chẩn đoán trong
`rules/coding/testing.md` mục "Sự cố CI thật + bài học chẩn đoán".

37. **Animation đầu tiên cho Bang! — rung khi mất máu** (§46, xem `rules/tasks/backlog.md` mục
    cùng tên) — hook dùng chung `useDamageShake(hp)` (5 test) + `.animate-shake` CSS, áp vào
    `PlayerSeat.tsx`/`LocalPlayerPanel.tsx`. Định live-test qua Chrome nhưng extension không kết
    nối được trong môi trường phiên này — chỉ verify bằng test logic + review code, CHƯA xác nhận
    trực quan. Ghi rõ trong backlog để làm tiếp khi có Chrome khả dụng.

38. **Test `useGameRoomHub.ts`/`useLobbyHub.ts`** (17 test mới) — 2 hook SignalR trước đó chưa có
    test tự động (mock `@microsoft/signalr` qua `vi.mock` + `vi.hoisted()` để bắt handler đăng ký
    qua `.on()`/`.onreconnected()` rồi tự gọi lại trong test, không cần server thật). Verify wiring
    6 sự kiện hub → gameStore, logic reconnect (tự JoinRoom lại phòng cũ HOẶC SubscribeLobby tuỳ
    đang ở đâu — đúng logic dễ sai đã ghi chú sẵn trong code), và các action gửi invoke.

**Người dùng yêu cầu dừng (2026-09-11)** — dừng vòng lặp `/goal` tại đây. `npm run test`: 218/218
pass (201 cũ + 17 mới), lint/build sạch. Đã commit + push lên `master`, CHƯA verify CI cho commit
cuối (dừng trước khi kịp poll).

Tổng test hiện tại: backend 220/220 pass (`dotnet test backend/BoardGame.sln`), frontend 218/218
pass (`npm run test` trong `frontend/`) — cả 2 đúng lệnh CI dùng; 5+16+13+2=36 test backend cần Docker.

**Đã verify cả 17 commit (14-33) chạy thật trên GitHub Actions** — run
`34518584349`/`34519404921`/`34519619027`/`34521278895`/`34523008065`/`34524664240`/
`34525284764`/`34526258657`/`34528351569`/`34529196962`/`34529674967`/`34530079935`/
`34530757755`/`34531421319`/`34531768899`/`34532473258`/`34532748965` đều `completed`/`success`
(gồm cả job `docker` build thử smoke test), không chỉ xanh cục bộ.

**Commit 34-36 (mục 34/35/36) — CÓ sự cố CI thật, đã sửa xong**: `97d1724`/`62889ef` xanh bình
thường; `d6b4950`/`f98086d` (test HTTP tích hợp mới) xanh; `d7c4d913` (thêm tính năng Replay) VÀ
`9146ebc` (lần sửa đầu, sai nguyên nhân) đều ĐỎ trên Actions — xem sự cố đầy đủ +
nguyên nhân thật + cách chẩn đoán trong `rules/coding/testing.md` mục "Sự cố CI thật + bài học
chẩn đoán". `8701989` (sửa đúng nguyên nhân: `MinioStorageService` trả rỗng thay vì throw khi mất
kết nối) đã verify `completed`/`success` trên Actions — master xanh trở lại. `7239b77` (ghi log)
và `df61a9b` (animation rung mất máu, mục 37) cũng đã verify `completed`/`success`.

**Kết quả 2 đợt audit tĩnh bổ sung (không tìm thấy vấn đề mới)**: rà `key={index}` trong
`.map()` toàn frontend — hầu hết là false positive (mảng tĩnh không đổi thứ tự, hoặc biến vòng
lặp thực ra là ID miền dữ liệu như số ô Ô Ăn Quan chứ không phải vị trí mảng); `ChatPanel.tsx`
có lý thuyết bị ảnh hưởng khi danh sách tin nhắn bị cắt bớt đầu (`slice(-200)`) nhưng không gây
bug thật vì mỗi tin nhắn không có state riêng. Rà `catch` "im lặng" (không log) trong backend —
các engine (`VayBatEngine`/`BangEngine`/`OAnQuanEngine`/`ZodiacRaceEngine`) đều có 1 catch im
lặng khi state hỏng không deserialize được; cân nhắc thêm `ILogger` để log cảnh báo (nhất quán
hơn với `GameHub.cs`/`GamesController.cs`/`RoomService.cs`) nhưng QUYẾT ĐỊNH KHÔNG làm — cần
thêm constructor injection cho cả 4 engine (hiện đều parameterless), kéo theo sửa lại MỌI chỗ
test đang gọi `new VayBatEngine()` v.v. (hàng chục chỗ), đổi lấy 1 log warning cho tình huống gần
như không thể xảy ra trong thực tế (state luôn do chính engine đó ghi ra) — rủi ro/công sức không
tương xứng lợi ích, giữ nguyên hành vi hiện tại (fail-safe im lặng đã có test riêng).

**Phiên làm việc mới 2026-09-14** (task riêng do người dùng giao — KHÔNG phải tiếp tục vòng lặp
`/goal` đã dừng ở trên; người dùng chỉ định rõ 1 trong 2 việc backlog cụ thể):

39. **Làm nốt animation Bang! còn thiếu (van-de.md §46)** — xem chi tiết đầy đủ trong
    `rules/tasks/backlog.md` mục "Animation Bang!". Người dùng cho lựa chọn giữa việc này và
    `InitialStateForMap()` cho replay animate (đánh giá kiến trúc lớn hơn, ưu tiên nếu có thời
    gian) — CHỌN animation Bang! vì rủi ro thấp hơn nhiều: khảo sát kỹ `InitialStateForMap()` phát
    hiện vấn đề sâu hơn mô tả gốc trong backlog, xem mục "Đánh giá lại `InitialStateForMap()`" bên
    dưới, nên không làm trong phiên này để tránh làm ẩu 1 tính năng kiến trúc lớn.

    Làm 4 mục còn thiếu: `useMuzzleFlash` (6 test), `useCardDrawFlash` (5 test),
    `useWeaponEquipFlash` (4 test), `localOutcome` cho màn thắng/thua (10 test) + wiring vào
    `VictoryScreen.tsx`/`BangBoard.tsx` (5 test mới trong `BangBoard.test.tsx`). Tổng +30 test
    frontend. Phát hiện + sửa 1 bug thật không liên quan trực tiếp animation: `RoleKind` sai chính
    tả (khai báo thường trong khi dây thật viết hoa) — xem chi tiết trong backlog.

    **Test**: backend không đổi gì (không chạm code backend) — `dotnet test
    backend/BoardGame.sln --configuration Release`: 220/220 pass (không đổi so với trước phiên
    này). Frontend: `npm run test`: 248/248 pass (218 cũ + 30 mới), `npm run lint`: sạch (2
    warning cũ đã biết, không mới), `npm run build` (`tsc` + `vite build`): sạch.
    **CHƯA live-test qua trình duyệt thật** — không thử lại Chrome extension trong phiên này, xem
    lý do đầy đủ trong backlog.

**Đánh giá lại `InitialStateForMap()` cho replay animate — CHƯA làm, để lại phân tích cho đợt sau**

Backlog mô tả việc này khá đơn giản ("thêm 1 phương thức `InitialStateForMap(mapJson)` vào
`IGameEngine`, áp lại tuần tự `ApplyMove` từ trạng thái ban đầu"). Khảo sát kỹ trước khi làm phát
hiện vấn đề sâu hơn nhiều so với mô tả đó — không chỉ là map cố định, mà TRẠNG THÁI BAN ĐẦU thật
của nhiều game phụ thuộc RNG không tái tạo lại được đúng chỉ từ map:
- **VayBat**: `VayBatEngine.NewGame` gọi `VayBatRules.CreateState(map, randomRed: true)` — bên
  nào đi trước (RED/WHITE) chọn NGẪU NHIÊN ngay trong `NewGame()`, KHÔNG phải qua 1 "move" nào
  được ghi lại. `InitialStateForMap(map)` không có cách nào biết lại đúng lựa chọn ngẫu nhiên đó
  chỉ từ map — nếu tự đặt mặc định (vd luôn RED trước) mà ván thật đã chọn WHITE trước, việc replay
  bằng cách gọi lại `ApplyMove` tuần tự sẽ sai ngay từ nước đầu tiên (side không khớp lượt hiện tại
  trong state vừa dựng).
- **Bang!**: bài/vai trò/nhân vật được chia lúc `OnRoomFull` gọi `BangRules.StartGame(...,
  Random.Shared)` — MAY MẮN việc này đã được ghi lại như 1 "move" hệ thống trong `GameMoves` (xem
  log 2026-09-11 "gồm cả nước `__room_full__` hệ thống tự chèn") NÊN về lý thuyết replay được nếu
  áp lại đúng move đó — NHƯNG áp lại move đó qua `ApplyMove`/`OnRoomFull` sẽ gọi LẠI
  `Random.Shared` và chia bài/vai trò KHÁC với ván thật đã diễn ra (không có seed nào được lưu lại
  để tái tạo đúng NGẪU NHIÊN đã xảy ra) — bàn cờ animate ra sẽ không khớp `finalState` đã lưu.
- **Đua Xe Hoàng Đạo**: mỗi nước "ROLL" gọi `ZodiacRaceRules.ApplyRoll(..., () =>
  Random.Shared.Next(1, 7))` — kết quả xúc xắc KHÔNG được lưu trong `moveJson` (chỉ lưu
  `{type:"ROLL"}`), nên áp lại move này lúc replay sẽ tung ra kết quả xúc xắc MỚI, khác hẳn ván
  thật — vị trí xe sau khi "replay" chắc chắn lệch khỏi `finalState` thật ngay từ nước đầu.

Kết luận: chỉ thêm `InitialStateForMap()` là KHÔNG đủ để replay animate ĐÚNG cho 3/4 game (chỉ Ô
Ăn Quan — `OAnQuanRules.CreateState()` không có RNG — mới thật sự tái tạo đúng bằng cách này). Làm
đúng cần thay đổi sâu hơn nhiều so với ước tính gốc trong backlog — hoặc lưu THÊM seed/kết quả RNG
của mỗi move (đổi format `GameMoves`/replay artifact, ảnh hưởng dữ liệu đã lưu trước đó), hoặc lưu
snapshot state SAU MỖI NƯỚC ĐI thay vì chỉ moveJson (tăng dung lượng lưu trữ MinIO đáng kể), hoặc
chấp nhận replay animate "gần đúng" (bàn cờ hợp lệ nhưng có thể lệch so với ván thật ở đúng những
chỗ có RNG). Đây là quyết định kiến trúc cần cân nhắc đánh đổi rõ ràng — KHÔNG tự chọn 1 hướng và
làm ẩu trong 1 phiên ngắn, nhất là sau sự cố mất dữ liệu 2026-09-05 đã dạy bài học "cẩn thận hơn
tốc độ" cho những thay đổi chạm vào dữ liệu đã lưu. Để lại nguyên trạng
(`GameReplayPage.tsx` chỉ hiện danh sách nước đi, không animate) cho tới khi có quyết định rõ ràng
hướng nào — xem `rules/tasks/backlog.md` mục "Replay — chỉ xem danh sách nước đi" đã cập nhật
thêm phân tích này.

## Việc đang làm / tiếp theo (thứ tự ưu tiên gợi ý, không bắt buộc theo đúng thứ tự)

- (Đã xong 2026-09-11 — mục 15) ~~Test component `VayBatBoard.tsx`~~.
- Cân nhắc thêm thao tác quản trị có phá huỷ (huỷ phòng treo thủ công từ `/admin`) — CHỈ làm
  nếu người dùng xác nhận cần, kèm log ai-làm-gì-lúc-nào. Khác hẳn debug panel Bang bên dưới: đây
  là thao tác trên PHÒNG THẬT/dữ liệu người dùng thật trong production, không phải công cụ
  dev-only tự gate — rủi ro phá huỷ dữ liệu không đảo ngược được là có thật (xem sự cố
  `DROP TABLE` 2026-09-05 trong "Known Issues" bên dưới), nên tiếp tục CẦN xác nhận trước.
- (Đã xong 2026-09-11 — mục 22) ~~Debug panel cho Bang (spec §51)~~ — xem ADR trong
  `../history/decisions.md`. Rà lại quyết định "cần hỏi trước" cũ: đây là tính năng dev-only đã
  được CHÍNH người dùng yêu cầu rõ trong `van-de.md` §51 ("create a debug panel... For
  development only"), gate được an toàn/hoàn toàn đảo ngược được (không đụng dữ liệu thật, không
  bao giờ lộ ra production) — khác bản chất với việc admin phá huỷ dữ liệu thật ở trên, nên
  không còn lý do chính đáng để tiếp tục hoãn.
- Nâng cấp `vite`/`vitest` major (5.x/2.x → 8.x/4.x) — lỗ hổng đã leo thang lên
  **critical**/**high** (xem backlog mục "Nâng cấp dependency frontend có breaking change"), đúng
  điều kiện đã tự đặt ra để cân nhắc lại. Đã THỬ `npm audit fix --force` nhưng bị permission
  classifier chặn (lệnh thay đổi dependency tree rộng, cần xác nhận rõ ràng) — KHÔNG cố lách qua
  `npm install` thủ công. CẦN người dùng xác nhận hoặc tự chạy lệnh trước khi làm tiếp.
- (Đã xong 2026-09-11 — mục 18) ~~Game thứ tư~~ — "Đua Xe Hoàng Đạo" (`zodiacrace`), xem ADR
  trong `../history/decisions.md`.
- (Đã xong 2026-09-11 — mục 19) ~~Live-test Ô Ăn Quan VÀ Đua Xe Hoàng Đạo~~ — xem "Việc dở dang
  từ đợt trước" bên dưới, blocker "cần tài khoản Gmail thật" hoá ra không có thật (dev-log OTP).
- (Đã xong 2026-09-11 — mục 20) ~~Áp dụng kỹ thuật live-test mới cho 3 kịch bản còn treo từ
  2026-09-05~~ — xem "Việc dở dang từ đợt trước" bên dưới, cả 3 đều đã verify qua hệ thống sống
  thật, không còn mục nào treo từ đợt đó.

## Việc dở dang từ đợt trước (2026-09-05) — ĐÃ XONG 2026-09-11

Rebuild cơ chế phòng/ghép trận đã xong code (commit `07155fc`, `15ae7b2`) từ 2026-09-05, nhưng
live-test bị dừng giữa chừng lúc đó vì tưởng cần nhiều tài khoản Gmail thật. Sau phát hiện
2026-09-11 (dev-log OTP, xem mục 19 + `../coding/testing.md`), đã live-test đủ cả 3 kịch bản còn
thiếu qua hệ thống sống thật (Docker Compose + script Node/`@microsoft/signalr`), tất cả đều
đúng như thiết kế:
- **Ngắt mạng giữa ván (VayBat)**: ngắt kết nối RED đột ngột (`conn.stop()`, không gọi
  `LeaveRoom`) → sau grace period 45s + 1 lần quét của `SeatTimeoutService` (~55s thực tế) →
  phòng chuyển `Finished`, `winner: "WHITE"` đúng như `VayBatEngine.OnSeatTimedOut`. (Bang's
  auto-end-turn/auto-fail-respond KHÔNG live-test lại — đã có `BangSeatTimeoutTests.cs` unit test
  trực tiếp hành vi này, live-test VayBat đủ để xác nhận phần plumbing generic `SeatTimeoutService`
  dùng chung hoạt động đúng.)
- **Ghép trận nhanh 2 người đồng thời**: bắn 2 request `POST /api/games/quick-match` cùng lúc
  (`curl ... & curl ... & wait`) từ 2 tài khoản khác nhau, cùng `gameKey` chưa có phòng chờ nào —
  cả 2 đúng vào CHUNG 1 phòng (không tạo 2 phòng trùng/không double-book 1 ghế), phòng tự chuyển
  `Playing` ngay khi đủ ghế. Khớp đúng guarantee `FOR UPDATE SKIP LOCKED` đã verify ở tầng service
  (`RoomServiceIntegrationTests`), nay xác nhận thêm qua tầng REST controller thật.
- **Sảnh realtime 2 tab**: tab A `SubscribeLobby` qua SignalR (không tạo phòng gì), tab B tạo
  phòng qua REST — tab A nhận đúng sự kiện `LobbyUpdated` gần như ngay lập tức với đúng thông tin
  phòng vừa tạo, không cần tự polling REST lại.

Xem log đầy đủ: `rules/logs/2026-09-11.md` Task 22.

## Known Issues (từ đợt trước, chưa liên quan việc đang làm)

- **Mất dữ liệu dev thật (2026-09-05)**: một agent trước đã lỡ chạy `DROP TABLE "GameRooms"
  CASCADE` trên DB dev thật lúc thử migration — mất 9 phòng thật, không backup, không khôi phục
  được. `Users`/`AuthOtps` không ảnh hưởng. Bài học đã ghi ở `rules/logs/2026-09-05.md` và làm
  feedback hành vi model — KHÔNG chạy lệnh phá huỷ trên DB có khả năng chứa dữ liệu thật mà không
  hỏi trước.
- Migration SQL cho rebuild phòng/ghép trận đã verify RIÊNG trên DB cách ly (`migtest`), xác nhận
  đúng và idempotent — nhưng chưa từng chạy trên dữ liệu dev thật (dữ liệu đó mất trước khi chạy).

## Ghi chú môi trường

- Docker Compose **hiện KHÔNG chạy** (đã tắt từ cuối phiên trước) — nếu cần môi trường sống,
  phải `docker compose up` lại. Việc trong đợt này chỉ verify bằng `dotnet build`/`dotnet test`/
  `tsc`/`vite build` (không cần hạ tầng sống), trừ khi việc cụ thể cần test tích hợp thật.
- `van-de.md` (spec Bang, root) — trạng thái commit tuỳ người dùng.

## Template cho task tiếp theo

```markdown
## Objective
[Việc cần làm]

## Status
IN_PROGRESS

## Requirements
- ...

## Files Involved
- ...

## Implementation Plan
1. ...

## Completed
- ...

## Remaining
- ...

## Known Issues
- ...

## Tests
- [ ] ...
```

## 2026-10-24 — Sửa lỗi gửi OTP SMTP
- DONE: tắt Windows EventLog provider trong Development vì tài khoản chạy local không có quyền ghi, gây HTTP 500 khi ghi lỗi SMTP.
- Chạy lại backend ngoài sandbox; request-otp qua frontend trả 200 với SMTP thật; health healthy; 9/9 AuthControllerIntegrationTests pass.


## 2026-10-24 — BANG!: máu tự động và UX chơi bài
- DONE: tắt debug mặc định ở API/Compose; sửa đấu súng không trừ máu khi gửi sai lá; log hồi Bia ghi lượng thực tế.
- Bài có mô tả hiệu ứng, bố cục không chồng; chỉ bật lá phù hợp, phản hồi theo loại tấn công; Thùng rượu chỉ hiện cho Bang!/Gatling; khóa thao tác khi mất kết nối/bị loại.
- Kiểm tra: 100 backend Bang tests, 51 frontend Bang tests đạt; build frontend đạt; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.


## 2026-10-24 — Vòng cải thiện UX/UI liên tục: trạng thái bàn BANG!
- DONE: reset lựa chọn lá/bỏ bài khi đổi phòng, lượt, giai đoạn hoặc người đang đi; chặn xác nhận bỏ bài nếu lựa chọn không còn hợp lệ.
- Hiển thị rõ người đang được chờ, thông báo theo dõi sau khi bị loại, lỗi ở đầu bàn; thanh thao tác tự xuống dòng trên màn hình hẹp.
- Validation: 53/53 test frontend Bang đạt, production build đạt; ESLint 0 lỗi / 2 cảnh báo có sẵn.
- Mục tiêu cải thiện liên tục vẫn ACTIVE; tiếp tục khảo sát luồng đăng nhập và sảnh ở vòng tiếp theo.


## 2026-10-24 — UX đăng nhập OTP
- DONE: dán mã có khoảng trắng/gạch nối nhận đúng 6 số; gửi lại thành công xóa mã cũ và focus ô nhập; chuyển bước/email xóa mã cũ.
- Khóa input/đổi email khi loading, aria-busy/aria-invalid/hướng dẫn mã mới nhất, hiển thị thời hạn 5 phút, dùng từ email thay Gmail.
- 31/31 LoginPage/authStore tests đạt; production build đạt, lint 0 lỗi / 2 warning có sẵn.
- Sửa mô tả security rule lỗi thời về gate debug Bang. Mục tiêu UX/UI liên tục vẫn ACTIVE.


## 2026-10-24 — UX sảnh và tạo phòng
- DONE: GameDetails hiển thị lỗi tải engines và nút Thử lại thay skeleton vô hạn.
- Tạo/hủy/tìm phòng xử lý lỗi mạng bằng catch/finally; mở lại nút sau lỗi. Khóa chung ngăn tạo phòng và tìm trận đồng thời; khóa tùy chọn phòng khi đang gửi.
- Lỗi hiển thị ngay trên phần tạo/vào phòng; skeleton có nhãn trạng thái truy cập.
- 20/20 GameDetails tests đạt; production build đạt; lint 0 lỗi/2 warning có sẵn. Mục tiêu liên tục vẫn ACTIVE.


## 2026-10-24 — Trạng thái tải phòng
- DONE: roomsLoading/roomsError riêng trong store; lỗi mạng không bị nuốt, vẫn giữ danh sách đã có.
- LobbyLoadStatus dùng chung GameDetails/GameLibrary có trạng thái đang tải, cảnh báo dữ liệu cũ và tải lại. Không hiện thông báo sảnh trống khi chưa tải được phòng.
- Phản hồi request cũ không ghi đè trạng thái lần tải mới khi chuyển trò chơi nhanh.
- 45/45 GameDetails/gameStore tests đạt, build đạt, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Phục hồi khi vào phòng lỗi
- DONE: RoomRoute dùng trạng thái loadError riêng, nút Thử vào lại và Về sảnh; không kẹt Đang vào phòng khi REST lỗi.
- Phân biệt 404 và 401/403; trạng thái loading có role status; URL sai gameKey được sửa cả khi phòng đã có trong cache.
- 3/3 RoomRoute tests mới đạt; build đạt, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Chat giữ bản nháp khi lỗi
- DONE: gửi chat chờ SignalR xác nhận, thất bại giữ nội dung và hiện lỗi; đang gửi khóa thao tác trùng.
- Mất kết nối vẫn soạn nhưng không gửi; trạng thái đang gửi rõ ràng; aria-expanded/controls/log hỗ trợ truy cập; input min-w-0 tránh tràn mobile.
- ChatPanel key theo roomId để không mang bản nháp phòng cũ sang phòng mới.
- 25/25 ChatPanel/hub tests đạt, build đạt, lint 0 lỗi/2 warning có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Tìm kiếm lịch sử
- DONE: hủy request cũ và bỏ qua response muộn khi đổi query/unmount; loading hiện ngay khi nhập từ khóa.
- Thêm Thử lại khi tải lỗi, Xóa tìm kiếm khi không có kết quả; không hiển thị bảng kết quả cũ dưới thông báo lỗi mới.
- 8/8 history tests pass, production build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — UX xem lại ván đấu
- DONE: retry khi replay lỗi/503; abort request cũ và chặn response muộn khi đổi ván/rời trang; reset dữ liệu cũ.
- Hiện mô tả thao tác Bang bằng tiếng Việt, tên người theo ghế, JSON nằm trong Chi tiết nước đi. Header wrap cho màn nhỏ.
- 8/8 replay tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Hướng dẫn dùng bàn phím
- DONE: tabs hướng dẫn hỗ trợ ArrowLeft/Right (vòng), Home/End; chỉ tab được chọn nằm trong thứ tự Tab; tiêu điểm đi cùng nội dung.
- Tab/panel có id/aria-controls/aria-labelledby; panel nhận focus; viền focus rõ và vùng bấm tab cao hơn.
- 24/24 GameInstructions/GameDetails tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Đổi tên hiển thị
- DONE: khóa yêu cầu trùng và input/hủy khi đang lưu; trạng thái Đang lưu rõ ràng, không xử lý Enter trong lúc IME composition.
- Tên rỗng hiện lỗi và giữ form; lỗi bất ngờ được catch/finally và giữ draft để thử lại. Form wrap, lỗi role alert.
- 10/10 DisplayNameEditor tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Tìm trò chơi không dấu
- DONE: tìm kiếm thư viện chuẩn hóa dấu tiếng Việt (gồm đ/d), chữ hoa/thường; nhiều từ khóa không bắt buộc cùng thứ tự; khoảng trắng thừa không gây bỏ sót.
- Thêm Xóa từ khóa giữ bộ lọc hiện tại; thông báo số trò chơi tìm thấy.
- 5/5 GameLibrary tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Bàn chơi khi mất kết nối
- DONE: Ô Ăn Quan chỉ chọn/gửi khi connected, hủy ô đã chọn khi đổi lượt/phòng/trạng thái/kết nối. Thanh chọn chiều wrap trên mobile.
- Đua Xe khóa nút và guard ROLL khi mất kết nối/không phải lượt.
- 19/19 board tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Vây Bắt khi mất kết nối
- DONE: chặn pointer chọn/kéo/thả khi không connected; không tô đích hợp lệ hoặc hiện hướng dẫn đi quân lúc offline.
- Reset chọn/drag/press khi đổi phòng/trạng thái/lượt/kết quả/kết nối/ghế; nối lại phải chọn quân mới.
- 9/9 VayBatBoard tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Thông báo truy cập dùng chung
- DONE: ConnectionBanner dùng status cho reconnect, alert cho disconnected; DisconnectBadge status atomic; RoomErrorBanner alert và break-words.
- 2 test semantics mới. Toàn frontend 31/31 files, 287/287 tests pass. Goal liên tục ACTIVE.


## 2026-10-24 — Giữ vị trí đọc nhật ký BANG!
- DONE: thay scrollIntoView bằng cuộn trong khung; chỉ tự theo dõi khi người dùng ở cuối. Đọc phía trên không bị kéo xuống.
- Có nút Xem mới nhất khi thêm diễn biến; tabIndex/aria-expanded/controls hỗ trợ bàn phím.
- 54/54 frontend Bang tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Đếm ngược gửi lại OTP
- DONE: resendIn tính từ deadline thời gian thực, không giảm theo số callback timer; không kéo dài chờ khi tab nền bị trì hoãn.
- Dừng timer/reset resendIn sau verify thành công và logout.
- 33/33 auth/LoginPage tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Đăng xuất xác nhận bởi server
- DONE: logout kiểm tra HTTP/exception; giữ user khi chưa xác nhận, báo logoutError riêng. loggingOut khóa request trùng và nút báo tiến trình.
- Thành công xóa dữ liệu phòng/chat/ghế/cache của phiên cũ. Header wrap trên màn hình nhỏ.
- 35/35 auth/LoginPage tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Khôi phục phiên khi lỗi mạng
- DONE: restoreSession phân biệt HTTP401 với lỗi mạng/server; sessionError riêng và App có Kiểm tra lại phiên thay form OTP khi chưa xác định phiên.
- Retry đặt checking/loading rõ, xóa lỗi cũ; khôi phục thành công không cần yêu cầu OTP lại.
- 36/36 auth/LoginPage tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Trạng thái realtime chính xác
- DONE: trạng thái connecting lúc start, connected sau start thành công; thất bại disconnected + lỗi.
- Reconnect chỉ connected sau đăng ký lại room/lobby thành công; thất bại báo lỗi và khóa thao tác. Callback vòng đời bỏ qua connection đã cleanup.
- 18 hub tests + 28 RoomShell tests đạt; build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Vào phòng khi realtime đang khởi tạo
- DONE: joinRoom chờ promise start trước invoke; kiểm tra connection instance còn đúng trước gửi.
- subscribeLobby ghi nhớ nhu cầu nếu connection chưa có/đang start; start đăng ký sảnh trước báo connected; unsubscribe xóa nhu cầu.
- 20 hub + 1 lobby test pass; build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Hủy yêu cầu vào phòng cũ
- DONE: RoomRoute có AbortController cho fetch và joinRoom đang chờ; cleanup hủy khi đổi route/rời trang/thử lại.
- joinRoom nhận signal tùy chọn, kiểm tra trước/sau chờ start; yêu cầu bị hủy không invoke và không báo lỗi giả.
- 24/24 hub/RoomRoute tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Bộ lọc quản trị
- DONE: fetchRooms admin bỏ phản hồi cũ sau khi đổi filter; loading/error chỉ cập nhật từ request mới nhất.
- Filter có aria-pressed, lỗi role alert/nút Tải lại danh sách giữ filter; không hiển thị bảng cũ dưới lỗi mới.
- 19/19 admin tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Điều hướng bàn phím toàn trang
- DONE: App có skip link Bỏ qua đến nội dung và main focusable trong mọi trạng thái phiên.
- Chuyển pathname đưa focus vào main sau scrollToTop; lần mount đầu giữ autofocus của form.
- Regression test pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Mời bạn vào phòng
- DONE: RoomInvite dùng chung trong RoomRoute khi Waiting, hiển thị URL đúng phòng và Sao chép liên kết.
- Clipboard fail có thông báo + input readonly chọn toàn bộ để copy thủ công; loading chống nhấn lại, layout wrap.
- 5/5 invite/route tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Giữ tìm kiếm/bộ lọc thư viện trong URL
- DONE: GameLibrary dùng query q/filter thay local state; back/refresh/link chia sẻ giữ lựa chọn.
- Replace history khi gõ/chọn để không tạo một mục lịch sử mỗi ký tự; clear filter xóa q/filter cùng lúc và giữ query khác.
- 6/6 GameLibrary tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Giữ vị trí đọc chat
- DONE: ChatPanel chỉ tự cuộn nếu đang ở cuối; khi đọc phía trên giữ vị trí và hiện Xem tin mới. Mở lại panel theo dõi cuối.
- Khung log focusable để đọc bằng bàn phím. 10/10 ChatPanel tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Lý do lỗi thao tác phòng
- DONE: create/cancel/quickMatch hiển thị error cụ thể từ server; body lỗi không JSON có fallback, HTTP401 có hướng dẫn đăng nhập lại.
- 47/47 gameStore/GameDetails tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — Chơi ngay khi dữ liệu tải chậm
- DONE: play=1 đợi gameReady và panel thật mới scroll/focus, chỉ tự cuộn một lần cho mỗi game đích.
- Nút Chơi ngay cũng focus vùng Tạo và vào phòng, có nhãn truy cập/scroll margin.
- 23/23 GameDetails tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal liên tục ACTIVE.


## 2026-10-24 — BANG! quyền bắn theo lượt
- DONE: server BangYourView.CanFire tính từ lượt/giai đoạn/giới hạn Bang/Volcanic; frontend tắt Bang/Gatling/Calamity Missed khi hết quyền tấn công.
- Phản hồi xử lý trước gate CanFire, không chặn Bang dùng phòng thủ. Có giải thích hết lượt bắn; field optional phía client để tương thích rollout.
- 101 backend Bang + 55 frontend Bang tests pass; build/lint pass (2 warnings có sẵn). Backend đã chạy lại. Goal ACTIVE.


## 2026-10-24 — BANG! hướng dẫn chọn mục tiêu
- DONE: ActionBar nhắc tên lá đang dùng và số mục tiêu hợp lệ; trường hợp không còn mục tiêu hướng dẫn hủy/chọn lá khác.
- handleSeatClick kiểm tra lại canPlayCard trước gửi để không dùng lựa chọn đã hết quyền. Có status cho trình đọc màn hình.
- 19/19 BangBoard tests pass, production build pass, lint theo kết quả vòng này. Goal ACTIVE.


## 2026-10-24 — Tùy chọn tạo phòng theo game
- DONE: optionDraft gắn gameKey, game khác luôn dùng tùy chọn mặc định thay giá trị cũ; không có khung render gửi nhầm option trước effect reset.
- Regression chuyển BANG! 8 ghế sang Zodiac và tạo phòng xác nhận payload không mang seatCount=8.
- 24/24 GameDetails tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal ACTIVE.


## 2026-10-24 — Không điều hướng theo yêu cầu phòng cũ
- DONE: GameDetails pageVersion gắn gameKey/lifecycle, callback tạo/tìm/hủy cũ không điều hướng hoặc thay đổi khóa thao tác mới.
- Đổi game reset loading/actionLock để trang mới không bị giữ bởi request trước.
- 25/25 GameDetails tests pass, build/lint theo kết quả vòng này. Goal ACTIVE.


## 2026-10-24 — Escape hủy lựa chọn BANG!
- DONE: Escape hủy chọn mục tiêu/chế độ bỏ bài, không gửi move; bỏ qua lúc IME composition. Nút Hủy nhắc Esc trực quan.
- 20/20 BangBoard tests pass; build pass, lint 0 errors/2 warnings có sẵn. Goal ACTIVE.


## 2026-10-24 — Chọn bài bỏ rõ trạng thái
- DONE: CardView có aria-pressed trong chế độ chọn bài bỏ; aria-description cung cấp rank/suit/effect để phân biệt lá cùng tên.
- Chọn đủ overflow thì khóa lá chưa chọn, vẫn cho bỏ chọn đổi ý. Bộ đếm chọn có status.
- 58/58 frontend Bang tests pass, build/lint theo kết quả vòng này. Goal ACTIVE.


## 2026-10-24 — Nhập số lượt tạo Vây Bắt
- DONE: draft cho nhập trống tạm thời, không tự chèn 1; chỉ propagate số nguyên >=1. Blur giá trị chưa hợp lệ khôi phục số trước đó.
- Có hướng dẫn/inputMode/step và aria-describedby. 30/30 options/GameDetails tests pass; build/lint theo kết quả vòng này. Goal ACTIVE.


## 2026-10-24 — OTP gửi lỗi không chiếm cooldown
- DONE: lưu mã và vô hiệu mã cũ trong transaction; SMTP false rollback, không tính cooldown/request quota cho lần chưa gửi được.
- Sender virtual để thay transport trong integration test, không gửi email thật. Test502→retry200→cooldown429.
- 10/10 AuthController integration tests với PostgreSQL pass; backend build 0 warnings/errors, đã chạy lại. Goal ACTIVE.


## 2026-10-24 — Chặn OTP request trùng
- DONE: requestOtp/verifyOtp kiểm tra loading trong store trước gửi; ngăn nhấn liên tiếp tạo mail trùng hoặc tốn nhiều verify attempts.
- Kiểm tra cooldown cho OTP hết hạn: vẫn giữ giới hạn gửi 60s/5 lần giờ theo luật hiện hành.
- 23 authStore + 15 LoginPage tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal ACTIVE.


## 2026-10-24 — Snapshot sảnh không ghi đè realtime mới
- DONE: đánh dấu id phòng upsert/remove trong lúc fetchRooms; response chậm không ghi đè state hoặc đưa lại phòng đã remove.
- isMine vẫn lấy từ REST riêng người dùng; bộ theo dõi chỉ tồn tại trong request, cleanup finally.
- 52/52 gameStore/GameDetails tests pass, build/lint theo kết quả vòng này. Goal ACTIVE.


## 2026-10-24 — Dọn phiên vô hiệu tải phòng cũ
- DONE: gameStore.resetSession gom xóa room/chat/cache/ghế/trạng thái tải; tăng request id để response cũ không nạp lại dữ liệu sau logout.
- AuthStore logout dùng resetSession sau server xác nhận. 51/51 game/auth store tests pass, build/lint theo kết quả vòng này. Goal ACTIVE.


## 2026-10-24 — Chặn sự kiện realtime phiên cũ
- DONE: cả 6 data event callbacks kiểm tra active trước ghi store, không phục hồi room/chat/error/ghế/lobby/rematch sau cleanup.
- Toàn frontend trước bản sửa nhỏ: 34 files/320 tests pass; sau sửa 22/22 hub tests pass, build/lint theo kết quả vòng này. Goal ACTIVE.


## 2026-10-24 — Tên game dễ đọc trong bản ghi
- DONE: history/replay dùng getGameTitle từ registry thay mã gameKey; game chưa đăng ký giữ mã gốc. Nhãn replay Trò chơi thay Game.
- 17/17 history/replay tests pass sau cập nhật expectation tên hiển thị; build pass, lint 0 errors/2 warnings có sẵn. Goal ACTIVE.


## 2026-10-24 — Thời gian bản ghi hợp lệ
- DONE: formatTimestamp dùng chung history/admin/chat kiểm tra getTime; thiếu/ngày lỗi hiện — thay Invalid Date.
- Chat giữ định dạng giờ/phút, history/admin giữ ngày giờ vi-VN. 26/26 tests liên quan pass, build/lint theo kết quả vòng này. Goal ACTIVE.


## 2026-10-24 — BANG! thiếu bài phòng thủ
- DONE: ActionBar nhận hasDefenseCard theo allowedResponseKinds; thiếu bài báo rõ loại cần thay yêu cầu chọn lá không tồn tại.
- Barrel hợp lệ có hướng dẫn thử/rủi ro; không có Barrel hướng dẫn Chịu đòn, không tự gửi quyết định.
- 22/22 BangBoard tests pass, build/lint theo kết quả vòng này. Goal ACTIVE.


## 2026-10-24 — Giữ tìm kiếm khi xem replay
- DONE: History dùng query q trong URL, replace khi gõ; Link replay truyền historySearch, Link Lịch sử trở lại query đó.
- Direct replay không có navigation state vẫn về /history. 20/20 history/replay tests pass, build/lint theo kết quả vòng này. Goal ACTIVE.


## 2026-10-24 — Trạng thái thống kê quản trị
- DONE: statsLoading/statsError riêng, không nuốt lỗi; giữ số cũ có cảnh báo và Tải lại thống kê.
- Chỉ tải stats theo quyền/khởi tạo, đổi filter phòng không tải stats toàn hệ thống lại; guard request stats trùng.
- 14 adminStore + 6 AdminPage tests pass, build pass, lint 0 errors/2 warnings có sẵn. Goal ACTIVE.

## 2026-10-24 — Kiểm tra quyền quản trị khi mất kết nối
- Lỗi mạng/server khi gọi admin/check giữ quyền ở trạng thái chưa xác định; chỉ HTTP 401/403 hoặc isAdmin=false mới báo không có quyền. Thêm cảnh báo và nút kiểm tra lại.
- Khôi phục getGameTitle dùng trong lịch sử/replay (metadata đã đăng ký, key lạ có nhãn dễ đọc), sửa lỗi TypeScript làm build thất bại.
- 15 adminStore + 7 AdminPage tests pass; build pass; lint 0 errors/2 warnings Fast Refresh có sẵn. Goal ACTIVE.

## 2026-10-24 — Thấy lý do lá BANG! không dùng được
- Hợp nhất kiểm tra hợp lệ của lá và lý do bị khóa; hover/đọc bằng trình đọc màn hình sẽ nêu rõ chưa tới lượt, mất kết nối, hết lượt bắn, đầy máu, không có mục tiêu hoặc đã chọn đủ bài bỏ.
- Kiểm thử lượt hợp lệ gửi PLAY_CARD; kiểm thử thông báo khi Bang! không bắn thêm được, Bia khi đầy máu và bài thứ ba khi chọn bỏ đủ số.
- 23/23 BangBoard tests pass, build pass, lint 0 errors/2 warnings Fast Refresh có sẵn. Goal ACTIVE.
- Full frontend regression sau thay đổi: 34 files, 330/330 tests pass. Backend :5000 và frontend :5173 đã có sẵn và health check backend trả 200; dừng instance phụ ở :5174.
- Bổ sung cảnh báo tổng hợp dưới tay bài khi mọi lá đều bị khóa, kèm nguyên nhân theo từng lá. Full frontend regression sau cập nhật: 34 files, 331/331 tests pass; build và lint vẫn đạt (0 lỗi).
- `makeMove` không còn bỏ thao tác im lặng khi hub chưa sẵn sàng/đã bị dọn; báo lỗi kết nối trực tiếp. Thêm 2 test hook; full frontend suite 333/333, build pass, lint 0 lỗi/2 cảnh báo có sẵn. Goal ACTIVE.
- Sửa topbar BANG! dùng `currentPlayerId` sai pha: khi đang chờ phản hồi, nó có thể báo “ĐẾN LƯỢT BẠN” dù bài bị khóa đúng luật. Nay phân biệt lượt đánh / lượt phản hồi của mình / chờ phản hồi; 2 regression xác nhận. Goal ACTIVE.
- Full verification sau sửa trạng thái lượt: 34 files, 335/335 tests pass; build pass; lint 0 errors/2 warnings Fast Refresh có sẵn. Dev server trên :5173 đã nhận HMR.

## 2026-10-24 — Animation cho toàn bộ nhịp chơi BANG!
- Hoạt ảnh lá bài được xác nhận vào chồng bỏ; lá mới vào tay theo từng card; pulse số bài trên tay khi rút/lấy/bỏ.
- Thêm phản hồi trực quan cho hồi máu, mất máu, nhận lượt, trang bị vũ khí/trang bị mới, mục tiêu hợp lệ, giai đoạn hành động/phản hồi/bỏ bài và kết quả ván. Khi chờ phản hồi, ghế sáng đúng các mục tiêu phản hồi.
- Có `prefers-reduced-motion` cho các animation mới. Frontend production build pass; Rollup chỉ cảnh báo annotation trong SignalR.
- BANG! đã mở rộng card-play animation cho bài trang bị không vào chồng bỏ; với Cat Balou chọn đúng lá hành động từ các lá được thêm vào chồng bỏ, không nhầm lá bị lấy từ mục tiêu.
- Sửa timer animation BANG! không bị hủy bởi snapshot tiếp theo từ server; nhận diện lá mới bỏ bằng ID và cleanup timer khi unmount. Thêm board entrance, hiệu ứng đổi lượt ở Ô Ăn Quan/Vây Bắt và xúc xắc quay.
- Dòng game log mới trượt nhẹ vào, chỉ animate entries vừa thêm. `prefers-reduced-motion` cũng tắt nhịp pulse vô hạn.
- Thêm `AnimatedNumber` cho HP, số bài, quân ở ô, điểm, vị trí đua và lượt Đỏ; bắt đầu từ giá trị đang hiển thị, tôn trọng reduced motion.
- Chia bài mở màn BANG! được animate tuần tự chỉ trên transition phòng chờ → đang chơi; mở lại phòng đang chạy không phát lại.
- BANG! hiện nhãn nổi `+N HP` / `−N HP` sau khi state server xác nhận, reset sạch khi đổi phòng. Build pass, lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Các lá BANG! còn lại dùng FLIP/WAAPI để trượt vào chỗ trống sau khi đánh hoặc bỏ; không chạy với lá mới vừa được chia/rút và tôn trọng reduced motion.
- Hoạt ảnh lá bài BANG! cũng nhận diện các lượt bỏ bài cuối lượt và loại bài bắt buộc; đánh/loại bài sau xác nhận server mới kích hoạt fly card.
- Banner dùng chung của mọi bàn (đang chờ, kết nối, mất mạng, lỗi, disconnect, rematch invite) chuyển cảnh theo trạng thái; nút Chơi lại quay khi đang tạo phòng.
- Build pass, lint 0 errors / 2 warnings Fast Refresh hiện hữu.

## 2026-10-24 — Mở rộng animation sang các trò còn lại
- Đua Xe Hoàng Đạo: báo lượt, xúc xắc vừa đổ, xe chạy dọc đường giữa vị trí cũ và mới, nhặt thùng và chiến thắng.
- Ô Ăn Quan: từng ô đổi quân phát sáng theo chiều rải; điểm đổi, ô có thể chọn, xác nhận hướng rải và kết quả.
- Vây Bắt: chuyển động SVG giữ trạng thái đến khi hoàn tất giữa hai nút theo cạnh, nhịp sáng các đích hợp lệ, hiệu ứng vỡ sáng khi bắt quân và kết quả.
- Đua Xe Hoàng Đạo: xe di chuyển trên đường theo quãng đường thực tế giữa vị trí cũ và mới; hiệu ứng tới ô đích chỉ xuất hiện sau khi hành trình hoàn tất.
- Các hiệu ứng mới tôn trọng `prefers-reduced-motion`. `npm run build` pass; `npm run lint` không lỗi, còn 2 cảnh báo Fast Refresh có sẵn.
- Điểm Ô Ăn Quan hiện số điểm tăng/giảm nổi cạnh bộ đếm; thùng Đua Xe hiện số lượng vừa nhặt tương tự. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Cải thiện nhịp dùng bài BANG!: thêm quầng sáng mềm và vòng xung kích phía sau lá, chuyển động lá dùng easing mượt hơn, ưu tiên transform/opacity cho compositor; giảm chuyển động vẫn được áp dụng.
- Kiểm tra lại sau cập nhật: frontend production build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn. Chưa có kiểm tra hình ảnh trực tiếp trong trình duyệt.
- Lá bài được chọn nay có ánh quét ngắn, nút bài phản hồi nén nhẹ khi bấm và chuyển trạng thái bằng easing êm hơn; vẫn tôn trọng `prefers-reduced-motion`. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Vây Bắt chuyển màu/viền/ánh sáng quân cờ và đích hợp lệ có easing; quân được chọn nảy nhẹ để xác nhận thao tác. Reduced motion giảm animation/transition xuống 1ms. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Ô Ăn Quan thêm quầng sáng nhịp nhẹ quanh ô dân đang chọn, để người chơi nhận diện trạng thái chờ chọn hướng rải; reduced motion tắt pulse. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- BANG! lá bài được xác nhận nay bay từ đúng vị trí lá trên tay đến giữa bàn, thay cho điểm xuất phát cố định; vị trí lưu theo id lá, được xóa khi hủy chọn hoặc đổi phòng. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- BANG! khi máu về 0 và server đánh dấu bị loại, ghế người chơi hiện lóe đỏ/đầu lâu trong 820ms; dùng cùng tín hiệu ở bảng người chơi hiện tại. Không kích hoạt từ snapshot đầu hoặc khi đổi phòng; tôn trọng reduced motion. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- BANG! viên đạn HP chuyển động theo delta đã được xác nhận: nạp viên mới khi hồi máu, lóe/rơi nhẹ thành vỏ khi mất máu; nhiều viên có nhịp so le 42ms, reduced motion bỏ cả delay. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- BANG! số bài trong nọc dùng AnimatedNumber và rung/glow khi nọc đổi; lá trên cùng vào chồng bỏ có hiệu ứng lật nhẹ. Lá bài chỉ để xem không còn bị style mờ/xám như lá bị khóa. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Đua Xe Hoàng Đạo làm thùng đồ trên ô đường đua bật sáng khi state xác nhận người chơi nhặt được; icon đích giữ nguyên. Reduced motion rút animation còn 1ms. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Ô Ăn Quan giờ tái dựng đường rải hạt sau khi snapshot xác nhận một nước đi khớp luật server; hạt bay lần lượt giữa các ô, gồm cả các lượt bốc-rải tiếp. Hiệu ứng dùng cho cả nước của đối thủ; trường hợp snapshot có nhiều cách khớp thì bỏ particle để tránh chỉ sai đường. Reduced motion đưa toàn bộ hạt về 1ms. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Vây Bắt: kéo quân thả vào vị trí không hợp lệ (hoặc pointer bị hủy) khiến quân ma trượt về đúng nút xuất phát thay vì biến mất; giảm chuyển động giữ hành vi tức thời. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Ô Ăn Quan: khi nước đi hợp lệ ăn quân, nhãn `+N` bay từ ô bị ăn tới bộ đếm của đúng người chơi; giữ đồng bộ với score delta xác nhận. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- BANG! bảng đòn tấn công/chờ phản hồi xuất hiện theo nhịp ngắn; chỉ phát lại khi loại phản hồi hoặc danh sách mục tiêu đổi. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Tối ưu lớp hạt Ô Ăn Quan: bỏ `will-change` trên từng hạt để tránh tạo nhiều compositor layer cùng lúc ở nước rải dài; vẫn animate transform/opacity. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn. Rà trình duyệt trực tiếp chưa thực hiện được vì môi trường không cung cấp browser surface.
- BANG! nhãn khoảng cách/phạm vi ở ghế đối thủ sáng nhẹ khi thay đổi, giúp nhận ra tác động đổi vũ khí/cự ly; trạng thái khởi tạo không phát hiệu ứng và reduced motion được áp dụng. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Các hook BANG! theo dõi HP, lượt, vũ khí, trang bị, số bài và FLIP tay bài nay reset theo `roomId`, tránh coi state của phòng mới là sát thương/hồi máu/rút bài/trang bị. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- BANG! lá rút/chia mới bay từ tọa độ nọc tới vị trí tay bài; các lá cũ FLIP vào chỗ mới, hiệu ứng nguồn phát một lần theo ID để không lặp do snapshot. Bỏ entrance CSS cũ. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Hiệu ứng lá đánh ra đồng bộ theo roomId: khi chuyển phòng/ván, chụp lại log, nọc và tay bài, hủy timer và xóa hiệu ứng cũ để snapshot khởi tạo không bị nhận nhầm là hành động chơi bài. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Vây Bắt: easing spline cho quân đi và quân kéo trả về; quân vừa đi có ánh viền nhấc/hạ ngắn, tôn chuyển động mà không đổi tọa độ. Hỗ trợ reduced-motion.
- Đua Xe Hoàng Đạo: phản hồi xúc xắc ngay khi nhấn, quay trong khi chờ snapshot, khóa gửi lặp; kết thúc khi trạng thái đổi, lỗi/kết nối đổi hoặc timeout 4.5 giây. Thông báo trạng thái qua aria-live; reduced-motion tắt vòng quay. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Ô Ăn Quan: tái dựng các ô dân được quyết toán lúc kết thúc ván và cho từng khoản điểm bay từ ô nguồn lên đúng bảng điểm, đồng thời giữ hiệu ứng bắt quân thường. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Khoản điểm quyết toán được stagger 72ms theo từng ô để tránh chồng nhãn khi nhiều ô cùng kết thúc; reduced-motion xóa độ trễ.
- Ô Ăn Quan: khi một bên dùng 5 điểm tiếp quân, dựng 5 hạt bay từ bảng điểm tới từng ô, đồng bộ độ trễ cập nhật số quân theo đường bay; timer theo thời lượng đường rải + tiếp quân, không cắt hiệu ứng dài. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- BANG!: muzzle flash đồng bộ theo roomId, chụp lại độ dài log khi đổi phòng và hủy timer cũ, tránh phát tia súng giả khi log ván mới dài hơn ván trước. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- BANG!: nhận dạng log “thách … đấu súng” để lá Đấu súng cũng chạy hiệu ứng bay khi được đánh; trước đó mẫu log này không khớp bộ lọc chơi bài. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Sảnh chờ BANG!/Đua Xe Hoàng Đạo: ghế vừa có người tham gia xuất hiện theo nhịp nhẹ, stagger theo vị trí; hook occupancy reset theo roomId để không animate lần tải đầu/chuyển phòng, hỗ trợ reduced-motion. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Vây Bắt: tap/kéo tới ô không hợp lệ đánh dấu ô đỏ ngắn và giữ quân đã chọn để thử lại; valid move xóa marker, reset theo lượt/phòng/kết nối, reduced-motion vẫn giữ báo hiệu tĩnh. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Vây Bắt: các chấm đích hợp lệ bật vào theo nhịp tăng nhẹ rồi chuyển sang pulse; stagger tối đa 120ms theo thứ tự nút, reduced-motion giữ dấu tĩnh. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Reduced-motion: tắt cả animate-ping của trạng thái chờ và animate-bounce trên màn đăng nhập (trước đó chưa nằm trong media rule). Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- ActionBar BANG!: khóa theo pha discard/target/response/action/waiting để React remount có chủ đích khi đổi pha; entrance animation giờ chạy mỗi lần vào pha, thay vì chỉ lần đầu vì tái sử dụng cùng div. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Vây Bắt: xóa marker đích đỏ và timeout khi gửi nước đi hợp lệ bằng kéo, tránh hiệu ứng từ lần thử sai trước chồng lên animation di chuyển mới. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- BANG!: hiệu ứng chơi bài nhận toàn bộ lá vừa rời tay (bỏ quá giới hạn/bỏ hết bài), bay thành một chồng xòe và stagger tối đa 180ms; giữ lá đại diện cho hành động của đối thủ/thiết bị không thấy bài. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Nhiều lá bỏ ở BANG! ghi nhớ tọa độ riêng trong tay trước khi gửi nước đi; mỗi lá bay từ đúng vị trí nguồn thay vì cùng xuất hiện từ dưới bàn. Vị trí được xóa sau animation hoặc khi đổi phòng. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- BANG! Hoảng loạn: lá mới vào tay người đánh bay từ ghế mục tiêu thay vì nọc; ghế PlayerSeat có data-player-id để lấy chính xác nguồn, trong khi lá Hoảng loạn vẫn bay ra giữa bàn. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- BANG! Hoảng loạn hai chiều: khi người xem là mục tiêu, lá rời tay bay tới ghế của người đánh; khi người xem là người đánh, lá mới vẫn bay từ ghế mục tiêu vào tay. Đường bay đồng bộ tọa độ bảng, chuyển động reduced-motion tuân theo quy tắc CSS hiện có. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.
- Trang bị BANG! vừa bị lấy/bỏ giờ còn hiện như nhãn đỏ đang rời khỏi vùng trang bị trong 520ms; nếu được trang bị lại ngay thì ghost bị hủy, room đổi thì baseline reset; hỗ trợ reduced-motion. Build pass; lint 0 lỗi/2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — BANG! khóa bài vì payload enum viết hoa
- Root cause: BuildViewerPayload dựng phase và pendingResponse.kind bằng ToString() vào field string, nên GameJson không áp camelCase converter. Payload thực gửi là Action/Bang, frontend cần action/bang; isMyTurn false và bài bị khóa.
- Chuẩn hóa hai giá trị bằng JsonNamingPolicy.CamelCase; giữ Role PascalCase theo hợp đồng hiện có. Thêm kiểm thử JSON sau serialize/redact cho action, awaitingResponse, bang và itsYourTurn.
- Backend build 0 warning/0 error, toàn bộ nhóm Bang backend 102/102 pass, BangBoard frontend 26/26 pass. Backend đã restart; /health healthy với PostgreSQL/Redis/RabbitMQ up.
- Thêm normalizeBangViewerState ở biên để tab đang mở vẫn nhận Action/Bang từ payload cũ; regression xác nhận bài hành động và bài đỡ dùng được dù enum PascalCase. Vite dev type/mocks được bổ sung cho thay đổi HttpTransportType hiện có. Full frontend 336/336, 102 Bang backend pass, build pass, lint 0 errors/2 warnings có sẵn.

## 2026-10-24 — Quy tắc bỏ bài cuối lượt BANG!
- Xác nhận giới hạn là số lá trên tay so với HP hiện tại; vũ khí và trang bị không tính. PlayEquipment chuyển lá khỏi Hand sang Equipment; HandleEndTurn và DebugForceEndTurn chỉ đếm Hand.Count.
- Hai regression server: 2 lá/2 HP + vũ khí + 2 trang bị không bỏ; 2 lá/1 HP thì bỏ đúng 1, trang bị vẫn nguyên. UI chọn bỏ hiện số lá/HP và nhắc trang bị không tính.
- 104/104 Bang backend tests, 27/27 BangBoard frontend tests, build pass, lint 0 errors/2 warnings có sẵn.


## 2026-10-24 — Làm mượt hoạt ảnh đánh bài BANG!
- Điều chỉnh đường bay của lá bài thành quỹ đạo liên tục từ tay lên bàn, giảm cú đổi hướng đột ngột; tinh chỉnh góc xoay, độ nảy và thời điểm lá bài chạm đích.
- Tối ưu bóng đổ khi lá đang bay và đồng bộ lại vòng sáng/vòng va chạm để hiệu ứng có điểm nhấn mà không kéo dài dư.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn ở GameRoomHubContext.tsx và RoomShell.tsx.

## 2026-10-24 — Dấu ngắm khi chọn mục tiêu và đồng bộ nhặt hàng
- BANG!: thêm dấu ngắm xuất hiện cạnh tên các mục tiêu hợp lệ; tắt chuyển động dấu ngắm khi người dùng bật giảm chuyển động.
- Zodiac Race: xác nhận luật chỉ nhặt thùng khi dừng đúng ô; căn hiệu ứng thùng, số ô, bộ đếm và điểm +hàng gần thời điểm xe tới nơi, kể cả đường chạy dài.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.
- Giữ trạng thái đổi hàng đủ lâu cho tuyến chạy dài và trọn hiệu ứng đến sau khi xe dừng; build sau chỉnh sửa cuối thành công.

## 2026-10-24 — Nhấc quân kéo trong Vây Bắt
- Bóng quân xuất hiện với nhịp nhấc nhanh và quầng sáng dịu theo con trỏ; quầng sáng ngừng theo tùy chọn giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Xe nhảy theo từng ô trong Zodiac Race
- Tách chuyển động ngang và nhịp nảy thành hai lớp animation; số nhịp khớp chính xác số ô đi qua và tổng thời lượng hành trình.
- Tắt nhịp nhảy khi người dùng bật giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Vòng xung kích khi bắt quân Vây Bắt
- Bổ sung vòng vàng nét đứt bung ra quanh quân bị bắt, đồng bộ thời lượng với hiệu ứng quân tan biến; reduced motion rút gọn hiệu ứng.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Đồng bộ chuỗi rải và ăn điểm Ô Ăn Quan
- Bay điểm chỉ bắt đầu sau hạt cuối; nếu kết thúc ván thì các lượt quyết toán nối tiếp sau pha bắt quân, từng lượt được giãn đúng nhịp.
- Đếm quân mỗi ô dựa trên lần gieo cuối thực tế (kể cả rải tiếp), và đếm điểm chờ đến khi các hạt điểm tới nơi. Thời gian giữ animation động thích ứng với đường dài, capture và refill; các hook flash được sửa để gia hạn timer khi duration thay đổi.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.
- Gia hạn cả flash chỉ số và nhãn delta khi thời lượng animation được tính động, tránh timer cũ xóa hiệu ứng trước lúc nó bắt đầu. Build/lint cuối cùng đều đạt (lint 0 lỗi, 2 cảnh báo có sẵn).

## 2026-10-24 — Giữ hiệu ứng cập bến Zodiac Race
- Kéo dài dấu trạng thái xe vừa di chuyển qua toàn hành trình tối đa và đủ 480 ms cho hiệu ứng cập bến, tránh mất hiệu ứng với lượt đi xa.
- Dùng chung hằng số thời lượng hành trình giữa animation xe và bộ đếm trạng thái.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.


## 2026-10-24 — Vệt đạn từ người bắn tới mục tiêu BANG!
- Dựa trên log máy chủ Bang! và danh sách ghế để nối vệt đạn từ vị trí người bắn tới đúng mục tiêu; khởi chạy sau lóe súng, không bắt sự kiện Bang! đáp trả trong đấu súng hoặc Gatling diện rộng.
- Lớp phủ không nhận tương tác, giới hạn trong bàn và tắt chuyển động theo prefers-reduced-motion.
- Build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Loạt đạn Gatling BANG!
- Mở rộng vệt đạn sang Gatling: đạn bay lần lượt tới từng đối thủ còn sống, có giãn nhịp nhẹ; kéo dài overlay đúng theo thời điểm phát loạt cuối.
- Giữ parse tách biệt với Bang! đáp trả trong đấu súng.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Đấu súng và Người da đỏ BANG!
- Đấu súng: thêm dấu ngắm lúc thách đấu và vệt Bang! giữa hai người trong từng lượt đáp trả, dựa trên pending target hiện tại.
- Người da đỏ!: bắn loạt tên tới các đối thủ còn sống; giữ overlay đủ thời lượng cả loạt, tuân thủ prefers-reduced-motion.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Cat Balou làm bài mục tiêu bay về chồng bỏ
- Tái dựng đúng hai lá Cat Balou thành lá hành động và lá bị mục tiêu bỏ; lá của mục tiêu bay từ ghế của họ tới chồng bỏ.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Đường bay bài theo đúng người chơi BANG!
- Lá bài đã đánh giờ bay từ ghế của người đánh với mọi người xem; vị trí bài của chính mình tiếp tục dùng điểm đo ngay trên tay.
- Tách lá úp Hoảng loạn bị lấy khỏi lá hành động: khi người xem là mục tiêu, lá úp bay từ họ sang người đánh; khi người xem là người đánh, hand fan nhận bài từ ghế mục tiêu. Kéo dài overlay tới khi lá bay đến.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Lộ mặt trang bị công khai trong animation BANG!
- Khi người xem không biết suit/rank của lá đối thủ, vẫn dựng đúng biểu tượng và tên vũ khí/vật phẩm từ log + zone công khai hiện tại; không giả lập suit/rank.
- Mở rộng CardView chế độ ẩn định danh cho preview công khai.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Hoạt ảnh bài mất khi người chơi BANG! bị loại
- Khi người chơi bị loại và mất bài trên tay, hiện lá úp bay lên kèm đúng số lượng; dùng chung ở ghế người khác và bảng người chơi hiện tại.
- Căn flash số bài đủ 820 ms để không cắt mất hoạt ảnh; không tiết lộ nội dung các lá.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Đồng bộ hiệu ứng xúc xắc và đường đua Zodiac Race
- Xe chờ hiệu ứng xúc xắc 520 ms kết thúc rồi mới xuất phát; bộ đếm ô, đếm thùng và hiệu ứng nhặt thùng cùng chờ theo thời gian xe di chuyển.
- Kéo dài vòng đời animation theo mốc mới và bỏ delay khi người dùng bật giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Hiển thị số bài vừa đổi trong BANG!
- Thêm nhãn nổi +N/−N lá ngay tại bộ đếm bài của người chơi và người xem; phân biệt rút với giảm bài, tự ẩn khi người chơi bị loại để tránh chồng hiệu ứng.
- Hỗ trợ prefers-reduced-motion cho nhãn mới.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Vệt chuyển động trong Vây Bắt
- Vẽ vệt sáng màu theo phe, nối vị trí cũ và mới trong lúc quân di chuyển; thời lượng khớp với animation di chuyển và tự rút gọn khi bật giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Chỉ dẫn đường đi hợp lệ trong Vây Bắt
- Khi chọn quân, các cạnh tới ô hợp lệ hiện đường chấm chuyển động; đường chỉ tồn tại trong lúc còn lựa chọn và được giữ tĩnh ở chế độ giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Phản hồi chờ xác nhận khi đánh bài BANG!
- Lá đánh thường, lá chọn mục tiêu và lá phản hồi sáng nhịp nhẹ trong lúc chờ server; tự tắt khi lá rời tay, khi lượt/phòng đổi, hoặc sau 2,2 giây nếu không có xác nhận.
- Animation hỗ trợ prefers-reduced-motion.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Trạng thái bài đang gửi trong BANG!
- Giữ dấu sáng trên đúng lá đang được đánh/chọn làm mục tiêu/phản hồi cho tới khi server xác nhận lá rời tay; tự dọn khi đổi phòng/lượt hoặc timeout 2,2 giây.
- Build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Đồng bộ sát thương BANG! với lúc đạn chạm
- Các viên đạn/mũi tên tới mục tiêu trước khi HP hiển thị cập nhật, nhãn ±HP và rung bắt đầu; volley áp dụng độ trễ riêng theo thứ tự mục tiêu.
- Chế độ giảm chuyển động bỏ thời gian chờ va chạm.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Căn hiệu ứng bị loại theo va chạm BANG!
- Trạng thái xám/flash bị loại và nhãn bài rơi chờ cùng mốc projectile tới mục tiêu; tránh mục tiêu chuyển sang trạng thái bị loại trước khi đạn chạm.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Bổ sung animation cho phản hồi BANG!
- Bỏ Bang! để né Người da đỏ giờ hiện lá bay; bài lật từ Thùng rượu được tái dựng từ chồng bài và bay vào vùng hiệu ứng. Volley 1,2 giây chỉ dành cho lúc đánh bài tấn công diện rộng.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Hiệu ứng khiên khi đỡ đòn BANG!
- Hiện vòng khiên tại người vừa xác nhận dùng Trượt! hoặc bỏ Bang! để né Người da đỏ; nhận diện đúng người chơi và hỗ trợ giảm chuyển động.
- Điều chỉnh lại timing: HP/mất máu vẫn theo thời điểm server xác nhận kết quả phản hồi; projectile lúc đánh chỉ báo đòn tấn công, không trì hoãn sát thương phát sinh sau đó.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Flash chuyển lượt cho mọi người xem Zodiac Race
- Đồng bộ hiệu ứng báo lượt với state.turn thay vì chỉ bật cho người chơi tại máy; người chơi khác/khán giả cũng thấy highlight mỗi khi lượt đổi.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Flash riêng cho người thua đấu súng BANG!
- Khi log server xác nhận người thua đấu súng, ghế của đúng người đó hiện hiệu ứng va chạm tia sét/vòng sáng; không chạy lại khi render hoặc khi tải log ban đầu.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Hiện số quân bắt được trong Vây Bắt
- Thêm bộ đếm bắt được cho Đỏ/Trắng, suy ra từ quân ban đầu và quân còn trong state; khi bắt thành công số đếm chạy số và nổi +N đúng phe.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Phản hồi hover/focus cho hướng rải Ô Ăn Quan
- Mũi tên Trái/Phải nhích theo hướng khi rê chuột hoặc focus bằng bàn phím; tắt chuyển động nhanh trong chế độ giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Flash bộ đếm lượt trong Vây Bắt
- Khi state xác nhận số lượt Đỏ tăng, bộ đếm scale/đổi sáng nhẹ đồng thời với hiệu ứng chạy số; theo dõi state để cả hai người đều thấy.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Xem trước đường rải Ô Ăn Quan
- Focus hoặc rê vào hướng rải hiển thị số thứ tự tại các ô nhận quân theo cùng mô phỏng với nước rải đã xác nhận; bỏ xem trước khi rời hướng/hủy/chọn nước, hỗ trợ giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Mở rộng preview rải tới các ô Quan
- Đánh số thứ tự preview cả hai ô Quan nếu đường rải đi qua; đường xem trước giờ áp dụng đủ 12 ô.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Khiên khi đỡ thành công bằng Thùng rượu
- Khi log xác nhận lật được ♥ và đỡ bằng Thùng rượu, hiện cùng vòng khiên tại đúng ghế; hook dùng log mới nên không nhầm lượt lật thất bại.
- Build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Làm mượt hiệu ứng đánh bài BANG!
- Điều chỉnh quỹ đạo lá bài với nhịp chạm nhẹ khi tới giữa bàn, kéo dài chuyển động để bớt gấp; thêm vệt sáng lướt trên mặt bài và đồng bộ chế độ giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Thêm điểm chạm khi quân tới ô trong Vây Bắt
- Nước đi được xác nhận nay phát vòng sáng ngắn mang màu quân tại ô đến, ăn khớp với chuyển động quân và vệt đường đi; hỗ trợ chế độ giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Phản hồi chọn ô và hướng rải Ô Ăn Quan
- Ô dân vừa chọn có nhịp nhấc nhẹ trước khi vào sáng nhịp; nút Trái/Phải phóng nhẹ khi rê và nén khi nhấn, đồng thời có viền focus bàn phím rõ hơn. Chế độ giảm chuyển động rút ngắn các chuyển tiếp.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Hiển thị mặt xúc xắc sau lượt đổ
- Đua Cung Hoàng Đạo đổi biểu tượng sau khi lăn thành mặt xúc xắc khớp kết quả 1–6; mặt kết quả bật vào bằng animation cũ và có khung nổi, giữ nhãn trợ năng cho trạng thái lăn/kết quả.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Phản hồi khi chọn mục tiêu trong BANG!
- Ghế hợp lệ nhấc nhẹ khi rê chuột, nén khi nhấn và có focus ring khi điều hướng bàn phím; giảm chuyển tiếp theo prefers-reduced-motion.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Focus bàn phím cho lá bài BANG!
- Lá bài có thể dùng nay nhấc và phóng nhẹ khi nhận focus bàn phím, kèm viền focus rõ; chuyển tiếp card rút ngắn về 1ms trong chế độ giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Giữ chuyển động khi thả quân Vây Bắt
- Khi tap ô đích hoặc thả quân hợp lệ, quân overlay đáp vào tâm ô rồi giữ vòng sáng trong khi chờ server; overlay biến mất khi state xác nhận, khi đổi lượt/lỗi, hoặc sau timeout. Tôn trọng giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Tương tác thanh hành động BANG!
- Các nút Hủy, Xác nhận, Chịu đòn/Thử Thùng rượu và Kết thúc lượt có nhấc khi rê, nén khi nhấn, focus ring bàn phím; transitions rút ngắn trong chế độ giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Tương tác nút gieo xúc xắc
- Nút Đổ xúc xắc có nhấc nhẹ khi rê, nén khi nhấn, focus ring bàn phím rõ; transition theo prefers-reduced-motion.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Tương tác nút phòng dùng chung
- Các nút Rời phòng, Chơi lại và vào phòng chơi lại có nhấc/nén và focus ring thống nhất cho mọi game; giảm thời gian chuyển động theo prefers-reduced-motion.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Focus và nhấn ô dân Ô Ăn Quan
- Ô dân hợp lệ có viền focus rõ khi điều khiển bằng bàn phím và nén nhẹ lúc nhấn; transition đã dùng chung rút ngắn trong chế độ giảm chuyển động.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Mở/đóng nhật ký BANG! mượt hơn
- Panel nhật ký trượt mở/thu lại thay vì xuất hiện tức thời; nội dung cuộn mượt tới dòng mới khi đang theo dõi cuối log. Khi đóng, danh sách rời tab order; reduced motion tắt chuyển động dài.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Animation hội thoại dùng chung
- Chat của các phòng game có panel thu/mở chuyển động, tin nhắn cuối vào nhẹ và tự cuộn mượt; khi đóng, input/nút gửi bị khóa và list rời tab order. Reduced motion rút ngắn panel và tắt smooth scroll.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Đồng bộ thẻ người chơi với xe đua
- Biểu tượng cung hoàng đạo trên bảng người chơi bật vào đúng lúc xe tới ô mới; dùng cùng mốc delay với bộ đếm vị trí và tuân theo reduced-motion.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Cờ đích bật lên khi kết thúc Đua Cung Hoàng Đạo
- Khi server xác nhận có người thắng, cờ đích bật lên và phát sáng ngắn, đồng thời khớp thẻ kết quả; giảm chuyển động giữ thời lượng cực ngắn.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Tiến độ chọn bài bỏ BANG!
- Giai đoạn buộc bỏ bài có thanh tiến độ cập nhật mượt theo số lá đã chọn, kèm aria progress semantics; chuyển động được rút ngắn ở reduced-motion.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Trạng thái gửi nước đi Ô Ăn Quan
- Sau khi chọn hướng rải, hiện vòng quay/thông báo đang gửi và khóa thao tác ô khác để tránh gửi lặp; state mới/lỗi dọn pending, timeout 5 giây tự giải phóng nếu phản hồi bị mất.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Rút ngắn dọn animation Ô Ăn Quan khi giảm motion
- Khi prefers-reduced-motion bật, hook kết thúc dữ liệu animation rải sau 180ms và các timer seed/capture được dọn gần như ngay, tránh giữ state 4+ giây sau khi hiệu ứng đã tắt.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Bung/thu chi tiết thẻ trong hướng dẫn
- Thẻ tra cứu luật có panel chi tiết bung/thu theo grid và fade, focus ring bàn phím, aria-controls; reduced-motion rút animation xuống 1ms.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Snap khi kéo quân Vây Bắt tới ô hợp lệ
- Khi ghost kéo vào phạm vi 40px của đích hợp lệ, quân được hút mượt vào tâm và viền đích bật lên; thả vẫn dùng kiểm tra luật server hiện có, reduced-motion rút ngắn snap/marker.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Spinner gửi tin nhắn trong phòng
- Nút Gửi có trạng thái quay khi đang chờ gửi, cùng nhấc/nhấn/focus feedback; spinner tự tắt theo reduced-motion.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Trạng thái chờ kết thúc lượt BANG!
- Nút kết thúc lượt và xác nhận bỏ bài hiển thị spinner/aria-busy, khóa gửi lặp; trạng thái chờ được gỡ khi lượt/state đổi, lỗi mới hoặc timeout 2.4 giây.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Spinner phản hồi phòng thủ BANG!
- Nút Chịu đòn/Thử Thùng rượu hiện spinner và aria-busy; khi gửi phản hồi bằng lá phòng thủ, nút và các lá khác cũng khóa để tránh gửi trùng. Tự dọn khi log/pending response đổi, có lỗi hoặc timeout.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Khóa thao tác xung đột khi BANG! đang chờ lá bài
- Khi một lá bài đang shimmer chờ server, các lá khác hiện disabled reason rõ và nút Kết thúc lượt bị khóa; handler cũng chặn gửi trực tiếp. Mở lại thao tác khi state xác nhận hoặc timeout hiện có dọn pending.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Phản hồi tương tác tùy chọn tạo phòng
- Nút chọn số ghế trong BANG! và Đua Hoàng Đạo có hiệu ứng nhấc nhẹ khi rê, co nhẹ khi nhấn và focus ring; ô nhập số lượng Vây Bắt chuyển màu viền/bóng khi focus. Reduced-motion rút các chuyển tiếp xuống 1ms.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Làm mượt hiệu ứng đánh bài BANG!
- Vòng sáng điểm đáp đồng bộ với lúc lá bài bay tới giữa bàn; dải sáng chạy lần lượt theo từng lá thay vì đồng loạt. Tăng thời gian giữ overlay để không bị tháo trước khi hoạt ảnh kết thúc; với prefers-reduced-motion, rút overlay còn 160ms và bỏ stagger.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Nhấn nhá màn hình kết quả các trò chơi
- Biểu tượng chiến thắng/hòa trong BANG!, Ô Ăn Quan, Vây Bắt và Đua Hoàng Đạo bật nảy nhẹ kèm ánh sáng, tiêu đề xuất hiện kế tiếp để làm rõ nhịp kết thúc ván; reduced-motion rút ngắn cả hai hiệu ứng.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Đồng bộ lớp mở màn hình kết quả
- Biểu tượng và tiêu đề kết quả được tách nhịp xuất hiện ở bốn trò chơi; dùng thuộc tính translate riêng để giữ nguyên xoay/tỉ lệ thiết kế của tiêu đề. Hỗ trợ reduced-motion.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Giữ các lượt đua Hoàng Đạo đang bay
- Khi người chơi tiếp theo đi trước lúc quân trước đến đích, animation cũ được giữ song song theo từng ghế thay vì bị thay thế. Thời hạn cleanup bao gồm nhịp đáp; reduced-motion dọn nhanh để quân không bị ẩn.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Giữ animation của các ô thay đổi liên tiếp
- useChangedIndices nay giữ hiệu ứng theo hạn riêng của từng index; một snapshot mới không còn xóa highlight của index vừa đổi trước đó. Timer tiếp tục chạy theo thời hạn gần nhất, reset khi đổi phòng.
- Tài liệu hóa quy ước/checklist animation trong rules/architecture/gameplay-animation.md và ghi log ngày.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Giữ delta điểm khi cập nhật liên tiếp
- useValueDeltas nay giữ delta theo index đến hạn riêng; biến động sát nhau trên cùng chỉ số được gộp theo tổng ròng (delta ròng 0 được ẩn), cập nhật chỉ số khác không cắt hiệu ứng đang chạy. Reset theo phòng được giữ nguyên.
- Cập nhật quy ước tại rules/architecture/gameplay-animation.md và nhật ký ngày.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Gộp biến động delta cùng chỉ số
- useValueDeltas cộng dồn tăng/giảm của cùng index theo tổng ròng trong lúc hiệu ứng đang hiển thị; triệt tiêu nhau thì ẩn delta. Mỗi chỉ số có hạn riêng, snapshot kế tiếp không gỡ nhãn của index khác.
- Cập nhật gameplay-animation.md và nhật ký ngày.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Tạo nhịp cho nhóm quân bị bắt trong Vây Bắt
- Hiệu ứng tan và vòng bắt được stagger 45ms (tối đa 5 nhịp); giữ nhóm capture liên tiếp, timer chờ tới hạn xa nhất và dọn sau animation cuối. Reduced-motion bỏ stagger, rút lifetime xuống 160ms.
- Cập nhật gameplay-animation.md và nhật ký ngày.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Gộp phản hồi HP và số bài BANG!
- useHpDelta và useHandCountChange gộp các snapshot nối tiếp theo tổng ròng trong thời gian hiệu ứng. HP bullets đánh dấu đủ lượng thay đổi; số lá bài hiển thị đúng tổng rút/bỏ; tổng ròng 0 ẩn delta.
- Cập nhật gameplay-animation.md và nhật ký ngày.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Phát lại hiệu ứng khi giá trị đổi lặp
- useChangeFlash trả sequence; changeFlashClass luân phiên hai lớp có animation-name/keyframes riêng nhưng cùng nội dung, để cập nhật nhanh trên cùng phần tử phát lại animation. Áp dụng điểm Ô Ăn Quan, lượt Ô Ăn Quan/Vây Bắt/Đua Hoàng Đạo, số xúc xắc, nọc bài/chồng bài bỏ và tầm bắn BANG!. Reduced-motion đã bao phủ biến thể class.
- Cập nhật gameplay-animation.md và nhật ký ngày.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.


## 2026-10-24 — Phát lại animation theo từng index
- useChangedIndices giữ sequence riêng trên index; changedIndexClass chọn lớp có animation-name khác nhau để thay đổi lặp phát lại keyframe. Áp dụng hố/count Ô Ăn Quan, ghế BANG!/Vây Bắt/Đua Hoàng Đạo, xe và thùng hàng Đua Hoàng Đạo. Hạn từng index độc lập, reduced-motion bao phủ các biến thể.
- Cập nhật gameplay-animation.md và nhật ký ngày.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.
# Animation gameplay — phát lại hiệu ứng BANG! theo sự kiện
- Damage shake, heal flash và turn start flash nay có sequence để sự kiện lặp trước khi timer cũ hết vẫn kích hoạt animation mới trên ghế đối thủ và bảng người chơi hiện tại.
- Thêm keyframe replay riêng cho rung/hồi máu; bổ sung các class a/b vào reduced-motion. Cập nhật quy ước trong `rules/architecture/gameplay-animation.md`.
- Kiểm tra bằng frontend build và lint; lint hiện có 2 cảnh báo Fast Refresh tại `GameRoomHubContext.tsx` và `RoomShell.tsx`.

## Ô Ăn Quan — làm mượt dấu ô đang chọn
- Hào quang ô được chọn chuyển từ animation `filter: drop-shadow` lặp liên tục sang opacity trên lớp phủ nhẹ; giữ nhịp nhấc ô và trạng thái nổi bật tĩnh khi reduced-motion.
- Đã ghi quy ước trong `rules/architecture/gameplay-animation.md`; xác minh bằng frontend build/lint.

## BANG! — phản hồi trực quan khi server từ chối lá
- Nếu lỗi đổi trong khi một lá đang chờ và lá vẫn còn trên tay, dừng pending và rung/viền đỏ đúng lá; hai hướng keyframe luân phiên để lần từ chối liên tiếp vẫn phát lại.
- Reduced-motion rút nhịp báo lỗi còn 1ms; cập nhật `gameplay-animation.md`.
- Frontend build pass; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## Vây Bắt — phản hồi khi nước đi chưa được xác nhận
- Ghost đặt quân nay lưu vị trí gốc; nếu error đổi hoặc hết 1,8 giây chưa có snapshot đặt quân ở đích, quân bay về điểm gốc và ô đích lóe đỏ. Snapshot xác nhận sẽ hủy timeout, không phát báo lỗi nhầm.
- Reduced-motion bỏ chuyển động trả quân nhưng vẫn giữ dấu đỏ đích chưa xác nhận.
- Frontend build pass; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## Vây Bắt — giữ chuyển động của các quân đi liên tiếp
- Thay timer chung của `movingPieces` bằng timer riêng theo piece ID; snapshot mới gộp thêm quân đang di chuyển và chỉ gia hạn/xóa hiệu ứng của quân tương ứng.
- Dọn timer khi đổi phòng và unmount; xác minh build/lint.
- Frontend build pass; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## Ô Ăn Quan — giữ animation qua nhiều nước đi liên tiếp
- `useSowingAnimation` đổi từ một event/timer sang danh sách event với expiry riêng; seed/capture/refill flight gộp theo event đang sống và React giữ node animation cũ nhờ key riêng.
- Đổi phòng xóa event và timer; kiểm tra build/lint.
- Frontend build pass; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — nhịp xuất hiện danh sách kết quả
- Tên người còn sống/bị loại lần lượt fade/nhấc nhẹ theo nhịp 65ms sau tiêu đề ván; reduced-motion xóa delay và rút thời lượng.
- Cập nhật quy ước trong `gameplay-animation.md`; xác minh build/lint.
- Frontend build pass; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — hiệu ứng khiên cho mọi người phản hồi
- `useDefenseFlash` nay giữ tất cả log phòng thủ mới với key/expiry riêng; nhiều người phản hồi Gatling/Người da đỏ trong cùng snapshot đều nhận hiệu ứng khiên trên ghế của họ.
- Cập nhật `gameplay-animation.md`; xác minh build/lint.
- Frontend build pass; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## Chuyển phòng chờ sang ván chơi
- Bốn bàn theo dõi room status bằng `useChangeFlash`; class `animate-board-enter` a/b phát lại khi phòng bắt đầu, kể cả lúc DOM root được React giữ lại qua hai nhánh chờ/chơi.
- Reduced-motion bao phủ các class; cập nhật tài liệu và xác minh build/lint.
- Frontend build pass; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — phát lại lóe nòng khi có phát bắn liên tiếp
- Thêm `useMuzzleFlashState` với sequence và lớp a/b; các phát bắn đến khi flash trước còn sáng vẫn khởi động keyframe mới. `useMuzzleFlash` giữ boolean wrapper tương thích.
- Reduced-motion bao phủ các class biến thể; cập nhật docs, xác minh build/lint.
- Frontend build pass; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — phát lại hiệu ứng khi mở phản hồi cùng loại
- Pending response badge dùng key log mới nhất; ActionBar dùng kind + người gửi để mở lại khi nguồn phản hồi đổi mà không remount mỗi lần danh sách mục tiêu co lại.
- Cập nhật docs, xác minh build/lint.
- Frontend build pass; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## Ô Ăn Quan — giữ và báo nước đi không được nhận
- Nếu server trả lỗi khi board chưa đổi, ô nguồn/hướng được chọn lại và ô dân rung viền đỏ; timeout 5 giây cũng phục hồi thao tác khi lượt/kết nối còn hợp lệ.
- Đổi lượt/phòng hoặc mất kết nối dọn attempt; reduced-motion rút hiệu ứng báo lỗi.
- Frontend build pass; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## Đua Hoàng Đạo — báo lượt gieo không được nhận
- Lỗi server hoặc timeout 4,5 giây trong khi trạng thái xúc xắc chưa đổi sẽ rung/viền đỏ nút gieo và hiện thông báo thử lại. Snapshot đến muộn xóa báo lỗi; mất kết nối chỉ dừng spinner.
- Reduced-motion rút animation xuống 1ms; cập nhật docs và xác minh build/lint.
- Frontend build pass; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.

## 2026-10-24 — Đồng bộ tài liệu animation gameplay
- Bổ sung liên kết quy ước animation vào hướng dẫn frontend và tài liệu kiến trúc frontend để người sửa board tìm được checklist nguồn sự kiện, timer, cập nhật liên tiếp và reduced-motion.
- Ghi chú ở backlog rằng phạm vi animation đã mở rộng từ bốn mục BANG! ban đầu sang cả bốn game/platform; phân biệt các giới hạn BANG! còn lại với backlog animation toàn dự án.
- Nhật ký ngày ghi lại lần đồng bộ tài liệu này; không thay đổi code sản phẩm trong lượt này.

## BANG! — phát lại hiệu ứng khi đổi vũ khí liên tiếp
- `useWeaponEquipFlashState` trả active/sequence; ghế người chơi và panel cá nhân luân phiên class a/b khi thay đổi vũ khí nhanh, trong khi hook boolean cũ vẫn được giữ tương thích.
- Thêm keyframe name riêng cho hai biến thể và bao phủ reduced-motion; cập nhật quy ước animation.
- `npm run build` pass; `npm run lint` 0 errors, còn 2 cảnh báo Fast Refresh có sẵn tại `GameRoomHubContext.tsx` và `RoomShell.tsx`.

## BANG! — giữ hiệu ứng khi trang bị nhiều món liên tiếp
- Hook trang bị nay giữ sequence và expiry riêng cho từng chip; cập nhật kế tiếp không cắt món đang chạy, còn món cùng tên xuất hiện lại sẽ khởi động keyframe A/B mới.
- PlayerSeat và LocalPlayerPanel dùng state theo món; API Set cũ vẫn có wrapper tương thích. Reduced-motion áp dụng cho cả hai biến thể.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh đã có trước.

## BANG! — giữ hiệu ứng khi nhiều người thua đấu súng
- Hook đọc mọi dòng thua đấu súng mới giữa hai snapshot và giữ flash theo từng người với timer riêng; sự kiện của một người không thay thế hiệu ứng người khác.
- Thay đổi lặp trên cùng người sẽ cấp key mới để animation sét phát lại. Cập nhật mô tả trong gameplay-animation.md.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn tại `GameRoomHubContext.tsx` và `RoomShell.tsx`.

## BANG! — dọn chip trang bị rời theo timer riêng
- Mỗi chip mất đi được giữ đúng 520ms cho keyframe thoát của chính nó; việc gỡ món tiếp theo không gia hạn chip cũ thành khoảng trống vô hình.
- Nếu món được trang bị lại trong lúc ghost đang hiện, xóa ghost và timer của món đó ngay. Cập nhật quy ước animation.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — giữ animation từng dòng nhật ký
- Dòng log mới giữ hiệu ứng 700ms với expiry theo index; các snapshot tiếp theo không thay set đang chạy. Reset/truncate log dọn expiry cũ.
- Cập nhật checklist gameplay-animation.md; xác minh bằng build/lint.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — không cắt choreography khi đánh bài liên tiếp
- `usePlayedCardAnimation` giữ action đang trình diễn đến hết duration và xếp action kế tiếp vào FIFO; mỗi effect giữ riêng card/message/key/duration.
- Reset phòng và unmount xóa queue/timer; action chỉ được xếp sau khi đã xuất hiện trong server game log.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Platform — nút Chơi lại xuất hiện sau kết quả
- Nút Chơi lại dùng chung nhận `animate-game-action-enter`, nối nhịp fade/slide sau màn thắng/thua của các game; class đã được reduced-motion rút gọn toàn cục.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — phản hồi khi kết thúc lượt hoặc trả lời bị lỗi
- Khi error thay đổi trong lúc gửi END_TURN/RESPOND, spinner dừng và đúng nút rung/viền đỏ theo sequence a/b; chấp nhận hoặc đổi lượt không bị báo thất bại.
- Retry xóa dấu lỗi cũ; reduced-motion bao phủ keyframes.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — làm mượt tiến độ chọn bài bỏ
- Thanh tiến độ đổi từ transition `width` sang `scaleX` với origin trái để tránh layout recalculation theo từng frame; giá trị ARIA tiếp tục phản ánh số lá đã chọn.
- Reduced-motion giữ transition 1ms; cập nhật quy ước animation.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — phản hồi khi lá bài hết timeout xác nhận
- Nếu hết 2,2 giây mà lá vẫn trong tay và kết nối còn connected, thoát pending, đánh dấu đúng lá rung đỏ và nêu rõ cần thử lại.
- Lá đã được server lấy khỏi tay hoặc mất kết nối không bị đánh dấu timeout sai; cập nhật quy ước animation.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — đồng bộ reduced-motion với cleanup chip rời
- Khi bật reduced-motion, timer dọn ghost trang bị bị gỡ rút từ 520ms xuống 1ms cùng CSS, tránh chip trong suốt chiếm chỗ sau hiệu ứng.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — làm lóe nòng nhẹ hơn khi render
- Loại `filter: brightness()` khỏi keyframe flash; animation chỉ scale/rotate/opacity, quầng sáng giữ ở text-shadow tĩnh.
- Cập nhật nguyên tắc triển khai và xác minh bằng build/lint.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Platform — báo tin nhắn mới khi chat thu gọn
- ChatPanel theo dõi số tin theo room; tin mới đến khi panel đóng sẽ bật badge MỚI có animation enter. Đổi room đồng bộ count và xóa badge cũ.
- Badge có status accessible; dùng class enter đã hỗ trợ reduced-motion.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Vây Bắt — rút ngắn cleanup vệt di chuyển khi reduced-motion
- `movingPieces` timer theo từng quân rút xuống 1ms khi CSS tắt trail/transform; state quân cờ vẫn là state server, timer chỉ dọn dữ liệu animation.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — giữ đúng actor/mục tiêu cho animation trong queue
- Mỗi card effect lưu actor ID, danh sách target ID và projectile kind từ snapshot game log đó; queue entry không suy lại từ state mới khi tới lượt phát.
- Điều này giữ đúng hướng shot ở Bang!, Gatling/Indians, challenge và phản hồi Duel liên tiếp.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — phát lại nhấn sáng khi rút bài liên tiếp
- Card draw flash chuyển từ boolean sang `{ active, sequence }`; class A/B khởi động lại ánh sáng trên hand khi nhiều lượt rút đến sát nhau.
- Giữ hook boolean tương thích và thêm biến thể reduced-motion.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — căn timer dòng nhật ký theo keyframe
- Expiry từng dòng đổi từ 700ms sang 220ms như animation CSS; reduced-motion cleanup 1ms. Các dòng mới vẫn có timer độc lập.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — làm mượt vòng sáng mục tiêu
- Vòng nhấn ghế mục tiêu chuyển từ animate `box-shadow` liên tục sang viền phủ chỉ animate `opacity` và `transform`; giữ đèn viền tĩnh khi reduced-motion.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — tối ưu animation lá đang chờ xác nhận
- Chuyển pulse pending khỏi `filter: brightness/drop-shadow` sang opacity của viền phủ; tắt hoàn toàn pulse vô hạn khi reduced-motion và giữ sáng viền tĩnh.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Kết quả theo góc nhìn người chơi ở ba game
- Ô Ăn Quan, Vây Bắt và Đua Hoàng Đạo dùng animation thắng/thua cho người chơi và nhịp trung tính cho hòa/người xem; không đổi kết quả server.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Ô Ăn Quan — phản hồi khi gửi nước rải và hủy hướng
- Thêm entrance cho status đang gửi nước đi; nút Hủy có press scale và focus-visible outline để thao tác chuột/bàn phím đều rõ.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Ô Ăn Quan — reduced-motion cho nút chọn hướng
- Bổ sung transition-duration 1ms cho hover/press hai nút chọn chiều rải; hiệu ứng tương tác thường vẫn giữ nguyên.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Tối ưu nhịp nhấn nút hành động trong game
- Đổi press state của nút gieo xúc xắc và hai nút chọn hướng rải từ `top` sang `translate-y`, giữ cảm giác nút lún mà không kích hoạt layout.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Vây Bắt — hướng dẫn phản hồi theo trạng thái kéo
- Dòng thao tác đổi từ chọn quân sang tìm chấm xanh hoặc thả vào ô đích hợp lệ; mỗi trạng thái có entrance ngắn theo thay đổi thật của drag/target.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Vây Bắt — đồng bộ animation với snapshot trước khi vẽ
- Dùng layout effect để ghi nhận occupancy mới và xóa ghost sau xác nhận server trước paint; loại bỏ frame trung gian có thể làm quân nhảy tới đích.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Vây Bắt — giữ phản hồi nước đi khi reduced-motion
- Không bỏ theo dõi attempt khi giảm chuyển động; quân tĩnh ở ô đích thử trong lúc chờ server, xác nhận thì thay bằng state thật, từ chối/timeout thì vẫn đánh dấu ô sai. Không chạy flight animation.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Ô Ăn Quan và Vây Bắt — animate lời nhắc đổi lượt
- Lời nhắc tới lượt và chờ đối thủ xuất hiện bằng entrance ngắn khi quyền thao tác đổi; reduced-motion dùng rule chung để rút animation.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Reduced-motion cho nút rời game
- Nút Rời phòng riêng của BANG!, Đua Hoàng Đạo và nút rời từ VictoryScreen dùng class `room-action-button`, nhờ vậy transition được rút về 1ms khi giảm chuyển động.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — không phủ lá bài quyết định bằng VictoryScreen
- Khi phase finished nhưng `usePlayedCardAnimation` còn hiệu ứng đang phát/xếp hàng, giữ VictoryScreen lại; hiển thị màn kết quả sau khi choreography đã xong.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — phát hiện card effect trước frame kết quả
- Đổi xử lý log card mới sang layout effect; snapshot có lá quyết định và phase finished cùng lúc sẽ bật effect trước khi VictoryScreen kịp vẽ frame đầu.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — giữ nội dung card effect khi reduced-motion
- Reduced-motion bỏ flight, flip, sheen và aura; lá bài/caption hiện tĩnh 600ms, khớp timer cleanup. Chuyển bài Panic giữ thẻ tại vị trí nhận thay vì mất do delay cũ.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Đua Hoàng Đạo — không làm xe biến mất sau khi tới đích
- Travel marker hiện từ ô xuất phát trong lúc chờ reveal xúc xắc, giữ đến cuối chuyển động; bỏ 480ms arrival khỏi raceMoves expiry để xe trên ô đích xuất hiện ngay sau grace.
- Reduced-motion đặt marker tĩnh ở ô đích thay vì chạy keyframe 1ms về opacity 0.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — giữ dấu đích projectile trong reduced-motion
- Viên đạn, mũi tên và vòng ngắm Duel ở trạng thái tĩnh tại điểm chạm khi giảm chuyển động; card effect và cue cùng được dọn sau 600ms.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## Reduced-motion — giữ dấu hiệu bắt/thu quân
- Vây Bắt giữ quân bị bắt cùng vòng tĩnh 260ms; Ô Ăn Quan bỏ hạt bay nhưng giữ nhãn số quân thu tại điểm trong 450ms. Timer cleanup khớp lifetime tĩnh.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.

## BANG! — cue phòng thủ và Duel khi reduced-motion
- Shield và tia sét giữ icon/ring tĩnh 300ms thay vì kết thúc opacity 0 sau 1ms; hook rút expiry về đúng thời lượng tĩnh.
- Frontend build pass; lint 0 errors, 2 cảnh báo Fast Refresh có sẵn.


## 2026-10-24 — BANG!: giữ cue HP và bị loại khi reduced-motion
- Tắt chuyển động thay vì rút animation xuống 1ms cho HP delta/bullet, elimination và hand loss; dấu hiệu tĩnh còn đọc được cho đến khi hook cleanup.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Ô Ăn Quan: căn cue thu quân reduced-motion
- Dấu thu quân tĩnh giữ delay theo thời điểm hoàn tất rải/settle; hook duy trì state đến cue muộn nhất + 450ms.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Vây Bắt: giữ cue nước đi reduced-motion
- Quân đi tức thời theo state server; glow, vệt đường và vòng đích đứng yên 260ms để nước đi vừa xác nhận vẫn dễ nhận biết.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Giữ delta điểm/quân khi reduced-motion
- Nhãn +N/−N không còn kết thúc opacity 0 sau 1ms; hiện tĩnh tới cleanup hook, vẫn tôn trọng delay theo diễn tiến lượt.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Ô Ăn Quan: giữ cue nước đi bị từ chối
- Khi reduced-motion, ô nguồn giữ viền đỏ/glow tĩnh 600ms thay cho keyframe rung 1ms.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Đua Hoàng Đạo: giữ cue gieo bị từ chối
- Nút gieo hiển thị viền/glow đỏ tĩnh trong lifetime rejectedRoll khi reduced-motion; thông báo thử lại vẫn đồng bộ.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — BANG!: giữ cue tay bài/trang bị/tầm bắn
- Reduced-motion giữ delta tay bài 820ms, flash tầm bắn/chồng bài tĩnh và chip trang bị gỡ 260ms trước cleanup.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — BANG!: đánh dấu lá bài vừa nhận
- HandFan gắn viền/glow theo từng card ID mới hoặc opening deal; WAAPI vẫn chạy ở chế độ thường, reduced-motion còn cue tĩnh trong lifetime state.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — BANG!: cue heal/lượt mới/bộ bài reduced-motion
- Bổ sung dấu trạng thái tĩnh xanh cho heal, vàng cho lượt mới và thay đổi bộ bài theo lifetime hook tương ứng.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — BANG!: giữ cue từ chối thao tác
- Lá bài/action bar bị từ chối dùng viền đỏ và glow tĩnh trong 560ms khi reduced-motion thay cho rung 1ms.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — BANG!: cue trang bị vũ khí/đồ reduced-motion
- Weapon equip giữ màu/glow vàng 500ms; từng equipment chip mới giữ viền/glow vàng 650ms theo state từng món.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Ô Ăn Quan: cue bắt Quan
- Ô Quan đổi nhãn thành ĐÃ BẮT theo state server và phát vòng/glow vàng đúng thời điểm capture; reduced-motion dùng viền tĩnh có delay/lifetime đồng bộ.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Vây Bắt: cue bộ đếm lượt đỏ reduced-motion
- Bộ đếm redTurnsUsed giữ màu/glow vàng 560ms khi giảm chuyển động, khớp lifetime flash state.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Đua Hoàng Đạo: cue xúc xắc/thùng reduced-motion
- Kết quả xúc xắc giữ viền/glow vàng 550ms; crate icon giữ glow xanh khi marker vừa tới ô.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Ô Ăn Quan: cue ô đổi quân reduced-motion
- Ô thay đổi quân giữ viền/glow xanh và con số giữ text-glow trong lifetime changedPits.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Ô Ăn Quan: cue điểm số reduced-motion
- Điểm vừa cập nhật giữ màu/glow vàng tĩnh theo flash state, bổ sung cho delta +N/−N.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Đua Hoàng Đạo: cue đang gieo reduced-motion
- Nút gieo có viền/glow tĩnh theo aria-busy trong suốt thời gian đợi server.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — BANG!: cue nút hành động đang gửi
- Nút end-turn/response có aria-busy giữ viền/glow vàng tĩnh trong reduced-motion đến khi pending state kết thúc.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Ô Ăn Quan: cue nước rải đang gửi
- Thông báo pendingMove giữ viền/glow tĩnh khi bật reduced-motion cho tới khi snapshot/error/timeout kết thúc.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — Đua Hoàng Đạo: cue nhãn đổi lượt
- Nhãn turn có text-glow vàng tĩnh theo turnChanged trong reduced-motion.
- Frontend build/lint: đang xác nhận.

## 2026-10-24 — BANG!: đồng bộ hiệu ứng Panic cho mọi client
- Card-back flight của Panic lấy nguồn/đích bằng player ID từ snapshot, phát trên cả client của nạn nhân, người đánh và người xem.
- Frontend build/lint: đang xác nhận.


**2026-10-24:**
- Ô Ăn Quan: phát hiện snapshot và đo tọa độ flight bằng layout effect để hạt rải/thu quân hiện đồng bộ với board sau paint; chi tiết ở `../architecture/gameplay-animation.md` và log ngày.

- Vây Bắt: thêm dash chuyển động vào trail nước đi; reduced-motion giữ kết nối nguồn/đích dưới dạng đường tĩnh.

- Đồng bộ animation state: các hook highlight/delta dùng chung và hook hành trình Đua Hoàng Đạo xử lý snapshot trước paint để cue không trễ khung hình.

- BANG!: chuyển các hook cue theo snapshot sang layout phase để card/HP/defense/equipment/turn không hiển thị trễ một paint.

- BANG!: xác nhận flight bài rút đã có trong HandFan, sửa backlog cũ; đồng bộ entrance dòng nhật ký và auto-scroll trước paint.

- Room chat: đưa cue tin mới và auto-scroll vào layout phase, đồng bộ với nội dung tin vừa nhận.
- Bốn bàn game đồng bộ pending/error và reset selection theo snapshot trong layout phase; timer hết hạn giữ effect thường.

- Vây Bắt: throttle cập nhật ghost drag theo requestAnimationFrame và hủy frame pending ở pointerup/cancel/unmount.

- AnimatedNumber đồng bộ nội suy/cập nhật reduced-motion trước paint trên các bộ đếm dùng chung.

- BANG!: bài rút của đối thủ có card-back flight từ nọc tới ghế trên mọi client; local hand tiếp tục dùng flight riêng theo từng lá.

- Room chat: animate toàn bộ tin mới khi nhận theo batch, stagger tối đa 160ms và expiry riêng từng entry.

- BANG!: khi người chơi bị loại, lá trên tay tản ra/tan tại ghế theo snapshot; nhãn giữ tổng N, reduced-motion hiển thị stack tĩnh.

- BANG!: nhận diện actor trong log “bắn nhầm” để flight các lá bị phạt xuất phát từ đúng ghế.
## 2026-10-24 — Đồng bộ tài liệu animation gameplay
- Gom phạm vi hiện tại của animation BANG!, Ô Ăn Quan, Vây Bắt, Đua Hoàng Đạo và platform dùng chung vào tài liệu kiến trúc; nêu rõ snapshot, đồng bộ trước paint, sự kiện liên tiếp và reduced-motion.
- Làm rõ trong backlog rằng kiểm chứng trực quan trên trình duyệt chưa được ghi nhận cho cả phạm vi ban đầu lẫn các đợt mở rộng.
- Chi tiết theo ngày ở `../logs/2026-10-24.md`; quy ước bảo trì ở `../architecture/gameplay-animation.md`.
## 2026-10-24 — Đếm đủ flight rút bài công khai BANG!
- Suy số lá rút của đối thủ từ game log mới, giữ delta cardCount làm fallback để không hụt animation khi snapshot đã gộp cả rút lẫn tiêu bài.
- Frontend build thành công; lint không lỗi (2 cảnh báo Fast Refresh có sẵn).
## 2026-10-24 — Bay bài bỏ BANG! tới chồng bài
- Bỏ bài do vượt giới hạn cuối lượt và phạt bỏ toàn bộ bài dùng choreography riêng từ tay/ghế actor tới discard pile; bỏ hào quang của nhịp đánh bài.
- Reduced-motion giữ cue lá bài tĩnh; frontend build thành công, lint không lỗi (2 cảnh báo Fast Refresh có sẵn).
## 2026-10-24 — Xác nhận runtime phục vụ rà animation
- Frontend trả HTTP 200 tại cổng 5173; `/health` trả 200 và báo PostgreSQL, Redis, RabbitMQ đều up. Browser tích hợp không có sẵn trong môi trường này nên chưa kiểm tra trực quan choreography.
## 2026-10-24 — Lá trang bị BANG! tới đúng slot
- Đánh dấu slot theo player ID và tên món; lá trang bị đã xác nhận bay từ lá cục bộ/ghế actor tới vũ khí hoặc chip tương ứng trên mọi client.
- Tắt aura đánh bài giữa bàn; reduced-motion vẫn giữ cue tĩnh/highlight slot.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.
## 2026-10-24 — Hiện animation xáo nọc BANG!
- Log server “Nọc bài hết — xáo lại từ chồng bài bỏ” kích hoạt tối đa sáu card-back bay từ khu vực bỏ bài về nọc; giữ lifetime riêng, reset/cleanup theo phòng và reduced-motion.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.
## 2026-10-24 — Nối nhịp xáo nọc và rút bài BANG!
- Khi snapshot có cả reshuffle và draw, flight rút chờ 420ms sau nhịp xáo; WAAPI fill backwards giữ frame nguồn trong delay, tránh lá lóe ở vị trí tay.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.
## 2026-10-24 — Bay trang bị cũ khi thay món BANG!
- Tách discardedCards khỏi lá trang bị mới trong event; món cũ bị luật đẩy vào discard bay từ slot/ghế actor tới chồng bỏ đồng thời món mới bay vào slot.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.
## 2026-10-24 — Rút ngắn transition điều khiển BANG! khi giảm motion
- ActionBar buttons, progress chọn bài, các thẻ bấm và nút game log nhận transition 1ms trong reduced-motion; state/cue chức năng vẫn giữ nguyên.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.
## 2026-10-24 — Hoàn tất rút transition tương tác game khi giảm motion
- Ô Ô Ăn Quan, ghế đếm/chỗ trống và status row Đua Hoàng Đạo nhận selector transition 1ms; Vây Bắt đã có rule tương ứng cho quân/node.
- Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.
## 2026-10-24 — Kéo thả lá bài BANG! bằng chuột
- Thẻ có thể thao tác nhận cursor grab, tooltip và native drag; drop lên mục tiêu hợp lệ chơi trực tiếp, drop vùng bàn dùng/chọn mục tiêu qua handler luật sẵn có, drop khi bỏ bài/phản hồi giữ hành vi hiện tại.
- Highlight điểm thả và làm mờ lá gốc; drag state reset khi kết thúc/đổi lượt/phòng. Frontend build thành công; lint 0 lỗi, 2 cảnh báo Fast Refresh có sẵn.
## 2026-10-24 — Animation ghế vừa trống khi người chơi rời phòng
- Bổ sung cue ghế trống cho BANG!, Đua Hoàng Đạo và Vây Bắt; tách nhánh rời khỏi cue người chơi mới vào, hỗ trợ thay đổi lặp liên tiếp.
- Reduced-motion rút cue xuống 1ms; xác minh bằng build/lint.


## 2026-10-24 — Playback tuần tự cho replay
- Thêm play/pause, bước trước/sau, tiến độ; highlight và tự cuộn nước đang phát, cho phép nhảy bước thủ công.
- Reduced-motion dùng scroll tức thời và transition/animation 1ms. Chưa dựng lại board vì replay artifact chưa có state khởi đầu.


## 2026-10-24 — Animation danh sách phòng chờ realtime
- Hàng phòng mới vào danh sách có entrance stagger tối đa 240ms; số người trong phòng nội suy theo snapshot.
- Reduced-motion bỏ delay và rút entrance còn 1ms.


- Cùng đợt: loading, lỗi tải và danh sách phòng rỗng cũng có entrance ngắn, vẫn giữ ngữ nghĩa live status/alert.


## 2026-10-24 — Entrance thẻ game và bộ đếm phòng chờ
- Thẻ game vào theo stagger khi tập kết quả lọc đổi; badge phòng chờ nội suy theo cập nhật realtime.
- Reduced-motion bỏ delay và rút entrance còn 1ms.


## 2026-10-24 — Reduced-motion cho luồng chọn game
- Rút transition hover/focus của thẻ, biểu tượng, filter chip và phần tử trang GameDetails xuống 1ms khi prefers-reduced-motion.
- Giữ cue trạng thái màu/viền và rule entrance hiện có.


- Playback replay: summary mỗi nước đi cũng là nút tua trực tiếp; thao tác này dừng autoplay và cập nhật highlight/scroll/progress.


## 2026-10-24 — Đồng bộ index playback replay với artifact
- Sửa tua/highlight dùng index mảng 0-based thay moveNumber server 1-based; nhãn dòng dùng thứ tự tuần tự, tránh lệch ở event SYSTEM và bước cuối.


## 2026-10-24 — Chuyển cảnh route vào/ra ván
- Bật React Router viewTransition cho vào/ra phòng, rematch, thư viện/chi tiết và history/replay; CSS fade + dịch nhẹ, reduced-motion 1ms.


## 2026-10-24 — Entrance danh sách lịch sử ván
- Thêm stagger theo hàng cho bảng lịch sử; reduced-motion rút animation còn 1ms và xóa delay.


## 2026-10-24 — Entrance trạng thái lịch sử/replay
- Loading, lỗi, rỗng/không tìm thấy trong lịch sử và replay có entrance; summary/khung replay vào khi dữ liệu tải xong.
- Dùng rule game-action-enter chung để reduced-motion rút còn 1ms.


## 2026-10-24 — Cue pending ở thao tác sảnh phòng
- Sao chép link, tạo/tìm trận và hủy phòng có aria-busy/spinner theo request; thông báo copy entrance.
- Reduced-motion giữ spinner thành vòng tĩnh.


## 2026-10-24 — Entrance cho trạng thái vào phòng/game
- Thêm entrance cho lỗi/404/phòng đóng, engine loading/missing và lỗi thao tác tạo phòng; giữ role alert/status.
- Reduced-motion áp dụng rule game-action-enter chung.


## 2026-10-24 — Hoàn tất reduced-motion khung mời phòng
- RoomInvite có entrance; nút sao chép rút hover/press transition xuống 1ms khi reduced-motion.


## 2026-10-24 — Chọn tốc độ playback replay
- Thêm tốc độ 0.5×/1×/1.5×/2×; đổi tốc độ cleanup timer hiện tại và áp dụng vào nhịp kế tiếp.


## 2026-10-24 — Entrance lỗi và empty-state thư viện game
- Thêm entrance cho lỗi tải engine và trạng thái lọc không có game; reduced-motion rule chung.


## 2026-10-24 — Entrance rejoin và số lượng kết quả
- Nút vào lại ván đang chơi và thanh số lượng game sau lọc có entrance khi xuất hiện.


## 2026-10-24 — Nội suy bộ đếm lobby/thư viện
- Số phòng chờ và số kết quả game dùng AnimatedNumber; tiêu đề phòng hiển thị cả 0 để chuyển tới empty-state mạch lạc.
- Reduced-motion cập nhật tức thời qua hành vi chung của AnimatedNumber.


## 2026-10-24 — Phủ reduced-motion toàn thư viện game
- Scope duration 1ms cho root và mọi control trong GameLibrary, gồm search/clear/filter/card actions; giữ rule riêng cho entrance.



## 2026-10-24 — Hướng dẫn kéo thả lá BANG!
- Trong lúc kéo, hiện chip nổi có tên lá, vùng đích gợi ý và phím Esc; thông báo aria-live, không bắt pointer.
- Giữ highlight vùng thả/mục tiêu theo luật hiện hành; reduced-motion rút entrance về 1ms.


## 2026-10-24 — Phản hồi đổi ô nguồn Ô Ăn Quan
- Bảng chọn hướng rải chạy lại entrance theo ô dân được chọn và nêu số quân ở ô nguồn.
- Cập nhật gameplay-animation và log.


## 2026-10-24 — Chuyển tab hướng dẫn có entrance
- Nội dung tabpanel chạy entrance ngắn khi người chơi chọn mục hướng dẫn khác; giữ nguyên điều hướng bàn phím và ARIA tabs.
- Áp dụng reduced-motion từ rule toàn cục.


## 2026-10-24 — Entrance nhật ký theo loại sự kiện
- Tách hiệu ứng dòng log mới BANG! cho tấn công, hồi máu, phòng thủ, loại người chơi và chiến thắng.
- Đồng bộ thời hạn class với animation 360ms; reduced-motion vẫn rút về 1ms.
- Cập nhật kiến trúc gameplay và log.


## 2026-10-24 — Phân loại đúng hiệu ứng log BANG!
- Xếp phòng thủ trước từ khóa Bang! để không nhầm log bỏ Bang! né Người da đỏ thành tấn công; nhận diện sát thương HP và đấu súng.
- Thêm entrance riêng cho rút/bỏ bài, trang bị và đổi lượt; ưu tiên log DEBUG.
- Cập nhật quy ước và log.


## 2026-10-24 — Va chạm đạn tại ghế mục tiêu
- Thêm vòng impact tại đích sau thời gian bay cho Bang!/Gatling/mũi tên; stagger theo từng mục tiêu.
- Không áp dụng cho hiệu ứng ngắm đấu súng; reduced-motion giữ dấu va chạm tĩnh tại ghế.
- Cập nhật tài liệu gameplay và log.


## 2026-10-24 — Phân biệt chuyển và bỏ bài trong log
- Hoảng loạn lấy bài dùng entrance chuyển bài riêng; loại bỏ hiệu ứng discard sai cho hành động này.
- Chỉ log xác nhận lá bị bỏ mới dùng animation discard; log thất bại không giả lập thay đổi bài.
- Cập nhật tài liệu gameplay và log.


## 2026-10-24 — Trạng thái rematch khi đang chờ
- Nút chơi lại dùng aria-busy/accessible name rõ ràng và dấu viền pending cho cả bốn game.
- Reduced-motion giữ spinner tĩnh, dấu chờ không phụ thuộc chuyển động.
- Cập nhật kiến trúc và log.


## 2026-10-24 — Thông báo log mới có entrance
- Nút xem log mới nhất xuất hiện bằng entrance khi có dòng mới lúc người chơi đang đọc phần cũ; aria-live polite.
- Không tự kéo vị trí cuộn; reduced-motion dùng hiệu ứng chung 1ms.


## 2026-10-24 — Exit animation phòng chờ realtime
- Giữ hàng phòng vừa rời danh sách trong 240ms để fade/translate; bộ đếm và actions dùng danh sách server mới.
- Hàng thoát aria-hidden, bỏ nút thao tác; empty state chỉ hiện sau khi exit kết thúc.
- Reduced-motion rút animation/timer còn 1ms; dọn timer khi unmount.
- Cập nhật tài liệu gameplay và log.


## 2026-10-24 — Entrance cho trạng thái chat trong phòng
- Thêm entrance cho nút xem tin mới, cảnh báo offline và lỗi gửi; nút gửi có aria-busy/viền pending.
- Giữ stagger tin nhắn, cuộn tới tin mới chỉ khi người dùng chủ động bấm.
- Cập nhật kiến trúc và log.


## 2026-10-24 — Đồng bộ thời hạn entrance chat
- ChatPanel giữ class tin nhắn mới trong 360ms cộng stagger, khớp với animate-log-entry thay vì bị dọn ở 220ms.
- Cập nhật quy ước expiry trong gameplay-animation và log.


## 2026-10-24 — Dấu pending ActionBar BANG!
- Hiện viền/vầng sáng cho nút kết thúc lượt và phản hồi khi aria-busy ở cả motion thường lẫn reduced-motion.
- Spinner tĩnh trong reduced-motion; trạng thái pending vẫn rõ.
- Cập nhật tài liệu và log.


## 2026-10-24 — Muzzle flash tại người bắn
- Đặt lóe súng theo origin của shot flight để đồng bộ với đường đạn và impact; fallback tọa độ giữa bàn khi thiếu flight metadata.
- Gỡ hạn chế cũ khỏi backlog và cập nhật ghi chú lịch sử.
- Cập nhật gameplay-animation và log.


## 2026-10-24 — Dấu lựa chọn số ghế
- Thêm tick có entrance cho số ghế đang chọn ở form tạo phòng BANG! và Đua Xe Hoàng Đạo; giữ aria-pressed.
- Reduced-motion hiển thị tick tĩnh ngay.
- Cập nhật tài liệu và log.


## 2026-10-24 — Tôn trọng reduced-motion khi cuộn tới phòng
- Cuộn mượt tới khu vực tạo/vào phòng khi chơi ngay, chuyển thành auto khi bật reduced-motion.
- Giữ nguyên focus và điều hướng deep-link; cập nhật kiến trúc/log.


## 2026-10-24 — Giữ overlay tới impact diện rộng cuối
- Tăng lifetime wide attack lên 1500ms, bao phủ target stagger cuối và impact 300ms; reduced-motion tiếp tục lifetime 600ms cho cue tĩnh.
- Chỉnh backlog để phân biệt lịch sử glow rút bài với flight WAAPI hiện hành.
- Cập nhật tài liệu gameplay và log.


## 2026-10-24 — Giữ hàng phòng trước paint khi exit
- Chuyển phát hiện phòng vừa biến mất sang layout phase để giữ hàng cũ trước paint, tránh nháy mất rồi mới chạy exit.
- Đổi nhãn từ đóng phòng sang rời sảnh cho đúng cả trường hợp phòng đầy.
- Cập nhật kiến trúc và log.


## 2026-10-24 — Dấu pending sao chép lời mời
- Thêm viền/vầng sáng cho nút sao chép liên kết khi clipboard đang xử lý; reduced-motion giữ trạng thái tĩnh.
- Cập nhật kiến trúc và log.


## 2026-10-24 — Chuyển động cho đổi tên trong phòng
- Thêm entrance cho chế độ sửa tên, trở về tên hiển thị và lỗi; nút Lưu có spinner/aria-busy/viền chờ.
- Reduced-motion giữ spinner tĩnh và rút entrance chung.
- Cập nhật tài liệu gameplay và log.

- BANG!: bổ sung phản hồi kéo thả mục tiêu sai bằng viền đỏ nhịp nhẹ; mục tiêu hợp lệ tiếp tục có viền vàng. Reduced-motion giữ dấu hiệu tĩnh.

- BANG!: thêm custom drag image nghiêng/bóng nhẹ và transition nhấc lá gốc; cleanup ảnh tạm ngay khi trình duyệt nhận drag image.

- Đua Xe Hoàng Đạo: đồng bộ animation nhảy từng ô với đường chạy và delay hé lộ xúc xắc; sửa lỗi CSS shorthand từng diễn giải số bước thành delay tính bằng giây.

- Ô ăn quan/reduced-motion: bỏ delay hạt bay cũ khỏi điểm số, ô Quan, thu quân và gieo lại; giữ cue tĩnh hiện ngay, dọn overlay sau 450ms.

- BANG!: giữ overlay bài thiết bị bị thay cho trọn delay 420ms + flight 600ms + stagger; reduced-motion giữ cue tĩnh 320ms rồi cleanup.

- BANG!: đồng bộ cleanup overlay rút bài công khai với CSS delay/flight 420+600ms và grace 48ms, gồm delay xáo nọc nếu có.

- BANG!: xóa highlight drop-target khi kéo bài ra khỏi bàn, giữ nguyên khi dragleave chỉ chuyển qua phần tử con.

- BANG! dragleave: fallback theo clientX/clientY và bounds khi relatedTarget bị null, tránh tắt highlight giả.

- BANG!: xếp equipment-discard flight trên play-card overlay để đường bay đồ cũ không bị lá hành động giữa bàn che; giữ shot layer trên cùng theo DOM order.

- Replay: làm mượt nền/vệt focus khi chuyển bước để hàng vừa xem rời trạng thái active nhẹ nhàng.

- Platform/phòng: banner kết nối fade/translate khi phục hồi; trạng thái mới hủy exit đang chạy. Reduced-motion rút về 1ms.

- DisconnectBadge: fade/translate khi người chơi kết nối lại; hủy exit khi danh sách người mất kết nối đổi, aria-hidden trong exit và reduced-motion 1ms.

- RoomErrorBanner: lỗi đã được xử lý thoát bằng fade/translate 180ms; lỗi mới thay ngay, reduced-motion 1ms.

- RoomShell: dùng chung hook useExitNotice cho exit của connection, disconnect và lỗi; tránh lệch timer/cleanup giữa các banner.

- BANG! bỏ bài: cue hoàn tất xanh/tick khi đã chọn đủ lá để xác nhận lượt.

- BANG! drag hint: nêu tên ghế hợp lệ hoặc lý do mục tiêu không hợp lệ khi rê bài; entrance 120ms, reduced-motion 1ms.

- BANG! k�o b�i: hi?u ?ng nh?c l�, b�ng theo con tr?, tr?ng th�i m?c ti�u h?p l?/sai v� v�ng th? v�o b�n; h? tr? h?y b?ng Escape.

- T?i �u l?p chuy?n �?ng k�o b�i BANG!: will-change ch? ho?t �?ng trong tr?ng th�i k�o, gi?i ph�ng khi th?/h?y.

- T�ch chunk board theo game b?ng lazy import; tr?ng th�i ch? t?i b�n c� cue chuy?n �?ng tinh t? v� reduced-motion.

- Replay: n�t ph�t/t?m d?ng c� tr?ng th�i aria-pressed v� chuy?n �?ng �?i tr?ng th�i 180ms, reduced-motion 1ms.

- V�y B?t: reduced-motion b? c? SVG animateTransform c? �?nh khi �i/th?; tr?ng th�i cu?i v� cue t?nh v?n r?.

- V�y B?t: ph�t l?i cue �? cho m?i l?n th? � sai, k? c? l?p c�ng m?t node tr�?c khi cue c? k?t th�c.

- RoomStatusBanner: fade/translate banner ch? khi ph?ng chuy?n sang ch�i, 180ms; aria-hidden trong exit v� reduced-motion 1ms.

- �ua Ho�ng �?o: ph�t l?i animation x�c x?c/pulse k?t qu? khi m?t gieo l?p l?i, trigger theo kh�a n�?c �i �? x�c nh?n.

- T?t ping trang tr� c?a banner ch? trong l�c exit fade.

- Replay: animation m?/��ng chi ti?t n�?c �i b?ng grid transition 180ms v� chevron; gi? semantics details/summary, reduced-motion 1ms.

- Banner ch? ph?ng: animate ri�ng s? ng�?i m?i v�o (pop 260ms), gi? nguy�n banner; reduced-motion 1ms.

- Replay details: ?n marker browser m?c �?nh �? kh�ng ch?ng l�n chevron animation t�y ch?nh.

- Replay: ph�t l?i active-row cue khi ng�?i d�ng tua/ch?n l?i c�ng n�?c �i.

- Replay progress: �?ng b? transition 280ms tr�n WebKit v� Firefox, reduced-motion 1ms.

- Replay details summary: focus-visible r? cho b�n ph�m, m�u chuy?n 140ms, reduced-motion 1ms.

- L?ch s? v�n: hover/focus ph?n h?i cho li�n k?t Xem l?i (140ms, reduced-motion 1ms).

- Reduced-motion: r�t m?i transition xu?ng 1ms v� t?t smooth scrolling to�n c?c, bao ph? c? class Tailwind ch�a li?t k�.

- Lobby game: th? r?i b? l?c/search fade/translate/scale 220ms, kh�a thao t�c trong l�c exit, h?y exit n?u ��?c kh?p l?i; reduced-motion 1ms.

- BANG!: them goi y tuong tac keo bai duoi tay bai khi co la dung duoc, giup nguoi choi nhan biet co the keo len ban hoac ghe muc tieu; reduced-motion 1ms.

## 2026-10-24 — Gameplay animation and interaction pass
- BANG!: animate unseen log arrivals and disclosure chevron; preserve closed-panel new-event affordance.
- O An Quan: show the pending source pit and calculated sow route while waiting for server acknowledgement.
- Vay Bat: keep pending move feedback visible until acknowledgement, rejection, or timeout.
- Zodiac Race: add accessible player progress bars synced to racer movement and dice reveal.
- Room invite: animate/replay copy status and show a distinct success state on button and message.
- Frontend production build passed; no tests run.

- O An Quan: expose selected pit state and link its direction controls for assistive technology (ria-pressed, ria-expanded, ria-controls).
- Frontend build passed after this accessibility pass.

- Zodiac Race: animate progress-meter fill via scaleX transform instead of width to avoid repeated layout during movement.
- Frontend build passed.

- Zodiac Race reduced-motion: clear the progress fill's inline reveal delay so the progress meter reaches the confirmed position immediately with the static racer.

- BANG! HandFan cancels active WAAPI deal/FLIP when the user enables reduced-motion mid-animation; unregister media listener on unmount.
- Frontend production build passed.

- BANG! victory overlay backdrop fades in for 220ms alongside the outcome card; reduced-motion shortens the cue to 1ms.
- Frontend build passed.

- BANG! drag hint floats above the board instead of taking layout space; starting a drag no longer shifts seats/drop targets.
- Frontend build passed.

- BANG! HandFan empty-hand state now enters with a short action cue when the last card leaves; reduced-motion uses shared 1ms rule.
- Frontend build passed.

- BANG! GameLogPanel now shows the collapsed MỚI badge when entries arrive while closed, without showing it just because the user collapsed the panel.
- Frontend production build passed.

- BANG! Replay the collapsed new-log badge and jump-to-latest cue on each later log arrival by keying them to log length.
- Frontend production build passed.

- BANG! GameLogPanel clears stale new-entry badge/animations and resets its scroll baseline when a shorter log snapshot indicates a game reset.
- Frontend build passed.

- Vây Bắt: replace per-frame filter animation on moved pieces with opacity/scale and a static glow; reduced-motion keeps a static highlight.
- Frontend production build passed.

- Shared AnimatedNumber cancels pending delay/RAF and jumps to confirmed value if reduced-motion is enabled mid-count; remove listener on cleanup.
- Frontend production build passed.

- Lobby room/game card exits finish immediately if reduced-motion is enabled mid-exit; clear timers/state and remove media listeners on unmount.
- Frontend production build passed.

- Shared room/connection/error banner exits now finish and clear their timer immediately if reduced-motion is enabled mid-exit.
- Frontend production build passed.

- Shared room chat now shows its character count from 450 characters onward; the count is linked to the input and excluded from live announcements while typing.

- Reduced-motion chung gio han moi CSS animation ve 1ms, xoa delay va chi chay mot vong; bao phu ca animation chua co selector rieng.
- Frontend production build passed.

- Zodiac Race: make the horizontally scrolling track a named, keyboard-focusable region with a visible focus outline, so users can navigate the full board without a pointer.

- Vay Bat board: expose playable intersections to keyboard users with labelled SVG buttons, Enter/Space move activation, visible focus cue, and a short instruction.

- BANG!: stop the active played-card overlay and clear queued animation effects immediately if reduced motion is enabled mid-flight.

- Vay Bat: observe reduced-motion changes live and stop in-flight SVG SMIL piece movement when the preference is enabled.

- Shared game feedback hooks now shorten active and future score/value deltas, changed-piece highlights, and state flashes when reduced motion is enabled live.

- BANG!: health delta, damage shake, and healing feedback now shorten active timers when reduced motion is enabled mid-cue.

- BANG!: card-draw, public hand-count, muzzle-flash, and turn-start cues now honor live reduced-motion changes.

- BANG!: elimination, initial deal, defense, duel, and equipment entry/exit cues now shorten their active timers when reduced motion is enabled live.
- BANG!: newly received card highlights now shorten along with the hand-entry animation when reduced motion changes live.

- Ô Ăn Quan and Zodiac Race: shorten active sowing/capture and racer move state when reduced motion is enabled mid-sequence.

- Vay Bat: shorten active capture and moved-piece feedback timers when reduced motion is enabled mid-sequence.

- BANG!: shorten active public draw, reshuffle, discarded-equipment, and rejected-action visual feedback when reduced motion is enabled live.

- BANG!: public card travel, reshuffle, discarded equipment, and rejected-action overlays shorten when reduced motion is enabled live; network pending timers remain separate.

- Zodiac Race and Ô Ăn Quan: shorten active rejected-roll and rejected-move cues when reduced motion is enabled live.

- Vay Bat: shorten invalid-destination feedback when reduced motion is enabled during the cue.

- Use one shared reduced-motion media listener for all active game animation hooks instead of one listener per hook instance.

- Route HandFan WAAPI cancellation and Vay Bat live motion updates through the shared preference subscription.

- Move AnimatedNumber counters and BANG! played-card effects onto the shared reduced-motion subscription; cancel counting immediately and shorten/clear card effects when motion is reduced.

- BANG!: game-log entry highlight timers now respond to live reduced-motion changes through the shared preference store.

- Move reduced-motion subscription to shared app hooks and use it for room chat entrances and room-status/connection exit notices.

- Global reduced-motion fallback now clears transition-delay as well as animation-delay, including inline gameplay transition delays.

- Zodiac Race live region announces confirmed movement, crate pickups, and finish results alongside visual travel feedback.
- O An Quan keyboard direction selection moves focus into the choice group; Escape cancels and restores focus to the selected pit.
- AnimatedNumber avoids unchanged-frame renders and safely resolves zero or invalid durations to the authoritative value.
- Chat character counter occupies a dedicated row on narrow layouts so composer controls retain usable width.
- Replaced generic active-turn pulses with one shared scale-and-glow beacon across all four game boards; reduced-motion mode keeps a static highlighted marker.
- Added a four-game gameplay animation coverage map to guide continued event-by-event review; it explicitly distinguishes source-level coverage from runtime visual verification.
- Win result emblems now emit a short shared halo ring across all four games; reduced-motion mode suppresses the ring while preserving the static victory state.
- Zodiac Race now pulses the destination tile when a racer arrives, synchronized with the travel endpoint.
- O An Quan score counters now reveal refill deductions after the final score-to-pit seed flight lands.
- Vay Bat captured-piece counters and +N deltas now reveal after the last capture burst, with a stable delay and reduced-motion immediate update.
- Vay Bat captured pieces now fly from their last node to the correct side's capture counter; count and +N reveal on landing, while reduced motion skips the flight.
- BANG! projectile source and target resolution now uses pending-response player IDs for matching attacks, avoiding incorrect flights when display names repeat.
- Added a red result halo for defeat emblems, visually distinct from the gold win halo and disabled under reduced motion.
- Zodiac Race finish flag and result panel now follow the winning racer's arrival; reduced-motion mode keeps immediate result display.
- BANG! hand guidance now switches between desktop drag-and-drop instructions and concise tap/seat-target instructions on narrow screens; card selection and game rules are unchanged.
- Added a subtle expanding ring to the shared active-turn beacon across all four games; the ring is decorative and omitted under reduced motion.
- Lobby room-list loading feedback now has stronger contrast, a spinner, and an announced busy state; retry has clear keyboard focus feedback.
- Vây Bắt now announces turn guidance, move confirmation, and legal destination count through a polite screen-reader status; pointer drag-target changes are excluded to keep announcements calm.
- Ô Ăn Quan end-of-game result and rematch controls now wait for the final score/seed animation sequence; reduced-motion remains immediate.
- Frontend production build passed after integration. Runtime visual review was unavailable; no tests were run.
- Ô Ăn Quan sowing-event cleanup now retains a long final move through the winner-reveal buffer, preventing the result timer from collapsing when its source event expires.
- Vây Bắt winner/rematch reveal now follows the last confirmed move and capture transfer; timeout and reduced-motion outcomes remain immediate.
- Matched the Vây Bắt result wait to the full 420 ms move-impact cue plus a short settle buffer.
- Ô Ăn Quan direction-path preview now fades out on pointer/focus exit; changing direction cancels the fade, while move/cancel/turn changes clear immediately.
- HandFan now cancels active WAAPI card motion in layout phase when reduced-motion is enabled, and resets its FLIP baseline before motion can resume.
- BANG! reduced-motion flight cleanup now reacts to active/new draw, reshuffle, and equipment-discard overlays while the preference remains enabled.
- Ô Ăn Quan final result now waits on absolute score-reveal deadlines across every active sowing event, including earlier long captures/settlements overlapping the final move.
- Ô Ăn Quan score counters and deltas now share the maximum absolute reveal deadline across active sowing events; memoized delays remain stable across unrelated renders.
- Ô Ăn Quan pit highlights/counts now use the latest absolute arrival deadline for events that touch that pit, preserving per-pit choreography across overlapping moves.

- Keep Quan capture flashes alive for overlapping events and alternate per-pit keyframes to replay repeated captures.

- Zodiac Race reduced-motion now shortens progress-bar transitions and landing rings along with racer travel.

- Preserve back-to-back Zodiac Race moves per seat by queueing travel events until the active movement settles.

- Clear stale invalid-target animation when a Vay Bat move is confirmed through keyboard input.

- Retain queued BANG! action feedback when reduced-motion preference changes; shorten active and subsequent cues to 180 ms.

- Prevent overlapping BANG! hand FLIP animations from stacking when the hand reflows mid-flight; reset active motion on room/reduced-motion changes.

- Keep a card's active deck-to-hand arrival animation from being replaced by a FLIP reflow when another draw arrives.

- Preserve per-card BANG! arrival highlights across subsequent draw batches and expire/prune each card independently.

- Return focus to the selected Ô Ăn Quan pit when canceling direction choice by button or Escape.

- Keep queued Zodiac Race position/progress cues synchronized with each active segment and remove repeated roll-reveal waits between queued moves.

- Add a brief Ô Ăn Quan direction-menu exit transition while preventing interaction during closing.

- Show a finite post-drop rejection cue on an invalid BANG! target, while retaining the selected card for retry.

- Synchronize queued Zodiac Race crate totals and pickup effects to each active movement segment.

- Keep a BANG! target card selected after invalid drop even when it was already selected before drag.

- Explain each unavailable BANG! hand card inline during the player's turn, including when other cards remain playable; reserve end-turn guidance for when no card is playable.
- Allow Vay Bat keyboard users to cycle through legal destinations with arrow keys and confirm with Enter or Space after piece selection.


- Clarify Vay Bat drag targets: invalid nodes show a red outline and point players to green legal-move markers; valid targets retain the move-count instruction, with reduced-motion support.


- Show Vay Bat keyboard controls in the selected-piece guidance; keep destination focus feedback reduced-motion aware.
- Announce Vay Bat arrow-key destination controls through the move-selection live status, matching the visible keyboard hint.

- Stagger BANG! public opening deal in round-robin order across opponent seats; keep later draw batches compact and honor reduced-motion.

- Emphasize the Vay Bat legal route under pointer/keyboard focus and clear the cue on exit or selection change; keep a static reduced-motion style.
- Keep O An Quan direction preview visible while either pointer hover or keyboard focus remains; restore the focused direction after pointer exit.

- Preserve the Vay Bat legal-route preview while either pointer hover or keyboard focus remains on a destination; clear preview sources on selection or room change.
- Announce confirmed BANG! card actions through a polite screen-reader status while the decorative play animation is running.

- Show Zodiac racers' origin and destination beside the die result while movement animations are active.

- Show O An Quan sowing step/progress and active capture/settlement/refill phase; use a resolving-board message during animation and omit the progress timer for reduced motion.

