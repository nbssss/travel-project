using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using TravelProject.Models.Dtos;

namespace TravelProject.Services
{
    public class AuthService(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext dbContext,
        IConfiguration configuration)
    {
        public async Task<(IdentityResult Result, ApplicationUser User)> RegisterAsync(RegisterUserRequest request)
        {
            using var transaction = await dbContext.Database.BeginTransactionAsync();

            var user = new ApplicationUser
            {
                UserName = request.UserName,
                Email = request.Email
            };

            IdentityResult identityResult = await userManager.CreateAsync(user, request.Password);

            if (!identityResult.Succeeded)
            {
                return (identityResult, user);
            }

            await transaction.CommitAsync();

            return (identityResult, user);
        }

        public async Task<string?> LoginAsync(LoginUserRequest request)
        {
            var user = await userManager.FindByNameAsync(request.UserName);

            if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
            {
                return null;
            }

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:SecretKey"]!));

            var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

            List<Claim> claims =
            [
                new(JwtRegisteredClaimNames.Sub, user.Id),
                new(JwtRegisteredClaimNames.Email, user.Email!),
                new(JwtRegisteredClaimNames.Name, user.UserName!)
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

            return accessToken;
        }
    }
}
