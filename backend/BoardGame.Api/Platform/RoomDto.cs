using System.Text.Json;
using BoardGame.Api.Platform.Models;

namespace BoardGame.Api.Platform;

/// <summary>
/// DTO trả client. Map &amp; State để dạng JsonElement (raw) vì platform không
/// biết shape của từng game — frontend của game đó tự diễn giải theo gameKey.
/// </summary>
public record RoomDto(
    Guid Id, string GameKey, string Status,
    string? RedPlayer, string? WhitePlayer, string? Winner,
    JsonElement Map, JsonElement State, DateTime CreatedAt);

public static class GameMapper
{
    public static RoomDto ToDto(GameRoom r) => new(
        r.Id, r.GameKey, r.Status,
        r.RedPlayer, r.WhitePlayer, r.Winner,
        GameJson.Element(r.MapJson),
        GameJson.Element(r.StateJson),
        r.CreatedAt);
}
