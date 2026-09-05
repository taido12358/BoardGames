using System.Text.Json;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Models;

namespace BoardGame.Api.Platform;

/// <summary>Một ghế nhìn từ phía client — KHÔNG bao giờ chứa UserId thô (chỉ Platform/RoomService biết).</summary>
public record SeatSlotDto(string? DisplayName, bool Connected, DateTime? LastSeenAt);

/// <summary>
/// DTO trả client. Map &amp; State để dạng JsonElement (raw) vì platform không biết shape của
/// từng game — frontend của game đó tự diễn giải theo gameKey. Seats luôn có đúng SeatCount
/// phần tử cho MỌI game (kể cả 2 người) — không còn nhánh RedPlayer/WhitePlayer riêng.
/// MySide/IsMine tính RIÊNG cho từng người xem (theo JWT của người gọi), không phải dữ liệu
/// chung của phòng — hai người xem cùng 1 RoomDto tại cùng thời điểm sẽ thấy 2 giá trị khác nhau.
/// </summary>
public record RoomDto(
    Guid Id, string GameKey, string Status, string? Winner,
    JsonElement Map, JsonElement State, DateTime CreatedAt,
    int SeatCount, IReadOnlyList<SeatSlotDto> Seats,
    Guid OwnerUserId, string? MySide, bool IsMine);

/// <summary>Bản rút gọn cho danh sách sảnh (không có Map/State) — dùng ở GamesController.List và event LobbyUpdated.</summary>
public record RoomSummaryDto(
    Guid Id, string GameKey, string Status, DateTime CreatedAt,
    int SeatCount, IReadOnlyList<SeatSlotDto> Seats, bool IsMine);

public static class GameMapper
{
    public static IReadOnlyList<SeatSlotDto> SeatDtosOf(GameRoom room) =>
        SeatCodec.SeatsOf(room)
            .Select(s => s is null ? new SeatSlotDto(null, false, null) : new SeatSlotDto(s.DisplayName, s.Connected, s.LastSeenAt))
            .ToList();

    /// <summary>Ghế (side) của callerUserId trong phòng này — null nếu không ngồi ghế nào (khán giả/chưa đăng nhập).</summary>
    public static string? MySideOf(GameRoom room, IGameEngine engine, Guid? callerUserId)
    {
        if (callerUserId is null) return null;
        var seats = SeatCodec.SeatsOf(room);
        var idx = seats.FindIndex(s => s?.UserId == callerUserId);
        return idx >= 0 ? engine.SideForSeat(idx) : null;
    }

    public static RoomDto ToDto(GameRoom r, IGameEngine engine, Guid? callerUserId) => new(
        r.Id, r.GameKey, r.Status, r.Winner,
        GameJson.Element(r.MapJson),
        GameJson.Element(r.StateJson),
        r.CreatedAt,
        r.SeatCount,
        SeatDtosOf(r),
        r.OwnerUserId,
        MySideOf(r, engine, callerUserId),
        callerUserId.HasValue && r.OwnerUserId == callerUserId.Value);

    public static RoomSummaryDto ToSummaryDto(GameRoom r, Guid? callerUserId) => new(
        r.Id, r.GameKey, r.Status, r.CreatedAt, r.SeatCount, SeatDtosOf(r),
        callerUserId.HasValue && r.OwnerUserId == callerUserId.Value);
}
