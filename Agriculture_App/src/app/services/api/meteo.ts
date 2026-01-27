import 'tslib';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DonneesMeteo } from '../../models/donnees-meteo';

@Injectable({
  providedIn: 'root'
})
export class MeteoService {
  private apiUrl = '/api/meteo';

  constructor(private http: HttpClient) { }

  getCurrent(): Observable<DonneesMeteo> {
    return this.http.get<DonneesMeteo>(`${this.apiUrl}/current`);
  }

  getHistory(startDate: Date, endDate: Date): Observable<DonneesMeteo[]> {
    return this.http.get<DonneesMeteo[]>(
      `${this.apiUrl}/history?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
  }

  getForecast(): Observable<DonneesMeteo[]> {
    return this.http.get<DonneesMeteo[]>(`${this.apiUrl}/forecast`);
  }

  calculateDegresJours(startDate: Date, endDate: Date): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/degres-jours?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
    );
  }
}
