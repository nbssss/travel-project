using Microsoft.EntityFrameworkCore;
using Route = TravelProject.Models.Route;

namespace TravelProject.Features
{
    public class GetRouteBySlug
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/routes/{slug}", async (string slug, ApplicationDbContext db) =>
            {
                var route = await db.Routes
                    .Include(r => r.Owner)
                    .Include(r => r.Points.OrderBy(p => p.Order))
                    .FirstOrDefaultAsync(r => r.Slug == slug);

                if (route is null) return Results.NotFound();

                return Results.Ok(ToDto(route));
            });
        }

        private static object ToDto(Route r) => new
        {
            r.Id,
            r.Slug,
            r.Title,
            r.Description,
            r.Region,
            r.Country,
            r.Difficulty,
            r.DistanceKm,
            r.AscentM,
            r.DurationH,
            r.IsPublic,
            r.Tags,
            r.CreatedAt,
            r.UpdatedAt,
            OwnerUserName = r.Owner?.UserName,
            Points = r.Points.Select(p => new
            {
                p.Order,
                p.Lat,
                p.Lng,
                p.Elevation,
                p.Kind,
                p.Name,
                p.Note,
            }),
        };
    }
}
