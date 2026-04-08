using System.Collections.Concurrent;

namespace AgricultureApp.Services
{
    public class ChatMemoryService
    {
        private readonly ConcurrentDictionary<string, List<string>> _memory = new();

        public void Add(string sessionId, string message)
        {
            var history = _memory.GetOrAdd(sessionId, _ => new List<string>());
            history.Add(message);

            if (history.Count > 10)
                history.RemoveAt(0);
        }

        public string GetContext(string sessionId)
        {
            if (_memory.TryGetValue(sessionId, out var history))
            {
                return string.Join("\n", history);
            }
            return "";
        }
    }
}