using BoardGame.Api.Data;
using BoardGame.Api.Hubs;
using BoardGame.Api.Services;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// --- Database: PostgreSQL via EF Core ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")
        ?? "Host=localhost;Port=5432;Database=boardgame;Username=postgres;Password=postgres"));

// --- Cache: Redis ---
builder.Services.AddSingleton<IConnectionMultiplexer>(_ =>
    ConnectionMultiplexer.Connect(builder.Configuration.GetConnectionString("Redis")
        ?? "localhost:6379"));
builder.Services.AddSingleton<RedisCacheService>();

// --- Queue: RabbitMQ ---
builder.Services.AddSingleton<RabbitMqPublisher>();

// --- Search: OpenSearch ---
builder.Services.AddSingleton<OpenSearchService>();

// --- Storage: MinIO ---
builder.Services.AddSingleton<MinioStorageService>();

// --- Realtime: SignalR ---
builder.Services.AddSignalR();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

var app = builder.Build();

// Apply migrations / create the schema on startup (fine for a hello-world sample).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.MapControllers();
app.MapHub<GameHub>("/hubs/game");
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.Run();
