// components/vue-satellite/vue-satellite.component.ts
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { TerrainAnalysisService } from '../../services/terrain-analysis.service';
import { FermeService, FermeDetail } from '../../services/api/ferme.service';
import { ParcelleService, Parcelle } from '../../services/api/parcelle.service';
import { firstValueFrom } from 'rxjs';

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

          <!-- Légende -->
          <div class="legend-card" *ngIf="altitudeMin !== undefined && altitudeMax !== undefined">
            <div class="card shadow-sm">
              <div class="card-body p-2">
                <div class="d-flex align-items-center justify-content-between flex-wrap">
                  <div class="d-flex align-items-center">
                    <i class="fas fa-mountain me-2 text-success"></i>
                    <small class="text-muted me-2">Altitude:</small>
                    <div class="gradient-bar me-2"></div>
                    <small class="text-muted">
                      {{altitudeMin.toFixed(0)}}m
                      <i class="fas fa-arrow-right mx-1"></i>
                      {{altitudeMax.toFixed(0)}}m
                    </small>
                  </div>
                  <div class="mt-2 mt-md-0">
                    <small class="text-muted me-3">
                      <i class="fas fa-chart-line text-warning"></i>
                      Moy: {{altitudeMoyenne?.toFixed(0)}}m
                    </small>
                    <small class="text-muted">
                      <i class="fas fa-mountain-sun text-info"></i>
                      Pente: {{penteMoyenne?.toFixed(1)}}%
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Carte -->
          <div class="card shadow-sm">
            <div class="card-body p-0">
              <div id="satellite-map" style="height: 600px; width: 100%;"></div>
            </div>
          </div>

          <!-- Informations au clic -->
          <div class="card shadow-sm mt-3" *ngIf="infoPoint">
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <h6><i class="fas fa-info-circle me-2 text-info"></i>Information du point</h6>
                  <p class="mb-1">
                    <strong>Coordonnées:</strong> {{infoPoint.lat.toFixed(6)}}, {{infoPoint.lng.toFixed(6)}}
                  </p>
                  <p class="mb-0">
                    <strong>Altitude:</strong>
                    <span [style.color]="getColorByAltitude(infoPoint.altitude)">
                      {{infoPoint.altitude.toFixed(1)}} m
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

    .legend-card {
      position: relative;
      margin-bottom: 1rem;
      z-index: 1000;
    }

    .gradient-bar {
      width: 150px;
      height: 20px;
      background: linear-gradient(to right,
        #4CAF50, #FFC107, #FF5722, #F44336);
      border-radius: 10px;
      margin: 0 10px;
    }

    .btn-group .btn.active {
      background-color: #007bff;
      color: white;
    }

    .info-popup {
      padding: 8px;
      min-width: 220px;
    }

    .info-popup h6 {
      margin-bottom: 8px;
      color: #2c3e50;
      font-weight: bold;
    }

    .info-popup hr {
      margin: 8px 0;
    }

    @media (max-width: 768px) {
      .btn-group {
        margin-top: 10px;
        width: 100%;
      }

      .gradient-bar {
        width: 100px;
      }
    }
  `]
})
export class VueSatelliteComponent implements OnInit, AfterViewInit, OnDestroy {
  private map!: L.Map;
  private currentOverlay: L.GeoJSON | null = null;
  private altitudeMarkers: L.CircleMarker[] = [];
  private isMapReady: boolean = false;

  mode: 'fermes' | 'parcelles' = 'parcelles';
  typeVue: string = 'satellite';

  fermes: FermeDetail[] = [];
  parcelles: Parcelle[] = [];

  altitudeMin: number | undefined;
  altitudeMax: number | undefined;
  altitudeMoyenne: number | undefined;
  penteMoyenne: number | undefined;

  infoPoint: { lat: number, lng: number, altitude: number, type?: string, entite?: any } | null = null;

  private altitudeCache: Map<string, number> = new Map();

  constructor(
    private route: ActivatedRoute,
    private terrainAnalysis: TerrainAnalysisService,
    private fermeService: FermeService,
    private parcelleService: ParcelleService
  ) {}

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
    this.nettoyerMarqueurs();
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    this.map = L.map('satellite-map').setView([34.0, 9.0], 7);
    this.changerVue();
    L.control.scale({ metric: true, imperial: false }).addTo(this.map);

    this.map.on('click', async (e: L.LeafletMouseEvent) => {
      await this.getPointInfo(e.latlng.lat, e.latlng.lng);
    });
  }

  changerVue(): void {
    if (!this.map) return;

    this.map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        this.map.removeLayer(layer);
      }
    });

    let tileLayer: L.TileLayer;

    switch (this.typeVue) {
      case 'satellite':
        tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Esri',
          maxZoom: 19
        });
        break;
      case 'terrain':
        tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: 'OpenTopoMap',
          maxZoom: 17
        });
        break;
      case 'relief':
        tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/relief/{z}/{x}/{y}.png', {
          attribution: 'OpenTopoMap Relief',
          maxZoom: 17
        });
        break;
      default:
        tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: 'OpenStreetMap'
        });
    }

    tileLayer.addTo(this.map);
  }

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
                if (details && details.parcelles && details.parcelles.length > 0) {
                  this.fermes.push(details);
                }
              } catch (error) {
                console.error(`Erreur chargement ferme ${ferme.id}:`, error);
              }
            }
            await this.afficherFermes();
          },
          error: (error) => {
            console.error('Erreur chargement fermes:', error);
          }
        });
      } else {
        this.parcelleService.getAllParcelles().subscribe({
          next: async (parcelles) => {
            console.log('📦 Parcelles reçues:', parcelles.length);
            this.parcelles = parcelles.filter(p => p.geometrie && p.geometrie.length > 0);
            console.log(`📦 Parcelles avec géométrie: ${this.parcelles.length}`);
            await this.afficherParcellesAvecTest();
          },
          error: async (error) => {
            console.error('Erreur chargement parcelles:', error);
            await this.afficherParcellesAvecTest();
          }
        });
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
    }
  }

  private async afficherFermes(): Promise<void> {
    this.nettoyerAffichage();

    const geojsonFeatures: any[] = [];
    let allAltitudes: number[] = [];

    for (const ferme of this.fermes) {
      if (ferme.parcelles && ferme.parcelles.length > 0) {
        for (const parcelle of ferme.parcelles) {
          if (parcelle.geometrie) {
            try {
              const geojson = JSON.parse(parcelle.geometrie);
              if (geojson.geometry && geojson.geometry.coordinates) {
                const points = this.extrairePointsPolygone(geojson.geometry.coordinates);
                if (points.length >= 3) {
                  const analyse = await this.terrainAnalysis.analyserTerrain(points);
                  allAltitudes.push(analyse.altitudeMin, analyse.altitudeMax);

                  geojsonFeatures.push({
                    type: 'Feature',
                    properties: {
                      id: ferme.id,
                      nom: ferme.nom,
                      parcelleNom: parcelle.nom,
                      type: 'ferme',
                      couleur: ferme.couleur,
                      altitudeMin: analyse.altitudeMin,
                      altitudeMax: analyse.altitudeMax,
                      altitudeMoyenne: analyse.altitudeMoyenne,
                      penteMoyenne: analyse.penteMoyenne,
                      classePente: analyse.classePente,
                      points: points,
                      altitudes: analyse.altitudes
                    },
                    geometry: geojson.geometry
                  });
                }
              }
            } catch (e) {
              console.error('Erreur parsing GeoJSON:', e);
            }
          }
        }
      }
    }

    this.afficherGeoJSON(geojsonFeatures, allAltitudes);
  }

  private async afficherParcelles(): Promise<void> {
    this.nettoyerAffichage();

    const geojsonFeatures: any[] = [];
    let allAltitudes: number[] = [];

    for (const parcelle of this.parcelles) {
      if (parcelle.geometrie) {
        try {
          const geojson = JSON.parse(parcelle.geometrie);
          if (geojson.geometry && geojson.geometry.coordinates) {
            const points = this.extrairePointsPolygone(geojson.geometry.coordinates);
            if (points.length >= 3) {
              const analyse = await this.terrainAnalysis.analyserTerrain(points);
              allAltitudes.push(analyse.altitudeMin, analyse.altitudeMax);

              geojsonFeatures.push({
                type: 'Feature',
                properties: {
                  id: parcelle.id,
                  nom: parcelle.nom,
                  type: 'parcelle',
                  culture: parcelle.culture,
                  surface: parcelle.surface,
                  couleur: parcelle.couleur,
                  altitudeMin: analyse.altitudeMin,
                  altitudeMax: analyse.altitudeMax,
                  altitudeMoyenne: analyse.altitudeMoyenne,
                  penteMoyenne: analyse.penteMoyenne,
                  classePente: analyse.classePente,
                  points: points,
                  altitudes: analyse.altitudes
                },
                geometry: geojson.geometry
              });
            }
          }
        } catch (e) {
          console.error('Erreur parsing GeoJSON:', e);
        }
      }
    }

    console.log(`📊 Features créées: ${geojsonFeatures.length}`);
    this.afficherGeoJSON(geojsonFeatures, allAltitudes);
  }

  private async afficherParcellesAvecTest(): Promise<void> {
    await this.afficherParcelles();

    // Parcelle de test (Tunis)
    const pointsTest = [
      { lat: 36.8065, lng: 10.1715 },
      { lat: 36.8165, lng: 10.1715 },
      { lat: 36.8165, lng: 10.1915 },
      { lat: 36.8065, lng: 10.1915 },
      { lat: 36.8065, lng: 10.1715 }
    ];

    const analyse = await this.terrainAnalysis.analyserTerrain(pointsTest);

    if (analyse.altitudeMin !== undefined && analyse.altitudeMax !== undefined) {
      if (this.altitudeMin === undefined || analyse.altitudeMin < this.altitudeMin) {
        this.altitudeMin = analyse.altitudeMin;
      }
      if (this.altitudeMax === undefined || analyse.altitudeMax > this.altitudeMax) {
        this.altitudeMax = analyse.altitudeMax;
      }
    }

    const testLayer = L.polygon(pointsTest.map(p => [p.lat, p.lng]), {
      color: '#FF9800',
      weight: 3,
      fillColor: '#FF9800',
      fillOpacity: 0.5
    }).bindPopup(`
      <div class="info-popup">
        <h6>🧪 Parcelle Test - Tunis</h6>
        <p><i class="fas fa-flask"></i> Parcelle de test<br>
        <i class="fas fa-ruler"></i> 5 ha</p>
        <hr>
        <p><strong>Altitude:</strong><br>
        Min: ${analyse.altitudeMin?.toFixed(1)}m<br>
        Max: ${analyse.altitudeMax?.toFixed(1)}m<br>
        Moy: ${analyse.altitudeMoyenne?.toFixed(1)}m</p>
        <p><strong>Pente:</strong> ${analyse.penteMoyenne?.toFixed(1)}%<br>
        <strong>Classe:</strong> ${analyse.classePente}</p>
      </div>
    `);

    testLayer.addTo(this.map);
    console.log('✅ Parcelle de test ajoutée');

    pointsTest.forEach((point, idx) => {
      const altitude = analyse.altitudes[idx];
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 5,
        color: '#FF9800',
        fillColor: '#FF9800',
        fillOpacity: 0.8,
        weight: 2
      }).bindTooltip(`${altitude?.toFixed(1)}m`);
      marker.addTo(this.map);
      this.altitudeMarkers.push(marker);
    });
  }

  private afficherGeoJSON(features: any[], allAltitudes: number[]): void {
    if (features.length === 0) {
      console.warn('⚠️ Aucune feature à afficher');
      return;
    }

    if (allAltitudes.length > 0) {
      this.altitudeMin = Math.min(...allAltitudes);
      this.altitudeMax = Math.max(...allAltitudes);
      this.altitudeMoyenne = allAltitudes.reduce((a, b) => a + b, 0) / allAltitudes.length;
      console.log(`📈 Altitudes: min=${this.altitudeMin}, max=${this.altitudeMax}`);
    }

    const geojsonCollection = {
      type: 'FeatureCollection',
      features: features
    };

    this.currentOverlay = L.geoJSON(geojsonCollection as any, {
      style: (feature: any) => {
        const props = feature.properties;
        const altitudeMoyenne = props.altitudeMoyenne || 0;
        const couleur = this.terrainAnalysis.getColorByAltitude(
          altitudeMoyenne,
          this.altitudeMin || 0,
          this.altitudeMax || 100
        );
        return {
          color: couleur,
          weight: 2,
          fillColor: couleur,
          fillOpacity: 0.6
        };
      },
      onEachFeature: (feature: any, layer: L.Layer) => {
        const props = feature.properties;
        const isFerme = props.type === 'ferme';

        const popupContent = isFerme ? `
          <div class="info-popup">
            <h6>🏡 ${props.nom}</h6>
            <p><strong>Parcelle:</strong> ${props.parcelleNom}</p>
            <hr>
            <p><strong>Altitude:</strong><br>
            Min: ${props.altitudeMin?.toFixed(1)}m<br>
            Max: ${props.altitudeMax?.toFixed(1)}m<br>
            Moy: ${props.altitudeMoyenne?.toFixed(1)}m</p>
            <p><strong>Pente:</strong> ${props.penteMoyenne?.toFixed(1)}%<br>
            <strong>Classe:</strong> ${props.classePente}</p>
          </div>
        ` : `
          <div class="info-popup">
            <h6>🌾 ${props.nom}</h6>
            <p><i class="fas fa-seedling"></i> ${props.culture || 'Sans culture'}<br>
            <i class="fas fa-ruler"></i> ${props.surface} ha</p>
            <hr>
            <p><strong>Altitude:</strong><br>
            Min: ${props.altitudeMin?.toFixed(1)}m<br>
            Max: ${props.altitudeMax?.toFixed(1)}m<br>
            Moy: ${props.altitudeMoyenne?.toFixed(1)}m</p>
            <p><strong>Pente:</strong> ${props.penteMoyenne?.toFixed(1)}%<br>
            <strong>Classe:</strong> ${props.classePente}</p>
          </div>
        `;

        layer.bindPopup(popupContent);

        if (props.points && props.altitudes && this.map) {
          props.points.forEach((point: any, idx: number) => {
            const altitude = props.altitudes[idx];
            const couleurPoint = this.terrainAnalysis.getColorByAltitude(
              altitude,
              this.altitudeMin || 0,
              this.altitudeMax || 100
            );
            const marker = L.circleMarker([point.lat, point.lng], {
              radius: 4,
              color: couleurPoint,
              fillColor: couleurPoint,
              fillOpacity: 0.9,
              weight: 2
            });
            marker.bindTooltip(`${altitude.toFixed(1)}m`);
            marker.addTo(this.map);
            this.altitudeMarkers.push(marker);
          });
        }
      }
    });

    this.currentOverlay.addTo(this.map);
    console.log('✅ Features ajoutées à la carte');

    const bounds = this.currentOverlay.getBounds();
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  private extrairePointsPolygone(coordinates: any): Array<{lat: number, lng: number}> {
    const points: Array<{lat: number, lng: number}> = [];

    try {
      let coords = coordinates;
      if (coords && coords.length > 0) {
        if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
          coords = coords[0];
        }
        if (Array.isArray(coords) && coords.length > 0 && Array.isArray(coords[0])) {
          coords.forEach((coord: any) => {
            if (coord && coord.length >= 2) {
              points.push({ lng: coord[0], lat: coord[1] });
            }
          });
        }
      }
    } catch (e) {
      console.error('Erreur extraction points:', e);
    }

    return points;
  }

  private async getPointInfo(lat: number, lng: number): Promise<void> {
    const cacheKey = `${lat},${lng}`;
    let altitude = this.altitudeCache.get(cacheKey);

    if (!altitude) {
      try {
        altitude = await this.terrainAnalysis.getAltitude(lat, lng).toPromise() || 0;
        this.altitudeCache.set(cacheKey, altitude);
      } catch (error) {
        console.error('Erreur récupération altitude:', error);
        altitude = 0;
      }
    }

    let entite = null;
    let type = null;

    if (this.currentOverlay) {
      this.currentOverlay.eachLayer((layer: any) => {
        if (layer instanceof L.Polygon && layer.getBounds().contains([lat, lng])) {
          if (layer.feature?.properties) {
            entite = layer.feature.properties;
            type = entite.type === 'ferme' ? 'Ferme' : 'Parcelle';
          }
        }
      });
    }

    this.infoPoint = { lat, lng, altitude, type: type || 'Point', entite };
  }

  getColorByAltitude(altitude: number): string {
    return this.terrainAnalysis.getColorByAltitude(altitude, this.altitudeMin || 0, this.altitudeMax || 100);
  }

  private nettoyerAffichage(): void {
    if (this.currentOverlay) {
      this.map.removeLayer(this.currentOverlay);
      this.currentOverlay = null;
    }
    this.nettoyerMarqueurs();
  }

  private nettoyerMarqueurs(): void {
    this.altitudeMarkers.forEach(marker => {
      if (this.map && marker) {
        this.map.removeLayer(marker);
      }
    });
    this.altitudeMarkers = [];
  }

  reinitialiserCarte(): void {
    if (this.map) {
      this.map.setView([34.0, 9.0], 7);
      this.infoPoint = null;
    }
  }
}
