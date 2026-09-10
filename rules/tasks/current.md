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

Tổng test hiện tại: backend 141/141 pass (`dotnet test backend/BoardGame.sln`), frontend 54/54
pass (`npm run test` trong `frontend/`) — cả 2 đúng lệnh CI dùng; 5 test backend cần Docker.

## Việc đang làm / tiếp theo (thứ tự ưu tiên gợi ý, không bắt buộc theo đúng thứ tự)

- **Ưu tiên cao: live-test Ô Ăn Quan qua Chrome/Docker Compose** với 2 danh tính thật (cần tài
  khoản Gmail thứ 2, xem "Việc dở dang từ đợt trước" bên dưới) — game mới, luật khá phức tạp
  (relay/ăn quân/hết vốn), chỉ verify được bằng unit test tới giờ, chưa ai thực sự chơi thử.
  Ít nhất nên tự chơi 1 mình qua 2 tab (không test được race-condition 2-người-thật nhưng vẫn
  xác nhận được UI/luồng render/click hoạt động đúng).
- (Đã xong 2026-09-11 — mục 15) ~~Test component `VayBatBoard.tsx`~~.
- Cân nhắc thêm thao tác quản trị có phá huỷ (huỷ phòng treo thủ công từ `/admin`) — CHỈ làm
  nếu người dùng xác nhận cần, kèm log ai-làm-gì-lúc-nào (xem "Chủ ý CHƯA làm" ở trên).
- Debug panel cho Bang (spec §51 trong `van-de.md`) — dev-only, đụng vào `BangRules.cs` (engine
  lớn/nhạy cảm nhất repo) để thêm force-draw/force-damage; cân nhắc kỹ trước khi làm vì đây là
  action mutate state bỏ qua luật chơi bình thường, dù chỉ bật ở Development. CẦN hỏi xác nhận
  người dùng trước (xem lý do ở mục "Chủ ý CHƯA làm").
- Game thứ tư (nếu muốn) — asset zodiac vẫn còn chưa dùng tới sau cả Bang lẫn Ô Ăn Quan.

## Việc dở dang từ đợt trước (2026-09-05, tạm gác — không chặn việc mới)

Rebuild cơ chế phòng/ghép trận đã xong code (commit `07155fc`, `15ae7b2`), nhưng **live test qua
Docker Compose bị dừng giữa chừng ở bước đăng nhập OTP** và **Docker Compose của phiên đó đã
tắt** (không còn chạy — kiểm tra lại bằng `docker compose ps` trước khi giả định gì về trạng thái
container). Việc còn thiếu, cần 2 danh tính Gmail khác nhau thật để test (không dùng lại được vì
`JoinRoomAsync` coi cùng `userId` là reconnect, không phải người chơi thứ 2):
- Ngắt mạng giữa ván (VayBat xử thua, Bang auto end-turn/auto-fail-respond)
- Ghép trận nhanh 2 người đồng thời, đua `Cancel`/`JoinRoom`
- Sảnh realtime 2 tab

Chỉ verify được các kịch bản này qua code review + test tự động đã có (không tự chạy live 2 danh
tính được vì không có tài khoản Gmail thứ 2) — chấp nhận giới hạn này, không phải việc chặn.

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
