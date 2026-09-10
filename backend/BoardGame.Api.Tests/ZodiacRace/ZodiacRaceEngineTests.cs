using BoardGame.Api.Games.ZodiacRace;
using BoardGame.Api.Platform;
using Xunit;

namespace BoardGame.Api.Tests.ZodiacRace;

public class ZodiacRaceEngineTests
{
    [Fact]
    public void NewGame_ReturnsWaitingState()
    {
        var engine = new ZodiacRaceEngine();
        var (mapJson, stateJson) = engine.NewGame(null);

        var state = GameJson.Deserialize<GameState>(stateJson);
        Assert.False(state.Started);
        var map = GameJson.Deserialize<MapDef>(mapJson);
        Assert.Equal(30, map.TrackLength);
    }

    [Fact]
    public void OnRoomFull_AllocatesStateForActualSeatCount()
    {
        var engine = new ZodiacRaceEngine();
        var (mapJson, stateJson) = engine.NewGame(null);

        var outcome = engine.OnRoomFull(mapJson, stateJson, new[] { "An", "Binh", "Chi" });

        Assert.True(outcome.Ok);
        var state = GameJson.Deserialize<GameState>(outcome.StateJson);
        Assert.True(state.Started);
        Assert.Equal(3, state.Positions.Length);
    }

    [Fact]
    public void OnRoomFull_TooFewPlayers_Fails()
    {
        var engine = new ZodiacRaceEngine();
        var (mapJson, stateJson) = engine.NewGame(null);

        var outcome = engine.OnRoomFull(mapJson, stateJson, new[] { "An" });

        Assert.False(outcome.Ok);
    }

    [Fact]
    public void ApplyMove_WrongMoveType_FailsWithoutChangingState()
    {
        var engine = new ZodiacRaceEngine();
        var (mapJson, stateJson) = engine.NewGame(null);
        var started = engine.OnRoomFull(mapJson, stateJson, new[] { "An", "Binh" });

        var outcome = engine.ApplyMove(mapJson, started.StateJson, "P0", "{\"type\":\"NOT_A_REAL_MOVE\"}");

        Assert.False(outcome.Ok);
        Assert.Equal(started.StateJson, outcome.StateJson);
    }

    [Fact]
    public void ApplyMove_MalformedJson_FailsGracefullyInsteadOfThrowing()
    {
        var engine = new ZodiacRaceEngine();
        var (mapJson, stateJson) = engine.NewGame(null);
        var started = engine.OnRoomFull(mapJson, stateJson, new[] { "An", "Binh" });

        var outcome = engine.ApplyMove(mapJson, started.StateJson, "P0", "{not valid json");

        Assert.False(outcome.Ok);
        Assert.NotNull(outcome.Error);
    }

    [Fact]
    public void ApplyMove_NotYourTurn_Fails()
    {
        var engine = new ZodiacRaceEngine();
        var (mapJson, stateJson) = engine.NewGame(null);
        var started = engine.OnRoomFull(mapJson, stateJson, new[] { "An", "Binh" });

        var outcome = engine.ApplyMove(mapJson, started.StateJson, "P1", "{\"type\":\"ROLL\"}");

        Assert.False(outcome.Ok);
    }

    [Fact]
    public void ApplyMove_ValidRoll_MovesPlayerAndSwitchesTurn()
    {
        var engine = new ZodiacRaceEngine();
        var (mapJson, stateJson) = engine.NewGame(null);
        var started = engine.OnRoomFull(mapJson, stateJson, new[] { "An", "Binh" });

        var outcome = engine.ApplyMove(mapJson, started.StateJson, "P0", "{\"type\":\"ROLL\"}");

        Assert.True(outcome.Ok);
        var state = GameJson.Deserialize<GameState>(outcome.StateJson);
        Assert.InRange(state.Positions[0], 1, 6);
        Assert.Equal(1, state.Turn);
    }

    [Fact]
    public void OnSeatTimedOut_CurrentPlayerDisconnected_AutoRolls()
    {
        var engine = new ZodiacRaceEngine();
        var (mapJson, stateJson) = engine.NewGame(null);
        var started = engine.OnRoomFull(mapJson, stateJson, new[] { "An", "Binh" });

        var outcome = engine.OnSeatTimedOut(mapJson, started.StateJson, "P0");

        Assert.True(outcome.Ok);
        var state = GameJson.Deserialize<GameState>(outcome.StateJson);
        Assert.InRange(state.Positions[0], 1, 6);
    }

    [Fact]
    public void OnSeatTimedOut_NotThatSeatsTurn_NoOp()
    {
        var engine = new ZodiacRaceEngine();
        var (mapJson, stateJson) = engine.NewGame(null);
        var started = engine.OnRoomFull(mapJson, stateJson, new[] { "An", "Binh" });

        var outcome = engine.OnSeatTimedOut(mapJson, started.StateJson, "P1"); // Turn=0, P1 chưa tới lượt

        Assert.False(outcome.Ok);
    }
}
