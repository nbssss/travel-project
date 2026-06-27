using Microsoft.AspNetCore.Identity;
using TravelProject.Models.Dtos;

namespace TravelProject.Services
{
    public class UserService(ApplicationDbContext db, UserManager<ApplicationUser> userManager)
    {
        public async Task<UserProfileResponse?> GetProfileAsync(string userId)
        {
            var user = await db.Users.FindAsync(userId);
            if (user is null) return null;

            return new UserProfileResponse(user.Id, user.UserName, user.Email);
        }

        public async Task<(bool Success, string? Error)> ChangeUsernameAsync(string userId, string newUserName)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null) return (false, "Nie znaleziono użytkownika.");

            var taken = await userManager.FindByNameAsync(newUserName);
            if (taken is not null && taken.Id != userId)
                return (false, "Ta nazwa użytkownika jest już zajęta.");

            var result = await userManager.SetUserNameAsync(user, newUserName);
            if (!result.Succeeded)
                return (false, result.Errors.FirstOrDefault()?.Description ?? "Błąd aktualizacji.");

            return (true, null);
        }

        public async Task<bool> DeleteAccountAsync(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null) return false;

            var result = await userManager.DeleteAsync(user);
            return result.Succeeded;
        }
    }
}
