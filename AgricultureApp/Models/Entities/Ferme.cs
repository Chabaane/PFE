// Entities/Ferme.cs
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("Fermes")]
    public class Ferme
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Nom { get; set; }

     

        [MaxLength(100)]
        public string Gouvernorat { get; set; }

        [MaxLength(100)]
        public string Delegation { get; set; }

        [MaxLength(100)]
        public string Secteur { get; set; }

        [MaxLength(500)]
        public string Description { get; set; }

        [MaxLength(20)]
        public string Couleur { get; set; }

        public DateTime DateCreation { get; set; }

        public DateTime? DateModification { get; set; }

        // Propriétés calculées (non mappées en DB)
        [NotMapped]
        public int NombreParcelles => Parcelles?.Count ?? 0;

        
        [NotMapped]
        public decimal SuperficieTotale => Parcelles?.Sum(p => p.Surface) ?? 0m;

        // Navigation properties
        [ForeignKey(nameof(Agriculteur))]
        public int AgriculteurId { get; set; }

        public virtual Agriculteur Agriculteur { get; set; }

        public virtual ICollection<Parcelle> Parcelles { get; set; } = new List<Parcelle>();
    }
}