# Coding: Testing

## Chiến lược theo tầng

| Tầng | Đối tượng | Công cụ |
|---|---|---|
| Unit | **Engine** (`IGameEngine` — luật chơi), helper (`GameJson`) | xUnit |
| Integration | Controller + Hub + DB thật (compose) | xUnit + `WebApplicationFactory`, Testcontainers/compose |
| E2E | 2 client thật chơi một ván qua trình duyệt | Playwright (Chromium) + 2 SignalR client |

Ưu tiên đầu tư theo thứ tự: **engine unit test** (rẻ, giá trị cao nhất — luật chơi là phần dễ sai nhất) → integration cho luồng `MakeMove` → E2E smoke.

## Unit test cho engine (bắt buộc với mỗi game)

Engine thuần logic (không DB/Redis/hub) nên test rất rẻ. Mỗi engine tối thiểu phải test:

- `NewGame()` trả `(mapJson, stateJson)` đúng shape, parse được.
- Nước đi hợp lệ → state mới đúng, `MoveOutcome(true)`.
- Nước đi sai luật (sai lượt, sai quân, ô không hợp lệ) → `MoveOutcome(false)` **kèm message**, state không đổi.
- **Input rác**: JSON sai cú pháp, thiếu field, `PieceId: null` → trả fail, ❌ không throw (rule đã có ở `VayBatEngine.ApplyMove`).
- Điều kiện kết thúc ván (thắng/thua/hoà).

## Integration test

- Chạy trên PostgreSQL thật (compose/Testcontainers), không InMemory provider — dự án dựa vào JSONB và raw SQL bootstrap, InMemory không kiểm chứng được.
- Case bắt buộc: bootstrap SQL chạy idempotent trên DB đã có data cũ (chính là lớp bug `ADD COLUMN IF NOT EXISTS`, xem [`database.md`](./database.md)).
- Redis/RabbitMQ tắt → `MakeMove` vẫn phải thành công và broadcast (kiểm chứng nguyên tắc "hạ tầng phụ không chặn luồng chính").

## E2E

- Kịch bản smoke chuẩn (đã dùng để verify bug "không thể di chuyển quân"): 2 client **tên khác nhau** → tạo/join phòng → `Status` chuyển `Playing` → client A đi một nước → client B nhận `GameStateUpdated` → UI cập nhật.
- Kịch bản regression: 2 tab trùng tên → tab hai phải thấy trạng thái rõ ràng (Waiting/khán giả), không im lặng.

## Quy tắc viết test

- Tên test mô tả hành vi: `ApplyMove_WrongTurn_ReturnsFailWithMessage`.
- Cấu trúc Arrange–Act–Assert; một test một hành vi.
- Test độc lập nhau, không phụ thuộc thứ tự chạy; tự dọn data mình tạo.
- Sửa bug → viết test tái hiện bug **trước khi** fix; test đó ở lại vĩnh viễn làm regression guard.
- Test phải chạy trong CI (xem [`../workflow/deployment.md`](../workflow/deployment.md)); test flaky phải sửa hoặc xoá, không để đỏ-xanh ngẫu nhiên.

## Linting & formatting

**Máy làm việc của máy** — không tranh luận style trong review; formatter quyết.

- Backend C#: `.editorconfig` ở root quy định style; `dotnet format` trước khi commit. Build không được sinh warning mới; hướng tới `TreatWarningsAsErrors` khi đã sạch.
- Frontend: ESLint (`@typescript-eslint`) + Prettier. `npm run lint` và `tsc --noEmit` phải sạch.
- ❌ Không tắt rule bằng `eslint-disable`/`#pragma warning disable` tràn lan — mỗi lần disable phải theo dòng cụ thể kèm lý do.
- Lint/format/type-check chạy trong CI, fail là chặn merge.

## Code review checklist

Người review (hoặc tự review trước khi mở PR) đối chiếu:

**Đúng đắn**
- [ ] Luật chơi/logic enforce ở server, không tin client (xem [`security.md`](./security.md))
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
- [ ] Có test cho hành vi mới / test tái hiện bug được fix
- [ ] Không còn code debug (`console.log`, `Console.WriteLine`), code chết, import thừa
- [ ] Không secret trong diff (xem [`security.md`](./security.md))
- [ ] Tài liệu liên quan (`CLAUDE.md`, `rules/`) cập nhật cùng PR

## Định nghĩa "xong" (Definition of Done)

Một thay đổi được coi là xong khi: build + lint + test xanh, đã tự chạy thử luồng ảnh hưởng (với bug realtime: đã test 2 client), tài liệu cập nhật, PR được review.
