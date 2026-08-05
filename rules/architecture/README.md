# Architecture

Kiến trúc **hiện có** của dự án — tài liệu mô tả thực trạng, không phải thiết kế mong muốn. Đọc trước khi thay đổi mang tính kiến trúc (thêm service mới, đổi luồng dữ liệu, thêm game mới, đổi hạ tầng).

| File | Nội dung |
|---|---|
| [`system.md`](./system.md) | Tổng quan stack, ports, cấu trúc thư mục, ranh giới Platform/Games |
| [`frontend.md`](./frontend.md) | Kiến trúc component (platform vs. game), hook pattern, tương tác board SVG |
| [`backend.md`](./backend.md) | Phân tầng Controller/Hub → Engine → Services → DB, luồng `MakeMove` |
| [`database.md`](./database.md) | PostgreSQL là nguồn sự thật, schema bootstrap không migration, JSONB cho dữ liệu game |
| [`infrastructure.md`](./infrastructure.md) | Docker Compose, Redis/RabbitMQ/OpenSearch/MinIO, Kubernetes |

Khi một thay đổi kiến trúc được thực hiện: cập nhật file liên quan ở đây **và** ghi quyết định vào [`../history/decisions.md`](../history/decisions.md) nếu là quyết định đáng nhớ.
