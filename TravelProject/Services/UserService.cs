using TravelProject.Models.Dtos;

namespace TravelProject.Services
{
    public class UserService(ApplicationDbContext db)
    {
        public async Task<UserProfileResponse?> GetProfileAsync(string userId)
        {
            var user = await db.Users.FindAsync(userId);
            if (user is null) return null;

            return new UserProfileResponse(user.Id, user.UserName, user.Email);
        }
    }
}
