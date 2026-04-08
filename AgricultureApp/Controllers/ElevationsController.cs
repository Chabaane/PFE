// Controllers/ElevationsController.cs
using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using AgricultureApp.Services;

namespace AgricultureApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ElevationsController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<ElevationsController> _logger;
        private readonly ElevationCacheService _cache;

        public ElevationsController(
            IHttpClientFactory httpClientFactory,
            ILogger<ElevationsController> logger,
            ElevationCacheService cache)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _cache = cache;
        }

        [HttpGet("weather")]
        public async Task<IActionResult> GetWeather(double lat, double lng, string variables = "", string timezone = "Africa/Tunis")
        {
            try
            {
                // Validation des coordonnées
                if (double.IsNaN(lat) || double.IsInfinity(lat) || lat < -90 || lat > 90)
                {
                    _logger.LogWarning($"Latitude invalide: {lat}");
                    return BadRequest(new { error = true, reason = $"Latitude invalide: {lat}. Doit être entre -90 et 90." });
                }

                if (double.IsNaN(lng) || double.IsInfinity(lng) || lng < -180 || lng > 180)
                {
                    _logger.LogWarning($"Longitude invalide: {lng}");
                    return BadRequest(new { error = true, reason = $"Longitude invalide: {lng}. Doit être entre -180 et 180." });
                }

                // Arrondir à 6 décimales
                lat = Math.Round(lat, 6);
                lng = Math.Round(lng, 6);

                _logger.LogInformation($"Météo demandée pour lat={lat}, lng={lng}");

                // Construire l'URL Open-Meteo
                var url = $"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&timezone={Uri.EscapeDataString(timezone)}";

                if (!string.IsNullOrEmpty(variables))
                {
                    url += $"&hourly={variables}";
                }
                else
                {
                    url += $"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max";
                }

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(15);

                var response = await client.GetAsync(url);
                var content = await response.Content.ReadAsStringAsync();

                return Content(content, "application/json");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de l'appel météo");
                return StatusCode(500, new { error = true, reason = ex.Message });
            }
        }

        [HttpGet("get")]
        public async Task<IActionResult> GetElevation(double lat, double lng)
        {
            try
            {
                _logger.LogInformation($"Demande d'altitude pour lat: {lat}, lng: {lng}");

                var cachedElevation = _cache.Get(lat, lng);
                if (cachedElevation.HasValue)
                {
                    return Ok(new { elevation = cachedElevation.Value, source = "cache" });
                }

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
                        _cache.Set(lat, lng, elevation);
                        return Ok(new { elevation = elevation, source = "api" });
                    }
                }

                var fallbackElevation = CalculateApproximateElevation(lat, lng);
                _cache.Set(lat, lng, fallbackElevation);
                return Ok(new { elevation = fallbackElevation, source = "approximative" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur elevation");
                return Ok(new { elevation = 100.0, source = "error" });
            }
        }

        [HttpPost("batch")]
        public async Task<IActionResult> GetMultipleElevations([FromBody] BatchElevationRequest request)
        {
            try
            {
                if (request?.Coordinates == null || !request.Coordinates.Any())
                {
                    return BadRequest(new { error = true, reason = "Aucune coordonnée fournie" });
                }

                var results = new List<BatchElevationResult>();

                foreach (var coord in request.Coordinates)
                {
                    var cached = _cache.Get(coord.Lat, coord.Lng);
                    if (cached.HasValue)
                    {
                        results.Add(new BatchElevationResult { Elevation = cached.Value });
                    }
                    else
                    {
                        var elevation = await GetElevationFromApi(coord.Lat, coord.Lng);
                        results.Add(new BatchElevationResult { Elevation = elevation });
                        _cache.Set(coord.Lat, coord.Lng, elevation);
                        await Task.Delay(200);
                    }
                }

                return Ok(new { results });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur batch");
                return StatusCode(500, new { error = true, reason = ex.Message });
            }
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
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur API elevation");
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
                double baseAltitude = lat > 36.5 ? 300 : (lat > 35 ? 150 : 50);
                if (lng > 10) baseAltitude += 50;
                else if (lng < 9) baseAltitude += 100;
                var elevation = baseAltitude + (latFactor * 100) + (lngFactor * 50);
                return Math.Round(Math.Max(0, Math.Min(1544, elevation)), 1);
            }
            catch
            {
                return 100;
            }
        }
    }

    public class BatchElevationRequest
    {
        public List<CoordinatePoint> Coordinates { get; set; } = new();
    }

    public class CoordinatePoint
    {
        public double Lat { get; set; }
        public double Lng { get; set; }
    }

    public class BatchElevationResult
    {
        public double Elevation { get; set; }
    }

    public class OpenTopoDataResponse
    {
        public OpenTopoDataResult[] results { get; set; } = Array.Empty<OpenTopoDataResult>();
        public string status { get; set; } = "";
    }

    public class OpenTopoDataResult
    {
        public double? elevation { get; set; }
        public double? latitude { get; set; }
        public double? longitude { get; set; }
    }
}