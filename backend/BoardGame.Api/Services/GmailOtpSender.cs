using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace BoardGame.Api.Services;

/// <summary>
/// Gửi mã OTP qua Gmail SMTP (smtp.gmail.com:587, STARTTLS).
/// Cấu hình qua Gmail:User + Gmail:AppPassword (App Password của Google,
/// KHÔNG phải mật khẩu Gmail thường — tạo tại https://myaccount.google.com/apppasswords).
/// </summary>
public class GmailOtpSender
{
    private readonly string? _user;
    private readonly string? _appPassword;
    private readonly string _fromName;
    private readonly ILogger<GmailOtpSender> _logger;
    private readonly IHostEnvironment _env;

    public GmailOtpSender(IConfiguration config, ILogger<GmailOtpSender> logger, IHostEnvironment env)
    {
        _user        = config["Gmail:User"];
        _appPassword = config["Gmail:AppPassword"];
        _fromName    = config["Gmail:FromName"] ?? "BoardGame";
        _logger      = logger;
        _env         = env;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_user) && !string.IsNullOrWhiteSpace(_appPassword);

    /// <summary>
    /// Gửi mã OTP đến địa chỉ email. Trả về false nếu gửi thất bại.
    /// Ở Development khi chưa cấu hình Gmail: log mã ra console để test được local.
    /// </summary>
    public async Task<bool> SendOtpAsync(string toEmail, string code, TimeSpan validFor)
    {
        // Kiểm tra null trực tiếp (thay vì qua IsConfigured) để compiler narrow được
        // _user/_appPassword thành non-null ở phần gửi mail bên dưới.
        if (string.IsNullOrWhiteSpace(_user) || string.IsNullOrWhiteSpace(_appPassword))
        {
            if (_env.IsDevelopment())
            {
                // Fallback có chủ đích cho dev local — KHÔNG bao giờ xảy ra ở production
                // vì AuthController đã chặn request khi chưa cấu hình ngoài Development.
                _logger.LogWarning("Gmail chưa cấu hình — OTP cho {Email} (chỉ Development): {Code}", toEmail, code);
                return true;
            }
            _logger.LogError("Gmail:User / Gmail:AppPassword chưa cấu hình — không thể gửi OTP.");
            return false;
        }

        var minutes = (int)validFor.TotalMinutes;
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_fromName, _user));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = $"{code} là mã đăng nhập BoardGame của bạn";
        message.Body = new BodyBuilder
        {
            TextBody =
                $"Mã đăng nhập của bạn là: {code}\n\n" +
                $"Mã có hiệu lực trong {minutes} phút. " +
                "Nếu bạn không yêu cầu mã này, hãy bỏ qua email.",
            HtmlBody =
                $"""
                <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
                  <h2 style="margin-bottom:4px">🎲 BoardGame</h2>
                  <p>Mã đăng nhập của bạn:</p>
                  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f1f5f9;
                            padding:12px 16px;border-radius:8px;text-align:center">{code}</p>
                  <p style="color:#64748b">Mã có hiệu lực trong {minutes} phút.
                     Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p>
                </div>
                """,
        }.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_user, _appPassword);
            await client.SendAsync(message);
            await client.DisconnectAsync(quit: true);
            return true;
        }
        catch (Exception ex)
        {
            // Không log mã OTP kèm exception — chỉ log người nhận.
            _logger.LogError(ex, "Gửi OTP qua Gmail đến {Email} thất bại.", toEmail);
            return false;
        }
    }
}
