// services/api/ferme.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Parcelle } from './parcelle.service';

export interface Ferme {
  id: number;
  nom: string;
  agriculteurId: number;
  localisation?: string;
  gouvernorat?: string;
  delegation?: string;
  superficieTotale: number;
  nombreParcelles: number;
  dateCreation: Date;
  description?: string;
  couleur?: string;
}

export interface FermeDetail extends Ferme {
  parcelles: ParcelleSimplifiee[];
}

export interface ParcelleSimplifiee {
  geometrie: any;
  id: number;
  nom: string;
  surface: number;
  culture?: string;
  couleur: string;
  estSynchronise: boolean;
  altitudeMin?: number;
  altitudeMax?: number;
  altitudeMoyenne?: number;
  penteMoyenne?: number;
  classePente?: string;
  exposition?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FermeService {
  private apiUrl = 'http://localhost:5160/api/Fermes'; // À adapter selon votre API

  constructor(private http: HttpClient) {}

  // Récupérer toutes les fermes
  getAllFermes(): Observable<Ferme[]> {
    // Simulation - À remplacer par un vrai appel API
    return this.http.get<Ferme[]>(this.apiUrl).pipe(
      map(fermes => fermes.map(f => ({
        ...f,
        dateCreation: new Date(f.dateCreation)
      })))
    );
  }

  // Récupérer les fermes d'un agriculteur
  getFermesByAgriculteur(agriculteurId: number): Observable<Ferme[]> {
    return this.http.get<Ferme[]>(`${this.apiUrl}?agriculteurId=${agriculteurId}`).pipe(
      map(fermes => fermes.map(f => ({
        ...f,
        dateCreation: new Date(f.dateCreation)
      })))
    );
  }

  // Récupérer une ferme avec ses parcelles
  getFermeWithParcelles(fermeId: number): Observable<FermeDetail> {
    return this.http.get<FermeDetail>(`${this.apiUrl}/${fermeId}/details`).pipe(
      map(ferme => ({
        ...ferme,
        dateCreation: new Date(ferme.dateCreation)
      }))
    );
  }

  // Créer une nouvelle ferme
  createFerme(ferme: Partial<Ferme>): Observable<Ferme> {
    return this.http.post<Ferme>(this.apiUrl, ferme);
  }

  // Mettre à jour une ferme
  updateFerme(id: number, ferme: Partial<Ferme>): Observable<Ferme> {
    return this.http.put<Ferme>(`${this.apiUrl}/${id}`, ferme);
  }

  // Supprimer une ferme
  deleteFerme(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Assigner des parcelles à une ferme
  assignerParcelles(fermeId: number, parcelleIds: number[]): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${fermeId}/parcelles/assigner`, { parcelleIds });
  }

  // Retirer une parcelle d'une ferme
  retirerParcelle(fermeId: number, parcelleId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${fermeId}/parcelles/${parcelleId}`);
  }

  getParcellesByFerme(fermeId: number): Observable<Parcelle[]> {
    return this.http.get<Parcelle[]>(`${this.apiUrl}/${fermeId}/parcelles`);
  }

// Ajouter une parcelle à une ferme
  ajouterParcelleAFerme(fermeId: number, parcelleId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${fermeId}/parcelles/${parcelleId}`, {});
  }

  // Créer une parcelle directement dans une ferme
  createParcelleDansFerme(fermeId: number, parcelleData: any): Observable<Parcelle> {
    return this.http.post<Parcelle>(`${this.apiUrl}/${fermeId}/parcelles/creer`, parcelleData);
  }
}
