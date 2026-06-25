using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace TravelProject.Features
{
    public class DeleteRoute
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapDelete("/routes/{id:guid}", async (
                Guid id,
                ClaimsPrincipal claims,
                ApplicationDbContext db,
                IWebHostEnvironment env) =>
            {
                var userId = claims.FindFirstValue("sub")
                          ?? claims.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var route = await db.Routes
                    .Include(r => r.Photos)
                    .FirstOrDefaultAsync(r => r.Id == id);

                if (route is null) return Results.NotFound();
                if (route.OwnerId != userId) return Results.Forbid();

                // usuń pliki zdjęć z dysku (rekordy znikną kaskadowo wraz z trasą)
                var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
                foreach (var photo in route.Photos)
                {
                    var filePath = Path.Combine(webRoot, photo.Url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                    if (File.Exists(filePath)) File.Delete(filePath);
                }

                db.Routes.Remove(route);
                await db.SaveChangesAsync();

                return Results.NoContent();
            })
            .RequireAuthorization();
        }
    }
}
