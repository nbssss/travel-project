using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace TravelProject.Features
{
    public class DeleteRoute
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapDelete("/routes/{id:guid}", async (
                Guid id,
                ClaimsPrincipal claims,
                ApplicationDbContext db) =>
            {
                var userId = claims.FindFirstValue("sub")
                          ?? claims.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var route = await db.Routes.FirstOrDefaultAsync(r => r.Id == id);
                if (route is null) return Results.NotFound();
                if (route.OwnerId != userId) return Results.Forbid();

                db.Routes.Remove(route);
                await db.SaveChangesAsync();

                return Results.NoContent();
            })
            .RequireAuthorization();
        }
    }
}
