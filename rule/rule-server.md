# Rule: Server (Backend)

> Quy tắc xây dựng server: service layer, controller layer, middleware.

## Phân tầng

```
Controller / Hub  →  Engine (IGameEngine) + Services  →  DbContext / hạ tầng
```

- **Controller (`GamesController`)**: nhận request lobby, validate input, gọi xuống, map sang DTO. Không chứa luật chơi.
- **Hub (`GameHub`)**: nhận invoke realtime, xác định phòng/người chơi, gọi engine, persist, broadcast. Không chứa luật chơi.
- **Engine (`IGameEngine`)**: toàn bộ luật của một game — validate nước đi, tính state mới. Engine **thuần logic**: không chạm DB, Redis, hub; nhận JSON vào, trả JSON + outcome ra.
- **Services** (`RedisCacheService`, `RabbitMqPublisher`, `OpenSearchService`, `MinioStorageService`): hạ tầng thuần, không business logic.

## Quy tắc xử lý trong Hub/Controller

1. **DB là nguồn sự thật.** Thứ tự trong `MakeMove`: validate bằng engine → ghi DB → (cố gắng) cache Redis → broadcast `GameStateUpdated` → (cố gắng) publish RabbitMQ.
2. **Hạ tầng phụ không được chặn luồng chính.** Mọi thao tác Redis/RabbitMQ/OpenSearch bọc try-catch, log rồi đi tiếp — lỗi Redis không được chặn broadcast (bug đã sửa, xem CLAUDE.md).
3. **Không để exception thô propagate qua hub.** Engine bọc deserialization trong try-catch, trả `MoveOutcome(false, lý_do)`; hub chuyển lý do đó về client.
4. Mọi đường thất bại đều trả **message rõ ràng** về client — không nuốt im lặng.

## DI & lifetime

- Đăng ký service trong `Program.cs`. Engine đăng ký `AddSingleton<IGameEngine, ...>` → **engine phải stateless** (không giữ state ván trong field).
- Singleton giữ connection (RabbitMQ) phải thread-safe: DCLP với `Volatile.Read/Write`, không bật `AutomaticRecoveryEnabled` cùng lúc với reconnect thủ công (xem CLAUDE.md).
- `DbContext` là scoped — không inject vào singleton trực tiếp; cần thì dùng `IServiceScopeFactory`.

## Middleware & Program.cs

- Thứ tự pipeline chuẩn: exception handling → CORS → routing → auth (khi có) → endpoint/hub.
- CORS mở cho origin frontend (`http://localhost:5173`) và bật credentials cho SignalR.
- Schema bootstrap bằng raw SQL trong `Program.cs` theo `rule-database.md` — không thêm `EnsureCreated()`/migration.

## Async

- Toàn bộ I/O là `async/await`; không `.Result`/`.Wait()`.
- Method hub trả `Task`, không `async void`.
