# Tài nguyên game Zodiac

Thư mục chứa asset tĩnh của game (Vite serve trực tiếp từ `public/`).
Truy cập trong code qua URL: `/assets/games/zodiac/<thư-mục>/<file>`.

## Cấu trúc & số lượng

| Thư mục | Tài nguyên | Số lượng | Quy ước đặt tên file |
|---|---|---|---|
| `map/` | Bản đồ | 1 | `map.webp` |
| `characters/` | Nhân vật cung hoàng đạo | 24 | `<cung>-<số>.webp` — vd `aries-1.webp`, `aries-2.webp` |
| `tokens/` | Token nhân vật (chibi) | 6 | `token-1.webp` … `token-6.webp` |
| `cards/equipment/` | Thẻ trang bị | 48 | `equipment-01.webp` … `equipment-48.webp` |
| `cards/shop/` | Thẻ cửa hàng | 20 | `shop-01.webp` … `shop-20.webp` |
| `crates/` | Thùng đồ tiếp tế | 32 | `crate-01.webp` … `crate-32.webp` |
| `carts/` | Xe hàng | 6 | `cart-1.webp` … `cart-6.webp` |
| `dice/` | Xúc xắc | 1 | `dice.webp` (nếu cần từng mặt: `dice-face-1.webp` … `dice-face-6.webp`) |
| `effects/` | Hiệu ứng | 10–20 | `effect-<tên>.webp` — vd `effect-stun.webp` |

## Quy ước chung (theo `rules/coding/general.md`)

- Tên file **kebab-case, không dấu, không khoảng trắng**.
- Số thứ tự đệm 0 khi bộ ≥ 10 file (`equipment-01`, không phải `equipment-1`) để sort đúng.
- Định dạng ưu tiên: **WebP** (hoặc SVG cho icon/hiệu ứng vector); PNG chỉ khi cần thiết.
- Kích thước: tối ưu trước khi commit — thẻ bài ≤ ~200KB, bản đồ ≤ ~1MB.
- Không đổi tên file sau khi đã được tham chiếu trong code/data — tên file là ID.

## 12 cung hoàng đạo (slug chuẩn cho `characters/`)

`aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces`

24 nhân vật = 12 cung × 2 biến thể (`-1`, `-2`).
