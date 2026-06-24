using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TravelProject.Models;

namespace TravelProject.Features
{
    public class LikeRoute
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("/routes/{id:guid}/like", async (Guid id, ApplicationDbContext db, HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var route = await db.Routes.FindAsync(id);
                if (route is null) return Results.NotFound();

                var existing = await db.RouteLikes.FirstOrDefaultAsync(l => l.RouteId == id && l.UserId == userId);
                if (existing is null)
                {
                    db.RouteLikes.Add(new RouteLike { RouteId = id, UserId = userId });
                    await db.SaveChangesAsync();
                }

                var count = await db.RouteLikes.CountAsync(l => l.RouteId == id);
                return Results.Ok(new { liked = true, likesCount = count });
            })
            .RequireAuthorization();
        }
    }
}
