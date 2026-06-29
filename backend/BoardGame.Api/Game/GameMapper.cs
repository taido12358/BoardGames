using BoardGame.Api.Models;

namespace BoardGame.Api.Game;

/// <summary>Chuyển GameRoom (lưu trữ) → RoomDto (trả client).</summary>
public static class GameMapper
{
    public static RoomDto ToDto(GameRoom r) => new(
        r.Id, r.Status, r.MaxRedTurns,
        r.RedPlayer, r.WhitePlayer, r.Winner,
        GameJson.Deserialize<MapDefinition>(r.MapJson),
        GameJson.Deserialize<GameState>(r.StateJson),
        r.CreatedAt);
}
