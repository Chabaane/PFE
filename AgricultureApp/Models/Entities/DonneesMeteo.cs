using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("DonneesMeteo")]
    public class DonneesMeteo
    {
        [Key]
        public int IdDonnee { get; set; }

        [Required]
        public DateTime DateHeure { get; set; }

        public double Temperature { get; set; } // en °C

        public double Humidite { get; set; } // en %

        public double Pression { get; set; } // en hPa

        public double VitesseVent { get; set; } // en km/h

        [StringLength(50)]
        public string DirectionVent { get; set; } // "N", "NE", "E", etc.

        public double Pluviometrie { get; set; } // en mm

        public double RayonnementSolaire { get; set; } // en W/m²

        // Clé étrangère vers StationMeteo (rendue nullable avec ?)
        [ForeignKey("StationMeteo")]
        public int? StationMeteoId { get; set; } // Ajoutez le ?

        // Navigation property (peut être null)
        public virtual StationMeteo StationMeteo { get; set; }
    }
}