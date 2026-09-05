using BoardGame.Api.Games.Bang;
using BoardGame.Api.Platform;
using Xunit;

namespace BoardGame.Api.Tests.Bang;

public class BangSeatTimeoutTests
{
    [Fact]
    public void OnSeatTimedOut_CurrentPlayerActionPhase_AutoEndsTurn()
    {
        var engine = new BangEngine();
        var state = TestFactory.MakeState(4); // Phase=Action, CurrentPlayerId="P0"
        var stateJson = GameJson.Serialize(state);

        var outcome = engine.OnSeatTimedOut("{}", stateJson, "P0");

        Assert.True(outcome.Ok);
        var result = GameJson.Deserialize<BangGameState>(outcome.StateJson);
        Assert.NotEqual("P0", result.CurrentPlayerId); // lượt đã chuyển sang người kế tiếp
    }

    [Fact]
    public void OnSeatTimedOut_PendingResponseTarget_AutoTakesDamage()
    {
        var engine = new BangEngine();
        var state = TestFactory.MakeState(4);
        state.Phase = GamePhase.AwaitingResponse;
        state.PendingResponse = new PendingResponse { Kind = PendingResponseKind.Bang, FromPlayerId = "P0", TargetIds = new List<string> { "P1" }, Damage = 1 };
        var stateJson = GameJson.Serialize(state);

        var outcome = engine.OnSeatTimedOut("{}", stateJson, "P1");

        Assert.True(outcome.Ok);
        var result = GameJson.Deserialize<BangGameState>(outcome.StateJson);
        var p1 = result.Players.Single(p => p.Id == "P1");
        Assert.Equal(3, p1.Hp); // không đỡ được (không có Trượt!/Thùng rượu) -> mất 1 máu
        Assert.Equal(GamePhase.Action, result.Phase); // hết người phải phản hồi -> quay lại Action
    }

    [Fact]
    public void OnSeatTimedOut_SideNotCurrentAndNotPending_NoOp()
    {
        var engine = new BangEngine();
        var state = TestFactory.MakeState(4); // CurrentPlayerId="P0", không có PendingResponse
        var stateJson = GameJson.Serialize(state);

        var outcome = engine.OnSeatTimedOut("{}", stateJson, "P1");

        Assert.False(outcome.Ok);
        Assert.Equal(stateJson, outcome.StateJson);
    }
}
