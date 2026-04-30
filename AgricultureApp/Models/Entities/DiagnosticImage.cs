// ============================================================
// Models/Entities/DiagnosticImage.cs
// ============================================================
namespace AgricultureApp.Models.Entities
{
    using System.ComponentModel.DataAnnotations;

    public class DiagnosticImage
    {
        [Key]
        public int IdDiagnostic { get; set; }

        public int? IdUtilisateur { get; set; }

        [MaxLength(255)]
        public string NomFichier { get; set; } = string.Empty;

        [MaxLength(200)]
        public string PlanteDetectee { get; set; } = string.Empty;

        [MaxLength(200)]
        public string MaladieDetectee { get; set; } = string.Empty;

        public double Confiance { get; set; }

        public bool EstSain { get; set; }

        /// <summary>IDs des produits recommandés, séparés par des virgules</summary>
        public string? ProduitsRecommandes { get; set; }

        public DateTime DateDiagnostic { get; set; } = DateTime.UtcNow;
    }
}


// ============================================================
// Models/DTOs/DiagnosticDtos.cs
// ============================================================
namespace AgricultureApp.Models.DTOs
{
    // ?? DTOs de sortie ????????????????????????????????????????
    public class DiagnosticResultatDto
    {
        public PredictionDto Prediction { get; set; } = new();
        public List<PredictionDto> Top3 { get; set; } = new();
        public bool Confiant { get; set; }
        public string MessageConseils { get; set; } = string.Empty;
        public List<ProduitDto> ProduitsRecommandes { get; set; } = new();
    }

    public class PredictionDto
    {
        public string Plante { get; set; } = string.Empty;
        public string Maladie { get; set; } = string.Empty;
        public double Confiance { get; set; }
        public bool EstSain { get; set; }
    }

    public class DiagnosticHistoriqueDto
    {
        public int IdDiagnostic { get; set; }
        public string PlanteDetectee { get; set; } = string.Empty;
        public string MaladieDetectee { get; set; } = string.Empty;
        public double Confiance { get; set; }
        public bool EstSain { get; set; }
        public DateTime DateDiagnostic { get; set; }
    }

    // ?? DTO de réponse Python (désérialisé depuis FastAPI) ????
    public class PythonPredictResponse
    {
        public PythonPrediction Prediction { get; set; } = new();
        public List<PythonPrediction> Top3 { get; set; } = new();
        public PythonRecommendation? Recommendation { get; set; }
        public bool Confiant { get; set; }
    }

    public class PythonPrediction
    {
        public string Classe { get; set; } = string.Empty;
        public string Plante { get; set; } = string.Empty;
        public string Maladie { get; set; } = string.Empty;
        public double Confiance { get; set; }
        public bool EstSain { get; set; }
    }

    public class PythonRecommendation
    {
        public string Categorie { get; set; } = string.Empty;
        public List<string>? MotsCles { get; set; }
    }
}


// ============================================================
// Data/ApplicationDbContext.cs  — AJOUTER ces 2 lignes au DbContext existant
// ============================================================
//
//   public DbSet<DiagnosticImage> DiagnosticsImages { get; set; }
//
// ============================================================


// ============================================================
// Program.cs ou Startup.cs — AJOUTER après builder.Services.AddControllers()
// ============================================================
//
//   builder.Services.AddHttpClient("PythonCNN", client =>
//   {
//       client.Timeout = TimeSpan.FromSeconds(30);
//   });
//
// appsettings.json:
//   "PythonCnnService": {
//     "Url": "http://localhost:8001"
//   }
//
// Migration EF Core:
//   dotnet ef migrations add AddDiagnosticImage
//   dotnet ef database update
// ============================================================