using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace TravelProject.Features
{
    public class DeleteRoutePhoto
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapDelete("/routes/{routeId:guid}/photos/{photoId:guid}", async (
                Guid routeId,
                Guid photoId,
                ClaimsPrincipal claims,
                ApplicationDbContext db,
                IWebHostEnvironment env) =>
            {
                var userId = claims.FindFirstValue("sub")
                          ?? claims.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var route = await db.Routes.FindAsync(routeId);
                if (route is null) return Results.NotFound();
                if (route.OwnerId != userId) return Results.Forbid();

                var photo = await db.RoutePhotos.FirstOrDefaultAsync(p => p.Id == photoId && p.RouteId == routeId);
                if (photo is null) return Results.NotFound();

                // usuń plik z dysku
                var webRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
                var filePath = Path.Combine(webRoot, photo.Url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (File.Exists(filePath)) File.Delete(filePath);

                db.RoutePhotos.Remove(photo);
                await db.SaveChangesAsync();

                return Results.NoContent();
            })
            .RequireAuthorization();
        }
    }
}
