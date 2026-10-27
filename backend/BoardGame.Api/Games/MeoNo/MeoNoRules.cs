namespace BoardGame.Api.Games.MeoNo;

/// <summary>Logic thuần Mèo Nổ — không phụ thuộc DI, dễ unit test.</summary>
public static class MeoNoRules
{
    // ─── Tên move types ────────────────────────────────────────────────────────
    public const string MovePlayCard  = "PLAY_CARD";
    public const string MovePlayCombo = "PLAY_COMBO";
    public const string MoveDraw      = "DRAW";
    public const string MoveNope      = "NOPE";
    public const string MovePassNope  = "PASS_NOPE";
    public const string MoveGiveCard  = "GIVE_CARD";
    public const string MoveDefuse    = "DEFUSE";

    /// <summary>Áp dụng một nước đi, trả về (newState, error). State truyền vào là shallow-mutable.</summary>
    public static (MeoNoGameState state, string? error) HandleMove(
        MeoNoGameState state, string playerId, MeoNoMove move, Random rng)
    {
        // Xoá peek SeeFuture ở đầu mỗi lượt đi mới
        if (move.Type != MoveNope && move.Type != MovePassNope && move.Type != MoveGiveCard && move.Type != MoveDefuse)
            state.SeeFuturePeek = null;

        return move.Type switch
        {
            MovePlayCard  => HandlePlayCard(state, playerId, move, rng),
            MovePlayCombo => HandlePlayCombo(state, playerId, move, rng),
            MoveDraw      => HandleDraw(state, playerId, rng),
            MoveNope      => HandleNope(state, playerId, rng),
            MovePassNope  => HandlePassNope(state, playerId, rng),
            MoveGiveCard  => HandleGiveCard(state, playerId, move),
            MoveDefuse    => HandleDefuse(state, playerId, move, rng),
            _             => (state, $"Không rõ loại nước đi: {move.Type}"),
        };
    }

    // ── PLAY_CARD ──────────────────────────────────────────────────────────────
    private static (MeoNoGameState, string?) HandlePlayCard(
        MeoNoGameState state, string playerId, MeoNoMove move, Random rng)
    {
        if (state.Phase != GamePhase.Action) return (state, "Không phải giai đoạn hành động");
        if (state.CurrentPlayerId != playerId) return (state, "Không phải lượt của bạn");
        if (move.CardId is null) return (state, "Thiếu CardId");

        var player = GetPlayer(state, playerId);
        var card = player?.Hand.FirstOrDefault(c => c.Id == move.CardId);
        if (player is null || card is null) return (state, "Bài không tồn tại trong tay");

        // Không thể đánh trực tiếp: ExplodingKitten, Defuse, Nope (reactive), và cat cards (cần combo)
        if (card.Kind is CardKind.ExplodingKitten or CardKind.Defuse)
            return (state, "Không thể đánh bài này trực tiếp");
        if (card.Kind == CardKind.Nope)
            return (state, "Dùng Nope để phản trong giai đoạn AwaitingNope, không phải đánh trực tiếp");
        if (MeoNoCards.IsCatCard(card.Kind))
            return (state, "Lá mèo phải đánh combo (2, 3 hoặc 5 lá) — không thể đánh đơn lẻ");

        // Đưa bài vào discard
        player.Hand.Remove(card);
        state.DiscardPile.Add(card);

        Log(state, $"{player.Name} đánh {MeoNoCards.DisplayName(card.Kind)}");

        // Bắt đầu cửa sổ Nope
        return EnterNope(state, playerId, MovePlayCard, card.Kind, new List<string> { card.Id }, move.TargetPlayerId, null);
    }

    // ── PLAY_COMBO ─────────────────────────────────────────────────────────────
    private static (MeoNoGameState, string?) HandlePlayCombo(
        MeoNoGameState state, string playerId, MeoNoMove move, Random rng)
    {
        if (state.Phase != GamePhase.Action) return (state, "Không phải giai đoạn hành động");
        if (state.CurrentPlayerId != playerId) return (state, "Không phải lượt của bạn");
        if (move.ComboCardIds is null || move.ComboCardIds.Count < 2) return (state, "Combo cần ít nhất 2 lá");

        var player = GetPlayer(state, playerId);
        if (player is null) return (state, "Không tìm thấy người chơi");

        var cards = move.ComboCardIds.Select(id => player.Hand.FirstOrDefault(c => c.Id == id)).ToList();
        if (cards.Any(c => c is null)) return (state, "Một số lá bài không tìm thấy");

        var kindGroups = cards.GroupBy(c => c!.Kind).ToList();

        // Combo 2 lá mèo cùng loại: lấy ngẫu nhiên từ target
        if (move.ComboCardIds.Count == 2)
        {
            if (kindGroups.Count != 1 || !MeoNoCards.IsCatCard(kindGroups[0].Key))
                return (state, "Combo 2 lá phải là 2 lá mèo CÙNG loại");
            if (move.TargetPlayerId is null) return (state, "Combo 2 lá cần chọn mục tiêu");
        }
        else if (move.ComboCardIds.Count == 3)
        {
            // Combo 3 lá mèo cùng loại: lấy bài theo yêu cầu
            if (kindGroups.Count != 1 || !MeoNoCards.IsCatCard(kindGroups[0].Key))
                return (state, "Combo 3 lá phải là 3 lá mèo CÙNG loại");
            if (move.TargetPlayerId is null) return (state, "Combo 3 lá cần chọn mục tiêu");
        }
        else if (move.ComboCardIds.Count == 5)
        {
            // 5 lá mèo khác loại: lấy bài từ discard
            if (cards.Any(c => !MeoNoCards.IsCatCard(c!.Kind)))
                return (state, "Combo 5 lá phải gồm 5 lá mèo khác loại");
            if (kindGroups.Count < 5) return (state, "Combo 5 lá cần 5 loại mèo khác nhau");
        }
        else
        {
            return (state, "Số lá combo không hợp lệ (2, 3 hoặc 5)");
        }

        foreach (var c in cards)
        {
            player.Hand.Remove(c!);
            state.DiscardPile.Add(c!);
        }

        var comboKind = kindGroups[0].Key;
        Log(state, $"{player.Name} đánh combo {move.ComboCardIds.Count} lá {MeoNoCards.DisplayName(comboKind)}");

        return EnterNope(state, playerId, MovePlayCombo, comboKind, move.ComboCardIds, move.TargetPlayerId, move.RequestedKind);
    }

    // ── DRAW ───────────────────────────────────────────────────────────────────
    private static (MeoNoGameState, string?) HandleDraw(
        MeoNoGameState state, string playerId, Random rng)
    {
        if (state.Phase != GamePhase.Action) return (state, "Không phải giai đoạn hành động");
        if (state.CurrentPlayerId != playerId) return (state, "Không phải lượt của bạn");
        if (state.Deck.Count == 0) return (state, "Bộ bài đã rỗng");

        var player = GetPlayer(state, playerId)!;
        var drawn = state.Deck[^1];
        state.Deck.RemoveAt(state.Deck.Count - 1);

        if (drawn.Kind == CardKind.ExplodingKitten)
        {
            // Rút trúng Mèo Nổ — có Khuếch Tán không?
            var defuse = player.Hand.FirstOrDefault(c => c.Kind == CardKind.Defuse);
            if (defuse is null)
            {
                // Bị loại
                player.Alive = false;
                state.DiscardPile.Add(drawn);
                Log(state, $"💥 {player.Name} RÚT TRÚNG MÈO NỔ và bị loại!");
                AdvanceTurnAfterElimination(state, playerId, rng);
            }
            else
            {
                // Phải dùng Khuếch Tán
                state.Phase = GamePhase.AwaitingDefuse;
                state.PendingAction = new PendingAction
                {
                    ActingPlayerId = playerId,
                    Type = "DREW_KITTEN",
                    ActionKind = CardKind.ExplodingKitten,
                    PlayedCardIds = new List<string> { drawn.Id },
                };
                // Giữ Mèo Nổ ngoài bộ bài — sẽ chèn lại sau DEFUSE
                Log(state, $"💥 {player.Name} rút TRÚNG Mèo Nổ — phải dùng Khuếch Tán!");
            }
        }
        else
        {
            player.Hand.Add(drawn);
            Log(state, $"{player.Name} rút 1 lá bài");
            state.TurnsLeft--;
            if (state.TurnsLeft <= 0)
                AdvanceTurn(state, rng);
        }

        return (state, null);
    }

    // ── NOPE ───────────────────────────────────────────────────────────────────
    private static (MeoNoGameState, string?) HandleNope(
        MeoNoGameState state, string playerId, Random rng)
    {
        if (state.Phase != GamePhase.AwaitingNope) return (state, "Không có gì để Nope");
        var pa = state.PendingAction!;
        if (pa.NopePendingReplies.All(id => id != playerId)) return (state, "Bạn không có quyền Nope ở đây");

        var player = GetPlayer(state, playerId)!;
        var nopeCard = player.Hand.FirstOrDefault(c => c.Kind == CardKind.Nope);
        if (nopeCard is null) return (state, "Bạn không có lá Dừng Lại");

        player.Hand.Remove(nopeCard);
        state.DiscardPile.Add(nopeCard);

        pa.Noped = !pa.Noped;
        pa.NopePendingReplies.Clear();
        // Cho phép Nope-back: đưa tất cả alive (trừ noper) vào hàng đợi lại
        var aliveOthers = state.Players.Where(p => p.Alive && p.Id != playerId).Select(p => p.Id).ToList();
        pa.NopePendingReplies.AddRange(aliveOthers);

        string effect = pa.Noped ? "HỦY" : "KHÔI PHỤC";
        Log(state, $"{player.Name} dùng Dừng Lại — hiệu ứng bài bị {effect}");

        return (state, null);
    }

    // ── PASS_NOPE ──────────────────────────────────────────────────────────────
    private static (MeoNoGameState, string?) HandlePassNope(
        MeoNoGameState state, string playerId, Random rng)
    {
        if (state.Phase != GamePhase.AwaitingNope) return (state, "Không có gì để Pass");
        var pa = state.PendingAction!;
        if (!pa.NopePendingReplies.Remove(playerId)) return (state, "Bạn không cần trả lời lúc này");

        if (pa.NopePendingReplies.Count == 0)
        {
            // Tất cả đã trả lời
            if (pa.Noped)
            {
                // Bị Nope — hiệu ứng không có tác dụng, kết thúc sub-phase
                Log(state, "Hành động bị hủy bởi Dừng Lại.");
                state.PendingAction = null;
                state.Phase = GamePhase.Action;
            }
            else
            {
                // Không ai Nope — thực thi hiệu ứng
                ResolveAction(state, rng);
            }
        }

        return (state, null);
    }

    // ── GIVE_CARD (trả lời Nhờ Vả hoặc combo lấy bài) ─────────────────────────
    private static (MeoNoGameState, string?) HandleGiveCard(
        MeoNoGameState state, string playerId, MeoNoMove move)
    {
        if (state.Phase != GamePhase.AwaitingFavor) return (state, "Không trong giai đoạn trao bài");
        var pa = state.PendingAction!;
        if (pa.TargetPlayerId != playerId) return (state, "Không phải người được yêu cầu");
        if (move.CardId is null) return (state, "Thiếu CardId");

        var giver = GetPlayer(state, playerId)!;
        var receiver = GetPlayer(state, pa.ActingPlayerId)!;
        var card = giver.Hand.FirstOrDefault(c => c.Id == move.CardId);
        if (card is null) return (state, "Bài không tồn tại trong tay");

        // Với combo 3 lá: cho phép yêu cầu loại cụ thể
        if (pa.RequestedKind is not null)
        {
            if (!Enum.TryParse<CardKind>(pa.RequestedKind, ignoreCase: true, out var requested))
                return (state, "Loại bài không hợp lệ");
            if (card.Kind != requested)
                return (state, $"Phải đưa bài loại {pa.RequestedKind}");
        }

        giver.Hand.Remove(card);
        receiver.Hand.Add(card);
        Log(state, $"{giver.Name} trao {MeoNoCards.DisplayName(card.Kind)} cho {receiver.Name}");

        state.PendingAction = null;
        state.Phase = GamePhase.Action;
        return (state, null);
    }

    // ── DEFUSE ─────────────────────────────────────────────────────────────────
    private static (MeoNoGameState, string?) HandleDefuse(
        MeoNoGameState state, string playerId, MeoNoMove move, Random rng)
    {
        if (state.Phase != GamePhase.AwaitingDefuse) return (state, "Không phải giai đoạn Khuếch Tán");
        var pa = state.PendingAction!;
        if (pa.ActingPlayerId != playerId) return (state, "Không phải lượt của bạn");

        var player = GetPlayer(state, playerId)!;
        var defuse = player.Hand.FirstOrDefault(c => c.Kind == CardKind.Defuse);
        if (defuse is null) return (state, "Bạn không có Khuếch Tán");

        player.Hand.Remove(defuse);
        state.DiscardPile.Add(defuse);

        // Chèn Mèo Nổ vào bộ bài
        var kitten = new Card(pa.PlayedCardIds[0], CardKind.ExplodingKitten);
        int pos = move.InsertPosition ?? rng.Next(state.Deck.Count + 1);
        pos = Math.Clamp(pos, 0, state.Deck.Count);
        state.Deck.Insert(pos, kitten);

        Log(state, $"{player.Name} dùng Khuếch Tán — Mèo Nổ đã được chèn vào bộ bài");

        state.PendingAction = null;
        state.TurnsLeft--;
        if (state.TurnsLeft <= 0)
            AdvanceTurn(state, rng);
        else
            state.Phase = GamePhase.Action;

        return (state, null);
    }

    // ─── Thực thi hiệu ứng sau khi qua giai đoạn Nope ─────────────────────────
    private static void ResolveAction(MeoNoGameState state, Random rng)
    {
        var pa = state.PendingAction!;
        state.PendingAction = null;
        state.Phase = GamePhase.Action;

        var actor = GetPlayer(state, pa.ActingPlayerId)!;

        switch (pa.ActionKind)
        {
            case CardKind.Skip:
                state.TurnsLeft--;
                if (state.TurnsLeft <= 0) AdvanceTurn(state, rng);
                break;

            case CardKind.Attack:
                // Luật gốc: mỗi Attack cộng 2 lượt rút cho người tiếp theo.
                // Từ lượt bình thường (TurnsLeft=1): người sau rút 2 lần.
                // Khi stack (TurnsLeft=2): người sau rút 2 (còn lại) + 2 (mới) = 4.
                int nextTurns = state.TurnsLeft == 1 ? 2 : state.TurnsLeft + 2;
                AdvanceTurnWithExtra(state, rng, nextTurns);
                break;

            case CardKind.Shuffle:
                MeoNoCards.Shuffle(state.Deck, rng);
                Log(state, "Bộ bài đã được trộn lại");
                break;

            case CardKind.SeeFuture:
                int count = Math.Min(3, state.Deck.Count);
                var top3 = state.Deck.TakeLast(count).Reverse().ToList();
                state.SeeFuturePeek = new SeeFuturePeek
                {
                    ForPlayerId = pa.ActingPlayerId,
                    Cards = top3,
                };
                Log(state, $"{actor.Name} xem {count} lá trên cùng của bộ bài");
                break;

            case CardKind.Favor:
                if (pa.TargetPlayerId is null) break;
                var target = GetPlayer(state, pa.TargetPlayerId);
                if (target is null || !target.Alive) break;
                state.Phase = GamePhase.AwaitingFavor;
                state.PendingAction = pa; // reuse để lưu TargetPlayerId
                Log(state, $"{actor.Name} yêu cầu {target.Name} trao 1 lá bài");
                break;

            // Combo mèo: lấy bài từ target
            case CardKind.Tacocat:
            case CardKind.BeardCat:
            case CardKind.HairyPotatoCat:
            case CardKind.RainbowRalphingCat:
            case CardKind.Cattermelon:
                if (pa.TargetPlayerId is null) break;
                var comboTarget = GetPlayer(state, pa.TargetPlayerId);
                if (comboTarget is null || !comboTarget.Alive || comboTarget.Hand.Count == 0) break;

                if (pa.Type == MovePlayCombo)
                {
                    // Combo 2 lá: lấy ngẫu nhiên
                    if (pa.PlayedCardIds.Count == 2)
                    {
                        int idx = rng.Next(comboTarget.Hand.Count);
                        var stolen = comboTarget.Hand[idx];
                        comboTarget.Hand.RemoveAt(idx);
                        actor.Hand.Add(stolen);
                        Log(state, $"{actor.Name} lấy ngẫu nhiên 1 lá từ {comboTarget.Name}");
                    }
                    // Combo 3 lá: yêu cầu loại cụ thể (có thể bị từ chối nếu không có)
                    else if (pa.PlayedCardIds.Count == 3 && pa.RequestedKind is not null)
                    {
                        if (Enum.TryParse<CardKind>(pa.RequestedKind, true, out var reqKind))
                        {
                            var reqCard = comboTarget.Hand.FirstOrDefault(c => c.Kind == reqKind);
                            if (reqCard is not null)
                            {
                                comboTarget.Hand.Remove(reqCard);
                                actor.Hand.Add(reqCard);
                                Log(state, $"{actor.Name} lấy {MeoNoCards.DisplayName(reqKind)} từ {comboTarget.Name}");
                            }
                            else
                            {
                                Log(state, $"{comboTarget.Name} không có {MeoNoCards.DisplayName(reqKind)} — không có gì được lấy");
                            }
                        }
                    }
                    // Combo 5 lá: lấy từ discard pile theo yêu cầu
                    else if (pa.PlayedCardIds.Count == 5 && pa.RequestedKind is not null)
                    {
                        if (Enum.TryParse<CardKind>(pa.RequestedKind, true, out var reqKind))
                        {
                            var fromDiscard = state.DiscardPile.LastOrDefault(c => c.Kind == reqKind);
                            if (fromDiscard is not null)
                            {
                                state.DiscardPile.Remove(fromDiscard);
                                actor.Hand.Add(fromDiscard);
                                Log(state, $"{actor.Name} lấy {MeoNoCards.DisplayName(reqKind)} từ pile bỏ");
                            }
                        }
                    }
                }
                else
                {
                    // AwaitingFavor — target tự chọn bài để trao
                    state.Phase = GamePhase.AwaitingFavor;
                    state.PendingAction = pa;
                }
                break;
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private static (MeoNoGameState, string?) EnterNope(
        MeoNoGameState state, string actorId, string moveType, CardKind kind,
        List<string> cardIds, string? targetId, string? requestedKind)
    {
        var others = state.Players.Where(p => p.Alive && p.Id != actorId).Select(p => p.Id).ToList();
        state.Phase = GamePhase.AwaitingNope;
        state.PendingAction = new PendingAction
        {
            ActingPlayerId = actorId,
            Type = moveType,
            ActionKind = kind,
            PlayedCardIds = cardIds,
            TargetPlayerId = targetId,
            RequestedKind = requestedKind,
            NopePendingReplies = others,
            Noped = false,
        };
        // Nếu không còn ai khác (không thể Nope), resolve ngay
        if (others.Count == 0) ResolveAction(state, new Random());
        return (state, null);
    }

    private static void AdvanceTurn(MeoNoGameState state, Random rng)
    {
        AdvanceTurnWithExtra(state, rng, 1);
    }

    private static void AdvanceTurnWithExtra(MeoNoGameState state, Random rng, int newTurnsLeft)
    {
        var aliveOrdered = state.Players.Where(p => p.Alive).OrderBy(p => p.SeatIndex).ToList();
        if (aliveOrdered.Count <= 1)
        {
            var winner = aliveOrdered.FirstOrDefault();
            state.Winner = winner?.Id;
            state.Phase = GamePhase.Finished;
            if (winner is not null) Log(state, $"🏆 {winner.Name} THẮNG!");
            return;
        }

        int curIdx = aliveOrdered.FindIndex(p => p.Id == state.CurrentPlayerId);
        int nextIdx = (curIdx + 1) % aliveOrdered.Count;
        state.CurrentPlayerId = aliveOrdered[nextIdx].Id;
        state.TurnsLeft = newTurnsLeft;
        state.Phase = GamePhase.Action;
    }

    private static void AdvanceTurnAfterElimination(MeoNoGameState state, string eliminatedId, Random rng)
    {
        var aliveOrdered = state.Players.Where(p => p.Alive).OrderBy(p => p.SeatIndex).ToList();
        if (aliveOrdered.Count <= 1)
        {
            var winner = aliveOrdered.FirstOrDefault();
            state.Winner = winner?.Id;
            state.Phase = GamePhase.Finished;
            if (winner is not null) Log(state, $"🏆 {winner.Name} THẮNG!");
            return;
        }

        // Người kế tiếp sau người bị loại
        var allByIdx = state.Players.OrderBy(p => p.SeatIndex).ToList();
        int elIdx = allByIdx.FindIndex(p => p.Id == eliminatedId);
        // Tìm người sống kế tiếp
        for (int i = 1; i <= allByIdx.Count; i++)
        {
            var candidate = allByIdx[(elIdx + i) % allByIdx.Count];
            if (candidate.Alive)
            {
                state.CurrentPlayerId = candidate.Id;
                break;
            }
        }

        state.TurnsLeft = 1;
        state.Phase = GamePhase.Action;
    }

    private static MeoNoPlayerState? GetPlayer(MeoNoGameState state, string id) =>
        state.Players.FirstOrDefault(p => p.Id == id);

    private static void Log(MeoNoGameState state, string msg)
    {
        state.GameLog.Add(msg);
        if (state.GameLog.Count > 50) state.GameLog.RemoveAt(0);
    }

    // ─── Build viewer payload ──────────────────────────────────────────────────
    public static MeoNoViewerState BuildViewerPayload(MeoNoGameState state, string viewerId)
    {
        var viewer = state.Players.FirstOrDefault(p => p.Id == viewerId);
        return new MeoNoViewerState
        {
            Phase = state.Phase,
            Players = state.Players.Select(p => new MeoNoPublicPlayer
            {
                Id = p.Id,
                Name = p.Name,
                SeatIndex = p.SeatIndex,
                CardCount = p.Hand.Count,
                Alive = p.Alive,
                IsCurrentPlayer = p.Id == state.CurrentPlayerId,
            }).ToList(),
            CurrentPlayerId = state.CurrentPlayerId,
            TurnsLeft = state.TurnsLeft,
            DeckCount = state.Deck.Count,
            DiscardPile = state.DiscardPile,
            PendingAction = state.PendingAction is null ? null : new MeoNoPendingActionView
            {
                ActingPlayerId = state.PendingAction.ActingPlayerId,
                Type = state.PendingAction.Type,
                ActionKindName = state.PendingAction.ActionKind.ToString(),
                TargetPlayerId = state.PendingAction.TargetPlayerId,
                NopePendingReplies = state.PendingAction.NopePendingReplies,
                Noped = state.PendingAction.Noped,
            },
            Winner = state.Winner,
            GameLog = state.GameLog,
            YourHand = viewer?.Hand ?? new List<Card>(),
            SeeFutureTop3 = (state.SeeFuturePeek?.ForPlayerId == viewerId)
                ? state.SeeFuturePeek.Cards
                : null,
        };
    }
}
