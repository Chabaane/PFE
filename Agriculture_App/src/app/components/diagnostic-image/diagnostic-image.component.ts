// components/diagnostic-image/diagnostic-image.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';
import { MarketplaceService, Produit } from '../../services/api/marketplace.service';
import { environment } from 'src/app/environments/environment';

// ── Interfaces alignées sur DiagnosticResultatDto C# ──────────────────────────
interface Prediction {
  plante:    string;
  maladie:   string;
  confiance: number;
  estSain:   boolean;
}

interface DiagnosticResultat {
  prediction:           Prediction;
  top3:                 Prediction[];
  confiant:             boolean;
  messageConseils:      string;
  produitsRecommandes:  Produit[];
}

type EtatDiagnostic = 'idle' | 'preview' | 'analyse' | 'resultat' | 'erreur';

// ── Composant ──────────────────────────────────────────────────────────────────
@Component({
  selector:    'app-diagnostic-image',
  standalone:  true,
  imports:     [CommonModule, RouterModule],
  template: `
<div class="diag-page">

  <!-- ── En-tête ── -->
  <div class="diag-header">
    <div class="diag-header-icon">🔬</div>
    <div>
      <h1 class="diag-title">Diagnostic par image</h1>
      <p class="diag-subtitle">
        Photographiez une feuille ou un ravageur — l'IA identifie la maladie
        et propose directement les intrants adaptés depuis la marketplace.
      </p>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════
       ZONE UPLOAD  (idle + preview)
  ══════════════════════════════════════════════════ -->
  <div *ngIf="etat === 'idle' || etat === 'preview'">

    <div class="drop-zone"
         [class.drop-zone--filled]="!!previewUrl"
         [class.drop-zone--drag]="isDragging"
         (dragover)="onDragOver($event)"
         (dragleave)="isDragging = false"
         (drop)="onDrop($event)"
         (click)="fileInput.click()">

      <!-- Placeholder vide -->
      <div *ngIf="!previewUrl" class="drop-placeholder">
        <div class="drop-icon">📷</div>
        <p class="drop-text">Glissez une photo ici ou cliquez pour choisir</p>
        <p class="drop-hint">JPEG · PNG · WEBP · max 10 Mo</p>
      </div>

      <!-- Aperçu de l'image sélectionnée -->
      <div *ngIf="previewUrl" class="drop-preview">
        <img [src]="previewUrl" alt="Aperçu" class="drop-preview-img" />
        <div class="drop-preview-overlay">📷 Changer la photo</div>
      </div>

      <input #fileInput type="file" accept="image/jpeg,image/png,image/webp"
             style="display:none" (change)="onFileSelected($event)" />
    </div>

    <!-- Boutons d'action -->
    <div *ngIf="etat === 'preview'" class="action-row">
      <button class="btn btn--primary" (click)="analyser()">
        🔍 Analyser la photo
      </button>
      <button class="btn btn--ghost" (click)="reset()">Annuler</button>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════
       LOADER  (analyse)
  ══════════════════════════════════════════════════ -->
  <div *ngIf="etat === 'analyse'" class="loader-wrap">
    <div class="loader-spinner"></div>
    <p class="loader-label">Analyse en cours par le réseau de neurones…</p>
    <div class="loader-steps">
      <span class="step step--done">Prétraitement</span>
      <span class="step" [class.step--done]="loaderStep >= 1">Extraction features</span>
      <span class="step" [class.step--done]="loaderStep >= 2">Classification CNN</span>
      <span class="step" [class.step--done]="loaderStep >= 3">Recommandation</span>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════
       ERREUR
  ══════════════════════════════════════════════════ -->
  <div *ngIf="etat === 'erreur'" class="alert alert--warn">
    <span class="alert-icon">⚠️</span>
    <span class="alert-msg">{{ messageErreur }}</span>
    <button class="btn btn--ghost btn--sm" (click)="reset()">Réessayer</button>
  </div>

  <!-- ══════════════════════════════════════════════════
       RÉSULTATS  (resultat)
  ══════════════════════════════════════════════════ -->
  <div *ngIf="etat === 'resultat' && resultat">

    <!-- ── Carte de résultat principal ── -->
    <div class="result-card"
         [class.result-card--sain]="resultat.prediction.estSain"
         [class.result-card--malade]="!resultat.prediction.estSain">

      <div class="result-badge"
           [class.badge--sain]="resultat.prediction.estSain"
           [class.badge--malade]="!resultat.prediction.estSain">
        {{ resultat.prediction.estSain ? '✅ Plante saine' : '⚠️ Maladie détectée' }}
      </div>

      <div class="result-main">
        <div class="result-plant">🌿 {{ resultat.prediction.plante }}</div>
        <div *ngIf="!resultat.prediction.estSain" class="result-disease">
          {{ resultat.prediction.maladie }}
        </div>

        <!-- Barre de confiance -->
        <div class="conf-row">
          <div class="conf-track">
            <div class="conf-fill"
                 [style.width.%]="resultat.prediction.confiance"
                 [class.conf-fill--high]="resultat.prediction.confiance >= 80"
                 [class.conf-fill--mid]="resultat.prediction.confiance >= 65 && resultat.prediction.confiance < 80"
                 [class.conf-fill--low]="resultat.prediction.confiance < 65">
            </div>
          </div>
          <span class="conf-label">Confiance : {{ resultat.prediction.confiance | number:'1.0-0' }}%</span>
        </div>
      </div>

      <!-- Message conseils -->
      <div class="result-advice">{{ resultat.messageConseils }}</div>

      <!-- Avertissement faible confiance -->
      <div *ngIf="!resultat.confiant" class="alert alert--info alert--sm">
        💡 Confiance insuffisante. Prenez une photo plus nette, en pleine lumière, avec la feuille au centre.
      </div>

      <!-- Top 3 alternatives -->
      <details *ngIf="resultat.top3.length > 1" class="top3">
        <summary class="top3-toggle">Voir les autres hypothèses</summary>
        <ul class="top3-list">
          <li *ngFor="let p of resultat.top3; let i = index" class="top3-item"
              [class.top3-item--first]="i === 0">
            <span class="top3-rank">#{{ i + 1 }}</span>
            <span class="top3-name">{{ p.plante }} — {{ p.maladie || 'Sain' }}</span>
            <span class="top3-score"
                  [class.score--high]="p.confiance >= 80"
                  [class.score--mid]="p.confiance >= 65 && p.confiance < 80"
                  [class.score--low]="p.confiance < 65">
              {{ p.confiance | number:'1.0-0' }}%
            </span>
          </li>
        </ul>
      </details>
    </div>

    <!-- ── Produits recommandés ── -->
    <div *ngIf="resultat.produitsRecommandes?.length" class="products-section">
      <h2 class="products-title">
        🛒 Intrants recommandés
        <span class="products-count">({{ resultat.produitsRecommandes.length }} produits)</span>
      </h2>

      <div class="products-grid">
        <div *ngFor="let p of resultat.produitsRecommandes" class="product-card">

          <div class="product-img-wrap">
            <img *ngIf="p.imageUrl" [src]="p.imageUrl" [alt]="p.nom" class="product-img" />
            <div *ngIf="!p.imageUrl" class="product-img-fallback">🧪</div>
            <span *ngIf="p.estEnPromotion" class="promo-tag">Promo</span>
          </div>

          <div class="product-body">
            <div class="product-category">{{ p.categorie }}</div>
            <div class="product-name">{{ p.nom }}</div>
            <div *ngIf="p.matieresActives" class="product-ma">{{ p.matieresActives }}</div>

            <div class="product-price">
              <span *ngIf="p.estEnPromotion && p.prixPromo" class="price-promo">
                {{ p.prixPromo | number:'1.2-2' }} DT
              </span>
              <span [class.price-crossed]="p.estEnPromotion && p.prixPromo">
                {{ p.prix | number:'1.2-2' }} DT
              </span>
              <span class="price-unit">/ {{ p.unite }}</span>
            </div>

            <div class="product-rating" *ngIf="p.noteMoyenne > 0">
              <span class="stars">{{ getStars(p.noteMoyenne) }}</span>
              <span class="rating-count">({{ p.nombreAvis }})</span>
            </div>
          </div>

          <button class="btn btn--add"
                  (click)="ajouterAuPanier(p)"
                  [disabled]="p.stockDisponible === 0"
                  [class.btn--rupture]="p.stockDisponible === 0">
            {{ p.stockDisponible === 0 ? '⚠ Rupture de stock' : '+ Ajouter au panier' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Message si plante saine (pas de produits) -->
    <div *ngIf="resultat.prediction.estSain" class="alert alert--success">
      🌱 Votre plante est saine — aucun traitement curatif nécessaire.
      <a routerLink="/marketplace" class="alert-link">Explorer les produits préventifs →</a>
    </div>

    <!-- Bouton nouvelle analyse -->
    <div class="new-analyse-row">
      <button class="btn btn--outline" (click)="reset()">📷 Nouvelle analyse</button>
      <a routerLink="/marketplace" class="btn btn--ghost">Voir tout le catalogue</a>
    </div>
  </div>

</div>
  `,
  styles: [`
    /* ── Page ── */
    .diag-page { max-width: 900px; margin: 0 auto; padding: 28px 16px; font-family: inherit; }

    /* ── Header ── */
    .diag-header { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 28px; }
    .diag-header-icon { font-size: 40px; line-height: 1; flex-shrink: 0; }
    .diag-title { font-size: 22px; font-weight: 700; margin: 0 0 6px; color: #1a1a1a; }
    .diag-subtitle { font-size: 14px; color: #666; margin: 0; line-height: 1.5; }

    /* ── Drop zone ── */
    .drop-zone {
      border: 2px dashed #c8d5c8; border-radius: 14px; min-height: 220px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; overflow: hidden; position: relative;
      transition: border-color .2s, background .2s;
    }
    .drop-zone:hover, .drop-zone--drag { border-color: #2d8c4e; background: #f2faf4; }
    .drop-zone--filled { border-style: solid; border-color: #2d8c4e; min-height: 280px; }

    .drop-placeholder { text-align: center; padding: 40px 24px; }
    .drop-icon { font-size: 52px; margin-bottom: 14px; }
    .drop-text { font-size: 16px; font-weight: 600; margin: 0 0 6px; color: #333; }
    .drop-hint { font-size: 13px; color: #999; margin: 0; }

    .drop-preview { width: 100%; position: relative; }
    .drop-preview-img { width: 100%; max-height: 320px; object-fit: contain; display: block; }
    .drop-preview-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,.42); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; font-weight: 500; opacity: 0; transition: opacity .2s;
    }
    .drop-preview:hover .drop-preview-overlay { opacity: 1; }

    /* ── Actions ── */
    .action-row { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }

    /* ── Buttons ── */
    .btn {
      padding: 11px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
      cursor: pointer; border: none; transition: background .18s, opacity .18s;
      text-decoration: none; display: inline-flex; align-items: center; gap: 6px;
    }
    .btn--primary { background: #2d8c4e; color: #fff; }
    .btn--primary:hover:not(:disabled) { background: #1e6e3b; }
    .btn--primary:disabled { opacity: .55; cursor: not-allowed; }
    .btn--outline { background: transparent; border: 2px solid #2d8c4e; color: #2d8c4e; }
    .btn--outline:hover { background: #f2faf4; }
    .btn--ghost { background: transparent; border: 1px solid #d0d0d0; color: #555; }
    .btn--ghost:hover { background: #f5f5f5; }
    .btn--sm { padding: 6px 14px; font-size: 13px; }
    .btn--add {
      width: calc(100% - 24px); margin: 0 12px 12px; padding: 9px;
      background: #2d8c4e; color: #fff; border: none; border-radius: 7px;
      font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .btn--add:hover:not(:disabled) { background: #1e6e3b; }
    .btn--add:disabled { background: #bbb; cursor: not-allowed; }
    .btn--rupture { background: #e0a0a0 !important; font-size: 12px; }

    /* ── Loader ── */
    .loader-wrap { text-align: center; padding: 52px 24px; }
    .loader-spinner {
      width: 52px; height: 52px; border: 4px solid #e0e0e0; border-top-color: #2d8c4e;
      border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 18px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loader-label { font-size: 15px; color: #555; margin: 0 0 18px; }
    .loader-steps { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    .step {
      padding: 4px 12px; border-radius: 20px; font-size: 12px;
      background: #eee; color: #aaa; transition: all .3s;
    }
    .step--done { background: #d1f0de; color: #1a6b38; font-weight: 600; }

    /* ── Alerts ── */
    .alert {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      border-radius: 8px; margin: 14px 0; font-size: 14px; flex-wrap: wrap;
    }
    .alert--warn { background: #fff8e1; border: 1px solid #f5c842; }
    .alert--info { background: #e8f4ff; border: 1px solid #90c8f0; }
    .alert--success { background: #edfaf2; border: 1px solid #7dd4a8; }
    .alert--sm { padding: 10px 14px; font-size: 13px; }
    .alert-icon { font-size: 18px; flex-shrink: 0; }
    .alert-msg { flex: 1; }
    .alert-link { color: #1a6b38; font-weight: 600; text-decoration: none; }
    .alert-link:hover { text-decoration: underline; }

    /* ── Result card ── */
    .result-card {
      border-radius: 14px; padding: 24px; margin-bottom: 28px;
      border: 1.5px solid #e0e0e0;
    }
    .result-card--sain   { background: #f2faf4; border-color: #a8d5b5; }
    .result-card--malade { background: #fff8f0; border-color: #f5c6a0; }

    .result-badge {
      display: inline-block; padding: 4px 14px; border-radius: 20px;
      font-size: 13px; font-weight: 700; margin-bottom: 18px;
    }
    .badge--sain   { background: #c8f0d8; color: #1a6b38; }
    .badge--malade { background: #fde8cc; color: #a04d00; }

    .result-plant   { font-size: 21px; font-weight: 700; margin-bottom: 4px; }
    .result-disease { font-size: 16px; color: #c0561a; font-weight: 600; margin-bottom: 14px; }

    /* Confiance */
    .conf-row { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .conf-track { flex: 1; max-width: 220px; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
    .conf-fill  { height: 100%; border-radius: 4px; transition: width .7s ease; }
    .conf-fill--high { background: #2d8c4e; }
    .conf-fill--mid  { background: #e8961a; }
    .conf-fill--low  { background: #e05050; }
    .conf-label { font-size: 13px; color: #555; white-space: nowrap; }

    /* Advice */
    .result-advice {
      background: rgba(255,255,255,.72); border-radius: 8px; padding: 14px 16px;
      font-size: 14px; line-height: 1.6; color: #333; margin-bottom: 14px;
    }

    /* Top 3 */
    .top3 { font-size: 13px; margin-top: 6px; }
    .top3-toggle { cursor: pointer; color: #666; padding: 6px 0; user-select: none; }
    .top3-list { margin: 10px 0 0; padding: 0; list-style: none; }
    .top3-item {
      display: flex; align-items: center; gap: 10px; padding: 7px 0;
      border-bottom: 1px solid rgba(0,0,0,.06);
    }
    .top3-item:last-child { border-bottom: none; }
    .top3-item--first .top3-name { font-weight: 700; }
    .top3-rank  { color: #bbb; min-width: 22px; font-size: 12px; }
    .top3-name  { flex: 1; color: #333; }
    .score--high { color: #2d8c4e; font-weight: 700; }
    .score--mid  { color: #e8961a; font-weight: 600; }
    .score--low  { color: #aaa; }

    /* ── Products ── */
    .products-section { margin-top: 4px; }
    .products-title {
      font-size: 18px; font-weight: 700; margin: 0 0 18px; color: #1a1a1a;
      display: flex; align-items: center; gap: 10px;
    }
    .products-count { font-size: 13px; color: #888; font-weight: 400; }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
      gap: 16px;
    }

    .product-card {
      border: 1px solid #e8e8e8; border-radius: 12px; overflow: hidden;
      display: flex; flex-direction: column; transition: box-shadow .2s, transform .2s;
      background: #fff;
    }
    .product-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.1); transform: translateY(-2px); }

    .product-img-wrap {
      position: relative; background: #f8f8f8; height: 130px;
      display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .product-img { width: 100%; height: 100%; object-fit: contain; }
    .product-img-fallback { font-size: 40px; }
    .promo-tag {
      position: absolute; top: 8px; right: 8px;
      background: #e05050; color: #fff; font-size: 10px; font-weight: 700;
      padding: 2px 8px; border-radius: 10px; letter-spacing: .3px;
    }

    .product-body { padding: 12px 12px 8px; flex: 1; }
    .product-category {
      font-size: 10px; color: #2d8c4e; font-weight: 700;
      text-transform: uppercase; letter-spacing: .6px; margin-bottom: 4px;
    }
    .product-name { font-size: 13px; font-weight: 700; line-height: 1.3; margin-bottom: 5px; color: #1a1a1a; }
    .product-ma   { font-size: 11px; color: #888; margin-bottom: 8px; font-style: italic; }

    .product-price { display: flex; align-items: baseline; gap: 5px; flex-wrap: wrap; margin-bottom: 5px; }
    .price-promo   { color: #e05050; font-weight: 800; font-size: 15px; }
    .price-crossed { text-decoration: line-through; color: #bbb; font-size: 12px; }
    .price-unit    { color: #aaa; font-size: 11px; }

    .product-rating { display: flex; align-items: center; gap: 4px; font-size: 12px; }
    .stars { color: #f5a623; letter-spacing: 1px; }
    .rating-count { color: #aaa; }

    /* ── Footer ── */
    .new-analyse-row { display: flex; gap: 12px; margin-top: 28px; flex-wrap: wrap; }

    /* ── Responsive ── */
    @media (max-width: 600px) {
      .products-grid { grid-template-columns: repeat(2, 1fr); }
      .diag-header { flex-direction: column; gap: 10px; }
      .loader-steps { gap: 5px; }
    }
  `]
})
export class DiagnosticImageComponent {

  etat:          EtatDiagnostic = 'idle';
  previewUrl:    string | null  = null;
  selectedFile:  File   | null  = null;
  resultat:      DiagnosticResultat | null = null;
  messageErreur: string  = '';
  isDragging:    boolean = false;
  loaderStep:    number  = 0;

  private loaderInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private http:        HttpClient,
    private marketplace: MarketplaceService
  ) {}

  // ── Drag & drop ────────────────────────────────────────────────────────────
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = true;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File): void {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.showError('Format non supporté. Utilisez JPEG, PNG ou WEBP.');
      return;
    }
    if (file.size > 10_000_000) {
      this.showError('Fichier trop volumineux (max 10 Mo).');
      return;
    }
    this.selectedFile = file;
    const reader      = new FileReader();
    reader.onload     = (ev) => { this.previewUrl = ev.target?.result as string; };
    reader.readAsDataURL(file);
    this.etat = 'preview';
  }

  // ── Analyse ────────────────────────────────────────────────────────────────
  analyser(): void {
    if (!this.selectedFile) return;

    this.etat       = 'analyse';
    this.loaderStep = 0;
    this.loaderInterval = setInterval(() => {
      if (this.loaderStep < 3) this.loaderStep++;
    }, 800);

    const formData = new FormData();
    formData.append('image', this.selectedFile);
    const userId = this.getUserId();
    if (userId) formData.append('idUtilisateur', String(userId));

    const url = `${environment.apiUrl}/api/marketplace/diagnostic/analyser-image`;

    this.http.post<DiagnosticResultat>(url, formData)
      .pipe(finalize(() => this.clearLoader()))
      .subscribe({
        next:  (data)  => { this.resultat = data; this.etat = 'resultat'; },
        error: (err)   => this.showError(
          err?.error?.message || err?.statusText || 'Erreur lors de l\'analyse. Réessayez.'
        )
      });
  }

  // ── Panier ─────────────────────────────────────────────────────────────────
  ajouterAuPanier(produit: Produit): void {
    this.marketplace.ajouterAuPanier(produit.idProduit, 1).subscribe({
      error: (err) => console.error('Erreur ajout panier', err)
    });
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  reset(): void {
    this.clearLoader();
    this.etat         = 'idle';
    this.previewUrl   = null;
    this.selectedFile = null;
    this.resultat     = null;
    this.messageErreur = '';
    this.loaderStep   = 0;
  }

  // ── Utils ──────────────────────────────────────────────────────────────────
  getStars(note: number): string {
    const full  = Math.round(note);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  private showError(msg: string): void {
    this.clearLoader();
    this.messageErreur = msg;
    this.etat          = 'erreur';
  }

  private clearLoader(): void {
    if (this.loaderInterval) {
      clearInterval(this.loaderInterval);
      this.loaderInterval = null;
    }
  }

  private getUserId(): number | null {
    try {
      const user = JSON.parse(localStorage.getItem('current_user') || 'null');
      return user?.id || user?.idUtilisateur || null;
    } catch { return null; }
  }
}
