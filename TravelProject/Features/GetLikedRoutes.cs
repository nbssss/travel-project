using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace TravelProject.Features
{
    public class GetLikedRoutes
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/routes/liked", async (ApplicationDbContext db, HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var routes = await db.RouteLikes
                    .Where(l => l.UserId == userId)
                    .OrderByDescending(l => l.CreatedAt)
                    .Include(l => l.Route)
                    .ThenInclude(r => r.Owner)
                    .Select(l => l.Route)
                    .ToListAsync();

                var routeIds = routes.Select(r => r.Id).ToList();

                var countsMap = routeIds.Count > 0
                    ? await db.RouteLikes
                        .Where(l => routeIds.Contains(l.RouteId))
                        .GroupBy(l => l.RouteId)
                        .ToDictionaryAsync(g => g.Key, g => g.Count())
                    : [];

                return Results.Ok(routes.Select(r => GetMyRoutes.ToDto(r, r.Owner?.UserName,
                    countsMap.GetValueOrDefault(r.Id, 0),
                    isLikedByMe: true)));
            })
            .RequireAuthorization();
        }
    }
}
