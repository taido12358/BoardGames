# Coding: Backend (C# / ASP.NET Core)

> Xem thêm nguyên tắc chung: [`general.md`](./general.md). Kiến trúc phân tầng (Controller/Hub → Engine → Services → DB): [`../architecture/backend.md`](../architecture/backend.md).

## Convention

- Tuân theo convention chuẩn .NET: PascalCase cho public member, camelCase + `_` prefix cho private field (`_channel`).
- Bật nullable reference types; không dùng `!` (null-forgiving) trừ khi có comment giải thích.
- `async` từ đầu đến cuối — không `.Result` / `.Wait()` (deadlock, chặn thread pool). Method hub trả `Task`, không `async void`.
- Deserialize input từ ngoài (`moveJson` từ client) **luôn bọc try-catch**, trả kết quả fail có message thay vì để exception propagate qua SignalR hub (xem `VayBatEngine.ApplyMove`).
- Thao tác lên hạ tầng phụ (Redis cache, RabbitMQ, OpenSearch) không được làm fail luồng chính: bọc try-catch, log rồi đi tiếp. DB là nguồn sự thật duy nhất.

## Concurrency

- Dùng `Volatile.Read/Write` cho double-checked locking (xem `RabbitMqPublisher`), không tin từ khoá `volatile` cho pattern này — tránh torn read trên ARM (Apple Silicon / AWS Graviton).
- ❌ Không bật `AutomaticRecoveryEnabled = true` cùng với `GetChannel()` reconnect thủ công — hai cơ chế tranh nhau dispose/recreate connection → `ObjectDisposedException`. Hiện tại dự án dùng reconnect thủ công, `AutomaticRecoveryEnabled = false`.

## DI & lifetime

- Đăng ký service trong `Program.cs`. Engine đăng ký `AddSingleton<IGameEngine, ...>` → **engine phải stateless** (không giữ state ván trong field).
- Singleton giữ connection (RabbitMQ) phải thread-safe: DCLP với `Volatile.Read/Write` như trên.
- `DbContext` là scoped — không inject vào singleton trực tiếp; cần thì dùng `IServiceScopeFactory`.

## Logging

- Dùng `ILogger<T>` qua DI — ❌ không `Console.WriteLine` trong code production.
- **Structured logging**: truyền tham số theo template, không nối chuỗi:
  ```csharp
  _logger.LogWarning("Redis cache failed for room {RoomId}, continuing", roomId);
  ```
- Mức log đúng ngữ nghĩa:

  | Level | Dùng cho |
  |---|---|
  | `Debug` | Chi tiết chẩn đoán, tắt ở production |
  | `Information` | Sự kiện nghiệp vụ: phòng tạo, ván bắt đầu/kết thúc |
  | `Warning` | Hạ tầng phụ fail nhưng đã xử lý được (Redis/RabbitMQ lỗi, đi tiếp) |
  | `Error` | Thao tác chính fail (ghi DB fail, engine crash) |

- **Lỗi được nuốt có chủ đích phải được log.** Mọi `catch` quanh Redis/RabbitMQ/OpenSearch bắt buộc log Warning kèm exception — nuốt im lặng là nguồn gốc các bug khó chẩn đoán nhất của dự án.
- Log kèm context định danh: `roomId`, `gameKey`, `playerName`/connectionId — để lần theo một ván đấu.
- ❌ Không log: mật khẩu, token, connection string đầy đủ, toàn bộ `StateJson` ở mức Information (to và ồn — chỉ Debug).

## Queue (RabbitMQ) — quy tắc publish

1. **Publish không được chặn luồng chính.** `RabbitMqPublisher` bọc try-catch; publish fail thì log rồi đi tiếp — nước đi đã ghi DB và broadcast là thành công.
2. Ghi DB **trước**, publish event **sau**. Không bao giờ chỉ publish mà không persist.
3. Message là JSON, có field tối thiểu: loại event, `roomId`, `gameKey`, timestamp. Shape message coi như contract — thêm field thì được, đổi/xoá field là breaking.
4. Một publisher singleton, tái sử dụng channel; không mở connection mỗi lần publish.

Consumer (khi thêm): phải **idempotent** (queue là at-least-once), manual ack sau khi xử lý xong, queue/exchange đặt tên có namespace (`boardgame.<mục-đích>`), khai báo idempotent lúc khởi động. Retry lỗi tạm với backoff có giới hạn; lỗi vĩnh viễn đẩy dead-letter, không retry vô hạn. Job theo lịch dùng `BackgroundService`/`IHostedService`, không tự chế `Thread.Sleep` loop.

## Cache (Redis) — quy tắc dùng

- **PostgreSQL là nguồn sự thật. Redis chết thì hệ thống vẫn phải chạy đúng**, chỉ chậm hơn.
- Mọi thao tác Redis bọc try-catch, log rồi đi tiếp. Lỗi Redis không bao giờ được chặn ghi DB, chặn broadcast `GameStateUpdated`, hay trả 500 cho client.
- Cache miss → đọc DB → ghi lại cache. Không có đường code nào coi cache miss là lỗi.
- Key có namespace, phân tách bằng `:` (`room:{roomId}:state`, `lobby:rooms`); prefix định nghĩa một chỗ trong `RedisCacheService`, không rải chuỗi key khắp code.
- **Mọi key phải có TTL** — không key sống vĩnh viễn.
- Invalidation: ghi DB trước → cập nhật/xoá cache sau. Ưu tiên ghi đè hơn xoá-rồi-miss với state ván.
- Truy cập Redis chỉ qua `RedisCacheService` — không inject `IConnectionMultiplexer` thẳng vào hub/controller. Không dùng lệnh `KEYS` trong runtime code — dùng `SCAN` nếu buộc phải quét.

Chi tiết vai trò Redis/RabbitMQ trong kiến trúc tổng thể: [`../architecture/infrastructure.md`](../architecture/infrastructure.md).
