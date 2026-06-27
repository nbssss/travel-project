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
        [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Me()
        {
            if (CurrentUserId is null) return Unauthorized();

            var profile = await users.GetProfileAsync(CurrentUserId);
            return profile is null ? NotFound() : Ok(profile);
        }

        [HttpPut("me/username")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ChangeUsername([FromBody] ChangeUsernameRequest req)
        {
            // Walidacja długości/pustości robi globalny ValidationActionFilter
            // (ChangeUsernameRequestValidator). Tu zostaje tylko logika biznesowa.
            if (CurrentUserId is null) return Unauthorized();

            var (success, error) = await users.ChangeUsernameAsync(CurrentUserId, req.NewUserName.Trim());
            return success ? Ok() : BadRequest(error);
        }

        [HttpDelete("me")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteAccount()
        {
            if (CurrentUserId is null) return Unauthorized();

            var success = await users.DeleteAccountAsync(CurrentUserId);
            return success ? Ok() : NotFound();
        }
    }
}
