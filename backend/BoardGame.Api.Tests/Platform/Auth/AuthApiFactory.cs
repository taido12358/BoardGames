using System.Collections.Concurrent;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using BoardGame.Api.Platform.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Testcontainers.PostgreSql;
using Xunit;

namespace BoardGame.Api.Tests.Platform.Auth;

/// <summary>
/// Dựng cả API THẬT (qua <c>WebApplicationFactory&lt;Program&gt;</c>, chạy đúng pipeline
/// HTTP/middleware/[Authorize] thật — khác <see cref="Api.Tests.Platform.RoomServiceIntegrationTests"/>
/// chỉ gọi thẳng service, bỏ qua toàn bộ tầng controller/auth) trên POSTGRES THẬT (Testcontainers,
/// container tạm huỷ ngay sau khi test xong). Dùng CHUNG 1 container/factory cho MỌI test trong
/// class (qua <see cref="IClassFixture{TFixture}"/>) thay vì mỗi test 1 container riêng như
/// <c>RoomServiceIntegrationTests</c> — an toàn ở đây vì mỗi test tự dùng 1 email ngẫu nhiên
/// riêng (<see cref="AuthControllerIntegrationTests.UniqueEmail"/>), không có race condition
/// đồng thời cần cô lập DB như test ghép trận; đổi lấy tốc độ (không cần boot lại toàn bộ
/// ASP.NET Core host + Testcontainers cho từng test).
///
/// Không cấu hình Redis/RabbitMQ/OpenSearch/MinIO thật — 3 controller được test ở đây
/// (<see cref="Platform.Auth.AuthController"/>/<see cref="Platform.AdminController"/>) không đụng
/// tới chúng, và cả 3 service tương ứng đều kết nối LAZY (xem comment trong từng file Services/),
/// không throw lúc host khởi động dù không có service thật chạy.
/// </summary>
public class AuthApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("boardgame_auth_test")
        .WithUsername("postgres")
        .WithPassword("test")
        .Build();

    private readonly CapturingLoggerProvider _logs = new();

    // 1 email admin RIÊNG cho mỗi test cần đăng nhập admin (không dùng chung 1 địa chỉ) — dù DB
    // dùng chung cho cả class fixture (xem doc comment class), request-otp có cooldown 60s/email
    // (AuthController.ResendCooldownSeconds); nhiều test admin chạy trong vài trăm ms nên dùng
    // chung 1 email sẽ khiến các lần sau bị 429, ExtractOtpCode() đọc nhầm mã của lần trước đã
    // consumed. Đặt sẵn 16 địa chỉ trong ADMIN_EMAILS thay vì cấu hình domain-wildcard vì
    // TokenService so khớp CSV chính xác (không hỗ trợ pattern), xem TokenService.cs.
    private readonly string[] _adminEmails = Enumerable.Range(0, 16)
        .Select(i => $"admin{i}-{Guid.NewGuid():N}@test.local")
        .ToArray();
    private int _adminEmailIndex = -1;

    /// <summary>Trả 1 địa chỉ admin CHƯA DÙNG — gọi 1 lần cho mỗi test cần role Admin.</summary>
    public string NextAdminEmail() => _adminEmails[Interlocked.Increment(ref _adminEmailIndex)];

    public Task InitializeAsync() => _container.StartAsync();

    Task IAsyncLifetime.DisposeAsync() => _container.DisposeAsync().AsTask();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Postgres"] = _container.GetConnectionString(),
                ["ADMIN_EMAILS"] = string.Join(",", _adminEmails),
                // Ghi đè rỗng: .env thật ở root repo (đọc qua DotEnv.Load() trong Program.cs) có
                // thể có EMAIL_PROVIDER=smtp + SMTP_USER/PASS Gmail thật — nếu không ghi đè, test
                // này sẽ THẬT SỰ gửi email qua mạng tới các địa chỉ @test.local bịa (chậm, phụ
                // thuộc mạng, và không đọc được mã OTP để verify-otp vì lúc đó không còn rơi vào
                // nhánh log fallback của SmtpOtpSender). Cùng nguyên tắc đã áp dụng khi live-test
                // thủ công qua Docker Compose (xem rules/coding/testing.md).
                ["EMAIL_PROVIDER"] = "",
                // Bật fallback log OTP giống docker-compose.yml (Auth:DevLogOtp=true) — tường
                // minh thay vì dựa vào IsDevelopment() (mặc định "Production" khi chạy test).
                ["Auth:DevLogOtp"] = "true",
                // Tắt log SQL Information mặc định (appsettings.json) — chỉ làm nhiễu output test,
                // không liên quan gì tới log OTP mà ExtractOtpCode() cần đọc.
                ["Logging:LogLevel:Microsoft.EntityFrameworkCore.Database.Command"] = "Warning",
            });
        });
        builder.ConfigureLogging(lb => lb.AddProvider(_logs));
        builder.ConfigureTestServices(services =>
        {
            // TokenService đọc ADMIN_EMAILS 1 LẦN LÚC BOOT ngay trong Program.cs
            // (`new TokenService(builder.Configuration)`, TRƯỚC cả `builder.Build()`) — khác
            // AddDbContext ở trên (optionsAction là closure, chỉ evaluate LÚC DbContext được
            // resolve qua DI, đã sau Build()). ConfigureAppConfiguration KHÔNG kịp ghi đè giá trị
            // đọc eager kiểu này (đã tự xác nhận bằng cách in trực tiếp builder.Configuration ra
            // file lúc chạy test — ra rỗng dù đã AddInMemoryCollection ở trên).
            //
            // Đăng ký lại TokenService qua factory LAZY (chỉ resolve `IConfiguration` từ DI lúc
            // thật sự cần, tức SAU `builder.Build()`) — tại thời điểm đó `IConfiguration` đã gộp
            // đủ mọi nguồn kể cả AddInMemoryCollection ở trên, nên đọc đúng ADMIN_EMAILS ghi đè.
            // KHÔNG dựng TokenService với secret riêng khác Program.cs: JWT Bearer
            // (`AddJwtBearer` trong Program.cs) đã chốt `TokenValidationParameters` từ secret của
            // TokenService gốc lúc app khởi động — nếu instance thay thế ở đây dùng secret khác,
            // token tự ký sẽ không qua được validation (ký/xác thực lệch khoá), mọi request có
            // cookie đều trả 401. Không set JWT_SECRET trong config override phía trên — giữ
            // nguyên giá trị thật (từ .env/environment) để 2 khoá luôn khớp nhau.
            services.AddSingleton(sp => new TokenService(sp.GetRequiredService<IConfiguration>()));
        });
    }

    /// <summary>Đọc mã OTP 6 số vừa "gửi" (thật ra chỉ log local, xem SmtpOtpSender.SendOtpAsync)
    /// cho đúng email — dùng log thay vì đọc thẳng CodeHash trong DB vì OTP chỉ lưu dạng hash,
    /// không thể đảo ngược, đúng bản chất bảo mật cố ý của thiết kế.</summary>
    public string ExtractOtpCode(string email)
    {
        var marker = $"OTP cho {email} ";
        var message = _logs.Messages.LastOrDefault(m => m.Contains(marker))
            ?? throw new InvalidOperationException($"Không tìm thấy log OTP cho {email}. Log hiện có: {string.Join(" | ", _logs.Messages)}");
        var match = Regex.Match(message, @":\s*(\d{6})\s*$");
        if (!match.Success)
            throw new InvalidOperationException($"Log OTP không đúng định dạng: {message}");
        return match.Groups[1].Value;
    }

    /// <summary>Tạo 1 <see cref="HttpClient"/> mới, tự đăng nhập OTP (email ngẫu nhiên nếu không
    /// truyền) — dùng chung cho mọi test cần "1 người dùng đã đăng nhập" (Admin hoặc thường) mà
    /// không quan tâm chi tiết luồng request-otp/verify-otp.</summary>
    public async Task<HttpClient> LoggedInClientAsync(string? email = null)
    {
        email ??= $"user-{Guid.NewGuid():N}@test.local";
        var client = CreateClient();
        await client.PostAsJsonAsync("/api/auth/request-otp", new { email });
        var code = ExtractOtpCode(email);
        await client.PostAsJsonAsync("/api/auth/verify-otp", new { email, code });
        return client;
    }
}

/// <summary>Bắt log message đã format (không chỉ template) để test đọc lại được mã OTP fallback —
/// tương đương thao tác thủ công `docker compose logs backend | grep "OTP cho"` dùng khi live-test,
/// chỉ khác là chạy tự động trong-process thay vì đọc log container.</summary>
public class CapturingLoggerProvider : ILoggerProvider
{
    public ConcurrentQueue<string> Messages { get; } = new();

    public ILogger CreateLogger(string categoryName) => new CapturingLogger(Messages);

    public void Dispose() { }

    private sealed class CapturingLogger(ConcurrentQueue<string> messages) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) => messages.Enqueue(formatter(state, exception));
    }
}
