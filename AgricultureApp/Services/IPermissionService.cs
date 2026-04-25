using AgricultureApp.Models.Entities;

namespace AgricultureApp.Services
{
    public interface IPermissionService
    {
        Task<bool> UserHasPermissionAsync(int userId, string permissionCode);
        Task<bool> UserHasRegionAccessAsync(int userId, int regionId);
        Task<List<string>> GetUserPermissionsAsync(int userId);
        Task<List<Region>> GetUserRegionsAsync(int userId);
    }
}