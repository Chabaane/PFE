// services/api/elevation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface ElevationPoint {
  lat: number;
  lng: number;
  elevation: number;
}

@Injectable({
  providedIn: 'root'
})
export class ElevationService {
  private openElevationUrl = 'https://api.open-elevation.com/api/v1/lookup';

  constructor(private http: HttpClient) {}

  // services/api/elevation.service.ts - Version réelle
  getMultipleElevations(points: Array<{lat: number, lng: number}>): Observable<ElevationPoint[]> {
  const locations = points.map(p => `${p.lat},${p.lng}`).join('|');
  const url = `${this.openElevationUrl}?locations=${locations}`;

  console.log('Appel API altitude:', url);

  return this.http.get<any>(url).pipe(
    map(response => {
      console.log('Réponse API brute:', response);
      if (response && response.results) {
        return response.results.map((result: any) => ({
          lat: result.latitude,
          lng: result.longitude,
          elevation: result.elevation
        }));
      }
      return [];

    })
  );
  }

}
