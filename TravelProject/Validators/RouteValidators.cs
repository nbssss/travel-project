using FluentValidation;
using TravelProject.Models.Dtos;

namespace TravelProject.Validators
{
    public class CreateRouteRequestValidator : AbstractValidator<CreateRouteRequest>
    {
        public CreateRouteRequestValidator()
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("Tytuł jest wymagany.")
                .MaximumLength(200);

            RuleFor(x => x.Region).MaximumLength(100);
            RuleFor(x => x.Country).MaximumLength(100);

            RuleFor(x => x.Difficulty)
                .NotEmpty().WithMessage("Trudność jest wymagana.")
                .Must(RouteRules.BeAValidDifficulty)
                .WithMessage("Trudność musi być jedną z: easy, moderate, hard.");

            RuleForEach(x => x.Tags)
                .MaximumLength(50).WithMessage("Pojedynczy tag może mieć maks. 50 znaków.");
        }
    }

    public class UpdateRouteRequestValidator : AbstractValidator<UpdateRouteRequest>
    {
        public UpdateRouteRequestValidator()
        {
            RuleFor(x => x.Title)
                .NotEmpty().WithMessage("Tytuł jest wymagany.")
                .MaximumLength(200);

            RuleFor(x => x.Region).MaximumLength(100);
            RuleFor(x => x.Country).MaximumLength(100);

            RuleFor(x => x.Difficulty)
                .NotEmpty().WithMessage("Trudność jest wymagana.")
                .Must(RouteRules.BeAValidDifficulty)
                .WithMessage("Trudność musi być jedną z: easy, moderate, hard.");

            RuleForEach(x => x.Tags)
                .MaximumLength(50).WithMessage("Pojedynczy tag może mieć maks. 50 znaków.");
        }
    }

    public class UpsertPointsRequestValidator : AbstractValidator<UpsertPointsRequest>
    {
        public UpsertPointsRequestValidator()
        {
            RuleFor(x => x.Points).NotNull().WithMessage("Lista punktów jest wymagana.");
            RuleForEach(x => x.Points).SetValidator(new RoutePointRequestValidator());
        }
    }

    public class RoutePointRequestValidator : AbstractValidator<RoutePointRequest>
    {
        public RoutePointRequestValidator()
        {
            RuleFor(x => x.Order).GreaterThanOrEqualTo(0);
            RuleFor(x => x.Lat)
                .InclusiveBetween(-90.0, 90.0)
                .WithMessage("Szerokość geograficzna musi być w zakresie -90…90.");
            RuleFor(x => x.Lng)
                .InclusiveBetween(-180.0, 180.0)
                .WithMessage("Długość geograficzna musi być w zakresie -180…180.");
            RuleFor(x => x.Kind).NotEmpty().MaximumLength(30);
            RuleFor(x => x.Name).MaximumLength(200);
        }
    }

    internal static class RouteRules
    {
        private static readonly string[] AllowedDifficulties = ["easy", "moderate", "hard"];

        public static bool BeAValidDifficulty(string? difficulty) =>
            difficulty is not null &&
            AllowedDifficulties.Contains(difficulty, StringComparer.OrdinalIgnoreCase);
    }
}
