// components/vue-satellite/vue-satellite.component.ts
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { FermeService, FermeDetail } from '../../services/api/ferme.service';
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
                            [class.active]="mode === 'fermes'"
                            (click)="mode = 'fermes'; chargerDonnees()">
                      <i class="fas fa-warehouse me-1"></i> Fermes
                    </button>
                    <button class="btn btn-outline-primary"
                            [class.active]="mode === 'parcelles'"
                            (click)="mode = 'parcelles'; chargerDonnees()">
                      <i class="fas fa-map-marked-alt me-1"></i> Parcelles
                    </button>
                    <button class="btn btn-outline-primary"
                            (click)="reinitialiserCarte()">
                      <i class="fas fa-undo me-1"></i> Réinitialiser
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Barre de progression -->
          <div class="card shadow-sm mb-3" *ngIf="altitudeLoading">
            <div class="card-body py-2">
              <div class="d-flex align-items-center gap-3">
                <div class="spinner-border spinner-border-sm text-warning" role="status"></div>
                <div class="flex-grow-1">
                  <div class="progress" style="height: 6px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated bg-warning"
                         [style.width]="progressPct + '%'"></div>
                  </div>
                </div>
                <small class="text-muted text-nowrap">
                  {{progressLabel}}
                </small>
              </div>
            </div>
          </div>

          <!-- Légende altitude globale -->
          <div class="legend-card" *ngIf="altitudeMin !== undefined && altitudeMax !== undefined && !altitudeLoading">
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

              <!-- Légende flottante (détail parcelle cliquée) -->
              <div class="altitude-legend" *ngIf="legendeParcelle">
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

    /* ── Légende compacte en haut ── */
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

    /* ── Légende flottante sur la carte ── */
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
        #1a7a1a,
        #4CAF50,
        #a8d95a,
        #ffe066,
        #ff9800,
        #e53935,
        #821408
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
      .altitude-legend { right: 5px; bottom: 10px; }
    }
  `]
})
export class VueSatelliteComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Carte ──────────────────────────────────────────────────────────────────
  private map!: L.Map;
  private isMapReady = false;

  /** Couches contours GeoJSON des parcelles/fermes */
  private contoursLayer: L.LayerGroup = L.layerGroup();

  /** Couches heatmap IDW, indexées par id de parcelle */
  private heatmapLayers: Map<string, L.Layer> = new Map();

  // ── État ───────────────────────────────────────────────────────────────────
  mode: 'fermes' | 'parcelles' = 'parcelles';
  typeVue = 'satellite';

  fermes: FermeDetail[] = [];
  parcelles: Parcelle[] = [];

  altitudeMin: number | undefined;
  altitudeMax: number | undefined;
  altitudeMoyenne: number | undefined;

  infoPoint: { lat: number; lng: number; altitude: number; type?: string; entite?: any } | null = null;

  /** Légende flottante pour la parcelle survolée/cliquée */
  legendeParcelle: { nom: string; stats: AltitudeStats } | null = null;

  // ── Progression ────────────────────────────────────────────────────────────
  altitudeLoading = false;
  progressPct = 0;
  progressLabel = '';

  // ── Cache altitude ─────────────────────────────────────────────────────────
  private altitudeCache: Map<string, number> = new Map();

  constructor(
    private route: ActivatedRoute,
    private fermeService: FermeService,
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
    this.map = L.map('satellite-map').setView([34.0, 9.0], 7);
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

    let tileLayer: L.TileLayer;
    switch (this.typeVue) {
      case 'satellite':
        tileLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { attribution: 'Esri', maxZoom: 19 }
        );
        break;
      case 'terrain':
        tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          { attribution: 'OpenTopoMap', maxZoom: 17 });
        break;
      case 'relief':
        tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/relief/{z}/{x}/{y}.png',
          { attribution: 'OpenTopoMap Relief', maxZoom: 17 });
        break;
      default:
        tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          { attribution: 'OpenStreetMap' });
    }
    tileLayer.addTo(this.map);
  }

  // ── Chargement données ─────────────────────────────────────────────────────

  async chargerDonnees(): Promise<void> {
    if (!this.isMapReady) {
      setTimeout(() => this.chargerDonnees(), 200);
      return;
    }

    try {
      if (this.mode === 'fermes') {
        this.fermeService.getAllFermes().subscribe({
          next: async (fermes) => {
            this.fermes = [];
            for (const ferme of fermes) {
              try {
                const details = await firstValueFrom(this.fermeService.getFermeWithParcelles(ferme.id));
                if (details?.parcelles?.length) this.fermes.push(details);
              } catch (e) {
                console.error(`Erreur ferme ${ferme.id}:`, e);
              }
            }
            await this.afficherFermes();
          },
          error: err => console.error('Erreur fermes:', err)
        });
      } else {
        this.parcelleService.getAllParcelles().subscribe({
          next: async (parcelles) => {
            this.parcelles = parcelles.filter(p => p.geometrie?.length);
            await this.afficherParcelles();
          },
          error: async err => {
            console.error('Erreur parcelles:', err);
            await this.afficherParcelles();
          }
        });
      }
    } catch (e) {
      console.error('Erreur chargement:', e);
    }
  }

  // ── Affichage Fermes ───────────────────────────────────────────────────────

  private async afficherFermes(): Promise<void> {
    this.nettoyerAffichage();

    const items: Array<{ nom: string; geometrie: string; label: string }> = [];

    for (const ferme of this.fermes) {
      for (const parcelle of (ferme.parcelles || [])) {
        if (parcelle.geometrie) {
          items.push({
            nom: `${ferme.nom} – ${parcelle.nom}`,
            geometrie: parcelle.geometrie,
            label: ferme.nom
          });
        }
      }
    }

    await this.traiterEtAfficher(items);
  }

  // ── Affichage Parcelles ────────────────────────────────────────────────────

  private async afficherParcelles(): Promise<void> {
    this.nettoyerAffichage();

    const items = this.parcelles.map(p => ({
      nom: p.nom,
      geometrie: p.geometrie!,
      label: p.nom
    }));

    await this.traiterEtAfficher(items);
  }

  // ── Pipeline principal : grille → altitudes API → heatmap ─────────────────

  private async traiterEtAfficher(
    items: Array<{ nom: string; geometrie: string; label: string }>
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
        const polyCoords = this.extraireCoordonnees(geoJson);   // [lng, lat][]
        if (polyCoords.length < 3) continue;

        // 1. Grille de points intérieurs
        const grille = this.genererGrille(polyCoords, 8);

        // 2. Appel API altitude (batch)
        const pointsAvecAlt = await this.recupererAltitudes(grille);

        // 3. Stats
        const altitudes = pointsAvecAlt.map(p => p.altitude);
        const min  = Math.round(Math.min(...altitudes));
        const max  = Math.round(Math.max(...altitudes));
        const mean = altitudes.reduce((s, a) => s + a, 0) / altitudes.length;
        const stats: AltitudeStats = { min, max, mean, denivele: max - min };

        allAltMin.push(min);
        allAltMax.push(max);
        allAltMoy.push(mean);

        // 4. Heatmap canvas IDW
        const heatLayer = this.creerCoucheHeatmap(pointsAvecAlt, min, max, polyCoords);
        heatLayer.addTo(this.map);
        this.heatmapLayers.set(`${i}`, heatLayer);

        // 5. Contour blanc + popup
        const contour = L.polygon(
          polyCoords.map(([lng, lat]) => [lat, lng] as [number, number]),
          { color: '#ffffff', weight: 2, fillOpacity: 0, dashArray: '6,3' }
        );

        const popupHtml = `
          <div class="info-popup">
            <h6>🌾 ${item.nom}</h6>
            <hr>
            <p>
              <i class="fas fa-arrow-up text-danger"></i> Max: <strong>${max} m</strong><br>
              <i class="fas fa-arrow-down text-success"></i> Min: <strong>${min} m</strong><br>
              <i class="fas fa-chart-line text-warning"></i> Moy: <strong>${Math.round(mean)} m</strong><br>
              <i class="fas fa-ruler-vertical text-info"></i> Dénivelé: <strong>${stats.denivele} m</strong>
            </p>
          </div>
        `;

        contour.bindPopup(popupHtml);
        contour.on('click', () => {
          this.legendeParcelle = { nom: item.nom, stats };
        });
        this.contoursLayer.addLayer(contour);

        // Recalcul bounds
        bounds.push(contour.getBounds());

      } catch (e) {
        console.error(`Erreur parcelle ${item.nom}:`, e);
      }
    }

    // Stats globales
    if (allAltMin.length) {
      this.altitudeMin = Math.min(...allAltMin);
      this.altitudeMax = Math.max(...allAltMax);
      this.altitudeMoyenne = allAltMoy.reduce((a, b) => a + b, 0) / allAltMoy.length;
    }

    // Centrer la carte
    if (bounds.length) {
      const totalBounds = bounds.reduce((acc, b) => acc.extend(b));
      this.map.fitBounds(totalBounds, { padding: [40, 40] });
    }

    this.altitudeLoading = false;
    this.progressLabel = '';
  }

  // ── Heatmap IDW canvas ─────────────────────────────────────────────────────

  /**
   * Crée une couche Leaflet ImageOverlay basée sur un canvas avec interpolation
   * IDW (Inverse Distance Weighting) pixel par pixel + clipping dans le polygone.
   * Résultat : gradient fluide et continu identique à la capture de référence.
   */
  private creerCoucheHeatmap(
    points: AltitudePoint[],
    minAlt: number,
    maxAlt: number,
    polyCoords: [number, number][]   // [lng, lat]
  ): L.Layer {
    // ── 1. Bounding box géographique ──────────────────────────────────────────
    const lngs = polyCoords.map(c => c[0]);
    const lats = polyCoords.map(c => c[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);

    // ── 2. Paramètres canvas ──────────────────────────────────────────────────
    const W = 400, H = 400;
    const POWER = 2;
    const range = maxAlt - minAlt || 1;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // ── 3. IDW pixel par pixel ────────────────────────────────────────────────
    const imgData = ctx.createImageData(W, H);
    const data = imgData.data;

    // Pré-normaliser les points en coordonnées canvas [0..1]
    const pts = points.map(p => ({
      nx:  (p.lng - minLng) / (maxLng - minLng),
      ny:  1 - (p.lat - minLat) / (maxLat - minLat),
      alt: p.altitude
    }));

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const nx = px / (W - 1);
        const ny = py / (H - 1);

        // Reconstruire coord géo et tester si dans le polygone
        const lng = minLng + nx * (maxLng - minLng);
        const lat = maxLat - ny * (maxLat - minLat);
        if (!this.pointDansPolygone(lng, lat, polyCoords)) continue;

        // Interpolation IDW
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
        data[idx]     = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 180;   // opacité ~70%
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // ── 4. Flou gaussien pour adoucir les transitions ─────────────────────────
    const blurred = document.createElement('canvas');
    blurred.width = W; blurred.height = H;
    const bCtx = blurred.getContext('2d')!;
    bCtx.filter = 'blur(10px)';
    bCtx.drawImage(canvas, 0, 0);

    // ── 5. ImageOverlay géo-référencé ─────────────────────────────────────────
    const dataUrl = blurred.toDataURL('image/png');
    const bounds: L.LatLngBoundsExpression = [[minLat, minLng], [maxLat, maxLng]];

    return L.imageOverlay(dataUrl, bounds, {
      opacity: 1,
      interactive: false,
      className: 'altitude-overlay'
    });
  }

  // ── Grille & point-dans-polygone ───────────────────────────────────────────

  /**
   * Génère une grille régulière de points à l'intérieur du polygone.
   * @param polyCoords  [lng, lat][]
   * @param steps       divisions par axe
   */
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

    // Ajouter les sommets du polygone
    polyCoords.forEach(([lng, lat]) => points.push({ lat, lng }));

    return points;
  }

  /** Test point-dans-polygone par ray casting. */
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

  // ── API Open-Elevation ─────────────────────────────────────────────────────

  /**
   * Appelle Open-Elevation pour récupérer les altitudes de la liste de points.
   * Splits en batches de 100 pour respecter les limites de l'API.
   */
  /**
   * Récupère les altitudes via l'API Open-Meteo Elevation.
   * URL : https://api.open-meteo.com/v1/elevation
   * Avantages : GET uniquement, CORS autorisé depuis le navigateur, gratuit sans clé.
   * Limite : 100 points max par requête → on split en batches.
   */
  private async recupererAltitudes(points: { lat: number; lng: number }[]): Promise<AltitudePoint[]> {
    const BATCH = 100;
    const results: AltitudePoint[] = [];

    for (let i = 0; i < points.length; i += BATCH) {
      const batch = points.slice(i, i + BATCH);

      const lats  = batch.map(p => p.lat).join(',');
      const lngs  = batch.map(p => p.lng).join(',');
      const url   = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`API altitude Open-Meteo: ${response.status}`);

      const data: { elevation: number[] } = await response.json();

      data.elevation.forEach((elevation: number, idx: number) => {
        results.push({
          lat:      batch[idx].lat,
          lng:      batch[idx].lng,
          altitude: elevation
        });
      });
    }

    return results;
  }

  // ── Palette de couleurs ────────────────────────────────────────────────────

  /**
   * Mappe un ratio [0,1] → triplet RGB.
   * 0 = vert foncé (altitude basse) → 1 = rouge foncé (altitude haute)
   */
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

  /** Retourne une couleur CSS pour l'affichage dans le panneau infoPoint. */
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

    // Gérer Polygon [[[lng,lat],...]] ou [[[lng,lat],...],...]
    if (coords.length && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
      coords = coords[0];
    }
    return (coords as any[][]).filter(c => c?.length >= 2).map(c => [c[0], c[1]] as [number, number]);
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

    // Chercher si le point est dans une parcelle affichée
    let entite: any = null;
    let type: string | null = null;

    this.contoursLayer.eachLayer((layer: any) => {
      if (layer instanceof L.Polygon && layer.getBounds().contains([lat, lng])) {
        if (layer.feature?.properties) {
          entite = layer.feature.properties;
          type = entite?.type === 'ferme' ? 'Ferme' : 'Parcelle';
        }
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

    this.altitudeMin = undefined;
    this.altitudeMax = undefined;
    this.altitudeMoyenne = undefined;
    this.legendeParcelle = null;
    this.infoPoint = null;
  }

  reinitialiserCarte(): void {
    this.nettoyerAffichage();
    if (this.map) this.map.setView([34.0, 9.0], 7);
  }
}
