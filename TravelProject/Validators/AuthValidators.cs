using FluentValidation;
using TravelProject.Models.Dtos;

namespace TravelProject.Validators
{
    public class RegisterUserRequestValidator : AbstractValidator<RegisterUserRequest>
    {
        public RegisterUserRequestValidator()
        {
            RuleFor(x => x.UserName)
                .NotEmpty().WithMessage("Nazwa użytkownika jest wymagana.")
                .Length(3, 50).WithMessage("Nazwa użytkownika musi mieć 3–50 znaków.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email jest wymagany.")
                .EmailAddress().WithMessage("Niepoprawny format email.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Hasło jest wymagane.")
                .MinimumLength(8).WithMessage("Hasło musi mieć min. 8 znaków.");
        }
    }

    public class LoginUserRequestValidator : AbstractValidator<LoginUserRequest>
    {
        public LoginUserRequestValidator()
        {
            RuleFor(x => x.UserName).NotEmpty().WithMessage("Nazwa użytkownika jest wymagana.");
            RuleFor(x => x.Password).NotEmpty().WithMessage("Hasło jest wymagane.");
        }
    }
}
