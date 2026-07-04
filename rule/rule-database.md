# Rule: Database

> Quy tắc thiết kế database: naming, schema bootstrap (không migration), indexing, query optimization.

## Nguyên tắc kiến trúc

- PostgreSQL là **nguồn sự thật duy nhất**. Redis chỉ là cache (xem `rule-cache.md`).
- Bảng platform là **generic**: `GameRooms`, `GameMoves`. Dữ liệu riêng của từng game nằm trong cột **JSONB** (`MapJson`, `StateJson`, `MoveJson`).
- ❌ **Cấm thêm cột game-specific vào bảng generic** (`PieceId`, `MaxRedTurns`… đã từng gây lỗi NOT NULL — xem CLAUDE.md). Dữ liệu như vậy thuộc về JSONB.

## Schema bootstrap — KHÔNG dùng migrations

Dự án dùng **raw SQL duy nhất** trong block `ExecuteSqlRaw` ở `Program.cs`. Không dùng EF Migrations, không dùng `EnsureCreated()` (đã xoá vì gây `FormatException` với PostgreSQL 16).

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

## Indexing

- Thêm index cho cột dùng trong WHERE/JOIN thường xuyên (`RoomId` trên `GameMoves`, `Status`/`GameKey` trên `GameRooms`).
- Index cũng khai báo idempotent: `CREATE INDEX IF NOT EXISTS ...` trong block bootstrap.
- Query vào trong JSONB lặp lại nhiều → cân nhắc index GIN, nhưng chỉ khi đo thấy chậm.

## Query optimization

- Không load cả bảng rồi lọc trong C# — lọc/sort/limit ở SQL (`Where`, `OrderBy`, `Take` trước `ToListAsync`).
- Query chỉ đọc → `AsNoTracking()`.
- Tránh N+1: dùng `Include` hoặc projection sang DTO.
- Đo trước khi tối ưu: bật log EF hoặc `EXPLAIN ANALYZE`, không đoán.
