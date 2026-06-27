using Microsoft.AspNetCore.Mvc;
using TravelProject.Models.Dtos;
using TravelProject.Services;

namespace TravelProject.Controllers
{
    public class AuthController(AuthService auth) : ApiControllerBase
    {
        [HttpPost("register")]
        [ProducesResponseType(typeof(RegisterResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register(RegisterUserRequest request)
        {
            var (result, user) = await auth.RegisterAsync(request);

            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            return Ok(new RegisterResponse(user.Id, user.Email));
        }

        [HttpPost("login")]
        [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login(LoginUserRequest request)
        {
            var accessToken = await auth.LoginAsync(request);

            if (accessToken is null)
            {
                return Unauthorized();
            }

            return Ok(new LoginResponse(accessToken));
        }
    }
}
