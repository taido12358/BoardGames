using System.Text.Json;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Abstractions;

namespace BoardGame.Api.Games.VayBat;

/// <summary>
/// Adapter nối luật Vây Bắt vào platform qua IGameEngine. Đây là tất cả những gì
/// cần để platform "biết chơi" game này — thêm game khác chỉ việc viết lớp tương tự.
/// </summary>
public class VayBatEngine : IGameEngine
{
    public string Key => "vaybat";
    public string DisplayName => "Vây Bắt Trên Đồ Thị";
    public int MinPlayers => 2;
    public int MaxPlayers => 2;

    public (string MapJson, string StateJson) NewGame(JsonElement? options)
    {
        var map = VayBatRules.DefaultMap();
        if (options is { ValueKind: JsonValueKind.Object } o &&
            o.TryGetProperty("maxRedTurns", out var mrt) &&
            mrt.TryGetInt32(out var x) && x > 0)
        {
            map.MaxRedTurns = x;
        }

        var state = VayBatRules.CreateState(map, randomRed: true);
        return (GameJson.Serialize(map), GameJson.Serialize(state));
    }

    public MoveOutcome ApplyMove(string mapJson, string stateJson, string side, string moveJson)
    {
        MapDefinition map;
        GameState state;
        VayBatMove move;
        try
        {
            map   = GameJson.Deserialize<MapDefinition>(mapJson);
            state = GameJson.Deserialize<GameState>(stateJson);
            move  = GameJson.Deserialize<VayBatMove>(moveJson);
        }
        catch (Exception ex)
        {
            return new MoveOutcome(false, $"moveJson không hợp lệ: {ex.Message}", stateJson, null);
        }

        if (string.IsNullOrEmpty(move.PieceId))
            return new MoveOutcome(false, "moveJson thiếu pieceId", stateJson, null);

        var adj = VayBatRules.BuildAdjacency(map);

        if (VayBatRules.Side(move.PieceId) != side)
            return new MoveOutcome(false, "Không phải quân của bạn", stateJson, null);
        if (!VayBatRules.ValidMove(state, adj, move.PieceId, move.To))
            return new MoveOutcome(false, "Nước đi không hợp lệ", stateJson, null);

        VayBatRules.ApplyMove(state, adj, move.PieceId, move.To);
        return new MoveOutcome(true, null, GameJson.Serialize(state), state.Winner);
    }
}
