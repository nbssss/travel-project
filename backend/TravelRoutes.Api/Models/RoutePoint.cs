using System;

namespace TravelRoutes.Api.Models;

public class RoutePoint
{
    public Guid Id { get; set; }

    public string Name { get; set; }

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public int Order { get; set; }

    public string Type { get; set; }

    public Guid RouteId { get; set; }

    public Route Route { get; set; }
}