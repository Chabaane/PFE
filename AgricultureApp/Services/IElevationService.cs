// Services/IElevationService.cs
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AgricultureApp.Services
{
    public interface IElevationService
    {
        Task<double> GetElevation(double latitude, double longitude);
        Task<List<double>> GetElevations(List<(double lat, double lng)> points);
    }
}