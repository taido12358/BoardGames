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
    public string? RedPlayer { get; set; }           // ghế 0 — game 2 người (vd VayBat)
    public string? WhitePlayer { get; set; }         // ghế 1 — game 2 người (vd VayBat)
    public string? Winner { get; set; }
    public string MapJson { get; set; } = "{}";      // jsonb
    public string StateJson { get; set; } = "{}";    // jsonb

    // --- Ghế generic cho game > 2 người (engine.MaxPlayers > 2) ---
    // Game 2 người tiếp tục dùng RedPlayer/WhitePlayer ở trên, không đụng tới 2 cột này.
    public int SeatCount { get; set; } = 2;          // tổng số ghế của phòng
    public string SeatsJson { get; set; } = "[]";    // jsonb — mảng tên người chơi theo ghế, null = trống
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
