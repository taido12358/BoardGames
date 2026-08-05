namespace BoardGame.Api.Games.Bang;

/// <summary>
/// Luật THUẦN của BANG! (không phụ thuộc hạ tầng — DB/Redis/hub). Toàn bộ khả năng
/// nhân vật được áp dụng ở ĐÂY, không phải ở React (theo yêu cầu §12 của spec).
///
/// Đơn giản hoá có chủ đích so với luật gốc (ghi lại để không ai tưởng nhầm là bug):
///  - Bia vẫn hồi máu được kể cả khi chỉ còn 2 người sống (bản gốc: vô hiệu lúc đó).
///  - Hoảng loạn!/Cat Balou chỉ nhắm bài trên tay + vũ khí + trang bị (không có thêm
///    loại "bài úp" nào khác vì bộ bài đã lược bớt Dynamite/Jail/Scope/Saloon).
///  - Súng Gatling dùng chung giới hạn "1 phát súng chính/lượt" với Bang! (trừ Volcanic).
/// </summary>
public static class BangRules
{
    // ===================== KHOẢNG CÁCH & TẦM BẮN =====================

    /// <summary>
    /// Khoảng cách quanh bàn tròn, chỉ tính người CÒN SỐNG (người bị loại bỏ qua khi đếm
    /// ghế). Cộng thêm hiệu ứng Mustang/khả năng né đòn của Morgan lên khoảng cách người
    /// khác NHÌN THẤY mục tiêu (bất đối xứng — không cộng ngược lại chiều kia).
    /// </summary>
    public static int CalculateDistance(BangGameState state, string fromId, string toId)
    {
        var alive = state.Players.Where(p => p.Alive).OrderBy(p => p.SeatIndex).ToList();
        var fromIdx = alive.FindIndex(p => p.Id == fromId);
        var toIdx = alive.FindIndex(p => p.Id == toId);
        if (fromIdx < 0 || toIdx < 0 || fromIdx == toIdx) return int.MaxValue;

        var n = alive.Count;
        var clockwise = ((toIdx - fromIdx) % n + n) % n;
        var baseDist = Math.Min(clockwise, n - clockwise);

        var target = alive[toIdx];
        var bonus = 0;
        if (target.Equipment.Any(c => c.Kind == CardKind.Mustang)) bonus++;
        if (target.Character == CharacterKind.Morgan) bonus++;
        return baseDist + bonus;
    }

    private static int EffectiveWeaponRange(BangPlayerState p)
    {
        var range = BangCards.WeaponRange(p.WeaponCard?.Kind);
        if (p.Character == CharacterKind.Wyatt) range++;
        return range;
    }

    /// <summary>Billy: Bang! không giới hạn khoảng cách — bỏ qua kiểm tra tầm hoàn toàn.</summary>
    public static bool InRange(BangGameState state, string attackerId, string targetId)
    {
        var attacker = GetPlayer(state, attackerId);
        if (attacker is null) return false;
        if (attacker.Character == CharacterKind.Billy) return true;
        return CalculateDistance(state, attackerId, targetId) <= EffectiveWeaponRange(attacker);
    }

    // ===================== KHỞI ĐỘNG VÁN =====================

    /// <summary>
    /// Chia vai trò/nhân vật/bài cho đúng seatNames.Count người chơi (4-8). Gọi DUY NHẤT
    /// một lần khi phòng đủ ghế (xem GameHub — nước đi hệ thống side="SYSTEM").
    /// </summary>
    public static BangGameState StartGame(IReadOnlyList<string> seatNames, Random rng)
    {
        var seatCount = seatNames.Count;
        var roles = BangRoles.AssignRoles(seatCount, rng);
        var characters = BangCharacters.AssignCharacters(seatCount, rng);

        var state = new BangGameState { Deck = BangCards.BuildFullDeck(), Phase = GamePhase.Action, TurnNumber = 1 };
        BangCards.Shuffle(state.Deck, rng);

        for (var i = 0; i < seatCount; i++)
        {
            var charDef = BangCharacters.Get(characters[i]);
            var maxHp = charDef.BaseMaxHp + (roles[i] == RoleKind.Sheriff ? 1 : 0);
            var player = new BangPlayerState
            {
                Id = $"P{i}",
                Name = seatNames[i],
                SeatIndex = i,
                Character = characters[i],
                Role = roles[i],
                Hp = maxHp,
                MaxHp = maxHp,
            };
            player.Hand.AddRange(BangDeck.DrawMany(state, rng, maxHp)); // bài khởi đầu = số HP
            state.Players.Add(player);
        }

        var sheriff = state.Players.First(p => p.Role == RoleKind.Sheriff);
        state.CurrentPlayerId = sheriff.Id;
        state.GameLog.Add($"Bắt đầu ván {seatCount} người chơi. {sheriff.Name} là {RoleDisplay(RoleKind.Sheriff)} và đi trước.");
        ApplyStartOfTurnDraw(state, sheriff, rng);
        return state;
    }

    private static void ApplyStartOfTurnDraw(BangGameState state, BangPlayerState player, Random rng)
    {
        var drawCount = player.Character == CharacterKind.Jack ? 3 : 2;
        var drawn = BangDeck.DrawMany(state, rng, drawCount);
        player.Hand.AddRange(drawn);

        if (player.Character == CharacterKind.Rose && player.Hp * 2 <= player.MaxHp)
        {
            var bonus = BangDeck.DrawOne(state, rng);
            if (bonus is not null) { player.Hand.Add(bonus); drawn.Add(bonus); }
        }

        state.BangPlayedThisTurn = false;
        state.GameLog.Add($"{player.Name} rút {drawn.Count} lá đầu lượt.");
    }

    // ===================== ĐIỀU PHỐI NƯỚC ĐI =====================

    public static (bool Ok, string? Error, string? Winner) HandleMove(BangGameState state, string side, BangMove move, Random rng)
    {
        if (state.Phase == GamePhase.Finished) return (false, "Ván đã kết thúc.", null);

        var actor = GetPlayer(state, side);
        if (actor is not null && !actor.Alive) return (false, "Bạn đã bị loại khỏi trận đấu.", null);

        return move.Type switch
        {
            "PLAY_CARD" => HandlePlayCard(state, side, move, rng),
            "RESPOND" => HandleRespond(state, side, move, rng),
            "END_TURN" => HandleEndTurn(state, side, move, rng),
            _ => (false, $"Loại nước đi không hợp lệ: '{move.Type}'.", null),
        };
    }

    private static (bool, string?, string?) HandlePlayCard(BangGameState state, string side, BangMove move, Random rng)
    {
        if (state.Phase != GamePhase.Action) return (false, "Không phải giai đoạn hành động chính.", null);
        if (state.CurrentPlayerId != side) return (false, "Không phải lượt của bạn.", null);

        var player = GetPlayer(state, side);
        if (player is null) return (false, "Bạn không phải người chơi trong ván.", null);
        if (string.IsNullOrEmpty(move.CardId)) return (false, "Thiếu cardId.", null);
        var card = player.Hand.FirstOrDefault(c => c.Id == move.CardId);
        if (card is null) return (false, "Bạn không có lá bài này.", null);

        return card.Kind switch
        {
            CardKind.Bang => PlayBang(state, player, card, move.TargetPlayerId, rng),
            // Calamity: dùng Trượt! như Bang! khi tấn công.
            CardKind.Missed when player.Character == CharacterKind.Calamity => PlayBang(state, player, card, move.TargetPlayerId, rng),
            CardKind.Missed => (false, "Trượt! chỉ dùng được khi đang phản hồi.", null),
            CardKind.Beer => PlayBeer(state, player, card),
            CardKind.Gatling => PlayGatling(state, player, card, rng),
            CardKind.Duel => PlayDuel(state, player, card, move.TargetPlayerId),
            CardKind.Panic => PlayPanic(state, player, card, move.TargetPlayerId, rng),
            CardKind.CatBalou => PlayCatBalou(state, player, card, move.TargetPlayerId, rng),
            CardKind.Stagecoach => PlayDrawCards(state, player, card, 2, rng),
            CardKind.WellsFargo => PlayDrawCards(state, player, card, 3, rng),
            CardKind.Indians => PlayIndians(state, player, card),
            CardKind.Volcanic or CardKind.Schofield or CardKind.Remington => PlayWeapon(state, player, card),
            CardKind.Mustang or CardKind.Barrel => PlayEquipment(state, player, card),
            _ => (false, "Loại bài không xử lý được.", null),
        };
    }

    private static (bool, string?, string?) HandleRespond(BangGameState state, string side, BangMove move, Random rng)
    {
        if (state.Phase != GamePhase.AwaitingResponse || state.PendingResponse is null)
            return (false, "Không có gì đang chờ phản hồi.", null);
        var pr = state.PendingResponse;
        if (!pr.TargetIds.Contains(side)) return (false, "Không phải lượt phản hồi của bạn.", null);

        var player = GetPlayer(state, side)!;
        Card? card = null;
        if (!string.IsNullOrEmpty(move.CardId))
        {
            card = player.Hand.FirstOrDefault(c => c.Id == move.CardId);
            if (card is null) return (false, "Bạn không có lá bài này.", null);
        }

        return pr.Kind switch
        {
            PendingResponseKind.Bang or PendingResponseKind.Gatling => ResolveMissedStyleResponse(state, player, pr, card, rng),
            PendingResponseKind.Duel => ResolveDuelResponse(state, player, pr, card, rng),
            PendingResponseKind.Indians => ResolveIndiansResponse(state, player, pr, card, rng),
            _ => (false, "Không xử lý được loại phản hồi.", null),
        };
    }

    private static (bool, string?, string?) HandleEndTurn(BangGameState state, string side, BangMove move, Random rng)
    {
        if (state.Phase != GamePhase.Action) return (false, "Không thể kết thúc lượt lúc này (đang chờ phản hồi).", null);
        if (state.CurrentPlayerId != side) return (false, "Không phải lượt của bạn.", null);
        var player = GetPlayer(state, side)!;

        var overflow = player.Hand.Count - player.Hp;
        if (overflow > 0)
        {
            List<Card> toDiscard;
            if (move.DiscardCardIds is { Count: > 0 })
            {
                var chosen = player.Hand.Where(c => move.DiscardCardIds.Contains(c.Id)).ToList();
                if (chosen.Count != overflow)
                    return (false, $"Bạn phải bỏ đúng {overflow} lá (giới hạn {player.Hp} lá trên tay).", null);
                toDiscard = chosen;
            }
            else
            {
                toDiscard = player.Hand.Take(overflow).ToList();
            }
            foreach (var c in toDiscard) MoveToDiscard(state, player, c);
            state.GameLog.Add($"{player.Name} bỏ {toDiscard.Count} lá do vượt giới hạn tay bài.");
        }

        AdvanceTurn(state, rng);
        return (true, null, null);
    }

    private static void AdvanceTurn(BangGameState state, Random rng)
    {
        var order = state.Players.OrderBy(p => p.SeatIndex).ToList();
        var currentIdx = order.FindIndex(p => p.Id == state.CurrentPlayerId);
        if (currentIdx < 0) currentIdx = 0;

        BangPlayerState? next = null;
        for (var step = 1; step <= order.Count; step++)
        {
            var candidate = order[(currentIdx + step) % order.Count];
            if (candidate.Alive) { next = candidate; break; }
        }
        if (next is null) return; // không còn ai sống — CheckVictory ở nơi gọi đã/sẽ kết thúc ván

        state.CurrentPlayerId = next.Id;
        state.TurnNumber++;
        state.GameLog.Add($"Đến lượt {next.Name}.");
        ApplyStartOfTurnDraw(state, next, rng);
    }

    // ===================== BÀI TẤN CÔNG =====================

    private static (bool, string?, string?) PlayBang(BangGameState state, BangPlayerState player, Card card, string? targetId, Random rng)
    {
        if (state.BangPlayedThisTurn && player.WeaponCard?.Kind != CardKind.Volcanic)
            return (false, "Bạn chỉ được đánh 1 phát súng chính mỗi lượt (trừ khi có Volcanic).", null);
        if (string.IsNullOrEmpty(targetId)) return (false, "Thiếu mục tiêu.", null);
        var target = GetPlayer(state, targetId);
        if (target is null || !target.Alive) return (false, "Mục tiêu không hợp lệ.", null);
        if (target.Id == player.Id) return (false, "Không thể tự bắn chính mình.", null);
        if (!InRange(state, player.Id, target.Id)) return (false, "Mục tiêu nằm ngoài tầm bắn.", null);

        MoveToDiscard(state, player, card);
        state.BangPlayedThisTurn = true;
        state.GameLog.Add($"{player.Name} sử dụng Bang! lên {target.Name}.");

        BeginPendingResponse(state, PendingResponseKind.Bang, player.Id, new List<string> { target.Id }, damage: 1);
        return (true, null, null);
    }

    private static (bool, string?, string?) PlayGatling(BangGameState state, BangPlayerState player, Card card, Random rng)
    {
        if (state.BangPlayedThisTurn && player.WeaponCard?.Kind != CardKind.Volcanic)
            return (false, "Bạn chỉ được đánh 1 phát súng chính mỗi lượt (trừ khi có Volcanic).", null);
        var others = state.Players.Where(p => p.Alive && p.Id != player.Id).Select(p => p.Id).ToList();
        if (others.Count == 0) return (false, "Không có mục tiêu.", null);

        MoveToDiscard(state, player, card);
        state.BangPlayedThisTurn = true;
        state.GameLog.Add($"{player.Name} sử dụng Súng Gatling — tấn công tất cả người chơi khác!");
        BeginPendingResponse(state, PendingResponseKind.Gatling, player.Id, others, damage: 1);
        return (true, null, null);
    }

    private static (bool, string?, string?) PlayDuel(BangGameState state, BangPlayerState player, Card card, string? targetId)
    {
        if (string.IsNullOrEmpty(targetId)) return (false, "Thiếu mục tiêu.", null);
        var target = GetPlayer(state, targetId);
        if (target is null || !target.Alive || target.Id == player.Id) return (false, "Mục tiêu không hợp lệ.", null);

        MoveToDiscard(state, player, card);
        state.GameLog.Add($"{player.Name} thách {target.Name} đấu súng.");
        BeginPendingResponse(state, PendingResponseKind.Duel, player.Id, new List<string> { target.Id }, damage: 1, duelOtherId: player.Id);
        return (true, null, null);
    }

    private static (bool, string?, string?) PlayIndians(BangGameState state, BangPlayerState player, Card card)
    {
        var others = state.Players.Where(p => p.Alive && p.Id != player.Id).Select(p => p.Id).ToList();
        if (others.Count == 0) return (false, "Không có mục tiêu.", null);

        MoveToDiscard(state, player, card);
        state.GameLog.Add($"{player.Name} sử dụng Người da đỏ!.");
        BeginPendingResponse(state, PendingResponseKind.Indians, player.Id, others, damage: 1);
        return (true, null, null);
    }

    private static void BeginPendingResponse(BangGameState state, PendingResponseKind kind, string fromId,
        List<string> targetIds, int damage, string? duelOtherId = null)
    {
        state.Phase = GamePhase.AwaitingResponse;
        state.PendingResponse = new PendingResponse { Kind = kind, FromPlayerId = fromId, TargetIds = targetIds, Damage = damage, DuelOtherId = duelOtherId };
    }

    private static void EndPendingResponse(BangGameState state)
    {
        state.PendingResponse = null;
        state.Phase = GamePhase.Action;
    }

    // ===================== PHẢN HỒI =====================

    /// <summary>Dùng chung cho Bang! và Gatling: Trượt! (hoặc Bang! của Calamity), rồi Thùng rượu tự kiểm tra, rồi mất máu.</summary>
    private static (bool, string?, string?) ResolveMissedStyleResponse(BangGameState state, BangPlayerState player, PendingResponse pr, Card? card, Random rng)
    {
        var defended = false;
        if (card is not null)
        {
            var isValidDefense = card.Kind == CardKind.Missed || (player.Character == CharacterKind.Calamity && card.Kind == CardKind.Bang);
            if (!isValidDefense) return (false, "Lá bài này không đỡ được Bang!.", null);
            MoveToDiscard(state, player, card);
            defended = true;
            state.GameLog.Add($"{player.Name} sử dụng Trượt!.");
        }
        else if (player.Equipment.Any(c => c.Kind == CardKind.Barrel))
        {
            var drawn = BangDeck.DrawOne(state, rng);
            if (drawn is not null)
            {
                state.DiscardPile.Add(drawn);
                state.GameLog.Add($"{player.Name} kiểm tra Thùng rượu: rút được {drawn.Rank}{drawn.Suit}.");
                if (drawn.Suit == "♥") { defended = true; state.GameLog.Add($"{player.Name} đỡ được nhờ Thùng rượu!"); }
            }
        }

        if (!defended) ApplyDamage(state, player, pr.Damage, pr.FromPlayerId, rng);

        pr.TargetIds.Remove(player.Id);
        if (pr.TargetIds.Count == 0) EndPendingResponse(state);

        return CheckVictoryAndContinue(state, rng);
    }

    private static (bool, string?, string?) ResolveDuelResponse(BangGameState state, BangPlayerState player, PendingResponse pr, Card? card, Random rng)
    {
        var isBangLike = card is not null &&
            (card.Kind == CardKind.Bang || (player.Character == CharacterKind.Calamity && card.Kind == CardKind.Missed));

        if (isBangLike)
        {
            MoveToDiscard(state, player, card!);
            state.GameLog.Add($"{player.Name} đáp trả bằng Bang! trong đấu súng.");
            var other = pr.DuelOtherId!;
            pr.TargetIds = new List<string> { other };
            pr.DuelOtherId = player.Id;
            return (true, null, null); // vòng đấu tiếp tục
        }

        ApplyDamage(state, player, pr.Damage, pr.DuelOtherId, rng);
        state.GameLog.Add($"{player.Name} thua đấu súng.");
        EndPendingResponse(state);
        return CheckVictoryAndContinue(state, rng);
    }

    private static (bool, string?, string?) ResolveIndiansResponse(BangGameState state, BangPlayerState player, PendingResponse pr, Card? card, Random rng)
    {
        if (card is not null)
        {
            if (card.Kind != CardKind.Bang) return (false, "Chỉ có thể bỏ lá Bang! để né Người da đỏ!.", null);
            MoveToDiscard(state, player, card);
            state.GameLog.Add($"{player.Name} bỏ Bang! để né Người da đỏ!.");
        }
        else
        {
            ApplyDamage(state, player, pr.Damage, pr.FromPlayerId, rng);
        }

        pr.TargetIds.Remove(player.Id);
        if (pr.TargetIds.Count == 0) EndPendingResponse(state);

        return CheckVictoryAndContinue(state, rng);
    }

    // ===================== BÀI KHÁC =====================

    private static (bool, string?, string?) PlayBeer(BangGameState state, BangPlayerState player, Card card)
    {
        if (player.Hp >= player.MaxHp) return (false, "HP đã đầy.", null);
        MoveToDiscard(state, player, card);
        var heal = player.Character == CharacterKind.Doc ? 2 : 1;
        player.Hp = Math.Min(player.MaxHp, player.Hp + heal);
        state.GameLog.Add($"{player.Name} uống Bia, hồi {heal} HP ({player.Hp}/{player.MaxHp}).");
        return (true, null, null);
    }

    private static (bool, string?, string?) PlayPanic(BangGameState state, BangPlayerState player, Card card, string? targetId, Random rng)
    {
        if (string.IsNullOrEmpty(targetId)) return (false, "Thiếu mục tiêu.", null);
        var target = GetPlayer(state, targetId);
        if (target is null || !target.Alive || target.Id == player.Id) return (false, "Mục tiêu không hợp lệ.", null);
        if (CalculateDistance(state, player.Id, target.Id) > 1) return (false, "Mục tiêu ngoài tầm Hoảng loạn! (chỉ khoảng cách ≤ 1).", null);

        MoveToDiscard(state, player, card);
        var pool = StealablePool(target);
        if (pool.Count == 0)
        {
            state.GameLog.Add($"{player.Name} dùng Hoảng loạn! lên {target.Name} nhưng họ không còn gì để lấy.");
            return (true, null, null);
        }
        var (picked, zone) = pool[rng.Next(pool.Count)];
        RemoveInPlayCard(target, picked, zone);
        player.Hand.Add(picked);
        state.GameLog.Add($"{player.Name} dùng Hoảng loạn! lấy 1 lá từ {target.Name}.");
        return (true, null, null);
    }

    private static (bool, string?, string?) PlayCatBalou(BangGameState state, BangPlayerState player, Card card, string? targetId, Random rng)
    {
        if (string.IsNullOrEmpty(targetId)) return (false, "Thiếu mục tiêu.", null);
        var target = GetPlayer(state, targetId);
        if (target is null || !target.Alive || target.Id == player.Id) return (false, "Mục tiêu không hợp lệ.", null);

        MoveToDiscard(state, player, card);
        var pool = StealablePool(target);
        if (pool.Count == 0)
        {
            state.GameLog.Add($"{player.Name} dùng Cat Balou lên {target.Name} nhưng họ không còn gì để bỏ.");
            return (true, null, null);
        }
        var (picked, zone) = pool[rng.Next(pool.Count)];
        RemoveInPlayCard(target, picked, zone);
        state.DiscardPile.Add(picked);
        state.GameLog.Add($"{player.Name} dùng Cat Balou buộc {target.Name} bỏ 1 lá.");
        return (true, null, null);
    }

    private static (bool, string?, string?) PlayDrawCards(BangGameState state, BangPlayerState player, Card card, int count, Random rng)
    {
        MoveToDiscard(state, player, card);
        var drawn = BangDeck.DrawMany(state, rng, count);
        player.Hand.AddRange(drawn);
        state.GameLog.Add($"{player.Name} rút thêm {drawn.Count} lá.");
        return (true, null, null);
    }

    private static (bool, string?, string?) PlayWeapon(BangGameState state, BangPlayerState player, Card card)
    {
        player.Hand.RemoveAll(c => c.Id == card.Id);
        if (player.WeaponCard is not null) state.DiscardPile.Add(player.WeaponCard);
        player.WeaponCard = card;
        state.GameLog.Add($"{player.Name} trang bị {BangCards.Catalog[card.Kind].Name} (tầm bắn {BangCards.WeaponRange(card.Kind)}).");
        return (true, null, null);
    }

    private static (bool, string?, string?) PlayEquipment(BangGameState state, BangPlayerState player, Card card)
    {
        player.Hand.RemoveAll(c => c.Id == card.Id);
        var existing = player.Equipment.FirstOrDefault(c => c.Kind == card.Kind);
        if (existing is not null) { player.Equipment.Remove(existing); state.DiscardPile.Add(existing); }
        player.Equipment.Add(card);
        state.GameLog.Add($"{player.Name} trang bị {BangCards.Catalog[card.Kind].Name}.");
        return (true, null, null);
    }

    // ===================== SÁT THƯƠNG / LOẠI / THẮNG THUA =====================

    private static void ApplyDamage(BangGameState state, BangPlayerState target, int amount, string? fromId, Random rng)
    {
        target.Hp = Math.Max(0, target.Hp - amount);
        state.GameLog.Add($"{target.Name} mất {amount} HP ({target.Hp}/{target.MaxHp}).");
        if (target.Hp == 0 && target.Alive) Eliminate(state, target, fromId, rng);
    }

    private static void Eliminate(BangGameState state, BangPlayerState target, string? killerId, Random rng)
    {
        target.Alive = false;
        target.Hand.Clear(); // luật đơn giản hoá: bài trên tay mất theo, không vào chồng bài bỏ
        state.GameLog.Add($"💀 {target.Name} đã bị loại ({RoleDisplay(target.Role)}).");

        var killer = killerId is null ? null : GetPlayer(state, killerId);
        if (killer is not null && killer.Alive && killer.Id != target.Id)
        {
            if (target.Role == RoleKind.Outlaw)
            {
                var bonus = BangDeck.DrawMany(state, rng, 3);
                killer.Hand.AddRange(bonus);
                state.GameLog.Add($"{killer.Name} hạ được Kẻ ngoài vòng pháp luật — rút thưởng {bonus.Count} lá.");
            }
            else if (target.Role == RoleKind.Deputy)
            {
                state.GameLog.Add($"{killer.Name} bắn nhầm Phó cảnh sát — phải bỏ hết bài trên tay.");
                state.DiscardPile.AddRange(killer.Hand);
                killer.Hand.Clear();
            }
        }

        state.PendingResponse?.TargetIds.Remove(target.Id);
    }

    private static string? CheckVictory(BangGameState state)
    {
        var alive = state.Players.Where(p => p.Alive).ToList();
        var sheriffAlive = alive.Any(p => p.Role == RoleKind.Sheriff);

        if (!sheriffAlive)
            return alive.Count == 1 && alive[0].Role == RoleKind.Renegade ? "Renegade" : "Outlaw";

        var outlawOrRenegadeAlive = alive.Any(p => p.Role is RoleKind.Outlaw or RoleKind.Renegade);
        return outlawOrRenegadeAlive ? null : "Sheriff";
    }

    private static (bool, string?, string?) CheckVictoryAndContinue(BangGameState state, Random rng)
    {
        var winner = CheckVictory(state);
        if (winner is not null)
        {
            state.Winner = winner;
            state.Phase = GamePhase.Finished;
            state.GameLog.Add($"{WinnerDisplay(winner)} chiến thắng!");
            return (true, null, winner);
        }

        // Người đang giữ lượt vừa bị loại (vd thua đấu súng) — chuyển lượt ngay, đừng kẹt ván.
        if (state.Phase == GamePhase.Action)
        {
            var current = GetPlayer(state, state.CurrentPlayerId ?? "");
            if (current is null || !current.Alive) AdvanceTurn(state, rng);
        }

        return (true, null, null);
    }

    // ===================== HELPER =====================

    private static BangPlayerState? GetPlayer(BangGameState state, string id) => state.Players.FirstOrDefault(p => p.Id == id);

    private static void MoveToDiscard(BangGameState state, BangPlayerState player, Card card)
    {
        player.Hand.RemoveAll(c => c.Id == card.Id);
        state.DiscardPile.Add(card);
    }

    private static List<(Card Card, string Zone)> AllInPlayCards(BangPlayerState p)
    {
        var list = new List<(Card, string)>();
        foreach (var c in p.Hand) list.Add((c, "hand"));
        if (p.WeaponCard is not null) list.Add((p.WeaponCard, "weapon"));
        foreach (var c in p.Equipment) list.Add((c, "equipment"));
        return list;
    }

    /// <summary>Jesse: vũ khí của Jesse miễn nhiễm Hoảng loạn!/Cat Balou.</summary>
    private static List<(Card Card, string Zone)> StealablePool(BangPlayerState target)
    {
        var pool = AllInPlayCards(target);
        return target.Character == CharacterKind.Jesse ? pool.Where(x => x.Zone != "weapon").ToList() : pool;
    }

    private static void RemoveInPlayCard(BangPlayerState p, Card card, string zone)
    {
        switch (zone)
        {
            case "hand": p.Hand.RemoveAll(c => c.Id == card.Id); break;
            case "weapon": p.WeaponCard = null; break;
            case "equipment": p.Equipment.RemoveAll(c => c.Id == card.Id); break;
        }
    }

    private static string RoleDisplay(RoleKind role) => role switch
    {
        RoleKind.Sheriff => "Cảnh sát trưởng",
        RoleKind.Deputy => "Phó cảnh sát",
        RoleKind.Outlaw => "Kẻ ngoài vòng pháp luật",
        RoleKind.Renegade => "Kẻ phản bội",
        _ => "Không rõ",
    };

    private static string WinnerDisplay(string winner) => winner switch
    {
        "Sheriff" => "Phe Cảnh sát trưởng",
        "Outlaw" => "Kẻ ngoài vòng pháp luật",
        "Renegade" => "Kẻ phản bội",
        _ => winner,
    };

    // ===================== PROJECTION CHO TỪNG NGƯỜI XEM =====================

    /// <summary>
    /// Xây payload RIÊNG cho một người xem cụ thể — never bao gồm bài/vai trò người khác.
    /// side=null: khán giả (ẩn tối đa). Vai trò công khai nếu: đã bị loại, là Sheriff,
    /// hoặc chính là người xem (ai cũng biết vai trò của chính mình).
    /// </summary>
    public static BangViewerState BuildViewerPayload(BangGameState state, string? side)
    {
        var viewer = side is null ? null : GetPlayer(state, side);

        var players = state.Players.Select(p =>
        {
            int? dist = null;
            bool? inRange = null;
            if (viewer is not null && viewer.Id != p.Id && viewer.Alive && p.Alive)
            {
                dist = CalculateDistance(state, viewer.Id, p.Id);
                inRange = InRange(state, viewer.Id, p.Id);
            }

            var charDef = BangCharacters.Get(p.Character);
            var revealRole = !p.Alive || p.Role == RoleKind.Sheriff || p.Id == side;

            return new BangPublicPlayer(
                p.Id, p.Name, p.SeatIndex, charDef.Name, charDef.AbilityName,
                revealRole ? RoleDisplay(p.Role) : "Vai trò ẩn",
                p.Hp, p.MaxHp, p.Hand.Count,
                BangCards.WeaponName(p.WeaponCard?.Kind), EffectiveWeaponRange(p),
                p.Equipment.Select(e => BangCards.Catalog[e.Kind].Name).ToList(),
                p.Alive, dist, inRange);
        }).ToList();

        BangYourView? you = viewer is null ? null : new BangYourView(
            viewer.Id, viewer.Role.ToString(), RoleDisplay(viewer.Role),
            viewer.Hand, BangCards.WeaponName(viewer.WeaponCard?.Kind), EffectiveWeaponRange(viewer));

        PendingResponseView? prView = state.PendingResponse is null ? null : new PendingResponseView(
            state.PendingResponse.Kind.ToString(), state.PendingResponse.FromPlayerId,
            state.PendingResponse.TargetIds, side is not null && state.PendingResponse.TargetIds.Contains(side));

        return new BangViewerState(
            state.Phase.ToString(), players, state.CurrentPlayerId, state.TurnNumber,
            state.Deck.Count, state.DiscardPile, prView,
            state.Winner, state.GameLog, you);
    }
}
