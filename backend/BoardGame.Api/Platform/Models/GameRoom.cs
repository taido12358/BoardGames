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
    public string? RedPlayer { get; set; }           // ghế 0 — game 2 người (vd VayBat) — TÊN HIỂN THỊ, chỉ để show UI
    public string? WhitePlayer { get; set; }         // ghế 1 — game 2 người (vd VayBat) — TÊN HIỂN THỊ, chỉ để show UI
    public string? Winner { get; set; }
    public string MapJson { get; set; } = "{}";      // jsonb
    public string StateJson { get; set; } = "{}";    // jsonb

    // --- Danh tính THẬT của từng ghế (user id từ JWT đã xác thực) — nguồn sự thật để gán/kiểm
    // tra ghế. RedPlayer/WhitePlayer/SeatsJson ở trên chỉ là TÊN HIỂN THỊ, không dùng để xác
    // thực nữa (bài học 2026-08-05: GameHub từng tin playerName client tự gửi — ai cũng giả
    // được người khác). Xem GameHub.ResolveSide / rules/coding/security.md.
    public Guid? RedPlayerId { get; set; }
    public Guid? WhitePlayerId { get; set; }
    public string SeatUserIdsJson { get; set; } = "[]"; // jsonb — song song SeatsJson, user id (Guid string) theo ghế

    // --- Ghế generic cho game > 2 người (engine.MaxPlayers > 2) ---
    // Game 2 người tiếp tục dùng RedPlayer/WhitePlayer ở trên, không đụng tới 2 cột này.
    public int SeatCount { get; set; } = 2;          // tổng số ghế của phòng
    public string SeatsJson { get; set; } = "[]";    // jsonb — mảng TÊN HIỂN THỊ theo ghế, null = trống
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
