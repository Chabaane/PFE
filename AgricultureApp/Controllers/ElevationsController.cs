// Controllers/ElevationsController.cs
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using AgricultureApp.Services; // Ajoutez cette ligne

namespace AgricultureApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ElevationsController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<ElevationsController> _logger;
        private readonly ElevationCacheService _cache; // Ajoutez le cache

        public ElevationsController(
            IHttpClientFactory httpClientFactory,
            ILogger<ElevationsController> logger,
            ElevationCacheService cache) // Ajoutez le paramètre cache
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _cache = cache;
        }

        [HttpGet("get")]
        public async Task<IActionResult> GetElevation(double lat, double lng)
        {
            try
            {
                _logger.LogInformation($"Demande d'altitude pour lat: {lat}, lng: {lng}");

                // 1. Vérifier le cache d'abord
                var cachedElevation = _cache.Get(lat, lng);
                if (cachedElevation.HasValue)
                {
                    _logger.LogInformation($"Cache hit: {cachedElevation.Value}m");
                    return Ok(new { elevation = cachedElevation.Value, source = "cache" });
                }

                _logger.LogInformation($"Cache miss pour ({lat}, {lng})");

                // 2. Utiliser Open Topo Data
                var url = $"https://api.opentopodata.org/v1/srtm30m?locations={lat},{lng}";

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                var response = await client.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();

                    var result = JsonSerializer.Deserialize<OpenTopoDataResponse>(content);

                    if (result?.results != null && result.results.Length > 0 && result.results[0].elevation.HasValue)
                    {
                        var elevation = result.results[0].elevation.Value;
                        _logger.LogInformation($"Altitude trouvée: {elevation}m");

                        // Mettre en cache
                        _cache.Set(lat, lng, elevation);

                        return Ok(new { elevation = elevation, source = "api" });
                    }
                }

                _logger.LogWarning($"Erreur API OpenTopoData: {response?.StatusCode}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'appel à OpenTopoData");
            }

            // 3. Fallback: calculer une altitude approximative
            var fallbackElevation = CalculateApproximateElevation(lat, lng);
            _logger.LogInformation($"Utilisation de l'altitude approximative: {fallbackElevation}m");

            // Mettre en cache l'altitude approximative aussi
            _cache.Set(lat, lng, fallbackElevation);

            return Ok(new { elevation = fallbackElevation, source = "approximative" });
        }

        [HttpPost("batch")]
        public async Task<IActionResult> GetMultipleElevations([FromBody] List<CoordinateRequest> coordinates)
        {
            try
            {
                if (coordinates == null || !coordinates.Any())
                {
                    return BadRequest(new { error = "Aucune coordonnée fournie" });
                }

                _logger.LogInformation($"Demande batch pour {coordinates.Count} points");

                var results = new List<double>();
                var uncachedPoints = new List<CoordinateRequest>();

                // 1. Vérifier le cache pour chaque point
                foreach (var coord in coordinates)
                {
                    var cached = _cache.Get(coord.Lat, coord.Lng);
                    if (cached.HasValue)
                    {
                        results.Add(cached.Value);
                        _logger.LogDebug($"Cache hit: ({coord.Lat},{coord.Lng}) = {cached.Value}m");
                    }
                    else
                    {
                        uncachedPoints.Add(coord);
                    }
                }

                _logger.LogInformation($"Cache: {results.Count} hits, {uncachedPoints.Count} misses");

                // 2. Traiter les points non cachés par lots de 10 (pour éviter le rate limiting)
                var batchSize = 10;
                for (int i = 0; i < uncachedPoints.Count; i += batchSize)
                {
                    var batch = uncachedPoints.Skip(i).Take(batchSize).ToList();
                    var batchResults = await ProcessBatch(batch);
                    results.AddRange(batchResults);

                    // Attendre entre les lots pour éviter le rate limiting
                    if (i + batchSize < uncachedPoints.Count)
                    {
                        await Task.Delay(500); // 500ms entre les lots
                    }
                }

                return Ok(new { results = results.Select(e => new { elevation = e }) });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur batch");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private async Task<List<double>> ProcessBatch(List<CoordinateRequest> batch)
        {
            var results = new List<double>();

            foreach (var coord in batch)
            {
                // Vérifier à nouveau le cache (au cas où)
                var cached = _cache.Get(coord.Lat, coord.Lng);
                if (cached.HasValue)
                {
                    results.Add(cached.Value);
                    continue;
                }

                // Appeler l'API pour un point
                var elevation = await GetElevationFromApi(coord.Lat, coord.Lng);
                results.Add(elevation);
                _cache.Set(coord.Lat, coord.Lng, elevation);

                // Attendre entre les requêtes pour éviter le rate limiting
                await Task.Delay(200); // 200ms entre chaque requête
            }

            return results;
        }

        private async Task<double> GetElevationFromApi(double lat, double lng)
        {
            try
            {
                var url = $"https://api.opentopodata.org/v1/srtm30m?locations={lat},{lng}";
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                var response = await client.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<OpenTopoDataResponse>(content);

                    if (result?.results != null && result.results.Length > 0 && result.results[0].elevation.HasValue)
                    {
                        return result.results[0].elevation.Value;
                    }
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    _logger.LogWarning("Rate limit atteint, utilisation de l'altitude approximative");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur API");
            }

            return CalculateApproximateElevation(lat, lng);
        }

        private double CalculateApproximateElevation(double lat, double lng)
        {
            try
            {
                var latRad = lat * Math.PI / 180;
                var lngRad = lng * Math.PI / 180;

                var latFactor = Math.Sin(latRad * 5);
                var lngFactor = Math.Cos(lngRad * 3);

                double baseAltitude;

                if (lat > 36.5)
                    baseAltitude = 300;
                else if (lat > 35)
                    baseAltitude = 150;
                else
                    baseAltitude = 50;

                if (lng > 10)
                    baseAltitude += 50;
                else if (lng < 9)
                    baseAltitude += 100;

                var elevation = baseAltitude + (latFactor * 100) + (lngFactor * 50);
                elevation = Math.Max(0, Math.Min(1544, elevation));

                return Math.Round(elevation, 1);
            }
            catch
            {
                return 100;
            }
        }
    }

    public class CoordinateRequest
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
    }

    public class OpenTopoDataResponse
    {
        public OpenTopoDataResult[] results { get; set; }
        public string status { get; set; }
    }

    public class OpenTopoDataResult
    {
        public double? elevation { get; set; }
        public double? latitude { get; set; }
        public double? longitude { get; set; }
    }
}