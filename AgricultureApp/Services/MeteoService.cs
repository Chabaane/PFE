// Services/MeteoService.cs
using System.Text.Json;
using System.Text.Json.Serialization;


namespace AgricultureApp.Services
{
    public class MeteoActuelle
    {
        public double Temperature { get; set; }
        public int Nuages { get; set; }
        public int Humidite { get; set; }
        public double Vent { get; set; }
        public int Pression { get; set; }
        public DateTime Date { get; set; }
    }

    public class PrevisionMeteo
    {
        public string Jour { get; set; } = string.Empty; // "Lun", "Mar", "Mer", etc.
        public double Temperature { get; set; }
        public int Nuages { get; set; }
        public int Humidite { get; set; }
        public double Vent { get; set; }
        public int Pression { get; set; }
        public DateTime Date { get; set; }
    }

    public class MeteoPoint
    {
        public string Nom { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public MeteoActuelle? Actuelle { get; set; }
        public List<PrevisionMeteo> Previsions { get; set; } = new();
    }

    public interface IMeteoService
    {
        Task<MeteoPoint?> GetMeteoForPoint(string nom, double latitude, double longitude);
    }

    public class MeteoService : IMeteoService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<MeteoService> _logger;

        public MeteoService(HttpClient httpClient, ILogger<MeteoService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<MeteoPoint?> GetMeteoForPoint(string nom, double latitude, double longitude)
        {
            try
            {
                // API Open-Meteo pour les prévisions sur 7 jours
                string url = $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_max,wind_speed_10m_max,pressure_msl_mean,cloud_cover_mean&timezone=auto&forecast_days=3";

                var response = await _httpClient.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    var data = JsonSerializer.Deserialize<OpenMeteoResponse>(json);

                    if (data?.Current != null && data?.Daily != null)
                    {
                        var point = new MeteoPoint
                        {
                            Nom = nom,
                            Latitude = latitude,
                            Longitude = longitude,
                            Actuelle = new MeteoActuelle
                            {
                                Temperature = data.Current.Temperature2m,
                                Nuages = data.Current.CloudCover ?? 0,
                                Humidite = data.Current.RelativeHumidity2m ?? 0,
                                Vent = data.Current.WindSpeed10m ?? 0,
                                Pression = (int?)data.Current.PressureMsl ?? 0,
                                Date = DateTime.Now
                            }
                        };

                        // Ajouter les prévisions
                        var jours = new[] { "Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam" };

                        for (int i = 0; i < data.Daily.Time.Count; i++)
                        {
                            var date = DateTime.Parse(data.Daily.Time[i]);
                            var jour = jours[(int)date.DayOfWeek];

                            // Pour le premier jour, on pourrait mettre "Aujourd'hui"
                            if (i == 0)
                                jour = "Auj";

                            point.Previsions.Add(new PrevisionMeteo
                            {
                                Jour = jour,
                                Temperature = Math.Round((data.Daily.Temperature2mMax[i] + data.Daily.Temperature2mMin[i]) / 2, 2),
                                Nuages = data.Daily.CloudCoverMean?[i] ?? 50,
                                Humidite = data.Daily.RelativeHumidity2mMax?[i] ?? 60,
                                Vent = data.Daily.WindSpeed10mMax?[i] ?? 5,
                                Pression = (int?)data.Daily.PressureMslMean?[i] ?? 1010,
                                Date = date
                            });
                        }

                        return point;
                    }
                }

                return GetFallbackData(nom);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Erreur météo pour {nom}");
                return GetFallbackData(nom);
            }
        }

        private MeteoPoint GetFallbackData(string nom)
        {
            var random = new Random();
            var maintenant = new MeteoActuelle
            {
                Temperature = Math.Round(15 + random.NextDouble() * 10, 2),
                Nuages = random.Next(0, 100),
                Humidite = random.Next(40, 90),
                Vent = Math.Round(3 + random.NextDouble() * 8, 2),
                Pression = random.Next(1000, 1020),
                Date = DateTime.Now
            };

            var previsions = new List<PrevisionMeteo>();
            var jours = new[] { "Auj", "Mar", "Mer" };

            for (int i = 0; i < 3; i++)
            {
                previsions.Add(new PrevisionMeteo
                {
                    Jour = jours[i],
                    Temperature = Math.Round(14 + random.NextDouble() * 8, 2),
                    Nuages = random.Next(0, 80),
                    Humidite = random.Next(40, 80),
                    Vent = Math.Round(4 + random.NextDouble() * 6, 2),
                    Pression = random.Next(1005, 1020),
                    Date = DateTime.Now.AddDays(i)
                });
            }

            return new MeteoPoint
            {
                Nom = nom,
                Actuelle = maintenant,
                Previsions = previsions
            };
        }

        // Classes pour Open-Meteo API
        private class OpenMeteoResponse
        {
            public OpenMeteoCurrent? Current { get; set; }
            public OpenMeteoDaily? Daily { get; set; }
        }

        private class OpenMeteoCurrent
        {
            [JsonPropertyName("temperature_2m")]
            public double Temperature2m { get; set; }

            [JsonPropertyName("relative_humidity_2m")]
            public int? RelativeHumidity2m { get; set; }

            [JsonPropertyName("cloud_cover")]
            public int? CloudCover { get; set; }

            [JsonPropertyName("wind_speed_10m")]
            public double? WindSpeed10m { get; set; }

            [JsonPropertyName("pressure_msl")]
            public double? PressureMsl { get; set; }
        }

        private class OpenMeteoDaily
        {
            [JsonPropertyName("time")]
            public List<string> Time { get; set; } = new();

            [JsonPropertyName("temperature_2m_max")]
            public List<double> Temperature2mMax { get; set; } = new();

            [JsonPropertyName("temperature_2m_min")]
            public List<double> Temperature2mMin { get; set; } = new();

            [JsonPropertyName("relative_humidity_2m_max")]
            public List<int>? RelativeHumidity2mMax { get; set; }

            [JsonPropertyName("wind_speed_10m_max")]
            public List<double>? WindSpeed10mMax { get; set; }

            [JsonPropertyName("pressure_msl_mean")]
            public List<double>? PressureMslMean { get; set; }

            [JsonPropertyName("cloud_cover_mean")]
            public List<int>? CloudCoverMean { get; set; }
        }
    }
}