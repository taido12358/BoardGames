using System.Text.Json;

namespace BoardGame.Api.Game;

/// <summary>Một đỉnh của đồ thị: id duy nhất + toạ độ để vẽ.</summary>
public record NodeDef(int Id, int X, int Y);

/// <summary>
/// Định nghĩa bản đồ (đồ thị phi hướng) do Admin cấu hình.
/// MAP cố định nên lưu dạng JSON, không cần bảng riêng.
/// </summary>
public class MapDefinition
{
    public List<NodeDef> Nodes { get; set; } = new();
    public List<List<int>> Edges { get; set; } = new();   // cặp [a,b] = cạnh a<->b
    public int RedCount { get; set; } = 3;
    public int WhiteCount { get; set; } = 1;
    public int WhiteStart { get; set; } = 5;
    public List<int> RedStartCandidates { get; set; } = new();
    public int MaxRedTurns { get; set; } = 15;
}

/// <summary>Trạng thái runtime của một ván (được lưu JSONB + cache Redis).</summary>
public class GameState
{
    public Dictionary<string, int> Pieces { get; set; } = new(); // pieceId -> nodeId
    public string Turn { get; set; } = "RED";                     // RED | WHITE
    public int RedTurnsUsed { get; set; }
    public int MaxRedTurns { get; set; }
    public string? Winner { get; set; }                           // RED | WHITE | null
    public List<int> RedStartPos { get; set; } = new();
}

/// <summary>DTO trả về client: state &amp; map đã giải mã sẵn (camelCase).</summary>
public record RoomDto(
    Guid Id, string Status, int MaxRedTurns,
    string? RedPlayer, string? WhitePlayer, string? Winner,
    MapDefinition Map, GameState State, DateTime CreatedAt);

/// <summary>Cấu hình JSON dùng chung (camelCase + không phân biệt hoa thường).</summary>
public static class GameJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
    public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options);
    public static T Deserialize<T>(string json) => JsonSerializer.Deserialize<T>(json, Options)!;
}
