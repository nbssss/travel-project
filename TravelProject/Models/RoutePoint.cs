namespace TravelProject.Models
{
    public class RoutePoint
    {
        public Guid Id { get; set; }
        public Guid RouteId { get; set; }
        public Route Route { get; set; } = null!;
        public int Order { get; set; }
        public double Lat { get; set; }
        public double Lng { get; set; }
        public double? Elevation { get; set; }
        public required string Kind { get; set; }
        public string? Name { get; set; }
        public string? Note { get; set; }
    }
}
