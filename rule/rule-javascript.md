# Rule: JavaScript

> Quy tắc viết JavaScript: chuẩn ES, async/await, error handling.

> Dự án ưu tiên TypeScript (xem `rule-typescript.md`). File JS thuần chỉ chấp nhận ở config/script; các quy tắc dưới đây áp dụng cho cả phần JS trong TS.

## Chuẩn ES

- Dùng ES modules (`import`/`export`), không CommonJS trong source frontend.
- `const` mặc định, `let` khi cần gán lại, không `var`.
- Dùng cú pháp hiện đại: destructuring, spread, optional chaining `?.`, nullish coalescing `??` — nhưng không lạm dụng chain dài khó đọc.
- So sánh bằng `===` / `!==`, không `==`.

## Async/await

- Dùng `async/await` thay cho `.then()` chain.
- **Mọi promise phải được await hoặc xử lý** — promise trôi nổi (floating promise) là bug tiềm ẩn, đặc biệt với `connection.invoke(...)` của SignalR.
- Chạy song song các việc độc lập: `await Promise.all([...])`, không await tuần tự vô ích.
- Không `async` trong `useEffect` callback trực tiếp — khai báo hàm async bên trong rồi gọi.

## Error handling

- `try/catch` tại nơi **có thể làm gì đó** với lỗi: hiển thị lên UI, retry, hoặc chuyển trạng thái. Không catch chỉ để log rồi nuốt.
- Lỗi network/SignalR **phải đến được người dùng** qua UI state (`setError`), không dừng ở `console.error` — bài học từ bug "không thể di chuyển quân" (xem CLAUDE.md).
- Rethrow giữ nguyên lỗi gốc (`throw err` hoặc `new Error(msg, { cause: err })`), không nuốt stack.
- Với thao tác cache/phụ trợ, lỗi không được chặn luồng chính.

## Khác

- Không mutate tham số đầu vào và state trực tiếp (React yêu cầu immutable update).
- Không dùng `eval`, `new Function`, `with`.
- Xử lý JSON từ ngoài: `JSON.parse` luôn trong try/catch hoặc qua helper chung.
