using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("Agriculteurs")]
    public class Agriculteur
    {
        [Key]
        public int idAgriculteur { get; set; }

        [Required]
        [StringLength(100)]
        public string Nom { get; set; }

        [Required]
        [StringLength(100)]
        public string Prenom { get; set; }

        [StringLength(20)]
        public string Telephone { get; set; }

        [StringLength(200)]
        public string Localisation { get; set; }

        // Navigation properties
        public virtual ICollection<Parcelle> Parcelles { get; set; }

        public Agriculteur()
        {
            Parcelles = new HashSet<Parcelle>();
        }
    }
}