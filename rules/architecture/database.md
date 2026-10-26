# Architecture: Database

## Nguyên tắc kiến trúc

- **PostgreSQL là nguồn sự thật duy nhất.** Redis chỉ là cache — chết thì hệ thống vẫn đúng, chỉ chậm hơn (xem [`infrastructure.md`](./infrastructure.md)).
- Bảng platform là **generic**: `GameRooms`, `GameMoves`, `GameRecords`, `Users`, `AuthOtps`. Dữ liệu riêng của từng game nằm trong cột **JSONB** (`MapJson`, `StateJson`, `MoveJson`) — không bao giờ thành cột riêng trong bảng generic.
- Lý do: `PieceId` và `MaxRedTurns` từng bị thêm trực tiếp vào `GameMoves`/`GameRooms` từ schema cũ, gây lỗi NOT NULL vì entity EF hiện tại không có property đó (dữ liệu đã chuyển vào JSONB nhưng cột cũ còn sót lại DB). Bài học đầy đủ: [`../history/decisions.md`](../history/decisions.md).

## Schema bootstrap — không dùng migration

Quyết định kiến trúc: dự án dùng **raw SQL** (`ExecuteSqlRaw` trong `Data/SchemaBootstrapper.cs`, `Program.cs` chỉ gọi `SchemaBootstrapper.ApplyAsync` lúc boot — tách ra 2026-09-11 để backend test/Testcontainers tái dùng đúng SQL thật) thay vì EF Migrations hoặc `EnsureCreated()`. `EnsureCreated()` từng gây `FormatException` khi Npgsql parse introspection query trên PostgreSQL 16 — quyết định này không đổi trừ khi vấn đề gốc được xác nhận đã hết trên phiên bản Npgsql/PostgreSQL mới.

Hệ quả cho mọi thay đổi schema: phải backward-compatible ngay khi code mới chạy trên DB cũ lúc khởi động (xem quy tắc thực thi ở [`../coding/database.md`](../coding/database.md) và quy trình deploy ở [`../workflow/deployment.md`](../workflow/deployment.md)).

## Quan hệ với các thành phần khác

### Snapshot replay công khai (2026-10-25)

`GameMoves.ReplayStateJson` là JSONB nullable, dùng chung cho các engine muốn lưu state sau
mỗi hành động. `IGameEngine.CreatePublicReplaySnapshot` mặc định trả null; Monopoly opt in
và loại thứ tự bộ bài trước khi lưu. Snapshot được ghi cùng transaction với intent/state phòng,
bao gồm bắt đầu ván, nước đi thường và timeout. Game khác không phải lưu thêm state.

Bootstrap thêm cột bằng `ADD COLUMN IF NOT EXISTS`, giữ các bản ghi cũ với giá trị null.
Test PostgreSQL riêng mô phỏng bảng cũ, nâng schema hai lần và xác nhận intent cũ còn nguyên.
Replay ván đã kết thúc ưu tiên dựng từ DB; MinIO tiếp tục lưu archive và phục vụ khi không còn
phòng tương ứng trong DB. Phòng chưa kết thúc không được trả replay qua endpoint.

```
PostgreSQL (nguồn sự thật, JSONB)
   ↕ cache
Redis (state ván đang chơi, TTL)
   → event
RabbitMQ (index/replay khi ván kết thúc)
   → OpenSearch (tìm kiếm lịch sử) / MinIO (lưu replay)
```
