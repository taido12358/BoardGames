using BoardGame.Api.Games.Bang;
using Xunit;

namespace BoardGame.Api.Tests.Bang;

public class BangHealthRegressionTests
{
    [Fact]
    public void Viewer_CanFireTracksShotLimitAndVolcanic()
    {
        var state = TestFactory.MakeState(4);
        Assert.True(BangRules.BuildViewerPayload(state, "P0").You!.CanFire);
        state.BangPlayedThisTurn = true;
        Assert.False(BangRules.BuildViewerPayload(state, "P0").You!.CanFire);
        state.Players[0].WeaponCard = TestFactory.Card(CardKind.Volcanic);
        Assert.True(BangRules.BuildViewerPayload(state, "P0").You!.CanFire);
        Assert.False(BangRules.BuildViewerPayload(state, "P1").You!.CanFire);
    }
    [Fact]
    public void Duel_InvalidDefense_DoesNotDamageOrConsumeCard()
    {
        var state = TestFactory.MakeState(4);
        var duel = TestFactory.Card(CardKind.Duel);
        var beer = TestFactory.Card(CardKind.Beer);
        state.Players[0].Hand.Add(duel);
        state.Players[1].Hand.Add(beer);
        BangRules.HandleMove(state, "P0", TestFactory.Play(duel.Id, "P1"), new Random(1));

        var result = BangRules.HandleMove(state, "P1", TestFactory.Respond(beer.Id), new Random(1));

        Assert.False(result.Ok);
        Assert.Equal(4, state.Players[1].Hp);
        Assert.Contains(beer, state.Players[1].Hand);
        Assert.Equal(GamePhase.AwaitingResponse, state.Phase);
        Assert.True(BangRules.HandleMove(state, "P1", TestFactory.Respond(null), new Random(1)).Ok);
        Assert.Equal(3, state.Players[1].Hp);
    }

    [Fact]
    public void Doc_BeerNearMaximum_HealsAndLogsActualAmount()
    {
        var state = TestFactory.MakeState(4);
        var player = state.Players[0];
        player.Character = CharacterKind.Doc;
        player.Hp = 3;
        var beer = TestFactory.Card(CardKind.Beer);
        player.Hand.Add(beer);

        Assert.True(BangRules.HandleMove(state, "P0", TestFactory.Play(beer.Id), new Random(1)).Ok);
        Assert.Equal(4, player.Hp);
        Assert.Contains("hồi 1 HP", state.GameLog.Last());
        Assert.DoesNotContain(beer, player.Hand);
    }

    [Fact]
    public void EndTurn_TwoHandCardsAtTwoHp_DoNotCountWeaponsOrEquipment()
    {
        var state = TestFactory.MakeState(4);
        var player = state.Players[0];
        player.Hp = 2;
        var first = TestFactory.Card(CardKind.Bang);
        var second = TestFactory.Card(CardKind.Beer);
        player.Hand.AddRange(new[] { first, second });
        player.WeaponCard = TestFactory.Card(CardKind.Schofield);
        player.Equipment.Add(TestFactory.Card(CardKind.Mustang));
        player.Equipment.Add(TestFactory.Card(CardKind.Barrel));

        var result = BangRules.HandleMove(state, "P0", TestFactory.EndTurn, new Random(2));

        Assert.True(result.Ok);
        Assert.Equal(new[] { first.Id, second.Id }, player.Hand.Select(c => c.Id));
        Assert.Equal(CardKind.Schofield, player.WeaponCard!.Kind);
        Assert.Equal(2, player.Equipment.Count);
        Assert.DoesNotContain(state.GameLog, line => line.Contains("bỏ") && line.Contains("vượt giới hạn"));
    }

    [Fact]
    public void EndTurn_TwoHandCardsAtOneHp_RequiresOneDiscardAndKeepsEquipment()
    {
        var state = TestFactory.MakeState(4);
        var player = state.Players[0];
        player.Hp = 1;
        var kept = TestFactory.Card(CardKind.Bang);
        var discarded = TestFactory.Card(CardKind.Beer);
        player.Hand.AddRange(new[] { kept, discarded });
        player.Equipment.Add(TestFactory.Card(CardKind.Mustang));
        player.Equipment.Add(TestFactory.Card(CardKind.Barrel));
        var move = new BangMove("END_TURN", null, null, new List<string> { discarded.Id });

        var result = BangRules.HandleMove(state, "P0", move, new Random(2));

        Assert.True(result.Ok);
        Assert.Equal(new[] { kept.Id }, player.Hand.Select(c => c.Id));
        Assert.Equal(2, player.Equipment.Count);
        Assert.Contains(state.GameLog, line => line.Contains("bỏ 1 lá do vượt giới hạn tay bài"));
    }
}
