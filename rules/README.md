# Project Rules

Thư mục này là **nguồn sự thật chính** cho việc phát triển dự án BoardGame. `CLAUDE.md` ở root chỉ là bản đồ điều hướng — chi tiết nằm ở đây.

Thay thế thư mục `rule/` (số ít) cũ — toàn bộ nội dung đã được gộp và tổ chức lại vào cấu trúc `rules/` (số nhiều) này. Không dùng `rule/` nữa.

## Directory Map

### [`coding/`](./coding/README.md)

Quy ước viết code: naming, error handling, conventions cho C#, TypeScript/React, database, API, testing, security.

Đọc khi **viết hoặc sửa code**.

### [`architecture/`](./architecture/README.md)

Kiến trúc hệ thống hiện có: phân tầng, data flow, boundary giữa Platform/Games, hạ tầng.

Đọc **trước khi** thay đổi mang tính kiến trúc (thêm service, đổi luồng dữ liệu, thêm game mới).

### [`workflow/`](./workflow/README.md)

Quy trình phát triển: chạy dự án local, Git, debugging, deployment.

Đọc khi thực hiện thao tác vận hành (branch, commit, chạy thử, release, chẩn đoán bug).

### [`tasks/`](./tasks/README.md)

Việc đang làm (`current.md`) và việc chưa làm (`backlog.md`).

Đọc **trước khi bắt đầu** một task.

### [`logs/`](./logs/README.md)

Nhật ký phát triển theo ngày — việc gì đã làm, kết quả, vấn đề gặp phải.

Đọc log gần nhất khi tiếp tục việc dở dang. Ghi log sau mỗi phiên làm việc có ý nghĩa.

### [`history/`](./history/README.md)

Lịch sử dài hạn: mốc quan trọng (`milestones.md`) và quyết định kỹ thuật kèm lý do (`decisions.md`).

Đọc khi cần hiểu **tại sao** hệ thống được thiết kế như hiện tại.

### [`references/`](./references/README.md)

Bản đồ file quan trọng trong repo, để định vị nhanh trong codebase.

Đọc khi chưa quen phần nào đó của dự án.

## Thứ tự ưu tiên khi có xung đột

```
System instructions
        ↓
User instructions
        ↓
CLAUDE.md
        ↓
rules/README.md (file này)
        ↓
Rule cụ thể trong rules/ (rules/coding/security.md thắng khi xung đột với rule khác)
        ↓
Task hiện tại (rules/tasks/current.md)
        ↓
Code hiện có
```

Rule cụ thể thắng rule chung khi cùng phạm vi. Nếu xung đột ảnh hưởng đáng kể đến cách implement, hỏi lại người dùng thay vì tự quyết.

## Cách nạp rule theo task (targeted loading)

Không đọc toàn bộ `rules/` cho mọi task. Luôn đọc trước:

```
CLAUDE.md
rules/README.md
rules/tasks/current.md
```

Rồi nạp thêm theo loại task:

| Loại task | Đọc thêm |
|---|---|
| Frontend | `coding/general.md`, `coding/frontend.md`, `architecture/frontend.md` |
| Backend | `coding/general.md`, `coding/backend.md`, `architecture/backend.md` |
| Database/schema | `coding/database.md`, `architecture/database.md` |
| API (REST/SignalR) | `coding/api.md`, `architecture/backend.md` |
| Deployment/hạ tầng | `workflow/deployment.md`, `architecture/infrastructure.md` |
| Git (branch/commit/PR) | `workflow/git.md` |
| Debug bug | `workflow/debugging.md` |
| Auth/permission/secret | `coding/security.md` |
| Thêm game mới | `architecture/system.md`, `references/important-files.md` |
