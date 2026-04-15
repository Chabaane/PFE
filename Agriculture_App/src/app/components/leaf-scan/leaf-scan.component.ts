// components/scan-feuille/scan-feuille.component.ts
import {
  Component, OnInit, OnDestroy, ViewChild,
  ElementRef, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { trigger, state, style, animate, transition, keyframes } from '@angular/animations';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface Traitements {
  bio: string[];
  conventionnel: string[];
  urgence: string;
}

interface DiagnosticResult {
  estSaine: boolean;
  maladie: string;
  nomScientifique: string;
  gravite: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  confiance: number;
  description: string;
  causesFrequentes: string[];
  traitements: Traitements;
  prevention: string[];
  conditionsMeteo: string;
  culturesConcernees: string[];
}

interface HistoriqueItem {
  id: number;
  date: Date;
  imageUrl: string;
  culture: string;
  result: DiagnosticResult;
}

// ── Composant ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-scan-feuille',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(24px)' }),
        animate('420ms cubic-bezier(.4,0,.2,1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('280ms ease-in',
          style({ opacity: 0, transform: 'translateY(-12px)' }))
      ])
    ]),
    trigger('pulse', [
      state('active', style({})),
      transition('* => active', [
        animate('1.5s ease-in-out', keyframes([
          style({ transform: 'scale(1)',   offset: 0   }),
          style({ transform: 'scale(1.04)', offset: 0.5 }),
          style({ transform: 'scale(1)',   offset: 1   }),
        ]))
      ])
    ]),
    trigger('scanLine', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms', style({ opacity: 1 }))
      ])
    ])
  ],
  template: `
<div class="sf-root">

  <!-- ── Hero header ───────────────────────────────────────────────────────── -->
  <header class="sf-header">
    <div class="sf-header-bg"></div>
    <div class="sf-header-content">
      <div class="sf-logo">
        <span class="sf-logo-icon">🔬</span>
        <div>
          <h1>PhytoDiag</h1>
          <p>Diagnostic intelligent des maladies foliaires</p>
        </div>
      </div>
      <div class="sf-stats-row" *ngIf="historique.length > 0">
        <div class="sf-stat">
          <span class="sf-stat-val">{{historique.length}}</span>
          <span class="sf-stat-lbl">Analyses</span>
        </div>
        <div class="sf-stat">
          <span class="sf-stat-val">{{maladiesDetectees}}</span>
          <span class="sf-stat-lbl">Maladies détectées</span>
        </div>
        <div class="sf-stat">
          <span class="sf-stat-val">{{confMoyenne}}%</span>
          <span class="sf-stat-lbl">Confiance moy.</span>
        </div>
      </div>
    </div>
  </header>

  <div class="sf-body">

    <!-- ── Panneau gauche : upload + config ──────────────────────────────── -->
    <aside class="sf-sidebar">

      <!-- Zone de dépôt / capture -->
      <div class="sf-upload-zone"
           [class.sf-upload-zone--dragover]="isDragging"
           [class.sf-upload-zone--has-image]="imagePreview"
           (dragover)="onDragOver($event)"
           (dragleave)="isDragging = false"
           (drop)="onDrop($event)"
           (click)="!imagePreview && fileInput.click()">

        <input #fileInput type="file" accept="image/*"
               style="display:none" (change)="onFileSelected($event)">

        <ng-container *ngIf="!imagePreview">
          <div class="sf-upload-icon">🌿</div>
          <p class="sf-upload-title">Déposez ou sélectionnez une photo</p>
          <p class="sf-upload-sub">JPG, PNG, WEBP — max 10 Mo</p>
          <div class="sf-upload-actions">
            <button class="sf-btn sf-btn--primary" (click)="$event.stopPropagation(); fileInput.click()">
              <span>📁</span> Parcourir
            </button>
            <button class="sf-btn sf-btn--outline" (click)="$event.stopPropagation(); ouvrirCamera()">
              <span>📷</span> Caméra
            </button>
          </div>
        </ng-container>

        <ng-container *ngIf="imagePreview">
          <img [src]="imagePreview" alt="Feuille à analyser" class="sf-preview-img">
          <div class="sf-preview-overlay">
            <button class="sf-btn sf-btn--ghost" (click)="$event.stopPropagation(); reinitialiser()">
              ✕ Changer
            </button>
          </div>
        </ng-container>
      </div>

      <!-- Caméra en direct -->
      <div class="sf-camera-zone" *ngIf="showCamera">
        <video #videoEl autoplay playsinline class="sf-camera-video"></video>
        <div class="sf-camera-controls">
          <button class="sf-btn sf-btn--capture" (click)="capturePhoto()">📸 Capturer</button>
          <button class="sf-btn sf-btn--ghost"   (click)="fermerCamera()">✕</button>
        </div>
      </div>
      <canvas #canvasEl style="display:none"></canvas>

      <!-- Configuration -->
      <div class="sf-config-card">
        <h3 class="sf-config-title">⚙️ Paramètres</h3>

        <div class="sf-field">
          <label>Culture</label>
          <select [(ngModel)]="selectedCulture" class="sf-select">
            <option value="">Inconnue / Générale</option>
            <option value="Blé">Blé</option>
            <option value="Orge">Orge</option>
            <option value="Maïs">Maïs</option>
            <option value="Tomate">Tomate</option>
            <option value="Pomme de terre">Pomme de terre</option>
            <option value="Vigne">Vigne</option>
            <option value="Olivier">Olivier</option>
            <option value="Agrumes">Agrumes</option>
            <option value="Piment / Poivron">Piment / Poivron</option>
          </select>
        </div>

        <div class="sf-field">
          <label>Région</label>
          <select [(ngModel)]="selectedRegion" class="sf-select">
            <option value="Tunisie">Tunisie (général)</option>
            <option value="Nord (Bizerte, Béja, Jendouba)">Nord</option>
            <option value="Centre (Kairouan, Sousse)">Centre</option>
            <option value="Sud (Gabès, Médenine)">Sud</option>
          </select>
        </div>

        <button class="sf-btn sf-btn--analyse"
                [disabled]="!imagePreview || isAnalyzing"
                (click)="analyser()">
          <span *ngIf="!isAnalyzing">🔬 Analyser la feuille</span>
          <span *ngIf="isAnalyzing" class="sf-analyzing-txt">
            <span class="sf-dot"></span>
            <span class="sf-dot"></span>
            <span class="sf-dot"></span>
            Analyse en cours...
          </span>
        </button>

        <p class="sf-error" *ngIf="errorMessage">⚠️ {{errorMessage}}</p>
      </div>

      <!-- Conseils rapides -->
      <div class="sf-tips-card">
        <h4>💡 Conseils photo</h4>
        <ul>
          <li>Photographiez la face supérieure de la feuille</li>
          <li>Bonne lumière naturelle, sans flash</li>
          <li>Feuille à plat, nette et centrée</li>
          <li>Incluez les zones symptomatiques</li>
        </ul>
      </div>
    </aside>

    <!-- ── Zone principale : résultat ───────────────────────────────────── -->
    <main class="sf-main">

      <!-- État d'attente -->
      <div class="sf-empty" *ngIf="!result && !isAnalyzing" [@fadeSlide]>
        <div class="sf-empty-icon">🌱</div>
        <h2>Prêt pour l'analyse</h2>
        <p>Sélectionnez une photo de feuille et lancez l'analyse pour obtenir un diagnostic précis.</p>
        <div class="sf-empty-diseases">
          <span *ngFor="let d of exampleDiseases" class="sf-disease-tag">{{d}}</span>
        </div>
      </div>

      <!-- Animation de scan -->
      <div class="sf-scanning" *ngIf="isAnalyzing" [@scanLine]>
        <div class="sf-scan-container">
          <img *ngIf="imagePreview" [src]="imagePreview" class="sf-scan-img" alt="">
          <div class="sf-scan-overlay">
            <div class="sf-scan-line"></div>
            <div class="sf-scan-corners">
              <span class="sf-corner sf-corner--tl"></span>
              <span class="sf-corner sf-corner--tr"></span>
              <span class="sf-corner sf-corner--bl"></span>
              <span class="sf-corner sf-corner--br"></span>
            </div>
          </div>
        </div>
        <div class="sf-scan-steps">
          <div class="sf-step" [class.sf-step--active]="scanStep >= 1" [class.sf-step--done]="scanStep > 1">
            <span class="sf-step-dot"></span> Traitement de l'image
          </div>
          <div class="sf-step" [class.sf-step--active]="scanStep >= 2" [class.sf-step--done]="scanStep > 2">
            <span class="sf-step-dot"></span> Analyse des symptômes
          </div>
          <div class="sf-step" [class.sf-step--active]="scanStep >= 3" [class.sf-step--done]="scanStep > 3">
            <span class="sf-step-dot"></span> Identification de la maladie
          </div>
          <div class="sf-step" [class.sf-step--active]="scanStep >= 4">
            <span class="sf-step-dot"></span> Génération du traitement
          </div>
        </div>
      </div>

      <!-- Résultat du diagnostic -->
      <div class="sf-result" *ngIf="result && !isAnalyzing" [@fadeSlide]>

        <!-- Badge état -->
        <div class="sf-result-header" [ngClass]="'sf-result-header--' + graviteClass">
          <div class="sf-result-badge">
            <span class="sf-result-emoji">{{result.estSaine ? '✅' : graviteEmoji}}</span>
            <div>
              <h2>{{result.estSaine ? 'Plante saine !' : result.maladie}}</h2>
              <p *ngIf="!result.estSaine" class="sf-sci-name">{{result.nomScientifique}}</p>
            </div>
          </div>
          <div class="sf-result-meta">
            <div class="sf-confidence">
              <span class="sf-confidence-val">{{result.confiance}}%</span>
              <span class="sf-confidence-lbl">confiance</span>
              <div class="sf-confidence-bar">
                <div class="sf-confidence-fill" [style.width.%]="result.confiance"></div>
              </div>
            </div>
            <div class="sf-gravite-badge" [ngClass]="'sf-grav--' + graviteClass">
              {{result.gravite}}
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="sf-card">
          <h3>📋 Diagnostic</h3>
          <p class="sf-description">{{result.description}}</p>
          <div class="sf-meteo-info" *ngIf="result.conditionsMeteo">
            <span>🌦️</span> <em>{{result.conditionsMeteo}}</em>
          </div>
        </div>

        <!-- Causes -->
        <div class="sf-card" *ngIf="result.causesFrequentes?.length">
          <h3>⚠️ Causes fréquentes</h3>
          <div class="sf-tags">
            <span *ngFor="let c of result.causesFrequentes" class="sf-tag sf-tag--cause">{{c}}</span>
          </div>
        </div>

        <!-- Traitements -->
        <div class="sf-card sf-card--treatment" *ngIf="!result.estSaine">
          <h3>💊 Traitements recommandés</h3>

          <div class="sf-urgence" *ngIf="result.traitements?.urgence">
            <span class="sf-urgence-icon">🚨</span>
            <div>
              <strong>Action immédiate :</strong>
              <p>{{result.traitements.urgence}}</p>
            </div>
          </div>

          <div class="sf-treatment-grid">
            <div class="sf-treatment-col sf-treatment-col--bio">
              <h4>🌿 Traitement biologique</h4>
              <ul>
                <li *ngFor="let t of result.traitements?.bio">{{t}}</li>
              </ul>
            </div>
            <div class="sf-treatment-col sf-treatment-col--conv">
              <h4>🧪 Traitement conventionnel</h4>
              <ul>
                <li *ngFor="let t of result.traitements?.conventionnel">{{t}}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Prévention -->
        <div class="sf-card" *ngIf="result.prevention?.length">
          <h3>🛡️ Prévention</h3>
          <ul class="sf-prevention-list">
            <li *ngFor="let p of result.prevention; let i = index">
              <span class="sf-prev-num">{{i+1}}</span> {{p}}
            </li>
          </ul>
        </div>

        <!-- Cultures concernées -->
        <div class="sf-card" *ngIf="result.culturesConcernees?.length">
          <h3>🌾 Cultures susceptibles</h3>
          <div class="sf-tags">
            <span *ngFor="let c of result.culturesConcernees" class="sf-tag sf-tag--culture">{{c}}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="sf-result-actions">
          <button class="sf-btn sf-btn--primary" (click)="reinitialiser()">
            📷 Nouvelle analyse
          </button>
          <button class="sf-btn sf-btn--outline" (click)="exporterPDF()">
            📄 Exporter rapport
          </button>
        </div>
      </div>
    </main>

    <!-- ── Historique ─────────────────────────────────────────────────────── -->
    <aside class="sf-history" *ngIf="historique.length > 0">
      <h3 class="sf-history-title">🕒 Historique</h3>
      <div class="sf-history-list">
        <div *ngFor="let item of historiqueDesc"
             class="sf-history-item"
             [class.sf-history-item--saine]="item.result.estSaine"
             (click)="chargerHistorique(item)">
          <img [src]="item.imageUrl" [alt]="item.result.maladie" class="sf-history-thumb">
          <div class="sf-history-info">
            <p class="sf-history-maladie">{{item.result.estSaine ? '✅ Saine' : item.result.maladie}}</p>
            <p class="sf-history-culture">{{item.culture || 'Générale'}}</p>
            <p class="sf-history-date">{{item.date | date:'dd/MM HH:mm'}}</p>
          </div>
          <div class="sf-history-grav" [ngClass]="'sf-grav--' + getGraviteClass(item.result.gravite)">
            {{item.result.confiance}}%
          </div>
        </div>
      </div>
    </aside>
  </div>
</div>
  `,
  styles: [`
    /* ── Variables ──────────────────────────────────────────────────────────── */
    :host {
      --green-dark:   #1a4731;
      --green-mid:    #2d7a4f;
      --green-light:  #4caf7d;
      --green-pale:   #e8f5ee;
      --amber:        #f59e0b;
      --red:          #dc2626;
      --orange:       #ea580c;
      --blue:         #2563eb;
      --surface:      #ffffff;
      --surface-2:    #f7f9f7;
      --border:       #d4e8db;
      --text:         #1a2e1f;
      --text-muted:   #5a7a64;
      --radius:       14px;
      --shadow:       0 2px 16px rgba(26,71,49,.10);
      --shadow-lg:    0 8px 40px rgba(26,71,49,.16);
      font-family: 'Georgia', 'Times New Roman', serif;
    }

    /* ── Root layout ────────────────────────────────────────────────────────── */
    .sf-root { min-height: 100vh; background: var(--surface-2); }

    /* ── Header ─────────────────────────────────────────────────────────────── */
    .sf-header {
      position: relative; overflow: hidden;
      background: var(--green-dark);
      color: white; padding: 32px 40px;
    }
    .sf-header-bg {
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 60% 80% at 80% 50%, rgba(77,175,125,.25) 0%, transparent 70%),
        radial-gradient(ellipse 40% 60% at 10% 80%, rgba(45,122,79,.30) 0%, transparent 70%);
    }
    .sf-header-content { position: relative; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; }
    .sf-logo { display: flex; align-items: center; gap: 16px; }
    .sf-logo-icon { font-size: 2.8rem; }
    .sf-logo h1 { margin: 0; font-size: 2rem; font-weight: 700; letter-spacing: -.5px; }
    .sf-logo p  { margin: 4px 0 0; opacity: .75; font-size: .9rem; font-style: italic; }
    .sf-stats-row { display: flex; gap: 32px; }
    .sf-stat { text-align: center; }
    .sf-stat-val { display: block; font-size: 1.8rem; font-weight: 700; }
    .sf-stat-lbl { font-size: .75rem; opacity: .7; }

    /* ── Body 3 colonnes ────────────────────────────────────────────────────── */
    .sf-body {
      display: grid;
      grid-template-columns: 320px 1fr;
      grid-template-rows: auto;
      gap: 24px;
      padding: 28px 32px;
      max-width: 1400px;
      margin: 0 auto;
    }
    @media (max-width: 900px) {
      .sf-body { grid-template-columns: 1fr; padding: 16px; }
    }

    /* ── Sidebar ─────────────────────────────────────────────────────────────── */
    .sf-sidebar { display: flex; flex-direction: column; gap: 16px; }

    /* Upload zone */
    .sf-upload-zone {
      border: 2.5px dashed var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      min-height: 220px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center; padding: 24px;
      cursor: pointer;
      transition: all .25s;
      position: relative; overflow: hidden;
    }
    .sf-upload-zone:hover { border-color: var(--green-mid); background: var(--green-pale); }
    .sf-upload-zone--dragover { border-color: var(--green-light); background: var(--green-pale); transform: scale(1.01); }
    .sf-upload-zone--has-image { border-style: solid; padding: 0; cursor: default; }
    .sf-upload-icon { font-size: 3rem; margin-bottom: 8px; }
    .sf-upload-title { font-weight: 600; color: var(--text); margin: 0 0 4px; }
    .sf-upload-sub   { font-size: .8rem; color: var(--text-muted); margin: 0 0 16px; }
    .sf-upload-actions { display: flex; gap: 10px; }
    .sf-preview-img { width: 100%; height: 100%; object-fit: cover; border-radius: calc(var(--radius) - 2px); }
    .sf-preview-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,.4);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity .2s;
      border-radius: calc(var(--radius) - 2px);
    }
    .sf-upload-zone--has-image:hover .sf-preview-overlay { opacity: 1; }

    /* Camera */
    .sf-camera-zone { background: #000; border-radius: var(--radius); overflow: hidden; position: relative; }
    .sf-camera-video { width: 100%; display: block; }
    .sf-camera-controls { position: absolute; bottom: 12px; left: 0; right: 0; display: flex; justify-content: center; gap: 12px; }

    /* Config card */
    .sf-config-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: var(--shadow);
    }
    .sf-config-title { margin: 0 0 16px; font-size: 1rem; font-weight: 600; color: var(--text); }
    .sf-field { margin-bottom: 14px; }
    .sf-field label { display: block; font-size: .82rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
    .sf-select {
      width: 100%; padding: 9px 12px; border: 1.5px solid var(--border);
      border-radius: 8px; background: var(--surface-2);
      color: var(--text); font-size: .9rem;
      outline: none; transition: border-color .2s;
    }
    .sf-select:focus { border-color: var(--green-mid); }

    /* Boutons */
    .sf-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 18px; border-radius: 9px; border: none;
      font-size: .9rem; font-weight: 600; cursor: pointer;
      transition: all .2s; white-space: nowrap;
    }
    .sf-btn--primary  { background: var(--green-mid); color: white; }
    .sf-btn--primary:hover:not(:disabled) { background: var(--green-dark); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(45,122,79,.35); }
    .sf-btn--outline  { background: transparent; color: var(--green-mid); border: 1.5px solid var(--green-mid); }
    .sf-btn--outline:hover { background: var(--green-pale); }
    .sf-btn--ghost    { background: rgba(255,255,255,.2); color: white; border: 1px solid rgba(255,255,255,.4); }
    .sf-btn--capture  { background: white; color: var(--green-dark); font-size: 1rem; padding: 12px 28px; }
    .sf-btn--analyse  {
      width: 100%; margin-top: 8px; padding: 14px;
      background: linear-gradient(135deg, var(--green-mid), var(--green-dark));
      color: white; font-size: 1rem; border-radius: 10px;
      box-shadow: 0 4px 20px rgba(45,122,79,.4);
    }
    .sf-btn--analyse:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(45,122,79,.5); }
    .sf-btn--analyse:disabled { opacity: .5; cursor: not-allowed; transform: none; }

    /* Dots loader */
    .sf-analyzing-txt { display: flex; align-items: center; gap: 6px; }
    .sf-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: white;
      animation: sfDot 1.2s infinite;
    }
    .sf-dot:nth-child(2) { animation-delay: .2s; }
    .sf-dot:nth-child(3) { animation-delay: .4s; }
    @keyframes sfDot { 0%,80%,100%{transform:scale(0);opacity:.4} 40%{transform:scale(1);opacity:1} }

    .sf-error { color: var(--red); font-size: .85rem; margin: 8px 0 0; text-align: center; }

    /* Tips */
    .sf-tips-card {
      background: var(--green-pale);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 18px;
    }
    .sf-tips-card h4 { margin: 0 0 10px; font-size: .9rem; color: var(--green-dark); }
    .sf-tips-card ul { margin: 0; padding-left: 18px; }
    .sf-tips-card li { font-size: .82rem; color: var(--text-muted); margin-bottom: 5px; }

    /* ── Main content ─────────────────────────────────────────────────────────── */
    .sf-main { display: flex; flex-direction: column; gap: 0; }

    /* Empty state */
    .sf-empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; text-align: center;
      padding: 60px 32px;
      background: var(--surface);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      height: 100%;
    }
    .sf-empty-icon { font-size: 4rem; margin-bottom: 16px; }
    .sf-empty h2   { margin: 0 0 8px; color: var(--text); }
    .sf-empty p    { color: var(--text-muted); max-width: 420px; margin: 0 0 24px; }
    .sf-empty-diseases { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
    .sf-disease-tag {
      padding: 4px 12px; border-radius: 20px;
      background: var(--green-pale); border: 1px solid var(--border);
      font-size: .8rem; color: var(--green-dark);
    }

    /* Scanning animation */
    .sf-scanning {
      display: flex; flex-direction: column; align-items: center;
      gap: 32px; padding: 40px;
      background: var(--surface); border-radius: var(--radius);
      border: 1px solid var(--border);
    }
    .sf-scan-container {
      position: relative; width: 260px; height: 260px;
      border-radius: 12px; overflow: hidden;
    }
    .sf-scan-img { width: 100%; height: 100%; object-fit: cover; }
    .sf-scan-overlay {
      position: absolute; inset: 0;
      background: rgba(26,71,49,.15);
    }
    .sf-scan-line {
      position: absolute; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, transparent, var(--green-light), transparent);
      box-shadow: 0 0 16px var(--green-light);
      animation: scanMove 1.8s ease-in-out infinite;
    }
    @keyframes scanMove {
      0%   { top: 0; }
      50%  { top: calc(100% - 3px); }
      100% { top: 0; }
    }
    .sf-scan-corners { position: absolute; inset: 0; }
    .sf-corner {
      position: absolute; width: 20px; height: 20px;
      border-color: var(--green-light); border-style: solid;
    }
    .sf-corner--tl { top: 8px; left: 8px; border-width: 3px 0 0 3px; }
    .sf-corner--tr { top: 8px; right: 8px; border-width: 3px 3px 0 0; }
    .sf-corner--bl { bottom: 8px; left: 8px; border-width: 0 0 3px 3px; }
    .sf-corner--br { bottom: 8px; right: 8px; border-width: 0 3px 3px 0; }

    .sf-scan-steps { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 320px; }
    .sf-step { display: flex; align-items: center; gap: 10px; font-size: .9rem; color: var(--text-muted); transition: color .3s; }
    .sf-step--active { color: var(--green-mid); font-weight: 600; }
    .sf-step--done   { color: var(--green-light); }
    .sf-step-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--border); transition: background .3s;
    }
    .sf-step--active .sf-step-dot { background: var(--green-mid); box-shadow: 0 0 8px var(--green-light); animation: sfDot 1s infinite; }
    .sf-step--done   .sf-step-dot { background: var(--green-light); animation: none; }

    /* ── Résultat ──────────────────────────────────────────────────────────────── */
    .sf-result { display: flex; flex-direction: column; gap: 16px; }

    .sf-result-header {
      border-radius: var(--radius);
      padding: 24px 28px;
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
      color: white;
    }
    .sf-result-header--saine    { background: linear-gradient(135deg, #166534, #22c55e); }
    .sf-result-header--faible   { background: linear-gradient(135deg, #15803d, #4ade80); }
    .sf-result-header--modere   { background: linear-gradient(135deg, #92400e, #f59e0b); }
    .sf-result-header--eleve    { background: linear-gradient(135deg, #9a3412, #fb923c); }
    .sf-result-header--critique { background: linear-gradient(135deg, #7f1d1d, #ef4444); }

    .sf-result-badge { display: flex; align-items: center; gap: 16px; }
    .sf-result-emoji { font-size: 2.8rem; }
    .sf-result-badge h2 { margin: 0; font-size: 1.5rem; }
    .sf-sci-name { margin: 4px 0 0; font-style: italic; opacity: .85; font-size: .9rem; }
    .sf-result-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
    .sf-confidence { text-align: right; }
    .sf-confidence-val { font-size: 2rem; font-weight: 700; }
    .sf-confidence-lbl { font-size: .75rem; opacity: .8; margin-left: 4px; }
    .sf-confidence-bar {
      width: 140px; height: 6px;
      background: rgba(255,255,255,.3); border-radius: 3px; margin-top: 4px;
    }
    .sf-confidence-fill { height: 100%; border-radius: 3px; background: white; transition: width .8s; }
    .sf-gravite-badge {
      padding: 4px 14px; border-radius: 20px;
      background: rgba(255,255,255,.2); border: 1px solid rgba(255,255,255,.4);
      font-size: .85rem; font-weight: 600;
    }

    /* Gravité colors for badges */
    .sf-grav--saine    { background: #dcfce7; color: #15803d; border-color: #86efac; }
    .sf-grav--faible   { background: #dcfce7; color: #15803d; border-color: #86efac; }
    .sf-grav--modere   { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
    .sf-grav--eleve    { background: #ffedd5; color: #9a3412; border-color: #fb923c; }
    .sf-grav--critique { background: #fee2e2; color: #7f1d1d; border-color: #f87171; }

    /* Cards */
    .sf-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 24px;
      box-shadow: var(--shadow);
    }
    .sf-card h3 { margin: 0 0 14px; font-size: 1rem; font-weight: 700; color: var(--text); }
    .sf-card--treatment { border-left: 4px solid var(--green-mid); }

    .sf-description { color: var(--text); line-height: 1.7; margin: 0; }
    .sf-meteo-info  { margin-top: 12px; padding: 10px 14px; background: #eff6ff; border-radius: 8px; font-size: .88rem; color: #1d4ed8; display: flex; gap: 8px; align-items: flex-start; }

    .sf-urgence {
      display: flex; gap: 14px; align-items: flex-start;
      background: #fff7ed; border: 1px solid #fed7aa;
      border-radius: 10px; padding: 14px 16px; margin-bottom: 16px;
    }
    .sf-urgence-icon { font-size: 1.5rem; }
    .sf-urgence strong { display: block; color: var(--orange); margin-bottom: 4px; }
    .sf-urgence p { margin: 0; color: var(--text); font-size: .9rem; }

    .sf-treatment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 700px) { .sf-treatment-grid { grid-template-columns: 1fr; } }
    .sf-treatment-col { padding: 16px; border-radius: 10px; }
    .sf-treatment-col--bio  { background: #f0fdf4; border: 1px solid #86efac; }
    .sf-treatment-col--conv { background: #f0f9ff; border: 1px solid #7dd3fc; }
    .sf-treatment-col h4 { margin: 0 0 10px; font-size: .9rem; color: var(--text); }
    .sf-treatment-col ul { margin: 0; padding-left: 18px; }
    .sf-treatment-col li { font-size: .87rem; color: var(--text); margin-bottom: 6px; line-height: 1.5; }

    .sf-prevention-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .sf-prevention-list li { display: flex; align-items: flex-start; gap: 10px; font-size: .9rem; color: var(--text); }
    .sf-prev-num {
      min-width: 24px; height: 24px;
      background: var(--green-mid); color: white;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: .75rem; font-weight: 700;
    }

    .sf-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .sf-tag { padding: 4px 12px; border-radius: 20px; font-size: .82rem; font-weight: 500; }
    .sf-tag--cause   { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .sf-tag--culture { background: var(--green-pale); color: var(--green-dark); border: 1px solid var(--border); }

    .sf-result-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px; }

    /* ── Historique ──────────────────────────────────────────────────────────── */
    .sf-history {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      grid-column: 1 / -1;
      box-shadow: var(--shadow);
    }
    .sf-history-title { margin: 0 0 16px; font-size: 1rem; font-weight: 700; color: var(--text); }
    .sf-history-list { display: flex; flex-wrap: wrap; gap: 12px; }
    .sf-history-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px;
      border: 1px solid var(--border); border-radius: 10px;
      cursor: pointer; transition: all .2s; background: var(--surface-2);
      min-width: 220px;
    }
    .sf-history-item:hover { border-color: var(--green-mid); background: var(--green-pale); transform: translateY(-2px); }
    .sf-history-item--saine { border-left: 3px solid #22c55e; }
    .sf-history-thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 8px; }
    .sf-history-maladie { margin: 0; font-weight: 600; font-size: .88rem; color: var(--text); }
    .sf-history-culture { margin: 2px 0; font-size: .78rem; color: var(--text-muted); }
    .sf-history-date    { margin: 0; font-size: .72rem; color: var(--text-muted); }
    .sf-history-grav {
      margin-left: auto;
      padding: 3px 10px; border-radius: 12px;
      font-size: .8rem; font-weight: 700;
      border: 1px solid var(--border);
    }
  `]
})
export class LeafScanComponent implements OnInit, OnDestroy {

  @ViewChild('fileInput')  fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('videoEl')    videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl')   canvasEl!: ElementRef<HTMLCanvasElement>;

  private readonly API = 'http://localhost:5160/api/LeafScan/analyze';
  // 🧪 Flag pour activer le mock (true = données factices, false = appel réel)
  private useMock: boolean = false;   // ← Passe à true pour tester sans backend

  // ── State ──────────────────────────────────────────────────────────────────
  imagePreview:    string | null = null;
  imageBase64:     string        = '';
  imageMediaType:  string        = 'image/jpeg';
  selectedCulture: string        = '';
  selectedRegion:  string        = 'Tunisie';
  isAnalyzing:     boolean       = false;
  isDragging:      boolean       = false;
  showCamera:      boolean       = false;
  errorMessage:    string        = '';
  result:          DiagnosticResult | null = null;
  scanStep:        number        = 0;
  historique:      HistoriqueItem[]        = [];
  private stepTimer: any;
  private stream:    MediaStream | null    = null;
  private histId:    number                = 0;

  exampleDiseases = [
    'Mildiou', 'Rouille', 'Oïdium', 'Alternariose',
    'Botrytis', 'Taches foliaires', 'Chlorose', 'Brûlure bactérienne'
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Charger historique depuis localStorage
    try {
      const saved = localStorage.getItem('phyto_historique');
      if (saved) this.historique = JSON.parse(saved);
    } catch {}
  }

  ngOnDestroy(): void {
    clearInterval(this.stepTimer);
    this.fermerCamera();
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  get graviteClass(): string {
    if (!this.result) return 'saine';
    if (this.result.estSaine) return 'saine';
    return this.getGraviteClass(this.result.gravite);
  }

  getGraviteClass(g: string): string {
    const map: Record<string, string> = {
      'Faible': 'faible', 'Modéré': 'modere',
      'Élevé': 'eleve', 'Critique': 'critique'
    };
    return map[g] ?? 'faible';
  }

  get graviteEmoji(): string {
    const map: Record<string, string> = {
      'Faible': '🟡', 'Modéré': '🟠', 'Élevé': '🔴', 'Critique': '🚨'
    };
    return this.result ? (map[this.result.gravite] ?? '⚠️') : '';
  }

  get historiqueDesc(): HistoriqueItem[] {
    return [...this.historique].reverse();
  }

  get maladiesDetectees(): number {
    return this.historique.filter(h => !h.result.estSaine).length;
  }

  get confMoyenne(): number {
    if (!this.historique.length) return 0;
    const sum = this.historique.reduce((s, h) => s + h.result.confiance, 0);
    return Math.round(sum / this.historique.length);
  }

  // ── Upload / Drag & Drop ──────────────────────────────────────────────────

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = true;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) this.processFile(file);
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.processFile(file);
  }

  private processFile(file: File): void {
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'Image trop volumineuse (max 10 Mo)';
      return;
    }
    this.errorMessage  = '';
    this.imageMediaType = file.type || 'image/jpeg';

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      this.imagePreview = dataUrl;
      this.imageBase64  = dataUrl.split(',')[1];
      this.result = null;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  // ── Caméra ────────────────────────────────────────────────────────────────

  async ouvrirCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      this.showCamera = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        if (this.videoEl?.nativeElement) {
          this.videoEl.nativeElement.srcObject = this.stream;
        }
      }, 100);
    } catch {
      this.errorMessage = 'Accès à la caméra refusé';
    }
  }

  capturePhoto(): void {
    const video  = this.videoEl.nativeElement;
    const canvas = this.canvasEl.nativeElement;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const dataUrl       = canvas.toDataURL('image/jpeg', 0.92);
    this.imagePreview   = dataUrl;
    this.imageBase64    = dataUrl.split(',')[1];
    this.imageMediaType = 'image/jpeg';
    this.result         = null;
    this.fermerCamera();
  }

  fermerCamera(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream     = null;
    this.showCamera = false;
  }

  // ── Analyse ───────────────────────────────────────────────────────────────

  async analyser(): Promise<void> {
    if (!this.imageBase64 || this.imageBase64.length < 100) {
      this.errorMessage = 'Veuillez sélectionner une image valide.';
      return;
    }
    if (this.isAnalyzing) return;
    this.isAnalyzing  = true;
    this.errorMessage = '';
    this.result       = null;
    this.scanStep     = 1;

    // Simulation visuelle des étapes
    this.stepTimer = setInterval(() => {
      if (this.scanStep < 4) this.scanStep++;
    }, 900);

    try {
      // 🧪 MOCK : données de test
      if (this.useMock) {
        console.log('🔧 Mode MOCK actif – utilisation de données factices');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const mockResult: DiagnosticResult = {
          estSaine: false,
          maladie: 'Rouille jaune (Puccinia striiformis)',
          nomScientifique: 'Puccinia striiformis f. sp. tritici',
          gravite: 'Modéré',
          confiance: 87,
          description: 'Présence de pustules jaune-orangé disposées linéairement sur les feuilles. Symptômes typiques de la rouille jaune sur céréales.',
          causesFrequentes: [
            'Humidité relative élevée (>80%)',
            'Températures douces (10-15°C)',
            'Variétés sensibles',
            'Excès d’azote'
          ],
          traitements: {
            bio: [
              'Purin d’ortie (pulvérisation tous les 10 jours)',
              'Décoction de prêle (renforce les défenses)',
              'Bicarbonate de soude (1 cuillère/L)'
            ],
            conventionnel: [
              'Triazole (ex: Tébucanozole)',
              'Strobilurine (ex: Azoxystrobine)',
              'Application préventive avant la floraison'
            ],
            urgence: 'Retirer et brûler les feuilles fortement atteintes. Appliquer un fongicide systémique dans les 48h.'
          },
          prevention: [
            'Rotation des cultures (3 ans sans céréales)',
            'Utiliser des variétés résistantes (ex: génétique Yr)',
            'Éviter les excès d’engrais azotés',
            'Surveiller les conditions météo (alerte rouille)'
          ],
          conditionsMeteo: 'Printemps humide et frais (T° 8-15°C, pluies fréquentes) favorise le développement de la rouille.',
          culturesConcernees: ['Blé', 'Orge', 'Seigle', 'Triticale']
        };
        this.result = mockResult;
        this.sauvegarderHistorique(mockResult);
        console.log('✅ Mock assigné avec succès', this.result);
      } else {
        // Appel réel à l'API
        const body = {
          imageBase64: this.imageBase64,
          mediaType:   this.imageMediaType,
          culture:     this.selectedCulture || '',
          region:      this.selectedRegion
        };
        const response = await this.http.post<DiagnosticResult>(this.API, body).toPromise();
        if (response) {
          this.result = response;
          this.sauvegarderHistorique(response);
        } else {
          this.errorMessage = 'Réponse vide du serveur';
        }
      }
    } catch (err: any) {
      console.error('Erreur analyse:', err);
      this.errorMessage = err?.error?.error ?? err?.message ?? 'Erreur lors de l\'analyse';
    } finally {
      clearInterval(this.stepTimer);
      this.isAnalyzing = false;
      this.scanStep    = 0;
      this.cdr.detectChanges();
    }
  }

  // ── Historique ────────────────────────────────────────────────────────────

  private sauvegarderHistorique(result: DiagnosticResult): void {
    const item: HistoriqueItem = {
      id:       ++this.histId,
      date:     new Date(),
      imageUrl: this.imagePreview!,
      culture:  this.selectedCulture,
      result
    };
    this.historique.push(item);

    // Garder 20 entrées max
    if (this.historique.length > 20) this.historique.shift();

    try {
      localStorage.setItem('phyto_historique', JSON.stringify(
        this.historique.map(h => ({ ...h, imageUrl: '' })) // ne pas stocker les images
      ));
    } catch {}
  }

  chargerHistorique(item: HistoriqueItem): void {
    this.result       = item.result;
    this.imagePreview = item.imageUrl || null;
    this.cdr.detectChanges();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  reinitialiser(): void {
    this.imagePreview = null;
    this.imageBase64  = '';
    this.result       = null;
    this.errorMessage = '';
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  exporterPDF(): void {
    if (!this.result) return;
    const w = window.open('', '_blank')!;
    const date = new Date().toLocaleString('fr-FR');
    w.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Rapport PhytoDiag — ${this.result.maladie}</title>
        <style>
          body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #1a2e1f; }
          h1   { color: #1a4731; border-bottom: 3px solid #2d7a4f; padding-bottom: 10px; }
          h2   { color: #2d7a4f; margin-top: 28px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; background: #e8f5ee; color: #1a4731; font-weight: bold; }
          ul { line-height: 1.8; }
          .meta { color: #5a7a64; font-size: .9em; margin-bottom: 24px; }
          .urgence { background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; border-radius: 0 8px 8px 0; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          td, th { padding: 8px 12px; border: 1px solid #d4e8db; text-align: left; }
          th { background: #e8f5ee; font-weight: 600; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>🔬 Rapport de diagnostic phytosanitaire</h1>
        <p class="meta">Généré le ${date} | Culture : ${this.selectedCulture || 'Générale'} | Région : ${this.selectedRegion}</p>

        <h2>${this.result.estSaine ? '✅ Plante saine' : '⚠️ ' + this.result.maladie}</h2>
        ${!this.result.estSaine ? `<p><em>${this.result.nomScientifique}</em></p>` : ''}
        <p>
          <span class="badge">Gravité : ${this.result.gravite}</span>
          &nbsp;
          <span class="badge">Confiance : ${this.result.confiance}%</span>
        </p>

        <h2>📋 Description</h2>
        <p>${this.result.description}</p>
        ${this.result.conditionsMeteo ? `<p><em>🌦️ ${this.result.conditionsMeteo}</em></p>` : ''}

        ${this.result.causesFrequentes?.length ? `
        <h2>⚠️ Causes fréquentes</h2>
        <ul>${this.result.causesFrequentes.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}

        ${!this.result.estSaine && this.result.traitements ? `
        <h2>💊 Traitements</h2>
        ${this.result.traitements.urgence ? `<div class="urgence"><strong>🚨 Action immédiate :</strong> ${this.result.traitements.urgence}</div>` : ''}
        <table>
          <tr><th>🌿 Biologique</th><th>🧪 Conventionnel</th></tr>
          <tr>
            <td><ul>${(this.result.traitements.bio||[]).map(t=>`<li>${t}</li>`).join('')}</ul></td>
            <td><ul>${(this.result.traitements.conventionnel||[]).map(t=>`<li>${t}</li>`).join('')}</ul></td>
          </tr>
        </table>` : ''}

        ${this.result.prevention?.length ? `
        <h2>🛡️ Prévention</h2>
        <ol>${this.result.prevention.map(p => `<li>${p}</li>`).join('')}</ol>` : ''}

        ${this.result.culturesConcernees?.length ? `
        <h2>🌾 Cultures susceptibles</h2>
        <p>${this.result.culturesConcernees.join(' — ')}</p>` : ''}

        <hr style="margin-top:40px;border-color:#d4e8db">
        <p style="font-size:.8em;color:#5a7a64;text-align:center;">
          Rapport généré par PhytoDiag — AgriManager<br>
          Ce diagnostic est indicatif. Consultez un agronome pour confirmation.
        </p>
        <script>window.print();<\/script>
      </body></html>
    `);
    w.document.close();
  }
}
