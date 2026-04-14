// Controllers/PlantDiagnosticController.cs
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

                _logger.LogInformation("Analyse de feuille demandée");

                var apiKey = _configuration["Anthropic:ApiKey"];
                if (string.IsNullOrEmpty(apiKey))
                    return StatusCode(500, new { error = "Clé API Anthropic non configurée" });

                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(60);

                // Construire le prompt spécialisé agronomique
                var systemPrompt = @"Tu es un expert agronome spécialisé en phytopathologie (maladies des plantes).
Quand on te soumet une photo de feuille, tu dois :
1. Identifier précisément la maladie ou le problème visible (ou confirmer si la plante est saine)
2. Donner le niveau de gravité (Faible / Modéré / Élevé / Critique)
3. Proposer des traitements concrets (bio et conventionnel)
4. Donner des conseils de prévention

Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.
Format exact :
{
  ""estSaine"": false,
  ""maladie"": ""Nom de la maladie"",
  ""nomScientifique"": ""Nom scientifique"",
  ""gravite"": ""Modéré"",
  ""confiance"": 85,
  ""description"": ""Description détaillée des symptômes observés"",
  ""causesFrequentes"": [""cause 1"", ""cause 2""],
  ""traitements"": {
    ""bio"": [""traitement bio 1"", ""traitement bio 2""],
    ""conventionnel"": [""traitement chimique 1"", ""traitement chimique 2""],
    ""urgence"": ""Action immédiate à faire""
  },
  ""prevention"": [""conseil 1"", ""conseil 2"", ""conseil 3""],
  ""conditionsMeteo"": ""Conditions météo favorisant cette maladie"",
  ""culturesConcernees"": [""culture 1"", ""culture 2""]
}";

                var userContent = new object[]
                {
                    new
                    {
                        type = "image",
                        source = new
                        {
                            type = "base64",
                            media_type = request.MediaType ?? "image/jpeg",
                            data = request.ImageBase64
                        }
                    },
                    new
                    {
                        type = "text",
                        text = $"Analyse cette feuille de plante. Culture concernée : {request.Culture ?? "inconnue"}. Région : {request.Region ?? "Tunisie"}. Réponds uniquement en JSON."
                    }
                };

                var payload = new
                {
                    model = "claude-opus-4-5",
                    max_tokens = 1500,
                    system = systemPrompt,
                    messages = new[]
                    {
                        new { role = "user", content = userContent }
                    }
                };

                var json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("x-api-key", apiKey);
                client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

                var response = await client.PostAsync("https://api.anthropic.com/v1/messages", content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Erreur API Anthropic: {response.StatusCode} - {responseBody}");
                    return StatusCode(500, new { error = "Erreur analyse IA" });
                }

                var apiResponse = JsonSerializer.Deserialize<AnthropicResponse>(responseBody);
                var resultText = apiResponse?.content?.FirstOrDefault()?.text ?? "{}";

                // Nettoyer le JSON si nécessaire
                resultText = resultText.Trim();
                if (resultText.StartsWith("```"))
                {
                    resultText = resultText.Replace("```json", "").Replace("```", "").Trim();
                }

                var result = JsonSerializer.Deserialize<object>(resultText);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur analyse feuille");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class LeafAnalysisRequest
    {
        public string ImageBase64 { get; set; } = "";
        public string? MediaType { get; set; }
        public string? Culture { get; set; }
        public string? Region { get; set; }
    }

    public class AnthropicResponse
    {
        public AnthropicContent[]? content { get; set; }
    }

    public class AnthropicContent
    {
        public string? text { get; set; }
        public string? type { get; set; }
    }
}