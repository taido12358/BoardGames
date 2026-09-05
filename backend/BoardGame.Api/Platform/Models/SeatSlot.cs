using BoardGame.Api.Platform;

namespace BoardGame.Api.Platform.Models;

/// <summary>
/// Một ghế trong phòng — MÔ HÌNH GHẾ DUY NHẤT cho mọi game (kể cả 2 người). null = ghế trống.
/// UserId là danh tính XÁC THỰC (từ JWT) dùng để gán/khớp ghế; DisplayName chỉ để hiển thị.
/// Connected/LastSeenAt phục vụ phát hiện mất kết nối/AFK (xem RoomService, SeatTimeoutService).
/// </summary>
public record SeatSlot(Guid UserId, string DisplayName, bool Connected, DateTime LastSeenAt);

/// <summary>Đọc/ghi SeatsJson an toàn — bản ghi cũ/dữ liệu hỏng không được làm sập request.</summary>
public static class SeatCodec
{
    public static List<SeatSlot?> SeatsOf(GameRoom room)
    {
        List<SeatSlot?> seats;
        try { seats = GameJson.Deserialize<List<SeatSlot?>>(room.SeatsJson) ?? new(); }
        catch { seats = new(); }

        while (seats.Count < room.SeatCount) seats.Add(null); // phòng thủ với dữ liệu cũ/thiếu
        return seats;
    }

    public static void SetSeats(GameRoom room, IReadOnlyList<SeatSlot?> seats)
        => room.SeatsJson = GameJson.Serialize(seats);
}
