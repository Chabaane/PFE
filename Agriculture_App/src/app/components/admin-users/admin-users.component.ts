import { Component, OnInit } from '@angular/core';
import { AdminService, Role, Permission, Region } from 'src/app/services/admin.service';
import { UtilisateurService } from 'src/app/services/utilisateur.service';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit {
  users: any[] = [];
  selectedUserId: number | null = null;

  allRoles: Role[] = [];
  allPermissions: Permission[] = [];
  allRegions: Region[] = [];

  userRoles: Role[] = [];
  userDirectPermissions: Permission[] = [];
  userEffectivePermissions: string[] = [];
  userRegions: Region[] = [];

  loading = false;

  constructor(
    private adminService: AdminService,
    private userService: UtilisateurService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadReferenceData();
  }

  loadUsers() {
    this.userService.getAll().subscribe(users => this.users = users);
  }

  loadReferenceData() {
    forkJoin({
      roles: this.adminService.getRoles(),
      permissions: this.adminService.getPermissions(),
      regions: this.adminService.getAllRegions()
    }).subscribe(({ roles, permissions, regions }) => {
      this.allRoles = roles;
      this.allPermissions = permissions;
      this.allRegions = regions;
    });
  }

  selectUser(userId: number) {
    this.selectedUserId = userId;
    this.loadUserDetails(userId);
  }

  loadUserDetails(userId: number) {
    this.loading = true;
    forkJoin({
      roles: this.adminService.getUserRoles(userId),
      directPerms: this.adminService.getUserDirectPermissions(userId),
      effectivePerms: this.adminService.getEffectivePermissions(userId),
      regions: this.adminService.getUserRegions(userId)
    }).subscribe(({ roles, directPerms, effectivePerms, regions }) => {
      this.userRoles = roles;
      this.userDirectPermissions = directPerms;
      this.userEffectivePermissions = effectivePerms;
      this.userRegions = regions;
      this.loading = false;
    });
  }

  // Méthode pour vérifier si une région est attribuée à l'utilisateur
  hasRegionAccess(regionId: number): boolean {
    return this.userRegions?.some(r => r.id === regionId) ?? false;
  }

  assignRole(roleId: number) {
    if (!this.selectedUserId) return;
    this.adminService.assignRoleToUser(this.selectedUserId, roleId).subscribe(() => {
      this.loadUserDetails(this.selectedUserId!);
    });
  }

  removeRole(roleId: number) {
    if (!this.selectedUserId) return;
    this.adminService.removeRoleFromUser(this.selectedUserId, roleId).subscribe(() => {
      this.loadUserDetails(this.selectedUserId!);
    });
  }

  togglePermission(permissionId: number, grant: boolean) {
    if (!this.selectedUserId) return;
    const action = grant
      ? this.adminService.grantPermission(this.selectedUserId, permissionId)
      : this.adminService.revokePermission(this.selectedUserId, permissionId);
    action.subscribe(() => this.loadUserDetails(this.selectedUserId!));
  }

  toggleRegion(regionId: number, grant: boolean) {
    if (!this.selectedUserId) return;
    const action = grant
      ? this.adminService.grantRegion(this.selectedUserId, regionId)
      : this.adminService.revokeRegion(this.selectedUserId, regionId);
    action.subscribe(() => this.loadUserDetails(this.selectedUserId!));
  }

  grantAllPermissions() {
    if (!this.selectedUserId) return;
    const missingPerms = this.allPermissions.filter(
      p => !this.userEffectivePermissions.includes(p.code)
    );
    const requests = missingPerms.map(p =>
      this.adminService.grantPermission(this.selectedUserId!, p.id)
    );
    forkJoin(requests).subscribe(() => this.loadUserDetails(this.selectedUserId!));
  }
}
