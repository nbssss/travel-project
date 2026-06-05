using System.Collections.Generic;
using TravelRoutes.Api.Models;
using RouteModel = TravelRoutes.Api.Models.Route;

namespace TravelRoutes.Api.Data;

public static class SeedData
{
    public static RouteModel CreateSampleRoute(AppUser user)
    {
        var route = new RouteModel
        {
            Name = "Kraków Old Town Walk",
            Description = "Spacer po centrum Krakowa",
            OwnerId = user?.Id ?? string.Empty,
            IsPublic = true,

            Points = new List<RoutePoint>
            {
                new RoutePoint
                {
                    Name = "Rynek Główny",
                    Latitude = 50.061,
                    Longitude = 19.937,
                    Order = 1,
                    Type = "START"
                },

                new RoutePoint
                {
                    Name = "Wawel",
                    Latitude = 50.054,
                    Longitude = 19.936,
                    Order = 2,
                    Type = "END"
                }
            }
        };

        return route;
    }
}