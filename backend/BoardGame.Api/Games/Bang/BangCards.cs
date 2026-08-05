namespace BoardGame.Api.Games.Bang;

/// <summary>
/// Catalog TĨNH của các loại bài + thành phần bộ bài. Không phải bản sao luật của
/// game thương mại gốc — số lượng/luật đã đơn giản hoá cho phiên bản chơi được đầu
/// tiên (xem CLAUDE cũ/rules cho ghi chú). KHÔNG chứa artwork — chỉ text + icon Unicode.
/// </summary>
public static class BangCards
{
    public static readonly IReadOnlyDictionary<CardKind, CardDef> Catalog = new Dictionary<CardKind, CardDef>
    {
        [CardKind.Bang] = new(CardKind.Bang, CardType.Attack, "Bang!", "Tấn công một người chơi trong tầm bắn."),
        [CardKind.Missed] = new(CardKind.Missed, CardType.Defense, "Trượt!", "Chặn một phát Bang! nhắm vào bạn."),
        [CardKind.Beer] = new(CardKind.Beer, CardType.Heal, "Bia", "Hồi 1 HP (không hồi quá HP tối đa)."),
        [CardKind.Gatling] = new(CardKind.Gatling, CardType.Attack, "Súng Gatling", "Tấn công TẤT CẢ người chơi khác, không tính khoảng cách."),
        [CardKind.Duel] = new(CardKind.Duel, CardType.Attack, "Đấu súng", "Thách đấu 1 người chơi bất kỳ — luân phiên đánh Bang!, ai không rút được thì thua."),
        [CardKind.Panic] = new(CardKind.Panic, CardType.Action, "Hoảng loạn!", "Lấy 1 lá bài ngẫu nhiên từ người chơi cách bạn tối đa 1 khoảng cách."),
        [CardKind.CatBalou] = new(CardKind.CatBalou, CardType.Action, "Cat Balou", "Buộc một người chơi bất kỳ bỏ 1 lá bài ngẫu nhiên (không giới hạn khoảng cách)."),
        [CardKind.Stagecoach] = new(CardKind.Stagecoach, CardType.Action, "Xe ngựa", "Rút thêm 2 lá bài."),
        [CardKind.WellsFargo] = new(CardKind.WellsFargo, CardType.Action, "Wells Fargo", "Rút thêm 3 lá bài."),
        [CardKind.Indians] = new(CardKind.Indians, CardType.Attack, "Người da đỏ!", "Mọi người chơi khác phải bỏ 1 lá Bang! hoặc mất 1 HP."),
        [CardKind.Volcanic] = new(CardKind.Volcanic, CardType.Weapon, "Volcanic", "Vũ khí tầm bắn 1. Được đánh nhiều Bang! trong một lượt."),
        [CardKind.Schofield] = new(CardKind.Schofield, CardType.Weapon, "Schofield", "Vũ khí tầm bắn 2."),
        [CardKind.Remington] = new(CardKind.Remington, CardType.Weapon, "Remington", "Vũ khí tầm bắn 3."),
        [CardKind.Mustang] = new(CardKind.Mustang, CardType.Equipment, "Mustang", "Người khác nhìn bạn xa hơn 1 khoảng cách khi nhắm bắn."),
        [CardKind.Barrel] = new(CardKind.Barrel, CardType.Equipment, "Thùng rượu", "Khi bị nhắm Bang!, tự rút 1 lá — nếu ra lá ♥ thì coi như đỡ được."),
    };

    /// <summary>Tầm bắn của vũ khí; null (chưa trang bị) = Cattleman mặc định, tầm 1.</summary>
    public static int WeaponRange(CardKind? weapon) => weapon switch
    {
        CardKind.Volcanic => 1,
        CardKind.Schofield => 2,
        CardKind.Remington => 3,
        null => 1, // Cattleman mặc định
        _ => 1,
    };

    public static string WeaponName(CardKind? weapon) => weapon is null ? "Cattleman" : Catalog[weapon.Value].Name;

    private static readonly string[] Suits = { "♠", "♥", "♦", "♣" };
    private static readonly string[] Ranks = { "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A" };

    /// <summary>Số lượng mỗi loại bài trong bộ (đã đơn giản hoá so với bộ gốc 80 lá).</summary>
    private static readonly (CardKind Kind, int Count)[] Composition =
    {
        (CardKind.Bang, 24),
        (CardKind.Missed, 12),
        (CardKind.Beer, 6),
        (CardKind.Duel, 3),
        (CardKind.Gatling, 2),
        (CardKind.Panic, 4),
        (CardKind.CatBalou, 4),
        (CardKind.Stagecoach, 2),
        (CardKind.WellsFargo, 1),
        (CardKind.Indians, 2),
        (CardKind.Volcanic, 2),
        (CardKind.Schofield, 3),
        (CardKind.Remington, 2),
        (CardKind.Mustang, 2),
        (CardKind.Barrel, 2),
    };

    /// <summary>Tạo bộ bài đầy đủ, CHƯA xáo — suit/rank gán tuần hoàn chỉ để hiển thị.</summary>
    public static List<Card> BuildFullDeck()
    {
        var deck = new List<Card>();
        var counter = 0;
        foreach (var (kind, count) in Composition)
        {
            for (var i = 0; i < count; i++)
            {
                var suit = Suits[counter % Suits.Length];
                var rank = Ranks[counter % Ranks.Length];
                deck.Add(new Card($"{kind}-{counter}", kind, suit, rank));
                counter++;
            }
        }
        return deck;
    }

    public static void Shuffle(List<Card> cards, Random rng)
    {
        for (var i = cards.Count - 1; i > 0; i--)
        {
            var j = rng.Next(i + 1);
            (cards[i], cards[j]) = (cards[j], cards[i]);
        }
    }
}
