using System.Text.Json;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Abstractions;

namespace BoardGame.Api.Games.MeoNo;

public class MeoNoEngine : IGameEngine
{
    public string Key => "meono";
    public string DisplayName => "Mèo Nổ";
    public int MinPlayers => 2;
    public int MaxPlayers => 6;

    public (string MapJson, string StateJson) NewGame(JsonElement? options)
    {
        var state = new MeoNoGameState { Phase = GamePhase.WaitingForPlayers };
        return ("{}", GameJson.Serialize(state));
    }

    public MoveOutcome ApplyMove(string mapJson, string stateJson, string side, string moveJson)
    {
        if (side == "SYSTEM") return ApplyStartGameSystemMove(stateJson, moveJson);

        MeoNoGameState state;
        MeoNoMove move;
        try
        {
            state = GameJson.Deserialize<MeoNoGameState>(stateJson);
            move = GameJson.Deserialize<MeoNoMove>(moveJson);
        }
        catch (Exception ex)
        {
            return new MoveOutcome(false, $"moveJson không hợp lệ: {ex.Message}", stateJson, null);
        }

        if (string.IsNullOrWhiteSpace(move.Type))
            return new MoveOutcome(false, "moveJson thiếu type", stateJson, null);

        // Chuyển side "P0"/"P1"/… → playerId (tên người chơi ở index đó)
        var player = ResolvePlayer(state, side);
        if (player is null)
            return new MoveOutcome(false, $"Side '{side}' không tồn tại", stateJson, null);

        var (newState, error) = MeoNoRules.HandleMove(state, player.Id, move, Random.Shared);
        return error is null
            ? new MoveOutcome(true, null, GameJson.Serialize(newState), newState.Winner is not null ? ResolveWinnerSide(newState) : null)
            : new MoveOutcome(false, error, stateJson, null);
    }

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
            return new MoveOutcome(false, $"Cần {MinPlayers}–{MaxPlayers} người chơi", stateJson, null);

        return OnRoomFull("{}", stateJson, seats!);
    }

    public MoveOutcome OnRoomFull(string mapJson, string stateJson, IReadOnlyList<string> seatDisplayNames)
    {
        if (seatDisplayNames.Count < MinPlayers || seatDisplayNames.Count > MaxPlayers || seatDisplayNames.Any(string.IsNullOrWhiteSpace))
            return new MoveOutcome(false, $"Cần {MinPlayers}–{MaxPlayers} người chơi", stateJson, null);

        var (deck, hands) = MeoNoCards.BuildAndDeal(
            seatDisplayNames.Select((_, i) => $"P{i}").ToList(), Random.Shared);

        var players = seatDisplayNames.Select((name, i) => new MeoNoPlayerState
        {
            Id = $"P{i}",
            Name = name,
            SeatIndex = i,
            Hand = hands[$"P{i}"],
            Alive = true,
        }).ToList();

        var state = new MeoNoGameState
        {
            Phase = GamePhase.Action,
            Players = players,
            CurrentPlayerId = "P0",
            TurnsLeft = 1,
            Deck = deck,
            DiscardPile = new List<Card>(),
        };
        state.GameLog.Add("Ván đấu bắt đầu!");

        return new MoveOutcome(true, null, GameJson.Serialize(state), null);
    }

    public MoveOutcome OnSeatTimedOut(string mapJson, string stateJson, string side)
    {
        MeoNoGameState state;
        try { state = GameJson.Deserialize<MeoNoGameState>(stateJson); }
        catch { return new MoveOutcome(false, null, stateJson, null); }

        var player = ResolvePlayer(state, side);
        if (player is null) return new MoveOutcome(false, null, stateJson, null);

        MeoNoMove? syntheticMove = state.Phase switch
        {
            // Đang chờ Nope → auto Pass
            GamePhase.AwaitingNope when state.PendingAction?.NopePendingReplies.Contains(player.Id) == true
                => new MeoNoMove { Type = MeoNoRules.MovePassNope },
            // Đang chờ trao bài → trao ngẫu nhiên
            GamePhase.AwaitingFavor when state.PendingAction?.TargetPlayerId == player.Id && player.Hand.Count > 0
                => new MeoNoMove { Type = MeoNoRules.MoveGiveCard, CardId = player.Hand[Random.Shared.Next(player.Hand.Count)].Id },
            // Đến lượt hành động → tự rút
            GamePhase.Action when state.CurrentPlayerId == player.Id
                => new MeoNoMove { Type = MeoNoRules.MoveDraw },
            // Đang chờ Khuếch Tán → tự chèn Mèo Nổ ngẫu nhiên
            GamePhase.AwaitingDefuse when state.PendingAction?.ActingPlayerId == player.Id
                => new MeoNoMove { Type = MeoNoRules.MoveDefuse },
            _ => null,
        };

        if (syntheticMove is null) return new MoveOutcome(false, null, stateJson, null);

        var (newState, error) = MeoNoRules.HandleMove(state, player.Id, syntheticMove, Random.Shared);
        return error is null
            ? new MoveOutcome(true, null, GameJson.Serialize(newState), newState.Winner is not null ? ResolveWinnerSide(newState) : null)
            : new MoveOutcome(false, error, stateJson, null);
    }

    public string RedactStateForViewer(string stateJson, string? side)
    {
        MeoNoGameState state;
        try { state = GameJson.Deserialize<MeoNoGameState>(stateJson); }
        catch { return stateJson; }

        var payload = MeoNoRules.BuildViewerPayload(state, side ?? "");
        return GameJson.Serialize(payload);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private static MeoNoPlayerState? ResolvePlayer(MeoNoGameState state, string side)
    {
        // side = "P0", "P1", … → tìm theo Id
        return state.Players.FirstOrDefault(p => p.Id == side);
    }

    private static string? ResolveWinnerSide(MeoNoGameState state) =>
        state.Winner; // Winner đã là "P0"/"P1"/…
}
