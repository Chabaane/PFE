using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace AgricultureApp.Services
{
    public class PermissionService : IPermissionService
    {
        private readonly ApplicationDbContext _context;

        public PermissionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> UserHasPermissionAsync(int userId, string permissionCode)
        {
            // Vérifier les permissions directes
            var directPermission = await _context.UserPermissions
                .Include(up => up.Permission)
                .AnyAsync(up => up.UserId == userId && up.Permission.Code == permissionCode);

            if (directPermission) return true;

            // Vérifier via les rôles
            var rolePermission = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .SelectMany(ur => ur.Role.RolePermissions)
                .AnyAsync(rp => rp.Permission.Code == permissionCode);

            return rolePermission;
        }

        public async Task<bool> UserHasRegionAccessAsync(int userId, int regionId)
        {
            // Si permission globale, accès à toutes les régions
            if (await UserHasPermissionAsync(userId, "regions.all"))
                return true;

            // Vérifier l'accès explicite
            return await _context.UserRegionAccesses
                .AnyAsync(ura => ura.UserId == userId && ura.RegionId == regionId);
        }

        public async Task<List<string>> GetUserPermissionsAsync(int userId)
        {
            var direct = await _context.UserPermissions
                .Where(up => up.UserId == userId)
                .Select(up => up.Permission.Code)
                .ToListAsync();

            var fromRoles = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .SelectMany(ur => ur.Role.RolePermissions)
                .Select(rp => rp.Permission.Code)
                .ToListAsync();

            return direct.Union(fromRoles).ToList();
        }

        public async Task<List<Region>> GetUserRegionsAsync(int userId)
        {
            if (await UserHasPermissionAsync(userId, "regions.all"))
            {
                return await _context.Regions.ToListAsync();
            }

            return await _context.UserRegionAccesses
                .Where(ura => ura.UserId == userId)
                .Select(ura => ura.Region)
                .ToListAsync();
        }
    }
}