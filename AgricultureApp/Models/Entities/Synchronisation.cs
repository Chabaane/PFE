using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("Synchronisations")]
    public class Synchronisation
    {
        [Key]
        public int IdSync { get; set; }

        [Required]
        public DateTime DateSync { get; set; }

        [StringLength(50)]
        public string Statut { get; set; } // "Réussi", "Échoué", "Partiel"

        public int NombreObjetsSync { get; set; }

        public string Details { get; set; }

        [StringLength(100)]
        public string DeviceId { get; set; }

        // Clé étrangère vers Utilisateur
        [ForeignKey("Utilisateur")]
        public int? UtilisateurId { get; set; }

        public virtual Utilisateur Utilisateur { get; set; }
    }
}