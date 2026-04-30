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

        // ?????????????????????????????????????????????????????????????????????
        // POST api/marketplace/diagnostic/analyser-image
        // Body: multipart/form-data  { image: File, idUtilisateur?: int }
        // ?????????????????????????????????????????????????????????????????????
        [HttpPost("analyser-image")]
        [RequestSizeLimit(10_000_000)] // 10 MB max
        public async Task<ActionResult<DiagnosticResultatDto>> AnalyserImage(
            IFormFile image,
            [FromForm] int? idUtilisateur)
        {
            if (image == null || image.Length == 0)
                return BadRequest("Image requise");

            // Vérifier le type MIME
            var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowedTypes.Contains(image.ContentType.ToLower()))
                return BadRequest("Format accepté: JPEG, PNG ou WEBP");

            // Convertir en base64
            using var ms = new MemoryStream();
            await image.CopyToAsync(ms);
            var imageBase64 = Convert.ToBase64String(ms.ToArray());

            // ?? Appel au microservice Python CNN ????????????????????????????
            PythonPredictResponse? pythonResult = null;
            try
            {
                var pythonUrl = _config["PythonCnnService:Url"] ?? "http://localhost:8001";
                var client = _httpFactory.CreateClient("PythonCNN");
                var payload = JsonSerializer.Serialize(new
                {
                    image_base64 = imageBase64,
                    filename = image.FileName
                });
                var content = new StringContent(payload, Encoding.UTF8, "application/json");
                var response = await client.PostAsync($"{pythonUrl}/predict", content);

                if (!response.IsSuccessStatusCode)
                    return StatusCode(502, "Service de détection indisponible");

                var json = await response.Content.ReadAsStringAsync();
                pythonResult = JsonSerializer.Deserialize<PythonPredictResponse>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Impossible de joindre le service Python CNN");
                return StatusCode(503, "Service de détection temporairement indisponible");
            }

            if (pythonResult == null)
                return StatusCode(500, "Réponse invalide du service de détection");

            // ?? Rechercher les produits recommandés en DB ????????????????????
            List<ProduitDto> produitsRecommandes = new();
            if (!pythonResult.Prediction.EstSain && pythonResult.Recommendation != null)
            {
                var categorie = pythonResult.Recommendation.Categorie;
                var motsCles = pythonResult.Recommendation.MotsCles ?? new List<string>();

                var query = _ctx.Produits
                    .Where(p => p.EstActif && p.StockDisponible > 0);

                if (!string.IsNullOrEmpty(categorie))
                    query = query.Where(p => p.Categorie == categorie);

                if (motsCles.Any())
                {
                    var premiers = motsCles.Take(2).ToList();
                    query = query.Where(p =>
                        premiers.Any(m =>
                            p.Nom.ToLower().Contains(m.ToLower()) ||
                            (p.MatieresActives != null && p.MatieresActives.ToLower().Contains(m.ToLower())) ||
                            (p.Description != null && p.Description.ToLower().Contains(m.ToLower()))
                        )
                    );
                }

                produitsRecommandes = await query
                    .OrderByDescending(p => p.NoteMoyenne)
                    .Take(6)
                    .Select(p => new ProduitDto
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
                    })
                    .ToListAsync();

                // Fallback: si aucun produit trouvé avec filtres stricts, prendre la catégorie seule
                if (!produitsRecommandes.Any() && !string.IsNullOrEmpty(categorie))
                {
                    produitsRecommandes = await _ctx.Produits
                        .Where(p => p.EstActif && p.StockDisponible > 0 && p.Categorie == categorie)
                        .OrderByDescending(p => p.NoteMoyenne)
                        .Take(4)
                        .Select(p => new ProduitDto
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
                        })
                        .ToListAsync();
                }
            }

            // ?? Sauvegarder le diagnostic en historique ??????????????????????
            if (idUtilisateur.HasValue && pythonResult.Confiant)
            {
                try
                {
                    var diagnostic = new DiagnosticImage
                    {
                        IdUtilisateur = idUtilisateur,
                        NomFichier = image.FileName,
                        MaladieDetectee = pythonResult.Prediction.Maladie,
                        PlanteDetectee = pythonResult.Prediction.Plante,
                        Confiance = pythonResult.Prediction.Confiance,
                        EstSain = pythonResult.Prediction.EstSain,
                        ProduitsRecommandes = string.Join(",",
                            produitsRecommandes.Select(p => p.IdProduit.ToString()))
                    };
                    _ctx.DiagnosticsImages.Add(diagnostic);
                    await _ctx.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Impossible de sauvegarder le diagnostic");
                    // Ne pas faire échouer la requête pour ça
                }
            }

            // ?? Construire la réponse ????????????????????????????????????????
            var resultat = new DiagnosticResultatDto
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
                ProduitsRecommandes = produitsRecommandes,
                MessageConseils = BuildAdviceMessage(pythonResult)
            };

            return Ok(resultat);
        }

        // ?????????????????????????????????????????????????????????????????????
        // GET api/marketplace/diagnostic/historique?userId=X
        // ?????????????????????????????????????????????????????????????????????
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

        // ?? Helpers ??????????????????????????????????????????????????????????
        private static string BuildAdviceMessage(PythonPredictResponse result)
        {
            if (!result.Confiant)
                return "La qualité ou l'angle de la photo ne permet pas une détection fiable. " +
                       "Veuillez prendre une photo nette de la feuille affectée en pleine lumière.";

            if (result.Prediction.EstSain)
                return $"La plante semble en bonne santé ! Continuez votre programme de prévention.";

            var plante = result.Prediction.Plante;
            var maladie = result.Prediction.Maladie.Replace("_", " ");
            var categorie = result.Recommendation?.Categorie ?? "traitement";

            return $"Maladie détectée : {maladie} sur {plante} " +
                   $"(confiance : {result.Prediction.Confiance:F0}%). " +
                   $"Nous vous recommandons un traitement à base de {categorie.ToLower()}. " +
                   "Consultez les produits ci-dessous et traitez dès que possible pour limiter la propagation.";
        }
    }
}