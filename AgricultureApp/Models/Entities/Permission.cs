using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("Permissions")]
    public class Permission
    {
        [Key]
        public int Id { get; set; }

        [Required, StringLength(100)]
        public string Code { get; set; } = string.Empty; // ex: "users.create", "regions.view.nord"

        [Required, StringLength(200)]
        public string Libelle { get; set; } = string.Empty;

        [StringLength(50)]
        public string? Categorie { get; set; } // ex: "Utilisateurs", "Parcelles", "Rapports"

        // Navigation
        public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
        public virtual ICollection<UserPermission> UserPermissions { get; set; } = new List<UserPermission>();
    }
}