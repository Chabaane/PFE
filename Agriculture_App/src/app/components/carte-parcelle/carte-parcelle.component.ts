// components/carte-parcelle/carte-parcelle.component.ts
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-draw';
import { ParcelleService, Parcelle, DessinParcelleDto } from '../../services/api/parcelle.service';
import area from '@turf/area';
import { polygon } from '@turf/helpers';
import { MeteoPoint, MeteoService } from '@app/services/api/meteo.service';
import { MeteoPopupComponent } from 'src/app/components/donnees-meteo/meteo-popup.component';

// Correction pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/images/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/images/marker-icon.png',
  shadowUrl: 'assets/leaflet/images/marker-shadow.png'
});

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
  selector: 'app-carte-parcelle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MeteoPopupComponent],
  template: `
    <div class="container-fluid mt-4">

      <!-- En-tête -->
      <div class="row mb-4">
        <div class="col-md-8">
          <h3>
            <i class="fas fa-map-marked-alt me-2"></i>
            Carte des Parcelles - Agriculteur {{agriculteurId}}
          </h3>
          <p class="text-muted">Visualisez et gérez les parcelles de l'agriculteur sur la carte</p>
        </div>
        <div class="col-md-4 text-end">
          <button class="btn btn-success me-2" (click)="dessinerNouvelleParcelle()">
            <i class="fas fa-draw-polygon me-1"></i> Dessiner une parcelle
          </button>
          <button class="btn btn-primary" (click)="synchroniser()" [disabled]="!hasOfflineData">
            <i class="fas fa-sync-alt me-1" [class.fa-spin]="synchronisationEnCours"></i>
            Synchroniser ({{parcellesOfflineCount}})
          </button>
        </div>
      </div>

      <!-- Cartes de statistiques -->
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="card text-center border-success">
            <div class="card-body">
              <h5 class="card-title text-success">{{parcelles.length}}</h5>
              <p class="card-text">Parcelles</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center border-info">
            <div class="card-body">
              <h5 class="card-title text-info">{{surfaceTotale}} ha</h5>
              <p class="card-text">Surface totale</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center border-warning">
            <div class="card-body">
              <h5 class="card-title text-warning">{{parcellesOfflineCount}}</h5>
              <p class="card-text">Non synchronisées</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center border-primary">
            <div class="card-body">
              <h5 class="card-title text-primary">{{connectionStatus}}</h5>
              <p class="card-text">Connexion</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Carte et liste -->
      <div class="row">

        <!-- Carte Leaflet -->
        <div class="col-md-8">
          <div class="card shadow-sm position-relative">
            <div class="card-header bg-dark text-white">
              <div class="d-flex justify-content-between align-items-center">
                <span><i class="fas fa-map me-2"></i>Carte Interactive</span>
                <div class="d-flex gap-2 align-items-center">

                  <!-- Sélecteur de mode carte -->
                  <div class="map-mode-selector">
                    <button class="btn btn-sm"
                            [class.btn-light]="modeAffichage !== 'altitude'"
                            [class.btn-warning]="modeAffichage === 'altitude'"
                            (click)="basculerModeAltitude()"
                            [title]="modeAffichage === 'altitude' ? 'Désactiver carte d\\'altitude' : 'Activer carte d\\'altitude'">
                      <i class="fas fa-mountain me-1"></i>
                      <span *ngIf="modeAffichage !== 'altitude'">Altitude</span>
                      <span *ngIf="modeAffichage === 'altitude'">
                        <span *ngIf="!altitudeLoading">Altitude ✓</span>
                        <span *ngIf="altitudeLoading">
                          <i class="fas fa-spinner fa-spin me-1"></i>Chargement...
                        </span>
                      </span>
                    </button>
                  </div>

                  <button class="btn btn-sm btn-light" (click)="centrerCarte()">
                    <i class="fas fa-crosshairs"></i>
                  </button>
                  <button class="btn btn-sm btn-light" (click)="changerMode()">
                    {{modeDessin ? 'Annuler le dessin' : 'Mode dessin'}}
                  </button>
                </div>
              </div>
            </div>

            <div class="card-body p-0 position-relative">
              <div id="map" style="height: 600px;"></div>

              <!-- Bouton Météo -->
              <button class="meteo-toggle-btn"
                      [class.active]="showMeteoPanel"
                      (click)="toggleMeteoPanel()">
                <i class="fas"
                   [class.fa-cloud-sun]="!showMeteoPanel"
                   [class.fa-times]="showMeteoPanel"></i>
                <span *ngIf="!showMeteoPanel">Météo</span>
              </button>

              <app-meteo-popup
                *ngIf="showMeteoPanel && selectedLat && selectedLng"
                [pointNom]="selectedPointName"
                [latitude]="selectedLat"
                [longitude]="selectedLng"
                class="meteo-floating-panel">
              </app-meteo-popup>

              <!-- Légende Altitude (visible uniquement en mode altitude) -->
              <div class="altitude-legend" *ngIf="modeAffichage === 'altitude' && altitudeParcelleActive">
                <div class="legend-title">
                  <i class="fas fa-mountain me-1"></i>
                  Altitude - {{altitudeParcelleActive.nom}}
                </div>
                <div class="legend-gradient"></div>
                <div class="legend-labels">
                  <span class="legend-max">{{altitudeStats?.max}} m</span>
                  <span class="legend-mid">{{altitudeStats ? ((altitudeStats.max + altitudeStats.min) / 2 | number:'1.0-0') : ''}} m</span>
                  <span class="legend-min">{{altitudeStats?.min}} m</span>
                </div>
                <div class="legend-stats" *ngIf="altitudeStats">
                  <div><i class="fas fa-arrow-up text-danger me-1"></i>Max: <strong>{{altitudeStats.max}} m</strong></div>
                  <div><i class="fas fa-arrow-down text-success me-1"></i>Min: <strong>{{altitudeStats.min}} m</strong></div>
                  <div><i class="fas fa-ruler-vertical text-warning me-1"></i>Dénivelé: <strong>{{altitudeStats.denivele}} m</strong></div>
                  <div><i class="fas fa-chart-line text-info me-1"></i>Moy: <strong>{{altitudeStats.mean | number:'1.0-0'}} m</strong></div>
                </div>
              </div>

              <!-- Message si mode altitude activé mais aucune parcelle sélectionnée -->
              <div class="altitude-hint" *ngIf="modeAffichage === 'altitude' && !altitudeParcelleActive && !altitudeLoading">
                <i class="fas fa-hand-pointer me-1"></i>
                Cliquez sur une parcelle pour afficher sa carte d'altitude
              </div>

            </div>
          </div>
        </div>

        <!-- Liste des parcelles -->
        <div class="col-md-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <span><i class="fas fa-list me-2"></i>Liste des Parcelles</span>
              <!-- Badge mode altitude -->
              <span *ngIf="modeAffichage === 'altitude'" class="badge bg-warning text-dark">
                <i class="fas fa-mountain me-1"></i>Mode Altitude
              </span>
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush" *ngIf="parcelles.length > 0">
                <div *ngFor="let parcelle of parcelles"
                     class="list-group-item list-group-item-action parcelle-item"
                     [class.active]="parcelle.id === parcelleSelectionnee?.id"
                     [class.altitude-active]="modeAffichage === 'altitude' && parcelle.id === altitudeParcelleActive?.id"
                     (click)="selectionnerParcelle(parcelle)">
                  <div class="parcelle-color" [style.background-color]="parcelle.couleur"></div>
                  <div class="parcelle-info">
                    <div class="parcelle-nom">
                      {{parcelle.nom}}
                      <span *ngIf="!parcelle.estSynchronise" class="badge bg-warning ms-2">Hors ligne</span>
                    </div>
                    <div class="parcelle-meta">
                      <span>{{parcelle.surface}} ha</span>
                      <span class="mx-2">•</span>
                      <span>{{parcelle.gouvernorat || 'Localisation inconnue'}}</span>
                    </div>
                    <div *ngIf="parcelle.culture" class="parcelle-culture">
                      <i class="fas fa-seedling me-1"></i>{{parcelle.culture}}
                    </div>
                    <!-- Mini stats altitude si disponibles -->
                    <div *ngIf="modeAffichage === 'altitude' && altitudeParcelleActive?.id === parcelle.id && altitudeStats"
                         class="altitude-mini-stats">
                      <span class="text-danger"><i class="fas fa-arrow-up"></i> {{altitudeStats.max}}m</span>
                      <span class="mx-1 text-muted">|</span>
                      <span class="text-success"><i class="fas fa-arrow-down"></i> {{altitudeStats.min}}m</span>
                      <span class="mx-1 text-muted">|</span>
                      <span class="text-warning">Δ{{altitudeStats.denivele}}m</span>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-outline-danger btn-delete"
                          (click)="supprimerParcelle(parcelle.id); $event.stopPropagation()">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <div *ngIf="parcelles.length === 0" class="text-center py-5">
                <i class="fas fa-map-marked-alt fa-3x text-muted mb-3"></i>
                <p class="text-muted">Aucune parcelle trouvée</p>
                <button class="btn btn-success" (click)="dessinerNouvelleParcelle()">
                  <i class="fas fa-plus me-1"></i> Créer la première parcelle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal d'édition de parcelle -->
      <div class="modal fade" [class.show]="modalVisible" [style.display]="modalVisible ? 'block' : 'none'">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title">{{estModification ? 'Modifier' : 'Nouvelle'}} Parcelle</h5>
              <button type="button" class="btn-close btn-close-white" (click)="fermerModal()"></button>
            </div>
            <div class="modal-body">
              <form #parcelleForm="ngForm" *ngIf="parcelleEnEdition">
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Nom *</label>
                      <input type="text" class="form-control" [(ngModel)]="parcelleEnEdition.nom"
                             name="nom" required>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Surface (ha) *</label>
                      <input type="number" class="form-control" [(ngModel)]="parcelleEnEdition.surface"
                             name="surface" step="0.01" min="0.01" required>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Couleur</label>
                      <div class="d-flex gap-2">
                        <div *ngFor="let couleur of couleurs"
                             class="color-option"
                             [style.background-color]="couleur"
                             [class.selected]="parcelleEnEdition.couleur === couleur"
                             (click)="parcelleEnEdition.couleur = couleur">
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Culture</label>
                      <select class="form-control" [(ngModel)]="parcelleEnEdition.culture" name="culture">
                        <option value="">Sélectionner</option>
                        <option value="Blé">Blé</option>
                        <option value="Orge">Orge</option>
                        <option value="Maïs">Maïs</option>
                        <option value="Olives">Olives</option>
                        <option value="Vigne">Vigne</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-4">
                    <div class="mb-3">
                      <label class="form-label">Gouvernorat</label>
                      <input type="text" class="form-control" [(ngModel)]="parcelleEnEdition.gouvernorat"
                             name="gouvernorat">
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="mb-3">
                      <label class="form-label">Délégation</label>
                      <input type="text" class="form-control" [(ngModel)]="parcelleEnEdition.delegation"
                             name="delegation">
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="mb-3">
                      <label class="form-label">Secteur</label>
                      <input type="text" class="form-control" [(ngModel)]="parcelleEnEdition.secteur"
                             name="secteur">
                    </div>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" [(ngModel)]="parcelleEnEdition.description"
                            name="description" rows="3"></textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="fermerModal()">Annuler</button>
              <button type="button" class="btn btn-primary"
                      (click)="sauvegarderParcelle()"
                      [disabled]="!parcelleEnEdition || !parcelleForm || !parcelleForm.valid || sauvegardeEnCours">
                <i class="fas fa-save me-1"></i>
                {{sauvegardeEnCours ? 'Enregistrement...' : 'Enregistrer'}}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    #map {
      border-radius: 0 0 0.375rem 0.375rem;
      height: 600px;
      width: 100%;
    }

    /* ── Bouton toggle météo ── */
    .meteo-toggle-btn {
      position: absolute;
      top: 20px;
      left: 20px;
      z-index: 1000;
      background: white;
      border: none;
      border-radius: 40px;
      padding: 10px 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
      color: #333;
    }
    .meteo-toggle-btn:hover {
      background: #f8f9fa;
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    .meteo-toggle-btn.active { background: #1e3c72; color: white; }
    .meteo-toggle-btn i { font-size: 1.2rem; color: #f39c12; }
    .meteo-toggle-btn.active i { color: white; }

    /* ── Panneau météo flottant ── */
    .meteo-floating-panel {
      position: absolute;
      top: 80px;
      left: 20px;
      width: 380px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    }
    @keyframes slideIn {
      from { transform: translateX(-20px); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }

    /* ── Légende Altitude ── */
    .altitude-legend {
      position: absolute;
      bottom: 30px;
      right: 10px;
      z-index: 1000;
      background: rgba(255,255,255,0.96);
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      min-width: 170px;
      border: 1px solid rgba(0,0,0,0.08);
    }
    .legend-title {
      font-weight: 700;
      font-size: 0.82rem;
      color: #333;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
    }
    .legend-gradient {
      height: 130px;
      width: 22px;
      border-radius: 6px;
      background: linear-gradient(
        to top,
        #1a7a1a,
        #4CAF50,
        #a8d95a,
        #ffe066,
        #ff9800,
        #e53935
      );
      float: left;
      margin-right: 8px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
    }
    .legend-labels {
      float: left;
      height: 130px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 0.78rem;
      font-weight: 600;
      color: #444;
      margin-right: 4px;
    }
    .legend-max { color: #c62828; }
    .legend-mid { color: #e65100; }
    .legend-min { color: #1b5e20; }
    .legend-stats {
      clear: both;
      padding-top: 10px;
      margin-top: 8px;
      border-top: 1px solid #eee;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.78rem;
      color: #555;
    }

    /* ── Hint altitude ── */
    .altitude-hint {
      position: absolute;
      bottom: 30px;
      right: 10px;
      z-index: 1000;
      background: rgba(255, 193, 7, 0.92);
      color: #333;
      padding: 10px 16px;
      border-radius: 20px;
      font-size: 0.82rem;
      font-weight: 600;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }

    /* ── Liste parcelles ── */
    .parcelle-item {
      display: flex;
      align-items: center;
      padding: 12px 15px;
      cursor: pointer;
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }
    .parcelle-item.active {
      background-color: #e3f2fd;
      border-left-color: #2196f3;
    }
    .parcelle-item.altitude-active {
      background-color: #fff8e1;
      border-left-color: #ffc107;
    }
    .parcelle-color {
      width: 8px;
      height: 40px;
      border-radius: 4px;
      margin-right: 12px;
    }
    .parcelle-info { flex: 1; }
    .parcelle-nom {
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
    }
    .parcelle-meta {
      font-size: 0.8rem;
      color: #6c757d;
      margin-bottom: 2px;
    }
    .parcelle-culture {
      font-size: 0.75rem;
      color: #2a5298;
    }
    .altitude-mini-stats {
      font-size: 0.72rem;
      margin-top: 3px;
      color: #555;
    }
    .btn-delete { opacity: 0; transition: opacity 0.2s; }
    .parcelle-item:hover .btn-delete { opacity: 1; }

    /* ── Color picker ── */
    .color-option {
      width: 40px;
      height: 30px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
      border-radius: 4px;
    }
    .color-option:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .color-option.selected {
      border: 2px solid white;
      box-shadow: 0 0 0 2px #007bff;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .altitude-legend { right: 5px; bottom: 10px; }
    }
  `]
})
export class CarteParcelleComponent implements OnInit, OnDestroy {
  @ViewChild('parcelleForm') parcelleForm!: NgForm;

  // Météo
  selectedLat?: number;
  selectedLng?: number;
  selectedPointName: string = '';
  showMeteoPanel = false;
  showMeteoPopup = false;
  popupX = 0;
  popupY = 0;
  meteoData: MeteoPoint | null = null;
  meteoLoading = false;
  popupTimeout: any;

  // Agriculteur & parcelles
  agriculteurId!: number;
  parcelles: Parcelle[] = [];
  parcelleSelectionnee: Parcelle | null = null;
  parcelleEnEdition: DessinParcelleDto & { id?: number } | null = null;
  estModification = false;

  // Carte Leaflet
  map!: L.Map;
  drawnItems: L.FeatureGroup = new L.FeatureGroup();
  drawControl: any = null;
  modeDessin = false;

  // États UI
  modalVisible = false;
  sauvegardeEnCours = false;
  synchronisationEnCours = false;
  hasOfflineData = false;
  parcellesOfflineCount = 0;
  surfaceTotale = 0;
  connectionStatus = navigator.onLine ? 'En ligne' : 'Hors ligne';

  // Options
  couleurs = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];

  // ── Mode Altitude ──────────────────────────────────────────────────────────
  /** 'normal' | 'altitude' */
  modeAffichage: 'normal' | 'altitude' = 'normal';
  altitudeLoading = false;
  altitudeParcelleActive: Parcelle | null = null;
  altitudeStats: AltitudeStats | null = null;

  /** Couches SVG altitude dessinées sur la carte, indexées par parcelle.id */
  private altitudeLayers: Map<number, L.Layer> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parcelleService: ParcelleService,
    private meteoService: MeteoService
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.agriculteurId = +params['agriculteurId'];
      this.chargerParcelles();
      setTimeout(() => this.initCarte(), 100);
    });
    window.addEventListener('online',  this.mettreAJourStatutConnexion.bind(this));
    window.addEventListener('offline', this.mettreAJourStatutConnexion.bind(this));
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
    window.removeEventListener('online',  this.mettreAJourStatutConnexion.bind(this));
    window.removeEventListener('offline', this.mettreAJourStatutConnexion.bind(this));
  }

  // ── Init carte ─────────────────────────────────────────────────────────────

  private initCarte(): void {
    this.map = L.map('map', {
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      preferCanvas: true
    }).setView([34.0, 9.0], 6);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20, attribution: '© Esri' }
    ).addTo(this.map);

    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20, attribution: '© Esri' }
    ).addTo(this.map);

    this.drawnItems.addTo(this.map);
    this.initControlesDessin();

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.afficherMeteoPourPoint(e);
    });
  }

  // ── Mode Altitude : méthodes publiques ─────────────────────────────────────

  /**
   * Bascule entre le mode normal et le mode carte d'altitude.
   * En mode altitude, un clic sur une parcelle déclenche le chargement de la heatmap.
   */
  basculerModeAltitude(): void {
    if (this.modeAffichage === 'altitude') {
      this.desactiverModeAltitude();
    } else {
      this.modeAffichage = 'altitude';
      // Effacer les couches normales et redessiner sans couleur de remplissage
      this.afficherParcellesSurCarte();
    }
  }

  private desactiverModeAltitude(): void {
    this.modeAffichage = 'normal';
    this.altitudeParcelleActive = null;
    this.altitudeStats = null;
    // Supprimer les couches altitude
    this.altitudeLayers.forEach(layer => this.map.removeLayer(layer));
    this.altitudeLayers.clear();
    // Redessiner les parcelles normalement
    this.afficherParcellesSurCarte();
  }

  /**
   * Chargement et affichage de la heatmap altitude pour une parcelle.
   * Appelle l'API open-elevation (https://api.open-elevation.com) pour chaque point
   * d'une grille générée à l'intérieur du polygone de la parcelle.
   */
  async afficherHeatmapAltitude(parcelle: Parcelle): Promise<void> {
    if (!parcelle.geometrie) return;

    // Supprimer l'ancienne couche altitude si elle existe
    if (this.altitudeParcelleActive && this.altitudeLayers.has(this.altitudeParcelleActive.id)) {
      this.map.removeLayer(this.altitudeLayers.get(this.altitudeParcelleActive.id)!);
      this.altitudeLayers.delete(this.altitudeParcelleActive.id);
    }

    this.altitudeLoading = true;
    this.altitudeParcelleActive = parcelle;
    this.altitudeStats = null;

    try {
      const geoJson = JSON.parse(parcelle.geometrie);
      const coords: [number, number][] = this.extraireCoordonnees(geoJson);
      if (!coords.length) { this.altitudeLoading = false; return; }

      // Générer une grille de points à l'intérieur du polygone
      const grille = this.genererGrille(coords, 8);

      // Appeler l'API d'altitude par batches de 100 points max
      const pointsAvecAltitude = await this.recupererAltitudes(grille);

      // Calculer les stats
      const altitudes = pointsAvecAltitude.map(p => p.altitude);
      const min  = Math.round(Math.min(...altitudes));
      const max  = Math.round(Math.max(...altitudes));
      const mean = altitudes.reduce((s, a) => s + a, 0) / altitudes.length;
      this.altitudeStats = { min, max, mean, denivele: max - min };

      // Dessiner la heatmap sur la carte
      const heatLayer = this.creerCoucheHeatmap(pointsAvecAltitude, min, max, coords);
      heatLayer.addTo(this.map);
      this.altitudeLayers.set(parcelle.id, heatLayer);

    } catch (err) {
      console.error('Erreur chargement altitude:', err);
      alert('Impossible de charger les données d\'altitude. Veuillez réessayer.');
    } finally {
      this.altitudeLoading = false;
    }
  }

  // ── Altitude : méthodes privées ────────────────────────────────────────────

  /**
   * Extrait les coordonnées [lng, lat] depuis un GeoJSON Feature ou Geometry.
   */
  private extraireCoordonnees(geoJson: any): [number, number][] {
    let coords: [number, number][][] = [];
    if (geoJson.type === 'Feature') {
      coords = geoJson.geometry?.coordinates ?? [];
    } else if (geoJson.type === 'Polygon') {
      coords = geoJson.coordinates ?? [];
    } else if (geoJson.type === 'FeatureCollection' && geoJson.features?.length) {
      coords = geoJson.features[0].geometry?.coordinates ?? [];
    }
    return (coords[0] ?? []) as [number, number][];
  }

  /**
   * Génère une grille régulière de points [lat, lng] à l'intérieur d'un polygone.
   * @param polygonCoords  tableau de [lng, lat]
   * @param steps          nombre de divisions par axe (steps² points max)
   */
  private genererGrille(polygonCoords: [number, number][], steps = 8): { lat: number; lng: number }[] {
    const lngs = polygonCoords.map(c => c[0]);
    const lats = polygonCoords.map(c => c[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);

    const stepLng = (maxLng - minLng) / (steps + 1);
    const stepLat = (maxLat - minLat) / (steps + 1);

    const points: { lat: number; lng: number }[] = [];

    for (let i = 1; i <= steps; i++) {
      for (let j = 1; j <= steps; j++) {
        const lng = minLng + i * stepLng;
        const lat = minLat + j * stepLat;
        if (this.pointDansPolygone(lng, lat, polygonCoords)) {
          points.push({ lat, lng });
        }
      }
    }

    // Ajouter aussi les sommets du polygone
    polygonCoords.forEach(([lng, lat]) => points.push({ lat, lng }));

    return points;
  }

  /**
   * Test point-dans-polygone (ray casting).
   */
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

  /**
   * Appelle l'API Open-Elevation pour récupérer les altitudes de la liste de points.
   * Documenation : https://api.open-elevation.com
   * Splits en batches de 100 pour respecter les limites de l'API.
   */
  private async recupererAltitudes(points: { lat: number; lng: number }[]): Promise<AltitudePoint[]> {
    const BATCH_SIZE = 100;
    const results: AltitudePoint[] = [];

    for (let i = 0; i < points.length; i += BATCH_SIZE) {
      const batch = points.slice(i, i + BATCH_SIZE);
      const locations = batch.map(p => ({ latitude: p.lat, longitude: p.lng }));

      const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ locations })
      });

      if (!response.ok) throw new Error(`Erreur API altitude: ${response.status}`);

      const data = await response.json();
      data.results.forEach((r: { latitude: number; longitude: number; elevation: number }) => {
        results.push({ lat: r.latitude, lng: r.longitude, altitude: r.elevation });
      });
    }

    return results;
  }

  /**
   * Crée une couche Leaflet SVG représentant la heatmap d'altitude.
   * Chaque point est rendu comme un cercle coloré selon son altitude relative.
   * Le rayon des cercles est assez grand pour se chevaucher et simuler un gradient continu.
   */
  private creerCoucheHeatmap(
    points: AltitudePoint[],
    minAlt: number,
    maxAlt: number,
    polyCoords: [number, number][]
  ): L.Layer {
    const group = L.layerGroup();
    const range = maxAlt - minAlt || 1;

    points.forEach(pt => {
      const ratio = (pt.altitude - minAlt) / range; // 0 (bas) → 1 (haut)
      const color = this.altitudeVerseCouleur(ratio);
      const opacity = 0.62;

      // Rayon dynamique : ajuster selon zoom de la carte
      // On utilise un cercle Leaflet (metres)
      const circle = L.circle([pt.lat, pt.lng], {
        radius: this.calculerRayonMetres(polyCoords),
        color: 'transparent',
        fillColor: color,
        fillOpacity: opacity,
        interactive: false
      });

      // Tooltip avec l'altitude exacte
      circle.bindTooltip(`${Math.round(pt.altitude)} m`, {
        permanent: false,
        direction: 'top',
        className: 'altitude-tooltip'
      });

      group.addLayer(circle);
    });

    return group;
  }

  /**
   * Calcule un rayon adapté en mètres pour que les cercles se chevauchent sur la parcelle.
   */
  private calculerRayonMetres(polyCoords: [number, number][]): number {
    const lngs = polyCoords.map(c => c[0]);
    const lats = polyCoords.map(c => c[1]);
    const largeurDeg = Math.max(...lngs) - Math.min(...lngs);
    const hauteurDeg = Math.max(...lats) - Math.min(...lats);
    const diagonaleDeg = Math.sqrt(largeurDeg ** 2 + hauteurDeg ** 2);
    // 1 degré ≈ 111 km ; diviser par ~12 pour avoir ~8 pas avec chevauchement
    return (diagonaleDeg * 111000) / 9;
  }

  /**
   * Mappe un ratio [0, 1] vers une couleur de heatmap.
   * 0 = vert foncé (bas) → 1 = rouge foncé (haut)
   */
  private altitudeVerseCouleur(ratio: number): string {
    // Palette : vert foncé → vert → jaune-vert → jaune → orange → rouge → rouge foncé
    const stops: [number, [number, number, number]][] = [
      [0.00, [26,  122,  26]],  // vert foncé
      [0.20, [76,  175,  80]],  // vert
      [0.40, [168, 217,  90]],  // vert clair / jaune-vert
      [0.55, [255, 224, 102]],  // jaune
      [0.70, [255, 152,   0]],  // orange
      [0.85, [229,  57,  53]],  // rouge
      [1.00, [130,  20,  10]]   // rouge foncé
    ];

    for (let i = 0; i < stops.length - 1; i++) {
      const [r1, c1] = stops[i];
      const [r2, c2] = stops[i + 1];
      if (ratio >= r1 && ratio <= r2) {
        const t = (ratio - r1) / (r2 - r1);
        const r = Math.round(c1[0] + t * (c2[0] - c1[0]));
        const g = Math.round(c1[1] + t * (c2[1] - c1[1]));
        const b = Math.round(c1[2] + t * (c2[2] - c1[2]));
        return `rgb(${r},${g},${b})`;
      }
    }
    return 'rgb(130,20,10)';
  }

  // ── Méthodes existantes conservées ────────────────────────────────────────

  private afficherMeteoPourPoint(event: L.LeafletMouseEvent): void {
    // Ne pas interférer avec le mode altitude
    if (this.modeAffichage === 'altitude') return;

    const { lat, lng } = event.latlng;
    this.selectedLat = lat;
    this.selectedLng = lng;
    this.selectedPointName = `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    const parcelleProche = this.trouverParcelleProche(lat, lng);
    if (parcelleProche) {
      this.selectedPointName = parcelleProche.nom;
      this.parcelleSelectionnee = parcelleProche;
    }

    this.showMeteoPanel = true;
  }

  toggleMeteoPanel(): void {
    this.showMeteoPanel = !this.showMeteoPanel;
    if (this.showMeteoPanel && this.parcelleSelectionnee) {
      this.chargerMeteoPourParcelle(this.parcelleSelectionnee);
    }
  }

  chargerMeteoPourParcelle(parcelle: Parcelle): void {
    if (!parcelle.latitude || !parcelle.longitude) return;
    this.meteoLoading = true;
    this.meteoService.getMeteoForPoint(parcelle.nom, parcelle.latitude, parcelle.longitude)
      .subscribe({
        next:  (data)  => { this.meteoData = data;  this.meteoLoading = false; },
        error: (error) => { console.error('Erreur météo:', error); this.meteoLoading = false; }
      });
  }

  private trouverParcelleProche(lat: number, lng: number): Parcelle | null {
    let parcelleProche: Parcelle | null = null;
    let distanceMin = Infinity;
    this.parcelles.forEach(parcelle => {
      if (parcelle.latitude && parcelle.longitude) {
        const distance = this.calculerDistance(lat, lng, parcelle.latitude, parcelle.longitude);
        if (distance < 1 && distance < distanceMin) {
          distanceMin = distance;
          parcelleProche = parcelle;
        }
      }
    });
    return parcelleProche;
  }

  private calculerDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  private deg2rad(deg: number): number { return deg * (Math.PI / 180); }

  fermerPopupMeteo(): void { this.showMeteoPanel = false; }

  private initControlesDessin(): void {
    const drawOptions: any = {
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: { color: '#e1e100', message: 'Polygone invalide' },
          smoothFactor: 1,
          shapeOptions: { color: '#4CAF50', fillColor: '#4CAF50', fillOpacity: 0.3 }
        },
        polyline: false, circle: false, rectangle: false, marker: false, circlemarker: false
      },
      edit: { featureGroup: this.drawnItems, remove: true }
    };

    this.drawControl = new (L as any).Control.Draw(drawOptions);
    this.map.addControl(this.drawControl);

    this.map.on('draw:created', (event: any) => {
      this.drawnItems.addLayer(event.layer);
      this.ouvrirModalAvecGeometrie(event.layer);
    });

    this.map.on('draw:edited',  () => { /* TODO: Mise à jour géométrie */ });
    this.map.on('draw:deleted', () => { /* TODO: Suppression */ });
  }

  private chargerParcelles(): void {
    this.parcelleService.getParcellesByAgriculteur(this.agriculteurId).subscribe({
      next: (parcelles) => {
        this.parcelles = parcelles;
        this.calculerStatistiques();
        this.afficherParcellesSurCarte();
      },
      error: (error) => console.error('Erreur chargement parcelles:', error)
    });
  }

  private afficherParcellesSurCarte(): void {
    this.drawnItems.clearLayers();

    this.parcelles.forEach(parcelle => {
      if (!parcelle.geometrie) return;
      try {
        const geoJson = JSON.parse(parcelle.geometrie);

        // En mode altitude : contour blanc, pas de remplissage (la heatmap prend la place)
        const style = this.modeAffichage === 'altitude'
          ? { color: '#ffffff', fillColor: 'transparent', fillOpacity: 0, weight: 2.5, dashArray: '5,3' }
          : { color: parcelle.couleur, fillColor: parcelle.couleur, fillOpacity: 0.3, weight: 2 };

        const layer = L.geoJSON(geoJson, { style });

        layer.bindPopup(`
          <strong>${parcelle.nom}</strong><br>
          Surface: ${parcelle.surface} ha<br>
          ${parcelle.culture ? `Culture: ${parcelle.culture}<br>` : ''}
          ${parcelle.description ? parcelle.description : ''}
        `);

        layer.on('click', () => {
          this.selectionnerParcelle(parcelle);
        });

        this.drawnItems.addLayer(layer);
      } catch (error) {
        console.error('Erreur parsing GeoJSON:', error);
      }
    });
  }

  private calculerStatistiques(): void {
    this.surfaceTotale = this.parcelles.reduce((sum, p) => sum + p.surface, 0);
    this.parcellesOfflineCount = this.parcelles.filter(p => !p.estSynchronise).length;
    this.hasOfflineData = this.parcellesOfflineCount > 0;
  }

  private calculerSurfacePolygone(latlngs: L.LatLng[]): number {
    const coords = latlngs.map(p => [p.lng, p.lat]);
    coords.push(coords[0]);
    const poly = polygon([coords]);
    return +(area(poly) / 10000).toFixed(3);
  }

  dessinerNouvelleParcelle(): void {
    this.modeDessin = true;
    new (L as any).Draw.Polygon(this.map, this.drawControl.options.draw.polygon).enable();
  }

  changerMode(): void {
    if (this.modeDessin) {
      this.modeDessin = false;
      if (this.map) { this.map.removeControl(this.drawControl); this.initControlesDessin(); }
    } else {
      this.dessinerNouvelleParcelle();
    }
  }

  ouvrirModalAvecGeometrie(layer: L.Layer): void {
    const pol = layer as L.Polygon;
    const center = pol.getBounds().getCenter();
    const latlngs = pol.getLatLngs()[0] as L.LatLng[];
    this.parcelleEnEdition = {
      nom: `Parcelle ${new Date().toLocaleDateString()}`,
      surface: this.calculerSurfacePolygone(latlngs),
      couleur: '#4CAF50',
      latitude: center.lat,
      longitude: center.lng,
      geometrie: JSON.stringify((layer as any).toGeoJSON())
    };
    this.estModification = false;
    this.modalVisible = true;
    this.modeDessin = false;
  }

  /**
   * Sélectionner une parcelle.
   * En mode altitude, déclenche automatiquement le chargement de la heatmap.
   */
  selectionnerParcelle(parcelle: Parcelle): void {
    this.parcelleSelectionnee = parcelle;

    if (parcelle.latitude && parcelle.longitude) {
      this.map.setView([parcelle.latitude, parcelle.longitude], 15);
    }

    if (this.modeAffichage === 'altitude') {
      // Ne pas recharger si déjà chargé pour cette parcelle
      if (this.altitudeParcelleActive?.id !== parcelle.id) {
        this.afficherHeatmapAltitude(parcelle);
      }
    } else if (this.showMeteoPanel) {
      this.chargerMeteoPourParcelle(parcelle);
    }
  }

  async sauvegarderParcelle(): Promise<void> {
    if (!this.parcelleEnEdition || !this.parcelleForm.valid) return;
    this.sauvegardeEnCours = true;
    try {
      const parcelleId = (this.parcelleEnEdition as any).id;
      if (this.estModification && parcelleId) {
        console.log('Mise à jour parcelle:', parcelleId);
      } else {
        const parcelle = await this.parcelleService.createParcelle(
          this.agriculteurId, this.parcelleEnEdition
        ).toPromise();
        if (parcelle) {
          this.parcelles.push(parcelle);
          this.calculerStatistiques();
          this.afficherParcellesSurCarte();
          this.fermerModal();
        }
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde parcelle:', error);
      alert(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      this.sauvegardeEnCours = false;
    }
  }

  supprimerParcelle(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette parcelle ?')) {
      this.parcelles = this.parcelles.filter(p => p.id !== id);
      // Supprimer la couche altitude si elle existe
      if (this.altitudeLayers.has(id)) {
        this.map.removeLayer(this.altitudeLayers.get(id)!);
        this.altitudeLayers.delete(id);
      }
      if (this.altitudeParcelleActive?.id === id) {
        this.altitudeParcelleActive = null;
        this.altitudeStats = null;
      }
      this.calculerStatistiques();
      this.afficherParcellesSurCarte();
      if (this.parcelleSelectionnee?.id === id) {
        this.parcelleSelectionnee = null;
      }
    }
  }

  centrerCarte(): void {
    this.map.setView([34.0, 9.0], 6);
  }

  synchroniser(): void {
    this.synchronisationEnCours = true;
    this.parcelleService.synchroniserParcelles().subscribe({
      next:     (response) => { console.log('Synchro réussie:', response); this.chargerParcelles(); alert('Synchronisation terminée !'); },
      error:    (error)    => { console.error('Erreur synchronisation:', error); alert('Erreur lors de la synchronisation'); },
      complete: ()         => { this.synchronisationEnCours = false; }
    });
  }

  fermerModal(): void {
    this.modalVisible = false;
    this.parcelleEnEdition = null;
    this.estModification = false;
    if (this.drawnItems.getLayers().length > this.parcelles.length) {
      const layers = this.drawnItems.getLayers();
      this.drawnItems.removeLayer(layers[layers.length - 1]);
    }
  }

  private mettreAJourStatutConnexion(): void {
    this.connectionStatus = navigator.onLine ? 'En ligne' : 'Hors ligne';
    if (navigator.onLine && this.hasOfflineData) {
      this.synchroniser();
    }
  }
}
