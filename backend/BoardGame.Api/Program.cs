using BoardGame.Api.Data;
using BoardGame.Api.Games.Bang;
using BoardGame.Api.Games.OAnQuan;
using BoardGame.Api.Games.VayBat;
using BoardGame.Api.Games.ZodiacRace;
using BoardGame.Api.Platform;
using BoardGame.Api.Platform.Abstractions;
using BoardGame.Api.Platform.Auth;
using BoardGame.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

// Nạp .env ở root repo vào biến môi trường TRƯỚC khi build config,
// để chạy local bằng `dotnet run` cũng đọc được cấu hình như docker compose.
DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);

// --- Database: PostgreSQL via EF Core ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")
        ?? "Host=localhost;Port=5432;Database=boardgame;Username=postgres;Password=postgres"));

// --- Cache: Redis ---
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
{
    var conn = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
    var options = ConfigurationOptions.Parse(conn);
    options.AbortOnConnectFail = false;
    options.ConnectRetry = 5;
    options.ConnectTimeout = 5000;
    return ConnectionMultiplexer.Connect(options);
});
builder.Services.AddSingleton<RedisCacheService>();

// --- Queue: RabbitMQ ---
builder.Services.AddSingleton<RabbitMqPublisher>();

// --- Search: OpenSearch ---
builder.Services.AddSingleton<OpenSearchService>();

// --- Storage: MinIO ---
builder.Services.AddSingleton<MinioStorageService>();

// --- Phòng/ghế/ván (dùng chung bởi GameHub + GamesController) ---
builder.Services.AddScoped<RoomService>();

// --- Dọn phòng "Waiting" bỏ dở quá lâu (xem StaleRoomCleanupService) ---
builder.Services.AddHostedService<StaleRoomCleanupService>();
// --- Xử lý ghế mất kết nối quá lâu GIỮA VÁN (xem SeatTimeoutService) ---
builder.Services.AddHostedService<SeatTimeoutService>();

// --- Game engines ---
builder.Services.AddSingleton<IGameEngine, VayBatEngine>();
builder.Services.AddSingleton<IGameEngine, BangEngine>();
builder.Services.AddSingleton<IGameEngine, OAnQuanEngine>();
builder.Services.AddSingleton<IGameEngine, ZodiacRaceEngine>();
builder.Services.AddSingleton<GameEngineRegistry>();

// --- Auth: đăng nhập OTP qua email (SMTP), JWT trong cookie HttpOnly ---
builder.Services.AddSingleton<SmtpOtpSender>();
// Khởi tạo ngay tại đây (không lazy qua DI) để thiếu Jwt:Secret là fail ngay lúc boot
// với message rõ ràng, thay vì nổ ở request đầu tiên.
var tokenService = new TokenService(builder.Configuration);
builder.Services.AddSingleton(tokenService);
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = tokenService.ValidationParameters;
        options.Events = new JwtBearerEvents
        {
            // Token nằm trong cookie HttpOnly (JS không đọc được — chống XSS).
            // Vẫn nhận Authorization header cho tool/test; SignalR dùng cookie tự động.
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token) &&
                    ctx.Request.Cookies.TryGetValue(TokenService.CookieName, out var cookie))
                    ctx.Token = cookie;
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();

// --- Realtime: SignalR ---
builder.Services.AddSignalR();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS: frontend dev mặc định + WEB_BASE_URL từ .env (nếu frontend chạy port/host khác).
var corsOrigins = new List<string> { "http://localhost:5173" };
var webBaseUrl = builder.Configuration["WEB_BASE_URL"]?.TrimEnd('/');
if (!string.IsNullOrWhiteSpace(webBaseUrl) && !corsOrigins.Contains(webBaseUrl))
    corsOrigins.Add(webBaseUrl);

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy
        .WithOrigins(corsOrigins.ToArray())
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

var app = builder.Build();

// Schema bootstrap idempotent bằng raw SQL — nội dung đầy đủ ở Data/SchemaBootstrapper.cs
// (tách ra 2026-09-11 để backend test/Testcontainers dùng lại đúng SQL thật).
using (var scope = app.Services.CreateScope())
{
    var db     = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await SchemaBootstrapper.ApplyAsync(db, logger);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<GameHub>("/hubs/game");
app.MapGet("/health", async (AppDbContext db, IConnectionMultiplexer redis, RabbitMqPublisher queue) =>
{
    var timeout = TimeSpan.FromSeconds(3);

    async Task<bool> CheckAsync(Func<Task<bool>> check)
    {
        try { return await check().WaitAsync(timeout); }
        catch { return false; }
    }

    var postgresTask = CheckAsync(() => db.Database.CanConnectAsync());
    var redisTask = CheckAsync(async () => (await redis.GetDatabase().PingAsync()) >= TimeSpan.Zero);
    var rabbitMqTask = queue.IsHealthyAsync(timeout);
    await Task.WhenAll(postgresTask, redisTask, rabbitMqTask);

    var postgresOk = await postgresTask;
    var redisOk = await redisTask;
    var rabbitMqOk = await rabbitMqTask;
    var healthy = postgresOk && redisOk && rabbitMqOk;

    var body = new
    {
        status = healthy ? "healthy" : "unhealthy",
        postgres = postgresOk ? "up" : "down",
        redis = redisOk ? "up" : "down",
        rabbitmq = rabbitMqOk ? "up" : "down",
    };
    return healthy ? Results.Ok(body) : Results.Json(body, statusCode: StatusCodes.Status503ServiceUnavailable);
});

app.Run();

/// <summary>Marker cho <c>WebApplicationFactory&lt;Program&gt;</c> — top-level statements sinh ra
/// class `Program` internal, cần khai báo partial public để project test tham chiếu được.</summary>
public partial class Program { }
