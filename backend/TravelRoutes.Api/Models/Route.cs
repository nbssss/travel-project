using System;
using System.Collections.Generic;

namespace TravelRoutes.Api.Models;

public class Route
{
    public Guid Id { get; set; }

    public string Name { get; set; }

    public string Description { get; set; }

    // Identity user id (string by default for ASP.NET Identity)
    public string OwnerId { get; set; }

    public AppUser Owner { get; set; }

    public bool IsPublic { get; set; }

    public List<RoutePoint> Points { get; set; } = new();
}