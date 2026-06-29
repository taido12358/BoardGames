namespace BoardGame.Api.Platform.Models;

/// <summary>
/// Một nước đi — GENERIC. Payload nước đi lưu JSON (shape tuỳ game), nhờ vậy
/// cùng một bảng replay dùng được cho mọi boardgame.
/// </summary>
public class GameMove
{
    public long Id { get; set; }
    public Guid RoomId { get; set; }
    public int MoveNumber { get; set; }
    public string Side { get; set; } = "";   // ghế của người đi
    public string MoveJson { get; set; } = "{}"; // jsonb — payload tuỳ game
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
