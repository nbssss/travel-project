using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using TravelRoutes.Api.Data;
using TravelRoutes.Api.Models;

namespace TravelRoutes.Api
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            builder.Services.AddOpenApi();

            var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                                   ?? builder.Configuration["ConnectionStrings:DefaultConnection"]
                                   ?? "Host=localhost;Port=5432;Database=travel;Username=user;Password=password";

            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(connectionString));

            builder.Services.AddIdentity<AppUser, IdentityRole>()
                .AddEntityFrameworkStores<AppDbContext>()
                .AddDefaultTokenProviders();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
            }

            // Apply migrations and seed sample data
            using (var scope = app.Services.CreateScope())
            {
                var services = scope.ServiceProvider;
                try
                {
                    var db = services.GetRequiredService<AppDbContext>();
                    await db.Database.MigrateAsync();

                    var userManager = services.GetRequiredService<UserManager<AppUser>>();

                    if (!userManager.Users.Any())
                    {
                        var admin = new AppUser
                        {
                            UserName = "admin",
                            Email = "admin@example.com",
                            CreatedAt = DateTime.UtcNow,
                            EmailConfirmed = true
                        };

                        var createResult = await userManager.CreateAsync(admin, "Password123!");
                        if (createResult.Succeeded)
                        {
                            var route = SeedData.CreateSampleRoute(admin);
                            db.Routes.Add(route);
                            await db.SaveChangesAsync();
                        }
                        else
                        {
                            var logger = services.GetRequiredService<ILogger<Program>>();
                            logger.LogWarning("Failed to create seed user: {Errors}", string.Join(';', createResult.Errors.Select(e => e.Description)));
                        }
                    }
                }
                catch (Exception ex)
                {
                    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
                    logger.LogError(ex, "An error occurred migrating or seeding the database.");
                }
            }

            app.UseHttpsRedirection();

            var summaries = new[]
            {
                "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
            };

            app.MapGet("/weatherforecast", () =>
            {
                var forecast =  Enumerable.Range(1, 5).Select(index =>
                    new WeatherForecast
                    (
                        DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                        Random.Shared.Next(-20, 55),
                        summaries[Random.Shared.Next(summaries.Length)]
                    ))
                    .ToArray();
                return forecast;
            })
            .WithName("GetWeatherForecast");

            app.Run();
        }
    }

    record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
    {
        public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
    }
}
