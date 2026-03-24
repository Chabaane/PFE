// services/terrain-analysis.service.ts
import { Injectable } from '@angular/core';
import { ElevationService, ElevationPoint } from './api/elevation.service';

export interface TerrainAnalysis {
  altitudeMin: number;
  altitudeMax: number;
  altitudeMoyenne: number;
  penteMoyenne: number;
  classePente: string;
  exposition: string;
  pointsElevation: ElevationPoint[];
}

@Injectable({
  providedIn: 'root'
})
export class TerrainAnalysisService {

  constructor(private elevationService: ElevationService) {}

  // Analyser le terrain d'un polygone
  async analyserTerrain(coordinates: Array<{lat: number, lng: number}>): Promise<TerrainAnalysis> {
    // Récupérer les altitudes pour tous les points
    const elevations = await this.elevationService.getMultipleElevations(coordinates).toPromise();

    if (!elevations || elevations.length === 0) {
      return this.getDefaultAnalysis();
    }

    // Calculer les statistiques
    const altitudes = elevations.map(e => e.elevation);
    const altitudeMin = Math.min(...altitudes);
    const altitudeMax = Math.max(...altitudes);
    const altitudeMoyenne = altitudes.reduce((a, b) => a + b, 0) / altitudes.length;

    // Calculer la pente entre points consécutifs
    const pentes: number[] = [];
    for (let i = 0; i < coordinates.length; i++) {
      const j = (i + 1) % coordinates.length;
      const p1 = elevations[i];
      const p2 = elevations[j];

      if (p1 && p2) {
        const distance = this.calculerDistance(p1.lat, p1.lng, p2.lat, p2.lng);
        const denivele = Math.abs(p2.elevation - p1.elevation);
        const pente = (denivele / distance) * 100; // Pente en pourcentage
        pentes.push(pente);
      }
    }

    const penteMoyenne = pentes.reduce((a, b) => a + b, 0) / pentes.length;
    const classePente = this.classifierPente(penteMoyenne);
    const exposition = this.calculerExposition(elevations);

    return {
      altitudeMin,
      altitudeMax,
      altitudeMoyenne,
      penteMoyenne,
      classePente,
      exposition,
      pointsElevation: elevations
    };
  }

  private calculerDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Rayon de la terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance en km
  }

  private classifierPente(pente: number): string {
    if (pente < 2) return 'Plat';
    if (pente < 5) return 'Léger';
    if (pente < 10) return 'Modéré';
    if (pente < 15) return 'Fort';
    return 'Très fort';
  }

  private calculerExposition(elevations: ElevationPoint[]): string {
    // Calcul simple basé sur la direction de la pente la plus raide
    if (elevations.length < 2) return 'Inconnue';

    let maxPente = 0;
    let direction = 0;

    for (let i = 0; i < elevations.length - 1; i++) {
      const p1 = elevations[i];
      const p2 = elevations[i + 1];
      const denivele = p2.elevation - p1.elevation;

      if (Math.abs(denivele) > maxPente) {
        maxPente = Math.abs(denivele);
        direction = Math.atan2(p2.lat - p1.lat, p2.lng - p1.lng) * 180 / Math.PI;
      }
    }

    if (direction < 0) direction += 360;

    if (direction >= 315 || direction < 45) return 'Nord';
    if (direction >= 45 && direction < 135) return 'Est';
    if (direction >= 135 && direction < 225) return 'Sud';
    return 'Ouest';
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  private getDefaultAnalysis(): TerrainAnalysis {
    return {
      altitudeMin: 0,
      altitudeMax: 0,
      altitudeMoyenne: 0,
      penteMoyenne: 0,
      classePente: 'Non disponible',
      exposition: 'Non disponible',
      pointsElevation: []
    };
  }
}
