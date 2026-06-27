namespace TravelProject.Models.Dtos
{
    public record RouteSummaryResponse(
        Guid Id,
        string Slug,
        string Title,
        string Difficulty,
        double DistanceKm,
        int AscentM,
        int DescentM,
        double DurationH,
        bool IsPublic,
        DateTime UpdatedAt
    );

    public record RouteListItemResponse(
        Guid Id,
        string Slug,
        string Title,
        string? Region,
        string Difficulty,
        double DistanceKm,
        int AscentM,
        int DescentM,
        double DurationH,
        bool IsPublic,
        DateTime UpdatedAt,
        string? OwnerUserName,
        int LikesCount,
        bool IsLikedByMe,
        // Lekka geometria do miniaturki — pary [lat, lng] punktów POI.
        IEnumerable<double[]> PreviewPath
    );

    public record RoutePointResponse(
        int Order,
        double Lat,
        double Lng,
        double? Elevation,
        string Kind,
        string? Name,
        string? Note
    );

    public record RouteDetailResponse(
        Guid Id,
        string Slug,
        string Title,
        string? Description,
        string? Region,
        string? Country,
        string Difficulty,
        double DistanceKm,
        int AscentM,
        int DescentM,
        double DurationH,
        bool IsPublic,
        List<string> Tags,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        string? OwnerUserName,
        int LikesCount,
        bool IsLikedByMe,
        IEnumerable<RoutePointResponse> Points
    );

    public record LikeResponse(bool Liked, int LikesCount);
}
