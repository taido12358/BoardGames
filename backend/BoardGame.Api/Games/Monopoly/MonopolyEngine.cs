using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Abstractions;

namespace BoardGame.Api.Games.Monopoly;

public class MonopolyEngine : IGameEngine
{
    public string Key => "monopoly";
    public string DisplayName => "Cờ Tỉ Phú";
    public int MinPlayers => MonopolyEdition.MinPlayers;
    public int MaxPlayers => MonopolyEdition.MaxPlayers;

    public (string MapJson, string StateJson) NewGame(JsonElement? options) =>
        (GameJson.Serialize(new MonopolyMap()), GameJson.Serialize(new MonopolyState()));

    public MoveOutcome OnRoomFull(string mapJson, string stateJson, IReadOnlyList<string> seatDisplayNames)
    {
        if (seatDisplayNames.Count < MinPlayers || seatDisplayNames.Count > MaxPlayers)
            return new(false, $"Cần {MinPlayers}–{MaxPlayers} người chơi theo bản C1009.", stateJson, null);
        var previous = GameJson.Deserialize<MonopolyState>(stateJson);
        if (previous.Started) return new(false, "Ván đã bắt đầu.", stateJson, null);
        return new(true, null, GameJson.Serialize(MonopolyRules.Start(seatDisplayNames, RandomNumberGenerator.GetInt32)), null);
    }

    public MoveOutcome ApplyMove(string mapJson, string stateJson, string side, string moveJson)
    {
        MonopolyMap map;
        MonopolyState state;
        MonopolyMove move;
        try
        {
            map = GameJson.Deserialize<MonopolyMap>(mapJson);
            state = GameJson.Deserialize<MonopolyState>(stateJson);
            move = GameJson.Deserialize<MonopolyMove>(moveJson);
        }
        catch (Exception ex) when (ex is JsonException or NotSupportedException or InvalidOperationException)
        { return new(false, "Dữ liệu nước đi không hợp lệ.", stateJson, null); }
        if (move is null) return new(false, "Dữ liệu nước đi không hợp lệ.", stateJson, null);
        if (side.Length != 2 || side[0] != 'P' || side[1] < '0' || side[1] > '7')
            return new(false, "Ghế không hợp lệ.", stateJson, null);
        var error = MonopolyRules.Apply(map, state, side[1] - '0', move, () => RandomNumberGenerator.GetInt32(1, 7));
        // Rejected actions must never persist partial state changes.
        return error != null ? new(false, error, stateJson, null)
            : new(true, null, GameJson.Serialize(state), state.Winner);
    }

    public string RedactStateForViewer(string stateJson, string? side)
    {
        var node = JsonNode.Parse(stateJson)?.AsObject() ?? throw new JsonException("Missing state");
        node.Remove("chance"); node.Remove("chest");
        return node.ToJsonString(GameJson.Options);
    }

    public string? CreatePublicReplaySnapshot(string stateJson) => RedactStateForViewer(stateJson, null);

    public MoveOutcome OnSeatTimedOut(string mapJson, string stateJson, string side)
    {
        var s = GameJson.Deserialize<MonopolyState>(stateJson);
        if (!s.Started || s.Winner != null || side != $"P{MonopolyRules.Actor(s)}")
            return new(false, null, stateJson, null);
        // Do not make purchases, trades or voluntary bankruptcy decisions for an absent player.
        // Liquidate buildings and mortgage assets deterministically only to meet an existing debt.
        if (s.Phase == "Debt")
        {
            var map = GameJson.Deserialize<MonopolyMap>(mapJson);
            var seat = MonopolyRules.Actor(s);
            while (s.Players[seat].Cash < s.Payments[0].Amount)
            {
                var changed = false;
                foreach (var type in new[] { "SELL", "SELL_GROUP", "MORTGAGE" })
                {
                    foreach (var tile in map.Tiles.Where(t => s.Properties[t.Index].Owner == seat))
                    {
                        if (MonopolyRules.Apply(map, s, seat, new MonopolyMove { Type = type, Tile = tile.Index }, () => RandomNumberGenerator.GetInt32(1, 7)) == null)
                        { changed = true; break; }
                    }
                    if (changed) break;
                }
                if (!changed) break;
            }
            var typeToApply = s.Players[seat].Cash >= s.Payments[0].Amount ? "SETTLE" : "BANKRUPT";
            var error = MonopolyRules.Apply(map, s, seat, new MonopolyMove { Type = typeToApply }, () => RandomNumberGenerator.GetInt32(1, 7));
            return error == null ? new(true, null, GameJson.Serialize(s), s.Winner) : new(false, error, stateJson, null);
        }
        var action = s.Phase switch { "Roll" => "ROLL", "Buy" => "DECLINE", "Auction" => "PASS", "BuildingDemand" => "SKIP_BUILD", "Trade" => "REJECT", "Inheritance" => "KEEP_INHERITED", "End" => "END", _ => "" };
        return ApplyMove(mapJson, stateJson, side, GameJson.Serialize(new MonopolyMove { Type = action }));
    }
}
