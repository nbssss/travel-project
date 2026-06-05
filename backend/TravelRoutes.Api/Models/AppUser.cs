using Microsoft.AspNetCore.Identity;

namespace TravelRoutes.Api.Models;

public class AppUser : IdentityUser
{
    public DateTime CreatedAt { get; set; }
}