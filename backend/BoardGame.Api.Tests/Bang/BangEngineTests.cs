using BoardGame.Api.Games.Bang;
using BoardGame.Api.Platform;
using Xunit;

namespace BoardGame.Api.Tests.Bang;

public class BangEngineTests
{
    [Fact]
    public void Key_MinMax_MatchSpec()
    {
        var engine = new BangEngine();
        Assert.Equal("bang", engine.Key);
        Assert.Equal(4, engine.MinPlayers);
        Assert.Equal(8, engine.MaxPlayers);
    }

    [Fact]
    public void NewGame_ReturnsWaitingForPlayersPhase()
    {
        var engine = new BangEngine();
        var (mapJson, stateJson) = engine.NewGame(null);

        var state = GameJson.Deserialize<BangGameState>(stateJson);
        Assert.Equal(GamePhase.WaitingForPlayers, state.Phase);
        Assert.Empty(state.Players);

        var map = GameJson.Deserialize<BangMap>(mapJson);
        Assert.True(map.WeaponRanges.ContainsKey("Cattleman"));
        Assert.True(map.RoleDistribution.ContainsKey(4));
    }

    [Fact]
    public void ApplyMove_SystemStart_WithEnoughSeats_DealsGame()
    {
        var engine = new BangEngine();
        var (_, stateJson) = engine.NewGame(null);
        var seats = GameJson.Serialize(new { type = "__start_game__", seats = new[] { "An", "Binh", "Chi", "Dung" } });

        var outcome = engine.ApplyMove("{}", stateJson, "SYSTEM", seats);

        Assert.True(outcome.Ok);
        var state = GameJson.Deserialize<BangGameState>(outcome.StateJson);
        Assert.Equal(GamePhase.Action, state.Phase);
        Assert.Equal(4, state.Players.Count);
    }

    [Fact]
    public void ApplyMove_SystemStart_TooFewSeats_Fails()
    {
        var engine = new BangEngine();
        var (_, stateJson) = engine.NewGame(null);
        var seats = GameJson.Serialize(new { type = "__start_game__", seats = new[] { "An", "Binh" } });

        var outcome = engine.ApplyMove("{}", stateJson, "SYSTEM", seats);

        Assert.False(outcome.Ok);
        Assert.Equal(stateJson, outcome.StateJson); // state không đổi khi fail
    }

    [Fact]
    public void ApplyMove_MalformedMoveJson_ReturnsFailInsteadOfThrowing()
    {
        var engine = new BangEngine();
        var (_, stateJson) = engine.NewGame(null);

        var outcome = engine.ApplyMove("{}", stateJson, "P0", "{not valid json");

        Assert.False(outcome.Ok);
        Assert.NotNull(outcome.Error);
    }

    [Fact]
    public void ApplyMove_MissingType_ReturnsFail()
    {
        var engine = new BangEngine();
        var (_, stateJson) = engine.NewGame(null);

        var outcome = engine.ApplyMove("{}", stateJson, "P0", "{}");

        Assert.False(outcome.Ok);
    }
}
