using Microsoft.AspNetCore.Identity;

namespace TravelProject.Features
{
    public class RegisterUser
    {
        public record RegisterUserRequest(string UserName, string Email, string Password);

        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("register", async (
                RegisterUserRequest registerUserRequest, 
                ApplicationDbContext dbContext,
                UserManager<ApplicationUser> userManager) =>
            {
                using var transaction = await dbContext.Database.BeginTransactionAsync();

                var user = new ApplicationUser
                {
                    UserName = registerUserRequest.UserName,
                    Email = registerUserRequest.Email
                };

                IdentityResult identityResult = await userManager.CreateAsync(user, registerUserRequest.Password);

                if (!identityResult.Succeeded)
                {
                    return Results.BadRequest(identityResult.Errors);
                }

                await transaction.CommitAsync();

                return Results.Ok(new { user.Id, user.Email });
            });
        }
    }
}
