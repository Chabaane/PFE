// Controllers/Marketplace/DiagnosticController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using AgricultureApp.Models.DTOs;
using System.Text;
using System.Text.Json;

namespace AgricultureApp.Controllers.Marketplace
{
    [ApiController]
    [Route("api/marketplace/diagnostic")]
    public class DiagnosticController : ControllerBase
    {
        private readonly ApplicationDbContext _ctx;
        private readonly IHttpClientFactory _httpFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<DiagnosticController> _logger;

        public DiagnosticController(
            ApplicationDbContext ctx,
            IHttpClientFactory httpFactory,
            IConfiguration config,
            ILogger<DiagnosticController> logger)
        {
            _ctx = ctx;
            _httpFactory = httpFactory;
            _config = config;
            _logger = logger;
        }

        // ?? POST api/marketplace/diagnostic/analyser-image ???????????????????
        // multipart/form-data : { image: File, idUtilisateur?: int }
        [HttpPost("analyser-image")]
        [RequestSizeLimit(10_000_000)]
        public async Task<ActionResult<DiagnosticResultatDto>> AnalyserImage(
            IFormFile image,
            [FromForm] int? idUtilisateur)
        {
            // ?? Validation entrée ????????????????????????????????????????????
            if (image == null || image.Length == 0)
                return BadRequest(new { message = "Image requise." });

            var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowedTypes.Contains(image.ContentType.ToLower()))
                return BadRequest(new { message = "Format accepté : JPEG, PNG ou WEBP." });

            // ?? Encodage base64 ??????????????????????????????????????????????
            using var ms = new MemoryStream();
            await image.CopyToAsync(ms);
            var imageBase64 = Convert.ToBase64String(ms.ToArray());

            // ?? Appel microservice Python ?????????????????????????????????????
            PythonPredictResponse? pythonResult;
            try
            {
                var pythonUrl = _config["PythonCnnService:Url"] ?? "http://localhost:8001";
                var client = _httpFactory.CreateClient("PythonCNN");
                var payload = JsonSerializer.Serialize(new
                {
                    image_base64 = imageBase64,
                    filename = image.FileName
                });
                var response = await client.PostAsync(
                    $"{pythonUrl}/predict",
                    new StringContent(payload, Encoding.UTF8, "application/json")
                );

                if (!response.IsSuccessStatusCode)
                {
                    var errBody = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Python CNN HTTP {Code}: {Body}", response.StatusCode, errBody);
                    return StatusCode(502, new { message = "Service de détection indisponible." });
                }

                var json = await response.Content.ReadAsStringAsync();
                pythonResult = JsonSerializer.Deserialize<PythonPredictResponse>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Impossible de joindre le service Python CNN");
                return StatusCode(503, new { message = "Service de détection temporairement indisponible." });
            }

            if (pythonResult == null)
                return StatusCode(500, new { message = "Réponse invalide du service de détection." });

            // ?? Recherche produits en DB ??????????????????????????????????????
            var produitsRecommandes = new List<ProduitDto>();

            if (!pythonResult.Prediction.EstSain && pythonResult.Recommendation != null)
            {
                var categorie = pythonResult.Recommendation.Categorie;
                var motsCles = (pythonResult.Recommendation.MotsCles ?? new List<string>())
                                .Select(m => m.ToLower()).ToList();

                var baseQuery = _ctx.Produits
                    .Where(p => p.EstActif && p.StockDisponible > 0);

                // ?? Tier 1 : catégorie EXACTE + mots-clés ?????????????????????
                // Fonctionne si votre DB a des catégories comme "Fongicide", "Insecticide", etc.
                if (!string.IsNullOrEmpty(categorie) && motsCles.Any())
                {
                    produitsRecommandes = await baseQuery
                        .Where(p => p.Categorie == categorie)
                        .Where(p => motsCles.Any(m =>
                            p.Nom.ToLower().Contains(m) ||
                            (p.MatieresActives != null && p.MatieresActives.ToLower().Contains(m)) ||
                            (p.Description != null && p.Description.ToLower().Contains(m))
                        ))
                        .OrderByDescending(p => p.NoteMoyenne)
                        .Take(6)
                        .Select(p => MapProduitDto(p))
                        .ToListAsync();
                }

                // ?? Tier 2 : catégorie exacte seule (sans filtre mots-clés) ???
                // Utile si les descriptions produits ne contiennent pas les mots-clés
                if (!produitsRecommandes.Any() && !string.IsNullOrEmpty(categorie))
                {
                    produitsRecommandes = await baseQuery
                        .Where(p => p.Categorie == categorie)
                        .OrderByDescending(p => p.NoteMoyenne)
                        .Take(6)
                        .Select(p => MapProduitDto(p))
                        .ToListAsync();

                    _logger.LogInformation(
                        "Tier 2 pour '{Cat}': {N} produits trouvés par catégorie seule",
                        categorie, produitsRecommandes.Count);
                }

                // ?? Tier 3 : mots-clés seuls toutes catégories ?????????????????
                // Utile si les catégories en DB ont des noms différents
                // ex: "Traitement fongique" au lieu de "Fongicide"
                if (!produitsRecommandes.Any() && motsCles.Any())
                {
                    produitsRecommandes = await baseQuery
                        .Where(p => motsCles.Any(m =>
                            p.Nom.ToLower().Contains(m) ||
                            p.Categorie.ToLower().Contains(m) ||
                            (p.MatieresActives != null && p.MatieresActives.ToLower().Contains(m)) ||
                            (p.Description != null && p.Description.ToLower().Contains(m))
                        ))
                        .OrderByDescending(p => p.NoteMoyenne)
                        .Take(6)
                        .Select(p => MapProduitDto(p))
                        .ToListAsync();

                    _logger.LogInformation(
                        "Tier 3 pour '{Cat}': {N} produits trouvés par mots-clés seuls",
                        categorie, produitsRecommandes.Count);
                }

                // ?? Tier 4 : meilleurs produits toutes catégories ??????????????
                // Ne retourne rien de trompeur — log un warning clair
                if (!produitsRecommandes.Any())
                {
                    _logger.LogWarning(
                        "Aucun produit trouvé pour catégorie='{Cat}' motsCles=[{Mots}]. " +
                        "Vérifiez que des produits existent dans cette catégorie en DB.",
                        categorie, string.Join(", ", motsCles));
                }
            }

            // ?? Historique ????????????????????????????????????????????????????
            if (idUtilisateur.HasValue && pythonResult.Confiant)
            {
                try
                {
                    _ctx.DiagnosticsImages.Add(new DiagnosticImage
                    {
                        IdUtilisateur = idUtilisateur,
                        NomFichier = image.FileName,
                        PlanteDetectee = pythonResult.Prediction.Plante,
                        MaladieDetectee = pythonResult.Prediction.Maladie,
                        Confiance = pythonResult.Prediction.Confiance,
                        EstSain = pythonResult.Prediction.EstSain,
                        ProduitsRecommandes = string.Join(",",
                            produitsRecommandes.Select(p => p.IdProduit.ToString()))
                    });
                    await _ctx.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Impossible de sauvegarder le diagnostic");
                }
            }

            // ?? Réponse ???????????????????????????????????????????????????????
            return Ok(new DiagnosticResultatDto
            {
                Prediction = new PredictionDto
                {
                    Plante = pythonResult.Prediction.Plante,
                    Maladie = pythonResult.Prediction.Maladie,
                    Confiance = pythonResult.Prediction.Confiance,
                    EstSain = pythonResult.Prediction.EstSain,
                },
                Top3 = pythonResult.Top3?.Select(t => new PredictionDto
                {
                    Plante = t.Plante,
                    Maladie = t.Maladie,
                    Confiance = t.Confiance,
                    EstSain = t.EstSain,
                }).ToList() ?? new(),
                Confiant = pythonResult.Confiant,
                MessageConseils = BuildAdviceMessage(pythonResult),
                ProduitsRecommandes = produitsRecommandes
            });
        }

        // ?? GET api/marketplace/diagnostic/historique?userId=X ???????????????
        [HttpGet("historique")]
        public async Task<ActionResult<List<DiagnosticHistoriqueDto>>> GetHistorique([FromQuery] int userId)
        {
            var historique = await _ctx.DiagnosticsImages
                .Where(d => d.IdUtilisateur == userId)
                .OrderByDescending(d => d.DateDiagnostic)
                .Take(20)
                .Select(d => new DiagnosticHistoriqueDto
                {
                    IdDiagnostic = d.IdDiagnostic,
                    PlanteDetectee = d.PlanteDetectee,
                    MaladieDetectee = d.MaladieDetectee,
                    Confiance = d.Confiance,
                    EstSain = d.EstSain,
                    DateDiagnostic = d.DateDiagnostic
                })
                .ToListAsync();

            return Ok(historique);
        }

        // ?? Helpers ???????????????????????????????????????????????????????????
        private static ProduitDto MapProduitDto(Produit p) => new()
        {
            IdProduit = p.IdProduit,
            Nom = p.Nom,
            Description = p.Description,
            Categorie = p.Categorie,
            Prix = p.Prix,
            PrixPromo = p.PrixPromo,
            EstEnPromotion = p.EstEnPromotion,
            Unite = p.Unite,
            StockDisponible = p.StockDisponible,
            ImageUrl = p.ImageUrl,
            Fabricant = p.Fabricant,
            MatieresActives = p.MatieresActives,
            NoteMoyenne = p.NoteMoyenne,
            NombreAvis = p.NombreAvis,
            DateAjout = p.DateAjout
        };

        private static string BuildAdviceMessage(PythonPredictResponse result)
        {
            if (!result.Confiant)
                return "La qualité ou l'angle de la photo ne permet pas une détection fiable. " +
                       "Prenez une photo nette de la feuille affectée en pleine lumière, " +
                       "de préférence sur fond uniforme.";

            if (result.Prediction.EstSain)
                return $"? La plante ({result.Prediction.Plante}) semble en bonne santé ! " +
                       "Continuez votre programme de prévention habituel.";

            var plante = result.Prediction.Plante;
            var maladie = result.Prediction.Maladie;
            var categorie = result.Recommendation?.Categorie?.ToLower() ?? "traitement";
            var conf = result.Prediction.Confiance;

            return $"Maladie détectée : {maladie} sur {plante} (confiance {conf:F0}%). " +
                   $"Un traitement à base de {categorie} est recommandé. " +
                   "Intervenez rapidement pour limiter la propagation. " +
                   "Les produits adaptés sont listés ci-dessous.";
        }
    }
}