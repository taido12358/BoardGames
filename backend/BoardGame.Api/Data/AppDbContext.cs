using BoardGame.Api.Models;
using BoardGame.Api.Platform.Models;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Data;

/// <summary>
/// EF Core context backed by PostgreSQL.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Greeting> Greetings => Set<Greeting>();
    public DbSet<GameRoom> GameRooms => Set<GameRoom>();
    public DbSet<GameMove> GameMoves => Set<GameMove>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Map & State lưu dạng JSONB cho linh hoạt (shape tuỳ từng game).
        modelBuilder.Entity<GameRoom>(e =>
        {
            e.Property(r => r.MapJson).HasColumnType("jsonb");
            e.Property(r => r.StateJson).HasColumnType("jsonb");
        });

        modelBuilder.Entity<GameMove>(e =>
        {
            e.Property(m => m.MoveJson).HasColumnType("jsonb");
            e.HasIndex(m => new { m.RoomId, m.MoveNumber });
        });
    }
}
