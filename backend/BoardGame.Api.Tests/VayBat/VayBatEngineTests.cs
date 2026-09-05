using BoardGame.Api.Games.VayBat;
using BoardGame.Api.Platform;
using Xunit;

namespace BoardGame.Api.Tests.VayBat;

public class VayBatEngineTests
{
    [Fact]
    public void SideForSeat_Seat0IsRed_Seat1IsWhite()
    {
        var engine = new VayBatEngine();
        Assert.Equal("RED", engine.SideForSeat(0));
        Assert.Equal("WHITE", engine.SideForSeat(1));
    }

    [Fact]
    public void OnSeatTimedOut_RedDisconnects_WhiteWins()
    {
        var engine = new VayBatEngine();
        var stateJson = GameJson.Serialize(new GameState { Turn = "RED", MaxRedTurns = 15 });

        var outcome = engine.OnSeatTimedOut("{}", stateJson, "RED");

        Assert.True(outcome.Ok);
        Assert.Equal("WHITE", outcome.Winner);
        var state = GameJson.Deserialize<GameState>(outcome.StateJson);
        Assert.Equal("WHITE", state.Winner);
    }

    [Fact]
    public void OnSeatTimedOut_WhiteDisconnects_RedWins()
    {
        var engine = new VayBatEngine();
        var stateJson = GameJson.Serialize(new GameState { Turn = "WHITE", MaxRedTurns = 15 });

        var outcome = engine.OnSeatTimedOut("{}", stateJson, "WHITE");

        Assert.True(outcome.Ok);
        Assert.Equal("RED", outcome.Winner);
    }

    [Fact]
    public void OnSeatTimedOut_GameAlreadyHasWinner_NoOp()
    {
        var engine = new VayBatEngine();
        var stateJson = GameJson.Serialize(new GameState { Turn = "RED", Winner = "RED", MaxRedTurns = 15 });

        var outcome = engine.OnSeatTimedOut("{}", stateJson, "WHITE");

        Assert.False(outcome.Ok);
        Assert.Equal(stateJson, outcome.StateJson);
    }
}
