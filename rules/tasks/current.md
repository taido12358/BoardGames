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

