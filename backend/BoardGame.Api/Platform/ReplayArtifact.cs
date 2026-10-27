using BoardGame.Api.Platform.Models;

namespace BoardGame.Api.Platform;

/// <summary>Builds chronological replay data; historical moves without snapshots remain readable.</summary>
public static class ReplayArtifact
{
    public static string Serialize(GameRoom room, IEnumerable<GameMove> gameMoves)
    {
        var moves = gameMoves.OrderBy(m => m.MoveNumber).ToArray();
        // Snapshot-enabled engines provide an already-redacted final frame as well.
        var finalState = moves.LastOrDefault()?.ReplayStateJson ?? room.StateJson;
        return GameJson.Serialize(new
        {
            room.Id, room.GameKey, room.Winner,
            seats = SeatCodec.SeatsOf(room).Select(s => s?.DisplayName).ToArray(),
            map = GameJson.Element(room.MapJson),
            finalState = GameJson.Element(finalState),
            moves = moves.Select(m => new
            {
                m.MoveNumber, m.Side, move = GameJson.Element(m.MoveJson),
                state = m.ReplayStateJson is null ? (System.Text.Json.JsonElement?)null : GameJson.Element(m.ReplayStateJson)
            })
        });
    }
}
