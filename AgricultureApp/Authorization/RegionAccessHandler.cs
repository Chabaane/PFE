using AgricultureApp.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace AgricultureApp.Authorization
{
    public class RegionAccessRequirement : IAuthorizationRequirement
    {
    }

    public class RegionAccessHandler : AuthorizationHandler<RegionAccessRequirement>
    {
        private readonly IPermissionService _permissionService;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public RegionAccessHandler(IPermissionService permissionService, IHttpContextAccessor httpContextAccessor)
        {
            _permissionService = permissionService;
            _httpContextAccessor = httpContextAccessor;
        }

        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            RegionAccessRequirement requirement)
        {
            // Récupérer l'ID utilisateur depuis les claims
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                context.Fail();
                return;
            }

            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null)
            {
                context.Fail();
                return;
            }

            string? regionIdStr = null;

            // Essayer de récupérer regionId depuis la route
            if (httpContext.Request.RouteValues.TryGetValue("regionId", out var regionIdObj))
            {
                regionIdStr = regionIdObj?.ToString();
            }
            // Ou depuis la query string
            else if (httpContext.Request.Query.TryGetValue("regionId", out var regionIdQuery))
            {
                regionIdStr = regionIdQuery.ToString();
            }

            if (!string.IsNullOrEmpty(regionIdStr) && int.TryParse(regionIdStr, out int regionId))
            {
                if (await _permissionService.UserHasRegionAccessAsync(userId, regionId))
                {
                    context.Succeed(requirement);
                    return;
                }
            }

            // Pour les endpoints de liste (pas de regionId précis), on laisse passer
            // Le filtrage se fera dans le contrôleur.
            context.Succeed(requirement);
        }
    }
}