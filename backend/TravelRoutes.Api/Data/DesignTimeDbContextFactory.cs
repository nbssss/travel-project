using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace TravelRoutes.Api.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var builder = new DbContextOptionsBuilder<AppDbContext>();
        // Use PostgreSQL (Npgsql) provider for design-time migrations. Adjust connection string as needed.
        builder.UseNpgsql("Host=localhost;Database=travel;Username=user;Password=password");
        return new AppDbContext(builder.Options);
    }
}