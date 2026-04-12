using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using AgricultureApp.Services;
using System.Threading.Tasks;

namespace AgricultureApp.Controllers.AI
{
    [ApiController]
    [Route("api/ai-chat")]
    public class ChatController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ChatMemoryService _memory;
        private readonly ILogger<ChatController> _logger;
       // Remplacez par votre token

        public ChatController(
            IHttpClientFactory httpClientFactory,
            ChatMemoryService memory,
            ILogger<ChatController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _memory = memory;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Chat([FromBody] AiChatRequest request)
        {
            try
            {
                string sessionId = request.SessionId ?? "default";

                // 1?? Rule Engine
                var rule = AgriRuleEngine.Evaluate(request);
                if (rule != null)
                    return Ok(new { reply = rule, source = "rule" });

                // 2?? Mémoire
                _memory.Add(sessionId, "User: " + request.Message);
                var context = _memory.GetContext(sessionId);

                // 3?? RAG
                var knowledge = AgriKnowledgeBase.GetKnowledge(request.Message);

                // 4?? Essayer Ollama d'abord
                string reply = await TryOllama(request, context, knowledge);

                // 5?? Fallback vers Hugging Face
                if (string.IsNullOrEmpty(reply))
                {
                    reply = await TryHuggingFace(request, context, knowledge);
                }

                // 6?? Fallback final vers réponses locales
                if (string.IsNullOrEmpty(reply))
                {
                    reply = GetLocalResponse(request);
                }

                _memory.Add(sessionId, "Bot: " + reply);

                return Ok(new { reply, source = "ai" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Chat error");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        private async Task<string> TryOllama(AiChatRequest request, string context, string knowledge)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                var prompt = BuildPrompt(request, context, knowledge);

                var body = new
                {
                    model = "mistral",
                    prompt = prompt,
                    stream = false,
                    options = new
                    {
                        num_predict = 256,
                        temperature = 0.7
                    }
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(body),
                    Encoding.UTF8,
                    "application/json"
                );

                var response = await client.PostAsync("http://localhost:11434/api/generate", content);

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadAsStringAsync();
                    var json = JsonDocument.Parse(result);
                    return json.RootElement.GetProperty("response").GetString();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Ollama not available: {Message}", ex.Message);
            }
            return null;
        }

        private async Task<string> TryHuggingFace(AiChatRequest request, string context, string knowledge)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(30);

                // Ajouter le token d'authentification
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {HUGGINGFACE_TOKEN}");

                var prompt = BuildPrompt(request, context, knowledge);

                // Utiliser un modèle gratuit et performant
                var body = new
                {
                    inputs = prompt,
                    parameters = new
                    {
                        max_new_tokens = 300,
                        temperature = 0.7,
                        top_p = 0.95,
                        do_sample = true,
                        return_full_text = false
                    },
                    options = new
                    {
                        use_cache = true,
                        wait_for_model = true
                    }
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(body),
                    Encoding.UTF8,
                    "application/json"
                );

                // Modèle gratuit et efficace pour le français
                string[] models = new[]
                {
                    "HuggingFaceH4/zephyr-7b-beta",  // Bon pour le français
                    "mistralai/Mistral-7B-Instruct-v0.2",
                    "google/flan-t5-large"
                };

                string lastError = "";
                foreach (var model in models)
                {
                    try
                    {
                        var url = $"https://api-inference.huggingface.co/models/{model}";
                        _logger.LogInformation("Trying Hugging Face model: {Model}", model);

                        var response = await client.PostAsync(url, content);

                        if (response.IsSuccessStatusCode)
                        {
                            var result = await response.Content.ReadAsStringAsync();
                            _logger.LogInformation("Hugging Face response: {Response}", result);

                            var jsonArray = JsonDocument.Parse(result);

                            // Différents formats de réponse selon le modèle
                            string generatedText = "";

                            if (jsonArray.RootElement.ValueKind == JsonValueKind.Array && jsonArray.RootElement.GetArrayLength() > 0)
                            {
                                var firstElement = jsonArray.RootElement[0];
                                if (firstElement.TryGetProperty("generated_text", out var generatedTextProp))
                                {
                                    generatedText = generatedTextProp.GetString();
                                }
                                else if (firstElement.TryGetProperty("summary_text", out var summaryTextProp))
                                {
                                    generatedText = summaryTextProp.GetString();
                                }
                            }
                            else if (jsonArray.RootElement.TryGetProperty("generated_text", out var directGeneratedText))
                            {
                                generatedText = directGeneratedText.GetString();
                            }

                            if (!string.IsNullOrEmpty(generatedText))
                            {
                                // Nettoyer la réponse
                                generatedText = CleanResponse(generatedText, request.Message);
                                if (!string.IsNullOrEmpty(generatedText) && generatedText.Length > 10)
                                {
                                    return generatedText;
                                }
                            }
                        }
                        else
                        {
                            var error = await response.Content.ReadAsStringAsync();
                            lastError = error;
                            _logger.LogWarning("Model {Model} failed: {Error}", model, error);
                        }
                    }
                    catch (Exception ex)
                    {
                        lastError = ex.Message;
                        _logger.LogWarning("Error with model {Model}: {Error}", model, ex.Message);
                    }

                    // Attendre un peu entre les tentatives
                    await Task.Delay(1000);
                }

                _logger.LogWarning("All Hugging Face models failed. Last error: {Error}", lastError);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Hugging Face API error");
            }
            return null;
        }

        private string BuildPrompt(AiChatRequest request, string context, string knowledge)
        {
            return $@"Tu es un expert agronome spécialisé en agriculture tunisienne. Réponse courte, concrète et professionnelle (max 3 phrases).

INFORMATIONS PARCELLE:
- Nom: {request.ParcelleNom}
- NDVI: {request.NDVI:F2} (0-1, plus élevé = meilleure santé végétale)
- Température: {request.Temperature}°C
- Humidité: {request.Humidity}%
- Altitude: {request.Altitude}m

CONNAISSANCES SPÉCIFIQUES:
{knowledge}

HISTORIQUE CONVERSATION:
{context}

QUESTION: {request.Message}

RÉPONSE (en français, utile et directe):";

        }

        private string CleanResponse(string response, string originalQuestion)
        {
            if (string.IsNullOrEmpty(response)) return "";

            // Enlever les instructions système
            response = System.Text.RegularExpressions.Regex.Replace(response, @"RÉPONSE\s*\([^)]*\):\s*", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            response = System.Text.RegularExpressions.Regex.Replace(response, @"(Tu es un expert|CONTEXTE|INFORMATIONS|CONNAISSANCES).*?:\s*", "", System.Text.RegularExpressions.RegexOptions.Singleline);

            // Nettoyer les caractères spéciaux
            response = response.Trim();
            response = System.Text.RegularExpressions.Regex.Replace(response, @"\s+", " ");

            // Limiter la longueur
            if (response.Length > 500)
            {
                response = response.Substring(0, 500);
                var lastPeriod = response.LastIndexOf('.');
                if (lastPeriod > 100)
                    response = response.Substring(0, lastPeriod + 1);
            }

            return response;
        }

        private string GetLocalResponse(AiChatRequest request)
        {
            var msg = request.Message.ToLower();

            // Réponses basées sur NDVI
            if (msg.Contains("ndvi") || msg.Contains("santé") || msg.Contains("etat"))
            {
                if (request.NDVI < 0.3)
                    return $"?? NDVI: {request.NDVI:F2} - Situation CRITIQUE. Irrigation et fertilisation urgentes !";
                if (request.NDVI < 0.5)
                    return $"?? NDVI: {request.NDVI:F2} - Stress modéré. Surveillez irrigation et nutriments.";
                return $"? NDVI: {request.NDVI:F2} - Bonne santé végétale.";
            }

            // Réponses basées sur température
            if (msg.Contains("température") || msg.Contains("chaleur") || msg.Contains("temp"))
            {
                if (request.Temperature > 35)
                    return $"??? {request.Temperature}°C - Température critique ! Arrosez tôt le matin (5h-7h).";
                if (request.Temperature > 30)
                    return $"??? {request.Temperature}°C - Surveillez l'irrigation. Arrosez si nécessaire.";
                return $"? Température idéale: {request.Temperature}°C pour la croissance.";
            }

            // Réponses basées sur humidité
            if (msg.Contains("humidité") || msg.Contains("eau") || msg.Contains("irrigation") || msg.Contains("arroser"))
            {
                if (request.Humidity < 30)
                    return $"?? Humidité: {request.Humidity}% - Très sec. Irrigation nécessaire immédiatement.";
                if (request.Humidity < 50)
                    return $"?? Humidité: {request.Humidity}% - Irrigation recommandée cette semaine.";
                return $"? Humidité: {request.Humidity}% - Bon niveau d'humidité.";
            }

            // Réponses spécifiques aux cultures
            if (msg.Contains("blé") || msg.Contains("ble"))
            {
                return "?? Blé: Sol bien drainé, irrigation modérée. Fertilisation azotée recommandée au tallage.";
            }

            if (msg.Contains("olivier") || msg.Contains("olive"))
            {
                return "?? Olivier: Résiste à sécheresse. Taille en hiver, irrigation contrôlée en été.";
            }

            if (msg.Contains("tomate"))
            {
                return "?? Tomate: Arrosage régulier mais sans excès. Attention au mildiou par temps humide.";
            }

            // Réponse par défaut
            return $"?? Analyse parcelle '{request.ParcelleNom}':\n" +
                   $"• NDVI: {request.NDVI:F2} - {(request.NDVI >= 0.5 ? "Bon" : request.NDVI >= 0.3 ? "Moyen" : "Faible")}\n" +
                   $"• Température: {request.Temperature}°C {(request.Temperature > 35 ? "?? Élevée" : "? Normal")}\n" +
                   $"• Humidité: {request.Humidity}% {(request.Humidity < 30 ? "?? Faible" : "? Correct")}\n\n" +
                   $"?? Conseil: {(request.NDVI < 0.5 ? "Améliorez l'irrigation" : "Maintenez les pratiques actuelles")}";
        }
    }

    public class AiChatRequest
    {
        public string Message { get; set; }
        public string ParcelleNom { get; set; }
        public double NDVI { get; set; }
        public double Temperature { get; set; }
        public double Humidity { get; set; }
        public double Altitude { get; set; }
        public string SessionId { get; set; }
    }
}