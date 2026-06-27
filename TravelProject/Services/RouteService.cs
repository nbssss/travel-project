using System.Globalization;
using System.Security;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TravelProject.Models;
using TravelProject.Models.Dtos;
using Route = TravelProject.Models.Route;

namespace TravelProject.Services
{
    public class RouteService(ApplicationDbContext db)
    {
        public async Task<CreateRouteResult> CreateAsync(string userId, CreateRouteRequest req)
        {
            var slug = await GenerateSlugAsync(req.Title);

            var route = new Route
            {
                Id = Guid.NewGuid(),
                Title = req.Title,
                Slug = slug,
                Description = req.Description,
                Region = req.Region,
                Country = req.Country,
                Difficulty = req.Difficulty,
                IsPublic = req.IsPublic,
                Tags = req.Tags ?? [],
                OwnerId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            db.Routes.Add(route);
            await db.SaveChangesAsync();

            return new CreateRouteResult(route.Id, ToSummaryDto(route));
        }

        public async Task<RouteResult> UpdateAsync(string userId, Guid id, UpdateRouteRequest req)
        {
            var route = await db.Routes.FirstOrDefaultAsync(r => r.Id == id);
            if (route is null) return new RouteResult(RouteOp.NotFound);
            if (route.OwnerId != userId) return new RouteResult(RouteOp.Forbidden);

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

            return new RouteResult(RouteOp.Success, ToSummaryDto(route));
        }

        public async Task<RouteOp> DeleteAsync(string userId, Guid id)
        {
            var route = await db.Routes.FirstOrDefaultAsync(r => r.Id == id);
            if (route is null) return RouteOp.NotFound;
            if (route.OwnerId != userId) return RouteOp.Forbidden;

            db.Routes.Remove(route);
            await db.SaveChangesAsync();

            return RouteOp.Success;
        }

        public async Task<RouteResult> UpsertPointsAsync(string userId, Guid id, UpsertPointsRequest req)
        {
            var route = await db.Routes
                .Include(r => r.Points)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (route is null) return new RouteResult(RouteOp.NotFound);
            if (route.OwnerId != userId) return new RouteResult(RouteOp.Forbidden);

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

            // Metryki: użyj wartości z BRoutera (front), gdy dostępne; inaczej przelicz lokalnie
            var ordered = newPoints.OrderBy(p => p.Order).ToList();
            route.DistanceKm = req.DistanceKm.HasValue
                ? Math.Round(req.DistanceKm.Value, 1)
                : CalculateDistanceKm(ordered);
            route.AscentM = req.AscentM ?? CalculateAscentM(ordered);
            route.DescentM = req.DescentM ?? 0;
            route.DurationH = req.DurationH.HasValue
                ? Math.Round(req.DurationH.Value, 1)
                : Math.Round(route.DistanceKm / 4.0 + route.AscentM / 400.0, 1);
            route.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();

            return new RouteResult(RouteOp.Success, ToSummaryDto(route));
        }

        public async Task<RouteDetailResponse?> GetBySlugAsync(string? userId, string slug)
        {
            var route = await db.Routes
                .Include(r => r.Owner)
                .Include(r => r.Points.OrderBy(p => p.Order))
                .FirstOrDefaultAsync(r => r.Slug == slug);

            if (route is null) return null;

            var likesCount = await db.RouteLikes.CountAsync(l => l.RouteId == route.Id);
            var isLikedByMe = userId != null &&
                await db.RouteLikes.AnyAsync(l => l.RouteId == route.Id && l.UserId == userId);

            return ToDetailDto(route, likesCount, isLikedByMe);
        }

        public async Task<IReadOnlyList<RouteListItemResponse>> GetMineAsync(string userId, string? ownerUserName)
        {
            var routes = await db.Routes
                .Where(r => r.OwnerId == userId)
                .OrderByDescending(r => r.UpdatedAt)
                .Include(r => r.Points)
                .ToListAsync();

            var routeIds = routes.Select(r => r.Id).ToList();

            var countsMap = routeIds.Count > 0
                ? await db.RouteLikes
                    .Where(l => routeIds.Contains(l.RouteId))
                    .GroupBy(l => l.RouteId)
                    .ToDictionaryAsync(g => g.Key, g => g.Count())
                : [];

            var userLiked = routeIds.Count > 0
                ? (await db.RouteLikes
                    .Where(l => l.UserId == userId && routeIds.Contains(l.RouteId))
                    .Select(l => l.RouteId)
                    .ToListAsync()).ToHashSet()
                : new HashSet<Guid>();

            return routes.Select(r => ToListItemDto(r, ownerUserName,
                countsMap.GetValueOrDefault(r.Id, 0),
                userLiked.Contains(r.Id))).ToList();
        }

        public async Task<IReadOnlyList<RouteListItemResponse>> GetRecentAsync(string? userId)
        {
            var routes = await db.Routes
                .Where(r => r.IsPublic && (userId == null || r.OwnerId != userId))
                .OrderByDescending(r => r.CreatedAt)
                .Include(r => r.Owner)
                .Include(r => r.Points)
                .ToListAsync();

            var routeIds = routes.Select(r => r.Id).ToList();

            var countsMap = routeIds.Count > 0
                ? await db.RouteLikes
                    .Where(l => routeIds.Contains(l.RouteId))
                    .GroupBy(l => l.RouteId)
                    .ToDictionaryAsync(g => g.Key, g => g.Count())
                : [];

            var userLiked = new HashSet<Guid>();
            if (userId != null && routeIds.Count > 0)
            {
                userLiked = (await db.RouteLikes
                    .Where(l => l.UserId == userId && routeIds.Contains(l.RouteId))
                    .Select(l => l.RouteId)
                    .ToListAsync()).ToHashSet();
            }

            return routes.Select(r => ToListItemDto(r, r.Owner?.UserName,
                countsMap.GetValueOrDefault(r.Id, 0),
                userLiked.Contains(r.Id))).ToList();
        }

        public async Task<IReadOnlyList<RouteListItemResponse>> GetLikedAsync(string userId)
        {
            var routes = await db.RouteLikes
                .Where(l => l.UserId == userId)
                .OrderByDescending(l => l.CreatedAt)
                .Include(l => l.Route)
                    .ThenInclude(r => r.Owner)
                .Include(l => l.Route)
                    .ThenInclude(r => r.Points)
                .Select(l => l.Route)
                .ToListAsync();

            var routeIds = routes.Select(r => r.Id).ToList();

            var countsMap = routeIds.Count > 0
                ? await db.RouteLikes
                    .Where(l => routeIds.Contains(l.RouteId))
                    .GroupBy(l => l.RouteId)
                    .ToDictionaryAsync(g => g.Key, g => g.Count())
                : [];

            return routes.Select(r => ToListItemDto(r, r.Owner?.UserName,
                countsMap.GetValueOrDefault(r.Id, 0),
                isLikedByMe: true)).ToList();
        }

        public async Task<int?> LikeAsync(string userId, Guid id)
        {
            var route = await db.Routes.FindAsync(id);
            if (route is null) return null;

            var existing = await db.RouteLikes.FirstOrDefaultAsync(l => l.RouteId == id && l.UserId == userId);
            if (existing is null)
            {
                db.RouteLikes.Add(new RouteLike { RouteId = id, UserId = userId });
                await db.SaveChangesAsync();
            }

            return await db.RouteLikes.CountAsync(l => l.RouteId == id);
        }

        public async Task<int> UnlikeAsync(string userId, Guid id)
        {
            var like = await db.RouteLikes.FirstOrDefaultAsync(l => l.RouteId == id && l.UserId == userId);
            if (like is not null)
            {
                db.RouteLikes.Remove(like);
                await db.SaveChangesAsync();
            }

            return await db.RouteLikes.CountAsync(l => l.RouteId == id);
        }

        public async Task<GpxFile?> ExportGpxAsync(string? userId, Guid id)
        {
            var route = await db.Routes
                .Include(r => r.Points.OrderBy(p => p.Order))
                .FirstOrDefaultAsync(r => r.Id == id);

            if (route is null) return null;
            if (!route.IsPublic && route.OwnerId != userId) return null;

            var gpx = BuildGpx(route);
            var bytes = Encoding.UTF8.GetBytes(gpx);
            var fileName = $"{(string.IsNullOrWhiteSpace(route.Slug) ? "trasa" : route.Slug)}.gpx";

            return new GpxFile(bytes, fileName);
        }

        private async Task<string> GenerateSlugAsync(string title)
        {
            var baseSlug = Slugify(title);
            var slug = baseSlug;
            var counter = 1;
            while (await db.Routes.AnyAsync(r => r.Slug == slug))
                slug = $"{baseSlug}-{counter++}";
            return slug;
        }

        private static string Slugify(string text)
        {
            text = text.ToLowerInvariant().Trim();
            text = Regex.Replace(text, @"[^a-z0-9\s-]", "");
            text = Regex.Replace(text, @"\s+", "-");
            return text.Length > 200 ? text[..200] : text;
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

        // --- Mapowanie DTO (kształt JSON identyczny jak w poprzednich Feature'ach) ---

        private static RouteSummaryResponse ToSummaryDto(Route route) => new(
            Id: route.Id,
            Slug: route.Slug,
            Title: route.Title,
            Difficulty: route.Difficulty,
            DistanceKm: route.DistanceKm,
            AscentM: route.AscentM,
            DescentM: route.DescentM,
            DurationH: route.DurationH,
            IsPublic: route.IsPublic,
            UpdatedAt: route.UpdatedAt
        );

        private static RouteListItemResponse ToListItemDto(Route r, string? ownerUserName, int likesCount = 0, bool isLikedByMe = false) => new(
            Id: r.Id,
            Slug: r.Slug,
            Title: r.Title,
            Region: r.Region,
            Difficulty: r.Difficulty,
            DistanceKm: r.DistanceKm,
            AscentM: r.AscentM,
            DescentM: r.DescentM,
            DurationH: r.DurationH,
            IsPublic: r.IsPublic,
            UpdatedAt: r.UpdatedAt,
            OwnerUserName: ownerUserName,
            LikesCount: likesCount,
            IsLikedByMe: isLikedByMe,
            // Lekka geometria do miniaturki — same współrzędne POI (uproszczona ścieżka, bez nazw/wysokości).
            PreviewPath: r.Points
                .OrderBy(p => p.Order)
                .Select(p => new[] { p.Lat, p.Lng })
        );

        private static RouteDetailResponse ToDetailDto(Route r, int likesCount, bool isLikedByMe) => new(
            Id: r.Id,
            Slug: r.Slug,
            Title: r.Title,
            Description: r.Description,
            Region: r.Region,
            Country: r.Country,
            Difficulty: r.Difficulty,
            DistanceKm: r.DistanceKm,
            AscentM: r.AscentM,
            DescentM: r.DescentM,
            DurationH: r.DurationH,
            IsPublic: r.IsPublic,
            Tags: r.Tags,
            CreatedAt: r.CreatedAt,
            UpdatedAt: r.UpdatedAt,
            OwnerUserName: r.Owner?.UserName,
            LikesCount: likesCount,
            IsLikedByMe: isLikedByMe,
            Points: r.Points.Select(p => new RoutePointResponse(
                Order: p.Order,
                Lat: p.Lat,
                Lng: p.Lng,
                Elevation: p.Elevation,
                Kind: p.Kind,
                Name: p.Name,
                Note: p.Note
            ))
        );
    }
}
