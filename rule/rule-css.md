# Rule: CSS / Tailwind

> Quy tắc viết CSS/Tailwind: class naming, layout, spacing.

## Tailwind là mặc định

- Style bằng **Tailwind utility class** trực tiếp trong JSX. CSS file riêng chỉ cho: keyframe animation phức tạp, style SVG không làm được bằng utility, global reset.
- ❌ Không inline `style={{...}}` trừ giá trị động thật sự (toạ độ ghost piece theo con trỏ).
- ❌ Không dùng `!important` / prefix `!` trừ khi override thư viện bên thứ ba, kèm comment lý do.

## Class naming (khi phải viết CSS riêng)

- kebab-case, theo tinh thần BEM giản lược: `.board-cell`, `.board-cell--selected`.
- Không đặt tên theo hình thức (`.red-box`) — đặt theo vai trò (`.error-banner`).

## Layout

- Flexbox/Grid cho mọi layout; không float, không position absolute để dàn trang (absolute chỉ cho overlay: ghost piece, badge, banner đè board).
- Màn chơi theo layout chuẩn mobile-first: `max-w-md mx-auto` + `flex flex-col` (xem `rule-ui.md`).
- Board SVG: kích thước theo `viewBox` + `w-full`, không fix width/height pixel.
- Container tràn ngang (bảng, danh sách dài) tự cuộn bằng `overflow-x-auto`, không để body cuộn ngang.

## Spacing

- Chỉ dùng scale spacing của Tailwind (`p-2`, `gap-4`, `mt-6`…); ❌ không giá trị tuỳ ý `p-[13px]` trừ khi khớp toạ độ đồ hoạ.
- Ưu tiên `gap` trên flex/grid container thay vì margin từng con.
- Khoảng cách giữa các block dọc nhất quán trong một màn: chọn một nhịp (vd `space-y-4`) và giữ nguyên.

## Thứ tự class

- Viết theo nhóm để dễ đọc: layout → kích thước → spacing → typography → màu → border → effect → state (`hover:`, `disabled:`) → responsive (`md:`).
- Bật Prettier plugin sort class của Tailwind nếu có, để máy lo việc này.

## Trạng thái tương tác

- Style state bằng variant: `hover:`, `focus-visible:`, `active:`, `disabled:opacity-50` — không xử lý bằng JS đổi class thủ công khi CSS làm được.
- Trên board SVG nhớ `touch-none` (xem `rule-ui.md`).
