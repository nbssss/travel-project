using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace TravelProject.Features
{
    public class UpdateRoute
    {
        public record UpdateRouteRequest(
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
            app.MapPut("/routes/{id:guid}", async (
                Guid id,
                UpdateRouteRequest req,
                ApplicationDbContext db,
                HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var route = await db.Routes.FirstOrDefaultAsync(r => r.Id == id);
                if (route is null) return Results.NotFound();
                if (route.OwnerId != userId) return Results.Forbid();

                // slug pozostaje bez zmian — to klucz w URL-ach frontendu
                route.Title = req.Title;
                route.Description = req.Description;
                route.Region = req.Region;
                route.Country = req.Country;
                route.Difficulty = req.Difficulty;
                route.IsPublic = req.IsPublic;
                route.Tags = req.Tags ?? [];
                route.UpdatedAt = DateTime.UtcNow;

                await db.SaveChangesAsync();

                return Results.Ok(CreateRoute.ToDto(route));
            })
            .RequireAuthorization();
        }
    }
}
