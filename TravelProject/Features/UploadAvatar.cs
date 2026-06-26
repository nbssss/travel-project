using System.Security.Claims;

namespace TravelProject.Features
{
    public class UploadAvatar
    {
        private static readonly string[] AllowedTypes = ["image/jpeg", "image/png", "image/webp"];
        private static readonly string[] AllowedExts = [".jpg", ".jpeg", ".png", ".webp"];
        private const long MaxBytes = 2 * 1024 * 1024; // 2 MB

        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("/users/avatar", async (
                IFormFile file,
                ClaimsPrincipal claims,
                ApplicationDbContext db,
                IWebHostEnvironment env) =>
            {
                var userId = claims.FindFirstValue("sub")
                          ?? claims.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                if (!AllowedTypes.Contains(file.ContentType))
                    return Results.BadRequest("Dozwolone formaty: JPG, PNG, WEBP.");

                if (file.Length > MaxBytes)
                    return Results.BadRequest("Maksymalny rozmiar pliku: 2 MB.");

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!AllowedExts.Contains(ext)) ext = ".jpg";

                var webRoot = env.WebRootPath
                    ?? Path.Combine(env.ContentRootPath, "wwwroot");
                var avatarsDir = Path.Combine(webRoot, "avatars");
                Directory.CreateDirectory(avatarsDir);

                // usuń stary awatar tego użytkownika (każdy format)
                foreach (var old in Directory.GetFiles(avatarsDir, $"{userId}.*"))
                    File.Delete(old);

                var filename = $"{userId}{ext}";
                await using var stream = File.Create(Path.Combine(avatarsDir, filename));
                await file.CopyToAsync(stream);

                var user = await db.Users.FindAsync(userId);
                if (user is null) return Results.NotFound();

                user.AvatarUrl = $"/avatars/{filename}";
                await db.SaveChangesAsync();

                return Results.Ok(new { avatarUrl = user.AvatarUrl });
            })
            .RequireAuthorization()
            .DisableAntiforgery();
        }
    }
}
