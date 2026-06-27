using Microsoft.AspNetCore.Mvc;
using TravelProject.Models.Dtos;
using TravelProject.Services;

namespace TravelProject.Controllers
{
    public class StatsController(StatsService stats) : ApiControllerBase
    {
        [HttpGet("stats")]
        [ProducesResponseType(typeof(StatsResponse), StatusCodes.Status200OK)]
        public async Task<IActionResult> Get()
        {
            var userCount = await stats.GetUserCountAsync();
            return Ok(new StatsResponse(userCount));
        }
    }
}
