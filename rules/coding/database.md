# Coding: Database

> Nguyên tắc kiến trúc (PostgreSQL là nguồn sự thật, JSONB cho dữ liệu game-specific): [`../architecture/database.md`](../architecture/database.md). File này là quy tắc thực thi khi viết SQL/schema.

## Schema bootstrap — KHÔNG dùng migrations

Dự án dùng **raw SQL duy nhất** trong block `ExecuteSqlRaw` ở `Program.cs`. Không dùng EF Migrations, không dùng `EnsureCreated()` (đã xoá vì gây `FormatException` với PostgreSQL 16 — xem [`../history/decisions.md`](../history/decisions.md)).

**Quy tắc khi đổi schema:**

1. Bảng mới → `CREATE TABLE IF NOT EXISTS`.
2. Cột mới trên bảng đã có → **bắt buộc** thêm cả `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (vì `CREATE TABLE IF NOT EXISTS` bỏ qua bảng đã tồn tại).
3. Cột NOT NULL mới → **luôn kèm `DEFAULT`** để chạy được trên bảng đã có data.
4. Cột thừa từ schema cũ không còn trong entity → `DROP COLUMN IF EXISTS`.
5. Mọi câu lệnh phải **idempotent** — chạy lại nhiều lần không lỗi.
6. SQL chứa `{}` (vd `'{}'::jsonb`) truyền vào `ExecuteSqlRaw` phải escape thành `'{{}}'::jsonb` — EF Core parse `{N}` làm placeholder.

```sql
ALTER TABLE "GameMoves" ADD COLUMN IF NOT EXISTS "MoveJson" jsonb NOT NULL DEFAULT '{{}}'::jsonb;
```

## Naming convention

- Bảng: PascalCase số nhiều theo entity EF: `GameRooms`, `GameMoves` (quoted identifier).
- Cột: PascalCase trùng property C#: `GameKey`, `StateJson`.
- Cột JSONB đặt suffix `Json`: `MapJson`, `MoveJson`.

## Ghế generic cho game > 2 người

`GameRooms.SeatCount` (int) + `GameRooms.SeatsJson` (jsonb, mảng tên theo ghế) là cột
**generic của Platform** (không phải riêng của Bang) — dùng song song với `RedPlayer`/
`WhitePlayer` cũ, kích hoạt theo `engine.MaxPlayers > 2`. Đây KHÔNG vi phạm nguyên tắc
"không cột game-specific": số ghế và ai ngồi ghế nào là khái niệm của Platform (áp dụng
cho mọi game > 2 người), không phải luật riêng của một game. Chi tiết: [`../architecture/backend.md`](../architecture/backend.md).

## Indexing

- Thêm index cho cột dùng trong WHERE/JOIN thường xuyên (`RoomId` trên `GameMoves`, `Status`/`GameKey` trên `GameRooms`).
- Index cũng khai báo idempotent: `CREATE INDEX IF NOT EXISTS ...` trong block bootstrap.
- Query vào trong JSONB lặp lại nhiều → cân nhắc index GIN, nhưng chỉ khi đo thấy chậm.

## Query optimization

- Không load cả bảng rồi lọc trong C# — lọc/sort/limit ở SQL (`Where`, `OrderBy`, `Take` trước `ToListAsync`).
- Query chỉ đọc → `AsNoTracking()`.
- Tránh N+1: dùng `Include` hoặc projection sang DTO.
- Đo trước khi tối ưu: bật log EF hoặc `EXPLAIN ANALYZE`, không đoán.

## Cấm

- ❌ **Cấm thêm cột game-specific vào bảng generic** (`GameRooms`, `GameMoves`) — `PieceId`, `MaxRedTurns`… đã từng gây lỗi NOT NULL vì EF không biết property đó. Dữ liệu như vậy thuộc về JSONB (`MapJson`/`StateJson`/`MoveJson`).
