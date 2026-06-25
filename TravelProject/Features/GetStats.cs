using Microsoft.EntityFrameworkCore;

namespace TravelProject.Features
{
    public class GetStats
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/stats", async (ApplicationDbContext db) =>
            {
                var count = await db.Users.CountAsync();
                var rounded = (int)(Math.Ceiling(count / 100.0) * 100);
                return Results.Ok(new { userCount = rounded });
            });
        }
    }
}
