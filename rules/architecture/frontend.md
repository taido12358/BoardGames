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

## Trạng thái tương tác BANG! (2026-10-24)
- BangBoard hủy lựa chọn lá/mục tiêu/bỏ bài khi đổi phòng, lượt, giai đoạn hoặc người đang đi. Không giữ thao tác từ lượt cũ qua bản cập nhật server.
- Bài chưa phù hợp giai đoạn được vô hiệu hóa; HP luôn lấy từ state server. Người chơi chỉ chọn lá/phòng thủ/chịu đòn, không chỉnh HP thủ công.
- Debug Bang mặc định tắt kể cả Development; chỉ bật tường minh bằng Debug:BangPanelEnabled khi cần kiểm thử.


## Phục hồi thao tác tại GameDetails (2026-10-24)
- enginesError hiển thị trạng thái lỗi và nút retry; không tiếp tục skeleton khi request đã thất bại.
- Tạo phòng, tìm trận, hủy phòng dùng khóa thao tác chung và try/catch/finally để không kẹt loading khi fetch reject. Lỗi đặt ngay trong khu vực chơi.


## Tải dữ liệu phòng và lỗi sảnh (2026-10-24)
- roomsLoading/roomsError tách khỏi error của room/hub. fetchRooms giữ cache khi lỗi, không nuốt lỗi mạng.
- LobbyLoadStatus dùng chung ở GameLibrary/GameDetails. Empty state chỉ hiện khi không tải và không lỗi; retry giữ đúng scope trò chơi.
- Chỉ request fetchRooms mới nhất được cập nhật kết quả/trạng thái; response cũ bị bỏ qua khi người dùng chuyển trang nhanh. Realtime vẫn cập nhật qua useLobbyHub, không polling.


## RoomRoute: lỗi tải phòng (2026-10-24)
- Lỗi REST vào phòng dùng local loadError, hiển thị trước nhánh loading/board. Không chỉ set error trong store khi chưa có board để render lỗi.
- Thử vào lại tăng loadAttempt để chạy lại fetch; reset notFound/loadError theo lần tải. Phân biệt phòng không tồn tại và lỗi phiên/quyền truy cập.


## Xác nhận gửi chat (2026-10-24)
- sendChatMessage trong hub action trả Promise<boolean> (true sau khi invoke hoàn tất, false nếu lỗi/mất kết nối). ChatPanel giữ nội dung cho đến khi server xác nhận.
- Gửi thất bại giữ draft và lỗi local, không tự gửi lại; khóa yêu cầu trùng và cho người dùng chủ động retry. ChatPanel được key theo roomId để draft không đi sang phòng khác.


## Tìm kiếm lịch sử (2026-10-24)
- GameHistoryPage debounce 300ms; cleanup hủy timer, abort fetch và active guard chặn mọi response cũ khi query đổi/unmount.
- Retry giữ nguyên query; loading/error/empty/results tách biệt để không trình bày kết quả cũ như dữ liệu query mới.


## Hiển thị replay (2026-10-24)
- Tải replay hủy request và chặn response cũ khi roomId đổi/unmount; retry giữ id. Reset replay trước lượt tải.
- Diễn biến hiển thị mô tả hành động Bang và tên theo seats; JSON gốc nằm trong details cho tra cứu. Không suy diễn kết quả sát thương từ move vì replay hiện chưa lưu state tái tạo.


## Tabs hướng dẫn và truy cập (2026-10-24)
- GameInstructions dùng roving tabIndex; mũi tên trái/phải và Home/End đồng bộ lựa chọn + focus. Tab tiếp theo đưa vào nội dung panel.
- useId cấp id riêng mỗi instance; aria-controls/aria-labelledby kết nối tab/panel; panel có viền focus rõ.


## Đổi tên tại chỗ (2026-10-24)
- DisplayNameEditor dùng saveLock để chặn gửi trùng; khóa sửa/hủy trong khi request chưa xong, phục hồi trạng thái bằng finally.
- Validate rỗng giữ draft/form và thông báo lỗi; lỗi mạng giữ bản nháp cho retry. Không lưu khi Enter còn đang IME composition.


## Tìm kiếm thư viện (2026-10-24)
- Query và metadata chuẩn hóa dấu NFD/combining marks, đ/d, lowercase; mọi từ query đều phải xuất hiện, không ràng buộc thứ tự. Không thay đổi tên hiển thị gốc.
- Xóa từ khóa giữ filter; xóa bộ lọc trong empty state vẫn khôi phục cả query và filter như trước.


## Trạng thái tương tác các board (2026-10-24)
- Ô Ăn Quan và Đua Xe chỉ gửi nước đi khi connected và đúng lượt; UI khóa đồng bộ, server vẫn validate luật.
- selectedPit của Ô Ăn Quan hủy khi đổi phòng/lượt/status/kết nối để không tái dùng lựa chọn cũ sau reconnect.


## Vây Bắt — vòng đời tương tác SVG (2026-10-24)
- canInteract = đúng lượt và connected; kiểm tra tại pointer-down/move/up để thao tác kéo dài không vượt qua thay đổi lượt/kết nối.
- Reset selected/drag/press khi room/status/turn/winner/connection/side đổi; reconnect không phục hồi thao tác đang kéo.


## Thông báo trạng thái phòng (2026-10-24)
- RoomShell dùng role status cho tiến trình kết nối lại/người chơi mất kết nối; role alert cho mất kết nối máy chủ/lỗi thao tác. Thông báo dài break-words, không tràn layout.


## Nhật ký BANG! và vị trí cuộn (2026-10-24)
- GameLogPanel chỉ scrollTo bên trong container khi đang ở cuối; không dùng scrollIntoView gây cuộn trang. Người đọc dòng cũ được giữ vị trí và có nút xem diễn biến mới nhất.


## OTP cooldown (2026-10-24)
- Bộ đếm gửi lại dùng deadline thời gian thực; interval chỉ cập nhật hiển thị, không quyết định thời gian đã trôi qua. Dọn timer sau đăng nhập thành công/đăng xuất. Backend vẫn enforce rate limit.


## Đăng xuất (2026-10-24)
- AuthStore giữ user khi logout chưa được server xác nhận; loggingOut/logoutError tách khỏi lỗi form OTP. HTTP401 được coi là phiên đã hết.
- Logout thành công dọn dữ liệu phòng/cache/chat của phiên cũ, App trở về form đăng nhập. Không xóa cookie HttpOnly từ JavaScript.


## Khôi phục phiên và mạng lỗi (2026-10-24)
- AuthStore.sessionError tách khỏi form OTP/logout. GET me trả401 mới xác nhận chưa đăng nhập; lỗi mạng/HTTP khác hiển thị màn retry ở App.
- checking bật lại ở mỗi restoreSession; retry không yêu cầu mã OTP nếu cookie vẫn hợp lệ.


## Vòng đời realtime (2026-10-24)
- ConnectionState thêm connecting, start thành công mới connected. Reconnect chỉ connected sau JoinRoom/SubscribeLobby hoàn tất; đăng ký lỗi đưa disconnected + thông báo.
- Callback lifecycle kiểm tra active để connection đã unmount không ghi đè trạng thái của instance mới.


## Yêu cầu trước realtime ready (2026-10-24)
- joinRoom chờ readyRef (start promise), không invoke trong Connecting; connection instance thay đổi thì bỏ yêu cầu cũ.
- lobbyWanted ghi nhớ subscribe trước connection ready, start thực hiện đăng ký này; unsubscribe xóa nhu cầu trước khi gửi server.


## Hủy vào phòng đang chờ (2026-10-24)
- joinRoom nhận AbortSignal tùy chọn để hủy trước khi invoke nếu start còn pending. RoomRoute dùng controller chung cho REST và join, cleanup khi route/attempt đổi.
- Tín hiệu hủy ngăn gửi mới, không thu hồi invoke đã gửi server.


## Danh sách phòng quản trị (2026-10-24)
- fetchRooms admin chỉ nhận kết quả từ request mới nhất; phản hồi cũ không cập nhật rooms/error/loading. Retry trên trang giữ filter hiện tại; không hiển thị bảng lỗi thời khi tải lỗi.


## Điều hướng tiêu điểm (2026-10-24)
- App cung cấp skip link tới main-content, tất cả nhánh main có tabIndex=-1. ScrollToTop focus main khi pathname đổi, bỏ qua lần mount đầu để giữ autofocus form.


## Mời vào phòng chờ (2026-10-24)
- RoomInvite hiển thị ở RoomRoute cho Waiting, dùng URL origin/pathname hiện tại. Không thay đổi quyền vào phòng; người nhận vẫn đăng nhập và server validate ghế.
- Clipboard failure không mất liên kết: input readonly cho sao chép thủ công, notice role status.


## URL bộ lọc thư viện (2026-10-24)
- GameLibrary lấy q/filter từ URL; updates dùng replace để không tạo history mỗi phím. Back về URL cũ và reload giữ lựa chọn.
- Xóa từ khóa chỉ xóa q; Xóa bộ lọc xóa q+filter trong một cập nhật, giữ params khác.


## Vị trí đọc chat (2026-10-24)
- ChatPanel chỉ tự scroll khi ở cuối; đọc tin cũ giữ vị trí, hiện nút xem tin mới. Mở lại hoặc chọn mới nhất phục hồi theo dõi, không tự thay đổi vị trí trang.


## Lỗi thao tác phòng (2026-10-24)
- GameStore đọc error string do controller trả cho create/cancel/quickMatch. Phản hồi không đúng JSON/shape dùng message dự phòng; 401 hướng dẫn đăng nhập lại. Không đưa HTML lỗi lên UI.


## Chơi ngay và tải chậm (2026-10-24)
- GameDetails chỉ xử lý play=1 khi gameReady/panel mount; ref tránh auto-scroll lặp do cập nhật dữ liệu. Panel là region focusable, manual Chơi ngay cũng focus trước scroll.


## BANG! quyền tấn công (2026-10-24)
- BangYourView.canFire do server cung cấp; frontend false vô hiệu Bang/Gatling/Calamity Missed ở Action. RESPOND không dùng gate này.
- Optional client field phục vụ rollout khác phiên bản; không có field vẫn để server validate như trước.


## Ngữ cảnh nhắm mục tiêu BANG! (2026-10-24)
- ActionBar hiển thị tên lá/số mục tiêu theo state hiện tại; chọn ghế kiểm tra lại canPlayCard và target validity trước gửi. Server vẫn xác thực nước đi.


## Tùy chọn phòng và đổi trò chơi (2026-10-24)
- GameDetails giữ optionDraft kèm gameKey; chỉ dùng options khi gameKey khớp, trò mới dùng mặc định. Tránh chuyển lựa chọn seatCount/maxRedTurns từ trò cũ qua route mới.


## Callback thao tác phòng và lifecycle trang (2026-10-24)
- GameDetails dùng pageVersion theo gameKey/cleanup; handler cũ không navigate/finally mở khóa trang mới sau khi chuyển trò. Backend request đã gửi vẫn có thể hoàn tất; UI bỏ tác động điều hướng cũ.


## BANG! phím hủy lựa chọn (2026-10-24)
- Escape bên trong board hủy selected card/discarding, không gửi nước đi hoặc thay đổi phase server. Bỏ qua IME composition; chat ngoài board không bị bắt phím.


## Trạng thái chọn bài bỏ (2026-10-24)
- HandFan bật selectionMode khi selectedIds được truyền; CardView aria-pressed phản ánh lựa chọn. Hết quota chỉ khóa bài chưa chọn, lá đã chọn vẫn bấm để bỏ chọn.


## Input số tùy chọn Vây Bắt (2026-10-24)
- Giữ draft string khi đang nhập; không ép số thay thế ở mỗi phím. Chỉ publish số nguyên hợp lệ, blur invalid khôi phục cấu hình trước đó; server vẫn validate options.


## OTP yêu cầu đồng thời (2026-10-24)
- requestOtp/verifyOtp guard loading trong authStore, không chỉ dựa disabled ở form. Chặn gửi mail trùng và xác thực trùng tiêu tốn attempts khi click/Enter liên tiếp.


## Hợp nhất snapshot và realtime sảnh (2026-10-24)
- Trong fetchRooms, track id nhận upsert/remove. Snapshot trễ không thay state của các id này; isMine vẫn lấy REST per-user vì broadcast không có quyền đúng người. Bộ changed ids chỉ sống trong request và cleanup finally.


## Dọn game state theo phiên (2026-10-24)
- AuthStore logout thành công gọi gameStore.resetSession; action này vừa xóa cache/room/chat/ghế vừa vô hiệu request fetchRooms cũ bằng request id. Không chỉ setState xóa data khi còn request đang chạy.


## Realtime callback dữ liệu sau cleanup (2026-10-24)
- Mọi data event từ connection instance đều kiểm tra active trước ghi gameStore, tương tự lifecycle callbacks; connection đã unmount không được nạp lại dữ liệu phiên cũ.


## Tên trò chơi trong bản ghi (2026-10-24)
- getGameTitle tại gameRegistry phục vụ history/replay; dùng metadata.title đã đăng ký, fallback gameKey khi chưa có metadata để bản ghi cũ/game mới vẫn hiển thị.


## Định dạng thời gian (2026-10-24)
- formatTimestamp dùng chung history/admin/chat, kiểm tra Date.getTime NaN và fallback —. vi-VN theo thời gian địa phương; options giờ/phút dùng cho chat.


## BANG! thiếu lá phản hồi (2026-10-24)
- ActionBar dùng hasDefenseCard từ hand + allowedResponseKinds để giải thích thiếu bài và lựa chọn hợp lệ. Không tự động RESPOND khi hand thiếu bài, giữ quyền quyết định người chơi.


## Điều hướng history/replay giữ query (2026-10-24)
- History q là URL state; replay Link nhận historySearch trong navigation state và dựng lại /history?query khi quay về. Mở replay trực tiếp fallback /history; luôn giữ pathname nội bộ cố định.


## Thống kê quản trị và tải lỗi (2026-10-24)
- AdminStore statsLoading/statsError riêng với danh sách phòng. Giữ số cũ khi lỗi nhưng hiển thị cảnh báo/retry; fetchStats guard khi đang chạy.
- Effect fetchStats theo isAdmin, không theo filter phòng; thống kê là toàn hệ thống.

## Quyền admin khi không kết nối được
- `isAdmin=null` biểu thị chưa có kết quả; `accessError` biểu thị request thất bại. Không đổi lỗi mạng/5xx thành `false`, vì UI sẽ báo nhầm truy cập bị từ chối.
- HTTP 401/403 và kết quả `{ isAdmin: false }` mới biểu thị người dùng không có quyền. Nút thử lại gọi lại cùng `checkAdmin`.
- `getGameTitle(gameKey)` lấy title metadata nếu game đã đăng ký, nếu chưa thì định dạng key thành nhãn dự phòng cho history/replay.

