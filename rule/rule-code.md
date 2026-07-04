# Rule: Coding Convention chung

> Quy tắc viết code chung, clean code, best practices cho cả backend C# và frontend TS/JS.

## Nguyên tắc chung

1. **Đọc được quan trọng hơn ngắn.** Code viết cho người đọc sau, không phải cho người viết.
2. **Một hàm làm một việc.** Hàm > ~40 dòng hoặc lồng > 3 cấp → cân nhắc tách.
3. **Đặt tên nói lên ý định.** `remainingTurns` thay vì `n`; `isSpectator` thay vì `flag`.
4. **Fail rõ ràng, không nuốt lỗi im lặng.** Đây là bài học đắt nhất của dự án (bug "không thể di chuyển quân"): mọi thao tác thất bại phải trả về lý do đến được người dùng hoặc log — không `catch {}` rỗng, không `console.error` xong bỏ qua.
5. **Không lặp code (DRY) nhưng đừng trừu tượng hoá sớm.** Lặp 2 lần chấp nhận được; lần thứ 3 mới tách.
6. **Không hard-code** magic number/string dùng ở nhiều nơi — đặt hằng số có tên.

## C# (backend)

- Tuân theo convention chuẩn .NET: PascalCase cho public member, camelCase + `_` prefix cho private field (`_channel`).
- Bật nullable reference types; không dùng `!` (null-forgiving) trừ khi có comment giải thích.
- `async` từ đầu đến cuối — không `.Result` / `.Wait()` (deadlock, chặn thread pool).
- Deserialize input từ ngoài (moveJson từ client) **luôn bọc try-catch**, trả kết quả fail có message thay vì để exception propagate qua SignalR hub (xem `VayBatEngine.ApplyMove`).
- Thao tác lên hạ tầng phụ (Redis cache, RabbitMQ, OpenSearch) không được làm fail luồng chính: bọc try-catch, log rồi đi tiếp. DB là nguồn sự thật duy nhất.
- Concurrency: dùng `Volatile.Read/Write` cho double-checked locking (xem `RabbitMqPublisher`), không tin từ khoá `volatile` cho pattern này.

## TypeScript/React (frontend)

- Xem chi tiết `rule-typescript.md`, `rule-javascript.md`, `rule-component.md`.
- Lỗi từ network/SignalR phải hiển thị lên UI (qua state như `setError`), không chỉ `console.error`.

## Comment

- Comment giải thích **tại sao**, không giải thích **cái gì** (code đã nói cái gì). Chi tiết: `rule-comment.md`.

## Review bản thân trước khi commit

- Build sạch, không warning mới.
- Không còn `console.log` / `Console.WriteLine` debug.
- Không còn code chết, import thừa.
