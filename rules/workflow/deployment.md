# Workflow: Deployment

## Environment management

- Ba môi trường chuẩn: `Development` (local), `Staging`, `Production`.
- Mọi khác biệt giữa môi trường nằm ở **cấu hình** (biến môi trường / `appsettings.{Env}.json`), ❌ không ở code (`if (env == "prod")` rải trong logic).
- Connection string (PostgreSQL, Redis, RabbitMQ, OpenSearch, MinIO) luôn từ biến môi trường; giá trị trong repo chỉ là default cho local.
- Secret production không nằm trong repo, không nằm trong image — inject lúc deploy (xem [`../coding/security.md`](../coding/security.md)).

## CI/CD

Pipeline tối thiểu cho mỗi PR (thứ tự fail-fast):

1. `dotnet build` (warning as error khi đã sạch) + `dotnet test`
2. Frontend: `npm ci` → lint → type-check (`tsc --noEmit`) → build
3. Build Docker image (chỉ trên branch chính / tag)

- PR đỏ CI thì không merge (xem [`git.md`](./git.md)).
- Image tag theo git SHA (+ tag phiên bản khi release), ❌ không deploy `latest`.
- Build một lần, deploy image đó qua các môi trường — không rebuild riêng cho production.

## Schema & deploy

Dự án **không dùng migration** — schema bootstrap bằng raw SQL idempotent trong `Program.cs` chạy lúc app khởi động (xem [`../architecture/database.md`](../architecture/database.md)). Hệ quả cho deploy:

- Mọi thay đổi schema phải **backward-compatible** (`IF NOT EXISTS`, `DEFAULT` cho NOT NULL) vì code mới chạy trên DB cũ ngay khi start.
- Thay đổi phá huỷ (drop/rename cột đang dùng) phải tách 2 bước ở 2 lần release: ngừng dùng trước, xoá sau.

## Release process

- Release từ `master`, đánh tag semver `vX.Y.Z` + ghi chú thay đổi chính.
- Deploy staging trước, smoke test (tạo phòng, 2 client vào, đi được một nước, nhận `GameStateUpdated`) rồi mới production.
- **Rollback = deploy lại image trước đó** — luôn giữ image cũ; vì schema chỉ thêm-không-sửa nên code cũ chạy được trên DB mới.
- Không deploy thẳng thay đổi chưa qua PR/CI.

## Kubernetes

```bash
docker build -t boardgame/backend:latest  ./backend/BoardGame.Api
docker build -t boardgame/frontend:latest ./frontend

kubectl apply -f k8s/
kubectl get pods -n boardgame
```

Thêm `boardgame.local` vào file hosts để truy cập qua Ingress. Manifest ở `k8s/`: namespace, config, mỗi service hạ tầng, backend, frontend, ingress — xem [`../architecture/infrastructure.md`](../architecture/infrastructure.md).
