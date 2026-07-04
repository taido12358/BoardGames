namespace BoardGame.Api.Platform.Auth;

/// <summary>
/// Tài khoản người chơi, định danh bằng email (đăng nhập OTP, không mật khẩu).
/// </summary>
public class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Email đã chuẩn hoá lowercase — định danh duy nhất.</summary>
    public string Email { get; set; } = "";

    /// <summary>Tên hiển thị trong sảnh/ván. Mặc định lấy phần trước @ của email.</summary>
    public string DisplayName { get; set; } = "";

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastLoginAt { get; set; }
}
