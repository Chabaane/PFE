// Controllers/FermesController.cs
using Microsoft.AspNetCore.Mvc;
using AgricultureApp.Models.DTOs;
using AgricultureApp.Services;
using AgricultureApp.Models.Entities;


namespace AgricultureApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FermesController : ControllerBase
    {
        private readonly IFermeService _fermeService;

        public FermesController(IFermeService fermeService)
        {
            _fermeService = fermeService;
        }

        [HttpGet]
        public async Task<ActionResult<List<FermeDto>>> GetAllFermes()
        {
            var fermes = await _fermeService.GetAllFermes();
            return Ok(fermes);
        }

        [HttpGet("agriculteur/{agriculteurId}")]
        public async Task<ActionResult<List<FermeDto>>> GetFermesByAgriculteur(int agriculteurId)
        {
            var fermes = await _fermeService.GetFermesByAgriculteur(agriculteurId);
            return Ok(fermes);
        }

        [HttpGet("{id}/details")]
        public async Task<ActionResult<FermeDetailDto>> GetFermeWithParcelles(int id)
        {
            var ferme = await _fermeService.GetFermeWithParcelles(id);
            if (ferme == null)
                return NotFound();

            return Ok(ferme);
        }

        // Controllers/FermesController.cs
        [HttpPost]
        public async Task<ActionResult<FermeDto>> CreateFerme([FromBody] CreateFermeDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var ferme = await _fermeService.CreateFerme(dto);
                return CreatedAtAction(nameof(GetFermeWithParcelles), new { id = ferme.Id }, ferme);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<FermeDto>> UpdateFerme(int id, [FromBody] UpdateFermeDto dto)
        {
            var ferme = await _fermeService.UpdateFerme(id, dto);
            if (ferme == null)
                return NotFound();

            return Ok(ferme);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFerme(int id)
        {
            var result = await _fermeService.DeleteFerme(id);
            if (!result)
                return NotFound();

            return NoContent();
        }

        [HttpPost("{id}/parcelles/assigner")]
        public async Task<IActionResult> AssignerParcelles(int id, [FromBody] AssignerParcellesDto dto)
        {
            var result = await _fermeService.AssignerParcelles(id, dto.ParcelleIds);
            if (!result)
                return BadRequest("Impossible d'assigner les parcelles");

            return Ok();
        }

        [HttpDelete("{id}/parcelles/{parcelleId}")]
        public async Task<IActionResult> RetirerParcelle(int id, int parcelleId)
        {
            var result = await _fermeService.RetirerParcelle(id, parcelleId);
            if (!result)
                return NotFound();

            return NoContent();
        }
        [HttpGet("{id}/parcelles")]
        public async Task<ActionResult<List<ParcelleSimplifieeDto>>> GetParcellesByFerme(int id)
        {
            var parcelles = await _fermeService.GetParcellesByFerme(id);
            return Ok(parcelles);
        }

        [HttpPost("{id}/parcelles/creer")]
        public async Task<ActionResult<Parcelle>> CreateParcelleDansFerme(int id, [FromBody] DessinParcelleDto dto)
        {
            var parcelle = await _fermeService.CreateParcelleDansFerme(id, dto);
            if (parcelle == null)
                return NotFound("Ferme non trouvée");

            return CreatedAtAction(nameof(GetParcellesByFerme), new { id }, parcelle);
        }
    }
}