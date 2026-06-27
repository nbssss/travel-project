using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TravelProject.Infrastructure;
using TravelProject.Services;

namespace TravelProject
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers(options =>
                options.Filters.Add<ValidationActionFilter>());
            builder.Services.Configure<ApiBehaviorOptions>(options =>
                options.SuppressModelStateInvalidFilter = true);
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.AddProblemDetails();

            builder.Services.AddDbContext<ApplicationDbContext>(options =>
                options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

            builder.Services.AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<ApplicationDbContext>();

            builder.Services
                .AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                })
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = builder.Configuration["Jwt:Issuer"],
                        ValidAudience = builder.Configuration["Jwt:Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]!))
                    };
                });

            builder.Services.AddAuthorization();

            builder.Services.AddValidatorsFromAssemblyContaining<Program>();
            builder.Services.AddAntiforgery();

            builder.Services.AddHealthChecks()
                .AddDbContextCheck<ApplicationDbContext>("database");

            var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
            builder.Services.AddCors(options =>
                options.AddDefaultPolicy(policy =>
                    policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod()));

            builder.Services.AddScoped<AuthService>();
            builder.Services.AddScoped<RouteService>();
            builder.Services.AddScoped<UserService>();

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();

                using var scope = app.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                db.Database.Migrate();

                // Do demo
                Data.DemoDataSeeder.SeedAsync(scope.ServiceProvider).GetAwaiter().GetResult();
            }

            app.UseExceptionHandler();
            app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseCors();
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseAntiforgery();

            app.MapHealthChecks("/health");

            app.MapControllers();

            app.Run();
        }
    }
}
