using System.ComponentModel.DataAnnotations;

namespace AgricultureApp.Models.DTOs
{
    public class LoginDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string MotDePasse { get; set; } = string.Empty;
    }

    public class RegisterDto
    {
        [Required]
        public string Nom { get; set; } = string.Empty;

        [Required]
        public string Prenom { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string MotDePasse { get; set; } = string.Empty;

        [Compare("MotDePasse")]
        public string ConfirmMotDePasse { get; set; } = string.Empty;

        public string? Telephone { get; set; }
        public string? Localisation { get; set; }
        public string Role { get; set; } = Models.Entities.UserRoles.Agriculteur;
    }

    public class AuthResponseDto
    {
        public int Id { get; set; }
        public string Nom { get; set; } = string.Empty;
        public string Prenom { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? Token { get; set; }
        public DateTime Expiration { get; set; }
    }
}