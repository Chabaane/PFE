// Controllers/AgriculteurController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using AgricultureApp.Models.DTOs;

namespace AgricultureApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Authentification requise
    public class AgriculteurController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AgriculteurController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Agriculteur>>> GetAgriculteurs()
        {
            // Optionnel : vous pouvez restreindre l'accès selon les permissions
            // Exemple : if (!User.HasClaim(c => c.Type == "permission" && c.Value == "agriculteurs.view")) return Forbid();
            return await _context.Agriculteurs.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Agriculteur>> GetAgriculteur(int id)
        {
            var agriculteur = await _context.Agriculteurs.FindAsync(id);
            if (agriculteur == null) return NotFound();
            return agriculteur;
        }

        [HttpPost]
        [Authorize(Policy = "AgentOrAdmin")] // Exemple de restriction par rôle
        public async Task<ActionResult<Agriculteur>> PostAgriculteur(Agriculteur agriculteur)
        {
            _context.Agriculteurs.Add(agriculteur);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAgriculteur), new { id = agriculteur.idAgriculteur }, agriculteur);
        }

        [HttpPut("{id}")]
        [Authorize(Policy = "AgentOrAdmin")]
        public async Task<IActionResult> PutAgriculteur(int id, [FromBody] AgriculteurUpdateDto model)
        {
            if (id <= 0) return BadRequest("ID invalide");

            var agriculteur = await _context.Agriculteurs.FindAsync(id);
            if (agriculteur == null) return NotFound();

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
                if (!AgriculteurExists(id)) return NotFound();
                throw;
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> DeleteAgriculteur(int id)
        {
            var agriculteur = await _context.Agriculteurs.FindAsync(id);
            if (agriculteur == null) return NotFound();

            _context.Agriculteurs.Remove(agriculteur);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private bool AgriculteurExists(int id) => _context.Agriculteurs.Any(e => e.idAgriculteur == id);
    }
}