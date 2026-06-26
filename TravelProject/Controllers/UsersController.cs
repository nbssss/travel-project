using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    }
}
