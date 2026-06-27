using FluentValidation;
using TravelProject.Models.Dtos;

namespace TravelProject.Validators
{
    public class ChangeUsernameRequestValidator : AbstractValidator<ChangeUsernameRequest>
    {
        public ChangeUsernameRequestValidator()
        {
            RuleFor(x => x.NewUserName)
                .NotEmpty().WithMessage("Nowa nazwa użytkownika jest wymagana.")
                .Length(3, 50).WithMessage("Nazwa użytkownika musi mieć 3–50 znaków.");
        }
    }
}
