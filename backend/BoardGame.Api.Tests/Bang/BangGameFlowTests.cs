using BoardGame.Api.Games.Bang;
using Xunit;

namespace BoardGame.Api.Tests.Bang;

public class BangGameFlowTests
{
    private static readonly Random Rng = new(7);

    [Fact]
    public void StartGame_DealsCorrectHandSizeAndSheriffGoesFirst()
    {
        var seats = new[] { "An", "Binh", "Chi", "Dung" };
        var state = BangRules.StartGame(seats, new Random(42));

        Assert.Equal(4, state.Players.Count);
        Assert.Equal(GamePhase.Action, state.Phase);
        var sheriff = state.Players.Single(p => p.Role == RoleKind.Sheriff);
        Assert.Equal(state.CurrentPlayerId, sheriff.Id);
        Assert.Equal(5, sheriff.MaxHp); // 4 nền + 1 Sheriff
        // Mỗi người có bài khởi đầu = MaxHp, cộng 2 lá rút đầu lượt CHỈ cho current player (sheriff).
        foreach (var p in state.Players.Where(p => p.Id != sheriff.Id))
            Assert.Equal(p.MaxHp, p.Hand.Count);
        Assert.Equal(sheriff.MaxHp + 2, sheriff.Hand.Count);
    }

    [Fact]
    public void PlayCard_NotYourTurn_IsRejected()
    {
        var state = TestFactory.MakeState(4);
        var p1 = state.Players[1];
        var bang = TestFactory.Card(CardKind.Bang);
        p1.Hand.Add(bang);

        var (ok, error, _) = BangRules.HandleMove(state, "P1", TestFactory.Play(bang.Id, "P0"), Rng);

        Assert.False(ok);
        Assert.Equal("Không phải lượt của bạn.", error);
    }

    [Fact]
    public void PlayCard_CardNotOwned_IsRejected()
    {
        var state = TestFactory.MakeState(4);
        var (ok, error, _) = BangRules.HandleMove(state, "P0", TestFactory.Play("not-a-real-card", "P1"), Rng);

        Assert.False(ok);
        Assert.Equal("Bạn không có lá bài này.", error);
    }

    [Fact]
    public void UnknownMoveType_IsRejected()
    {
        var state = TestFactory.MakeState(4);
        var (ok, error, _) = BangRules.HandleMove(state, "P0", new BangMove("SET_HP", null, null, null), Rng);

        Assert.False(ok);
        Assert.Contains("không hợp lệ", error);
    }

    [Fact]
    public void Bang_OutOfRange_IsRejected()
    {
        var state = TestFactory.MakeState(6); // Cattleman tầm 1
        var p0 = state.Players[0];
        var bang = TestFactory.Card(CardKind.Bang);
        p0.Hand.Add(bang);

        var (ok, error, _) = BangRules.HandleMove(state, "P0", TestFactory.Play(bang.Id, "P2"), Rng); // khoảng cách 2

        Assert.False(ok);
        Assert.Equal("Mục tiêu nằm ngoài tầm bắn.", error);
    }

    [Fact]
    public void Bang_CannotTargetSelf()
    {
        var state = TestFactory.MakeState(4);
        var bang = TestFactory.Card(CardKind.Bang);
        state.Players[0].Hand.Add(bang);

        var (ok, error, _) = BangRules.HandleMove(state, "P0", TestFactory.Play(bang.Id, "P0"), Rng);

        Assert.False(ok);
        Assert.Equal("Không thể tự bắn chính mình.", error);
    }

    [Fact]
    public void Bang_ThenMissed_ResultsInNoDamage()
    {
        var state = TestFactory.MakeState(4);
        var bang = TestFactory.Card(CardKind.Bang);
        var missed = TestFactory.Card(CardKind.Missed);
        state.Players[0].Hand.Add(bang);
        state.Players[1].Hand.Add(missed);

        var (ok1, _, _) = BangRules.HandleMove(state, "P0", TestFactory.Play(bang.Id, "P1"), Rng);
        Assert.True(ok1);
        Assert.Equal(GamePhase.AwaitingResponse, state.Phase);

        var (ok2, _, _) = BangRules.HandleMove(state, "P1", TestFactory.Respond(missed.Id), Rng);
        Assert.True(ok2);
        Assert.Equal(4, state.Players[1].Hp); // không mất máu
        Assert.Equal(GamePhase.Action, state.Phase); // quay lại giai đoạn chính
    }

    [Fact]
    public void Bang_NoDefense_DealsOneDamage()
    {
        var state = TestFactory.MakeState(4);
        var bang = TestFactory.Card(CardKind.Bang);
        state.Players[0].Hand.Add(bang);

        BangRules.HandleMove(state, "P0", TestFactory.Play(bang.Id, "P1"), Rng);
        var (ok, _, _) = BangRules.HandleMove(state, "P1", TestFactory.Respond(null), Rng); // bỏ qua, không đỡ

        Assert.True(ok);
        Assert.Equal(3, state.Players[1].Hp);
    }

    [Fact]
    public void Bang_OnlyOnePerTurn_WithoutVolcanic()
    {
        var state = TestFactory.MakeState(4);
        var bang1 = TestFactory.Card(CardKind.Bang);
        var bang2 = TestFactory.Card(CardKind.Bang);
        state.Players[0].Hand.Add(bang1);
        state.Players[0].Hand.Add(bang2);

        BangRules.HandleMove(state, "P0", TestFactory.Play(bang1.Id, "P1"), Rng);
        BangRules.HandleMove(state, "P1", TestFactory.Respond(null), Rng); // giải quyết xong, về Action

        var (ok, error, _) = BangRules.HandleMove(state, "P0", TestFactory.Play(bang2.Id, "P1"), Rng);

        Assert.False(ok);
        Assert.Contains("1 phát súng chính", error);
    }

    [Fact]
    public void Beer_HealsOneHp_TwoForDoc()
    {
        var state = TestFactory.MakeState(4, characters: new[] { CharacterKind.Wyatt, CharacterKind.Doc });
        state.Players[1].Hp = 2; // Doc, MaxHp 4
        var beer = TestFactory.Card(CardKind.Beer);
        state.Players[1].Hand.Add(beer);
        state.CurrentPlayerId = "P1";

        var (ok, _, _) = BangRules.HandleMove(state, "P1", TestFactory.Play(beer.Id, null), Rng);

        Assert.True(ok);
        Assert.Equal(4, state.Players[1].Hp); // 2 + 2 (Doc)
    }

    [Fact]
    public void Beer_RejectedWhenHpFull()
    {
        var state = TestFactory.MakeState(4);
        var beer = TestFactory.Card(CardKind.Beer);
        state.Players[0].Hand.Add(beer);

        var (ok, error, _) = BangRules.HandleMove(state, "P0", TestFactory.Play(beer.Id, null), Rng);

        Assert.False(ok);
        Assert.Equal("HP đã đầy.", error);
    }

    [Fact]
    public void EquipWeapon_ReplacesRangeAndDiscardsOldOne()
    {
        var state = TestFactory.MakeState(4); // 4 người: khoảng cách P0->P2 = 2
        var schofield = TestFactory.Card(CardKind.Schofield);
        state.Players[0].Hand.Add(schofield);

        Assert.False(BangRules.InRange(state, "P0", "P2")); // Cattleman tầm 1 -> chưa tới

        BangRules.HandleMove(state, "P0", TestFactory.Play(schofield.Id, null), Rng);

        Assert.Equal(CardKind.Schofield, state.Players[0].WeaponCard?.Kind);
        Assert.True(BangRules.InRange(state, "P0", "P2")); // Schofield tầm 2 -> giờ tới được
    }

    [Fact]
    public void Elimination_ClearsHandAndRevealsRole_AndKillerRewardedForOutlaw()
    {
        var state = TestFactory.MakeState(4, roles: new[] { RoleKind.Sheriff, RoleKind.Outlaw });
        var victim = state.Players[1];
        victim.Hp = 1;
        victim.Hand.Add(TestFactory.Card(CardKind.Beer));
        var bang = TestFactory.Card(CardKind.Bang);
        state.Players[0].Hand.Add(bang);

        BangRules.HandleMove(state, "P0", TestFactory.Play(bang.Id, "P1"), Rng);
        BangRules.HandleMove(state, "P1", TestFactory.Respond(null), Rng); // không đỡ -> chết

        Assert.False(victim.Alive);
        Assert.Empty(victim.Hand);
        Assert.Contains(state.GameLog, l => l.Contains("đã bị loại"));
        Assert.True(state.Players[0].Hand.Count >= 3); // rút thưởng 3 lá vì hạ được Outlaw
    }

    [Fact]
    public void Elimination_KillingDeputy_ForcesKillerToDiscardHand()
    {
        var state = TestFactory.MakeState(4, roles: new[] { RoleKind.Sheriff, RoleKind.Deputy });
        var victim = state.Players[1];
        victim.Hp = 1;
        var bang = TestFactory.Card(CardKind.Bang);
        var extra = TestFactory.Card(CardKind.Beer);
        state.Players[0].Hand.Add(bang);
        state.Players[0].Hand.Add(extra);

        BangRules.HandleMove(state, "P0", TestFactory.Play(bang.Id, "P1"), Rng);
        BangRules.HandleMove(state, "P1", TestFactory.Respond(null), Rng);

        Assert.Empty(state.Players[0].Hand); // đã bỏ hết bài vì bắn nhầm Phó cảnh sát
    }

    [Fact]
    public void DeadPlayers_AreSkippedWhenAdvancingTurn()
    {
        var state = TestFactory.MakeState(4);
        state.Players[1].Alive = false; // P1 chết, lượt phải nhảy sang P2

        var (ok, _, _) = BangRules.HandleMove(state, "P0", TestFactory.EndTurn, Rng);

        Assert.True(ok);
        Assert.Equal("P2", state.CurrentPlayerId);
    }

    [Fact]
    public void Victory_SheriffDies_RenegadeAlone_RenegadeWins()
    {
        // P0=Sheriff(1 HP), P1=Renegade, P2=Outlaw đã bị loại từ trước -> chỉ còn Renegade sau khi Sheriff chết.
        var state = TestFactory.MakeState(3, roles: new[] { RoleKind.Sheriff, RoleKind.Renegade, RoleKind.Outlaw });
        state.Players[2].Alive = false;
        state.Players[0].Hp = 1;
        state.CurrentPlayerId = "P1";
        var bang = TestFactory.Card(CardKind.Bang);
        state.Players[1].Hand.Add(bang);

        BangRules.HandleMove(state, "P1", TestFactory.Play(bang.Id, "P0"), Rng);
        var (_, _, winner) = BangRules.HandleMove(state, "P0", TestFactory.Respond(null), Rng);

        Assert.Equal("Renegade", winner);
        Assert.Equal(GamePhase.Finished, state.Phase);
    }

    [Fact]
    public void Victory_AllOutlawsAndRenegadeDead_SheriffWins()
    {
        var state = TestFactory.MakeState(3, roles: new[] { RoleKind.Sheriff, RoleKind.Outlaw, RoleKind.Deputy });
        var outlaw = state.Players[1];
        outlaw.Hp = 1;
        var bang = TestFactory.Card(CardKind.Bang);
        state.Players[0].Hand.Add(bang);

        BangRules.HandleMove(state, "P0", TestFactory.Play(bang.Id, "P1"), Rng);
        var (_, _, winner) = BangRules.HandleMove(state, "P1", TestFactory.Respond(null), Rng);

        Assert.Equal("Sheriff", winner);
        Assert.Equal(GamePhase.Finished, state.Phase);
    }

    [Fact]
    public void Victory_SheriffDies_OutlawsWin_WhenOthersAlive()
    {
        var state = TestFactory.MakeState(3, roles: new[] { RoleKind.Sheriff, RoleKind.Outlaw, RoleKind.Deputy });
        var sheriff = state.Players[0];
        sheriff.Hp = 1;
        state.CurrentPlayerId = "P1";
        var bang = TestFactory.Card(CardKind.Bang);
        state.Players[1].Hand.Add(bang);

        BangRules.HandleMove(state, "P1", TestFactory.Play(bang.Id, "P0"), Rng);
        var (_, _, winner) = BangRules.HandleMove(state, "P0", TestFactory.Respond(null), Rng);

        Assert.Equal("Outlaw", winner);
    }

    [Fact]
    public void Duel_LoserTakesDamage_WinnerUnharmed()
    {
        var state = TestFactory.MakeState(4);
        var duel = TestFactory.Card(CardKind.Duel);
        state.Players[0].Hand.Add(duel);

        BangRules.HandleMove(state, "P0", TestFactory.Play(duel.Id, "P1"), Rng);
        Assert.Equal(GamePhase.AwaitingResponse, state.Phase);

        var (ok, _, _) = BangRules.HandleMove(state, "P1", TestFactory.Respond(null), Rng); // P1 không có Bang! -> thua

        Assert.True(ok);
        Assert.Equal(3, state.Players[1].Hp);
        Assert.Equal(4, state.Players[0].Hp);
        Assert.Equal(GamePhase.Action, state.Phase);
    }

    [Fact]
    public void Indians_DiscardBang_AvoidsDamage()
    {
        var state = TestFactory.MakeState(4);
        var indians = TestFactory.Card(CardKind.Indians);
        var bang = TestFactory.Card(CardKind.Bang);
        state.Players[0].Hand.Add(indians);
        state.Players[1].Hand.Add(bang);
        state.Players[2].Hand.Add(TestFactory.Card(CardKind.Beer)); // không có Bang! -> sẽ mất máu

        BangRules.HandleMove(state, "P0", TestFactory.Play(indians.Id, null), Rng);
        BangRules.HandleMove(state, "P1", TestFactory.Respond(bang.Id), Rng);
        BangRules.HandleMove(state, "P2", TestFactory.Respond(null), Rng);
        var (_, _, _) = BangRules.HandleMove(state, "P3", TestFactory.Respond(null), Rng);

        Assert.Equal(4, state.Players[1].Hp); // né được
        Assert.Equal(3, state.Players[2].Hp); // mất 1
        Assert.Equal(3, state.Players[3].Hp);
        Assert.Equal(GamePhase.Action, state.Phase);
    }
}
