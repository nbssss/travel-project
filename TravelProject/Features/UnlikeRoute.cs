using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace TravelProject.Features
{
    public class UnlikeRoute
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapDelete("/routes/{id:guid}/like", async (Guid id, ApplicationDbContext db, HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var like = await db.RouteLikes.FirstOrDefaultAsync(l => l.RouteId == id && l.UserId == userId);
                if (like is not null)
                {
                    db.RouteLikes.Remove(like);
                    await db.SaveChangesAsync();
                }

                var count = await db.RouteLikes.CountAsync(l => l.RouteId == id);
                return Results.Ok(new { liked = false, likesCount = count });
            })
            .RequireAuthorization();
        }
    }
}
