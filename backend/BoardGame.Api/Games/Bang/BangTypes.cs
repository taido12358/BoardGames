namespace BoardGame.Api.Games.Bang;

// Toàn bộ kiểu dữ liệu THUẦN của game BANG! — không phụ thuộc hạ tầng (DB/Redis/hub).
// Class/thuộc tính đặt tên tiếng Anh (theo quy ước code chung của dự án); text hiển thị
// cho người chơi (tên bài, mô tả, log) là tiếng Việt — xem BangCards.cs/BangCharacters.cs.

public enum CardType { Attack, Defense, Heal, Weapon, Equipment, Action }

public enum CardKind
{
    Bang, Missed, Beer, Gatling, Duel, Panic, CatBalou, Stagecoach, WellsFargo, Indians,
    Volcanic, Schofield, Remington, Mustang, Barrel,
}

/// <summary>Định nghĩa TĨNH của một loại bài (catalog) — xem BangCards.Catalog.</summary>
public record CardDef(CardKind Kind, CardType Type, string Name, string Description);

/// <summary>Một lá bài CỤ THỂ trong bộ. Suit/Rank chỉ để hiển thị + luật Thùng rượu (kiểm tra ♥).</summary>
public record Card(string Id, CardKind Kind, string Suit, string Rank);

public enum RoleKind { Sheriff, Deputy, Outlaw, Renegade }

public enum CharacterKind { Wyatt, Calamity, Billy, Jesse, Doc, Jack, Rose, Morgan }

/// <summary>Định nghĩa TĨNH của một nhân vật — xem BangCharacters.Catalog.</summary>
public record CharacterDef(CharacterKind Kind, string Name, int BaseMaxHp, string AbilityName, string AbilityDescription);

public enum GamePhase
{
    WaitingForPlayers,  // chưa đủ ghế — engine chưa chia bài
    Action,             // lượt chính của CurrentPlayerId — chơi bài / kết thúc lượt
    AwaitingResponse,   // đang chờ (các) người trong PendingResponse.TargetIds phản hồi
    Finished,
}

public enum PendingResponseKind { Bang, Duel, Indians, Gatling }

/// <summary>
/// Một yêu cầu phản hồi đang treo. Chỉ người có id nằm trong TargetIds mới được
/// gọi RESPOND lúc này — người khác (kể cả CurrentPlayerId) phải chờ.
/// </summary>
public class PendingResponse
{
    public PendingResponseKind Kind { get; set; }
    public string FromPlayerId { get; set; } = "";
    public List<string> TargetIds { get; set; } = new();   // còn phải phản hồi (Duel: đúng 1 phần tử, đổi bên mỗi vòng)
    public int Damage { get; set; } = 1;
    public string? DuelOtherId { get; set; }                // Duel: id của người còn lại trong cặp đấu súng
}

public class BangPlayerState
{
    public string Id { get; set; } = "";                    // "P0".."P{N-1}" — trùng side dùng ở GameHub
    public string Name { get; set; } = "";
    public int SeatIndex { get; set; }
    public CharacterKind Character { get; set; }
    public RoleKind Role { get; set; }
    public int Hp { get; set; }
    public int MaxHp { get; set; }
    public List<Card> Hand { get; set; } = new();
    // Vũ khí/trang bị là Card THẬT (không phải chỉ CardKind) để Hoảng loạn!/Cat Balou
    // có thể nhắm vào và lấy/bỏ chúng như bài thường — không chỉ bài trên tay.
    public Card? WeaponCard { get; set; }                   // null = Cattleman mặc định (tầm bắn 1)
    public List<Card> Equipment { get; set; } = new();      // Mustang / Thùng rượu đang gắn
    public bool Alive { get; set; } = true;
}

public class BangGameState
{
    public GamePhase Phase { get; set; } = GamePhase.WaitingForPlayers;
    public List<BangPlayerState> Players { get; set; } = new();
    public string? CurrentPlayerId { get; set; }
    public int TurnNumber { get; set; }
    public List<Card> Deck { get; set; } = new();
    public List<Card> DiscardPile { get; set; } = new();
    public PendingResponse? PendingResponse { get; set; }
    public string? Winner { get; set; }                      // "Sheriff" | "Outlaw" | "Renegade" | null
    public List<string> GameLog { get; set; } = new();
    public bool BangPlayedThisTurn { get; set; }              // true sau lá Bang! đầu tiên trong lượt (trừ khi có Volcanic)
}

/// <summary>
/// "Map" của Bang không mang ý nghĩa hình học như Vây Bắt — chỉ mang bảng tra cứu
/// tĩnh mà frontend cần để hiển thị mà không phải hard-code lại luật (tầm vũ khí,
/// cơ cấu vai trò theo số người chơi).
/// </summary>
public record BangMap(Dictionary<string, int> WeaponRanges, Dictionary<int, int[]> RoleDistribution);

/// <summary>Payload nước đi gửi lên hub. Type: "PLAY_CARD" | "RESPOND" | "END_TURN".</summary>
public record BangMove(string Type, string? CardId, string? TargetPlayerId, List<string>? DiscardCardIds);

// --- Projection RIÊNG cho từng người xem (IGameEngine.RedactStateForViewer) ---
// Không bao giờ chứa bài/vai trò của người khác — xem BangRules.BuildViewerPayload.

public record BangPublicPlayer(
    string Id, string Name, int SeatIndex, string Character, string AbilityName,
    string PublicRole, int Hp, int MaxHp, int CardCount,
    string Weapon, int WeaponRange, List<string> Equipment, bool Alive,
    int? Distance, bool? InRange);

/// <summary>Chỉ có mặt trong payload gửi cho ĐÚNG người chơi đó — không ai khác nhận được field này.</summary>
public record BangYourView(string Id, string Role, string RoleDisplay, List<Card> Hand, string Weapon, int WeaponRange);

public record PendingResponseView(string Kind, string FromPlayerId, List<string> TargetIds, bool ItsYourTurn);

public record BangViewerState(
    string Phase, List<BangPublicPlayer> Players, string? CurrentPlayerId, int TurnNumber,
    int DeckCount, List<Card> DiscardPile, PendingResponseView? PendingResponse,
    string? Winner, List<string> GameLog, BangYourView? You);
