// components/carte-parcelle/carte-parcelle.component.ts
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-draw'; // Import pour le plugin leaflet-draw
import { ParcelleService, Parcelle, DessinParcelleDto } from '../../services/api/parcelle.service';

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
            Carte des Parcelles - Agriculteur #{{agriculteurId}}
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
        <!-- Carte Leaflet -->
        <div class="col-md-8">
          <div class="card shadow-sm">
            <div class="card-header bg-dark text-white">
              <div class="d-flex justify-content-between align-items-center">
                <span>Carte Interactive</span>
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
            <div class="card-body p-0">
              <div id="map" style="height: 600px;"></div>
            </div>
          </div>
        </div>

        <!-- Liste des parcelles -->
        <div class="col-md-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-dark text-white">
              Liste des Parcelles
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush" *ngIf="parcelles.length > 0">
                <div *ngFor="let parcelle of parcelles"
                     class="list-group-item list-group-item-action"
                     [class.bg-light]="parcelle.id === parcelleSelectionnee?.id"
                     (click)="selectionnerParcelle(parcelle)">
                  <div class="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 class="mb-1">
                        <span class="badge me-2" [style.background-color]="parcelle.couleur">&nbsp;&nbsp;</span>
                        {{parcelle.nom}}
                      </h6>
                      <small class="text-muted">
                        {{parcelle.surface}} ha • {{parcelle.gouvernorat || 'Localisation inconnue'}}
                      </small>
                      <div>
                        <small *ngIf="!parcelle.estSynchronise" class="badge bg-warning">
                          <i class="fas fa-exclamation-triangle me-1"></i> Hors ligne
                        </small>
                        <small *ngIf="parcelle.culture" class="badge bg-info ms-1">
                          {{parcelle.culture}}
                        </small>
                      </div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" (click)="supprimerParcelle(parcelle.id); $event.stopPropagation()">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
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
    }
    .color-option {
      width: 30px;
      height: 30px;
      border-radius: 4px;
      cursor: pointer;
      border: 2px solid transparent;
    }
    .color-option.selected {
      border-color: #000;
      transform: scale(1.1);
    }
    .color-option:hover {
      transform: scale(1.05);
    }
    .list-group-item:hover {
      background-color: #f8f9fa;
    }
    .modal {
      background-color: rgba(0, 0, 0, 0.5);
    }
    .modal.show {
      display: block;
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

  // Carte Leaflet
  map!: L.Map;
  drawnItems: L.FeatureGroup = new L.FeatureGroup();
  drawControl: any = null; // Utiliser any pour éviter les problèmes de typage avec leaflet-draw
  modeDessin = false;

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
    private parcelleService: ParcelleService
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
    this.map = L.map('map').setView([34.0, 9.0], 6);

    // Ajouter la couche OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Ajouter le groupe pour les dessins
    this.drawnItems.addTo(this.map);

    // Initialiser les contrôles de dessin
    this.initControlesDessin();
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
    // Formule simplifiée pour calculer la surface d'un polygone (en m²)
    // Cette formule utilise la formule de l'aire de Gauss (shoelace formula)
    if (!latlngs || latlngs.length < 3) return 0;

    let area = 0;
    const n = latlngs.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const xi = latlngs[i].lng * Math.PI / 180;
      const yi = latlngs[i].lat * Math.PI / 180;
      const xj = latlngs[j].lng * Math.PI / 180;
      const yj = latlngs[j].lat * Math.PI / 180;

      area += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
    }

    area = Math.abs(area * 6378137 * 6378137 / 2); // R² de la Terre en mètres
    return parseFloat((area / 10000).toFixed(3)); // Convertir en hectares
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

  selectionnerParcelle(parcelle: Parcelle): void {
    this.parcelleSelectionnee = parcelle;

    // Centrer la carte sur la parcelle
    if (parcelle.latitude && parcelle.longitude) {
      this.map.setView([parcelle.latitude, parcelle.longitude], 14);
    }

    // Pour édition : charger les données dans le modal
    this.parcelleEnEdition = {
      nom: parcelle.nom,
      description: parcelle.description,
      surface: parcelle.surface,
      couleur: parcelle.couleur,
      latitude: parcelle.latitude,
      longitude: parcelle.longitude,
      gouvernorat: parcelle.gouvernorat,
      delegation: parcelle.delegation,
      secteur: parcelle.secteur,
      culture: parcelle.culture,
      geometrie: parcelle.geometrie
    };
    (this.parcelleEnEdition as any).id = parcelle.id;
    this.estModification = true;
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
