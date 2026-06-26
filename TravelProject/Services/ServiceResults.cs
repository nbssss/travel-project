namespace TravelProject.Services
{
    public enum RouteOp { Success, NotFound, Forbidden }

    public record RouteResult(RouteOp Op, object? Dto = null);

    public record CreateRouteResult(Guid Id, object Dto);

    public record GpxFile(byte[] Bytes, string FileName);
}
