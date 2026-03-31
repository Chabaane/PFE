// elevation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AltitudePoint {
  lat: number;
  lng: number;
  altitude: number;
}

export interface BatchElevationRequest {
  coordinates: Array<{ lat: number; lng: number }>;
}

export interface BatchElevationResponse {
  results: Array<{ elevation: number }>;
}

@Injectable({ providedIn: 'root' })
export class ElevationService {
  // URL de votre backend .NET
  private apiUrl = 'http://localhost:5160/api/Elevations';

  constructor(private http: HttpClient) {}

  /**
   * Récupère l'altitude pour un point unique
   */
  async getElevation(lat: number, lng: number): Promise<number> {
    try {
      const params = new HttpParams()
        .set('lat', lat.toString())
        .set('lng', lng.toString());

      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/get`, { params })
      );

      // Extraire l'altitude (l'API retourne { elevation, source })
      let elevation = 0;
      if (typeof response === 'number') {
        elevation = response;
      } else if (response && typeof response === 'object') {
        elevation = response.elevation || response.value || 0;
      }

      return elevation;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'altitude:', error);
      return 0;
    }
  }

  /**
   * Récupère les altitudes pour plusieurs points en une seule requête batch
   */
  async getMultipleElevations(points: { lat: number; lng: number }[]): Promise<AltitudePoint[]> {
    if (!points || points.length === 0) {
      return [];
    }

    try {
      const request: BatchElevationRequest = {
        coordinates: points.map(p => ({ lat: p.lat, lng: p.lng }))
      };

      const response = await firstValueFrom(
        this.http.post<BatchElevationResponse>(`${this.apiUrl}/batch`, request)
      );

      // Mapper les résultats avec les points d'origine
      const results: AltitudePoint[] = [];
      for (let i = 0; i < points.length && i < response.results.length; i++) {
        results.push({
          lat: points[i].lat,
          lng: points[i].lng,
          altitude: response.results[i].elevation
        });
      }

      return results;
    } catch (error) {
      console.error('Erreur batch elevation:', error);

      // Fallback: requêtes individuelles
      const results: AltitudePoint[] = [];
      for (const point of points) {
        const altitude = await this.getElevation(point.lat, point.lng);
        results.push({ ...point, altitude });
      }
      return results;
    }
  }

  /**
   * Version alternative avec traitement par lots si le backend ne supporte pas le batch
   */
  async getMultipleElevationsByBatch(
    points: { lat: number; lng: number }[],
    batchSize: number = 20
  ): Promise<AltitudePoint[]> {
    const results: AltitudePoint[] = [];

    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      const batchResults = await this.getMultipleElevations(batch);
      results.push(...batchResults);

      // Petit délai entre les lots
      if (i + batchSize < points.length) {
        await this.delay(200);
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
