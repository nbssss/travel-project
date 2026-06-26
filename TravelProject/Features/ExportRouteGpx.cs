using System.Globalization;
using System.Security;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Route = TravelProject.Models.Route;

namespace TravelProject.Features
{
    public class ExportRouteGpx
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/routes/{id:guid}/export/gpx", async (
                Guid id,
                ApplicationDbContext db,
                HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);

                var route = await db.Routes
                    .Include(r => r.Points.OrderBy(p => p.Order))
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (route is null) return Results.NotFound();
                if (!route.IsPublic && route.OwnerId != userId) return Results.NotFound();

                var gpx = BuildGpx(route);
                var bytes = Encoding.UTF8.GetBytes(gpx);
                var fileName = $"{(string.IsNullOrWhiteSpace(route.Slug) ? "trasa" : route.Slug)}.gpx";

                return Results.File(bytes, "application/gpx+xml", fileName);
            });
        }

        private static string BuildGpx(Route route)
        {
            var inv = CultureInfo.InvariantCulture;
            var sb = new StringBuilder();

            sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
            sb.AppendLine("<gpx version=\"1.1\" creator=\"TravelRoutes\" xmlns=\"http://www.topografix.com/GPX/1/1\">");

            sb.AppendLine("  <metadata>");
            sb.AppendLine($"    <name>{Esc(route.Title)}</name>");
            if (!string.IsNullOrWhiteSpace(route.Description))
                sb.AppendLine($"    <desc>{Esc(route.Description)}</desc>");
            sb.AppendLine($"    <time>{route.UpdatedAt:yyyy-MM-ddTHH:mm:ssZ}</time>");
            sb.AppendLine("  </metadata>");

            foreach (var p in route.Points.Where(p => p.Kind != "track" && !string.IsNullOrWhiteSpace(p.Name)))
            {
                sb.AppendLine($"  <wpt lat=\"{p.Lat.ToString(inv)}\" lon=\"{p.Lng.ToString(inv)}\">");
                if (p.Elevation is double wele)
                    sb.AppendLine($"    <ele>{wele.ToString(inv)}</ele>");
                sb.AppendLine($"    <name>{Esc(p.Name!)}</name>");
                if (!string.IsNullOrWhiteSpace(p.Note))
                    sb.AppendLine($"    <desc>{Esc(p.Note)}</desc>");
                sb.AppendLine("  </wpt>");
            }

            sb.AppendLine("  <trk>");
            sb.AppendLine($"    <name>{Esc(route.Title)}</name>");
            sb.AppendLine("    <trkseg>");
            foreach (var p in route.Points)
            {
                sb.AppendLine($"      <trkpt lat=\"{p.Lat.ToString(inv)}\" lon=\"{p.Lng.ToString(inv)}\">");
                if (p.Elevation is double ele)
                    sb.AppendLine($"        <ele>{ele.ToString(inv)}</ele>");
                sb.AppendLine("      </trkpt>");
            }
            sb.AppendLine("    </trkseg>");
            sb.AppendLine("  </trk>");

            sb.AppendLine("</gpx>");
            return sb.ToString();
        }

        private static string Esc(string text) => SecurityElement.Escape(text) ?? string.Empty;
    }
}
