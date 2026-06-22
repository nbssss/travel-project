using Microsoft.EntityFrameworkCore;
using Route = TravelProject.Models.Route;

namespace TravelProject.Features
{
    public class GetRecentRoutes
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/routes/recent", async (ApplicationDbContext db) =>
            {
                var routes = await db.Routes
                    .Where(r => r.IsPublic)
                    .OrderByDescending(r => r.CreatedAt)
                    .Take(5)
                    .Include(r => r.Owner)
                    .ToListAsync();

                return Results.Ok(routes.Select(r => GetMyRoutes.ToDto(r, r.Owner?.UserName)));
            });
        }
    }
}
