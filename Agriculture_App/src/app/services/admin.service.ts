import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment'
export interface Role {
  id: number;
  nom: string;
  description?: string;
}

export interface Permission {
  id: number;
  code: string;
  libelle: string;
  categorie?: string;
}

export interface Region {
  id: number;
  nom: string;
  code?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = `http://localhost:5160/api/admin`;

  constructor(private http: HttpClient) {}
  // Récupérer la liste de toutes les régions
    getAllRegions(): Observable<Region[]> {
      return this.http.get<Region[]>(`${this.apiUrl}/regions`);
    }

  // Rôles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/roles`);
  }
  createRole(role: Partial<Role>): Observable<Role> {
    return this.http.post<Role>(`${this.apiUrl}/roles`, role);
  }
  updateRole(id: number, role: Partial<Role>): Observable<Role> {
    return this.http.put<Role>(`${this.apiUrl}/roles/${id}`, role);
  }
  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/roles/${id}`);
  }

  // Permissions
  getPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/permissions`);
  }

  // Rôles d'un utilisateur
  getUserRoles(userId: number): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/users/${userId}/roles`);
  }
  assignRoleToUser(userId: number, roleId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/users/${userId}/roles`, roleId);
  }
  removeRoleFromUser(userId: number, roleId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}/roles/${roleId}`);
  }

  // Permissions directes
  getUserDirectPermissions(userId: number): Observable<Permission[]> {
    return this.http.get<Permission[]>(`${this.apiUrl}/users/${userId}/permissions/direct`);
  }
  grantPermission(userId: number, permissionId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/users/${userId}/permissions`, permissionId);
  }
  revokePermission(userId: number, permissionId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}/permissions/${permissionId}`);
  }

  // Régions
  getUserRegions(userId: number): Observable<Region[]> {
    return this.http.get<Region[]>(`${this.apiUrl}/users/${userId}/regions`);
  }
  grantRegion(userId: number, regionId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/users/${userId}/regions`, regionId);
  }
  revokeRegion(userId: number, regionId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}/regions/${regionId}`);
  }

  // Permissions effectives (toutes)
  getEffectivePermissions(userId: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/users/${userId}/permissions/effective`);
  }
}
