import 'tslib';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Parcelle, CreateParcelleDto, UpdateParcelleDto } from '../../models/parcelle';

@Injectable({
  providedIn: 'root'
})
export class ParcelleService {
  private apiUrl = '/api/parcelle';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Parcelle[]> {
    return this.http.get<Parcelle[]>(this.apiUrl);
  }

  getByAgriculteurId(agriculteurId: number): Observable<Parcelle[]> {
    return this.http.get<Parcelle[]>(`${this.apiUrl}/agriculteur/${agriculteurId}`);
  }

  getById(id: number): Observable<Parcelle> {
    return this.http.get<Parcelle>(`${this.apiUrl}/${id}`);
  }

  create(parcelle: CreateParcelleDto): Observable<Parcelle> {
    return this.http.post<Parcelle>(this.apiUrl, parcelle);
  }

  update(id: number, parcelle: UpdateParcelleDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, parcelle);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  calculateSuperficie(contour: any[]): Observable<number> {
    return this.http.post<number>(`${this.apiUrl}/calculate-superficie`, { contour });
  }
}
