using BoardGame.Api.Models;
using BoardGame.Api.Platform.Auth;
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
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<AuthOtp> AuthOtps => Set<AuthOtp>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Map & State lưu dạng JSONB cho linh hoạt (shape tuỳ từng game).
        modelBuilder.Entity<GameRoom>(e =>
        {
            e.Property(r => r.MapJson).HasColumnType("jsonb");
            e.Property(r => r.StateJson).HasColumnType("jsonb");
            e.Property(r => r.SeatsJson).HasColumnType("jsonb");
            // Concurrency token: EF Core thêm "WHERE UpdatedAt = @original" vào mọi UPDATE.
            // Nếu hai request đồng thời ghi vào cùng phòng, request thứ hai sẽ nhận
            // DbUpdateConcurrencyException thay vì silently ghi đè.
            e.Property(r => r.UpdatedAt).IsConcurrencyToken();
        });

        modelBuilder.Entity<GameMove>(e =>
        {
            e.Property(m => m.MoveJson).HasColumnType("jsonb");
            e.HasIndex(m => new { m.RoomId, m.MoveNumber });
        });

        modelBuilder.Entity<AppUser>(e =>
        {
            e.ToTable("Users");
            e.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<AuthOtp>(e =>
        {
            e.ToTable("AuthOtps");
            e.HasIndex(o => o.Email);
        });
    }
}
