// services/terrain-analysis.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TerrainAnalysisService {
  private apiUrl = 'http://localhost:5160/api'; // Votre backend

  constructor(private http: HttpClient) {}

  getAltitude(lat: number, lng: number): Observable<number> {
    console.log(`🌍 Appel altitude: ${lat}, ${lng}`);
    return this.http.get<{ elevation: number }>(`${this.apiUrl}/elevation/point?lat=${lat}&lng=${lng}`)
      .pipe(
        map(response => {
          console.log(`📊 Altitude reçue: ${response.elevation} m`);
          return response.elevation;
        })
      );
  }

  getAltitudes(points: Array<{ lat: number, lng: number }>): Observable<number[]> {
    const locations = points.map(p => ({ latitude: p.lat, longitude: p.lng }));
    return this.http.post<{ results: Array<{ elevation: number }> }>(`${this.apiUrl}/elevation/lookup`, { locations })
      .pipe(
        map(response => {
          const altitudes = response.results.map(r => r.elevation);
          console.log(`📊 Altitudes reçues: ${altitudes.length} points, moy: ${altitudes.reduce((a,b)=>a+b,0)/altitudes.length}`);
          return altitudes;
        })
      );
  }

  async analyserTerrain(points: Array<{lat: number, lng: number}>): Promise<any> {
    if (points.length === 0) {
      return this.getDefaultAnalysis();
    }

    try {
      console.log(`🔍 Analyse terrain pour ${points.length} points`);

      const altitudes = await lastValueFrom(this.getAltitudes(points));

      if (!altitudes || altitudes.length === 0 || altitudes.every(a => a === 0)) {
        console.warn('⚠️ Aucune altitude valide reçue, utilisation de valeurs simulées');
        return this.getSimulatedAnalysis(points);
      }

      const altitudeMin = Math.min(...altitudes);
      const altitudeMax = Math.max(...altitudes);
      const altitudeMoyenne = altitudes.reduce((a, b) => a + b, 0) / altitudes.length;

      let penteTotale = 0;
      let pointsAvecPente = 0;

      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const alt1 = altitudes[i];
        const alt2 = altitudes[(i + 1) % points.length];

        const distance = this.calculerDistance(p1.lat, p1.lng, p2.lat, p2.lng);

        if (distance > 0) {
          const denivele = Math.abs(alt2 - alt1);
          const pente = (denivele / distance) * 100;
          penteTotale += pente;
          pointsAvecPente++;
        }
      }

      const penteMoyenne = pointsAvecPente > 0 ? penteTotale / pointsAvecPente : 0;

      let classePente = 'plat';
      if (penteMoyenne > 20) classePente = 'fort';
      else if (penteMoyenne > 10) classePente = 'modéré';
      else if (penteMoyenne > 5) classePente = 'doux';

      const exposition = this.calculerExposition(points);

      console.log(`📊 Résultats: min=${altitudeMin}, max=${altitudeMax}, pente=${penteMoyenne}%`);

      return {
        altitudeMin,
        altitudeMax,
        altitudeMoyenne,
        penteMoyenne,
        classePente,
        exposition,
        altitudes,
        points
      };
    } catch (error) {
      console.error('Erreur analyse terrain:', error);
      return this.getSimulatedAnalysis(points);
    }
  }

  private getSimulatedAnalysis(points: Array<{lat: number, lng: number}>): any {
    // Simuler des altitudes basées sur la latitude (plus au nord = plus haut)
    const altitudes = points.map(p => {
      // Altitude simulée entre 0 et 200m basée sur la latitude
      const baseAltitude = Math.abs(p.lat - 30) * 10;
      return Math.min(200, Math.max(0, baseAltitude));
    });

    const altitudeMin = Math.min(...altitudes);
    const altitudeMax = Math.max(...altitudes);
    const altitudeMoyenne = altitudes.reduce((a, b) => a + b, 0) / altitudes.length;

    let penteTotale = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const alt1 = altitudes[i];
      const alt2 = altitudes[(i + 1) % points.length];
      const distance = this.calculerDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      if (distance > 0) {
        const pente = (Math.abs(alt2 - alt1) / distance) * 100;
        penteTotale += pente;
      }
    }
    const penteMoyenne = penteTotale / points.length;

    console.log('🎮 Utilisation de données simulées');

    return {
      altitudeMin,
      altitudeMax,
      altitudeMoyenne,
      penteMoyenne,
      classePente: penteMoyenne > 10 ? 'modéré' : 'plat',
      exposition: this.calculerExposition(points),
      altitudes,
      points
    };
  }

  private calculerDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculerExposition(points: Array<{lat: number, lng: number}>): string {
    if (points.length < 3) return 'inconnue';

    let sommeLat = 0, sommeLng = 0;
    points.forEach(p => {
      sommeLat += p.lat;
      sommeLng += p.lng;
    });
    const centreLat = sommeLat / points.length;
    const centreLng = sommeLng / points.length;

    let angleTotal = 0;
    let poidsTotal = 0;

    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const dx = p2.lng - p1.lng;
      const dy = p2.lat - p1.lat;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const poids = Math.sqrt(dx * dx + dy * dy);
      angleTotal += angle * poids;
      poidsTotal += poids;
    }

    const angleMoyen = angleTotal / poidsTotal;

    if (angleMoyen >= -45 && angleMoyen < 45) return 'Est';
    if (angleMoyen >= 45 && angleMoyen < 135) return 'Nord';
    if (angleMoyen >= -135 && angleMoyen < -45) return 'Sud';
    return 'Ouest';
  }

  private toRad(deg: number): number {
    return deg * Math.PI / 180;
  }

  private getDefaultAnalysis(): any {
    return {
      altitudeMin: 0,
      altitudeMax: 0,
      altitudeMoyenne: 0,
      penteMoyenne: 0,
      classePente: 'inconnue',
      exposition: 'inconnue',
      altitudes: [],
      points: []
    };
  }

  getColorByAltitude(altitude: number, minAltitude: number, maxAltitude: number): string {
    if (minAltitude === maxAltitude) return '#4CAF50';

    const ratio = (altitude - minAltitude) / (maxAltitude - minAltitude);

    let r, g, b;

    if (ratio < 0.5) {
      r = Math.floor(255 * (ratio * 2));
      g = 255;
      b = 0;
    } else {
      r = 255;
      g = Math.floor(255 * (1 - (ratio - 0.5) * 2));
      b = 0;
    }

    return `rgb(${r}, ${g}, ${b})`;
  }
}
