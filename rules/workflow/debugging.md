# Workflow: Debugging

## Quy trình

```
Reproduce
    ↓
Collect evidence (log nguyên văn, không diễn giải lại)
    ↓
Inspect logs (docker compose logs -f api; console browser cho SignalR)
    ↓
Identify root cause (không phải triệu chứng bề mặt)
    ↓
Fix root cause
    ↓
Test (với bug realtime/multiplayer: verify bằng ≥2 client thật, không chỉ 1 client + suy luận)
    ↓
Verify regression (viết test tái hiện bug, để lại vĩnh viễn)
    ↓
Document (thêm vào catalog dưới đây nếu bug tốn > 1 buổi để chẩn đoán)
```

Không patch triệu chứng khi chưa xác định được nguyên nhân gốc. Nếu vấn đề lặp lại, ghi vào rule liên quan hoặc `history/decisions.md`, không chỉ sửa rồi quên.

## Catalog lỗi đã gặp (tra cứu theo message lỗi)

### `FormatException: Input string was not in a correct format` khi khởi động

**Nguyên nhân:** `db.Database.EnsureCreated()` chạy introspection query phức tạp (~960 ký tự) mà Npgsql không parse được response của PostgreSQL 16.

**Fix:** Xoá hoàn toàn `EnsureCreated()`, thay bằng raw SQL `CREATE TABLE IF NOT EXISTS` cho tất cả bảng. Toàn bộ schema do một block `ExecuteSqlRaw` duy nhất quản lý (xem [`../architecture/database.md`](../architecture/database.md)).

### `column g.GameKey does not exist`

**Nguyên nhân:** `GameRooms` table tạo trước khi cột `GameKey` được thêm vào model. `CREATE TABLE IF NOT EXISTS` bỏ qua nếu bảng đã tồn tại nên cột không bao giờ được thêm.

**Fix:** `ALTER TABLE "GameRooms" ADD COLUMN IF NOT EXISTS "GameKey" text NOT NULL DEFAULT '';`

### `column "MoveJson" of relation "GameMoves" does not exist`

**Nguyên nhân:** Bảng `GameMoves` tạo từ schema cũ thiếu cột `MoveJson`/`Side`/`MoveNumber`.

**Fix:**
```sql
ALTER TABLE "GameMoves" ADD COLUMN IF NOT EXISTS "MoveJson" jsonb NOT NULL DEFAULT '{{}}'::jsonb;
ALTER TABLE "GameMoves" ADD COLUMN IF NOT EXISTS "Side" text NOT NULL DEFAULT '';
ALTER TABLE "GameMoves" ADD COLUMN IF NOT EXISTS "MoveNumber" integer NOT NULL DEFAULT 0;
```

**Nguyên tắc chung:** Luôn kèm `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` vào block bootstrap khi thêm cột mới, để idempotent với DB cũ.

### `null value in column "PieceId" of relation "GameMoves" violates not-null constraint`

**Nguyên nhân:** Cột `PieceId` bị thêm trực tiếp vào bảng `GameMoves` trong DB từ schema cũ. Entity `GameMove` không có property này (dữ liệu nằm trong `MoveJson` JSONB), nên EF Core không đưa nó vào INSERT — PostgreSQL báo lỗi NOT NULL.

**Fix:** `ALTER TABLE "GameMoves" DROP COLUMN IF EXISTS "PieceId";`

**Nguyên tắc:** Dữ liệu game-specific (như `PieceId`) thuộc về `MoveJson` JSONB, không được thêm thành cột riêng trong `GameMoves`.

### `null value in column "MaxRedTurns" violates not-null constraint`

Cùng lớp bug với `PieceId` ở trên nhưng trên bảng `GameRooms`. **Fix:** `ALTER TABLE "GameRooms" DROP COLUMN IF EXISTS "MaxRedTurns";`

### `IDX10703: Cannot create a SymmetricSecurityKey, key length is zero`

**Nguyên nhân:** `appsettings.json` chứa `"Jwt": { "Secret": "" }` làm placeholder. `config["Jwt:Secret"]` trả về `""` (không phải `null`) nên guard `?? throw` không bắt được; trong Docker (`ASPNETCORE_ENVIRONMENT=Production`) không load `appsettings.Development.json` (nơi có dev secret) → tạo key rỗng, nổ ở request đầu tiên.

**Fix (3 phần):**
1. `TokenService`: validate bằng `string.IsNullOrWhiteSpace` + kiểm tra ≥ 32 byte, message chỉ rõ cách đặt `Jwt__Secret`.
2. `Program.cs`: khởi tạo `TokenService` ngay lúc boot (không lazy qua DI) → config sai là app chết ngay khi start với message rõ, không đợi request.
3. `docker-compose.yml`: backend nhận `Jwt__Secret`, `Auth__DevLogOtp`, `Gmail__User/AppPassword` (rồi `SMTP_*`) từ `.env`.

**Bug cùng cụm đã sửa kèm:** cookie auth từng đặt `Secure = !IsDevelopment()` → compose (Production, http://localhost) browser sẽ từ chối cookie → đăng nhập hỏng im lặng. Đổi thành `Secure = Request.IsHttps`.

**Nguyên tắc chung:** Config placeholder trong appsettings là chuỗi rỗng, không phải null — mọi validate config bắt buộc dùng `IsNullOrWhiteSpace`, và secret bắt buộc thì validate lúc boot (fail-fast), không để lazy đến request đầu.

### "Không thể di chuyển quân" dù đã vào ván

**Chẩn đoán (đã verify end-to-end bằng 2 client SignalR + Chromium/Playwright):** logic đi quân (tap-tap & kéo-thả) hoạt động đúng. Triệu chứng xảy ra khi ván **chưa thực sự bắt đầu** (`Status` kẹt `Waiting`) hoặc người chơi là khán giả — UI cũ im lặng nuốt click, không báo gì.

**Nguyên nhân gốc thường gặp (trước khi có đăng nhập email):** `playerName` lưu trong `localStorage` → **mọi tab cùng trình duyệt dùng chung tên**. Tab thứ hai vào phòng bị backend coi là reconnect của người chơi cũ (`room.RedPlayer == playerName` → seated RED lần nữa), ghế Trắng không bao giờ được lấp, `Status` mãi `Waiting`, `myTurn` luôn false.

**Các fix đã áp dụng:**
- `GameHub.MakeMove` / `GamesController`: bọc mọi thao tác Redis trong try-catch — Redis chỉ là cache, lỗi Redis không được chặn broadcast `GameStateUpdated`.
- `useGameRoomHub`: lỗi `invoke` (mất kết nối SignalR) hiện lên UI qua `setError` thay vì chỉ `console.error`.
- `VayBatBoard`: hiển thị rõ trạng thái khi không đi được — "⏳ Chờ đối thủ đi…", "👁 đang xem", banner Waiting.
- Về sau: đăng nhập bằng email/OTP thay `playerName` tự nhập → hết lớp bug trùng tên ngẫu nhiên (nhưng hai tab cùng trình duyệt vẫn chung phiên — vẫn cần 2 trình duyệt/profile để test 2 người, xem [`development.md`](./development.md)).

### `FormatException: Expected an ASCII digit` trên SQL có `'{}'::jsonb`

**Nguyên nhân:** EF Core's `ExecuteSqlRaw` parse `{N}` trong SQL string làm parameter placeholder. `'{}'::jsonb` chứa `{}` (brace rỗng) khiến EF Core throw client-side, trước khi gửi SQL lên DB.

**Fix:** Dùng `'{{}}'::jsonb` trong tất cả raw SQL string truyền vào `ExecuteSqlRaw`. EF Core dùng `{{`/`}}` làm escape sequence cho literal `{`/`}`.

**Nguyên tắc:** Mọi SQL có `{}` (jsonb empty object literal) truyền vào `ExecuteSqlRaw` phải viết là `{{}}`.

## Ghi lại bug mới (bắt buộc khi tốn > 1 buổi để chẩn đoán)

Format: **Triệu chứng** (message lỗi nguyên văn để search được) → **Nguyên nhân gốc** → **Fix** (kèm code/SQL cụ thể) → **Nguyên tắc rút ra**. Thêm vào cuối catalog trên trong file này (không phải `CLAUDE.md` — `CLAUDE.md` chỉ điều hướng).
