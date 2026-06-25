namespace TravelProject.Models
{
    public class RouteShare
    {
        public Guid Id { get; set; }
        public Guid RouteId { get; set; }
        public Route Route { get; set; } = null!;
        public required string SharedWithUserId { get; set; }
        public ApplicationUser SharedWithUser { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
