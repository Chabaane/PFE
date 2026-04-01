// components/parcelles/parcelles.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ParcelleService, Parcelle } from '../../services/api/parcelle.service';

@Component({
  selector: 'app-parcelles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container-fluid mt-4">
      <!-- En-tête -->
      <div class="row mb-4">
        <div class="col-md-8">
          <h3>
            <i class="fas fa-map-marked-alt me-2"></i>
            Liste des Parcelles
          </h3>
          <p class="text-muted">
            Visualisez et gérez toutes les parcelles
          </p>
        </div>
        <div class="col-md-4 text-end">
          <button class="btn btn-success" (click)="creerNouvelleParcelle()">
            <i class="fas fa-plus me-1"></i> Créer une parcelle
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
              <h5 class="card-title text-warning">{{agriculteursUniques}}</h5>
              <p class="card-text">Agriculteurs</p>
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

      <!-- Barre d'outils -->
      <div class="row mb-3">
        <div class="col-md-12">
          <div class="card">
            <div class="card-body">
              <div class="row g-2">
                <div class="col-md-4">
                  <div class="input-group">
                    <span class="input-group-text bg-light">
                      <i class="fas fa-search"></i>
                    </span>
                    <input type="text"
                           class="form-control"
                           placeholder="Rechercher une parcelle..."
                           [(ngModel)]="searchTerm"
                           (ngModelChange)="filtrerParcelles()">
                  </div>
                </div>
                <div class="col-md-3">
                  <select class="form-select" [(ngModel)]="filterCulture" (ngModelChange)="filtrerParcelles()">
                    <option value="">Toutes les cultures</option>
                    <option value="Blé">Blé</option>
                    <option value="Orge">Orge</option>
                    <option value="Maïs">Maïs</option>
                    <option value="Olives">Olives</option>
                    <option value="Vigne">Vigne</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <select class="form-select" [(ngModel)]="filterAgriculteur" (ngModelChange)="filtrerParcelles()">
                    <option value="">Tous les agriculteurs</option>
                    <option *ngFor="let agriculteur of agriculteursList" [value]="agriculteur.id">
                      Agriculteur {{agriculteur.id}}
                    </option>
                  </select>
                </div>
                <div class="col-md-2">
                  <button class="btn btn-outline-secondary w-100" (click)="resetFiltres()">
                    <i class="fas fa-undo me-1"></i> Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste des parcelles -->
      <div class="row">
        <div class="col-12">
          <div class="card shadow-sm">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <span>
                <i class="fas fa-list me-2"></i>
                Liste des Parcelles
              </span>
              <span class="badge bg-light text-dark">
                {{parcellesFiltrees.length}} parcelle(s) sur {{parcelles.length}}
              </span>
            </div>

            <div class="card-body p-0">
              <!-- Liste -->
              <div class="list-group list-group-flush" *ngIf="parcellesFiltrees.length > 0">
                <div *ngFor="let parcelle of parcellesFiltrees"
                     class="list-group-item list-group-item-action parcelle-item">

                  <div class="d-flex w-100 align-items-center">
                    <!-- Indicateur de couleur et statut -->
                    <div class="parcelle-status me-3 text-center">
                      <div class="parcelle-color mx-auto mb-1"
                           [style.background-color]="parcelle.couleur"
                           [style.width.px]="30"
                           [style.height.px]="8">
                      </div>
                      <span *ngIf="!parcelle.estSynchronise"
                            class="badge bg-warning"
                            style="font-size: 0.6rem;">
                        Hors ligne
                      </span>
                    </div>

                    <!-- Informations principales -->
                    <div class="flex-grow-1">
                      <div class="row">
                        <div class="col-md-8">
                          <div class="d-flex align-items-center mb-2">
                            <h5 class="mb-0 fw-bold me-3">{{parcelle.nom}}</h5>
                            <small class="text-muted">
                              <i class="fas fa-user me-1"></i>
                              Agriculteur {{parcelle.agriculteurId}}
                            </small>
                          </div>

                          <div class="row g-2">
                            <!-- Surface -->
                            <div class="col-md-3">
                              <div class="info-badge">
                                <i class="fas fa-ruler-combined text-info"></i>
                                <span>{{parcelle.surface}} ha</span>
                              </div>
                            </div>

                            <!-- Localisation -->
                            <div class="col-md-4">
                              <div class="info-badge">
                                <i class="fas fa-map-marker-alt text-danger"></i>
                                <span>{{parcelle.gouvernorat || 'Localisation inconnue'}}</span>
                              </div>
                            </div>

                            <!-- Culture -->
                            <div class="col-md-3" *ngIf="parcelle.culture">
                              <div class="info-badge">
                                <i class="fas fa-seedling text-success"></i>
                                <span>{{parcelle.culture}}</span>
                              </div>
                            </div>

                            <!-- Date -->
                            <div class="col-md-2">
                              <div class="info-badge">
                                <i class="far fa-calendar-alt"></i>
                                <span>{{parcelle.dateCreation | date:'dd/MM/yyyy'}}</span>
                              </div>
                            </div>
                          </div>

                          <!-- Délégation/Secteur -->
                          <div class="mt-1" *ngIf="parcelle.delegation || parcelle.secteur">
                            <small class="text-muted">
                              <i class="fas fa-location-dot me-1"></i>
                              {{parcelle.delegation || ''}} {{parcelle.secteur ? ' - ' + parcelle.secteur : ''}}
                            </small>
                          </div>

                          <!-- Description -->
                          <div *ngIf="parcelle.description" class="mt-1">
                            <small class="text-muted">
                              <i class="far fa-comment me-1"></i>
                              {{parcelle.description}}
                            </small>
                          </div>
                        </div>

                        <!-- Coordonnées -->
                        <div class="col-md-4" *ngIf="parcelle.latitude && parcelle.longitude">
                          <div class="coordinates-box">
                            <small class="text-muted d-block">
                              <i class="fas fa-globe-americas me-1"></i>
                              Lat: {{parcelle.latitude | number:'1.4-4'}}
                            </small>
                            <small class="text-muted d-block">
                              <i class="fas fa-globe-americas me-1"></i>
                              Lng: {{parcelle.longitude | number:'1.4-4'}}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="btn-group-vertical ms-3">
                      <button class="btn btn-sm btn-outline-primary mb-1"
                              [routerLink]="['/carte-parcelle', parcelle.agriculteurId]"
                              [queryParams]="{parcelleId: parcelle.id}"
                              title="Voir sur la carte">
                        <i class="fas fa-map"></i>
                      </button>
                      <button class="btn btn-sm btn-outline-danger"
                              (click)="supprimerParcelle(parcelle)"
                              title="Supprimer">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Message si aucune parcelle -->
              <div *ngIf="parcellesFiltrees.length === 0" class="text-center py-5">
                <i class="fas fa-map-marked-alt fa-4x text-muted mb-3"></i>
                <h5 class="text-muted">Aucune parcelle trouvée</h5>
                <p class="text-muted mb-3">
                  {{searchTerm || filterCulture || filterAgriculteur ?
                    'Aucun résultat pour vos critères de recherche' :
                    'Commencez par créer votre première parcelle'}}
                </p>
                <button class="btn btn-success" (click)="creerNouvelleParcelle()">
                  <i class="fas fa-plus me-1"></i> Créer une parcelle
                </button>
              </div>
            </div>

            <!-- Pied de page -->
            <div class="card-footer bg-white" *ngIf="parcellesFiltrees.length > 0">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <button class="btn btn-sm btn-outline-secondary me-2"
                          (click)="exporterCSV()"
                          title="Exporter en CSV">
                    <i class="fas fa-download me-1"></i> Exporter
                  </button>
                  <button class="btn btn-sm btn-outline-primary"
                          (click)="synchroniser()"
                          [disabled]="!hasOfflineData">
                    <i class="fas fa-sync-alt me-1" [class.fa-spin]="synchronisationEnCours"></i>
                    Synchroniser ({{parcellesOfflineCount}})
                  </button>
                </div>
                <small class="text-muted">
                  Surface totale: {{surfaceTotale}} ha
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .parcelle-item {
      padding: 1rem;
      transition: all 0.2s;
      border-left: 3px solid transparent;
      cursor: pointer;
    }

    .parcelle-item:hover {
      background-color: #f8f9fa;
      border-left-color: #007bff;
    }

    .parcelle-color {
      border-radius: 4px;
      width: 30px;
    }

    .info-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.85rem;
      color: #495057;
    }

    .info-badge i {
      width: 16px;
    }

    .coordinates-box {
      background-color: #f8f9fa;
      padding: 0.5rem;
      border-radius: 4px;
      border-left: 2px solid #007bff;
    }

    .badge.bg-warning {
      font-size: 0.7rem;
      padding: 4px 8px;
    }

    .btn-group-vertical .btn {
      padding: 0.25rem 0.5rem;
    }

    .input-group-text {
      border-right: none;
    }

    .input-group .form-control {
      border-left: none;
    }

    .input-group .form-control:focus {
      border-left: none;
      box-shadow: none;
    }

    .card-header .badge {
      font-size: 0.9rem;
      padding: 0.5rem 1rem;
    }

    @media (max-width: 768px) {
      .info-badge {
        font-size: 0.75rem;
      }

      .coordinates-box {
        margin-top: 0.5rem;
      }
    }
  `]
})
export class ParcellesComponent implements OnInit, OnDestroy {
  parcelles: Parcelle[] = [];
  parcellesFiltrees: Parcelle[] = [];

  // Statistiques
  surfaceTotale = 0;
  agriculteursUniques = 0;
  agriculteursList: { id: number }[] = [];
  parcellesOfflineCount = 0;
  hasOfflineData = false;

  // États
  synchronisationEnCours = false;
  connectionStatus = navigator.onLine ? 'En ligne' : 'Hors ligne';

  // Filtres
  searchTerm: string = '';
  filterCulture: string = '';
  filterAgriculteur: string = '';

  constructor(
    private router: Router,
    private parcelleService: ParcelleService
  ) {}

  ngOnInit(): void {
    this.chargerToutesParcelles();

    // Surveiller la connexion
    window.addEventListener('online', this.mettreAJourStatutConnexion.bind(this));
    window.addEventListener('offline', this.mettreAJourStatutConnexion.bind(this));
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.mettreAJourStatutConnexion.bind(this));
    window.removeEventListener('offline', this.mettreAJourStatutConnexion.bind(this));
  }

  private chargerToutesParcelles(): void {
    this.parcelleService.getAllParcelles().subscribe({
      next: (parcelles) => {
        this.parcelles = parcelles || [];
        this.calculerStatistiques();
        this.extraireAgriculteurs();
        this.filtrerParcelles();
      },
      error: (error) => {
        console.error('Erreur chargement parcelles:', error);
        this.parcelles = [];
        this.parcellesFiltrees = [];
      }
    });
  }

  private calculerStatistiques(): void {
    this.surfaceTotale = +this.parcelles.reduce((sum, p) => sum + p.surface, 0).toFixed(3);
    this.parcellesOfflineCount = this.parcelles.filter(p => !p.estSynchronise).length;
    this.hasOfflineData = this.parcellesOfflineCount > 0;

    // Compter les agriculteurs uniques
    const agriculteursSet = new Set(this.parcelles.map(p => p.agriculteurId));
    this.agriculteursUniques = agriculteursSet.size;
  }

  private extraireAgriculteurs(): void {
    const agriculteursMap = new Map();
    this.parcelles.forEach(p => {
      if (!agriculteursMap.has(p.agriculteurId)) {
        agriculteursMap.set(p.agriculteurId, { id: p.agriculteurId });
      }
    });
    this.agriculteursList = Array.from(agriculteursMap.values());
  }

  filtrerParcelles(): void {
    this.parcellesFiltrees = this.parcelles.filter(parcelle => {
      // Filtre par recherche textuelle
      const matchesSearch = !this.searchTerm ||
        parcelle.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (parcelle.gouvernorat && parcelle.gouvernorat.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (parcelle.delegation && parcelle.delegation.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
        (parcelle.culture && parcelle.culture.toLowerCase().includes(this.searchTerm.toLowerCase()));

      // Filtre par culture
      const matchesCulture = !this.filterCulture || parcelle.culture === this.filterCulture;

      // Filtre par agriculteur
      const matchesAgriculteur = !this.filterAgriculteur ||
        parcelle.agriculteurId.toString() === this.filterAgriculteur;

      return matchesSearch && matchesCulture && matchesAgriculteur;
    });
  }

  resetFiltres(): void {
    this.searchTerm = '';
    this.filterCulture = '';
    this.filterAgriculteur = '';
    this.filtrerParcelles();
  }

  creerNouvelleParcelle(): void {
    // Rediriger vers la page de création avec le premier agriculteur ou permettre de choisir
    if (this.agriculteursList.length > 0) {
      this.router.navigate(['/carte-parcelle', this.agriculteursList[0].id]);
    } else {
      // Si aucun agriculteur n'a de parcelle, rediriger vers agriculteur 1 par défaut
      this.router.navigate(['/carte-parcelle', 1]);
    }
  }

  supprimerParcelle(parcelle: Parcelle): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la parcelle "${parcelle.nom}" ?`)) {
      this.parcelleService.deleteParcelle(parcelle.id).subscribe({
        next: () => {
          this.parcelles = this.parcelles.filter(p => p.id !== parcelle.id);
          this.calculerStatistiques();
          this.extraireAgriculteurs();
          this.filtrerParcelles();
        },
        error: (error) => {
          console.error('Erreur suppression parcelle:', error);
          alert('Erreur lors de la suppression');
        }
      });
    }
  }

  synchroniser(): void {
    this.synchronisationEnCours = true;

    this.parcelleService.synchroniserParcelles().subscribe({
      next: () => {
        this.chargerToutesParcelles();
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

  exporterCSV(): void {
    const headers = ['Nom', 'Agriculteur ID', 'Surface (ha)', 'Gouvernorat', 'Délégation', 'Secteur', 'Culture', 'Description', 'Latitude', 'Longitude', 'Date création'];
    const data = this.parcellesFiltrees.map(p => [
      p.nom,
      p.agriculteurId,
      p.surface,
      p.gouvernorat || '',
      p.delegation || '',
      p.secteur || '',
      p.culture || '',
      p.description || '',
      p.latitude || '',
      p.longitude || '',
      new Date(p.dateCreation).toLocaleDateString('fr-FR')
    ]);

    const csv = [headers, ...data]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `toutes_parcelles_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private mettreAJourStatutConnexion(): void {
    this.connectionStatus = navigator.onLine ? 'En ligne' : 'Hors ligne';

    if (navigator.onLine && this.hasOfflineData) {
      this.synchroniser();
    }
  }
}
