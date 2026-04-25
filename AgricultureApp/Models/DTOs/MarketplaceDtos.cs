// DTOs/Marketplace/MarketplaceDtos.cs
namespace AgricultureApp.Models.DTOs
{
    // ?? Produit ??????????????????????????????????????????????????????????
    public class ProduitDto
    {
        public int IdProduit { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Categorie { get; set; } = string.Empty;
        public decimal Prix { get; set; }
        public decimal? PrixPromo { get; set; }
        public bool EstEnPromotion { get; set; }
        public string Unite { get; set; } = string.Empty;
        public int StockDisponible { get; set; }
        public string? ImageUrl { get; set; }
        public string? Fabricant { get; set; }
        public string? NumeroAMM { get; set; }
        public string? CulturesCompatibles { get; set; }
        public string? MatieresActives { get; set; }
        public double NoteMoyenne { get; set; }
        public int NombreAvis { get; set; }
        public DateTime DateAjout { get; set; }
        public decimal PrixEffectif => EstEnPromotion && PrixPromo.HasValue ? PrixPromo.Value : Prix;
    }

    public class CreateProduitDto
    {
        public string Nom { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Categorie { get; set; } = string.Empty;
        public decimal Prix { get; set; }
        public string Unite { get; set; } = "L";
        public int StockDisponible { get; set; }
        public string? ImageUrl { get; set; }
        public string? Fabricant { get; set; }
        public string? NumeroAMM { get; set; }
        public string? CulturesCompatibles { get; set; }
        public string? MatieresActives { get; set; }
        public bool EstEnPromotion { get; set; }
        public decimal? PrixPromo { get; set; }
    }

    public class ProduitFiltreDto
    {
        public string? Recherche { get; set; }
        public string? Categorie { get; set; }
        public decimal? PrixMin { get; set; }
        public decimal? PrixMax { get; set; }
        public string? Tri { get; set; } = "recent"; // recent, prix_asc, prix_desc, note
        public int Page { get; set; } = 1;
        public int TaillePage { get; set; } = 12;
        public bool? EnPromotion { get; set; }
        public bool? EnStock { get; set; }
    }

    public class ProduitPageDto
    {
        public List<ProduitDto> Produits { get; set; } = new();
        public int Total { get; set; }
        public int Page { get; set; }
        public int TotalPages { get; set; }
    }

    // ?? Panier ???????????????????????????????????????????????????????????
    public class PanierDto
    {
        public int IdPanier { get; set; }
        public List<LignePanierDto> Lignes { get; set; } = new();
        public decimal SousTotal { get; set; }
        public decimal FraisLivraison { get; set; }
        public decimal Total { get; set; }
        public int NombreArticles { get; set; }
    }

    public class LignePanierDto
    {
        public int IdLignePanier { get; set; }
        public int IdProduit { get; set; }
        public string NomProduit { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public decimal PrixUnitaire { get; set; }
        public int Quantite { get; set; }
        public decimal SousTotal { get; set; }
        public int StockDisponible { get; set; }
        public string Unite { get; set; } = string.Empty;
    }

    public class AjouterPanierDto
    {
        public int IdProduit { get; set; }
        public int Quantite { get; set; } = 1;
        public int? IdUtilisateur { get; set; }
        public string? SessionId { get; set; }
    }

    // ?? Commande ?????????????????????????????????????????????????????????
    public class CommandeDto
    {
        public int IdCommande { get; set; }
        public string NumeroCommande { get; set; } = string.Empty;
        public string NomClient { get; set; } = string.Empty;
        public string EmailClient { get; set; } = string.Empty;
        public string AdresseLivraison { get; set; } = string.Empty;
        public string VilleLivraison { get; set; } = string.Empty;
        public string GouvernoratLivraison { get; set; } = string.Empty;
        public decimal SousTotal { get; set; }
        public decimal FraisLivraison { get; set; }
        public decimal Total { get; set; }
        public string Statut { get; set; } = string.Empty;
        public string ModePaiement { get; set; } = string.Empty;
        public DateTime DateCommande { get; set; }
        public DateTime? DateExpedition { get; set; }
        public DateTime? DateLivraison { get; set; }
        public List<LigneCommandeDto> Lignes { get; set; } = new();
    }

    public class LigneCommandeDto
    {
        public int IdProduit { get; set; }
        public string NomProduit { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public int Quantite { get; set; }
        public decimal PrixUnitaire { get; set; }
        public decimal SousTotal { get; set; }
    }

    public class PasserCommandeDto
    {
        public int? IdUtilisateur { get; set; }
        public string? SessionId { get; set; }
        public string NomClient { get; set; } = string.Empty;
        public string EmailClient { get; set; } = string.Empty;
        public string TelephoneClient { get; set; } = string.Empty;
        public string AdresseLivraison { get; set; } = string.Empty;
        public string VilleLivraison { get; set; } = string.Empty;
        public string GouvernoratLivraison { get; set; } = string.Empty;
        public string CodePostalLivraison { get; set; } = string.Empty;
        public string ModePaiement { get; set; } = "A la livraison";
        public string? NotesCommande { get; set; }
    }

    // ?? Avis ?????????????????????????????????????????????????????????????
    public class AvisDto
    {
        public int IdAvis { get; set; }
        public string NomAuteur { get; set; } = string.Empty;
        public int Note { get; set; }
        public string? Commentaire { get; set; }
        public bool Verifie { get; set; }
        public DateTime DateAvis { get; set; }
    }

    public class CreerAvisDto
    {
        public int IdProduit { get; set; }
        public int? IdUtilisateur { get; set; }
        public string NomAuteur { get; set; } = string.Empty;
        public int Note { get; set; }
        public string? Commentaire { get; set; }
    }

    // ?? Stats admin ??????????????????????????????????????????????????????
    public class StatsMarketplaceDto
    {
        public int TotalProduits { get; set; }
        public int TotalCommandes { get; set; }
        public decimal ChiffreAffaires { get; set; }
        public int CommandesEnAttente { get; set; }
        public int CommandesEnCours { get; set; }
        public List<TopProduitDto> TopProduits { get; set; } = new();
    }

    public class TopProduitDto
    {
        public string Nom { get; set; } = string.Empty;
        public int QuantiteVendue { get; set; }
        public decimal Revenu { get; set; }
    }
}