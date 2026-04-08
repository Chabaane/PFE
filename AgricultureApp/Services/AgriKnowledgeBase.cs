namespace AgricultureApp.Services
{
    public static class AgriKnowledgeBase
    {
        public static string GetKnowledge(string question)
        {
            question = question.ToLower();

            if (question.Contains("blé"))
                return "Le blé nécessite un sol bien drainé et une irrigation modérée.";

            if (question.Contains("olivier"))
                return "L'olivier résiste à la sécheresse mais bénéficie d'une irrigation contrôlée.";

            if (question.Contains("irrigation"))
                return "L'irrigation doit être adaptée au climat et au stade de croissance.";

            return "";
        }
    }
}