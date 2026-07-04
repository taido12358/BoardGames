using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace BoardGame.Api.Services;

/// <summary>
/// Gửi mã OTP qua SMTP (mặc định Gmail: smtp.gmail.com:587 STARTTLS).
/// Cấu hình qua .env / biến môi trường (xem .env.example):
///   EMAIL_PROVIDER=smtp — bật gửi thật; để trống → fallback log OTP (chỉ local)
///   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS — với Gmail, SMTP_PASS là App Password
///   SMTP_FROM — "Tên hiển thị &lt;email&gt;", email phải trùng SMTP_USER
///   WEB_BASE_URL — link mở game gắn trong email
/// </summary>
public class SmtpOtpSender
{
    private readonly bool _enabled;
    private readonly string _host;
    private readonly int _port;
    private readonly string? _user;
    private readonly string? _pass;
    private readonly string? _from;
    private readonly string? _webBaseUrl;
    private readonly bool _devLogOtp;
    private readonly ILogger<SmtpOtpSender> _logger;

    public SmtpOtpSender(IConfiguration config, ILogger<SmtpOtpSender> logger, IHostEnvironment env)
    {
        _enabled    = string.Equals(config["EMAIL_PROVIDER"], "smtp", StringComparison.OrdinalIgnoreCase);
        _host       = config["SMTP_HOST"] ?? "smtp.gmail.com";
        _port       = int.TryParse(config["SMTP_PORT"], out var p) ? p : 587;
        _user       = config["SMTP_USER"];
        _pass       = config["SMTP_PASS"];
        _from       = config["SMTP_FROM"];
        _webBaseUrl = config["WEB_BASE_URL"];
        // Fallback log OTP ra console khi chưa cấu hình SMTP: bật ở Development,
        // hoặc bật tường minh qua Auth__DevLogOtp=true (stack compose local).
        _devLogOtp  = env.IsDevelopment() || config.GetValue<bool>("Auth:DevLogOtp");
        _logger     = logger;
    }

    public bool IsConfigured =>
        _enabled && !string.IsNullOrWhiteSpace(_user) && !string.IsNullOrWhiteSpace(_pass);

    /// <summary>true nếu được phép log OTP ra console thay vì gửi mail (chỉ môi trường local).</summary>
    public bool DevLogOtpEnabled => _devLogOtp;

    /// <summary>
    /// Gửi mã OTP đến địa chỉ email. Trả về false nếu gửi thất bại.
    /// Chưa cấu hình SMTP + DevLogOtp bật → log mã ra console để test local.
    /// </summary>
    public async Task<bool> SendOtpAsync(string toEmail, string code, TimeSpan validFor)
    {
        // Kiểm tra null trực tiếp (thay vì qua IsConfigured) để compiler narrow được
        // _user/_pass thành non-null ở phần gửi mail bên dưới.
        if (!_enabled || string.IsNullOrWhiteSpace(_user) || string.IsNullOrWhiteSpace(_pass))
        {
            if (_devLogOtp)
            {
                // Fallback có chủ đích cho môi trường local — production không bật
                // Auth:DevLogOtp nên AuthController đã trả 503 trước khi tới đây.
                _logger.LogWarning("SMTP chưa cấu hình — OTP cho {Email} (log local, không gửi mail): {Code}", toEmail, code);
                return true;
            }
            _logger.LogError("EMAIL_PROVIDER/SMTP_USER/SMTP_PASS chưa cấu hình — không thể gửi OTP.");
            return false;
        }

        var minutes  = (int)validFor.TotalMinutes;
        var fromName = "BoardGame";
        var message  = new MimeMessage();

        // SMTP_FROM dạng "Tên hiển thị <email>". Parse lỗi hoặc không đặt → dùng SMTP_USER.
        if (!string.IsNullOrWhiteSpace(_from) && MailboxAddress.TryParse(_from, out var fromAddr))
        {
            fromName = string.IsNullOrWhiteSpace(fromAddr.Name) ? fromName : fromAddr.Name;
            message.From.Add(fromAddr);
        }
        else
        {
            message.From.Add(new MailboxAddress(fromName, _user));
        }

        var openLink = string.IsNullOrWhiteSpace(_webBaseUrl)
            ? ""
            : $"""<p style="margin-top:16px"><a href="{_webBaseUrl}" style="color:#059669">Mở {fromName} →</a></p>""";

        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = $"{code} là mã đăng nhập {fromName} của bạn";
        message.Body = new BodyBuilder
        {
            TextBody =
                $"Mã đăng nhập của bạn là: {code}\n\n" +
                $"Mã có hiệu lực trong {minutes} phút. " +
                "Nếu bạn không yêu cầu mã này, hãy bỏ qua email.",
            HtmlBody =
                $"""
                <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
                  <h2 style="margin-bottom:4px">🎲 {fromName}</h2>
                  <p>Mã đăng nhập của bạn:</p>
                  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f1f5f9;
                            padding:12px 16px;border-radius:8px;text-align:center">{code}</p>
                  <p style="color:#64748b">Mã có hiệu lực trong {minutes} phút.
                     Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p>
                  {openLink}
                </div>
                """,
        }.ToMessageBody();

        try
        {
            using var client = new SmtpClient();
            // Port 465 = TLS ngay khi connect; 587 (và còn lại) = STARTTLS.
            var socketOpt = _port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
            await client.ConnectAsync(_host, _port, socketOpt);
            await client.AuthenticateAsync(_user, _pass);
            await client.SendAsync(message);
            await client.DisconnectAsync(quit: true);
            return true;
        }
        catch (Exception ex)
        {
            // Không log mã OTP kèm exception — chỉ log người nhận.
            _logger.LogError(ex, "Gửi OTP qua SMTP ({Host}:{Port}) đến {Email} thất bại.", _host, _port, toEmail);
            return false;
        }
    }
}
