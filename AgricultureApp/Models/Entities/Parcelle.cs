using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("Parcelles")]
    public class Parcelle
    {
        [Key]
        public int IdParcelle { get; set; }

        [Required]
        [StringLength(100)]
        public string Nom { get; set; }

        [Required]
        public string ContourJson { get; set; } // Stockage JSON des coordonnées

        public double? Superficie { get; set; } // en hectares

        public double? AltitudeMoyenne { get; set; } // en mètres

        public double? PenteMoyenne { get; set; } // en pourcentage

        public DateTime DateCreation { get; set; }

        public DateTime? DateModification { get; set; }

        public string EtatSynchronisation { get; set; } = "Synchronisé"; // "Local", "À synchroniser", "Synchronisé"

        // Clé étrangère
        [ForeignKey("Agriculteur")]
        public int AgriculteurId { get; set; }

        // Navigation property
        public virtual Agriculteur Agriculteur { get; set; }
    }
}