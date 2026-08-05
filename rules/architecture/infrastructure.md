# Architecture: Infrastructure

## Docker Compose là chuẩn chạy dự án

Một file `docker-compose.yml` duy nhất ở **root**, quản lý toàn bộ stack: backend, frontend, PostgreSQL, Redis, RabbitMQ, OpenSearch, MinIO.

Hai cách chạy được hỗ trợ (giữ cả hai hoạt động):

```bash
docker compose up --build                                    # full stack
docker compose up postgres redis rabbitmq opensearch minio -d # chỉ infra
dotnet run --project backend/BoardGame.Api                    # backend chạy host
```

Ports cố định: xem [`system.md`](./system.md).

## Compose conventions

- Service đặt tên ngắn, lowercase, theo vai trò: `postgres`, `redis`, `rabbitmq`, `opensearch`, `minio`, `api`, `frontend`.
- **Dữ liệu persist qua named volume** (postgres, minio, opensearch) — không bind-mount thư mục data vào repo.
- Backend kết nối service khác qua **tên service** (`postgres:5432`) khi chạy trong compose; qua `localhost` khi chạy host — connection string cấu hình bằng biến môi trường, không hard-code một trong hai.
- Service có dependency dùng `depends_on` kèm `healthcheck` (backend chờ postgres healthy, không chỉ started).
- Credential dev để trong compose được (giá trị dev rõ ràng); môi trường ngoài local dùng biến môi trường/secret (xem [`../coding/security.md`](../coding/security.md)).

## Dockerfile

- Multi-stage build: Backend stage `sdk:8.0` build/publish → stage `aspnet:8.0` chạy (image chạy không chứa SDK). Frontend: stage node build → serve static (nginx).
- Copy file restore trước (`*.csproj` / `package.json` + lockfile) rồi mới copy source — tận dụng layer cache.
- `.dockerignore`: `bin/`, `obj/`, `node_modules/`, `.git/`.
- Pin tag cụ thể cho image infra (vd `postgres:16`), không dùng `latest`.

## Vai trò từng service hạ tầng

| Service | Vai trò | Nguyên tắc |
|---|---|---|
| **PostgreSQL** | Nguồn sự thật duy nhất | Xem [`database.md`](./database.md) |
| **Redis** | Cache state ván đang chơi (TTL), lobby | Chết vẫn phải chạy đúng — mọi thao tác bọc try-catch (xem [`../coding/backend.md`](../coding/backend.md)) |
| **RabbitMQ** | Event queue phụ trợ (đẩy sự kiện cho consumer như OpenSearch indexing) | **Không** dùng cho luồng chơi realtime (đó là việc của SignalR); publish không được chặn luồng chính |
| **OpenSearch** | Index lịch sử ván đã kết thúc, full-text search | Ghi khi ván kết thúc, không phải mỗi nước đi |
| **MinIO** | Lưu replay/file | Ghi khi ván kết thúc |
| **SignalR** (trong backend, không phải service riêng) | Realtime trong ván: đi quân, cập nhật state | Kênh duy nhất cho state trong ván — không REST polling |

## Vệ sinh & vận hành

- Không `docker compose down -v` bừa bãi — `-v` xoá volume tức xoá database.
- Log container là kênh chẩn đoán chính: `docker compose logs -f api`.
- PostgreSQL, Redis, RabbitMQ, OpenSearch, MinIO **không expose ra internet** — chỉ backend truy cập được (network nội bộ compose); port mở ra host chỉ dành cho dev local.

## Kubernetes (`k8s/`)

Manifest triển khai production: `00-namespace`, `01-config`, `10-postgres`, `11-redis`, `12-rabbitmq`, `13-opensearch`, `14-minio`, `20-backend`, `21-frontend`, `30-ingress`. Chi tiết lệnh deploy: [`../workflow/deployment.md`](../workflow/deployment.md).
