// Controllers/ChatbotController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using AgricultureApp.Models.Entities;
using AgricultureApp.Data;

namespace AgricultureApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatbotController : ControllerBase
    {
        private readonly ILogger<ChatbotController> _logger;
        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;

        // ?? Open-Meteo (gratuit, sans clé, CORS OK) ??????????????????????????
        private const string OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

        public ChatbotController(
            ILogger<ChatbotController> logger,
            ApplicationDbContext context,
            IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _context = context;
            _httpClientFactory = httpClientFactory;
        }

        // ??????????????????????????????????????????????????????????????????????
        // POST /api/Chatbot/chat
        // ??????????????????????????????????????????????????????????????????????

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequest request)
        {
            try
            {
                _logger.LogInformation("AgriBot — message reçu: {Msg}", request.Message);

                var intention = AnalyserIntention(request.Message);
                var donnees = await ExecuterAction(intention, request.AgriculteurId);
                var reponse = await FormerReponse(request.Message, donnees, intention, request.Historique);

                return Ok(new ChatResponse
                {
                    Reponse = reponse,
                    Action = intention.Type,
                    Donnees = donnees
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur AgriBot");
                return Ok(new ChatResponse
                {
                    Reponse = "? Une erreur s'est produite. Veuillez réessayer.",
                    Action = "error"
                });
            }
        }

        // ??????????????????????????????????????????????????????????????????????
        // ANALYSE D'INTENTION — enrichie avec patterns regex + mots-clés
        // ??????????????????????????????????????????????????????????????????????

        private static IntentionResultat AnalyserIntention(string message)
        {
            var m = message.ToLowerInvariant().Trim();

            // ?? Salutations ?????????????????????????????????????????????????
            if (m.ContainsAny("bonjour", "bonsoir", "salut", "hello", "hi", "salam"))
                return new("salutation");

            // ?? Aide / commandes ?????????????????????????????????????????????
            if (m.ContainsAny("aide", "help", "commande", "que peux-tu", "que sais-tu", "capacités", "fonctions"))
                return new("aide");

            // ?? Statistiques parcelles ???????????????????????????????????????
            if ((m.ContainsAny("parcelle", "parcelles")) &&
                (m.ContainsAny("combien", "nombre", "count", "total", "liste", "toutes")))
                return new("compter_parcelles");

            if ((m.ContainsAny("surface", "superficie", "hectare")) &&
                (m.ContainsAny("totale", "total", "somme", "cumul")))
                return new("surface_totale");

            if (m.ContainsAny("culture", "cultures") &&
                m.ContainsAny("liste", "quelles", "quels", "mes"))
                return new("liste_cultures");

            if (m.ContainsAny("gouvernorat", "région", "délégation") &&
                m.ContainsAny("liste", "quels", "où"))
                return new("liste_gouvernorats");

            // ?? Météo ?????????????????????????????????????????????????????????
            if (m.ContainsAny("météo", "meteo", "temps", "climat", "température", "temperature", "pluie", "vent", "humidité"))
                return new("meteo") { ParcelleNom = ExtraireNomParcelle(m) };

            if (m.ContainsAny("alerte", "gel", "canicule", "danger", "risque", "attention") &&
                m.ContainsAny("météo", "meteo", "temps", "climat"))
                return new("alerte_meteo");

            if (m.ContainsAny("alerte", "alertes") && !m.ContainsAny("météo", "meteo"))
                return new("alerte_meteo");

            // ?? Prévisions météo ??????????????????????????????????????????????
            if (m.ContainsAny("prévision", "prevision", "semaine", "demain", "prochain"))
                return new("previsions_meteo") { ParcelleNom = ExtraireNomParcelle(m) };

            // ?? Gestion des parcelles (CRUD) ?????????????????????????????????
            if (m.ContainsAny("créer", "creer", "ajouter", "nouvelle", "nouveau", "enregistrer") &&
                m.ContainsAny("parcelle"))
                return new("creer_parcelle");

            if (m.ContainsAny("modifier", "editer", "éditer", "changer", "mettre à jour", "mise à jour") &&
                m.ContainsAny("parcelle"))
                return new("modifier_parcelle") { ParcelleNom = ExtraireNomParcelle(m) };

            if (m.ContainsAny("supprimer", "effacer", "enlever", "retirer", "supression", "delete") &&
                m.ContainsAny("parcelle"))
                return new("supprimer_parcelle") { ParcelleNom = ExtraireNomParcelle(m) };

            if (m.ContainsAny("détail", "detail", "info", "afficher", "montre", "voir", "consulter") &&
                m.ContainsAny("parcelle"))
                return new("detail_parcelle") { ParcelleNom = ExtraireNomParcelle(m) };

            // ?? Analyse altimétrique ??????????????????????????????????????????
            if (m.Contains("altitude") && m.ContainsAny("max", "maximum", "plus haute", "plus haut", "élevée"))
                return new("altitude_max");

            if (m.Contains("altitude") && m.ContainsAny("min", "minimum", "plus basse", "plus bas"))
                return new("altitude_min");

            if (m.ContainsAny("altitude", "altitudes") && !m.ContainsAny("max", "min", "maximum", "minimum"))
                return new("stats_altitude");

            if (m.ContainsAny("pente", "inclinaison", "déclivité"))
                return new("pente_moyenne");

            // ?? Agroclimatique ????????????????????????????????????????????????
            if (m.ContainsAny("unité de froid", "unités de froid", "chilling", "froid accumulé", "uf ", "uf."))
                return new("unites_froid") { Parametre = ExtraireCulture(m) };

            if (m.ContainsAny("unité de chaleur", "unités de chaleur", "growing degree", "gdd", "chaleur accumulée", "uc ", "uc."))
                return new("unites_chaleur") { Parametre = ExtraireCulture(m) };

            if (m.ContainsAny("agroclimat", "diagnostic thermique", "stade phénologique", "phénologie", "floraison", "maturation"))
                return new("diagnostic_agroclimat") { Parametre = ExtraireCulture(m) };

            // ?? Conseils agricoles ????????????????????????????????????????????
            if (m.ContainsAny("conseil", "astuce", "recommande", "recommandation", "comment", "traitement", "fertilisation", "irrigation"))
                return new("conseil_agricole") { Parametre = ExtraireCulture(m) };

            // ?? Rendement / statistiques avancées ????????????????????????????
            if (m.ContainsAny("rendement", "production", "récolte", "récoltes"))
                return new("stats_avancees");

            // ?? Par défaut ????????????????????????????????????????????????????
            return new("conversation_generale");
        }

        // ??????????????????????????????????????????????????????????????????????
        // EXÉCUTION DES ACTIONS
        // ??????????????????????????????????????????????????????????????????????

        private async Task<object?> ExecuterAction(IntentionResultat intention, int agriculteurId)
        {
            switch (intention.Type)
            {
                // ?? Stat basiques ?????????????????????????????????????????????
                case "compter_parcelles":
                    {
                        var count = await _context.Parcelles.CountAsync(p => p.AgriculteurId == agriculteurId);
                        var sync = await _context.Parcelles.CountAsync(p => p.AgriculteurId == agriculteurId && p.EstSynchronise);
                        return new { nombre = count, synchronisees = sync, nonSynchronisees = count - sync };
                    }

                case "surface_totale":
                    {
                        var total = await _context.Parcelles.Where(p => p.AgriculteurId == agriculteurId).SumAsync(p => p.Surface);
                        var nombre = await _context.Parcelles.CountAsync(p => p.AgriculteurId == agriculteurId);
                        var moy = nombre > 0 ? total / nombre : 0;
                        return new { surface = Math.Round(total, 2), moyenne = Math.Round(moy, 2), nombre };
                    }

                case "liste_cultures":
                    {
                        var cultures = await _context.Parcelles
                            .Where(p => p.AgriculteurId == agriculteurId && p.Culture != null)
                            .GroupBy(p => p.Culture!)
                            .Select(g => new { culture = g.Key, count = g.Count(), surface = g.Sum(p => p.Surface) })
                            .ToListAsync();
                        return new { cultures = cultures.Select(c => c.culture).ToList(), details = cultures };
                    }

                case "liste_gouvernorats":
                    {
                        var gouv = await _context.Parcelles
                            .Where(p => p.AgriculteurId == agriculteurId && p.Gouvernorat != null)
                            .GroupBy(p => p.Gouvernorat!)
                            .Select(g => new { gouvernorat = g.Key, count = g.Count() })
                            .ToListAsync();
                        return new { gouvernorats = gouv.Select(g => g.gouvernorat).ToList(), details = gouv };
                    }

                case "stats_avancees":
                    {
                        var parcelles = await _context.Parcelles
                            .Where(p => p.AgriculteurId == agriculteurId)
                            .ToListAsync();
                        return new
                        {
                            total = parcelles.Count,
                            surfaceTotale = Math.Round(parcelles.Sum(p => p.Surface), 2),
                            plusGrande = parcelles.OrderByDescending(p => p.Surface).FirstOrDefault()?.Nom,
                            plusPetite = parcelles.OrderBy(p => p.Surface).FirstOrDefault()?.Nom,
                            cultures = parcelles.Where(p => p.Culture != null).Select(p => p.Culture!).Distinct().ToList()
                        };
                    }

                // ?? Météo (Open-Meteo API réelle) ?????????????????????????????
                case "meteo":
                    {
                        var parcelle = await GetParcelleByNom(agriculteurId, intention.ParcelleNom);
                        return await GetMeteoReelle(parcelle);
                    }

                case "previsions_meteo":
                    {
                        var parcelle = await GetParcelleByNom(agriculteurId, intention.ParcelleNom);
                        return await GetPrevisionsMeteo(parcelle);
                    }

                case "alerte_meteo":
                    return await VerifierAlertesMeteo(agriculteurId);

                // ?? Détail et CRUD parcelle ???????????????????????????????????
                case "detail_parcelle":
                    {
                        var p = await GetParcelleByNom(agriculteurId, intention.ParcelleNom);
                        if (p == null) return new { error = true, message = $"Parcelle « {intention.ParcelleNom} » introuvable." };
                        return FormatParcelleDetail(p);
                    }

                case "creer_parcelle":
                    return new { action = "open_form", type = "create" };

                case "modifier_parcelle":
                    {
                        var p = await GetParcelleByNom(agriculteurId, intention.ParcelleNom);
                        return p != null
                            ? new { action = "open_form", type = "edit", parcelle = FormatParcelleDetail(p) }
                            : new { action = "open_form", type = "create" };
                    }

                // ?? Altitude & pente ??????????????????????????????????????????
                case "altitude_max":
                    {
                        var p = await _context.Parcelles
                            .Where(x => x.AgriculteurId == agriculteurId && x.AltitudeMax.HasValue)
                            .OrderByDescending(x => x.AltitudeMax)
                            .FirstOrDefaultAsync();
                        return p == null ? null : new { altitude = p.AltitudeMax, parcelle = p.Nom, message = $"Altitude maximale : {p.AltitudeMax} m ({p.Nom})" };
                    }

                case "altitude_min":
                    {
                        var p = await _context.Parcelles
                            .Where(x => x.AgriculteurId == agriculteurId && x.AltitudeMin.HasValue)
                            .OrderBy(x => x.AltitudeMin)
                            .FirstOrDefaultAsync();
                        return p == null ? null : new { altitude = p.AltitudeMin, parcelle = p.Nom, message = $"Altitude minimale : {p.AltitudeMin} m ({p.Nom})" };
                    }

                case "stats_altitude":
                    {
                        var parcelles = await _context.Parcelles
                            .Where(x => x.AgriculteurId == agriculteurId && x.AltitudeMoyenne.HasValue)
                            .ToListAsync();
                        if (!parcelles.Any()) return new { message = "Aucune donnée d'altitude disponible." };
                        return new
                        {
                            min = parcelles.Min(p => p.AltitudeMin),
                            max = parcelles.Max(p => p.AltitudeMax),
                            moyenne = Math.Round(parcelles.Average(p => p.AltitudeMoyenne!.Value), 1),
                            message = $"Altitude : min {parcelles.Min(p => p.AltitudeMin)} m — max {parcelles.Max(p => p.AltitudeMax)} m"
                        };
                    }

                case "pente_moyenne":
                    {
                        var pentes = await _context.Parcelles
                            .Where(x => x.AgriculteurId == agriculteurId && x.PenteMoyenne.HasValue)
                            .Select(x => new { x.Nom, pente = x.PenteMoyenne!.Value })
                            .ToListAsync();
                        if (!pentes.Any()) return new { message = "Aucune donnée de pente disponible." };
                        var moy = Math.Round(pentes.Average(p => p.pente), 1);
                        var max = pentes.MaxBy(p => p.pente);
                        return new { penteMoyenne = moy, max = max?.pente, maxParcelle = max?.Nom, message = $"Pente moyenne : {moy}% | Plus forte pente : {max?.pente}% ({max?.Nom})" };
                    }

                // ?? Agroclimat ?????????????????????????????????????????????????
                case "unites_froid":
                    return GetInfoUnitesFroid(intention.Parametre);

                case "unites_chaleur":
                    return GetInfoUnitesChaleur(intention.Parametre);

                case "diagnostic_agroclimat":
                    return GetDiagnosticAgroclimat(intention.Parametre);

                // ?? Conseils ??????????????????????????????????????????????????
                case "conseil_agricole":
                    return new { conseil = ObtenirConseil(intention.Parametre) };

                default:
                    return null;
            }
        }

        // ??????????????????????????????????????????????????????????????????????
        // MÉTÉO RÉELLE — Open-Meteo
        // ??????????????????????????????????????????????????????????????????????

        private async Task<object> GetMeteoReelle(Parcelle? parcelle)
        {
            var lat = parcelle?.Latitude ?? 36.8065m;
            var lng = parcelle?.Longitude ?? 10.1815m;
            var nom = parcelle?.Nom ?? "Tunisie";

            try
            {
                var client = _httpClientFactory.CreateClient();
                var url = $"{OPEN_METEO_URL}?latitude={lat}&longitude={lng}" +
                             "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code" +
                             "&timezone=Africa/Tunis";

                var resp = await client.GetStringAsync(url);
                using var doc = JsonDocument.Parse(resp);
                var current = doc.RootElement.GetProperty("current");
                var temp = current.GetProperty("temperature_2m").GetDouble();
                var humidity = current.GetProperty("relative_humidity_2m").GetInt32();
                var wind = current.GetProperty("wind_speed_10m").GetDouble();
                var precip = current.GetProperty("precipitation").GetDouble();
                var wcode = current.GetProperty("weather_code").GetInt32();
                var condition = WeatherCodeToFr(wcode);
                var conseil = temp > 35 ? "?? Arrosez abondamment, températures élevées !" :
                                 temp < 5 ? "?? Attention au gel, protégez vos cultures !" :
                                 precip > 5 ? "??? Pluie significative, reportez les traitements." :
                                              "? Conditions favorables pour les travaux agricoles.";
                return new { parcelle = nom, temperature = Math.Round(temp, 1), humidite = humidity, vent = Math.Round(wind, 1), precipitation = Math.Round(precip, 1), condition, conseil };
            }
            catch
            {
                // Fallback simulé si l'API est indisponible
                return GenererMeteoSimulee(parcelle);
            }
        }

        private async Task<object> GetPrevisionsMeteo(Parcelle? parcelle)
        {
            var lat = parcelle?.Latitude ?? 36.8065m;
            var lng = parcelle?.Longitude ?? 10.1815m;
            var nom = parcelle?.Nom ?? "Tunisie";

            try
            {
                var client = _httpClientFactory.CreateClient();
                var url = $"{OPEN_METEO_URL}?latitude={lat}&longitude={lng}" +
                             "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code" +
                             "&forecast_days=5&timezone=Africa/Tunis";

                var resp = await client.GetStringAsync(url);
                using var doc = JsonDocument.Parse(resp);
                var daily = doc.RootElement.GetProperty("daily");
                var dates = daily.GetProperty("time").EnumerateArray().Select(d => d.GetString()!).ToList();
                var tmax = daily.GetProperty("temperature_2m_max").EnumerateArray().Select(t => t.GetDouble()).ToList();
                var tmin = daily.GetProperty("temperature_2m_min").EnumerateArray().Select(t => t.GetDouble()).ToList();
                var precips = daily.GetProperty("precipitation_sum").EnumerateArray().Select(p => p.GetDouble()).ToList();
                var wcodes = daily.GetProperty("weather_code").EnumerateArray().Select(w => w.GetInt32()).ToList();

                var jours = dates.Select((d, i) => new
                {
                    date = d,
                    tmax = Math.Round(tmax[i], 1),
                    tmin = Math.Round(tmin[i], 1),
                    precip = Math.Round(precips[i], 1),
                    condition = WeatherCodeToFr(wcodes[i])
                }).ToList();

                return new { parcelle = nom, previsions = jours };
            }
            catch
            {
                return new { message = "Prévisions temporairement indisponibles." };
            }
        }

        private async Task<object> VerifierAlertesMeteo(int agriculteurId)
        {
            var parcelles = await _context.Parcelles
                .Where(p => p.AgriculteurId == agriculteurId)
                .Take(5)
                .ToListAsync();

            var alertes = new List<object>();

            foreach (var parc in parcelles)
            {
                try
                {
                    var meteo = await GetMeteoReelle(parc);
                    var json = JsonSerializer.Serialize(meteo);
                    using var doc = JsonDocument.Parse(json);
                    var temp = doc.RootElement.GetProperty("temperature").GetDouble();
                    var vent = doc.RootElement.GetProperty("vent").GetDouble();
                    var prec = doc.RootElement.GetProperty("precipitation").GetDouble();

                    if (temp > 38) alertes.Add(new { parcelle = parc.Nom, type = "canicule", message = $"??? Canicule sur {parc.Nom} : {temp}°C" });
                    if (temp < 2) alertes.Add(new { parcelle = parc.Nom, type = "gel", message = $"?? Risque de gel sur {parc.Nom} : {temp}°C" });
                    if (vent > 50) alertes.Add(new { parcelle = parc.Nom, type = "vent", message = $"?? Vents forts sur {parc.Nom} : {vent} km/h" });
                    if (prec > 20) alertes.Add(new { parcelle = parc.Nom, type = "inondation", message = $"??? Risque de ruissellement sur {parc.Nom} : {prec} mm" });
                }
                catch { /* skip */ }
            }

            return alertes.Count > 0
                ? new { alertes, message = $"?? {alertes.Count} alerte(s) détectée(s)" }
                : new { alertes = Array.Empty<object>(), message = "? Aucune alerte météo. Bonne journée !" };
        }

        // ??????????????????????????????????????????????????????????????????????
        // AGROCLIMATIQUE
        // ??????????????????????????????????????????????????????????????????????

        private static object GetInfoUnitesFroid(string? culture)
        {
            var cultures = new Dictionary<string, (int min, int max, string desc)>
            {
                ["blé"] = (400, 600, "Semis octobre-novembre, floraison mars-avril"),
                ["orge"] = (300, 500, "Résistant à la sécheresse, semis novembre"),
                ["abricot"] = (500, 900, "Exigeant en froid, débourrement mars"),
                ["olivier"] = (100, 300, "Peu exigeant, taille février-mars"),
                ["vigne"] = (200, 400, "Taille courte janvier-février"),
            };

            var key = culture?.ToLower() ?? "";
            var info = cultures.ContainsKey(key) ? cultures[key] : (min: 200, max: 800, desc: "Varie selon l'espèce");

            return new
            {
                culture = culture ?? "Général",
                ufMin = info.min,
                ufMax = info.max,
                description = info.desc,
                conseil = $"Pour {culture ?? "vos cultures"}, accumulez {info.min}–{info.max} UF (novembre–février). Utilisez le Diagnostic Agroclimatique pour le suivi en temps réel.",
                lienDiagnostic = "/diagnostic-agroclimat"
            };
        }

        private static object GetInfoUnitesChaleur(string? culture)
        {
            var cultures = new Dictionary<string, (double tbase, int floraison, int recolte)>
            {
                ["blé"] = (0, 900, 2200),
                ["orge"] = (0, 750, 1900),
                ["abricot"] = (4, 400, 1200),
                ["olivier"] = (10, 600, 3000),
                ["vigne"] = (10, 600, 1800),
                ["maïs"] = (10, 700, 1400),
                ["tomate"] = (10, 600, 1300),
            };

            var key = culture?.ToLower() ?? "";
            var info = cultures.ContainsKey(key) ? cultures[key] : (tbase: 10.0, floraison: 700, recolte: 1500);

            return new
            {
                culture = culture ?? "Général",
                tbase = info.tbase,
                gddFloraison = info.floraison,
                gddRecolte = info.recolte,
                conseil = $"Tbase = {info.tbase}°C. Floraison à ~{info.floraison} GDD, récolte à ~{info.recolte} GDD. Accédez au Diagnostic Agroclimatique pour le calcul en temps réel.",
                lienDiagnostic = "/diagnostic-agroclimat"
            };
        }

        private static object GetDiagnosticAgroclimat(string? culture)
        {
            return new
            {
                message = $"??? **Diagnostic Agroclimatique disponible !**\n\nCalcul des Unités de Froid (Modèle Utah) et Unités de Chaleur (GDD) en temps réel pour {culture ?? "vos cultures"}.\n\n?? Accédez au module **Diagnostic Agroclimatique** pour :\n• Courbes d'accumulation UF/UC\n• Stades phénologiques estimés\n• Comparaison inter-annuelle\n• Recommandations personnalisées",
                culture = culture,
                redirect = "/diagnostic-agroclimat"
            };
        }

        // ??????????????????????????????????????????????????????????????????????
        // FORMATION DE LA RÉPONSE NATURELLE
        // ??????????????????????????????????????????????????????????????????????

        private static async Task<string> FormerReponse(
            string message,
            object? donnees,
            IntentionResultat intention,
            List<HistoriqueMessage> historique)
        {
            if (donnees == null)
            {
                return intention.Type switch
                {
                    "salutation" => "?? **Bonjour !** Je suis AgriBot, votre assistant agricole intelligent. Comment puis-je vous aider aujourd'hui ? Tapez **aide** pour voir toutes mes capacités. ??",
                    "creer_parcelle" => "? Pour créer une parcelle, cliquez sur **Dessiner une parcelle** sur la carte. Dessinez son contour, puis renseignez ses informations. Je suis là si vous avez besoin d'aide !",
                    "modifier_parcelle" => "?? Pour modifier une parcelle, sélectionnez-la sur la carte ou dans la liste, puis cliquez sur l'icône d'édition.",
                    "supprimer_parcelle" => "??? Pour supprimer une parcelle, sélectionnez-la dans la liste et cliquez sur l'icône de corbeille. **Attention, cette action est irréversible !**",
                    "aide" => GetMessageAide(),
                    _ => "Je suis **AgriBot**, votre assistant agricole. ??\n\nJe peux vous aider avec :\n• ?? Statistiques de vos parcelles\n• ??? Météo et alertes\n• ?? Conseils agricoles\n• ?? Altitude et pente\n• ??? Diagnostic agroclimatique\n\nTapez **aide** pour la liste complète."
                };
            }

            var json = JsonSerializer.Serialize(donnees, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
            using var doc = JsonDocument.Parse(json);

            try
            {
                return intention.Type switch
                {
                    "compter_parcelles" => $"?? Vous avez **{doc.RootElement.GetProperty("nombre").GetInt32()} parcelle(s)** enregistrée(s).\n{doc.RootElement.GetProperty("synchronisees").GetInt32()} synchronisées, {doc.RootElement.GetProperty("nonSynchronisees").GetInt32()} en attente.",

                    "surface_totale" => $"?? Surface totale cultivée : **{doc.RootElement.GetProperty("surface").GetDouble():F2} ha**\nMoyenne par parcelle : {doc.RootElement.GetProperty("moyenne").GetDouble():F2} ha sur {doc.RootElement.GetProperty("nombre").GetInt32()} parcelle(s).",

                    "liste_cultures" => FormatListeCultures(doc),
                    "liste_gouvernorats" => FormatListeGouvernorats(doc),

                    "meteo" => FormatMeteo(doc),
                    "previsions_meteo" => FormatPrevisions(doc),
                    "alerte_meteo" => FormatAlertes(doc),
                    "detail_parcelle" => FormatDetailParcelle(doc),

                    "altitude_max" => $"?? **Altitude maximale** : {doc.RootElement.GetProperty("altitude").GetDouble():F0} m — Parcelle **{doc.RootElement.GetProperty("parcelle").GetString()}**",
                    "altitude_min" => $"?? **Altitude minimale** : {doc.RootElement.GetProperty("altitude").GetDouble():F0} m — Parcelle **{doc.RootElement.GetProperty("parcelle").GetString()}**",
                    "stats_altitude" => doc.RootElement.GetProperty("message").GetString() ?? "",
                    "pente_moyenne" => doc.RootElement.GetProperty("message").GetString() ?? "",

                    "conseil_agricole" => doc.RootElement.GetProperty("conseil").GetString() ?? "",

                    "unites_froid" => $"?? **Unités de Froid — {doc.RootElement.GetProperty("culture").GetString()}**\n\n• Besoins : **{doc.RootElement.GetProperty("ufMin").GetInt32()}–{doc.RootElement.GetProperty("ufMax").GetInt32()} UF** (modèle Utah)\n• {doc.RootElement.GetProperty("description").GetString()}\n\n?? {doc.RootElement.GetProperty("conseil").GetString()}",

                    "unites_chaleur" => $"?? **Unités de Chaleur — {doc.RootElement.GetProperty("culture").GetString()}**\n\n• Tbase : **{doc.RootElement.GetProperty("tbase").GetDouble()}°C**\n• Floraison à **{doc.RootElement.GetProperty("gddFloraison").GetInt32()} GDD**\n• Récolte à **{doc.RootElement.GetProperty("gddRecolte").GetInt32()} GDD**\n\n?? {doc.RootElement.GetProperty("conseil").GetString()}",

                    "diagnostic_agroclimat" => doc.RootElement.GetProperty("message").GetString() ?? "",

                    "stats_avancees" => FormatStatsAvancees(doc),

                    _ => "? Commande exécutée avec succès."
                };
            }
            catch (Exception ex)
            {
                return $"? Action effectuée. ({ex.Message})";
            }
        }

        // ??????????????????????????????????????????????????????????????????????
        // FORMATAGE DES RÉPONSES
        // ??????????????????????????????????????????????????????????????????????

        private static string FormatListeCultures(JsonDocument doc)
        {
            var cultures = doc.RootElement.GetProperty("cultures").EnumerateArray().Select(c => c.GetString()).ToList();
            if (!cultures.Any()) return "?? Vous n'avez pas encore renseigné de cultures dans vos parcelles.";
            return $"?? **Vos cultures ({cultures.Count}) :**\n\n• " + string.Join("\n• ", cultures.Select(c => $"**{c}**"));
        }

        private static string FormatListeGouvernorats(JsonDocument doc)
        {
            var gouv = doc.RootElement.GetProperty("gouvernorats").EnumerateArray().Select(g => g.GetString()).ToList();
            if (!gouv.Any()) return "?? Aucun gouvernorat renseigné dans vos parcelles.";
            return $"?? **Gouvernorats ({gouv.Count}) :**\n\n• " + string.Join("\n• ", gouv.Select(g => $"**{g}**"));
        }

        private static string FormatMeteo(JsonDocument doc)
        {
            var nom = doc.RootElement.GetProperty("parcelle").GetString();
            var temp = doc.RootElement.GetProperty("temperature").GetDouble();
            var hum = doc.RootElement.GetProperty("humidite").GetInt32();
            var vent = doc.RootElement.GetProperty("vent").GetDouble();
            var prec = doc.RootElement.GetProperty("precipitation").GetDouble();
            var cond = doc.RootElement.GetProperty("condition").GetString();
            var cons = doc.RootElement.GetProperty("conseil").GetString();

            return $"??? **Météo actuelle — {nom}**\n\n• ??? Température : **{temp}°C**\n• ??? Conditions : {cond}\n• ?? Humidité : {hum}%\n• ?? Vent : {vent} km/h{(prec > 0 ? $"\n• ??? Précipitations : {prec} mm" : "")}\n\n{cons}";
        }

        private static string FormatPrevisions(JsonDocument doc)
        {
            var nom = doc.RootElement.GetProperty("parcelle").GetString();
            var prev = doc.RootElement.GetProperty("previsions").EnumerateArray().Take(5).ToList();
            var lignes = prev.Select(j =>
            {
                var date = j.GetProperty("date").GetString();
                var tmax = j.GetProperty("tmax").GetDouble();
                var tmin = j.GetProperty("tmin").GetDouble();
                var cond = j.GetProperty("condition").GetString();
                return $"• **{date}** — {tmin}°/{tmax}°C — {cond}";
            });
            return $"?? **Prévisions 5 jours — {nom}**\n\n" + string.Join("\n", lignes);
        }

        private static string FormatAlertes(JsonDocument doc)
        {
            var alertes = doc.RootElement.GetProperty("alertes").EnumerateArray().ToList();
            if (!alertes.Any()) return "? **Aucune alerte météo** pour le moment. Bonnes conditions pour les travaux agricoles !";
            var lignes = alertes.Select(a => a.GetProperty("message").GetString());
            return $"?? **{alertes.Count} alerte(s) météo :**\n\n" + string.Join("\n", lignes);
        }

        private static string FormatDetailParcelle(JsonDocument doc)
        {
            if (doc.RootElement.TryGetProperty("error", out var err) && err.GetBoolean())
                return $"? {doc.RootElement.GetProperty("message").GetString()}";

            var nom = doc.RootElement.GetProperty("Nom").GetString();
            var surf = doc.RootElement.GetProperty("Surface").GetString();
            var cult = doc.RootElement.TryGetProperty("Culture", out var c) && c.ValueKind != JsonValueKind.Null ? c.GetString() : "Non définie";
            var gouv = doc.RootElement.TryGetProperty("Gouvernorat", out var g) && g.ValueKind != JsonValueKind.Null ? g.GetString() : "Non défini";
            var alt = doc.RootElement.TryGetProperty("Altitude", out var a) && a.ValueKind != JsonValueKind.Null ? a.GetString() : "Non mesurée";
            var pente = doc.RootElement.TryGetProperty("Pente", out var p) && p.ValueKind != JsonValueKind.Null ? p.GetString() : "Non mesurée";
            var date = doc.RootElement.TryGetProperty("DateCreation", out var d) ? d.GetString() : "";

            return $"?? **Parcelle : {nom}**\n\n• ?? Surface : **{surf}**\n• ?? Culture : {cult}\n• ?? Gouvernorat : {gouv}\n• ?? Altitude : {alt}\n• ?? Pente : {pente}\n• ?? Créée le : {date}";
        }

        private static string FormatStatsAvancees(JsonDocument doc)
        {
            var total = doc.RootElement.GetProperty("total").GetInt32();
            var surf = doc.RootElement.GetProperty("surfaceTotale").GetDouble();
            var grande = doc.RootElement.TryGetProperty("plusGrande", out var g) ? g.GetString() : "N/A";
            var petite = doc.RootElement.TryGetProperty("plusPetite", out var p) ? p.GetString() : "N/A";

            return $"?? **Statistiques de vos parcelles**\n\n• Total : **{total} parcelle(s)**\n• Surface totale : **{surf:F2} ha**\n• Plus grande : {grande}\n• Plus petite : {petite}";
        }

        private static string GetMessageAide()
        {
            return @"?? **Commandes AgriBot**

**?? Statistiques**
• *Combien de parcelles ?*
• *Surface totale*
• *Mes cultures*
• *Mes gouvernorats*

**?? Parcelles**
• *Détails de la parcelle [nom]*
• *Créer une parcelle*
• *Modifier la parcelle [nom]*

**??? Météo**
• *Météo pour [parcelle]*
• *Prévisions météo*
• *Alertes météo*

**?? Altitude & Pente**
• *Altitude maximale*
• *Altitude minimale*
• *Pente moyenne*

**??? Agroclimat**
• *Unités de froid pour le blé*
• *Unités de chaleur vigne*
• *Diagnostic agroclimatique*

**?? Conseils**
• *Conseils pour [culture]*";
        }

        // ??????????????????????????????????????????????????????????????????????
        // CONSEILS AGRICOLES
        // ??????????????????????????????????????????????????????????????????????

        private static string ObtenirConseil(string? culture)
        {
            var conseils = new Dictionary<string, string>
            {
                ["blé"] = "?? **Blé dur**\n\n• ?? Semis : octobre–novembre (180–220 grains/m²)\n• ?? Azote : 100–120 unités, fractionné en 2 apports\n• ?? Irrigation : 3–4 passages selon pluviométrie\n• ?? Rotation : évitez blé sur blé, préférez légumineuses\n• ?? Rendement attendu : 30–50 qx/ha\n• ?? Surveiller : rouille brune, septoriose",

                ["orge"] = "?? **Orge**\n\n• ?? Semis : novembre–décembre\n• ?? Résistant à la sécheresse (meilleur que le blé)\n• ?? Azote : 80–100 unités\n• ?? Récolte : mai\n• ?? Usage : alimentation animale ou maltage",

                ["maïs"] = "?? **Maïs**\n\n• ?? Semis : avril–mai (sol ? 12°C)\n• ?? Critique pendant floraison : irrigation intensive\n• ?? Densité : 70 000–80 000 plants/ha\n• ?? Azote : 3 apports fractionnés\n• ?? Récolte : septembre–octobre",

                ["olives"] = "?? **Olivier**\n\n• ?? Taille : février–mars\n• ?? Irrigation goutte-à-goutte recommandée\n• ?? Azote au printemps (500 g/arbre)\n• ?? Traitement : bouillie bordelaise contre l'œil de paon\n• ?? Récolte : octobre–novembre",

                ["olivier"] = "?? **Olivier**\n\n• ?? Taille : février–mars\n• ?? Irrigation goutte-à-goutte recommandée\n• ?? Azote au printemps\n• ?? Récolte : octobre–novembre",

                ["vigne"] = "?? **Vigne**\n\n• ?? Taille courte : janvier–février\n• ?? Traitements : bouillie bordelaise (mildiou)\n• ?? Irrigation modérée avant véraison\n• ?? Vendanges : septembre\n• ?? Rendement : 80–120 qx/ha",

                ["tomate"] = "?? **Tomate**\n\n• ?? Plantation : mars–avril\n• ?? Tuteurage indispensable\n• ?? Arrosage régulier au pied\n• ?? Rotation : 3–4 ans minimum\n• ?? Surveiller : mildiou, alternariose",

                ["pomme de terre"] = "?? **Pomme de terre**\n\n• ?? Plantation : février–mars\n• ?? Buttage quand plantes 15–20 cm\n• ?? Récolte : mai–juin\n• ?? Conservation : lieu frais et sombre\n• ?? Rotation : 4 ans minimum",

                ["abricot"] = "?? **Abricotier**\n\n• ?? Besoins en froid : 500–900 UF\n• ?? Taille : après récolte (été)\n• ?? Fertilisation : azote + potasse\n• ?? Sensible au gel tardif\n• ?? Récolte : mai–juillet selon variété",

                ["général"] = "?? **Conseils agricoles généraux**\n\n• ?? Arrosez tôt le matin ou en soirée\n• ?? Inspectez vos cultures 2× par semaine\n• ?? Pratiquez la rotation des cultures\n• ?? Utilisez le paillage pour limiter l'évaporation\n• ?? Tenez un cahier de suivi des pratiques\n• ?? Analysez votre sol avant fertilisation\n• ?? Utilisez le module Diagnostic Agroclimatique"
            };

            var key = culture?.ToLower() ?? "général";
            return conseils.ContainsKey(key) ? conseils[key] : conseils["général"];
        }

        // ??????????????????????????????????????????????????????????????????????
        // UTILITAIRES
        // ??????????????????????????????????????????????????????????????????????

        private async Task<Parcelle?> GetParcelleByNom(int agriculteurId, string? nom)
        {
            if (string.IsNullOrWhiteSpace(nom)) return null;
            return await _context.Parcelles
                .FirstOrDefaultAsync(p => p.AgriculteurId == agriculteurId &&
                                     EF.Functions.Like(p.Nom.ToLower(), $"%{nom.ToLower()}%"));
        }

        private static object FormatParcelleDetail(Parcelle p) => new
        {
            p.Id,
            p.Nom,
            Surface = $"{p.Surface:F2} ha",
            p.Culture,
            p.Gouvernorat,
            p.Delegation,
            p.Secteur,
            Altitude = p.AltitudeMoyenne.HasValue ? $"{p.AltitudeMoyenne:F0} m" : null,
            Pente = p.PenteMoyenne.HasValue ? $"{p.PenteMoyenne:F1}%" : null,
            p.Exposition,
            DateCreation = p.DateCreation.ToString("dd/MM/yyyy"),
            p.Description
        };

        private static object GenererMeteoSimulee(Parcelle? parcelle)
        {
            var rng = new Random();
            var conditions = new[] { "?? Ensoleillé", "? Partiellement nuageux", "??? Nuageux", "??? Pluie légère", "??? Beau temps" };
            var temp = rng.Next(12, 40);
            return new
            {
                parcelle = parcelle?.Nom ?? "Tunisie",
                temperature = temp,
                humidite = rng.Next(35, 85),
                vent = rng.Next(5, 45),
                precipitation = 0,
                condition = conditions[rng.Next(conditions.Length)],
                conseil = temp > 35 ? "?? Arrosez abondamment !" : temp < 10 ? "?? Protégez vos cultures du froid." : "? Conditions favorables."
            };
        }

        private static string WeatherCodeToFr(int code) => code switch
        {
            0 => "?? Ciel dégagé",
            >= 1 and <= 3 => "? Partiellement nuageux",
            >= 45 and <= 48 => "??? Brouillard",
            >= 51 and <= 55 => "??? Bruine",
            >= 61 and <= 65 => "??? Pluie",
            >= 71 and <= 75 => "??? Neige",
            >= 80 and <= 82 => "??? Averses",
            >= 95 and <= 99 => "?? Orage",
            _ => "??? Variable"
        };

        private static string? ExtraireNomParcelle(string message)
        {
            var tokens = new[] { "parcelle", "de", "pour", "la", "le" };
            var mots = message.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            for (int i = 0; i < mots.Length - 1; i++)
                if (tokens.Contains(mots[i].ToLower()))
                    return mots[i + 1].Trim(',', '.', '?', '!', '\'');
            return null;
        }

        private static string? ExtraireCulture(string message)
        {
            var cultures = new[] { "blé","orge","maïs","olives","olivier","vigne","tomate",
                                   "pomme de terre","abricot","fraise","amande","pêcher" };
            foreach (var c in cultures)
                if (message.Contains(c)) return c;
            return null;
        }
    }

    // ??????????????????????????????????????????????????????????????????????????
    // Extension helpers
    // ??????????????????????????????????????????????????????????????????????????

    internal static class StringExtensions
    {
        public static bool ContainsAny(this string source, params string[] values)
            => values.Any(v => source.Contains(v, StringComparison.OrdinalIgnoreCase));
    }

    // ??????????????????????????????????????????????????????????????????????????
    // Modèles
    // ??????????????????????????????????????????????????????????????????????????

    public class ChatRequest
    {
        public string Message { get; set; } = "";
        public int AgriculteurId { get; set; }
        public List<HistoriqueMessage> Historique { get; set; } = new();
    }

    public class HistoriqueMessage
    {
        public string Role { get; set; } = "";
        public string Message { get; set; } = "";
    }

    public class ChatResponse
    {
        public string Reponse { get; set; } = "";
        public string Action { get; set; } = "";
        public object? Donnees { get; set; }
    }

    public class IntentionResultat
    {
        public string Type { get; set; }
        public string? ParcelleNom { get; set; }
        public string? Parametre { get; set; }

        public IntentionResultat(string type) => Type = type;
    }
}