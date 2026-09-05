namespace BoardGame.Api.Platform.Models;

/// <summary>Bản ghi ván chơi để index vào OpenSearch (lịch sử/tìm kiếm) — generic.</summary>
public class GameRecord
{
    public string Id { get; set; } = "";   // = RoomId
    public string GameKey { get; set; } = "";
    public string Status { get; set; } = "";
    public string? Winner { get; set; }
    public int MoveCount { get; set; }
    public string Players { get; set; } = "";   // tên hiển thị các ghế đã có người, nối bằng ", " — generic cho 2 hay N người
    public DateTime CreatedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
}
