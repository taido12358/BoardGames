namespace BoardGame.Api.Games.OAnQuan;

/// <summary>
/// Luật THUẦN của Ô Ăn Quan — trò chơi dân gian Việt Nam trên bàn 12 ô (10 ô dân + 2 ô quan),
/// không phụ thuộc hạ tầng.
///
/// Đơn giản hoá có chủ đích so với luật gốc (ghi lại để không ai tưởng nhầm là bug — luật dân
/// gian có vài dị bản giữa các nguồn, đã tra cứu Wikipedia tiếng Anh/tiếng Việt và một trang
/// hướng dẫn trước khi chọn, xem rules/tasks/backlog.md để biết chi tiết nguồn):
///  - Mỗi lượt CHỈ ăn được 1 lần (không ăn liên hoàn nhiều ô liên tiếp trong cùng 1 lượt) —
///    nguồn tiếng Anh (trích dẫn nguyên văn từ Wikipedia) chỉ mô tả một lần ăn duy nhất; nguồn
///    tiếng Việt có nhắc "ăn liên tiếp nếu điều kiện lặp lại" nhưng không mô tả cơ chế chính xác
///    — chọn bản chắc chắn đúng thay vì đoán và có rủi ro sai luật dân gian quen thuộc.
///  - Quân "quan" ban đầu có giá trị 10 quân (một biến thể phổ biến; biến thể khác dùng 5).
///  - Rải quân dừng đúng vào MỘT ô quan luôn kết thúc lượt ngay (không ăn, không "bốc" tiếp
///    rải lại) — kể cả khi ô quan đó đã có sẵn quân (đáng lẽ đủ điều kiện "bốc tiếp" nếu là ô
///    dân thường).
/// </summary>
public static class OAnQuanRules
{
    public const int PitCount = 12;
    private static readonly int[][] DanIndicesBySide = [[1, 2, 3, 4, 5], [7, 8, 9, 10, 11]];

    public static int SideIndex(string side) => side == "P0" ? 0 : 1;
    public static bool IsQuanPit(int index) => index == 0 || index == 6;
    public static int[] DanPitsOf(string side) => DanIndicesBySide[SideIndex(side)];

    public static GameState CreateState()
    {
        var pits = new int[PitCount];
        for (var i = 0; i < PitCount; i++) pits[i] = IsQuanPit(i) ? 10 : 5;
        return new GameState { Pits = pits, QuanCaptured = new bool[2], Scores = new int[2], Turn = "P0", Winner = null };
    }

    private static int Next(int index, string direction)
        => direction == "cw" ? (index + 1) % PitCount : (index + PitCount - 1) % PitCount;

    public static bool ValidMove(GameState s, string side, int pitIndex, string direction)
    {
        if (s.Winner != null) return false;
        if (side != s.Turn) return false;
        if (direction != "cw" && direction != "ccw") return false;
        if (!DanPitsOf(side).Contains(pitIndex)) return false;
        return s.Pits[pitIndex] > 0;
    }

    /// <summary>Áp dụng nước đi — gọi sau khi <see cref="ValidMove"/> đã xác nhận true.</summary>
    public static void ApplyMove(GameState s, string side, int pitIndex, string direction)
    {
        var sideIdx = SideIndex(side);
        var stonesInHand = s.Pits[pitIndex];
        s.Pits[pitIndex] = 0;
        var current = pitIndex;

        while (stonesInHand > 0)
        {
            current = Next(current, direction);
            s.Pits[current]++;
            stonesInHand--;
            if (stonesInHand > 0) continue; // còn quân trên tay -> rải tiếp, chưa xét gì cả

            if (IsQuanPit(current))
            {
                break; // dừng đúng vào ô quan -> hết lượt ngay, không ăn, không bốc tiếp
            }
            if (s.Pits[current] >= 2)
            {
                // Ô vừa rải đã có quân từ trước -> "bốc" hết ô này, rải tiếp (relay) cùng chiều.
                stonesInHand = s.Pits[current];
                s.Pits[current] = 0;
                continue;
            }

            // Ô vừa rải trống trước đó (giờ = 1) -> dừng hẳn, xét ăn quân ở ô kế tiếp.
            var captureTarget = Next(current, direction);
            if (s.Pits[captureTarget] > 0)
            {
                s.Scores[sideIdx] += s.Pits[captureTarget];
                s.Pits[captureTarget] = 0;
                if (IsQuanPit(captureTarget)) s.QuanCaptured[captureTarget == 0 ? 0 : 1] = true;
            }
        }

        FinalizeTurn(s, side);
    }

    private static void FinalizeTurn(GameState s, string sideJustMoved)
    {
        if (s.QuanCaptured[0] && s.QuanCaptured[1])
        {
            EndGame(s);
            return;
        }

        var nextSide = sideJustMoved == "P0" ? "P1" : "P0";
        s.Turn = nextSide;

        // "Hết vốn": tới lượt mà cả 5 ô dân của mình đều trống -> vay 5 quân từ điểm đã ăn được,
        // rải mỗi ô 1 quân. Không đủ điểm để vay -> không thể đi tiếp, kết thúc ván ngay.
        var nextIdx = SideIndex(nextSide);
        if (DanPitsOf(nextSide).All(i => s.Pits[i] == 0))
        {
            if (s.Scores[nextIdx] >= 5)
            {
                s.Scores[nextIdx] -= 5;
                foreach (var i in DanPitsOf(nextSide)) s.Pits[i] = 1;
            }
            else
            {
                EndGame(s);
            }
        }
    }

    private static void EndGame(GameState s)
    {
        // Quân còn lại trên các ô dân thuộc về chủ ô đó — quy ước kết thúc ván chuẩn của thể loại mancala.
        foreach (var sideStr in new[] { "P0", "P1" })
        {
            var idx = SideIndex(sideStr);
            foreach (var i in DanPitsOf(sideStr))
            {
                s.Scores[idx] += s.Pits[i];
                s.Pits[i] = 0;
            }
        }
        s.Winner = s.Scores[0] == s.Scores[1] ? "DRAW" : (s.Scores[0] > s.Scores[1] ? "P0" : "P1");
    }
}
