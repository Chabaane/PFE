// components/fermes/fermes-list.component.ts
import { Component, OnInit , ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule,NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FermeService, Ferme } from 'src/app/services/api/ferme.service';


@Component({
  selector: 'app-fermes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container-fluid mt-4">
      <!-- En-tête -->
      <div class="row mb-4">
        <div class="col-md-8">
          <h3>
            <i class="fas fa-warehouse me-2"></i>
            Gestion des Fermes
          </h3>
          <p class="text-muted">
            Visualisez et gérez l'ensemble des fermes et leurs parcelles
          </p>
        </div>
        <div class="col-md-4 text-end">
          <button class="btn btn-success" [routerLink]="['/fermes/creer-carte']">
            <i class="fas fa-plus me-1"></i> Nouvelle Ferme
          </button>
        </div>
      </div>

      <!-- Filtres et recherche -->
      <div class="row mb-4">
        <div class="col-md-12">
          <div class="card">
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-4">
                  <div class="input-group">
                    <span class="input-group-text">
                      <i class="fas fa-search"></i>
                    </span>
                    <input type="text"
                           class="form-control"
                           placeholder="Rechercher une ferme..."
                           [(ngModel)]="searchTerm"
                           (ngModelChange)="filtrerFermes()">
                  </div>
                </div>
                <div class="col-md-3">
                  <select class="form-select" [(ngModel)]="filterAgriculteur" (ngModelChange)="filtrerFermes()">
                    <option value="">Tous les agriculteurs</option>
                    <option *ngFor="let id of agriculteursList" [value]="id">
                      Agriculteur {{id}}
                    </option>
                  </select>
                </div>
                <div class="col-md-3">
                  <select class="form-select" [(ngModel)]="filterGouvernorat" (ngModelChange)="filtrerFermes()">
                    <option value="">Tous les gouvernorats</option>
                    <option *ngFor="let gouv of gouvernoratsList" [value]="gouv">
                      {{gouv}}
                    </option>
                  </select>
                </div>
                <div class="col-md-2">
                  <button class="btn btn-outline-secondary w-100" (click)="resetFiltres()">
                    <i class="fas fa-undo"></i> Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cartes statistiques -->
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="card text-center border-primary">
            <div class="card-body">
              <h5 class="card-title text-primary">{{fermes.length}}</h5>
              <p class="card-text">Fermes</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center border-success">
            <div class="card-body">
              <h5 class="card-title text-success">{{totalParcelles}}</h5>
              <p class="card-text">Parcelles</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center border-info">
            <div class="card-body">
              <h5 class="card-title text-info">{{superficieTotale}} ha</h5>
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
      </div>

      <!-- Liste des fermes -->
      <div class="row">
        <div class="col-12">
          <div class="card shadow-sm">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <span>
                <i class="fas fa-list me-2"></i>
                Liste des Fermes
              </span>
              <span class="badge bg-light text-dark">
                {{fermesFiltrees.length}} ferme(s)
              </span>
            </div>

            <div class="card-body p-0">
              <!-- Grille des fermes -->
              <div class="row g-0">
                <div *ngFor="let ferme of fermesFiltrees" class="col-md-6 col-lg-4">
                  <div class="ferme-card" [class.selected]="fermeSelectionnee?.id === ferme.id"
                       (click)="selectionnerFerme(ferme)">

                    <!-- En-tête de la ferme -->
                    <div class="ferme-header" [style.background-color]="ferme.couleur || '#4CAF50'">
                      <div class="ferme-title">
                        <h5 class="mb-0 text-white">
                          <i class="fas fa-warehouse me-2"></i>
                          {{ferme.nom}}
                        </h5>
                        <span class="badge bg-light text-dark">
                          Agriculteur {{ferme.agriculteurId}}
                        </span>
                      </div>
                    </div>

                    <!-- Corps de la carte -->
                    <div class="ferme-body">
                      <!-- Localisation -->
                      <div class="ferme-info">
                        <i class="fas fa-map-marker-alt text-danger"></i>
                        <span>{{ferme.gouvernorat || 'Localisation inconnue'}}</span>
                      </div>
                      <div class="ferme-info" *ngIf="ferme.delegation">
                        <i class="fas fa-location-dot text-info"></i>
                        <span>{{ferme.delegation}}</span>
                      </div>

                      <!-- Statistiques -->
                      <div class="ferme-stats">
                        <div class="stat-item">
                          <span class="stat-value">{{ferme.nombreParcelles}}</span>
                          <span class="stat-label">Parcelles</span>
                        </div>
                        <div class="stat-item">
                          <span class="stat-value">{{ferme.superficieTotale}} ha</span>
                          <span class="stat-label">Surface</span>
                        </div>
                      </div>

                      <!-- Description -->
                      <div class="ferme-description" *ngIf="ferme.description">
                        <i class="far fa-comment me-1"></i>
                        {{ferme.description}}
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="ferme-footer">
                      <button class="btn btn-sm btn-outline-primary"
                              (click)="voirDetails(ferme.id); $event.stopPropagation()"
                              title="Voir les détails">
                        <i class="fas fa-eye me-1"></i> Détails
                      </button>
                      <button class="btn btn-sm btn-outline-success"
                              (click)="voirCarte(ferme); $event.stopPropagation()"
                              title="Voir sur la carte">
                        <i class="fas fa-map me-1"></i> Carte
                      </button>
                      <button class="btn btn-sm btn-outline-danger"
                              (click)="supprimerFerme(ferme); $event.stopPropagation()"
                              title="Supprimer">
                        <i class="fas fa-trash"></i>supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Message si aucune ferme -->
              <div *ngIf="fermesFiltrees.length === 0" class="text-center py-5">
                <i class="fas fa-warehouse fa-4x text-muted mb-3"></i>
                <h5 class="text-muted">Aucune ferme trouvée</h5>
                <p class="text-muted mb-3">
                  Commencez par créer votre première ferme
                </p>
                <button class="btn btn-success" [routerLink]="['/fermes/creer-carte']">
                  <i class="fas fa-plus me-1"></i> Créer une ferme
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Ferme -->
    <div class="modal fade" [class.show]="modalVisible" [style.display]="modalVisible ? 'block' : 'none'">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-dark text-white">
            <h5 class="modal-title">
              {{editionMode ? 'Modifier' : 'Nouvelle'}} Ferme
            </h5>
            <button type="button" class="btn-close btn-close-white" (click)="fermerModal()"></button>
          </div>
          <div class="modal-body">
            <form #fermeForm="ngForm" *ngIf="fermeEnEdition">
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">Nom *</label>
                    <input type="text" class="form-control" [(ngModel)]="fermeEnEdition.nom"
                           name="nom" required>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">Agriculteur *</label>
                    <select class="form-control" [(ngModel)]="fermeEnEdition.agriculteurId"
                            name="agriculteurId" required>
                      <option value="">Sélectionner</option>
                      <option *ngFor="let id of agriculteursDisponibles" [value]="id">
                        Agriculteur {{id}}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="col-md-4">
                  <div class="mb-3">
                    <label class="form-label">Gouvernorat</label>
                    <input type="text" class="form-control" [(ngModel)]="fermeEnEdition.gouvernorat"
                           name="gouvernorat">
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="mb-3">
                    <label class="form-label">Délégation</label>
                    <input type="text" class="form-control" [(ngModel)]="fermeEnEdition.delegation"
                           name="delegation">
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="mb-3">
                    <label class="form-label">Couleur</label>
                    <div class="d-flex gap-2">
                      <div *ngFor="let couleur of couleurs"
                           class="color-option"
                           [style.background-color]="couleur"
                           [class.selected]="fermeEnEdition.couleur === couleur"
                           (click)="fermeEnEdition.couleur = couleur">
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea class="form-control" [(ngModel)]="fermeEnEdition.description"
                          name="description" rows="3"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="fermerModal()">Annuler</button>
            <button type="button" class="btn btn-primary"
                    (click)="sauvegarderFerme()"
                    [disabled]="!fermeForm?.valid || sauvegardeEnCours">
              <i class="fas fa-save me-1"></i>
              {{sauvegardeEnCours ? 'Enregistrement...' : 'Enregistrer'}}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ferme-card {
      margin: 1rem;
      border: 1px solid #dee2e6;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s ease;
      cursor: pointer;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .ferme-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }

    .ferme-card.selected {
      border: 2px solid #007bff;
      box-shadow: 0 0 0 2px rgba(0,123,255,0.3);
    }

    .ferme-header {
      padding: 1rem;
      color: white;
      position: relative;
      min-height: 100px;
      display: flex;
      align-items: flex-end;
    }

    .ferme-title {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ferme-title h5 {
      margin: 0;
      font-weight: 600;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    }

    .ferme-body {
  position: relative;
  padding: 1rem;
  color: white;
  background-image: url('/assets/images/I2.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* Overlay sombre */
.ferme-body::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5); /* ajuste 0.3 → 0.7 selon lisibilité */
  z-index: 0;
}

/* Mettre le contenu au-dessus de l’overlay */
.ferme-body > * {
  position: relative;
  z-index: 1;
}



    .ferme-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      color: #f1f1f1;
    }

    .ferme-info i {
      width: 20px;
    }

    .ferme-stats {
      display: flex;
      gap: 1rem;
      margin: 1rem 0;
      padding: 0.5rem 0;
      border-top: 1px solid #dee2e6;
      border-bottom: 1px solid #dee2e6;
    }

    .stat-item {
      flex: 1;
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 1.25rem;
      font-weight: bold;
      color: #007bff;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #f1f1f1;
      text-transform: uppercase;
    }

    .ferme-description {
      font-size: 0.9rem;
      color: #f1f1f1;
      margin: 0.5rem 0;
      padding: 0.5rem;
      border-radius: 4px;
      font-style: italic;
    }

    .ferme-footer {
      display: flex;
      gap: 0.5rem;
      padding: 1rem;
      border-top: 1px solid #dee2e6;
      background: #f8f9fa;
    }

    .ferme-footer button {
      flex: 1;
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

    .d-flex.gap-2 {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.25rem;
    }

    @media (max-width: 768px) {
      .ferme-card {
        margin: 0.5rem;
      }

      .ferme-footer {
        flex-direction: column;
      }
    }
  `]
})
export class FermesListComponent implements OnInit {
  @ViewChild('fermeForm') fermeForm!: NgForm;
  fermes: Ferme[] = [];
  fermesFiltrees: Ferme[] = [];
  fermeSelectionnee: Ferme | null = null;
  fermeEnEdition: Partial<Ferme> | null = null;

  // États
  modalVisible = false;
  editionMode = false;
  sauvegardeEnCours = false;

  // Statistiques
  totalParcelles = 0;
  superficieTotale = 0;
  agriculteursUniques = 0;

  // Listes pour les filtres
  agriculteursList: number[] = [];
  gouvernoratsList: string[] = [];
  agriculteursDisponibles: number[] = [1, 2, 3, 4, 5]; // À remplacer par vraie liste

  // Filtres
  searchTerm = '';
  filterAgriculteur = '';
  filterGouvernorat = '';

  // Couleurs disponibles
  couleurs = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];

  constructor(
    private fermeService: FermeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.chargerFermes();
  }

  chargerFermes(): void {
    this.fermeService.getAllFermes().subscribe({
      next: (fermes) => {
        this.fermes = fermes;
        this.calculerStatistiques();
        this.extraireFiltres();
        this.filtrerFermes();
      },
      error: (error) => {
        console.error('Erreur chargement fermes:', error);
      }
    });
  }

  calculerStatistiques(): void {
    this.totalParcelles = this.fermes.reduce((sum, f) => sum + f.nombreParcelles, 0);
    this.superficieTotale = +this.fermes.reduce((sum, f) => sum + f.superficieTotale, 0).toFixed(3);

    const agriculteursSet = new Set(this.fermes.map(f => f.agriculteurId));
    this.agriculteursUniques = agriculteursSet.size;
  }

  extraireFiltres(): void {
    this.agriculteursList = [...new Set(this.fermes.map(f => f.agriculteurId))];
    this.gouvernoratsList = [...new Set(this.fermes.map(f => f.gouvernorat).filter(g => g))] as string[];
  }

  filtrerFermes(): void {
    this.fermesFiltrees = this.fermes.filter(ferme => {
      const matchesSearch = !this.searchTerm ||
        ferme.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (ferme.gouvernorat && ferme.gouvernorat.toLowerCase().includes(this.searchTerm.toLowerCase()));

      const matchesAgriculteur = !this.filterAgriculteur ||
        ferme.agriculteurId.toString() === this.filterAgriculteur;

      const matchesGouvernorat = !this.filterGouvernorat ||
        ferme.gouvernorat === this.filterGouvernorat;

      return matchesSearch && matchesAgriculteur && matchesGouvernorat;
    });
  }

  resetFiltres(): void {
    this.searchTerm = '';
    this.filterAgriculteur = '';
    this.filterGouvernorat = '';
    this.filtrerFermes();
  }

  selectionnerFerme(ferme: Ferme): void {
    this.fermeSelectionnee = this.fermeSelectionnee?.id === ferme.id ? null : ferme;
  }

  ouvrirModalFerme(ferme?: Ferme): void {
    if (ferme) {
      this.fermeEnEdition = { ...ferme };
      this.editionMode = true;
    } else {
      this.fermeEnEdition = {
        nom: `Ferme ${new Date().toLocaleDateString()}`,
        couleur: this.couleurs[0]
      };
      this.editionMode = false;
    }
    this.modalVisible = true;
  }

  fermerModal(): void {
    this.modalVisible = false;
    this.fermeEnEdition = null;
    this.editionMode = false;
  }

  sauvegarderFerme(): void {
    if (!this.fermeEnEdition) return;

    this.sauvegardeEnCours = true;

    const operation = this.editionMode && this.fermeEnEdition.id
      ? this.fermeService.updateFerme(this.fermeEnEdition.id, this.fermeEnEdition)
      : this.fermeService.createFerme(this.fermeEnEdition);

    operation.subscribe({
      next: () => {
        this.chargerFermes();
        this.fermerModal();
      },
      error: (error) => {
        console.error('Erreur sauvegarde ferme:', error);
        alert('Erreur lors de la sauvegarde');
      },
      complete: () => {
        this.sauvegardeEnCours = false;
      }
    });
  }

  voirDetails(fermeId: number): void {
    this.router.navigate(['/fermes', fermeId, 'details']);
  }

  voirCarte(ferme: Ferme): void {
    this.router.navigate(['/carte-parcelle', ferme.agriculteurId], {
      queryParams: { fermeId: ferme.id }
    });
  }

  supprimerFerme(ferme: Ferme): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la ferme "${ferme.nom}" ?`)) {
      this.fermeService.deleteFerme(ferme.id).subscribe({
        next: () => {
          this.chargerFermes();
        },
        error: (error) => {
          console.error('Erreur suppression ferme:', error);
          alert('Erreur lors de la suppression');
        }
      });
    }
  }
}


