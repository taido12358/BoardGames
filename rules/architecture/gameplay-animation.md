# Animation trong lúc chơi

Tài liệu này ghi lại quy ước cho hiệu ứng trong ván của các trò chơi ở `frontend/src/games/` và giao diện phòng dùng chung ở `frontend/src/platform/`.

## Nguyên tắc

- State từ server là nguồn sự thật. Animation chỉ minh họa thay đổi đã được xác nhận; không tự thay luật, điểm số, vị trí quân hoặc quyền thao tác.
- Mỗi hiệu ứng gắn với sự kiện cụ thể (lá bài được xác nhận, quân di chuyển, ô thay đổi, lượt đổi, kết quả xuất hiện), không chạy lại chỉ vì component render.
- Thời gian giữ state hiệu ứng phải bao phủ cả delay, thời lượng chuyển động và nhịp kết thúc. Với nhiều sự kiện nối tiếp, giữ từng hiệu ứng đến hạn riêng để hiệu ứng mới không cắt hiệu ứng cũ.
- Hiệu ứng không được chặn tương tác hợp lệ. Trạng thái đang gửi hoặc luật lượt có thể khóa nút; lớp phủ trang trí phải `pointer-events: none`.
- Hỗ trợ `prefers-reduced-motion`: rút ngắn timer cùng CSS animation để nội dung và quân cờ không bị ẩn khi chuyển động tắt.
- Khi cùng một root component chuyển giữa phòng chờ và bàn chơi, dùng sequence class để khởi động lại hiệu ứng vào bàn; giữ class này riêng với animation mount ban đầu.

## Kỹ thuật chuyển động

- Ưu tiên `transform`/`translate` và `opacity` cho chuyển động thường xuyên. Tránh lặp animation các thuộc tính gây layout như `width`, `height`, `top` và `left`.
- Dùng easing có điểm dừng mềm cho quân/lá đáp xuống; stagger chỉ dùng khi nó giúp người chơi đọc thứ tự sự kiện.
- Với SVG, dùng animation transform hoặc lớp overlay theo tọa độ; dọn timer khi đổi phòng và unmount.
- Thay đổi từ snapshot liên tiếp cần được giữ độc lập theo phần tử. Dùng `useChangedIndices` để các ô/ghế đã đổi giữ dấu nhấn tới hết thời lượng của chúng.

## Các luồng đã có

- **BANG!**: lá bài bay từ tay tới khu vực chơi, lật mặt và lóe sáng; phản hồi đòn đánh, sát thương/hồi máu, trang bị, rút/bỏ/chuyển bài và kết quả ván có hiệu ứng riêng.
- Khi chọn mục tiêu BANG!, vòng sáng ghế chạy bằng `opacity`/`transform` trên viền phủ; quầng tĩnh giúp nhận biết mục tiêu mà không animate `box-shadow` liên tục. Reduced-motion giữ viền ở trạng thái tĩnh.
- Lá BANG! đang chờ server giữ trạng thái bằng viền vàng phủ và vùng sáng opacity; không animate filter/drop-shadow trên toàn lá. Reduced-motion tắt các pulse lặp vô hạn nhưng vẫn giữ viền/trạng thái chờ tĩnh.
- **Ô Ăn Quan**: hạt di chuyển theo đường rải, ô và điểm cập nhật theo nhịp bắt/thu quân; trạng thái gửi nước đi và kết quả cũng được thể hiện.
- Với reduced-motion, hạt gieo không bay; nhãn số quân thu hiện tĩnh tại điểm số 450ms để vẫn cho biết lượng thu.
- Khi gửi nước rải, trạng thái chờ có entrance ngắn; nút Hủy hướng rải có press/focus feedback cùng nhịp với các điều khiển khác.
- Thông báo đến lượt/chờ đối thủ ở Ô Ăn Quan và Vây Bắt có entrance ngắn mỗi khi quyền thao tác chuyển trạng thái.
- Hai nút chọn chiều rải rút hover/press transition xuống 1ms khi người dùng bật reduced-motion; mũi tên và trạng thái lựa chọn cũng đã theo thiết lập này.
- Nhịp nhấn nút gieo xúc xắc và nút chọn hướng rải dùng `translate` thay cho thay đổi `top`, tránh layout khi tương tác.
- **Vây Bắt**: quân có thể chọn/kéo/thả, hút nhẹ vào đích hợp lệ, trả về khi thả sai, để lại vệt/điểm chạm khi di chuyển và tan khi bị bắt.
- Dòng hướng dẫn Vây Bắt đổi theo trạng thái nhấc/kéo/đích hợp lệ; nội dung mới có entrance ngắn đồng bộ với ghost và dấu đích.
- Snapshot Vây Bắt ghi nhận nước đi/bắt quân và gỡ ghost trong layout phase trước lần vẽ kế tiếp, tránh frame quân thật nháy ở ô đích trước khi animation bắt đầu.
- Bắt quân Vây Bắt trong reduced-motion giữ quân cùng vòng bao tĩnh tại vị trí bị bắt 260ms thay vì để keyframe cuối làm chúng biến mất ngay.
- Khi reduced-motion bật, nước đi vẫn giữ tracking pending/timeout và dấu quân tĩnh ở đích thử; server từ chối vẫn đánh dấu ô sai, nhưng không chạy ghost flight.
- **Đua Hoàng Đạo**: xúc xắc lăn, xe đi theo số ô, thùng được nhặt và cờ đích bật lên. Nhiều lượt khác ghế đang bay có thể hiện song song; reduced-motion rút cleanup để xe không bị ẩn.
- Xe Đua Hoàng Đạo hiện ở ô xuất phát trong lúc lộ xúc xắc, giữ marker tới khi đổi sang xe ở ô đích; cleanup không tính thừa thời lượng entrance sau khi xe đã đến. Reduced-motion giữ marker tĩnh ở đích.
- **Dùng chung**: vào bàn, ghế mới, nhật ký, trạng thái phòng/kết nối, hướng dẫn, chat (dòng mới và badge khi thu gọn), các nút gửi, màn hình kết quả và nút Chơi lại xuất hiện sau ván.
- Màn hình kết quả Ô Ăn Quan, Vây Bắt và Đua Hoàng Đạo dùng nhịp thắng/thua theo góc nhìn người chơi; hòa hoặc người xem dùng nhịp trung tính. BANG! đã có kết quả theo outcome riêng.
- Nút Rời phòng riêng trên bàn BANG!, Đua Hoàng Đạo và màn kết quả BANG! dùng chung reduced-motion transition với nút phòng.

## Checklist khi thêm hiệu ứng

1. Xác định snapshot/event nào xác nhận chuyển động; không suy đoán action thành công từ click trước phản hồi server.
2. Ghi lại vị trí đầu/cuối trước khi DOM thay đổi nếu cần bay giữa hai vùng.
3. Đảm bảo cập nhật nhanh không gỡ hoặc thay thế animation đang chạy của phần tử khác.
4. Đồng bộ timer cleanup với delay và thời lượng CSS; khi vào phòng khác phải xóa state/timer cũ.
5. Với reduced-motion, kiểm tra cả CSS lẫn timer/state ẩn phần tử.
6. Chạy `npm run build` và `npm run lint` trong `frontend`; xem lại cảnh báo lint nền trước khi kết luận.

## Chỉ số thay đổi liên tiếp
useChangedIndices giữ mỗi index đến đúng hạn riêng. useValueDeltas giữ delta của từng index độc lập, cộng gộp các biến động cùng chỉ số trong cửa sổ hiển thị và để riêng thời hạn cleanup; đổi phòng sẽ xóa hiệu ứng cũ. Điều này giúp điểm, số lần bắt và các con số khác không biến mất vì một cập nhật kế tiếp ở phần tử khác.


Delta cùng chỉ số được cộng gộp theo tổng ròng trong cửa sổ hiệu ứng; nếu các thay đổi triệt tiêu nhau thì không hiện nhãn cộng/trừ sai lệch. Mỗi index hết hạn độc lập, còn tổng số hiển thị vẫn do AnimatedNumber đếm theo state server.

## Vây Bắt: nhiều quân bị bắt
Các quân bị bắt trong cùng một snapshot hiện hiệu ứng tan lần lượt với nhịp 45ms (tối đa 5 nhịp), giúp người chơi nhận ra nhóm quân bị loại. Timer giữ overlay đến hết nhịp cuối; các capture liên tiếp được gộp và cleanup dùng hạn xa nhất. Reduced-motion bỏ stagger và dọn nhanh.

## Ô Ăn Quan: nhiều nước đi đang diễn hoạt
`useSowingAnimation` giữ mọi nước đi đã tái dựng từ snapshot đến hạn riêng theo event ID. Hạt rải, quân thu điểm và quân dàn lại được tổng hợp theo các event còn sống với key ổn định; snapshot mới không tháo flight cũ. Khi đổi phòng, danh sách event và timer cleanup được xóa.


## BANG!: nhiều thay đổi HP và bài trên tay
useHpDelta và useHandCountChange gộp các snapshot nối tiếp trong cửa sổ hiệu ứng thành delta ròng. HP bullet và nhãn bài trên tay vì thế biểu diễn tổng thay đổi; nếu hai chiều triệt tiêu, nhãn delta được bỏ. Bộ đếm chính vẫn lấy state server làm nguồn và AnimatedNumber tiếp tục đếm tới giá trị mới.

### BANG!: phát lại ánh sáng khi rút bài liên tiếp
`useCardDrawFlashState` tăng sequence khi hand count tăng; `HandFan` dùng class A/B để quầng sáng ở vùng bài phát lại dù nhịp trước chưa hết. Chuyển động từng lá từ nọc/nguồn vẫn do animation arrival theo card ID đảm nhiệm; API boolean cũ `useCardDrawFlash` tiếp tục tương thích.


## Phát lại hiệu ứng khi giá trị đổi liên tiếp
useChangeFlash trả trạng thái hoạt động cùng sequence. changeFlashClass đổi xen kẽ hậu tố -a/-b. Biến thể -b dùng animation-name/keyframes riêng cùng nội dung với biến thể -a, để đổi tên animation thực sự khởi động lại chuyển động khi dữ liệu đổi liên tiếp. Các lớp đôi cũng nằm trong reduced-motion rules.


Snapshot xác nhận nước đi được so khớp và tạo event trong `useLayoutEffect`; các flight rải hạt và thu điểm cũng đo tọa độ ở layout phase. Nhờ vậy số quân mới và overlay bắt đầu cùng paint, tránh khung hình bàn đã cập nhật nhưng hạt bay chưa xuất hiện. Timer cleanup và tác vụ không cần đồng bộ layout vẫn dùng `useEffect`.


useChangedIndices cung cấp sequence theo từng index. changedIndexClass chọn keyframe a/b có animation-name khác nhau, vì vậy thay đổi lặp trên cùng ô/ghế phát lại hiệu ứng mà không cắt hiệu ứng của index khác. Áp dụng cho hố Ô Ăn Quan, ghế vào phòng và xe/thùng hàng Đua Hoàng Đạo; các biến thể đều có reduced-motion rule.

### BANG!: phát lại phản hồi sát thương, hồi máu và nhận lượt
Các hook `useDamageShake`, `useHealFlash` và `useTurnStartFlash` trả `{ active, sequence }`; `changeFlashClass` luân phiên lớp a/b để sự kiện cùng loại lặp nhanh vẫn phát lại. Biến thể b của rung và hồi máu dùng tên keyframe riêng nhưng chuyển động tương đương biến thể a. Các lớp đôi đều được rút ngắn trong reduced-motion.

### BANG!: lá bài bị server từ chối
Khi lá đang gửi vẫn còn trên tay và lỗi đổi sau phản hồi, hand dừng trạng thái chờ và đánh dấu đúng lá bằng rung ngang ngắn cùng viền đỏ. Hai keyframe đảo hướng để các lần từ chối liên tiếp phát lại; reduced-motion rút animation còn 1ms.

### BANG!: kết thúc lượt/phản hồi bị từ chối
Nếu error đổi khi đang gửi `END_TURN` hoặc `RESPOND`, spinner dừng và đúng nút thao tác rung nhẹ/viền đỏ trong 480ms. Sequence a/b phát lại khi lỗi lặp; đổi lượt/phản hồi hợp lệ chỉ dừng trạng thái chờ. Bật reduced-motion rút nhịp xuống 1ms.

### BANG!: lá bài hết thời gian chờ xác nhận
Nếu sau 2,2 giây lá gửi vẫn còn trên tay và kết nối còn connected, bỏ trạng thái pending, rung/viền đỏ đúng lá và hiện thông báo thử lại. Nếu state đã loại lá hoặc kết nối mất, không phát rejection timeout; lỗi server mới vẫn dùng phản hồi đỏ ngay.

### BANG!: tiến độ chọn bài bỏ
Thanh tiến độ chọn đủ bài bỏ hiển thị bằng `scaleX` với `transform-origin: left`, thay vì animate `width`; cập nhật lựa chọn không kích hoạt layout liên tục trong 300ms transition. Reduced-motion rút transition theo rule hiện có.

### BANG!: nhiều người phản hồi phòng thủ
`useDefenseFlash` giữ mọi dòng phòng thủ mới trong cửa sổ riêng 620ms, thay vì chỉ hiển thị người cuối cùng trong snapshot game log. Mỗi người chơi nhận key riêng để hiệu ứng khiên có thể chạy đồng thời; các timer hết hạn độc lập.

### BANG!: nhiều người thua đấu súng giữa hai snapshot
`useDuelLossFlash` đọc toàn bộ dòng thua đấu súng mới trong game log, giữ flash theo tên người chơi với key và timer riêng 720ms. Nếu nhiều kết quả đến trong một lần cập nhật, mọi ghế tương ứng đều hiển thị hiệu ứng sét; kết quả lặp trên cùng người chơi khởi động lại hiệu ứng của người đó mà không xóa flash người khác.

### BANG!: phát lại lóe nòng khi bắn nhanh
`useMuzzleFlashState` trả `{ active, sequence }` để các đợt log bắn liên tiếp luân phiên class a/b và animation-name riêng. `useMuzzleFlash` vẫn giữ API boolean tương thích cho nơi chỉ cần trạng thái bật/tắt.

Lóe nòng animate `transform` và `opacity`; quầng sáng là `text-shadow` tĩnh để không chạy `filter: brightness()` theo từng frame.

### BANG!: cửa sổ phản hồi mới
Pending-response badge dùng `pendingResponseKey` (loại, người gửi/đích và log mới nhất) để nhịp thông báo trên bàn chạy lại. ActionBar keyed theo loại phản hồi và người gửi để chuyển nguồn phản hồi chạy lại mà không remount mỗi lần danh sách nhiều mục tiêu thu hẹp.

### Chuyển trạng thái phòng chờ sang bàn chơi
Các bàn dùng `useChangeFlash(room.status)` để phát lại `animate-board-enter` khi trạng thái phòng đổi, kể cả khi React tái sử dụng root DOM giữa hai nhánh JSX. Class a/b có animation-name riêng và được reduced-motion rút xuống 1ms.

### Đua Hoàng Đạo: lượt gieo chưa được nhận
Nếu thao tác gieo lỗi hoặc 4,5 giây chưa có snapshot mới, nút rung/viền đỏ và thông báo thử lại xuất hiện khi lượt và kết nối vẫn hợp lệ. Snapshot mới đến muộn sẽ xóa trạng thái từ chối; mất kết nối chỉ dừng spinner mà không đánh dấu nước đi là sai.

### Ô Ăn Quan: nhấn sáng ô đang chọn
Ô dân đang chọn có nhịp nhấc ngắn và hào quang vàng nhấp nhẹ để nhận biết lựa chọn trước khi chọn hướng rải. Hào quang dùng opacity trên lớp phủ trang trí thay vì animate `filter`; bật reduced-motion sẽ giữ dấu chọn tĩnh dễ thấy.

### Ô Ăn Quan: nước đi bị từ chối hoặc hết hạn
Trong khi gửi, board lưu ô/hướng vừa thử. Nếu lỗi trả về mà snapshot không đổi và vẫn là lượt của người chơi, lựa chọn được khôi phục để thử lại và ô nguồn rung viền đỏ; nếu hết 5 giây không có xác nhận, cùng phản hồi được dùng khi kết nối còn sẵn. Đổi lượt/phòng hoặc mất kết nối sẽ xóa attempt cũ.

### Vây Bắt: trả quân nếu nước đi chưa được xác nhận
Ghost chỉ được thay bằng quân trên bàn khi snapshot server đặt quân ở ô đích. Nếu server báo lỗi hoặc không xác nhận trong 1,8 giây, ghost bay về đúng vị trí gốc và ô đích lóe đỏ; khi snapshot xác nhận nước đi, hiệu ứng trả quân bị hủy. Reduced-motion bỏ chuyến bay nhưng vẫn đánh dấu đích chưa được xác nhận.

### Vây Bắt: giữ chuyển động của nhiều quân
Mỗi quân đang chạy animation có nguồn node và timer cleanup riêng. Snapshot kế tiếp thêm quân khác vào tập chuyển động đang chạy; chỉ chuyển động của cùng một quân mới được thay thế. Khi đổi phòng hoặc unmount, toàn bộ timer theo quân được dọn.

Khi `prefers-reduced-motion` bật, trail/transform bị tắt và lifetime state `movingPieces` cũng rút từ 400ms còn 1ms; state bàn và vị trí quân vẫn theo snapshot server.

### BANG!: danh sách người chơi trong màn kết quả
Tên người còn sống và bị loại lần lượt xuất hiện sau biểu tượng/tiêu đề chiến thắng, cách nhau 65ms. Reduced-motion rút thời lượng và delay để toàn bộ danh sách hiện ngay.

### BANG!: phát lại hiệu ứng khi đổi vũ khí liên tiếp
`useWeaponEquipFlashState` theo dõi thay đổi vũ khí bằng `useChangeFlash`; PlayerSeat và LocalPlayerPanel dùng `changeFlashClass` để hai lần trang bị/thay vũ khí trong cùng cửa sổ 500ms vẫn phát lại nhịp sáng. Các class a/b có animation-name riêng và nằm trong reduced-motion rules. `useWeaponEquipFlash` tiếp tục cung cấp API boolean tương thích.

### BANG!: trang bị nhiều món liên tiếp
`useEquipmentFlashState` giữ từng chip mới với sequence và timer riêng 650ms; món đến sau không xóa trạng thái của món trước, còn trang bị lại cùng món sẽ thay timer và phát lại lớp A/B. Hai board player-panel dùng `changeFlashClass`; API set boolean `useEquipmentFlash` vẫn được giữ để tương thích với caller đơn giản. Biến thể keyframe riêng có reduced-motion rule.

### BANG!: dọn chip trang bị bị gỡ theo từng animation
`useEquipmentLossFlash` giữ timer riêng 520ms cho từng chip rời. Một món bị gỡ sau không kéo dài các chip đã chạy xong, và món được trang bị lại trong lúc đang rời sẽ bị gỡ khỏi ghost list ngay. Nhờ đó chip trong suốt không chiếm chỗ sau khi animation kết thúc. Với reduced-motion, CSS và cleanup timer đều rút về 1ms.

### BANG!: giữ nhịp từng dòng nhật ký
`GameLogPanel` giữ expiry theo index mới khớp 360ms của `animate-log-entry`; reduced-motion rút cả animation và cleanup xuống 1ms. Snapshot thêm log không gỡ class của các dòng trước; timer dọn theo expiry gần nhất. Nếu nhật ký bị rút ngắn/reset, toàn bộ expiry cũ được xóa để index của ván mới không kế thừa animation cũ. Chat dùng chung entrance 360ms và tính expiry sau cả stagger của từng dòng.

### BANG!: xếp hàng animation đánh bài đã xác nhận
`usePlayedCardAnimation` giữ action hiện tại đến hết thời lượng choreography (bao gồm stagger) và xếp action tiếp theo đã được server ghi log vào hàng đợi FIFO. Mỗi action giữ card/message/key riêng; timer hiện tại không bị reset khi snapshot sau tới. Đổi phòng hoặc unmount dọn timer và queue.

Mỗi queue entry cũng chụp actor ID, target IDs và loại projectile từ chính snapshot nhận log. Vì vậy shot đang chờ không lấy mục tiêu từ phase/pending response mới hơn khi nó được phát sau.

Khi BANG! kết thúc ván, VictoryScreen chờ queue card effect rỗng trước khi phủ overlay. Lá quyết định, projectile và caption được xem hết trước khi màn kết quả xuất hiện.

Hook phát hiện log card mới trong layout phase để khi log và phase finished đến chung snapshot, trạng thái trì hoãn overlay được thiết lập trước frame đầu tiên.

Reduced-motion của card effect bỏ flight/flip/sheen và giữ lá cùng caption ở trạng thái tĩnh 600ms để nội dung đọc được; cleanup hook đồng bộ với lifetime tĩnh này. Thẻ chuyển vùng Panic cũng hiện tĩnh tại điểm nhận.

Projectile Bang!/Gatling/Indians và vòng ngắm Duel trong reduced-motion đứng yên tại điểm chạm thay vì rút animation xuống 1ms rồi biến mất; cue được dọn cùng card effect sau 600ms.

Shield phòng thủ và tia sét thua Duel trong reduced-motion giữ icon/ring tĩnh 300ms; lifetime hook rút cùng CSS để overlay không còn trong DOM sau khi cue kết thúc.


### BANG!: giữ cue HP và bị loại khi reduced-motion
Thông báo số HP, viên đạn HP, dấu bị loại và số lá mất khi bị loại tắt animation thay vì rút keyframe về 1ms. Các dấu hiệu giữ nguyên kiểu tĩnh trong lifetime của hook (760–820ms), rồi được dọn như bình thường; màu xanh/đỏ và biểu tượng vẫn truyền tải loại thay đổi.

### Ô Ăn Quan: căn cue thu quân reduced-motion theo diễn tiến lượt
Khi tắt chuyển động, hạt không bay nhưng nhãn quân thu vẫn xuất hiện tại ô điểm đúng sau thời gian rải; thu quân cuối ván giữ thứ tự settle. Cue tĩnh dùng delay 1ms và lifetime state bao phủ mốc xuất hiện muộn nhất cộng 450ms để không nháy sớm hoặc bị dọn trước khi tới lượt hiển thị.

### Vây Bắt: giữ phản hồi nước đi khi reduced-motion
Khi quân được xác nhận sang ô đích, reduced-motion bỏ transform nhưng giữ glow trên quân, đường nối nguồn/đích và vòng chạm đích ở trạng thái tĩnh 260ms. State movingPieces dùng cùng lifetime để cue không bị unmount sau 1ms.

### Delta điểm/quân dùng chung: reduced-motion vẫn đọc được
game-value-delta thay keyframe bay/mờ bằng fade tức thời 1ms, giữ nguyên animationDelay do từng lượt tính (ví dụ tới lúc rải/đua chạm mốc), rồi để số +N/−N đứng tĩnh tới khi useValueDeltas dọn state. Căn giữa nhãn bằng transform tĩnh trong keyframe để không lệch vị trí.

### Ô Ăn Quan: phản hồi nước đi bị từ chối khi reduced-motion
Ô nguồn bị từ chối giữ viền đỏ và glow tĩnh trong 600ms, cùng lifetime của rejectedMove; hiệu ứng lắc ngang được tắt hoàn toàn để phản hồi không biến mất sau 1ms.

### Đua Hoàng Đạo: giữ dấu gieo bị từ chối khi reduced-motion
Nút gieo giữ viền và glow đỏ tĩnh trong 700ms của rejectedRoll, đồng bộ với thông báo thử lại; reduced-motion tắt keyframe rung 1ms vốn không để lại phản hồi trực quan trên nút.

### BANG!: giữ delta tay bài, trang bị gỡ và tầm bắn khi reduced-motion
Delta +N/−N lá đứng tĩnh đủ 820ms; tầm bắn và số bài trong chồng bài giữ ánh vàng trong lifetime useChangeFlash. Chip trang bị bị gỡ giữ sắc đỏ tĩnh 260ms trước khi hook dọn ghost (thay vì 1ms), để người chơi nhận ra món nào vừa rời bàn.

### BANG!: nhận diện lá bài vừa vào tay
HandFan đánh dấu riêng card ID mới nhận và toàn bộ tay bài trong lúc chia mở màn. Chuyển động WAAPI vẫn đưa lá tới vị trí mới; viền/glow vàng trên từng wrapper giúp nhận ra lá vừa tới và tự hết khi useNewHandCards/dealAnimation kết thúc. Reduced-motion bỏ bay nhưng vẫn giữ dấu tĩnh.

### BANG!: giữ cue hồi máu, lượt mới và rút bộ bài khi reduced-motion
Heal giữ glow/viền xanh tĩnh 650ms; lượt mới giữ viền và hào quang vàng 700ms; bộ bài được nhấn sáng 520ms khi số lá đổi. Mỗi dấu tĩnh tồn tại theo đúng flash state thay cho keyframe kết thúc ở khung không hiệu ứng sau 1ms.

### BANG!: giữ cue từ chối lá bài/hành động khi reduced-motion
Lá bài không hợp lệ và action bar bị từ chối giữ viền đỏ cùng glow tĩnh trong 560ms của rejectedCard/rejectedAction; reduced-motion tắt rung ngang nhưng cue lỗi vẫn rõ trên đúng điều khiển vừa thử.

### BANG!: giữ cue trang bị vũ khí/đồ mới khi reduced-motion
Vũ khí vừa đổi giữ text vàng và glow tĩnh 500ms; mỗi chip equipment mới giữ viền và glow vàng 650ms theo state riêng của item. Điều này thay keyframe 1ms nhưng không đổi lifetime hay xử lý nhiều món liên tiếp.

### Ô Ăn Quan: đánh dấu Quan đã bị bắt
Hai ô Quan hiển thị trạng thái ĐÃ BẮT sau khi state server xác nhận, giữ dấu đến hết ván. Khi bắt Quan, ô đích có vòng/glow vàng theo delay capture; reduced-motion thay vòng động bằng viền tĩnh bắt đầu đúng mốc đó và tồn tại đến hết lifetime cue thu quân.

### Vây Bắt: giữ phản hồi bộ đếm lượt đỏ khi reduced-motion
Khi số lượt đỏ dùng thay đổi, bộ đếm giữ màu vàng và text-glow tĩnh trong 560ms của redTurnsChanged; giá trị vẫn được cập nhật theo state server.

### Đua Hoàng Đạo: giữ cue kết quả xúc xắc và nhặt thùng khi reduced-motion
Mặt xúc xắc có viền/glow vàng tĩnh trong 550ms sau khi kết quả đổi; biểu tượng thùng được nhặt giữ glow xanh trong lifetime marker di chuyển. Reduced-motion bỏ xoay/bật nảy nhưng vẫn phân biệt rõ kết quả mới và ô vừa nhặt.

### Ô Ăn Quan: đánh dấu các ô đổi quân khi reduced-motion
Các ô dân/Quan đổi số quân giữ viền xanh và glow tĩnh; số quân giữ text-glow theo lifetime changedPits. Khi giảm chuyển động, tất cả thay đổi state hiện ngay nhưng các ô bị tác động vẫn dễ lần theo trên bàn.

### Ô Ăn Quan: nhấn sáng điểm vừa đổi khi reduced-motion
Điểm số vừa cập nhật giữ màu vàng và text-glow tĩnh trong lifetime score0Changed/score1Changed; con số vẫn nhận state ngay theo hành vi reduced-motion của AnimatedNumber, và delta +N/−N giữ cue riêng.

### Đua Hoàng Đạo: nhận biết đang gửi lượt gieo khi reduced-motion
Khi nút có aria-busy=true, reduced-motion giữ viền và glow vàng tĩnh cho đến khi snapshot nhận kết quả, lỗi hoặc timeout; không phụ thuộc vào xúc xắc xoay để thể hiện thao tác đang chờ.

### BANG!: nhận biết kết thúc lượt/phản hồi đang gửi khi reduced-motion
Nút trong action bar có aria-busy=true giữ viền và glow vàng tĩnh khi chờ server; dấu tự biến mất khi state pending được xác nhận, từ chối hoặc timeout, thay cho spinner bị tắt bởi reduced-motion.

### Ô Ăn Quan: nhận biết nước rải đang gửi khi reduced-motion
Thông báo .oanquan-move-pending giữ viền/glow vàng tĩnh khi hook pending còn active, để trạng thái gửi không chỉ dựa vào spinner xoay đã bị tắt.

### Đua Hoàng Đạo: giữ cue nhãn lượt khi reduced-motion
Nhãn lượt giữ text-glow vàng trong 800ms của turnChanged, để đổi lượt được nhận biết dù box-shadow keyframe bị tắt.

### BANG!: phát hiệu ứng chuyển lá Panic cho mọi người xem
Chuyển động lá úp bị lấy bằng Hoảng loạn! lấy nguồn từ người bị lấy và đích từ người đánh theo snapshot player ID; mọi client/khán giả giờ cùng thấy lá đi giữa hai ghế, không phụ thuộc localPlayerId của máy đang xem.

### Vây Bắt: vệt sáng chạy theo đường đi
Trail nước đi dùng dash ngắn trên pathLength=1, dịch chuyển dọc đường bằng stroke-dashoffset để hướng đi rõ hơn khi quân đã tới đích. Khi bật reduced-motion, dash trở lại thành đường liền tĩnh để giữ đầy đủ ngữ cảnh nguồn/đích.

### Đồng bộ cue với snapshot game
useChangedIndices, useChangeFlash, useValueDeltas và useRaceMoves phát hiện snapshot trong layout phase. Highlight ô/ghế, delta số và overlay xe đua vì vậy được chuẩn bị trước paint đầu tiên của state mới, tránh lóe vị trí đích hoặc trễ cue một frame. Các timer hết hạn và cleanup vẫn nằm trong useEffect.

### BANG!: cue sự kiện đồng bộ với snapshot
Các hook theo dõi rút/nhận bài, HP, hồi máu, phòng thủ, đấu súng, loại người chơi, trang bị, lượt và chia bài đầu ván xử lý snapshot trong layout phase. Cue vì thế xuất hiện cùng paint cập nhật state. Cleanup timer tiếp tục dùng useEffect, giữ nguyên thời lượng và quản lý vòng đời.

### BANG!: bài rút bay vào tay và nhật ký đồng bộ trước paint
HandFan đo tọa độ nọc/ghế nguồn và từng lá bằng layout effect, sau đó chạy WAAPI cho lá mới và FLIP cho các lá đổi chỗ; nguồn lá mới mặc định là nọc và có thể là ghế người bị lấy bài. GameLogPanel đánh dấu dòng mới và tự cuộn trong layout phase để dòng hoạt động không lóe ở vị trí cũ trước khi nhật ký theo kịp.

Room chat cũng cập nhật dấu tin mới và auto-scroll trong layout phase, tránh cuộn trễ sau khi dòng mới đã vẽ.

### Đồng bộ trạng thái thao tác theo snapshot
Các bàn BANG!, Ô Ăn Quan, Đua Hoàng Đạo và Vây Bắt đối chiếu trạng thái pending/lỗi, đổi lượt và reset lựa chọn trong layout phase. Nút chờ kết thúc tải ngay khi server xác nhận, phản hồi từ chối bật cue cùng paint lỗi, và lựa chọn của lượt trước không lóe trong lượt mới. Timeout/cue expiry tiếp tục dùng effect thường.
### Vây Bắt: kéo quân theo nhịp khung hình
Pointermove giữ vị trí mới nhất và gộp cập nhật ghost thành tối đa một lần mỗi animation frame. Điều này tránh render thừa khi thiết bị gửi pointer event nhanh hơn màn hình. Ghost theo con trỏ với transition ngắn 48ms; khi thả/hủy, frame chờ bị hủy trước khi xử lý nước cuối cùng.
### Bộ đếm dùng chung đồng bộ với hiệu ứng
`AnimatedNumber` khởi chạy nội suy từ giá trị đang hiển thị trong layout phase; cập nhật reduced-motion nhảy thẳng tới giá trị server trước paint. RAF/timer đang chạy vẫn bị hủy khi nhận prop mới hoặc unmount để không ghi đè nhịp mới.

### BANG!: bài rút công khai bay tới ghế người chơi
Snapshot cardCount tăng ở ghế đối thủ tạo card-back flight từ tọa độ nọc tới đúng ghế trên mọi client; mỗi lá có delay theo ghế và thứ tự rút. Người chơi cục bộ không nhận flight trùng vì HandFan đã animate từng lá bí mật tới tay. Reduced-motion hiện card-back tĩnh tại ghế trong thời gian cue ngắn.

### Room chat: stagger tin mới theo batch
Mọi tin nhắn nhận trong cùng lần cập nhật đều có entrance riêng với stagger tối đa 160ms; expiry của từng index độc lập nên batch tiếp theo không cắt animation đang chạy. Khi danh sách reset/đổi phòng, expiry và cue cũ được xóa. Reduced-motion bỏ stagger và rút timer về 1ms.

### BANG!: bài trên tay tan khỏi ghế khi bị loại
Khi snapshot xác nhận người chơi bị loại và hand count giảm, tối đa bốn lá úp tản ra rồi tan ngay tại ghế; nhãn −N giữ đúng tổng số lá. Không bay vào chồng bài bỏ vì luật loại bỏ xóa tay bài. Reduced-motion giữ cụm lá tĩnh và nhãn số để cue vẫn rõ.

### BANG!: nguồn bài của hình phạt bắn nhầm
Parser nhận diện `bắn nhầm` là ranh giới tên actor trong game log. Khi bắn nhầm Phó cảnh sát khiến tay bài của người bắn bị bỏ hết, các lá công khai bay từ đúng ghế của actor tới chồng bài bỏ thay vì xuất hiện từ tâm bàn.
## Tổng kết phạm vi hiện tại (2026-10-24)
Animation gameplay hiện bao phủ BANG!, Ô Ăn Quan, Vây Bắt, Đua Hoàng Đạo và các thành phần phòng dùng chung. Các điểm vận hành chung: cue được suy ra từ snapshot/log đã xác nhận; chuyển động nhiều sự kiện giữ state và timer độc lập; layout-sensitive cues đồng bộ trước paint; tương tác kéo được gộp theo frame; reduced-motion vẫn giữ dấu hiệu trạng thái tĩnh đủ đọc. Lịch sử thay đổi theo ngày nằm trong `../logs/2026-10-24.md`; trạng thái công việc liên tục nằm trong `../tasks/current.md`.

Build/lint gần nhất trong nhật ký ngày 2026-10-24 đều thành công; lint không có lỗi và còn hai cảnh báo Fast Refresh đã tồn tại. Các kết quả đó xác nhận biên dịch và quy tắc lint, không thay thế kiểm tra cảm nhận chuyển động trên trình duyệt thật.
### BANG!: đếm đủ bài rút công khai khi snapshot gộp thao tác
Flight bài rút của đối thủ lấy số lá từ các dòng game log mới (`rút`, `rút thêm`, `rút thưởng`) theo player name duy nhất; delta `cardCount` vẫn làm fallback. Dùng số lượng rút gộp từ log tránh thiếu animation khi cùng snapshot đã phản ánh việc người chơi dùng/bỏ một số lá vừa rút. Log bị reset hoặc đổi phòng được đồng bộ con trỏ trước khi so khớp để không phát lại sự kiện cũ.
### BANG!: bỏ nhiều lá bay vào chồng bài bỏ
Khi kết thúc lượt phải bỏ bài vượt giới hạn hoặc bị phạt bỏ toàn bộ bài, các lá được xác nhận rời tay bay từ tọa độ từng lá (nếu là tay cục bộ) hoặc ghế actor tới chồng bài bỏ. Chuyển động dùng đường cong, stagger nhẹ và bỏ hào quang đánh bài giữa bàn; reduced-motion giữ các lá đứng yên làm cue trong lifetime ngắn.
### BANG!: lá trang bị bay tới đúng slot
Khi game log và snapshot xác nhận món mới đã được trang bị, lá hiển thị bay từ tọa độ lá trên tay của client cục bộ hoặc ghế actor của client khác tới slot vũ khí/trang bị đúng người, rồi mới tan. Cue phát trên mọi client; hào quang impact giữa bàn được tắt vì đây là trang bị, không phải đòn đánh. Reduced-motion giữ cue tĩnh cùng highlight slot.
### BANG!: xáo chồng bài bỏ lại thành nọc
Khi game log xác nhận nọc cạn và chồng bỏ được xáo lại, tối đa sáu lá úp đại diện bay từ vùng chồng bỏ về nọc. Snapshot giữ quyền quyết định thời điểm; con trỏ log và discard count được reset theo phòng, timer cleanup độc lập. Reduced-motion giữ cụm lá tĩnh tại nọc trong lifetime ngắn.
### BANG!: nối nhịp xáo nọc và rút bài
Khi một snapshot vừa xáo chồng bỏ vừa rút bài, flight bài công khai và flight của tay bài cục bộ chờ 420ms để nhịp xáo bắt đầu trước. WAAPI dùng `fill: "backwards"` để lá đang chờ giữ frame đầu ở nguồn, không lóe tại đích rồi bật ngược về nọc. Các lá rút cùng batch tiếp tục stagger riêng; reduced-motion bỏ delay.
### BANG!: vũ khí/trang bị cũ khi thay món
Nếu trang bị mới đẩy một vũ khí hoặc món cùng loại vào discard, lá cũ bay từ slot đang có (hoặc ghế actor nếu slot đã thay) tới chồng bài bỏ song song với lá mới bay vào slot. Hook card action giữ riêng danh sách lá bị bỏ để hai chuyển động không dùng nhầm đích. Reduced-motion dùng cue tĩnh ở discard.
### BANG!: giảm chuyển tiếp hover/press khi reduced-motion
Trong `prefers-reduced-motion`, nút ActionBar (kết thúc lượt, phản hồi, hủy/chốt bỏ bài), thanh tiến độ chọn bài, thẻ tương tác trên tay/bàn và nút nhật ký dùng transition 1ms. Cue sự kiện tĩnh vẫn giữ nguyên; chuyển vị trí hover/press không còn trượt kéo dài.
### Reduced-motion: chuyển tiếp ô và ghế của các game còn lại
Ô Ô Ăn Quan luôn mang lớp `oanquan-pit`, vì `transition-all` vẫn tồn tại cả lúc ô không chọn được. Ghế đếm/chỗ trống và thẻ trạng thái người chơi Đua Hoàng Đạo có selector reduced-motion riêng; Vây Bắt đã có rule 1ms trên quân và node SVG.
### BANG!: kéo lá bài bằng chuột
Lá có thể thao tác trong HandFan hỗ trợ HTML drag-and-drop. Thả lên người chơi hợp lệ gọi cùng đường xác nhận mục tiêu và gửi bài như click; thả lên vùng bàn gọi đường dùng/chọn mục tiêu hiện có; trong chế độ phản hồi/bỏ bài, thả vẫn đi qua handler hiện tại. Drag state dọn khi dragend hoặc đổi lượt/phòng. Target và vùng bàn có drop highlight; click/keyboard không đổi. `prefers-reduced-motion` rút transition highlight còn 1ms.
### Phòng chờ: phản hồi ghế vừa trống
Khi snapshot đổi ghế từ có người sang trống, placeholder ghế trong BANG!/Đua Hoàng Đạo và nhãn ghế Vây Bắt chạy cue scale/glow ngắn; ghế mới có người tiếp tục dùng animation vào ghế. Dùng sequence class A/B để cập nhật liên tiếp phát lại được. prefers-reduced-motion rút cả hai cue ghế về 1ms.


### Replay BANG!: phát diễn biến tuần tự
Trang replay hỗ trợ phát/tạm dừng, lùi/tiến từng nước và thanh tiến độ. Dòng hiện hành được làm nổi bật, cuộn vào vùng nhìn và thông báo vị trí bằng aria-live; mỗi bước cách nhau 900ms. Người dùng có thể chọn bước thủ công để dừng playback. Tôn trọng prefers-reduced-motion cho chuyển động highlight và cuộn. Đây là playback của danh sách event; chưa dựng lại board vì artifact hiện không lưu state đầu ván.


### Sảnh game: phòng chờ realtime
Các hàng phòng chờ mới trong GameDetails có entrance stagger tối đa 240ms để người dùng nhận biết phòng vừa xuất hiện sau cập nhật realtime. Bộ đếm ghế đang có người dùng AnimatedNumber nội suy 300ms mỗi khi snapshot cập nhật. Reduced-motion bỏ stagger và rút animation xuống 1ms.


Trạng thái loading/lỗi/không có phòng cũng dùng entrance ngắn để chuyển tiếp rõ ràng khi danh sách realtime cập nhật. Các trạng thái giữ nguyên role status/alert để không phụ thuộc vào chuyển động.


### Thư viện game: lọc thẻ và số phòng chờ
Khi tập kết quả lọc thay đổi, thẻ game vào theo stagger tối đa 275ms. Key theo tập game đang hiển thị để animation chạy lại khi tập kết quả đổi, không bị phát lại theo từng ký tự nếu danh sách không đổi. Badge số phòng chờ nội suy 320ms theo cập nhật lobby realtime. Reduced-motion bỏ stagger và rút entrance còn 1ms.


### Reduced-motion: thẻ game và trang chi tiết
Trong GameLibrary và GameDetails, transition hover/focus trên thẻ, biểu tượng, filter chip và các phần tử trang chi tiết rút xuống 1ms. Entrance đã có rule reduced-motion riêng; màu/viền trạng thái vẫn biểu thị lựa chọn.


Mỗi summary nước đi là nút tua trực tiếp tới index tương ứng; chọn khi autoplay đang chạy sẽ dừng timer, cập nhật aria-current/progress và dùng cùng đường cuộn tới bước đang chọn.


Playback dùng index 0-based trong mảng artifact cho state, aria-current, tua dòng và progress. moveNumber server là sequence 1-based, có thể chứa event SYSTEM mở phòng; không dùng trực tiếp làm array index hoặc nhãn row để tránh lệch bước.


### Chuyển cảnh route vào/ra ván
Các điều hướng thư viện → chi tiết/phòng, tạo/tìm/nhập phòng, rời/chơi lại và lịch sử ↔ replay bật React Router viewTransition. CSS crossfade root snapshot kèm dịch Y nhẹ 8px ở trang mới (280ms); trang cũ fade/scale ngắn 150ms. Trình duyệt không hỗ trợ View Transitions dùng navigation thông thường; prefers-reduced-motion rút hai pseudo animation còn 1ms.


### Lịch sử game: entrance hàng kết quả
Các hàng trong GameHistoryPage xuất hiện theo stagger tối đa 294ms; các ô trong một hàng chuyển động cùng nhịp, không làm thay đổi thứ tự dữ liệu. prefers-reduced-motion bỏ stagger và rút animation còn 1ms.


### Trạng thái hậu trận và replay
Loading, lỗi, không tìm thấy/không có kết quả ở GameHistoryPage và GameReplayPage dùng entrance game-action 220ms khi state xuất hiện. Summary và khung replay cũng vào nhẹ sau khi dữ liệu tải xong; bảng lịch sử giữ stagger riêng theo hàng. Các lớp dùng chung nên reduced-motion rút về 1ms theo rule nền.


### Sảnh phòng: sao chép, tạo, tìm trận và hủy
Các thao tác async dùng ria-busy theo đúng request, spinner CSS nhỏ và trạng thái chữ. Kết quả copy có entrance role=status. Trong reduced-motion spinner giữ vòng tĩnh nhận biết được, không xoay; state pending vẫn theo thời gian promise.


### Vào phòng/game: loading, lỗi và thiếu dữ liệu
Các trạng thái vào phòng không tìm thấy, lỗi quyền/kết nối, phòng đóng, tải engine, game không tồn tại và lỗi thao tác tạo phòng dùng entrance game-action. Nội dung vẫn giữ role alert/status; skeleton loading vẫn chạy pulse bình thường, còn game-action-enter và reduced-motion rule chung rút còn 1ms.


Khung RoomInvite cũng dùng entrance khi phòng chuyển sang trạng thái chờ; nút sao chép có selector reduced-motion riêng để press/hover không còn transition kéo dài.


Replay có thể đổi tốc độ 0.5×/1×/1.5×/2×; playback interval đổi sẽ cleanup timer cũ và bắt đầu nhịp kế tiếp theo interval mới, không nhảy qua nước đi. Tốc độ chỉ điều khiển nhịp đọc event, không làm thay đổi dữ liệu replay.


### Thư viện game: lỗi tải và kết quả lọc rỗng
Cảnh báo lỗi tải engine và empty-state sau tìm kiếm/bộ lọc dùng entrance game-action khi được tạo. State loading và lưới game giữ animation riêng; reduced-motion dùng rule 1ms chung.


Nút vào lại phòng đang chơi và thanh số lượng game tìm được cũng dùng entrance khi realtime/search làm chúng xuất hiện. Trạng thái vẫn cập nhật từ lobby và bộ lọc hiện hành.


Bộ đếm số phòng chờ trong tiêu đề GameDetails và số kết quả lọc GameLibrary dùng AnimatedNumber lần lượt 300ms/260ms. Số phòng hiển thị cả 0 để nội suy tới trạng thái rỗng; reduced-motion tự cập nhật tức thời theo AnimatedNumber.


Reduced-motion của luồng GameLibrary scope cả trang và descendants, bao gồm search, nút xóa từ khóa, chip lọc, thẻ game và nút hành động. GameDetails dùng cùng phạm vi cho toàn bộ trang; duration transition còn 1ms.



Khi kéo lá từ tay, một chip hướng dẫn nổi hiển thị tên lá và gợi ý vùng thả (người chơi hợp lệ hoặc vùng bàn). Chip dùng ole=status/ria-live, không chắn thao tác; hiệu ứng xuất hiện được rút về 1ms khi reduced-motion bật. Mục tiêu hợp lệ và vùng bàn tiếp tục highlight theo drag-over.


Ô Ăn Quan: bảng chọn hướng rải được remount theo ô nguồn, nên entrance phát lại mỗi khi người chơi chuyển sang ô dân khác. Nhãn xác nhận nêu số ô và số quân hiện có trước khi chọn trái/phải; reduced-motion tiếp tục dùng entrance rút gọn toàn cục.


Khi chuyển tab hướng dẫn game bằng chuột hoặc phím mũi tên/Home/End, tabpanel được thay theo section và chạy entrance game-action ngắn; nội dung mới có phản hồi rõ mà không đổi ngữ nghĩa ARIA tab. Reduced-motion dùng rule 1ms chung.


Nhật ký realtime BANG! dùng entrance theo loại sự kiện mới: đòn đánh trượt ngang với nhấn đỏ, hồi máu nổi nhẹ với ánh xanh, phòng thủ trượt ngược, loại người chơi và chiến thắng có nhấn sáng riêng. Hết hạn class theo thời gian tối đa 360ms; reduced-motion rút về 1ms qua selector animate-log-entry chung.


Phân loại animation và màu nhật ký BANG! theo thứ tự ngữ nghĩa: phòng thủ (kể cả dùng Bang! né Người da đỏ và kiểm tra Thùng rượu) được xét trước tấn công; sát thương HP/đấu súng được tính là đòn đánh. Rút bài, bỏ bài, trang bị và đổi lượt có entrance tương ứng; debug log không bị phân loại nhầm theo từ khóa gameplay.


Luồng đạn BANG!/mũi tên có vòng va chạm tại tâm ghế mục tiêu, bắt đầu sau 750ms để theo sau đoạn bay 330ms và delay khởi hành; các mục tiêu Gatling được stagger cùng đạn. Đấu súng giữ hiệu ứng ngắm, không hiện va chạm giả. Reduced-motion đặt đạn và vòng va chạm tĩnh ngay ở mục tiêu.


Log Hoảng loạn thành công (lấy 1 lá từ) dùng nhấn chuyển bài màu tím; chỉ log thực sự bỏ bài (ỏ N lá, bỏ hết hoặc Cat Balou buộc bỏ) dùng hiệu ứng discard. Trường hợp mục tiêu không còn bài không bị hiển thị như thể bài đã chuyển/bị bỏ.


Nút chơi lại dùng chung cho cả bốn game đánh dấu ria-busy và tên trạng thái khi tạo phòng rematch; viền/vầng sáng tĩnh xác nhận thao tác đang chờ bên cạnh spinner. Reduced-motion giữ spinner đứng yên và vẫn giữ dấu pending.


Khi nhật ký BANG! không ở cuối và có log mới, nút Có diễn biến mới · Xem mới nhất có entrance game-action ngắn và aria-live; tự cuộn chỉ xảy ra sau khi người chơi bấm, tránh giật vị trí đọc. Reduced-motion rút entrance còn 1ms.


Danh sách phòng chờ realtime giữ một phòng vừa biến mất trong 240ms để chạy exit fade/translate khi phòng đầy, bị hủy hoặc rời khỏi danh sách. Bộ đếm vẫn phản ánh ngay danh sách server mới; hàng đang thoát bị aria-hidden và gỡ action buttons. Empty state đợi hàng thoát kết thúc, tránh thông báo rỗng chồng lên phòng. Reduced-motion rút cả animation và timer về 1ms; timer được cleanup khi unmount/đổi game.


Chat realtime trong phòng: nút xem tin mới, cảnh báo mất kết nối và lỗi gửi tin có entrance game-action; form gửi đánh dấu ria-busy, nút gửi dùng viền pending dùng chung. Tin nhắn mới vẫn giữ stagger hiện tại; thao tác nhảy tới tin mới chỉ cuộn sau khi người dùng bấm. Reduced-motion rút entrance chung và spinner đứng yên.


Các nút phản hồi/kết thúc lượt của ActionBar BANG! giữ spinner khi gửi và luôn có viền/vầng sáng theo ria-busy, cả khi reduced-motion tắt animation. Reduced-motion chỉ làm spinner đứng yên; dấu pending tĩnh vẫn được giữ.


Muzzle flash BANG! đặt tại origin của shot flight (tâm ghế người bắn) thay vì giữa bàn; dùng cùng hệ tọa độ với projectile để hiệu ứng nguồn/đường bay/impact thống nhất. Nếu không có flight metadata thì tọa độ mặc định giữa bàn. Muzzle flash vẫn có lifetime 300ms và reduced-motion rút keyframe theo quy tắc hiện hành.


Các lựa chọn số người chơi khi tạo phòng BANG! và Đua Xe Hoàng Đạo có dấu tick nhỏ entrance khi lựa chọn thay đổi; ria-pressed vẫn là nguồn trạng thái cho trợ năng. Reduced-motion hiển thị dấu ngay, không phụ thuộc keyframe.


Cuộn tới bảng phòng từ nút CHƠI NGAY hoặc deep-link play=1 dùng smooth mặc định; khi prefers-reduced-motion bật thì chọn ehavior:auto để không bắt người chơi theo dõi cuộn động. Focus accessibility vẫn giữ nguyên.


Lifetime đòn BANG!/Người da đỏ diện rộng là 1500ms để bao phủ projectile mục tiêu cuối (420ms delay khởi đầu + stagger tối đa 390ms + 330ms bay) và vòng impact 300ms. Cleanup overlay vì thế không cắt hiệu ứng cuối; reduced-motion dùng lifetime riêng 600ms với cue tĩnh.


Presence của hàng phòng được cập nhật ở layout phase để giữ snapshot trước khi browser paint, tránh một frame biến mất rồi mới chạy exit. Nhãn dùng "Đang rời sảnh" vì hàng có thể rời danh sách do phòng đầy, không chỉ do đóng/hủy.


Nút sao chép liên kết phòng giữ viền/vầng sáng khi ria-busy bật, đồng bộ với các thao tác gửi/rematch; spinner đứng yên khi reduced-motion nhưng dấu pending vẫn còn.


DisplayNameEditor trong phòng dùng entrance cho form edit, nút tên khi đóng và lỗi validation/network; nút Lưu có spinner, ria-busy và viền pending. Reduced-motion rút entrance chung còn 1ms và giữ spinner tĩnh.

Kéo bài BANG! làm nổi bật mục tiêu hợp lệ bằng viền vàng; khi bài cần mục tiêu nhưng rê lên người chơi không hợp lệ, ghế có viền đỏ và nhịp sáng nhẹ để người chơi nhận ra trước khi thả. Reduced-motion giữ viền đỏ tĩnh, không chạy nhịp.

Khi kéo bài BANG!, con trỏ dùng ảnh lá bài riêng hơi nghiêng, có bóng đổ và ánh vàng nhẹ; lá gốc mờ/co trong 160ms để thể hiện đang được nhấc. Ảnh kéo chỉ tồn tại lúc khởi tạo drag và được gỡ ngay sau đó. Reduced-motion rút chuyển trạng thái lá gốc còn 1ms.

Đua Xe Hoàng Đạo: nhịp nhảy của xe chạy đồng bộ với hành trình; thời lượng mỗi nhịp là thời lượng hành trình chia cho số ô, số lần lặp bằng số ô và cùng chờ hiệu ứng tung xúc xắc kết thúc. Tránh truyền số ô nhầm vào vị trí animation-delay.

Ô ăn quan với prefers-reduced-motion: bỏ toàn bộ delay dựa trên hành trình khi hiển thị dấu thu quân, hoàn điểm và gieo lại; các cue tĩnh xuất hiện ngay cùng state server. Hạt bay vẫn ẩn và overlay cue được dọn sau 450ms, không giữ người chơi chờ timeline chuyển động đã tắt.

BANG! khi trang bị đè thiết bị cũ: lớp bài bay vào chồng bỏ tồn tại đủ 420ms chờ + 600ms bay + stagger cuối 45ms mỗi lá. Reduced-motion dùng cue tĩnh và dọn sau 320ms. Các hằng số JS cần đồng bộ với animation .bang-card-transfer-flight.

BANG! rút bài công khai tới ghế đối thủ giữ overlay theo hạn cuối = stagger của chuyến cuối + 420ms delay CSS + 600ms flight + 48ms grace. Nếu cùng nhịp xáo nọc, delay xáo trước đó đã nằm trong stagger. Chia sẻ cùng hằng số thời lượng với overlay bỏ thiết bị để không cắt flight.

Khi kéo bài BANG! rời khỏi mép bàn, trạng thái drop-target được xóa để viền sáng tắt; dragleave giữa các phần tử con không xóa mục tiêu hiện hành.

Dragleave ưu tiên relatedTarget nằm trong board; nếu trình duyệt không cung cấp phần tử đích, dùng clientX/clientY và bounds của board để tránh xóa highlight giữa các phần tử con.

Lớp lá thiết bị bị thay dùng z-index 46: cao hơn overlay lá hành động (45) để quỹ đạo bỏ thiết bị không bị che ở giữa bàn; cùng mức shot (46) nhưng DOM shot nằm sau nên đạn vẫn nổi trên cùng.

Replay: khi bước hiện tại đổi, hàng cũ nhả nền/vệt nhấn bằng transition 180ms; hàng mới vẫn có entrance focus 380ms. Reduced-motion rút transition về 1ms theo quy tắc replay.

Banner kết nối trong phòng có exit fade/translate 180ms khi kết nối hồi phục, không biến mất ngay. Nếu connecting/reconnecting/disconnected đổi trước khi exit xong, timer bị hủy và banner chuyển sang trạng thái mới. Reduced-motion rút exit còn 1ms; timer được dọn khi component unmount.

DisconnectBadge giữ tên người chơi vừa kết nối lại trong 180ms để chạy chung connectionBannerExit; nếu danh sách mất kết nối đổi trong lúc exit thì hủy timer và hiện danh sách mới. Hàng đang thoát aria-hidden; reduced-motion 1ms; cleanup khi unmount.

RoomErrorBanner giữ lỗi đã được xóa trong 180ms để fade/translate; aria-hidden trong exit. Lỗi mới hủy timer và thay nội dung ngay bằng entrance mới. Reduced-motion exit 1ms và timer được dọn khi unmount.

Ba nhóm banner của RoomShell dùng chung useExitNotice để thống nhất giữ nội dung, hủy timer khi trạng thái đổi, reduced-motion và cleanup khi unmount.

BANG! chọn bài bỏ: khi đủ số lá, thanh tiến độ đổi sang tông xanh và tick trên nút xác nhận xuất hiện bằng pop 220ms. Trạng thái đầy đủ vẫn do số lượng/disabled xác định; reduced-motion rút tick còn 1ms.

Khi kéo một lá cần mục tiêu trong BANG!, hint đổi theo ghế đang rê: tên mục tiêu hợp lệ màu xanh hoặc giải thích ghế không hợp lệ màu đỏ; nội dung mới có entrance 120ms. Reduced-motion rút entrance về 1ms.

Khi k�o l� b�i BANG!, l� g?c ��?c n�ng l�n 8px, ph�ng nh? 1.06 l?n, xoay -2 �? v� c� b�ng �? 160ms; ?nh k�o theo con tr? c� g�c nghi�ng v� vi?n s�ng. Gh? h?p l? ��?c nh?n v�ng, gh? sai �?; v�ng b�n ph�t s�ng khi nh?n b�i. Escape h?y k�o. Reduced-motion r�t chuy?n ti?p v? 1ms.

Hi?u ?ng nh?c b�i khi k�o ch? b?t will-change trong l�c k�o �? tr?nh duy?t chu?n b? l?p chuy?n �?ng; l?p n�y ��?c gi?i ph�ng khi k�o k?t th�c ho?c h?y.

RoomRoute t?i l�?i board theo game �? ch? n?p m? giao di?n c?a b�n �ang v�o; trong l�c chunk ��?c t?i, fallback c� bi?u t�?ng s�ng/thu nh? nh? (900ms), t�n tr?ng reduced-motion. �i?u n�y gi?m ph?n JavaScript ban �?u v� tr�nh t?i animation/game logic kh�ng d�ng.

Replay: n�t ph�t/t?m d?ng c� aria-pressed v� n?i dung �?i tr?ng th�i v?i entrance 180ms (fade, d?ch 3px, scale 0.96?1); reduced-motion r�t c?n 1ms. D?ng n�?c �i �ang ph�t/tua ti?p t?c c� active cue v� auto-scroll.

V�y B?t reduced-motion: b? SVG animateTransform c?a qu�n v?a �i (320ms) v� hi?u ?ng bay qu�n sau khi th? (180ms); qu�n/�i?m �?n hi?n th? tr?c ti?p t?i v? tr� cu?i v?i cue t?nh. CSS fallback ti?p t?c gi? �i?m nh?n k?t qu?.

V�y B?t l?p l?i c�ng m?t n�?c sai: m?i l?n invalid target t�ng sequence v� remount v?ng �?, n�n animation ph�t l?i d� v?n c�ng node trong kho?ng 520ms; timer c? ��?c thay b?ng timer m?i.

RoomStatusBanner gi? tr?ng th�i ch? t?i �a 180ms khi ph?ng b?t �?u, �? chuy?n pha ch? ? ch�i fade/translate thay v? bi?n m?t t?c th?i. Banner exit aria-hidden; reduced-motion d�ng th?i l�?ng 1ms qua connection-banner-exit.

�ua Ho�ng �?o: cue x�c x?c v� pulse k?t qu? d?a tr�n kh�a tr?ng th�i n�?c �i (l�?t, m?t gieo, v? tr�, th�ng), kh�ng ch? gi� tr? m?t. C�c l?n gieo li�n ti?p c�ng s? v?n remount m?t x�c x?c v� ch?y animation; l?n �?u v�o ph?ng kh�ng t? ph�t cue.

RoomStatusBanner d?ng ping khi b?t �?u exit fade, tr�nh gi? animation l?p tr�n banner aria-hidden.

Replay: ph?n Chi ti?t n�?c �i m? b?ng chuy?n grid rows 0fr?1fr trong 180ms; m?i t�n xoay 90�. V?n d�ng native details/summary cho �i?u khi?n b�n ph�m; reduced-motion r�t transition 1ms.

RoomStatusBanner c?p nh?t s? ng�?i ch? m� kh�ng remount to�n banner; ri�ng con s? pop 260ms theo s? ki?n gh? m?i, reduced-motion 1ms.

Replay details ?n disclosure marker m?c �?nh c?a browser �? chevron xoay t�y ch?nh l� ch? b�o m?/��ng duy nh?t; v?n gi? semantics native summary.

Replay: thao t�c tua th? c�ng t�ng sequence ri�ng �? active row remount v� ph�t l?i cue n?u ng�?i d�ng ch?n l?i ��ng n�?c �ang active. Playback t? �?ng v?n chuy?n highlight theo index b?nh th�?ng.

Thanh ti?n �? replay c� transition width 280ms cho c? pseudo-element WebKit v� Firefox (::-moz-progress-bar); reduced-motion r�t c? hai c?n 1ms.

Replay summary c� focus-visible outline v�ng v� color transition 140ms cho thao t�c b�n ph�m; reduced-motion r�t transition c?n 1ms.

L?ch s? v�n: li�n k?t Xem l?i c� color/translate hover transition 140ms, focus-visible outline v�ng; reduced-motion r�t transition 1ms. �i?u h�?ng ti?p t?c d�ng View Transition.

Reduced-motion c� override transition-duration 1ms v� t?t smooth scrolling to�n c?c, bao g?m c�c n�t Tailwind ch�a c� selector ri�ng; animation CSS v?n d�ng cue t?nh/override ri�ng theo t?ng game.

GameLibrary gi? th? v?a b? lo?i kh?i k?t qu? trong 220ms �? fade/translate/scale ra; timer ri�ng theo gameKey, h?y khi game quay l?i k?t qu? v� d?n khi unmount. Th? exit aria-hidden, pointer-events-none v� c�c n�t disabled; th�ng b�o r?ng �?i t?i h?t exit. Reduced-motion r�t exit c?n 1ms.

BANG! hien goi y keo tha ngay duoi tay bai khi co it nhat mot la thao tac duoc: keo len ban de dung/chon bai, keo len ghe de chon muc tieu. Goi y co entrance ngan va icon co hover motion; reduced-motion rut animation/transition con 1ms. Tooltip, click va phim ban phim van cung cap cac cach thao tac khac.

BANG! GameLogPanel pulse new-event badge appears when closed and log entries get category-specific entrance cues; opening/closing rotates the disclosure chevron. Ô Ăn Quan shows the submitted sow source and expected route while waiting for server confirmation. Vây Bắt keeps a dropped piece visibly pending and identifies the attempted move until server confirmation/rejection. Đua Hoàng Đạo adds an accessible per-player progress bar whose width follows the racer animation and dice reveal delay. RoomInvite gives the copy button and status message a success state with a replayable entrance cue. All use existing reduced-motion rules.

O An Quan selected pit buttons expose ria-pressed/ria-expanded, and the dynamically shown direction chooser is a labelled group linked by ria-controls. This keeps keyboard and screen-reader selection in sync with the existing selected-pit lift/glow animation.

Zodiac Race player progress meters animate 	ransform: scaleX() from the left instead of width, so the synchronized race cue avoids layout-triggering animation.

Reduced-motion also clears the Zodiac Race progress-bar reveal delay; the racer and progress value jump to the confirmed final position together instead of leaving an unnecessary dice-reveal wait.

HandFan listens for live changes to prefers-reduced-motion; if the preference becomes active during a WAAPI deal/FLIP, it cancels in-flight card animations and leaves cards at their current layout positions. The listener is removed on unmount and uses the legacy MediaQueryList listener API only as a fallback.

BANG! victory overlay now fades its backdrop in over 220ms while the result card runs the existing outcome-specific win/lose/neutral entrance. Reduced-motion shortens both layers to 1ms.

BANG! drag guidance is positioned as a fixed overlay instead of a sticky in-flow row, so mounting it at drag start does not move the board or shift drop targets. The hint remains pointer-transparent and keeps its entrance cue.

When the BANG! hand becomes empty, its empty-state message enters with the shared short action cue instead of appearing abruptly. Reduced-motion uses the shared 1ms rule.

GameLogPanel sets its collapsed MỚI badge when the log length actually changes while closed; closing the panel alone does not create a false new-entry badge. When open and scrolled away from the bottom, new rows keep the existing jump-to-latest affordance.

The collapsed GameLogPanel badge and the open-panel jump-to-latest button use the current log length as their key, so each later batch of new rows replays its entrance cue while the affordance remains visible.

When GameLogPanel detects a shorter log snapshot (game reset), it clears prior row expiries and the new-entry indicator, resets the follow position, and synchronizes the scroll-length baseline so a cleared log is not announced as fresh activity.

Vây Bắt's confirmed-move piece cue uses opacity/scale with a static green glow instead of animating ilter over time; reduced-motion keeps the piece static with a clear halo.

AnimatedNumber subscribes to live prefers-reduced-motion changes while a counter is moving. Enabling the preference cancels pending delay/RAF and displays the latest confirmed value immediately; the media listener is cleaned when the value changes or the component unmounts.

WaitingRoomsList and GameLibrary also listen for live prefers-reduced-motion changes while exits are pending. Enabling the preference clears their exit timers/state immediately so aria-hidden rows/cards no longer leave temporary gaps; listeners are cleaned on unmount.

The shared useExitNotice handler for connection, room-status, disconnect and error banners ends an active exit immediately when prefers-reduced-motion becomes enabled; it clears its timer and removes the media listener when leaving ends/unmounts.


Chat composer shows a visible character count near its 500-character limit, and the input references the count for assistive technology without announcing each keystroke.


Media truy cap giam chuyen dong gio rut moi CSS animation ve 1ms, bo delay va gioi han con mot vong lap. Cac cue co override rieng tiep tuc dung quy tac cu; animation moi va animation tu thu vien ben thu ba mac dinh cung ton trong reduced-motion.


Zodiac Race: the horizontally scrollable track is a keyboard-focusable named region, so keyboard users can reach and scroll the complete race board; focus has a visible amber outline.

Vay Bat board intersections are keyboard-accessible buttons: Tab reaches playable points, Enter/Space selects a friendly piece or moves it to a highlighted legal point. Each node announces its occupant and legal-target status; focus gets a visible gold ring, and the on-board hint explains the keys.

### Reduced motion toggled during a BANG! card effect

The played-card overlay now cancels its active timer and queued card effects immediately when the user enables reduced motion mid-animation. This prevents a shortened CSS animation from leaving a stale overlay visible for the original flight duration.

### Vay Bat live reduced-motion handling

The board now tracks changes to the reduced-motion preference during a move. An in-flight SVG move snaps to a static destination cue, and an active return animation is cleared immediately, because SVG SMIL movement is not shortened by the CSS reduced-motion rules.

### Shared game cues honor live reduced-motion changes

The shared value-delta, changed-index, and change-flash hooks now observe the motion preference while mounted. When reduced motion is enabled, existing numeric deltas and board highlights expire on a short 180 ms window instead of lingering for their full motion duration; new cues use the same short window. This applies consistently to score, capture, turn, and piece-change feedback across games.

### BANG! health feedback honors live reduced-motion changes

Health delta labels, damage shakes, and healing flashes now shorten their active timer when reduced motion is enabled during a cue. New cues also use the shorter duration while the preference is active, keeping the health response synchronized with the CSS motion rules.

### BANG! draw, hand-count, shot, and turn cues honor live reduced motion

Card-draw flashes, public hand-count deltas, muzzle flashes, and turn-start cues now shorten their active timer when reduced motion is enabled mid-cue. New cues use the reduced duration too, so the card-flow and turn feedback no longer outlast their shortened visual treatment.

### BANG! elimination, dealing, defense, equipment, and duel cues honor live reduced motion

The remaining short-lived BANG! overlays now use the shared reduced-motion preference. Elimination and initial-deal states, defense and duel feedback, and equipment entry/exit chips shorten existing timers when the preference turns on and use a short window for new events.
Newly received card identity highlights also shorten their retention when reduced motion is enabled during arrival.

### Long board sequences honor live reduced-motion changes

Ô Ăn Quan sowing and capture sequences and Zodiac Race moves now shorten their stored animation lifetimes when reduced motion is enabled during playback. Their CSS already switches to static cues; the active game state now also clears promptly instead of retaining hidden travel overlays for the original full duration.

Vay Bat also shortens active capture bursts and moved-piece trails to 180 ms when reduced motion is enabled during play.

### BANG! public card-flight overlays honor live reduced motion

Public draw, deck reshuffle, and discarded-equipment flights now shorten their existing overlay lifetimes when reduced motion is enabled mid-flight. New flights use a short 180 ms cleanup window, and rejected-action feedback uses the same reduced duration; request timeout states remain independent of visual motion.

### BANG! public draw, reshuffle, equipment discard, and rejection overlays honor live reduced motion

Public card flights and deck reshuffle overlays now shorten their active expiry when reduced motion is enabled mid-flight. Equipment discard and rejected-action cues also use the reduced window while new and active. Network-response pending states keep their independent timeout so preference changes do not cause false rejections.

### Invalid-move feedback honors live reduced motion

Rejected roll and sowing cues on Zodiac Race and Ô Ăn Quan now shorten their active and future visual states when the reduced-motion preference is enabled. Their server pending timeouts remain unchanged.
Vay Bat invalid-node feedback also shortens its timer when reduced motion is enabled mid-cue.

### Shared reduced-motion subscription

Active game hooks now subscribe through one shared useSyncExternalStore listener for prefers-reduced-motion. The single MediaQueryList listener is attached while at least one cue is mounted and removed after the last subscriber leaves, avoiding a separate system listener in every hook instance.
BANG! HandFan WAAPI cancellation and Vay Bat board cues also consume this shared preference snapshot, so the game layer no longer installs separate listeners for those components.

AnimatedNumber and BANG! played-card effects now consume the shared motion preference. Counters cancel their RAF and land on the confirmed value when motion is reduced; card overlays shorten to 180 ms and queued overlays are cleared when the preference changes live.

GameLogPanel event-row highlights now consume the shared preference and remove their active animation classes immediately when reduced motion is enabled mid-entry.

### Shared motion preference in room chat and status banners

The shared subscription now lives under the app hooks layer. Room chat message highlights expire immediately when reduced motion is enabled during their entrance, and connection/status exit notices finish without leaving hidden content occupying space.

The global reduced-motion fallback now also clears transition delays, including inline delays on gameplay progress cues, so CSS transitions do not wait before snapping to confirmed state.

### Gameplay state feedback and accessible interaction

Zodiac Race announces confirmed racer movement, crate pickups, and finishing wins through a polite live region while keeping the visual movement cues unchanged. On the O An Quan board, keyboard selection moves focus into the direction choices; Escape clears the preview and returns focus to the selected pit. These cues keep state changes perceivable for visual, keyboard, and screen-reader play.

AnimatedNumber skips animation-frame state updates when the rounded display value is unchanged and resolves zero or invalid durations directly to the confirmed value, reducing unnecessary React renders for frequent game counters.

### Unified turn beacon

Active-turn markers across BANG!, O An Quan, Vay Bat, and Zodiac Race now share a soft scale-and-glow pulse instead of the generic opacity-only pulse. Reduced-motion mode holds a steady highlighted marker so turn ownership remains visible without motion.

### Gameplay animation coverage map

| Game | Confirmed activity | Visible feedback |
| --- | --- | --- |
| BANG! | Initial deal, draw, play, discard, equipment, transfer, attack, defense, damage/heal, elimination, turn, victory | Card travel and landing, shot/impact overlays, count deltas, player flashes, log-row entrances, result entrance |
| O An Quan | Pit selection, sowing/relay, capture, score, refill, rejected move, turn, victory | Path preview, staggered seed travel, capture flight, animated pit/score values, rejected-pit cue, turn/result entrance |
| Vay Bat | Selection, legal destinations, drag/drop, confirmed move, capture, rejected move, turn/count changes, victory | Selected-piece pulse, destination markers/routes, ghost drag and return, move trail/impact, capture burst, deltas, result entrance |
| Zodiac Race | Roll, racer movement, crate pickup, finish, rejected roll, turn, victory | Die roll/pending state, tile travel/hop, pickup and counter delta, finish cue, turn marker, result entrance |

The animation hooks ignore first-mount hydration or reset their history when the room changes. Their timers shorten or switch to static feedback under reduced motion. This map records source-level coverage; runtime visual review remains a separate verification step.

### Victory emblem halo

Win result emblems now emit a short gold halo ring across all four games to strengthen the confirmed end-of-game beat. The halo is omitted when reduced motion is requested; the existing static victory styling remains visible.

### Zodiac Race landing feedback

The destination tile now emits a brief ring timed to the racer's travel and hop sequence. This makes the landing point legible on the track in addition to the moving racer and updated position counter. The global reduced-motion rule removes animation delay and duration for this ring.

### O An Quan refill and score synchronization

When a move refills an empty side, the score counter and floating score delta now wait for the final refill seed to land. This keeps the displayed deduction of five points synchronized with the score-to-pit seed flights; capture and end-of-game settlement delays are still included.

### Vay Bat capture count reveal

The captured-piece counter and its floating delta now wait until the staggered capture bursts finish. The reveal delay remains stable for the lifetime of the delta so it does not jump when the SVG capture overlay is cleaned up. Reduced-motion mode removes the delay, and the delta stays visible long enough to complete after the reveal.

### Vay Bat capture transfer

After the local capture burst, the captured piece now flies from its last board node to the captured-piece counter for the opposing side. The counter and floating delta reveal when that flight lands. The flight layer is hidden under reduced motion, where the counter updates immediately.

### BANG! projectile identity

When a confirmed Bang!, Gatling, Indians!, or Duel enters a matching pending response, projectile origins and destinations now come from the server's player IDs. Log names remain a fallback for already-resolved or non-response actions. This keeps shot choreography attached to the correct seats when display names repeat.

### Defeat result halo

Defeat emblems now use a short red halo burst, distinct from the gold win ring, while retaining the existing subdued defeat entrance. Reduced-motion mode suppresses both rings and keeps the result styling static.

### Zodiac Race finish sequence

The finish flag now waits until the winning racer reaches the final tile, then plays its arrival cue. The result panel appears after the travel overlay clears, preserving the race-to-finish sequence. Reduced-motion mode shows the final state and result immediately.

### BANG! hand interaction guidance

The hand prompt adapts to the available layout: desktop users see the drag-to-play/drag-to-target instruction, while narrow layouts explain that tapping selects a card and targets are chosen from the seats. The existing click/tap controls remain available alongside desktop drag and drop.

### Active-turn beacon ring

The shared active-turn marker now combines its existing scale-and-glow pulse with a thin outward ring. The ring is decorative, does not receive pointer events, and is hidden when reduced motion is requested; the highlighted static marker remains visible.

### Vây Bắt turn guidance for assistive technology

The visible turn prompt remains concise and animated, while a separate polite live status announces whose turn it is, pending move confirmation, and the number of legal destinations after a piece is selected. Drag-target changes stay out of the live region to avoid repeated announcements while the pointer moves.

### Ô Ăn Quan end-of-game reveal

The winner panel and rematch control wait until the final sowing, capture/settlement, refill, and score-reveal animation have completed. Reduced-motion mode reveals the result immediately. The delay timer is cleared when the room or winner state changes.
The sowing event lifetime also covers the result reveal buffer after the final sowing step. This keeps the computed winner delay stable until it completes, even for unusually long sow paths.

### Vây Bắt end-of-game reveal

The result panel and rematch control wait for the last confirmed piece move to settle and for any capture transfer to reach its counter. The reveal deadline is recorded from the board snapshot, so clearing the temporary piece overlays does not shorten it. Timeout wins and already-finished rooms reveal immediately; reduced-motion also keeps the result immediate.
The final move settle window includes the 420 ms destination impact cue before the winner panel enters.

### Ô Ăn Quan preview exit

Direction previews now fade the numbered sowing path over 130 ms when the pointer or keyboard focus leaves a direction control. Entering the other direction cancels the exit timer and swaps the preview in place, avoiding a blank flicker. Explicit move, cancel, turn, room, or connection changes still clear it immediately; reduced-motion ends the fade immediately.

### BANG! hand layout under reduced motion

HandFan cancels active Web Animations in its layout phase when reduced motion becomes active, before another paint can show an intermediate card position. It resets the FLIP baseline before motion is re-enabled so the next card update starts from the current layout.
The BANG! reduced-motion flight shortener also tracks active card-draw, deck-reshuffle, and equipment-discard overlays so newly arriving effects are shortened while the preference remains enabled.

### Ô Ăn Quan overlapping end-of-game events

Each confirmed sowing event records its creation time. The winner reveal waits for the latest absolute score-reveal deadline across all still-active events, plus a short result beat, so an earlier long settlement cannot be cut off by a quick final move.
Score counters and floating score deltas use the same latest active-event deadline as the result choreography, preventing an earlier long settlement from being visually overtaken by a quick later move.

### Ô Ăn Quan overlapping pit updates

Each changed pit now delays its highlight and count cue until the latest active sowing event that actually reaches that pit. The delay is memoized against the event list and is included in the highlight lifetime, so later quick moves cannot make an earlier seed landing appear prematurely.

Quan capture flashes stay tied to every active capture event. Per-pit capture sequences alternate keyframes so consecutive captures on the same Quan replay the full flash; reduced motion keeps its brief static cue.

Zodiac Race reduced-motion behavior now also shortens the player progress bar and landing ring, matching the racer travel cue and removing its roll reveal delay.

Zodiac Race now queues multiple confirmed position changes per seat while that racer's prior travel animation is active. Different seats still animate concurrently, and room changes clear pending travel events.

Vay Bat keyboard-confirmed legal moves now clear any prior invalid-target flash before starting the move cue, matching pointer and drag interactions.

BANG! now preserves the active and queued confirmed card-action cues when reduced motion is enabled mid-sequence. The active cue is rescheduled to a brief 180 ms window, and queued cues use the same shortened lifetime instead of being discarded.

BANG! HandFan now tracks its FLIP layout animations separately from card arrivals. When cards are reordered again mid-flight, it reads the current visual position, cancels the prior layout tween, and continues toward the new layout without stacking transforms. Room changes and reduced-motion activation cancel both animation types and reset the position baseline.

HandFan tracks per-card arrival animations independently from the latest draw batch. A later hand reflow will not start a FLIP transform on a card whose deck-to-hand arrival is still running; arrival motion is cleaned on completion, cancellation, room changes, reduced-motion activation, or card removal.

New BANG! hand-card arrival markers now keep independent expiry times. A later draw no longer removes the earlier card's arrival highlight; played/removed cards are pruned immediately, and reduced motion shortens every active marker.

Ô Ăn Quan direction-choice cancellation now returns keyboard focus to the selected pit for both Escape and the Cancel button, preserving the select/cancel/reselect interaction flow.

Queued Zodiac Race moves now skip the initial roll-reveal pause after the first move. Racer travel, landing effects, per-seat position, and the progress bar follow the active queued segment so the visual route and displayed tile stay in sync.

The Ô Ăn Quan direction chooser now exits with a short fade/settle when canceled. Controls are disabled during the exit, the selected pit regains focus, and reduced motion uses a near-instant exit.

BANG! invalid card drops now produce a finite red seat shake and a live status message after release. The card remains selected so the player can immediately redirect it; the cue clears on turn/phase changes and respects reduced motion.

Zodiac Race movement events now carry each seat's before/after crate count. While moves are queued, the displayed crate total and gain cue follow the active segment; crate pickup effects trigger on that segment's tile with a per-seat pickup sequence.

Invalid BANG! target drops now select the dragged card explicitly instead of toggling it through click behavior, so dragging an already-selected card cannot silently deselect it. Rejection feedback only appears when the card is otherwise playable.

Zodiac Race movement announcements now use the active queued move's crate-count delta. Screen readers announce the pickup on the same segment that shows its counter and tile cue, including when several moves arrive close together.

Vay Bắt invalid-move feedback now also updates the polite live status region. Repeated rejection on the same target remounts the status message so assistive technology can announce the feedback again; the message confirms the piece remains selected.

BANG! valid target seats keep a clearer gold outline through the pulse cycle: the low point is now 0.34 opacity instead of 0.12, while the peak and reduced-motion static highlight stay unchanged.

### Route transitions under reduced motion

Shared page route snapshots now disable their view-transition animations entirely when reduced motion is requested, avoiding even the 1 ms translate/scale effect. Normal-motion route transitions remain unchanged.


### O An Quan and Zodiac Race turn announcements

When the confirmed turn changes, O An Quan and Zodiac Race now send a polite screen-reader announcement naming the active side/player. Initial room hydration remains silent, the announcement follows the existing turn-change sequence, and completed games do not announce another turn.

### Shared opponent waiting cue

BANG!, O An Quan, and Vay Bat now use a small three-dot staggered amber cue while the local player waits on an opponent. The indicator is hidden from assistive technology because the adjacent text states the waiting status. Reduced-motion mode keeps all three dots visible and static.

### Vay Bat target pulses replay on source changes

Legal destination markers now key their pulse to both the selected piece and destination node. If two selected pieces share a legal destination, switching the source remounts that marker and replays its cue instead of leaving the old pulse mid-cycle.

### BANG! hand drag source pose

The hovered hand card now keeps its intended lifted, tilted drag-source pose; the generic hover transform no longer overrides it. Reduced-motion mode limits that pose to a small vertical lift without scale or rotation.

### Reduced-motion interaction presses on game boards

When reduced motion is requested, hover and active states on BANG!, O An Quan, and Zodiac Race controls no longer translate or scale. Color, border, and shadow feedback remain so the interactive state is still visible. The BANG! hand drag source retains its small lift while its normal hover lift is removed.

BANG! valid target seats also suppress their hover/press lift and scale under reduced motion; their gold ring/border remains as the target cue.

BANG! hand cards also skip hover and keyboard-focus lift/scale under reduced motion; focus outlines and hover shadows remain.

Vay Bat selected pieces now keep a steady green edge glow under reduced motion instead of compressing the selection bounce to 1 ms; the selected-node ring remains visible.

Zodiac Race now also shows the shared opponent waiting dots beside the active player's name, only for seated players whose turn it is not. Spectators, the active player, and finished games do not show the waiting cue.

The Vay Bat drag ghost also uses a static silhouette and green shadow in reduced-motion mode, rather than playing its 150 ms scale/lift entrance in 1 ms. Its pointer-following coordinates remain responsive.

Direction arrows in O An Quan no longer slide on hover or keyboard focus when reduced motion is enabled; the button's color and outline cues remain.

### Responsive in-flight geometry for O An Quan and Vay Bat

Coordinate-based seed sowing, score-transfer, and captured-piece overlays now remeasure their source and destination when the containing board resizes. This keeps in-flight cues attached to the current pit, node, and counter positions during responsive layout changes. Resize observations are frame-coalesced and cleaned up with the board.

### Responsive in-flight geometry for BANG!

BANG! projectile paths, played-card origins/targets, card transfers, equipment discards, public draws, and deck reshuffles now remeasure against the board after a resize. Existing flight keys and stagger delays are retained where possible so resize updates geometry without replaying the action sequence.

The shared resize observer now activates when a conditional board/hand element appears after mount, and disconnects when that section is absent. BANG! hand FLIP layout also recalculates on resize so cards settle into the new fan geometry without losing their in-flight position.

BANG! HandFan also follows the board resize revision, so its arrival source is remeasured when the deck/player row moves even if the hand container keeps the same dimensions.


Vay Bat keyboard focus on a board node fades in its dashed gold focus ring (140 ms). The reduced-motion rule reduces node transitions to 1 ms while retaining the focus ring itself.


BANG! public role labels now use a brief opacity and settle entrance when player seats mount on the gameplay board. The label remains text throughout the effect; reduced-motion uses the global near-instant animation rule.


Vay Bat unselected owned pieces use a soft green shadow on hover-capable pointers during an interactive turn, signaling that they can be selected. The existing filter transition supplies the entrance; touch devices do not receive hover-only feedback.

BANG! opponent role labels stagger their entrance by 36 ms per seat so the reveal can be scanned across the table; the total stagger remains under 250 ms.


Vay Bat legal empty destinations add a brighter mint outline and glow on pointer hover, complementing their entry pulse and legal-route cue. This hover-only response is limited to devices that support hover.


Selecting an Ô Ăn Quan pit gives its seed count a one-shot 260 ms scale cue alongside the pit lift. Reduced-motion mode suppresses the count animation while the selected pit remains visually marked.

The local player's private role label in the BANG! own-player panel uses the same reveal entrance as opponent role labels, so role assignment feedback is consistent across the whole table.

BANG! character labels follow the role reveal by 90 ms on opponent seats and the local player panel, sequencing the initial player information in a consistent order.

The selected-count scale is applied to a wrapper around AnimatedNumber, keeping it independent of sowing arrival delays and pit-count update keyframes.

For Zodiac Race with reduced motion enabled, position and crate counters use zero reveal delay so they update alongside the racer and progress bar's immediate confirmed-position update.

The local BANG! hand-count label now shares the opponent draw/loss emphasis, in addition to its interpolated number and floating delta, so card-count changes read consistently around the table.

The BANG! target-selection prompt now interpolates the count of legal targets over 220 ms as the available set changes; the shared number component shows the confirmed value immediately under reduced motion.

BANG! hand-count draw/loss emphasis alternates keyframes per change event, allowing repeated same-kind updates to replay cleanly on local and opponent panels. Both variants follow the reduced-motion rule.

The BANG! game-log title's total event count now interpolates over 220 ms when entries arrive, complementing the individual row entrances; reduced-motion shows the updated count immediately.

The BANG! hand-count keyframe sequence advances independently of the visible aggregate delta, so net-zero draw/loss batches cannot cause a later cue to reuse the same class without replaying.

Ô Ăn Quan score delta labels key by side/value, and Zodiac Race crate deltas key by seat/crate sequence/value, so each updated floating delta starts a fresh cue when snapshots change during an active animation.

BANG! HP delta overlays key by a monotonic per-room event sequence, allowing rapid damage/heal updates to replay the floating cue while the displayed delta continues to aggregate and expire on its existing timer.

BANG! removed equipment chips carry a per-item sequence in their key so a repeated loss of the same item can replay its exit. Expiry callbacks check the active sequence before clearing a chip, preventing an older timer from removing a newer exit cue.

BANG! equipment-enter expiry callbacks now check their per-item sequence before removal, protecting a newer entrance from an already queued timer callback belonging to an earlier equip.

BANG! played-card overlay expiry callbacks verify the active effect key before advancing the queue, preventing a stale timeout from clearing or prematurely advancing a newer card choreography.

Repeated BANG! value, damage/heal, turn-start, draw, muzzle, and duel-loss flashes now guard expiry by event sequence. Reduced-motion rescheduling and fast consecutive snapshots cannot let a stale callback clear a newer visual state.

BANG! HP/hand delta, elimination, and initial-deal expiries verify their active event sequence. Sequence counters stay monotonic across room resets so callbacks left queued by an earlier room cannot clear a cue in the next room.

BANG! board-level public-draw, deck-reshuffle, equipment-discard, and invalid-drop cleanup timers now carry revisions. New events, room/turn resets, and reduced-motion rescheduling invalidate older callbacks before they can clear current overlays.

The Zodiac Race move-cleanup timer and winner/result reveal timers in Ô Ăn Quan and Vây Bắt use revisions so callbacks from an earlier queue or result state cannot update a newer state.

The BANG! hand hint announces the playable-card count to assistive technology. The room waiting banner announces participant and available-seat changes through a polite live status region.

Zodiac Race rejected-roll feedback uses a revision guard. A prior rejection timer cannot clear the latest retry message or its replayed shake, including after reduced-motion rescheduling, room changes, or unmount.
The pending Zodiac Race roll watchdog also carries a revision, so a late timeout from an earlier request cannot replace newer dice feedback with a false rejection.

Ô Ăn Quan move-pending, rejected-move, and direction-preview exit timers carry revisions. Replaced previews and accepted moves invalidate old callbacks so they cannot hide the current path or replay stale rejection feedback.

Vay Bat move ghosts, captured pieces, moved-piece cues, return flights, and invalid-node flashes now guard cleanup callbacks by revision. Rapid retries, repeated moves, confirmation, reduced-motion changes, room resets, and unmount cannot let an old timer clear newer feedback.

BANG! defense and Duel-loss flashes now resolve name-only log entries to player IDs. Unique names map directly; duplicate names use the unique player whose public hand count dropped in that snapshot, avoiding animation on unrelated seats. Ambiguous duplicate-name events are left unassigned rather than flashing multiple players.

BANG! confirmed defense and Duel-loss cues are keyed by player ID at the seat layer. Name-only game-log entries resolve directly when names are unique, or against the unique public hand-count decrease when names collide. This prevents confirmed action animations from being attached to the wrong seat.

The BANG! event log now gives standalone Hoang loan and Cat Balou outcomes a distinct card-action entrance. Successful transfers and discards keep their more specific cues because those categories are matched first.

BANG! played-card events now carry the resolved actor ID from the confirmed snapshot into card, equipment, and projectile overlays. Combat responses prefer server response IDs; other name-only actions resolve against the unique player whose public hand count dropped, so duplicate display names cannot send effects from the wrong seat.

BANG! Panic card transfers and Cat Balou target-discard flights also resolve their destination seat by player ID. Duplicate target names use the unique target whose hand count fell; the deck-to-hand source cue uses the same snapshot comparison and is suppressed during room changes.

BANG! named combat targets resolve through public card-count and HP deltas when response IDs are no longer present. Duplicate names animate only when exactly one matching seat changed; the bullet/aim and discard/transfer destination cues share the resolved target ID.

BANG! confirmed defense flashes resolve duplicate defender names against the direction of the hand-count change. Missed and Indian Arrow defenses require a decrease; Barrel Beer requires an increase because the defender draws a card. Ambiguous snapshots remain unassigned.

Zodiac Race rolls cycle through die faces while awaiting server confirmation, synchronized with the rolling die motion. The confirmed face still comes from authoritative game state. Reduced-motion mode keeps a stable face and skips the cycling interval.

O An Quan sowing and refill flights render as shaded bean-shaped seeds with a warm highlight and edge glint, making individual tokens easier to follow across the board. Existing stagger, trajectory, capture timing, and reduced-motion handling remain in place.

Vay Bat legal destination markers respond to both pointer hover and keyboard focus with a short magnetic scale-up and brighter glow. This gives an explicit target confirmation cue while preserving the existing selectable nodes and reduced-motion override.

Game replay playback now shows a thin playhead along the active move row. Its duration follows the selected playback speed, and reduced-motion mode shows a static progress cue instead of animating it.

BANG! hand reflow uses a subtle direction-aware tilt and scale as retained cards slide into their new fan positions after a draw or discard. New-card arrivals remain separate, and reduced-motion mode continues to skip WAAPI layout motion.

BANG! seat damage shake, heal glow, and turn-start glow can now play concurrently. Heal and turn highlights render on independent inset-glow layers, so their box-shadow animations do not replace the seat's shake or each other. Reduced-motion mode keeps a short static color cue.

O An Quan selected-pit emphasis now uses a scale transition instead of an element-level keyframe animation. That lets it coexist with the pit's state-update glow and rejected-move shake; the selected count and capture cues continue on their own elements.

Vay Bat piece selection now eases through the piece's existing filter transition and selection ring instead of running a transform keyframe on the moving piece. Rapid reselection during the move can no longer override the move-pop animation.

O An Quan capture-of-Quan rings now animate on a dedicated pseudo-element rather than the pit button itself. The capture outline can therefore appear at the same time as the pit count-change glow without competing for the button's animation or box-shadow.

BANG! forced hand loss after shooting a Deputy is now recognized as a bulk-discard choreography. The returned discard cards fly from the resolved shooter's seat toward the discard pile, with the standard stagger and reduced-motion behavior.

BANG! game-log rows arriving in the same state update now animate in chronological order with a short stagger, capped at eight delay steps. Each row stays active through its own delayed entrance; reduced-motion mode removes the stagger.

BANG! game-log entry timing resets when the room ID changes. Old per-row stagger expiries and unread-log state are cleared, and existing entries in the new room are treated as its baseline rather than replayed as new actions.

The BANG! accidental Deputy elimination log now uses the discard-specific entrance when its mandatory hand-loss clause is present, matching the card-flight consequence shown on the board.

BANG! hand arrivals now stagger by their order within each draw batch rather than by their absolute position in the hand. The arrival highlight remains active through the final staggered card animation.

O An Quan selectable pits now use the same gentle lift and glow for keyboard focus as for pointer hover. Reduced-motion preferences suppress the focus lift as well.

Vay Bat pieces now receive the same subtle glow on keyboard focus as on pointer hover, including on touch-first devices with an attached keyboard.

The Zodiac Race roll action now lifts slightly and brightens on keyboard focus, while its visible focus outline remains clear. Reduced-motion mode removes the lift and brightness movement.

BANG! target seats now lift and scale on keyboard focus like they do on pointer hover. Action-bar buttons also lift and brighten on focus. The reduced-motion rule suppresses these focus transforms while preserving focus outlines.

Vay Bat keyboard focus now traces the dashed node ring with a slow stroke-dash animation to make the active board point easier to follow. Reduced-motion mode keeps the ring visible and static.

O An Quan direction buttons now scale up and brighten on keyboard focus just as they do on pointer hover; the left/right arrow cue continues to shift toward the chosen direction. Reduced-motion mode suppresses these focus transforms.

During a Zodiac Race roll request, the disabled busy button now carries a softly pulsing inner ring in addition to the animated die. Reduced-motion mode freezes the ring and uses a steady busy outline.

BANG! end-turn and response buttons now pulse a restrained inner border while their request is pending, alongside the existing spinner and busy outline. Reduced-motion mode holds the border steady.

When BANG! enters a defense-response phase, each usable defense card receives a short amber outline entrance; blocked cards and the card already being submitted are excluded. Reduced-motion mode shows a static outline.

The BANG! central play drop zone now traces a subtle dashed inner border while a card is dragged over it, clarifying the active drop target. Reduced-motion mode leaves a steady outline.

A valid BANG! player target now pulses a thin inner border while a target card is dragged over that seat; invalid targets retain their red warning pulse. Reduced-motion mode freezes the valid-target border.

Playable BANG! defense-card outlines now enter in a short capped stagger following hand order, so several eligible responses read as a sequence rather than a single flash.

The O An Quan direction-cancel button now gets matching color and press-scale feedback on keyboard focus, alongside its existing pointer hover and press states. Reduced-motion mode removes the scale.

Shared room action buttons (including rematch, leave, and rematch-invite actions) now lift and brighten on keyboard focus when the pointer is elsewhere. Reduced-motion mode removes the translation and brightness change.

Zodiac Race crate pickups now send a small crate particle from the landed track tile to that player's cargo counter, synchronized to the pickup cue. Active race moves remain visible long enough for the existing 580 ms pickup animation to finish; reduced-motion mode omits the flight.

Zodiac Race move state now remains active through the delayed 340 ms landing ring as well as the travel and crate pickup cues, preventing short moves from removing the ring early.

Zodiac Race cargo count and gain delta now reveal when the flying crate reaches the player counter, not when it leaves the track tile. Move state remains active through the delivery and the 500 ms cargo-count highlight.

The cargo gain delta uses the same 500 ms highlight duration as the count pulse, so the move cleanup timer covers both without lingering past the visual cue.

When reduced motion is enabled, the cargo counter reveals immediately because the crate flight is omitted; normal motion waits for the crate to arrive.

BANG! now shows an inline explanation for each unavailable hand card during the player's turn, even when other cards remain playable. The end-turn hint stays limited to hands with no playable cards.

Vay Bat keyboard users can move focus between legal destinations with arrow keys after selecting a piece, then confirm the focused move with Enter or Space.


Vay Bat drag feedback now separates invalid destinations from legal move targets: an invalid node gets a red outline and guidance to move to a green dot, while a legal node retains the move-count instruction. The warning respects reduced-motion preferences.


Vay Bat shows the keyboard controls in the selected-piece hint: use arrow keys to cycle legal destinations and Enter/Space to move. Focused destinations use the existing animated focus ring; reduced-motion mode keeps the ring static.
The live status also announces the arrow-key destination navigation so screen-reader users receive the same action guidance as the visible hint.

BANG! opening-deal card backs now use a round-robin stagger across opponents, matching how the deck is dealt around the table. Later multi-card draws keep their shorter per-seat stagger, and reduced-motion mode removes the opening delay.

Vay Bat now emphasizes the route to the legal destination under pointer or keyboard focus. The route cue clears on target exit or selection change; reduced-motion mode holds a bright static route.
O An Quan direction preview keeps independent pointer-hover and keyboard-focus sources: leaving a button with the pointer restores the still-focused route instead of starting its fade. Preview sources clear on move, cancel, turn, room, or connection reset.


Vay Bat legal-route preview tracks pointer hover separately from keyboard focus. If the pointer leaves a destination while it still has focus, the route remains visible until focus moves away; changing the selected piece or room clears both sources.
Zodiac now keeps the confirmed die result visible with a compact per-racer from/to cue while racers are in motion, so players can follow the destination alongside the animated token.

### O An Quan: track sowing phase progress
The active sowing cue now shows the current step and estimated progress, with phase labels for sowing, capture, final settlement, or refill. The waiting message changes while the board animation is resolving. Reduced-motion mode omits the auxiliary progress timer.

