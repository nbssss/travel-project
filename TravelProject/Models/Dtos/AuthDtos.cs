namespace TravelProject.Models.Dtos
{
    public record RegisterUserRequest(string UserName, string Email, string Password);

    public record LoginUserRequest(string UserName, string Password);
}
