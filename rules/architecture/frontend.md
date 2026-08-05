# Architecture: Frontend

## Phân loại & vị trí component

- **Component platform** (lobby, khung phòng, banner trạng thái, đăng nhập): dùng chung mọi game — sống trong `frontend/src/platform/`.
- **Component theo game** (board như `VayBatBoard`): chỉ biết game của nó, nhận state/callback từ ngoài — sống trong `frontend/src/games/<ten>/`.
- **Hook chứa logic, component chứa hiển thị**: mọi logic SignalR/kết nối nằm trong `useGameRoomHub` (`platform/useGameRoomHub.ts`); board không tự tạo connection.
- Điều hướng theo game (`components/GameView.tsx`) route theo `gameKey` sang board component tương ứng — đây là điểm nối duy nhất platform biết tới game cụ thể.

## Routing (từ 2026-08-05, `react-router-dom` v6)

`App.tsx` bọc toàn app trong `<BrowserRouter>`. `GameView.tsx` giữ MỘT `useGameRoomHub()` connection cho toàn khu vực chơi game và tự quyết định hiển thị gì:

- Có `gameStore.room` (đã vào phòng) → render thẳng board đúng game (switch theo `room.gameKey`, không qua route riêng — vào ván không có URL riêng, giữ đúng hành vi cũ).
- Chưa có `room` → render `<Routes>`: `/games` (Thư viện trò chơi), `/games/:gameKey` (chi tiết + tạo/vào phòng), còn lại redirect về `/games`.

`joinRoom`/`makeMove`/`leaveRoom` từ `useGameRoomHub()` được cấp cho `GameDetails` qua `platform/GameRoomHubContext.tsx` (React Context) — **không gọi `useGameRoomHub()` lần thứ hai** ở nơi khác, sẽ mở thêm một SignalR connection thừa.

`platform/ScrollToTop.tsx` (mount trong `<BrowserRouter>`) cuộn về đầu trang mỗi lần đổi route — React Router không tự làm việc này, khác hành vi điều hướng trang thường.

## Thư viện trò chơi (GameLibrary/GameDetails, từ 2026-08-05)

Thay cho `<select>` chọn game cũ (đã xoá `platform/Lobby.tsx`):

- `components/GameLibrary.tsx` — lưới thẻ game, tìm kiếm, bộ lọc. Nguồn danh sách game là **backend thật** (`gameStore.engines` ← `GET /api/games/engines`), không hard-code danh sách game trong component.
- `components/GameCard.tsx` — thẻ hiển thị (artwork CSS/emoji theo `accent`, không phải ảnh thật — chưa có asset artwork trong repo).
- `components/GameDetails.tsx` — trang chi tiết theo `gameKey` (route `/games/:gameKey`): hướng dẫn + tạo/vào phòng, dùng lại NGUYÊN `gameStore.createRoom`/`fetchRooms` (REST) và `joinRoom` (hub) — không có API mới.
- `components/GameInstructions.tsx` — dispatcher hiển thị tab hướng dẫn theo `InstructionSection[]` (nhiều `kind`: text/flow/roles/cards/characters/distanceDemo).
- `platform/gameLibraryTypes.ts` — kiểu `GameMetadata`/`InstructionSection` GENERIC, không gắn game cụ thể.
- `platform/gameRegistry.ts` — sổ đăng ký `gameKey -> {metadata, instructions}`. Game có trong `engines` nhưng chưa đăng ký ở đây vẫn hiển thị được (fallback metadata tối giản) — thêm game mới **không bắt buộc** phải sửa registry ngay, nhưng nên thêm để có UI đẹp.

**Thêm game mới vào Thư viện** = thêm `games/<ten>/metadata.ts` (export `GameMetadata`) + `games/<ten>/instructions.ts` (export `InstructionSection[]`) + 1 dòng trong `gameRegistry.ts`. Không sửa `GameLibrary`/`GameCard`/`GameDetails`/`GameInstructions`.

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
