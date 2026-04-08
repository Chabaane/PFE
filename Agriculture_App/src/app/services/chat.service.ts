import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatResponse {
  reply: string;
  source: 'rule' | 'ai';
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = 'http://localhost:5160/api/ai-chat'; // Utilisez le proxy ou l'URL complète

  constructor(private http: HttpClient) {}

  send(data: any): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.apiUrl, data);
  }
}
