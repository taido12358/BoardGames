# Rule: UI

> Quy tắc xây dựng giao diện: component structure, responsive, accessibility.

## Nguyên tắc chung

- **Mobile-first.** Layout chuẩn của màn chơi: `max-w-md mx-auto`, flex-col, thứ tự: Status bar → Board → Messages → Leave button.
- **Trạng thái nào cũng phải nhìn thấy được.** Người dùng không bao giờ phải đoán vì sao không thao tác được — bài học từ bug "không thể di chuyển quân". Bắt buộc hiển thị:
  - Đang chờ đối thủ: banner Waiting (kèm ghi chú hai tab cùng trình duyệt dùng chung tên).
  - Chưa đến lượt: "⏳ Chờ đối thủ đi…".
  - Là khán giả: "👁 đang xem".
  - Mất kết nối / lỗi invoke: hiển thị message lỗi, không chỉ log console.
- Loading / empty / error là ba state phải thiết kế cho **mọi** màn hình có dữ liệu từ server.

## Component structure

- Tách rõ: component **platform** (lobby, khung phòng) và component **theo game** (board như `VayBatBoard`). Board không chứa logic lobby và ngược lại.
- Logic realtime dồn vào hook (`useGameRoomHub`); component board chỉ nhận state + callback. Chi tiết: `rule-component.md`.

## Tương tác trên board (SVG)

- Dùng **Pointer Events API**, không dùng HTML5 Drag & Drop (không hoạt động với SVG):
  - `onPointerDown` → chọn quân, `setPointerCapture`.
  - `onPointerMove` → ghost piece theo con trỏ.
  - `onPointerUp` → snap vào ô hợp lệ gần nhất (threshold 40px SVG units).
- Click/tap phải luôn hoạt động song song với kéo-thả (chọn quân → chọn ô).
- SVG board bắt buộc `touch-action: none` (`touch-none`) để không cuộn trang khi chơi trên điện thoại.

## Responsive

- Dùng đơn vị tương đối + flex/grid; board SVG scale theo viewBox, không fix pixel.
- Vùng chạm tối thiểu ~40px cho mọi target trên mobile.
- Test ở bề rộng 360px (điện thoại nhỏ) trước khi coi là xong.

## Accessibility

- Nút thao tác là `<button>`, không phải `<div onClick>`.
- Ảnh/icon có ý nghĩa phải có `aria-label` hoặc text thay thế; icon thuần trang trí `aria-hidden`.
- Trạng thái quan trọng (đến lượt, thắng/thua) không truyền đạt bằng màu đơn thuần — kèm text/icon (xem `rule-color.md`).
- Đảm bảo focus visible và thao tác được bằng bàn phím ở lobby/form.
