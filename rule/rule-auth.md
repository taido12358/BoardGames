# Rule: Authentication

> Quy tắc xác thực, authorization, token management, security.

## Hiện trạng & định hướng

Hiện tại người chơi định danh bằng `playerName` tự nhập (không mật khẩu). Hệ quả đã biết: `playerName` lưu `localStorage` → hai tab cùng trình duyệt trùng tên → backend coi tab hai là reconnect, ghế thứ hai không được lấp (bug "không thể di chuyển quân", xem CLAUDE.md). Khi thêm auth thật, các quy tắc dưới đây là bắt buộc.

## Xác thực

- Dùng chuẩn có sẵn: JWT bearer qua `Microsoft.AspNetCore.Authentication.JwtBearer` hoặc cookie auth của ASP.NET Core. ❌ Không tự chế scheme.
- Mật khẩu (nếu có tài khoản): hash bằng bcrypt/argon2 (`AspNetCore.Identity` mặc định) — không bao giờ lưu plaintext hay hash tự chế.
- Định danh người chơi trong phòng phải dựa trên **user id ổn định** từ token, không phải display name — display name được phép trùng.

## Token management

- Access token sống ngắn (≤ 1h) + refresh token sống dài, có thể thu hồi (lưu server-side, vd Redis).
- Secret ký JWT lấy từ biến môi trường, không hard-code, không commit (xem `rule-security.md`).
- Frontend: token để trong memory hoặc cookie `HttpOnly; Secure; SameSite` — tránh `localStorage` cho token (XSS đọc được).
- SignalR: truyền token qua `accessTokenFactory`; hub đọc user từ `Context.User`, không tin `playerName` client gửi lên.

## Authorization

- Phân quyền theo `rule-permission.md`: người chơi chỉ thao tác được ván mình ngồi; khán giả chỉ đọc.
- **Mọi kiểm tra quyền ở server.** UI ẩn nút chỉ là trải nghiệm, không phải bảo mật.
- Kiểm tra trong hub: user của connection có đúng là người cầm quân đến lượt không, trước khi gọi engine.

## Security

- Auth endpoint có rate limit chống brute-force.
- Message lỗi đăng nhập chung chung ("sai tên đăng nhập hoặc mật khẩu") — không tiết lộ tài khoản tồn tại hay không.
- Log sự kiện đăng nhập thất bại/thành công (không log mật khẩu, không log token).
- HTTPS bắt buộc ở môi trường ngoài local.
