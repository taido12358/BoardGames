# Architecture: Frontend

## Phân loại & vị trí component

- **Component platform** (lobby, khung phòng, banner trạng thái, đăng nhập): dùng chung mọi game — sống trong `frontend/src/platform/`.
- **Component theo game** (board như `VayBatBoard`): chỉ biết game của nó, nhận state/callback từ ngoài — sống trong `frontend/src/games/<ten>/`.
- **Hook chứa logic, component chứa hiển thị**: mọi logic SignalR/kết nối nằm trong `useGameRoomHub` (`platform/useGameRoomHub.ts`); board không tự tạo connection.
- Điều hướng theo game (`components/GameView.tsx`) route theo `gameKey` sang board component tương ứng — đây là điểm nối duy nhất platform biết tới game cụ thể.

## Routing (react-router-dom v6, mở rộng route trong-ván ở rebuild 2026-09-05)

`App.tsx` bọc toàn app trong `<BrowserRouter>`. `GameView.tsx` giữ MỘT `useGameRoomHub()` connection cho toàn khu vực chơi game, LUÔN render `<Routes>` (không còn rẽ nhánh theo `gameStore.room` truthiness như trước rebuild):

- `/games` — Thư viện trò chơi.
- `/games/:gameKey` — chi tiết + tạo/vào phòng (`GameDetails`).
- `/games/:gameKey/room/:roomId` — **route trong-ván thật** (`components/RoomRoute.tsx`, mới): lúc mount, nếu `gameStore.room` chưa khớp `roomId` trên URL thì `GET /api/games/:roomId` (paint ngay, không chờ SignalR) rồi `joinRoom(roomId)`. Xử lý: 404 → "Không tìm thấy phòng"; `status` là `Cancelled`/`Abandoned` → banner "Phòng đã đóng", không render board; `Finished` → vẫn render board (xem lại kết quả); `Waiting`/`Playing` → render board theo `room.gameKey` (switch VayBat/Bang, y hệt logic cũ nhưng chuyển vị trí sang đây).
- Còn lại → redirect về `/games`.

Trước rebuild, việc "đang chơi hay chưa" chỉ dựa vào `gameStore.room` (bộ nhớ, không có trong URL) — F5 giữa ván mất sạch context, phòng `Playing` bị văng ra không cách nào join lại (danh sách chỉ hiện `Waiting`). Giờ mọi nút "Tạo phòng"/"Vào phòng"/"Vào lại ván đang chơi"/"Tìm trận nhanh" đều `navigate(/games/:gameKey/room/:roomId)` thay vì chỉ gọi `joinRoom` và chờ store đổi để `GameView` tự chuyển màn.

`joinRoom`/`makeMove`/`leaveRoom`/`subscribeLobby`/`unsubscribeLobby` từ `useGameRoomHub()` được cấp qua `platform/GameRoomHubContext.tsx` (React Context) — **không gọi `useGameRoomHub()` lần thứ hai** ở nơi khác, sẽ mở thêm một SignalR connection thừa.

`platform/ScrollToTop.tsx` (mount trong `<BrowserRouter>`) cuộn về đầu trang mỗi lần đổi route — React Router không tự làm việc này, khác hành vi điều hướng trang thường.

## Thư viện trò chơi (GameLibrary/GameDetails, từ 2026-08-05)

Thay cho `<select>` chọn game cũ (đã xoá `platform/Lobby.tsx`):

- `components/GameLibrary.tsx` — lưới thẻ game, tìm kiếm, bộ lọc. Nguồn danh sách game là **backend thật** (`gameStore.engines` ← `GET /api/games/engines`), không hard-code danh sách game trong component.
- `components/GameCard.tsx` — thẻ hiển thị (artwork CSS/emoji theo `accent`, không phải ảnh thật — chưa có asset artwork trong repo).
- `components/GameDetails.tsx` — trang chi tiết theo `gameKey` (route `/games/:gameKey`): hướng dẫn + tạo/vào phòng, dùng lại NGUYÊN `gameStore.createRoom`/`fetchRooms` (REST) và `joinRoom` (hub) — không có API mới.
- `components/GameInstructions.tsx` — dispatcher hiển thị tab hướng dẫn theo `InstructionSection[]` (nhiều `kind`: text/flow/roles/cards/characters/distanceDemo).
- `platform/gameLibraryTypes.ts` — kiểu `GameMetadata`/`InstructionSection` GENERIC, không gắn game cụ thể.
- `platform/gameRegistry.ts` — sổ đăng ký `gameKey -> {metadata, instructions}`. Game có trong `engines` nhưng chưa đăng ký ở đây vẫn hiển thị được (fallback metadata tối giản) — thêm game mới **không bắt buộc** phải sửa registry ngay, nhưng nên thêm để có UI đẹp.

**Thêm game mới vào Thư viện** = thêm `games/<ten>/metadata.ts` (export `GameMetadata`) + `games/<ten>/instructions.ts` (export `InstructionSection[]`) + (nếu cần UI tuỳ chọn tạo phòng riêng) `games/<ten>/CreateOptions.tsx` (component theo interface `CreateOptionsForm` trong `gameLibraryTypes.ts`) + đăng ký cả trong `gameRegistry.ts`. Không sửa `GameLibrary`/`GameCard`/`GameDetails`/`GameInstructions` — trước rebuild 2026-09-05, UI tuỳ chọn tạo phòng bị hard-code `if (gameKey === "vaybat" | "bang")` ngay trong `GameDetails.tsx`, vi phạm đúng nguyên tắc này; giờ mỗi game tự cung cấp `CreateOptionsForm` của mình.

## Sảnh realtime — không polling (từ rebuild 2026-09-05)

Trước rebuild, `GameLibrary.tsx` (4s) và `GameDetails.tsx` (3s) mỗi nơi tự `setInterval` gọi `GET /api/games` — hai vòng lặp độc lập cùng ghi vào 1 store slice. Giờ: `gameStore.fetchRooms()` chỉ gọi REST **một lần** lúc mount (paint đầu tiên) + `platform/useLobbyHub.ts` (mới) subscribe group SignalR `"lobby"` — mọi thay đổi sau đó đến qua event `"LobbyUpdated"` (xử lý trong `useGameRoomHub`, gọi `gameStore.upsertRoom`). `gameStore.roomsById` là map theo id (không phải mảng) để merge từng phần tử; `rooms` là mảng dẫn xuất, sort theo `createdAt` giảm dần.

**Lưu ý bắt buộc**: `LobbyUpdated` là broadcast dùng chung, `isMine` trong đó LUÔN `false` (server không biết đang gửi cho ai) — `gameStore.upsertRoom` không bao giờ hạ `isMine` từ `true` xuống `false` chỉ vì một sự kiện broadcast đến sau (chỉ REST per-caller mới là nguồn đúng cho `isMine`). Đừng "sửa" hành vi này tưởng là bug.

## Luồng dữ liệu & state

- **Server là nguồn sự thật** cho state ván đấu. Client render theo event `GameStateUpdated` từ SignalR, không tự tính rồi tin state cục bộ.
- State chia hai tầng: state **phòng** (room, status, error, danh sách người chơi, `connectionState`) sống trong `useGameRoomHub`/`gameStore`; state **chỉ board dùng** (quân đang chọn, vị trí ghost piece khi kéo) sống cục bộ trong board component.
- Auth state (`platform/authStore.ts`, zustand) tách khỏi game state (`platform/gameStore.ts`) — `displayName` sau đăng nhập được đồng bộ sang `gameStore.playerName`.
- `RoomDto.seats: SeatSlotDto[]` (đồng bộ với backend, độ dài luôn = `seatCount`, kể cả VayBat) — không còn nhánh `seatCount > 2` để chọn đọc `redPlayer/whitePlayer` hay `seats`. `RoomDto.ownerUserId`/`mySide`/`isMine` do SERVER tính sẵn theo người gọi — không tự so tên hiển thị ở frontend nữa (trước rebuild, nút "HUỶ" so `redPlayer === playerName`, chỉ cosmetic).

## Room-shell dùng chung giữa các game (từ rebuild 2026-09-05)

`platform/RoomShell.tsx` — `RoomStatusBanner`, `DisconnectBadge` (lặp `seats`, cảnh báo ghế `connected:false`), `ConnectionBanner` (dựa `gameStore.connectionState`), `RoomErrorBanner`, `LeaveRoomButton`. Trước rebuild, `VayBatBoard`/`BangBoard` mỗi board tự chế lại các banner này (khác chữ, khác style) dù `RoomDto` đã đủ generic — giờ cả hai board dùng chung, chỉ phần render bàn cờ/bài đặc thù là riêng.

## Mất kết nối / kết nối lại (fix bug reconnect, từ rebuild 2026-09-05)

`useGameRoomHub.ts` đăng ký `onreconnecting`/`onreconnected`/`onclose` (trước rebuild KHÔNG đăng ký gì — `withAutomaticReconnect()` gọi trơ, sau khi SignalR tự nối lại, client KHÔNG gọi lại `JoinRoom` nên server không nhận diện được connection mới, client im lặng ngừng nhận `GameStateUpdated` dù "trông có vẻ" đã kết nối lại). Giờ `onreconnected` đọc `room`/vị trí hiện tại MỚI NHẤT từ store (không dùng closure cũ) rồi gọi lại `JoinRoom`/`SubscribeLobby` tương ứng. `gameStore.connectionState` (`connected`/`reconnecting`/`disconnected`) điều khiển `ConnectionBanner`.

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
