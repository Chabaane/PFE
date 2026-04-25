// Models/Marketplace/Commande.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    public enum StatutCommande
    {
        EnAttente,
        Confirmee,
        EnPreparation,
        Expediee,
        Livree,
        Annulee,
        Remboursee
    }

    public class Commande
    {
        [Key]
        public int IdCommande { get; set; }

        public string NumeroCommande { get; set; } = string.Empty; // CMD-2024-XXXXX

        public int? IdAgriculteur { get; set; }
        public int? IdUtilisateur { get; set; }

        public string NomClient { get; set; } = string.Empty;
        public string EmailClient { get; set; } = string.Empty;
        public string TelephoneClient { get; set; } = string.Empty;

        // Adresse livraison
        public string AdresseLivraison { get; set; } = string.Empty;
        public string VilleLivraison { get; set; } = string.Empty;
        public string GouvernoratLivraison { get; set; } = string.Empty;
        public string CodePostalLivraison { get; set; } = string.Empty;

        [Column(TypeName = "decimal(10,2)")]
        public decimal SousTotal { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal FraisLivraison { get; set; } = 7.0m;

        [Column(TypeName = "decimal(10,2)")]
        public decimal Total { get; set; }

        public StatutCommande Statut { get; set; } = StatutCommande.EnAttente;

        public string ModePaiement { get; set; } = "A la livraison"; // CB, Virement, Livraison

        public string? NotesCommande { get; set; }

        public DateTime DateCommande { get; set; } = DateTime.UtcNow;
        public DateTime? DateLivraison { get; set; }
        public DateTime? DateExpedition { get; set; }

        public ICollection<LigneCommande> Lignes { get; set; } = new List<LigneCommande>();
    }

    public class LigneCommande
    {
        [Key]
        public int IdLigneCommande { get; set; }

        public int IdCommande { get; set; }
        public Commande Commande { get; set; } = null!;

        public int IdProduit { get; set; }
        public Produit Produit { get; set; } = null!;

        public int Quantite { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal PrixUnitaire { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal SousTotal { get; set; }
    }

    // ?? Panier ??????????????????????????????????????????????????????????
    public class Panier
    {
        [Key]
        public int IdPanier { get; set; }

        public int? IdUtilisateur { get; set; }
        public string? SessionId { get; set; }

        public DateTime DateCreation { get; set; } = DateTime.UtcNow;
        public DateTime DateMaj { get; set; } = DateTime.UtcNow;

        public ICollection<LignePanier> Lignes { get; set; } = new List<LignePanier>();
    }

    public class LignePanier
    {
        [Key]
        public int IdLignePanier { get; set; }

        public int IdPanier { get; set; }
        public Panier Panier { get; set; } = null!;

        public int IdProduit { get; set; }
        public Produit Produit { get; set; } = null!;

        public int Quantite { get; set; }

        public DateTime DateAjout { get; set; } = DateTime.UtcNow;
    }

    // ?? Avis ?????????????????????????????????????????????????????????????
    public class AvisProduit
    {
        [Key]
        public int IdAvis { get; set; }

        public int IdProduit { get; set; }
        public Produit Produit { get; set; } = null!;

        public int? IdUtilisateur { get; set; }
        public string NomAuteur { get; set; } = string.Empty;

        [Range(1, 5)]
        public int Note { get; set; }

        [MaxLength(1000)]
        public string? Commentaire { get; set; }

        public bool Verifie { get; set; } = false; // achat vérifié

        public DateTime DateAvis { get; set; } = DateTime.UtcNow;
    }
}