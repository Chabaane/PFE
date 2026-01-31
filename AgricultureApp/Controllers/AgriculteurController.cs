using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using AgricultureApp.Models.DTOs;

namespace AgricultureApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AgriculteurController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AgriculteurController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/agriculteur
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Agriculteur>>> GetAgriculteurs()
        {
            return await _context.Agriculteurs.ToListAsync();
        }

        // GET: api/agriculteur/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Agriculteur>> GetAgriculteur(int id)
        {
            var agriculteur = await _context.Agriculteurs.FindAsync(id);

            if (agriculteur == null)
            {
                return NotFound();
            }

            return agriculteur;
        }

        // POST: api/agriculteur
        [HttpPost]
        public async Task<ActionResult<Agriculteur>> PostAgriculteur(Agriculteur agriculteur)
        {
            _context.Agriculteurs.Add(agriculteur);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAgriculteur), new { id = agriculteur.idAgriculteur }, agriculteur);
        }

        // PUT: api/agriculteur/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutAgriculteur(int id, [FromBody] AgriculteurUpdateDto model)
        {
            if (id <= 0)
            {
                return BadRequest("ID invalide");
            }

            var agriculteur = await _context.Agriculteurs.FindAsync(id);
            if (agriculteur == null)
            {
                return NotFound();
            }

            // Mettre à jour les propriétés
            if (!string.IsNullOrWhiteSpace(model.Nom))
                agriculteur.Nom = model.Nom;

            if (!string.IsNullOrWhiteSpace(model.Prenom))
                agriculteur.Prenom = model.Prenom;

            agriculteur.Telephone = model.Telephone ?? agriculteur.Telephone;
            agriculteur.Localisation = model.Localisation ?? agriculteur.Localisation;

            try
            {
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AgriculteurExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
        }

        // DELETE: api/agriculteur/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAgriculteur(int id)
        {
            var agriculteur = await _context.Agriculteurs.FindAsync(id);
            if (agriculteur == null)
            {
                return NotFound();
            }

            _context.Agriculteurs.Remove(agriculteur);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool AgriculteurExists(int id)
        {
            return _context.Agriculteurs.Any(e => e.idAgriculteur == id);
        }
    }
}