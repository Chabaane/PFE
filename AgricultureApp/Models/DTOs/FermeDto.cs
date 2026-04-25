using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

// DTOs/FermeDto.cs
namespace AgricultureApp.Models.DTOs
{
    public class FermeDto
    {
        public int Id { get; set; }
        public string Nom { get; set; }
        public int AgriculteurId { get; set; }
        public string Gouvernorat { get; set; }
        public string Delegation { get; set; }
        public string Secteur { get; set; }
        public string Description { get; set; }
        public string Couleur { get; set; }
        public int NombreParcelles { get; set; }
        public decimal SuperficieTotale { get; set; }
        public DateTime DateCreation { get; set; }
        public int? RegionId { get; set; }
    }

    public class FermeDetailDto : FermeDto
    {
        public List<ParcelleSimplifieeDto> Parcelles { get; set; }
    }

    public class ParcelleSimplifieeDto
    {
        public int Id { get; set; }
        public string Nom { get; set; }
        public decimal Surface { get; set; }
        public string Culture { get; set; }
        public string Couleur { get; set; }
        public bool EstSynchronise { get; set; }
        public decimal? AltitudeMin { get; set; }
        public decimal? AltitudeMax { get; set; }
        public decimal? AltitudeMoyenne { get; set; }
        public decimal? PenteMoyenne { get; set; }
        public string ClassePente { get; set; }
        public string Exposition { get; set; }
    }

    public class CreateFermeDto
    {
        [Required]
        public string Nom { get; set; } = string.Empty;  // Valeur par défaut

        [Required]
        public int AgriculteurId { get; set; }

        public string? Gouvernorat { get; set; }  // Ajouter ? pour nullable
        public string? Delegation { get; set; }   // Ajouter ? pour nullable
        public string? Secteur { get; set; }      // Ajouter ? pour nullable
        public string? Description { get; set; }  // Ajouter ? pour nullable
        public string? Couleur { get; set; }      // Ajouter ? pour nullable
        public int? RegionId { get; set; }
    }

    public class UpdateFermeDto
    {
        public string Nom { get; set; }
        public string Gouvernorat { get; set; }
        public string Delegation { get; set; }
        public string Secteur { get; set; }
        public string Description { get; set; }
        public string Couleur { get; set; }
        public int? RegionId { get; set; }
    }

    public class AssignerParcellesDto
    {
        [Required]
        public List<int> ParcelleIds { get; set; }
    }
}