using FluentValidation;
using Microsoft.AspNetCore.Identity;
using TravelProject.Infrastructure;

namespace TravelProject.Features
{
    public class RegisterUser
    {
        public record RegisterUserRequest(string UserName, string Email, string Password);

        public class Validator : AbstractValidator<RegisterUserRequest>
        {
            public Validator()
            {
                RuleFor(x => x.UserName)
                    .NotEmpty().WithMessage("Nazwa użytkownika jest wymagana.")
                    .Length(3, 50).WithMessage("Nazwa użytkownika musi mieć od 3 do 50 znaków.");

                RuleFor(x => x.Email)
                    .NotEmpty().WithMessage("Email jest wymagany.")
                    .EmailAddress().WithMessage("Niepoprawny format email.");

                RuleFor(x => x.Password)
                    .NotEmpty().WithMessage("Hasło jest wymagane.")
                    .MinimumLength(8).WithMessage("Hasło musi mieć min. 8 znaków.");
            }
        }

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
            })
            .AddEndpointFilter<ValidationFilter<RegisterUserRequest>>();
        }
    }
}
