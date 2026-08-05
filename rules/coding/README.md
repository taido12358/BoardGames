# Coding Rules

Quy ước viết code cho dự án BoardGame (.NET 8 backend + Vite/React frontend). Đọc file liên quan trước khi viết hoặc sửa code; đọc `general.md` luôn, vì áp dụng cho cả hai phía.

| File | Nội dung |
|---|---|
| [`general.md`](./general.md) | Nguyên tắc chung (đặt tên, error handling, comment, file management) — áp dụng cả backend lẫn frontend |
| [`frontend.md`](./frontend.md) | TypeScript/React: kiểu dữ liệu, component, state, CSS/Tailwind, màu sắc, UI/accessibility |
| [`backend.md`](./backend.md) | C#: convention, async, DI/lifetime, concurrency, logging |
| [`database.md`](./database.md) | Schema bootstrap (raw SQL, không migration), naming, indexing |
| [`api.md`](./api.md) | REST (`GamesController`) + SignalR (`GameHub`) conventions |
| [`testing.md`](./testing.md) | Unit/integration/E2E theo tầng |
| [`security.md`](./security.md) | Secret management, input validation, auth, phân quyền |
