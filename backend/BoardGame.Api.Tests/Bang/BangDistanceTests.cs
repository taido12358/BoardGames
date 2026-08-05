using BoardGame.Api.Games.Bang;
using Xunit;

namespace BoardGame.Api.Tests.Bang;

public class BangDistanceTests
{
    [Fact]
    public void CalculateDistance_SixPlayers_MatchesSpecExample()
    {
        // A=P0 B=P1 C=P2 D=P3 E=P4 F=P5 quanh bàn tròn.
        var state = TestFactory.MakeState(6);

        Assert.Equal(1, BangRules.CalculateDistance(state, "P0", "P1")); // A-B
        Assert.Equal(2, BangRules.CalculateDistance(state, "P0", "P2")); // A-C
        Assert.Equal(3, BangRules.CalculateDistance(state, "P0", "P3")); // A-D
        Assert.Equal(2, BangRules.CalculateDistance(state, "P0", "P4")); // A-E
        Assert.Equal(1, BangRules.CalculateDistance(state, "P0", "P5")); // A-F
    }

    [Theory]
    [InlineData(4)]
    [InlineData(5)]
    [InlineData(6)]
    [InlineData(7)]
    [InlineData(8)]
    public void CalculateDistance_IsSymmetricInBaseCase_ForEveryPlayerCount(int seatCount)
    {
        var state = TestFactory.MakeState(seatCount);
        // Không ai có Mustang/Morgan -> khoảng cách phải đối xứng.
        Assert.Equal(
            BangRules.CalculateDistance(state, "P0", "P1"),
            BangRules.CalculateDistance(state, "P1", "P0"));
    }

    [Fact]
    public void CalculateDistance_SkipsEliminatedSeats()
    {
        var state = TestFactory.MakeState(6);
        state.Players.First(p => p.Id == "P1").Alive = false; // B chết

        // Với B loại khỏi bàn, A và C giờ liền kề (khoảng cách 1 thay vì 2).
        Assert.Equal(1, BangRules.CalculateDistance(state, "P0", "P2"));
    }

    [Fact]
    public void CalculateDistance_Mustang_AddsOneAsSeenByOthers_ButNotReverse()
    {
        var state = TestFactory.MakeState(6);
        var b = state.Players.First(p => p.Id == "P1");
        b.Equipment.Add(TestFactory.Card(CardKind.Mustang));

        Assert.Equal(2, BangRules.CalculateDistance(state, "P0", "P1")); // A nhìn B xa hơn 1
        Assert.Equal(1, BangRules.CalculateDistance(state, "P1", "P0")); // B nhìn A vẫn như cũ
    }

    [Fact]
    public void CalculateDistance_Morgan_HasInnateMustangEffect()
    {
        var state = TestFactory.MakeState(6, characters: new[] { CharacterKind.Wyatt, CharacterKind.Morgan });
        Assert.Equal(2, BangRules.CalculateDistance(state, "P0", "P1"));
    }

    [Fact]
    public void InRange_Billy_IgnoresDistanceEntirely()
    {
        var state = TestFactory.MakeState(8, characters: new[] { CharacterKind.Billy });
        // P0=Billy, khoảng cách xa nhất tới P4 (đối diện bàn 8 người) = 4.
        Assert.True(BangRules.InRange(state, "P0", "P4"));
    }

    [Fact]
    public void InRange_Wyatt_GetsPlusOneWeaponRange()
    {
        var state = TestFactory.MakeState(6, characters: new[] { CharacterKind.Wyatt });
        // Cattleman tầm 1 -> Wyatt tầm 2 -> tới P2 (khoảng cách 2) phải trong tầm.
        Assert.True(BangRules.InRange(state, "P0", "P2"));
    }

    [Fact]
    public void InRange_OutOfWeaponRange_ReturnsFalse()
    {
        var state = TestFactory.MakeState(6, characters: new[] { CharacterKind.Calamity });
        // Cattleman tầm 1, P0 -> P2 khoảng cách 2 -> ngoài tầm.
        Assert.False(BangRules.InRange(state, "P0", "P2"));
    }
}
