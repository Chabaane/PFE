// components/fermes/ferme-details.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FermeService, FermeDetail } from 'src/app/services/api/ferme.service';
import { ParcelleService, Parcelle } from 'src/app/services/api/parcelle.service';

@Component({
  selector: 'app-ferme-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container-fluid mt-4">
      <!-- En-tête avec retour -->
      <div class="row mb-4">
        <div class="col-12">
          <button class="btn btn-link p-0 mb-3" routerLink="/fermes">
            <i class="fas fa-arrow-left me-2"></i> Retour à la liste
          </button>

          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h3>
                <i class="fas fa-warehouse me-2" [style.color]="ferme?.couleur"></i>
                {{ferme?.nom}}
              </h3>
              <p class="text-muted">
                <i class="fas fa-user me-2"></i> Agriculteur {{ferme?.agriculteurId}}
                <span class="mx-2">•</span>
                <i class="fas fa-map-marker-alt me-2"></i> {{ferme?.gouvernorat || 'Localisation inconnue'}}
                <span *ngIf="ferme?.delegation"> - {{ferme?.delegation}}</span>
              </p>
            </div>
            <button class="btn btn-outline-primary" (click)="gererAssignation()">
              <i class="fas fa-link me-2"></i> Gérer les parcelles
            </button>
          </div>
        </div>
      </div>

      <!-- Statistiques -->
      <div class="row mb-4">
        <div class="col-md-4">
          <div class="card text-center border-info">
            <div class="card-body">
              <h5 class="card-title text-info">{{ferme?.nombreParcelles || 0}}</h5>
              <p class="card-text">Parcelles</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card text-center border-success">
            <div class="card-body">
              <h5 class="card-title text-success">{{ferme?.superficieTotale || 0}} ha</h5>
              <p class="card-text">Surface totale</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card text-center border-primary">
            <div class="card-body">
              <h5 class="card-title text-primary">{{ferme?.dateCreation | date:'dd/MM/yyyy'}}</h5>
              <p class="card-text">Date de création</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="row mb-4" *ngIf="ferme?.description">
        <div class="col-12">
          <div class="card">
            <div class="card-body">
              <h6 class="card-subtitle mb-2 text-muted">Description</h6>
              <p class="card-text">{{ferme?.description}}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste des parcelles de la ferme -->
      <div class="row">
        <div class="col-12">
          <div class="card shadow-sm">
            <div class="card-header bg-dark text-white">
              <i class="fas fa-list me-2"></i>
              Parcelles de la ferme ({{ferme?.parcelles?.length || 0}})
            </div>

            <div class="card-body p-0">
              <div class="list-group list-group-flush" *ngIf="ferme?.parcelles?.length">
                <div *ngFor="let parcelle of ferme?.parcelles"
                     class="list-group-item d-flex justify-content-between align-items-center">
                  <div class="d-flex align-items-center">
                    <div class="parcelle-color me-3"
                         [style.background-color]="parcelle.couleur"
                         [style.width.px]="8"
                         [style.height.px]="40">
                    </div>
                    <div>
                      <h6 class="mb-1">{{parcelle.nom}}</h6>
                      <div class="d-flex gap-3">
                        <small class="text-muted">
                          <i class="fas fa-ruler-combined me-1"></i>
                          {{parcelle.surface}} ha
                        </small>
                        <small class="text-muted" *ngIf="parcelle.culture">
                          <i class="fas fa-seedling me-1"></i>
                          {{parcelle.culture}}
                        </small>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span *ngIf="!parcelle.estSynchronise"
                          class="badge bg-warning me-2">Hors ligne</span>
                    <button class="btn btn-sm btn-outline-danger"
                            (click)="retirerParcelle(parcelle.id)"
                            title="Retirer de la ferme">
                      <i class="fas fa-unlink"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div *ngIf="!ferme?.parcelles?.length" class="text-center py-5">
                <i class="fas fa-map-marked-alt fa-4x text-muted mb-3"></i>
                <h5 class="text-muted">Aucune parcelle dans cette ferme</h5>
                <p class="text-muted mb-3">
                  Commencez par assigner des parcelles à cette ferme
                </p>
                <button class="btn btn-primary" (click)="gererAssignation()">
                  <i class="fas fa-link me-2"></i> Assigner des parcelles
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal d'assignation des parcelles -->
    <div class="modal fade" [class.show]="assignationModalVisible"
         [style.display]="assignationModalVisible ? 'block' : 'none'">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-dark text-white">
            <h5 class="modal-title">
              <i class="fas fa-link me-2"></i>
              Assigner des parcelles à {{ferme?.nom}}
            </h5>
            <button type="button" class="btn-close btn-close-white" (click)="assignationModalVisible = false"></button>
          </div>
          <!-- Dans le template de ferme-details.component.ts -->
          <div class="modal-body">
            <div *ngIf="parcellesEnCoursChargement" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
              </div>
            </div>

            <div *ngIf="!parcellesEnCoursChargement">
              <div class="mb-3">
                <input type="text" class="form-control"
                      placeholder="Rechercher une parcelle..."
                      [(ngModel)]="searchParcelle"
                      (ngModelChange)="filtrerParcellesDisponibles()">
              </div>

              <div class="list-group" *ngIf="parcellesDisponibles.length">
                <div *ngFor="let parcelle of parcellesDisponibles"
                    class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{{parcelle.nom}}</strong>
                    <div class="small text-muted">
                      {{parcelle.surface}} ha | {{parcelle.culture || 'Sans culture'}}
                      <span *ngIf="parcelle.fermeId" class="text-danger ms-2">
                        (Déjà dans une ferme)
                      </span>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-success"
                          (click)="assignerParcelle(parcelle.id)"
                          [disabled]="parcellesEnAssignation.includes(parcelle.id) || parcelle.fermeId">
                    <i class="fas fa-plus"></i>
                    {{parcellesEnAssignation.includes(parcelle.id) ? 'Assignation...' : 'Assigner'}}
                  </button>
                </div>
              </div>

              <div *ngIf="!parcellesDisponibles.length" class="text-center py-4">
                <p class="text-muted mb-0">Aucune parcelle disponible à assigner</p>
                <small class="text-muted">Toutes les parcelles sont déjà assignées à une ferme</small>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="assignationModalVisible = false">
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .parcelle-color {
      border-radius: 4px;
      min-width: 8px;
    }

    .badge.bg-warning {
      font-size: 0.7rem;
      padding: 4px 8px;
    }

    .list-group-item {
      transition: all 0.2s;
    }

    .list-group-item:hover {
      background-color: #f8f9fa;
    }
  `]
})
export class FermeDetailsComponent implements OnInit {
  ferme: FermeDetail | null = null;
  fermeId!: number;
  parcellesEnCoursChargement = false;

  assignationModalVisible = false;
  searchParcelle = '';
  parcellesDisponibles: Parcelle[] = [];
  toutesParcelles: Parcelle[] = [];
  parcellesEnAssignation: number[] = [];



  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fermeService: FermeService,
    private parcelleService: ParcelleService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.fermeId = +params['id'];
      this.chargerDetails();
    });
  }

  chargerDetails(): void {
    this.fermeService.getFermeWithParcelles(this.fermeId).subscribe({
      next: (ferme) => {
        this.ferme = ferme;
        this.chargerToutesParcelles();
      },
      error: (error) => {
        console.error('Erreur chargement ferme:', error);
      }
    });
  }

  chargerToutesParcelles(): void {
    // Récupérer toutes les parcelles ou filtrer par agriculteur
    this.parcelleService.getAllParcelles().subscribe({
      next: (parcelles) => {
        // Filtrer pour ne montrer que les parcelles du même agriculteur
        if (this.ferme) {
          this.toutesParcelles = parcelles.filter(p => p.agriculteurId === this.ferme?.agriculteurId);
        } else {
          this.toutesParcelles = parcelles;
        }
        this.filtrerParcellesDisponibles();
      },
      error: (error) => {
        console.error('Erreur chargement parcelles:', error);
      }
    });
  }

  filtrerParcellesDisponibles(): void {
    const idsDansFerme = new Set(this.ferme?.parcelles?.map(p => p.id) || []);

    this.parcellesDisponibles = this.toutesParcelles.filter(p =>
      !idsDansFerme.has(p.id) &&
      (!this.searchParcelle || p.nom.toLowerCase().includes(this.searchParcelle.toLowerCase()))
    );
  }

  gererAssignation(): void {
    this.assignationModalVisible = true;
    this.searchParcelle = '';
    this.parcellesEnCoursChargement = true;

    // Recharger les parcelles avant d'ouvrir le modal
    this.chargerToutesParcelles();

    setTimeout(() => {
      this.parcellesEnCoursChargement = false;
    }, 500);
  }

  // components/fermes/ferme-details.component.ts
  assignerParcelle(parcelleId: number): void {
    console.log('Assignation parcelle:', parcelleId, 'à ferme:', this.fermeId);

    this.parcellesEnAssignation.push(parcelleId);

    this.fermeService.assignerParcelles(this.fermeId, [parcelleId]).subscribe({
      next: () => {
        console.log('Parcelle assignée avec succès');
        this.chargerDetails(); // Recharger les détails
        this.parcellesEnAssignation = this.parcellesEnAssignation.filter(id => id !== parcelleId);
        // Ne pas fermer le modal immédiatement pour permettre d'assigner plusieurs parcelles
        // this.assignationModalVisible = false;

        // Afficher un message de succès
        alert('Parcelle assignée avec succès !');
      },
      error: (error) => {
        console.error('Erreur assignation parcelle:', error);
        console.error('Détails:', error.error);

        // Afficher l'erreur spécifique
        if (error.error && error.error.error) {
          alert(`Erreur: ${error.error.error}`);
        } else if (error.error && typeof error.error === 'string') {
          alert(`Erreur: ${error.error}`);
        } else {
          alert('Erreur lors de l\'assignation de la parcelle');
        }

        this.parcellesEnAssignation = this.parcellesEnAssignation.filter(id => id !== parcelleId);
      }
    });
  }

  retirerParcelle(parcelleId: number): void {
    if (confirm('Voulez-vous retirer cette parcelle de la ferme ?')) {
      this.fermeService.retirerParcelle(this.fermeId, parcelleId).subscribe({
        next: () => {
          this.chargerDetails();
        },
        error: (error) => {
          console.error('Erreur retrait parcelle:', error);
        }
      });
    }
  }
}
