namespace BoardGame.Api.Models;

/// <summary>
/// Một nước đi trong ván — phục vụ Replay. Lưu PostgreSQL theo thứ tự MoveNumber.
/// </summary>
public class GameMove
{
    public long Id { get; set; }
    public Guid RoomId { get; set; }
    public int MoveNumber { get; set; }
    public string Side { get; set; } = "";      // RED | WHITE
    public string PieceId { get; set; } = "";
    public int FromNode { get; set; }
    public int ToNode { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
