using BoardGame.Api.Games.Monopoly;
using BoardGame.Api.Platform;

namespace BoardGame.Api.Tests.Monopoly;

public class MonopolyRulesTests
{
    private readonly MonopolyMap _map = new();
    private static MonopolyState State(int count = 3) => new()
    {
        Started = true, Players = Enumerable.Range(0,count).Select(i => new Player { Name = $"Người {i}" }).ToList(),
        Chance = Enumerable.Range(0,16).ToList(), Chest = Enumerable.Range(0,16).ToList()
    };
    private string? Move(MonopolyState s, string type, int seat = 0, int tile = -1, int amount = 0, params int[] dice)
    {
        var rolls = new Queue<int>(dice);
        return MonopolyRules.Apply(_map, s, seat, new MonopolyMove { Type=type, Tile=tile, Amount=amount }, () => rolls.Dequeue());
    }

    [Fact]
    public void BoardHasClassicOrderingAndAllDeeds()
    {
        Assert.Equal(40,_map.Tiles.Length);
        Assert.Equal(Enumerable.Range(0,40),_map.Tiles.Select(t=>t.Index));
        Assert.Equal(22,_map.Tiles.Count(t=>t.Kind=="Street"));
        Assert.Equal(4,_map.Tiles.Count(t=>t.Kind=="Railroad"));
        Assert.Equal(2,_map.Tiles.Count(t=>t.Kind=="Utility"));
        Assert.Equal("Boardwalk",_map.Tiles[39].Name);
        Assert.Equal(2000,_map.Tiles[39].Rents?[5]);
    }

    [Fact]
    public void FrozenEditionMatchesFactsAndDeedSamplesReadFromHasbroC1009Pdf()
    {
        var facts=GameJson.Element(File.ReadAllText(Path.Combine(AppContext.BaseDirectory,"Monopoly","Fixtures","c1009-2016.json")));
        var engine=new MonopolyEngine();var (mapJson,_)=engine.NewGame(null);var map=GameJson.Element(mapJson);
        Assert.Equal(facts.GetProperty("rulesetId").GetString(),map.GetProperty("rulesetId").GetString());
        Assert.Equal(facts.GetProperty("minPlayers").GetInt32(),engine.MinPlayers);
        Assert.Equal(facts.GetProperty("maxPlayers").GetInt32(),engine.MaxPlayers);
        Assert.Equal(facts.GetProperty("auctionMinimumBid").GetInt32(),map.GetProperty("auctionMinimumBid").GetInt32());
        Assert.Equal(facts.GetProperty("incomeTax").GetInt32(),_map.Tiles[4].Price);
        Assert.Equal(facts.GetProperty("luxuryTax").GetInt32(),_map.Tiles[38].Price);
        var state=State();Assert.Equal(facts.GetProperty("initialCash").GetInt32(),state.Players[0].Cash);
        Assert.Equal(facts.GetProperty("houses").GetInt32(),state.Houses);Assert.Equal(facts.GetProperty("hotels").GetInt32(),state.Hotels);
        foreach(var sample in facts.GetProperty("deedSamples").EnumerateArray())
        {
            var tile=_map.Tiles[sample.GetProperty("index").GetInt32()];
            Assert.Equal(sample.GetProperty("name").GetString(),tile.Name);
            Assert.Equal(sample.GetProperty("houseCost").GetInt32(),tile.HouseCost);
            Assert.Equal(sample.GetProperty("rents").EnumerateArray().Select(n=>n.GetInt32()),tile.Rents);
        }
    }

    [Theory]
    [InlineData(6,true)]
    [InlineData(7,false)]
    public void EditionSeatLimitIsAppliedByRoomStart(int count,bool allowed)
    {
        var engine=new MonopolyEngine();var (map,state)=engine.NewGame(null);
        var started=engine.OnRoomFull(map,state,Enumerable.Range(0,count).Select(i=>$"P{i}").ToArray());
        Assert.Equal(allowed,started.Ok);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(9)]
    [InlineData(10)]
    public void AuctionStartsAtTenAccordingToFrozenEdition(int amount)
    {
        var s=State();s.Phase="Buy";s.Players[0].Position=1;Move(s,"DECLINE");
        var error=Move(s,"BID",amount:amount);
        Assert.Equal(amount<10,error!=null);
    }

    [Theory]
    [InlineData(false,36)]
    [InlineData(true,90)]
    public void OrdinaryUtilityRentUsesFreshDiceWithoutReplacingMovementDice(bool both,int rent)
    {
        var s=State();s.Players[0].Position=9;s.Properties[12].Owner=1;
        if(both)s.Properties[28].Owner=1;
        Assert.Null(Move(s,"ROLL",dice:[1,2,4,5]));
        Assert.Equal(1500-rent,s.Players[0].Cash);Assert.Equal(new[]{1,2},s.Dice);
        Assert.Equal(new[]{4,5},s.UtilityDice);Assert.False(s.ExtraRoll);Assert.Equal(12,s.Players[0].Position);
    }

    [Fact]
    public void UtilityRentDoubleDoesNotCreateAnExtraTurn()
    {
        var s=State();s.Players[0].Position=9;s.Properties[12].Owner=1;
        Move(s,"ROLL",dice:[1,2,6,6]);Assert.False(s.ExtraRoll);
        Move(s,"END");Assert.Equal(1,s.Turn);
    }

    [Fact]
    public void StartingGameShufflesBothDecksAndSelectsASeat()
    {
        var r = new Random(934);
        var s = MonopolyRules.Start(["A","B","C"],r.Next);
        Assert.InRange(s.Turn,0,2);
        Assert.All(s.Players,p=>Assert.Equal(1500,p.Cash));
        Assert.Equal(Enumerable.Range(0,16),s.Chance.Order());
        Assert.Equal(Enumerable.Range(0,16),s.Chest.Order());
        Assert.NotEqual(s.Chance,s.Chest);
    }

    [Fact]
    public void GoSalaryPaidOnceAndLandingOffersPurchase()
    {
        var s=State(); s.Players[0].Position=39;
        Assert.Null(Move(s,"ROLL",dice:[1,3]));
        Assert.Equal(3,s.Players[0].Position); Assert.Equal(1700,s.Players[0].Cash); Assert.Equal("Buy",s.Phase);
        Assert.Null(Move(s,"BUY")); Assert.Equal(1640,s.Players[0].Cash); Assert.Equal(0,s.Properties[3].Owner);
        Assert.Null(Move(s,"END")); Assert.Equal(1,s.Turn);
    }

    [Fact]
    public void ThirdConsecutiveDoubleGoesToJailWithoutMovingOrSalary()
    {
        var s=State(); s.Players[0].Position=35; s.Doubles=2;
        Assert.Null(Move(s,"ROLL",dice:[3,3]));
        Assert.True(s.Players[0].InJail); Assert.Equal(10,s.Players[0].Position);
        Assert.Equal(1500,s.Players[0].Cash); Assert.False(s.ExtraRoll);
    }

    [Fact]
    public void DoublesGiveExtraRollOnlyAfterLandingResolution()
    {
        var s=State(); Assert.Null(Move(s,"ROLL",dice:[2,2]));
        Assert.Equal(1300,s.Players[0].Cash); Assert.Equal("End",s.Phase);
        Assert.Null(Move(s,"END")); Assert.Equal(0,s.Turn); Assert.Equal("Roll",s.Phase); Assert.Equal(1,s.Doubles);
    }

    [Fact]
    public void JailDoubleReleasesWithoutAnExtraRoll()
    {
        var s=State(); s.Players[0].InJail=true; s.Players[0].Position=10;
        Assert.Null(Move(s,"ROLL",dice:[2,2]));
        Assert.False(s.Players[0].InJail); Assert.Equal(14,s.Players[0].Position); Assert.False(s.ExtraRoll);
    }

    [Fact]
    public void ThirdJailFailureDefersMovementUntilFineIsSettled()
    {
        var s=State(); s.Players[0].InJail=true; s.Players[0].JailAttempts=2;
        s.Players[0].Position=10; s.Players[0].Cash=0; s.Properties[39].Owner=0;
        Assert.Null(Move(s,"ROLL",dice:[1,2]));
        Assert.Equal("Debt",s.Phase); Assert.Equal(10,s.Players[0].Position);
        Assert.Null(Move(s,"MORTGAGE",tile:39)); Assert.Null(Move(s,"SETTLE"));
        Assert.Equal(13,s.Players[0].Position); Assert.Equal("Buy",s.Phase); Assert.Equal(150,s.Players[0].Cash);
    }

    [Fact]
    public void FreeParkingDoesNotPayAndVisitingIsNotJail()
    {
        var s=State(); s.Players[0].Position=17;
        Move(s,"ROLL",dice:[1,2]); Assert.Equal(1500,s.Players[0].Cash);
        s.Phase="Roll"; s.Players[0].Position=7;
        Move(s,"ROLL",dice:[1,2]); Assert.False(s.Players[0].InJail);
    }

    [Fact]
    public void CompleteColorDoublesBaseRentEvenIfSiblingMortgaged()
    {
        var s=State(); s.Properties[1].Owner=1; s.Properties[3].Owner=1; s.Properties[3].Mortgaged=true;
        Assert.Equal(4,MonopolyRules.Rent(_map,s,1,7));
        Assert.Equal(0,MonopolyRules.Rent(_map,s,3,7));
    }

    [Fact]
    public void RailroadsAndUtilitiesCountAllOwnedDeeds()
    {
        var s=State(); foreach(var i in new[]{5,15,25,35,12,28}) s.Properties[i].Owner=1;
        s.Properties[15].Mortgaged=true;
        Assert.Equal(200,MonopolyRules.Rent(_map,s,5,7));
        Assert.Equal(70,MonopolyRules.Rent(_map,s,12,7));
        s.Properties[28].Owner=null; Assert.Equal(28,MonopolyRules.Rent(_map,s,12,7));
    }

    [Fact]
    public void BuildAndSellEvenlyAndExchangeHotelStock()
    {
        var s=State(); s.Properties[1].Owner=0; s.Properties[3].Owner=0;
        Assert.Null(Move(s,"BUILD",tile:1)); Assert.NotNull(Move(s,"BUILD",tile:1));
        Assert.NotNull(Move(s,"MORTGAGE",tile:3));
        Assert.Null(Move(s,"BUILD",tile:3));
        for(var n=1;n<4;n++) { Assert.Null(Move(s,"BUILD",tile:1)); Assert.Null(Move(s,"BUILD",tile:3)); }
        Assert.Equal(24,s.Houses);
        Assert.Null(Move(s,"BUILD",tile:1)); Assert.Equal(28,s.Houses); Assert.Equal(11,s.Hotels);
        Assert.Equal(250,MonopolyRules.Rent(_map,s,1,7));
        Assert.NotNull(Move(s,"SELL",tile:3)); Assert.Null(Move(s,"SELL",tile:1));
        Assert.Equal(24,s.Houses); Assert.Equal(12,s.Hotels);
    }

    [Fact]
    public void BankStockAndMortgagesPreventIllegalConstruction()
    {
        var s=State(); s.Properties[1].Owner=0; s.Properties[3].Owner=0;
        s.Houses=0; Assert.NotNull(Move(s,"BUILD",tile:1));
        s.Houses=32; s.Properties[3].Mortgaged=true; Assert.NotNull(Move(s,"BUILD",tile:1));
        Assert.NotNull(Move(s,"BUILD",tile:5));
    }

    [Fact]
    public void LastBankHouseIsAuctionedAmongEligibleOwnersAndBuiltOnWinnersChosenDeed()
    {
        var s=State();s.Properties[1].Owner=0;s.Properties[3].Owner=0;
        s.Properties[37].Owner=1;s.Properties[39].Owner=1;s.Houses=1;
        Assert.Null(Move(s,"BUILD",tile:1));Assert.Equal("BuildingDemand",s.Phase);
        Assert.NotNull(Move(s,"BID",seat:1,amount:1));
        Assert.Null(Move(s,"REQUEST_BUILD",seat:1,tile:39));Assert.Equal("Auction",s.Phase);Assert.Equal("House",s.Auction?.Kind);
        Assert.Equal(new[]{0,1},s.Auction!.EligibleTiles.Keys);Assert.Equal(32-31,s.Houses);
        Assert.Null(Move(s,"BID",amount:60,tile:3));
        Assert.NotNull(Move(s,"BID",seat:1,amount:70,tile:1));
        Assert.Null(Move(s,"BID",seat:1,amount:70,tile:39));Assert.Null(Move(s,"PASS"));
        Assert.Equal(1,s.Properties[39].Buildings);Assert.Equal(1,s.Properties[39].Owner);
        Assert.Equal(1430,s.Players[1].Cash);Assert.Equal(0,s.Houses);Assert.Equal("Roll",s.Phase);
        Assert.Equal(0,s.Properties[1].Buildings);
    }

    [Fact]
    public void HotelAuctionReturnsFourHousesAndResumesSuspendedPurchase()
    {
        var s=State();s.Phase="Buy";s.Players[0].Position=5;
        foreach(var i in new[]{1,3}){s.Properties[i].Owner=0;s.Properties[i].Buildings=4;}
        foreach(var i in new[]{37,39}){s.Properties[i].Owner=1;s.Properties[i].Buildings=4;}
        s.Hotels=1;s.Houses=16;
        Assert.Null(Move(s,"BUILD",tile:1));Assert.Null(Move(s,"REQUEST_BUILD",seat:1,tile:37));Assert.Equal("Hotel",s.Auction?.Kind);
        Assert.Null(Move(s,"PASS"));Assert.Null(Move(s,"BID",seat:1,amount:25,tile:37));
        Assert.Equal(5,s.Properties[37].Buildings);Assert.Equal(20,s.Houses);Assert.Equal(0,s.Hotels);
        Assert.Equal("Buy",s.Phase);Assert.Equal(0,s.Turn);
    }

    [Fact]
    public void BuildingAuctionAllPassLeavesStockUnchangedAndRestoresPhase()
    {
        var s=State();s.Phase="End";foreach(var i in new[]{1,3})s.Properties[i].Owner=0;
        foreach(var i in new[]{37,39})s.Properties[i].Owner=1;s.Houses=1;
        Assert.Null(Move(s,"BUILD",tile:1));Assert.Null(Move(s,"REQUEST_BUILD",seat:1,tile:37));Assert.Null(Move(s,"PASS"));Assert.Null(Move(s,"PASS",1));
        Assert.Equal(1,s.Houses);Assert.Equal("End",s.Phase);Assert.Null(s.Auction);
    }

    [Fact]
    public void SufficientStockAndOnlyOneEligibleOwnerDoNotTriggerAuction()
    {
        var s=State();foreach(var i in new[]{1,3})s.Properties[i].Owner=0;s.Houses=1;
        Assert.Null(Move(s,"BUILD",tile:1));Assert.Null(s.Auction);Assert.Equal(0,s.Houses);
        s=State();foreach(var i in new[]{1,3})s.Properties[i].Owner=0;
        foreach(var i in new[]{37,39})s.Properties[i].Owner=1;s.Houses=2;
        Assert.Null(Move(s,"BUILD",tile:1));Assert.Null(s.Auction);Assert.Equal(1,s.Houses);
    }

    private static MonopolyState ScarceStock(int stock=1)
    {
        var s=State();foreach(var i in new[]{1,3})s.Properties[i].Owner=0;
        foreach(var i in new[]{37,39})s.Properties[i].Owner=1;s.Houses=stock;
        return s;
    }

    [Fact]
    public void SoleInterestedBuyerPaysFaceValueWhenOtherEligibleOwnerDeclines()
    {
        var s=ScarceStock();Assert.Null(Move(s,"BUILD",tile:1));
        Assert.Equal("BuildingDemand",s.Phase);Assert.Equal(1,MonopolyRules.Actor(s));Assert.Equal(1500,s.Players[0].Cash);
        Assert.Null(Move(s,"SKIP_BUILD",1));
        Assert.Null(s.Auction);Assert.Null(s.BuildingDemand);Assert.Equal(1450,s.Players[0].Cash);
        Assert.Equal(1,s.Properties[1].Buildings);Assert.Equal(0,s.Houses);Assert.Equal("Roll",s.Phase);
    }

    [Fact]
    public void ConfirmedDemandWithinStockBuildsForAllBuyersAtTheirOwnDeedPrices()
    {
        var s=ScarceStock(2);foreach(var i in new[]{6,8,9})s.Properties[i].Owner=2;
        Assert.Null(Move(s,"BUILD",tile:1));Assert.Null(Move(s,"REQUEST_BUILD",1,37));
        Assert.Equal(2,MonopolyRules.Actor(s));Assert.Equal(1500,s.Players[0].Cash);Assert.Equal(2,s.Houses);
        Assert.Null(Move(s,"SKIP_BUILD",2));
        Assert.Null(s.Auction);Assert.Equal(1450,s.Players[0].Cash);Assert.Equal(1300,s.Players[1].Cash);
        Assert.Equal(1,s.Properties[1].Buildings);Assert.Equal(1,s.Properties[37].Buildings);Assert.Equal(0,s.Houses);
    }

    [Fact]
    public void AuctionExcludesOwnersWhoDidNotExpressDemand()
    {
        var s=ScarceStock();foreach(var i in new[]{6,8,9})s.Properties[i].Owner=2;
        Move(s,"BUILD",tile:1);Move(s,"SKIP_BUILD",1);Move(s,"REQUEST_BUILD",2,6);
        Assert.Equal("Auction",s.Phase);Assert.Equal(new[]{0,2},s.Auction!.EligibleTiles.Keys);
        Assert.Null(Move(s,"BID",amount:10));Assert.Equal(2,MonopolyRules.Actor(s));
        Assert.NotNull(Move(s,"BID",1,amount:20));
    }

    [Fact]
    public void DemandSurvivesSerializationAndResumesSuspendedPurchaseWithoutMovingTurn()
    {
        var s=ScarceStock();s.Turn=2;s.Phase="Buy";s.Players[2].Position=5;
        Move(s,"BUILD",tile:1);s=GameJson.Deserialize<MonopolyState>(GameJson.Serialize(s));
        Assert.Equal(1,MonopolyRules.Actor(s));Assert.Null(Move(s,"SKIP_BUILD",1));
        Assert.Equal(2,s.Turn);Assert.Equal("Buy",s.Phase);Assert.Null(s.Properties[5].Owner);
    }

    [Fact]
    public void PendingDemandFreezesAssetsAndRejectsIllegalDestinations()
    {
        var s=ScarceStock();Move(s,"BUILD",tile:1);
        Assert.NotNull(Move(s,"REQUEST_BUILD",1,1));Assert.NotNull(Move(s,"SKIP_BUILD",2));
        Assert.NotNull(Move(s,"MORTGAGE",1,37));Assert.NotNull(Move(s,"BUILD",tile:3));
        Assert.NotNull(MonopolyRules.Apply(_map,s,1,new MonopolyMove{Type="TRADE",Target=2},()=>1));
        Assert.Single(s.BuildingDemand!.Requests);Assert.Equal(1,MonopolyRules.Actor(s));
        Assert.Null(Move(s,"SKIP_BUILD",1));Assert.Equal(1450,s.Players[0].Cash);
    }

    [Fact]
    public void DemandTimeoutDeclinesPurchaseInsteadOfBiddingOrBuyingForAbsentPlayer()
    {
        var s=ScarceStock();Move(s,"BUILD",tile:1);
        var outcome=new MonopolyEngine().OnSeatTimedOut(GameJson.Serialize(_map),GameJson.Serialize(s),"P1");
        Assert.True(outcome.Ok);var next=GameJson.Deserialize<MonopolyState>(outcome.StateJson);
        Assert.Equal(1500,next.Players[1].Cash);Assert.Equal(1450,next.Players[0].Cash);
        Assert.Null(next.BuildingDemand);Assert.Equal("Roll",next.Phase);Assert.Null(next.Auction);
    }

    [Fact]
    public void OwnerWithOnlyAuctionStartingCashCanCompeteForTheLastHouse()
    {
        var s=ScarceStock();s.Players[1].Cash=10;
        Assert.Null(Move(s,"BUILD",tile:1));Assert.Null(Move(s,"REQUEST_BUILD",1,37));
        Assert.Equal("Auction",s.Phase);Assert.Null(Move(s,"PASS"));Assert.Null(Move(s,"BID",1,37,10));
        Assert.Equal(0,s.Players[1].Cash);Assert.Equal(1,s.Properties[37].Buildings);Assert.Equal(0,s.Houses);
    }

    [Fact]
    public void ConditionalAuctionInterestNeverBuysAtAnUnaffordableFacePriceWhenSupplyIsEnough()
    {
        var s=ScarceStock(2);s.Players[1].Cash=10;
        foreach(var i in new[]{6,8,9})s.Properties[i].Owner=2;
        Move(s,"BUILD",tile:1);Move(s,"REQUEST_BUILD",1,37);Move(s,"SKIP_BUILD",2);
        Assert.Equal("Roll",s.Phase);Assert.Null(s.Auction);Assert.Equal(1450,s.Players[0].Cash);
        Assert.Equal(10,s.Players[1].Cash);Assert.Equal(0,s.Properties[37].Buildings);Assert.Equal(1,s.Houses);
    }

    [Fact]
    public void UnderfundedInitiatorCanRequestScarceBuildingButCannotReceiveACheapUncontestedPurchase()
    {
        var s=ScarceStock();s.Players[0].Cash=10;
        Assert.Null(Move(s,"BUILD",tile:1));Assert.Equal("BuildingDemand",s.Phase);
        Assert.Null(Move(s,"SKIP_BUILD",1));Assert.Equal(10,s.Players[0].Cash);
        Assert.Equal(0,s.Properties[1].Buildings);Assert.Equal(1,s.Houses);Assert.Null(s.Auction);
    }

    [Fact]
    public void MortgageAndUnmortgageApplyTenPercentInterest()
    {
        var s=State(); s.Properties[1].Owner=0;
        Assert.Null(Move(s,"MORTGAGE",tile:1)); Assert.Equal(1530,s.Players[0].Cash);
        Assert.NotNull(Move(s,"MORTGAGE",tile:1));
        Assert.Null(Move(s,"UNMORTGAGE",tile:1)); Assert.Equal(1497,s.Players[0].Cash);
    }

    [Fact]
    public void AuctionIncludesDecliningPlayerAndSettlesHighestBid()
    {
        var s=State(); s.Players[0].Position=1; s.Phase="Buy";
        Assert.Null(Move(s,"DECLINE")); Assert.Equal(0,s.Auction?.Actor);
        Assert.Null(Move(s,"BID",amount:10)); Assert.Equal(1,s.Auction?.Actor);
        Assert.NotNull(Move(s,"BID",seat:1,amount:10));
        Assert.Null(Move(s,"BID",seat:1,amount:20));
        Assert.Null(Move(s,"PASS",seat:2)); Assert.Null(Move(s,"PASS"));
        Assert.Equal(1,s.Properties[1].Owner); Assert.Equal(1480,s.Players[1].Cash); Assert.Equal("End",s.Phase);
    }

    [Fact]
    public void AuctionAllPassLeavesPropertyInBank()
    {
        var s=State(); s.Phase="Buy"; s.Players[0].Position=3;
        Move(s,"DECLINE"); Move(s,"PASS"); Move(s,"PASS",1); Move(s,"PASS",2);
        Assert.Null(s.Properties[3].Owner); Assert.Null(s.Auction); Assert.Equal("End",s.Phase);
    }

    [Fact]
    public void DebtBlocksTurnAndAllowsMortgageThenSettlement()
    {
        var s=State(); s.Properties[3].Owner=1; s.Properties[3].Buildings=5;
        s.Properties[39].Owner=0; s.Players[0].Cash=300;
        Move(s,"ROLL",dice:[1,2]); Assert.Equal("Debt",s.Phase);
        Assert.NotNull(Move(s,"END")); Assert.NotNull(Move(s,"BANKRUPT"));
        Assert.Null(Move(s,"MORTGAGE",tile:39)); Assert.Null(Move(s,"SETTLE"));
        Assert.Equal(50,s.Players[0].Cash); Assert.Equal(1950,s.Players[1].Cash); Assert.Equal("End",s.Phase);
    }

    [Fact]
    public void BankruptcyToPlayerTransfersCashDeedsAndChargesMortgageInterest()
    {
        var s=State(); s.Players[0].Cash=5; s.Properties[1].Owner=0; s.Properties[1].Mortgaged=true;
        s.Properties[3].Owner=1; s.Properties[3].Buildings=5;
        Move(s,"ROLL",dice:[1,2]); Assert.Null(Move(s,"BANKRUPT"));
        Assert.True(s.Players[0].Bankrupt); Assert.Equal(1,s.Properties[1].Owner);
        Assert.Equal("Inheritance",s.Phase); Assert.Equal(1,MonopolyRules.Actor(s));
        Assert.Null(Move(s,"KEEP_INHERITED",1));
        Assert.Equal(1502,s.Players[1].Cash); Assert.Equal(1,s.Turn);
    }

    [Fact]
    public void BankruptcyToBankQueuesDeedsForAuction()
    {
        var s=State(); s.Players[0].Cash=0; s.Properties[1].Owner=0;
        Move(s,"ROLL",dice:[1,3]); Assert.Equal("Debt",s.Phase);
        Assert.Null(Move(s,"BANKRUPT")); Assert.Equal("Auction",s.Phase); Assert.Equal(1,s.Auction?.Tile);
        Assert.Null(s.Properties[1].Owner); Assert.True(s.Players[0].Bankrupt);
    }

    [Fact]
    public void LastSurvivorWins()
    {
        var s=State(2); s.Players[0].Cash=0; s.Properties[3].Owner=1; s.Properties[3].Buildings=5;
        Move(s,"ROLL",dice:[1,2]); Move(s,"BANKRUPT");
        Assert.Equal("P1",s.Winner); Assert.Equal("Finished",s.Phase);
    }

    private static MonopolyState InheritanceState(int count = 3)
    {
        var s=State(count);s.Phase="Inheritance";s.InheritanceResumePhase="End";
        s.Players[0].Bankrupt=true;s.Properties[1].Owner=1;s.Properties[1].Mortgaged=true;
        s.InheritedMortgages=[new InheritedMortgage(1,1)];s.Players[1].Cash=50;
        return s;
    }

    [Fact]
    public void InheritedMortgageImmediateRedemptionChargesPrincipalAndInterestOnlyOnce()
    {
        var s=InheritanceState();Assert.NotNull(Move(s,"REDEEM_INHERITED",2));
        Assert.Null(Move(s,"REDEEM_INHERITED",1));
        Assert.Equal(17,s.Players[1].Cash);Assert.False(s.Properties[1].Mortgaged);
        Assert.Empty(s.InheritedMortgages);Assert.Empty(s.Payments);Assert.Equal(1,s.Turn);Assert.Equal("Roll",s.Phase);
    }

    [Fact]
    public void KeepingInheritedMortgagePaysInterestNowAndAgainOnLaterRedemption()
    {
        var s=InheritanceState();Assert.Null(Move(s,"KEEP_INHERITED",1));
        Assert.Equal(47,s.Players[1].Cash);Assert.True(s.Properties[1].Mortgaged);
        Assert.Null(Move(s,"UNMORTGAGE",1,1));Assert.Equal(14,s.Players[1].Cash);
    }

    [Fact]
    public void MultipleInheritedMortgagesPreserveChoicesAndResumeAcrossJsonRoundTrip()
    {
        var s=InheritanceState();s.Players[1].Cash=100;s.Properties[3].Owner=1;s.Properties[3].Mortgaged=true;
        s.InheritedMortgages.Add(new InheritedMortgage(1,3));
        Assert.Null(Move(s,"KEEP_INHERITED",1));Assert.Equal("Inheritance",s.Phase);Assert.Equal(0,s.Turn);
        s=GameJson.Deserialize<MonopolyState>(GameJson.Serialize(s));
        Assert.Equal(3,Assert.Single(s.InheritedMortgages).Tile);Assert.Null(Move(s,"REDEEM_INHERITED",1));
        Assert.Equal(64,s.Players[1].Cash);Assert.Equal("Roll",s.Phase);Assert.Equal(1,s.Turn);
        Assert.True(s.Properties[1].Mortgaged);Assert.False(s.Properties[3].Mortgaged);
    }

    [Fact]
    public void InsufficientInheritanceRedemptionDoesNotConsumeChoice()
    {
        var s=InheritanceState();s.Players[1].Cash=5;
        Assert.NotNull(Move(s,"REDEEM_INHERITED",1));Assert.Single(s.InheritedMortgages);
        Assert.Equal(5,s.Players[1].Cash);Assert.Null(Move(s,"KEEP_INHERITED",1));Assert.Equal(2,s.Players[1].Cash);
    }

    [Fact]
    public void InheritanceInterestDebtCanBePaidByMortgagingAnotherProperty()
    {
        var s=InheritanceState();s.Players[1].Cash=0;s.Properties[39].Owner=1;
        Assert.Null(Move(s,"KEEP_INHERITED",1));Assert.Equal("Debt",s.Phase);Assert.Equal("Inheritance",s.ResumePhase);
        Assert.Null(Move(s,"MORTGAGE",1,39));Assert.Null(Move(s,"SETTLE",1));
        Assert.Equal(197,s.Players[1].Cash);Assert.Equal("Roll",s.Phase);Assert.Equal(1,s.Turn);
    }

    [Fact]
    public void UnpayableInheritanceInterestCanCauseBankruptcyAndBankAuctionWithoutStaleChoices()
    {
        var s=InheritanceState(4);s.Players[1].Cash=0;
        Assert.Null(Move(s,"KEEP_INHERITED",1));Assert.Null(Move(s,"BANKRUPT",1));
        Assert.True(s.Players[1].Bankrupt);Assert.Empty(s.InheritedMortgages);
        Assert.Equal("Auction",s.Phase);Assert.Equal(2,MonopolyRules.Actor(s));
        Assert.Null(Move(s,"PASS",2));Assert.Null(Move(s,"PASS",3));
        Assert.Equal(2,s.Turn);Assert.Equal("Roll",s.Phase);Assert.Null(s.Properties[1].Owner);
    }

    [Fact]
    public void UnresolvedInheritedDeedsCannotBeTradedOrNormallyUnmortgaged()
    {
        var s=InheritanceState();s.Players[1].Cash=0;
        s.Properties[3].Owner=1;s.Properties[3].Mortgaged=true;s.InheritedMortgages.Add(new InheritedMortgage(1,3));
        Assert.NotNull(Move(s,"UNMORTGAGE",1,1));
        Assert.NotNull(MonopolyRules.Apply(_map,s,1,new MonopolyMove{Type="TRADE",Target=2,Offered=[3]},()=>1));
        Assert.Null(Move(s,"KEEP_INHERITED",1));Assert.Equal("Debt",s.Phase);
        Assert.NotNull(MonopolyRules.Apply(_map,s,1,new MonopolyMove{Type="TRADE",Target=2,Offered=[3],CashRequested=10},()=>1));
        Assert.Equal(3,Assert.Single(s.InheritedMortgages).Tile);
    }

    [Fact]
    public void TimeoutKeepsInheritedMortgageAndChargesMandatoryInterest()
    {
        var s=InheritanceState();var outcome=new MonopolyEngine().OnSeatTimedOut(GameJson.Serialize(_map),GameJson.Serialize(s),"P1");
        Assert.True(outcome.Ok);var next=GameJson.Deserialize<MonopolyState>(outcome.StateJson);
        Assert.Equal(47,next.Players[1].Cash);Assert.True(next.Properties[1].Mortgaged);Assert.Equal("Roll",next.Phase);
    }

    [Fact]
    public void CashTradeHasNoInventedMillionLimitAndRejectsStorageOverflow()
    {
        var s=State();s.Players[0].Cash=1000005;
        Assert.Null(MonopolyRules.Apply(_map,s,0,new MonopolyMove{Type="TRADE",Target=1,CashOffered=1000001},()=>1));
        Assert.Null(Move(s,"ACCEPT",1));Assert.Equal(4,s.Players[0].Cash);Assert.Equal(1001501,s.Players[1].Cash);
        s=State();s.Players[1].Cash=int.MaxValue;
        Assert.NotNull(MonopolyRules.Apply(_map,s,0,new MonopolyMove{Type="TRADE",Target=1,CashOffered=1},()=>1));
        Assert.Null(s.Trade);Assert.Equal(int.MaxValue,s.Players[1].Cash);
    }

    [Fact]
    public void JailFreeCardLeavesDeckUntilUsedThenReturnsToBottom()
    {
        var s=State(); Move(s,"ROLL",dice:[3,4]);
        Assert.Equal("Chance",Assert.Single(s.Players[0].JailCards)); Assert.DoesNotContain(0,s.Chance);
        s.Phase="Roll"; s.Players[0].InJail=true;
        Move(s,"JAIL_CARD"); Assert.Empty(s.Players[0].JailCards); Assert.Equal(0,s.Chance[^1]);
        Assert.False(s.Players[0].InJail);
    }

    [Fact]
    public void ChanceBackThreeResolvesCommunityChest()
    {
        var s=State(); s.Players[0].Position=29; s.Chance=[8]; s.Chest=[2];
        Move(s,"ROLL",dice:[3,4]); Assert.Equal(33,s.Players[0].Position); Assert.Equal(1700,s.Players[0].Cash);
    }

    [Fact]
    public void ChanceRailroadDoubleRentAndUtilityFreshDice()
    {
        var s=State(); s.Chance=[5]; s.Properties[15].Owner=1;
        Move(s,"ROLL",dice:[3,4]); Assert.Equal(1450,s.Players[0].Cash);
        s=State(); s.Chance=[4]; s.Properties[12].Owner=1;
        Move(s,"ROLL",dice:[3,4,6,6]); Assert.Equal(1380,s.Players[0].Cash);
    }

    [Theory]
    [InlineData(0,7,1500)]
    [InlineData(1,0,1700)]
    [InlineData(2,24,1500)]
    [InlineData(3,11,1500)]
    [InlineData(4,12,1500)]
    [InlineData(5,15,1500)]
    [InlineData(6,15,1500)]
    [InlineData(7,7,1550)]
    [InlineData(8,4,1300)]
    [InlineData(9,10,1500)]
    [InlineData(10,7,1500)]
    [InlineData(11,7,1485)]
    [InlineData(12,5,1700)]
    [InlineData(13,39,1500)]
    [InlineData(14,7,1400)]
    [InlineData(15,7,1650)]
    public void EveryChanceCardResolvesItsClassicEffect(int card,int position,int cash)
    {
        var s=State();s.Chance=[card];Assert.Null(Move(s,"ROLL",dice:[3,4]));
        Assert.Equal(position,s.Players[0].Position);Assert.Equal(cash,s.Players[0].Cash);
        Assert.Equal(card==9,s.Players[0].InJail);Assert.NotEmpty(s.LastCard);
        Assert.Equal(card==0?0:1,s.Chance.Count);
    }

    [Theory]
    [InlineData(0,2,1500)]
    [InlineData(1,0,1700)]
    [InlineData(2,2,1700)]
    [InlineData(3,2,1450)]
    [InlineData(4,2,1550)]
    [InlineData(5,10,1500)]
    [InlineData(6,2,1600)]
    [InlineData(7,2,1520)]
    [InlineData(8,2,1520)]
    [InlineData(9,2,1600)]
    [InlineData(10,2,1400)]
    [InlineData(11,2,1450)]
    [InlineData(12,2,1525)]
    [InlineData(13,2,1500)]
    [InlineData(14,2,1510)]
    [InlineData(15,2,1600)]
    public void EveryCommunityChestCardResolvesItsClassicEffect(int card,int position,int cash)
    {
        var s=State();s.Chest=[card];Assert.Null(Move(s,"ROLL",dice:[1,1]));
        Assert.Equal(position,s.Players[0].Position);Assert.Equal(cash,s.Players[0].Cash);
        Assert.Equal(card==5,s.Players[0].InJail);Assert.NotEmpty(s.LastCard);
        Assert.Equal(card==0?0:1,s.Chest.Count);
    }

    [Theory]
    [InlineData(true,1300)]
    [InlineData(false,1225)]
    public void RepairCardsChargeHotelsOnceInsteadOfFiveHouses(bool chance,int cash)
    {
        var s=State();s.Properties[1].Owner=0;s.Properties[1].Buildings=4;
        s.Properties[3].Owner=0;s.Properties[3].Buildings=5;
        if(chance){s.Chance=[10];Move(s,"ROLL",dice:[3,4]);}
        else{s.Chest=[13];Move(s,"ROLL",dice:[1,1]);}
        Assert.Equal(cash,s.Players[0].Cash);
    }

    [Fact]
    public void BirthdayDebtRequiresOtherPlayerToActWithoutChangingTurn()
    {
        var s=State(); s.Chest=[8]; s.Players[1].Cash=0; s.Properties[1].Owner=1;
        Move(s,"ROLL",dice:[1,1]); Assert.Equal("Debt",s.Phase); Assert.Equal(1,MonopolyRules.Actor(s));
        Assert.NotNull(Move(s,"SETTLE")); Assert.Null(Move(s,"MORTGAGE",seat:1,tile:1));
        Assert.Null(Move(s,"SETTLE",seat:1)); Assert.Equal(1520,s.Players[0].Cash); Assert.Equal(0,s.Turn);
    }

    [Fact]
    public void TradeRequiresRecipientConsentAndPaysMortgageInterest()
    {
        var s=State(); s.Properties[1].Owner=0; s.Properties[1].Mortgaged=true; s.Properties[3].Owner=1;
        var trade=new MonopolyMove {Type="TRADE",Target=1,Offered=[1],Requested=[3],CashRequested=50};
        Assert.Null(MonopolyRules.Apply(_map,s,0,trade,()=>1));
        Assert.Equal(0,s.Properties[1].Owner); Assert.NotNull(Move(s,"ACCEPT"));
        Assert.Null(Move(s,"ACCEPT",seat:1)); Assert.Equal(1,s.Properties[1].Owner); Assert.Equal(0,s.Properties[3].Owner);
        Assert.Equal(1550,s.Players[0].Cash); Assert.Equal(1447,s.Players[1].Cash); Assert.Equal("Roll",s.Phase);
    }

    [Fact]
    public void TradeRejectsDuplicateAssetsAndImprovedGroups()
    {
        var s=State(); s.Properties[1].Owner=0;
        Assert.NotNull(MonopolyRules.Apply(_map,s,0,new MonopolyMove {Type="TRADE",Target=1,Offered=[1,1]},()=>1));
        s.Properties[3].Owner=0; s.Properties[3].Buildings=1;
        Assert.NotNull(MonopolyRules.Apply(_map,s,0,new MonopolyMove {Type="TRADE",Target=1,Offered=[1]},()=>1));
    }

    [Fact]
    public void TradingOutOfTurnRestoresThePendingPurchaseAndTurn()
    {
        var s=State();s.Phase="Buy";s.Players[0].Position=3;
        Assert.Null(MonopolyRules.Apply(_map,s,2,new MonopolyMove{Type="TRADE",Target=1,CashOffered=5},()=>1));
        Assert.Equal(1,MonopolyRules.Actor(s)); Assert.Null(Move(s,"ACCEPT",1));
        Assert.Equal("Buy",s.Phase);Assert.Equal(0,s.Turn);Assert.Null(Move(s,"BUY"));
    }

    [Fact]
    public void DebtorCanSellAPropertyByTradeThenSettleAndResumeOriginalPhase()
    {
        var s=State();s.Players[0].Cash=0;s.Properties[39].Owner=0;
        Move(s,"ROLL",dice:[1,3]);Assert.Equal("Debt",s.Phase);
        Assert.Null(MonopolyRules.Apply(_map,s,0,new MonopolyMove{Type="TRADE",Target=1,Offered=[39],CashRequested=250},()=>1));
        Assert.Null(Move(s,"ACCEPT",1)); Assert.Equal("Debt",s.Phase);
        Assert.Null(Move(s,"SETTLE"));Assert.Equal(50,s.Players[0].Cash);Assert.Equal("End",s.Phase);
        Assert.Equal(1,s.Properties[39].Owner);
    }

    [Fact]
    public void RejectedDebtTradePreservesDebtResumePhase()
    {
        var s=State();s.Phase="Debt";s.ResumePhase="End";s.Payments=[new Payment(0,null,100)];
        Assert.Null(MonopolyRules.Apply(_map,s,0,new MonopolyMove{Type="TRADE",Target=1},()=>1));
        Assert.Null(Move(s,"REJECT",1));Assert.Equal("Debt",s.Phase);
        Assert.Null(Move(s,"SETTLE"));Assert.Equal("End",s.Phase);
    }

    [Fact]
    public void JailFreeCardsCanTradeWithoutReturningToDeck()
    {
        var s=State();s.Chance.Remove(0);s.Players[0].JailCards.Add("Chance");
        var offer=new MonopolyMove{Type="TRADE",Target=1,OfferedCards=["Chance"],CashRequested=20};
        Assert.Null(MonopolyRules.Apply(_map,s,0,offer,()=>1));Assert.Null(Move(s,"ACCEPT",1));
        Assert.Empty(s.Players[0].JailCards);Assert.Equal("Chance",Assert.Single(s.Players[1].JailCards));
        Assert.DoesNotContain(0,s.Chance);Assert.Equal(1520,s.Players[0].Cash);
        s.Turn=1;s.Players[1].InJail=true;Assert.Null(Move(s,"JAIL_CARD",1));Assert.Equal(0,s.Chance[^1]);
    }

    [Theory]
    [InlineData("Chance")]
    [InlineData("unknown")]
    public void CannotTradeJailCardsYouDoNotOwn(string card)
    {
        var s=State();Assert.NotNull(MonopolyRules.Apply(_map,s,0,new MonopolyMove{Type="TRADE",Target=1,OfferedCards=[card]},()=>1));
        Assert.Null(s.Trade);
    }

    [Fact]
    public void BothTradePartiesCanRedeemReceivedMortgagesImmediately()
    {
        var s=State();s.Properties[1].Owner=0;s.Properties[1].Mortgaged=true;
        s.Properties[3].Owner=1;s.Properties[3].Mortgaged=true;
        var offer=new MonopolyMove{Type="TRADE",Target=1,Offered=[1],Requested=[3],RedeemRequested=true};
        Assert.Null(MonopolyRules.Apply(_map,s,0,offer,()=>1));
        Assert.Null(MonopolyRules.Apply(_map,s,1,new MonopolyMove{Type="ACCEPT",RedeemReceived=true},()=>1));
        Assert.False(s.Properties[1].Mortgaged);Assert.False(s.Properties[3].Mortgaged);
        Assert.Equal(1467,s.Players[0].Cash);Assert.Equal(1467,s.Players[1].Cash);
    }

    [Fact]
    public void ImmediateRedemptionRejectsInsufficientCashButKeepingMortgageRemainsPossible()
    {
        var s=State();s.Properties[39].Owner=0;s.Properties[39].Mortgaged=true;s.Players[1].Cash=20;
        Assert.Null(MonopolyRules.Apply(_map,s,0,new MonopolyMove{Type="TRADE",Target=1,Offered=[39]},()=>1));
        Assert.NotNull(MonopolyRules.Apply(_map,s,1,new MonopolyMove{Type="ACCEPT",RedeemReceived=true},()=>1));
        Assert.Null(Move(s,"ACCEPT",1));Assert.Equal(0,s.Players[1].Cash);Assert.True(s.Properties[39].Mortgaged);
    }

    [Theory]
    [InlineData("null")]
    [InlineData("{bad")]
    [InlineData("[]")]
    [InlineData("{\"type\":\"BID\",\"amount\":2147483648}")]
    public void MalformedMoveReturnsFailureWithoutThrowing(string json)
    {
        var engine=new MonopolyEngine(); var state=GameJson.Serialize(State());
        var outcome=engine.ApplyMove(GameJson.Serialize(_map),state,"P0",json);
        Assert.False(outcome.Ok); Assert.Equal(state,outcome.StateJson);
    }

    [Fact]
    public void DeckOrderNeverSentToAnyViewer()
    {
        var engine=new MonopolyEngine(); var state=GameJson.Serialize(State());
        foreach(var side in new string?[]{null,"P0","P1"})
        {
            var visible=GameJson.Element(engine.RedactStateForViewer(state,side));
            Assert.False(visible.TryGetProperty("chance",out _)); Assert.False(visible.TryGetProperty("chest",out _));
            Assert.Equal(3,visible.GetProperty("players").GetArrayLength());
        }
        Assert.Equal(16,GameJson.Deserialize<MonopolyState>(state).Chance.Count);
    }

    [Fact]
    public void TimeoutDeclinesPurchaseAndPassesAuction()
    {
        var engine=new MonopolyEngine(); var s=State(); s.Phase="Buy"; s.Players[0].Position=1;
        var outcome=engine.OnSeatTimedOut(GameJson.Serialize(_map),GameJson.Serialize(s),"P0");
        Assert.True(outcome.Ok); var next=GameJson.Deserialize<MonopolyState>(outcome.StateJson);
        Assert.Equal("Auction",next.Phase);
        outcome=engine.OnSeatTimedOut(GameJson.Serialize(_map),outcome.StateJson,$"P{next.Auction?.Actor}");
        Assert.True(outcome.Ok); Assert.Contains(0,GameJson.Deserialize<MonopolyState>(outcome.StateJson).Auction!.Passed);
    }

    [Fact]
    public void HotelCanBeLiquidatedWhenBankCannotSupplyFourReplacementHouses()
    {
        var s=State(); s.Properties[1].Owner=0; s.Properties[3].Owner=0;
        s.Properties[1].Buildings=5; s.Properties[3].Buildings=4; s.Houses=0; s.Hotels=11;
        Assert.NotNull(Move(s,"SELL",tile:1));
        Assert.Null(Move(s,"SELL_GROUP",tile:1));
        Assert.Equal(0,s.Properties[1].Buildings); Assert.Equal(0,s.Properties[3].Buildings);
        Assert.Equal(4,s.Houses); Assert.Equal(12,s.Hotels); Assert.Equal(1725,s.Players[0].Cash);
    }

    [Fact]
    public void TimeoutCanLiquidateHotelGroupAndPayDebt()
    {
        var s=State();s.Phase="Debt";s.ResumePhase="End";s.Players[0].Cash=0;
        s.Properties[1].Owner=0;s.Properties[3].Owner=0;s.Properties[1].Buildings=5;s.Properties[3].Buildings=5;
        s.Houses=0;s.Hotels=10;s.Payments=[new Payment(0,null,100)];
        var outcome=new MonopolyEngine().OnSeatTimedOut(GameJson.Serialize(_map),GameJson.Serialize(s),"P0");
        Assert.True(outcome.Ok);
        var next=GameJson.Deserialize<MonopolyState>(outcome.StateJson);
        Assert.Empty(next.Payments); Assert.Equal("End",next.Phase); Assert.Equal(150,next.Players[0].Cash);
    }

    [Theory]
    [InlineData(17)]
    [InlineData(42)]
    [InlineData(934)]
    public void CompleteSimulatedGamesPreserveStockDecksAndMoneyInvariantsAcrossSerialization(int seed)
    {
        var random=new Random(seed);
        var s=MonopolyRules.Start(["A","B","C","D"],random.Next);
        var actions=0;
        while(s.Winner==null && actions++<15000)
        {
            var seat=MonopolyRules.Actor(s);
            if(s.Phase=="Roll")
            {
                // Cooperative test policy buys missing deeds at twice face value to complete sets;
                // without trading, classic games can legitimately continue indefinitely.
                foreach(var tile in _map.Tiles.Where(t=>t.Kind=="Street" && s.Properties[t.Index].Owner is int owner && owner!=seat
                    && s.Properties[t.Index].Buildings==0 && _map.Tiles.Any(other=>other.Group==t.Group && s.Properties[other.Index].Owner==seat)))
                {
                    var seller=s.Properties[tile.Index].Owner!.Value;
                    var offered=new MonopolyMove{Type="TRADE",Target=seller,Requested=[tile.Index],CashOffered=tile.Price*2};
                    if(MonopolyRules.Apply(_map,s,seat,offered,()=>random.Next(1,7))==null)
                        Assert.Null(MonopolyRules.Apply(_map,s,seller,new MonopolyMove{Type="ACCEPT"},()=>random.Next(1,7)));
                }
                foreach(var tile in _map.Tiles.Where(t=>s.Properties[t.Index].Owner==seat && t.Kind=="Street"))
                    MonopolyRules.Apply(_map,s,seat,new MonopolyMove{Type="BUILD",Tile=tile.Index},()=>random.Next(1,7));
            }
            seat=MonopolyRules.Actor(s);
            var move=new MonopolyMove{Type=s.Phase switch
            {
                "Roll"=>"ROLL", "End"=>"END", "Buy"=>s.Players[seat].Cash>=_map.Tiles[s.Players[seat].Position].Price ? "BUY" : "DECLINE",
                "Auction"=>"PASS", "BuildingDemand"=>"SKIP_BUILD", "Trade"=>"REJECT", "Debt"=>"SETTLE", "Inheritance"=>"KEEP_INHERITED", _=>throw new Exception(s.Phase)
            }};
            if(s.Phase=="Debt" && s.Players[seat].Cash<s.Payments[0].Amount)
            {
                foreach(var tile in _map.Tiles.Where(t=>s.Properties[t.Index].Owner==seat))
                    MonopolyRules.Apply(_map,s,seat,new MonopolyMove{Type="SELL_GROUP",Tile=tile.Index},()=>random.Next(1,7));
                foreach(var tile in _map.Tiles.Where(t=>s.Properties[t.Index].Owner==seat))
                    MonopolyRules.Apply(_map,s,seat,new MonopolyMove{Type="MORTGAGE",Tile=tile.Index},()=>random.Next(1,7));
                move.Type=s.Players[seat].Cash>=s.Payments[0].Amount ? "SETTLE" : "BANKRUPT";
            }
            var error=MonopolyRules.Apply(_map,s,seat,move,()=>random.Next(1,7));
            Assert.Null(error);
            s=GameJson.Deserialize<MonopolyState>(GameJson.Serialize(s));
            Assert.All(s.Players,p=>Assert.True(p.Cash>=0));
            Assert.Equal(32,s.Houses+s.Properties.Sum(p=>p.Buildings<5?p.Buildings:0));
            Assert.Equal(12,s.Hotels+s.Properties.Count(p=>p.Buildings==5));
            Assert.Equal(16,s.Chance.Count+s.Players.Sum(p=>p.JailCards.Count(c=>c=="Chance")));
            Assert.Equal(16,s.Chest.Count+s.Players.Sum(p=>p.JailCards.Count(c=>c=="Chest")));
            Assert.All(s.Properties,p=>Assert.InRange(p.Buildings,0,5));
            Assert.All(s.Properties.Where(p=>p.Owner!=null),p=>Assert.False(s.Players[p.Owner!.Value].Bankrupt));
        }
        Assert.NotNull(s.Winner);
        Assert.Single(s.Players,p=>!p.Bankrupt);
    }
}
