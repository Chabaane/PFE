// Controllers/Marketplace/ProduitsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using AgricultureApp.Models.DTOs;


namespace AgricultureApp.Controllers.Marketplace
{
    [ApiController]
    [Route("api/marketplace/produits")]
    public class ProduitsController : ControllerBase
    {
        private readonly ApplicationDbContext _ctx;
        public ProduitsController(ApplicationDbContext ctx) => _ctx = ctx;

        // GET api/marketplace/produits
        [HttpGet]
        public async Task<ActionResult<ProduitPageDto>> GetProduits([FromQuery] ProduitFiltreDto filtre)
        {
            var query = _ctx.Produits.Where(p => p.EstActif).AsQueryable();

            if (!string.IsNullOrWhiteSpace(filtre.Recherche))
            {
                var s = filtre.Recherche.ToLower();
                query = query.Where(p =>
                    p.Nom.ToLower().Contains(s) ||
                    p.Description.ToLower().Contains(s) ||
                    p.Fabricant!.ToLower().Contains(s) ||
                    p.MatieresActives!.ToLower().Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(filtre.Categorie) && filtre.Categorie != "Tous")
                query = query.Where(p => p.Categorie == filtre.Categorie);

            if (filtre.PrixMin.HasValue)
                query = query.Where(p => p.Prix >= filtre.PrixMin.Value);

            if (filtre.PrixMax.HasValue)
                query = query.Where(p => p.Prix <= filtre.PrixMax.Value);

            if (filtre.EnPromotion == true)
                query = query.Where(p => p.EstEnPromotion);

            if (filtre.EnStock == true)
                query = query.Where(p => p.StockDisponible > 0);

            query = filtre.Tri switch
            {
                "prix_asc" => query.OrderBy(p => p.Prix),
                "prix_desc" => query.OrderByDescending(p => p.Prix),
                "note" => query.OrderByDescending(p => p.NoteMoyenne),
                "nom" => query.OrderBy(p => p.Nom),
                _ => query.OrderByDescending(p => p.DateAjout)
            };

            var total = await query.CountAsync();
            var produits = await query
                .Skip((filtre.Page - 1) * filtre.TaillePage)
                .Take(filtre.TaillePage)
                .Select(p => ToDto(p))
                .ToListAsync();

            return Ok(new ProduitPageDto
            {
                Produits = produits,
                Total = total,
                Page = filtre.Page,
                TotalPages = (int)Math.Ceiling((double)total / filtre.TaillePage)
            });
        }

        // GET api/marketplace/produits/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ProduitDto>> GetProduit(int id)
        {
            var p = await _ctx.Produits.FindAsync(id);
            if (p == null || !p.EstActif) return NotFound();
            return Ok(ToDto(p));
        }

        // GET api/marketplace/produits/{id}/avis
        [HttpGet("{id}/avis")]
        public async Task<ActionResult<List<AvisDto>>> GetAvis(int id)
        {
            var avis = await _ctx.AvisProduits
                .Where(a => a.IdProduit == id)
                .OrderByDescending(a => a.DateAvis)
                .Select(a => new AvisDto
                {
                    IdAvis = a.IdAvis,
                    NomAuteur = a.NomAuteur,
                    Note = a.Note,
                    Commentaire = a.Commentaire,
                    Verifie = a.Verifie,
                    DateAvis = a.DateAvis
                }).ToListAsync();
            return Ok(avis);
        }

        // POST api/marketplace/produits/{id}/avis
        [HttpPost("{id}/avis")]
        public async Task<ActionResult<AvisDto>> PostAvis(int id, [FromBody] CreerAvisDto dto)
        {
            var produit = await _ctx.Produits.FindAsync(id);
            if (produit == null) return NotFound();

            var avis = new AvisProduit
            {
                IdProduit = id,
                IdUtilisateur = dto.IdUtilisateur,
                NomAuteur = dto.NomAuteur,
                Note = dto.Note,
                Commentaire = dto.Commentaire
            };

            _ctx.AvisProduits.Add(avis);

            // Recalculer la note moyenne
            var tousAvis = await _ctx.AvisProduits.Where(a => a.IdProduit == id).ToListAsync();
            tousAvis.Add(avis);
            produit.NoteMoyenne = tousAvis.Average(a => a.Note);
            produit.NombreAvis = tousAvis.Count;

            await _ctx.SaveChangesAsync();
            return Ok(new AvisDto { IdAvis = avis.IdAvis, NomAuteur = avis.NomAuteur, Note = avis.Note, Commentaire = avis.Commentaire, DateAvis = avis.DateAvis });
        }

        // POST api/marketplace/produits  [Admin]
        [HttpPost]
        public async Task<ActionResult<ProduitDto>> CreateProduit([FromBody] CreateProduitDto dto)
        {
            var p = new Produit
            {
                Nom = dto.Nom,
                Description = dto.Description,
                Categorie = dto.Categorie,
                Prix = dto.Prix,
                Unite = dto.Unite,
                StockDisponible = dto.StockDisponible,
                ImageUrl = dto.ImageUrl,
                Fabricant = dto.Fabricant,
                NumeroAMM = dto.NumeroAMM,
                CulturesCompatibles = dto.CulturesCompatibles,
                MatieresActives = dto.MatieresActives,
                EstEnPromotion = dto.EstEnPromotion,
                PrixPromo = dto.PrixPromo
            };
            _ctx.Produits.Add(p);
            await _ctx.SaveChangesAsync();
            return CreatedAtAction(nameof(GetProduit), new { id = p.IdProduit }, ToDto(p));
        }

        // PUT api/marketplace/produits/{id}  [Admin]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduit(int id, [FromBody] CreateProduitDto dto)
        {
            var p = await _ctx.Produits.FindAsync(id);
            if (p == null) return NotFound();
            p.Nom = dto.Nom; p.Description = dto.Description; p.Categorie = dto.Categorie;
            p.Prix = dto.Prix; p.Unite = dto.Unite; p.StockDisponible = dto.StockDisponible;
            p.ImageUrl = dto.ImageUrl; p.Fabricant = dto.Fabricant; p.NumeroAMM = dto.NumeroAMM;
            p.CulturesCompatibles = dto.CulturesCompatibles; p.MatieresActives = dto.MatieresActives;
            p.EstEnPromotion = dto.EstEnPromotion; p.PrixPromo = dto.PrixPromo;
            await _ctx.SaveChangesAsync();
            return Ok(ToDto(p));
        }

        // DELETE api/marketplace/produits/{id}  [Admin]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduit(int id)
        {
            var p = await _ctx.Produits.FindAsync(id);
            if (p == null) return NotFound();
            p.EstActif = false; // soft delete
            await _ctx.SaveChangesAsync();
            return NoContent();
        }

        // GET api/marketplace/produits/categories
        [HttpGet("categories")]
        public async Task<ActionResult<List<string>>> GetCategories()
        {
            var cats = await _ctx.Produits
                .Where(p => p.EstActif)
                .Select(p => p.Categorie)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();
            return Ok(cats);
        }

        private static ProduitDto ToDto(Produit p) => new()
        {
            IdProduit = p.IdProduit,
            Nom = p.Nom,
            Description = p.Description,
            Categorie = p.Categorie,
            Prix = p.Prix,
            PrixPromo = p.PrixPromo,
            EstEnPromotion = p.EstEnPromotion,
            Unite = p.Unite,
            StockDisponible = p.StockDisponible,
            ImageUrl = p.ImageUrl,
            Fabricant = p.Fabricant,
            NumeroAMM = p.NumeroAMM,
            CulturesCompatibles = p.CulturesCompatibles,
            MatieresActives = p.MatieresActives,
            NoteMoyenne = p.NoteMoyenne,
            NombreAvis = p.NombreAvis,
            DateAjout = p.DateAjout
        };
    }
}