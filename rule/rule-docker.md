# Rule: Docker

> Quy tắc sử dụng Docker: Dockerfile, Docker Compose, container naming.

## Docker Compose là chuẩn chạy dự án

- Một file `docker-compose.yml` duy nhất ở **root**, quản lý toàn bộ stack: backend, frontend, PostgreSQL, Redis, RabbitMQ, OpenSearch, MinIO.
- Hai cách chạy được hỗ trợ (giữ cả hai hoạt động):
  ```bash
  docker compose up --build                                    # full stack
  docker compose up postgres redis rabbitmq opensearch minio -d # chỉ infra
  dotnet run --project backend/BoardGame.Api                    # backend chạy host
  ```
- Port cố định theo CLAUDE.md: API 5000, frontend 5173, PostgreSQL 5432, Redis 6379, RabbitMQ 5672/15672, OpenSearch 9200, MinIO 9000/9001. Đổi port phải cập nhật CLAUDE.md + tài liệu.

## Compose conventions

- Service đặt tên ngắn, lowercase, theo vai trò: `postgres`, `redis`, `rabbitmq`, `opensearch`, `minio`, `api`, `frontend`.
- **Dữ liệu persist qua named volume** (postgres, minio, opensearch) — không bind-mount thư mục data vào repo.
- Backend kết nối service khác qua **tên service** (`postgres:5432`) khi chạy trong compose; qua `localhost` khi chạy host — connection string cấu hình bằng biến môi trường, không hard-code một trong hai.
- Service có dependency dùng `depends_on` kèm `healthcheck` (backend chờ postgres healthy, không chỉ started).
- Credential dev để trong compose được, nhưng phải là giá trị dev rõ ràng; môi trường ngoài local dùng biến môi trường/secret (xem `rule-security.md`).

## Dockerfile

- Multi-stage build:
  - Backend: stage `sdk:8.0` để build/publish → stage `aspnet:8.0` để chạy. Image chạy không chứa SDK.
  - Frontend: stage node build → serve static (nginx hoặc tương đương).
- Copy file restore trước (`*.csproj` / `package.json` + lockfile) rồi mới copy source — tận dụng layer cache.
- Có `.dockerignore`: `bin/`, `obj/`, `node_modules/`, `.git/`.
- Không chạy container bằng root nếu base image hỗ trợ user thường.
- Pin tag cụ thể cho image infra (vd `postgres:16`), không dùng `latest`.

## Vệ sinh

- Không `docker compose down -v` bừa bãi — `-v` xoá volume tức xoá database.
- Log container là kênh chẩn đoán chính: `docker compose logs -f api`.
