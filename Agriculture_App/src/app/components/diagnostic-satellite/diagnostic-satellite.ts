// components/diagnostic-satellite/diagnostic-satellite.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface PlantProfile {
  id: string;
  name: string;
  scientificName: string;
  emoji: string;
  coldMin: number;
  coldOptMin: number;
  coldOptMax: number;
  coldMax: number;
  heatBase: number;
  heatFlowering: number;
  heatMaturation: number;
  stages: PhenologicalStage[];
}

interface PhenologicalStage {
  name: string;
  nameAr?: string;
  gdd: number;
  icon: string;
}

interface DailyClimate {
  date: string;
  tmin: number;
  tmax: number;
  tmean: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
}

interface UFResult {
  date: string;
  daily: number;
  cumulative: number;
}

interface UCResult {
  date: string;
  daily: number;
  cumulative: number;
}

interface Alert {
  type: 'success' | 'warning' | 'danger' | 'info';
  icon: string;
  title: string;
  message: string;
}

type ActiveTab = 'dashboard' | 'thermal' | 'forecast' | 'recommendations' | 'history';

// ─── Constantes ────────────────────────────────────────────────────────────────

const PLANTS: PlantProfile[] = [
  {
    id: 'wheat',
    name: 'Blé dur',
    scientificName: 'Triticum durum',
    emoji: '🌾',
    coldMin: 400, coldOptMin: 450, coldOptMax: 550, coldMax: 600,
    heatBase: 0, heatFlowering: 900, heatMaturation: 2200,
    stages: [
      { name: 'Germination',       gdd: 100,  icon: '🌱' },
      { name: 'Tallage',           gdd: 300,  icon: '🌿' },
      { name: 'Montaison',         gdd: 600,  icon: '📏' },
      { name: 'Épiaison',          gdd: 900,  icon: '🌾' },
      { name: 'Floraison',         gdd: 1200, icon: '🌸' },
      { name: 'Maturation',        gdd: 2200, icon: '🟡' },
    ]
  },
  {
    id: 'barley',
    name: 'Orge',
    scientificName: 'Hordeum vulgare',
    emoji: '🌾',
    coldMin: 300, coldOptMin: 350, coldOptMax: 450, coldMax: 500,
    heatBase: 0, heatFlowering: 750, heatMaturation: 1900,
    stages: [
      { name: 'Germination',       gdd: 80,   icon: '🌱' },
      { name: 'Tallage',           gdd: 250,  icon: '🌿' },
      { name: 'Montaison',         gdd: 500,  icon: '📏' },
      { name: 'Épiaison',          gdd: 750,  icon: '🌾' },
      { name: 'Floraison',         gdd: 950,  icon: '🌸' },
      { name: 'Maturation',        gdd: 1900, icon: '🟡' },
    ]
  },
  {
    id: 'apricot',
    name: 'Abricotier',
    scientificName: 'Prunus armeniaca',
    emoji: '🍑',
    coldMin: 500, coldOptMin: 600, coldOptMax: 800, coldMax: 900,
    heatBase: 4, heatFlowering: 400, heatMaturation: 1200,
    stages: [
      { name: 'Débourrement',      gdd: 50,   icon: '🌱' },
      { name: 'Gonflement bourgeons', gdd: 100, icon: '🌿' },
      { name: 'Éclatement',        gdd: 150,  icon: '🌸' },
      { name: 'Floraison',         gdd: 400,  icon: '🌼' },
      { name: 'Nouaison',          gdd: 600,  icon: '🍑' },
      { name: 'Grossissement',     gdd: 900,  icon: '📈' },
      { name: 'Véraison',          gdd: 1050, icon: '🟠' },
      { name: 'Récolte',           gdd: 1200, icon: '🧺' },
    ]
  },
  {
    id: 'olive',
    name: 'Olivier',
    scientificName: 'Olea europaea',
    emoji: '🫒',
    coldMin: 100, coldOptMin: 150, coldOptMax: 250, coldMax: 300,
    heatBase: 10, heatFlowering: 600, heatMaturation: 3000,
    stages: [
      { name: 'Repos végétatif',   gdd: 0,    icon: '😴' },
      { name: 'Débourrement',      gdd: 200,  icon: '🌱' },
      { name: 'Floraison',         gdd: 600,  icon: '🌸' },
      { name: 'Nouaison',          gdd: 900,  icon: '🫒' },
      { name: 'Grossissement',     gdd: 2000, icon: '📈' },
      { name: 'Récolte',           gdd: 3000, icon: '🧺' },
    ]
  },
  {
    id: 'vine',
    name: 'Vigne',
    scientificName: 'Vitis vinifera',
    emoji: '🍇',
    coldMin: 200, coldOptMin: 250, coldOptMax: 350, coldMax: 400,
    heatBase: 10, heatFlowering: 600, heatMaturation: 1800,
    stages: [
      { name: 'Débourrement',      gdd: 50,   icon: '🌱' },
      { name: 'Croissance shoots', gdd: 200,  icon: '🌿' },
      { name: 'Floraison',         gdd: 600,  icon: '🌸' },
      { name: 'Nouaison',          gdd: 800,  icon: '🍇' },
      { name: 'Véraison',          gdd: 1200, icon: '🟣' },
      { name: 'Maturité',          gdd: 1600, icon: '✅' },
      { name: 'Récolte',           gdd: 1800, icon: '🧺' },
    ]
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-diagnostic-satellite',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, DecimalPipe],
  template: `
<div class="agro-container">

  <!-- ══ EN-TÊTE ══════════════════════════════════════════════════════════════ -->
  <div class="agro-header">
    <div class="header-left">
      <div class="header-icon">🌡️</div>
      <div>
        <h2 class="header-title">Diagnostic Agroclimatique</h2>
        <p class="header-sub">Unités de Froid & Chaleur — Analyse Thermique des Cultures</p>
      </div>
    </div>
    <div class="header-right">
      <div class="location-badge" *ngIf="locationName">
        <span>📍</span> {{locationName}}
      </div>
      <button class="btn-locate" (click)="geolocate()" [disabled]="loadingGeo">
        <span *ngIf="!loadingGeo">📡 Ma Position</span>
        <span *ngIf="loadingGeo">⏳ Localisation...</span>
      </button>
    </div>
  </div>

  <!-- ══ SÉLECTEURS ════════════════════════════════════════════════════════════ -->
  <div class="selectors-bar">
    <div class="selector-group">
      <label>🌱 Culture</label>
      <select [(ngModel)]="selectedPlantId" (change)="onPlantChange()">
        <option *ngFor="let p of plants" [value]="p.id">{{p.emoji}} {{p.name}}</option>
      </select>
    </div>
    <div class="selector-group">
      <label>📅 Saison</label>
      <select [(ngModel)]="selectedYear" (change)="onYearChange()">
        <option *ngFor="let y of availableYears" [value]="y">{{y}}/{{y+1}}</option>
      </select>
    </div>
    <div class="selector-group">
      <label>🧮 Méthode UC</label>
      <select [(ngModel)]="ucMethod">
        <option value="gdd">GDD (Rectangle)</option>
        <option value="triangle">Triangle</option>
        <option value="sinus">Sinus</option>
      </select>
    </div>
    <button class="btn-analyze" (click)="analyser()" [disabled]="loading">
      <span *ngIf="!loading">🔍 Analyser</span>
      <span *ngIf="loading">⏳ Chargement...</span>
    </button>
  </div>

  <!-- ══ ERREUR ═════════════════════════════════════════════════════════════════ -->
  <div class="error-banner" *ngIf="errorMessage">
    ⚠️ {{errorMessage}}
    <button (click)="errorMessage = ''">✕</button>
  </div>

  <!-- ══ ONGLETS ════════════════════════════════════════════════════════════════ -->
  <div class="tabs-bar">
    <button *ngFor="let tab of tabs" class="tab-btn"
            [class.active]="activeTab === tab.id"
            (click)="activeTab = tab.id">
      {{tab.icon}} {{tab.label}}
    </button>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════════
       TAB 1 — TABLEAU DE BORD
       ═══════════════════════════════════════════════════════════════════════════ -->
  <div *ngIf="activeTab === 'dashboard'">

    <!-- KPI Cards -->
    <div class="kpi-grid" *ngIf="selectedPlant">
      <!-- UF -->
      <div class="kpi-card uf-card">
        <div class="kpi-icon">❄️</div>
        <div class="kpi-body">
          <div class="kpi-value">{{totalUF | number:'1.0-0'}}</div>
          <div class="kpi-label">Unités de Froid accumulées</div>
          <div class="kpi-target">Objectif: {{selectedPlant.coldOptMin}}–{{selectedPlant.coldOptMax}} UF</div>
          <div class="kpi-progress-bar">
            <div class="kpi-progress-fill uf-fill"
                 [style.width]="getUFProgressPct() + '%'"></div>
          </div>
          <div class="kpi-status" [class]="getUFStatusClass()">{{getUFStatusText()}}</div>
        </div>
      </div>

      <!-- UC -->
      <div class="kpi-card uc-card">
        <div class="kpi-icon">☀️</div>
        <div class="kpi-body">
          <div class="kpi-value">{{totalUC | number:'1.0-0'}}</div>
          <div class="kpi-label">Unités de Chaleur accumulées</div>
          <div class="kpi-target">Floraison: {{selectedPlant.heatFlowering}} UC | Récolte: {{selectedPlant.heatMaturation}} UC</div>
          <div class="kpi-progress-bar">
            <div class="kpi-progress-fill uc-fill"
                 [style.width]="getUCProgressPct() + '%'"></div>
          </div>
          <div class="kpi-status" [class]="getUCStatusClass()">{{getUCStatusText()}}</div>
        </div>
      </div>

      <!-- Jours de gel -->
      <div class="kpi-card frost-card">
        <div class="kpi-icon">🥶</div>
        <div class="kpi-body">
          <div class="kpi-value">{{frostDays}}</div>
          <div class="kpi-label">Jours de gel (Tmin &lt; 0°C)</div>
          <div class="kpi-sub" [class.danger]="frostDays > 5">
            {{frostDays === 0 ? 'Aucun gel enregistré' : frostDays + ' jours à risque'}}
          </div>
        </div>
      </div>

      <!-- Stress thermique -->
      <div class="kpi-card heat-card">
        <div class="kpi-icon">🌡️</div>
        <div class="kpi-body">
          <div class="kpi-value">{{heatStressDays}}</div>
          <div class="kpi-label">Jours de stress (Tmax &gt; 35°C)</div>
          <div class="kpi-sub" [class.danger]="heatStressDays > 10">
            {{heatStressDays === 0 ? 'Pas de stress thermique' : heatStressDays + ' jours critiques'}}
          </div>
        </div>
      </div>
    </div>

    <!-- Stade phénologique actuel -->
    <div class="stage-banner" *ngIf="currentStage">
      <span class="stage-icon">{{currentStage.icon}}</span>
      <span class="stage-label">Stade actuel : <strong>{{currentStage.name}}</strong></span>
      <span class="stage-gdd">({{totalUC | number:'1.0-0'}} / {{currentStage.gdd}} GDD)</span>
    </div>

    <!-- Alertes -->
    <div class="alerts-section" *ngIf="alerts.length > 0">
      <h4 class="section-title">🔔 Alertes & Notifications</h4>
      <div *ngFor="let alert of alerts" class="alert-item" [class]="'alert-' + alert.type">
        <span class="alert-icon">{{alert.icon}}</span>
        <div>
          <strong>{{alert.title}}</strong>
          <p>{{alert.message}}</p>
        </div>
      </div>
    </div>

    <!-- Météo actuelle courte -->
    <div class="weather-strip" *ngIf="recentDays.length > 0">
      <h4 class="section-title">📅 Derniers {{recentDays.length}} jours</h4>
      <div class="weather-days">
        <div class="weather-day" *ngFor="let d of recentDays">
          <div class="wd-date">{{formatDateShort(d.date)}}</div>
          <div class="wd-temp">
            <span class="wd-max">{{d.tmax | number:'1.0-0'}}°</span>
            <span class="wd-min">{{d.tmin | number:'1.0-0'}}°</span>
          </div>
          <div class="wd-uf">❄️ {{calcUFDay(d.tmean) | number:'1.1-1'}}</div>
          <div class="wd-uc">☀️ {{calcUCDay(d.tmean, selectedPlant?.heatBase ?? 0) | number:'1.0-0'}}</div>
        </div>
      </div>
    </div>

    <!-- Placeholder si pas encore analysé -->
    <div class="empty-state" *ngIf="!hasData">
      <div class="empty-icon">🌱</div>
      <h3>Lancez votre première analyse</h3>
      <p>Sélectionnez une culture et votre saison, puis cliquez sur <strong>Analyser</strong> pour obtenir le diagnostic agroclimatique complet.</p>
      <button class="btn-analyze-big" (click)="analyser()" [disabled]="loading">
        🔍 Analyser maintenant
      </button>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════════
       TAB 2 — ANALYSE THERMIQUE
       ═══════════════════════════════════════════════════════════════════════════ -->
  <div *ngIf="activeTab === 'thermal'">
    <div class="thermal-grid">

      <!-- Courbe UF -->
      <div class="chart-card">
        <h4 class="chart-title">❄️ Accumulation des Unités de Froid (Modèle Utah)</h4>
        <div class="chart-area" *ngIf="ufData.length > 0">
          <div class="mini-chart">
            <div class="chart-legend">
              <span class="legend-item uf-color">■ UF Cumulées</span>
              <span class="legend-item target-color">── Objectif min ({{selectedPlant?.coldOptMin}})</span>
            </div>
            <div class="bar-chart-container">
              <div *ngFor="let d of ufChartData; let i = index"
                   class="bar-wrap" [title]="d.date + ': ' + (d.cumulative | number:'1.0-0') + ' UF'">
                <div class="bar uf-bar"
                     [style.height]="getBarHeight(d.cumulative, maxUFChart) + '%'">
                </div>
                <span class="bar-label" *ngIf="i % 7 === 0">{{formatDateShort(d.date)}}</span>
              </div>
            </div>
            <!-- Target line indicator -->
            <div class="target-line-info" *ngIf="selectedPlant">
              <span>Objectif: {{selectedPlant.coldOptMin}}–{{selectedPlant.coldOptMax}} UF
                | Actuel: <strong>{{totalUF | number:'1.0-0'}} UF</strong>
                | {{getUFStatusText()}}
              </span>
            </div>
          </div>
        </div>
        <div class="no-chart" *ngIf="ufData.length === 0">Lancez une analyse pour afficher le graphique.</div>
      </div>

      <!-- Courbe UC -->
      <div class="chart-card">
        <h4 class="chart-title">☀️ Accumulation des Unités de Chaleur ({{ucMethod | uppercase}})</h4>
        <div class="chart-area" *ngIf="ucData.length > 0">
          <div class="mini-chart">
            <div class="chart-legend">
              <span class="legend-item uc-color">■ UC Cumulées</span>
              <span class="legend-item stage-color">── Stades phénologiques</span>
            </div>
            <div class="bar-chart-container">
              <div *ngFor="let d of ucChartData; let i = index"
                   class="bar-wrap" [title]="d.date + ': ' + (d.cumulative | number:'1.0-0') + ' GDD'">
                <div class="bar uc-bar"
                     [style.height]="getBarHeight(d.cumulative, maxUCChart) + '%'"
                     [class.stage-reached]="isStageReached(d.cumulative)">
                </div>
                <span class="bar-label" *ngIf="i % 7 === 0">{{formatDateShort(d.date)}}</span>
              </div>
            </div>
            <div class="stages-row" *ngIf="selectedPlant">
              <div *ngFor="let s of selectedPlant.stages" class="stage-chip">
                {{s.icon}} {{s.name}} <small>({{s.gdd}})</small>
              </div>
            </div>
          </div>
        </div>
        <div class="no-chart" *ngIf="ucData.length === 0">Lancez une analyse pour afficher le graphique.</div>
      </div>

    </div>

    <!-- Tableau détaillé -->
    <div class="detail-table-card" *ngIf="climateDays.length > 0">
      <h4 class="chart-title">📊 Données Journalières Détaillées</h4>
      <div class="table-scroll">
        <table class="detail-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>T. Min (°C)</th>
              <th>T. Max (°C)</th>
              <th>T. Moy (°C)</th>
              <th>UF Jour</th>
              <th>UF Cumul</th>
              <th>UC Jour</th>
              <th>UC Cumul</th>
              <th>Précip. (mm)</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of tableData; let i = index"
                [class.frost-row]="row.climate.tmin < 0"
                [class.heat-row]="row.climate.tmax > 35">
              <td>{{formatDateShort(row.climate.date)}}</td>
              <td [class.frost-val]="row.climate.tmin < 0">{{row.climate.tmin | number:'1.1-1'}}°</td>
              <td [class.heat-val]="row.climate.tmax > 35">{{row.climate.tmax | number:'1.1-1'}}°</td>
              <td>{{row.climate.tmean | number:'1.1-1'}}°</td>
              <td class="uf-val">{{row.uf.daily | number:'1.2-2'}}</td>
              <td class="uf-val"><strong>{{row.uf.cumulative | number:'1.0-0'}}</strong></td>
              <td class="uc-val">{{row.uc.daily | number:'1.1-1'}}</td>
              <td class="uc-val"><strong>{{row.uc.cumulative | number:'1.0-0'}}</strong></td>
              <td>{{row.climate.precipitation | number:'1.0-0'}}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════════
       TAB 3 — PRÉVISIONS
       ═══════════════════════════════════════════════════════════════════════════ -->
  <div *ngIf="activeTab === 'forecast'">
    <div class="forecast-grid" *ngIf="selectedPlant">

      <!-- Stades phénologiques prévus -->
      <div class="forecast-card">
        <h4 class="chart-title">🗓️ Stades Phénologiques Prévus</h4>
        <div class="stages-timeline">
          <div *ngFor="let stage of stageForecasts; let i = index"
               class="stage-timeline-item"
               [class.reached]="stage.reached"
               [class.current]="stage.isCurrent">
            <div class="stage-node">
              <span class="stage-node-icon">{{stage.icon}}</span>
              <div class="stage-node-line" *ngIf="i < stageForecasts.length - 1"></div>
            </div>
            <div class="stage-content">
              <div class="stage-name">{{stage.name}}</div>
              <div class="stage-gdd-info">{{stage.gdd}} GDD requis</div>
              <div class="stage-date" [class.future]="!stage.reached">
                {{stage.reached ? '✅ Atteint' : ('📅 Estimé: ' + stage.estimatedDate)}}
              </div>
              <div class="stage-progress-mini">
                <div class="stage-progress-fill"
                     [style.width]="min100(totalUC / stage.gdd * 100) + '%'"
                     [class.reached-fill]="stage.reached"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Prévision accumulation 30j -->
      <div class="forecast-card">
        <h4 class="chart-title">📈 Projection d'Accumulation (30 prochains jours)</h4>
        <div class="projection-info">
          <div class="proj-row">
            <span>📊 Vitesse actuelle UC/jour</span>
            <strong>{{avgUCPerDay | number:'1.1-1'}} GDD/j</strong>
          </div>
          <div class="proj-row">
            <span>❄️ UF actuelles</span>
            <strong>{{totalUF | number:'1.0-0'}} / {{selectedPlant.coldOptMax}}</strong>
          </div>
          <div class="proj-row">
            <span>☀️ UC actuelles</span>
            <strong>{{totalUC | number:'1.0-0'}} GDD</strong>
          </div>
          <div class="proj-row highlight">
            <span>🎯 UC prévues dans 30j</span>
            <strong>{{totalUC + avgUCPerDay * 30 | number:'1.0-0'}} GDD</strong>
          </div>
          <div class="proj-row highlight" *ngIf="daysToFlowering !== null">
            <span>🌸 Floraison estimée dans</span>
            <strong>{{daysToFlowering | number:'1.0-0'}} jours</strong>
          </div>
          <div class="proj-row highlight" *ngIf="daysToMaturation !== null">
            <span>🧺 Récolte estimée dans</span>
            <strong>{{daysToMaturation | number:'1.0-0'}} jours</strong>
          </div>
        </div>

        <!-- Impact changement climatique -->
        <div class="climate-change-section">
          <h5>🌍 Simulation Changement Climatique</h5>
          <div class="cc-scenario" *ngFor="let sc of climateScenarios">
            <span class="cc-name">{{sc.name}}</span>
            <div class="cc-bar-wrap">
              <div class="cc-bar" [style.width]="sc.ufPct + '%'" [style.background]="sc.color"></div>
            </div>
            <span class="cc-val">UF: {{sc.projectedUF | number:'1.0-0'}}</span>
          </div>
        </div>
      </div>

    </div>

    <div class="empty-state" *ngIf="!selectedPlant || !hasData">
      <div class="empty-icon">📅</div>
      <p>Lancez une analyse pour voir les prévisions.</p>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════════
       TAB 4 — RECOMMANDATIONS
       ═══════════════════════════════════════════════════════════════════════════ -->
  <div *ngIf="activeTab === 'recommendations'">
    <div class="reco-grid">

      <div class="reco-card" *ngFor="let reco of recommendations">
        <div class="reco-header" [class]="reco.priority">
          <span class="reco-icon">{{reco.icon}}</span>
          <span class="reco-category">{{reco.category}}</span>
          <span class="reco-badge">{{reco.priorityLabel}}</span>
        </div>
        <div class="reco-body">
          <h5 class="reco-title">{{reco.title}}</h5>
          <p class="reco-text">{{reco.message}}</p>
          <ul class="reco-actions" *ngIf="reco.actions.length > 0">
            <li *ngFor="let a of reco.actions">{{a}}</li>
          </ul>
        </div>
      </div>

      <div class="empty-state" *ngIf="recommendations.length === 0">
        <div class="empty-icon">💡</div>
        <p>Lancez une analyse pour obtenir des recommandations personnalisées.</p>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════════
       TAB 5 — HISTORIQUE
       ═══════════════════════════════════════════════════════════════════════════ -->
  <div *ngIf="activeTab === 'history'">
    <div class="history-section" *ngIf="selectedPlant">
      <h4 class="section-title">📈 Comparaison inter-annuelle — {{selectedPlant.name}}</h4>
      <div class="history-table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>Saison</th>
              <th>UF Totales</th>
              <th>Statut UF</th>
              <th>UC Totales</th>
              <th>Jours Gel</th>
              <th>Stress Thermique</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let h of historyData" [class.current-year]="h.year === selectedYear">
              <td><strong>{{h.year}}/{{h.year+1}}</strong>
                <span class="current-badge" *ngIf="h.year === selectedYear">Saison actuelle</span>
              </td>
              <td class="uf-val">{{h.uf | number:'1.0-0'}}</td>
              <td>
                <span class="status-pill" [class]="getStatusPillClass(h.uf, selectedPlant)">
                  {{getStatusPillText(h.uf, selectedPlant)}}
                </span>
              </td>
              <td class="uc-val">{{h.uc | number:'1.0-0'}}</td>
              <td [class.danger]="h.frost > 5">{{h.frost}}</td>
              <td [class.danger]="h.heat > 10">{{h.heat}}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mini résumé graphique historique -->
      <div class="history-bars">
        <h5>Accumulation UF par saison</h5>
        <div class="hist-bar-row" *ngFor="let h of historyData">
          <span class="hist-year">{{h.year}}</span>
          <div class="hist-bar-outer">
            <div class="hist-bar-fill uf-fill"
                 [style.width]="getBarHeight(h.uf, maxHistoryUF) + '%'">
            </div>
          </div>
          <span class="hist-val">{{h.uf | number:'1.0-0'}} UF</span>
        </div>
        <!-- Objectif line -->
        <div class="hist-objective">
          Objectif optimal: {{selectedPlant.coldOptMin}}–{{selectedPlant.coldOptMax}} UF
        </div>
      </div>
    </div>

    <div class="empty-state" *ngIf="!selectedPlant">
      <div class="empty-icon">📊</div>
      <p>Sélectionnez une culture pour voir l'historique.</p>
    </div>
  </div>

</div>
  `,
  styles: [`
  /* ── Variables ─────────────────────────────────────────────────────────── */
  :host {
    --uf:   #3b82f6;
    --uc:   #f59e0b;
    --good: #22c55e;
    --warn: #f97316;
    --bad:  #ef4444;
    --bg:   #f8fafc;
    --card: #ffffff;
    --border: #e2e8f0;
    --text: #1e293b;
    --muted: #64748b;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }

  /* ── Layout ─────────────────────────────────────────────────────────────── */
  .agro-container { padding: 0 0 2rem; color: var(--text); background: var(--bg); min-height: 100vh; }

  /* ── Header ─────────────────────────────────────────────────────────────── */
  .agro-header {
    display: flex; justify-content: space-between; align-items: center;
    background: linear-gradient(135deg, #1e3a5f 0%, #0d7c66 100%);
    color: white; padding: 1.2rem 1.5rem; border-radius: 12px; margin-bottom: 1rem;
  }
  .header-left { display: flex; align-items: center; gap: 1rem; }
  .header-icon { font-size: 2.5rem; }
  .header-title { font-size: 1.4rem; font-weight: 700; margin: 0; }
  .header-sub { font-size: 0.8rem; opacity: 0.85; margin: 0; }
  .header-right { display: flex; align-items: center; gap: 0.8rem; }
  .location-badge {
    background: rgba(255,255,255,0.2); border-radius: 20px;
    padding: 0.3rem 0.8rem; font-size: 0.8rem;
  }
  .btn-locate {
    background: rgba(255,255,255,0.25); border: 1px solid rgba(255,255,255,0.5);
    color: white; border-radius: 8px; padding: 0.4rem 0.9rem; cursor: pointer;
    font-size: 0.8rem; transition: background 0.2s;
  }
  .btn-locate:hover { background: rgba(255,255,255,0.35); }

  /* ── Selectors ──────────────────────────────────────────────────────────── */
  .selectors-bar {
    display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap;
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 1rem 1.2rem; margin-bottom: 0.8rem;
  }
  .selector-group { display: flex; flex-direction: column; gap: 0.3rem; min-width: 160px; }
  .selector-group label { font-size: 0.75rem; color: var(--muted); font-weight: 600; }
  .selector-group select {
    border: 1px solid var(--border); border-radius: 8px;
    padding: 0.5rem 0.8rem; font-size: 0.85rem; background: var(--bg);
  }
  .btn-analyze {
    background: linear-gradient(135deg, #0d7c66, #1e3a5f);
    color: white; border: none; border-radius: 10px;
    padding: 0.6rem 1.4rem; font-size: 0.9rem; font-weight: 600;
    cursor: pointer; transition: opacity 0.2s; height: 38px;
  }
  .btn-analyze:hover { opacity: 0.9; }
  .btn-analyze:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Error ──────────────────────────────────────────────────────────────── */
  .error-banner {
    background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626;
    border-radius: 8px; padding: 0.7rem 1rem; margin-bottom: 0.8rem;
    display: flex; justify-content: space-between; align-items: center;
  }
  .error-banner button { background: none; border: none; color: #dc2626; cursor: pointer; font-size: 1.1rem; }

  /* ── Tabs ───────────────────────────────────────────────────────────────── */
  .tabs-bar {
    display: flex; gap: 0.3rem; border-bottom: 2px solid var(--border);
    margin-bottom: 1.2rem; overflow-x: auto;
  }
  .tab-btn {
    background: none; border: none; padding: 0.6rem 1.1rem;
    font-size: 0.85rem; cursor: pointer; color: var(--muted);
    border-bottom: 2px solid transparent; margin-bottom: -2px;
    white-space: nowrap; transition: all 0.2s;
  }
  .tab-btn.active { color: #0d7c66; border-bottom-color: #0d7c66; font-weight: 700; }

  /* ── KPI Grid ───────────────────────────────────────────────────────────── */
  .kpi-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem; margin-bottom: 1rem;
  }
  .kpi-card {
    background: var(--card); border-radius: 12px; padding: 1.1rem;
    display: flex; align-items: flex-start; gap: 0.8rem;
    border: 1px solid var(--border); box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  .kpi-icon { font-size: 1.8rem; }
  .kpi-body { flex: 1; }
  .kpi-value { font-size: 1.8rem; font-weight: 800; line-height: 1.1; }
  .kpi-label { font-size: 0.75rem; color: var(--muted); margin-bottom: 0.3rem; }
  .kpi-target { font-size: 0.72rem; color: var(--muted); }
  .kpi-sub { font-size: 0.75rem; margin-top: 0.3rem; }
  .kpi-sub.danger { color: var(--bad); font-weight: 600; }
  .kpi-progress-bar {
    height: 6px; background: #e2e8f0; border-radius: 3px;
    margin: 0.5rem 0 0.3rem; overflow: hidden;
  }
  .kpi-progress-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease; max-width: 100%; }
  .uf-fill { background: var(--uf); }
  .uc-fill { background: var(--uc); }
  .kpi-status { font-size: 0.72rem; font-weight: 600; }
  .uf-card .kpi-value { color: var(--uf); }
  .uc-card .kpi-value { color: var(--uc); }
  .frost-card .kpi-value { color: #6366f1; }
  .heat-card .kpi-value { color: var(--bad); }
  .status-good { color: var(--good); }
  .status-warn { color: var(--warn); }
  .status-bad  { color: var(--bad); }
  .status-info { color: var(--uf); }

  /* ── Stage Banner ───────────────────────────────────────────────────────── */
  .stage-banner {
    background: linear-gradient(90deg, #ecfdf5, #f0fdf4);
    border: 1px solid #bbf7d0; border-radius: 10px;
    padding: 0.8rem 1.2rem; margin-bottom: 1rem;
    display: flex; align-items: center; gap: 0.8rem; font-size: 0.95rem;
  }
  .stage-icon { font-size: 1.5rem; }
  .stage-gdd { color: var(--muted); font-size: 0.82rem; margin-left: auto; }

  /* ── Alerts ─────────────────────────────────────────────────────────────── */
  .alerts-section { margin-bottom: 1rem; }
  .section-title { font-size: 0.95rem; font-weight: 700; color: var(--text); margin-bottom: 0.7rem; }
  .alert-item {
    display: flex; align-items: flex-start; gap: 0.8rem;
    padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 0.5rem;
  }
  .alert-item p { margin: 0; font-size: 0.82rem; }
  .alert-item strong { font-size: 0.88rem; display: block; margin-bottom: 0.15rem; }
  .alert-icon { font-size: 1.3rem; }
  .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
  .alert-warning { background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; }
  .alert-danger  { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
  .alert-info    { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }

  /* ── Weather Strip ──────────────────────────────────────────────────────── */
  .weather-strip { margin-bottom: 1rem; }
  .weather-days { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.3rem; }
  .weather-day {
    min-width: 80px; background: var(--card); border: 1px solid var(--border);
    border-radius: 8px; padding: 0.6rem; text-align: center; flex-shrink: 0;
  }
  .wd-date { font-size: 0.7rem; color: var(--muted); margin-bottom: 0.3rem; }
  .wd-temp { display: flex; justify-content: center; gap: 0.4rem; margin-bottom: 0.3rem; }
  .wd-max { color: var(--bad); font-weight: 700; font-size: 0.85rem; }
  .wd-min { color: var(--uf); font-weight: 700; font-size: 0.85rem; }
  .wd-uf, .wd-uc { font-size: 0.72rem; color: var(--muted); }

  /* ── Empty State ────────────────────────────────────────────────────────── */
  .empty-state {
    text-align: center; padding: 3rem 1rem; color: var(--muted);
  }
  .empty-icon { font-size: 3rem; margin-bottom: 0.8rem; }
  .empty-state h3 { color: var(--text); margin-bottom: 0.5rem; }
  .btn-analyze-big {
    background: linear-gradient(135deg, #0d7c66, #1e3a5f);
    color: white; border: none; border-radius: 10px;
    padding: 0.8rem 2rem; font-size: 1rem; font-weight: 700;
    cursor: pointer; margin-top: 1rem; transition: opacity 0.2s;
  }
  .btn-analyze-big:hover { opacity: 0.9; }

  /* ── Charts ─────────────────────────────────────────────────────────────── */
  .thermal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
  @media (max-width: 900px) { .thermal-grid { grid-template-columns: 1fr; } }
  .chart-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 1rem;
  }
  .chart-title { font-size: 0.88rem; font-weight: 700; margin-bottom: 0.8rem; }
  .mini-chart { width: 100%; }
  .chart-legend { display: flex; gap: 1rem; font-size: 0.72rem; color: var(--muted); margin-bottom: 0.5rem; }
  .legend-item { display: flex; align-items: center; gap: 0.3rem; }
  .uf-color { color: var(--uf); }
  .uc-color { color: var(--uc); }
  .target-color { color: var(--good); }
  .stage-color { color: var(--warn); }
  .bar-chart-container {
    display: flex; align-items: flex-end; gap: 1px;
    height: 140px; border-bottom: 2px solid var(--border); overflow: hidden;
  }
  .bar-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 0; }
  .bar {
    width: 100%; border-radius: 2px 2px 0 0;
    transition: height 0.3s ease;
  }
  .uf-bar { background: var(--uf); opacity: 0.8; }
  .uc-bar { background: var(--uc); opacity: 0.8; }
  .uc-bar.stage-reached { background: var(--good); }
  .bar-label { font-size: 0.6rem; color: var(--muted); white-space: nowrap; margin-top: 2px; }
  .target-line-info { font-size: 0.75rem; color: var(--muted); margin-top: 0.5rem; padding: 0.4rem 0.6rem; background: #f8fafc; border-radius: 6px; }
  .stages-row { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem; }
  .stage-chip { background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; border-radius: 20px; padding: 0.15rem 0.5rem; font-size: 0.68rem; }
  .no-chart { text-align: center; padding: 2rem; color: var(--muted); font-size: 0.85rem; }

  /* ── Detail Table ───────────────────────────────────────────────────────── */
  .detail-table-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; }
  .table-scroll { overflow-x: auto; }
  .detail-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
  .detail-table th { background: #f1f5f9; padding: 0.5rem 0.7rem; text-align: left; font-weight: 600; color: var(--muted); border-bottom: 2px solid var(--border); white-space: nowrap; }
  .detail-table td { padding: 0.4rem 0.7rem; border-bottom: 1px solid var(--border); }
  .detail-table tr:hover { background: #f8fafc; }
  .frost-row { background: #eff6ff !important; }
  .heat-row { background: #fef2f2 !important; }
  .frost-val { color: var(--uf); font-weight: 700; }
  .heat-val { color: var(--bad); font-weight: 700; }
  .uf-val { color: var(--uf); font-weight: 600; }
  .uc-val { color: var(--uc); font-weight: 600; }

  /* ── Forecast ───────────────────────────────────────────────────────────── */
  .forecast-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
  @media (max-width: 900px) { .forecast-grid { grid-template-columns: 1fr; } }
  .forecast-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; }
  .stages-timeline { display: flex; flex-direction: column; gap: 0; }
  .stage-timeline-item { display: flex; gap: 0.8rem; padding: 0.6rem 0; }
  .stage-timeline-item.reached .stage-node-icon { opacity: 1; }
  .stage-timeline-item.current { background: #f0fdf4; border-radius: 8px; padding: 0.6rem 0.5rem; }
  .stage-node { display: flex; flex-direction: column; align-items: center; min-width: 32px; }
  .stage-node-icon { font-size: 1.3rem; }
  .stage-node-line { flex: 1; width: 2px; background: var(--border); min-height: 16px; margin: 4px 0; }
  .stage-content { flex: 1; }
  .stage-name { font-weight: 600; font-size: 0.85rem; }
  .stage-gdd-info { font-size: 0.72rem; color: var(--muted); }
  .stage-date { font-size: 0.75rem; margin: 0.2rem 0; }
  .stage-date.future { color: var(--warn); }
  .stage-progress-mini { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; margin-top: 0.2rem; }
  .stage-progress-fill { height: 100%; background: var(--uc); transition: width 0.6s; }
  .stage-progress-fill.reached-fill { background: var(--good); }
  .reached .stage-date { color: var(--good); font-weight: 600; }
  .projection-info { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
  .proj-row { display: flex; justify-content: space-between; font-size: 0.85rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border); }
  .proj-row.highlight { background: #f0fdf4; border-radius: 6px; padding: 0.4rem 0.6rem; border: 1px solid #bbf7d0; margin-top: 0.2rem; }
  .climate-change-section { background: #f8fafc; border-radius: 8px; padding: 0.8rem; }
  .climate-change-section h5 { font-size: 0.82rem; font-weight: 700; margin-bottom: 0.5rem; }
  .cc-scenario { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; font-size: 0.78rem; }
  .cc-name { min-width: 100px; color: var(--muted); }
  .cc-bar-wrap { flex: 1; height: 10px; background: var(--border); border-radius: 5px; overflow: hidden; }
  .cc-bar { height: 100%; border-radius: 5px; }
  .cc-val { min-width: 80px; text-align: right; font-weight: 600; }

  /* ── Recommendations ────────────────────────────────────────────────────── */
  .reco-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
  .reco-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .reco-header { display: flex; align-items: center; gap: 0.7rem; padding: 0.7rem 1rem; }
  .reco-header.high { background: #fef2f2; }
  .reco-header.medium { background: #fff7ed; }
  .reco-header.low { background: #f0fdf4; }
  .reco-header.info-level { background: #eff6ff; }
  .reco-icon { font-size: 1.3rem; }
  .reco-category { font-size: 0.8rem; font-weight: 600; flex: 1; }
  .reco-badge { font-size: 0.68rem; padding: 0.15rem 0.5rem; border-radius: 20px; }
  .high .reco-badge { background: var(--bad); color: white; }
  .medium .reco-badge { background: var(--warn); color: white; }
  .low .reco-badge { background: var(--good); color: white; }
  .info-level .reco-badge { background: var(--uf); color: white; }
  .reco-body { padding: 0.8rem 1rem; }
  .reco-title { font-size: 0.88rem; font-weight: 700; margin-bottom: 0.4rem; }
  .reco-text { font-size: 0.82rem; color: var(--muted); margin-bottom: 0.5rem; }
  .reco-actions { padding-left: 1.2rem; margin: 0; }
  .reco-actions li { font-size: 0.78rem; color: var(--muted); margin-bottom: 0.2rem; }

  /* ── History ────────────────────────────────────────────────────────────── */
  .history-section { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.2rem; }
  .history-table-wrap { overflow-x: auto; margin-bottom: 1.2rem; }
  .history-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .history-table th { background: #f1f5f9; padding: 0.5rem 0.8rem; text-align: left; font-weight: 600; color: var(--muted); border-bottom: 2px solid var(--border); }
  .history-table td { padding: 0.5rem 0.8rem; border-bottom: 1px solid var(--border); }
  .history-table tr.current-year { background: #f0fdf4; }
  .current-badge { background: #0d7c66; color: white; font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 10px; margin-left: 0.5rem; }
  .status-pill { padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
  .pill-good { background: #dcfce7; color: #15803d; }
  .pill-warn { background: #ffedd5; color: #c2410c; }
  .pill-bad  { background: #fee2e2; color: #dc2626; }
  .pill-info { background: #dbeafe; color: #1d4ed8; }
  .danger { color: var(--bad); font-weight: 700; }
  .history-bars { margin-top: 1rem; }
  .history-bars h5 { font-size: 0.85rem; font-weight: 700; margin-bottom: 0.6rem; }
  .hist-bar-row { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem; }
  .hist-year { width: 40px; font-size: 0.78rem; color: var(--muted); }
  .hist-bar-outer { flex: 1; height: 14px; background: var(--border); border-radius: 7px; overflow: hidden; }
  .hist-bar-fill { height: 100%; border-radius: 7px; transition: width 0.6s; }
  .hist-val { width: 70px; text-align: right; font-size: 0.75rem; font-weight: 600; }
  .hist-objective { font-size: 0.75rem; color: var(--muted); margin-top: 0.3rem; padding: 0.3rem 0.5rem; background: #f8fafc; border-radius: 6px; }
  `]
})
export class DiagnosticSatelliteComponent implements OnInit, OnDestroy {

  // ── État UI ──────────────────────────────────────────────────────────────
  activeTab: ActiveTab = 'dashboard';
  loading = false;
  loadingGeo = false;
  errorMessage = '';
  hasData = false;

  tabs = [
    { id: 'dashboard'       as ActiveTab, icon: '📊', label: 'Tableau de bord'  },
    { id: 'thermal'         as ActiveTab, icon: '🌡️', label: 'Analyse thermique' },
    { id: 'forecast'        as ActiveTab, icon: '📅', label: 'Prévisions'        },
    { id: 'recommendations' as ActiveTab, icon: '💡', label: 'Recommandations'   },
    { id: 'history'         as ActiveTab, icon: '📈', label: 'Historique'        },
  ];

  // ── Sélecteurs ──────────────────────────────────────────────────────────
  plants = PLANTS;
  selectedPlantId = 'wheat';
  selectedPlant: PlantProfile | null = PLANTS[0];
  availableYears: number[] = [];
  selectedYear: number = new Date().getFullYear();
  ucMethod: 'gdd' | 'triangle' | 'sinus' = 'gdd';

  // ── Localisation ─────────────────────────────────────────────────────────
  lat = 36.8065;
  lng = 10.1815;
  locationName = 'Tunis, Tunisie';

  // ── Données ──────────────────────────────────────────────────────────────
  climateDays: DailyClimate[] = [];
  ufData: UFResult[] = [];
  ucData: UCResult[] = [];

  // ── KPIs ─────────────────────────────────────────────────────────────────
  totalUF = 0;
  totalUC = 0;
  frostDays = 0;
  heatStressDays = 0;
  currentStage: PhenologicalStage | null = null;
  alerts: Alert[] = [];

  // ── Chart data ────────────────────────────────────────────────────────────
  ufChartData: UFResult[] = [];
  ucChartData: UCResult[] = [];
  maxUFChart = 1;
  maxUCChart = 1;

  // ── Table ─────────────────────────────────────────────────────────────────
  tableData: { climate: DailyClimate; uf: UFResult; uc: UCResult }[] = [];
  recentDays: DailyClimate[] = [];

  // ── Forecast ──────────────────────────────────────────────────────────────
  stageForecasts: (PhenologicalStage & { reached: boolean; isCurrent: boolean; estimatedDate: string })[] = [];
  avgUCPerDay = 0;
  daysToFlowering: number | null = null;
  daysToMaturation: number | null = null;
  climateScenarios: { name: string; projectedUF: number; ufPct: number; color: string }[] = [];

  // ── Recommandations ───────────────────────────────────────────────────────
  recommendations: {
    icon: string; category: string; priority: string; priorityLabel: string;
    title: string; message: string; actions: string[];
  }[] = [];

  // ── Historique ────────────────────────────────────────────────────────────
  historyData: { year: number; uf: number; uc: number; frost: number; heat: number }[] = [];
  maxHistoryUF = 1;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const y = new Date().getFullYear();
    this.availableYears = [y - 4, y - 3, y - 2, y - 1, y];
    this.selectedYear = y;
    this.onPlantChange();
  }

  ngOnDestroy(): void {}

  // ── Géolocalisation ──────────────────────────────────────────────────────

  geolocate(): void {
    if (!navigator.geolocation) {
      this.errorMessage = 'Géolocalisation non disponible dans ce navigateur.';
      return;
    }
    this.loadingGeo = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        this.lat = pos.coords.latitude;
        this.lng = pos.coords.longitude;
        this.locationName = `${this.lat.toFixed(3)}, ${this.lng.toFixed(3)}`;
        this.loadingGeo = false;
        // Optionnel: reverse geocode via Nominatim
        this.reverseGeocode(this.lat, this.lng);
        this.cdr.detectChanges();
      },
      err => {
        this.loadingGeo = false;
        this.errorMessage = 'Impossible de récupérer la position : ' + err.message;
        this.cdr.detectChanges();
      }
    );
  }

  private reverseGeocode(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    this.http.get<any>(url).subscribe({
      next: (r) => {
        const city = r.address?.city || r.address?.town || r.address?.village || '';
        const state = r.address?.state || '';
        this.locationName = [city, state].filter(Boolean).join(', ') || this.locationName;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  // ── Changements sélecteurs ───────────────────────────────────────────────

  onPlantChange(): void {
    this.selectedPlant = PLANTS.find(p => p.id === this.selectedPlantId) ?? null;
  }

  onYearChange(): void {
    // réinitialiser si saison change
    this.hasData = false;
  }

  // ── Analyse principale ───────────────────────────────────────────────────

  async analyser(): Promise<void> {
    if (!this.selectedPlant) return;
    this.loading = true;
    this.errorMessage = '';
    this.hasData = false;

    try {
      // Calcul de la période : novembre de selectedYear → fin mars selectedYear+1
      // Pour les UC : mars → fin août (période de croissance)
      const coldStart  = `${this.selectedYear}-11-01`;
      const coldEnd    = `${this.selectedYear + 1}-02-28`;
      const heatStart  = `${this.selectedYear + 1}-03-01`;
      const heatEnd    = `${this.selectedYear + 1}-08-31`;

      // Récupérer les données météo Open-Meteo (CORS OK)
      const coldDays = await this.fetchClimateData(coldStart, coldEnd);
      const heatDays = await this.fetchClimateData(heatStart, heatEnd);
      this.climateDays = [...coldDays, ...heatDays];

      // Calculer UF (période froide)
      this.ufData = this.calculateUF(coldDays);
      this.totalUF = this.ufData.length > 0 ? this.ufData[this.ufData.length - 1].cumulative : 0;

      // Calculer UC (période chaude)
      this.ucData = this.calculateUC(heatDays, this.selectedPlant.heatBase);
      this.totalUC = this.ucData.length > 0 ? this.ucData[this.ucData.length - 1].cumulative : 0;

      // Statistiques
      this.frostDays = coldDays.filter(d => d.tmin < 0).length;
      this.heatStressDays = heatDays.filter(d => d.tmax > 35).length;

      // Stade actuel
      this.currentStage = this.getCurrentStage(this.totalUC);

      // Préparer données chart (max 60 points pour lisibilité)
      this.ufChartData = this.sampleData(this.ufData, 60);
      this.ucChartData = this.sampleData(this.ucData, 60);
      this.maxUFChart = Math.max(...this.ufData.map(d => d.cumulative), 1);
      this.maxUCChart = Math.max(...this.ucData.map(d => d.cumulative), 1);

      // Table complète
      this.tableData = this.climateDays.map((c, i) => {
        const allDays = [...this.ufData, ...this.ucData];
        const uf = this.ufData[Math.min(i, this.ufData.length - 1)] ?? { date: c.date, daily: 0, cumulative: 0 };
        const uc = this.ucData[Math.max(0, i - coldDays.length)] ?? { date: c.date, daily: 0, cumulative: 0 };
        return { climate: c, uf, uc };
      });

      // Derniers 14 jours pour dashboard
      this.recentDays = this.climateDays.slice(-14);

      // Alertes
      this.buildAlerts();

      // Prévisions
      this.buildForecasts(heatDays);

      // Recommandations
      this.buildRecommendations();

      // Historique simulé (on génère des données plausibles pour les années passées)
      this.buildHistory();

      this.hasData = true;
      this.cdr.detectChanges();

    } catch (err: any) {
      this.errorMessage = 'Erreur lors du chargement des données météo : ' + (err.message ?? String(err));
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // ── API Open-Meteo ───────────────────────────────────────────────────────

  private async fetchClimateData(startDate: string, endDate: string): Promise<DailyClimate[]> {
    // Open-Meteo : gratuit, CORS OK, sans clé API
    const url = `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${this.lat}&longitude=${this.lng}` +
      `&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max` +
      `&timezone=Africa%2FTunis`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo: ${res.status}`);
    const data = await res.json();
    const d = data.daily;

    return (d.time as string[]).map((date: string, i: number) => {
      const tmin = d.temperature_2m_min[i] ?? 10;
      const tmax = d.temperature_2m_max[i] ?? 20;
      return {
        date,
        tmin,
        tmax,
        tmean: (tmin + tmax) / 2,
        precipitation: d.precipitation_sum[i] ?? 0,
        humidity:      d.relative_humidity_2m_mean[i] ?? 50,
        windSpeed:     d.wind_speed_10m_max[i] ?? 0,
      };
    });
  }

  // ── Calculs UF (Modèle Utah) ─────────────────────────────────────────────

  /**
   * Modèle Utah (Richardson, 1974)
   * Appliqué sur la température moyenne journalière (Tm).
   * Période : novembre → février
   */
  private calculateUF(days: DailyClimate[]): UFResult[] {
    let cumulative = 0;
    return days.map(d => {
      const daily = this.calcUFDay(d.tmean);
      cumulative += daily;
      return { date: d.date, daily, cumulative: Math.max(0, cumulative) };
    });
  }

  calcUFDay(tm: number): number {
    if (tm <= 1.4)                    return 0;
    if (tm >= 1.5  && tm <= 9.1)      return 0.5 * tm - 0.75;
    if (tm >= 9.2  && tm <= 12.4)     return 1.0;
    if (tm >= 12.5 && tm <= 15.9)     return 0.5 * (16 - tm);
    return 0; // tm >= 16
  }

  // ── Calculs UC (GDD / Triangle / Sinus) ──────────────────────────────────

  private calculateUC(days: DailyClimate[], tbase: number): UCResult[] {
    let cumulative = 0;
    return days.map(d => {
      let daily = 0;
      switch (this.ucMethod) {
        case 'triangle':
          daily = this.calcUCTriangle(d.tmin, d.tmax, tbase);
          break;
        case 'sinus':
          daily = this.calcUCSinus(d.tmin, d.tmax, tbase);
          break;
        default: // gdd
          daily = this.calcUCDay(d.tmean, tbase);
      }
      cumulative += daily;
      return { date: d.date, daily, cumulative };
    });
  }

  /** Méthode rectangulaire (GDD standard) */
  calcUCDay(tm: number, tbase: number): number {
    return Math.max(0, tm - tbase);
  }

  /** Méthode du triangle */
  private calcUCTriangle(tmin: number, tmax: number, tbase: number): number {
    if (tmax <= tbase) return 0;
    if (tmin >= tbase) return (tmax + tmin) / 2 - tbase;
    const d = tmax - tmin;
    return Math.pow(tmax - tbase, 2) / (2 * d);
  }

  /** Méthode du sinus (approximation Baskerville-Emin) */
  private calcUCSinus(tmin: number, tmax: number, tbase: number): number {
    const mean = (tmax + tmin) / 2;
    const amp  = (tmax - tmin) / 2;
    if (mean - amp >= tbase) return mean - tbase;
    if (mean + amp <= tbase) return 0;
    const theta = Math.asin((tbase - mean) / amp);
    return (1 / Math.PI) * ((mean - tbase) * (Math.PI / 2 - theta) + amp * Math.cos(theta));
  }

  // ── Stade phénologique actuel ─────────────────────────────────────────────

  private getCurrentStage(uc: number): PhenologicalStage | null {
    if (!this.selectedPlant) return null;
    const stages = this.selectedPlant.stages;
    let current: PhenologicalStage | null = null;
    for (const s of stages) {
      if (uc >= s.gdd) current = s;
    }
    return current ?? stages[0];
  }

  // ── Alertes ──────────────────────────────────────────────────────────────

  private buildAlerts(): void {
    this.alerts = [];
    if (!this.selectedPlant) return;
    const p = this.selectedPlant;

    // UF
    if (this.totalUF >= p.coldOptMin && this.totalUF <= p.coldOptMax) {
      this.alerts.push({
        type: 'success', icon: '✅',
        title: 'Besoins en froid satisfaits',
        message: `${p.name} a accumulé ${this.totalUF.toFixed(0)} UF, dans la plage optimale (${p.coldOptMin}–${p.coldOptMax} UF).`
      });
    } else if (this.totalUF < p.coldMin) {
      this.alerts.push({
        type: 'danger', icon: '❄️',
        title: 'Déficit en froid critique',
        message: `Seulement ${this.totalUF.toFixed(0)} UF accumulées. Le minimum requis est ${p.coldMin} UF. Risque de débourrement irrégulier.`
      });
    } else if (this.totalUF > p.coldMax) {
      this.alerts.push({
        type: 'warning', icon: '⚠️',
        title: 'Excès de froid détecté',
        message: `${this.totalUF.toFixed(0)} UF dépassent le seuil max (${p.coldMax} UF). Surveillance de la phénologie recommandée.`
      });
    }

    // Gel
    if (this.frostDays > 5) {
      this.alerts.push({
        type: 'danger', icon: '🥶',
        title: `${this.frostDays} nuits de gel détectées`,
        message: 'Risque de dommages aux organes floraux. Systèmes de protection antigel recommandés.'
      });
    }

    // Stress thermique
    if (this.heatStressDays > 10) {
      this.alerts.push({
        type: 'warning', icon: '🌡️',
        title: `${this.heatStressDays} jours de stress thermique`,
        message: 'Températures > 35°C peuvent affecter la nouaison et la qualité des fruits. Irrigation de refroidissement conseillée.'
      });
    }

    // UC
    if (this.totalUC >= p.heatFlowering) {
      this.alerts.push({
        type: 'info', icon: '🌸',
        title: 'Stade floraison atteint',
        message: `${p.name} a dépassé le seuil de floraison (${p.heatFlowering} GDD). Surveillance phytosanitaire intensive requise.`
      });
    }
  }

  // ── Prévisions ────────────────────────────────────────────────────────────

  private buildForecasts(heatDays: DailyClimate[]): void {
    if (!this.selectedPlant) return;
    const p = this.selectedPlant;

    // UC moyen/jour (sur les 14 derniers jours disponibles)
    const recent = heatDays.slice(-14);
    const avgUC = recent.length > 0
      ? recent.reduce((s, d) => s + this.calcUCDay(d.tmean, p.heatBase), 0) / recent.length
      : 3;
    this.avgUCPerDay = avgUC;

    // Jours restants vers floraison / récolte
    const remainFlowering = Math.max(0, p.heatFlowering - this.totalUC);
    const remainMatu      = Math.max(0, p.heatMaturation - this.totalUC);
    this.daysToFlowering  = avgUC > 0 && remainFlowering > 0 ? remainFlowering / avgUC : null;
    this.daysToMaturation = avgUC > 0 && remainMatu > 0      ? remainMatu / avgUC      : null;

    // Stades avec statut
    const today = new Date();
    this.stageForecasts = p.stages.map(s => {
      const reached   = this.totalUC >= s.gdd;
      const isCurrent = this.currentStage?.name === s.name;
      let estimatedDate = '';
      if (!reached && avgUC > 0) {
        const daysLeft = (s.gdd - this.totalUC) / avgUC;
        const d = new Date(today);
        d.setDate(d.getDate() + Math.round(daysLeft));
        estimatedDate = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      }
      return { ...s, reached, isCurrent, estimatedDate };
    });

    // Scénarios changement climatique
    const scenarios = [
      { name: 'Actuel',    delta: 0,   color: '#3b82f6' },
      { name: '+1°C',      delta: -30, color: '#f59e0b' },
      { name: '+2°C',      delta: -60, color: '#f97316' },
      { name: '+3°C',      delta: -90, color: '#ef4444' },
    ];
    const maxProjUF = Math.max(...scenarios.map(s => this.totalUF + Math.max(0, s.delta)));
    this.climateScenarios = scenarios.map(s => {
      const projectedUF = Math.max(0, this.totalUF + s.delta);
      return { name: s.name, projectedUF, ufPct: maxProjUF > 0 ? (projectedUF / maxProjUF) * 100 : 0, color: s.color };
    });
  }

  // ── Recommandations ───────────────────────────────────────────────────────

  private buildRecommendations(): void {
    this.recommendations = [];
    if (!this.selectedPlant) return;
    const p = this.selectedPlant;

    // Recommandation choix variétal
    if (this.totalUF < p.coldOptMin) {
      this.recommendations.push({
        icon: '🌱', category: 'Choix Variétal', priority: 'high', priorityLabel: 'Urgent',
        title: 'Adapter le choix variétal aux conditions locales',
        message: `Le déficit en froid enregistré (${this.totalUF.toFixed(0)} UF) est insuffisant pour les variétés standard de ${p.name}. Privilégiez des variétés à faibles besoins en froid.`,
        actions: [
          'Consulter le catalogue variétal INRAT pour les variétés adaptées',
          `Cibler des variétés nécessitant < ${this.totalUF.toFixed(0)} UF`,
          'Contacter votre conseiller agricole pour des recommandations régionales'
        ]
      });
    } else {
      this.recommendations.push({
        icon: '✅', category: 'Choix Variétal', priority: 'low', priorityLabel: 'OK',
        title: 'Conditions favorables pour les variétés standard',
        message: `L'accumulation de froid (${this.totalUF.toFixed(0)} UF) est compatible avec les variétés courantes de ${p.name}.`,
        actions: ['Maintenir les pratiques actuelles', 'Surveiller l\'évolution météo pour ajuster si nécessaire']
      });
    }

    // Recommandation date de semis
    if (this.daysToFlowering !== null) {
      const flowerDate = new Date();
      flowerDate.setDate(flowerDate.getDate() + Math.round(this.daysToFlowering));
      this.recommendations.push({
        icon: '📅', category: 'Calendrier Cultural', priority: 'medium', priorityLabel: 'Important',
        title: 'Planification des stades phénologiques',
        message: `Floraison estimée vers le ${flowerDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} (dans ${Math.round(this.daysToFlowering)} jours). Préparez les interventions phytosanitaires en amont.`,
        actions: [
          'Prévoir les traitements fongicides 7-10 jours avant floraison',
          'Planifier l\'irrigation de soutien',
          'Vérifier les stocks de produits phytosanitaires'
        ]
      });
    }

    // Recommandation gel
    if (this.frostDays > 0) {
      this.recommendations.push({
        icon: '🧊', category: 'Gestion du Gel', priority: this.frostDays > 5 ? 'high' : 'medium',
        priorityLabel: this.frostDays > 5 ? 'Urgent' : 'À surveiller',
        title: `Protection contre le gel — ${this.frostDays} événements enregistrés`,
        message: 'Des températures négatives ont été observées. Les organes floraux et les jeunes pousses sont particulièrement vulnérables.',
        actions: [
          'Installer des systèmes d\'aspersion anti-gel',
          'Utiliser des filets ou voiles de protection',
          'Surveiller les prévisions météo J+3 en période critique',
          'Envisager l\'énergie calorifique (bougies, chauffage) pour les parcelles sensibles'
        ]
      });
    }

    // Recommandation stress thermique
    if (this.heatStressDays > 5) {
      this.recommendations.push({
        icon: '💧', category: 'Irrigation & Stress Hydrique', priority: 'medium', priorityLabel: 'Important',
        title: 'Gestion de l\'irrigation en période de stress thermique',
        message: `${this.heatStressDays} jours avec Tmax > 35°C. Le stress hydrique combiné au stress thermique peut réduire significativement les rendements.`,
        actions: [
          'Augmenter la fréquence d\'irrigation (passages rapprochés)',
          'Préférer l\'irrigation en heures fraîches (aube ou soirée)',
          'Surveiller l\'indice de stress hydrique (SWI)',
          'Utiliser le paillis pour réduire l\'évaporation du sol'
        ]
      });
    }

    // Recommandation changement climatique
    this.recommendations.push({
      icon: '🌍', category: 'Adaptation Climatique', priority: 'info-level', priorityLabel: 'Planification',
      title: 'Stratégie d\'adaptation au changement climatique',
      message: 'Les projections montrent une réduction des UF de 30 à 90 unités par degré de réchauffement. Anticipez l\'évolution des pratiques culturales.',
      actions: [
        'Diversifier les cultures avec des espèces plus thermophiles',
        'Explorer l\'agroforesterie pour créer des microclimats favorables',
        'Participer aux programmes de sélection variétale de l\'INRAT',
        'Installer des stations météo locales pour un suivi précis'
      ]
    });
  }

  // ── Historique simulé ─────────────────────────────────────────────────────
  // (En production, ces données viendraient du backend .NET via l'API)

  private buildHistory(): void {
    this.historyData = [];
    const p = this.selectedPlant!;
    const currentY = this.selectedYear;

    for (let y = currentY - 4; y <= currentY; y++) {
      // Variation aléatoire réaliste autour des valeurs actuelles (±20%)
      const variationUF = 0.8 + Math.random() * 0.4;
      const variationUC = 0.85 + Math.random() * 0.3;
      const uf    = y === currentY ? this.totalUF : Math.round(this.totalUF * variationUF);
      const uc    = y === currentY ? this.totalUC : Math.round(this.totalUC * variationUC);
      const frost = y === currentY ? this.frostDays : Math.round(this.frostDays * (0.5 + Math.random()));
      const heat  = y === currentY ? this.heatStressDays : Math.round(this.heatStressDays * (0.5 + Math.random()));
      this.historyData.push({ year: y, uf, uc, frost, heat });
    }

    this.maxHistoryUF = Math.max(...this.historyData.map(h => h.uf), 1);
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────

  private sampleData<T>(data: T[], maxPoints: number): T[] {
    if (data.length <= maxPoints) return data;
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, i) => i % step === 0);
  }

  getBarHeight(value: number, max: number): number {
    return max > 0 ? Math.min(100, (value / max) * 100) : 0;
  }

  isStageReached(uc: number): boolean {
    if (!this.selectedPlant) return false;
    return this.selectedPlant.stages.some(s => uc >= s.gdd);
  }

  getUFProgressPct(): number {
    if (!this.selectedPlant) return 0;
    return Math.min(100, (this.totalUF / this.selectedPlant.coldOptMax) * 100);
  }

  getUCProgressPct(): number {
    if (!this.selectedPlant) return 0;
    return Math.min(100, (this.totalUC / this.selectedPlant.heatMaturation) * 100);
  }

  getUFStatusText(): string {
    if (!this.selectedPlant) return '';
    const p = this.selectedPlant;
    if (this.totalUF < p.coldMin)       return '⚠️ Déficit critique';
    if (this.totalUF < p.coldOptMin)    return '📉 En cours d\'accumulation';
    if (this.totalUF <= p.coldOptMax)   return '✅ Optimal';
    if (this.totalUF <= p.coldMax)      return '⚠️ Légèrement excédentaire';
    return '🔴 Excès de froid';
  }

  getUFStatusClass(): string {
    if (!this.selectedPlant) return '';
    const p = this.selectedPlant;
    if (this.totalUF < p.coldMin)       return 'status-bad';
    if (this.totalUF <= p.coldOptMax)   return 'status-good';
    return 'status-warn';
  }

  getUCStatusText(): string {
    if (!this.selectedPlant) return '';
    const p = this.selectedPlant;
    if (this.totalUC < p.heatFlowering)  return '📈 Avant floraison';
    if (this.totalUC < p.heatMaturation) return '🌸 En floraison/développement';
    return '✅ Maturation atteinte';
  }

  getUCStatusClass(): string {
    if (!this.selectedPlant) return '';
    if (this.totalUC >= this.selectedPlant.heatMaturation) return 'status-good';
    if (this.totalUC >= this.selectedPlant.heatFlowering)  return 'status-warn';
    return 'status-info';
  }

  formatDateShort(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    } catch { return dateStr; }
  }

  min100(v: number): number { return Math.min(100, Math.max(0, v)); }

  getStatusPillClass(uf: number, p: PlantProfile): string {
    if (uf < p.coldMin)     return 'status-pill pill-bad';
    if (uf <= p.coldOptMax) return 'status-pill pill-good';
    return 'status-pill pill-warn';
  }

  getStatusPillText(uf: number, p: PlantProfile): string {
    if (uf < p.coldMin)     return 'Déficit';
    if (uf < p.coldOptMin)  return 'Insuffisant';
    if (uf <= p.coldOptMax) return 'Optimal';
    return 'Excédent';
  }
}
