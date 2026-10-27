namespace BoardGame.Api.Games.Monopoly;

/// <summary>Frozen ruleset: Hasbro C1009 US board, copyright 2016, instruction print February 2017.</summary>
public static class MonopolyEdition
{
    public const string Id = "classic-us-c1009-2016";
    public const string Name = "Classic US C1009 (2016/2017)";
    public const string InstructionsUrl = "https://instructions.hasbro.com/api/download/C1009_en-my_monopoly-classic-game.pdf";
    public const int MinPlayers = 2;
    public const int MaxPlayers = 6;
    public const int AuctionMinimumBid = 10;
}
