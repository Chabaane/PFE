// Controllers/Marketplace/PanierController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using AgricultureApp.Models.DTOs;
using System.Threading.Tasks;
using System;

namespace AgricultureApp.Controllers.Marketplace
{
    [ApiController]
    [Route("api/marketplace/panier")]
    public class PanierController : ControllerBase
    {
        private readonly ApplicationDbContext _ctx;
        public PanierController(ApplicationDbContext ctx) => _ctx = ctx;

        private async Task<Panier?> GetOrCreatePanier(int? userId, string? sessionId)
        {
            Panier? panier = null;
            if (userId.HasValue)
                panier = await _ctx.Paniers.Include(p => p.Lignes).ThenInclude(l => l.Produit)
                    .FirstOrDefaultAsync(p => p.IdUtilisateur == userId);
            else if (!string.IsNullOrEmpty(sessionId))
                panier = await _ctx.Paniers.Include(p => p.Lignes).ThenInclude(l => l.Produit)
                    .FirstOrDefaultAsync(p => p.SessionId == sessionId);

            if (panier == null)
            {
                panier = new Panier { IdUtilisateur = userId, SessionId = sessionId };
                _ctx.Paniers.Add(panier);
                await _ctx.SaveChangesAsync();
            }
            return panier;
        }

        private static PanierDto ToPanierDto(Panier p)
        {
            var lignes = p.Lignes.Select(l => new LignePanierDto
            {
                IdLignePanier = l.IdLignePanier,
                IdProduit = l.IdProduit,
                NomProduit = l.Produit?.Nom ?? "",
                ImageUrl = l.Produit?.ImageUrl,
                Unite = l.Produit?.Unite ?? "",
                PrixUnitaire = l.Produit?.EstEnPromotion == true && l.Produit.PrixPromo.HasValue
                                    ? l.Produit.PrixPromo.Value : l.Produit?.Prix ?? 0,
                Quantite = l.Quantite,
                SousTotal = (l.Produit?.EstEnPromotion == true && l.Produit.PrixPromo.HasValue
                                    ? l.Produit.PrixPromo.Value : l.Produit?.Prix ?? 0) * l.Quantite,
                StockDisponible = l.Produit?.StockDisponible ?? 0
            }).ToList();

            var sousTotal = lignes.Sum(l => l.SousTotal);
            var frais = sousTotal >= 100 ? 0 : 7.0m;

            return new PanierDto
            {
                IdPanier = p.IdPanier,
                Lignes = lignes,
                SousTotal = sousTotal,
                FraisLivraison = frais,
                Total = sousTotal + frais,
                NombreArticles = lignes.Sum(l => l.Quantite)
            };
        }

        // GET api/marketplace/panier
        [HttpGet]
        public async Task<ActionResult<PanierDto>> GetPanier([FromQuery] int? userId, [FromQuery] string? sessionId)
        {
            var panier = await GetOrCreatePanier(userId, sessionId);
            // Reload avec includes
            panier = await _ctx.Paniers.Include(p => p.Lignes).ThenInclude(l => l.Produit)
                .FirstOrDefaultAsync(p => p.IdPanier == panier!.IdPanier);
            return Ok(ToPanierDto(panier!));
        }

        // POST api/marketplace/panier/ajouter
        [HttpPost("ajouter")]
        public async Task<ActionResult<PanierDto>> Ajouter([FromBody] AjouterPanierDto dto)
        {
            var panier = await GetOrCreatePanier(dto.IdUtilisateur, dto.SessionId);
            panier = await _ctx.Paniers.Include(p => p.Lignes).ThenInclude(l => l.Produit)
                .FirstOrDefaultAsync(p => p.IdPanier == panier!.IdPanier);

            var produit = await _ctx.Produits.FindAsync(dto.IdProduit);
            if (produit == null || !produit.EstActif) return NotFound("Produit introuvable");
            if (produit.StockDisponible < dto.Quantite) return BadRequest("Stock insuffisant");

            var ligne = panier!.Lignes.FirstOrDefault(l => l.IdProduit == dto.IdProduit);
            if (ligne != null)
                ligne.Quantite += dto.Quantite;
            else
                panier.Lignes.Add(new LignePanier { IdPanier = panier.IdPanier, IdProduit = dto.IdProduit, Quantite = dto.Quantite });

            panier.DateMaj = DateTime.UtcNow;
            await _ctx.SaveChangesAsync();

            panier = await _ctx.Paniers.Include(p => p.Lignes).ThenInclude(l => l.Produit)
                .FirstOrDefaultAsync(p => p.IdPanier == panier.IdPanier);
            return Ok(ToPanierDto(panier!));
        }

        // PUT api/marketplace/panier/ligne/{id}
        [HttpPut("ligne/{id}")]
        public async Task<ActionResult<PanierDto>> UpdateLigne(int id, [FromBody] int quantite)
        {
            var ligne = await _ctx.LignesPanier.Include(l => l.Panier).ThenInclude(p => p.Lignes).ThenInclude(l => l.Produit)
                .FirstOrDefaultAsync(l => l.IdLignePanier == id);
            if (ligne == null) return NotFound();

            if (quantite <= 0)
                _ctx.LignesPanier.Remove(ligne);
            else
                ligne.Quantite = quantite;

            await _ctx.SaveChangesAsync();
            var panier = await _ctx.Paniers.Include(p => p.Lignes).ThenInclude(l => l.Produit)
                .FirstOrDefaultAsync(p => p.IdPanier == ligne.IdPanier);
            return Ok(ToPanierDto(panier!));
        }

        // DELETE api/marketplace/panier/ligne/{id}
        [HttpDelete("ligne/{id}")]
        public async Task<ActionResult<PanierDto>> DeleteLigne(int id)
        {
            var ligne = await _ctx.LignesPanier.FindAsync(id);
            if (ligne == null) return NotFound();
            var panId = ligne.IdPanier;
            _ctx.LignesPanier.Remove(ligne);
            await _ctx.SaveChangesAsync();
            var panier = await _ctx.Paniers.Include(p => p.Lignes).ThenInclude(l => l.Produit)
                .FirstOrDefaultAsync(p => p.IdPanier == panId);
            return Ok(ToPanierDto(panier!));
        }

        // DELETE api/marketplace/panier/vider
        [HttpDelete("vider")]
        public async Task<IActionResult> Vider([FromQuery] int? userId, [FromQuery] string? sessionId)
        {
            var panier = await GetOrCreatePanier(userId, sessionId);
            var lignes = _ctx.LignesPanier.Where(l => l.IdPanier == panier!.IdPanier);
            _ctx.LignesPanier.RemoveRange(lignes);
            await _ctx.SaveChangesAsync();
            return Ok(new { message = "Panier vidé" });
        }
    }
}
