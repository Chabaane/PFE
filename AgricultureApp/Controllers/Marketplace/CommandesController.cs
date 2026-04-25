
// ????????????????????????????????????????????????????????????????????????????
// Controllers/Marketplace/CommandesController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using AgricultureApp.Models.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;

namespace AgricultureApp.Controllers.Marketplace
{
  

    [ApiController]
    [Route("api/marketplace/commandes")]
    public class CommandesController : ControllerBase
    {
        private readonly ApplicationDbContext _ctx;
        public CommandesController(ApplicationDbContext ctx) => _ctx = ctx;

        // POST api/marketplace/commandes/passer
        [HttpPost("passer")]
        public async Task<ActionResult<CommandeDto>> PasserCommande([FromBody] PasserCommandeDto dto)
        {
            // Récupérer le panier
            Panier? panier = null;
            if (dto.IdUtilisateur.HasValue)
                panier = await _ctx.Paniers.Include(p => p.Lignes).ThenInclude(l => l.Produit)
                    .FirstOrDefaultAsync(p => p.IdUtilisateur == dto.IdUtilisateur);
            else if (!string.IsNullOrEmpty(dto.SessionId))
                panier = await _ctx.Paniers.Include(p => p.Lignes).ThenInclude(l => l.Produit)
                    .FirstOrDefaultAsync(p => p.SessionId == dto.SessionId);

            if (panier == null || !panier.Lignes.Any())
                return BadRequest("Panier vide");

            // Vérifier stocks
            foreach (var ligne in panier.Lignes)
            {
                if (ligne.Produit!.StockDisponible < ligne.Quantite)
                    return BadRequest($"Stock insuffisant pour {ligne.Produit.Nom}");
            }

            // Créer la commande
            var numCommande = $"CMD-{DateTime.UtcNow.Year}-{new Random().Next(10000, 99999)}";
            decimal sousTotal = panier.Lignes.Sum(l =>
                (l.Produit!.EstEnPromotion && l.Produit.PrixPromo.HasValue ? l.Produit.PrixPromo.Value : l.Produit!.Prix) * l.Quantite);
            decimal frais = sousTotal >= 100 ? 0 : 7.0m;

            var commande = new Commande
            {
                NumeroCommande = numCommande,
                IdUtilisateur = dto.IdUtilisateur,
                NomClient = dto.NomClient,
                EmailClient = dto.EmailClient,
                TelephoneClient = dto.TelephoneClient,
                AdresseLivraison = dto.AdresseLivraison,
                VilleLivraison = dto.VilleLivraison,
                GouvernoratLivraison = dto.GouvernoratLivraison,
                CodePostalLivraison = dto.CodePostalLivraison,
                SousTotal = sousTotal,
                FraisLivraison = frais,
                Total = sousTotal + frais,
                ModePaiement = dto.ModePaiement,
                NotesCommande = dto.NotesCommande
            };

            foreach (var ligne in panier.Lignes)
            {
                decimal prixUnit = ligne.Produit!.EstEnPromotion && ligne.Produit.PrixPromo.HasValue
                    ? ligne.Produit.PrixPromo.Value : ligne.Produit.Prix;

                commande.Lignes.Add(new LigneCommande
                {
                    IdProduit = ligne.IdProduit,
                    Quantite = ligne.Quantite,
                    PrixUnitaire = prixUnit,
                    SousTotal = prixUnit * ligne.Quantite
                });

                // Décrémenter le stock
                ligne.Produit.StockDisponible -= ligne.Quantite;
            }

            _ctx.Commandes.Add(commande);

            // Vider le panier
            _ctx.LignesPanier.RemoveRange(panier.Lignes);
            await _ctx.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCommande), new { id = commande.IdCommande }, ToDto(commande));
        }

        // GET api/marketplace/commandes/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<CommandeDto>> GetCommande(int id)
        {
            var cmd = await _ctx.Commandes.Include(c => c.Lignes).ThenInclude(l => l.Produit)
                .FirstOrDefaultAsync(c => c.IdCommande == id);
            if (cmd == null) return NotFound();
            return Ok(ToDto(cmd));
        }

        // GET api/marketplace/commandes/numero/{num}
        [HttpGet("numero/{num}")]
        public async Task<ActionResult<CommandeDto>> GetCommandeByNumero(string num)
        {
            var cmd = await _ctx.Commandes.Include(c => c.Lignes).ThenInclude(l => l.Produit)
                .FirstOrDefaultAsync(c => c.NumeroCommande == num);
            if (cmd == null) return NotFound();
            return Ok(ToDto(cmd));
        }

        // GET api/marketplace/commandes?userId=X
        [HttpGet]
        public async Task<ActionResult<List<CommandeDto>>> GetCommandes([FromQuery] int? userId, [FromQuery] int page = 1)
        {
            var query = _ctx.Commandes.Include(c => c.Lignes).ThenInclude(l => l.Produit).AsQueryable();
            if (userId.HasValue) query = query.Where(c => c.IdUtilisateur == userId);
            var cmds = await query.OrderByDescending(c => c.DateCommande).Skip((page - 1) * 10).Take(10).ToListAsync();
            return Ok(cmds.Select(ToDto).ToList());
        }

        // PUT api/marketplace/commandes/{id}/statut  [Admin]
        [HttpPut("{id}/statut")]
        public async Task<IActionResult> UpdateStatut(int id, [FromBody] string statut)
        {
            var cmd = await _ctx.Commandes.FindAsync(id);
            if (cmd == null) return NotFound();
            if (Enum.TryParse<StatutCommande>(statut, out var s))
            {
                cmd.Statut = s;
                if (s == StatutCommande.Expediee) cmd.DateExpedition = DateTime.UtcNow;
                if (s == StatutCommande.Livree) cmd.DateLivraison = DateTime.UtcNow;
                await _ctx.SaveChangesAsync();
                return Ok(ToDto(cmd));
            }
            return BadRequest("Statut invalide");
        }

        // GET api/marketplace/commandes/stats  [Admin]
        [HttpGet("stats")]
        public async Task<ActionResult<StatsMarketplaceDto>> GetStats()
        {
            var stats = new StatsMarketplaceDto
            {
                TotalProduits = await _ctx.Produits.CountAsync(p => p.EstActif),
                TotalCommandes = await _ctx.Commandes.CountAsync(),
                ChiffreAffaires = await _ctx.Commandes.SumAsync(c => c.Total),
                CommandesEnAttente = await _ctx.Commandes.CountAsync(c => c.Statut == StatutCommande.EnAttente),
                CommandesEnCours = await _ctx.Commandes.CountAsync(c =>
                  c.Statut == StatutCommande.Confirmee || c.Statut == StatutCommande.EnPreparation || c.Statut == StatutCommande.Expediee),
                TopProduits = await _ctx.LignesCommande
                    .GroupBy(l => l.Produit.Nom)
                    .Select(g => new TopProduitDto
                    {
                        Nom = g.Key,
                        QuantiteVendue = g.Sum(l => l.Quantite),
                        Revenu = g.Sum(l => l.SousTotal)
                    })
                    .OrderByDescending(t => t.QuantiteVendue)
                    .Take(5).ToListAsync()
            };
            return Ok(stats);
        }

        private static CommandeDto ToDto(Commande c) => new()
        {
            IdCommande = c.IdCommande,
            NumeroCommande = c.NumeroCommande,
            NomClient = c.NomClient,
            EmailClient = c.EmailClient,
            AdresseLivraison = c.AdresseLivraison,
            VilleLivraison = c.VilleLivraison,
            GouvernoratLivraison = c.GouvernoratLivraison,
            SousTotal = c.SousTotal,
            FraisLivraison = c.FraisLivraison,
            Total = c.Total,
            Statut = c.Statut.ToString(),
            ModePaiement = c.ModePaiement,
            DateCommande = c.DateCommande,
            DateExpedition = c.DateExpedition,
            DateLivraison = c.DateLivraison,
            Lignes = c.Lignes.Select(l => new LigneCommandeDto
            {
                IdProduit = l.IdProduit,
                NomProduit = l.Produit?.Nom ?? "",
                ImageUrl = l.Produit?.ImageUrl,
                Quantite = l.Quantite,
                PrixUnitaire = l.PrixUnitaire,
                SousTotal = l.SousTotal
            }).ToList()
        };
    }
}