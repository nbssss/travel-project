using System.Text.Json;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using TravelProject.Models;
using Route = TravelProject.Models.Route;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> dbContextOptions)
    : IdentityDbContext<ApplicationUser>(dbContextOptions)
{
    public DbSet<Route> Routes => Set<Route>();
    public DbSet<RoutePoint> RoutePoints => Set<RoutePoint>();
    public DbSet<RouteShare> RouteShares => Set<RouteShare>();
    public DbSet<RouteLike> RouteLikes => Set<RouteLike>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.HasDefaultSchema("Identity");

        builder.Entity<Route>(e =>
        {
            e.ToTable("Routes", schema: "public");
            e.Property(r => r.Title).HasMaxLength(200);
            e.Property(r => r.Slug).HasMaxLength(250);
            e.Property(r => r.Region).HasMaxLength(100);
            e.Property(r => r.Country).HasMaxLength(100);
            e.Property(r => r.Difficulty).HasMaxLength(20);
            e.Property(r => r.Tags).HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>(),
                new ValueComparer<List<string>>(
                    (a, b) => a!.SequenceEqual(b!),
                    c => c.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
                    c => c.ToList()
                )
            );
            e.HasIndex(r => r.Slug).IsUnique();
            e.HasOne(r => r.Owner)
             .WithMany()
             .HasForeignKey(r => r.OwnerId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<RoutePoint>(e =>
        {
            e.ToTable("RoutePoints", schema: "public");
            e.Property(p => p.Kind).HasMaxLength(30);
            e.Property(p => p.Name).HasMaxLength(200);
            e.HasOne(p => p.Route)
             .WithMany(r => r.Points)
             .HasForeignKey(p => p.RouteId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<RouteShare>(e =>
        {
            e.ToTable("RouteShares", schema: "public");
            e.HasIndex(s => new { s.RouteId, s.SharedWithUserId }).IsUnique();
            e.HasOne(s => s.Route)
             .WithMany(r => r.Shares)
             .HasForeignKey(s => s.RouteId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.SharedWithUser)
             .WithMany()
             .HasForeignKey(s => s.SharedWithUserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RouteLike>(e =>
        {
            e.ToTable("RouteLikes", schema: "public");
            e.HasIndex(l => new { l.RouteId, l.UserId }).IsUnique();
            e.HasOne(l => l.Route)
             .WithMany()
             .HasForeignKey(l => l.RouteId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.User)
             .WithMany()
             .HasForeignKey(l => l.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
