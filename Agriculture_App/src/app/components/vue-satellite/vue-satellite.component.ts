// components/vue-satellite/vue-satellite.component.ts
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { ParcelleService, Parcelle } from '../../services/api/parcelle.service';
import { firstValueFrom } from 'rxjs';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface AltitudePoint {
  lat: number;
  lng: number;
  altitude: number;
}

interface AltitudeStats {
  min: number;
  max: number;
  mean: number;
  denivele: number;
}

interface WaterZoneStats {
  surfaceAccumulation: number;   // % de surface avec accumulation forte
  niveauRisque: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  zonesDetectees: number;        // nombre de zones d'accumulation
  altitudeMin: number;
  altitudeMax: number;
}

// ─── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-vue-satellite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid mt-4">
      <div class="row">
        <div class="col-12">

          <!-- Barre d'outils -->
          <div class="card shadow-sm mb-3">
            <div class="card-body">
              <div class="row align-items-center">
                <div class="col-md-4">
                  <div class="d-flex align-items-center">
                    <i class="fas fa-globe me-2 text-primary"></i>
                    <h5 class="mb-0">Vue Satellite - Analyse Altimétrique</h5>
                  </div>
                </div>
                <div class="col-md-4">
                  <select class="form-select" [(ngModel)]="typeVue" (ngModelChange)="changerVue()">
                    <option value="satellite">Vue Satellite</option>
                    <option value="terrain">Carte Terrain</option>
                    <option value="relief">Relief Ombré</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <div class="btn-group w-100" role="group">
                    <button class="btn btn-outline-primary"
                            [class.active]="mode === 'parcelles'"
                            (click)="mode = 'parcelles'; chargerDonnees()">
                      <i class="fas fa-map-marked-alt me-1"></i> Parcelles
                    </button>
                    <button class="btn btn-outline-info"
                            [class.active]="mode === 'zonesEau'"
                            (click)="mode = 'zonesEau'; chargerDonnees()">
                      <i class="fas fa-water me-1"></i> Zones d'eau
                    </button>
                    <button class="btn btn-outline-secondary"
                            (click)="reinitialiserCarte()">
                      <i class="fas fa-undo me-1"></i> Réinitialiser
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bandeau d'info mode zones d'eau -->
          <div class="card shadow-sm mb-3 border-info" *ngIf="mode === 'zonesEau' && !altitudeLoading">
            <div class="card-body py-2">
              <div class="d-flex align-items-center gap-3 flex-wrap">
                <div class="d-flex align-items-center gap-2">
                  <i class="fas fa-info-circle text-info"></i>
                  <small class="text-muted">
                    <strong>Détection des zones d'accumulation d'eau</strong> —
                    Basée sur la topographie (altitude + modèle de flux hydrologique).
                    Les zones bleues indiquent les points bas où l'eau stagne.
                  </small>
                </div>
                <div class="ms-auto d-flex gap-3">
                  <div class="water-legend-inline">
                    <span class="water-dot" style="background:#0d1b8e;"></span><small>Critique</small>
                  </div>
                  <div class="water-legend-inline">
                    <span class="water-dot" style="background:#1565C0;"></span><small>Élevé</small>
                  </div>
                  <div class="water-legend-inline">
                    <span class="water-dot" style="background:#42A5F5;"></span><small>Modéré</small>
                  </div>
                  <div class="water-legend-inline">
                    <span class="water-dot" style="background:#E3F2FD;"></span><small>Faible</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Barre de progression -->
          <div class="card shadow-sm mb-3" *ngIf="altitudeLoading">
            <div class="card-body py-2">
              <div class="d-flex align-items-center gap-3">
                <div class="spinner-border spinner-border-sm text-info" role="status"></div>
                <div class="flex-grow-1">
                  <div class="progress" style="height: 6px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated"
                         [class.bg-warning]="mode === 'parcelles'"
                         [class.bg-info]="mode === 'zonesEau'"
                         [style.width]="progressPct + '%'"></div>
                  </div>
                </div>
                <small class="text-muted text-nowrap">
                  {{progressLabel}}
                </small>
              </div>
            </div>
          </div>

          <!-- Légende altitude globale (mode parcelles) -->
          <div class="legend-card" *ngIf="mode === 'parcelles' && altitudeMin !== undefined && altitudeMax !== undefined && !altitudeLoading">
            <div class="card shadow-sm">
              <div class="card-body p-2">
                <div class="d-flex align-items-center justify-content-between flex-wrap">
                  <div class="d-flex align-items-center">
                    <i class="fas fa-mountain me-2 text-success"></i>
                    <small class="text-muted me-2">Altitude:</small>
                    <div class="gradient-bar me-2"></div>
                    <small class="text-muted">
                      {{altitudeMin | number:'1.0-0'}}m
                      <i class="fas fa-arrow-right mx-1"></i>
                      {{altitudeMax | number:'1.0-0'}}m
                    </small>
                  </div>
                  <div class="mt-2 mt-md-0 d-flex gap-3">
                    <small class="text-muted">
                      <i class="fas fa-chart-line text-warning me-1"></i>
                      Moy: {{altitudeMoyenne | number:'1.0-0'}}m
                    </small>
                    <small class="text-muted">
                      <i class="fas fa-ruler-vertical text-info me-1"></i>
                      Dénivelé: {{(altitudeMax - altitudeMin) | number:'1.0-0'}}m
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Carte -->
          <div class="card shadow-sm">
            <div class="card-body p-0 position-relative">
              <div id="satellite-map" style="height: 600px; width: 100%;"></div>

              <!-- Légende flottante (mode parcelles : détail parcelle cliquée) -->
              <div class="altitude-legend" *ngIf="mode === 'parcelles' && legendeParcelle">
                <div class="legend-title">
                  <i class="fas fa-mountain me-1"></i>
                  {{legendeParcelle.nom}}
                </div>
                <div class="legend-body">
                  <div class="legend-gradient"></div>
                  <div class="legend-labels">
                    <span class="legend-max">{{legendeParcelle.stats.max}} m</span>
                    <span class="legend-mid">{{((legendeParcelle.stats.max + legendeParcelle.stats.min) / 2) | number:'1.0-0'}} m</span>
                    <span class="legend-min">{{legendeParcelle.stats.min}} m</span>
                  </div>
                </div>
                <div class="legend-stats">
                  <div><i class="fas fa-arrow-up text-danger me-1"></i>Max: <strong>{{legendeParcelle.stats.max}} m</strong></div>
                  <div><i class="fas fa-arrow-down text-success me-1"></i>Min: <strong>{{legendeParcelle.stats.min}} m</strong></div>
                  <div><i class="fas fa-ruler-vertical text-warning me-1"></i>Dénivelé: <strong>{{legendeParcelle.stats.denivele}} m</strong></div>
                  <div><i class="fas fa-chart-line text-info me-1"></i>Moy: <strong>{{legendeParcelle.stats.mean | number:'1.0-0'}} m</strong></div>
                </div>
                <button class="btn btn-sm btn-outline-secondary mt-2 w-100"
                        (click)="legendeParcelle = null">
                  <i class="fas fa-times me-1"></i>Fermer
                </button>
              </div>

              <!-- Légende flottante (mode zones d'eau : détail parcelle cliquée) -->
              <div class="water-legend" *ngIf="mode === 'zonesEau' && legendeEau">
                <div class="water-legend-title">
                  <i class="fas fa-water me-1"></i>
                  {{legendeEau.nom}}
                </div>
                <div class="legend-body">
                  <div class="water-gradient"></div>
                  <div class="legend-labels">
                    <span style="color:#0d1b8e; font-weight:700;">Accumulation max</span>
                    <span style="color:#1565C0; font-weight:600;">Modérée</span>
                    <span style="color:#90CAF9; font-weight:500;">Faible</span>
                    <span style="color:#aaa;">Zone sèche</span>
                  </div>
                </div>
                <div class="legend-stats mt-2">
                  <div>
                    <i class="fas fa-exclamation-triangle me-1"
                       [class.text-danger]="legendeEau.waterStats.niveauRisque === 'Critique'"
                       [class.text-warning]="legendeEau.waterStats.niveauRisque === 'Élevé'"
                       [class.text-info]="legendeEau.waterStats.niveauRisque === 'Modéré'"
                       [class.text-success]="legendeEau.waterStats.niveauRisque === 'Faible'">
                    </i>
                    Risque: <strong>{{legendeEau.waterStats.niveauRisque}}</strong>
                  </div>
                  <div><i class="fas fa-tint text-info me-1"></i>Zones détectées: <strong>{{legendeEau.waterStats.zonesDetectees}}</strong></div>
                  <div><i class="fas fa-percentage text-primary me-1"></i>Surface affectée: <strong>{{legendeEau.waterStats.surfaceAccumulation | number:'1.0-0'}}%</strong></div>
                  <div><i class="fas fa-arrow-down text-success me-1"></i>Alt. min: <strong>{{legendeEau.waterStats.altitudeMin}} m</strong></div>
                  <div><i class="fas fa-arrows-alt-v text-secondary me-1"></i>Dénivelé: <strong>{{legendeEau.waterStats.altitudeMax - legendeEau.waterStats.altitudeMin}} m</strong></div>
                </div>
                <div class="water-advice mt-2 p-2">
                  <small>
                    <i class="fas fa-lightbulb text-warning me-1"></i>
                    <span *ngIf="legendeEau.waterStats.niveauRisque === 'Critique'">Drainage urgent recommandé.</span>
                    <span *ngIf="legendeEau.waterStats.niveauRisque === 'Élevé'">Planifier un système de drainage.</span>
                    <span *ngIf="legendeEau.waterStats.niveauRisque === 'Modéré'">Surveiller après les pluies.</span>
                    <span *ngIf="legendeEau.waterStats.niveauRisque === 'Faible'">Risque d'engorgement limité.</span>
                  </small>
                </div>
                <button class="btn btn-sm btn-outline-info mt-2 w-100"
                        (click)="legendeEau = null">
                  <i class="fas fa-times me-1"></i>Fermer
                </button>
              </div>

            </div>
          </div>

          <!-- Informations au clic -->
          <div class="card shadow-sm mt-3" *ngIf="infoPoint">
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <h6><i class="fas fa-info-circle me-2 text-info"></i>Information du point</h6>
                  <p class="mb-1">
                    <strong>Coordonnées:</strong> {{infoPoint.lat | number:'1.6-6'}}, {{infoPoint.lng | number:'1.6-6'}}
                  </p>
                  <p class="mb-0">
                    <strong>Altitude:</strong>
                    <span [style.color]="getColorByAltitude(infoPoint.altitude)">
                      {{infoPoint.altitude | number:'1.1-1'}} m
                    </span>
                  </p>
                </div>
                <div class="col-md-6" *ngIf="infoPoint.entite">
                  <h6><i class="fas fa-tag me-2 text-success"></i>{{infoPoint.type}}</h6>
                  <p class="mb-0">
                    <strong>Nom:</strong> {{infoPoint.entite.nom}}
                    <span *ngIf="infoPoint.entite.culture" class="ms-3">
                      <i class="fas fa-seedling text-success"></i> {{infoPoint.entite.culture}}
                    </span>
                    <span *ngIf="infoPoint.entite.surface" class="ms-3">
                      <i class="fas fa-ruler"></i> {{infoPoint.entite.surface}} ha
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    #satellite-map {
      border-radius: 8px;
      background-color: #f0f0f0;
    }

    /* ── Légende compacte en haut (mode parcelles) ── */
    .legend-card {
      position: relative;
      margin-bottom: 1rem;
      z-index: 1000;
    }
    .gradient-bar {
      width: 150px;
      height: 20px;
      background: linear-gradient(to right,
        #1a7a1a, #4CAF50, #a8d95a, #ffe066, #ff9800, #e53935, #821408);
      border-radius: 10px;
      margin: 0 10px;
    }

    /* ── Légende inline mode zones d'eau ── */
    .water-legend-inline {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.78rem;
      color: #555;
    }
    .water-dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.15);
    }

    /* ── Légende flottante altitude (mode parcelles) ── */
    .altitude-legend {
      position: absolute;
      bottom: 30px;
      right: 10px;
      z-index: 1000;
      background: rgba(255,255,255,0.97);
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      min-width: 175px;
      border: 1px solid rgba(0,0,0,0.08);
    }

    /* ── Légende flottante zones d'eau ── */
    .water-legend {
      position: absolute;
      bottom: 30px;
      right: 10px;
      z-index: 1000;
      background: rgba(240,248,255,0.97);
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 4px 20px rgba(0,80,180,0.2);
      min-width: 195px;
      border: 1px solid rgba(21, 101, 192, 0.2);
    }
    .water-legend-title {
      font-weight: 700;
      font-size: 0.82rem;
      color: #1565C0;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 175px;
    }
    .water-gradient {
      width: 22px;
      min-height: 120px;
      border-radius: 6px;
      flex-shrink: 0;
      background: linear-gradient(
        to top,
        #E3F2FD,
        #90CAF9,
        #42A5F5,
        #1565C0,
        #0d1b8e
      );
      box-shadow: 0 1px 4px rgba(0,0,100,0.2);
      margin-right: 8px;
    }
    .water-advice {
      background: rgba(255,249,196,0.8);
      border-radius: 6px;
      border-left: 3px solid #FFC107;
      font-size: 0.75rem;
    }

    /* ── Éléments de légende communs ── */
    .legend-title {
      font-weight: 700;
      font-size: 0.82rem;
      color: #333;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 155px;
    }
    .legend-body {
      display: flex;
      align-items: stretch;
      gap: 6px;
      margin-bottom: 8px;
    }
    .legend-gradient {
      width: 22px;
      min-height: 120px;
      border-radius: 6px;
      flex-shrink: 0;
      background: linear-gradient(
        to top,
        #1a7a1a, #4CAF50, #a8d95a, #ffe066, #ff9800, #e53935, #821408
      );
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    }
    .legend-labels {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 0.78rem;
      font-weight: 600;
      color: #444;
    }
    .legend-max { color: #c62828; }
    .legend-mid { color: #e65100; }
    .legend-min { color: #1b5e20; }
    .legend-stats {
      padding-top: 8px;
      border-top: 1px solid #eee;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.78rem;
      color: #555;
    }

    /* ── Boutons ── */
    .btn-group .btn.active {
      background-color: #007bff;
      color: white;
    }
    .btn-group .btn-outline-info.active {
      background-color: #0dcaf0;
      color: white;
    }

    /* ── Popup info ── */
    .info-popup {
      padding: 8px;
      min-width: 220px;
    }
    .info-popup h6 {
      margin-bottom: 8px;
      color: #2c3e50;
      font-weight: bold;
    }
    .info-popup hr { margin: 8px 0; }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .btn-group { margin-top: 10px; width: 100%; }
      .gradient-bar { width: 100px; }
      .altitude-legend, .water-legend { right: 5px; bottom: 10px; }
    }
  `]
})
export class VueSatelliteComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Carte ──────────────────────────────────────────────────────────────────
  private map!: L.Map;
  private isMapReady = false;

  /** Couches contours GeoJSON des parcelles (dimensions réelles via L.geoJSON) */
  private contoursLayer: L.LayerGroup = L.layerGroup();

  /** Couches heatmap IDW, indexées par id de parcelle */
  private heatmapLayers: Map<string, L.Layer> = new Map();

  // ── État ───────────────────────────────────────────────────────────────────
  mode: 'parcelles' | 'zonesEau' = 'parcelles';
  typeVue = 'satellite';

  parcelles: Parcelle[] = [];

  altitudeMin: number | undefined;
  altitudeMax: number | undefined;
  altitudeMoyenne: number | undefined;

  infoPoint: { lat: number; lng: number; altitude: number; type?: string; entite?: any } | null = null;

  /** Légende flottante altitude (mode parcelles) */
  legendeParcelle: { nom: string; stats: AltitudeStats } | null = null;

  /** Légende flottante zones d'eau (mode zonesEau) */
  legendeEau: { nom: string; waterStats: WaterZoneStats } | null = null;

  // ── Progression ────────────────────────────────────────────────────────────
  altitudeLoading = false;
  progressPct = 0;
  progressLabel = '';

  // ── Cache altitude (clé = "lat,lng" arrondi à 4 décimales) ───────────────
  private altitudeCache: Map<string, number> = new Map();

  /** Délai minimum entre deux appels API (ms) pour éviter le 429 */
  private readonly API_DELAY_MS = 600;
  private dernierAppelApi = 0;

  constructor(
    private route: ActivatedRoute,
    private parcelleService: ParcelleService
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.chargerDonnees();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      this.isMapReady = true;
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  // ── Init carte ─────────────────────────────────────────────────────────────

  private initMap(): void {
    this.map = L.map('satellite-map', {
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      preferCanvas: true
    }).setView([34.0, 9.0], 7);

    this.changerVue();
    L.control.scale({ metric: true, imperial: false }).addTo(this.map);

    this.contoursLayer.addTo(this.map);

    this.map.on('click', async (e: L.LeafletMouseEvent) => {
      await this.getPointInfo(e.latlng.lat, e.latlng.lng);
    });
  }

  changerVue(): void {
    if (!this.map) return;

    this.map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) this.map.removeLayer(layer);
    });

    switch (this.typeVue) {
      case 'satellite':
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { attribution: 'Esri', maxZoom: 20 }
        ).addTo(this.map);
        L.tileLayer(
          'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 20, attribution: '© Esri' }
        ).addTo(this.map);
        break;
      case 'terrain':
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          { attribution: 'OpenTopoMap', maxZoom: 17 }).addTo(this.map);
        break;
      case 'relief':
        L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          { attribution: 'OpenTopoMap Relief', maxZoom: 17 }).addTo(this.map);
        break;
      default:
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          { attribution: 'OpenStreetMap' }).addTo(this.map);
    }
  }

  // ── Chargement données ─────────────────────────────────────────────────────

  async chargerDonnees(): Promise<void> {
    if (!this.isMapReady) {
      setTimeout(() => this.chargerDonnees(), 200);
      return;
    }

    this.parcelleService.getAllParcelles().subscribe({
      next: async (parcelles) => {
        this.parcelles = parcelles.filter(p => p.geometrie?.length);
        if (this.mode === 'parcelles') {
          await this.afficherParcelles();
        } else {
          await this.afficherZonesEau();
        }
      },
      error: err => console.error('Erreur parcelles:', err)
    });
  }

  // ── Affichage Mode Parcelles (heatmap altitude) ────────────────────────────

  private async afficherParcelles(): Promise<void> {
    this.nettoyerAffichage();

    const items = this.parcelles.map(p => ({
      id: p.id,
      nom: p.nom,
      geometrie: p.geometrie!,
      surface: p.surface,
      culture: p.culture,
      couleur: p.couleur
    }));

    await this.traiterEtAfficherAltitude(items);
  }

  // ── Affichage Mode Zones d'eau ─────────────────────────────────────────────

  private async afficherZonesEau(): Promise<void> {
    this.nettoyerAffichage();

    const items = this.parcelles.map(p => ({
      id: p.id,
      nom: p.nom,
      geometrie: p.geometrie!,
      surface: p.surface,
      culture: p.culture
    }));

    await this.traiterEtAfficherEau(items);
  }

  // ── Pipeline altitude : grille → API → heatmap ────────────────────────────

  private async traiterEtAfficherAltitude(
    items: Array<{ id: number; nom: string; geometrie: string; surface: number; culture?: string; couleur?: string }>
  ): Promise<void> {
    if (!items.length) return;

    this.altitudeLoading = true;
    this.progressPct = 0;
    this.progressLabel = 'Initialisation…';

    const allAltMin: number[] = [];
    const allAltMax: number[] = [];
    const allAltMoy: number[] = [];
    const bounds: L.LatLngBounds[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      this.progressPct = Math.round(((i + 1) / items.length) * 100);
      this.progressLabel = `${item.nom} (${i + 1}/${items.length})`;

      try {
        const geoJson = JSON.parse(item.geometrie);
        const polyCoords = this.extraireCoordonnees(geoJson);
        if (polyCoords.length < 3) continue;

        const grille = this.genererGrille(polyCoords, 8);
        const pointsAvecAlt = await this.recupererAltitudes(grille);

        const altitudes = pointsAvecAlt.map(p => p.altitude);
        const min  = Math.round(Math.min(...altitudes));
        const max  = Math.round(Math.max(...altitudes));
        const mean = altitudes.reduce((s, a) => s + a, 0) / altitudes.length;
        const stats: AltitudeStats = { min, max, mean, denivele: max - min };

        allAltMin.push(min);
        allAltMax.push(max);
        allAltMoy.push(mean);

        // Heatmap altitude
        const heatLayer = this.creerCoucheHeatmapAltitude(pointsAvecAlt, min, max, polyCoords);
        heatLayer.addTo(this.map);
        this.heatmapLayers.set(`alt_${i}`, heatLayer);

        // Contour via L.geoJSON (dimensions réelles) + blanc en mode altitude
        const contourLayer = L.geoJSON(geoJson, {
          style: {
            color: '#ffffff',
            weight: 2,
            fillOpacity: 0,
            dashArray: '6,3'
          }
        });

        const popupHtml = `
          <div class="info-popup">
            <h6>🌾 ${item.nom}</h6>
            <hr>
            <p>
              <i class="fas fa-ruler"></i> Surface: <strong>${item.surface} ha</strong><br>
              ${item.culture ? `<i class="fas fa-seedling text-success"></i> Culture: <strong>${item.culture}</strong><br>` : ''}
              <i class="fas fa-arrow-up text-danger"></i> Max: <strong>${max} m</strong><br>
              <i class="fas fa-arrow-down text-success"></i> Min: <strong>${min} m</strong><br>
              <i class="fas fa-chart-line text-warning"></i> Moy: <strong>${Math.round(mean)} m</strong><br>
              <i class="fas fa-ruler-vertical text-info"></i> Dénivelé: <strong>${stats.denivele} m</strong>
            </p>
          </div>
        `;

        contourLayer.bindPopup(popupHtml);
        contourLayer.on('click', () => {
          this.legendeParcelle = { nom: item.nom, stats };
        });

        this.contoursLayer.addLayer(contourLayer);
        bounds.push(contourLayer.getBounds());

      } catch (e) {
        console.error(`Erreur parcelle ${item.nom}:`, e);
      }
    }

    if (allAltMin.length) {
      this.altitudeMin = Math.min(...allAltMin);
      this.altitudeMax = Math.max(...allAltMax);
      this.altitudeMoyenne = allAltMoy.reduce((a, b) => a + b, 0) / allAltMoy.length;
    }

    if (bounds.length) {
      const totalBounds = bounds.reduce((acc, b) => acc.extend(b));
      this.map.fitBounds(totalBounds, { padding: [40, 40] });
    }

    this.altitudeLoading = false;
    this.progressLabel = '';
  }

  // ── Pipeline zones d'eau : grille → API → heatmap eau ────────────────────

  private async traiterEtAfficherEau(
    items: Array<{ id: number; nom: string; geometrie: string; surface: number; culture?: string }>
  ): Promise<void> {
    if (!items.length) return;

    this.altitudeLoading = true;
    this.progressPct = 0;
    this.progressLabel = 'Analyse hydrologique…';

    const bounds: L.LatLngBounds[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      this.progressPct = Math.round(((i + 1) / items.length) * 100);
      this.progressLabel = `Analyse ${item.nom} (${i + 1}/${items.length}) — requêtes espacées…`;

      try {
        const geoJson = JSON.parse(item.geometrie);
        const polyCoords = this.extraireCoordonnees(geoJson);
        if (polyCoords.length < 3) continue;

        // Grille standard pour la détection hydrologique
        const grille = this.genererGrille(polyCoords, 8);
        const pointsAvecAlt = await this.recupererAltitudes(grille);

        const altitudes = pointsAvecAlt.map(p => p.altitude);
        const altMin = Math.round(Math.min(...altitudes));
        const altMax = Math.round(Math.max(...altitudes));

        // Calculer l'indice d'accumulation d'eau pour chaque point
        const pointsAvecFlux = this.calculerFluxHydrologique(pointsAvecAlt, altMin, altMax);

        // Statistiques zones d'eau
        const waterStats = this.calculerStatistiquesEau(pointsAvecFlux, altMin, altMax);

        // Heatmap eau (palette bleue)
        const heatLayer = this.creerCoucheHeatmapEau(pointsAvecFlux, polyCoords);
        heatLayer.addTo(this.map);
        this.heatmapLayers.set(`eau_${i}`, heatLayer);

        // Contour via L.geoJSON (dimensions réelles)
        const contourLayer = L.geoJSON(geoJson, {
          style: {
            color: '#1565C0',
            weight: 2.5,
            fillOpacity: 0,
            dashArray: '5,4'
          }
        });

        const risqueClass = {
          'Critique': 'text-danger',
          'Élevé': 'text-warning',
          'Modéré': 'text-info',
          'Faible': 'text-success'
        }[waterStats.niveauRisque];

        const popupHtml = `
          <div class="info-popup">
            <h6>💧 ${item.nom}</h6>
            <hr>
            <p>
              <i class="fas fa-ruler"></i> Surface: <strong>${item.surface} ha</strong><br>
              ${item.culture ? `<i class="fas fa-seedling text-success"></i> Culture: <strong>${item.culture}</strong><br>` : ''}
              <i class="fas fa-exclamation-triangle ${risqueClass}"></i>
                Risque: <strong class="${risqueClass}">${waterStats.niveauRisque}</strong><br>
              <i class="fas fa-tint text-info"></i>
                Zones détectées: <strong>${waterStats.zonesDetectees}</strong><br>
              <i class="fas fa-percentage text-primary"></i>
                Surface affectée: <strong>${waterStats.surfaceAccumulation.toFixed(0)}%</strong><br>
              <i class="fas fa-arrow-down text-success"></i>
                Alt. min: <strong>${altMin} m</strong><br>
              <i class="fas fa-arrows-alt-v text-secondary"></i>
                Dénivelé: <strong>${altMax - altMin} m</strong>
            </p>
          </div>
        `;

        contourLayer.bindPopup(popupHtml);
        contourLayer.on('click', () => {
          this.legendeEau = { nom: item.nom, waterStats };
        });

        this.contoursLayer.addLayer(contourLayer);
        bounds.push(contourLayer.getBounds());

      } catch (e) {
        console.error(`Erreur zone eau ${item.nom}:`, e);
      }
    }

    if (bounds.length) {
      const totalBounds = bounds.reduce((acc, b) => acc.extend(b));
      this.map.fitBounds(totalBounds, { padding: [40, 40] });
    }

    this.altitudeLoading = false;
    this.progressLabel = '';
  }

  // ── Algorithme hydrologique ────────────────────────────────────────────────

  /**
   * Calcule un indice d'accumulation d'eau pour chaque point.
   * Basé sur : altitude relative (zones basses = accumulation),
   * pente locale estimée (points plats dans les creux = stagnation).
   * Retourne ratio [0,1] où 1 = accumulation maximale.
   */
  private calculerFluxHydrologique(
    points: AltitudePoint[],
    altMin: number,
    altMax: number
  ): Array<AltitudePoint & { fluxEau: number }> {
    const range = altMax - altMin || 1;

    return points.map(point => {
      // 1. Ratio d'altitude inversé : zones basses ont ratio élevé (s'accumule en bas)
      const ratioAlt = 1 - ((point.altitude - altMin) / range);

      // 2. Pente locale : chercher les voisins proches et estimer la pente
      const voisins = points.filter(p => {
        const dx = Math.abs(p.lng - point.lng);
        const dy = Math.abs(p.lat - point.lat);
        return (dx > 0 || dy > 0) && dx < 0.005 && dy < 0.005;
      });

      let penteLocale = 0;
      if (voisins.length > 0) {
        const diffAlt = voisins.map(v => v.altitude - point.altitude);
        const diffMax = Math.max(...diffAlt);    // voisins plus hauts → l'eau afflue ici
        const diffMoy = diffAlt.reduce((s, d) => s + d, 0) / diffAlt.length;
        // Si les voisins sont plus hauts en moyenne → ce point est un creux → accumulation
        penteLocale = Math.max(0, Math.min(1, (diffMoy / range) * 3 + 0.5));
      }

      // 3. Score composite : combinaison altitude basse + position de creux
      const fluxEau = Math.max(0, Math.min(1, ratioAlt * 0.65 + penteLocale * 0.35));

      return { ...point, fluxEau };
    });
  }

  /**
   * Calcule les statistiques hydrologiques pour une parcelle.
   */
  private calculerStatistiquesEau(
    points: Array<AltitudePoint & { fluxEau: number }>,
    altMin: number,
    altMax: number
  ): WaterZoneStats {
    const seuil = 0.55;   // seuil d'accumulation significative
    const pointsAccumulation = points.filter(p => p.fluxEau >= seuil);
    const surfaceAccumulation = (pointsAccumulation.length / points.length) * 100;

    // Détecter les "zones" discrètes par clustering simplifié
    let zonesDetectees = 0;
    const visites = new Set<number>();
    pointsAccumulation.forEach((p, idx) => {
      if (!visites.has(idx)) {
        const cluster = pointsAccumulation.filter((q, qIdx) =>
          !visites.has(qIdx) &&
          Math.abs(q.lat - p.lat) < 0.003 &&
          Math.abs(q.lng - p.lng) < 0.003
        );
        if (cluster.length >= 2) {
          zonesDetectees++;
          cluster.forEach((_, cIdx) => visites.add(cIdx));
        }
      }
    });

    // Niveau de risque basé sur le pourcentage de surface affectée
    let niveauRisque: WaterZoneStats['niveauRisque'];
    if (surfaceAccumulation >= 35)      niveauRisque = 'Critique';
    else if (surfaceAccumulation >= 20) niveauRisque = 'Élevé';
    else if (surfaceAccumulation >= 10) niveauRisque = 'Modéré';
    else                                niveauRisque = 'Faible';

    return {
      surfaceAccumulation,
      niveauRisque,
      zonesDetectees: Math.max(zonesDetectees, pointsAccumulation.length > 0 ? 1 : 0),
      altitudeMin: altMin,
      altitudeMax: altMax
    };
  }

  // ── Heatmap altitude IDW ───────────────────────────────────────────────────

  private creerCoucheHeatmapAltitude(
    points: AltitudePoint[],
    minAlt: number,
    maxAlt: number,
    polyCoords: [number, number][]
  ): L.Layer {
    const lngs = polyCoords.map(c => c[0]);
    const lats = polyCoords.map(c => c[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);

    const W = 400, H = 400;
    const POWER = 2;
    const range = maxAlt - minAlt || 1;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(W, H);
    const data = imgData.data;

    const pts = points.map(p => ({
      nx:  (p.lng - minLng) / (maxLng - minLng),
      ny:  1 - (p.lat - minLat) / (maxLat - minLat),
      alt: p.altitude
    }));

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const nx = px / (W - 1);
        const ny = py / (H - 1);
        const lng = minLng + nx * (maxLng - minLng);
        const lat = maxLat - ny * (maxLat - minLat);
        if (!this.pointDansPolygone(lng, lat, polyCoords)) continue;

        let weightSum = 0, valueSum = 0;
        for (const pt of pts) {
          const dx = nx - pt.nx, dy = ny - pt.ny;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 1e-10) { valueSum = pt.alt; weightSum = 1; break; }
          const w = 1 / Math.pow(dist2, POWER / 2);
          weightSum += w;
          valueSum  += w * pt.alt;
        }

        const altitude = valueSum / weightSum;
        const ratio    = Math.max(0, Math.min(1, (altitude - minAlt) / range));
        const [r, g, b] = this.altitudeVerseRGB(ratio);

        const idx = (py * W + px) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 180;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const blurred = document.createElement('canvas');
    blurred.width = W; blurred.height = H;
    const bCtx = blurred.getContext('2d')!;
    bCtx.filter = 'blur(10px)';
    bCtx.drawImage(canvas, 0, 0);

    const dataUrl = blurred.toDataURL('image/png');
    const overlayBounds: L.LatLngBoundsExpression = [[minLat, minLng], [maxLat, maxLng]];

    return L.imageOverlay(dataUrl, overlayBounds, { opacity: 1, interactive: false });
  }

  // ── Heatmap zones d'eau IDW ────────────────────────────────────────────────

  /**
   * Crée une couche heatmap bleue pour la visualisation des zones d'accumulation d'eau.
   * Palette : blanc (sec) → bleu clair → bleu moyen → bleu foncé → bleu nuit (accumulation max).
   */
  private creerCoucheHeatmapEau(
    points: Array<AltitudePoint & { fluxEau: number }>,
    polyCoords: [number, number][]
  ): L.Layer {
    const lngs = polyCoords.map(c => c[0]);
    const lats = polyCoords.map(c => c[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);

    const W = 400, H = 400;
    const POWER = 2;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(W, H);
    const data = imgData.data;

    const pts = points.map(p => ({
      nx:    (p.lng - minLng) / (maxLng - minLng),
      ny:    1 - (p.lat - minLat) / (maxLat - minLat),
      flux:  p.fluxEau
    }));

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const nx = px / (W - 1);
        const ny = py / (H - 1);
        const lng = minLng + nx * (maxLng - minLng);
        const lat = maxLat - ny * (maxLat - minLat);
        if (!this.pointDansPolygone(lng, lat, polyCoords)) continue;

        let weightSum = 0, valueSum = 0;
        for (const pt of pts) {
          const dx = nx - pt.nx, dy = ny - pt.ny;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 1e-10) { valueSum = pt.flux; weightSum = 1; break; }
          const w = 1 / Math.pow(dist2, POWER / 2);
          weightSum += w;
          valueSum  += w * pt.flux;
        }

        const fluxInterp = Math.max(0, Math.min(1, valueSum / weightSum));
        const [r, g, b] = this.fluxEauVerseRGB(fluxInterp);

        const idx = (py * W + px) * 4;
        data[idx] = r; data[idx + 1] = g; data[idx + 2] = b;
        // Opacité progressive : zones sèches plus transparentes, accumulation opaque
        data[idx + 3] = Math.round(80 + fluxInterp * 150);
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const blurred = document.createElement('canvas');
    blurred.width = W; blurred.height = H;
    const bCtx = blurred.getContext('2d')!;
    bCtx.filter = 'blur(8px)';
    bCtx.drawImage(canvas, 0, 0);

    const dataUrl = blurred.toDataURL('image/png');
    const overlayBounds: L.LatLngBoundsExpression = [[minLat, minLng], [maxLat, maxLng]];

    return L.imageOverlay(dataUrl, overlayBounds, { opacity: 1, interactive: false });
  }

  // ── Palette eau ────────────────────────────────────────────────────────────

  /**
   * Mappe un ratio de flux [0,1] → triplet RGB palette bleue eau.
   * 0 = zone sèche (blanc/transparent) → 1 = accumulation critique (bleu nuit).
   */
  private fluxEauVerseRGB(ratio: number): [number, number, number] {
    const stops: [number, [number, number, number]][] = [
      [0.00, [227, 242, 253]],   // #E3F2FD : blanc-bleu (très sec)
      [0.20, [187, 222, 251]],   // #BBDEFB : bleu très clair
      [0.40, [100, 181, 246]],   // #64B5F6 : bleu clair
      [0.60, [ 66, 165, 245]],   // #42A5F5 : bleu moyen
      [0.75, [ 21, 101, 192]],   // #1565C0 : bleu foncé
      [0.88, [ 13,  71, 161]],   // #0D47A1 : bleu très foncé
      [1.00, [ 13,  27, 142]]    // #0d1b8e : bleu nuit (accumulation critique)
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      const [r1, c1] = stops[i];
      const [r2, c2] = stops[i + 1];
      if (ratio >= r1 && ratio <= r2) {
        const t = (ratio - r1) / (r2 - r1);
        return [
          Math.round(c1[0] + t * (c2[0] - c1[0])),
          Math.round(c1[1] + t * (c2[1] - c1[1])),
          Math.round(c1[2] + t * (c2[2] - c1[2]))
        ];
      }
    }
    return [13, 27, 142];
  }

  // ── Palette altitude ───────────────────────────────────────────────────────

  private altitudeVerseRGB(ratio: number): [number, number, number] {
    const stops: [number, [number, number, number]][] = [
      [0.00, [ 26, 122,  26]],
      [0.20, [ 76, 175,  80]],
      [0.40, [168, 217,  90]],
      [0.55, [255, 224, 102]],
      [0.70, [255, 152,   0]],
      [0.85, [229,  57,  53]],
      [1.00, [130,  20,  10]]
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      const [r1, c1] = stops[i];
      const [r2, c2] = stops[i + 1];
      if (ratio >= r1 && ratio <= r2) {
        const t = (ratio - r1) / (r2 - r1);
        return [
          Math.round(c1[0] + t * (c2[0] - c1[0])),
          Math.round(c1[1] + t * (c2[1] - c1[1])),
          Math.round(c1[2] + t * (c2[2] - c1[2]))
        ];
      }
    }
    return [130, 20, 10];
  }

  getColorByAltitude(altitude: number): string {
    if (this.altitudeMin === undefined || this.altitudeMax === undefined) return '#333';
    const ratio = (altitude - this.altitudeMin) / ((this.altitudeMax - this.altitudeMin) || 1);
    const [r, g, b] = this.altitudeVerseRGB(Math.max(0, Math.min(1, ratio)));
    return `rgb(${r},${g},${b})`;
  }

  // ── Extraction GeoJSON ─────────────────────────────────────────────────────

  private extraireCoordonnees(geoJson: any): [number, number][] {
    let coords: any = [];
    if (geoJson.type === 'Feature')            coords = geoJson.geometry?.coordinates ?? [];
    else if (geoJson.type === 'Polygon')       coords = geoJson.coordinates ?? [];
    else if (geoJson.type === 'FeatureCollection' && geoJson.features?.length)
      coords = geoJson.features[0].geometry?.coordinates ?? [];

    if (coords.length && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
      coords = coords[0];
    }
    return (coords as any[][]).filter(c => c?.length >= 2).map(c => [c[0], c[1]] as [number, number]);
  }

  // ── Grille & point-dans-polygone ───────────────────────────────────────────

  private genererGrille(polyCoords: [number, number][], steps = 8): { lat: number; lng: number }[] {
    const lngs = polyCoords.map(c => c[0]);
    const lats = polyCoords.map(c => c[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);

    const stepLng = (maxLng - minLng) / (steps + 1);
    const stepLat = (maxLat - minLat) / (steps + 1);

    const points: { lat: number; lng: number }[] = [];

    for (let i = 1; i <= steps; i++) {
      for (let j = 1; j <= steps; j++) {
        const lng = minLng + i * stepLng;
        const lat = minLat + j * stepLat;
        if (this.pointDansPolygone(lng, lat, polyCoords)) {
          points.push({ lat, lng });
        }
      }
    }

    polyCoords.forEach(([lng, lat]) => points.push({ lat, lng }));

    return points;
  }

  private pointDansPolygone(px: number, py: number, poly: [number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > py) !== (yj > py)) &&
                        (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // ── API Open-Meteo Elevation ───────────────────────────────────────────────

  /**
   * Récupère les altitudes via Open-Meteo avec :
   *  - Cache local (clé arrondie à 4 décimales ≈ ~11 m de précision)
   *  - Respect du rate-limit : délai minimum entre deux appels
   *  - Retry automatique (x3) avec back-off exponentiel en cas de 429
   */
  private async recupererAltitudes(points: { lat: number; lng: number }[]): Promise<AltitudePoint[]> {
    const BATCH    = 80;   // réduit à 80 pour alléger chaque requête
    const results: AltitudePoint[] = [];

    // Séparer les points déjà en cache de ceux à charger
    const aCharger: Array<{ lat: number; lng: number; origIdx: number }> = [];
    const cacheKey = (p: { lat: number; lng: number }) =>
      `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;

    // Pré-remplir depuis le cache
    const resolved = new Array<AltitudePoint | null>(points.length).fill(null);
    points.forEach((p, idx) => {
      const cached = this.altitudeCache.get(cacheKey(p));
      if (cached !== undefined) {
        resolved[idx] = { lat: p.lat, lng: p.lng, altitude: cached };
      } else {
        aCharger.push({ ...p, origIdx: idx });
      }
    });

    // Appels API par batch uniquement pour les points non cachés
    for (let i = 0; i < aCharger.length; i += BATCH) {
      const batch = aCharger.slice(i, i + BATCH);

      // Respecter le délai minimum entre appels
      const maintenant = Date.now();
      const delai = this.API_DELAY_MS - (maintenant - this.dernierAppelApi);
      if (delai > 0) await this.sleep(delai);

      const lats = batch.map(p => p.lat).join(',');
      const lngs = batch.map(p => p.lng).join(',');
      const url  = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;

      const data = await this.fetchAvecRetry(url);
      this.dernierAppelApi = Date.now();

      data.elevation.forEach((elevation: number, idx: number) => {
        const p = batch[idx];
        this.altitudeCache.set(cacheKey(p), elevation);
        resolved[p.origIdx] = { lat: p.lat, lng: p.lng, altitude: elevation };
      });
    }

    // Assembler dans l'ordre original
    resolved.forEach(r => { if (r) results.push(r); });
    return results;
  }

  /**
   * fetch avec retry (max 3 tentatives) et back-off exponentiel.
   * Attend 2s, 4s, 8s avant chaque nouvelle tentative.
   */
  private async fetchAvecRetry(url: string, tentatives = 3): Promise<{ elevation: number[] }> {
    for (let essai = 1; essai <= tentatives; essai++) {
      const response = await fetch(url);

      if (response.ok) return response.json();

      if (response.status === 429) {
        if (essai === tentatives) throw new Error(`API altitude Open-Meteo: 429 (trop de requêtes)`);
        const attente = Math.pow(2, essai) * 1000;   // 2s, 4s, 8s
        console.warn(`Rate-limit Open-Meteo (429) — nouvelle tentative dans ${attente / 1000}s…`);
        await this.sleep(attente);
      } else {
        throw new Error(`API altitude Open-Meteo: ${response.status}`);
      }
    }
    throw new Error('API altitude : échec après toutes les tentatives');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Clic / info point ──────────────────────────────────────────────────────

  private async getPointInfo(lat: number, lng: number): Promise<void> {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    let altitude = this.altitudeCache.get(key);

    if (altitude === undefined) {
      try {
        const result = await this.recupererAltitudes([{ lat, lng }]);
        altitude = result[0]?.altitude ?? 0;
        this.altitudeCache.set(key, altitude);
      } catch {
        altitude = 0;
      }
    }

    let entite: any = null;
    let type: string | null = null;

    this.contoursLayer.eachLayer((layer: any) => {
      if (layer instanceof L.GeoJSON) {
        layer.eachLayer((subLayer: any) => {
          if (subLayer instanceof L.Polygon && subLayer.getBounds().contains([lat, lng])) {
            if (subLayer.feature?.properties) {
              entite = subLayer.feature.properties;
              type = 'Parcelle';
            }
          }
        });
      }
    });

    this.infoPoint = { lat, lng, altitude, type: type || 'Point', entite };
  }

  // ── Nettoyage ──────────────────────────────────────────────────────────────

  private nettoyerAffichage(): void {
    this.contoursLayer.clearLayers();

    this.heatmapLayers.forEach(layer => {
      if (this.map) this.map.removeLayer(layer);
    });
    this.heatmapLayers.clear();

    this.altitudeMin     = undefined;
    this.altitudeMax     = undefined;
    this.altitudeMoyenne = undefined;
    this.legendeParcelle = null;
    this.legendeEau      = null;
    this.infoPoint       = null;
  }

  reinitialiserCarte(): void {
    this.nettoyerAffichage();
    if (this.map) this.map.setView([34.0, 9.0], 7);
  }
}
