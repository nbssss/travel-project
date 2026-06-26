using System.Security.Claims;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using TravelProject.Infrastructure;
using TravelProject.Models;

namespace TravelProject.Features
{
    public class UpsertRoutePoints
    {
        public record RoutePointRequest(
            int Order,
            double Lat,
            double Lng,
            double? Elevation,
            string Kind,
            string? Name,
            string? Note
        );

        public record UpsertPointsRequest(List<RoutePointRequest> Points);

        public class Validator : AbstractValidator<UpsertPointsRequest>
        {
            public Validator()
            {
                RuleFor(x => x.Points).NotNull().WithMessage("Lista punktów jest wymagana.");

                RuleForEach(x => x.Points).ChildRules(p =>
                {
                    p.RuleFor(pt => pt.Order).GreaterThanOrEqualTo(0).WithMessage("Order musi być >= 0.");
                    p.RuleFor(pt => pt.Lat).InclusiveBetween(-90, 90).WithMessage("Szerokość geograficzna poza zakresem.");
                    p.RuleFor(pt => pt.Lng).InclusiveBetween(-180, 180).WithMessage("Długość geograficzna poza zakresem.");
                    p.RuleFor(pt => pt.Kind).NotEmpty().WithMessage("Rodzaj punktu (kind) jest wymagany.");
                });
            }
        }

        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPut("/routes/{id:guid}/points", async (
                Guid id,
                UpsertPointsRequest req,
                ApplicationDbContext db,
                HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var route = await db.Routes
                    .Include(r => r.Points)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (route is null) return Results.NotFound();
                if (route.OwnerId != userId) return Results.StatusCode(403);

                // Wymień wszystkie punkty
                db.RoutePoints.RemoveRange(route.Points);

                var newPoints = req.Points.Select(p => new RoutePoint
                {
                    Id = Guid.NewGuid(),
                    RouteId = id,
                    Order = p.Order,
                    Lat = p.Lat,
                    Lng = p.Lng,
                    Elevation = p.Elevation,
                    Kind = p.Kind,
                    Name = p.Name,
                    Note = p.Note,
                }).ToList();

                db.RoutePoints.AddRange(newPoints);
                route.Points = newPoints;

                // Przelicz metryki
                var ordered = newPoints.OrderBy(p => p.Order).ToList();
                route.DistanceKm = CalculateDistanceKm(ordered);
                route.AscentM = CalculateAscentM(ordered);
                route.DurationH = Math.Round(route.DistanceKm / 4.0 + route.AscentM / 600.0, 1);
                route.UpdatedAt = DateTime.UtcNow;

                await db.SaveChangesAsync();

                return Results.Ok(CreateRoute.ToDto(route));
            })
            .RequireAuthorization()
            .AddEndpointFilter<ValidationFilter<UpsertPointsRequest>>();
        }

        private static double CalculateDistanceKm(List<RoutePoint> pts)
        {
            double total = 0;
            for (int i = 1; i < pts.Count; i++)
                total += Haversine(pts[i - 1].Lat, pts[i - 1].Lng, pts[i].Lat, pts[i].Lng);
            return Math.Round(total, 1);
        }

        private static int CalculateAscentM(List<RoutePoint> pts)
        {
            int ascent = 0;
            for (int i = 1; i < pts.Count; i++)
            {
                if (pts[i].Elevation.HasValue && pts[i - 1].Elevation.HasValue)
                {
                    var diff = pts[i].Elevation!.Value - pts[i - 1].Elevation!.Value;
                    if (diff > 0) ascent += (int)diff;
                }
            }
            return ascent;
        }

        private static double Haversine(double lat1, double lng1, double lat2, double lng2)
        {
            const double R = 6371;
            var dLat = ToRad(lat2 - lat1);
            var dLng = ToRad(lng2 - lng1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                  + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
                  * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
            return 2 * R * Math.Asin(Math.Sqrt(a));
        }

        private static double ToRad(double deg) => deg * Math.PI / 180;
    }
}
