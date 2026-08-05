# Coding: Frontend (TypeScript / React)

> Xem thêm nguyên tắc chung: [`general.md`](./general.md). Kiến trúc component (platform vs. game, hook pattern): [`../architecture/frontend.md`](../architecture/frontend.md).

## TypeScript

### Strict mode

- `tsconfig.json` phải bật `"strict": true` (bao gồm `strictNullChecks`, `noImplicitAny`).
- ❌ Không dùng `any`. Cần kiểu chưa biết → `unknown` rồi narrow bằng type guard.
- ❌ Hạn chế `as` cast; chỉ dùng ở biên (parse JSON từ server) và phải có kiểu đích rõ ràng.
- `@ts-ignore` / `@ts-expect-error` chỉ khi bất khả kháng, kèm comment lý do.

### Interface / type / enum

- `interface` cho shape của object (props, DTO từ API); `type` cho union, mapped type, alias.
- Kiểu dữ liệu trao đổi với backend (room, move, state) khai báo **một nơi duy nhất** và tái sử dụng — không định nghĩa lại inline ở mỗi component.
- Ưu tiên **string literal union** thay cho `enum`:
  ```ts
  type RoomStatus = 'Waiting' | 'Playing' | 'Finished';
  ```
  Khớp với giá trị JSON backend gửi xuống, không sinh code thừa.
- Giá trị có thể vắng: khai báo tường minh `| null` / `| undefined`, không để ngầm.

### Kiểu cho dữ liệu game

- `mapJson` / `stateJson` / `moveJson` là shape riêng của từng game → khai báo type theo game (`VayBatState`, `VayBatMove`), không dùng type chung `object`.
- Khi parse dữ liệu JSONB từ server, validate tối thiểu trước khi dùng (field bắt buộc tồn tại) — dữ liệu từ mạng luôn có thể sai shape.

### Hàm & generic

- Khai báo kiểu trả về tường minh cho hàm export/public; hàm nội bộ nhỏ được phép infer.
- Generic chỉ khi thật sự tái sử dụng với nhiều kiểu; không generic hoá "cho tương lai".

### Khác

- `const` mặc định; `let` khi thật sự gán lại; không `var`.
- Bật ESLint với `@typescript-eslint`; lỗi lint phải sửa, không tắt rule tràn lan (xem [`testing.md`](./testing.md)).

## JavaScript / async

- Dùng ES modules (`import`/`export`), không CommonJS trong source frontend.
- Dùng cú pháp hiện đại: destructuring, spread, optional chaining `?.`, nullish coalescing `??` — nhưng không lạm dụng chain dài khó đọc.
- So sánh bằng `===` / `!==`, không `==`.
- Dùng `async/await` thay cho `.then()` chain.
- **Mọi promise phải được await hoặc xử lý** — promise trôi nổi (floating promise) là bug tiềm ẩn, đặc biệt với `connection.invoke(...)` của SignalR.
- Chạy song song các việc độc lập: `await Promise.all([...])`, không await tuần tự vô ích.
- Không `async` trong `useEffect` callback trực tiếp — khai báo hàm async bên trong rồi gọi.
- `try/catch` tại nơi **có thể làm gì đó** với lỗi: hiển thị lên UI, retry, hoặc chuyển trạng thái. Không catch chỉ để log rồi nuốt.
- **Lỗi network/SignalR phải đến được người dùng** qua UI state (`setError`), không dừng ở `console.error` — bài học từ bug "không thể di chuyển quân".
- Không mutate tham số đầu vào và state trực tiếp (React yêu cầu immutable update).
- Không dùng `eval`, `new Function`, `with`.
- Xử lý JSON từ ngoài: `JSON.parse` luôn trong try/catch hoặc qua helper chung.

## Component

### Props

- Định nghĩa props bằng `interface` TypeScript, đặt tên `<Component>Props`.
- Props là **dữ liệu + callback**, không truyền cả object "god" (vd cả hub connection) khi chỉ cần vài field.
- Callback đặt tên `on<Event>`: `onMove`, `onLeave`; handler nội bộ đặt `handle<Event>`.
- Props ≥ ~7 cái → xem lại thiết kế: gom nhóm thành object có nghĩa hoặc tách component.
- Không drill props qua > 2 tầng — tách hook hoặc dùng context cho dữ liệu phòng chơi.

### State management

- **State ở thấp nhất có thể**: state chỉ board dùng (quân đang chọn, ghost piece) nằm trong board; state của phòng (room, status, error) nằm trong hook `useGameRoomHub`.
- **Server là nguồn sự thật** cho state ván đấu. Client không tự tính state sau nước đi rồi tin vào đó — render theo `GameStateUpdated` từ server; optimistic update (nếu có) phải bị ghi đè bởi state server.
- Không mutate state trực tiếp — luôn tạo object/array mới.
- State phái sinh (có thể tính từ props/state khác, vd `myTurn`) thì **tính ra**, không lưu thành state riêng dễ lệch.
- Lỗi là state hiển thị được: mọi lỗi invoke/kết nối đi vào `error` state và render ra UI.

### Reusability & kích thước

- Trước khi viết component mới, tìm component/hook sẵn có.
- Component tái sử dụng không hard-code text/màu của một game cụ thể — nhận qua props.
- Đừng generic hoá sớm: dùng ở đúng 1 chỗ thì cứ để cụ thể, chỗ thứ 3 mới trừu tượng hoá.
- Một file một component chính; component > ~250 dòng → tách phần render con hoặc rút logic ra hook.
- Subcomponent chỉ dùng nội bộ được phép nằm cùng file.

## CSS / Tailwind

- Style bằng **Tailwind utility class** trực tiếp trong JSX. CSS file riêng chỉ cho: keyframe animation phức tạp, style SVG không làm được bằng utility, global reset.
- ❌ Không inline `style={{...}}` trừ giá trị động thật sự (toạ độ ghost piece theo con trỏ).
- ❌ Không dùng `!important` / prefix `!` trừ khi override thư viện bên thứ ba, kèm comment lý do.
- Class riêng (khi phải viết CSS): kebab-case, tinh thần BEM giản lược (`.board-cell`, `.board-cell--selected`), đặt theo **vai trò** không theo hình thức.
- Layout: Flexbox/Grid cho mọi layout; không float, không position absolute để dàn trang (absolute chỉ cho overlay: ghost piece, badge, banner đè board).
- Board SVG: kích thước theo `viewBox` + `w-full`, không fix width/height pixel.
- Container tràn ngang (bảng, danh sách dài) tự cuộn bằng `overflow-x-auto`, không để body cuộn ngang.
- Spacing: chỉ dùng scale của Tailwind (`p-2`, `gap-4`, `mt-6`…); ❌ không giá trị tuỳ ý `p-[13px]` trừ khi khớp toạ độ đồ hoạ. Ưu tiên `gap` trên flex/grid container thay vì margin từng con.
- Thứ tự class: layout → kích thước → spacing → typography → màu → border → effect → state (`hover:`, `disabled:`) → responsive (`md:`).
- Style state bằng variant (`hover:`, `focus-visible:`, `active:`, `disabled:opacity-50`) — không xử lý bằng JS đổi class thủ công khi CSS làm được.
- Board SVG bắt buộc `touch-none` (`touch-action: none`).

## Màu sắc

1. **Màu là hệ thống, không phải quyết định từng chỗ.** Mọi màu lấy từ palette đã định nghĩa (Tailwind theme / CSS variables), ❌ không hard-code mã hex rải rác trong component.
2. **Màu không bao giờ là kênh thông tin duy nhất.** Lượt đi, quân bị chọn, ô hợp lệ, thắng/thua — luôn kèm text, icon hoặc hình dạng (hỗ trợ người mù màu).
3. Contrast tối thiểu theo WCAG AA: 4.5:1 cho text thường, 3:1 cho text lớn và element đồ hoạ có ý nghĩa.

Vai trò màu đặt tên theo **vai trò**, không theo màu: `primary` (hành động chính), `surface`/`background`, `success`, `warning` (chờ), `danger` (lỗi/thua), `muted` (phụ/disabled).

- Hai phe trong game dùng cặp màu phân biệt được với mọi loại mù màu (vd đỏ đậm / trắng-kem có viền), **không** dùng cặp đỏ/xanh lá thuần.
- Highlight ô đi hợp lệ: một màu nhất quán toàn dự án (hiện dùng xanh) + thay đổi hình dạng (chấm/viền) chứ không chỉ đổi màu nền.
- Mỗi game có thể có skin riêng cho board, nhưng màu UI platform (nút, banner, lỗi) phải thống nhất giữa các game.
- Nếu hỗ trợ dark/light theme: định nghĩa màu qua CSS variables / Tailwind `dark:` variant, component không tự biết theme; không dùng đen/trắng thuần cho nền.

## UI & Accessibility

- **Mobile-first.** Layout chuẩn của màn chơi: `max-w-md mx-auto`, flex-col, thứ tự: Status bar → Board → Messages → Leave button.
- **Trạng thái nào cũng phải nhìn thấy được.** Người dùng không bao giờ phải đoán vì sao không thao tác được — bài học từ bug "không thể di chuyển quân". Bắt buộc hiển thị: đang chờ đối thủ (banner Waiting), chưa đến lượt ("⏳ Chờ đối thủ đi…"), là khán giả ("👁 đang xem"), mất kết nối/lỗi invoke (message lỗi, không chỉ log console).
- Loading / empty / error là ba state phải thiết kế cho **mọi** màn hình có dữ liệu từ server.
- Tương tác trên board SVG dùng **Pointer Events API**, không HTML5 Drag & Drop — chi tiết kiến trúc: [`../architecture/frontend.md`](../architecture/frontend.md).
- Click/tap phải luôn hoạt động song song với kéo-thả (chọn quân → chọn ô).
- Vùng chạm tối thiểu ~40px cho mọi target trên mobile; test ở bề rộng 360px trước khi coi là xong.
- Nút thao tác là `<button>`, không phải `<div onClick>`.
- Ảnh/icon có ý nghĩa phải có `aria-label` hoặc text thay thế; icon thuần trang trí `aria-hidden`.
- Trạng thái quan trọng (đến lượt, thắng/thua) không truyền đạt bằng màu đơn thuần — kèm text/icon.
- Đảm bảo focus visible và thao tác được bằng bàn phím ở lobby/form.

## Logging (frontend)

- Lỗi ảnh hưởng người dùng phải hiển thị lên UI (xem trên); `console.error` chỉ là kênh phụ cho dev.
- Log vòng đời kết nối SignalR (connected/reconnecting/closed) để chẩn đoán bug realtime.
