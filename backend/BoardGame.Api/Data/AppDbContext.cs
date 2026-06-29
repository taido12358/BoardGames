using BoardGame.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BoardGame.Api.Data;

/// <summary>
/// EF Core context backed by PostgreSQL.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Greeting> Greetings => Set<Greeting>();
}
