# Rule: Monitoring & Logging

> Quy tắc logging, monitoring, alerting, performance tracking.

## Logging

- Backend dùng `ILogger<T>` qua DI — ❌ không `Console.WriteLine` trong code production.
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

- **Lỗi được nuốt có chủ đích phải được log.** Mọi `catch` quanh Redis/RabbitMQ/OpenSearch bắt buộc log Warning kèm exception — nuốt im lặng là nguồn gốc các bug khó chẩn đoán nhất của dự án (xem CLAUDE.md).
- Log kèm context định danh: `roomId`, `gameKey`, `playerName`/connectionId — để lần theo một ván đấu.
- ❌ Không log: mật khẩu, token, connection string đầy đủ, toàn bộ `StateJson` ở mức Information (to và ồn — chỉ Debug).

## Frontend

- Lỗi ảnh hưởng người dùng phải hiển thị lên UI (xem `rule-ui.md`); `console.error` chỉ là kênh phụ cho dev.
- Log vòng đời kết nối SignalR (connected/reconnecting/closed) để chẩn đoán bug realtime.

## Monitoring

- Health check endpoint (`/health`) kiểm tra được: DB (bắt buộc), Redis/RabbitMQ (report degraded, không fail).
- Theo dõi tối thiểu: container up/down, CPU/RAM, disk PostgreSQL, độ sâu queue RabbitMQ, số connection SignalR.
- Xem log local: `docker compose logs -f api`.

## Alerting

- Cảnh báo khi: API down, DB không kết nối được, error rate tăng đột biến, queue tồn đọng kéo dài.
- Alert phải **actionable** — mỗi alert ghi rõ bước xử lý đầu tiên. Alert ồn (bắn liên tục không ai xử lý) phải sửa hoặc tắt.

## Performance tracking

- Đo trước khi tối ưu: thời gian xử lý `MakeMove` end-to-end (nhận invoke → broadcast), thời gian query DB chậm (bật log slow query EF khi cần).
- Ngân sách tham khảo: một nước đi từ client A đến update ở client B < 500ms trên mạng local.
