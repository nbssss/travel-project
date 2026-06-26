using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace TravelProject.Controllers
{
    [ApiController]
    public abstract class ApiControllerBase : ControllerBase
    {
        protected string? CurrentUserId =>
            User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}
