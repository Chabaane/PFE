import 'tslib';
// services/api/parcelle.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { IndexedDbService } from './indexed-db.service';

export interface Parcelle {
  fermeId: any;
  id: number;
  nom: string;
  description?: string;
  agriculteurId: number;
  surface: number;
  couleur: string;
  latitude: number;
  longitude: number;
  gouvernorat?: string;
  delegation?: string;
  secteur?: string;
  culture?: string;
  datePlantation?: Date;
  dateRecolte?: Date;
  geometrie?: string; // GeoJSON
  dateCreation: Date;
  dateModification?: Date;
  estSynchronise: boolean;
  altitudeMin?: number;
  altitudeMax?: number;
  altitudeMoyenne?: number;
  penteMoyenne?: number;
  classePente?: string;
  exposition?: string;
}

export interface DessinParcelleDto {
  nom?: string;
  description?: string;
  surface: number;
  couleur: string;
  latitude: number;
  longitude: number;
  gouvernorat?: string;
  delegation?: string;
  secteur?: string;
  culture?: string;
  datePlantation?: Date;
  dateRecolte?: Date;
  geometrie?: string;
}

export interface Coordonnee {
  lat: number;
  lng: number;
}

@Injectable({
  providedIn: 'root'
})
export class ParcelleService {
  private apiUrl = 'http://localhost:5160/api/parcelles';

  constructor(
    private http: HttpClient,
    private indexedDb: IndexedDbService
  ) {}

  // Récupérer les parcelles d'un agriculteur
  getParcellesByAgriculteur(agriculteurId: number): Observable<Parcelle[]> {
    return this.http.get<Parcelle[]>(`${this.apiUrl}/agriculteur/${agriculteurId}`).pipe(
      catchError(error => {
        console.error('Erreur API, tentative de récupération offline', error);
        return this.getParcellesOffline(agriculteurId);
      })
    );
  }

  // Créer une parcelle
  createParcelle(agriculteurId: number, dto: DessinParcelleDto): Observable<Parcelle> {
    return this.http.post<Parcelle>(`${this.apiUrl}/agriculteur/${agriculteurId}`, dto).pipe(
      catchError(error => {
        console.error('Erreur API, sauvegarde offline', error);
        return this.saveParcelleOffline(agriculteurId, dto);
      })
    );
  }

  // Synchroniser les données offline
  synchroniserParcelles(): Observable<any> {
    return from(this.synchroniserOfflineData());
  }

  // Sauvegarder en local (IndexedDB)
  private async saveParcelleOffline(agriculteurId: number, dto: DessinParcelleDto): Promise<Parcelle> {
    const parcelle: Parcelle = {
      id: Date.now(), // ID temporaire
      nom: dto.nom || `Parcelle ${new Date().toLocaleString()}`,
      description: dto.description,
      agriculteurId,
      surface: dto.surface,
      couleur: dto.couleur,
      latitude: dto.latitude,
      longitude: dto.longitude,
      gouvernorat: dto.gouvernorat,
      delegation: dto.delegation,
      secteur: dto.secteur,
      culture: dto.culture,
      datePlantation: dto.datePlantation,
      dateRecolte: dto.dateRecolte,
      geometrie: dto.geometrie,
      dateCreation: new Date(),
      estSynchronise: false,
      fermeId: undefined
    };

    await this.indexedDb.ajouterParcelle(parcelle);
    return parcelle;
  }

  // Récupérer du local
  private async getParcellesOffline(agriculteurId: number): Promise<Parcelle[]> {
    const parcelles = await this.indexedDb.getParcelles();
    return parcelles.filter(p => p.agriculteurId === agriculteurId);
  }

  // Synchronisation
  private async synchroniserOfflineData(): Promise<any> {
    const parcellesOffline = await this.indexedDb.getParcellesOffline();

    if (parcellesOffline.length === 0) {
      return { message: 'Aucune donnée à synchroniser' };
    }

    try {
      const response = await this.http.post(`${this.apiUrl}/synchroniser`, parcellesOffline).toPromise();

      // Marquer comme synchronisé
      for (const parcelle of parcellesOffline) {
        parcelle.estSynchronise = true;
        parcelle.dateModification = new Date();
        await this.indexedDb.mettreAJourParcelle(parcelle);
      }

      return response;
    } catch (error) {
      console.error('Échec de la synchronisation', error);
      throw error;
    }
  }

  deleteParcelle(parcelleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${parcelleId}`).pipe(
      catchError(error => {
        console.error('Erreur API lors de la suppression', error);
        return of({ success: false, message: 'Échec de la suppression' });
      })
    );
  }

  getAllParcelles(): Observable<Parcelle[]> {
    // Utilisez l'endpoint correct
    return this.http.get<Parcelle[]>(`${this.apiUrl}/all`).pipe(
      catchError(error => {
        console.error('Erreur récupération parcelles:', error);
        return from(this.indexedDb.getParcelles());
      })
    );
  }

}
