using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using BoardGame.Api.Platform;
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
public class GamesControllerIntegrationTests : IClassFixture<AuthApiFactory>
{
    private readonly AuthApiFactory _factory;

    public GamesControllerIntegrationTests(AuthApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Engines_ReturnsAllFourRegisteredGames()
    {
        using var client = await _factory.LoggedInClientAsync();

        var res = await client.GetAsync("/api/games/engines");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement[]>();
        var keys = body!.Select(e => e.GetProperty("key").GetString()).ToHashSet();
        Assert.Equal(new HashSet<string?> { "vaybat", "bang", "oanquan", "zodiacrace" }, keys);
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
    public async Task Replay_RoomNeverFinished_ReturnsNotFoundOrServiceUnavailableNeverCrashes()
    {
        // Không cấu hình MinIO thật cho môi trường test này (xem doc comment AuthApiFactory) —
        // nhưng máy chạy test CÓ THỂ (như lúc phát triển local) đã có sẵn 1 MinIO thật đang chạy ở
        // cổng mặc định (vd còn sót từ live-test thủ công qua Docker Compose), khiến 2 kết quả đều
        // hợp lệ tuỳ môi trường: 404 (MinIO thật, object không tồn tại vì phòng chưa từng kết
        // thúc) hoặc 503 (không kết nối được MinIO — đúng hành vi phòng thủ của
        // GamesController.Replay). Điều quan trọng cần xác nhận là KHÔNG BAO GIỜ lộ 500 không rõ
        // nguyên nhân — happy-path đọc đúng nội dung replay thật cần MinIO thật, xem live-test thủ
        // công trong rules/coding/testing.md.
        using var client = await _factory.LoggedInClientAsync();
        var created = await (await client.PostAsJsonAsync("/api/games", new { gameKey = "vaybat" }))
            .Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetGuid();

        var res = await client.GetAsync($"/api/games/{id}/replay");

        Assert.True(
            res.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.ServiceUnavailable,
            $"Expected NotFound or ServiceUnavailable, got {res.StatusCode}");
    }

    [Fact]
    public async Task Replay_WithoutAuth_ReturnsUnauthorized()
    {
        using var anonClient = _factory.CreateClient();

        var res = await anonClient.GetAsync($"/api/games/{Guid.NewGuid()}/replay");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
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
