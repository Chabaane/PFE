using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Python.Runtime;
using AgricultureApp.Models;
using System.Collections.Generic;

namespace AgricultureApp.Services
{
    public class PythonModelService : IDisposable
    {
        private readonly ILogger<PythonModelService> _logger;
        private readonly string _modelPath;
        private readonly string _classIndicesPath;
        private dynamic _kerasModels;
        private dynamic _model;
        private dynamic _np;
        private string[] _classNames;
        private bool _initialized = false;

        public PythonModelService(ILogger<PythonModelService> logger)
        {
            _logger = logger;
            // Récupère le répertoire du projet (là où se trouve le .csproj)

            _modelPath = @"C:\Users\chaba\OneDrive\Desktop\PFE\AgricultureApp\Models\plant_disease_prediction_model.h5";

            _classIndicesPath = @"C:\Users\chaba\OneDrive\Desktop\PFE\AgricultureApp\Data\class_indices.json";
            InitializePython();
        }

        private void InitializePython()
        {
            try
            {
                // ?? ? CORRECTION PRINCIPALE : définir la DLL avant Initialize() ??????????

                // 1. Priorité à la variable d'environnement PYTHON_DLL (recommandé)
                var envDll = Environment.GetEnvironmentVariable("PYTHON_DLL");
                if (!string.IsNullOrEmpty(envDll) && File.Exists(envDll))
                {
                    Runtime.PythonDLL = envDll;
                    _logger.LogInformation($"DLL Python (env var): {envDll}");
                }
                else
                {
                    // 2. Détection automatique depuis `python --version`
                    var dll = TrouverPythonDll();
                    if (dll != null)
                    {
                        Runtime.PythonDLL = dll;
                        _logger.LogInformation($"DLL Python (auto-détectée): {dll}");
                    }
                    else
                    {
                        throw new FileNotFoundException(
                            "Impossible de trouver la DLL Python. " +
                            "Définissez la variable d'environnement PYTHON_DLL avec le chemin complet. " +
                            "Ex: C:\\Python310\\python310.dll");
                    }
                }

                // ?? Initialisation Python.NET ?????????????????????????????????????????
                PythonEngine.Initialize();

                using (Py.GIL())
                {
                    dynamic sys = Py.Import("sys");
                    _logger.LogInformation($"Python version: {sys.version}");

                    Py.Import("tensorflow");
                    Py.Import("numpy");
                    Py.Import("PIL");

                    _kerasModels = Py.Import("tensorflow.keras.models");
                    _np = Py.Import("numpy");

                    LoadModelAndClasses();
                }

                _initialized = true;
                _logger.LogInformation("PythonModelService initialisé avec succès.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erreur d'initialisation Python — voir message ci-dessus");
                throw;
            }
        }

        /// <summary>
        /// Cherche automatiquement python3XX.dll dans les emplacements courants sous Windows.
        /// </summary>
        private string? TrouverPythonDll()
        {
            // Obtenir le chemin de l'exécutable Python via Process
            try
            {
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "python",
                    Arguments = "-c \"import sys, os; print(os.path.dirname(sys.executable))\"",
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using var proc = System.Diagnostics.Process.Start(psi);
                var pythonDir = proc?.StandardOutput.ReadLine()?.Trim();
                proc?.WaitForExit();

                if (!string.IsNullOrEmpty(pythonDir) && Directory.Exists(pythonDir))
                {
                    // Chercher python3XX.dll dans ce dossier
                    var dlls = Directory.GetFiles(pythonDir, "python3*.dll")
                                        .Where(f => !f.Contains("embed"))
                                        .OrderByDescending(f => f)
                                        .ToArray();

                    if (dlls.Length > 0)
                    {
                        _logger.LogInformation($"DLL(s) trouvée(s): {string.Join(", ", dlls)}");
                        return dlls[0];
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Auto-détection échouée: {ex.Message}");
            }

            // Chemins de fallback courants
            var candidates = new[]
            {
                @"C:\Python310\python310.dll",
                @"C:\Python39\python39.dll",
                @"C:\Python311\python311.dll",
                @"C:\Users\" + Environment.UserName + @"\AppData\Local\Programs\Python\Python310\python310.dll",
                @"C:\Users\" + Environment.UserName + @"\AppData\Local\Programs\Python\Python39\python39.dll",
                @"C:\Users\" + Environment.UserName + @"\AppData\Local\Programs\Python\Python311\python311.dll",
            };

            return candidates.FirstOrDefault(File.Exists);
        }

        private void LoadModelAndClasses()
        {
            if (!File.Exists(_modelPath))
                throw new FileNotFoundException($"Modèle introuvable : {_modelPath}");

            if (!File.Exists(_classIndicesPath))
                throw new FileNotFoundException($"class_indices.json introuvable : {_classIndicesPath}");

            _model = _kerasModels.load_model(_modelPath);

            string jsonContent = File.ReadAllText(_classIndicesPath);
            var indices = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(jsonContent)
                          ?? throw new InvalidDataException("class_indices.json invalide");

            _classNames = indices.OrderBy(kvp => int.Parse(kvp.Key))
                                 .Select(kvp => kvp.Value)
                                 .ToArray();

            _logger.LogInformation($"Modèle chargé : {_classNames.Length} classes.");
        }

        public async Task<DiagnosticResult> PredictAsync(string imageBase64)
        {
            if (!_initialized)
                throw new InvalidOperationException("Service Python non initialisé.");

            return await Task.Run(() =>
            {
                using (Py.GIL())
                {
                    try
                    {
                        _logger.LogInformation("1. Début prédiction");


                        if (string.IsNullOrEmpty(imageBase64))
                            throw new ArgumentException("Image Base64 vide ou null");

                        if (!imageBase64.Contains(","))
                            throw new ArgumentException("Format Base64 invalide");
                        // Nettoyer le prefix Base64
                        if (imageBase64.Contains(","))
                        {
                            imageBase64 = imageBase64.Split(',')[1];
                        }
                        // 1. Décoder Base64
                        byte[] imageBytes = Convert.FromBase64String(imageBase64);
                        _logger.LogInformation("2. Image décodée");

                        // 2. Ouvrir avec PIL
                        dynamic pilImage = Py.Import("PIL.Image");
                        dynamic io = Py.Import("io");
                        dynamic imgStream = io.BytesIO(imageBytes);
                        dynamic img = pilImage.open(imgStream).convert("RGB");
                        _logger.LogInformation("3. Image ouverte");

                        // 3. Redimensionner 224×224 et normaliser
                        dynamic imgResized = img.resize(new PyTuple(new PyObject[]
                        {
                            new PyInt(224),
                            new PyInt(224)
                        }));
                        _logger.LogInformation("4. Image redimensionnée");
                        dynamic imgArray = _np.array(imgResized, dtype: _np.float32) / 255.0;
                        _logger.LogInformation("5. Conversion numpy OK");

                        // 4. Ajouter dimension batch ? shape (1, 224, 224, 3)
                        dynamic inputBatch = _np.expand_dims(imgArray, 0);
                        _logger.LogInformation("6. Batch prêt");


                        // 5. Prédiction
                        dynamic predictions = _model.predict(inputBatch);

                        // ? CORRECTION : predictions est shape (1, N) — lire la première ligne
                        dynamic predRow = predictions[0];
                        int nClasses = (int)predRow.__len__();
                        float[] scores = new float[nClasses];
                        for (int i = 0; i < nClasses; i++)
                            scores[i] = (float)(double)predRow[i];

                        // 6. Classe et confiance
                        int maxIdx = Array.IndexOf(scores, scores.Max());
                        double confidence = scores.Max() * 100.0;
                        string predicted = _classNames[maxIdx];

                        // 7. Nettoyage
                        img.close();
                        imgStream.close();

                        _logger.LogInformation($"Prédiction: {predicted} ({confidence:F1}%)");

                        return MapToDiagnostic(predicted, confidence);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Erreur lors de la prédiction");
                        throw;
                    }
                }
            });
        }

        private DiagnosticResult MapToDiagnostic(string className, double confidence)
        {
            // Ex: "Tomato___Late_blight" ? affichage propre
            string displayName = className.Replace("___", " — ").Replace("_", " ");
            bool isHealthy = className.ToLower().Contains("healthy") ||
                                 className.ToLower().Contains("sain");

            string gravite = isHealthy ? "Faible"
                           : confidence > 85 ? "Élevé"
                           : confidence > 60 ? "Modéré"
                           : "Faible";

            return new DiagnosticResult
            {
                estSaine = isHealthy,
                maladie = isHealthy ? "Plante saine" : displayName,
                nomScientifique = isHealthy ? "" : GetNomScientifique(className),
                gravite = gravite,
                confiance = Math.Round(confidence, 1),
                description = isHealthy
                    ? "Aucun symptôme de maladie détecté. La plante semble en bonne santé."
                    : $"Les symptômes correspondent à {displayName} (confiance : {confidence:F0}%). Une action rapide est recommandée.",
                causesFrequentes = isHealthy
                    ? Array.Empty<string>()
                    : GetCauses(className),
                traitements = new Traitements
                {
                    bio = GetTraitementsBio(className),
                    conventionnel = GetTraitementsChim(className),
                    urgence = isHealthy ? "" : "Retirer les feuilles atteintes immédiatement et éviter l'arrosage du feuillage."
                },
                prevention = GetPrevention(className),
                conditionsMeteo = GetConditionsMeteo(className),
                culturesConcernees = new[] { GetCulture(className) }
            };
        }

        // ?? Helpers mapping ???????????????????????????????????????????????????????

        private string GetNomScientifique(string c) => c switch
        {
            var s when s.Contains("Late_blight") => "Phytophthora infestans",
            var s when s.Contains("Early_blight") => "Alternaria solani",
            var s when s.Contains("Powdery_mildew") => "Erysiphe spp.",
            var s when s.Contains("Leaf_scorch") => "Diplocarpon earlianum",
            var s when s.Contains("Black_rot") => "Guignardia bidwellii",
            var s when s.Contains("Apple_scab") => "Venturia inaequalis",
            var s when s.Contains("Cercospora") => "Cercospora zeae-maydis",
            var s when s.Contains("Common_rust") => "Puccinia sorghi",
            var s when s.Contains("Northern_Leaf") => "Exserohilum turcicum",
            _ => "Agent pathogène (à identifier)"
        };

        private string[] GetCauses(string c) => c switch
        {
            var s when s.Contains("blight") => new[] { "Humidité élevée", "Températures fraîches (10-25°C)", "Arrosage du feuillage" },
            var s when s.Contains("rust") => new[] { "Spores transportées par le vent", "Humidité >90%", "Températures modérées" },
            var s when s.Contains("Powdery_mildew") => new[] { "Temps sec et chaud", "Mauvaise aération", "Carence en potassium" },
            var s when s.Contains("scab") => new[] { "Pluies printanières fréquentes", "Températures 6-25°C" },
            _ => new[] { "Humidité excessive", "Mauvaise aération", "Stress hydrique" }
        };

        private string[] GetTraitementsBio(string c) => c switch
        {
            var s when s.Contains("blight") => new[] { "Bouillie bordelaise (cuivre)", "Purin de prêle", "Bicarbonate de soude dilué" },
            var s when s.Contains("rust") => new[] { "Huile de neem", "Soufre mouillable", "Décoction d'ail" },
            var s when s.Contains("Powdery_mildew") => new[] { "Bicarbonate de soude (5g/L)", "Lait dilué 1:9", "Huile de neem" },
            _ => new[] { "Bouillie bordelaise", "Huile de neem", "Soufre mouillable" }
        };

        private string[] GetTraitementsChim(string c) => c switch
        {
            var s when s.Contains("blight") => new[] { "Mancozèbe (2g/L)", "Cymoxanil + Mancozèbe", "Métalaxyl-M" },
            var s when s.Contains("rust") => new[] { "Trifloxystrobine", "Tébuconazole", "Propiconazole" },
            var s when s.Contains("Powdery_mildew") => new[] { "Myclobutanil", "Trifloxystrobine", "Quinoxyfène" },
            _ => new[] { "Fongicide à base de cuivre", "Consulter un agronome pour dosage" }
        };

        private string[] GetPrevention(string c) => new[]
        {
            "Rotation des cultures (3-4 ans)",
            "Éviter l'arrosage du feuillage",
            "Éliminer les débris végétaux après récolte",
            "Assurer une bonne aération entre les plants",
            "Choisir des variétés résistantes"
        };

        private string GetConditionsMeteo(string c) => c switch
        {
            var s when s.Contains("blight") => "Favorisé par humidité >80% et températures 10-25°C",
            var s when s.Contains("rust") => "Favorisé par rosée matinale et températures 15-25°C",
            var s when s.Contains("Powdery_mildew") => "Favorisé par temps sec et chaud, hygrométrie 50-70%",
            _ => "Conditions humides et températures modérées"
        };

        private string GetCulture(string c)
        {
            if (c.StartsWith("Apple")) return "Pommier";
            if (c.StartsWith("Tomato")) return "Tomate";
            if (c.StartsWith("Corn")) return "Maïs";
            if (c.StartsWith("Grape")) return "Vigne";
            if (c.StartsWith("Potato")) return "Pomme de terre";
            if (c.StartsWith("Cherry")) return "Cerisier";
            if (c.StartsWith("Strawberry")) return "Fraisier";
            if (c.StartsWith("Pepper")) return "Poivron";
            return "Générale";
        }

        public void Dispose()
        {
            try
            {
                if (PythonEngine.IsInitialized)
                    PythonEngine.Shutdown();
            }
            catch { /* ignore */ }
        }
    }
}