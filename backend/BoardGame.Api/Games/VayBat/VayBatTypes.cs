namespace BoardGame.Api.Games.VayBat;

/// <summary>Một đỉnh của đồ thị: id duy nhất + toạ độ để vẽ.</summary>
public record NodeDef(int Id, int X, int Y);

/// <summary>Định nghĩa bản đồ (đồ thị phi hướng) của game Vây Bắt.</summary>
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

/// <summary>Trạng thái runtime của một ván Vây Bắt.</summary>
public class GameState
{
    public Dictionary<string, int> Pieces { get; set; } = new(); // pieceId -> nodeId
    public string Turn { get; set; } = "RED";                     // RED | WHITE
    public int RedTurnsUsed { get; set; }
    public int MaxRedTurns { get; set; }
    public string? Winner { get; set; }                           // RED | WHITE | null
    public List<int> RedStartPos { get; set; } = new();
}

/// <summary>Payload nước đi của game Vây Bắt.</summary>
public record VayBatMove(string PieceId, int To);
