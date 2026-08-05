# Architecture: Database

## Nguyên tắc kiến trúc

- **PostgreSQL là nguồn sự thật duy nhất.** Redis chỉ là cache — chết thì hệ thống vẫn đúng, chỉ chậm hơn (xem [`infrastructure.md`](./infrastructure.md)).
- Bảng platform là **generic**: `GameRooms`, `GameMoves`, `GameRecords`, `Users`, `AuthOtps`. Dữ liệu riêng của từng game nằm trong cột **JSONB** (`MapJson`, `StateJson`, `MoveJson`) — không bao giờ thành cột riêng trong bảng generic.
- Lý do: `PieceId` và `MaxRedTurns` từng bị thêm trực tiếp vào `GameMoves`/`GameRooms` từ schema cũ, gây lỗi NOT NULL vì entity EF hiện tại không có property đó (dữ liệu đã chuyển vào JSONB nhưng cột cũ còn sót lại DB). Bài học đầy đủ: [`../history/decisions.md`](../history/decisions.md).

## Schema bootstrap — không dùng migration

Quyết định kiến trúc: dự án dùng **raw SQL** (`ExecuteSqlRaw` trong `Program.cs`) thay vì EF Migrations hoặc `EnsureCreated()`. `EnsureCreated()` từng gây `FormatException` khi Npgsql parse introspection query trên PostgreSQL 16 — quyết định này không đổi trừ khi vấn đề gốc được xác nhận đã hết trên phiên bản Npgsql/PostgreSQL mới.

Hệ quả cho mọi thay đổi schema: phải backward-compatible ngay khi code mới chạy trên DB cũ lúc khởi động (xem quy tắc thực thi ở [`../coding/database.md`](../coding/database.md) và quy trình deploy ở [`../workflow/deployment.md`](../workflow/deployment.md)).

## Quan hệ với các thành phần khác

```
PostgreSQL (nguồn sự thật, JSONB)
   ↕ cache
Redis (state ván đang chơi, TTL)
   → event
RabbitMQ (index/replay khi ván kết thúc)
   → OpenSearch (tìm kiếm lịch sử) / MinIO (lưu replay)
```
