using BoardGame.Api.Platform.Models;
using Xunit;

namespace BoardGame.Api.Tests.Platform;

public class RoomStatusTests
{
    [Theory]
    [InlineData(RoomStatus.Waiting, true)]
    [InlineData(RoomStatus.Playing, true)]
    [InlineData(RoomStatus.Finished, false)]
    [InlineData(RoomStatus.Cancelled, false)]
    [InlineData(RoomStatus.Abandoned, false)]
    public void IsOpen_MatchesExpected(string status, bool expected)
        => Assert.Equal(expected, RoomStatus.IsOpen(status));
}
