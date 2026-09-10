using BoardGame.Api.Games.Bang;
using Xunit;

namespace BoardGame.Api.Tests.Bang;

/// <summary>
/// Test luật thuần cho debug panel (van-de.md §51) — BangRules.DebugXxx. Không test
/// BangDebugController ở đây (cần DbContext/hub thật, đã verify thủ công qua live-test +
/// review code) — chỉ test đúng phần luật/logic mà controller gọi vào.
/// </summary>
public class BangDebugTests
{
    [Fact]
    public void DebugForceDraw_AddsCardsToHand()
    {
        var state = TestFactory.MakeState(4);
        var before = state.Players[0].Hand.Count;

        BangRules.DebugForceDraw(state, "P0", 3, new Random(1));

        Assert.Equal(before + 3, state.Players[0].Hand.Count);
    }

    [Fact]
    public void DebugForceDraw_UnknownPlayer_Throws()
    {
        var state = TestFactory.MakeState(4);
        Assert.Throws<ArgumentException>(() => BangRules.DebugForceDraw(state, "P99", 1, new Random(1)));
    }

    [Fact]
    public void DebugForceDamage_ReducesHp()
    {
        var state = TestFactory.MakeState(4);

        var winner = BangRules.DebugForceDamage(state, "P1", 1, new Random(1));

        Assert.Equal(3, state.Players[1].Hp);
        Assert.Null(winner);
        Assert.True(state.Players[1].Alive);
    }

    [Fact]
    public void DebugForceDamage_BringsHpToZero_EliminatesPlayer()
    {
        var state = TestFactory.MakeState(4);
        state.Players[1].Hp = 1;

        BangRules.DebugForceDamage(state, "P1", 1, new Random(1));

        Assert.False(state.Players[1].Alive);
        Assert.Equal(0, state.Players[1].Hp);
    }

    [Fact]
    public void DebugForceDamage_UnknownPlayer_Throws()
    {
        var state = TestFactory.MakeState(4);
        Assert.Throws<ArgumentException>(() => BangRules.DebugForceDamage(state, "P99", 1, new Random(1)));
    }

    [Fact]
    public void DebugForceDamage_LastOutlawAndRenegadeEliminated_SheriffWins()
    {
        // P0 Sheriff, P1/P2/P3 Outlaw — hạ hết P1-P3 thì Sheriff thắng.
        var state = TestFactory.MakeState(4, roles: new[] { RoleKind.Sheriff, RoleKind.Outlaw, RoleKind.Outlaw, RoleKind.Outlaw });
        state.Players[1].Hp = 1;
        state.Players[2].Hp = 1;
        state.Players[3].Hp = 1;

        BangRules.DebugForceDamage(state, "P1", 1, new Random(1));
        BangRules.DebugForceDamage(state, "P2", 1, new Random(1));
        var winner = BangRules.DebugForceDamage(state, "P3", 1, new Random(1));

        Assert.Equal("Sheriff", winner);
        Assert.Equal(GamePhase.Finished, state.Phase);
    }

    [Fact]
    public void DebugForceEndTurn_AdvancesToNextAlivePlayer()
    {
        var state = TestFactory.MakeState(4);
        state.CurrentPlayerId = "P0";

        BangRules.DebugForceEndTurn(state, new Random(1));

        Assert.Equal("P1", state.CurrentPlayerId);
    }

    [Fact]
    public void DebugForceEndTurn_SkipsDeadPlayers()
    {
        var state = TestFactory.MakeState(4);
        state.CurrentPlayerId = "P0";
        state.Players[1].Alive = false;

        BangRules.DebugForceEndTurn(state, new Random(1));

        Assert.Equal("P2", state.CurrentPlayerId);
    }

    [Fact]
    public void DebugForceEndTurn_DiscardsOverflowAutomatically()
    {
        var state = TestFactory.MakeState(4);
        var player = state.Players[0];
        player.Hp = 2;
        player.Hand.Add(TestFactory.Card(CardKind.Bang));
        player.Hand.Add(TestFactory.Card(CardKind.Bang));
        player.Hand.Add(TestFactory.Card(CardKind.Bang));

        BangRules.DebugForceEndTurn(state, new Random(1));

        Assert.Equal(2, player.Hand.Count);
    }

    [Fact]
    public void DebugForceEndTurn_DuringAwaitingResponse_NoOp()
    {
        var state = TestFactory.MakeState(4);
        state.Phase = GamePhase.AwaitingResponse;
        state.CurrentPlayerId = "P0";

        BangRules.DebugForceEndTurn(state, new Random(1));

        Assert.Equal("P0", state.CurrentPlayerId);
        Assert.Equal(GamePhase.AwaitingResponse, state.Phase);
    }
}
