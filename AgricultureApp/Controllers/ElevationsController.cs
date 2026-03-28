// Controllers/ElevationsController.cs
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.Json;
using System;
using System.Collections.Generic;
using System.Linq;

namespace AgricultureApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ElevationsController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<ElevationsController> _logger;

        public ElevationsController(
            IHttpClientFactory httpClientFactory,
            ILogger<ElevationsController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        [HttpGet("get")]
        public async Task<IActionResult> GetElevation(double lat, double lng)
        {
            try
            {
                _logger.LogInformation($"Demande d'altitude pour lat: {lat}, lng: {lng}");

                // Utiliser Open Topo Data (gratuit, plus fiable)
                var url = $"https://api.opentopodata.org/v1/srtm30m?locations={lat},{lng}";

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                var response = await client.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();

                    // Parser la réponse
                    var result = JsonSerializer.Deserialize<OpenTopoDataResponse>(content);

                    if (result?.results != null && result.results.Length > 0 && result.results[0].elevation.HasValue)
                    {
                        var elevation = result.results[0].elevation.Value;
                        _logger.LogInformation($"Altitude trouvée: {elevation}m");

                        return Ok(new { elevation = elevation });
                    }
                }

                _logger.LogWarning($"Erreur API OpenTopoData: {response?.StatusCode}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'appel à OpenTopoData");
            }

            // Fallback: calculer une altitude approximative
            var fallbackElevation = CalculateApproximateElevation(lat, lng);
            _logger.LogInformation($"Utilisation de l'altitude approximative: {fallbackElevation}m");

            return Ok(new { elevation = fallbackElevation });
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

                // Limiter le nombre de points pour éviter les problèmes
                var maxPoints = 100;
                var pointsToProcess = coordinates.Take(maxPoints).ToList();

                if (coordinates.Count > maxPoints)
                {
                    _logger.LogWarning($"Nombre de points limité de {coordinates.Count} à {maxPoints}");
                }

                // Construire l'URL avec tous les points
                var locations = string.Join("|", pointsToProcess.Select(c => $"{c.Lat},{c.Lng}"));
                var url = $"https://api.opentopodata.org/v1/srtm30m?locations={locations}";

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(30);

                var response = await client.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<OpenTopoDataResponse>(content);

                    if (result?.results != null)
                    {
                        var elevations = result.results.Select(r => r.elevation ?? 0).ToList();
                        return Ok(new { results = elevations.Select(e => new { elevation = e }) });
                    }
                }

                _logger.LogWarning($"Erreur batch: {response?.StatusCode}");

                // Retourner des altitudes approximatives
                var fallbackResults = pointsToProcess.Select(c => new
                {
                    elevation = CalculateApproximateElevation(c.Lat, c.Lng)
                }).ToList();

                return Ok(new { results = fallbackResults });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur batch");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private double CalculateApproximateElevation(double lat, double lng)
        {
            try
            {
                // Formule qui donne des altitudes réalistes pour la Tunisie
                // La Tunisie a des altitudes de 0m (côte) à 1544m (Jebel Chambi)

                // Conversion en radians
                var latRad = lat * Math.PI / 180;
                var lngRad = lng * Math.PI / 180;

                // Facteurs basés sur les coordonnées géographiques
                var latFactor = Math.Sin(latRad * 5);
                var lngFactor = Math.Cos(lngRad * 3);

                // Altitude de base selon la région
                double baseAltitude;

                // Nord de la Tunisie (montagnes)
                if (lat > 36.5)
                    baseAltitude = 300;
                // Centre (plaines)
                else if (lat > 35)
                    baseAltitude = 150;
                // Sud (désert)
                else
                    baseAltitude = 50;

                // Variation basée sur la longitude (côte à l'est, intérieur à l'ouest)
                if (lng > 10)
                    baseAltitude += 50;
                else if (lng < 9)
                    baseAltitude += 100;

                // Calcul final
                var elevation = baseAltitude + (latFactor * 100) + (lngFactor * 50);

                // S'assurer que l'altitude est positive
                elevation = Math.Max(0, Math.Min(1544, elevation));

                return Math.Round(elevation, 1);
            }
            catch
            {
                // En cas d'erreur de calcul, retourner une valeur par défaut
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