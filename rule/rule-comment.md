# Rule: Comment

> Quy tắc comment code: documentation comment, TODO/FIXME convention.

## Nguyên tắc

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
4. Không comment-out code để "backup" — xoá hẳn, git nhớ hộ (xem `rule-file.md`).
5. Ngôn ngữ: tiếng Việt hoặc tiếng Anh đều được, nhất quán trong một file.

## Documentation comment

- C#: XML doc (`/// <summary>`) cho public API của platform — đặc biệt `IGameEngine` (contract mọi game phải theo), method hub, service public. Method private nhỏ không cần.
- TS: JSDoc cho hook/hàm export dùng chung (`useGameRoomHub`); props phức tạp giải thích ngay trong interface.
- Doc comment mô tả **hành vi và điều kiện lỗi** ("trả về MoveOutcome(false) khi JSON sai shape"), không lặp lại tên hàm.

## TODO / FIXME

Format thống nhất, grep được:

```
// TODO(tên-người): mô tả việc cần làm — vì sao chưa làm ngay
// FIXME(tên-người): mô tả cái đang sai/tạm bợ — điều kiện để sửa
// HACK(tên-người): giải pháp tình thế có chủ đích — kèm cách đúng là gì
```

- `TODO` = việc còn thiếu nhưng code hiện tại đúng; `FIXME` = code hiện tại có vấn đề đã biết; `HACK` = biết là xấu, cố ý.
- ❌ Không merge PR có `FIXME` cho chính tính năng PR đó đang làm — sửa luôn hoặc tách issue.
- TODO không có nội dung (`// TODO`) bị coi là rác — xoá hoặc viết đủ.
- Định kỳ (mỗi lần dọn dẹp) grep `TODO|FIXME|HACK` và xử lý hoặc chuyển thành issue.
