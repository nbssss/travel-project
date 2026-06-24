using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TravelProject.Models;

namespace TravelProject.Features
{
    public class UploadRoutePhoto
    {
        private static readonly string[] AllowedTypes = ["image/jpeg", "image/png", "image/webp"];
        private static readonly string[] AllowedExts  = [".jpg", ".jpeg", ".png", ".webp"];
        private const long MaxBytes  = 5 * 1024 * 1024; // 5 MB
        private const int  MaxPhotos = 3;

        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("/routes/{routeId:guid}/photos", async (
                Guid routeId,
                IFormFile file,
                ClaimsPrincipal claims,
                ApplicationDbContext db,
                IWebHostEnvironment env) =>
            {
                var userId = claims.FindFirstValue("sub")
                          ?? claims.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var route = await db.Routes
                    .Include(r => r.Photos)
                    .FirstOrDefaultAsync(r => r.Id == routeId);

                if (route is null) return Results.NotFound();
                if (route.OwnerId != userId) return Results.Forbid();
                if (route.Photos.Count >= MaxPhotos)
                    return Results.BadRequest($"Maksymalnie {MaxPhotos} zdjęcia na trasę.");

                if (!AllowedTypes.Contains(file.ContentType))
                    return Results.BadRequest("Dozwolone formaty: JPG, PNG, WEBP.");
                if (file.Length > MaxBytes)
                    return Results.BadRequest("Maksymalny rozmiar: 5 MB.");

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!AllowedExts.Contains(ext)) ext = ".jpg";

                var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
                var dir = Path.Combine(webRoot, "routes", routeId.ToString());
                Directory.CreateDirectory(dir);

                var photoId = Guid.NewGuid();
                var filename = $"{photoId}{ext}";
                await using var stream = File.Create(Path.Combine(dir, filename));
                await file.CopyToAsync(stream);

                var photo = new RoutePhoto
                {
                    Id      = photoId,
                    RouteId = routeId,
                    Url     = $"/routes/{routeId}/{filename}",
                    Order   = route.Photos.Count,
                };
                db.RoutePhotos.Add(photo);
                await db.SaveChangesAsync();

                return Results.Ok(new { photo.Id, photo.Url, photo.Order });
            })
            .RequireAuthorization()
            .DisableAntiforgery();
        }
    }
}
