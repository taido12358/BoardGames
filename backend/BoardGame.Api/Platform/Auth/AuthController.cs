using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using BoardGame.Api.Data;
using BoardGame.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Platform.Auth;

public record RequestOtpDto(string Email);
public record VerifyOtpDto(string Email, string Code);
public record UserDto(Guid Id, string Email, string DisplayName);

[ApiController]
[Route("api/auth")]
public partial class AuthController : ControllerBase
{
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(5);
    private const int MaxVerifyAttempts = 5;
    private const int ResendCooldownSeconds = 60;
    private const int MaxRequestsPerHour = 5;

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailRegex();

    private readonly AppDbContext _db;
    private readonly SmtpOtpSender _mailer;
    private readonly TokenService _tokens;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext db, SmtpOtpSender mailer, TokenService tokens,
        ILogger<AuthController> logger)
    {
        _db = db;
        _mailer = mailer;
        _tokens = tokens;
        _logger = logger;
    }

    /// <summary>Bước 1: nhận email, tạo OTP 6 số và gửi qua Gmail.</summary>
    [HttpPost("request-otp")]
    public async Task<IActionResult> RequestOtp([FromBody] RequestOtpDto dto)
    {
        var email = NormalizeEmail(dto.Email);
        if (email is null)
            return BadRequest(new { error = "Địa chỉ email không hợp lệ." });

        if (!_mailer.IsConfigured && !_mailer.DevLogOtpEnabled)
            return StatusCode(503, new { error = "Hệ thống gửi email chưa được cấu hình. Liên hệ quản trị viên." });

        var now = DateTimeOffset.UtcNow;
        var recent = await _db.AuthOtps
            .Where(o => o.Email == email && o.CreatedAt > now.AddHours(-1))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        if (recent.Count >= MaxRequestsPerHour)
            return StatusCode(429, new { error = "Bạn đã yêu cầu mã quá nhiều lần. Thử lại sau 1 giờ." });

        if (recent.Count > 0 && (now - recent[0].CreatedAt).TotalSeconds < ResendCooldownSeconds)
        {
            var wait = ResendCooldownSeconds - (int)(now - recent[0].CreatedAt).TotalSeconds;
            return StatusCode(429, new { error = $"Vui lòng đợi {wait} giây rồi yêu cầu mã mới." });
        }

        // Mã mới vô hiệu hoá mọi mã cũ còn sống của email này (mỗi email 1 mã active).
        foreach (var old in recent.Where(o => o.ConsumedAt == null && o.ExpiresAt > now))
            old.ExpiresAt = now;

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        _db.AuthOtps.Add(new AuthOtp
        {
            Email = email,
            CodeHash = Sha256(code),
            ExpiresAt = now.Add(OtpLifetime),
            CreatedAt = now,
        });
        await _db.SaveChangesAsync();

        // Ghi DB trước, gửi mail sau — mail fail thì báo lỗi rõ, không nuốt im lặng.
        var sent = await _mailer.SendOtpAsync(email, code, OtpLifetime);
        if (!sent)
            return StatusCode(502, new { error = "Không gửi được email. Kiểm tra lại địa chỉ hoặc thử lại sau." });

        _logger.LogInformation("Đã gửi OTP đăng nhập cho {Email}.", email);
        return Ok(new { message = "Đã gửi mã đăng nhập. Kiểm tra hộp thư (kể cả mục Spam).", expiresInSeconds = (int)OtpLifetime.TotalSeconds });
    }

    /// <summary>Bước 2: xác minh mã, tạo user nếu chưa có, phát JWT vào cookie HttpOnly.</summary>
    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
    {
        var email = NormalizeEmail(dto.Email);
        if (email is null || string.IsNullOrWhiteSpace(dto.Code))
            return BadRequest(new { error = "Thiếu email hoặc mã xác nhận." });

        var now = DateTimeOffset.UtcNow;
        var otp = await _db.AuthOtps
            .Where(o => o.Email == email && o.ConsumedAt == null && o.ExpiresAt > now)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otp is null)
            return BadRequest(new { error = "Mã đã hết hạn hoặc không tồn tại. Yêu cầu mã mới." });

        if (otp.Attempts >= MaxVerifyAttempts)
            return BadRequest(new { error = "Nhập sai quá nhiều lần. Yêu cầu mã mới." });

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(Sha256(dto.Code.Trim())),
                Encoding.UTF8.GetBytes(otp.CodeHash)))
        {
            otp.Attempts++;
            await _db.SaveChangesAsync();
            var left = MaxVerifyAttempts - otp.Attempts;
            return BadRequest(new { error = left > 0
                ? $"Mã không đúng. Còn {left} lần thử."
                : "Nhập sai quá nhiều lần. Yêu cầu mã mới." });
        }

        otp.ConsumedAt = now;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
        {
            user = new AppUser
            {
                Email = email,
                DisplayName = email.Split('@')[0],
                CreatedAt = now,
            };
            _db.Users.Add(user);
        }
        user.LastLoginAt = now;
        await _db.SaveChangesAsync();

        SetAuthCookie(_tokens.CreateToken(user));
        _logger.LogInformation("Đăng nhập thành công: {Email} ({UserId}).", email, user.Id);
        return Ok(new UserDto(user.Id, user.Email, user.DisplayName));
    }

    /// <summary>Trả về user hiện tại từ cookie — dùng để khôi phục phiên khi mở lại trang.</summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = User.TryGetUserId();
        if (userId is null)
            return Unauthorized(new { error = "Token không hợp lệ." });

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
            return Unauthorized(new { error = "Tài khoản không còn tồn tại." });

        return Ok(new UserDto(user.Id, user.Email, user.DisplayName));
    }

    /// <summary>Đổi tên hiển thị.</summary>
    [Authorize]
    [HttpPut("display-name")]
    public async Task<IActionResult> UpdateDisplayName([FromBody] Dictionary<string, string> body)
    {
        if (!body.TryGetValue("displayName", out var name) || string.IsNullOrWhiteSpace(name))
            return BadRequest(new { error = "Tên hiển thị không được để trống." });
        name = name.Trim();
        if (name.Length > 30)
            return BadRequest(new { error = "Tên hiển thị tối đa 30 ký tự." });

        var userId = User.TryGetUserId();
        if (userId is null) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Unauthorized();

        user.DisplayName = name;
        await _db.SaveChangesAsync();
        SetAuthCookie(_tokens.CreateToken(user)); // refresh claim "name" trong token
        return Ok(new UserDto(user.Id, user.Email, user.DisplayName));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(TokenService.CookieName, CookieOptions());
        return Ok(new { message = "Đã đăng xuất." });
    }

    private void SetAuthCookie(string jwt)
    {
        var opts = CookieOptions();
        opts.Expires = DateTimeOffset.UtcNow.Add(_tokens.Lifetime);
        Response.Cookies.Append(TokenService.CookieName, jwt, opts);
    }

    private CookieOptions CookieOptions() => new()
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        // Secure theo scheme thật: https → Secure. Không gắn theo environment —
        // compose local chạy Production trên http, cookie Secure sẽ bị browser bỏ qua.
        Secure = Request.IsHttps,
        Path = "/",
    };

    private static string? NormalizeEmail(string? raw)
    {
        var email = raw?.Trim().ToLowerInvariant();
        return email is not null && email.Length <= 254 && EmailRegex().IsMatch(email) ? email : null;
    }

    private static string Sha256(string input) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input)));
}
