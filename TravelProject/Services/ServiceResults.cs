using TravelProject.Models.Dtos;

namespace TravelProject.Services
{
    public enum RouteOp { Success, NotFound, Forbidden }

    public record RouteResult(RouteOp Op, RouteSummaryResponse? Dto = null);

    public record CreateRouteResult(Guid Id, RouteSummaryResponse Dto);

    public record GpxFile(byte[] Bytes, string FileName);
}
