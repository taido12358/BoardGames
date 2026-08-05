# Architecture: Frontend

## Phân loại & vị trí component

- **Component platform** (lobby, khung phòng, banner trạng thái, đăng nhập): dùng chung mọi game — sống trong `frontend/src/platform/`.
- **Component theo game** (board như `VayBatBoard`): chỉ biết game của nó, nhận state/callback từ ngoài — sống trong `frontend/src/games/<ten>/`.
- **Hook chứa logic, component chứa hiển thị**: mọi logic SignalR/kết nối nằm trong `useGameRoomHub` (`platform/useGameRoomHub.ts`); board không tự tạo connection.
- Điều hướng theo game (`components/GameView.tsx`) route theo `gameKey` sang board component tương ứng — đây là điểm nối duy nhất platform biết tới game cụ thể.

## Luồng dữ liệu & state

- **Server là nguồn sự thật** cho state ván đấu. Client render theo event `GameStateUpdated` từ SignalR, không tự tính rồi tin state cục bộ.
- State chia hai tầng: state **phòng** (room, status, error, danh sách người chơi) sống trong `useGameRoomHub`; state **chỉ board dùng** (quân đang chọn, vị trí ghost piece khi kéo) sống cục bộ trong board component.
- Auth state (`platform/authStore.ts`, zustand) tách khỏi game state (`platform/gameStore.ts`) — `displayName` sau đăng nhập được đồng bộ sang `gameStore.playerName`.

## Tương tác trên board (SVG) — Pointer Events, không HTML5 DnD

Quyết định kiến trúc: dùng **Pointer Events API** thay vì HTML5 Drag & Drop, vì HTML5 DnD không hoạt động đúng với phần tử SVG.

- `onPointerDown` trên SVG → phát hiện quân gần con trỏ, `setPointerCapture`.
- `onPointerMove` → cập nhật vị trí ghost piece (quân "ma" theo ngón tay/chuột).
- `onPointerUp` → snap vào ô hợp lệ gần nhất (threshold 40px SVG units).
- Click/tap hoạt động song song với kéo-thả: nhấn quân → chọn; nhấn ô hợp lệ → đi.
- `touch-action: none` (`touch-none`) trên SVG ngăn browser cuộn trang khi chơi trên điện thoại.

Quy ước code cụ thể (CSS, spacing, màu, accessibility): [`../coding/frontend.md`](../coding/frontend.md).

## Layout chuẩn màn chơi

Mobile-first: `max-w-md mx-auto`, flex-col. Thứ tự: Status bar → Board → Messages → Leave button.

## Kết nối realtime

- Một hub connection dùng chung cho vòng đời trang chơi, quản lý trong `useGameRoomHub`.
- Lỗi `invoke` (mất kết nối SignalR) phải đi vào state `error` và hiển thị UI — không chỉ `console.error` (xem lịch sử bug "không thể di chuyển quân" trong [`../history/decisions.md`](../history/decisions.md)).
