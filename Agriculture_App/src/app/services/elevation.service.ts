// elevation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ElevationService {
  // Assurez-vous que le nom du contrôleur est correct
  private apiUrl = 'http://localhost:5160/api/Elevations';

  constructor(private http: HttpClient) {}

  async getElevation(lat: number, lng: number): Promise<number> {
    try {
      const params = new HttpParams()
        .set('lat', lat.toString())
        .set('lng', lng.toString());

      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/get`, { params })
      );

      console.log('Réponse API:', response);

      // Extraire l'altitude
      let elevation = 0;
      if (typeof response === 'number') {
        elevation = response;
      } else if (response && typeof response === 'object') {
        elevation = response.elevation || response.value || response.altitude || 0;
      }

      console.log(`Altitude pour (${lat}, ${lng}): ${elevation}m`);
      return elevation || 0;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'altitude:', error);
      return 0;
    }
  }

  async getMultipleElevations(coordinates: Array<{lat: number, lng: number}>): Promise<number[]> {
    const elevations: number[] = [];

    // Traiter par lots de 10 pour améliorer les performances
    const batchSize = 10;
    for (let i = 0; i < coordinates.length; i += batchSize) {
      const batch = coordinates.slice(i, i + batchSize);
      const batchPromises = batch.map(coord => this.getElevation(coord.lat, coord.lng));
      const batchResults = await Promise.all(batchPromises);
      elevations.push(...batchResults);

      // Petit délai entre les lots
      if (i + batchSize < coordinates.length) {
        await this.delay(100);
      }
    }

    return elevations;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
