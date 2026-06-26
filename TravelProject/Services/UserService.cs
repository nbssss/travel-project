namespace TravelProject.Services
{
    public class UserService(ApplicationDbContext db)
    {
        public async Task<object?> GetProfileAsync(string userId)
        {
            var user = await db.Users.FindAsync(userId);
            if (user is null) return null;

            return new
            {
                id = user.Id,
                userName = user.UserName,
                email = user.Email,
            };
        }
    }
}
