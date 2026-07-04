using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace BoardGame.Api.Platform.Auth;

/// <summary>
/// Phát và cấu hình JWT. Token được đặt trong cookie HttpOnly (không đưa cho JS đọc).
/// </summary>
public class TokenService
{
    public const string CookieName = "bg_auth";

    private readonly SymmetricSecurityKey _key;
    private readonly TimeSpan _lifetime;

    public TokenService(IConfiguration config)
    {
        // Secret bắt buộc ≥ 32 byte cho HS256. Dev default nằm ở appsettings.Development.json;
        // production đặt qua biến môi trường Jwt__Secret (xem rule-security.md).
        var secret = config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret chưa được cấu hình.");
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        _lifetime = TimeSpan.FromDays(double.TryParse(config["Jwt:ExpireDays"], out var d) ? d : 7);
    }

    public TimeSpan Lifetime => _lifetime;

    public string CreateToken(AppUser user)
    {
        var token = new JwtSecurityToken(
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("name", user.DisplayName),
            ],
            expires: DateTime.UtcNow.Add(_lifetime),
            signingCredentials: new SigningCredentials(_key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public TokenValidationParameters ValidationParameters => new()
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = _key,
        ClockSkew = TimeSpan.FromMinutes(1),
    };
}
