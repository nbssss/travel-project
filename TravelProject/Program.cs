using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TravelProject.Features;

namespace TravelProject
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers();
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

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();

                using var scope = app.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                db.Database.Migrate();
            }

            app.UseExceptionHandler();
            app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseCors();
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseAntiforgery();

            app.MapHealthChecks("/health");

            GetStats.MapEndpoint(app);
            GetProfile.MapEndpoint(app);
            UploadAvatar.MapEndpoint(app);
            RegisterUser.MapEndpoint(app);
            LoginUser.MapEndpoint(app);
            CreateRoute.MapEndpoint(app);
            UpdateRoute.MapEndpoint(app);
            DeleteRoute.MapEndpoint(app);
            ExportRouteGpx.MapEndpoint(app);
            UpsertRoutePoints.MapEndpoint(app);
            GetMyRoutes.MapEndpoint(app);
            GetRecentRoutes.MapEndpoint(app);
            GetLikedRoutes.MapEndpoint(app);
            LikeRoute.MapEndpoint(app);
            UnlikeRoute.MapEndpoint(app);
            GetRouteBySlug.MapEndpoint(app);

            app.MapControllers();

            app.Run();
        }
    }
}
