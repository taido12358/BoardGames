using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using BoardGame.Api.Data;
using BoardGame.Api.Games.Monopoly;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Auth;
using BoardGame.Api.Platform.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;
using StackExchange.Redis;

namespace BoardGame.Api.Tests.Platform.Auth;

[Collection("AuthApi")]
public class MonopolyHostRestartTests(AuthApiFactory factory)
{
    [Fact]
    public void RedisConnectionHonorsExplicitTimeoutAndRetryConfiguration()
    {
        var actual = ConfigurationOptions.Parse(factory.Services.GetRequiredService<IConnectionMultiplexer>().Configuration);
        Assert.Equal(50, actual.ConnectTimeout);
        Assert.Equal(1, actual.ConnectRetry);
    }

    [Theory]
    [InlineData("HouseDemand")]
    [InlineData("HotelDemand")]
    [InlineData("HouseAuction")]
    [InlineData("HotelAuction")]
    [InlineData("PropertyAuction")]
    [InlineData("Debt")]
    [InlineData("Inheritance")]
    public async Task ActualProcessCrashRestoresPendingDecisionAndContinuesWithoutDuplicateMoves(string scenario)
    {
        await using var game = await RestartGame.CreateAsync(factory, scenario);
        var before = await game.ReadStateAsync();
        var (privateBefore, mapBefore) = await game.ReadPersistedAsync();
        var decksBefore = GameJson.Deserialize<MonopolyState>(privateBefore);
        Assert.Equal(15, decksBefore.Chance.Count);
        Assert.Equal(15, decksBefore.Chest.Count);
        Assert.Contains("Chance", decksBefore.Players[0].JailCards);
        Assert.Contains("Chest", decksBefore.Players[1].JailCards);
        var frames = await game.MoveCountAsync();
        var oldPid = game.Host.ProcessId;
        await game.CrashAndStartAsync();
        Assert.NotEqual(oldPid, game.Host.ProcessId);
        await game.ConnectAllAsync();
        foreach (var socket in game.Sockets)
        {
            Assert.True(JsonNode.DeepEquals(JsonNode.Parse(before), JsonNode.Parse(socket.Room!.Value.GetProperty("state").GetRawText())));
            Assert.False(socket.Room.Value.GetProperty("state").TryGetProperty("chance", out _));
            Assert.False(socket.Room.Value.GetProperty("state").TryGetProperty("chest", out _));
            Assert.True(JsonNode.DeepEquals(JsonNode.Parse(mapBefore), JsonNode.Parse(socket.Room.Value.GetProperty("map").GetRawText())));
        }
        var (privateAfter, mapAfter) = await game.ReadPersistedAsync();
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(privateBefore), JsonNode.Parse(privateAfter)), "Private deck order and held cards must survive the process crash.");
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(mapBefore), JsonNode.Parse(mapAfter)));
        Assert.Equal(frames, await game.MoveCountAsync());
        if (scenario.EndsWith("Demand"))
        {
            await game.MoveAsync(1, new { type = "SKIP_BUILD" });
            Assert.Equal(1450, (await game.ReadAsync()).Players[0].Cash);
        }
        else if (scenario == "PropertyAuction")
        {
            await game.MoveAsync(1, new { type = "BID", amount = 11 });
            await game.MoveAsync(0, new { type = "PASS" });
            var result = await game.ReadAsync();
            Assert.Equal(1489, result.Players[1].Cash);
            Assert.Equal(1500, result.Players[0].Cash);
            Assert.Equal(1, result.Properties[5].Owner);
        }
        else if (scenario.EndsWith("Auction"))
        {
            await game.MoveAsync(0, new { type = "BID", amount = 10, tile = 1 });
            await game.MoveAsync(1, new { type = "PASS" });
            Assert.Equal(1490, (await game.ReadAsync()).Players[0].Cash);
        }
        else if (scenario == "Debt")
        {
            await game.MoveAsync(1, new { type = "MORTGAGE", tile = 5 });
            await game.MoveAsync(1, new { type = "SETTLE" });
            var result = await game.ReadAsync();
            Assert.Equal(50, result.Players[1].Cash);
            Assert.True(result.Properties[5].Mortgaged);
            Assert.Empty(result.Payments);
        }
        else
        {
            await game.MoveAsync(1, new { type = "KEEP_INHERITED" });
            var result = await game.ReadAsync();
            Assert.Equal(1490, result.Players[1].Cash);
            Assert.True(result.Properties[5].Mortgaged);
            Assert.Empty(result.InheritedMortgages);
        }
        var final = await game.ReadAsync();
        Assert.Equal(scenario is "Debt" or "Inheritance" or "PropertyAuction" ? "End" : "Roll", final.Phase);
        Assert.Equal(32, final.Houses + final.Properties.Sum(p => p.Buildings < 5 ? p.Buildings : 0));
        Assert.Equal(12, final.Hotels + final.Properties.Count(p => p.Buildings == 5));
        Assert.Equal(frames + (scenario.EndsWith("Auction") || scenario == "Debt" ? 2 : 1), await game.MoveCountAsync());
        Assert.All(game.Sockets, socket => Assert.Empty(socket.Errors));
    }

    [Fact]
    public async Task CrashMarksAbsentSeatOfflineAndRealChildScannerResolvesPendingDemand()
    {
        await using var game = await RestartGame.CreateAsync(factory, "HouseDemand");
        await game.CrashAndStartAsync();
        using (var db = game.NewDbContext())
        {
            var room = await db.GameRooms.SingleAsync(r => r.Id == game.Id);
            var seats = SeatCodec.SeatsOf(room);
            // Crash bypasses OnDisconnected. A stale persisted Connected=true must expire too.
            Assert.True(seats[1]!.Connected);
            seats[1] = seats[1]! with { LastSeenAt = DateTime.UtcNow.AddMinutes(-2) };
            SeatCodec.SetSeats(room, seats);
            await db.SaveChangesAsync();
        }
        // The absent buyer never reconnects. The child host's actual background scanner must act.
        await game.ConnectAsync(0); await game.ConnectAsync(2);
        foreach (var socket in game.Sockets)
        {
            var room = await socket.WaitForRoomAsync(r => r.GetProperty("state").GetProperty("phase").GetString() == "Roll");
            Assert.Equal(1450, room.GetProperty("state").GetProperty("players")[0].GetProperty("cash").GetInt32());
        }
        Assert.Equal("Roll", (await game.ReadAsync()).Phase);
        Assert.Equal(3, await game.MoveCountAsync()); // room-full, BUILD, real timeout
    }

    private sealed class RestartGame(KestrelTestHost host, string[] tokens, Guid id, PostgreSqlContainer postgres) : IAsyncDisposable
    {
        public Guid Id { get; } = id;
        public KestrelTestHost Host { get; } = host;
        public List<TestHubClient> Sockets { get; } = [];

        public static async Task<RestartGame> CreateAsync(AuthApiFactory factory, string scenario)
        {
            var tokens = new List<string>();
            for (var index = 0; index < 3; index++)
            {
                using var login = await factory.LoggedInClientAsync();
                var me = await (await login.GetAsync("/api/auth/me")).Content.ReadFromJsonAsync<JsonElement>();
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var user = await db.Users.SingleAsync(u => u.Id == me.GetProperty("id").GetGuid());
                tokens.Add(scope.ServiceProvider.GetRequiredService<TokenService>().CreateToken(user));
            }
            // The parent TestServer's background scanner must not be able to resolve this room.
            // Only the real child process can touch this isolated PostgreSQL database.
            var postgres = new PostgreSqlBuilder("postgres:16-alpine").Build();
            await postgres.StartAsync();
            var host = new KestrelTestHost(postgres.GetConnectionString(), factory.Services.GetRequiredService<IConfiguration>());
            try
            {
                await host.StartAsync();
                using var client = new HttpClient { BaseAddress = host.BaseAddress };
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens[0]);
                var response = await client.PostAsJsonAsync("/api/games", new { gameKey = "monopoly", options = new { seatCount = 2 } });
                response.EnsureSuccessStatusCode();
                var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
                var game = new RestartGame(host, tokens.ToArray(), id, postgres);
                await game.ConnectAllAsync();
                await game.ArrangeAsync(scenario);
                if (scenario == "PropertyAuction")
                {
                    await game.MoveAsync(0, new { type = "DECLINE" });
                    await game.MoveAsync(0, new { type = "BID", amount = 10 });
                }
                else if (scenario.EndsWith("Demand") || scenario.EndsWith("Auction"))
                {
                    await game.MoveAsync(0, new { type = "BUILD", tile = 1 });
                    if (scenario.EndsWith("Auction")) await game.MoveAsync(1, new { type = "REQUEST_BUILD", tile = 37 });
                }
                return game;
            }
            catch { await host.DisposeAsync(); await postgres.DisposeAsync(); throw; }
        }

        public async Task ConnectAsync(int index)
        {
            var socket = await TestHubClient.ConnectAsync(Host.HubAddress, tokens[index]);
            Sockets.Add(socket);
            await socket.InvokeAsync("JoinRoom", Id.ToString());
            Assert.Equal(index < 2 ? $"P{index}" : null, socket.Side);
        }
        public async Task ConnectAllAsync() { for (var index = 0; index < 3; index++) await ConnectAsync(index); }
        public async Task CrashAndStartAsync()
        {
            await Host.CrashAsync();
            foreach (var socket in Sockets) { socket.Abort(); await socket.DisposeAsync(); }
            Sockets.Clear();
            await Host.StartAsync();
        }
        public async Task MoveAsync(int actor, object move)
        {
            await Sockets[actor].InvokeAsync("MakeMove", Id.ToString(), GameJson.Serialize(move));
            Assert.Empty(Sockets[actor].Errors);
        }
        public async Task<string> ReadStateAsync()
        {
            using var client = new HttpClient { BaseAddress = Host.BaseAddress };
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens[0]);
            var room = await client.GetFromJsonAsync<JsonElement>($"/api/games/{Id}");
            return room.GetProperty("state").GetRawText();
        }
        public async Task<MonopolyState> ReadAsync() => GameJson.Deserialize<MonopolyState>(await ReadStateAsync());
        public AppDbContext NewDbContext() => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(postgres.GetConnectionString()).Options);
        public async Task<(string State, string Map)> ReadPersistedAsync()
        {
            using var db = NewDbContext();
            var room = await db.GameRooms.AsNoTracking().SingleAsync(room => room.Id == Id);
            return (room.StateJson, room.MapJson);
        }
        public async Task<int> MoveCountAsync()
        {
            using var db = NewDbContext();
            return await db.GameMoves.CountAsync(m => m.RoomId == Id);
        }
        private async Task ArrangeAsync(string scenario)
        {
            using var db = NewDbContext();
            var room = await db.GameRooms.SingleAsync(r => r.Id == Id);
            var state = GameJson.Deserialize<MonopolyState>(room.StateJson);
            // Persist a nontrivial deck state: each jail-free card is held outside its pile.
            state.Chance.Remove(0); state.Players[0].JailCards.Add("Chance");
            state.Chest.Remove(0); state.Players[1].JailCards.Add("Chest");
            if (scenario is "Debt" or "Inheritance")
            {
                state.Turn = 1; state.ResumePhase = "End"; state.Phase = scenario;
                state.Properties[5].Owner = 1;
                if (scenario == "Debt") { state.Players[1].Cash = 0; state.Payments = [new Payment(1, null, 50)]; }
                else { state.Properties[5].Mortgaged = true; state.InheritedMortgages = [new InheritedMortgage(1, 5)]; }
            }
            else if (scenario == "PropertyAuction")
            {
                state.Turn = 0; state.Phase = "Buy"; state.Players[0].Position = 5;
            }
            else ArrangeScarceBuildings(state, scenario.StartsWith("Hotel"));
            room.StateJson = GameJson.Serialize(state); await db.SaveChangesAsync();
        }
        private static void ArrangeScarceBuildings(MonopolyState state, bool hotel)
        {
            state.Turn = 0; state.Phase = "Roll";
            foreach (var index in new[] { 1, 3 }) { state.Properties[index].Owner = 0; state.Properties[index].Buildings = hotel ? 4 : 0; }
            foreach (var index in new[] { 37, 39 }) { state.Properties[index].Owner = 1; state.Properties[index].Buildings = hotel ? 4 : 0; }
            foreach (var tile in new MonopolyMap().Tiles.Where(t => t.Kind == "Street" && t.Group is not ("Brown" or "DarkBlue"))) state.Properties[tile.Index].Owner = 0;
            if (hotel)
            {
                foreach (var index in new[] { 6, 8, 9, 11, 13, 14, 16, 18, 19, 21, 23 }) state.Properties[index].Buildings = 5;
                state.Properties[24].Buildings = 4;
            }
            else
            {
                foreach (var index in new[] { 6, 8, 9, 11, 13, 14 }) state.Properties[index].Buildings = 4;
                state.Properties[16].Buildings = 3; state.Properties[18].Buildings = 2; state.Properties[19].Buildings = 2;
            }
            state.Houses = 32 - state.Properties.Sum(p => p.Buildings < 5 ? p.Buildings : 0);
            state.Hotels = 12 - state.Properties.Count(p => p.Buildings == 5);
        }
        public async ValueTask DisposeAsync()
        {
            await Host.CrashAsync();
            foreach (var socket in Sockets) { socket.Abort(); await socket.DisposeAsync(); }
            await postgres.DisposeAsync();
        }
    }
}
