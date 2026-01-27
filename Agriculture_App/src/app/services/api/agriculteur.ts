import 'tslib';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Agriculteur, CreateAgriculteurDto, UpdateAgriculteurDto } from '../../models/agriculteur';

@Injectable({
  providedIn: 'root'
})
export class AgriculteurService {
  private apiUrl = '/api/agriculteur';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Agriculteur[]> {
    return this.http.get<Agriculteur[]>(this.apiUrl);
  }

  getById(id: number): Observable<Agriculteur> {
    return this.http.get<Agriculteur>(`${this.apiUrl}/${id}`);
  }

  create(agriculteur: CreateAgriculteurDto): Observable<Agriculteur> {
    return this.http.post<Agriculteur>(this.apiUrl, agriculteur);
  }

  update(id: number, agriculteur: UpdateAgriculteurDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, agriculteur);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
