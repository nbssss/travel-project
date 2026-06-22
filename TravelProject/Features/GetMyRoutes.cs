using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Route = TravelProject.Models.Route;

namespace TravelProject.Features
{
    public class GetMyRoutes
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/routes/mine", async (
                ApplicationDbContext db,
                HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var ownerUserName = httpContext.User.FindFirstValue(JwtRegisteredClaimNames.Name)
                                 ?? httpContext.User.FindFirstValue("name");

                var routes = await db.Routes
                    .Where(r => r.OwnerId == userId)
                    .OrderByDescending(r => r.UpdatedAt)
                    .ToListAsync();

                return Results.Ok(routes.Select(r => ToDto(r, ownerUserName)));
            })
            .RequireAuthorization();
        }

        internal static object ToDto(Route r, string? ownerUserName) => new
        {
            r.Id,
            r.Slug,
            r.Title,
            r.Region,
            r.Difficulty,
            r.DistanceKm,
            r.AscentM,
            r.DurationH,
            r.IsPublic,
            r.UpdatedAt,
            OwnerUserName = ownerUserName,
        };
    }
}
