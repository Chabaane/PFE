// Controllers/ParcellesController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgricultureApp.Data; 
using AgricultureApp.Models.Entities;
using System.Text.Json;

namespace AgricultureApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ParcellesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ParcellesController> _logger;

        public ParcellesController(ApplicationDbContext context, ILogger<ParcellesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/parcelles/agriculteur/{agriculteurId}
        [HttpGet("agriculteur/{agriculteurId}")]
        public async Task<ActionResult<IEnumerable<Parcelle>>> GetParcellesByAgriculteur(int agriculteurId)
        {
            try
            {
                var parcelles = await _context.Parcelles
                    .Where(p => p.AgriculteurId == agriculteurId)
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

        // GET: api/parcelles/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<Parcelle>> GetParcelle(int id)
        {
            var parcelle = await _context.Parcelles.FindAsync(id);

            if (parcelle == null)
            {
                return NotFound();
            }

            return parcelle;
        }

        // POST: api/parcelles/agriculteur/{agriculteurId}
        [HttpPost("agriculteur/{agriculteurId}")]
        public async Task<ActionResult<Parcelle>> CreateParcelle(int agriculteurId, DessinParcelleDto dto)
        {
            try
            {
                // Vérifier que l'agriculteur existe
                var agriculteur = await _context.Agriculteurs.FindAsync(agriculteurId);
                if (agriculteur == null)
                {
                    return NotFound("Agriculteur non trouvé");
                }

                // Calculer la surface si elle n'est pas fournie
                decimal surface = dto.Surface;
                if (surface == 0 && !string.IsNullOrEmpty(dto.Geometrie))
                {
                    surface = CalculerSurface(dto.Geometrie);
                }

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
                    DerniereSynchronisation = DateTime.UtcNow
                };

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

        // PUT: api/parcelles/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateParcelle(int id, DessinParcelleDto dto)
        {
            var parcelle = await _context.Parcelles.FindAsync(id);
            if (parcelle == null)
            {
                return NotFound();
            }

            // Mettre à jour les propriétés
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

            _context.Entry(parcelle).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ParcelleExists(id))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // DELETE: api/parcelles/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteParcelle(int id)
        {
            var parcelle = await _context.Parcelles.FindAsync(id);
            if (parcelle == null)
            {
                return NotFound();
            }

            _context.Parcelles.Remove(parcelle);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/parcelles/agriculteur/{agriculteurId}/statistiques
        [HttpGet("agriculteur/{agriculteurId}/statistiques")]
        public async Task<ActionResult<StatistiquesAgriculteurDto>> GetStatistiques(int agriculteurId)
        {
            var parcelles = await _context.Parcelles
                .Where(p => p.AgriculteurId == agriculteurId)
                .ToListAsync();

            var statistiques = new StatistiquesAgriculteurDto
            {
                NombreParcelles = parcelles.Count,
                SurfaceTotale = parcelles.Sum(p => p.Surface)
            };

            // Parcourir les parcelles pour remplir les dictionnaires
            foreach (var parcelle in parcelles)
            {
                // Par gouvernorat
                if (!string.IsNullOrEmpty(parcelle.Gouvernorat))
                {
                    if (statistiques.ParcellesParGouvernorat.ContainsKey(parcelle.Gouvernorat))
                    {
                        statistiques.ParcellesParGouvernorat[parcelle.Gouvernorat]++;
                    }
                    else
                    {
                        statistiques.ParcellesParGouvernorat[parcelle.Gouvernorat] = 1;
                    }
                }

                // Par culture
                if (!string.IsNullOrEmpty(parcelle.Culture))
                {
                    if (statistiques.SurfaceParCulture.ContainsKey(parcelle.Culture))
                    {
                        statistiques.SurfaceParCulture[parcelle.Culture] += parcelle.Surface;
                    }
                    else
                    {
                        statistiques.SurfaceParCulture[parcelle.Culture] = parcelle.Surface;
                    }
                }
            }

            return statistiques;
        }

        // POST: api/parcelles/synchroniser
        [HttpPost("synchroniser")]
        public async Task<IActionResult> SynchroniserParcelles([FromBody] List<Parcelle> parcellesOffline)
        {
            try
            {
                foreach (var parcelleOffline in parcellesOffline)
                {
                    if (parcelleOffline.Id == 0) // Nouvelle parcelle
                    {
                        parcelleOffline.DateCreation = DateTime.UtcNow;
                        parcelleOffline.EstSynchronise = true;
                        parcelleOffline.DerniereSynchronisation = DateTime.UtcNow;
                        _context.Parcelles.Add(parcelleOffline);
                    }
                    else // Parcelle existante
                    {
                        var parcelleExistante = await _context.Parcelles.FindAsync(parcelleOffline.Id);
                        if (parcelleExistante != null)
                        {
                            // Mettre à jour
                            parcelleExistante.Nom = parcelleOffline.Nom;
                            parcelleExistante.Description = parcelleOffline.Description;
                            parcelleExistante.Surface = parcelleOffline.Surface;
                            parcelleExistante.Geometrie = parcelleOffline.Geometrie;
                            parcelleExistante.DateModification = DateTime.UtcNow;
                            parcelleExistante.EstSynchronise = true;
                            parcelleExistante.DerniereSynchronisation = DateTime.UtcNow;
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

        private bool ParcelleExists(int id)
        {
            return _context.Parcelles.Any(e => e.Id == id);
        }

        private decimal CalculerSurface(string geojson)
        {
            try
            {
                // Implémentation simplifiée du calcul de surface
                // Pour une implémentation réelle, utiliser une bibliothèque comme NetTopologySuite
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var geoJson = JsonSerializer.Deserialize<GeoJsonFeature>(geojson, options);

                if (geoJson?.Geometry?.Coordinates != null)
                {
                    // Calcul approximatif (à remplacer par un vrai calcul)
                    return 1.0m; // Valeur par défaut
                }

                return 0.5m; // Valeur par défaut minimale
            }
            catch
            {
                return 0.5m;
            }
        }

        // Classes pour le parsing GeoJSON
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