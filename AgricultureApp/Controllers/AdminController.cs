using AgricultureApp.Authorization;
using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using AgricultureApp.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AgricultureApp.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IPermissionService _permissionService;

        public AdminController(ApplicationDbContext context, IPermissionService permissionService)
        {
            _context = context;
            _permissionService = permissionService;
        }

        // ??? Utilisateurs ?????????????????????????????????????????????????????
        [HttpGet("users")]
        [RequirePermission("users.view")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Utilisateurs
                .Select(u => new {
                    u.Id,
                    u.Nom,
                    u.Prenom,
                    u.Email,
                    u.Telephone,
                    u.Localisation,
                    u.EstActif,
                    u.DateCreation,
                    Roles = u.UserRoles.Select(ur => ur.Role.Nom).ToList()
                })
                .ToListAsync();
            return Ok(users);
        }
        // ??? Rôles ????????????????????????????????????????????????????????????
        [HttpGet("roles")]
        [RequirePermission("roles.view")]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _context.Roles.ToListAsync();
            return Ok(roles);
        }

        [HttpPost("roles")]
        [RequirePermission("roles.create")]
        public async Task<IActionResult> CreateRole([FromBody] RoleDto dto)
        {
            var role = new Role { Nom = dto.Nom, Description = dto.Description };
            _context.Roles.Add(role);
            await _context.SaveChangesAsync();
            return Ok(role);
        }

        [HttpPut("roles/{id}")]
        [RequirePermission("roles.edit")]
        public async Task<IActionResult> UpdateRole(int id, [FromBody] RoleDto dto)
        {
            var role = await _context.Roles.FindAsync(id);
            if (role == null) return NotFound();
            role.Nom = dto.Nom;
            role.Description = dto.Description;
            await _context.SaveChangesAsync();
            return Ok(role);
        }

        [HttpDelete("roles/{id}")]
        [RequirePermission("roles.delete")]
        public async Task<IActionResult> DeleteRole(int id)
        {
            var role = await _context.Roles.FindAsync(id);
            if (role == null) return NotFound();
            _context.Roles.Remove(role);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ??? Permissions ??????????????????????????????????????????????????????
        [HttpGet("permissions")]
        [RequirePermission("permissions.view")]
        public async Task<IActionResult> GetPermissions()
        {
            var permissions = await _context.Permissions.ToListAsync();
            return Ok(permissions);
        }

        // ??? Régions ??????????????????????????????????????????????????????????
        [HttpGet("regions")]
        [RequirePermission("regions.view")]
        public async Task<IActionResult> GetAllRegions()
        {
            var regions = await _context.Regions.ToListAsync();
            return Ok(regions);
        }

        // ??? Gestion des rôles utilisateur ????????????????????????????????????
        [HttpGet("users/{userId}/roles")]
        [RequirePermission("users.roles.view")]
        public async Task<IActionResult> GetUserRoles(int userId)
        {
            var roles = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.Role)
                .ToListAsync();
            return Ok(roles);
        }

        [HttpPost("users/{userId}/roles")]
        [RequirePermission("users.roles.edit")]
        public async Task<IActionResult> AssignRoleToUser(int userId, [FromBody] int roleId)
        {
            if (!await _context.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == roleId))
            {
                _context.UserRoles.Add(new UserRole { UserId = userId, RoleId = roleId });
                await _context.SaveChangesAsync();
            }
            return Ok();
        }

        [HttpDelete("users/{userId}/roles/{roleId}")]
        [RequirePermission("users.roles.edit")]
        public async Task<IActionResult> RemoveRoleFromUser(int userId, int roleId)
        {
            var userRole = await _context.UserRoles
                .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleId == roleId);
            if (userRole == null) return NotFound();
            _context.UserRoles.Remove(userRole);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ??? Permissions directes utilisateur ?????????????????????????????????
        [HttpGet("users/{userId}/permissions/direct")]
        [RequirePermission("users.permissions.view")]
        public async Task<IActionResult> GetUserDirectPermissions(int userId)
        {
            var perms = await _context.UserPermissions
                .Where(up => up.UserId == userId)
                .Select(up => up.Permission)
                .ToListAsync();
            return Ok(perms);
        }

        [HttpPost("users/{userId}/permissions")]
        [RequirePermission("users.permissions.edit")]
        public async Task<IActionResult> GrantPermissionToUser(int userId, [FromBody] int permissionId)
        {
            if (!await _context.UserPermissions.AnyAsync(up => up.UserId == userId && up.PermissionId == permissionId))
            {
                _context.UserPermissions.Add(new UserPermission { UserId = userId, PermissionId = permissionId });
                await _context.SaveChangesAsync();
            }
            return Ok();
        }

        [HttpDelete("users/{userId}/permissions/{permissionId}")]
        [RequirePermission("users.permissions.edit")]
        public async Task<IActionResult> RevokePermissionFromUser(int userId, int permissionId)
        {
            var up = await _context.UserPermissions
                .FirstOrDefaultAsync(up => up.UserId == userId && up.PermissionId == permissionId);
            if (up == null) return NotFound();
            _context.UserPermissions.Remove(up);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ??? Accès régions utilisateur ????????????????????????????????????????
        [HttpGet("users/{userId}/regions")]
        [RequirePermission("users.regions.view")]
        public async Task<IActionResult> GetUserRegions(int userId)
        {
            var regions = await _permissionService.GetUserRegionsAsync(userId);
            return Ok(regions);
        }

        [HttpPost("users/{userId}/regions")]
        [RequirePermission("users.regions.edit")]
        public async Task<IActionResult> GrantRegionToUser(int userId, [FromBody] int regionId)
        {
            if (!await _context.UserRegionAccesses.AnyAsync(ura => ura.UserId == userId && ura.RegionId == regionId))
            {
                _context.UserRegionAccesses.Add(new UserRegionAccess { UserId = userId, RegionId = regionId });
                await _context.SaveChangesAsync();
            }
            return Ok();
        }

        [HttpDelete("users/{userId}/regions/{regionId}")]
        [RequirePermission("users.regions.edit")]
        public async Task<IActionResult> RevokeRegionFromUser(int userId, int regionId)
        {
            var ura = await _context.UserRegionAccesses
                .FirstOrDefaultAsync(ura => ura.UserId == userId && ura.RegionId == regionId);
            if (ura == null) return NotFound();
            _context.UserRegionAccesses.Remove(ura);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ??? Permissions effectives ???????????????????????????????????????????
        [HttpGet("users/{userId}/permissions/effective")]
        [RequirePermission("users.permissions.view")]
        public async Task<IActionResult> GetEffectivePermissions(int userId)
        {
            var permissions = await _permissionService.GetUserPermissionsAsync(userId);
            return Ok(permissions);
        }
    }

    public class RoleDto
    {
        public string Nom { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}