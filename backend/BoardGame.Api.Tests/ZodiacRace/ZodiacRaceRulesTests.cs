using BoardGame.Api.Games.ZodiacRace;
using Xunit;

namespace BoardGame.Api.Tests.ZodiacRace;

public class ZodiacRaceRulesTests
{
    private static MapDef DefaultMap() => new(); // TrackLength=30, CrateTiles={5,10,15,20,25}

    [Fact]
    public void CreateWaitingState_NotStarted_EmptyArrays()
    {
        var state = ZodiacRaceRules.CreateWaitingState();
        Assert.False(state.Started);
        Assert.Empty(state.Positions);
        Assert.Empty(state.CratesCollected);
        Assert.Null(state.Winner);
    }

    [Fact]
    public void StartGame_AllocatesArraysMatchingSeatCount()
    {
        var state = ZodiacRaceRules.StartGame(4);
        Assert.True(state.Started);
        Assert.Equal(4, state.Positions.Length);
        Assert.Equal(4, state.CratesCollected.Length);
        Assert.All(state.Positions, p => Assert.Equal(0, p));
        Assert.Equal(0, state.Turn);
        Assert.Null(state.Winner);
    }

    [Theory]
    [InlineData("P0", 0)]
    [InlineData("P1", 1)]
    [InlineData("P5", 5)]
    public void SeatIndexOf_ParsesCorrectly(string side, int expected)
        => Assert.Equal(expected, ZodiacRaceRules.SeatIndexOf(side));

    [Fact]
    public void ValidateRoll_NotStarted_Fails()
    {
        var state = ZodiacRaceRules.CreateWaitingState();
        var (ok, error) = ZodiacRaceRules.ValidateRoll(state, "P0");
        Assert.False(ok);
        Assert.NotNull(error);
    }

    [Fact]
    public void ValidateRoll_NotYourTurn_Fails()
    {
        var state = ZodiacRaceRules.StartGame(3); // Turn=0
        var (ok, _) = ZodiacRaceRules.ValidateRoll(state, "P1");
        Assert.False(ok);
    }

    [Fact]
    public void ValidateRoll_YourTurn_Succeeds()
    {
        var state = ZodiacRaceRules.StartGame(3);
        var (ok, error) = ZodiacRaceRules.ValidateRoll(state, "P0");
        Assert.True(ok);
        Assert.Null(error);
    }

    [Fact]
    public void ValidateRoll_GameAlreadyFinished_Fails()
    {
        var state = ZodiacRaceRules.StartGame(2);
        state.Winner = "P0";
        var (ok, _) = ZodiacRaceRules.ValidateRoll(state, "P0");
        Assert.False(ok);
    }

    [Fact]
    public void ApplyRoll_MovesCurrentPlayerForwardByRollAmount()
    {
        var map = DefaultMap();
        var state = ZodiacRaceRules.StartGame(2);

        ZodiacRaceRules.ApplyRoll(map, state, "P0", () => 4);

        Assert.Equal(4, state.Positions[0]);
        Assert.Equal(0, state.Positions[1]); // người khác không đổi
        Assert.Equal(4, state.LastRoll);
    }

    [Fact]
    public void ApplyRoll_AdvancesTurnToNextSeat()
    {
        var map = DefaultMap();
        var state = ZodiacRaceRules.StartGame(3);

        ZodiacRaceRules.ApplyRoll(map, state, "P0", () => 3);

        Assert.Equal(1, state.Turn);
    }

    [Fact]
    public void ApplyRoll_TurnWrapsAroundToFirstSeat()
    {
        var map = DefaultMap();
        var state = ZodiacRaceRules.StartGame(3);
        state.Turn = 2; // ghế cuối cùng

        ZodiacRaceRules.ApplyRoll(map, state, "P2", () => 2);

        Assert.Equal(0, state.Turn);
    }

    [Fact]
    public void ApplyRoll_LandingExactlyOnCrateTile_IncrementsCratesCollected()
    {
        var map = DefaultMap(); // ô 5 là thùng hàng
        var state = ZodiacRaceRules.StartGame(2);

        ZodiacRaceRules.ApplyRoll(map, state, "P0", () => 5);

        Assert.Equal(5, state.Positions[0]);
        Assert.Equal(1, state.CratesCollected[0]);
    }

    [Fact]
    public void ApplyRoll_PassingOverCrateTileWithoutStopping_DoesNotCount()
    {
        var map = DefaultMap(); // ô 5 là thùng hàng
        var state = ZodiacRaceRules.StartGame(2);

        ZodiacRaceRules.ApplyRoll(map, state, "P0", () => 6); // 0 -> 6, đi qua ô 5 nhưng dừng ở 6

        Assert.Equal(6, state.Positions[0]);
        Assert.Equal(0, state.CratesCollected[0]);
    }

    [Fact]
    public void ApplyRoll_OvershootingFinish_ClampsToTrackLength()
    {
        var map = DefaultMap(); // TrackLength=30
        var state = ZodiacRaceRules.StartGame(2);
        state.Positions[0] = 28;

        ZodiacRaceRules.ApplyRoll(map, state, "P0", () => 6); // 28+6=34, không cần đúng số để về đích

        Assert.Equal(30, state.Positions[0]);
        Assert.Equal("P0", state.Winner);
    }

    [Fact]
    public void ApplyRoll_ReachingExactFinish_SetsWinner()
    {
        var map = DefaultMap();
        var state = ZodiacRaceRules.StartGame(2);
        state.Positions[0] = 24;

        ZodiacRaceRules.ApplyRoll(map, state, "P0", () => 6); // 24+6=30 = đích

        Assert.Equal("P0", state.Winner);
    }

    [Fact]
    public void ApplyRoll_ReachingFinish_DoesNotAdvanceTurn()
    {
        var map = DefaultMap();
        var state = ZodiacRaceRules.StartGame(3);
        state.Positions[0] = 30; // đã ở đích từ trước (giả lập) — Turn vẫn ở 0
        state.Turn = 0;
        // reset lại đúng kịch bản: dùng seat 0 đang ở 27, roll 3 -> vừa chạm đích
        state.Positions[0] = 27;

        ZodiacRaceRules.ApplyRoll(map, state, "P0", () => 3);

        Assert.Equal("P0", state.Winner);
        Assert.Equal(0, state.Turn); // không chuyển lượt nữa vì ván đã kết thúc
    }

    [Fact]
    public void ApplyRoll_RecordsLastRollForUiDisplay()
    {
        var map = DefaultMap();
        var state = ZodiacRaceRules.StartGame(2);

        ZodiacRaceRules.ApplyRoll(map, state, "P0", () => 5);

        Assert.Equal(5, state.LastRoll);
    }
}
