using Microsoft.ML;
using Microsoft.ML.Transforms;
using System.Drawing;
using System.Drawing.Imaging;
using AgricultureApp.Models;

namespace AgricultureApp.Services
{
    public class TensorFlowModelService : IDisposable
    {
        private readonly MLContext _mlContext;
        private readonly PredictionEngine<ImageInput, ImagePrediction> _predictionEngine;
        private readonly string _inputTensorName;
        private readonly string _outputTensorName;

        // Liste des classes ImageNet (ou de votre jeu de données)
        // Pour un vrai diagnostic, remplacez par vos propres classes (maladies)
        private static readonly string[] _classNames = new string[]
        {
            "saine", "mildiou", "rouille", "oïdium", "alternariose", "tache_bacterienne"
            // ... à adapter selon votre modèle
        };

        public TensorFlowModelService(string modelPath)
        {
            _mlContext = new MLContext();

            // Charger le modèle TensorFlow depuis le dossier contenant saved_model.pb
            var tensorFlowModel = _mlContext.Model.LoadTensorFlowModel(modelPath);

           

            // À ajuster selon les noms réels trouvés dans votre modèle
            _inputTensorName = "input_1";   // Exemple, à remplacer par le vrai nom
            _outputTensorName = "MobilenetV2/Predictions/Softmax"; // Exemple, à remplacer

            // Pipeline de transformation : redimensionnement + extraction des pixels
            var pipeline = _mlContext.Transforms.LoadImages(
                    outputColumnName: "image", imageFolder: "", inputColumnName: nameof(ImageInput.ImagePath))
                .Append(_mlContext.Transforms.ResizeImages(
                    outputColumnName: "image", imageWidth: 224, imageHeight: 224, inputColumnName: "image"))
                .Append(_mlContext.Transforms.ExtractPixels(
                    outputColumnName: _inputTensorName, inputColumnName: "image"))
                .Append(tensorFlowModel.ScoreTensorFlowModel(
                    outputColumnNames: new[] { _outputTensorName },
                    inputColumnNames: new[] { _inputTensorName },
                    addBatchDimensionInput: true));

            // Fit sur des données vides pour créer le modèle
            var emptyData = _mlContext.Data.LoadFromEnumerable(new List<ImageInput>());
            var model = pipeline.Fit(emptyData);

            _predictionEngine = _mlContext.Model.CreatePredictionEngine<ImageInput, ImagePrediction>(model);
        }

        public async Task<DiagnosticResult> PredictAsync(string imageBase64)
        {
            // Sauvegarder l'image en fichier temporaire (nécessaire pour LoadImages)
            var tempFile = Path.GetTempFileName() + ".jpg";
            var imageBytes = Convert.FromBase64String(imageBase64);
            await File.WriteAllBytesAsync(tempFile, imageBytes);

            var input = new ImageInput { ImagePath = tempFile };
            var prediction = _predictionEngine.Predict(input);

            // Nettoyer
            File.Delete(tempFile);

            // Trouver l'indice de la meilleure classe
            var scores = prediction.Score;
            var maxIdx = scores.Select((val, idx) => new { val, idx }).OrderByDescending(x => x.val).First().idx;
            var confidence = scores[maxIdx] * 100;
            var predictedClass = (maxIdx < _classNames.Length) ? _classNames[maxIdx] : "inconnue";

            // Transformer en DiagnosticResult
            return MapToDiagnostic(predictedClass, confidence);
        }

        private DiagnosticResult MapToDiagnostic(string className, double confidence)
        {
            // Ici vous devez mapper la classe sortie du modèle vers votre structure DiagnosticResult
            // Exemple simpliste :
            var isHealthy = className == "saine";
            return new DiagnosticResult
            {
                estSaine = isHealthy,
                maladie = isHealthy ? "Plante saine" : $"Maladie : {className}",
                nomScientifique = "",
                gravite = isHealthy ? "Faible" : "Modéré",
                confiance = confidence,
                description = isHealthy ? "Aucun symptôme détecté." : "Des symptômes de maladie ont été détectés.",
                causesFrequentes = isHealthy ? Array.Empty<string>() : new[] { "Conditions météo favorables" },
                traitements = new Traitements
                {
                    bio = new[] { "Purin d'ortie" },
                    conventionnel = new[] { "Fongicide adapté" },
                    urgence = isHealthy ? "" : "Isoler les plants touchés"
                },
                prevention = new[] { "Rotation des cultures", "Arrosage au pied" },
                conditionsMeteo = "Humidité élevée",
                culturesConcernees = new[] { "Générale" }
            };
        }

        public void Dispose() => _predictionEngine?.Dispose();
    }

    public class ImageInput
    {
        public string ImagePath { get; set; }
    }

    public class ImagePrediction
    {
        public float[] Score { get; set; }
    }
}