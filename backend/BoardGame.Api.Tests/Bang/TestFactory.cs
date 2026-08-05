using BoardGame.Api.Games.Bang;

namespace BoardGame.Api.Tests.Bang;

/// <summary>Helper dựng BangGameState có kiểm soát để test luật độc lập với StartGame/RNG.</summary>
internal static class TestFactory
{
    public static BangGameState MakeState(int playerCount, RoleKind[]? roles = null, CharacterKind[]? characters = null)
    {
        var state = new BangGameState { Phase = GamePhase.Action, TurnNumber = 1, Deck = BangCards.BuildFullDeck() };
        for (var i = 0; i < playerCount; i++)
        {
            var role = roles is not null && i < roles.Length ? roles[i] : (i == 0 ? RoleKind.Sheriff : RoleKind.Outlaw);
            // Mặc định Jesse — khả năng của Jesse (miễn nhiễm Hoảng loạn!/Cat Balou lên vũ khí)
            // không ảnh hưởng khoảng cách/tầm bắn, nên các test không khai báo characters
            // vẫn có hành vi "trung tính" (không vô tình cộng thêm tầm như Wyatt).
            var character = characters is not null && i < characters.Length ? characters[i] : CharacterKind.Jesse;
            state.Players.Add(new BangPlayerState
            {
                Id = $"P{i}",
                Name = $"Player{i}",
                SeatIndex = i,
                Character = character,
                Role = role,
                Hp = 4,
                MaxHp = 4,
            });
        }
        state.CurrentPlayerId = "P0";
        return state;
    }

    public static Card Card(CardKind kind, string suit = "♠", string rank = "5") => new($"{kind}-{Guid.NewGuid():N}", kind, suit, rank);

    public static BangMove Play(string cardId, string? targetId = null) => new("PLAY_CARD", cardId, targetId, null);
    public static BangMove Respond(string? cardId) => new("RESPOND", cardId, null, null);
    public static readonly BangMove EndTurn = new("END_TURN", null, null, null);
}
