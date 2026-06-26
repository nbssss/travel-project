using Microsoft.AspNetCore.Mvc;
using TravelProject.Services;

namespace TravelProject.Controllers
{
    public class StatsController(StatsService stats) : ApiControllerBase
    {
        [HttpGet("stats")]
        public async Task<IActionResult> Get()
        {
            var userCount = await stats.GetUserCountAsync();
            return Ok(new { userCount });
        }
    }
}
