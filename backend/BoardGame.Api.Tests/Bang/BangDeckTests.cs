using BoardGame.Api.Games.Bang;
using Xunit;

namespace BoardGame.Api.Tests.Bang;

public class BangDeckTests
{
    [Fact]
    public void BuildFullDeck_HasNoDuplicateIds()
    {
        var deck = BangCards.BuildFullDeck();
        Assert.True(deck.Count > 0);
        Assert.Equal(deck.Count, deck.Select(c => c.Id).Distinct().Count());
    }

    [Fact]
    public void DrawOne_RemovesCardFromDeck()
    {
        var state = new BangGameState { Deck = BangCards.BuildFullDeck() };
        var before = state.Deck.Count;

        var drawn = BangDeck.DrawOne(state, new Random(1));

        Assert.NotNull(drawn);
        Assert.Equal(before - 1, state.Deck.Count);
    }

    [Fact]
    public void DrawOne_WhenDeckEmpty_ReshufflesDiscardPile()
    {
        var state = new BangGameState { Deck = new List<Card>() };
        state.DiscardPile.Add(TestFactory.Card(CardKind.Bang));
        state.DiscardPile.Add(TestFactory.Card(CardKind.Missed));

        var drawn = BangDeck.DrawOne(state, new Random(1));

        Assert.NotNull(drawn);
        Assert.Empty(state.DiscardPile);
        Assert.Single(state.Deck); // 2 lá trong discard -> xáo thành nọc -> rút 1 -> còn 1
    }

    [Fact]
    public void DrawOne_WhenDeckAndDiscardEmpty_ReturnsNull()
    {
        var state = new BangGameState { Deck = new List<Card>() };
        Assert.Null(BangDeck.DrawOne(state, new Random(1)));
    }

    [Fact]
    public void DrawMany_StopsEarlyIfCardsRunOut()
    {
        var state = new BangGameState { Deck = new List<Card> { TestFactory.Card(CardKind.Bang) } };
        var drawn = BangDeck.DrawMany(state, new Random(1), 5);
        Assert.Single(drawn);
    }
}
