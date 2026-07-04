# Development Rules Index

> Mục đích: Tài liệu này chỉ dùng để liệt kê và mô tả các file quy tắc trong dự án. Mọi quy tắc chi tiết phải được định nghĩa trong các file `rule-*` tương ứng.

## Core Rules

### `rule-project.md`

* Quy tắc cấu trúc dự án.
* Quy tắc tổ chức thư mục.
* Quy tắc đặt tên module, package và component.

### `rule-git.md`

* Quy tắc sử dụng Git.
* Quy tắc branch naming.
* Quy tắc commit message.
* Quy tắc pull request và merge.

### `rule-file.md`

* Quy tắc tạo và quản lý file.
* Quy tắc đặt tên file và thư mục.
* Quy tắc versioning và backup file.

---

## Coding Rules

### `rule-code.md`

* Quy tắc viết code chung.
* Coding convention.
* Nguyên tắc clean code.
* Best practices.

### `rule-typescript.md`

* Quy tắc viết TypeScript.
* Kiểu dữ liệu.
* Interface, type, enum.
* Strict mode.

### `rule-javascript.md`

* Quy tắc viết JavaScript.
* ES standards.
* Async/await.
* Error handling.

### `rule-api.md`

* Quy tắc thiết kế API.
* REST conventions.
* Response format.
* Error codes.
* Authentication.

### `rule-database.md`

* Quy tắc thiết kế database.
* Naming convention.
* Migration.
* Indexing.
* Query optimization.

---

## Frontend Rules

### `rule-ui.md`

* Quy tắc xây dựng giao diện.
* Component structure.
* Responsive design.
* Accessibility.

### `rule-color.md`

* Quy tắc sử dụng màu sắc.
* Color palette.
* Theme.
* Dark/Light mode.

### `rule-css.md`

* Quy tắc viết CSS/SCSS/Tailwind.
* Class naming.
* Layout.
* Spacing.

### `rule-component.md`

* Quy tắc tạo component.
* Reusability.
* Props.
* State management.

---

## Backend Rules

### `rule-server.md`

* Quy tắc xây dựng server.
* Service layer.
* Controller layer.
* Middleware.

### `rule-auth.md`

* Quy tắc xác thực.
* Authorization.
* Token management.
* Security.

### `rule-cache.md`

* Quy tắc cache.
* Redis.
* Cache invalidation.

### `rule-queue.md`

* Quy tắc xử lý queue.
* Job scheduling.
* Retry strategy.

---

## DevOps Rules

### `rule-docker.md`

* Quy tắc sử dụng Docker.
* Dockerfile.
* Docker Compose.
* Container naming.

### `rule-deploy.md`

* Quy tắc deployment.
* CI/CD.
* Environment management.
* Release process.

### `rule-monitoring.md`

* Quy tắc logging.
* Monitoring.
* Alerting.
* Performance tracking.

---

## Security Rules

### `rule-security.md`

* Quy tắc bảo mật.
* Secret management.
* Encryption.
* Security audit.

### `rule-permission.md`

* Quy tắc phân quyền.
* Roles.
* Access control.

---

## Documentation Rules

### `rule-document.md`

* Quy tắc viết tài liệu.
* README.
* API docs.
* Technical docs.

### `rule-comment.md`

* Quy tắc comment code.
* Documentation comment.
* TODO/FIXME convention.

---

## Testing Rules

### `rule-testing.md`

* Quy tắc testing.
* Unit test.
* Integration test.
* E2E test.

### `rule-quality.md`

* Quy tắc kiểm tra chất lượng.
* Linting.
* Formatting.
* Code review checklist.

---

## AI Development Rules

### `rule-ai.md`

* Quy tắc sử dụng AI trong phát triển.
* Prompt engineering.
* AI code review.
* AI-generated code validation.

---

## Rule Priority

Khi có xung đột giữa các quy tắc:

1. `rule-security.md`
2. `rule-project.md`
3. `rule-code.md`
4. Các `rule-*` chuyên biệt
5. Quyết định của kiến trúc sư hệ thống
