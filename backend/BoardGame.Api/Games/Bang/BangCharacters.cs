namespace BoardGame.Api.Games.Bang;

/// <summary>
/// Catalog nhân vật + gán ngẫu nhiên cho người chơi. Khả năng đặc biệt được ÁP DỤNG
/// trong BangRules (không hard-code trong React) — file này chỉ định nghĩa dữ liệu.
/// Tất cả nhân vật có MaxHp nền 4; Sheriff được +1 (luật chuẩn của thể loại game này).
/// </summary>
public static class BangCharacters
{
    public static readonly IReadOnlyList<CharacterDef> Catalog = new List<CharacterDef>
    {
        new(CharacterKind.Wyatt, "Wyatt", 4, "Xạ thủ xa",
            "Tầm bắn vũ khí của Wyatt luôn +1."),
        new(CharacterKind.Calamity, "Calamity", 4, "Ứng biến",
            "Có thể dùng lá Bang! như Trượt! và dùng lá Trượt! như Bang!."),
        new(CharacterKind.Billy, "Billy", 4, "Không giới hạn",
            "Bang! của Billy bắn được mọi khoảng cách, không cần trong tầm."),
        new(CharacterKind.Jesse, "Jesse", 4, "Giữ súng chắc",
            "Vũ khí của Jesse không thể bị Hoảng loạn!/Cat Balou lấy hay bỏ."),
        new(CharacterKind.Doc, "Doc", 4, "Lang y",
            "Uống Bia hồi 2 HP thay vì 1."),
        new(CharacterKind.Jack, "Jack", 4, "Nhanh tay",
            "Đầu lượt rút 3 lá thay vì 2."),
        new(CharacterKind.Rose, "Rose", 4, "Bền bỉ",
            "Khi HP ≤ một nửa MaxHp lúc đầu lượt, rút thêm 1 lá."),
        new(CharacterKind.Morgan, "Morgan", 4, "Né đòn",
            "Người khác luôn nhìn Morgan xa hơn 1 khoảng cách khi nhắm bắn (như có sẵn Mustang)."),
    };

    public static CharacterDef Get(CharacterKind kind) => Catalog.First(c => c.Kind == kind);

    /// <summary>Gán nhân vật ngẫu nhiên, không trùng, cho từng ghế (Catalog có đúng 8 — đủ cho MaxPlayers).</summary>
    public static List<CharacterKind> AssignCharacters(int seatCount, Random rng)
    {
        var pool = Catalog.Select(c => c.Kind).ToList();
        for (var i = pool.Count - 1; i > 0; i--)
        {
            var j = rng.Next(i + 1);
            (pool[i], pool[j]) = (pool[j], pool[i]);
        }
        return pool.Take(seatCount).ToList();
    }
}
