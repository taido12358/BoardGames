# Rule: Permission (Phân quyền)

> Quy tắc phân quyền: roles, access control.

## Roles trong game

Ba vai trò đối với một phòng chơi:

| Role | Quyền |
|---|---|
| **Player** (Red/White) | Đi quân khi đến lượt của mình, chat, rời phòng |
| **Spectator** (khán giả 👁) | Xem state, chat (nếu bật); ❌ không đi quân |
| **Chủ phòng** (người tạo) | Quyền player + đóng phòng/đặt cấu hình ván (nếu có) |

Vai trò xác định **theo phòng**, không toàn cục: một người là player ở phòng này, spectator ở phòng khác.

## Nguyên tắc access control

1. **Enforce ở server, trong hub/controller — trước khi gọi engine.** UI ẩn nút chỉ là trải nghiệm; client sửa được mọi thứ nó gửi lên.
2. Kiểm tra tối thiểu cho `MakeMove`:
   - Người gọi có ngồi ghế trong phòng này không (không phải spectator)?
   - Có đúng lượt của phe họ không?
   - Ván có đang ở trạng thái `Playing` không (không phải `Waiting`/`Finished`)?
3. **Từ chối phải có lý do rõ gửi về client** — "Bạn đang là khán giả", "Chưa đến lượt bạn", "Ván chưa bắt đầu". Từ chối im lặng là bug (bài học "không thể di chuyển quân", xem CLAUDE.md).
4. Mặc định **deny**: trạng thái không khớp role nào → từ chối, không đoán.

## Gán ghế (seat assignment)

- Ghế gán theo định danh người chơi; hiện định danh là `playerName` nên có case đã biết: trùng tên trong cùng trình duyệt → bị coi là reconnect, thành spectator hoặc chiếm lại ghế cũ. Khi có auth thật, gán ghế theo **user id**, không theo display name (xem `rule-auth.md`).
- Reconnect: người chơi quay lại (đúng định danh) được ngồi lại ghế cũ; người lạ không bao giờ chiếm được ghế đang có chủ.

## Role quản trị (khi thêm)

- Nếu thêm admin (xoá phòng bất kỳ, ban người chơi): định nghĩa role ở tầng auth (claim trong token), kiểm tra bằng policy/`[Authorize(Roles=...)]` — không hard-code danh sách tên trong logic.
- Hành động quản trị phải được log kèm ai-làm-gì-lúc-nào (xem `rule-monitoring.md`).
