using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("StationsMeteo")]
    public class StationMeteo
    {
        [Key]
        public int IdStation { get; set; }

        [Required]
        [StringLength(50)]
        public string TypeStation { get; set; }

        [StringLength(100)]
        public string Fournisseur { get; set; }

        [StringLength(200)]
        public string Localisation { get; set; }

        [StringLength(50)]
        public string Statut { get; set; } = "Active";

        // Navigation property
        public virtual ICollection<DonneesMeteo> DonneesMeteo { get; set; }

        public StationMeteo()
        {
            DonneesMeteo = new HashSet<DonneesMeteo>();
        }
    }
}