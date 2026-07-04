# Rule: Color

> Quy tắc sử dụng màu sắc: palette, theme, dark/light mode.

## Nguyên tắc

1. **Màu là hệ thống, không phải quyết định từng chỗ.** Mọi màu lấy từ palette đã định nghĩa (Tailwind theme / CSS variables), ❌ không hard-code mã hex rải rác trong component.
2. **Màu không bao giờ là kênh thông tin duy nhất.** Lượt đi, quân bị chọn, ô hợp lệ, thắng/thua — luôn kèm text, icon hoặc hình dạng (hỗ trợ người mù màu).
3. Contrast tối thiểu theo WCAG AA: 4.5:1 cho text thường, 3:1 cho text lớn và element đồ hoạ có ý nghĩa.

## Vai trò màu (semantic)

Đặt tên theo **vai trò**, không theo màu:

| Vai trò | Dùng cho |
|---|---|
| `primary` | Hành động chính (nút Tạo phòng, Vào phòng) |
| `surface` / `background` | Nền trang, nền card |
| `success` | Thắng, kết nối thành công |
| `warning` | Trạng thái chờ (Waiting), sắp hết lượt |
| `danger` | Lỗi, mất kết nối, thua |
| `muted` | Text phụ, khán giả, disabled |

## Màu trong game

- Hai phe dùng cặp màu phân biệt được với mọi loại mù màu (vd đỏ đậm / trắng-kem có viền), **không** dùng cặp đỏ/xanh lá thuần.
- Highlight ô đi hợp lệ: một màu nhất quán toàn dự án (hiện dùng xanh) + thay đổi hình dạng (chấm/viền) chứ không chỉ đổi màu nền.
- Mỗi game có thể có skin riêng cho board, nhưng màu UI platform (nút, banner, lỗi) phải thống nhất giữa các game.

## Dark/Light mode

- Nếu hỗ trợ theme: định nghĩa màu qua CSS variables / Tailwind `dark:` variant, component không tự biết theme.
- Mọi màu phải có cặp giá trị cho cả hai mode và được kiểm tra contrast ở cả hai.
- Không dùng đen thuần `#000` / trắng thuần `#fff` cho nền — dùng gray đậm/nhạt của palette.
