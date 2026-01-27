using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("ImagesSatellite")]
    public class ImageSatellite
    {
        [Key]
        public int IdImage { get; set; }

        [Required]
        public DateTime DateCapture { get; set; }

        [StringLength(50)]
        public string TypeImage { get; set; } // "NDVI", "RGB", "Multispectral"

        [StringLength(500)]
        public string UrlImage { get; set; }

        [StringLength(50)]
        public string Source { get; set; } // "API", "Téléchargement"

        public double? Resolution { get; set; } // en mètres/pixel

        public string MetadataJson { get; set; }

        public DateTime DateImport { get; set; } = DateTime.UtcNow;
    }
}