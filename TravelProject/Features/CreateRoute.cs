using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TravelProject.Models;
using Route = TravelProject.Models.Route;

namespace TravelProject.Features
{
    public class CreateRoute
    {
        public record CreateRouteRequest(
            string Title,
            string? Description,
            string? Region,
            string? Country,
            string Difficulty,
            bool IsPublic,
            List<string>? Tags
        );

        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("/routes", async (
                CreateRouteRequest req,
                ApplicationDbContext db,
                HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var slug = await GenerateSlugAsync(req.Title, db);

                var route = new Route
                {
                    Id = Guid.NewGuid(),
                    Title = req.Title,
                    Slug = slug,
                    Description = req.Description,
                    Region = req.Region,
                    Country = req.Country,
                    Difficulty = req.Difficulty,
                    IsPublic = req.IsPublic,
                    Tags = req.Tags ?? [],
                    OwnerId = userId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };

                db.Routes.Add(route);
                await db.SaveChangesAsync();

                return Results.Created($"/routes/{route.Id}", ToDto(route));
            })
            .RequireAuthorization();
        }

        private static async Task<string> GenerateSlugAsync(string title, ApplicationDbContext db)
        {
            var baseSlug = Slugify(title);
            var slug = baseSlug;
            var counter = 1;
            while (await db.Routes.AnyAsync(r => r.Slug == slug))
                slug = $"{baseSlug}-{counter++}";
            return slug;
        }

        private static string Slugify(string text)
        {
            text = text.ToLowerInvariant().Trim();
            text = Regex.Replace(text, @"[^a-z0-9\s-]", "");
            text = Regex.Replace(text, @"\s+", "-");
            return text.Length > 200 ? text[..200] : text;
        }

        internal static object ToDto(Route route) => new
        {
            route.Id,
            route.Slug,
            route.Title,
            route.Difficulty,
            route.DistanceKm,
            route.AscentM,
            route.DurationH,
            route.IsPublic,
            route.UpdatedAt,
        };
    }
}
