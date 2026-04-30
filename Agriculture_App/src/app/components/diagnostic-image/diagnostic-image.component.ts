// components/diagnostic-image/diagnostic-image.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MarketplaceService, Produit } from '../../services/api/marketplace.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/app/environments/environment';
import { Observable, finalize } from 'rxjs';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Prediction {
  plante: string;
  maladie: string;
  confiance: number;
  estSain: boolean;
}

interface DiagnosticResultat {
  prediction: Prediction;
  top3: Prediction[];
  confiant: boolean;
  messageConseils: string;
  produitsRecommandes: Produit[];
}

type EtatDiagnostic = 'idle' | 'preview' | 'analyse' | 'resultat' | 'erreur';

// ── Composant ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-diagnostic-image',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
<div class="diagnostic-wrapper">

  <!-- ── En-tête ── -->
  <div class="diagnostic-header">
    <div class="header-icon">🔬</div>
    <div>
      <h1 class="diagnostic-title">Diagnostic par image</h1>
      <p class="diagnostic-sub">Photographiez une feuille ou un ravageur — l'IA identifie la maladie et recommande les intrants adaptés</p>
    </div>
  </div>

  <!-- ── Zone de dépôt d'image ── -->
  <div *ngIf="etat === 'idle' || etat === 'preview'"
       class="drop-zone"
       [class.has-image]="previewUrl"
       [class.drag-over]="isDragging"
       (dragover)="onDragOver($event)"
       (dragleave)="isDragging = false"
       (drop)="onDrop($event)"
       (click)="fileInput.click()">

    <!-- Placeholder -->
    <div *ngIf="!previewUrl" class="drop-placeholder">
      <div class="drop-icon">📷</div>
      <p class="drop-text">Glissez une photo ici ou cliquez pour choisir</p>
      <p class="drop-hint">JPEG · PNG · WEBP · max 10 Mo</p>
    </div>

    <!-- Aperçu image -->
    <div *ngIf="previewUrl" class="image-preview-wrap">
      <img [src]="previewUrl" alt="Image à analyser" class="image-preview" />
      <div class="image-overlay">
        <span>Changer la photo</span>
      </div>
    </div>

    <input #fileInput type="file" accept="image/jpeg,image/png,image/webp"
           style="display:none" (change)="onFileSelected($event)" />
  </div>

  <!-- ── Bouton analyser ── -->
  <div *ngIf="etat === 'preview'" class="analyse-action">
    <button class="btn-analyse" (click)="analyser()">
      🔍 Analyser la photo
    </button>
    <button class="btn-reset" (click)="reset()">Annuler</button>
  </div>

  <!-- ── Loader ── -->
  <div *ngIf="etat === 'analyse'" class="loader-wrap">
    <div class="loader-spinner"></div>
    <p class="loader-text">Analyse en cours par le réseau de neurones…</p>
    <div class="loader-steps">
      <span [class.active]="true">Prétraitement</span>
      <span [class.active]="loaderStep >= 1">Extraction features</span>
      <span [class.active]="loaderStep >= 2">Classification</span>
      <span [class.active]="loaderStep >= 3">Recommandation</span>
    </div>
  </div>

  <!-- ── Erreur ── -->
  <div *ngIf="etat === 'erreur'" class="alert-erreur">
    <span>⚠️</span>
    <span>{{ messageErreur }}</span>
    <button (click)="reset()">Réessayer</button>
  </div>

  <!-- ── Résultats ── -->
  <div *ngIf="etat === 'resultat' && resultat" class="resultats-wrap">

    <!-- Carte principale -->
    <div class="resultat-card" [class.sain]="resultat.prediction.estSain" [class.malade]="!resultat.prediction.estSain">
      <div class="resultat-badge" [class.badge-sain]="resultat.prediction.estSain" [class.badge-malade]="!resultat.prediction.estSain">
        {{ resultat.prediction.estSain ? '✅ Plante saine' : '⚠️ Maladie détectée' }}
      </div>

      <div class="resultat-main">
        <div class="resultat-plante">🌿 {{ resultat.prediction.plante }}</div>
        <div class="resultat-maladie" *ngIf="!resultat.prediction.estSain">
          {{ resultat.prediction.maladie }}
        </div>
        <div class="resultat-confiance">
          <div class="confiance-bar-wrap">
            <div class="confiance-bar" [style.width.%]="resultat.prediction.confiance"
                 [class.bar-haute]="resultat.prediction.confiance >= 80"
                 [class.bar-moyenne]="resultat.prediction.confiance >= 60 && resultat.prediction.confiance < 80"
                 [class.bar-basse]="resultat.prediction.confiance < 60">
            </div>
          </div>
          <span>Confiance : {{ resultat.prediction.confiance | number:'1.0-0' }}%</span>
        </div>
      </div>

      <!-- Conseils -->
      <div class="conseils-block">
        <p>{{ resultat.messageConseils }}</p>
      </div>

      <!-- Top 3 alternatives -->
      <details class="top3-details" *ngIf="resultat.top3.length > 1">
        <summary>Voir les autres hypothèses</summary>
        <ul class="top3-list">
          <li *ngFor="let p of resultat.top3; let i = index" [class.top3-first]="i === 0">
            <span class="top3-rank">#{{ i + 1 }}</span>
            <span class="top3-label">{{ p.plante }} — {{ p.maladie || 'Sain' }}</span>
            <span class="top3-score">{{ p.confiance | number:'1.0-0' }}%</span>
          </li>
        </ul>
      </details>
    </div>

    <!-- Produits recommandés -->
    <div *ngIf="resultat.produitsRecommandes?.length" class="produits-section">
      <h2 class="produits-titre">Intrants recommandés</h2>
      <div class="produits-grid">
        <div class="produit-card" *ngFor="let p of resultat.produitsRecommandes">
          <div class="produit-img-wrap">
            <img *ngIf="p.imageUrl" [src]="p.imageUrl" [alt]="p.nom" class="produit-img" />
            <div *ngIf="!p.imageUrl" class="produit-img-placeholder">🧪</div>
            <span *ngIf="p.estEnPromotion" class="promo-badge">Promo</span>
          </div>
          <div class="produit-info">
            <div class="produit-categorie">{{ p.categorie }}</div>
            <div class="produit-nom">{{ p.nom }}</div>
            <div class="produit-prix">
              <span *ngIf="p.estEnPromotion && p.prixPromo" class="prix-promo">{{ p.prixPromo | number:'1.2-2' }} DT</span>
              <span [class.prix-barre]="p.estEnPromotion && p.prixPromo">{{ p.prix | number:'1.2-2' }} DT</span>
              <span class="prix-unite">/ {{ p.unite }}</span>
            </div>
          </div>
          <button class="btn-ajouter" (click)="ajouterAuPanier(p)" [disabled]="p.stockDisponible === 0">
            {{ p.stockDisponible === 0 ? 'Rupture' : '+ Panier' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Nouvelle analyse -->
    <div class="nouvelle-analyse">
      <button class="btn-nouvelle" (click)="reset()">📷 Nouvelle analyse</button>
    </div>
  </div>

</div>
  `,
  styles: [`
    .diagnostic-wrapper { max-width: 860px; margin: 0 auto; padding: 24px 16px; }

    .diagnostic-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 28px; }
    .header-icon { font-size: 36px; line-height: 1; }
    .diagnostic-title { font-size: 22px; font-weight: 600; margin: 0 0 4px; }
    .diagnostic-sub { color: #666; margin: 0; font-size: 14px; }

    /* Drop zone */
    .drop-zone { border: 2px dashed #ccc; border-radius: 16px; min-height: 220px; display: flex;
      align-items: center; justify-content: center; cursor: pointer; transition: border-color .2s, background .2s;
      overflow: hidden; position: relative; }
    .drop-zone:hover, .drop-zone.drag-over { border-color: #2d8c4e; background: #f0faf4; }
    .drop-zone.has-image { border-style: solid; }
    .drop-placeholder { text-align: center; padding: 32px; }
    .drop-icon { font-size: 48px; margin-bottom: 12px; }
    .drop-text { font-size: 16px; margin: 0 0 6px; font-weight: 500; }
    .drop-hint { font-size: 13px; color: #888; margin: 0; }
    .image-preview-wrap { width: 100%; position: relative; }
    .image-preview { width: 100%; max-height: 320px; object-fit: contain; display: block; }
    .image-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.45); color: #fff;
      display: flex; align-items: center; justify-content: center; font-size: 15px; opacity: 0;
      transition: opacity .2s; }
    .image-preview-wrap:hover .image-overlay { opacity: 1; }

    /* Actions */
    .analyse-action { display: flex; gap: 12px; margin-top: 16px; }
    .btn-analyse { padding: 12px 28px; background: #2d8c4e; color: #fff; border: none;
      border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background .2s; }
    .btn-analyse:hover:not(:disabled) { background: #1f6b3a; }
    .btn-analyse:disabled { opacity: .6; cursor: not-allowed; }
    .btn-reset { padding: 12px 20px; background: transparent; border: 1px solid #ccc;
      border-radius: 8px; cursor: pointer; font-size: 14px; }

    /* Loader */
    .loader-wrap { text-align: center; padding: 48px 24px; }
    .loader-spinner { width: 52px; height: 52px; border: 4px solid #e0e0e0;
      border-top-color: #2d8c4e; border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loader-text { font-size: 15px; color: #555; margin-bottom: 20px; }
    .loader-steps { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .loader-steps span { padding: 4px 12px; border-radius: 20px; font-size: 12px; background: #eee; color: #888; }
    .loader-steps span.active { background: #d4edda; color: #1f6b3a; font-weight: 500; }

    /* Erreur */
    .alert-erreur { display: flex; align-items: center; gap: 12px; padding: 16px; background: #fff3cd;
      border: 1px solid #ffc107; border-radius: 8px; margin-top: 16px; }
    .alert-erreur button { margin-left: auto; padding: 6px 14px; border: 1px solid #ccc;
      border-radius: 6px; cursor: pointer; background: #fff; }

    /* Résultats */
    .resultats-wrap { margin-top: 24px; }
    .resultat-card { border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1.5px solid #e0e0e0; }
    .resultat-card.sain { background: #f0faf4; border-color: #a8d5b5; }
    .resultat-card.malade { background: #fff8f0; border-color: #f5c6a0; }
    .resultat-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 13px;
      font-weight: 600; margin-bottom: 16px; }
    .badge-sain { background: #c8f0d8; color: #1a6b38; }
    .badge-malade { background: #fde8cc; color: #a04d00; }
    .resultat-plante { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
    .resultat-maladie { font-size: 16px; color: #c0561a; font-weight: 500; margin-bottom: 14px; }
    .resultat-confiance { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #555; margin-bottom: 16px; }
    .confiance-bar-wrap { flex: 1; max-width: 200px; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
    .confiance-bar { height: 100%; border-radius: 4px; transition: width .6s ease; }
    .bar-haute { background: #2d8c4e; }
    .bar-moyenne { background: #f0a030; }
    .bar-basse { background: #e05050; }
    .conseils-block { background: rgba(255,255,255,.7); border-radius: 8px; padding: 14px 16px;
      font-size: 14px; line-height: 1.6; color: #333; margin-bottom: 16px; }
    .top3-details { font-size: 13px; }
    .top3-details summary { cursor: pointer; color: #555; padding: 6px 0; }
    .top3-list { margin: 8px 0 0; padding: 0; list-style: none; }
    .top3-list li { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid #eee; align-items: center; }
    .top3-first .top3-label { font-weight: 600; }
    .top3-rank { color: #aaa; min-width: 20px; }
    .top3-label { flex: 1; }
    .top3-score { color: #2d8c4e; font-weight: 500; }

    /* Produits */
    .produits-section { margin-top: 8px; }
    .produits-titre { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
    .produits-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .produit-card { border: 1px solid #e8e8e8; border-radius: 10px; overflow: hidden;
      display: flex; flex-direction: column; transition: box-shadow .2s; }
    .produit-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
    .produit-img-wrap { position: relative; background: #f8f8f8; height: 120px;
      display: flex; align-items: center; justify-content: center; }
    .produit-img { width: 100%; height: 100%; object-fit: contain; }
    .produit-img-placeholder { font-size: 36px; }
    .promo-badge { position: absolute; top: 6px; right: 6px; background: #e05050; color: #fff;
      font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 10px; }
    .produit-info { padding: 10px 12px; flex: 1; }
    .produit-categorie { font-size: 11px; color: #2d8c4e; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    .produit-nom { font-size: 13px; font-weight: 600; margin-bottom: 8px; line-height: 1.3; }
    .produit-prix { font-size: 13px; display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
    .prix-promo { color: #e05050; font-weight: 700; font-size: 15px; }
    .prix-barre { text-decoration: line-through; color: #aaa; font-size: 12px; }
    .prix-unite { color: #888; font-size: 11px; }
    .btn-ajouter { margin: 0 12px 12px; padding: 8px; background: #2d8c4e; color: #fff;
      border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;
      transition: background .2s; }
    .btn-ajouter:hover:not(:disabled) { background: #1f6b3a; }
    .btn-ajouter:disabled { background: #ccc; cursor: not-allowed; }

    .nouvelle-analyse { text-align: center; margin-top: 24px; }
    .btn-nouvelle { padding: 12px 28px; border: 2px solid #2d8c4e; color: #2d8c4e;
      background: transparent; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-nouvelle:hover { background: #f0faf4; }
  `]
})
export class DiagnosticImageComponent {
  etat: EtatDiagnostic = 'idle';
  previewUrl: string | null = null;
  selectedFile: File | null = null;
  resultat: DiagnosticResultat | null = null;
  messageErreur = '';
  isDragging = false;
  loaderStep = 0;
  private loaderInterval: any;

  constructor(
    private marketplace: MarketplaceService,
    private http: HttpClient
  ) {}

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.setFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File): void {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.messageErreur = 'Format non supporté. Utilisez JPEG, PNG ou WEBP.';
      this.etat = 'erreur';
      return;
    }
    if (file.size > 10_000_000) {
      this.messageErreur = 'Fichier trop volumineux (max 10 Mo).';
      this.etat = 'erreur';
      return;
    }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.previewUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
    this.etat = 'preview';
  }

  analyser(): void {
    if (!this.selectedFile) return;
    this.etat = 'analyse';
    this.loaderStep = 0;
    this.loaderInterval = setInterval(() => {
      if (this.loaderStep < 3) this.loaderStep++;
    }, 700);

    const formData = new FormData();
    formData.append('image', this.selectedFile);

    const userId = this.getUserId();
    if (userId) formData.append('idUtilisateur', userId.toString());

    const apiUrl = `${environment.apiUrl}/api/marketplace/diagnostic/analyser-image`;
    this.http.post<DiagnosticResultat>(apiUrl, formData)
      .pipe(finalize(() => { clearInterval(this.loaderInterval); this.loaderStep = 3; }))
      .subscribe({
        next: (data) => {
          this.resultat = data;
          this.etat = 'resultat';
        },
        error: (err) => {
          this.messageErreur = err?.error?.message || err?.statusText || 'Erreur lors de l\'analyse. Veuillez réessayer.';
          this.etat = 'erreur';
        }
      });
  }

  ajouterAuPanier(produit: Produit): void {
    this.marketplace.ajouterAuPanier(produit.idProduit, 1).subscribe({
      next: () => console.log(`Produit ${produit.nom} ajouté au panier`),
      error: (err) => console.error('Erreur ajout panier', err)
    });
  }

  reset(): void {
    this.etat = 'idle';
    this.previewUrl = null;
    this.selectedFile = null;
    this.resultat = null;
    this.messageErreur = '';
    this.loaderStep = 0;
    clearInterval(this.loaderInterval);
  }

  private getUserId(): number | null {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || 'null');
      return user?.id || user?.idUtilisateur || null;
    } catch { return null; }
  }
}
