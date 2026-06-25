namespace TravelProject.Models
{
    public class Route
    {
        public Guid Id { get; set; }
        public required string Title { get; set; }
        public required string Slug { get; set; }
        public string? Description { get; set; }
        public string? Region { get; set; }
        public string? Country { get; set; }
        public required string Difficulty { get; set; }
        public bool IsPublic { get; set; }
        public List<string> Tags { get; set; } = [];
        public double DistanceKm { get; set; }
        public int AscentM { get; set; }
        public double DurationH { get; set; }
        public required string OwnerId { get; set; }
        public ApplicationUser Owner { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public List<RoutePoint> Points { get; set; } = [];
        public List<RouteShare> Shares { get; set; } = [];
        public List<RoutePhoto> Photos { get; set; } = [];
    }
}
