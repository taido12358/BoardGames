# Rule: File Management

> Quy tắc tạo, đặt tên, quản lý file và thư mục.

## Đặt tên file

| Loại | Quy tắc | Ví dụ |
|---|---|---|
| C# class/interface | PascalCase, trùng tên type bên trong | `GameEngineRegistry.cs` |
| React component | PascalCase | `VayBatBoard.tsx` |
| React hook | camelCase, prefix `use` | `useGameRoomHub.ts` |
| Module TS/JS thường | camelCase | `gameApi.ts` |
| Tài liệu markdown | kebab-case | `rule-database.md` |
| Config | theo chuẩn tool | `docker-compose.yml`, `vite.config.ts` |

- Không dùng dấu tiếng Việt, khoảng trắng, ký tự đặc biệt trong tên file/thư mục.
- Một file = một class/component chính. Type phụ nhỏ (record, DTO gắn liền) được phép nằm cùng file nếu chỉ dùng nội bộ.

## Vị trí file

- File thuộc về đâu thì đặt ở đó theo `rule-project.md` — không tạo thư mục `Utils/`, `Helpers/`, `Misc/` chung chung khi chưa thật cần.
- File tạm, script thử nghiệm, output debug: **không đưa vào repo**. Nếu cần giữ lại, đặt trong thư mục đã ignore.
- Tài liệu quy tắc: thư mục `rule/`, index tại `rules.md`.

## Versioning & backup

- **Git là cơ chế version duy nhất.** Không tạo file `Foo_old.cs`, `Foo_backup.cs`, `Foo_v2.cs`, `Foo (copy).cs` — cần bản cũ thì xem git history.
- Không giữ code chết dạng comment-out "để backup" — xoá hẳn, git nhớ hộ.
- File cấu hình mẫu: commit bản `.example` (vd `.env.example`), bản thật đưa vào `.gitignore`.

## Xoá / đổi tên

- Đổi tên file phải đổi tên class/component bên trong cho khớp và cập nhật mọi import/đăng ký DI.
- Trước khi xoá file, grep toàn repo để chắc không còn tham chiếu.
