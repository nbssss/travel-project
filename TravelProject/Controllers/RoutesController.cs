using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelProject.Models.Dtos;
using TravelProject.Services;

namespace TravelProject.Controllers
{
    [Route("routes")]
    public class RoutesController(RouteService routes) : ApiControllerBase
    {
        [HttpPost]
        [Authorize]
        [ProducesResponseType(typeof(RouteSummaryResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Create(CreateRouteRequest req)
        {
            if (CurrentUserId is null) return Unauthorized();

            var created = await routes.CreateAsync(CurrentUserId, req);
            return Created($"/routes/{created.Id}", created.Dto);
        }

        [HttpPut("{id:guid}")]
        [Authorize]
        [ProducesResponseType(typeof(RouteSummaryResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(Guid id, UpdateRouteRequest req)
        {
            if (CurrentUserId is null) return Unauthorized();

            var result = await routes.UpdateAsync(CurrentUserId, id, req);
            return result.Op switch
            {
                RouteOp.NotFound => NotFound(),
                RouteOp.Forbidden => Forbid(),
                _ => Ok(result.Dto),
            };
        }

        [HttpDelete("{id:guid}")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(Guid id)
        {
            if (CurrentUserId is null) return Unauthorized();

            var op = await routes.DeleteAsync(CurrentUserId, id);
            return op switch
            {
                RouteOp.NotFound => NotFound(),
                RouteOp.Forbidden => Forbid(),
                _ => NoContent(),
            };
        }

        [HttpPut("{id:guid}/points")]
        [Authorize]
        [ProducesResponseType(typeof(RouteSummaryResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpsertPoints(Guid id, UpsertPointsRequest req)
        {
            if (CurrentUserId is null) return Unauthorized();

            var result = await routes.UpsertPointsAsync(CurrentUserId, id, req);
            return result.Op switch
            {
                RouteOp.NotFound => NotFound(),
                RouteOp.Forbidden => StatusCode(403),
                _ => Ok(result.Dto),
            };
        }

        [HttpGet("{id:guid}/export/gpx")]
        [Produces("application/gpx+xml")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ExportGpx(Guid id)
        {
            var file = await routes.ExportGpxAsync(CurrentUserId, id);
            if (file is null) return NotFound();

            return File(file.Bytes, "application/gpx+xml", file.FileName);
        }

        [HttpGet("mine")]
        [Authorize]
        [ProducesResponseType(typeof(IEnumerable<RouteListItemResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Mine()
        {
            if (CurrentUserId is null) return Unauthorized();

            var ownerUserName = User.FindFirstValue(JwtRegisteredClaimNames.Name)
                             ?? User.FindFirstValue("name");

            return Ok(await routes.GetMineAsync(CurrentUserId, ownerUserName));
        }

        [HttpGet("recent")]
        [ProducesResponseType(typeof(IEnumerable<RouteListItemResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> Recent()
        {
            return Ok(await routes.GetRecentAsync(CurrentUserId));
        }

        [HttpGet("liked")]
        [Authorize]
        [ProducesResponseType(typeof(IEnumerable<RouteListItemResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Liked()
        {
            if (CurrentUserId is null) return Unauthorized();

            return Ok(await routes.GetLikedAsync(CurrentUserId));
        }

        [HttpPost("{id:guid}/like")]
        [Authorize]
        [ProducesResponseType(typeof(LikeResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Like(Guid id)
        {
            if (CurrentUserId is null) return Unauthorized();

            var count = await routes.LikeAsync(CurrentUserId, id);
            if (count is null) return NotFound();

            return Ok(new LikeResponse(true, count.Value));
        }

        [HttpDelete("{id:guid}/like")]
        [Authorize]
        [ProducesResponseType(typeof(LikeResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Unlike(Guid id)
        {
            if (CurrentUserId is null) return Unauthorized();

            var count = await routes.UnlikeAsync(CurrentUserId, id);
            return Ok(new LikeResponse(false, count));
        }

        [HttpGet("{slug}")]
        [ProducesResponseType(typeof(RouteDetailResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> BySlug(string slug)
        {
            var route = await routes.GetBySlugAsync(CurrentUserId, slug);
            return route is null ? NotFound() : Ok(route);
        }
    }
}
