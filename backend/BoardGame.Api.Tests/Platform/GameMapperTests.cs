using BoardGame.Api.Games.Bang;
using BoardGame.Api.Games.VayBat;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Models;
using Xunit;

namespace BoardGame.Api.Tests.Platform;

/// <summary>
/// GameMapper (RoomDto.cs) là logic thuần — không DB/SignalR — nhưng chưa từng có test riêng
/// (chỉ được exercise gián tiếp qua RoomServiceIntegrationTests). Test trực tiếp ở đây rẻ và
/// giá trị cao vì đây là nơi tính MySide/IsMine — sai ở đây lộ thông tin ghế/quyền sai cho
/// đúng người xem (xem GameHub.BroadcastRoomStateAsync dùng MySideOf để redact state).
/// </summary>
public class GameMapperTests
{
    private static GameRoom RoomWithSeats(string gameKey, Guid ownerUserId, params Guid?[] seatUserIds)
    {
        var seats = seatUserIds
            .Select(id => id is null ? (SeatSlot?)null : new SeatSlot(id.Value, "P", true, DateTime.UtcNow))
            .ToList();
        var room = new GameRoom
        {
            GameKey = gameKey,
            OwnerUserId = ownerUserId,
            SeatCount = seats.Count,
        };
        SeatCodec.SetSeats(room, seats);
        return room;
    }

    [Fact]
    public void MySideOf_NoCaller_ReturnsNull()
    {
        var room = RoomWithSeats("vaybat", Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        Assert.Null(GameMapper.MySideOf(room, new VayBatEngine(), null));
    }

    [Fact]
    public void MySideOf_CallerNotSeated_ReturnsNull()
    {
        var room = RoomWithSeats("vaybat", Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        Assert.Null(GameMapper.MySideOf(room, new VayBatEngine(), Guid.NewGuid()));
    }

    [Fact]
    public void MySideOf_SeatedAtIndex0_ReturnsRed()
    {
        var red = Guid.NewGuid();
        var room = RoomWithSeats("vaybat", Guid.NewGuid(), red, Guid.NewGuid());
        Assert.Equal("RED", GameMapper.MySideOf(room, new VayBatEngine(), red));
    }

    [Fact]
    public void MySideOf_SeatedAtIndex1_ReturnsWhite()
    {
        var white = Guid.NewGuid();
        var room = RoomWithSeats("vaybat", Guid.NewGuid(), Guid.NewGuid(), white);
        Assert.Equal("WHITE", GameMapper.MySideOf(room, new VayBatEngine(), white));
    }

    [Fact]
    public void MySideOf_NPlayerGame_UsesEngineDefaultPPrefix()
    {
        var seatIds = Enumerable.Range(0, 4).Select(_ => Guid.NewGuid()).ToArray();
        var room = RoomWithSeats("bang", Guid.NewGuid(), seatIds.Cast<Guid?>().ToArray());
        Assert.Equal("P2", GameMapper.MySideOf(room, new BangEngine(), seatIds[2]));
    }

    [Fact]
    public void ToDto_OwnerCaller_IsMineTrue()
    {
        var owner = Guid.NewGuid();
        var room = RoomWithSeats("vaybat", owner, owner, Guid.NewGuid());
        var dto = GameMapper.ToDto(room, new VayBatEngine(), owner);
        Assert.True(dto.IsMine);
        Assert.Equal("RED", dto.MySide);
        Assert.Equal(room.Id, dto.Id);
        Assert.Equal(2, dto.Seats.Count);
    }

    [Fact]
    public void ToDto_NonOwnerCaller_IsMineFalse()
    {
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();
        var room = RoomWithSeats("vaybat", owner, owner, other);
        var dto = GameMapper.ToDto(room, new VayBatEngine(), other);
        Assert.False(dto.IsMine);
        Assert.Equal("WHITE", dto.MySide);
    }

    [Fact]
    public void ToDto_Spectator_MySideNullIsMineFalse()
    {
        var owner = Guid.NewGuid();
        var room = RoomWithSeats("vaybat", owner, owner, Guid.NewGuid());
        var dto = GameMapper.ToDto(room, new VayBatEngine(), Guid.NewGuid());
        Assert.Null(dto.MySide);
        Assert.False(dto.IsMine);
    }

    [Fact]
    public void ToSummaryDto_DoesNotThrow_AndComputesIsMine()
    {
        var owner = Guid.NewGuid();
        var room = RoomWithSeats("vaybat", owner, owner, Guid.NewGuid());
        var summary = GameMapper.ToSummaryDto(room, owner);
        Assert.True(summary.IsMine);
        Assert.Equal(room.GameKey, summary.GameKey);
    }

    [Fact]
    public void SeatDtosOf_EmptySeatsJson_PadsWithEmptySlotsInsteadOfThrowing()
    {
        // Dữ liệu cũ/thiếu (SeatsJson chưa được set) không được làm sập request — xem SeatCodec.
        var room = new GameRoom { GameKey = "vaybat", SeatCount = 2, SeatsJson = "[]" };
        var seats = GameMapper.SeatDtosOf(room);
        Assert.Equal(2, seats.Count);
        Assert.All(seats, s => Assert.Null(s.DisplayName));
    }

    [Fact]
    public void SeatDtosOf_CorruptedJson_ReturnsEmptySeatsInsteadOfThrowing()
    {
        var room = new GameRoom { GameKey = "vaybat", SeatCount = 2, SeatsJson = "{not valid json" };
        var seats = GameMapper.SeatDtosOf(room);
        Assert.Equal(2, seats.Count);
        Assert.All(seats, s => Assert.Null(s.DisplayName));
    }
}
