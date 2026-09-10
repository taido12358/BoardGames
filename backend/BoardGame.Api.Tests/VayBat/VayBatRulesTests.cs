using BoardGame.Api.Games.VayBat;
using Xunit;

namespace BoardGame.Api.Tests.VayBat;

/// <summary>
/// Test luật thuần <see cref="VayBatRules"/> — độc lập với <see cref="VayBatEngine"/>/hạ tầng.
/// Trả nợ kỹ thuật: trước đây chỉ có test cho phần adapter (SideForSeat/OnSeatTimedOut).
/// </summary>
public class VayBatRulesTests
{
    /// <summary>Đồ thị hình sao: 0 (tâm) nối với 1,2,3,4 — không cạnh nào khác.</summary>
    private static MapDefinition StarMap() => new()
    {
        Nodes = new() { new(0, 0, 0), new(1, 0, 0), new(2, 0, 0), new(3, 0, 0), new(4, 0, 0) },
        Edges = new() { new() { 0, 1 }, new() { 0, 2 }, new() { 0, 3 }, new() { 0, 4 } },
        RedCount = 4,
        WhiteCount = 1,
        WhiteStart = 0,
        RedStartCandidates = new() { 1, 2, 3, 4 },
        MaxRedTurns = 15,
    };

    private static GameState MakeState(MapDefinition map, Dictionary<string, int> pieces, string turn,
        int redTurnsUsed = 0, string? winner = null)
        => new()
        {
            Pieces = pieces,
            Turn = turn,
            RedTurnsUsed = redTurnsUsed,
            MaxRedTurns = map.MaxRedTurns,
            Winner = winner,
        };

    [Fact]
    public void BuildAdjacency_ValidMap_IsSymmetric()
    {
        var adj = VayBatRules.BuildAdjacency(StarMap());

        Assert.Equal(new HashSet<int> { 1, 2, 3, 4 }, adj[0]);
        Assert.Equal(new HashSet<int> { 0 }, adj[1]);
    }

    [Fact]
    public void BuildAdjacency_EdgeReferencesMissingNode_Throws()
    {
        var map = StarMap();
        map.Edges.Add(new() { 0, 99 });

        Assert.Throws<InvalidOperationException>(() => VayBatRules.BuildAdjacency(map));
    }

    [Fact]
    public void LegalMoves_ExcludesOccupiedNeighbors()
    {
        var map = StarMap();
        var adj = VayBatRules.BuildAdjacency(map);
        var state = MakeState(map, new() { ["W0"] = 0, ["R0"] = 1, ["R1"] = 2 }, "RED");

        var moves = VayBatRules.LegalMoves(state, adj, "W0");

        Assert.Equal(new[] { 3, 4 }, moves.OrderBy(x => x));
    }

    [Fact]
    public void ValidMove_WrongTurn_ReturnsFalse()
    {
        var map = StarMap();
        var adj = VayBatRules.BuildAdjacency(map);
        var state = MakeState(map, new() { ["W0"] = 0, ["R0"] = 1 }, "WHITE");

        Assert.False(VayBatRules.ValidMove(state, adj, "R0", 2));
    }

    [Fact]
    public void ValidMove_TargetNotAdjacent_ReturnsFalse()
    {
        var map = StarMap();
        var adj = VayBatRules.BuildAdjacency(map);
        var state = MakeState(map, new() { ["W0"] = 0, ["R0"] = 1, ["R1"] = 3 }, "RED");

        Assert.False(VayBatRules.ValidMove(state, adj, "R0", 3)); // 1 và 3 không kề nhau
    }

    [Fact]
    public void ValidMove_TargetOccupied_ReturnsFalse()
    {
        var map = StarMap();
        var adj = VayBatRules.BuildAdjacency(map);
        var state = MakeState(map, new() { ["W0"] = 0, ["R0"] = 1 }, "RED");

        Assert.False(VayBatRules.ValidMove(state, adj, "R0", 0)); // trung tâm đã có White
    }

    [Fact]
    public void ValidMove_GameAlreadyHasWinner_ReturnsFalse()
    {
        var map = StarMap();
        var adj = VayBatRules.BuildAdjacency(map);
        var state = MakeState(map, new() { ["W0"] = 0, ["R0"] = 1 }, "RED", winner: "RED");

        Assert.False(VayBatRules.ValidMove(state, adj, "R0", 2));
    }

    [Fact]
    public void ValidMove_AdjacentAndEmpty_ReturnsTrue()
    {
        var map = StarMap();
        var adj = VayBatRules.BuildAdjacency(map);
        // White đứng ở nhánh 2 (không phải tâm) -> tâm (0) còn trống, R0 đi từ 1 vào tâm hợp lệ.
        var state = MakeState(map, new() { ["W0"] = 2, ["R0"] = 1 }, "RED");

        Assert.True(VayBatRules.ValidMove(state, adj, "R0", 0));
    }

    /// <summary>Đồ thị vòng 4 đỉnh (0-1-2-3-0) — mỗi đỉnh có 2 láng giềng, dùng cho test
    /// ApplyMove để tránh hiệu ứng phụ stalemate của MapDefinition hình sao (ở đó mọi quân
    /// Đỏ chỉ có đúng 1 láng giềng là tâm, nên White đứng vào tâm luôn khoá hết quân Đỏ).</summary>
    private static MapDefinition CycleMap() => new()
    {
        Nodes = new() { new(0, 0, 0), new(1, 0, 0), new(2, 0, 0), new(3, 0, 0) },
        Edges = new() { new() { 0, 1 }, new() { 1, 2 }, new() { 2, 3 }, new() { 3, 0 } },
        RedCount = 1,
        WhiteCount = 1,
        WhiteStart = 0,
        RedStartCandidates = new() { 2 },
        MaxRedTurns = 15,
    };

    [Fact]
    public void ApplyMove_RedMoves_IncrementsRedTurnsUsedAndSwitchesToWhite()
    {
        var map = CycleMap();
        var adj = VayBatRules.BuildAdjacency(map);
        var state = MakeState(map, new() { ["W0"] = 0, ["R0"] = 1 }, "RED");

        VayBatRules.ApplyMove(state, adj, "R0", 2);

        Assert.Equal("WHITE", state.Turn);
        Assert.Equal(1, state.RedTurnsUsed);
        Assert.Equal(2, state.Pieces["R0"]);
        Assert.Null(state.Winner); // White (tại 0) vẫn còn nước đi tới 1 hoặc 3 -> chưa ai thắng
    }

    [Fact]
    public void ApplyMove_WhiteMoves_DoesNotIncrementRedTurnsUsedAndSwitchesToRed()
    {
        var map = CycleMap();
        var adj = VayBatRules.BuildAdjacency(map);
        var state = MakeState(map, new() { ["W0"] = 1, ["R0"] = 3 }, "WHITE");

        VayBatRules.ApplyMove(state, adj, "W0", 2);

        Assert.Equal("RED", state.Turn);
        Assert.Equal(0, state.RedTurnsUsed);
        Assert.Equal(2, state.Pieces["W0"]);
        Assert.Null(state.Winner); // Red (tại 3) vẫn còn nước đi tới 0 -> chưa ai thắng
    }

    [Fact]
    public void CheckWinner_WhiteSurroundedByRedOnItsTurn_RedWins()
    {
        var map = StarMap();
        var adj = VayBatRules.BuildAdjacency(map);
        // White ở tâm, cả 4 nhánh bị Red chiếm hết -> White không còn nước đi nào.
        var state = MakeState(map, new()
        {
            ["W0"] = 0,
            ["R0"] = 1,
            ["R1"] = 2,
            ["R2"] = 3,
            ["R3"] = 4,
        }, "WHITE");

        var winner = VayBatRules.CheckWinner(state, adj);

        Assert.Equal("RED", winner);
    }

    [Fact]
    public void CheckWinner_RedTurnsExhaustedAndWhiteNotTrapped_WhiteWins()
    {
        var map = StarMap();
        var adj = VayBatRules.BuildAdjacency(map);
        // White ở tâm còn 1 nhánh trống (node 4) -> chưa bị vây, nhưng Red đã hết lượt.
        var state = MakeState(map, new()
        {
            ["W0"] = 0,
            ["R0"] = 1,
            ["R1"] = 2,
            ["R2"] = 3,
        }, "WHITE", redTurnsUsed: map.MaxRedTurns);

        var winner = VayBatRules.CheckWinner(state, adj);

        Assert.Equal("WHITE", winner);
    }

    [Fact]
    public void CheckWinner_RedHasNoLegalMoves_WhiteWinsByStalemate()
    {
        var map = StarMap();
        var adj = VayBatRules.BuildAdjacency(map);
        // Lượt Đỏ nhưng mọi quân Đỏ đều đã bị khoá (láng giềng duy nhất — node 0 — bị White chiếm).
        var state = MakeState(map, new() { ["W0"] = 0, ["R0"] = 1 }, "RED");

        var winner = VayBatRules.CheckWinner(state, adj);

        Assert.Equal("WHITE", winner);
    }

    [Fact]
    public void CheckWinner_GameStillOpen_ReturnsNull()
    {
        var map = StarMap();
        var adj = VayBatRules.BuildAdjacency(map);
        var state = MakeState(map, new() { ["W0"] = 0, ["R0"] = 1, ["R1"] = 2 }, "WHITE");

        Assert.Null(VayBatRules.CheckWinner(state, adj));
    }

    [Fact]
    public void CreateState_ExplicitRedPositions_UsesGivenPositionsInSeatOrder()
    {
        var map = StarMap();

        var state = VayBatRules.CreateState(map, randomRed: false, prevRed: new List<int> { 4, 3, 2, 1 });

        Assert.Equal(4, state.Pieces["R0"]);
        Assert.Equal(3, state.Pieces["R1"]);
        Assert.Equal(2, state.Pieces["R2"]);
        Assert.Equal(1, state.Pieces["R3"]);
        Assert.Equal(0, state.Pieces["W0"]);
        Assert.Equal("RED", state.Turn);
        Assert.Equal(0, state.RedTurnsUsed);
        Assert.Null(state.Winner);
    }

    [Fact]
    public void CreateState_RandomRed_NeverPlacesOnWhiteStartAndFillsRedCount()
    {
        var map = StarMap();

        var state = VayBatRules.CreateState(map, randomRed: true);

        var redPositions = state.Pieces.Where(kv => VayBatRules.Side(kv.Key) == "RED").Select(kv => kv.Value).ToList();
        Assert.Equal(map.RedCount, redPositions.Count);
        Assert.DoesNotContain(map.WhiteStart, redPositions);
        Assert.Equal(redPositions.Count, redPositions.Distinct().Count()); // không trùng ô
    }

    [Fact]
    public void CreateState_RedStartCandidatesTooFew_Throws()
    {
        var map = StarMap();
        map.RedStartCandidates = new() { 1 }; // cần 4 nhưng chỉ có 1 ứng viên

        Assert.Throws<InvalidOperationException>(() => VayBatRules.CreateState(map, randomRed: true));
    }
}
