namespace BoardGame.Api.Games.MeoNo;

// Toàn bộ kiểu dữ liệu THUẦN của Mèo Nổ (Exploding Kittens).
// Khớp với frontend games/meono/types.ts — đổi enum/field phải cập nhật cả hai.

public enum CardKind
{
    ExplodingKitten, Defuse,
    Skip, Attack, SeeFuture, Shuffle, Favor, Nope,
    Tacocat, BeardCat, HairyPotatoCat, RainbowRalphingCat, Cattermelon,
}

public enum GamePhase
{
    WaitingForPlayers,  // Chưa đủ người
    Action,             // Lượt của CurrentPlayer — đánh bài hoặc rút
    AwaitingNope,       // Bài vừa được đánh — các player khác có thể Nope hoặc Pass
    AwaitingFavor,      // Nhờ Vả đang chờ target cho bài
    AwaitingDefuse,     // CurrentPlayer rút phải Mèo Nổ — phải Khuếch Tán hoặc bị loại
    Finished,
}

public record Card(string Id, CardKind Kind);

public class MeoNoPlayerState
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int SeatIndex { get; set; }
    public List<Card> Hand { get; set; } = new();
    public bool Alive { get; set; } = true;
}

/// <summary>Hành động đang chờ giải quyết — dùng trong AwaitingNope và AwaitingFavor.</summary>
public class PendingAction
{
    public string ActingPlayerId { get; set; } = "";
    /// <summary>"PLAY_CARD" | "PLAY_COMBO" | "DREW_KITTEN"</summary>
    public string Type { get; set; } = "";
    public CardKind ActionKind { get; set; }
    /// <summary>ID lá bài đã đánh (hoặc id Mèo Nổ vừa rút).</summary>
    public List<string> PlayedCardIds { get; set; } = new();
    public string? TargetPlayerId { get; set; }
    /// <summary>Loại bài yêu cầu trong combo 3 lá mèo.</summary>
    public string? RequestedKind { get; set; }
    /// <summary>Những player chưa trả lời trong AwaitingNope.</summary>
    public List<string> NopePendingReplies { get; set; } = new();
    public bool Noped { get; set; } = false;
}

/// <summary>3 lá trên cùng của bộ bài — chỉ trả về cho người chơi SeeFuture.</summary>
public class SeeFuturePeek
{
    public string ForPlayerId { get; set; } = "";
    public List<Card> Cards { get; set; } = new();
}

public class MeoNoGameState
{
    public GamePhase Phase { get; set; } = GamePhase.WaitingForPlayers;
    public List<MeoNoPlayerState> Players { get; set; } = new();
    public string? CurrentPlayerId { get; set; }
    /// <summary>Số lượt rút còn lại của CurrentPlayer (Attack stacking).</summary>
    public int TurnsLeft { get; set; } = 1;
    public List<Card> Deck { get; set; } = new();
    public List<Card> DiscardPile { get; set; } = new();
    public PendingAction? PendingAction { get; set; }
    public string? Winner { get; set; }
    public List<string> GameLog { get; set; } = new();
    /// <summary>Peek SeeFuture — null ngoài lúc vừa giải quyết, cleared sau move tiếp theo.</summary>
    public SeeFuturePeek? SeeFuturePeek { get; set; }
}

public class MeoNoMove
{
    public string Type { get; set; } = "";
    public string? CardId { get; set; }
    public List<string>? ComboCardIds { get; set; }
    public string? TargetPlayerId { get; set; }
    public string? RequestedKind { get; set; }
    public int? InsertPosition { get; set; }
}

// ─── Viewer payloads (sau khi RedactStateForViewer) ──────────────────────────

public class MeoNoPublicPlayer
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int SeatIndex { get; set; }
    public int CardCount { get; set; }
    public bool Alive { get; set; }
    public bool IsCurrentPlayer { get; set; }
}

public class MeoNoPendingActionView
{
    public string ActingPlayerId { get; set; } = "";
    public string Type { get; set; } = "";
    public string ActionKindName { get; set; } = "";
    public string? TargetPlayerId { get; set; }
    public List<string> NopePendingReplies { get; set; } = new();
    public bool Noped { get; set; }
}

public class MeoNoViewerState
{
    public GamePhase Phase { get; set; }
    public List<MeoNoPublicPlayer> Players { get; set; } = new();
    public string? CurrentPlayerId { get; set; }
    public int TurnsLeft { get; set; }
    public int DeckCount { get; set; }
    public List<Card> DiscardPile { get; set; } = new();
    public MeoNoPendingActionView? PendingAction { get; set; }
    public string? Winner { get; set; }
    public List<string> GameLog { get; set; } = new();
    public List<Card> YourHand { get; set; } = new();
    /// <summary>Top 3 cards — chỉ non-null khi bạn vừa đánh SeeFuture và effect chưa bị clear.</summary>
    public List<Card>? SeeFutureTop3 { get; set; }
}
