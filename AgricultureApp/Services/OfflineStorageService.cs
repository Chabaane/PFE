// Services/OfflineStorageService.cs
using System.Text.Json;
using AgricultureApp.Models.Entities; 

namespace AgricultureApp.Services
{
    public interface IOfflineStorageService
    {
        Task SaveParcelleOffline(Parcelle parcelle);
        Task<List<Parcelle>> GetParcellesOffline();
        Task ClearOfflineStorage();
        Task<bool> HasOfflineData();
    }

    public class OfflineStorageService : IOfflineStorageService
    {
        private readonly string _storagePath;
        private readonly ILogger<OfflineStorageService> _logger;

        public OfflineStorageService(IWebHostEnvironment env, ILogger<OfflineStorageService> logger)
        {
            _storagePath = Path.Combine(env.ContentRootPath, "OfflineStorage");
            _logger = logger;

            // Créer le répertoire s'il n'existe pas
            if (!Directory.Exists(_storagePath))
            {
                Directory.CreateDirectory(_storagePath);
            }
        }

        public async Task SaveParcelleOffline(Parcelle parcelle)
        {
            try
            {
                // Marquer comme non synchronisé
                parcelle.EstSynchronise = false;
                parcelle.DerniereSynchronisation = null;

                var filePath = GetParcelleFilePath(parcelle.Id);
                var json = JsonSerializer.Serialize(parcelle, new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                await File.WriteAllTextAsync(filePath, json);

                // Sauvegarder aussi dans la liste générale
                await UpdateOfflineList(parcelle);

                _logger.LogInformation($"Parcelle sauvegardée en offline: {parcelle.Id}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la sauvegarde offline");
                throw;
            }
        }

        public async Task<List<Parcelle>> GetParcellesOffline()
        {
            var parcelles = new List<Parcelle>();

            try
            {
                var listFilePath = Path.Combine(_storagePath, "parcelles_offline.json");

                if (File.Exists(listFilePath))
                {
                    var json = await File.ReadAllTextAsync(listFilePath);
                    parcelles = JsonSerializer.Deserialize<List<Parcelle>>(json) ?? new List<Parcelle>();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la lecture des données offline");
            }

            return parcelles;
        }

        public async Task ClearOfflineStorage()
        {
            try
            {
                var listFilePath = Path.Combine(_storagePath, "parcelles_offline.json");

                if (File.Exists(listFilePath))
                {
                    File.Delete(listFilePath);
                }

                // Supprimer les fichiers individuels
                var parcelleFiles = Directory.GetFiles(_storagePath, "parcelle_*.json");
                foreach (var file in parcelleFiles)
                {
                    File.Delete(file);
                }

                _logger.LogInformation("Stockage offline vidé");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors du nettoyage du stockage offline");
            }
        }

        public async Task<bool> HasOfflineData()
        {
            var listFilePath = Path.Combine(_storagePath, "parcelles_offline.json");
            return File.Exists(listFilePath) && new FileInfo(listFilePath).Length > 0;
        }

        private string GetParcelleFilePath(int parcelleId)
        {
            return Path.Combine(_storagePath, $"parcelle_{parcelleId}.json");
        }

        private async Task UpdateOfflineList(Parcelle parcelle)
        {
            var listFilePath = Path.Combine(_storagePath, "parcelles_offline.json");
            var parcelles = new List<Parcelle>();

            if (File.Exists(listFilePath))
            {
                var json = await File.ReadAllTextAsync(listFilePath);
                parcelles = JsonSerializer.Deserialize<List<Parcelle>>(json) ?? new List<Parcelle>();
            }

            // Vérifier si la parcelle existe déjà
            var existing = parcelles.FirstOrDefault(p => p.Id == parcelle.Id);
            if (existing != null)
            {
                parcelles.Remove(existing);
            }

            parcelles.Add(parcelle);

            var updatedJson = JsonSerializer.Serialize(parcelles, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await File.WriteAllTextAsync(listFilePath, updatedJson);
        }
    }
}