// Models/Parcelle.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using AgricultureApp.Models.Entities;


namespace AgricultureApp.Models.Entities
{
    public class Parcelle
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Nom { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        public int AgriculteurId { get; set; }

        public decimal? AltitudeMin { get; set; }    // Altitude minimale (m)
        public decimal? AltitudeMax { get; set; }    // Altitude maximale (m)
        public decimal? AltitudeMoyenne { get; set; } // Altitude moyenne (m)
        public decimal? PenteMoyenne { get; set; }    // Pente moyenne (%)
        public string? ClassePente { get; set; }      // Classe de pente (plat, doux, modéré, fort)
        public string? Exposition { get; set; }       // Exposition (Nord, Sud, Est, Ouest)

        // Ajouter cette propriété (nullable car une parcelle peut ne pas être dans une ferme)
        public int? FermeId { get; set; }

        [ForeignKey("AgriculteurId")]
        [JsonIgnore]
        public virtual Agriculteur? Agriculteur { get; set; }

        [ForeignKey("FermeId")]
        public virtual Ferme Ferme { get; set; }

        [Required]
        [Column(TypeName = "decimal(10, 6)")]
        public decimal Surface { get; set; } // en hectares

        [Required]
        public string Couleur { get; set; } = "#4CAF50";

        public DateTime DateCreation { get; set; } = DateTime.UtcNow;
        public DateTime? DateModification { get; set; }

        // Coordonnées géographiques
        [Required]
        [Column(TypeName = "decimal(18, 15)")]
        public decimal Latitude { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 15)")]
        public decimal Longitude { get; set; }

        // Données administratives
        public string? Gouvernorat { get; set; }
        public string? Delegation { get; set; }
        public string? Secteur { get; set; }

        // Informations agricoles
        public string? Culture { get; set; }
        public DateTime? DatePlantation { get; set; }
        public DateTime? DateRecolte { get; set; }

        // Contour de la parcelle (JSON)
        [Column(TypeName = "nvarchar(max)")]
        public string? Geometrie { get; set; } // Polygone au format GeoJSON

        // État de synchronisation
        public bool EstSynchronise { get; set; } = true;
        public DateTime? DerniereSynchronisation { get; set; }
    }

    // DTO pour le dessin de parcelles
    public class DessinParcelleDto
    {
        public string? Nom { get; set; }
        public string? Description { get; set; }
        public decimal Surface { get; set; }
        public string Couleur { get; set; } = "#4CAF50";
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public string? Gouvernorat { get; set; }
        public string? Delegation { get; set; }
        public string? Secteur { get; set; }
        public string? Culture { get; set; }
        public DateTime? DatePlantation { get; set; }
        public DateTime? DateRecolte { get; set; }
        public string? Geometrie { get; set; } // GeoJSON
    }

    // DTO pour les coordonnées
    public class CoordonneeDto
    {
        public decimal Lat { get; set; }
        public decimal Lng { get; set; }
    }

    // DTO pour les statistiques
    public class StatistiquesAgriculteurDto
    {
        public int NombreParcelles { get; set; }
        public decimal SurfaceTotale { get; set; }
        public Dictionary<string, int> ParcellesParGouvernorat { get; set; } = new();
        public Dictionary<string, decimal> SurfaceParCulture { get; set; } = new();
    }
}