using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("Utilisateurs")]
    public class Utilisateur
    {
        [Key]
        public int IdUtilisateur { get; set; }

        [Required]
        [StringLength(100)]
        public string Nom { get; set; }

        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; }

        [Required]
        public string MotDePasseHash { get; set; }

        [StringLength(50)]
        public string Role { get; set; } = "Agent"; // "Admin", "Agent", "Agriculteur"

        public DateTime DateInscription { get; set; }
    }
}