# 🎲 BoardGame — Hello World

Mẫu **"hello world"** minh hoạ đầy đủ hạ tầng công nghệ của dự án. Một greeting
được tạo ra sẽ đi qua toàn bộ stack:

> **PostgreSQL** (lưu) → **Redis** (cache) → **RabbitMQ** (event) →
> **OpenSearch** (index) → **MinIO** (artifact) → **SignalR** (realtime tới UI)

## Công nghệ

| Thành phần | Công nghệ          |
| ---------- | ------------------ |
| Backend    | ASP.NET Core       |
| Realtime   | SignalR            |
| Database   | PostgreSQL         |
| Cache      | Redis              |
| Queue      | RabbitMQ           |
| Search     | OpenSearch         |
| Storage    | MinIO              |
| Container  | Docker             |
| Deploy     | Kubernetes         |
| Frontend   | React + TypeScript |
| State      | Zustand            |
| UI         | Tailwind           |

## Cấu trúc thư mục

```
BoardGame/
├── README.md
├── docker-compose.yml          # Chạy toàn bộ stack bằng 1 lệnh
├── .gitignore
├── backend/                    # ASP.NET Core Web API
│   ├── BoardGame.sln
│   └── BoardGame.Api/
│       ├── BoardGame.Api.csproj
│       ├── Program.cs          # DI cho tất cả hạ tầng
│       ├── appsettings*.json
│       ├── Dockerfile
│       ├── Controllers/        # HelloController — điều phối cả stack
│       ├── Hubs/               # GameHub (SignalR)
│       ├── Data/               # AppDbContext (EF Core / PostgreSQL)
│       ├── Models/             # Greeting
│       └── Services/           # Redis, RabbitMQ, OpenSearch, MinIO
├── frontend/                   # React + TypeScript + Vite
│   ├── package.json
│   ├── tailwind.config.js
│   ├── Dockerfile / nginx.conf
│   └── src/
│       ├── App.tsx
│       ├── store/              # Zustand store
│       └── hooks/              # useGameHub (SignalR client)
└── k8s/                        # Manifests Kubernetes
    ├── 00-namespace.yaml
    ├── 01-config.yaml          # ConfigMap + Secret
    ├── 10..14-*.yaml           # postgres / redis / rabbitmq / opensearch / minio
    ├── 20-backend.yaml
    ├── 21-frontend.yaml
    └── 30-ingress.yaml
```

## Chạy nhanh với Docker Compose

```bash
docker compose up --build
```

| Dịch vụ            | URL                                    |
| ------------------ | -------------------------------------- |
| Frontend           | http://localhost:5173                  |
| Backend (Swagger)  | http://localhost:5000/swagger          |
| RabbitMQ UI        | http://localhost:15672 (guest/guest)   |
| OpenSearch         | http://localhost:9200                  |
| MinIO Console      | http://localhost:9001 (minioadmin/...) |

## Chạy ở chế độ phát triển (không Docker cho app)

```bash
# 1. Bật riêng phần hạ tầng
docker compose up postgres redis rabbitmq opensearch minio

# 2. Backend
cd backend/BoardGame.Api
dotnet run        # http://localhost:5000

# 3. Frontend
cd frontend
npm install
npm run dev       # http://localhost:5173
```

## Thử nghiệm API

```bash
# Tạo greeting (đi qua toàn bộ stack)
curl -X POST http://localhost:5000/api/hello \
  -H "Content-Type: application/json" \
  -d '{"message":"Xin chào BoardGame!"}'

# Lấy greeting mới nhất (ưu tiên Redis)
curl http://localhost:5000/api/hello

# Tìm kiếm full-text (OpenSearch)
curl "http://localhost:5000/api/hello/search?q=chào"
```

## Triển khai Kubernetes

```bash
# Build & nạp image (ví dụ với minikube/kind)
docker build -t boardgame/backend:latest  ./backend/BoardGame.Api
docker build -t boardgame/frontend:latest ./frontend

kubectl apply -f k8s/
kubectl get pods -n boardgame
```

> Thêm `boardgame.local` vào file hosts để truy cập qua Ingress.
