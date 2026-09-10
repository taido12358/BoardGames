using System.Text.Json;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Abstractions;

namespace BoardGame.Api.Games.OAnQuan;

/// <summary>
/// Adapter nối luật Ô Ăn Quan vào platform qua IGameEngine — game thứ ba, trò chơi dân gian
/// Việt Nam. Không có "map" thật sự (bàn 12 ô luôn cố định) nên <see cref="NewGame"/> trả
/// MapJson rỗng thay vì một MapDefinition riêng.
/// </summary>
public class OAnQuanEngine : IGameEngine
{
    public string Key => "oanquan";
    public string DisplayName => "Ô Ăn Quan";
    public int MinPlayers => 2;
    public int MaxPlayers => 2;

    public (string MapJson, string StateJson) NewGame(JsonElement? options)
    {
        var state = OAnQuanRules.CreateState();
        return ("{}", GameJson.Serialize(state));
    }

    public MoveOutcome ApplyMove(string mapJson, string stateJson, string side, string moveJson)
    {
        GameState state;
        OAnQuanMove move;
        try
        {
            state = GameJson.Deserialize<GameState>(stateJson);
            move = GameJson.Deserialize<OAnQuanMove>(moveJson);
        }
        catch (Exception ex)
        {
            return new MoveOutcome(false, $"moveJson không hợp lệ: {ex.Message}", stateJson, null);
        }

        if (string.IsNullOrEmpty(move.Direction))
            return new MoveOutcome(false, "moveJson thiếu direction", stateJson, null);
        if (!OAnQuanRules.ValidMove(state, side, move.PitIndex, move.Direction))
            return new MoveOutcome(false, "Nước đi không hợp lệ", stateJson, null);

        OAnQuanRules.ApplyMove(state, side, move.PitIndex, move.Direction);
        return new MoveOutcome(true, null, GameJson.Serialize(state), state.Winner);
    }

    /// <summary>
    /// 2 người, một bên rớt mạng quá lâu giữa ván là không thể tiếp tục — xử thua ngay
    /// (cùng nguyên tắc VayBatEngine) trừ khi ván đã có kết quả.
    /// </summary>
    public MoveOutcome OnSeatTimedOut(string mapJson, string stateJson, string side)
    {
        GameState state;
        try { state = GameJson.Deserialize<GameState>(stateJson); }
        catch { return new MoveOutcome(false, null, stateJson, null); }

        if (state.Winner is not null) return new MoveOutcome(false, null, stateJson, null);

        state.Winner = side == "P0" ? "P1" : "P0";
        return new MoveOutcome(true, null, GameJson.Serialize(state), state.Winner);
    }
}
