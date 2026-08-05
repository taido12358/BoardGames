# Coding: General

> Nguyên tắc chung cho cả backend (C#) và frontend (TS/React). Chi tiết riêng từng phía: [`backend.md`](./backend.md), [`frontend.md`](./frontend.md).

## Nguyên tắc viết code

1. **Đọc được quan trọng hơn ngắn.** Code viết cho người đọc sau, không phải cho người viết.
2. **Một hàm làm một việc.** Hàm > ~40 dòng hoặc lồng > 3 cấp → cân nhắc tách.
3. **Đặt tên nói lên ý định.** `remainingTurns` thay vì `n`; `isSpectator` thay vì `flag`.
4. **Fail rõ ràng, không nuốt lỗi im lặng.** Đây là bài học đắt nhất của dự án (bug "không thể di chuyển quân" — xem [`../history/decisions.md`](../history/decisions.md)): mọi thao tác thất bại phải trả về lý do đến được người dùng hoặc log — không `catch {}` rỗng, không `console.error` xong bỏ qua.
5. **Không lặp code (DRY) nhưng đừng trừu tượng hoá sớm.** Lặp 2 lần chấp nhận được; lần thứ 3 mới tách.
6. **Không hard-code** magic number/string dùng ở nhiều nơi — đặt hằng số có tên.

## Comment

1. **Comment giải thích TẠI SAO, không giải thích CÁI GÌ.** Code đã nói cái gì; nếu code khó hiểu đến mức phải mô tả lại, hãy sửa code (đặt tên tốt hơn, tách hàm).

   ```csharp
   // ❌ Tăng moveNumber lên 1
   moveNumber++;

   // ✅ Redis chỉ là cache — lỗi Redis không được chặn broadcast GameStateUpdated
   try { await _cache.SetStateAsync(roomId, stateJson); }
   catch (Exception ex) { _logger.LogWarning(ex, "..."); }
   ```

2. **Ràng buộc không nhìn thấy được từ code thì bắt buộc comment**: lý do tắt `AutomaticRecoveryEnabled`, vì sao dùng `Volatile.Read/Write`, vì sao `'{{}}'::jsonb` phải escape — đúng loại comment đang có trong codebase, giữ phong cách đó.
3. Comment sai/lỗi thời tệ hơn không có — sửa code thì sửa comment **cùng lúc**.
4. Không comment-out code để "backup" — xoá hẳn, git nhớ hộ.
5. Ngôn ngữ: tiếng Việt hoặc tiếng Anh đều được, nhất quán trong một file.

### Documentation comment

- C#: XML doc (`/// <summary>`) cho public API của platform — đặc biệt `IGameEngine` (contract mọi game phải theo), method hub, service public. Method private nhỏ không cần.
- TS: JSDoc cho hook/hàm export dùng chung (`useGameRoomHub`); props phức tạp giải thích ngay trong interface.
- Doc comment mô tả **hành vi và điều kiện lỗi** ("trả về MoveOutcome(false) khi JSON sai shape"), không lặp lại tên hàm.

### TODO / FIXME

Format thống nhất, grep được:

```
// TODO(tên-người): mô tả việc cần làm — vì sao chưa làm ngay
// FIXME(tên-người): mô tả cái đang sai/tạm bợ — điều kiện để sửa
// HACK(tên-người): giải pháp tình thế có chủ đích — kèm cách đúng là gì
```

- `TODO` = việc còn thiếu nhưng code hiện tại đúng; `FIXME` = code hiện tại có vấn đề đã biết; `HACK` = biết là xấu, cố ý.
- ❌ Không merge PR có `FIXME` cho chính tính năng PR đó đang làm — sửa luôn hoặc tách issue.
- TODO không có nội dung (`// TODO`) bị coi là rác — xoá hoặc viết đủ.

## File management

### Đặt tên file

| Loại | Quy tắc | Ví dụ |
|---|---|---|
| C# class/interface | PascalCase, trùng tên type bên trong | `GameEngineRegistry.cs` |
| React component | PascalCase | `VayBatBoard.tsx` |
| React hook | camelCase, prefix `use` | `useGameRoomHub.ts` |
| Module TS/JS thường | camelCase | `gameApi.ts` |
| Tài liệu markdown | kebab-case | `important-files.md` |
| Config | theo chuẩn tool | `docker-compose.yml`, `vite.config.ts` |

- Không dùng dấu tiếng Việt, khoảng trắng, ký tự đặc biệt trong tên file/thư mục.
- Một file = một class/component chính. Type phụ nhỏ (record, DTO gắn liền) được phép nằm cùng file nếu chỉ dùng nội bộ.

### Vị trí file

- File thuộc về đâu thì đặt ở đó theo [`../architecture/system.md`](../architecture/system.md) — không tạo thư mục `Utils/`, `Helpers/`, `Misc/` chung chung khi chưa thật cần.
- File tạm, script thử nghiệm, output debug: **không đưa vào repo**. Nếu cần giữ lại, đặt trong thư mục đã ignore.
- Tài liệu quy tắc: thư mục `rules/` (không phải `rule/` — đã gộp và xoá).

### Versioning & backup

- **Git là cơ chế version duy nhất.** Không tạo file `Foo_old.cs`, `Foo_backup.cs`, `Foo_v2.cs`, `Foo (copy).cs` — cần bản cũ thì xem git history.
- Không giữ code chết dạng comment-out "để backup" — xoá hẳn, git nhớ hộ.
- File cấu hình mẫu: commit bản `.example` (vd `.env.example`), bản thật đưa vào `.gitignore`.

### Xoá / đổi tên

- Đổi tên file phải đổi tên class/component bên trong cho khớp và cập nhật mọi import/đăng ký DI.
- Trước khi xoá file, grep toàn repo để chắc không còn tham chiếu.

## Review bản thân trước khi commit

- Build sạch, không warning mới.
- Không còn `console.log` / `Console.WriteLine` debug.
- Không còn code chết, import thừa.
