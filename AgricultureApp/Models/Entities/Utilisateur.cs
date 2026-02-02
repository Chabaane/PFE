using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("Utilisateurs")]
    public class Utilisateur
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Nom { get; set; } = string.Empty;

        [StringLength(100)]
        public string Prenom { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string MotDePasseHash { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Role { get; set; } = "AGRICULTEUR"; // Valeur par défaut

        public string? Telephone { get; set; }

        [StringLength(200)]
        public string? Localisation { get; set; }

        public DateTime DateCreation { get; set; } = DateTime.UtcNow;

        public DateTime? DerniereConnexion { get; set; }

        public bool EstActif { get; set; } = true;

        // Relation avec Agriculteur (si l'utilisateur est aussi agriculteur)
        public int? AgriculteurId { get; set; }
        public virtual Agriculteur? Agriculteur { get; set; }
    }

    // Rôles disponibles
    public static class UserRoles
    {
        public const string Admin = "ADMIN";
        public const string Agent = "AGENT";
        public const string Agriculteur = "AGRICULTEUR";
        public const string Observateur = "OBSERVATEUR";
    }
}