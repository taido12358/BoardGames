using System.Text.Json;
using BoardGame.Api.Games.Monopoly;
using BoardGame.Api.Platform;

namespace BoardGame.Api.Tests.Monopoly;

/// <summary>Golden values transcribed from the frozen Hasbro PDF, not generated from game code.</summary>
public class MonopolySourceAuditTests
{
    private static JsonElement Facts() => GameJson.Element(File.ReadAllText(
        Path.Combine(AppContext.BaseDirectory, "Monopoly", "Fixtures", "c1009-2016.json")));

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(4)]
    public void RailroadScheduleMatchesPrintedReadingDeedAndOwnershipTable(int owned)
    {
        var sample = Facts().GetProperty("railroadSample");
        var map = new MonopolyMap();
        var index = sample.GetProperty("index").GetInt32();
        Assert.Equal(sample.GetProperty("name").GetString(), map.Tiles[index].Name);
        Assert.Equal(sample.GetProperty("price").GetInt32(), map.Tiles[index].Price);
        var state = new MonopolyState();
        foreach (var tile in map.Tiles.Where(tile => tile.Kind == "Railroad").Take(owned))
            state.Properties[tile.Index].Owner = 0;
        Assert.Equal(sample.GetProperty("rentsByOwnedCount")[owned - 1].GetInt32(),
            MonopolyRules.Rent(map, state, index, 7));
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    public void UtilityPricesAndRentFactorsMatchPrintedSpacesAndUtilityDeed(int owned)
    {
        var facts = Facts();
        var map = new MonopolyMap();
        var state = new MonopolyState();
        var utilities = facts.GetProperty("utilitySamples").EnumerateArray().ToArray();
        foreach (var sample in utilities)
        {
            var tile = map.Tiles[sample.GetProperty("index").GetInt32()];
            Assert.Equal(sample.GetProperty("name").GetString(), tile.Name);
            Assert.Equal(sample.GetProperty("price").GetInt32(), tile.Price);
        }
        foreach (var sample in utilities.Take(owned)) state.Properties[sample.GetProperty("index").GetInt32()].Owner = 0;
        var factor = facts.GetProperty("utilityMultipliersByOwnedCount")[owned - 1].GetInt32();
        for (var dice = 2; dice <= 12; dice++)
            Assert.Equal(factor * dice, MonopolyRules.Rent(map, state, utilities[0].GetProperty("index").GetInt32(), dice));
    }

    [Fact]
    public void ComponentCountsAndPrintedColorSetRentsMatchFrozenPdf()
    {
        var facts = Facts();
        var map = new MonopolyMap();
        Assert.Equal(facts.GetProperty("titleDeeds").GetInt32(), map.Tiles.Count(tile => tile.Kind is "Street" or "Railroad" or "Utility"));
        var random = new Random(420);
        var started = MonopolyRules.Start(["An", "Binh"], random.Next);
        Assert.Equal(facts.GetProperty("chanceCards").GetInt32(), started.Chance.Count);
        Assert.Equal(facts.GetProperty("chestCards").GetInt32(), started.Chest.Count);
        foreach (var sample in facts.GetProperty("deedSamples").EnumerateArray())
        {
            var index = sample.GetProperty("index").GetInt32();
            var state = new MonopolyState();
            if (sample.TryGetProperty("price", out var price)) Assert.Equal(price.GetInt32(), map.Tiles[index].Price);
            foreach (var tile in map.Tiles.Where(tile => tile.Kind == "Street" && tile.Group == map.Tiles[index].Group))
                state.Properties[tile.Index].Owner = 0;
            Assert.Equal(sample.GetProperty("colorSetRent").GetInt32(), MonopolyRules.Rent(map, state, index, 7));
        }
    }
}
