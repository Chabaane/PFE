using AgricultureApp.Controllers.AI;

namespace AgricultureApp.Services
{
    public static class AgriRuleEngine
    {
        public static string Evaluate(AiChatRequest r)
        {
            if (r.NDVI < 0.3)
                return "?? Stress critique : irrigation + fertilisation urgente.";

            if (r.NDVI < 0.5)
                return "?? Stress modéré : surveiller eau et nutriments.";

            if (r.Temperature > 35)
                return "?? Température élevée : irriguer tôt le matin.";

            if (r.Humidity < 30)
                return "?? Humidité faible : irrigation recommandée.";

            return null;
        }
    }
}