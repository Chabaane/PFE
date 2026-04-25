// Controllers/ParcellesController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using System.Text.Json;
using AgricultureApp.Models.DTOs;
using AgricultureApp.Services;
using System.Security.Claims;

namespace AgricultureApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ParcellesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ParcellesController> _logger;
        private readonly IPermissionService _permissionService;

        public ParcellesController(
            ApplicationDbContext context,
            ILogger<ParcellesController> logger,
            IPermissionService permissionService)
        {
            _context = context;
            _logger = logger;
            _permissionService = permissionService;
        }

        // ??? Helpers ???????????????????????????????????????????????????????????

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

        private async Task<IQueryable<Parcelle>> ApplyRegionFilterAsync(IQueryable<Parcelle> query)
        {
            var userId = GetCurrentUserId();
            if (await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
                return query;

            var regionIds = await GetAuthorizedRegionIdsAsync();
            if (regionIds.Any())
                query = query.Where(p => p.RegionId != null && regionIds.Contains(p.RegionId.Value));
            else
                query = query.Where(p => false);
            return query;
        }

        // ??? Endpoints ?????????????????????????????????????????????????????????

        [HttpGet("all")]
        public async Task<ActionResult<List<ParcelleDto>>> GetAllParcelles()
        {
            var query = _context.Parcelles.AsQueryable();
            query = await ApplyRegionFilterAsync(query);

            var parcelles = await query
                .Select(p => new ParcelleDto
                {
                    Id = p.Id,
                    Nom = p.Nom,
                    Description = p.Description,
                    Surface = p.Surface,
                    Culture = p.Culture,
                    Couleur = p.Couleur,
                    AgriculteurId = p.AgriculteurId,
                    FermeId = p.FermeId,
                    Latitude = p.Latitude,
                    Longitude = p.Longitude,
                    Gouvernorat = p.Gouvernorat,
                    Delegation = p.Delegation,
                    Secteur = p.Secteur,
                    Geometrie = p.Geometrie,
                    DateCreation = p.DateCreation,
                    EstSynchronise = p.EstSynchronise
                })
                .ToListAsync();

            return Ok(parcelles);
        }

        [HttpGet("agriculteur/{agriculteurId}")]
        public async Task<ActionResult<IEnumerable<ParcelleDto>>> GetParcellesByAgriculteur(int agriculteurId)
        {
            try
            {
                var query = _context.Parcelles.Where(p => p.AgriculteurId == agriculteurId);
                query = await ApplyRegionFilterAsync(query);

                var parcelles = await query
                    .Select(p => new ParcelleDto
                    {
                        Id = p.Id,
                        Nom = p.Nom,
                        Description = p.Description,
                        Surface = p.Surface,
                        Culture = p.Culture,
                        Couleur = p.Couleur,
                        AgriculteurId = p.AgriculteurId,
                        FermeId = p.FermeId,
                        Latitude = (decimal)p.Latitude,
                        Longitude = (decimal)p.Longitude,
                        Gouvernorat = p.Gouvernorat,
                        Delegation = p.Delegation,
                        Secteur = p.Secteur,
                        Geometrie = p.Geometrie,
                        DateCreation = p.DateCreation,
                        EstSynchronise = p.EstSynchronise
                    })
                    .OrderByDescending(p => p.DateCreation)
                    .ToListAsync();

                return Ok(parcelles);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des parcelles");
                return StatusCode(500, "Erreur serveur");
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Parcelle>> GetParcelle(int id)
        {
            var parcelle = await _context.Parcelles.FindAsync(id);
            if (parcelle == null) return NotFound();

            var userId = GetCurrentUserId();
            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                if (parcelle.RegionId == null ||
                    !await _permissionService.UserHasRegionAccessAsync(userId, parcelle.RegionId.Value))
                {
                    return Forbid();
                }
            }

            return parcelle;
        }

        [HttpPost("agriculteur/{agriculteurId}")]
        public async Task<ActionResult<Parcelle>> CreateParcelle(int agriculteurId, DessinParcelleDto dto)
        {
            try
            {
                var agriculteur = await _context.Agriculteurs.FindAsync(agriculteurId);
                if (agriculteur == null) return NotFound("Agriculteur non trouvé");

                decimal surface = dto.Surface;
                if (surface == 0 && !string.IsNullOrEmpty(dto.Geometrie))
                    surface = CalculerSurface(dto.Geometrie);

                var parcelle = new Parcelle
                {
                    Nom = dto.Nom ?? $"Parcelle {DateTime.Now:ddMMyyyy-HHmm}",
                    Description = dto.Description,
                    AgriculteurId = agriculteurId,
                    Surface = surface,
                    Couleur = dto.Couleur,
                    Latitude = dto.Latitude,
                    Longitude = dto.Longitude,
                    Gouvernorat = dto.Gouvernorat,
                    Delegation = dto.Delegation,
                    Secteur = dto.Secteur,
                    Culture = dto.Culture,
                    DatePlantation = dto.DatePlantation,
                    DateRecolte = dto.DateRecolte,
                    Geometrie = dto.Geometrie,
                    DateCreation = DateTime.UtcNow,
                    EstSynchronise = true,
                    DerniereSynchronisation = DateTime.UtcNow,
                    AltitudeMin = dto.AltitudeMin,
                    AltitudeMax = dto.AltitudeMax,
                    AltitudeMoyenne = dto.AltitudeMoyenne,
                    PenteMoyenne = dto.PenteMoyenne,
                    ClassePente = dto.ClassePente,
                    Exposition = dto.Exposition,
                    FermeId = dto.FermeId
                };

                // Vérifier l'accès à la région si elle est fournie
                if (dto.RegionId.HasValue)
                {
                    var userId = GetCurrentUserId();
                    if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all") &&
                        !await _permissionService.UserHasRegionAccessAsync(userId, dto.RegionId.Value))
                    {
                        return Forbid();
                    }
                    parcelle.RegionId = dto.RegionId;
                }

                _context.Parcelles.Add(parcelle);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Parcelle créée: {parcelle.Id} pour l'agriculteur {agriculteurId}");
                return CreatedAtAction(nameof(GetParcelle), new { id = parcelle.Id }, parcelle);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la création de la parcelle");
                return StatusCode(500, "Erreur serveur");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateParcelle(int id, DessinParcelleDto dto)
        {
            var parcelle = await _context.Parcelles.FindAsync(id);
            if (parcelle == null) return NotFound();

            // Vérifier l'accès région
            var userId = GetCurrentUserId();
            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                if (parcelle.RegionId == null ||
                    !await _permissionService.UserHasRegionAccessAsync(userId, parcelle.RegionId.Value))
                {
                    return Forbid();
                }
            }

            parcelle.Nom = dto.Nom ?? parcelle.Nom;
            parcelle.Description = dto.Description;
            parcelle.Surface = dto.Surface;
            parcelle.Couleur = dto.Couleur;
            parcelle.Latitude = dto.Latitude;
            parcelle.Longitude = dto.Longitude;
            parcelle.Gouvernorat = dto.Gouvernorat;
            parcelle.Delegation = dto.Delegation;
            parcelle.Secteur = dto.Secteur;
            parcelle.Culture = dto.Culture;
            parcelle.DatePlantation = dto.DatePlantation;
            parcelle.DateRecolte = dto.DateRecolte;
            parcelle.Geometrie = dto.Geometrie;
            parcelle.DateModification = DateTime.UtcNow;
            parcelle.EstSynchronise = true;
            parcelle.DerniereSynchronisation = DateTime.UtcNow;

            // Mise à jour éventuelle de la région
            if (dto.RegionId.HasValue)
            {
                if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all") &&
                    !await _permissionService.UserHasRegionAccessAsync(userId, dto.RegionId.Value))
                {
                    return Forbid();
                }
                parcelle.RegionId = dto.RegionId;
            }

            _context.Entry(parcelle).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ParcelleExists(id)) return NotFound();
                throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteParcelle(int id)
        {
            var parcelle = await _context.Parcelles.FindAsync(id);
            if (parcelle == null) return NotFound();

            var userId = GetCurrentUserId();
            if (!await _permissionService.UserHasPermissionAsync(userId, "regions.all"))
            {
                if (parcelle.RegionId == null ||
                    !await _permissionService.UserHasRegionAccessAsync(userId, parcelle.RegionId.Value))
                {
                    return Forbid();
                }
            }

            _context.Parcelles.Remove(parcelle);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("agriculteur/{agriculteurId}/statistiques")]
        public async Task<ActionResult<StatistiquesAgriculteurDto>> GetStatistiques(int agriculteurId)
        {
            var query = _context.Parcelles.Where(p => p.AgriculteurId == agriculteurId);
            query = await ApplyRegionFilterAsync(query);
            var parcelles = await query.ToListAsync();

            var statistiques = new StatistiquesAgriculteurDto
            {
                NombreParcelles = parcelles.Count,
                SurfaceTotale = parcelles.Sum(p => p.Surface)
            };

            foreach (var parcelle in parcelles)
            {
                if (!string.IsNullOrEmpty(parcelle.Gouvernorat))
                {
                    if (statistiques.ParcellesParGouvernorat.ContainsKey(parcelle.Gouvernorat))
                        statistiques.ParcellesParGouvernorat[parcelle.Gouvernorat]++;
                    else
                        statistiques.ParcellesParGouvernorat[parcelle.Gouvernorat] = 1;
                }

                if (!string.IsNullOrEmpty(parcelle.Culture))
                {
                    if (statistiques.SurfaceParCulture.ContainsKey(parcelle.Culture))
                        statistiques.SurfaceParCulture[parcelle.Culture] += parcelle.Surface;
                    else
                        statistiques.SurfaceParCulture[parcelle.Culture] = parcelle.Surface;
                }
            }

            return statistiques;
        }

        [HttpPost("synchroniser")]
        public async Task<IActionResult> SynchroniserParcelles([FromBody] List<Parcelle> parcellesOffline)
        {
            try
            {
                foreach (var parcelleOffline in parcellesOffline)
                {
                    if (parcelleOffline.Id == 0)
                    {
                        parcelleOffline.DateCreation = DateTime.UtcNow;
                        parcelleOffline.EstSynchronise = true;
                        parcelleOffline.DerniereSynchronisation = DateTime.UtcNow;
                        _context.Parcelles.Add(parcelleOffline);
                    }
                    else
                    {
                        var existante = await _context.Parcelles.FindAsync(parcelleOffline.Id);
                        if (existante != null)
                        {
                            existante.Nom = parcelleOffline.Nom;
                            existante.Description = parcelleOffline.Description;
                            existante.Surface = parcelleOffline.Surface;
                            existante.Geometrie = parcelleOffline.Geometrie;
                            existante.DateModification = DateTime.UtcNow;
                            existante.EstSynchronise = true;
                            existante.DerniereSynchronisation = DateTime.UtcNow;
                        }
                    }
                }
                await _context.SaveChangesAsync();
                return Ok(new { message = "Synchronisation réussie", count = parcellesOffline.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la synchronisation");
                return StatusCode(500, "Erreur de synchronisation");
            }
        }

        private bool ParcelleExists(int id) => _context.Parcelles.Any(e => e.Id == id);

        private decimal CalculerSurface(string geojson)
        {
            try
            {
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var geoJson = JsonSerializer.Deserialize<GeoJsonFeature>(geojson, options);
                if (geoJson?.Geometry?.Coordinates != null)
                    return 1.0m;
                return 0.5m;
            }
            catch { return 0.5m; }
        }

        private class GeoJsonFeature
        {
            public string Type { get; set; } = string.Empty;
            public GeoJsonGeometry Geometry { get; set; } = new();
        }

        private class GeoJsonGeometry
        {
            public string Type { get; set; } = string.Empty;
            public List<List<List<decimal>>> Coordinates { get; set; } = new();
        }
    }
}