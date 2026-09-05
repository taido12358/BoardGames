using System.Text.Json;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Abstractions;

namespace BoardGame.Api.Games.Bang;

/// <summary>
/// Adapter nối luật BANG! vào platform qua IGameEngine — cùng khuôn với VayBatEngine.
/// Khác biệt so với VayBat: MaxPlayers > 2 (ghế generic ở Platform, xem GameHub) và có
/// RedactStateForViewer (thông tin ẩn: bài trên tay, vai trò chưa lộ).
/// </summary>
public class BangEngine : IGameEngine
{
    public string Key => "bang";
    public string DisplayName => "BANG!";
    public int MinPlayers => 4;
    public int MaxPlayers => 8;

    public (string MapJson, string StateJson) NewGame(JsonElement? options)
    {
        // "Map" không mang ý nghĩa hình học ở đây — chỉ mang bảng tra cứu tĩnh để
        // frontend không phải hard-code lại luật (tầm vũ khí, cơ cấu vai trò).
        var weaponRanges = new Dictionary<string, int>
        {
            [BangCards.WeaponName(null)] = BangCards.WeaponRange(null), // Cattleman
            [BangCards.Catalog[CardKind.Volcanic].Name] = BangCards.WeaponRange(CardKind.Volcanic),
            [BangCards.Catalog[CardKind.Schofield].Name] = BangCards.WeaponRange(CardKind.Schofield),
            [BangCards.Catalog[CardKind.Remington].Name] = BangCards.WeaponRange(CardKind.Remington),
        };
        var map = new BangMap(weaponRanges, BangRoles.Distribution.ToDictionary(kv => kv.Key, kv => kv.Value));

        // Chưa có ai ngồi — state chỉ ở trạng thái chờ. GameHub sẽ gọi ApplyMove với
        // side="SYSTEM" để thật sự chia bài khi đủ ghế (xem GameHub.StartMultiSeatGame).
        var state = new BangGameState { Phase = GamePhase.WaitingForPlayers };
        return (GameJson.Serialize(map), GameJson.Serialize(state));
    }

    public MoveOutcome ApplyMove(string mapJson, string stateJson, string side, string moveJson)
    {
        if (side == "SYSTEM") return ApplyStartGameSystemMove(stateJson, moveJson);

        BangGameState state;
        BangMove move;
        try
        {
            state = GameJson.Deserialize<BangGameState>(stateJson);
            move = GameJson.Deserialize<BangMove>(moveJson);
        }
        catch (Exception ex)
        {
            return new MoveOutcome(false, $"moveJson không hợp lệ: {ex.Message}", stateJson, null);
        }

        if (string.IsNullOrWhiteSpace(move.Type))
            return new MoveOutcome(false, "moveJson thiếu type", stateJson, null);

        var (ok, error, winner) = BangRules.HandleMove(state, side, move, Random.Shared);
        return ok
            ? new MoveOutcome(true, null, GameJson.Serialize(state), winner)
            : new MoveOutcome(false, error, stateJson, null);
    }

    /// <summary>
    /// Nước đi hệ thống do GameHub phát khi phòng đủ ghế (quy ước cũ, side="SYSTEM") — vẫn giữ
    /// nguyên vì có test hiện có gọi trực tiếp qua ApplyMove; nay chỉ là lớp mỏng parse moveJson
    /// rồi giao cho OnRoomFull (entry point chính thức mới, dùng bởi RoomService).
    /// </summary>
    private MoveOutcome ApplyStartGameSystemMove(string stateJson, string moveJson)
    {
        List<string?> seats;
        try
        {
            var payload = GameJson.Element(moveJson);
            seats = payload.TryGetProperty("seats", out var s) && s.ValueKind == JsonValueKind.Array
                ? s.EnumerateArray().Select(e => e.ValueKind == JsonValueKind.String ? e.GetString() : null).ToList()
                : new List<string?>();
        }
        catch (Exception ex)
        {
            return new MoveOutcome(false, $"moveJson hệ thống không hợp lệ: {ex.Message}", stateJson, null);
        }

        if (seats.Count < MinPlayers || seats.Count > MaxPlayers || seats.Any(s => string.IsNullOrWhiteSpace(s)))
            return new MoveOutcome(false, $"Cần đủ {MinPlayers}-{MaxPlayers} người chơi để bắt đầu BANG!.", stateJson, null);

        return OnRoomFull("{}", stateJson, seats!);
    }

    /// <summary>Entry point chính thức (IGameEngine) để chia vai trò/nhân vật/bài khi phòng đủ ghế.</summary>
    public MoveOutcome OnRoomFull(string mapJson, string stateJson, IReadOnlyList<string> seatDisplayNames)
    {
        if (seatDisplayNames.Count < MinPlayers || seatDisplayNames.Count > MaxPlayers || seatDisplayNames.Any(string.IsNullOrWhiteSpace))
            return new MoveOutcome(false, $"Cần đủ {MinPlayers}-{MaxPlayers} người chơi để bắt đầu BANG!.", stateJson, null);

        var started = BangRules.StartGame(seatDisplayNames, Random.Shared);
        return new MoveOutcome(true, null, GameJson.Serialize(started), null);
    }

    /// <summary>
    /// "side" mất kết nối quá lâu giữa ván: nếu đang là lượt hành động của họ → tự động kết
    /// thúc lượt (END_TURN); nếu đang bị yêu cầu phản hồi (Bang!/Đấu súng/Người da đỏ/Gatling)
    /// → tự động "không đáp trả" bằng cách gọi RESPOND không kèm lá bài — đúng luật mặc định
    /// đã có sẵn (HandleRespond coi card=null là không đỡ được/thua ván đấu súng), không cần
    /// luật riêng mới. Ngoài 2 trường hợp này (side không liên quan lượt/phản hồi hiện tại) →
    /// no-op, SeatTimeoutService thử lại ở lần quét sau.
    /// </summary>
    public MoveOutcome OnSeatTimedOut(string mapJson, string stateJson, string side)
    {
        BangGameState state;
        try { state = GameJson.Deserialize<BangGameState>(stateJson); }
        catch { return new MoveOutcome(false, null, stateJson, null); }

        BangMove? syntheticMove =
            state.Phase == GamePhase.AwaitingResponse && state.PendingResponse is not null && state.PendingResponse.TargetIds.Contains(side)
                ? new BangMove("RESPOND", null, null, null)
            : state.Phase == GamePhase.Action && state.CurrentPlayerId == side
                ? new BangMove("END_TURN", null, null, null)
            : null;

        if (syntheticMove is null) return new MoveOutcome(false, null, stateJson, null);

        var (ok, error, winner) = BangRules.HandleMove(state, side, syntheticMove, Random.Shared);
        return ok
            ? new MoveOutcome(true, null, GameJson.Serialize(state), winner)
            : new MoveOutcome(false, error, stateJson, null);
    }

    /// <summary>
    /// Ẩn bài/vai trò chưa lộ trước khi gửi cho một người xem cụ thể (side=null = khán giả).
    /// Trước khi StartGame chạy (state còn ở WaitingForPlayers), không có gì để ẩn.
    /// </summary>
    public string RedactStateForViewer(string stateJson, string? side)
    {
        BangGameState state;
        try { state = GameJson.Deserialize<BangGameState>(stateJson); }
        catch { return stateJson; }

        var payload = BangRules.BuildViewerPayload(state, side);
        return GameJson.Serialize(payload);
    }
}
