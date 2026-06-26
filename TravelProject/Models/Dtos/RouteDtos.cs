namespace TravelProject.Models.Dtos
{
    public record CreateRouteRequest(
        string Title,
        string? Description,
        string? Region,
        string? Country,
        string Difficulty,
        bool IsPublic,
        List<string>? Tags
    );

    public record UpdateRouteRequest(
        string Title,
        string? Description,
        string? Region,
        string? Country,
        string Difficulty,
        bool IsPublic,
        List<string>? Tags
    );

    public record RoutePointRequest(
        int Order,
        double Lat,
        double Lng,
        double? Elevation,
        string Kind,
        string? Name,
        string? Note
    );

    public record UpsertPointsRequest(List<RoutePointRequest> Points);
}
