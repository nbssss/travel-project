using System.Security.Claims;
using System.Text.RegularExpressions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using TravelProject.Infrastructure;
using TravelProject.Models;
using Route = TravelProject.Models.Route;

namespace TravelProject.Features
{
    public class CreateRoute
    {
        public record CreateRouteRequest(
            string Title,
            string? Description,
            string? Region,
            string? Country,
            string Difficulty,
            bool IsPublic,
            List<string>? Tags
        );

        // Wspólne dla tworzenia i edycji trasy
        internal static readonly string[] AllowedDifficulties = ["easy", "moderate", "hard"];

        public class Validator : AbstractValidator<CreateRouteRequest>
        {
            public Validator()
            {
                RuleFor(x => x.Title)
                    .NotEmpty().WithMessage("Tytuł jest wymagany.")
                    .MaximumLength(200).WithMessage("Tytuł może mieć max. 200 znaków.");

                RuleFor(x => x.Difficulty)
                    .Must(d => AllowedDifficulties.Contains(d))
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
            app.MapPost("/routes", async (
                CreateRouteRequest req,
                ApplicationDbContext db,
                HttpContext httpContext) =>
            {
                var userId = httpContext.User.FindFirstValue("sub")
                          ?? httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId is null) return Results.Unauthorized();

                var slug = await GenerateSlugAsync(req.Title, db);

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

                return Results.Created($"/routes/{route.Id}", ToDto(route));
            })
            .RequireAuthorization()
            .AddEndpointFilter<ValidationFilter<CreateRouteRequest>>();
        }

        private static async Task<string> GenerateSlugAsync(string title, ApplicationDbContext db)
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

        internal static object ToDto(Route route) => new
        {
            route.Id,
            route.Slug,
            route.Title,
            route.Difficulty,
            route.DistanceKm,
            route.AscentM,
            route.DurationH,
            route.IsPublic,
            route.UpdatedAt,
        };
    }
}
