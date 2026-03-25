// Controllers/ElevationController.cs
using Microsoft.AspNetCore.Mvc;
using AgricultureApp.Services;
using System.Collections.Generic;
using System.Threading.Tasks; 

namespace AgricultureApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ElevationController : ControllerBase
    {
        private readonly IElevationService _elevationService;

        public ElevationController(IElevationService elevationService)
        {
            _elevationService = elevationService;
        }

        [HttpPost("lookup")]
        public async Task<ActionResult<object>> GetElevations([FromBody] ElevationRequest request)
        {
            if (request?.Locations == null || request.Locations.Count == 0)
            {
                return BadRequest("Aucun point spécifié");
            }

            var points = new List<(double lat, double lng)>();
            foreach (var loc in request.Locations)
            {
                points.Add((loc.Latitude, loc.Longitude));
            }

            var elevations = await _elevationService.GetElevations(points);

            var results = new List<ElevationResult>();
            for (int i = 0; i < elevations.Count; i++)
            {
                results.Add(new ElevationResult
                {
                    Elevation = elevations[i],
                    Latitude = request.Locations[i].Latitude,
                    Longitude = request.Locations[i].Longitude
                });
            }

            return Ok(new { results });
        }

        [HttpGet("point")]
        public async Task<ActionResult<double>> GetElevation(double lat, double lng)
        {
            var elevation = await _elevationService.GetElevation(lat, lng);
            return Ok(new { elevation });
        }
    }

    public class ElevationRequest
    {
        public List<LocationPoint> Locations { get; set; } = new();
    }

    public class LocationPoint
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }

    public class ElevationResult
    {
        public double Elevation { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}