// Services/ElevationCacheService.cs
using System.Collections.Concurrent;

namespace AgricultureApp.Services
{
    public class ElevationCacheService
    {
        private readonly ConcurrentDictionary<string, double> _cache = new();
        private readonly ConcurrentDictionary<string, DateTime> _cacheTime = new();
        private readonly TimeSpan _cacheDuration = TimeSpan.FromDays(7);

        public double? Get(double lat, double lng)
        {
            var key = $"{lat:F6},{lng:F6}";
            if (_cache.TryGetValue(key, out var elevation) &&
                _cacheTime.TryGetValue(key, out var cachedTime) &&
                DateTime.Now - cachedTime < _cacheDuration)
            {
                return elevation;
            }
            return null;
        }

        public void Set(double lat, double lng, double elevation)
        {
            var key = $"{lat:F6},{lng:F6}";
            _cache[key] = elevation;
            _cacheTime[key] = DateTime.Now;
        }
    }
}