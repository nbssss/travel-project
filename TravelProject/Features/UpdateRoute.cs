using System.Security.Claims;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using TravelProject.Infrastructure;

namespace TravelProject.Features
{
    public class UpdateRoute
    {
        public record UpdateRouteRequest(
            string Title,
            string? Description,
            string? Region,
            string? Country,
            string Difficulty,
            bool IsPublic,
            List<string>? Tags
        );

        public class Validator : AbstractValidator<UpdateRouteRequest>
        {
            public Validator()
            {
                RuleFor(x => x.Title)
                    .NotEmpty().WithMessage("Tytuł jest wymagany.")
                    .MaximumLength(200).WithMessage("Tytuł może mieć max. 200 znaków.");

                RuleFor(x => x.Difficulty)
                    .Must(d => CreateRoute.AllowedDifficulties.Contains(d))
                    .WithMessage("Trudność musi być jedną z: easy, moderate, hard.");

                RuleFor(x => x.Description)
                    .MaximumLength(2000).WithMessage("Opis może mieć max. 2000 znaków.");

                RuleFor(x => x.Region)
                    .MaximumLength(100).WithMessage("Region może mieć max. 100 znaków.");

                RuleFor(x => x.Country)
                    .MaximumLength(100).WithMessage("Kraj może mieć max. 100 znaków.");

                RuleFor(x => x.Tags!)
                    .Must(t => t.Count <= 10).WithMessage("Maksymalnie 10 tagów.")
                    .When(x => x.Tags is not null);

                RuleForEach(x => x.Tags)
                    .NotEmpty().WithMessage("Tag nie może być pusty.")
                    .MaximumLength(30).WithMessage("Tag może mieć max. 30 znaków.");
            }
        }

        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPut("/routes/{id:guid}", async (
                Guid id,
                UpdateRouteRequest req,
                ApplicationDbContext db,
                HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var route = await db.Routes.FirstOrDefaultAsync(r => r.Id == id);
                if (route is null) return Results.NotFound();
                if (route.OwnerId != userId) return Results.Forbid();

                route.Title = req.Title;
                route.Description = req.Description;
                route.Region = req.Region;
                route.Country = req.Country;
                route.Difficulty = req.Difficulty;
                route.IsPublic = req.IsPublic;
                route.Tags = req.Tags ?? [];
                route.UpdatedAt = DateTime.UtcNow;

                await db.SaveChangesAsync();

                return Results.Ok(CreateRoute.ToDto(route));
            })
            .RequireAuthorization()
            .AddEndpointFilter<ValidationFilter<UpdateRouteRequest>>();
        }
    }
}
