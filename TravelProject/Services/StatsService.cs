using Microsoft.EntityFrameworkCore;

namespace TravelProject.Services
{
    public class StatsService(ApplicationDbContext db)
    {
        public async Task<int> GetUserCountAsync()
        {
            var count = await db.Users.CountAsync();
            return (int)(Math.Ceiling(count / 100.0) * 100);
        }
    }
}
