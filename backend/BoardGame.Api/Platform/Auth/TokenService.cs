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
    private readonly HashSet<string> _adminEmails;

    public TokenService(IConfiguration config)
    {
        // Danh sách admin đọc 1 lần lúc boot từ ADMIN_EMAILS (CSV, rỗng mặc định — xem
        // .env.example). Gán role NGAY LÚC PHÁT TOKEN (đăng nhập), không kiểm tra lại config
        // mỗi request — theo đúng pattern rules/coding/security.md mục "Phân quyền" (role định
        // nghĩa ở tầng auth qua claim, kiểm bằng [Authorize(Roles=...)], không hard-code danh
        // sách rải rác trong logic từng controller). Đánh đổi: đổi ADMIN_EMAILS chỉ có hiệu lực
        // với phiên đăng nhập MỚI — token cũ (còn hạn tới 7 ngày) giữ nguyên role lúc phát.
        _adminEmails = (config["ADMIN_EMAILS"] ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(e => e.ToLowerInvariant())
            .ToHashSet();
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
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("name", user.DisplayName),
        };
        // Dùng ClaimTypes.Role (URI đầy đủ) thay vì tên ngắn "role" — pipeline JWT ở đây KHÔNG
        // đảm bảo tự map tên ngắn -> URI .NET lúc đọc lại token (xem chú thích "kiểm cả hai" ở
        // ClaimsPrincipalExtensions.TryGetUserId — dấu hiệu MapInboundClaims không đáng tin cậy
        // với handler đang dùng). Ghi thẳng URI đầy đủ thì `[Authorize(Roles = "Admin")]`/
        // `User.IsInRole` khớp được ngay cả khi không có mapping nào xảy ra.
        if (_adminEmails.Contains(user.Email.ToLowerInvariant()))
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));

        var token = new JwtSecurityToken(
            claims: claims,
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
