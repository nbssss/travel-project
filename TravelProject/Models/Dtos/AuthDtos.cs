namespace TravelProject.Models.Dtos
{
    public record RegisterUserRequest(string UserName, string Email, string Password);

    public record LoginUserRequest(string UserName, string Password);

    public record RegisterResponse(string Id, string? Email);

    public record LoginResponse(string AccessToken);

    public record UserProfileResponse(string Id, string? UserName, string? Email);

    public record StatsResponse(int UserCount);
}
