# Rule: AI Development

> Quy tắc sử dụng AI trong phát triển: prompt engineering, AI code review, kiểm chứng code do AI sinh.

## Nguyên tắc nền

1. **Người commit chịu trách nhiệm về code, bất kể ai/cái gì viết ra.** "AI viết" không phải lý do miễn review.
2. AI-generated code đi qua **đúng quy trình như code người viết**: lint, test, review checklist (`rule-quality.md`), CI.
3. `CLAUDE.md` là context chính cho AI assistant — mỗi khi sửa bug đáng nhớ hoặc thêm quy ước, **cập nhật CLAUDE.md** để AI lần sau không lặp lại sai lầm (xem `rule-document.md`). Thư mục `rule/` bổ sung quy tắc chi tiết theo mảng.

## Prompt engineering

- Prompt kèm **ngữ cảnh cụ thể**: file liên quan, message lỗi nguyên văn, hành vi mong đợi — không mô tả mơ hồ "nó không chạy".
- Nêu rõ ràng buộc của dự án ngay trong yêu cầu khi liên quan: không dùng migration (raw SQL bootstrap), dữ liệu game-specific vào JSONB, Pointer Events cho SVG…
- Việc lớn tách thành bước nhỏ kiểm chứng được, thay vì một prompt "làm cả tính năng".
- ❌ Không đưa secret (connection string thật, token, API key) vào prompt/chat — AI service là bên thứ ba (xem `rule-security.md`).

## Kiểm chứng code AI sinh (bắt buộc)

- **Chạy thật, không tin mô tả.** Với bug realtime/multiplayer: verify bằng 2 client như đã làm với bug "không thể di chuyển quân" (2 SignalR client + Playwright).
- Soát kỹ những chỗ AI hay sai trong dự án này:
  - Schema: quên `ADD COLUMN IF NOT EXISTS`, quên `DEFAULT`, quên escape `{{}}` trong `ExecuteSqlRaw`.
  - Nuốt lỗi im lặng hoặc ngược lại — để lỗi hạ tầng phụ chặn luồng chính.
  - API "trông có vẻ đúng" nhưng không tồn tại (hallucination) — build + test bắt được.
  - Trùng lặp: AI viết lại helper đã có sẵn — kiểm tra trước khi nhận code mới.
- Code AI sinh mà người merge **không hiểu** thì không được merge — hỏi lại cho hiểu hoặc viết lại.

## AI code review

- Dùng AI review (vd `/code-review`) như **lớp bổ sung**, không thay thế người review với thay đổi về auth, permission, schema, tiền/điểm số.
- Finding của AI phải được kiểm chứng trước khi sửa theo — AI có thể báo sai (false positive).
- Không dùng AI để "review lấy lệ" cho đủ thủ tục.

## Ghi nhận

- PR có phần lớn code do AI sinh: ghi chú trong mô tả PR (minh bạch cho người review).
- Commit do AI tạo giữ trailer `Co-Authored-By` theo mặc định của tool.
