using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

namespace TravelProject.Features
{
    public class LoginUser
    {
        public record LoginUserRequest(string UserName, string Password);
        public static void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapPost("login", async (
                LoginUserRequest loginUserRequest, 
                UserManager<ApplicationUser> userManager,
                IConfiguration configuration ) =>
            {
                var user = await userManager.FindByNameAsync(loginUserRequest.UserName);

                if (user is null ||  !await userManager.CheckPasswordAsync(user, loginUserRequest.Password))
                {
                    return Results.Unauthorized();
                }

                var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:SecretKey"]!));

                var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

                List<Claim> claims =
                [
                    new(JwtRegisteredClaimNames.Sub, user.Id),
                    new(JwtRegisteredClaimNames.Email, user.Email!)
                ];

                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(claims),
                    Expires = DateTime.UtcNow.AddMinutes(configuration.GetValue<int>("Jwt:ExpirationInMinutes")),
                    SigningCredentials = credentials,
                    Issuer = configuration["Jwt:Issuer"],
                    Audience = configuration["Jwt:Audience"]
                };

                var tokenHandler = new JsonWebTokenHandler();

                string accessToken = tokenHandler.CreateToken(tokenDescriptor);

                return Results.Ok(new { accessToken });
            });
        }
    }
}
