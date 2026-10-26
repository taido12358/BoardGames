namespace BoardGame.Api.Games.Monopoly;

public record Tile(int Index, string Name, string Kind, string Group = "", int Price = 0,
    int HouseCost = 0, int[]? Rents = null);

public class MonopolyMap
{
    public string Edition { get; set; } = MonopolyEdition.Name;
    public string RulesetId { get; set; } = MonopolyEdition.Id;
    public int AuctionMinimumBid { get; set; } = MonopolyEdition.AuctionMinimumBid;
    public Tile[] Tiles { get; set; } = MonopolyBoard.Create();
}

public class Player
{
    public string Name { get; set; } = "";
    public int Position { get; set; }
    public int Cash { get; set; } = 1500;
    public bool Bankrupt { get; set; }
    public bool InJail { get; set; }
    public int JailAttempts { get; set; }
    public List<string> JailCards { get; set; } = [];
}

public class Property
{
    public int? Owner { get; set; }
    public int Buildings { get; set; }
    public bool Mortgaged { get; set; }
}

public record Payment(int From, int? To, int Amount);
public record InheritedMortgage(int Owner, int Tile);
public class BuildingDemand
{
    public string Kind { get; set; } = "House";
    public int Actor { get; set; }
    public string ResumePhase { get; set; } = "Roll";
    public Dictionary<int, int[]> EligibleTiles { get; set; } = [];
    public Dictionary<int, int> Requests { get; set; } = [];
    public List<int> Responded { get; set; } = [];
}
public class Auction
{
    public string Kind { get; set; } = "Property";
    public int Tile { get; set; }
    public int Bid { get; set; }
    public int? Leader { get; set; }
    public int Actor { get; set; }
    public List<int> Passed { get; set; } = [];
    public Dictionary<int, int[]> EligibleTiles { get; set; } = [];
    public int LeaderTile { get; set; } = -1;
    public string ResumePhase { get; set; } = "End";
}

public class Trade
{
    public int From { get; set; }
    public int To { get; set; }
    public int CashOffered { get; set; }
    public int CashRequested { get; set; }
    public int[] Offered { get; set; } = [];
    public int[] Requested { get; set; } = [];
    public string[] OfferedCards { get; set; } = [];
    public string[] RequestedCards { get; set; } = [];
    public bool RedeemRequested { get; set; }
}

public class MonopolyState
{
    public int Version { get; set; } = 1;
    public bool Started { get; set; }
    public List<Player> Players { get; set; } = [];
    public Property[] Properties { get; set; } = Enumerable.Range(0, 40).Select(_ => new Property()).ToArray();
    public int Turn { get; set; }
    public string Phase { get; set; } = "Roll";
    public int[] Dice { get; set; } = [0, 0];
    public int[]? UtilityDice { get; set; }
    public int Doubles { get; set; }
    public bool ExtraRoll { get; set; }
    public int Houses { get; set; } = 32;
    public int Hotels { get; set; } = 12;
    public List<int> Chance { get; set; } = [];
    public List<int> Chest { get; set; } = [];
    public List<Payment> Payments { get; set; } = [];
    public List<InheritedMortgage> InheritedMortgages { get; set; } = [];
    public string InheritanceResumePhase { get; set; } = "End";
    public string ResumePhase { get; set; } = "End";
    public int DeferredMove { get; set; }
    public Auction? Auction { get; set; }
    public BuildingDemand? BuildingDemand { get; set; }
    public List<int> AuctionQueue { get; set; } = [];
    public Trade? Trade { get; set; }
    public string TradeResumePhase { get; set; } = "Roll";
    public string? Winner { get; set; }
    public string LastCard { get; set; } = "";
    public List<string> Log { get; set; } = [];
}

public class MonopolyMove
{
    public string Type { get; set; } = "";
    public int Tile { get; set; } = -1;
    public int Amount { get; set; }
    public int Target { get; set; } = -1;
    public int CashOffered { get; set; }
    public int CashRequested { get; set; }
    public int[] Offered { get; set; } = [];
    public int[] Requested { get; set; } = [];
    public string[] OfferedCards { get; set; } = [];
    public string[] RequestedCards { get; set; } = [];
    public bool RedeemRequested { get; set; }
    public bool RedeemReceived { get; set; }
}
