using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("RolePermissions")]
    public class RolePermission
    {
        public int RoleId { get; set; }
        public int PermissionId { get; set; }

        [ForeignKey(nameof(RoleId))]
        public virtual Role Role { get; set; } = null!;

        [ForeignKey(nameof(PermissionId))]
        public virtual Permission Permission { get; set; } = null!;
    }
}