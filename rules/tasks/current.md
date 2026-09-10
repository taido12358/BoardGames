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

Tổng test hiện tại: backend 189/189 pass (`dotnet test backend/BoardGame.sln`), frontend 118/118
pass (`npm run test` trong `frontend/`) — cả 2 đúng lệnh CI dùng; 5 test backend cần Docker.

**Đã verify cả 9 commit (14-22) chạy thật trên GitHub Actions** — run
`34518584349`/`34519404921`/`34519619027`/`34521278895`/`34523008065`/`34524664240`/
`34525284764`/`34526258657`/`34528351569` đều `completed`/`success` (gồm cả job `docker` build
thử smoke test), không chỉ xanh cục bộ.

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
