using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TravelRoutes.Api.Models;
using RouteModel = TravelRoutes.Api.Models.Route;

namespace TravelRoutes.Api.Data;

public class AppDbContext
    : IdentityDbContext<AppUser>
{
    public AppDbContext(
        DbContextOptions<AppDbContext> options
    ) : base(options)
    {
    }

    public DbSet<RouteModel> Routes { get; set; }

    public DbSet<RoutePoint> RoutePoints { get; set; }

    public DbSet<RouteShare> RouteShares { get; set; }

    protected override void OnModelCreating(
        ModelBuilder builder
    )
    {
        base.OnModelCreating(builder);

        builder.Entity<RouteModel>()
            .HasOne(r => r.Owner)
            .WithMany()
            .HasForeignKey(r => r.OwnerId);

        builder.Entity<RoutePoint>()
            .HasOne(p => p.Route)
            .WithMany(r => r.Points)
            .HasForeignKey(p => p.RouteId);
    }
}