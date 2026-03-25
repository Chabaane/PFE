import { Agriculteur } from './../../models/agriculteur';
// components/fermes/creer-ferme-carte.component.ts
import { Component, OnInit, OnDestroy, ViewChild, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-draw';
import { FermeService, Ferme } from '../../services/api/ferme.service';
import { ParcelleService, Parcelle } from '../../services/api/parcelle.service';
import { AgriculteurService } from '../../services/api/agriculteur';
import {TerrainAnalysisService } from '../../services/terrain-analysis.service';

// Correction pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/images/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/images/marker-icon.png',
  shadowUrl: 'assets/leaflet/images/marker-shadow.png'
});

@Component({
  selector: 'app-creer-ferme-carte',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container-fluid mt-4">
      <div class="row">
        <!-- Carte Leaflet -->
        <div class="col-md-8">
          <div class="card shadow-sm">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <span>
                <i class="fas fa-map me-2"></i>
                Créer une ferme sur la carte
              </span>
              <div>
                <button class="btn btn-sm btn-light me-2" (click)="centrerCarte()">
                  <i class="fas fa-crosshairs"></i>
                </button>
                <button class="btn btn-sm btn-light" (click)="modeSelection = !modeSelection"
                        [class.btn-primary]="modeSelection">
                  <i class="fas" [class.fa-hand-pointer]="!modeSelection" [class.fa-draw-polygon]="modeSelection"></i>
                  {{modeSelection ? 'Mode dessin' : 'Mode sélection'}}
                </button>
              </div>
            </div>
            <div class="card-body p-0">
              <div id="map" style="height: 600px;"></div>
            </div>
          </div>
        </div>

        <!-- Panneau latéral -->
        <div class="col-md-4">
          <!-- Formulaire création ferme -->
          <div class="card shadow-sm mb-3">
            <div class="card-header bg-success text-white">
              <i class="fas fa-warehouse me-2"></i>
              Nouvelle Ferme
            </div>
            <div class="card-body">
              <form #fermeForm="ngForm" *ngIf="fermeEnCreation">
                <div class="mb-3">
                  <label class="form-label">Nom de la ferme *</label>
                  <input type="text" class="form-control" [(ngModel)]="fermeEnCreation.nom"
                         name="nom" #nom="ngModel" required>
                  <div *ngIf="nom.invalid && nom.touched" class="text-danger small">
                    Le nom est requis
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Agriculteur *</label>
                  <select class="form-select"
                          [(ngModel)]="fermeEnCreation.agriculteurId"
                          name="agriculteurId"
                          required>
                    <option [ngValue]="undefined">Sélectionner un agriculteur</option>
                    <option *ngFor="let agriculteur of agriculteursList"
                            [ngValue]="agriculteur.idAgriculteur">
                      {{agriculteur.nom}} {{agriculteur.prenom}}
                    </option>
                  </select>



                </div>

                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Gouvernorat</label>
                      <input type="text" class="form-control" [(ngModel)]="fermeEnCreation.gouvernorat"
                             name="gouvernorat">
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Délégation</label>
                      <input type="text" class="form-control" [(ngModel)]="fermeEnCreation.delegation"
                             name="delegation">
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Couleur</label>
                  <div class="d-flex gap-2 flex-wrap">
                    <div *ngFor="let couleur of couleurs"
                         class="color-option"
                         [style.background-color]="couleur"
                         [class.selected]="fermeEnCreation.couleur === couleur"
                         (click)="fermeEnCreation.couleur = couleur">
                    </div>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" [(ngModel)]="fermeEnCreation.description"
                            name="description" rows="2"></textarea>
                </div>

                <div class="d-grid gap-2">
                  <button class="btn btn-success"
                          (click)="creerFerme()"
                          [disabled]=" creationEnCours">
                    <i class="fas fa-save me-2"></i>
                    {{creationEnCours ? 'Création...' : 'Créer la ferme'}}
                  </button>
                </div>
              </form>

              <div *ngIf="!fermeEnCreation" class="text-center py-4">
                <i class="fas fa-draw-polygon fa-3x text-muted mb-3"></i>
                <p>Dessinez le contour de votre ferme sur la carte</p>
              </div>
            </div>
          </div>

          <!-- Liste des parcelles de la ferme -->
          <div class="card shadow-sm" *ngIf="fermeCreee">
            <div class="card-header bg-primary text-white">
              <i class="fas fa-list me-2"></i>
              Parcelles de la ferme ({{parcellesFerme.length}})
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush" *ngIf="parcellesFerme.length > 0">
                <div *ngFor="let parcelle of parcellesFerme"
                     class="list-group-item d-flex justify-content-between align-items-center">
                  <div class="d-flex align-items-center">
                    <div class="parcelle-color me-2"
                         [style.background-color]="parcelle.couleur"
                         [style.width.px]="20"
                         [style.height.px]="20">
                    </div>
                    <div>
                      <strong>{{parcelle.nom}}</strong>
                      <small class="text-muted d-block">{{parcelle.surface}} ha</small>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-outline-danger"
                          (click)="retirerParcelle(parcelle.id)"
                          title="Retirer de la ferme">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
              <div *ngIf="parcellesFerme.length === 0" class="text-center py-3">
                <p class="text-muted mb-0">Aucune parcelle assignée</p>
              </div>
            </div>
            <div class="card-footer">
              <button class="btn btn-sm btn-outline-primary w-100" (click)="modeSelection = true">
                <i class="fas fa-plus me-2"></i> Ajouter des parcelles
              </button>
            </div>
          </div>

          <!-- Instructions -->
          <div class="card shadow-sm mt-3" *ngIf="!fermeCreee">
            <div class="card-body">
              <h6><i class="fas fa-info-circle me-2 text-info"></i>Instructions</h6>
              <ol class="small">
                <li>Dessinez le contour de la ferme sur la carte</li>
                <li>Remplissez les informations de la ferme</li>
                <li>Cliquez sur "Créer la ferme"</li>
                <li>Ajoutez des parcelles en mode sélection</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'ajout de parcelle -->
    <div class="modal fade" [class.show]="modalAjoutVisible"
         [style.display]="modalAjoutVisible ? 'block' : 'none'">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-plus-circle me-2"></i>
              Ajouter une parcelle
            </h5>
            <button type="button" class="btn-close btn-close-white" (click)="modalAjoutVisible = false"></button>
          </div>
          <div class="modal-body">
            <p>Voulez-vous ajouter cette parcelle à la ferme <strong>{{fermeCreee?.nom}}</strong> ?</p>

            <div class="mb-3">
              <label class="form-label">Nom de la parcelle</label>
              <input type="text" class="form-control" [(ngModel)]="nouvelleParcelle.nom">
            </div>

            <div class="mb-3">
              <label class="form-label">Culture</label>
              <select class="form-select" [(ngModel)]="nouvelleParcelle.culture">
                <option value="">Sélectionner</option>
                <option value="Blé">Blé</option>
                <option value="Orge">Orge</option>
                <option value="Maïs">Maïs</option>
                <option value="Olives">Olives</option>
                <option value="Vigne">Vigne</option>
              </select>
            </div>

            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              Surface calculée : {{nouvelleParcelle.surface}} ha
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="modalAjoutVisible = false">Annuler</button>
            <button class="btn btn-primary" (click)="ajouterParcelle()">
              <i class="fas fa-check me-2"></i> Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    #map {
      height: 600px;
      width: 100%;
      border-radius: 0 0 0.375rem 0.375rem;
    }

    .color-option {
      width: 30px;
      height: 30px;
      border-radius: 4px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
    }

    .color-option:hover {
      transform: scale(1.1);
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .color-option.selected {
      border: 2px solid white;
      box-shadow: 0 0 0 2px #007bff;
    }

    .parcelle-color {
      border-radius: 4px;
    }

    .d-flex.gap-2 {
      gap: 0.5rem;
    }
  `]
})
export class CreerFermeCarteComponent implements OnInit, OnDestroy {
  @ViewChild('fermeForm') fermeForm!: NgForm;

  map!: L.Map;
  drawnItems: L.FeatureGroup = new L.FeatureGroup();
  drawControl: any = null;
  modeSelection = false;

   // Couleurs disponibles
  couleurs = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];

  fermeEnCreation: Partial<Ferme> = {
    nom: '',
    agriculteurId: undefined,
    couleur: this.couleurs[0],
    superficieTotale: 0,
    gouvernorat: '',
    delegation: '',
    description: ''
  };

  fermeCreee: Ferme | null = null;
  creationEnCours = false;

  // Liste des parcelles de la ferme
  parcellesFerme: Parcelle[] = [];

  // Pour l'ajout de parcelle
  modalAjoutVisible = false;
  nouveauPolygone: any = null;
  nouvelleParcelle: any = {
    nom: '',
    surface: 0,
    culture: '',
    couleur: '#4CAF50'
  };

  // Liste des agriculteurs
  agriculteursList: any[] = [];


  constructor(
    private fermeService: FermeService,
    private parcelleService: ParcelleService,
    private router: Router,
    private AgriculteurService: AgriculteurService,
    private terrainAnalysis: TerrainAnalysisService

  ) {}

  ngOnInit(): void {
    this.chargerAgriculteurs();
    setTimeout(() => this.initCarte(), 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private chargerAgriculteurs(): void {
    this.AgriculteurService.getAll().subscribe(agriculteurs => {
      console.log("Agriculteurs chargés:", agriculteurs);

      // Log each agriculteur's ID to verify they're valid
      agriculteurs.forEach(a => {
        console.log(`Agriculteur: ${a.nom} ${a.prenom}, ID: ${a.idAgriculteur}, Type: ${typeof a.idAgriculteur}`);
      });

      this.agriculteursList = agriculteurs;
    });
  }

  private initCarte(): void {
    this.map = L.map('map', {
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      preferCanvas: true
    }).setView([34.0, 9.0], 6);

    // Ajouter les couches de carte
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Groupe pour les dessins
    this.drawnItems.addTo(this.map);
    this.initControlesDessin();

    // Gestionnaire de clic pour la sélection
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.modeSelection && this.fermeCreee) {
        this.rechercherParcelleProche(e.latlng);
      }
    });
  }

  private initControlesDessin(): void {
    const drawOptions: any = {
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: { color: '#e1e100', message: 'Polygone invalide' },
          shapeOptions: { color: '#4CAF50', fillOpacity: 0.3 }
        },
        polyline: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false
      },
      edit: { featureGroup: this.drawnItems, remove: true }
    };

    this.drawControl = new (L as any).Control.Draw(drawOptions);
    this.map.addControl(this.drawControl);

    this.map.on('draw:created', (event: any) => {
      const layer = event.layer;
      this.drawnItems.clearLayers(); // Garder seulement le dernier dessin
      this.drawnItems.addLayer(layer);

      this.ouvrirFormulaireFerme(layer);
    });
  }

  private ouvrirFormulaireFerme(layer: L.Layer): void {
    const polygon = layer as L.Polygon;
    const bounds = polygon.getBounds();
    const center = bounds.getCenter();
    const latlngs = polygon.getLatLngs()[0] as L.LatLng[];

    // Calculer la surface
    const surfaceHectares = this.calculerSurfacePolygone(latlngs);




    this.fermeEnCreation = {
    nom: `Ferme ${new Date().toLocaleDateString()}`,
    couleur: this.couleurs[0],
    superficieTotale: surfaceHectares,
    gouvernorat: '',
    delegation: '',
    description: '',
    agriculteurId: undefined   // ✅ IMPORTANT
  };


    this.nouveauPolygone = {
      layer: layer,
      surface: surfaceHectares,
      center: center,
      geometrie: JSON.stringify((layer as any).toGeoJSON())
    };
  }

  private calculerSurfacePolygone(latlngs: L.LatLng[]): number {
    // Calcul approximatif (à améliorer avec turf.js)
    const R = 6371; // Rayon de la terre en km
    let surface = 0;

    for (let i = 0; i < latlngs.length; i++) {
      const j = (i + 1) % latlngs.length;
      const xi = latlngs[i].lng * (Math.PI / 180) * Math.cos(latlngs[i].lat * (Math.PI / 180));
      const yi = latlngs[i].lat * (Math.PI / 180);
      const xj = latlngs[j].lng * (Math.PI / 180) * Math.cos(latlngs[j].lat * (Math.PI / 180));
      const yj = latlngs[j].lat * (Math.PI / 180);
      surface += (xj * yi - xi * yj);
    }

    surface = Math.abs(surface / 2) * (R * R);
    return +(surface / 10000).toFixed(2); // Convertir en hectares
  }

  // components/fermes/creer-ferme-carte.component.ts
  // Dans creer-ferme-carte.component.ts
  creerFerme(): void {
    console.log('=== VÉRIFICATION AGRICULTEUR ===');
    console.log('fermeEnCreation:', this.fermeEnCreation);
    console.log('agriculteurId:', this.fermeEnCreation?.agriculteurId);
    console.log('Type:', typeof this.fermeEnCreation?.agriculteurId);

    // Vérification plus robuste
    if (!this.fermeEnCreation) {
      alert('Veuillez d\'abord dessiner une ferme');
      return;
    }

    // Vérifier que agriculteurId existe et est un nombre valide
    const agriculteurId = Number(this.fermeEnCreation.agriculteurId);

    if (isNaN(agriculteurId) || agriculteurId <= 0) {
      console.error('ID agriculteur invalide:', this.fermeEnCreation.agriculteurId);
      alert('Veuillez sélectionner un agriculteur valide');
      return;
    }

    this.creationEnCours = true;

    const fermeData = {
      nom: this.fermeEnCreation.nom?.trim(),
      agriculteurId: agriculteurId,
      gouvernorat: this.fermeEnCreation.gouvernorat?.trim(),
      delegation: this.fermeEnCreation.delegation?.trim(),
      description: this.fermeEnCreation.description?.trim(),
      couleur: this.fermeEnCreation.couleur,
      secteur: "Agricole",                 // ✅ ajoute ceci
      superficieTotale: this.fermeEnCreation.superficieTotale || 0
    };



    console.log('=== DONNÉES ENVOYÉES ===');
    console.log('URL:', this.fermeService['apiUrl']);
    console.log('Objet complet:', fermeData);
    console.log('JSON:', JSON.stringify(fermeData, null, 2));
    console.log('Type agriculteurId:', typeof agriculteurId, agriculteurId);


    this.fermeService.createFerme(fermeData).subscribe({
      next: (ferme) => {
        console.log('Succès!', ferme);
        this.fermeCreee = ferme;
        this.creationEnCours = false;
        this.router.navigate(['/fermes']);
      },
      error: (error) => {
        console.error('=== ERREUR COMPLÈTE ===');
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        console.error('Erreur détaillée:', error.error);
        console.error('URL appelée:', error.url);

        if (error.error && error.error.errors) {
          console.error('Erreurs de validation:', error.error.errors);
          const messages = [];
          for (const key in error.error.errors) {
            messages.push(`${key}: ${error.error.errors[key].join(', ')}`);
          }
          alert(`Erreurs de validation:\n${messages.join('\n')}`);
        } else if (error.error && error.error.error) {
          alert(`Erreur: ${error.error.error}`);
        } else if (error.error && typeof error.error === 'string') {
          alert(`Erreur: ${error.error}`);
        } else {
          alert('Erreur lors de la création de la ferme');
        }

        this.creationEnCours = false;
      }
    });
  }

  preparerAjoutParcelle(): void {
    this.nouvelleParcelle = {
      nom: `Parcelle ${new Date().toLocaleDateString()}`,
      surface: this.nouveauPolygone.surface,
      culture: '',
      couleur: '#4CAF50'
    };
    this.modalAjoutVisible = true;
  }

  async ajouterParcelle(): Promise<void> {
    if (!this.fermeCreee) return;

    // Analyser le terrain du polygone
    const coordinates = this.nouveauPolygone.layer.getLatLngs()[0];
    const analyse = await this.terrainAnalysis.analyserTerrain(coordinates);

      console.log('=== DONNÉES D\'ANALYSE À ENVOYER ===');
      console.log('analyse complet:', analyse);
      console.log('altitudeMin:', analyse.altitudeMin);
      console.log('altitudeMax:', analyse.altitudeMax);
      console.log('penteMoyenne:', analyse.penteMoyenne);
      console.log('classePente:', analyse.classePente);
      console.log('exposition:', analyse.exposition);

    const parcelleData = {
      nom: this.nouvelleParcelle.nom,
      surface: this.nouveauPolygone.surface,
      culture: this.nouvelleParcelle.culture,
      couleur: this.nouvelleParcelle.couleur,
      agriculteurId: this.fermeCreee.agriculteurId,
      fermeId: this.fermeCreee.id,
      latitude: this.nouveauPolygone.center.lat,
      longitude: this.nouveauPolygone.center.lng,
      geometrie: this.nouveauPolygone.geometrie,
      gouvernorat: this.fermeEnCreation?.gouvernorat,
      delegation: this.fermeEnCreation?.delegation,

    };

    this.parcelleService.createParcelle(this.fermeCreee.agriculteurId, parcelleData).subscribe({
      next: (parcelle) => {
        this.parcellesFerme.push(parcelle);
        this.modalAjoutVisible = false;

        // Afficher les informations de terrain
        this.afficherInfoTerrain(analyse);


        // Colorer le polygone avec la couleur de la parcelle
        this.nouveauPolygone.layer.setStyle({ color: parcelle.couleur });
      },
      error: (error) => {
        console.error('Erreur création parcelle:', error);
        alert('Erreur lors de la création de la parcelle');
      }
    });
  }
    private afficherInfoTerrain(analyse: any): void {
    console.log('=== Analyse du terrain ===');
    console.log(`Altitude min: ${analyse.altitudeMin.toFixed(1)} m`);
    console.log(`Altitude max: ${analyse.altitudeMax.toFixed(1)} m`);
    console.log(`Altitude moyenne: ${analyse.altitudeMoyenne.toFixed(1)} m`);
    console.log(`Pente moyenne: ${analyse.penteMoyenne.toFixed(1)}%`);
    console.log(`Classe de pente: ${analyse.classePente}`);
    console.log(`Exposition: ${analyse.exposition}`);
  }

  private colorerParAltitude(parcelle: any, analyse: any): void {
    // Colorer en fonction de l'altitude (vert = bas, rouge = haut)
    const altitudeRatio = (analyse.altitudeMoyenne - analyse.altitudeMin) /
                          (analyse.altitudeMax - analyse.altitudeMin);

    // Dégradé de vert (bas) à rouge (haut)
    const red = Math.floor(altitudeRatio * 255);
    const green = Math.floor((1 - altitudeRatio) * 255);
    const color = `rgb(${red}, ${green}, 0)`;

    this.nouveauPolygone.layer.setStyle({
      color: color,
      fillColor: color,
      fillOpacity: 0.5
    });
  }
  private rechercherParcelleProche(latlng: L.LatLng): void {
    // Rechercher si une parcelle existe déjà à cet emplacement
    // À implémenter selon votre logique métier

    // Simuler la création d'une nouvelle parcelle
    this.nouveauPolygone = {
      layer: L.circle(latlng, { radius: 50, color: '#4CAF50' }),
      surface: 0.5,
      center: latlng,
      geometrie: JSON.stringify({
        type: 'Point',
        coordinates: [latlng.lng, latlng.lat]
      })
    };
    this.drawnItems.addLayer(this.nouveauPolygone.layer);
    this.preparerAjoutParcelle();
  }

  retirerParcelle(parcelleId: number): void {
    if (!this.fermeCreee) return;

    this.fermeService.retirerParcelle(this.fermeCreee.id, parcelleId).subscribe({
      next: () => {
        this.parcellesFerme = this.parcellesFerme.filter(p => p.id !== parcelleId);
      },
      error: (error) => {
        console.error('Erreur retrait parcelle:', error);
      }
    });
  }

  centrerCarte(): void {
    this.map.setView([34.0, 9.0], 6);
  }
}
