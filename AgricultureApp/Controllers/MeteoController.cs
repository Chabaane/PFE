// Controllers/MeteoController.cs
using Microsoft.AspNetCore.Mvc;
using AgricultureApp.Services;

namespace AgricultureApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MeteoController : ControllerBase
    {
        private readonly IMeteoService _meteoService;
        private readonly ILogger<MeteoController> _logger;

        public MeteoController(IMeteoService meteoService, ILogger<MeteoController> logger)
        {
            _meteoService = meteoService;
            _logger = logger;
        }

        // GET: api/meteo/point?nom=PointA&lat=36.8&lon=10.18
        [HttpGet("point")]
        public async Task<ActionResult<MeteoPoint>> GetMeteoForPoint(
            [FromQuery] string nom,
            [FromQuery] double lat,
            [FromQuery] double lon)
        {
            var meteo = await _meteoService.GetMeteoForPoint(nom, lat, lon);
            return Ok(meteo);
        }

        // POST: api/meteo/point (pour les requêtes plus complexes)
        [HttpPost("point")]
        public async Task<ActionResult<MeteoPoint>> GetMeteoForPointPost([FromBody] PointRequest request)
        {
            var meteo = await _meteoService.GetMeteoForPoint(request.Nom, request.Lat, request.Lon);
            return Ok(meteo);
        }
    }

    public class PointRequest
    {
        public string Nom { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lon { get; set; }
    }
}