import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role?: string;
  telephone?: string;
  localisation?: string;
  estActif: boolean;
  dateCreation: Date;
  agriculteurId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UtilisateurService {
  private apiUrl = `http://localhost:5160/api/admin/users`;   // ✅ Modifié; // ou créez l'endpoint correspondant

  constructor(private http: HttpClient) {}

  getAll(): Observable<Utilisateur[]> {
    return this.http.get<Utilisateur[]>(this.apiUrl);
  }

  getById(id: number): Observable<Utilisateur> {
    return this.http.get<Utilisateur>(`${this.apiUrl}/${id}`);
  }

  create(user: Partial<Utilisateur>): Observable<Utilisateur> {
    return this.http.post<Utilisateur>(this.apiUrl, user);
  }

  update(id: number, user: Partial<Utilisateur>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, user);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
