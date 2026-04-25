using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("Regions")]
    public class Region
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(100)]
        public string Nom { get; set; } = string.Empty;

        [StringLength(20)]
        public string? Code { get; set; }

        // Navigation
        public virtual ICollection<UserRegionAccess> UserRegionAccesses { get; set; } = new List<UserRegionAccess>();
        public virtual ICollection<Parcelle> Parcelles { get; set; } = new List<Parcelle>();
        public virtual ICollection<Ferme> Fermes { get; set; } = new List<Ferme>();
    }
}