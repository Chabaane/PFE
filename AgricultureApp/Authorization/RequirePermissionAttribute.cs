using Microsoft.AspNetCore.Authorization;

namespace AgricultureApp.Authorization
{
    public class RequirePermissionAttribute : AuthorizeAttribute
    {
        private const string POLICY_PREFIX = "Permission_";

        public RequirePermissionAttribute(string permission) : base(POLICY_PREFIX + permission)
        {
            Permission = permission;
        }

        public string Permission { get; }
    }
}