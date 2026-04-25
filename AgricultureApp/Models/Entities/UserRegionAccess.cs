using System.ComponentModel.DataAnnotations.Schema;

namespace AgricultureApp.Models.Entities
{
    [Table("UserRegionAccesses")]
    public class UserRegionAccess
    {
        public int UserId { get; set; }
        public int RegionId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual Utilisateur User { get; set; } = null!;

        [ForeignKey(nameof(RegionId))]
        public virtual Region Region { get; set; } = null!;
    }
}