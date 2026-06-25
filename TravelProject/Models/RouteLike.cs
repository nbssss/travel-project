namespace TravelProject.Models
{
    public class RouteLike
    {
        public Guid Id { get; set; }
        public Guid RouteId { get; set; }
        public Route Route { get; set; } = null!;
        public required string UserId { get; set; }
        public ApplicationUser User { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
