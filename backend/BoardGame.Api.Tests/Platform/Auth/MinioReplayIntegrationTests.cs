using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using BoardGame.Api.Data;
using BoardGame.Api.Games.Monopoly;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Auth;
using BoardGame.Api.Services;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Images;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BoardGame.Api.Tests.Platform.Auth;

/// <summary>Real object storage, isolated containers and test-owned rows; never deletes development games.</summary>
[Collection("AuthApi")]
public class MinioReplayIntegrationTests(AuthApiFactory factory) : IAsyncLifetime
{
    private readonly IContainer _minio = new ContainerBuilder("boardgames/minio:2025-10-15")
        .WithImagePullPolicy(PullPolicy.Never)
        .WithPortBinding(9000, true)
        .WithEnvironment("MINIO_ROOT_USER", "minioadmin")
        .WithEnvironment("MINIO_ROOT_PASSWORD", "minioadmin")
        .WithCommand("server", "/data")
        .WithWaitStrategy(Wait.ForUnixContainer().UntilHttpRequestIsSucceeded(request => request
            .ForPort(9000).ForPath("/minio/health/ready")))
        .Build();
    private WebApplicationFactory<Program> _app = null!;

    public async Task InitializeAsync()
    {
        await _minio.StartAsync();
        _app = factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Minio:Endpoint"] = $"{_minio.Hostname}:{_minio.GetMappedPublicPort(9000)}",
                ["Minio:AccessKey"] = "minioadmin",
                ["Minio:SecretKey"] = "minioadmin",
            })));
    }

    public async Task DisposeAsync()
    {
        if (_app is not null) await _app.DisposeAsync();
        await _minio.DisposeAsync();
    }

    private async Task<string> NewTokenAsync()
    {
        using var login = await factory.LoggedInClientAsync();
        var user = await (await login.GetAsync("/api/auth/me")).Content.ReadFromJsonAsync<JsonElement>();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var account = await db.Users.SingleAsync(u => u.Id == user.GetProperty("id").GetGuid());
        return scope.ServiceProvider.GetRequiredService<TokenService>().CreateToken(account);
    }

    [Fact]
    public async Task FinishedMonopolyArchiveMatchesDatabaseAndSurvivesRemovalOfTestOwnedRoom()
    {
        var ownerToken = await NewTokenAsync();
        var opponentToken = await NewTokenAsync();
        using var client = _app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var response = await client.PostAsJsonAsync("/api/games", new { gameKey = "monopoly", options = new { seatCount = 2 } });
        response.EnsureSuccessStatusCode();
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await using var owner = await TestHubClient.ConnectAsync(_app.Server, ownerToken);
        await using var opponent = await TestHubClient.ConnectAsync(_app.Server, opponentToken);
        await owner.InvokeAsync("JoinRoom", id.ToString());
        await opponent.InvokeAsync("JoinRoom", id.ToString());
        using (var scope = _app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var room = await db.GameRooms.SingleAsync(r => r.Id == id);
            var state = GameJson.Deserialize<MonopolyState>(room.StateJson);
            // A deterministic insolvent debtor; the actual hub/engine must finish and archive the game.
            state.Turn = 1; state.Phase = "Debt"; state.Players[1].Cash = 0;
            state.Payments = [new Payment(1, null, 200)];
            room.StateJson = GameJson.Serialize(state);
            await db.SaveChangesAsync();
        }
        await opponent.InvokeAsync("MakeMove", id.ToString(), "{\"type\":\"BANKRUPT\"}");
        Assert.Empty(opponent.Errors);
        var fromDb = await client.GetStringAsync($"/api/games/{id}/replay");
        using (var scope = _app.Services.CreateScope())
        {
            var archive = await scope.ServiceProvider.GetRequiredService<MinioStorageService>().GetReplayAsync($"replay-{id}.json");
            Assert.NotNull(archive);
            Assert.True(JsonNode.DeepEquals(JsonNode.Parse(fromDb), JsonNode.Parse(archive)));
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.GameMoves.Where(m => m.RoomId == id).ExecuteDeleteAsync();
            await db.GameRooms.Where(r => r.Id == id).ExecuteDeleteAsync();
        }
        var archivedResponse = await client.GetAsync($"/api/games/{id}/replay");
        Assert.Equal(HttpStatusCode.OK, archivedResponse.StatusCode);
        var archived = await archivedResponse.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(fromDb), JsonNode.Parse(archived.GetRawText())));
        Assert.Equal("P0", archived.GetProperty("winner").GetString());
        Assert.False(archived.GetProperty("finalState").TryGetProperty("chance", out _));
        Assert.All(archived.GetProperty("moves").EnumerateArray(), move =>
            Assert.False(move.GetProperty("state").TryGetProperty("chest", out _)));
    }

    [Fact]
    public async Task LegacyArchiveWithoutSnapshotsIsStillReadableAndMissingObjectIs404()
    {
        using var client = _app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await NewTokenAsync());
        var id = Guid.NewGuid();
        var legacy = GameJson.Serialize(new { id, gameKey = "monopoly", winner = "P0", seats = new[] { "An", "Binh" },
            map = new { }, finalState = new { winner = "P0" }, moves = new[] { new { moveNumber = 1, side = "P0", move = new { type = "ROLL" } } } });
        using var scope = _app.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<MinioStorageService>().SaveReplayAsync($"replay-{id}.json", legacy);
        var result = await client.GetAsync($"/api/games/{id}/replay");
        Assert.Equal(HttpStatusCode.OK, result.StatusCode);
        Assert.True(JsonNode.DeepEquals(JsonNode.Parse(legacy), JsonNode.Parse(await result.Content.ReadAsStringAsync())));
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/games/{Guid.NewGuid()}/replay")).StatusCode);
        var waitingResponse = await client.PostAsJsonAsync("/api/games", new { gameKey = "monopoly" });
        waitingResponse.EnsureSuccessStatusCode();
        var waitingId = (await waitingResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        await scope.ServiceProvider.GetRequiredService<MinioStorageService>().SaveReplayAsync($"replay-{waitingId}.json", legacy);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/games/{waitingId}/replay")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync($"/api/games/{waitingId}/cancel", null)).StatusCode);
    }

    [Fact]
    public async Task CorruptedArchiveReturnsServiceUnavailableRatherThanUnhandledJsonException()
    {
        using var client = _app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await NewTokenAsync());
        var id = Guid.NewGuid();
        using var scope = _app.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<MinioStorageService>().SaveReplayAsync($"replay-{id}.json", "{broken");
        var result = await client.GetAsync($"/api/games/{id}/replay");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, result.StatusCode);
        Assert.Contains("Không tải được replay", await result.Content.ReadAsStringAsync());
    }
}
