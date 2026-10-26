using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BoardGame.Api.Platform;
using BoardGame.Api.Data;
using BoardGame.Api.Games.Monopoly;
using BoardGame.Api.Platform.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace BoardGame.Api.Tests.Platform.Auth;

/// <summary>
/// Test HTTP tích hợp cho <see cref="Platform.GamesController"/> — cùng hạ tầng
/// <see cref="AuthApiFactory"/> đã dựng cho <see cref="AuthControllerIntegrationTests"/>/
/// <see cref="AdminControllerIntegrationTests"/>. Trước đây sảnh chờ chỉ được verify ở 2 tầng:
/// logic khoá hàng thuần qua <c>RoomServiceIntegrationTests</c> (bỏ qua HTTP/[Authorize]) và
/// live-test thủ công qua Docker Compose (không tự động, không chạy trong CI) — controller thật
/// (routing, model binding, 401 khi thiếu cookie, JSON shape trả về) chưa từng có test tự động.
///
/// KHÔNG test <c>GET /api/games/search</c> ở đây — endpoint đó gọi thẳng OpenSearch thật, không
/// có try/catch phòng thủ (khác mọi endpoint khác trong controller này), nên cần OpenSearch chạy
/// thật mới test có ý nghĩa — đã có live-test thủ công riêng cho việc đó (xem
/// rules/coding/testing.md mục "Live-test nhiều người chơi thật").
/// </summary>
[Collection("AuthApi")]
public class GamesControllerIntegrationTests
{
    private readonly AuthApiFactory _factory;

    public GamesControllerIntegrationTests(AuthApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Engines_ReturnsAllRegisteredGamesIncludingMonopoly()
    {
        using var client = await _factory.LoggedInClientAsync();

        var res = await client.GetAsync("/api/games/engines");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement[]>();
        var keys = body!.Select(e => e.GetProperty("key").GetString()).ToHashSet();
        Assert.Equal(new HashSet<string?> { "vaybat", "bang", "oanquan", "zodiacrace", "monopoly" }, keys);
    }

    [Fact]
    public async Task Engines_WithoutAuth_ReturnsUnauthorized()
    {
        using var anonClient = _factory.CreateClient();

        var res = await anonClient.GetAsync("/api/games/engines");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Create_ValidGameKey_ReturnsRoomWithCallerSeatedAsOwner()
    {
        using var client = await _factory.LoggedInClientAsync();

        var res = await client.PostAsJsonAsync("/api/games", new { gameKey = "vaybat" });

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var room = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("vaybat", room.GetProperty("gameKey").GetString());
        Assert.Equal("Waiting", room.GetProperty("status").GetString());
        Assert.True(room.GetProperty("isMine").GetBoolean());
    }

    [Fact]
    public async Task Create_UnknownGameKey_ReturnsBadRequest()
    {
        using var client = await _factory.LoggedInClientAsync();

        var res = await client.PostAsJsonAsync("/api/games", new { gameKey = "khong-ton-tai" });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Create_MissingGameKey_ReturnsBadRequest()
    {
        using var client = await _factory.LoggedInClientAsync();

        var res = await client.PostAsJsonAsync("/api/games", new { });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Create_WithoutAuth_ReturnsUnauthorized()
    {
        using var anonClient = _factory.CreateClient();

        var res = await anonClient.PostAsJsonAsync("/api/games", new { gameKey = "vaybat" });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Get_ExistingRoom_ReturnsRoomVisibleToOwner()
    {
        using var client = await _factory.LoggedInClientAsync();
        var created = await (await client.PostAsJsonAsync("/api/games", new { gameKey = "vaybat" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();

        var res = await client.GetAsync($"/api/games/{id}");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var room = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(id, room.GetProperty("id").GetGuid());
        Assert.True(room.GetProperty("isMine").GetBoolean());
    }

    [Fact]
    public async Task Get_NonExistentRoom_ReturnsNotFound()
    {
        using var client = await _factory.LoggedInClientAsync();

        var res = await client.GetAsync($"/api/games/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Cancel_OwnerCancelsWaitingRoom_ReturnsOkAndRoomDisappearsFromList()
    {
        using var client = await _factory.LoggedInClientAsync();
        var created = await (await client.PostAsJsonAsync("/api/games", new { gameKey = "vaybat" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();

        var res = await client.PostAsync($"/api/games/{id}/cancel", null);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var rooms = await (await client.GetAsync("/api/games")).Content.ReadFromJsonAsync<JsonElement[]>();
        Assert.DoesNotContain(rooms!, r => r.GetProperty("id").GetGuid() == id);
    }

    [Fact]
    public async Task Cancel_NotOwner_ReturnsForbidden()
    {
        using var owner = await _factory.LoggedInClientAsync();
        using var other = await _factory.LoggedInClientAsync();
        var created = await (await owner.PostAsJsonAsync("/api/games", new { gameKey = "vaybat" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();

        var res = await other.PostAsync($"/api/games/{id}/cancel", null);

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Cancel_NonExistentRoom_ReturnsNotFound()
    {
        using var client = await _factory.LoggedInClientAsync();

        var res = await client.PostAsync($"/api/games/{Guid.NewGuid()}/cancel", null);

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task QuickMatch_TwoDifferentUsers_JoinTheSameRoomAndItBecomesPlaying()
    {
        using var first = await _factory.LoggedInClientAsync();
        using var second = await _factory.LoggedInClientAsync();

        var room1 = await (await first.PostAsJsonAsync("/api/games/quick-match", new { gameKey = "vaybat" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var room2 = await (await second.PostAsJsonAsync("/api/games/quick-match", new { gameKey = "vaybat" }))
            .Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(room1.GetProperty("id").GetGuid(), room2.GetProperty("id").GetGuid());
        Assert.Equal("Playing", room2.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Replay_ExistingUnfinishedRoomReturnsNotFoundWithoutReadingArchive()
    {
        // Existing unfinished rooms are rejected from PostgreSQL before any archive access.
        // The unreachable MinIO configured by AuthApiFactory must not turn this into 503.
        using var client = await _factory.LoggedInClientAsync();
        var created = await (await client.PostAsJsonAsync("/api/games", new { gameKey = "vaybat" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();

        var res = await client.GetAsync($"/api/games/{id}/replay");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Replay_WithoutAuth_ReturnsUnauthorized()
    {
        using var anonClient = _factory.CreateClient();

        var res = await anonClient.GetAsync($"/api/games/{Guid.NewGuid()}/replay");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Replay_FinishedMonopolyServesPublicSnapshotsFromDatabaseWithoutArchive()
    {
        using var owner=await _factory.LoggedInClientAsync();
        using var opponent=await _factory.LoggedInClientAsync();
        var user=await (await opponent.GetAsync("/api/auth/me")).Content.ReadFromJsonAsync<JsonElement>();
        var created=await (await owner.PostAsJsonAsync("/api/games",new{gameKey="monopoly",options=new{seatCount=2}})).Content.ReadFromJsonAsync<JsonElement>();
        var id=created.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NotFound,(await owner.GetAsync($"/api/games/{id}/replay")).StatusCode);
        using(var scope=_factory.Services.CreateScope())
        {
            var rooms=scope.ServiceProvider.GetRequiredService<RoomService>();
            await rooms.JoinRoomAsync(id,user.GetProperty("id").GetGuid(),"Bob");
            var db=scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var room=await db.GameRooms.FindAsync(id);Assert.NotNull(room);
            var state=GameJson.Deserialize<MonopolyState>(room.StateJson);
            state.Players[1].Bankrupt=true;state.Winner="P0";state.Phase="Finished";state.Dice=[3,4];
            room.StateJson=GameJson.Serialize(state);room.Status=RoomStatus.Finished;room.Winner="P0";
            db.GameMoves.Add(new GameMove{RoomId=id,MoveNumber=2,Side="P1",MoveJson="{\"type\":\"BANKRUPT\"}",ReplayStateJson=new MonopolyEngine().CreatePublicReplaySnapshot(room.StateJson)});
            await db.SaveChangesAsync();
        }
        var response=await owner.GetAsync($"/api/games/{id}/replay");
        Assert.Equal(HttpStatusCode.OK,response.StatusCode);
        var replay=await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2,replay.GetProperty("moves").GetArrayLength());
        Assert.False(replay.GetProperty("finalState").TryGetProperty("chance",out _));
        Assert.All(replay.GetProperty("moves").EnumerateArray(),m=>Assert.False(m.GetProperty("state").TryGetProperty("chest",out _)));
        Assert.Equal(3,replay.GetProperty("finalState").GetProperty("dice")[0].GetInt32());
    }

    [Fact]
    public async Task List_ReturnsCreatedWaitingRoom()
    {
        using var client = await _factory.LoggedInClientAsync();
        var created = await (await client.PostAsJsonAsync("/api/games", new { gameKey = "bang" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();

        var res = await client.GetAsync("/api/games?gameKey=bang");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var rooms = await res.Content.ReadFromJsonAsync<JsonElement[]>();
        Assert.Contains(rooms!, r => r.GetProperty("id").GetGuid() == id);
    }
}
