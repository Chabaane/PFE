namespace AgricultureApp.Models
{
    public class LeafAnalysisRequest
    {
        public string ImageBase64 { get; set; } = string.Empty;
        public string Culture { get; set; }
        public string Region { get; set; }
    }
}