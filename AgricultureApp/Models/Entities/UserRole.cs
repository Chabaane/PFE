using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("UserRoles")]
    public class UserRole
    {
        public int UserId { get; set; }
        public int RoleId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual Utilisateur User { get; set; } = null!;

        [ForeignKey(nameof(RoleId))]
        public virtual Role Role { get; set; } = null!;
    }
}