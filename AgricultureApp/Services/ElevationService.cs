// Services/ElevationService.cs
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace AgricultureApp.Services
{
    public class ElevationService : IElevationService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<ElevationService> _logger;

        public ElevationService(HttpClient httpClient, ILogger<ElevationService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<double> GetElevation(double latitude, double longitude)
        {
            try
            {
                var result = await GetElevations(new List<(double lat, double lng)> { (latitude, longitude) });
                return result.Count > 0 ? result[0] : 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération de l'altitude");
                return 0;
            }
        }

        public async Task<List<double>> GetElevations(List<(double lat, double lng)> points)
        {
            try
            {
                var locations = new List<object>();
                foreach (var point in points)
                {
                    locations.Add(new { latitude = point.lat, longitude = point.lng });
                }

                var requestBody = new { locations = locations };
                var json = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                // Utiliser Open-Elevation API
                var response = await _httpClient.PostAsync("https://api.open-elevation.com/api/v1/lookup", content);

                if (response.IsSuccessStatusCode)
                {
                    var responseJson = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<ElevationResponse>(responseJson);

                    if (result?.Results != null)
                    {
                        return result.Results.ConvertAll(r => r.Elevation);
                    }
                }

                // Fallback vers OpenTopoData API
                return await GetElevationsFromOpenTopoData(points);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur lors de la récupération des altitudes");
                return new List<double>(new double[points.Count]);
            }
        }

        private async Task<List<double>> GetElevationsFromOpenTopoData(List<(double lat, double lng)> points)
        {
            try
            {
                var elevations = new List<double>();

                foreach (var point in points)
                {
                    // Utiliser l'API OpenTopoData (gratuite, sans CORS)
                    var url = $"https://api.opentopodata.org/v1/test-dataset?locations={point.lat},{point.lng}";
                    var response = await _httpClient.GetAsync(url);

                    if (response.IsSuccessStatusCode)
                    {
                        var json = await response.Content.ReadAsStringAsync();
                        var result = JsonSerializer.Deserialize<OpenTopoResponse>(json);

                        if (result?.Results != null && result.Results.Count > 0)
                        {
                            elevations.Add(result.Results[0].Elevation);
                        }
                        else
                        {
                            elevations.Add(0);
                        }
                    }
                    else
                    {
                        elevations.Add(0);
                    }

                    // Petit délai pour ne pas surcharger l'API
                    await Task.Delay(100);
                }

                return elevations;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur OpenTopoData");
                return new List<double>(new double[points.Count]);
            }
        }

        private class ElevationResponse
        {
            public List<ElevationResult> Results { get; set; } = new();
        }

        private class ElevationResult
        {
            public double Elevation { get; set; }
            public double Latitude { get; set; }
            public double Longitude { get; set; }
        }

        private class OpenTopoResponse
        {
            public List<OpenTopoResult> Results { get; set; } = new();
        }

        private class OpenTopoResult
        {
            public double Elevation { get; set; }
            public double Latitude { get; set; }
            public double Longitude { get; set; }
        }
    }
}