namespace BoardGame.Api.Platform.Models;

/// <summary>
/// Một phòng chơi (ván) — GENERIC cho mọi boardgame. GameKey cho biết engine
/// nào xử lý; Map &amp; State lưu JSONB (shape do từng game tự định nghĩa).
/// </summary>
public class GameRoom
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string GameKey { get; set; } = "";        // discriminator -> IGameEngine
    public string Status { get; set; } = "Waiting";  // xem RoomStatus (Waiting|Playing|Finished|Cancelled|Abandoned)
    public string? Winner { get; set; }
    public string MapJson { get; set; } = "{}";      // jsonb
    public string StateJson { get; set; } = "{}";    // jsonb

    /// <summary>Người tạo phòng (từ JWT lúc Create) — nguồn sự thật cho quyền huỷ phòng, KHÔNG suy từ "ai ở ghế 0" nữa.</summary>
    public Guid OwnerUserId { get; set; }

    // --- Ghế: MỘT mô hình duy nhất cho MỌI game (kể cả 2 người như VayBat) ---
    // SeatsJson là mảng SeatSlot? (xem SeatSlot.cs) độ dài luôn = SeatCount. Ghế 0/1 của
    // game 2 người tương ứng side "RED"/"WHITE" qua IGameEngine.SideForSeat — Platform ở
    // đây không còn biết/quan tâm "RED"/"WHITE" là gì.
    public int SeatCount { get; set; } = 2;
    public string SeatsJson { get; set; } = "[]";    // jsonb — mảng SeatSlot?, null = ghế trống
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
