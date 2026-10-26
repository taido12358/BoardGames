using System.Net.Http.Json;
using System.Text.Json;
using BoardGame.Api.Data;
using BoardGame.Api.Games.Monopoly;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Auth;
using BoardGame.Api.Platform.Models;
using BoardGame.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace BoardGame.Api.Tests.Platform.Auth;

[Collection("AuthApi")]
public class MonopolyHubIntegrationTests(AuthApiFactory factory)
{
    [Fact]
    public async Task SeatChatAndRematchEventsIdentifyTheirSourceRoomForPlayersAndSpectators()
    {
        await using var game = await HubGame.CreateAsync(factory);
        foreach (var socket in game.Sockets)
        {
            var seated = await socket.WaitForEventAsync("Seated", e => e.GetProperty("roomId").GetGuid() == game.Id);
            Assert.Equal(socket.Side, seated.GetProperty("side").GetString());
        }
        await game.Sockets[1].InvokeAsync("SendChatMessage", game.Id.ToString(), "Tin đúng phòng");
        foreach (var socket in game.Sockets)
        {
            var chat = await socket.WaitForEventAsync("ChatMessageReceived", e => e.GetProperty("text").GetString() == "Tin đúng phòng");
            Assert.Equal(game.Id, chat.GetProperty("roomId").GetGuid());
        }
        var next = await game.CreateAnotherRoomAsync();
        await game.Sockets[0].InvokeAsync("AnnounceRematch", game.Id.ToString(), next.ToString());
        foreach (var socket in game.Sockets.Skip(1))
        {
            var invite = await socket.WaitForEventAsync("RematchAvailable", e => e.GetProperty("newRoomId").GetGuid() == next);
            Assert.Equal(game.Id, invite.GetProperty("oldRoomId").GetGuid());
        }
        Assert.All(game.Sockets, socket => Assert.Empty(socket.Errors));
    }

    [Fact]
    public async Task ReconnectRestoresPendingBuildingDecisionAndSameSeat()
    {
        await using var game=await HubGame.CreateAsync(factory);
        await game.ArrangeScarceBuildingAsync(false);
        await game.Sockets[0].InvokeAsync("MakeMove",game.Id.ToString(),"{\"type\":\"BUILD\",\"tile\":1}");
        await game.WaitForPhaseAsync("BuildingDemand");
        await game.Sockets[1].DisposeAsync();
        await using var restored=await game.ConnectAdditionalAsync(1);
        await restored.InvokeAsync("JoinRoom",game.Id.ToString());
        Assert.Equal("P1",restored.Side);
        Assert.Equal("BuildingDemand",restored.Room!.Value.GetProperty("state").GetProperty("phase").GetString());
        await restored.InvokeAsync("MakeMove",game.Id.ToString(),"{\"type\":\"SKIP_BUILD\"}");
        var final=await game.Sockets[0].WaitForRoomAsync(r=>r.GetProperty("state").GetProperty("phase").GetString()=="Roll");
        Assert.Equal(1450,final.GetProperty("state").GetProperty("players")[0].GetProperty("cash").GetInt32());
        Assert.Empty(restored.Errors);
    }

    [Fact]
    public async Task TimeoutScannerDeclinesAbsentBuyersDemandAndBroadcastsThePersistedOutcome()
    {
        await using var game=await HubGame.CreateAsync(factory);
        await game.ArrangeScarceBuildingAsync(true);
        await game.Sockets[0].InvokeAsync("MakeMove",game.Id.ToString(),"{\"type\":\"BUILD\",\"tile\":1}");
        await game.WaitForPhaseAsync("BuildingDemand");
        await game.Sockets[1].InvokeAsync("LeaveRoom",game.Id.ToString());
        using(var scope=factory.Services.CreateScope())
        {
            var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var room=await db.GameRooms.FindAsync(game.Id);Assert.NotNull(room);
            var seats=SeatCodec.SeatsOf(room);var departed=seats[1];Assert.NotNull(departed);Assert.False(departed.Connected);
            seats[1]=departed with{LastSeenAt=DateTime.UtcNow.AddMinutes(-2)};
            SeatCodec.SetSeats(room,seats);await db.SaveChangesAsync();
        }
        var scanner=new SeatTimeoutService(factory.Services.GetRequiredService<IServiceScopeFactory>(),NullLogger<SeatTimeoutService>.Instance);
        await scanner.ScanOnceAsync(CancellationToken.None);
        foreach(var index in new[]{0,2})
        {
            var observed=await game.Sockets[index].WaitForRoomAsync(r=>r.GetProperty("state").GetProperty("phase").GetString()=="Roll");
            Assert.Equal(1450,observed.GetProperty("state").GetProperty("players")[0].GetProperty("cash").GetInt32());
            Assert.Equal(5,observed.GetProperty("state").GetProperty("properties")[1].GetProperty("buildings").GetInt32());
            Assert.False(observed.GetProperty("state").TryGetProperty("chance",out _));
        }
        using var verify=factory.Services.CreateScope();var context=verify.ServiceProvider.GetRequiredService<AppDbContext>();
        var moves=await context.GameMoves.AsNoTracking().Where(m=>m.RoomId==game.Id).OrderBy(m=>m.MoveNumber).ToListAsync();
        Assert.Equal(3,moves.Count);Assert.Equal("__seat_timeout__",GameJson.Element(moves[^1].MoveJson).GetProperty("type").GetString());
        Assert.Equal("Roll",GameJson.Element(moves[^1].ReplayStateJson!).GetProperty("phase").GetString());
    }

    [Fact]
    public async Task SwitchingRoomOnSameConnectionDisconnectsOldSeatAndDetachesOldChat()
    {
        await using var game=await HubGame.CreateAsync(factory);
        var next=await game.CreateAnotherRoomAsync();
        await game.Sockets[0].InvokeAsync("JoinRoom",next.ToString());
        using var scope=factory.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var oldRoom=await db.GameRooms.AsNoTracking().SingleAsync(r=>r.Id==game.Id);
        var newRoom=await db.GameRooms.AsNoTracking().SingleAsync(r=>r.Id==next);
        Assert.False(SeatCodec.SeatsOf(oldRoom)[0]!.Connected);Assert.True(SeatCodec.SeatsOf(newRoom)[0]!.Connected);
        await game.Sockets[1].WaitForRoomAsync(r=>r.GetProperty("id").GetGuid()==game.Id&&!r.GetProperty("seats")[0].GetProperty("connected").GetBoolean());
        await game.Sockets[0].InvokeAsync("SendChatMessage",game.Id.ToString(),"Không còn ở phòng cũ");
        Assert.Single(game.Sockets[0].Errors);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ConfirmedHouseAndHotelCompetitionRejectsSpectatorAndSettlesAuctionAcrossViewers(bool hotel)
    {
        await using var game=await HubGame.CreateAsync(factory);
        await game.ArrangeScarceBuildingAsync(hotel);
        await game.Sockets[0].InvokeAsync("MakeMove",game.Id.ToString(),"{\"type\":\"BUILD\",\"tile\":1}");
        await game.WaitForPhaseAsync("BuildingDemand");
        await game.Sockets[2].InvokeAsync("MakeMove",game.Id.ToString(),"{\"type\":\"REQUEST_BUILD\",\"tile\":37}");
        Assert.Single(game.Sockets[2].Errors);game.Sockets[2].Errors.Clear();
        await game.Sockets[1].InvokeAsync("MakeMove",game.Id.ToString(),"{\"type\":\"REQUEST_BUILD\",\"tile\":37}");
        var auction=await game.WaitForPhaseAsync("Auction");
        Assert.All(auction,r=>Assert.Equal(hotel?"Hotel":"House",r.GetProperty("state").GetProperty("auction").GetProperty("kind").GetString()));
        await game.Sockets[0].InvokeAsync("MakeMove",game.Id.ToString(),"{\"type\":\"BID\",\"amount\":10,\"tile\":1}");
        await game.Sockets[1].InvokeAsync("MakeMove",game.Id.ToString(),"{\"type\":\"BID\",\"amount\":11,\"tile\":37}");
        await game.Sockets[0].InvokeAsync("MakeMove",game.Id.ToString(),"{\"type\":\"PASS\"}");
        var final=await game.WaitForPhaseAsync("Roll");
        var first=final[0].GetProperty("state").GetRawText();
        Assert.All(final,r=>
        {
            var s=r.GetProperty("state");Assert.Equal(first,s.GetRawText());
            AssertBankInventory(s);
            Assert.Equal(1489,s.GetProperty("players")[1].GetProperty("cash").GetInt32());
            Assert.Equal(hotel?5:1,s.GetProperty("properties")[37].GetProperty("buildings").GetInt32());
            Assert.Equal(0,s.GetProperty(hotel?"hotels":"houses").GetInt32());
        });
        Assert.All(game.Sockets,s=>Assert.Empty(s.Errors));
    }

    [Fact]
    public async Task LeavingRoomMarksSeatDisconnectedWhileHubConnectionStaysOpen()
    {
        await using var game=await HubGame.CreateAsync(factory);
        await game.Sockets[0].InvokeAsync("LeaveRoom",game.Id.ToString());
        using var scope=factory.Services.CreateScope();
        var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var room=await db.GameRooms.AsNoTracking().SingleAsync(r=>r.Id==game.Id);
        Assert.False(SeatCodec.SeatsOf(room)[0]!.Connected);
        var observed=await game.Sockets[1].WaitForRoomAsync(r=>!r.GetProperty("seats")[0].GetProperty("connected").GetBoolean());
        Assert.Equal("Playing",observed.GetProperty("status").GetString());
        await game.Sockets[0].InvokeAsync("JoinRoom",game.Id.ToString());
        Assert.Equal("P0",game.Sockets[0].Side);
        Assert.True(game.Sockets[0].Room!.Value.GetProperty("seats")[0].GetProperty("connected").GetBoolean());
    }

    [Fact]
    public async Task WrongRoomLeaveIsRejectedAndDoesNotDetachTheActualRoom()
    {
        await using var game=await HubGame.CreateAsync(factory);
        await game.Sockets[0].InvokeAsync("LeaveRoom",Guid.NewGuid().ToString());
        Assert.Single(game.Sockets[0].Errors);
        await game.Sockets[0].InvokeAsync("SendChatMessage",game.Id.ToString(),"Vẫn còn trong phòng");
        Assert.Single(game.Sockets[0].Errors); // chat succeeds only while the connection remains tracked
    }

    [Fact]
    public async Task SeatRemainsConnectedUntilLastTabLeaves()
    {
        await using var game=await HubGame.CreateAsync(factory);
        await using var secondTab=await game.ConnectAdditionalAsync(0);
        await secondTab.InvokeAsync("JoinRoom",game.Id.ToString());
        await game.Sockets[0].InvokeAsync("LeaveRoom",game.Id.ToString());
        using(var scope=factory.Services.CreateScope())
        {
            var room=await scope.ServiceProvider.GetRequiredService<AppDbContext>().GameRooms.AsNoTracking().SingleAsync(r=>r.Id==game.Id);
            Assert.True(SeatCodec.SeatsOf(room)[0]!.Connected);
        }
        await secondTab.InvokeAsync("LeaveRoom",game.Id.ToString());
        using var verify=factory.Services.CreateScope();
        var persisted=await verify.ServiceProvider.GetRequiredService<AppDbContext>().GameRooms.AsNoTracking().SingleAsync(r=>r.Id==game.Id);
        Assert.False(SeatCodec.SeatsOf(persisted)[0]!.Connected);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ScarceHouseAndHotelDemandUsesRealHubAndPersistsPublicOutcomes(bool hotel)
    {
        await using var game = await HubGame.CreateAsync(factory);
        await game.ArrangeScarceBuildingAsync(hotel);
        await game.Sockets[0].InvokeAsync("MakeMove", game.Id.ToString(), "{\"type\":\"BUILD\",\"tile\":1}");
        foreach (var socket in game.Sockets)
        {
            var room = await socket.WaitForRoomAsync(r => r.GetProperty("state").GetProperty("phase").GetString() == "BuildingDemand");
            var state = room.GetProperty("state");
            AssertBankInventory(state);
            Assert.Equal(hotel ? "Hotel" : "House", state.GetProperty("buildingDemand").GetProperty("kind").GetString());
            Assert.False(state.TryGetProperty("chance", out _)); Assert.False(state.TryGetProperty("chest", out _));
            Assert.Equal(1500, state.GetProperty("players")[0].GetProperty("cash").GetInt32());
        }
        await game.Sockets[1].InvokeAsync("MakeMove", game.Id.ToString(), "{\"type\":\"SKIP_BUILD\"}");
        foreach (var socket in game.Sockets)
        {
            var room = await socket.WaitForRoomAsync(r => r.GetProperty("state").GetProperty("phase").GetString() == "Roll");
            Assert.Equal(1450, room.GetProperty("state").GetProperty("players")[0].GetProperty("cash").GetInt32());
            Assert.Equal(hotel ? 5 : 1, room.GetProperty("state").GetProperty("properties")[1].GetProperty("buildings").GetInt32());
        }
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var persisted = await db.GameRooms.AsNoTracking().SingleAsync(r => r.Id == game.Id);
        Assert.Equal(1450, GameJson.Deserialize<MonopolyState>(persisted.StateJson).Players[0].Cash);
        var moves = await db.GameMoves.Where(m => m.RoomId == game.Id).OrderBy(m => m.MoveNumber).ToListAsync();
        Assert.Equal(3, moves.Count);
        Assert.Equal("BuildingDemand", GameJson.Element(moves[1].ReplayStateJson!).GetProperty("phase").GetString());
        Assert.All(game.Sockets, socket => Assert.Empty(socket.Errors));
        Assert.Null(game.Sockets[2].Side);
    }

    private static void AssertBankInventory(JsonElement json)
    {
        var state=GameJson.Deserialize<MonopolyState>(json.GetRawText());
        Assert.Equal(32,state.Houses+state.Properties.Sum(p=>p.Buildings<5?p.Buildings:0));
        Assert.Equal(12,state.Hotels+state.Properties.Count(p=>p.Buildings==5));
    }

    private sealed class HubGame(AuthApiFactory factory, Guid id, HttpClient[] clients, TestHubClient[] sockets) : IAsyncDisposable
    {
        public Guid Id { get; } = id;
        public TestHubClient[] Sockets { get; } = sockets;

        public static async Task<HubGame> CreateAsync(AuthApiFactory factory)
        {
            var clients = new HttpClient[3];
            var sockets = new List<TestHubClient>();
            try
            {
                for (var i = 0; i < clients.Length; i++) clients[i] = await factory.LoggedInClientAsync();
                var response = await clients[0].PostAsJsonAsync("/api/games", new { gameKey = "monopoly", options = new { seatCount = 2 } });
                response.EnsureSuccessStatusCode();
                var created = await response.Content.ReadFromJsonAsync<JsonElement>();
                var id = created.GetProperty("id").GetGuid();
                foreach (var client in clients)
                {
                    var socket = await ConnectAsync(factory,client);
                    sockets.Add(socket);
                    await socket.InvokeAsync("JoinRoom", id.ToString());
                }
                return new HubGame(factory, id, clients, sockets.ToArray());
            }
            catch
            {
                foreach (var socket in sockets) await socket.DisposeAsync();
                foreach (var client in clients) client?.Dispose();
                throw;
            }
        }

        public Task<TestHubClient> ConnectAdditionalAsync(int seat) => ConnectAsync(factory,clients[seat]);

        public async Task<Guid> CreateAnotherRoomAsync()
        {
            var response=await clients[0].PostAsJsonAsync("/api/games",new{gameKey="monopoly",options=new{seatCount=2}});
            response.EnsureSuccessStatusCode();
            return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        }

        public Task<JsonElement[]> WaitForPhaseAsync(string phase) => Task.WhenAll(Sockets.Select(socket=>
            socket.WaitForRoomAsync(r=>r.GetProperty("state").GetProperty("phase").GetString()==phase)));

        private static async Task<TestHubClient> ConnectAsync(AuthApiFactory factory,HttpClient client)
        {
            var user=await (await client.GetAsync("/api/auth/me")).Content.ReadFromJsonAsync<JsonElement>();
            var userId=user.GetProperty("id").GetGuid();
            using var scope=factory.Services.CreateScope();
            var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var account=await db.Users.SingleAsync(u=>u.Id==userId);
            var token=scope.ServiceProvider.GetRequiredService<TokenService>().CreateToken(account);
            return await TestHubClient.ConnectAsync(factory.Server,token);
        }

        public async Task ArrangeAsync(Action<MonopolyState> arrange)
        {
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var room = await db.GameRooms.FindAsync(Id) ?? throw new InvalidOperationException("Missing scenario room");
            var state = GameJson.Deserialize<MonopolyState>(room.StateJson);
            arrange(state); room.StateJson = GameJson.Serialize(state); room.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        public Task ArrangeScarceBuildingAsync(bool hotel)=>ArrangeAsync(state=>
        {
            state.Turn=0;state.Phase="Roll";
            foreach(var i in new[]{1,3}){state.Properties[i].Owner=0;state.Properties[i].Buildings=hotel?4:0;}
            foreach(var i in new[]{37,39}){state.Properties[i].Owner=1;state.Properties[i].Buildings=hotel?4:0;}
            // Account for every physical building: shortages must be reachable board states,
            // not just an artificially decremented bank counter.
            foreach(var tile in new MonopolyMap().Tiles.Where(t=>t.Kind=="Street" && t.Group is not ("Brown" or "DarkBlue")))
                state.Properties[tile.Index].Owner=0;
            if(hotel)
            {
                foreach(var i in new[]{6,8,9,11,13,14,16,18,19,21,23})state.Properties[i].Buildings=5;
                state.Properties[24].Buildings=4;
            }
            else
            {
                foreach(var i in new[]{6,8,9,11,13,14})state.Properties[i].Buildings=4;
                state.Properties[16].Buildings=3;state.Properties[18].Buildings=2;state.Properties[19].Buildings=2;
            }
            state.Houses=32-state.Properties.Sum(p=>p.Buildings<5?p.Buildings:0);
            state.Hotels=12-state.Properties.Count(p=>p.Buildings==5);
        });

        public async ValueTask DisposeAsync()
        {
            foreach (var socket in Sockets.Reverse()) await socket.DisposeAsync();
            foreach (var client in clients) client.Dispose();
            // The shared TestServer outlives each scenario. Retire this scenario so its normal
            // background scanner cannot keep playing a disposed fixture during later tests.
            using var scope=factory.Services.CreateScope();
            var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
            // CloseAsync can finish before OnDisconnectedAsync finishes its own seat update.
            // Update the scenario status atomically rather than racing its UpdatedAt token.
            await db.GameRooms.Where(r=>r.Id==Id&&(r.Status==RoomStatus.Playing||r.Status==RoomStatus.Waiting))
                .ExecuteUpdateAsync(update=>update.SetProperty(r=>r.Status,RoomStatus.Abandoned)
                    .SetProperty(r=>r.UpdatedAt,DateTime.UtcNow));
        }
    }
}
