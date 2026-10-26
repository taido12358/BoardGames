namespace BoardGame.Api.Games.MeoNo;

/// <summary>Tạo bộ bài ban đầu và chia bài theo luật gốc Exploding Kittens.</summary>
public static class MeoNoCards
{
    /// <summary>Tạo bộ bài đầy đủ và chia cho playerCount người.</summary>
    public static (List<Card> deck, Dictionary<string, List<Card>> hands) BuildAndDeal(
        List<string> playerIds, Random rng)
    {
        int nextId = 0;
        Card Make(CardKind kind) => new($"c{++nextId:D3}", kind);

        // ── Bộ bài cơ bản (không gồm Mèo Nổ & Khuếch Tán) ──────────────────
        var baseDeck = new List<Card>();

        // 4× Skip, Attack, Shuffle, Favor
        foreach (var kind in new[] { CardKind.Skip, CardKind.Attack, CardKind.Shuffle, CardKind.Favor })
            for (int i = 0; i < 4; i++) baseDeck.Add(Make(kind));

        // 5× SeeFuture, Nope
        foreach (var kind in new[] { CardKind.SeeFuture, CardKind.Nope })
            for (int i = 0; i < 5; i++) baseDeck.Add(Make(kind));

        // 4× mỗi loại mèo dùng làm combo
        foreach (var kind in new[] {
            CardKind.Tacocat, CardKind.BeardCat,
            CardKind.HairyPotatoCat, CardKind.RainbowRalphingCat, CardKind.Cattermelon })
            for (int i = 0; i < 4; i++) baseDeck.Add(Make(kind));

        // Trộn
        Shuffle(baseDeck, rng);

        int n = playerIds.Count;

        // ── Chia bài: mỗi người 7 lá từ baseDeck + 1 Khuếch Tán ─────────────
        var hands = new Dictionary<string, List<Card>>();
        foreach (var pid in playerIds)
        {
            var hand = new List<Card>(baseDeck.Take(7));
            baseDeck.RemoveRange(0, 7);
            hand.Add(Make(CardKind.Defuse)); // 1 Khuếch Tán cố định
            hands[pid] = hand;
        }

        // ── Thêm Khuếch Tán dư vào bộ bài (6 - n, tối thiểu 0) ─────────────
        int extraDefuse = Math.Max(0, 6 - n);
        for (int i = 0; i < extraDefuse; i++) baseDeck.Add(Make(CardKind.Defuse));

        // ── Thêm (n-1) Mèo Nổ ────────────────────────────────────────────────
        for (int i = 0; i < n - 1; i++) baseDeck.Add(Make(CardKind.ExplodingKitten));

        // Trộn lần cuối
        Shuffle(baseDeck, rng);

        return (baseDeck, hands);
    }

    public static void Shuffle<T>(List<T> list, Random rng)
    {
        for (int i = list.Count - 1; i > 0; i--)
        {
            int j = rng.Next(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
    }

    /// <summary>Tên hiển thị tiếng Việt cho từng loại bài.</summary>
    public static string DisplayName(CardKind kind) => kind switch
    {
        CardKind.ExplodingKitten => "Mèo Nổ",
        CardKind.Defuse          => "Khuếch Tán",
        CardKind.Skip            => "Bỏ Lượt",
        CardKind.Attack          => "Tấn Công",
        CardKind.SeeFuture       => "Tiên Tri",
        CardKind.Shuffle         => "Trộn Bài",
        CardKind.Favor           => "Nhờ Vả",
        CardKind.Nope            => "Dừng Lại",
        CardKind.Tacocat         => "Mèo Taco",
        CardKind.BeardCat        => "Mèo Râu",
        CardKind.HairyPotatoCat  => "Mèo Khoai",
        CardKind.RainbowRalphingCat => "Mèo Cầu Vồng",
        CardKind.Cattermelon     => "Mèo Dưa Hấu",
        _ => kind.ToString(),
    };

    public static bool IsCatCard(CardKind kind) => kind
        is CardKind.Tacocat or CardKind.BeardCat
        or CardKind.HairyPotatoCat or CardKind.RainbowRalphingCat or CardKind.Cattermelon;
}
