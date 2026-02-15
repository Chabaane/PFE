// components/carte-parcelle/carte-parcelle.component.ts
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-draw'; // Import pour le plugin leaflet-draw
import { ParcelleService, Parcelle, DessinParcelleDto } from '../../services/api/parcelle.service';
import area from '@turf/area';
import { polygon } from '@turf/helpers';
import { MeteoPoint, MeteoService } from '@app/services/api/meteo.service';



// Correction pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/images/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/images/marker-icon.png',
  shadowUrl: 'assets/leaflet/images/marker-shadow.png'
});





@Component({
  selector: 'app-carte-parcelle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container-fluid mt-4">
       <!-- En-tête -->
        <div class="row mb-4">
          <div class="col-md-8">
            <h3>
              <i class="fas fa-map-marked-alt me-2"></i>
              Carte des Parcelles - Agriculteur {{agriculteurId}}
            </h3>
            <p class="text-muted">
              Visualisez et gérez les parcelles de l'agriculteur sur la carte
            </p>
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
      <!-- Carte Leaflet - 8 colonnes -->
      <div class="col-md-8">
        <div class="card shadow-sm position-relative">
          <div class="card-header bg-dark text-white">
            <div class="d-flex justify-content-between align-items-center">
              <span>
                <i class="fas fa-map me-2"></i>
                Carte Interactive
              </span>
              <div>
                <button class="btn btn-sm btn-light me-2" (click)="centrerCarte()">
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

            <!-- Bouton pour ouvrir/fermer la météo -->
            <button class="meteo-toggle-btn"
                    [class.active]="showMeteoPanel"
                    (click)="toggleMeteoPanel()">
              <i class="fas" [class.fa-cloud-sun]="!showMeteoPanel" [class.fa-times]="showMeteoPanel"></i>
              <span *ngIf="!showMeteoPanel">Météo</span>
            </button>

            <!-- Fenêtre météo latérale -->
            <div class="meteo-side-panel" [class.open]="showMeteoPanel">
              <div class="meteo-panel-header">
                <h4>
                  <i class="fas fa-cloud-sun me-2"></i>
                  Météo
                </h4>
                <button class="btn-close" (click)="showMeteoPanel = false"></button>
              </div>

              <div class="meteo-panel-content" *ngIf="meteoData; else loadingMeteo">
                <!-- Maintenant -->
                <div class="meteo-section">
                  <h5>Maintenant</h5>
                  <div class="current-weather">
                    <div class="current-temp">{{ meteoData.actuelle.temperature | number:'1.1-1' }}°C</div>
                    <div class="current-details">
                      <div><i class="fas fa-cloud"></i> Nuages: {{ meteoData.actuelle.nuages }}%</div>
                      <div><i class="fas fa-tint"></i> Humidité: {{ meteoData.actuelle.humidite }}%</div>
                      <div><i class="fas fa-wind"></i> Vent: {{ meteoData.actuelle.vent | number:'1.1-1' }} m/s</div>
                      <div><i class="fas fa-compress-alt"></i> Pression: {{ meteoData.actuelle.pression }} hPa</div>
                    </div>
                  </div>
                </div>

                <hr>

                <!-- Prévisions -->
                <div class="meteo-section">
                  <h5>Prévisions</h5>
                  <div class="forecast-list">
                    <div *ngFor="let prev of meteoData.previsions" class="forecast-item">
                      <div class="forecast-day">{{ prev.jour }}.</div>
                      <div class="forecast-temp">{{ prev.temperature | number:'1.1-1' }}°C</div>
                      <div class="forecast-details">
                        <div><i class="fas fa-cloud"></i> {{ prev.nuages }}%</div>
                        <div><i class="fas fa-tint"></i> {{ prev.humidite }}%</div>
                        <div><i class="fas fa-wind"></i> {{ prev.vent | number:'1.1-1' }}</div>
                        <div><i class="fas fa-compress-alt"></i> {{ prev.pression }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Info parcelle si sélectionnée -->
                <div class="parcelle-info-panel" *ngIf="parcelleSelectionnee">
                  <h5>
                    <i class="fas fa-tractor me-2"></i>
                    {{ parcelleSelectionnee.nom }}
                  </h5>
                  <div class="parcelle-details">
                    <div><strong>Agriculteur:</strong> Ben Fadhel Mohamed</div>
                    <div><strong>Surface:</strong> {{ parcelleSelectionnee.surface }} ha</div>
                    <div *ngIf="parcelleSelectionnee.culture"><strong>Culture:</strong> {{ parcelleSelectionnee.culture }}</div>
                    <div><strong>Propriété:</strong> Propriété</div>
                    <div><strong>Pépinière:</strong> Baddar_Agricole</div>
                  </div>
                </div>

                <!-- Localisation -->
                <div class="location-info">
                  <i class="fas fa-map-marker-alt me-1"></i>
                  Golfe de Tunis • طريق دويس
                </div>
              </div>

              <ng-template #loadingMeteo>
                <div class="meteo-loading-panel">
                  <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Chargement...</span>
                  </div>
                  <p>Chargement des données météo...</p>
                </div>
              </ng-template>
            </div>
          </div>
        </div>
      </div>

          <!-- Liste des parcelles - 4 colonnes -->
          <div class="col-md-4">
            <div class="card shadow-sm h-100">
              <div class="card-header bg-dark text-white">
                <i class="fas fa-list me-2"></i>
                Liste des Parcelles
              </div>
              <div class="card-body p-0">
                <div class="list-group list-group-flush" *ngIf="parcelles.length > 0">
                  <div *ngFor="let parcelle of parcelles"
                      class="list-group-item list-group-item-action parcelle-item"
                      [class.active]="parcelle.id === parcelleSelectionnee?.id"
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
                        <i class="fas fa-seedling me-1"></i>
                        {{parcelle.culture}}
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
              <h5 class="modal-title">
                {{estModification ? 'Modifier' : 'Nouvelle'}} Parcelle
              </h5>
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

  /* Bouton toggle météo */
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

  .meteo-toggle-btn.active {
    background: #1e3c72;
    color: white;
  }

  .meteo-toggle-btn i {
    font-size: 1.2rem;
    color: #f39c12;
  }

  .meteo-toggle-btn.active i {
    color: white;
  }

  /* Fenêtre météo latérale */
  .meteo-side-panel {
    position: absolute;
    top: 80px;
    left: -400px;
    width: 380px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    z-index: 999;
    transition: left 0.3s ease;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.2);
    backdrop-filter: blur(10px);
    background: rgba(255,255,255,0.98);
  }

  .meteo-side-panel.open {
    left: 20px;
  }

  .meteo-panel-header {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    color: white;
    padding: 15px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .meteo-panel-header h4 {
    margin: 0;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
  }

  .meteo-panel-header .btn-close {
    background: rgba(255,255,255,0.2);
    opacity: 1;
    padding: 8px;
    border-radius: 50%;
  }

  .meteo-panel-header .btn-close:hover {
    background: rgba(255,255,255,0.3);
  }

  .meteo-panel-content {
    padding: 20px;
    max-height: 500px;
    overflow-y: auto;
  }

  .meteo-section {
    margin-bottom: 20px;
  }

  .meteo-section h5 {
    color: #1e3c72;
    font-size: 1rem;
    margin-bottom: 12px;
    font-weight: 600;
  }

  .current-weather {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 15px;
  }

  .current-temp {
    font-size: 2.5rem;
    font-weight: bold;
    color: #1e3c72;
    margin-bottom: 10px;
    text-align: center;
  }

  .current-details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .current-details div {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: #333;
  }

  .current-details i {
    color: #2a5298;
    width: 20px;
  }

  hr {
    margin: 15px 0;
    border: none;
    border-top: 1px solid #e9ecef;
  }

  .forecast-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .forecast-item {
    display: grid;
    grid-template-columns: 60px 80px 1fr;
    align-items: center;
    padding: 8px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .forecast-day {
    font-weight: 600;
    color: #1e3c72;
  }

  .forecast-temp {
    font-weight: 500;
    color: #333;
  }

  .forecast-details {
    display: flex;
    gap: 8px;
    font-size: 0.8rem;
    color: #6c757d;
    flex-wrap: wrap;
  }

  .forecast-details div {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .forecast-details i {
    color: #2a5298;
    font-size: 0.7rem;
  }

  .parcelle-info-panel {
    margin-top: 20px;
    padding: 15px;
    background: #e8f4fd;
    border-radius: 12px;
    border-left: 4px solid #2a5298;
  }

  .parcelle-info-panel h5 {
    color: #1e3c72;
    margin-bottom: 10px;
    font-size: 1rem;
    display: flex;
    align-items: center;
  }

  .parcelle-details {
    font-size: 0.9rem;
    color: #333;
    line-height: 1.6;
  }

  .location-info {
    margin-top: 15px;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #6c757d;
    text-align: center;
    border: 1px dashed #dee2e6;
  }

  .meteo-loading-panel {
    padding: 40px 20px;
    text-align: center;
    color: #6c757d;
  }

  .meteo-loading-panel .spinner-border {
    margin-bottom: 10px;
  }

  /* Styles pour la liste des parcelles */
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

  .parcelle-color {
    width: 8px;
    height: 40px;
    border-radius: 4px;
    margin-right: 12px;
  }

  .parcelle-info {
    flex: 1;
  }

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

  .btn-delete {
    opacity: 0;
    transition: opacity 0.2s;
  }

  .parcelle-item:hover .btn-delete {
    opacity: 1;
  }

  .badge.bg-warning {
    font-size: 0.65rem;
    padding: 3px 6px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .meteo-side-panel {
      width: 300px;
    }

    .meteo-side-panel.open {
      left: 10px;
    }
  }
`]
})
export class CarteParcelleComponent implements OnInit, OnDestroy {
  @ViewChild('parcelleForm') parcelleForm!: NgForm;

  agriculteurId!: number;
  parcelles: Parcelle[] = [];
  parcelleSelectionnee: Parcelle | null = null;
  parcelleEnEdition: DessinParcelleDto & { id?: number } | null = null;
  estModification = false;
   showMeteoPanel = false;
  // Carte Leaflet
  map!: L.Map;
  drawnItems: L.FeatureGroup = new L.FeatureGroup();
  drawControl: any = null; // Utiliser any pour éviter les problèmes de typage avec leaflet-draw
  modeDessin = false;

  // Nouvelles propriétés pour la météo
  showMeteoPopup = false;
  popupX = 0;
  popupY = 0;
  meteoData: MeteoPoint | null = null;
  meteoLoading = false;
  popupTimeout: any;


  // États
  modalVisible = false;
  sauvegardeEnCours = false;
  synchronisationEnCours = false;
  hasOfflineData = false;
  parcellesOfflineCount = 0;
  surfaceTotale = 0;
  connectionStatus = navigator.onLine ? 'En ligne' : 'Hors ligne';

  // Options
  couleurs = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parcelleService: ParcelleService,
    private meteoService: MeteoService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.agriculteurId = +params['agriculteurId'];
      this.chargerParcelles();
      setTimeout(() => this.initCarte(), 100); // Petit délai pour s'assurer que le DOM est prêt
    });

    // Surveiller la connexion
    window.addEventListener('online', this.mettreAJourStatutConnexion.bind(this));
    window.addEventListener('offline', this.mettreAJourStatutConnexion.bind(this));
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
    window.removeEventListener('online', this.mettreAJourStatutConnexion.bind(this));
    window.removeEventListener('offline', this.mettreAJourStatutConnexion.bind(this));
  }

  private initCarte(): void {
    // Initialiser la carte avec une vue centrée sur la Tunisie
    this.map = L.map('map', {
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      preferCanvas: true
    }).setView([34.0, 9.0], 6);


    // Ajouter la couche OpenStreetMap
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 20,
        attribution: '© Esri'
      }
    ).addTo(this.map);
    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 20,
        attribution: '© Esri'
      }
    ).addTo(this.map);

    // Ajouter le groupe pour les dessins
    this.drawnItems.addTo(this.map);

    // Initialiser les contrôles de dessin
    this.initControlesDessin();

     // Ajouter le gestionnaire de clic pour la météo
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.afficherMeteoPourPoint(e);
    });
  }
   // Nouvelle méthode pour afficher la météo
  // Modifier afficherMeteoPourPoint pour mettre à jour le panneau
  private afficherMeteoPourPoint(event: L.LeafletMouseEvent): void {
    const { lat, lng } = event.latlng;

    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
    }

    // Mettre à jour les coordonnées pour le panneau
    this.popupX = event.originalEvent.clientX;
    this.popupY = event.originalEvent.clientY;

    // Ouvrir le panneau et charger la météo
    this.showMeteoPanel = true;
    this.meteoLoading = true;

    let nomPoint = `Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    const parcelleProche = this.trouverParcelleProche(lat, lng);

    if (parcelleProche) {
      nomPoint = parcelleProche.nom;
      this.parcelleSelectionnee = parcelleProche;
    }

    this.meteoService.getMeteoForPoint(nomPoint, lat, lng).subscribe({
      next: (data) => {
        this.meteoData = data;
        this.meteoLoading = false;
      },
      error: (error) => {
        console.error('Erreur météo:', error);
        this.meteoLoading = false;
      }
    });
  }
  // Nouvelle méthode pour toggler le panneau météo
  toggleMeteoPanel(): void {
    this.showMeteoPanel = !this.showMeteoPanel;

    // Si on ouvre le panneau et qu'on a une parcelle sélectionnée, charger sa météo
    if (this.showMeteoPanel && this.parcelleSelectionnee) {
      this.chargerMeteoPourParcelle(this.parcelleSelectionnee);
    }
  }
  // Méthode pour charger la météo
  chargerMeteoPourParcelle(parcelle: Parcelle): void {
    if (!parcelle.latitude || !parcelle.longitude) return;

    this.meteoLoading = true;
    this.meteoService.getMeteoForPoint(parcelle.nom, parcelle.latitude, parcelle.longitude)
      .subscribe({
        next: (data) => {
          this.meteoData = data;
          this.meteoLoading = false;
        },
        error: (error) => {
          console.error('Erreur météo:', error);
          this.meteoLoading = false;
        }
      });
  }
  // Méthode pour trouver une parcelle proche du point cliqué
  private trouverParcelleProche(lat: number, lng: number): Parcelle | null {
    let parcelleProche: Parcelle | null = null;
    let distanceMin = Infinity;

    this.parcelles.forEach(parcelle => {
      if (parcelle.latitude && parcelle.longitude) {
        const distance = this.calculerDistance(
          lat, lng,
          parcelle.latitude, parcelle.longitude
        );

        // Si la distance est inférieure à 1km et plus proche que la précédente
        if (distance < 1 && distance < distanceMin) {
          distanceMin = distance;
          parcelleProche = parcelle;
        }
      }
    });

    return parcelleProche;
  }

  // Calculer la distance en km entre deux points
  private calculerDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

   // Fermer la popup météo
  fermerPopupMeteo(): void {
    // Ne rien faire ou fermer le panneau si besoin
    this.showMeteoPanel = false;
  }

  private initControlesDessin(): void {
    // Configuration du contrôle de dessin
    const drawOptions: any = {
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e1e100',
            message: 'Polygone invalide'
          },
          smoothFactor: 1,
          shapeOptions: {
            color: '#4CAF50',
            fillColor: '#4CAF50',
            fillOpacity: 0.3
          }
        },
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false
      },
      edit: {
        featureGroup: this.drawnItems,
        remove: true
      }
    };

    // Créer le contrôle de dessin
    this.drawControl = new (L as any).Control.Draw(drawOptions);
    this.map.addControl(this.drawControl);

    // Événements de dessin
    this.map.on('draw:created', (event: any) => {
      const layer = event.layer;
      this.drawnItems.addLayer(layer);

      // Ouvrir le modal d'édition
      this.ouvrirModalAvecGeometrie(layer);
    });

    this.map.on('draw:edited', (event: any) => {
      console.log('Polygone modifié');
      // Mettre à jour la géométrie si une parcelle est sélectionnée
      if (this.parcelleSelectionnee) {
        // TODO: Mettre à jour la géométrie de la parcelle sélectionnée
      }
    });

    this.map.on('draw:deleted', (event: any) => {
      console.log('Polygone supprimé');
    });
  }

  private chargerParcelles(): void {
    this.parcelleService.getParcellesByAgriculteur(this.agriculteurId).subscribe({
      next: (parcelles) => {
        this.parcelles = parcelles;
        this.calculerStatistiques();
        this.afficherParcellesSurCarte();
      },
      error: (error) => {
        console.error('Erreur chargement parcelles:', error);
      }
    });
  }

  private afficherParcellesSurCarte(): void {
    // Effacer les couches précédentes
    this.drawnItems.clearLayers();

    // Ajouter chaque parcelle à la carte
    this.parcelles.forEach(parcelle => {
      if (parcelle.geometrie) {
        try {
          const geoJson = JSON.parse(parcelle.geometrie);
          const layer = L.geoJSON(geoJson, {
            style: {
              color: parcelle.couleur,
              fillColor: parcelle.couleur,
              fillOpacity: 0.3,
              weight: 2
            }
          });

          // Ajouter un popup
          layer.bindPopup(`
            <strong>${parcelle.nom}</strong><br>
            Surface: ${parcelle.surface} ha<br>
            ${parcelle.culture ? `Culture: ${parcelle.culture}<br>` : ''}
            ${parcelle.description ? `${parcelle.description}` : ''}
          `);

          // Ajouter un événement click
          layer.on('click', () => {
            this.selectionnerParcelle(parcelle);
          });

          this.drawnItems.addLayer(layer);
        } catch (error) {
          console.error('Erreur parsing GeoJSON:', error);
        }
      }
    });
  }

  private calculerStatistiques(): void {
    this.surfaceTotale = this.parcelles.reduce((sum, p) => sum + p.surface, 0);
    this.parcellesOfflineCount = this.parcelles.filter(p => !p.estSynchronise).length;
    this.hasOfflineData = this.parcellesOfflineCount > 0;
  }

  // Calcul de surface approximative
  private calculerSurfacePolygone(latlngs: L.LatLng[]): number {
    const coords = latlngs.map(p => [p.lng, p.lat]);
    coords.push(coords[0]);

    const poly = polygon([coords]);
    const surfaceM2 = area(poly);

    return +(surfaceM2 / 10000).toFixed(3);
  }



  // Méthodes publiques
  dessinerNouvelleParcelle(): void {
    this.modeDessin = true;
    // Activer le mode dessin de polygone
    new (L as any).Draw.Polygon(this.map, this.drawControl.options.draw.polygon).enable();
  }

  changerMode(): void {
    if (this.modeDessin) {
      this.modeDessin = false;
      // Désactiver le mode dessin
      if (this.map) {
        this.map.removeControl(this.drawControl);
        this.initControlesDessin();
      }
    } else {
      this.dessinerNouvelleParcelle();
    }
  }

  ouvrirModalAvecGeometrie(layer: L.Layer): void {
    const polygon = layer as L.Polygon;
    const bounds = polygon.getBounds();
    const center = bounds.getCenter();

    // Calculer la surface approximative
    const latlngs = polygon.getLatLngs()[0] as L.LatLng[];
    const surfaceHectares = this.calculerSurfacePolygone(latlngs);

    // Créer l'objet d'édition
    this.parcelleEnEdition = {
      nom: `Parcelle ${new Date().toLocaleDateString()}`,
      surface: surfaceHectares,
      couleur: '#4CAF50',
      latitude: center.lat,
      longitude: center.lng,
      geometrie: JSON.stringify((layer as any).toGeoJSON())
    };

    this.estModification = false;
    this.modalVisible = true;
    this.modeDessin = false;
  }

    // Modifier selectionnerParcelle pour charger la météo si le panneau est ouvert
  selectionnerParcelle(parcelle: Parcelle): void {
    this.parcelleSelectionnee = parcelle;

    if (parcelle.latitude && parcelle.longitude) {
      this.map.setView([parcelle.latitude, parcelle.longitude], 15);

      // Si le panneau météo est ouvert, charger la météo
      if (this.showMeteoPanel) {
        this.chargerMeteoPourParcelle(parcelle);
      }
    }
  }

  async sauvegarderParcelle(): Promise<void> {
    if (!this.parcelleEnEdition || !this.parcelleForm.valid) return;

    this.sauvegardeEnCours = true;

    try {
      const parcelleId = (this.parcelleEnEdition as any).id;

      if (this.estModification && parcelleId) {
        // TODO: Implémenter la mise à jour
        console.log('Mise à jour parcelle:', parcelleId);
      } else {
        // Création d'une nouvelle parcelle
        const parcelle = await this.parcelleService.createParcelle(
          this.agriculteurId,
          this.parcelleEnEdition
        ).toPromise();

        if (parcelle) {
          // Ajouter à la liste
          this.parcelles.push(parcelle);
          this.calculerStatistiques();
          this.afficherParcellesSurCarte();

          // Fermer le modal
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
      // TODO: Implémenter la suppression
      console.log('Suppression parcelle:', id);

      // Filtrer la liste
      this.parcelles = this.parcelles.filter(p => p.id !== id);
      this.calculerStatistiques();
      this.afficherParcellesSurCarte();

      if (this.parcelleSelectionnee?.id === id) {
        this.parcelleSelectionnee = null;
      }
    }
  }

  centrerCarte(): void {
    // Centrer sur la Tunisie
    this.map.setView([34.0, 9.0], 6);
  }

  synchroniser(): void {
    this.synchronisationEnCours = true;

    this.parcelleService.synchroniserParcelles().subscribe({
      next: (response) => {
        console.log('Synchronisation réussie:', response);
        this.chargerParcelles(); // Recharger les données
        alert('Synchronisation terminée !');
      },
      error: (error) => {
        console.error('Erreur synchronisation:', error);
        alert('Erreur lors de la synchronisation');
      },
      complete: () => {
        this.synchronisationEnCours = false;
      }
    });
  }

  fermerModal(): void {
    this.modalVisible = false;
    this.parcelleEnEdition = null;
    this.estModification = false;

    // Supprimer le dernier dessin si non enregistré
    if (this.drawnItems.getLayers().length > this.parcelles.length) {
      const layers = this.drawnItems.getLayers();
      this.drawnItems.removeLayer(layers[layers.length - 1]);
    }
  }

  private mettreAJourStatutConnexion(): void {
    this.connectionStatus = navigator.onLine ? 'En ligne' : 'Hors ligne';

    if (navigator.onLine && this.hasOfflineData) {
      // Synchroniser automatiquement quand la connexion revient
      this.synchroniser();
    }
  }
}
