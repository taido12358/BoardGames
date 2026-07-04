# Rule: Testing

> Quy tắc testing: unit test, integration test, E2E test.

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
- Case bắt buộc: bootstrap SQL chạy idempotent trên DB đã có data cũ (chính là lớp bug `ADD COLUMN IF NOT EXISTS` trong CLAUDE.md).
- Redis/RabbitMQ tắt → `MakeMove` vẫn phải thành công và broadcast (kiểm chứng nguyên tắc "hạ tầng phụ không chặn luồng chính").

## E2E

- Kịch bản smoke chuẩn (đã dùng để verify bug "không thể di chuyển quân"): 2 client **tên khác nhau** → tạo/join phòng → `Status` chuyển `Playing` → client A đi một nước → client B nhận `GameStateUpdated` → UI cập nhật.
- Kịch bản regression: 2 tab trùng tên → tab hai phải thấy trạng thái rõ ràng (Waiting/khán giả), không im lặng.

## Quy tắc viết test

- Tên test mô tả hành vi: `ApplyMove_WrongTurn_ReturnsFailWithMessage`.
- Cấu trúc Arrange–Act–Assert; một test một hành vi.
- Test độc lập nhau, không phụ thuộc thứ tự chạy; tự dọn data mình tạo.
- Sửa bug → viết test tái hiện bug **trước khi** fix; test đó ở lại vĩnh viễn làm regression guard.
- Test phải chạy trong CI (xem `rule-deploy.md`); test flaky phải sửa hoặc xoá, không để đỏ-xanh ngẫu nhiên.
