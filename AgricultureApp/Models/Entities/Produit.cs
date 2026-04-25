// Models/Marketplace/Produit.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    public class Produit
    {
        [Key]
        public int IdProduit { get; set; }

        [Required, MaxLength(200)]
        public string Nom { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string Description { get; set; } = string.Empty;

        [Required]
        public string Categorie { get; set; } = string.Empty; // Fongicide, Insecticide, Herbicide, Engrais, etc.

        [Column(TypeName = "decimal(10,2)")]
        public decimal Prix { get; set; }

        public string Unite { get; set; } = "L"; // L, Kg, g, ml, unité

        public int StockDisponible { get; set; }

        public string? ImageUrl { get; set; }

        public string? Fabricant { get; set; }

        public string? NumeroAMM { get; set; } // Autorisation de Mise sur le Marché

        public string? CulturesCompatibles { get; set; } // JSON array

        public string? MatieresActives { get; set; }

        public double NoteMoyenne { get; set; } = 0;

        public int NombreAvis { get; set; } = 0;

        public bool EstActif { get; set; } = true;

        public bool EstEnPromotion { get; set; } = false;

        public decimal? PrixPromo { get; set; }

        public DateTime DateAjout { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<AvisProduit> Avis { get; set; } = new List<AvisProduit>();
        public ICollection<LignePanier> LignesPanier { get; set; } = new List<LignePanier>();
        public ICollection<LigneCommande> LignesCommande { get; set; } = new List<LigneCommande>();
    }
}