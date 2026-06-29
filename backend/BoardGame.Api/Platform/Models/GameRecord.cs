namespace BoardGame.Api.Platform.Models;

/// <summary>Bản ghi ván chơi để index vào OpenSearch (lịch sử/tìm kiếm) — generic.</summary>
public class GameRecord
{
    public string Id { get; set; } = "";   // = RoomId
    public string GameKey { get; set; } = "";
    public string Status { get; set; } = "";
    public string? Winner { get; set; }
    public int MoveCount { get; set; }
    public string? RedPlayer { get; set; }
    public string? WhitePlayer { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
}
