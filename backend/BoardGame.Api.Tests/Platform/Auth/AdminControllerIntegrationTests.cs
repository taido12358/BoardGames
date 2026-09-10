using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace BoardGame.Api.Tests.Platform.Auth;

/// <summary>
/// Test HTTP tích hợp cho <see cref="Platform.AdminController"/> — trọng tâm là xác nhận
/// <c>[Authorize(Roles = "Admin")]</c> THẬT SỰ chặn đúng qua middleware ASP.NET Core, không chỉ
/// kiểm tra claim được tạo đúng trong <c>TokenServiceTests</c> (test đó dừng ở tầng JWT, không
/// chạy qua pipeline HTTP/authorization thật — role check có thể bị cấu hình sai ở tầng
/// controller mà TokenServiceTests không bao giờ phát hiện ra). Đây là lần đầu tiên phân quyền
/// Admin được verify end-to-end qua HTTP thật (xem rules/coding/security.md mục "Phân quyền").
/// </summary>
public class AdminControllerIntegrationTests : IClassFixture<AuthApiFactory>
{
    private readonly AuthApiFactory _factory;

    public AdminControllerIntegrationTests(AuthApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Check_NonAdminUser_ReturnsFalse()
    {
        using var client = await _factory.LoggedInClientAsync();

        var res = await client.GetAsync("/api/admin/check");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(body.GetProperty("isAdmin").GetBoolean());
    }

    [Fact]
    public async Task Check_AdminUser_ReturnsTrue()
    {
        using var client = await _factory.LoggedInClientAsync(_factory.NextAdminEmail());

        var res = await client.GetAsync("/api/admin/check");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("isAdmin").GetBoolean());
    }

    [Fact]
    public async Task Rooms_NonAdminUser_ReturnsForbidden()
    {
        using var client = await _factory.LoggedInClientAsync();

        var res = await client.GetAsync("/api/admin/rooms");

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Stats_NonAdminUser_ReturnsForbidden()
    {
        using var client = await _factory.LoggedInClientAsync();

        var res = await client.GetAsync("/api/admin/stats");

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Rooms_AdminUser_ReturnsOk()
    {
        using var client = await _factory.LoggedInClientAsync(_factory.NextAdminEmail());

        var res = await client.GetAsync("/api/admin/rooms");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Stats_AdminUser_ReturnsOkWithCounts()
    {
        using var client = await _factory.LoggedInClientAsync(_factory.NextAdminEmail());

        var res = await client.GetAsync("/api/admin/stats");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("totalUsers").GetInt32() >= 1); // ít nhất chính user admin vừa đăng nhập
    }

    [Fact]
    public async Task Rooms_WithoutAuth_ReturnsUnauthorized()
    {
        using var anonClient = _factory.CreateClient();

        var res = await anonClient.GetAsync("/api/admin/rooms");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }
}
