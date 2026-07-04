# Rule: TypeScript

> Quy tắc viết TypeScript: kiểu dữ liệu, interface/type/enum, strict mode.

## Strict mode

- `tsconfig.json` phải bật `"strict": true` (bao gồm `strictNullChecks`, `noImplicitAny`).
- ❌ Không dùng `any`. Cần kiểu chưa biết → `unknown` rồi narrow bằng type guard.
- ❌ Hạn chế `as` cast; chỉ dùng ở biên (parse JSON từ server) và phải có kiểu đích rõ ràng.
- `@ts-ignore` / `@ts-expect-error` chỉ khi bất khả kháng, kèm comment lý do.

## Interface / type / enum

- `interface` cho shape của object (props, DTO từ API); `type` cho union, mapped type, alias.
- Kiểu dữ liệu trao đổi với backend (room, move, state) khai báo **một nơi duy nhất** và tái sử dụng — không định nghĩa lại inline ở mỗi component.
- Ưu tiên **string literal union** thay cho `enum`:
  ```ts
  type RoomStatus = 'Waiting' | 'Playing' | 'Finished';
  ```
  Khớp với giá trị JSON backend gửi xuống, không sinh code thừa.
- Giá trị có thể vắng: khai báo tường minh `| null` / `| undefined`, không để ngầm.

## Kiểu cho dữ liệu game

- `mapJson` / `stateJson` / `moveJson` là shape riêng của từng game → khai báo type theo game (`VayBatState`, `VayBatMove`), không dùng type chung `object`.
- Khi parse dữ liệu JSONB từ server, validate tối thiểu trước khi dùng (field bắt buộc tồn tại) — dữ liệu từ mạng luôn có thể sai shape.

## Hàm & generic

- Khai báo kiểu trả về tường minh cho hàm export/public; hàm nội bộ nhỏ được phép infer.
- Generic chỉ khi thật sự tái sử dụng với nhiều kiểu; không generic hoá "cho tương lai".

## Khác

- `const` mặc định; `let` khi thật sự gán lại; không `var`.
- Bật ESLint với `@typescript-eslint`; lỗi lint phải sửa, không tắt rule tràn lan (xem `rule-quality.md`).
