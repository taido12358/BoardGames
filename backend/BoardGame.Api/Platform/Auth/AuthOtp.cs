namespace BoardGame.Api.Platform.Auth;

/// <summary>
/// Mã OTP đăng nhập gửi qua email. Chỉ lưu SHA-256 hash, không lưu mã gốc.
/// </summary>
public class AuthOtp
{
    public long Id { get; set; }

    /// <summary>Email nhận mã (đã chuẩn hoá lowercase).</summary>
    public string Email { get; set; } = "";

    /// <summary>SHA-256 hex của mã 6 số.</summary>
    public string CodeHash { get; set; } = "";

    public DateTimeOffset ExpiresAt { get; set; }

    /// <summary>Số lần nhập sai — quá giới hạn thì mã bị vô hiệu.</summary>
    public int Attempts { get; set; }

    /// <summary>Thời điểm mã được dùng thành công (null = chưa dùng).</summary>
    public DateTimeOffset? ConsumedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
