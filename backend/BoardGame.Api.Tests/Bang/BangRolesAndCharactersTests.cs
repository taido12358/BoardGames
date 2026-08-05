using BoardGame.Api.Games.Bang;
using Xunit;

namespace BoardGame.Api.Tests.Bang;

public class BangRolesAndCharactersTests
{
    [Theory]
    [InlineData(4)]
    [InlineData(5)]
    [InlineData(6)]
    [InlineData(7)]
    [InlineData(8)]
    public void AssignRoles_MatchesDistributionTable_ForEveryPlayerCount(int seatCount)
    {
        var roles = BangRoles.AssignRoles(seatCount, new Random(1));

        Assert.Equal(seatCount, roles.Count);
        Assert.Equal(1, roles.Count(r => r == RoleKind.Sheriff));

        var expected = BangRoles.Distribution[seatCount];
        Assert.Equal(expected[0], roles.Count(r => r == RoleKind.Sheriff));
        Assert.Equal(expected[1], roles.Count(r => r == RoleKind.Deputy));
        Assert.Equal(expected[2], roles.Count(r => r == RoleKind.Outlaw));
        Assert.Equal(expected[3], roles.Count(r => r == RoleKind.Renegade));
    }

    [Fact]
    public void AssignRoles_UnsupportedPlayerCount_Throws()
    {
        Assert.Throws<InvalidOperationException>(() => BangRoles.AssignRoles(3, new Random(1)));
        Assert.Throws<InvalidOperationException>(() => BangRoles.AssignRoles(9, new Random(1)));
    }

    [Theory]
    [InlineData(4)]
    [InlineData(8)]
    public void AssignCharacters_ReturnsUniqueCharacters_MatchingSeatCount(int seatCount)
    {
        var characters = BangCharacters.AssignCharacters(seatCount, new Random(2));

        Assert.Equal(seatCount, characters.Count);
        Assert.Equal(characters.Count, characters.Distinct().Count()); // không trùng
        Assert.All(characters, c => Assert.Contains(c, BangCharacters.Catalog.Select(x => x.Kind)));
    }
}
