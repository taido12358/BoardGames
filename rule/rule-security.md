# Rule: Security

> Quy tắc bảo mật: secret management, encryption, security audit. **File này thắng mọi rule khác khi xung đột** (xem Rule Priority trong `rules.md`).

## Secret management

- ❌ **Không bao giờ commit secret**: mật khẩu DB thật, JWT key, access key MinIO/S3, API key. Áp dụng cho code, config, docker-compose (ngoài giá trị dev), và cả lịch sử git.
- Secret lấy từ **biến môi trường** (production) hoặc user-secrets/`.env` đã gitignore (local). Commit file `.env.example` chứa tên biến, không chứa giá trị.
- Secret lỡ commit → coi như **đã lộ**: xoay (rotate) ngay, không chỉ xoá khỏi file.
- Không log secret, token, connection string đầy đủ (xem `rule-monitoring.md`).

## Validate mọi input từ client

- Client là **không đáng tin**: mọi `moveJson`, `playerName`, roomId từ client phải được validate server-side. UI chặn chỉ là trải nghiệm, không phải bảo mật.
- Deserialize JSON từ client luôn bọc try-catch, trả fail có message — không để exception propagate (đã là rule trong `VayBatEngine.ApplyMove`).
- Luật chơi enforce ở engine server-side: đúng lượt, đúng quân của mình, nước đi hợp lệ — không tin client tự giác.
- Chống injection: truy vấn qua EF Core parameterized; **raw SQL trong bootstrap không được nối chuỗi từ input** — block `ExecuteSqlRaw` chỉ chứa SQL tĩnh.
- Output ra UI: React tự escape; ❌ không dùng `dangerouslySetInnerHTML` với dữ liệu người dùng (tên phòng, tên người chơi, chat).

## Encryption & transport

- Ngoài local: HTTPS/WSS bắt buộc cho API và SignalR.
- Mật khẩu (khi có tài khoản): hash bcrypt/argon2, không lưu plaintext (xem `rule-auth.md`).
- Dữ liệu nhạy cảm ở rest (nếu phát sinh): mã hoá bằng thư viện chuẩn (.NET Data Protection), không tự chế thuật toán.

## Bề mặt hạ tầng

- PostgreSQL, Redis, RabbitMQ, OpenSearch, MinIO **không expose ra internet** — chỉ backend truy cập được (network nội bộ của compose). Port mở ra host chỉ dành cho dev local.
- Đổi credential mặc định của RabbitMQ management, MinIO console, OpenSearch ở mọi môi trường ngoài local.
- CORS: chỉ allow origin frontend cụ thể, không `*` khi bật credentials.

## Security audit

- Review dependency định kỳ: `dotnet list package --vulnerable`, `npm audit` — vá lỗ hổng high/critical trước khi release.
- Thay đổi liên quan auth/permission/secret phải được review kỹ hơn bình thường (xem `rule-quality.md`).
- Nghi ngờ sự cố bảo mật: xoay secret trước, điều tra sau.
