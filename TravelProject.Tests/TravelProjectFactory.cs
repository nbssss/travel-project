using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

public class TravelProjectFactory : WebApplicationFactory<TravelProject.Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // "Test" environment skips the auto-migration block in Program.cs
        builder.UseEnvironment("Test");

        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Issuer"] = "TravelRoutes",
                ["Jwt:Audience"] = "TravelRoutesClient",
                ["Jwt:ExpirationInMinutes"] = "60",
                // 32-char key satisfies HMACSHA256 minimum
                ["Jwt:SecretKey"] = "test-secret-key-32chars-minimum!",
                ["Cors:AllowedOrigins:0"] = "http://localhost:5173",
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace PostgreSQL context with in-memory
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (descriptor is not null) services.Remove(descriptor);

            // Name captured once — all requests share the same in-memory database
            var dbName = "TestDb_" + Guid.NewGuid();
            services.AddDbContext<ApplicationDbContext>(opt =>
                opt.UseInMemoryDatabase(dbName)
                   .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning)));

            // EnsureCreated takes the place of migrations for in-memory
            using var scope = services.BuildServiceProvider().CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Database.EnsureCreated();
        });
    }
}
