# C1009 2016/2017: sổ đối chiếu dữ liệu nguồn

Trạng thái 2026-10-26: **chưa hoàn tất**. Fixture không được tạo bằng cách xuất dữ liệu từ
`MonopolyBoard` hoặc từ switch xử lý thẻ rồi coi chính dữ liệu đó là nguồn chuẩn.

## Nguồn đã đọc

- [S1: PDF Hasbro C1009 tiếng Anh](https://instructions.hasbro.com/api/download/C1009_en-my_monopoly-classic-game.pdf),
  copyright 2016, dòng in 2017-02-15. Trang được đánh số 1/2 theo thứ tự PDF.
- [S2: catalog C1009 Hasbro](https://instructions.hasbro.com/en-nz/instruction/monopoly-classic-game):
  đối chiếu thành phần hộp; không dùng số người trong catalog để ghi đè S1.

Đọc được text PDF trực tiếp qua công cụ web. Tải PDF về local không hoàn tất; đã dừng request
đó và chưa có bản render local để tuyên bố kiểm tra ảnh. Không có checksum file local.
Các bảng số dưới đây có text rõ ràng trong S1, không suy ra từ thumbnail sản phẩm.

## Phần được chứng minh

| Dữ liệu | Bằng chứng S1 | Fixture/test |
| --- | --- | --- |
| 28 giấy, 16 thẻ mỗi bộ, kho 32 nhà/12 khách sạn | Trang 1, danh sách thành phần | `titleDeeds`, `chanceCards`, `chestCards`, `houses`, `hotels` |
| Bốn bảng thuê đường phố và chi phí xây | Trang 2, các mặt giấy minh họa | `deedSamples`: Kentucky, Indiana, Illinois, North Carolina |
| Thuê khi đủ nhóm của bốn mẫu | Trang 2, dòng thuê theo nhóm màu | `colorSetRent`: 36, 36, 40, 52 |
| Giá mua Illinois 240 | Trang 2, ô đường phố minh họa | `deedSamples[Illinois].price` |
| Giá Reading 200 và bốn mức thuê 25/50/100/200 | Trang 2, ô ga, giấy ga và bảng thuê ga | `railroadSample` |
| Giá mỗi công ty dịch vụ 150 | Trang 2, hai ô dịch vụ minh họa | `utilitySamples` |
| Hệ số thuê dịch vụ 4/10 và đổ lại xúc xắc | Trang 2, mục dịch vụ có chủ | `utilityMultipliersByOwnedCount`, test thuê dịch vụ riêng |

Fixture: `backend/BoardGame.Api.Tests/Monopoly/Fixtures/c1009-2016.json`.
`MonopolySourceAuditTests` kiểm tra bốn mức sở hữu ga, hai mức sở hữu dịch vụ với tổng xúc xắc
2–12, giá mua nhìn thấy trong nguồn, thuê nhóm màu và số lượng thành phần. Test luật trước đó
vẫn kiểm tra bảng thuê sáu mức và chi phí xây của bốn mẫu đường phố.

## Phần chưa được chứng minh đầy đủ

| Phạm vi | Đã có nguồn | Còn thiếu |
| --- | --- | --- |
| Bảng thuê đường phố | 4/22 | 18 bảng còn lại |
| Chi phí xây từng đường phố | 4/22 | 18 đường phố còn lại |
| Giá mua từng tài sản | 4/28 | 24 giá mua còn lại |
| Giá trị thế chấp in trên mặt sau | 0/28 | Cả 28 mặt sau; công thức hiện có trong code không thay thế chứng cứ |
| Mặt thẻ Chance | 0/16 | Danh sách và tác dụng từng thẻ đúng edition |
| Mặt thẻ Community Chest | 0/16 | Danh sách và tác dụng từng thẻ đúng edition |
| Thứ tự toàn bộ 40 ô | Chưa có ảnh/scan đầy đủ đã đọc được | Cần nguồn đủ rõ cho toàn bộ vòng bàn cờ |

21 tài sản chưa có mẫu minh họa riêng đã đối chiếu ở lượt này, theo index nội bộ zero-based:
`1, 3, 6, 8, 9, 11, 13, 14, 15, 16, 18, 19, 25, 26, 27, 29, 31, 34, 35, 37, 39`.
Bảy tài sản có minh họa cũng chỉ được xác nhận các field nêu trên, chưa có đủ cả hai mặt.
Index là cách tra cứu của phần mềm; không coi index đó là số in trên giấy Hasbro.

PDF không in toàn bộ 32 mặt thẻ. Số lượng 16/16 và việc có test hiệu ứng mọi ID trong code
không chứng minh rằng mỗi hiệu ứng khớp mặt thẻ vật lý. Không dùng bộ Community Chest khác
năm để lấp chỗ thiếu của C1009 đã chốt; không đổi dữ liệu chỉ theo kết quả tìm kiếm/tóm tắt.

## Cách tiếp tục

1. Tìm scan/ảnh đủ rõ có dấu edition và nguồn gốc của bàn cờ, 28 giấy hai mặt, 32 thẻ.
2. Ghi từng field kèm vị trí nguồn; giữ khác biệt giữa dữ liệu trực tiếp và suy luận.
3. Bổ sung fixture độc lập rồi sửa code nếu có sai lệch; chạy test đúng phạm vi.
4. Chỉ đánh dấu toàn bộ audit xong khi mỗi mục thiếu bên trên có bằng chứng trực tiếp.
