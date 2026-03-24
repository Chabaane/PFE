// services/api/elevation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';

export interface ElevationPoint {
  lat: number;
  lng: number;
  elevation: number;
}

export interface ElevationResponse {
  results: Array<{
    latitude: number;
    longitude: number;
    elevation: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ElevationService {
  // Option 1: Open-Elevation (gratuit, sans clé)
  private openElevationUrl = 'https://api.open-elevation.com/api/v1/lookup';

  // Option 2: OpenTopography (gratuit avec clé)
  private openTopographyUrl = 'https://api.opentopodata.org/v1/srtm30m';

  constructor(private http: HttpClient) {}

  // Récupérer l'altitude pour un point
  getElevation(lat: number, lng: number): Observable<number> {
    return this.http.get<ElevationResponse>(`${this.openElevationUrl}?locations=${lat},${lng}`)
      .pipe(map(response => response.results[0]?.elevation || 0));
  }

  // Récupérer les altitudes pour plusieurs points
  getMultipleElevations(points: Array<{lat: number, lng: number}>): Observable<ElevationPoint[]> {
    const locations = points.map(p => `${p.lat},${p.lng}`).join('|');
    return this.http.get<ElevationResponse>(`${this.openElevationUrl}?locations=${locations}`)
      .pipe(map(response => {
        return response.results.map((result, index) => ({
          lat: result.latitude,
          lng: result.longitude,
          elevation: result.elevation
        }));
      }));
  }
}
