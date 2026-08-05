namespace BoardGame.Api.Games.Bang;

/// <summary>Bảng phân bố vai trò theo số người chơi (4-8) + gán ngẫu nhiên cho từng ghế.</summary>
public static class BangRoles
{
    /// <summary>[sheriff, deputy, outlaw, renegade] theo số người chơi.</summary>
    public static readonly IReadOnlyDictionary<int, int[]> Distribution = new Dictionary<int, int[]>
    {
        [4] = new[] { 1, 0, 2, 1 },
        [5] = new[] { 1, 1, 2, 1 },
        [6] = new[] { 1, 1, 3, 1 },
        [7] = new[] { 1, 2, 3, 1 },
        [8] = new[] { 1, 2, 4, 1 },
    };

    /// <summary>Gán vai trò ngẫu nhiên cho seatCount người chơi — Sheriff luôn được gán đúng 1 lần.</summary>
    public static List<RoleKind> AssignRoles(int seatCount, Random rng)
    {
        if (!Distribution.TryGetValue(seatCount, out var counts))
            throw new InvalidOperationException($"BANG! chỉ hỗ trợ 4-8 người chơi, nhận {seatCount}");

        var roles = new List<RoleKind>();
        roles.AddRange(Enumerable.Repeat(RoleKind.Sheriff, counts[0]));
        roles.AddRange(Enumerable.Repeat(RoleKind.Deputy, counts[1]));
        roles.AddRange(Enumerable.Repeat(RoleKind.Outlaw, counts[2]));
        roles.AddRange(Enumerable.Repeat(RoleKind.Renegade, counts[3]));

        for (var i = roles.Count - 1; i > 0; i--)
        {
            var j = rng.Next(i + 1);
            (roles[i], roles[j]) = (roles[j], roles[i]);
        }
        return roles;
    }
}
