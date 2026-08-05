# Backlog

Việc chưa làm, chưa có ai nhận. Không phải kế hoạch chi tiết — chỉ liệt kê để không quên.

## Ghép phòng / vào phòng — Giai đoạn 2 & 3 (chưa làm, 2026-08-05)

Giai đoạn 1 (bảo mật danh tính ghế + dọn phòng rác + huỷ phòng) đã xong — xem
[`../history/milestones.md`](../history/milestones.md). Còn lại từ đề xuất ban đầu, người
dùng chưa yêu cầu làm:

- **Ghép trận nhanh ("Tìm trận")**: API/hub method tự chọn phòng `Waiting` còn ghế trống gần
  nhất theo `gameKey`, hết thì tự tạo phòng mới — dùng cùng khoá `SELECT ... FOR UPDATE` đã
  có ở `GameHub.JoinRoom` để tránh race. Hiện người chơi phải tự duyệt danh sách phòng ở
  `GameDetails.tsx`.
- **Danh sách phòng realtime**: `GameDetails.tsx` hiện chỉ polling `GET /api/games` mỗi 3s.
  Có thể thay bằng broadcast SignalR (group `lobby:<gameKey>`) khi phòng tạo/đầy/huỷ — giảm
  độ trễ, giảm số request định kỳ.
- **Xử lý mất kết nối/AFK giữa ván**: `GameHub.OnDisconnectedAsync` hiện chỉ dọn map
  connection nội bộ, không đánh dấu người chơi mất kết nối, không báo cho người còn lại,
  không có cơ chế timeout. Nếu người giữ lượt rớt mạng, ván có thể kẹt vĩnh viễn (đặc biệt
  Bang — lượt phải chờ đúng người phản hồi). Cần: đánh dấu "disconnected" trong state, thời
  gian ân hạn reconnect, hết hạn thì xử lý (skip lượt/xử thua) — generic ở Platform, engine
  tự quyết cách xử lý mất người.

## Game thứ hai — BANG! — ĐÃ LÀM (2026-08-05)

~~Game hidden-role kiểu BANG!~~ đã triển khai đầy đủ (`gameKey: "bang"`, 4-8 người, theme
Western gốc theo `van-de.md`). Chi tiết: [`../history/milestones.md`](../history/milestones.md),
[`../architecture/backend.md`](../architecture/backend.md), README.md mục "Game 002".

**Còn treo lại từ quyết định theme:** asset 12-cung-hoàng-đạo đã commit sẵn ở
`frontend/public/assets/games/zodiac/` (24 icon nam/nữ theo 12 cung + khung thư mục
equipment/shop cards/crates/carts/dice/effects/tokens) **không được dùng** cho BANG! —
người dùng chọn theme Western gốc theo spec thay vì reskin zodiac. Asset này vẫn còn đó,
chưa gắn với game nào; có thể dùng cho game thứ ba hoặc reskin BANG! sau này nếu muốn.

**Đơn giản hoá có chủ đích so với spec/luật gốc** (không phải bug — xem chú thích đầu
`Games/Bang/BangRules.cs`):
- Bia (Beer) vẫn hồi máu được kể cả khi chỉ còn 2 người sống (luật gốc: vô hiệu lúc đó).
- Không có UI chọn bài cụ thể để bỏ khi vượt giới hạn tay bài cuối lượt — server tự bỏ
  từ đầu danh sách (client CÓ THỂ gửi `discardCardIds` để chọn thủ công, nhưng
  `BangBoard.tsx` hiện chưa có UI cho việc này).
- Không có chat trong phòng Bang (Platform chưa có kênh chat generic — VayBat cũng chưa có).
- Không có nút "CHƠI LẠI" ở màn thắng/thua (chỉ có "VỀ PHÒNG CHỜ") — tạo phòng mới lại từ
  sảnh, giống VayBat.
- Debug panel (spec §51) chưa làm — có thể thêm sau nếu cần, chỉ nên bật ở Development.

## Thư viện trò chơi — ĐÃ LÀM (2026-08-05)

`<select>` chọn game cũ đã thay bằng Thư viện trò chơi dạng thẻ (`GameLibrary`/`GameDetails`).
Chi tiết: [`../history/milestones.md`](../history/milestones.md), [`../architecture/frontend.md`](../architecture/frontend.md).

**Đơn giản hoá có chủ đích:**
- Artwork thẻ game là gradient CSS + emoji lớn (`accent`/`emblem` trong metadata), không phải
  ảnh minh hoạ thật — repo chưa có asset artwork cho từng game (đúng tinh thần "không dùng
  artwork bản quyền"; nếu sau này có ảnh thật, chỉ cần thay phần render artwork trong
  `GameCard.tsx`/`GameDetails.tsx`, không đổi kiến trúc).
- Chip lọc "Phổ biến"/"Mới" trong spec gốc **không làm** — không có dữ liệu backend thật để
  tính (không bịa số liệu, theo đúng nguyên tắc dự án). Chip "Đang có người chơi" và các chip
  số-người-chơi/thể-loại dùng dữ liệu thật (rooms/metadata).
- Trang chi tiết game không có route riêng cho "đang trong ván" (`/games/bang/room/:id`) — vào
  ván vẫn không có URL riêng, giữ đúng hành vi cũ (chỉ phần "trước khi vào ván" có URL mới).

## Việc kỹ thuật chưa làm

- `/health` (`Program.cs`) chỉ trả `{ status: "healthy" }` tĩnh — không kiểm tra DB/Redis/RabbitMQ như mô tả mong muốn trong `rules/workflow/deployment.md`/monitoring cũ. Muốn đúng như tài liệu thì phải bổ sung health check thật (`Microsoft.Extensions.Diagnostics.HealthChecks` hoặc kiểm tra thủ công).
- CI/CD pipeline tự động: chưa có thư mục `.github/workflows/` hay pipeline config nào trong repo — pipeline mô tả trong `rules/workflow/deployment.md` là **mong muốn**, chưa có thật.
- Test project (`backend/BoardGame.Api.Tests`, thêm 2026-08-05) mới chỉ phủ `Games/Bang/`. `Games/VayBat/` (game đầu tiên) vẫn chưa có unit test nào — nợ kỹ thuật có sẵn từ trước, không phải do việc thêm Bang gây ra.
