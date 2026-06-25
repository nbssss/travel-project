namespace TravelProject.Models
{
    public class RoutePhoto
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid RouteId { get; set; }
        public Route Route { get; set; } = null!;
        public string Url { get; set; } = "";
        public int Order { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
