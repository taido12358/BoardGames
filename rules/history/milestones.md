# Milestones

Rút trực tiếp từ `git log` (nhánh `master`). Ngày là ngày commit thật.

## 2026-06-29 — Khởi tạo platform + game đầu tiên (Vây Bắt)

- `first commit`, `First game`, `Reallocate folders, re-manage files` — dựng khung Platform/Games, stack ASP.NET Core + React + PostgreSQL/Redis/RabbitMQ/OpenSearch/MinIO, game đầu tiên **Vây Bắt trên đồ thị** (`Games/VayBat/`).

## 2026-06-30 — Ổn định schema bootstrap

- Loạt fix quanh việc bỏ EF `EnsureCreated()` chuyển sang raw SQL bootstrap idempotent trong `Program.cs` (lỗi `FormatException`, cột thiếu `GameKey`/`MoveJson`, cột thừa `PieceId`/`MaxRedTurns`, escape `{{}}` cho jsonb literal). Toàn bộ nguyên nhân + fix: [`../workflow/debugging.md`](../workflow/debugging.md).

## 2026-07-04 — Fix bug "không thể di chuyển quân"

- `cff9303` (PR #1, `7183150`): chẩn đoán và fix triệt để bug người chơi tưởng không đi được quân — nguyên nhân gốc là `playerName` trùng giữa các tab cùng trình duyệt (`localStorage`) khiến ghế thứ hai không được lấp; kèm fix Redis không được chặn broadcast, lỗi SignalR phải hiện lên UI. Verify bằng 2 client SignalR + Playwright/Chromium thật, không chỉ đọc code. Chi tiết: [`../workflow/debugging.md`](../workflow/debugging.md).

## 2026-07-05 — Đăng nhập không mật khẩu qua OTP email

- `bda11f2`: thêm luồng đăng nhập OTP 6 số gửi qua Gmail SMTP (MailKit), hash SHA-256 lưu DB, JWT trong cookie HttpOnly — giải quyết tận gốc lớp bug "trùng `playerName` giữa các tab" bằng cách chuyển định danh người chơi sang email/user id ổn định.
- `8aafaa1`: tổng quát hoá `GmailOtpSender` → `SmtpOtpSender`, đọc `EMAIL_PROVIDER`/`SMTP_*` từ env thay vì hard-code Gmail — cho phép đổi SMTP provider mà không sửa code.

## 2026-08-05 — Thiết lập hệ thống tài liệu `rules/`

- Gộp thư mục `rule/` (26 file phẳng) thành `rules/` phân theo coding/architecture/workflow/tasks/logs/history/references; viết lại `CLAUDE.md` thành file điều hướng thuần. Chi tiết: [`../logs/2026-08-05.md`](../logs/2026-08-05.md).

## 2026-08-05 — Game 002: BANG! (hidden-role, 4-8 người)

- Triển khai đầy đủ game thứ hai (`gameKey: "bang"`) theo yêu cầu trong `van-de.md`: 8 nhân vật Western với khả năng riêng, 15 loại bài, phân bố vai trò 4-8 người, khoảng cách bàn tròn, luật server-authoritative đầy đủ (Bang!/Trượt!/Đấu súng/Người da đỏ!/Súng Gatling/Hoảng loạn!/Cat Balou/vũ khí/Mustang/Thùng rượu), UI 100% tiếng Việt.
- Mở rộng Platform generic (không phá VayBat) để hỗ trợ game > 2 người và thông tin ẩn: ghế `SeatCount`/`SeatsJson`, nước đi hệ thống `side: "SYSTEM"` để chia state ban đầu, `IGameEngine.RedactStateForViewer` + broadcast SignalR riêng theo từng connection. Chi tiết quyết định: [`decisions.md`](./decisions.md).
- Tạo project test đầu tiên của repo (`backend/BoardGame.Api.Tests`, xUnit) — 85 test phủ luật Bang, bao gồm test bảo vệ thông tin ẩn bằng cách soi chuỗi JSON đã serialize.
- Verify sống: `dotnet build`/`dotnet test` xanh, `npm run build` xanh, `docker compose up --build` chạy được, 4 SignalR client thật join một phòng Bang → server tự chia bài → không client nào nhận được bài người khác → nước đi ngoài tầm bị từ chối đúng thiết kế.
- Theme nhân vật: Western gốc theo spec (không dùng asset 12-cung-hoàng-đạo đã có sẵn trong repo — quyết định của người dùng, xem [`../tasks/backlog.md`](../tasks/backlog.md)).

## 2026-08-05 — Thư viện trò chơi (thay `<select>` chọn game)

- Thay giao diện chọn game kiểu `<select>` (`platform/Lobby.tsx`, đã xoá) bằng Thư viện trò chơi dạng thẻ trực quan: `GameLibrary` (tìm kiếm + lọc + lưới thẻ) → `GameDetails` (hướng dẫn theo tab + tạo/vào phòng) — UI 100% tiếng Việt.
- Thêm `react-router-dom` v6 — dự án lần đầu có router thật (`/games`, `/games/:gameKey`); trước đó điều hướng chỉ bằng state. Chi tiết quyết định: [`decisions.md`](./decisions.md).
- Kiến trúc metadata/hướng dẫn generic theo `gameKey` (`platform/gameLibraryTypes.ts` + `platform/gameRegistry.ts` + `games/<ten>/{metadata,instructions}.ts`) — thêm game mới vào thư viện không phải sửa `GameLibrary`/`GameDetails`.
- Tái sử dụng nguyên vẹn API/hub hiện có: `GET /api/games/engines`, `GET /api/games`, `POST /api/games`, `joinRoom` qua SignalR — không thêm API mới.
- Verify sống qua Chrome (Docker Compose thật, không mock): tìm kiếm, bộ lọc, mở chi tiết game, tạo phòng Bang, vào lại phòng Vây Bắt cũ và chơi thật (board render đúng, không đổi hành vi ván đấu), nút back trình duyệt hoạt động đúng.
