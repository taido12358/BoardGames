# Rule: Git

> Quy tắc sử dụng Git: branch, commit message, pull request, merge.

## Branch

- Branch chính: `master`. Không commit trực tiếp lên `master` — mọi thay đổi đi qua branch + PR.
- Đặt tên branch: `<loại>/<mô-tả-ngắn-kebab-case>`

| Loại | Dùng khi |
|---|---|
| `feature/` | Tính năng mới (`feature/co-tuong-engine`) |
| `fix/` | Sửa bug (`fix/redis-timeout-blocks-broadcast`) |
| `refactor/` | Tái cấu trúc, không đổi hành vi |
| `chore/` | Cập nhật config, dependency, tài liệu |

## Commit message

- Dòng đầu ≤ 72 ký tự, viết ở thì mệnh lệnh (imperative): `Fix ...`, `Add ...`, `Thêm ...` — mô tả **cái gì thay đổi**, không mô tả quá trình.
- Tiếng Việt hoặc tiếng Anh đều được, nhưng phải rõ nghĩa. ❌ Không commit message kiểu `fix`, `update`, `wip`, `fail - :(((((`.
- Nếu cần giải thích **tại sao**, viết vào body (cách dòng đầu một dòng trống).
- Một commit = một thay đổi logic. Không gộp fix bug + format code + feature vào một commit.

```
Fix silent 'cannot move piece' failures and surface game-start state in UI

Redis errors were blocking the GameStateUpdated broadcast even though
the move was already persisted. Wrap Redis calls in try-catch since
Redis is only a cache.
```

## Pull Request

- Tiêu đề PR như commit message dòng đầu.
- Mô tả PR phải có: **vấn đề**, **cách giải quyết**, **cách đã test** (đặc biệt với bug realtime/SignalR — ghi rõ đã test bằng mấy client).
- PR nhỏ, tập trung một việc. PR > 500 dòng diff nên tách.
- Không merge PR khi CI đỏ hoặc build fail.

## Merge

- Ưu tiên **squash merge** cho feature branch để giữ lịch sử `master` sạch.
- Xoá branch sau khi merge.
- Không force-push lên branch đã có người khác review, trừ khi báo trước.

## Những thứ không được commit

- Secret, connection string thật, file `.env` chứa credential → dùng `.gitignore` + biến môi trường (xem `rule-security.md`).
- `bin/`, `obj/`, `node_modules/`, file build output.
- File dump database, file log.
