// Controllers/LeafScanController.cs
// Utilise Google Gemini via API key gratuite
// Clé : https://aistudio.google.com/app/apikey

using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace AgricultureApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LeafScanController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<LeafScanController> _logger;
        private readonly IConfiguration _configuration;

        public LeafScanController(
            IHttpClientFactory httpClientFactory,
            ILogger<LeafScanController> logger,
            IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _configuration = configuration;
        }

        [HttpPost("analyze")]
        public async Task<IActionResult> AnalyzeLeaf([FromBody] LeafAnalysisRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request?.ImageBase64))
                    return BadRequest(new { error = "Image requise" });

                var apiKey = _configuration["Gemini:ApiKey"];
                if (string.IsNullOrEmpty(apiKey))
                    return StatusCode(500, new { error = "Clé API Gemini manquante." });

                // Nettoyage Base64
                var imageData = request.ImageBase64.Contains(",")
                    ? request.ImageBase64.Split(',')[1]
                    : request.ImageBase64;

                var mimeType = request.MediaType ?? "image/jpeg";

                // Liste des modèles à essayer (ordre de priorité)
                var modelNames = new[]
                {
                    "gemini-2.0-flash",
                    "gemini-flash-latest",
                    "gemini-2.5-flash-lite",
                    "gemini-2.0-flash-001",
                    "gemini-2.5-pro"
                };

                string? lastError = null;
                object? finalResult = null;

                foreach (var modelName in modelNames)
                {
                    _logger.LogInformation($"Tentative avec le modèle {modelName}...");

                    var prompt = BuildPrompt(request);
                    var url = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={apiKey}";

                    var payload = new
                    {
                        contents = new[]
                        {
                            new
                            {
                                parts = new object[]
                                {
                                    new { inline_data = new { mime_type = mimeType, data = imageData } },
                                    new { text = prompt }
                                }
                            }
                        },
                        generationConfig = new
                        {
                            temperature = 0.1,
                            maxOutputTokens = 1500,
                            response_mime_type = "application/json"
                        }
                    };

                    var client = _httpClientFactory.CreateClient();
                    client.Timeout = TimeSpan.FromSeconds(60);

                    var httpContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                    var response = await client.PostAsync(url, httpContent);
                    var responseBody = await response.Content.ReadAsStringAsync();

                    if (response.IsSuccessStatusCode)
                    {
                        var geminiResp = JsonSerializer.Deserialize<GeminiResponse>(responseBody);
                        var resultText = geminiResp?.candidates?.FirstOrDefault()
                                                   ?.content?.parts?.FirstOrDefault()
                                                   ?.text ?? "{}";

                        resultText = CleanJsonResponse(resultText);

                        try
                        {
                            // Normaliser le JSON pour qu'il corresponde exactement à l'interface Angular
                            finalResult = NormalizeGeminiResponse(resultText);
                            _logger.LogInformation($"Analyse réussie avec le modèle {modelName}");
                            break;
                        }
                        catch (JsonException)
                        {
                            lastError = $"JSON invalide pour {modelName}";
                            continue;
                        }
                    }
                    else if (response.StatusCode == System.Net.HttpStatusCode.ServiceUnavailable ||
                             response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                    {
                        lastError = $"Modèle {modelName} temporairement indisponible ({(int)response.StatusCode})";
                        _logger.LogWarning(lastError);
                        continue;
                    }
                    else
                    {
                        lastError = $"Modèle {modelName} : {response.StatusCode} - {responseBody}";
                        _logger.LogWarning(lastError);
                        continue;
                    }
                }

                if (finalResult != null)
                    return Ok(finalResult);

                return StatusCode(503, new { error = "Tous les modèles Gemini sont indisponibles pour le moment. Réessayez dans quelques minutes.", details = lastError });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur analyse feuille");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private string BuildPrompt(LeafAnalysisRequest request)
        {
            return $@"Tu es un expert agronome spécialisé en phytopathologie.
Analyse cette photo de feuille. Culture : {request.Culture ?? "inconnue"}. Région : {request.Region ?? "Tunisie"}.

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown ni texte autour :
{{
  ""estSaine"": false,
  ""maladie"": ""Nom de la maladie"",
  ""nomScientifique"": ""Nom scientifique"",
  ""gravite"": ""Modéré"",
  ""confiance"": 85,
  ""description"": ""Description des symptômes observés"",
  ""causesFrequentes"": [""cause 1"", ""cause 2""],
  ""traitements"": {{
    ""bio"": [""traitement bio 1"", ""traitement bio 2""],
    ""conventionnel"": [""traitement chimique 1"", ""traitement chimique 2""],
    ""urgence"": ""Action immédiate""
  }},
  ""prevention"": [""conseil 1"", ""conseil 2"", ""conseil 3""],
  ""conditionsMeteo"": ""Conditions favorisant cette maladie"",
  ""culturesConcernees"": [""culture 1"", ""culture 2""]
}}
gravite accepte uniquement : ""Faible"", ""Modéré"", ""Élevé"", ""Critique"".
Si saine : estSaine=true, gravite=""Faible"".";
        }

        private string CleanJsonResponse(string text)
        {
            text = text.Trim();
            if (text.StartsWith("```json"))
                text = text.Substring(7);
            else if (text.StartsWith("```"))
                text = text.Substring(3);
            if (text.EndsWith("```"))
                text = text.Substring(0, text.Length - 3);
            return text.Trim();
        }

        /// <summary>
        /// Normalise la réponse JSON de Gemini pour correspondre exactement au format attendu par le frontend.
        /// Gère les noms de champs snake_case vs camelCase et fournit des valeurs par défaut.
        /// </summary>
        private object NormalizeGeminiResponse(string jsonText)
        {
            using var doc = JsonDocument.Parse(jsonText);
            var root = doc.RootElement;

            // Extraction avec gestion des noms alternatifs (nom_scientifique vs nomScientifique)
            bool estSaine = root.TryGetProperty("estSaine", out var estSaineProp) && estSaineProp.GetBoolean();
            string maladie = root.TryGetProperty("maladie", out var maladieProp) ? maladieProp.GetString() ?? "Maladie non identifiée" : "Maladie non identifiée";

            string nomScientifique = "";
            if (root.TryGetProperty("nomScientifique", out var nsProp))
                nomScientifique = nsProp.GetString() ?? "";
            else if (root.TryGetProperty("nom_scientifique", out var ns2Prop))
                nomScientifique = ns2Prop.GetString() ?? "";

            string gravite = "Modéré";
            if (root.TryGetProperty("gravite", out var gravProp))
                gravite = gravProp.GetString() ?? "Modéré";

            int confiance = 85;
            if (root.TryGetProperty("confiance", out var confProp))
                confiance = confProp.GetInt32();

            string description = root.TryGetProperty("description", out var descProp) ? descProp.GetString() ?? "" : "";

            var causesFrequentes = new List<string>();
            if (root.TryGetProperty("causesFrequentes", out var causesProp) && causesProp.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in causesProp.EnumerateArray())
                    causesFrequentes.Add(item.GetString() ?? "");
            }

            // Traitements
            var bio = new List<string>();
            var conventionnel = new List<string>();
            string urgence = "";
            if (root.TryGetProperty("traitements", out var traitProp) && traitProp.ValueKind == JsonValueKind.Object)
            {
                if (traitProp.TryGetProperty("bio", out var bioProp) && bioProp.ValueKind == JsonValueKind.Array)
                    foreach (var item in bioProp.EnumerateArray())
                        bio.Add(item.GetString() ?? "");
                if (traitProp.TryGetProperty("conventionnel", out var convProp) && convProp.ValueKind == JsonValueKind.Array)
                    foreach (var item in convProp.EnumerateArray())
                        conventionnel.Add(item.GetString() ?? "");
                if (traitProp.TryGetProperty("urgence", out var urgProp))
                    urgence = urgProp.GetString() ?? "";
            }

            var prevention = new List<string>();
            if (root.TryGetProperty("prevention", out var prevProp) && prevProp.ValueKind == JsonValueKind.Array)
                foreach (var item in prevProp.EnumerateArray())
                    prevention.Add(item.GetString() ?? "");

            string conditionsMeteo = root.TryGetProperty("conditionsMeteo", out var meteoProp) ? meteoProp.GetString() ?? "" : "";

            var culturesConcernees = new List<string>();
            if (root.TryGetProperty("culturesConcernees", out var cultProp) && cultProp.ValueKind == JsonValueKind.Array)
                foreach (var item in cultProp.EnumerateArray())
                    culturesConcernees.Add(item.GetString() ?? "");

            // Construction de l'objet anonyme avec les noms exacts attendus par Angular (camelCase)
            return new
            {
                estSaine,
                maladie,
                nomScientifique,
                gravite,
                confiance,
                description,
                causesFrequentes,
                traitements = new
                {
                    bio,
                    conventionnel,
                    urgence
                },
                prevention,
                conditionsMeteo,
                culturesConcernees
            };
        }
    }

    // DTOs
    public class LeafAnalysisRequest
    {
        public string ImageBase64 { get; set; } = "";
        public string? MediaType { get; set; }
        public string? Culture { get; set; }
        public string? Region { get; set; }
    }

    public class GeminiResponse
    {
        public GeminiCandidate[]? candidates { get; set; }
    }
    public class GeminiCandidate
    {
        public GeminiContent? content { get; set; }
    }
    public class GeminiContent
    {
        public GeminiPart[]? parts { get; set; }
    }
    public class GeminiPart
    {
        public string? text { get; set; }
    }
}