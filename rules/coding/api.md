# Coding: API (REST + SignalR)

## Kiến trúc hai kênh

- **REST (`GamesController`)**: thao tác lobby — tạo phòng, liệt kê phòng, join. Base path: `/api/games`.
- **SignalR (`GameHub`)**: mọi thứ realtime trong ván — đi quân, cập nhật state, chat. Không dùng REST polling cho state trong ván.

Quy tắc chọn kênh: dữ liệu cần push cho nhiều client ngay lập tức → SignalR; thao tác request/response một lần → REST.

## REST conventions

- URL: danh từ số nhiều, kebab-case, không động từ: `GET /api/games/rooms`, `POST /api/games/rooms`.
- HTTP method đúng ngữ nghĩa: `GET` không side-effect, `POST` tạo, `PUT/PATCH` sửa, `DELETE` xoá.
- Status code chuẩn:

| Code | Dùng khi |
|---|---|
| 200/201 | Thành công / tạo mới thành công |
| 400 | Input sai (validation) |
| 401/403 | Chưa đăng nhập / không có quyền |
| 404 | Không tìm thấy phòng/resource |
| 409 | Xung đột trạng thái (phòng đã đầy, ván đã kết thúc) |
| 500 | Lỗi server — không lộ chi tiết nội bộ |

## Response format

- DTO tách khỏi entity: trả `RoomDto`, không trả thẳng entity EF (`GameRoom`) — tránh lộ field nội bộ và vòng tham chiếu.
- JSON camelCase (mặc định ASP.NET Core).
- Lỗi trả body thống nhất: `{ "error": "<message người dùng đọc được>" }` — message rõ nguyên nhân, không nuốt lỗi thành 200.

## SignalR (GameHub)

- Tên method hub PascalCase, mô tả hành động: `MakeMove`, `JoinRoom`.
- Tên event broadcast PascalCase, mô tả sự kiện: `GameStateUpdated`.
- **Mọi invoke thất bại phải trả về lý do cho client gọi** — không im lặng. Exception trong engine phải được bắt và chuyển thành kết quả fail có message (xem [`backend.md`](./backend.md)).
- Lỗi hạ tầng phụ (Redis, RabbitMQ) **không được chặn broadcast** — DB ghi xong là phải broadcast.
- Payload state gửi qua hub là JSON đã serialize theo shape của game (`GameJson` helpers).
- **`GameStateUpdated` gửi RIÊNG theo từng connection**, không phải một bản chung cho cả nhóm — mỗi người nhận state đã qua `engine.RedactStateForViewer(side)` theo đúng ghế của họ (khán giả = `side: null`). Game không có thông tin ẩn (VayBat) không cần làm gì, mặc định trả nguyên state. Xem [`backend.md`](../architecture/backend.md) mục "Thông tin ẩn".
- Ghế > 2 người dùng side `"P0".."P{N-1}"` thay vì `"RED"`/`"WHITE"`. Nước đi hệ thống `side: "SYSTEM"` chỉ hub mới được gửi (dùng để báo engine chia state ban đầu khi phòng vừa đủ ghế) — client không bao giờ tự gửi side này.

## Versioning & tương thích

- Thêm field mới vào DTO: được (client cũ bỏ qua). Đổi tên/xoá field hoặc đổi ngữ nghĩa: coi là breaking — phải cập nhật đồng bộ frontend trong cùng PR.

## Authentication

- Đăng nhập bằng OTP qua email (JWT trong cookie HttpOnly) — chi tiết trong `CLAUDE.md` mục "Đăng nhập". `AuthController` (`Platform/Auth/`) xử lý `request-otp`/`verify-otp`/`me`/`display-name`/`logout`.
- Quy tắc auth/permission chi tiết: [`security.md`](./security.md).
