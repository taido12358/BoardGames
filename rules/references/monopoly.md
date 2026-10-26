# Cờ Tỉ Phú — classic US

## Phạm vi và nguồn luật

Game key `monopoly`, 2–6 người, bản classic Mỹ Hasbro C1009 (copyright 2016, in 2017-02-15),
bàn cờ 40 ô gồm 22 đường phố, 4 ga và 2 công ty dịch vụ. `rulesetId = classic-us-c1009-2016`.
Đồ họa HTML/Tailwind, không dùng artwork thương mại. Chưa tuyên bố hoàn tất toàn bộ game.

Nguồn tra ngày 2026-10-25:

- [PDF Hasbro C1009 chính thức](https://instructions.hasbro.com/api/download/C1009_en-my_monopoly-classic-game.pdf):
  đã đọc được bản tiếng Anh qua endpoint en-my; p0 xác nhận quy tắc xây/đấu giá/thế chấp,
  p1 xác nhận 2–6 người, thuế 200/100, tiền ban đầu và đổ riêng tính thuê dịch vụ.
  Catalog ghi số người khác; lấy bản PDF cụ thể làm chuẩn để không trộn edition.
- [Hasbro 00009, phần Classic Rules](https://www.hasbro.com/common/instruct/00009.pdf):
  chỉ tham khảo lịch sử; không dùng các lựa chọn khác edition để ghi đè C1009 đã chốt.

Fixture nguồn: `backend/BoardGame.Api.Tests/Monopoly/Fixtures/c1009-2016.json`, gồm thông số,
bốn bảng thuê đường phố, thuê theo nhóm màu, bảng thuê ga, giá ba ô ga/dịch vụ và giá Illinois.
[Sổ đối chiếu nguồn](monopoly-source-audit.md) ghi cụ thể dữ liệu đã đọc và phần còn thiếu:
18 bảng thuê đường phố, 24 giá mua, 28 mặt sau thế chấp, 32 mặt thẻ và thứ tự toàn bộ bàn cờ.
Không coi bảy mẫu tài sản minh họa là audit đầy đủ 28 giấy hoặc 32 thẻ.
Đấu giá đất/nhà bắt đầu 10; thuê dịch vụ đổ hai xúc xắc mới, lưu `utilityDice` riêng và không
ảnh hưởng đôi của lượt di chuyển. Điều chỉnh phạm vi 2–6 dựa trên PDF, thay cấu hình 2–8 trước audit.

## Code và lưu trữ

- `backend/BoardGame.Api/Games/Monopoly/`: bảng giấy đất, types, luật và adapter `IGameEngine`.
- `frontend/src/games/monopoly/`: bàn cờ, chi tiết giấy đất, quản lý, đấu giá, giao dịch,
  hướng dẫn, tạo phòng, nhật ký. DI trong Program; registry và lazy route theo gameKey.
- Không thêm bảng/cột riêng. PostgreSQL `GameRooms.GameKey = monopoly`; `MapJson` chứa
  edition và 40 ô; `StateJson` version 1 chứa tiền, người chơi, giấy đất, nhà, phase, xúc xắc,
  bộ bài, hàng đợi khoản phải trả, đấu giá, giao dịch và bước đi đang chờ sau phí tù.
- `GameMoves.MoveJson` lưu ý định; platform transaction/row lock và lịch sử/replay dùng chung.
- `GameMoves.ReplayStateJson` là cột JSONB nullable dùng chung cho snapshot sau hành động.
  Monopoly opt in qua `CreatePublicReplaySnapshot`; snapshot công khai không có hai bộ bài.
  Ghi nguyên tử khi bắt đầu, đi nước và timeout. Không cần chạy lại RNG để dựng replay.
- Ghế phòng mới `P0`–`P5` được suy ra từ user ID đã xác thực. Client không quyết định kết quả xúc xắc,
  tiền thuê hay số dư. Server dùng crypto RNG; luật nhận callback để test tất định.
- Xáo Fisher–Yates lúc đủ người. Thứ tự bộ bài lưu DB; `chance` và `chest` bị loại khỏi
  mọi payload viewer trước REST/SignalR, kể cả người chơi. Redis tiếp tục là cache.

## Nước đi qua SignalR

`MakeMove(roomId, JSON.stringify(move))` qua hub hiện có.

| Type | Trường thêm | Điều kiện |
|---|---|---|
| ROLL | — | Người đang đi, phase Roll |
| BUY / DECLINE | — | Người đến đất trống, phase Buy |
| BID | amount; tile khi đấu giá nhà | Người đấu giá hiện tại, giá cao hơn và đủ tiền |
| PASS | — | Rút khỏi phiên đấu giá |
| END | — | Phase End; đôi còn hiệu lực thì Roll tiếp cùng ghế |
| BUILD / SELL | tile | Chủ đất, xây/bán đều và đủ tiền/kho |
| SELL_GROUP | tile trong nhóm | Bán hết nhà/khách sạn nhóm với nửa giá vốn |
| MORTGAGE / UNMORTGAGE | tile | Chủ đất, nhóm không nhà; giải chấp trả gốc + 10% |
| PAY_JAIL / JAIL_CARD | — | Đang tù, trước khi đổ |
| SETTLE / BANKRUPT | — | Người có khoản nợ đầu hàng đợi, có thể khác người đang đi |
| TRADE | target, offered[], requested[], cashOffered, cashRequested, offeredCards[], requestedCards[], redeemRequested | Mọi người còn chơi ngoài Auction/Trade; đang nợ chỉ người mắc nợ được đề nghị |
| ACCEPT / REJECT | redeemReceived (tùy chọn khi ACCEPT) | Chỉ người nhận giao dịch |
| KEEP_INHERITED / REDEEM_INHERITED | — | Chủ nợ đang xử lý giấy đất thế chấp thừa kế |
| REQUEST_BUILD / SKIP_BUILD | tile khi yêu cầu mua | Ghế đang được hỏi nhu cầu nhà/khách sạn |

Hành động lỗi không persist thay đổi. Tiền là số nguyên. Nhật ký state giữ 80 dòng cuối.

## Luật đã triển khai

- Vốn 1.500, lương GO 200, thuế 200/100, bãi đỗ xe không thưởng. Server roll-off chọn lượt đầu.
- Hai xúc xắc, đôi đi thêm, đôi ba lần vào tù trước di chuyển.
- Thuê đúng bảng giấy đất, trọn màu nhân đôi đất trống, thế chấp không thuê. Ga 25/50/100/200;
  công ty dịch vụ 4× hoặc 10× tổng lần đổ riêng. Đất cùng nhóm thế chấp không xóa độc quyền nhóm.
- Tù: thăm tù khác vào tù; trả 50 hoặc thẻ; ba lần thử đôi. Đôi ra tù không đi thêm.
  Lần thử thứ ba thiếu tiền giữ nguyên vị trí đến khi xử lý nợ xong.
- 16 Cơ hội + 16 Quỹ cộng đồng kiểu classic, rút đầu/trả cuối, giữ thẻ ra tù đến lúc dùng.
  Lùi ba ô xử lý ô mới; ga gần nhất thu gấp đôi; dịch vụ gần nhất đổ mới ×10; sửa chữa tính
  từng nhà/khách sạn; khoản trả/thu nhiều người được xếp hàng đợi.
- Xây/bán đều, đủ nhóm không thế chấp, kho 32 nhà/12 khách sạn. Đổi khách sạn trả bốn nhà.
  Bán toàn nhóm tránh kẹt thanh lý khi thiếu nhà đổi khách sạn.
- Khi có thể thiếu nhà/khách sạn: phase BuildingDemand hỏi nhu cầu của chủ đủ điều kiện.
  Yêu cầu BUILD đầu tiên xác nhận mua một đơn vị. Người khác REQUEST_BUILD hoặc SKIP_BUILD;
  không trừ tiền trước khi đủ phản hồi. Đủ cung thì mua theo giá từng giấy đất; cầu vượt cung
  mới đấu giá giữa người đã muốn mua. Mỗi phiên bán một đơn vị; muốn mua tiếp gửi BUILD mới.
  Asset/lượt được giữ nguyên trong lúc hỏi; timeout không mua thay người được hỏi.
  Chủ đủ điều kiện có ít nhất giá mở đấu 10 vẫn được xác nhận nhu cầu để tham gia đấu giá,
  dù chưa đủ giá niêm yết. Nếu không phát sinh đấu giá, người thiếu giá niêm yết không được
  tự mua rẻ hay bị trừ quá số tiền đang có; nhật ký giải thích vì sao yêu cầu không được mua.
- Giao dịch hai bên xác nhận, kiểm tra quyền sở hữu/tiền/nhà/thẻ ra tù; hỗ trợ ngoài lượt
  và bán tài sản cứu nợ. Khi nhận thế chấp có thể trả gốc + 10% giải chấp ngay hoặc giữ
  thế chấp và trả 10% lúc nhận; người đề nghị và người nhận đều có lựa chọn riêng.
- Nợ chặn bỏ lượt/xây, cho thanh lý; chỉ phá sản khi tổng giá trị thanh lý không đủ.
  Tài sản/thẻ chuyển chủ nợ; nợ ngân hàng đưa đất đã giải chấp vào hàng đợi đấu giá.
  Người cuối chưa phá sản thắng.
- Đất thế chấp thừa kế được xử lý từng giấy: giữ thế chấp trả 10% ngay hoặc trả gốc + 10%
  giải chấp ngay. Thiếu lãi bắt buộc chuyển sang Debt, cho thanh lý hoặc giao dịch tài sản
  khác để trả. Hàng đợi lựa chọn và phase tiếp tục lưu trong JSONB, hỗ trợ phá sản dây chuyền.
- Timeout: đổ thay, từ chối mua/giao dịch, bỏ đấu giá, kết thúc lượt; thanh lý để trả nợ hiện có.
  Khi chờ xử lý thừa kế, mặc định giữ thế chấp và phát sinh khoản lãi bắt buộc.

## Replay có bàn cờ

Artifact có `moves[].state` nullable cho tương thích các ván cũ. Với snapshot mới, timeline
hiển thị đúng vị trí, xúc xắc, tiền, quyền sở hữu, nhà và nhật ký sau mỗi hành động.
`MonopolyReplayBoard` render ở chế độ chỉ đọc, không thay gameStore phòng sống, không tạo hub,
không có nút đi/chơi lại/rời phòng. Snapshot thiếu/hỏng có thông báo, vẫn đọc được intent.

Endpoint `/api/games/{id}/replay` đọc phòng Finished và các move từ PostgreSQL trước,
không phụ thuộc MinIO cho các phòng còn lưu DB. Phòng đang chơi trả 404. MinIO vẫn là
archive cho ván đã kết thúc. Frame cuối dùng public snapshot thay vì lộ thứ tự bộ bài.

## Kiểm chứng và việc còn lại

Chi tiết kết quả: [log 2026-10-25](../logs/2026-10-25.md).

Full backend gần nhất: **370/370** (gồm 109 test luật Monopoly, 11 ca WebSocket xác định,
3 ca MinIO thật, 7 ca crash/restart Kestrel và 4 ca heartbeat PostgreSQL), frontend mục tiêu
**71/71** (25 Monopoly + 10 replay + 32 hub + 4 route), build/lint file đổi không có error. Xem [log mới](../logs/2026-10-26.md).
Nhóm backend mới nhất **124/124 pass**: 116 luật/nguồn + 8 crash/restart sau mở rộng fixture
và kiểm tra private state. Không có thay đổi runtime ở lượt audit này; chưa chạy lại full suite.

Đã chạy PostgreSQL thật và smoke 2 player + 1 spectator: 80 hành động, mua qua đấu giá,
giao dịch, đồng bộ 3 viewer, chặn spectator đi, REST/hub ẩn bài, reconnect đúng ghế,
chặn rematch giữa ván. Có test DB riêng cho phá sản/winner/rematch ván đã kết thúc.
Script tái sử dụng: `frontend/scripts/monopoly-smoke.mjs`, chạy từ frontend bằng
`node scripts/monopoly-smoke.mjs`; yêu cầu backend local có `EMAIL_PROVIDER=dev-log`,
`Auth__DevLogOtp=true`, log ở `backend/BoardGame.Api/bin/monopoly-live.log` (hoặc env
`MONOPOLY_SMOKE_LOG`). Chỉ cho kết nối localhost, email `.invalid`, token giữ trong memory.

Chạy ván đầy đủ với `node scripts/monopoly-smoke.mjs --full-game --players=3`.
Đã xác nhận room `2622c0c2-ebaa-4d3b-affc-0039b5a5bf56`: 675 hành động, winner P1,
678 snapshot công khai khớp state cuối; 122 yêu cầu xây, 23 thế chấp, 19 thanh toán nợ,
11 lần bán nhà cả nhóm, 2 phá sản và 8 lựa chọn thừa kế. Cả 4 client đồng bộ, reconnect
đúng ghế, rematch tạo phòng sạch và replay đọc được khi không có MinIO.

Sau khi chốt C1009 và sửa nhu cầu mua: room `bf271a08-b49e-4480-b858-e078fb6d043c`,
565 hành động / 568 frame, 4 player + 1 spectator, winner P0; đã đi qua 2 xác nhận mua nhà
và 6 hành động đấu giá House. Reconnect, rematch và toàn bộ frame/state cuối đều được kiểm tra.

1. Kiểm tra trực quan desktop/mobile; phiên này không có browser nào trong inventory CUA.
   Board hiện tối thiểu 660px, cuộn ngang.
2. Restart toàn backend giữa quyết định đang chờ: đã dừng/khởi động lại Kestrel trong phase Trade,
   xác nhận state/map nguyên vẹn, ghế đúng cho 3 player + 1 spectator, tiếp tục ACCEPT.
   Ván `50219ebc-a13a-4c62-933b-6a551cc3f2c6` kết thúc với 1090 hành động/1093 frame replay,
   winner P0, rematch/reconnect pass. Script: `node scripts/monopoly-smoke.mjs --restart-host --full-game --players=3`;
   sau checkpoint phải dừng host local rồi khởi động lại trong 60 giây, giữ cùng database.
   Đã mở rộng bằng 8 ca tiến trình Kestrel thật, DB riêng: crash/restart giữa HouseDemand,
   HotelDemand, HouseAuction, HotelAuction, Debt, Inheritance; rejoin đúng ghế/spectator,
   state và số move nguyên vẹn, tiếp tục quyết định. Có thêm đấu giá Property đã có người bid 10
   trước crash: người khác bid 11 sau khôi phục rồi nhận giấy, người dẫn cũ không bị trừ tiền.
   Bảy scenario so raw StateJson/MapJson trước/sau, gồm thứ tự hai pile còn 15 thẻ và một thẻ
   ra tù đang giữ ở mỗi bộ; public HTTP/SignalR vẫn không lộ pile. Ca thứ tám giữ buyer vắng mặt sau crash,
   scanner của host mới hết hạn presence cũ rồi broadcast kết quả. Đã sửa heartbeat cho tình
   huống Connected=true còn lưu sau crash, không reset tất cả ghế khi boot.
   House/Hotel, nhu cầu, đấu giá, scanner timeout
   và reconnect đã có test WebSocket TestServer/PostgreSQL xác định; các ván Kestrel thật bổ sung
   bằng chứng hoàn thành game. Chưa thay restart host bằng reconnect socket trong tuyên bố kiểm chứng.
3. Archive MinIO đã được kiểm chứng với container thật: BANKRUPT qua hub kết thúc ván và ghi
   object, artifact khớp DB, endpoint đọc fallback sau khi xóa đúng row test trong PostgreSQL tạm.
   Legacy thiếu snapshot vẫn đọc được; missing object trả 404; phòng chưa kết thúc không đọc
   archive; JSON hỏng trả 503 sau regression từng trả 500. Không xóa room dev để kiểm tra fallback.
   Build `docker compose build minio` trước test (image community cũ không tải được).
4. Đối chiếu đầy đủ từng thẻ/giấy đất với một edition classic đã chốt, lưu fixture chuẩn.
   Đã có 32 test hiệu ứng từng thẻ, chưa thay thế việc đối chiếu source ngoài repo.
5. Các ván chơi trước khi có snapshot vẫn chỉ có intent; không thể tái tạo chính xác RNG
   lịch sử của các ván này. Không tạo snapshot giả cho dữ liệu cũ.
6. Các failure frontend cũ: kiểm tra baseline thay hai module tích hợp bằng nội dung HEAD,
   26 fail/336 test; worktree mới 24 fail/349 test, không có failure mới so với baseline.
   Số failure GameLibrary thay đổi theo timing. Chi tiết trong log.
7. Scope sự kiện frontend đã có regression cho chuyển/rời phòng, start chậm, abort join đang gửi,
   cleanup route và reconnect. Backend gửi mã phòng trên state/ghế/chat/lời mời; frontend lọc theo
   ý định phòng, không lấy snapshot cũ làm ý định sau leave. Vẫn cần xác nhận thao tác trực quan bằng browser.

### Các ca transport đã kiểm chứng

`MonopolyHubIntegrationTests` dùng JWT và SignalR JSON qua WebSocket TestServer, DB thật,
cache/queue cố ý fail-fast. Có House/Hotel mua đủ cung và đấu giá, spectator bị từ chối,
snapshot không lộ bài, kho vật lý 32/12, rời phòng/nhiều tab/sai roomId/chuyển phòng,
reconnect tiếp tục quyết định và một lượt quét timeout broadcast đúng kết quả.

`RoomServiceIntegrationTests.TimeoutRefreshesTrackedRoomAfterConcurrentPurchaseWithoutConcurrencyFailure`
xác nhận `LockRoomAsync` refresh entity cũ dưới khóa hàng, giữ đúng đất/tiền sau BUY trước
khi tính timeout. Token concurrency trước đó đã ngăn mất dữ liệu nhưng làm lượt timeout fail.
