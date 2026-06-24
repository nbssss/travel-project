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

                var routeIds = routes.Select(r => r.Id).ToList();

                var countsMap = routeIds.Count > 0
                    ? await db.RouteLikes
                        .Where(l => routeIds.Contains(l.RouteId))
                        .GroupBy(l => l.RouteId)
                        .ToDictionaryAsync(g => g.Key, g => g.Count())
                    : [];

                var userLiked = routeIds.Count > 0
                    ? (await db.RouteLikes
                        .Where(l => l.UserId == userId && routeIds.Contains(l.RouteId))
                        .Select(l => l.RouteId)
                        .ToListAsync()).ToHashSet()
                    : new HashSet<Guid>();

                return Results.Ok(routes.Select(r => ToDto(r, ownerUserName,
                    countsMap.GetValueOrDefault(r.Id, 0),
                    userLiked.Contains(r.Id))));
            })
            .RequireAuthorization();
        }

        internal static object ToDto(Route r, string? ownerUserName, int likesCount = 0, bool isLikedByMe = false) => new
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
            LikesCount = likesCount,
            IsLikedByMe = isLikedByMe,
        };
    }
}
