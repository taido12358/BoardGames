namespace BoardGame.Api.Games.Bang;

/// <summary>Thao tác trên nọc bài/chồng bài bỏ — rút bài, xáo lại khi nọc cạn.</summary>
public static class BangDeck
{
    /// <summary>
    /// Rút 1 lá từ nọc; nếu nọc cạn, xáo chồng bài bỏ thành nọc mới rồi rút tiếp.
    /// Trả null nếu cả nọc lẫn chồng bài bỏ đều rỗng (lý thuyết không xảy ra với bộ 71 lá).
    /// </summary>
    public static Card? DrawOne(BangGameState state, Random rng)
    {
        if (state.Deck.Count == 0)
        {
            if (state.DiscardPile.Count == 0) return null;
            state.Deck.AddRange(state.DiscardPile);
            state.DiscardPile.Clear();
            BangCards.Shuffle(state.Deck, rng);
            state.GameLog.Add("Nọc bài hết — xáo lại từ chồng bài bỏ.");
        }

        var top = state.Deck[^1];
        state.Deck.RemoveAt(state.Deck.Count - 1);
        return top;
    }

    public static List<Card> DrawMany(BangGameState state, Random rng, int count)
    {
        var drawn = new List<Card>();
        for (var i = 0; i < count; i++)
        {
            var c = DrawOne(state, rng);
            if (c is null) break;
            drawn.Add(c);
        }
        return drawn;
    }
}
