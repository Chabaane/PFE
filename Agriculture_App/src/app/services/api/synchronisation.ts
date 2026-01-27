import 'tslib';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SyncRequest, SyncResponse } from '../../models/sync-request';

@Injectable({
  providedIn: 'root'
})
export class SynchronisationService {
  private apiUrl = '/api/synchronisation';

  constructor(private http: HttpClient) { }

  synchroniser(data: SyncRequest): Observable<SyncResponse> {
    return this.http.post<SyncResponse>(`${this.apiUrl}/sync`, data);
  }

  getStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/status`);
  }

  resolveConflit(conflitId: number, resolution: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/resolve-conflit/${conflitId}`, resolution);
  }
}
