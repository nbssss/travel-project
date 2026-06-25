using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace TravelProject.Features
{
    public class GetRecentRoutes
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/routes/recent", async (ApplicationDbContext db, HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);

                var routes = await db.Routes
                    .Where(r => r.IsPublic)
                    .OrderByDescending(r => r.CreatedAt)
                    .Take(10)
                    .Include(r => r.Owner)
                    .ToListAsync();

                var routeIds = routes.Select(r => r.Id).ToList();

                var countsMap = routeIds.Count > 0
                    ? await db.RouteLikes
                        .Where(l => routeIds.Contains(l.RouteId))
                        .GroupBy(l => l.RouteId)
                        .ToDictionaryAsync(g => g.Key, g => g.Count())
                    : [];

                var userLiked = new HashSet<Guid>();
                if (userId != null && routeIds.Count > 0)
                {
                    userLiked = (await db.RouteLikes
                        .Where(l => l.UserId == userId && routeIds.Contains(l.RouteId))
                        .Select(l => l.RouteId)
                        .ToListAsync()).ToHashSet();
                }

                return Results.Ok(routes.Select(r => GetMyRoutes.ToDto(r, r.Owner?.UserName,
                    countsMap.GetValueOrDefault(r.Id, 0),
                    userLiked.Contains(r.Id))));
            });
        }
    }
}
