namespace BoardGame.Api.Games.ZodiacRace;

/// <summary>
/// Luật thuần "Đua Xe Hoàng Đạo" — v1 MVP cố tình tối giản (đổ xúc xắc, ai về đích trước
/// thắng ngay), xem ADR trong rules/history/decisions.md để biết lý do không cố tái hiện đầy đủ
/// hệ thống shop/trang bị/thùng hàng phức tạp hơn mà bộ asset zodiac gợi ý. rollDice là delegate
/// (không nhận Random trực tiếp) để test kiểm soát chính xác kết quả xúc xắc thay vì phụ thuộc
/// seed — cùng tinh thần BangRules.HandleMove nhận Random nhưng ở đây tách hẳn thành hàm số để
/// test không cần biết gì về thuật toán RNG của .NET.
/// </summary>
public static class ZodiacRaceRules
{
    public static GameState CreateWaitingState() => new() { Started = false };

    /// <summary>Gọi khi phòng đủ ghế (IGameEngine.OnRoomFull) — seatCount lúc này chắc chắn khớp GameRoom.SeatCount thật.</summary>
    public static GameState StartGame(int seatCount) => new()
    {
        Started = true,
        Positions = new int[seatCount],
        CratesCollected = new int[seatCount],
        Turn = 0,
        LastRoll = null,
        Winner = null,
    };

    /// <summary>side có dạng "P{index}" (mặc định IGameEngine.SideForSeat, ZodiacRaceEngine không override).</summary>
    public static int SeatIndexOf(string side) => int.Parse(side[1..]);

    public static bool IsCrateTile(MapDef map, int tile) => map.CrateTiles.Contains(tile);

    /// <summary>Kiểm tra side có được phép đổ xúc xắc lúc này không — dùng chung cho cả ApplyMove lẫn OnSeatTimedOut.</summary>
    public static (bool Ok, string? Error) ValidateRoll(GameState state, string side)
    {
        if (!state.Started) return (false, "Ván chưa bắt đầu");
        if (state.Winner is not null) return (false, "Ván đã kết thúc");
        if (SeatIndexOf(side) != state.Turn) return (false, "Chưa tới lượt bạn");
        return (true, null);
    }

    /// <summary>
    /// Đổ xúc xắc rồi di chuyển. Không yêu cầu đổ đúng số để về đích — thừa số bước tự động dừng
    /// tại đích (đơn giản hoá có chủ đích cho v1, không có luật "trả ngược" như cờ cá ngựa/rắn
    /// thang cổ điển). Về đích thắng NGAY, không chuyển lượt tiếp.
    /// </summary>
    public static void ApplyRoll(MapDef map, GameState state, string side, Func<int> rollDice)
    {
        var idx = SeatIndexOf(side);
        var roll = rollDice();
        state.LastRoll = roll;

        var newPos = Math.Min(state.Positions[idx] + roll, map.TrackLength);
        state.Positions[idx] = newPos;
        if (IsCrateTile(map, newPos)) state.CratesCollected[idx]++;

        if (newPos >= map.TrackLength)
        {
            state.Winner = $"P{idx}";
            return;
        }
        state.Turn = (state.Turn + 1) % state.Positions.Length;
    }
}
