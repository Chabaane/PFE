namespace AgricultureApp.Models
{
    public class DiagnosticResult
    {
        public bool estSaine { get; set; }
        public string maladie { get; set; }
        public string nomScientifique { get; set; }
        public string gravite { get; set; }
        public double confiance { get; set; }
        public string description { get; set; }
        public string[] causesFrequentes { get; set; }
        public Traitements traitements { get; set; }
        public string[] prevention { get; set; }
        public string conditionsMeteo { get; set; }
        public string[] culturesConcernees { get; set; }
    }

    public class Traitements
    {
        public string[] bio { get; set; }
        public string[] conventionnel { get; set; }
        public string urgence { get; set; }
    }
}