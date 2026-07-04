# Rule: Cache (Redis)

> Quy tắc cache: Redis, cache invalidation.

## Nguyên tắc số 1: Redis chỉ là cache

- **PostgreSQL là nguồn sự thật. Redis chết thì hệ thống vẫn phải chạy đúng**, chỉ chậm hơn.
- Mọi thao tác Redis bọc try-catch, log rồi đi tiếp. ❌ Lỗi Redis không bao giờ được:
  - chặn ghi DB,
  - chặn broadcast `GameStateUpdated` (bug đã sửa trong `GameHub.MakeMove`/`GamesController`, xem CLAUDE.md),
  - trả lỗi 500 cho client.
- Cache miss → đọc DB → ghi lại cache. Không có đường code nào coi cache miss là lỗi.

## Cái gì được cache

- State ván đang chơi (`StateJson`) — dữ liệu đọc nhiều, ghi mỗi nước đi.
- Danh sách phòng lobby (TTL ngắn) nếu đo thấy cần.
- ❌ Không cache: dữ liệu chỉ đọc một lần, kết quả cần chính xác tuyệt đối tại thời điểm đọc (kết thúc ván lấy từ DB).

## Key & TTL

- Key có namespace, phân tách bằng `:` — `room:{roomId}:state`, `lobby:rooms`.
- Prefix thống nhất định nghĩa một chỗ trong `RedisCacheService`, không rải chuỗi key khắp code.
- **Mọi key phải có TTL** — không key sống vĩnh viễn. State ván: TTL dài hơn thời lượng ván điển hình (vd 24h); lobby: TTL ngắn (giây).
- Value là JSON đã serialize bằng helper chung (`GameJson`), không format tự chế.

## Invalidation

- Thứ tự chuẩn khi có nước đi: **ghi DB trước → cập nhật/xoá cache sau**. Không bao giờ chỉ ghi cache.
- Ưu tiên **ghi đè** (set state mới) hơn xoá rồi để miss, với state ván.
- Ván kết thúc / phòng đóng → xoá key liên quan.
- Không tin cache khi có tranh chấp: kiểm tra quyết định thắng/thua, lượt đi dựa trên state đã persist.

## Vận hành

- Truy cập Redis chỉ qua `RedisCacheService` — không inject `IConnectionMultiplexer` thẳng vào hub/controller.
- Connection string từ config/biến môi trường (local: `localhost:6379`).
- Không dùng lệnh `KEYS` trong runtime code (block Redis) — dùng `SCAN` nếu buộc phải quét.
