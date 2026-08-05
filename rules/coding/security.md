# Coding: Security

> **File này thắng mọi rule khác khi xung đột** (xem Rule Priority trong [`../README.md`](../README.md)).

## Secret management

- ❌ **Không bao giờ commit secret**: mật khẩu DB thật, JWT key, access key MinIO/S3, API key, SMTP password. Áp dụng cho code, config, docker-compose (ngoài giá trị dev), và cả lịch sử git.
- Secret lấy từ **biến môi trường** (production) hoặc `.env` đã gitignore (local) — nạp qua `Services/DotEnv.cs` khi chạy `dotnet run` ngoài Docker. Commit file `.env.example` chứa tên biến, không chứa giá trị thật.
- Secret lỡ commit → coi như **đã lộ**: xoay (rotate) ngay, không chỉ xoá khỏi file.
- Không log secret, token, connection string đầy đủ (xem [`backend.md`](./backend.md)).
- Config placeholder trong `appsettings.json` là chuỗi rỗng `""`, không phải `null` — mọi validate config bắt buộc dùng `IsNullOrWhiteSpace`, không phải `?? throw` (bài học JWT secret rỗng — xem [`../history/decisions.md`](../history/decisions.md)). Secret bắt buộc thì validate **lúc boot** (fail-fast), không để lazy đến request đầu tiên.

## Validate mọi input từ client

- Client là **không đáng tin**: mọi `moveJson`, `playerName`, roomId từ client phải được validate server-side. UI chặn chỉ là trải nghiệm, không phải bảo mật.
- Deserialize JSON từ client luôn bọc try-catch, trả fail có message — không để exception propagate (rule trong `VayBatEngine.ApplyMove`).
- Luật chơi enforce ở engine server-side: đúng lượt, đúng quân của mình, nước đi hợp lệ — không tin client tự giác.
- Chống injection: truy vấn qua EF Core parameterized; **raw SQL trong bootstrap không được nối chuỗi từ input** — block `ExecuteSqlRaw` chỉ chứa SQL tĩnh.
- Output ra UI: React tự escape; ❌ không dùng `dangerouslySetInnerHTML` với dữ liệu người dùng (tên phòng, tên người chơi, chat).

## Authentication (hiện trạng: OTP qua email)

Đăng nhập không mật khẩu: nhập email → `POST /api/auth/request-otp` sinh mã 6 số (crypto random), lưu **hash SHA-256** trong bảng `AuthOtps` (không lưu OTP dạng plaintext), gửi qua SMTP (`SmtpOtpSender`, MailKit) → `POST /api/auth/verify-otp` kiểm tra, thành công thì set JWT vào cookie `HttpOnly; SameSite=Lax`.

- Rate limit request-otp: 60s giữa 2 lần, tối đa 5 lần/giờ/email. Mã mới vô hiệu mã cũ.
- Verify-otp: hết hạn 5 phút, tối đa 5 lần nhập sai, so sánh **fixed-time** (chống timing attack).
- JWT: secret từ `JWT_SECRET` (env, ưu tiên) hoặc `Jwt:Secret` (dev default) — validate ≥ 32 byte lúc boot, không lazy.
- Token **không** đưa vào `localStorage` (XSS đọc được) — chỉ cookie `HttpOnly`. `OnMessageReceived` của JwtBearer đọc token từ cookie; vẫn nhận Authorization header cho tool/test.
- Cookie `Secure` phải theo `Request.IsHttps`, không phải `!IsDevelopment()` — compose chạy `Production` trên `http://localhost` cần cookie hoạt động (bài học đã sửa).
- Định danh người chơi trong phòng dựa trên **user id ổn định** (từ email, unique trong bảng `Users`), không phải display name — display name được phép trùng. Đây là fix cho lớp bug cũ dựa vào `playerName` trong `localStorage` (xem [`../history/decisions.md`](../history/decisions.md)).
- Auth endpoint có rate limit chống brute-force (đã áp dụng ở trên). Message lỗi chung chung, không tiết lộ tài khoản tồn tại hay không. Log sự kiện đăng nhập thất bại/thành công, không log mật khẩu/OTP/token.

## Phân quyền (roles trong game)

Ba vai trò đối với một phòng chơi:

| Role | Quyền |
|---|---|
| **Player** (Red/White) | Đi quân khi đến lượt của mình, chat, rời phòng |
| **Spectator** (khán giả 👁) | Xem state, chat (nếu bật); ❌ không đi quân |
| **Chủ phòng** (người tạo) | Quyền player + đóng phòng/đặt cấu hình ván (nếu có) |

Vai trò xác định **theo phòng**, không toàn cục: một người là player ở phòng này, spectator ở phòng khác.

Nguyên tắc access control:

1. **Enforce ở server, trong hub/controller — trước khi gọi engine.** UI ẩn nút chỉ là trải nghiệm; client sửa được mọi thứ nó gửi lên.
2. Kiểm tra tối thiểu cho `MakeMove`: người gọi có ngồi ghế trong phòng này không (không phải spectator)? có đúng lượt của phe họ không? ván có đang ở trạng thái `Playing` không (không phải `Waiting`/`Finished`)?
3. **Từ chối phải có lý do rõ gửi về client** — "Bạn đang là khán giả", "Chưa đến lượt bạn", "Ván chưa bắt đầu". Từ chối im lặng là bug (bài học "không thể di chuyển quân").
4. Mặc định **deny**: trạng thái không khớp role nào → từ chối, không đoán.
5. Reconnect: người chơi quay lại (đúng user id) được ngồi lại ghế cũ; người lạ không bao giờ chiếm được ghế đang có chủ.
6. Role quản trị (khi thêm — vd xoá phòng bất kỳ, ban người chơi): định nghĩa ở tầng auth (claim trong token), kiểm tra bằng policy/`[Authorize(Roles=...)]` — không hard-code danh sách tên trong logic. Hành động quản trị phải được log kèm ai-làm-gì-lúc-nào.

## Encryption & transport

- Ngoài local: HTTPS/WSS bắt buộc cho API và SignalR.
- Dữ liệu nhạy cảm ở rest (nếu phát sinh): mã hoá bằng thư viện chuẩn (.NET Data Protection), không tự chế thuật toán.

## Bề mặt hạ tầng

- PostgreSQL, Redis, RabbitMQ, OpenSearch, MinIO **không expose ra internet** — chỉ backend truy cập được (network nội bộ của compose). Port mở ra host chỉ dành cho dev local.
- Đổi credential mặc định của RabbitMQ management, MinIO console, OpenSearch ở mọi môi trường ngoài local.
- CORS: chỉ allow origin frontend cụ thể (`WEB_BASE_URL` + localhost dev), không `*` khi bật credentials (bắt buộc cho SignalR + cookie).

## Security audit

- Review dependency định kỳ: `dotnet list package --vulnerable`, `npm audit` — vá lỗ hổng high/critical trước khi release.
- Thay đổi liên quan auth/permission/secret phải được review kỹ hơn bình thường.
- Nghi ngờ sự cố bảo mật: xoay secret trước, điều tra sau.
