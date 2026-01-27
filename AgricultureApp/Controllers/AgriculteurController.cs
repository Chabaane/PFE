using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

namespace AgricultureApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AgriculteurController : ControllerBase
    {
        // GET: api/agriculteur
        [HttpGet]
        public IActionResult GetAgriculteurs()
        {
            var agriculteurs = new[]
            {
                new { Id = 1, Nom = "Dupont", Prenom = "Jean", Telephone = "12345678", Localisation = "Tunis" },
                new { Id = 2, Nom = "Martin", Prenom = "Pierre", Telephone = "87654321", Localisation = "Sousse" },
                new { Id = 3, Nom = "Ben Ali", Prenom = "Mohamed", Telephone = "11223344", Localisation = "Sfax" }
            };

            return Ok(agriculteurs);
        }

        // GET: api/agriculteur/5
        [HttpGet("{id}")]
        public IActionResult GetAgriculteur(int id)
        {
            var agriculteur = new
            {
                Id = id,
                Nom = "Test",
                Prenom = "Agriculteur",
                Telephone = "00000000",
                Localisation = "Test Location"
            };

            return Ok(agriculteur);
        }
    }
}