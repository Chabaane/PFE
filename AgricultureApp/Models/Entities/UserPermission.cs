using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("UserPermissions")]
    public class UserPermission
    {
        public int UserId { get; set; }
        public int PermissionId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual Utilisateur User { get; set; } = null!;

        [ForeignKey(nameof(PermissionId))]
        public virtual Permission Permission { get; set; } = null!;
    }
}