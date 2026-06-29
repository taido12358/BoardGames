namespace BoardGame.Api.Models;

/// <summary>
/// Một phòng chơi (ván) — lưu ở PostgreSQL. State &amp; Map lưu dạng JSONB
/// để linh hoạt; cache bản state nóng ở Redis.
/// </summary>
public class GameRoom
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Status { get; set; } = "Waiting"; // Waiting | Playing | Finished
    public int MaxRedTurns { get; set; }
    public string? RedPlayer { get; set; }
    public string? WhitePlayer { get; set; }
    public string? Winner { get; set; }             // RED | WHITE | null
    public string MapJson { get; set; } = "{}";     // jsonb
    public string StateJson { get; set; } = "{}";   // jsonb
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
