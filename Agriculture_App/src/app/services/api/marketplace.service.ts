// services/api/marketplace.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface Produit {
  idProduit: number;
  nom: string;
  description: string;
  categorie: string;
  prix: number;
  prixPromo?: number;
  estEnPromotion: boolean;
  prixEffectif: number;
  unite: string;
  stockDisponible: number;
  imageUrl?: string;
  fabricant?: string;
  numeroAMM?: string;
  culturesCompatibles?: string;
  matieresActives?: string;
  noteMoyenne: number;
  nombreAvis: number;
  dateAjout: string;
}

export interface ProduitPage {
  produits: Produit[];
  total: number;
  page: number;
  totalPages: number;
}

export interface LignePanier {
  idLignePanier: number;
  idProduit: number;
  nomProduit: string;
  imageUrl?: string;
  prixUnitaire: number;
  quantite: number;
  sousTotal: number;
  stockDisponible: number;
  unite: string;
}

export interface Panier {
  idPanier: number;
  lignes: LignePanier[];
  sousTotal: number;
  fraisLivraison: number;
  total: number;
  nombreArticles: number;
}

export interface Avis {
  idAvis: number;
  nomAuteur: string;
  note: number;
  commentaire?: string;
  verifie: boolean;
  dateAvis: string;
}

export interface Commande {
  idCommande: number;
  numeroCommande: string;
  nomClient: string;
  emailClient: string;
  adresseLivraison: string;
  villeLivraison: string;
  gouvernoratLivraison: string;
  sousTotal: number;
  fraisLivraison: number;
  total: number;
  statut: string;
  modePaiement: string;
  dateCommande: string;
  dateExpedition?: string;
  dateLivraison?: string;
  lignes: LigneCommande[];
}

export interface LigneCommande {
  idProduit: number;
  nomProduit: string;
  imageUrl?: string;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

export interface PasserCommandeDto {
  idUtilisateur?: number;
  sessionId?: string;
  nomClient: string;
  emailClient: string;
  telephoneClient: string;
  adresseLivraison: string;
  villeLivraison: string;
  gouvernoratLivraison: string;
  codePostalLivraison: string;
  modePaiement: string;
  notesCommande?: string;
}

export interface FiltresProduit {
  recherche?: string;
  categorie?: string;
  prixMin?: number;
  prixMax?: number;
  tri?: string;
  page?: number;
  taillePage?: number;
  enPromotion?: boolean;
  enStock?: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private readonly BASE = `${environment.apiUrl}/api/marketplace`;

  // Panier réactif (badge dans la navbar)
  private panierSubject = new BehaviorSubject<Panier | null>(null);
  panier$ = this.panierSubject.asObservable();

  // Session ID pour les utilisateurs non connectés
  private sessionId: string;

  constructor(private http: HttpClient) {
    this.sessionId = localStorage.getItem('session_id') || this.generateSessionId();
    localStorage.setItem('session_id', this.sessionId);
    this.loadPanier();
  }

  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substring(2, 15);
  }

  private getUserId(): number | null {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || 'null');
      return user?.id || user?.idUtilisateur || null;
    } catch { return null; }
  }

  // ── Produits ─────────────────────────────────────────────────────────────
  getProduits(filtres: FiltresProduit = {}): Observable<ProduitPage> {
    let params = new HttpParams();
    Object.entries(filtres).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    });
    return this.http.get<ProduitPage>(`${this.BASE}/produits`, { params });
  }

  getProduit(id: number): Observable<Produit> {
    return this.http.get<Produit>(`${this.BASE}/produits/${id}`);
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.BASE}/produits/categories`);
  }

  getAvis(idProduit: number): Observable<Avis[]> {
    return this.http.get<Avis[]>(`${this.BASE}/produits/${idProduit}/avis`);
  }

  soumettreAvis(dto: { idProduit: number; nomAuteur: string; note: number; commentaire?: string }): Observable<Avis> {
    return this.http.post<Avis>(`${this.BASE}/produits/${dto.idProduit}/avis`, {
      idProduit: dto.idProduit,
      idUtilisateur: this.getUserId(),
      nomAuteur: dto.nomAuteur,
      note: dto.note,
      commentaire: dto.commentaire
    });
  }

  // ── Panier ────────────────────────────────────────────────────────────────
  loadPanier(): void {
    const userId = this.getUserId();
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId);
    else params = params.set('sessionId', this.sessionId);

    this.http.get<Panier>(`${this.BASE}/panier`, { params }).subscribe({
      next: p => this.panierSubject.next(p),
      error: () => {}
    });
  }

  ajouterAuPanier(idProduit: number, quantite = 1): Observable<Panier> {
    return this.http.post<Panier>(`${this.BASE}/panier/ajouter`, {
      idProduit,
      quantite,
      idUtilisateur: this.getUserId(),
      sessionId: this.sessionId
    }).pipe(tap(p => this.panierSubject.next(p)));
  }

  updateQuantite(idLigne: number, quantite: number): Observable<Panier> {
    return this.http.put<Panier>(`${this.BASE}/panier/ligne/${idLigne}`, quantite)
      .pipe(tap(p => this.panierSubject.next(p)));
  }

  supprimerLigne(idLigne: number): Observable<Panier> {
    return this.http.delete<Panier>(`${this.BASE}/panier/ligne/${idLigne}`)
      .pipe(tap(p => this.panierSubject.next(p)));
  }

  viderPanier(): Observable<any> {
    const userId = this.getUserId();
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId);
    else params = params.set('sessionId', this.sessionId);
    return this.http.delete(`${this.BASE}/panier/vider`, { params })
      .pipe(tap(() => this.loadPanier()));
  }

  get nombreArticles(): number {
    return this.panierSubject.value?.nombreArticles || 0;
  }

  // ── Commandes ─────────────────────────────────────────────────────────────
  passerCommande(dto: Omit<PasserCommandeDto, 'idUtilisateur' | 'sessionId'>): Observable<Commande> {
    return this.http.post<Commande>(`${this.BASE}/commandes/passer`, {
      ...dto,
      idUtilisateur: this.getUserId(),
      sessionId: this.sessionId
    });
  }

  getCommande(id: number): Observable<Commande> {
    return this.http.get<Commande>(`${this.BASE}/commandes/${id}`);
  }

  getCommandeByNumero(num: string): Observable<Commande> {
    return this.http.get<Commande>(`${this.BASE}/commandes/numero/${num}`);
  }

  getMesCommandes(): Observable<Commande[]> {
    const userId = this.getUserId();
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId);
    return this.http.get<Commande[]>(`${this.BASE}/commandes`, { params });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  getStats(): Observable<any> {
    return this.http.get(`${this.BASE}/commandes/stats`);
  }

  createProduit(dto: any): Observable<Produit> {
    return this.http.post<Produit>(`${this.BASE}/produits`, dto);
  }

  updateProduit(id: number, dto: any): Observable<Produit> {
    return this.http.put<Produit>(`${this.BASE}/produits/${id}`, dto);
  }

  deleteProduit(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/produits/${id}`);
  }

  updateStatutCommande(id: number, statut: string): Observable<Commande> {
    return this.http.put<Commande>(`${this.BASE}/commandes/${id}/statut`, JSON.stringify(statut), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
