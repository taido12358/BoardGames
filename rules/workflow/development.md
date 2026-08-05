# Workflow: Development (chạy local)

## Chạy nhanh với Docker Compose

```bash
docker compose up --build
```

| Dịch vụ | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (Swagger) | http://localhost:5000/swagger |
| RabbitMQ UI | http://localhost:15672 (guest/guest) |
| OpenSearch | http://localhost:9200 |
| MinIO Console | http://localhost:9001 |

## Chạy ở chế độ phát triển (không Docker cho app)

```bash
# 1. Bật riêng phần hạ tầng
docker compose up postgres redis rabbitmq opensearch minio -d

# 2. Backend
cd backend/BoardGame.Api
dotnet run        # http://localhost:5000

# 3. Frontend
cd frontend
npm install
npm run dev        # http://localhost:5173
```

## Biến môi trường (`.env`)

File `.env` ở root (gitignored) cấu hình secret và tuỳ chọn môi trường. Mẫu tham khảo: `.env.example` (committed, **không điền credential thật vào file example**).

Biến chính: `JWT_SECRET`, `EMAIL_PROVIDER=smtp`, `SMTP_HOST/PORT/USER/PASS/FROM`, `WEB_BASE_URL`.

- Docker Compose tự đọc `.env`.
- Chạy `dotnet run` ngoài Docker: `Services/DotEnv.cs` nạp `.env` vào biến môi trường lúc boot (biến môi trường có sẵn trong shell luôn thắng giá trị trong `.env`).
- Chưa cấu hình SMTP (`EMAIL_PROVIDER` trống): nếu `Auth:DevLogOtp` bật (mặc định ở Development và trong docker-compose) thì OTP đăng nhập log ra console/`docker compose logs backend`; ngược lại API trả 503.

Chi tiết bảo mật secret: [`../coding/security.md`](../coding/security.md).

## Xung đột port cục bộ (ghi chú, không phải chuẩn dự án)

Ports chuẩn của dự án cố định (xem [`../architecture/system.md`](../architecture/system.md)). Nếu máy dev có project khác đã chiếm port mặc định (`5432`, `6379`…), map sang port host khác trong `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"  # host 5433 -> container vẫn 5432
```

rồi cập nhật `ConnectionStrings` tương ứng trong `appsettings.Development.json`. Đây là workaround **cục bộ cho máy đó**, không commit như thay đổi chuẩn của dự án trừ khi cả team đồng ý đổi port mặc định.

## Reset DB khi schema đổi lớn

Schema không dùng migration (xem [`../architecture/database.md`](../architecture/database.md)); phần lớn thay đổi tự vá qua `ALTER TABLE ... IF NOT EXISTS` lúc backend khởi động. Nếu cần schema sạch hoàn toàn (vd đổi cấu trúc không tương thích khi dev):

```bash
docker compose down -v   # ⚠️ xoá volume = xoá toàn bộ data
docker compose up --build
```

## Thử nghiệm API nhanh

```bash
curl http://localhost:5000/api/games/engines    # danh sách game được hỗ trợ

curl -X POST http://localhost:5000/api/games -H "Content-Type: application/json" \
  -d '{"gameKey":"vaybat","options":{"maxRedTurns":15},"playerName":"An"}'

curl http://localhost:5000/api/games            # danh sách phòng đang mở
curl "http://localhost:5000/api/games/search?q=RED"  # tìm lịch sử ván đã xong
```

Nước đi realtime qua SignalR hub `/hubs/game`: `JoinRoom(roomId, name)`, `MakeMove(roomId, moveJson, name)`, `LeaveRoom(roomId)`.

## Test 2 người chơi trên cùng máy

Đăng nhập bằng email/OTP nên định danh là email (không còn bug trùng `playerName` ngẫu nhiên) — nhưng **hai tab cùng trình duyệt vẫn dùng chung phiên đăng nhập**. Test 2 người thật cần **hai trình duyệt khác nhau hoặc profile khác nhau** (không chỉ tab ẩn danh nếu cùng phiên).
