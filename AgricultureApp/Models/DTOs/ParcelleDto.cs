using System;

namespace AgricultureApp.Models.DTOs
{
    public class ParcelleDto
    {
        public int Id { get; set; }
        public string Nom { get; set; }
        public string Description { get; set; }
        public int AgriculteurId { get; set; }
        public decimal Surface { get; set; }
        public string Couleur { get; set; }
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public string Gouvernorat { get; set; }
        public string Delegation { get; set; }
        public string Secteur { get; set; }
        public string Culture { get; set; }
        public DateTime? DatePlantation { get; set; }
        public DateTime? DateRecolte { get; set; }
        public string Geometrie { get; set; }
        public DateTime DateCreation { get; set; }
        public DateTime? DateModification { get; set; }
        public bool EstSynchronise { get; set; }
        public int? FermeId { get; set; } // Ajoutez cette propriété
        public int? RegionId { get; set; }
    }
}