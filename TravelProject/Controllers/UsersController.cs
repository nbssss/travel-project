using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelProject.Models.Dtos;
using TravelProject.Services;

namespace TravelProject.Controllers
{
    [Route("users")]
    public class UsersController(UserService users) : ApiControllerBase
    {
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            if (CurrentUserId is null) return Unauthorized();

            var profile = await users.GetProfileAsync(CurrentUserId);
            return profile is null ? NotFound() : Ok(profile);
        }

        [HttpPut("me/username")]
        [Authorize]
        public async Task<IActionResult> ChangeUsername([FromBody] ChangeUsernameRequest req)
        {
            if (CurrentUserId is null) return Unauthorized();
            if (string.IsNullOrWhiteSpace(req.NewUserName) || req.NewUserName.Length < 3)
                return BadRequest("Nazwa użytkownika musi mieć co najmniej 3 znaki.");

            var (success, error) = await users.ChangeUsernameAsync(CurrentUserId, req.NewUserName.Trim());
            return success ? Ok() : BadRequest(error);
        }

        [HttpDelete("me")]
        [Authorize]
        public async Task<IActionResult> DeleteAccount()
        {
            if (CurrentUserId is null) return Unauthorized();

            var success = await users.DeleteAccountAsync(CurrentUserId);
            return success ? Ok() : NotFound();
        }
    }
}
