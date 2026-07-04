# Rule: Documentation

> Quy tắc viết tài liệu: README, API docs, technical docs.

## Nguyên tắc chung

1. **Tài liệu sống cạnh thứ nó mô tả** và được cập nhật **trong cùng PR** với thay đổi code — tài liệu sai còn hại hơn không có.
2. Viết cho người mới vào dự án: không viết tắt tự chế, thuật ngữ nội bộ phải giải thích lần đầu dùng.
3. Tiếng Việt là ngôn ngữ chính của tài liệu nội bộ; thuật ngữ kỹ thuật giữ tiếng Anh (JSONB, hub, engine…), không dịch gượng.
4. Mô tả **hiện trạng**, không mô tả kế hoạch như thể đã xong. Kế hoạch ghi rõ "dự kiến".

## Các loại tài liệu & nơi ở

| Tài liệu | Vị trí | Nội dung |
|---|---|---|
| README | root | Dự án là gì, stack, cách chạy nhanh (`docker compose up --build`), link tài liệu khác |
| CLAUDE.md | root | Kiến trúc, quy ước, **lỗi đã sửa kèm nguyên nhân gốc** — cập nhật khi sửa bug đáng nhớ |
| Quy tắc | `rule/` | Index tại `rules.md`; mỗi mảng một file `rule-*.md` |
| API docs | Swagger/OpenAPI từ code | REST tự sinh từ controller; hub method mô tả bằng doc comment |

## Ghi lại bug đã sửa (bắt buộc)

Bug tốn > 1 buổi để chẩn đoán phải được ghi vào CLAUDE.md theo format đã có:

- **Triệu chứng** (message lỗi nguyên văn để search được)
- **Nguyên nhân gốc** (không phải triệu chứng bề mặt)
- **Fix** (kèm đoạn code/SQL cụ thể)
- **Nguyên tắc rút ra** (để không tái phạm)

## API docs

- REST: bật Swagger ở Development; mô tả response codes đúng thực tế trả về (xem `rule-api.md`).
- SignalR: duy trì bảng method hub + event broadcast (tên, tham số, payload shape) vì Swagger không cover.
- Shape của `MapJson`/`StateJson`/`MoveJson` từng game: mô tả trong tài liệu của game đó (`Games/<TênGame>/`), vì đây là contract giữa engine và board frontend.

## Chất lượng viết

- Ví dụ chạy được thật — copy-paste vào terminal phải chạy.
- Câu ngắn, chủ động; danh sách/bảng thay cho đoạn văn dài.
- Đường dẫn file, tên lệnh, tên cột đặt trong `code span`.
