namespace BoardGame.Api.Games.Monopoly;

/// <summary>Classic rules. Randomness is injected; all deck order and pending decisions persist in JSONB.</summary>
public static class MonopolyRules
{
    public static MonopolyState Start(IReadOnlyList<string> names, Func<int, int> random)
    {
        var state = new MonopolyState { Started = true, Players = names.Select(n => new Player { Name = n }).ToList() };
        state.Chance = Shuffle(random);
        state.Chest = Shuffle(random);
        // Opening roll-offs are server-owned; repeat ties among the tied players.
        var candidates = Enumerable.Range(0, names.Count).ToList();
        while (candidates.Count > 1)
        {
            var rolls = candidates.Select(i => (Seat: i, Roll: random(6) + random(6) + 2)).ToList();
            var best = rolls.Max(r => r.Roll);
            candidates = rolls.Where(r => r.Roll == best).Select(r => r.Seat).ToList();
        }
        state.Turn = candidates[0];
        Log(state, $"{state.Players[state.Turn].Name} đi trước. Mỗi người nhận 1.500.");
        return state;
    }

    private static List<int> Shuffle(Func<int, int> random)
    {
        var cards = Enumerable.Range(0, 16).ToList();
        for (var i = cards.Count - 1; i > 0; i--)
        {
            var j = random(i + 1);
            (cards[i], cards[j]) = (cards[j], cards[i]);
        }
        return cards;
    }

    public static int Actor(MonopolyState s) => s.Phase switch
    {
        "Auction" => s.Auction?.Actor ?? s.Turn,
        "BuildingDemand" => s.BuildingDemand?.Actor ?? s.Turn,
        "Debt" => s.Payments.Count > 0 ? s.Payments[0].From : s.Turn,
        "Trade" => s.Trade?.To ?? s.Turn,
        "Inheritance" => s.InheritedMortgages.Count > 0 ? s.InheritedMortgages[0].Owner : s.Turn,
        _ => s.Turn
    };

    public static string? Apply(MonopolyMap map, MonopolyState s, int seat, MonopolyMove m, Func<int> die)
    {
        if (!s.Started || s.Winner != null) return "Ván chưa bắt đầu hoặc đã kết thúc.";
        if (seat < 0 || seat >= s.Players.Count || s.Players[seat].Bankrupt) return "Ghế không hợp lệ.";
        if (m.Type == "TRADE")
        {
            if (s.Phase is "Auction" or "BuildingDemand" or "Trade" or "Inheritance" || (s.Phase == "Debt" && Actor(s) != seat))
                return "Hãy giải quyết quyết định hiện tại trước.";
            return OfferTrade(map, s, seat, m);
        }
        if (m.Type is "BUILD" or "SELL" or "SELL_GROUP" or "MORTGAGE" or "UNMORTGAGE")
        {
            if (s.Phase is "Auction" or "BuildingDemand" or "Trade" || (s.Phase is "Debt" or "Inheritance" && Actor(s) != seat))
                return "Hãy giải quyết quyết định hiện tại trước.";
            if (s.Phase is "Debt" or "Inheritance" && m.Type is "BUILD" or "UNMORTGAGE") return "Cần xử lý nợ và tài sản thừa kế trước.";
            return Manage(map, s, seat, m);
        }
        if (seat != Actor(s)) return "Chưa đến lượt quyết định của bạn.";
        switch (m.Type)
        {
            case "ROLL" when s.Phase == "Roll": Roll(map, s, die); return null;
            case "BUY" when s.Phase == "Buy":
                var tile = map.Tiles[s.Players[seat].Position];
                if (s.Players[seat].Cash < tile.Price) return "Không đủ tiền mua. Có thể thế chấp hoặc đấu giá.";
                s.Players[seat].Cash -= tile.Price;
                s.Properties[tile.Index].Owner = seat;
                Log(s, $"{s.Players[seat].Name} mua {tile.Name} với giá {tile.Price}.");
                s.Phase = "End"; return null;
            case "DECLINE" when s.Phase == "Buy":
                BeginAuction(s, s.Players[seat].Position); return null;
            case "BID" when s.Phase == "Auction": return Bid(s, seat, m.Amount, false, m.Tile);
            case "PASS" when s.Phase == "Auction": return Bid(s, seat, 0, true);
            case "REQUEST_BUILD" when s.Phase == "BuildingDemand": return RespondToBuildingDemand(map, s, seat, m.Tile, true);
            case "SKIP_BUILD" when s.Phase == "BuildingDemand": return RespondToBuildingDemand(map, s, seat, m.Tile, false);
            case "END" when s.Phase == "End": EndTurn(s); return null;
            case "PAY_JAIL" when s.Phase == "Roll" && s.Players[seat].InJail:
                if (s.Players[seat].Cash < 50) return "Cần 50 để ra tù.";
                s.Players[seat].Cash -= 50; Release(s.Players[seat]); return null;
            case "JAIL_CARD" when s.Phase == "Roll" && s.Players[seat].InJail:
                if (s.Players[seat].JailCards.Count == 0) return "Bạn không có thẻ ra tù.";
                ReturnJailCards(s, seat, 1); Release(s.Players[seat]); return null;
            case "SETTLE" when s.Phase == "Debt":
                if (s.Players[seat].Cash < s.Payments[0].Amount) return "Chưa đủ tiền thanh toán.";
                ResolvePayments(map, s, die); return null;
            case "BANKRUPT" when s.Phase == "Debt":
                if (LiquidationValue(map, s, seat) >= s.Payments[0].Amount)
                    return "Bạn vẫn đủ tài sản để thanh toán. Hãy bán nhà hoặc thế chấp.";
                Bankrupt(map, s, seat); ResolvePayments(map, s, die); return null;
            case "ACCEPT" when s.Phase == "Trade": return AcceptTrade(map, s, m.RedeemReceived);
            case "REJECT" when s.Phase == "Trade":
                s.Trade = null; s.Phase = s.TradeResumePhase; return null;
            case "KEEP_INHERITED" when s.Phase == "Inheritance":
            case "REDEEM_INHERITED" when s.Phase == "Inheritance":
                return ResolveInheritance(map, s, m.Type == "REDEEM_INHERITED", die);
            default: return "Hành động không hợp lệ trong giai đoạn hiện tại.";
        }
    }

    private static void Roll(MonopolyMap map, MonopolyState s, Func<int> die)
    {
        s.Dice = [die(), die()];
        s.UtilityDice = null;
        var p = s.Players[s.Turn];
        var doubles = s.Dice[0] == s.Dice[1];
        s.ExtraRoll = false;
        Log(s, $"{p.Name} đổ {s.Dice[0]} + {s.Dice[1]}.");
        if (p.InJail)
        {
            p.JailAttempts++;
            if (doubles) Release(p);
            else if (p.JailAttempts < 3) { s.Phase = "End"; return; }
            else
            {
                Release(p);
                s.DeferredMove = s.Dice.Sum();
                Charge(s, s.Turn, null, 50);
                ResolvePayments(map, s, die);
                return;
            }
        }
        else
        {
            s.Doubles = doubles ? s.Doubles + 1 : 0;
            if (s.Doubles == 3) { Jail(s); return; }
            s.ExtraRoll = doubles;
        }
        Advance(map, s, s.Dice.Sum(), die);
    }

    private static void Advance(MonopolyMap map, MonopolyState s, int steps, Func<int> die)
    {
        var p = s.Players[s.Turn];
        if (p.Position + steps >= 40) { p.Cash += 200; Log(s, $"{p.Name} qua GO, nhận 200."); }
        p.Position = (p.Position + steps + 40) % 40;
        Land(map, s, die);
    }

    private static void Land(MonopolyMap map, MonopolyState s, Func<int> die, int rentFactor = 1, bool utilityCard = false)
    {
        s.Phase = "End";
        var p = s.Players[s.Turn];
        var tile = map.Tiles[p.Position];
        Log(s, $"{p.Name} đến {tile.Name}.");
        if (tile.Kind == "GoToJail") { Jail(s); return; }
        if (tile.Kind is "Chance" or "Chest") { Draw(map, s, tile.Kind, die); return; }
        if (tile.Kind == "Tax") Charge(s, s.Turn, null, tile.Price);
        if (tile.Kind is "Street" or "Railroad" or "Utility")
        {
            var property = s.Properties[tile.Index];
            if (property.Owner == null) s.Phase = "Buy";
            else if (property.Owner != s.Turn && !property.Mortgaged)
            {
                // C1009 rolls separately for utilities; movement dice remain visible as the move result.
                var rentDice = s.Dice.Sum();
                if (tile.Kind == "Utility")
                {
                    s.UtilityDice = [die(), die()];
                    rentDice = s.UtilityDice.Sum();
                    Log(s, $"Xúc xắc riêng tính thuê dịch vụ: {s.UtilityDice[0]} + {s.UtilityDice[1]}.");
                }
                var rent = utilityCard ? rentDice * 10 : Rent(map, s, tile.Index, rentDice) * rentFactor;
                Charge(s, s.Turn, property.Owner, rent);
            }
        }
        ResolvePayments(map, s, die);
    }

    public static int Rent(MonopolyMap map, MonopolyState s, int index, int dice)
    {
        var t = map.Tiles[index];
        var p = s.Properties[index];
        if (p.Owner == null || p.Mortgaged) return 0;
        if (t.Kind == "Railroad") return 25 * (1 << (map.Tiles.Count(x => x.Kind == "Railroad" && s.Properties[x.Index].Owner == p.Owner) - 1));
        if (t.Kind == "Utility") return dice * (map.Tiles.Count(x => x.Kind == "Utility" && s.Properties[x.Index].Owner == p.Owner) == 2 ? 10 : 4);
        if (t.Rents == null) return 0;
        return t.Rents[p.Buildings] * (p.Buildings == 0 && Group(map, index).All(i => s.Properties[i].Owner == p.Owner) ? 2 : 1);
    }

    private static int[] Group(MonopolyMap map, int index) => map.Tiles
        .Where(t => t.Kind == "Street" && t.Group == map.Tiles[index].Group).Select(t => t.Index).ToArray();

    private static string? Manage(MonopolyMap map, MonopolyState s, int seat, MonopolyMove m)
    {
        if (m.Tile < 0 || m.Tile >= 40 || s.Properties[m.Tile].Owner != seat) return "Tài sản không thuộc về bạn.";
        var t = map.Tiles[m.Tile];
        var p = s.Properties[m.Tile];
        var player = s.Players[seat];
        var group = Group(map, m.Tile);
        if (m.Type == "SELL_GROUP")
        {
            if (group.Length == 0 || group.Any(i => s.Properties[i].Owner != seat) || group.All(i => s.Properties[i].Buildings == 0))
                return "Không có nhà trong nhóm thuộc quyền sở hữu của bạn.";
            // Selling all improvements together avoids requiring replacement houses when stock is exhausted.
            foreach (var index in group)
            {
                var deed = s.Properties[index];
                player.Cash += deed.Buildings * map.Tiles[index].HouseCost / 2;
                if (deed.Buildings == 5) s.Hotels++; else s.Houses += deed.Buildings;
                deed.Buildings = 0;
            }
        }
        else if (m.Type == "MORTGAGE")
        {
            if (p.Mortgaged || group.Any(i => s.Properties[i].Buildings > 0)) return "Phải bán hết nhà trong nhóm trước khi thế chấp.";
            p.Mortgaged = true; player.Cash += t.Price / 2;
        }
        else if (m.Type == "UNMORTGAGE")
        {
            var cost = t.Price / 2 + Interest(t);
            if (!p.Mortgaged || player.Cash < cost) return "Không thể giải chấp hoặc thiếu tiền.";
            p.Mortgaged = false; player.Cash -= cost;
        }
        else
        {
            if (t.Kind != "Street") return "Chỉ có thể xây nhà trên đường phố.";
            if (m.Type == "BUILD")
            {
                if (group.Any(i => s.Properties[i].Owner != seat || s.Properties[i].Mortgaged)
                    || p.Buildings >= 5 || group.Any(i => s.Properties[i].Buildings < p.Buildings))
                    return "Cần sở hữu trọn nhóm, không thế chấp và xây đều.";
                if (TryBuildingDemand(map, s, m.Tile)) return null;
                if (player.Cash < t.HouseCost) return "Không đủ tiền xây.";
                if (p.Buildings == 4)
                {
                    if (s.Hotels == 0) return "Ngân hàng hết khách sạn.";
                    s.Hotels--; s.Houses += 4;
                }
                else { if (s.Houses == 0) return "Ngân hàng hết nhà."; s.Houses--; }
                p.Buildings++; player.Cash -= t.HouseCost;
            }
            else
            {
                if (p.Buildings == 0 || group.Any(i => s.Properties[i].Buildings > p.Buildings)) return "Phải bán nhà đều trong nhóm.";
                if (p.Buildings == 5)
                {
                    if (s.Houses < 4) return "Ngân hàng cần 4 nhà để đổi khách sạn.";
                    s.Hotels++; s.Houses -= 4;
                }
                else s.Houses++;
                p.Buildings--; player.Cash += t.HouseCost / 2;
            }
        }
        Log(s, $"{player.Name}: {ActionName(m.Type)} {t.Name}.");
        return null;
    }

    private static string ActionName(string type) => type switch
    { "BUILD" => "xây nhà", "SELL" => "bán nhà", "SELL_GROUP" => "bán toàn bộ nhà trong nhóm", "MORTGAGE" => "thế chấp", _ => "giải chấp" };
    private static int Interest(Tile t) => (t.Price / 2 + 9) / 10;

    private static void Charge(MonopolyState s, int from, int? to, int amount)
    {
        if (amount > 0 && from != to) s.Payments.Add(new Payment(from, to, amount));
    }

    private static void ResolvePayments(MonopolyMap map, MonopolyState s, Func<int> die)
    {
        if (s.Winner != null) return;
        while (s.Payments.Count > 0)
        {
            var bill = s.Payments[0];
            if (s.Players[bill.From].Bankrupt) { s.Payments.RemoveAt(0); continue; }
            if (s.Players[bill.From].Cash < bill.Amount)
            {
                if (s.Phase != "Debt") s.ResumePhase = s.Phase;
                s.Phase = "Debt"; return;
            }
            s.Players[bill.From].Cash -= bill.Amount;
            if (bill.To is int to && !s.Players[to].Bankrupt) s.Players[to].Cash += bill.Amount;
            Log(s, $"{s.Players[bill.From].Name} trả {bill.Amount} cho {(bill.To is int receiver ? s.Players[receiver].Name : "ngân hàng")}.");
            s.Payments.RemoveAt(0);
        }
        if (s.Phase == "Debt") s.Phase = s.ResumePhase;
        if (s.InheritedMortgages.Count > 0)
        {
            if (s.Phase != "Inheritance") s.InheritanceResumePhase = s.Phase;
            s.Phase = "Inheritance";
            return;
        }
        if (s.Phase == "Inheritance") s.Phase = s.InheritanceResumePhase;
        if (s.AuctionQueue.Count > 0) { BeginNextAuction(s); return; }
        if (s.Players[s.Turn].Bankrupt) { s.ExtraRoll = false; EndTurn(s); return; }
        if (s.DeferredMove > 0)
        {
            var steps = s.DeferredMove; s.DeferredMove = 0;
            Advance(map, s, steps, die);
        }
    }

    private static void Jail(MonopolyState s)
    {
        var p = s.Players[s.Turn];
        p.Position = 10; p.InJail = true; p.JailAttempts = 0;
        s.ExtraRoll = false; s.Doubles = 0; s.Phase = "End";
        Log(s, $"{p.Name} vào tù.");
    }
    private static void Release(Player p) { p.InJail = false; p.JailAttempts = 0; }

    private static void EndTurn(MonopolyState s)
    {
        if (!s.ExtraRoll)
        {
            do { s.Turn = (s.Turn + 1) % s.Players.Count; } while (s.Players[s.Turn].Bankrupt);
            s.Doubles = 0;
        }
        s.ExtraRoll = false; s.Phase = "Roll"; s.LastCard = "";
    }

    private static void BeginAuction(MonopolyState s, int tile)
    {
        s.Auction = new Auction { Tile = tile, Actor = s.Players.FindIndex(p => !p.Bankrupt) };
        s.Phase = "Auction";
        Log(s, $"Đấu giá ô {tile}, giá khởi điểm {MonopolyEdition.AuctionMinimumBid}.");
    }

    private static bool TryBuildingDemand(MonopolyMap map, MonopolyState s, int requestedTile)
    {
        var hotel = s.Properties[requestedTile].Buildings == 4;
        var available = hotel ? s.Hotels : s.Houses;
        if (available == 0) return false;
        var candidates = new Dictionary<int, int[]>();
        for (var owner = 0; owner < s.Players.Count; owner++)
        {
            if (s.Players[owner].Bankrupt || s.Players[owner].Cash < MonopolyEdition.AuctionMinimumBid) continue;
            var indices = map.Tiles.Where(t => t.Kind == "Street" && s.Properties[t.Index].Owner == owner
                && (hotel ? s.Properties[t.Index].Buildings == 4 : s.Properties[t.Index].Buildings < 4)
                && Group(map,t.Index).All(i => s.Properties[i].Owner == owner && !s.Properties[i].Mortgaged
                    && s.Properties[i].Buildings >= s.Properties[t.Index].Buildings)).Select(t=>t.Index).ToArray();
            if (indices.Length > 0) candidates.Add(owner, indices);
        }
        if (candidates.Count <= available) return false;
        var initiator = s.Properties[requestedTile].Owner ?? throw new InvalidOperationException("Building request needs an owner");
        s.BuildingDemand = new BuildingDemand { Kind = hotel ? "Hotel" : "House", ResumePhase = s.Phase,
            EligibleTiles = candidates, Requests = new() { [initiator] = requestedTile }, Responded = [initiator],
            Actor = candidates.Keys.First(i => i != initiator) };
        s.Phase = "BuildingDemand";
        Log(s, $"Kho còn {available} {(hotel ? "khách sạn" : "nhà")}: xác nhận nhu cầu mua trước khi quyết định đấu giá.");
        return true;
    }

    private static string? RespondToBuildingDemand(MonopolyMap map, MonopolyState s, int seat, int tile, bool wantsToBuild)
    {
        var demand = s.BuildingDemand ?? throw new InvalidOperationException("Missing building demand");
        if (wantsToBuild)
        {
            if (!demand.EligibleTiles.TryGetValue(seat, out var tiles)) return "Bạn không đủ điều kiện mua nhà trong đợt này.";
            if (tile == -1) tile = tiles[0];
            if (!tiles.Contains(tile) || s.Players[seat].Cash < MonopolyEdition.AuctionMinimumBid)
                return "Cần chọn đất đủ điều kiện và đủ giá khởi điểm đấu giá.";
            demand.Requests.Add(seat, tile);
        }
        Log(s, $"{s.Players[seat].Name} {(wantsToBuild ? "xác nhận muốn mua" : "không mua")} {(demand.Kind == "Hotel" ? "khách sạn" : "nhà")} đợt này.");
        demand.Responded.Add(seat);
        var next = demand.EligibleTiles.Keys.Where(i => !demand.Responded.Contains(i)).ToArray();
        if (next.Length > 0) { demand.Actor = next[0]; return null; }

        var available = demand.Kind == "Hotel" ? s.Hotels : s.Houses;
        if (demand.Requests.Count > available)
        {
            // Only expressed demand creates competition. Eligible owners who declined do not bid.
            s.Auction = new Auction { Kind = demand.Kind, Tile = demand.Requests.Values.First(),
                Actor = demand.Requests.Keys.First(), ResumePhase = demand.ResumePhase,
                EligibleTiles = demand.Requests.Keys.ToDictionary(owner => owner, owner => demand.EligibleTiles[owner]) };
            s.Phase = "Auction";
            Log(s, $"{demand.Requests.Count} người muốn mua nhưng chỉ còn {available}: mở đấu giá từng {(demand.Kind == "Hotel" ? "khách sạn" : "nhà")}.");
        }
        else
        {
            foreach (var (owner, index) in demand.Requests)
            {
                if (s.Players[owner].Cash < map.Tiles[index].HouseCost)
                {
                    Log(s, $"{s.Players[owner].Name} không mua {map.Tiles[index].Name}: không có cạnh tranh đấu giá và thiếu giá niêm yết.");
                    continue;
                }
                s.Players[owner].Cash -= map.Tiles[index].HouseCost;
                s.Properties[index].Buildings++;
                if (demand.Kind == "Hotel") { s.Hotels--; s.Houses += 4; }
                else s.Houses--;
                Log(s, $"{s.Players[owner].Name} xây {map.Tiles[index].Name} với giá niêm yết {map.Tiles[index].HouseCost}.");
            }
            s.Phase = demand.ResumePhase;
        }
        s.BuildingDemand = null;
        return null;
    }

    private static string? Bid(MonopolyState s, int seat, int amount, bool pass, int tile = -1)
    {
        var a = s.Auction ?? throw new InvalidOperationException("Missing auction");
        if (pass) a.Passed.Add(seat);
        else
        {
            if (amount < MonopolyEdition.AuctionMinimumBid || amount <= a.Bid || amount > s.Players[seat].Cash)
                return $"Giá từ {MonopolyEdition.AuctionMinimumBid}, cao hơn giá hiện tại và không vượt tiền mặt.";
            if (a.Kind != "Property")
            {
                if (!a.EligibleTiles.TryGetValue(seat, out var tiles)) return "Bạn không đủ điều kiện xây.";
                if (tile == -1) tile = tiles[0];
                if (!tiles.Contains(tile)) return "Chọn đất đủ điều kiện xây trong phiên đấu giá này.";
                a.LeaderTile = tile;
            }
            a.Bid = amount; a.Leader = seat;
            Log(s, $"{s.Players[seat].Name} trả giá {amount}.");
        }
        var remaining = Enumerable.Range(0, s.Players.Count).Where(i => !s.Players[i].Bankrupt && !a.Passed.Contains(i) && i != a.Leader
            && (a.Kind == "Property" || a.EligibleTiles.ContainsKey(i))).ToArray();
        if (remaining.Length == 0)
        {
            if (a.Leader is int winner)
            {
                s.Players[winner].Cash -= a.Bid;
                if (a.Kind == "Property") s.Properties[a.Tile].Owner = winner;
                else
                {
                    s.Properties[a.LeaderTile].Buildings++;
                    if (a.Kind == "Hotel") { s.Hotels--; s.Houses += 4; }
                    else s.Houses--;
                }
                Log(s, $"{s.Players[winner].Name} thắng đấu giá với {a.Bid}.");
            }
            s.Auction = null;
            if (s.AuctionQueue.Count > 0) BeginNextAuction(s);
            else if (s.Players[s.Turn].Bankrupt) { s.ExtraRoll = false; EndTurn(s); }
            else s.Phase = a.ResumePhase;
        }
        else a.Actor = remaining.OrderBy(i => (i - seat + s.Players.Count - 1) % s.Players.Count).First();
        return null;
    }

    private static void BeginNextAuction(MonopolyState s)
    {
        var index = s.AuctionQueue[0]; s.AuctionQueue.RemoveAt(0); BeginAuction(s, index);
    }

    private static long LiquidationValue(MonopolyMap map, MonopolyState s, int seat) => (long)s.Players[seat].Cash +
        map.Tiles.Where(t => s.Properties[t.Index].Owner == seat).Sum(t =>
            s.Properties[t.Index].Buildings * t.HouseCost / 2 + (s.Properties[t.Index].Mortgaged ? 0 : t.Price / 2));

    private static void Bankrupt(MonopolyMap map, MonopolyState s, int seat)
    {
        var debtor = s.Players[seat];
        var creditor = s.Payments[0].To;
        s.InheritedMortgages.RemoveAll(m => m.Owner == seat);
        foreach (var t in map.Tiles.Where(t => s.Properties[t.Index].Owner == seat))
        {
            var p = s.Properties[t.Index];
            debtor.Cash += p.Buildings * t.HouseCost / 2;
            if (p.Buildings == 5) s.Hotels++; else s.Houses += p.Buildings;
            p.Buildings = 0; p.Owner = creditor;
            if (creditor is int to && p.Mortgaged) s.InheritedMortgages.Add(new InheritedMortgage(to, t.Index));
            if (creditor == null) { p.Mortgaged = false; s.AuctionQueue.Add(t.Index); }
        }
        if (creditor is int receiver)
        {
            s.Players[receiver].Cash += debtor.Cash;
            s.Players[receiver].JailCards.AddRange(debtor.JailCards); debtor.JailCards.Clear();
        }
        else ReturnJailCards(s, seat, debtor.JailCards.Count);
        debtor.Cash = 0; debtor.Bankrupt = true;
        if (seat == s.Turn) s.DeferredMove = 0;
        s.Payments.RemoveAll(p => p.From == seat);
        Log(s, $"{debtor.Name} phá sản.");
        var survivors = Enumerable.Range(0, s.Players.Count).Where(i => !s.Players[i].Bankrupt).ToArray();
        if (survivors.Length == 1) { s.Winner = $"P{survivors[0]}"; s.Phase = "Finished"; }
    }

    private static void ReturnJailCards(MonopolyState s, int seat, int count)
    {
        for (var i = 0; i < count; i++)
        {
            var deck = s.Players[seat].JailCards[0]; s.Players[seat].JailCards.RemoveAt(0);
            (deck == "Chance" ? s.Chance : s.Chest).Add(0);
        }
    }

    private static string? ResolveInheritance(MonopolyMap map, MonopolyState s, bool redeem, Func<int> die)
    {
        var inherited = s.InheritedMortgages[0];
        var tile = map.Tiles[inherited.Tile];
        var cost = Interest(tile) + (redeem ? tile.Price / 2 : 0);
        if (redeem && s.Players[inherited.Owner].Cash < cost)
            return "Không đủ tiền giải chấp ngay. Có thể giữ thế chấp và xử lý khoản lãi bắt buộc.";
        s.InheritedMortgages.RemoveAt(0);
        if (redeem) s.Properties[inherited.Tile].Mortgaged = false;
        Charge(s, inherited.Owner, null, cost);
        Log(s, $"{s.Players[inherited.Owner].Name} {(redeem ? "giải chấp ngay" : "giữ thế chấp")} {tile.Name} thừa kế, trả {cost}.");
        ResolvePayments(map, s, die);
        return null;
    }

    private static string? OfferTrade(MonopolyMap map, MonopolyState s, int seat, MonopolyMove m)
    {
        if (m.Target < 0 || m.Target >= s.Players.Count || m.Target == seat || s.Players[m.Target].Bankrupt)
            return "Người giao dịch không hợp lệ.";
        var trade = new Trade { From = seat, To = m.Target, CashOffered = m.CashOffered,
            CashRequested = m.CashRequested, Offered = m.Offered, Requested = m.Requested,
            OfferedCards = m.OfferedCards, RequestedCards = m.RequestedCards, RedeemRequested = m.RedeemRequested };
        var error = ValidateTrade(map, s, trade);
        if (error != null) return error;
        s.TradeResumePhase = s.Phase; s.Phase = "Trade"; s.Trade = trade;
        return null;
    }

    private static string? ValidateTrade(MonopolyMap map, MonopolyState s, Trade t, bool redeemOffered = false)
    {
        if (t.Offered == null || t.Requested == null || t.Offered.Length > 28 || t.Requested.Length > 28
            || t.CashOffered < 0 || t.CashRequested < 0
            || t.Offered.Distinct().Count() != t.Offered.Length || t.Requested.Distinct().Count() != t.Requested.Length)
            return "Nội dung giao dịch không hợp lệ.";
        foreach (var (owner, cards) in new[] { (t.From, t.OfferedCards), (t.To, t.RequestedCards) })
        {
            if (cards == null || cards.Length > 2 || cards.Distinct().Count() != cards.Length
                || cards.Any(card => card is not ("Chance" or "Chest") || !s.Players[owner].JailCards.Contains(card)))
                return "Thẻ ra tù giao dịch không hợp lệ.";
        }
        foreach (var (owner, list) in new[] { (t.From, t.Offered), (t.To, t.Requested) })
            foreach (var index in list)
                if (index < 0 || index >= 40 || s.Properties[index].Owner != owner || Group(map, index).Any(i => s.Properties[i].Buildings > 0))
                    return "Chỉ giao dịch tài sản thuộc người bán và nhóm không có nhà.";
                else if (s.InheritedMortgages.Any(m => m.Tile == index))
                    return "Phải xử lý lãi thừa kế trước khi giao dịch tài sản này.";
        var fromInterest = t.Requested.Where(i => s.Properties[i].Mortgaged).Sum(i => Interest(map.Tiles[i]) + (t.RedeemRequested ? map.Tiles[i].Price / 2 : 0));
        var toInterest = t.Offered.Where(i => s.Properties[i].Mortgaged).Sum(i => Interest(map.Tiles[i]) + (redeemOffered ? map.Tiles[i].Price / 2 : 0));
        var fromBalance = (long)s.Players[t.From].Cash - t.CashOffered + t.CashRequested;
        var toBalance = (long)s.Players[t.To].Cash - t.CashRequested + t.CashOffered;
        if (s.Players[t.From].Cash < t.CashOffered || s.Players[t.To].Cash < t.CashRequested
            || fromBalance < fromInterest || toBalance < toInterest)
            return "Thiếu tiền thanh toán giao dịch và lãi tài sản thế chấp.";
        if (fromBalance > int.MaxValue || toBalance > int.MaxValue)
            return "Số dư sau giao dịch vượt giới hạn lưu trữ.";
        return null;
    }

    private static string? AcceptTrade(MonopolyMap map, MonopolyState s, bool redeemOffered)
    {
        var t = s.Trade ?? throw new InvalidOperationException("Missing trade");
        var error = ValidateTrade(map, s, t, redeemOffered);
        if (error != null) return error;
        s.Players[t.From].Cash += t.CashRequested - t.CashOffered;
        s.Players[t.To].Cash += t.CashOffered - t.CashRequested;
        foreach (var (recipient, list, redeem) in new[] { (t.To, t.Offered, redeemOffered), (t.From, t.Requested, t.RedeemRequested) })
            foreach (var index in list)
            {
                s.Properties[index].Owner = recipient;
                if (s.Properties[index].Mortgaged)
                {
                    s.Players[recipient].Cash -= Interest(map.Tiles[index]) + (redeem ? map.Tiles[index].Price / 2 : 0);
                    if (redeem) s.Properties[index].Mortgaged = false;
                }
            }
        foreach (var (sender, recipient, cards) in new[] { (t.From, t.To, t.OfferedCards), (t.To, t.From, t.RequestedCards) })
            foreach (var card in cards)
            {
                s.Players[sender].JailCards.Remove(card); s.Players[recipient].JailCards.Add(card);
            }
        Log(s, $"{s.Players[t.From].Name} và {s.Players[t.To].Name} hoàn tất giao dịch.");
        s.Trade = null; s.Phase = s.TradeResumePhase; return null;
    }

    private static void Log(MonopolyState s, string text)
    {
        s.Log.Add(text);
        if (s.Log.Count > 80) s.Log.RemoveRange(0, s.Log.Count - 80);
    }

    private static void Draw(MonopolyMap map, MonopolyState s, string kind, Func<int> die)
    {
        var deck = kind == "Chance" ? s.Chance : s.Chest;
        var card = deck[0]; deck.RemoveAt(0);
        if (card != 0) deck.Add(card);
        var p = s.Players[s.Turn];
        if (card == 0) { p.JailCards.Add(kind); Card(s, "Nhận thẻ ra tù miễn phí."); return; }
        if (kind == "Chance") Chance(map, s, card, die);
        else Chest(map, s, card);
        ResolvePayments(map, s, die);
    }

    private static void Card(MonopolyState s, string text) { s.LastCard = text; Log(s, text); }

    private static void MoveTo(MonopolyMap map, MonopolyState s, int target, Func<int> die, int factor = 1, bool utility = false)
    {
        var p = s.Players[s.Turn];
        if (target < p.Position || target == 0) p.Cash += 200;
        p.Position = target;
        Land(map, s, die, factor, utility);
    }

    private static void Chance(MonopolyMap map, MonopolyState s, int card, Func<int> die)
    {
        var p = s.Players[s.Turn];
        switch (card)
        {
            case 1: Card(s, "Tiến đến GO, nhận 200."); MoveTo(map,s,0,die); break;
            case 2: Card(s, "Tiến đến Illinois Avenue."); MoveTo(map,s,24,die); break;
            case 3: Card(s, "Tiến đến St. Charles Place."); MoveTo(map,s,11,die); break;
            case 4: Card(s, "Đến công ty dịch vụ gần nhất; nếu có chủ, trả 10 lần xúc xắc mới.");
                MoveTo(map,s, p.Position < 12 || p.Position >= 28 ? 12 : 28,die,utility:true); break;
            case 5: case 6:
                Card(s, "Đến ga gần nhất; nếu có chủ, trả gấp đôi tiền thuê.");
                MoveTo(map,s, new[] {5,15,25,35}.FirstOrDefault(i => i > p.Position,5),die,2); break;
            case 7: Card(s, "Ngân hàng trả cổ tức 50."); p.Cash += 50; break;
            case 8: Card(s, "Lùi 3 ô."); Advance(map,s,-3,die); break;
            case 9: Card(s, "Vào tù, không nhận lương GO."); Jail(s); break;
            case 10: Card(s, "Sửa chữa: mỗi nhà 25, mỗi khách sạn 100."); Repairs(map,s,25,100); break;
            case 11: Card(s, "Nộp phạt 15."); Charge(s,s.Turn,null,15); break;
            case 12: Card(s, "Đến Reading Railroad."); MoveTo(map,s,5,die); break;
            case 13: Card(s, "Tiến đến Boardwalk."); MoveTo(map,s,39,die); break;
            case 14:
                Card(s, "Trả mỗi người chơi 50.");
                for(var i=0;i<s.Players.Count;i++) if(i!=s.Turn && !s.Players[i].Bankrupt) Charge(s,s.Turn,i,50);
                break;
            case 15: Card(s, "Khoản đầu tư đáo hạn: nhận 150."); p.Cash += 150; break;
        }
    }

    private static void Chest(MonopolyMap map, MonopolyState s, int card)
    {
        var p = s.Players[s.Turn];
        switch(card)
        {
            case 1: Card(s,"Tiến đến GO, nhận 200."); p.Position=0; p.Cash+=200; break;
            case 2: Card(s,"Ngân hàng chuyển nhầm có lợi: nhận 200."); p.Cash+=200; break;
            case 3: Card(s,"Trả phí bác sĩ 50."); Charge(s,s.Turn,null,50); break;
            case 4: Card(s,"Bán cổ phiếu: nhận 50."); p.Cash+=50; break;
            case 5: Card(s,"Vào tù, không nhận lương GO."); Jail(s); break;
            case 6: Card(s,"Quỹ nghỉ lễ đáo hạn: nhận 100."); p.Cash+=100; break;
            case 7: Card(s,"Hoàn thuế: nhận 20."); p.Cash+=20; break;
            case 8:
                Card(s,"Sinh nhật: mỗi người chơi trả bạn 10.");
                for(var i=0;i<s.Players.Count;i++) if(i!=s.Turn && !s.Players[i].Bankrupt) Charge(s,i,s.Turn,10);
                break;
            case 9: Card(s,"Bảo hiểm chi trả 100."); p.Cash+=100; break;
            case 10: Card(s,"Trả viện phí 100."); Charge(s,s.Turn,null,100); break;
            case 11: Card(s,"Trả học phí 50."); Charge(s,s.Turn,null,50); break;
            case 12: Card(s,"Phí tư vấn: nhận 25."); p.Cash+=25; break;
            case 13: Card(s,"Sửa đường: mỗi nhà 40, mỗi khách sạn 115."); Repairs(map,s,40,115); break;
            case 14: Card(s,"Giải thưởng: nhận 10."); p.Cash+=10; break;
            case 15: Card(s,"Thừa kế: nhận 100."); p.Cash+=100; break;
        }
    }

    private static void Repairs(MonopolyMap map, MonopolyState s, int house, int hotel) => Charge(s,s.Turn,null,
        map.Tiles.Where(t=>s.Properties[t.Index].Owner==s.Turn).Sum(t=>
            s.Properties[t.Index].Buildings==5 ? hotel : s.Properties[t.Index].Buildings*house));
}
