using System.Text.Json;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Abstractions;

namespace BoardGame.Api.Games.ZodiacRace;

/// <summary>
/// Adapter nối luật "Đua Xe Hoàng Đạo" vào platform qua IGameEngine — game thứ tư. N người
/// chơi (2-6, ghế generic như Bang) nhưng KHÔNG có thông tin ẩn (như VayBat) nên không override
/// RedactStateForViewer. NewGame() cố tình CHƯA cấp phát Positions/CratesCollected (seatCount
/// thật chỉ biết chắc lúc OnRoomFull, xem GameState.Started) — tránh trùng lặp logic
/// RoomService.ResolveSeatCount rồi lệch nhau.
/// </summary>
public class ZodiacRaceEngine : IGameEngine
{
    public string Key => "zodiacrace";
    public string DisplayName => "Đua Xe Hoàng Đạo";
    public int MinPlayers => 2;
    public int MaxPlayers => 6;

    public (string MapJson, string StateJson) NewGame(JsonElement? options)
    {
        var map = new MapDef();
        var state = ZodiacRaceRules.CreateWaitingState();
        return (GameJson.Serialize(map), GameJson.Serialize(state));
    }

    public MoveOutcome ApplyMove(string mapJson, string stateJson, string side, string moveJson)
    {
        MapDef map;
        GameState state;
        ZodiacRaceMove move;
        try
        {
            map = GameJson.Deserialize<MapDef>(mapJson);
            state = GameJson.Deserialize<GameState>(stateJson);
            move = GameJson.Deserialize<ZodiacRaceMove>(moveJson);
        }
        catch (Exception ex)
        {
            return new MoveOutcome(false, $"moveJson không hợp lệ: {ex.Message}", stateJson, null);
        }

        if (move.Type != "ROLL")
            return new MoveOutcome(false, "moveJson.type không hợp lệ (chỉ hỗ trợ \"ROLL\")", stateJson, null);

        var (ok, error) = ZodiacRaceRules.ValidateRoll(state, side);
        if (!ok) return new MoveOutcome(false, error, stateJson, null);

        ZodiacRaceRules.ApplyRoll(map, state, side, () => Random.Shared.Next(1, 7));
        return new MoveOutcome(true, null, GameJson.Serialize(state), state.Winner);
    }

    /// <summary>Phòng vừa đủ ghế — CHỈ bây giờ mới biết chắc seatCount thật để cấp phát Positions/CratesCollected.</summary>
    public MoveOutcome OnRoomFull(string mapJson, string stateJson, IReadOnlyList<string> seatDisplayNames)
    {
        if (seatDisplayNames.Count < MinPlayers || seatDisplayNames.Count > MaxPlayers)
            return new MoveOutcome(false, $"Cần đủ {MinPlayers}-{MaxPlayers} người chơi.", stateJson, null);

        var state = ZodiacRaceRules.StartGame(seatDisplayNames.Count);
        return new MoveOutcome(true, null, GameJson.Serialize(state), null);
    }

    /// <summary>
    /// Mất kết nối quá lâu đúng lúc tới lượt mình — tự động đổ xúc xắc thay vì xử thua ngay
    /// (không có thông tin ẩn/quyết định chiến lược nào bị "gian lận" khi tự động hoá một lượt
    /// đổ xúc xắc thuần may rủi, khác Bang/VayBat nơi bỏ lượt/xử thua mới hợp lý).
    /// </summary>
    public MoveOutcome OnSeatTimedOut(string mapJson, string stateJson, string side)
    {
        MapDef map;
        GameState state;
        try
        {
            map = GameJson.Deserialize<MapDef>(mapJson);
            state = GameJson.Deserialize<GameState>(stateJson);
        }
        catch { return new MoveOutcome(false, null, stateJson, null); }

        var (ok, _) = ZodiacRaceRules.ValidateRoll(state, side);
        if (!ok) return new MoveOutcome(false, null, stateJson, null);

        ZodiacRaceRules.ApplyRoll(map, state, side, () => Random.Shared.Next(1, 7));
        return new MoveOutcome(true, null, GameJson.Serialize(state), state.Winner);
    }
}
