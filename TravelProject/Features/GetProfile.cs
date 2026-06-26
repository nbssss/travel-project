using System.Security.Claims;

namespace TravelProject.Features
{
    public class GetProfile
    {
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/users/me", async (
                ClaimsPrincipal claims,
                ApplicationDbContext db) =>
            {
                var userId = claims.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var user = await db.Users.FindAsync(userId);
                if (user is null) return Results.NotFound();

                return Results.Ok(new
                {
                    id = user.Id,
                    userName = user.UserName,
                    email = user.Email,
                    avatarUrl = user.AvatarUrl,
                });
            })
            .RequireAuthorization();
        }
    }
}
