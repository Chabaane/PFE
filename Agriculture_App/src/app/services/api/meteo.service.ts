// meteo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MeteoActuelle {
  temperature: number;
  nuages: number;
  humidite: number;
  vent: number;
  pression: number;
  date: Date;
}

export interface PrevisionMeteo {
  jour: string; // "Auj", "Mar", "Mer", etc.
  temperature: number;
  nuages: number;
  humidite: number;
  vent: number;
  pression: number;
  date: Date;
}

export interface MeteoPoint {
  nom: string;
  latitude: number;
  longitude: number;
  actuelle: MeteoActuelle;
  previsions: PrevisionMeteo[];
}

@Injectable({
  providedIn: 'root'
})
export class MeteoService {
  private apiUrl = 'http://localhost:5160/api/meteo';

  constructor(private http: HttpClient) { }

  getMeteoForPoint(nom: string, lat: number, lon: number): Observable<MeteoPoint> {
    return this.http.get<MeteoPoint>(`${this.apiUrl}/point`, {
      params: {
        nom: nom,
        lat: lat.toString(),
        lon: lon.toString()
      }
    });
  }
}
