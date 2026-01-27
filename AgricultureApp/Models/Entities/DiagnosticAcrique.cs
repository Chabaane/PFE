using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("DiagnosticsAcriques")]
    public class DiagnosticAcrique
    {
        [Key]
        public int IdDiagnostic { get; set; }

        [Required]
        public DateTime DateDiagnostic { get; set; }

        [StringLength(100)]
        public string TypeStress { get; set; } // "Hydrique", "Azote", "Maladie"

        [StringLength(50)]
        public string NiveauRisque { get; set; } // "Faible", "Moyen", "Élevé"

        public string Commentaire { get; set; }

        public double? ScoreConfiance { get; set; } // 0-100%

        // Clé étrangère vers Parcelle
        [ForeignKey("Parcelle")]
        public int? ParcelleId { get; set; }

        public virtual Parcelle Parcelle { get; set; }

        // Clé étrangère vers ImageSatellite
        [ForeignKey("ImageSatellite")]
        public int? ImageSatelliteId { get; set; }

        public virtual ImageSatellite ImageSatellite { get; set; }
    }
}