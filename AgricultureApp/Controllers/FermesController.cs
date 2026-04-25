// Controllers/FermesController.cs
using Microsoft.AspNetCore.Mvc;
using AgricultureApp.Models.DTOs;
using AgricultureApp.Services;
using AgricultureApp.Models.Entities;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace AgricultureApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FermesController : ControllerBase
    {
        private readonly IFermeService _fermeService;
        private readonly IPermissionService _permissionService;

        public FermesController(IFermeService fermeService, IPermissionService permissionService)
        {
            _fermeService = fermeService;
            _permissionService = permissionService;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
                return userId;
            throw new UnauthorizedAccessException("Utilisateur non authentifié");
        }

        private async Task<List<int>> GetAuthorizedRegionIdsAsync()
        {
            var userId = GetCurrentUserId();
            var userRegions = await _permissionService.GetUserRegionsAsync(userId);
            return userRegions.Select(r => r.Id).ToList();
        }

        [HttpGet]
        public async Task<ActionResult<List<FermeDto>>> GetAllFermes()
        {
            var fermes = await _fermeService.GetAllFermes();
            var userId = GetCurrentUserId();

            // Filtrer par région si l'utilisateur n'a pas accès global
            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                var regionIds = await GetAuthorizedRegionIdsAsync();
                fermes = fermes.Where(f => f.RegionId == null || regionIds.Contains(f.RegionId.Value)).ToList();
            }

            return Ok(fermes);
        }

        [HttpGet("agriculteur/{agriculteurId}")]
        public async Task<ActionResult<List<FermeDto>>> GetFermesByAgriculteur(int agriculteurId)
        {
            var fermes = await _fermeService.GetFermesByAgriculteur(agriculteurId);
            var userId = GetCurrentUserId();

            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                var regionIds = await GetAuthorizedRegionIdsAsync();
                fermes = fermes.Where(f => f.RegionId == null || regionIds.Contains(f.RegionId.Value)).ToList();
            }

            return Ok(fermes);
        }

        [HttpGet("{id}/details")]
        public async Task<ActionResult<FermeDetailDto>> GetFermeWithParcelles(int id)
        {
            var ferme = await _fermeService.GetFermeWithParcelles(id);
            if (ferme == null) return NotFound();

            var userId = GetCurrentUserId();
            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                if (ferme.RegionId != null && !await _permissionService.UserHasRegionAccessAsync(userId, ferme.RegionId.Value))
                    return Forbid();
            }

            return Ok(ferme);
        }

        [HttpPost]
        public async Task<ActionResult<FermeDto>> CreateFerme([FromBody] CreateFermeDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Vérifier l'accès à la région si spécifiée
            var userId = GetCurrentUserId();
            if (dto.RegionId.HasValue)
            {
                if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all") &&
                    !await _permissionService.UserHasRegionAccessAsync(userId, dto.RegionId.Value))
                {
                    return Forbid();
                }
            }

            try
            {
                var ferme = await _fermeService.CreateFerme(dto);
                return CreatedAtAction(nameof(GetFermeWithParcelles), new { id = ferme.Id }, ferme);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<FermeDto>> UpdateFerme(int id, [FromBody] UpdateFermeDto dto)
        {
            var ferme = await _fermeService.GetFermeWithParcelles(id);
            if (ferme == null) return NotFound();

            var userId = GetCurrentUserId();
            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                if (ferme.RegionId != null && !await _permissionService.UserHasRegionAccessAsync(userId, ferme.RegionId.Value))
                    return Forbid();

                if (dto.RegionId.HasValue && !await _permissionService.UserHasRegionAccessAsync(userId, dto.RegionId.Value))
                    return Forbid();
            }

            var result = await _fermeService.UpdateFerme(id, dto);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFerme(int id)
        {
            var ferme = await _fermeService.GetFermeWithParcelles(id);
            if (ferme == null) return NotFound();

            var userId = GetCurrentUserId();
            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                if (ferme.RegionId != null && !await _permissionService.UserHasRegionAccessAsync(userId, ferme.RegionId.Value))
                    return Forbid();
            }

            var result = await _fermeService.DeleteFerme(id);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpPost("{id}/parcelles/assigner")]
        public async Task<IActionResult> AssignerParcelles(int id, [FromBody] AssignerParcellesDto dto)
        {
            if (dto == null || dto.ParcelleIds == null || !dto.ParcelleIds.Any())
                return BadRequest(new { error = "Aucune parcelle à assigner" });

            var ferme = await _fermeService.GetFermeWithParcelles(id);
            if (ferme == null) return NotFound();

            var userId = GetCurrentUserId();
            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                if (ferme.RegionId != null && !await _permissionService.UserHasRegionAccessAsync(userId, ferme.RegionId.Value))
                    return Forbid();
            }

            try
            {
                var result = await _fermeService.AssignerParcelles(id, dto.ParcelleIds);
                if (!result)
                    return BadRequest(new { error = "Impossible d'assigner les parcelles. Vérifiez que la ferme existe et que les parcelles appartiennent au même agriculteur." });
                return Ok(new { message = "Parcelles assignées avec succès" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("{id}/parcelles/{parcelleId}")]
        public async Task<IActionResult> RetirerParcelle(int id, int parcelleId)
        {
            var ferme = await _fermeService.GetFermeWithParcelles(id);
            if (ferme == null) return NotFound();

            var userId = GetCurrentUserId();
            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                if (ferme.RegionId != null && !await _permissionService.UserHasRegionAccessAsync(userId, ferme.RegionId.Value))
                    return Forbid();
            }

            var result = await _fermeService.RetirerParcelle(id, parcelleId);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpGet("{id}/parcelles")]
        public async Task<ActionResult<List<ParcelleSimplifieeDto>>> GetParcellesByFerme(int id)
        {
            var ferme = await _fermeService.GetFermeWithParcelles(id);
            if (ferme == null) return NotFound();

            var userId = GetCurrentUserId();
            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                if (ferme.RegionId != null && !await _permissionService.UserHasRegionAccessAsync(userId, ferme.RegionId.Value))
                    return Forbid();
            }

            var parcelles = await _fermeService.GetParcellesByFerme(id);
            return Ok(parcelles);
        }

        [HttpPost("{id}/parcelles/creer")]
        public async Task<ActionResult<Parcelle>> CreateParcelleDansFerme(int id, [FromBody] DessinParcelleDto dto)
        {
            var ferme = await _fermeService.GetFermeWithParcelles(id);
            if (ferme == null) return NotFound("Ferme non trouvée");

            var userId = GetCurrentUserId();
            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                if (ferme.RegionId != null && !await _permissionService.UserHasRegionAccessAsync(userId, ferme.RegionId.Value))
                    return Forbid();
            }

            var parcelle = await _fermeService.CreateParcelleDansFerme(id, dto);
            if (parcelle == null) return NotFound("Ferme non trouvée");
            return CreatedAtAction(nameof(GetParcellesByFerme), new { id }, parcelle);
        }
    }
}