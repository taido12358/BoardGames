# Rule: Quality

> Quy tắc kiểm tra chất lượng: linting, formatting, code review checklist.

## Linting & formatting

**Máy làm việc của máy** — không tranh luận style trong review; formatter quyết.

- Backend C#: `.editorconfig` ở root quy định style; `dotnet format` trước khi commit. Build không được sinh warning mới; hướng tới `TreatWarningsAsErrors` khi đã sạch.
- Frontend: ESLint (`@typescript-eslint`) + Prettier. `npm run lint` và `tsc --noEmit` phải sạch.
- ❌ Không tắt rule bằng `eslint-disable`/`#pragma warning disable` tràn lan — mỗi lần disable phải theo dòng cụ thể kèm lý do.
- Lint/format/type-check chạy trong CI, fail là chặn merge (xem `rule-deploy.md`).

## Code review checklist

Người review (hoặc tự review trước khi mở PR) đối chiếu:

**Đúng đắn**
- [ ] Luật chơi/logic enforce ở server, không tin client (xem `rule-permission.md`)
- [ ] Mọi đường lỗi trả message rõ ràng đến người dùng — không nuốt im lặng
- [ ] Lỗi Redis/RabbitMQ/OpenSearch không chặn luồng chính (try-catch + log Warning)
- [ ] Deserialize input từ client có bọc try-catch
- [ ] Async đúng: không `.Result`/`.Wait()`, không floating promise

**Schema/DB** (nếu PR đổi schema)
- [ ] Có `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (không chỉ CREATE TABLE)
- [ ] Cột NOT NULL mới có `DEFAULT`
- [ ] Không thêm cột game-specific vào bảng generic (thuộc về JSONB)
- [ ] `{}` trong SQL raw escape thành `{{}}`

**Frontend**
- [ ] Ba state loading/empty/error đều được render
- [ ] Lỗi network/SignalR hiện lên UI, không chỉ console
- [ ] Không mutate state trực tiếp

**Chung**
- [ ] Có test cho hành vi mới / test tái hiện bug được fix (xem `rule-testing.md`)
- [ ] Không còn code debug (`console.log`, `Console.WriteLine`), code chết, import thừa
- [ ] Không secret trong diff (xem `rule-security.md`)
- [ ] Tài liệu liên quan (CLAUDE.md, rule, README) cập nhật cùng PR

## Định nghĩa "xong" (Definition of Done)

Một thay đổi được coi là xong khi: build + lint + test xanh, đã tự chạy thử luồng ảnh hưởng (với bug realtime: đã test 2 client), tài liệu cập nhật, PR được review.
