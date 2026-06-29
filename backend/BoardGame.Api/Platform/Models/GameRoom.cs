namespace BoardGame.Api.Platform.Models;

/// <summary>
/// Một phòng chơi (ván) — GENERIC cho mọi boardgame. GameKey cho biết engine
/// nào xử lý; Map &amp; State lưu JSONB (shape do từng game tự định nghĩa).
/// </summary>
public class GameRoom
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string GameKey { get; set; } = "";        // discriminator -> IGameEngine
    public string Status { get; set; } = "Waiting";  // Waiting | Playing | Finished
    public string? RedPlayer { get; set; }           // ghế 0
    public string? WhitePlayer { get; set; }         // ghế 1
    public string? Winner { get; set; }
    public string MapJson { get; set; } = "{}";      // jsonb
    public string StateJson { get; set; } = "{}";    // jsonb
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
