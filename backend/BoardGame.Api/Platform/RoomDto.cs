using System.Text.Json;
using BoardGame.Api.Platform.Models;

namespace BoardGame.Api.Platform;

/// <summary>
/// DTO trả client. Map &amp; State để dạng JsonElement (raw) vì platform không
/// biết shape của từng game — frontend của game đó tự diễn giải theo gameKey.
/// Seats/SeatCount là bổ sung generic cho game > 2 người; game 2 người (VayBat)
/// tiếp tục dùng RedPlayer/WhitePlayer, Seats sẽ là mảng rỗng.
/// </summary>
public record RoomDto(
    Guid Id, string GameKey, string Status,
    string? RedPlayer, string? WhitePlayer, string? Winner,
    JsonElement Map, JsonElement State, DateTime CreatedAt,
    int SeatCount, IReadOnlyList<string?> Seats);

public static class GameMapper
{
    public static RoomDto ToDto(GameRoom r) => new(
        r.Id, r.GameKey, r.Status,
        r.RedPlayer, r.WhitePlayer, r.Winner,
        GameJson.Element(r.MapJson),
        GameJson.Element(r.StateJson),
        r.CreatedAt,
        r.SeatCount,
        SeatsOf(r));

    /// <summary>Đọc SeatsJson an toàn — bản ghi cũ/game 2 người có thể chưa có dữ liệu.</summary>
    public static List<string?> SeatsOf(GameRoom r)
    {
        try { return GameJson.Deserialize<List<string?>>(r.SeatsJson) ?? new(); }
        catch { return new(); }
    }

    /// <summary>Song song SeatsOf nhưng chứa user id (Guid string) — dùng để XÁC THỰC ghế, không phải hiển thị.</summary>
    public static List<string?> SeatUserIdsOf(GameRoom r)
    {
        try { return GameJson.Deserialize<List<string?>>(r.SeatUserIdsJson) ?? new(); }
        catch { return new(); }
    }
}
