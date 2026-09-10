using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using BoardGame.Api.Platform.Auth;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace BoardGame.Api.Tests.Platform.Auth;

/// <summary>
/// Test round-trip thật qua JwtSecurityTokenHandler (không chỉ gọi CreateToken rồi đọc field
/// nội bộ) — vì đây là claim quyết định [Authorize(Roles = "Admin")] có hoạt động đúng hay
/// không (AdminController). Ghi bằng ClaimTypes.Role (URI đầy đủ) thay vì tên ngắn "role" vì
/// pipeline JWT của app không đảm bảo tự map tên ngắn -> URI lúc đọc lại (xem chú thích trong
/// TokenService.CreateToken/ClaimsPrincipalExtensions.TryGetUserId).
/// </summary>
public class TokenServiceTests
{
    private static TokenService MakeService(string adminEmails = "")
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT_SECRET"] = "test-only-secret-must-be-at-least-32-bytes",
                ["ADMIN_EMAILS"] = adminEmails,
            })
            .Build();
        return new TokenService(config);
    }

    private static ClaimsPrincipal Validate(TokenService service, string token)
        => new JwtSecurityTokenHandler().ValidateToken(token, service.ValidationParameters, out _);

    [Fact]
    public void CreateToken_EmailInAdminList_GrantsAdminRole()
    {
        var service = MakeService("admin@example.com, other@example.com");
        var user = new AppUser { Email = "Admin@Example.com", DisplayName = "Admin" }; // khớp không phân biệt hoa/thường

        var principal = Validate(service, service.CreateToken(user));

        Assert.True(principal.IsInRole("Admin"));
    }

    [Fact]
    public void CreateToken_EmailNotInAdminList_NoAdminRole()
    {
        var service = MakeService("admin@example.com");
        var user = new AppUser { Email = "someone-else@example.com", DisplayName = "User" };

        var principal = Validate(service, service.CreateToken(user));

        Assert.False(principal.IsInRole("Admin"));
    }

    [Fact]
    public void CreateToken_AdminEmailsEmpty_NoOneIsAdmin()
    {
        var service = MakeService("");
        var user = new AppUser { Email = "anyone@example.com", DisplayName = "Anyone" };

        var principal = Validate(service, service.CreateToken(user));

        Assert.False(principal.IsInRole("Admin"));
    }

    [Fact]
    public void CreateToken_AlwaysIncludesSubEmailName()
    {
        var service = MakeService();
        var user = new AppUser { Email = "player@example.com", DisplayName = "Player One" };

        var principal = Validate(service, service.CreateToken(user));

        Assert.Equal(user.Id.ToString(), principal.TryGetUserId()?.ToString());
        Assert.Equal("player@example.com", principal.TryGetEmail());
        Assert.Equal("Player One", principal.GetDisplayName());
    }
}
