# Rule: Component

> Quy tắc tạo React component: reusability, props, state management.

## Phân loại & vị trí

- **Component platform** (lobby, khung phòng, banner trạng thái): dùng chung mọi game.
- **Component theo game** (board như `VayBatBoard`): chỉ biết game của nó, nhận state/callback từ ngoài.
- **Hook** chứa logic, component chứa hiển thị: mọi logic SignalR/kết nối nằm trong `useGameRoomHub`, board không tự tạo connection.

## Props

- Định nghĩa props bằng `interface` TypeScript, đặt tên `<Component>Props`.
- Props là **dữ liệu + callback**, không truyền cả object "god" (vd cả hub connection) khi chỉ cần vài field.
- Callback đặt tên `on<Event>`: `onMove`, `onLeave`; handler nội bộ đặt `handle<Event>`.
- Props ≥ ~7 cái → xem lại thiết kế: gom nhóm thành object có nghĩa hoặc tách component.
- Không drill props qua > 2 tầng — tách hook hoặc dùng context cho dữ liệu phòng chơi.

## State management

- **State ở thấp nhất có thể**: state chỉ board dùng (quân đang chọn, ghost piece) nằm trong board; state của phòng (room, status, error) nằm trong hook `useGameRoomHub`.
- **Server là nguồn sự thật** cho state ván đấu. Client không tự tính state sau nước đi rồi tin vào đó — render theo `GameStateUpdated` từ server; optimistic update (nếu có) phải bị ghi đè bởi state server.
- Không mutate state trực tiếp — luôn tạo object/array mới.
- State phái sinh (có thể tính từ props/state khác, vd `myTurn`) thì **tính ra**, không lưu thành state riêng dễ lệch.
- Lỗi là state hiển thị được: mọi lỗi invoke/kết nối đi vào `error` state và render ra UI (xem `rule-ui.md`).

## Reusability

- Trước khi viết component mới, tìm component/hook sẵn có.
- Component tái sử dụng không hard-code text/màu của một game cụ thể — nhận qua props.
- Đừng generic hoá sớm: dùng ở đúng 1 chỗ thì cứ để cụ thể, chỗ thứ 3 mới trừu tượng hoá.

## Kích thước & tách file

- Một file một component chính; component > ~250 dòng → tách phần render con hoặc rút logic ra hook.
- Subcomponent chỉ dùng nội bộ được phép nằm cùng file.
