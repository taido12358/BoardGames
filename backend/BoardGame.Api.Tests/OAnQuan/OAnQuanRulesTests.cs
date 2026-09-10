using BoardGame.Api.Games.OAnQuan;
using Xunit;

namespace BoardGame.Api.Tests.OAnQuan;

/// <summary>
/// Test luật thuần <see cref="OAnQuanRules"/> — 12 ô cố định: [0]=Quan P0, [1..5]=dân P0,
/// [6]=Quan P1, [7..11]=dân P1. Mỗi test tự dựng <see cref="GameState"/> trực tiếp (không qua
/// CreateState) để kiểm soát chính xác kịch bản rải quân/ăn quân/bốc tiếp cần verify.
///
/// LƯU Ý QUAN TRỌNG khi viết thêm test: <see cref="FullBoard"/> luôn bắt đầu từ bàn cờ ĐẦY ĐỦ
/// (như <see cref="OAnQuanRules.CreateState"/>) rồi mới áp override — KHÔNG dựng mảng
/// <c>new int[12]</c> trần rồi chỉ set vài ô liên quan, vì phần còn lại sẽ mặc định = 0, vô tình
/// làm bên kia "hết vốn" (5 ô dân trống) và kích hoạt luật vay/kết thúc ván NGOÀI Ý MUỐN, làm
/// sai lệch toàn bộ assertion của test (đã tự bắt lỗi này khi viết lần đầu — xem
/// rules/logs/2026-09-11.md).
/// </summary>
public class OAnQuanRulesTests
{
    private static int[] FullBoard(params (int index, int value)[] overrides)
    {
        var pits = new int[12];
        for (var i = 0; i < 12; i++) pits[i] = OAnQuanRules.IsQuanPit(i) ? 10 : 5;
        foreach (var (index, value) in overrides) pits[index] = value;
        return pits;
    }

    private static GameState MakeState(int[] pits, string turn = "P0", bool[]? quanCaptured = null,
        int[]? scores = null, string? winner = null)
        => new()
        {
            Pits = (int[])pits.Clone(),
            Turn = turn,
            QuanCaptured = quanCaptured ?? new bool[2],
            Scores = scores ?? new int[2],
            Winner = winner,
        };

    [Fact]
    public void CreateState_InitialSetup_HasCorrectStonesAndTurn()
    {
        var s = OAnQuanRules.CreateState();

        Assert.Equal(10, s.Pits[0]);
        Assert.Equal(10, s.Pits[6]);
        foreach (var i in new[] { 1, 2, 3, 4, 5, 7, 8, 9, 10, 11 }) Assert.Equal(5, s.Pits[i]);
        Assert.Equal("P0", s.Turn);
        Assert.Null(s.Winner);
        Assert.Equal(new[] { 0, 0 }, s.Scores);
        Assert.Equal(new[] { false, false }, s.QuanCaptured);
    }

    [Fact]
    public void ValidMove_NotYourTurn_ReturnsFalse()
    {
        var s = OAnQuanRules.CreateState();
        Assert.False(OAnQuanRules.ValidMove(s, "P1", 7, "cw"));
    }

    [Fact]
    public void ValidMove_QuanPitSelected_ReturnsFalse()
    {
        var s = OAnQuanRules.CreateState();
        Assert.False(OAnQuanRules.ValidMove(s, "P0", 0, "cw"));
    }

    [Fact]
    public void ValidMove_OpponentsDanPitSelected_ReturnsFalse()
    {
        var s = OAnQuanRules.CreateState();
        Assert.False(OAnQuanRules.ValidMove(s, "P0", 7, "cw")); // ô 7 là dân của P1
    }

    [Fact]
    public void ValidMove_EmptyPit_ReturnsFalse()
    {
        var s = OAnQuanRules.CreateState();
        s.Pits[1] = 0;
        Assert.False(OAnQuanRules.ValidMove(s, "P0", 1, "cw"));
    }

    [Fact]
    public void ValidMove_InvalidDirection_ReturnsFalse()
    {
        var s = OAnQuanRules.CreateState();
        Assert.False(OAnQuanRules.ValidMove(s, "P0", 1, "sideways"));
    }

    [Fact]
    public void ValidMove_GameAlreadyOver_ReturnsFalse()
    {
        var s = OAnQuanRules.CreateState();
        s.Winner = "P0";
        Assert.False(OAnQuanRules.ValidMove(s, "P0", 1, "cw"));
    }

    [Fact]
    public void ApplyMove_SimpleSowing_PassesThroughOccupiedPitWithoutRelay_LandsWithNoCapture()
    {
        // Rải 2 quân từ ô 1: ô 2 (5 quân có sẵn, CHỈ đi ngang qua — không phải điểm dừng nên
        // KHÔNG kiểm tra "bốc tiếp" ở đó) -> ô 3 (trống sẵn, là điểm dừng thật sự, +1 = 1, không
        // đủ điều kiện bốc tiếp) -> xét ăn ô 4 (trống sẵn) -> không ăn được gì.
        var s = MakeState(FullBoard((1, 2), (3, 0), (4, 0)));

        OAnQuanRules.ApplyMove(s, "P0", 1, "cw");

        Assert.Equal(0, s.Pits[1]);
        Assert.Equal(6, s.Pits[2]); // chỉ +1 từ đi ngang qua, KHÔNG bị bốc lại (không phải điểm dừng)
        Assert.Equal(1, s.Pits[3]); // điểm dừng thật sự
        Assert.Equal(0, s.Pits[4]); // không bị ăn vì đang trống
        Assert.Equal(new[] { 0, 0 }, s.Scores);
        Assert.Equal("P1", s.Turn);
        Assert.Null(s.Winner);
    }

    [Fact]
    public void ApplyMove_LandsOnPitWithExistingStones_RelaysUntilStoppingAtQuan()
    {
        // Rải 1 quân từ ô 1 sang ô 2 (đặt sẵn 3 quân) -> 3+1=4 >= 2 -> bốc hết ô 2 (4 quân) rải
        // tiếp cw: 3(trống sẵn,+1=1), 4(trống sẵn,+1=1), 5(trống sẵn,+1=1), 6=quan(+1) — dừng
        // ĐÚNG lúc quân cuối cùng rơi vào ô quan, không ăn, không bốc tiếp dù ô quan có sẵn quân.
        var s = MakeState(FullBoard((1, 1), (2, 3), (3, 0), (4, 0), (5, 0)));

        OAnQuanRules.ApplyMove(s, "P0", 1, "cw");

        Assert.Equal(0, s.Pits[1]);
        Assert.Equal(0, s.Pits[2]); // đã bốc hết đi rải tiếp
        Assert.Equal(1, s.Pits[3]);
        Assert.Equal(1, s.Pits[4]);
        Assert.Equal(1, s.Pits[5]);
        Assert.Equal(11, s.Pits[6]); // 10 (mặc định) + 1 — KHÔNG bốc tiếp dù giờ >= 2, vì là ô quan
        Assert.Equal(5, s.Pits[7]); // không bị đụng tới — lượt đã kết thúc ngay ở ô quan
        Assert.Equal(new[] { 0, 0 }, s.Scores);
        Assert.False(s.QuanCaptured[1]);
        Assert.Equal("P1", s.Turn);
    }

    [Fact]
    public void ApplyMove_LandsInEmptyPitFollowedByNonEmptyPit_CapturesNextPit()
    {
        var s = MakeState(FullBoard((1, 1), (2, 0))); // rải 1 quân từ ô1 -> ô2 (trống sẵn) -> dừng; ô3 có 5 quân (mặc định) -> bị ăn

        OAnQuanRules.ApplyMove(s, "P0", 1, "cw");

        Assert.Equal(1, s.Pits[2]); // ô dừng vẫn giữ 1 quân vừa rải, KHÔNG bị ăn
        Assert.Equal(0, s.Pits[3]); // ô bị ăn về 0
        Assert.Equal(5, s.Scores[0]);
        Assert.Equal("P1", s.Turn);
    }

    [Fact]
    public void ApplyMove_LandsInEmptyPitFollowedByEmptyPit_NoCapture()
    {
        var s = MakeState(FullBoard((1, 1), (2, 0), (3, 0)));

        OAnQuanRules.ApplyMove(s, "P0", 1, "cw");

        Assert.Equal(new[] { 0, 0 }, s.Scores);
        Assert.Equal("P1", s.Turn);
    }

    [Fact]
    public void ApplyMove_SowingLandsExactlyOnQuanPit_EndsTurnImmediatelyNoCaptureCheck()
    {
        var s = MakeState(FullBoard((5, 1))); // ô dân cuối cùng trước ô quan P1 (ô 6) — quân đáp xuống đúng ô quan

        OAnQuanRules.ApplyMove(s, "P0", 5, "cw");

        Assert.Equal(11, s.Pits[6]);
        Assert.Equal(5, s.Pits[7]); // không hề bị ăn — lượt kết thúc ngay khi rơi vào ô quan
        Assert.Equal(new[] { 0, 0 }, s.Scores);
        Assert.False(s.QuanCaptured[1]);
        Assert.Equal("P1", s.Turn);
    }

    [Fact]
    public void ApplyMove_CcwDirection_SowsBackwardAndCanLandOnOwnQuan()
    {
        var s = MakeState(FullBoard((1, 1))); // rải "ccw" từ ô 1 sẽ đáp xuống ô 0 (ô quan P0)

        OAnQuanRules.ApplyMove(s, "P0", 1, "ccw");

        Assert.Equal(11, s.Pits[0]);
        Assert.Equal(new[] { 0, 0 }, s.Scores);
        Assert.Equal("P1", s.Turn);
    }

    [Fact]
    public void ApplyMove_CapturesOpponentQuanPit_SetsQuanCapturedFlagAndAwardsFullValue()
    {
        // Rải 2 quân từ ô 3: -> ô4 (trống sẵn) -> ô5 (trống sẵn, dừng ở đây) -> ăn ô kế (6 = quan P1, 10 quân).
        var s = MakeState(FullBoard((3, 2), (4, 0), (5, 0)));

        OAnQuanRules.ApplyMove(s, "P0", 3, "cw");

        Assert.Equal(0, s.Pits[6]);
        Assert.Equal(10, s.Scores[0]);
        Assert.True(s.QuanCaptured[1]);
        Assert.False(s.QuanCaptured[0]);
        Assert.Null(s.Winner); // chỉ mới ăn 1 trong 2 ô quan — ván chưa kết thúc
    }

    [Fact]
    public void ApplyMove_CapturingSecondQuan_EndsGameAndAwardsRemainingBoardStonesToOwners()
    {
        var pits = FullBoard((0, 0), (3, 2), (4, 0), (5, 0), (1, 3), (2, 1), (7, 2), (8, 0), (9, 0), (10, 3), (11, 0));
        // pits[0]=0: ô quan P0 đã bị ăn từ trước (QuanCaptured[0]=true). pits[6] giữ nguyên 10 (mặc định FullBoard) — sắp bị ăn nốt.
        var s = MakeState(pits, quanCaptured: [true, false], scores: [5, 2]);

        OAnQuanRules.ApplyMove(s, "P0", 3, "cw"); // 3->4(trống)->5(trống,dừng); ăn ô 6 (quan, 10 quân)

        Assert.True(s.QuanCaptured[0]);
        Assert.True(s.QuanCaptured[1]);
        // Điểm sau khi ăn quan: P0 = 5(cũ) + 10(quan) = 15, cộng thêm quân dân còn lại trên bàn
        // của từng bên lúc kết thúc ván: P0 (ô 1,2,3,4,5) = 3+1+0+1+1 = 6 -> 15+6 = 21.
        // P1 (ô 7..11) = 2+0+0+3+0 = 5 -> 2+5 = 7.
        Assert.Equal(21, s.Scores[0]);
        Assert.Equal(7, s.Scores[1]);
        Assert.Equal("P0", s.Winner);
        Assert.All(s.Pits, p => Assert.Equal(0, p)); // toàn bộ quân đã được quy về điểm, bàn trống
    }

    [Fact]
    public void ApplyMove_ScoresEqualAtGameEnd_WinnerIsDraw()
    {
        // QuanCaptured đã đủ 2 từ trước (mô phỏng trạng thái ngay sau một nước đi khác) — nước
        // đi trong test này chỉ là "giọt nước tràn ly" để kích hoạt kiểm tra kết thúc ván ngay
        // sau khi rải xong, không liên quan gì tới việc ăn quan.
        var pits = FullBoard((0, 0), (6, 0), (1, 0), (2, 0), (3, 1), (4, 0), (5, 0), (7, 1), (8, 0), (9, 0), (10, 0), (11, 0));
        // P0 dư đúng 1 quân trên bàn (ô 4, sau khi rải), P1 dư đúng 1 quân (ô 7) -> đối xứng, giữ điểm hoà.
        var s = MakeState(pits, quanCaptured: [true, true], scores: [3, 3]);

        OAnQuanRules.ApplyMove(s, "P0", 3, "cw");

        Assert.Equal(4, s.Scores[0]); // 3 + 1 quân dư ở ô 4
        Assert.Equal(4, s.Scores[1]); // 3 + 1 quân dư ở ô 7
        Assert.Equal("DRAW", s.Winner);
    }

    [Fact]
    public void ApplyMove_NextPlayerAllDanPitsEmptyWithEnoughScore_BorrowsFiveStones()
    {
        var pits = FullBoard((1, 1), (2, 0), (3, 0), (7, 0), (8, 0), (9, 0), (10, 0), (11, 0));
        var s = MakeState(pits, scores: [0, 7]); // P1 có đủ >=5 điểm để vay

        OAnQuanRules.ApplyMove(s, "P0", 1, "cw");

        Assert.Equal("P1", s.Turn);
        Assert.Equal(2, s.Scores[1]); // 7 - 5
        Assert.All(new[] { 7, 8, 9, 10, 11 }, i => Assert.Equal(1, s.Pits[i]));
        Assert.Null(s.Winner);
    }

    [Fact]
    public void ApplyMove_NextPlayerAllDanPitsEmptyWithoutEnoughScore_EndsGameImmediately()
    {
        var pits = FullBoard((1, 1), (2, 0), (3, 0), (7, 0), (8, 0), (9, 0), (10, 0), (11, 0));
        var s = MakeState(pits, scores: [4, 3]); // P1 không đủ 5 điểm để vay

        OAnQuanRules.ApplyMove(s, "P0", 1, "cw");

        // P0 còn lại trên bàn (ô 1..5) = 0+1+0+5+5 = 11 -> cộng vào điểm: 4+11 = 15.
        // P1 không còn gì trên bàn (đã hết vốn) -> giữ nguyên 3.
        Assert.Equal(15, s.Scores[0]);
        Assert.Equal(3, s.Scores[1]);
        Assert.Equal("P0", s.Winner);
    }
}
