using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("DonneesLocales")]
    public class DonneeLocale
    {
        [Key]
        public int IdLocal { get; set; }

        [Required]
        [StringLength(50)]
        public string TypeObjet { get; set; } // "Parcelle", "Agriculteur", "Modification"

        [Required]
        public string ContenuJSON { get; set; }

        [StringLength(50)]
        public string Etat { get; set; } = "À synchroniser"; // "À synchroniser", "Synchronisé", "Erreur"

        public DateTime DateCreation { get; set; } = DateTime.UtcNow;

        public DateTime? DateSynchronisation { get; set; }

        [StringLength(100)]
        public string DeviceId { get; set; } // Pour identifier l'appareil mobile
    }
}