// Services/FermeService.cs
using Microsoft.EntityFrameworkCore;
using AgricultureApp.Data;
using AgricultureApp.Models.DTOs;
using AgricultureApp.Models.Entities;

namespace AgricultureApp.Services
{
    public interface IFermeService
    {
        Task<List<FermeDto>> GetAllFermes();
        Task<List<FermeDto>> GetFermesByAgriculteur(int agriculteurId);
        Task<FermeDetailDto> GetFermeWithParcelles(int id);
        Task<FermeDto> CreateFerme(CreateFermeDto dto);
        Task<FermeDto> UpdateFerme(int id, UpdateFermeDto dto);
        Task<bool> DeleteFerme(int id);
        Task<bool> AssignerParcelles(int fermeId, List<int> parcelleIds);
        Task<bool> RetirerParcelle(int fermeId, int parcelleId);
        Task<List<ParcelleSimplifieeDto>> GetParcellesByFerme(int fermeId);
        Task<Parcelle> CreateParcelleDansFerme(int fermeId, DessinParcelleDto dto);
    }

    public class FermeService : IFermeService
    {
        private readonly ApplicationDbContext _context;

        public FermeService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<FermeDto>> GetAllFermes()
        {
            return await _context.Fermes
                .Include(f => f.Parcelles)
                .Select(f => new FermeDto
                {
                    Id = f.Id,
                    Nom = f.Nom,
                    AgriculteurId = f.AgriculteurId,
                    Gouvernorat = f.Gouvernorat,
                    Delegation = f.Delegation,
                    Secteur = f.Secteur,
                    Description = f.Description,
                    Couleur = f.Couleur,
                    NombreParcelles = f.Parcelles.Count,
                    SuperficieTotale = f.Parcelles.Sum(p => p.Surface),
                    DateCreation = f.DateCreation
                })
                .ToListAsync();
        }

        public async Task<List<FermeDto>> GetFermesByAgriculteur(int agriculteurId)
        {
            return await _context.Fermes
                .Include(f => f.Parcelles)
                .Where(f => f.AgriculteurId == agriculteurId)
                .Select(f => new FermeDto
                {
                    Id = f.Id,
                    Nom = f.Nom,
                    AgriculteurId = f.AgriculteurId,
                    Gouvernorat = f.Gouvernorat,
                    Delegation = f.Delegation,
                    Secteur = f.Secteur,
                    Description = f.Description,
                    Couleur = f.Couleur,
                    NombreParcelles = f.Parcelles.Count,
                    SuperficieTotale = f.Parcelles.Sum(p => p.Surface),
                    DateCreation = f.DateCreation
                })
                .ToListAsync();
        }

        public async Task<FermeDetailDto> GetFermeWithParcelles(int id)
        {
            var ferme = await _context.Fermes
                .Include(f => f.Parcelles)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (ferme == null)
                return null;

            return new FermeDetailDto
            {
                Id = ferme.Id,
                Nom = ferme.Nom,
                AgriculteurId = ferme.AgriculteurId,
                Gouvernorat = ferme.Gouvernorat,
                Delegation = ferme.Delegation,
                Secteur = ferme.Secteur,
                Description = ferme.Description,
                Couleur = ferme.Couleur,
                NombreParcelles = ferme.Parcelles.Count,
                SuperficieTotale = ferme.Parcelles.Sum(p => p.Surface),
                DateCreation = ferme.DateCreation,
                Parcelles = ferme.Parcelles.Select(p => new ParcelleSimplifieeDto
                {
                    Id = p.Id,
                    Nom = p.Nom,
                    Surface = p.Surface,
                    Culture = p.Culture,
                    Couleur = p.Couleur,
                    EstSynchronise = p.EstSynchronise
                }).ToList()
            };
        }

        // Services/FermeService.cs
        public async Task<FermeDto> CreateFerme(CreateFermeDto dto)
        {
            try
            {
                Console.WriteLine("=== BACKEND - Création ferme ===");
                Console.WriteLine($"Nom: '{dto.Nom}'");
                Console.WriteLine($"AgriculteurId: {dto.AgriculteurId} (type: {dto.AgriculteurId.GetType()})");
                Console.WriteLine($"Gouvernorat: '{dto.Gouvernorat}'");
                Console.WriteLine($"Delegation: '{dto.Delegation}'");

                // Vérification explicite
                if (dto.AgriculteurId <= 0)
                {
                    throw new Exception("ID agriculteur invalide");
                }

                var ferme = new Ferme
                {
                    Nom = dto.Nom ?? "Ferme sans nom",
                    AgriculteurId = dto.AgriculteurId,
                    Gouvernorat = dto.Gouvernorat,
                    Delegation = dto.Delegation,
                    Secteur = dto.Secteur,
                    Description = dto.Description,
                    Couleur = dto.Couleur ?? "#4CAF50",
                    DateCreation = DateTime.UtcNow
                };

                _context.Fermes.Add(ferme);
                await _context.SaveChangesAsync();

                Console.WriteLine($"Ferme créée avec ID: {ferme.Id}");

                return new FermeDto
                {
                    Id = ferme.Id,
                    Nom = ferme.Nom,
                    AgriculteurId = ferme.AgriculteurId,
                    Gouvernorat = ferme.Gouvernorat,
                    Delegation = ferme.Delegation,
                    Secteur = ferme.Secteur,
                    Description = ferme.Description,
                    Couleur = ferme.Couleur,
                    NombreParcelles = 0,
                    SuperficieTotale = 0,
                    DateCreation = ferme.DateCreation
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERREUR BACKEND: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                throw;
            }
        }

        public async Task<FermeDto> UpdateFerme(int id, UpdateFermeDto dto)
        {
            var ferme = await _context.Fermes.FindAsync(id);
            if (ferme == null)
                return null;

            if (!string.IsNullOrEmpty(dto.Nom))
                ferme.Nom = dto.Nom;

            if (!string.IsNullOrEmpty(dto.Gouvernorat))
                ferme.Gouvernorat = dto.Gouvernorat;

            if (!string.IsNullOrEmpty(dto.Delegation))
                ferme.Delegation = dto.Delegation;

            if (!string.IsNullOrEmpty(dto.Secteur))
                ferme.Secteur = dto.Secteur;

            if (!string.IsNullOrEmpty(dto.Description))
                ferme.Description = dto.Description;

            if (!string.IsNullOrEmpty(dto.Couleur))
                ferme.Couleur = dto.Couleur;

            ferme.DateModification = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new FermeDto
            {
                Id = ferme.Id,
                Nom = ferme.Nom,
                AgriculteurId = ferme.AgriculteurId,
                Gouvernorat = ferme.Gouvernorat,
                Delegation = ferme.Delegation,
                Secteur = ferme.Secteur,
                Description = ferme.Description,
                Couleur = ferme.Couleur,
                DateCreation = ferme.DateCreation
            };
        }

        public async Task<bool> DeleteFerme(int id)
        {
            var ferme = await _context.Fermes
                .Include(f => f.Parcelles)
                .FirstOrDefaultAsync(f => f.Id == id);

            if (ferme == null)
                return false;

            // Retirer l'association des parcelles avant de supprimer la ferme
            foreach (var parcelle in ferme.Parcelles)
            {
                parcelle.FermeId = null;
            }

            _context.Fermes.Remove(ferme);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> AssignerParcelles(int fermeId, List<int> parcelleIds)
        {
            var ferme = await _context.Fermes.FindAsync(fermeId);
            if (ferme == null)
                return false;

            var parcelles = await _context.Parcelles
                .Where(p => parcelleIds.Contains(p.Id) && p.AgriculteurId == ferme.AgriculteurId)
                .ToListAsync();

            foreach (var parcelle in parcelles)
            {
                parcelle.FermeId = fermeId;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RetirerParcelle(int fermeId, int parcelleId)
        {
            var parcelle = await _context.Parcelles
                .FirstOrDefaultAsync(p => p.Id == parcelleId && p.FermeId == fermeId);

            if (parcelle == null)
                return false;

            parcelle.FermeId = null;
            await _context.SaveChangesAsync();
            return true;
        }
        // Ajoutez ces méthodes dans FermeService.cs

        public async Task<Parcelle> CreateParcelleDansFerme(int fermeId, DessinParcelleDto dto)
        {
            var ferme = await _context.Fermes
                .Include(f => f.Parcelles)
                .FirstOrDefaultAsync(f => f.Id == fermeId);

            if (ferme == null)
                return null;

            var parcelle = new Parcelle
            {
                Nom = dto.Nom,
                Surface = dto.Surface,
                Culture = dto.Culture,
                Couleur = dto.Couleur,
                AgriculteurId = ferme.AgriculteurId,
                FermeId = fermeId,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Geometrie = dto.Geometrie,
                Gouvernorat = dto.Gouvernorat ?? ferme.Gouvernorat,
                Delegation = dto.Delegation ?? ferme.Delegation,
                DateCreation = DateTime.UtcNow,
                EstSynchronise = true
            };

            _context.Parcelles.Add(parcelle);
            await _context.SaveChangesAsync();

            return parcelle;
        }

        public async Task<List<ParcelleSimplifieeDto>> GetParcellesByFerme(int fermeId)
        {
            return await _context.Parcelles
                .Where(p => p.FermeId == fermeId)
                .Select(p => new ParcelleSimplifieeDto
                {
                    Id = p.Id,
                    Nom = p.Nom,
                    Surface = p.Surface,
                    Culture = p.Culture,
                    Couleur = p.Couleur,
                    EstSynchronise = p.EstSynchronise
                })
                .ToListAsync();
        }
    }
}