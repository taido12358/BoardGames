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
        // Secret bắt buộc ≥ 32 byte cho HS256. Nguồn: JWT_SECRET trong .env (ưu tiên),
        // fallback Jwt:Secret trong appsettings (dev default ở appsettings.Development.json).
        // Check IsNullOrWhiteSpace chứ không chỉ null: .env/appsettings chứa "" làm placeholder.
        var secret = config["JWT_SECRET"];
        if (string.IsNullOrWhiteSpace(secret)) secret = config["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException(
                "JWT secret chưa được cấu hình. Đặt JWT_SECRET trong file .env (chuỗi ngẫu nhiên ≥ 32 ký tự) " +
                "— không dùng giá trị mặc định cho production.");
        var keyBytes = Encoding.UTF8.GetBytes(secret);
        if (keyBytes.Length < 32)
            throw new InvalidOperationException(
                $"Jwt:Secret quá ngắn ({keyBytes.Length} byte) — HS256 cần ≥ 32 byte.");
        _key = new SymmetricSecurityKey(keyBytes);
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
