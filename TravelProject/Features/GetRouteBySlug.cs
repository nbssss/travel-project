using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Route = TravelProject.Models.Route;

namespace TravelProject.Features
{
    public class GetRouteBySlug
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/routes/{slug}", async (string slug, ApplicationDbContext db, HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);

                var route = await db.Routes
                    .Include(r => r.Owner)
                    .Include(r => r.Points.OrderBy(p => p.Order))
                    .Include(r => r.Photos.OrderBy(p => p.Order))
                    .FirstOrDefaultAsync(r => r.Slug == slug);

                if (route is null) return Results.NotFound();

                var likesCount = await db.RouteLikes.CountAsync(l => l.RouteId == route.Id);
                var isLikedByMe = userId != null &&
                    await db.RouteLikes.AnyAsync(l => l.RouteId == route.Id && l.UserId == userId);

                return Results.Ok(ToDto(route, likesCount, isLikedByMe));
            });
        }

        private static object ToDto(Route r, int likesCount, bool isLikedByMe) => new
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
            LikesCount = likesCount,
            IsLikedByMe = isLikedByMe,
            Points = r.Points.Select(p => new
            {
                p.Order, p.Lat, p.Lng, p.Elevation, p.Kind, p.Name, p.Note,
            }),
            Photos = r.Photos.Select(p => new { p.Id, p.Url, p.Order }),
        };
    }
}
