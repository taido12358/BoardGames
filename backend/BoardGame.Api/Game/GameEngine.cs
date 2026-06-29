namespace BoardGame.Api.Game;

/// <summary>
/// Rule Engine THUẦN của Game 001 — Vây bắt trên đồ thị.
/// Chạy phía server (authoritative): client chỉ gửi ý định di chuyển,
/// server validate &amp; áp dụng ở đây. Đây là bản port C# của engine JS.
/// </summary>
public static class GameEngine
{
    public static string Side(string pieceId) => pieceId[0] == 'R' ? "RED" : "WHITE";

    /// <summary>Dựng bảng kề từ danh sách cạnh phi hướng.</summary>
    public static Dictionary<int, HashSet<int>> BuildAdjacency(MapDefinition map)
    {
        var adj = map.Nodes.ToDictionary(n => n.Id, _ => new HashSet<int>());
        foreach (var e in map.Edges)
        {
            int a = e[0], b = e[1];
            if (!adj.ContainsKey(a) || !adj.ContainsKey(b))
                throw new InvalidOperationException($"Cạnh [{a},{b}] tham chiếu đỉnh không tồn tại");
            adj[a].Add(b);
            adj[b].Add(a);
        }
        return adj;
    }

    /// <summary>Map nodeId -> pieceId đang chiếm giữ.</summary>
    public static Dictionary<int, string> Occupancy(GameState s)
    {
        var occ = new Dictionary<int, string>();
        foreach (var kv in s.Pieces) occ[kv.Value] = kv.Key;
        return occ;
    }

    /// <summary>Các đỉnh đi được của một quân: kề trực tiếp và còn trống.</summary>
    public static List<int> LegalMoves(GameState s, Dictionary<int, HashSet<int>> adj, string pieceId)
    {
        var occ = Occupancy(s);
        var from = s.Pieces[pieceId];
        return adj[from].Where(nb => !occ.ContainsKey(nb)).ToList();
    }

    /// <summary>Tất cả nước đi của một phe.</summary>
    public static List<(string PieceId, int To)> AllMoves(GameState s, Dictionary<int, HashSet<int>> adj, string side)
    {
        var outp = new List<(string, int)>();
        foreach (var pid in s.Pieces.Keys)
        {
            if (Side(pid) != side) continue;
            foreach (var to in LegalMoves(s, adj, pid)) outp.Add((pid, to));
        }
        return outp;
    }

    /// <summary>
    /// (2) VALID MOVE CHECKER: hợp lệ khi game chưa kết thúc, đúng lượt của phe
    /// sở hữu quân, đỉnh đích kề trực tiếp và còn trống (không nhảy cóc/ăn quân).
    /// </summary>
    public static bool ValidMove(GameState s, Dictionary<int, HashSet<int>> adj, string pieceId, int toNode)
    {
        if (s.Winner != null) return false;
        if (!s.Pieces.ContainsKey(pieceId)) return false;
        if (Side(pieceId) != s.Turn) return false;
        var from = s.Pieces[pieceId];
        if (!adj[from].Contains(toNode)) return false;
        if (Occupancy(s).ContainsKey(toNode)) return false;
        return true;
    }

    /// <summary>Áp dụng nước đi (giả định đã ValidMove). Cập nhật lượt + winner.</summary>
    public static void ApplyMove(GameState s, Dictionary<int, HashSet<int>> adj, string pieceId, int toNode)
    {
        s.Pieces[pieceId] = toNode;
        if (s.Turn == "RED") { s.RedTurnsUsed++; s.Turn = "WHITE"; }
        else { s.Turn = "RED"; }
        s.Winner = CheckWinner(s, adj);
    }

    public static bool IsWhiteTrapped(GameState s, Dictionary<int, HashSet<int>> adj)
        => AllMoves(s, adj, "WHITE").Count == 0;

    /// <summary>
    /// (3) WIN/LOSS CHECKER.
    /// ĐỎ thắng: vây bắt được Trắng (Trắng hết nước đi).
    /// TRẮNG thắng: sống sót qua đủ X lượt Đỏ, hoặc Đỏ rơi vào stalemate.
    /// </summary>
    public static string? CheckWinner(GameState s, Dictionary<int, HashSet<int>> adj)
    {
        if (s.Turn == "WHITE")
        {
            if (IsWhiteTrapped(s, adj)) return "RED";
            if (s.RedTurnsUsed >= s.MaxRedTurns) return "WHITE";
            return null;
        }
        if (AllMoves(s, adj, "RED").Count == 0) return "WHITE";
        return null;
    }

    /// <summary>Tạo state ban đầu; randomRed=true để random vị trí Đỏ.</summary>
    public static GameState CreateState(MapDefinition map, bool randomRed = true, List<int>? prevRed = null)
    {
        BuildAdjacency(map); // validate cấu trúc map sớm
        var pieces = new Dictionary<string, int>();
        for (int i = 0; i < map.WhiteCount; i++) pieces[$"W{i}"] = map.WhiteStart;

        List<int> redNodes;
        if (!randomRed && prevRed != null)
        {
            redNodes = prevRed.ToList();
        }
        else
        {
            var pool = map.RedStartCandidates.Where(id => id != map.WhiteStart).ToList();
            if (pool.Count < map.RedCount)
                throw new InvalidOperationException("redStartCandidates không đủ chỗ cho redCount");
            redNodes = new List<int>();
            for (int i = 0; i < map.RedCount; i++)
            {
                int k = Random.Shared.Next(pool.Count);
                redNodes.Add(pool[k]);
                pool.RemoveAt(k);
            }
        }
        for (int i = 0; i < redNodes.Count; i++) pieces[$"R{i}"] = redNodes[i];

        return new GameState
        {
            Pieces = pieces,
            Turn = "RED",
            RedTurnsUsed = 0,
            MaxRedTurns = map.MaxRedTurns,
            Winner = null,
            RedStartPos = redNodes,
        };
    }

    /// <summary>Bản đồ mặc định (đồng bộ với bản demo HTML).</summary>
    public static MapDefinition DefaultMap() => new()
    {
        Nodes = new()
        {
            new(0, 200, 40),
            new(1, 100, 120), new(2, 200, 120), new(3, 300, 120),
            new(4, 100, 220), new(5, 200, 220), new(6, 300, 220),
            new(7, 100, 320), new(8, 200, 320), new(9, 300, 320),
            new(10, 200, 400),
        },
        Edges = new()
        {
            new(){0,2}, new(){2,5}, new(){5,8}, new(){8,10},
            new(){1,2}, new(){2,3}, new(){4,5}, new(){5,6}, new(){7,8}, new(){8,9},
            new(){1,4}, new(){4,7}, new(){3,6}, new(){6,9},
            new(){0,1}, new(){0,3}, new(){10,7}, new(){10,9},
            new(){1,5}, new(){3,5}, new(){5,7}, new(){5,9},
        },
        RedCount = 3,
        WhiteCount = 1,
        WhiteStart = 5,
        RedStartCandidates = new() { 0, 1, 3, 7, 9, 10 },
        MaxRedTurns = 15,
    };
}
