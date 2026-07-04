# Rule: Queue (RabbitMQ)

> Quy tắc xử lý queue: RabbitMQ, job scheduling, retry strategy.

## Vai trò trong hệ thống

RabbitMQ là **event queue phụ trợ** (đẩy sự kiện game cho consumer như OpenSearch indexing). Luồng chơi realtime đi qua SignalR, **không** đi qua queue.

## Nguyên tắc publish

1. **Publish không được chặn luồng chính.** `RabbitMqPublisher` bọc try-catch; publish fail thì log rồi đi tiếp — nước đi đã ghi DB và broadcast là thành công.
2. Ghi DB **trước**, publish event **sau**. Không bao giờ chỉ publish mà không persist.
3. Message là JSON, có field tối thiểu: loại event, `roomId`, `gameKey`, timestamp. Shape message coi như contract — thêm field thì được, đổi/xoá field là breaking.

## Connection & channel (bài học đã trả giá — xem CLAUDE.md)

- ❌ **Không bật `AutomaticRecoveryEnabled = true` cùng với `GetChannel()` reconnect thủ công** — hai cơ chế tranh nhau dispose/recreate connection → `ObjectDisposedException`. Hiện tại: reconnect thủ công, `AutomaticRecoveryEnabled = false`. Muốn đổi sang auto-recovery thì phải bỏ hẳn GetChannel thủ công.
- Field `_channel` dùng `Volatile.Read/Write` cho double-checked locking (an toàn trên ARM), không dựa vào từ khoá `volatile`.
- Một publisher singleton, tái sử dụng channel; không mở connection mỗi lần publish.

## Consumer (khi thêm)

- Consumer phải **idempotent** — cùng một message xử lý hai lần không gây sai dữ liệu (queue là at-least-once).
- Manual ack: xử lý xong mới ack; fail thì nack.
- Queue/exchange đặt tên có namespace: `boardgame.<mục-đích>`, vd `boardgame.game-events`.
- Khai báo queue/exchange idempotent (declare khi khởi động).

## Retry strategy

- Lỗi tạm (mất kết nối): retry với backoff (vd 1s, 5s, 30s), có giới hạn số lần.
- Lỗi vĩnh viễn (message sai shape): **không retry vô hạn** — đẩy vào dead-letter queue kèm log, để không kẹt queue.
- Job theo lịch (nếu cần): dùng `BackgroundService`/`IHostedService` của .NET; không tự chế vòng lặp `Thread.Sleep`.
