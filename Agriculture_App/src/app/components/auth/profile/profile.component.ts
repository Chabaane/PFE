// components/auth/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/api/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container mt-4">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
          <div class="card shadow">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h4 class="mb-0">👤 Mon Profil</h4>
              <span class="badge bg-secondary">{{ user?.role }}</span>
            </div>

            <div class="card-body">
              <!-- Loading -->
              <div *ngIf="loading" class="text-center py-5">
                <div class="spinner-border text-dark" role="status">
                  <span class="visually-hidden">Chargement...</span>
                </div>
                <p class="mt-2 text-muted">Chargement du profil...</p>
              </div>

              <!-- Error -->
              <div *ngIf="error && !loading" class="alert alert-danger">
                {{ error }}
              </div>

              <!-- Profile Info -->
              <div *ngIf="user && !loading">
                <div class="row mb-4">
                  <div class="col-md-4 text-center">
                    <div class="profile-avatar bg-dark text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                         style="width: 100px; height: 100px; font-size: 2.5rem;">
                      {{ user.prenom?.charAt(0) }}{{ user.nom?.charAt(0) }}
                    </div>
                    <h5>{{ user.prenom }} {{ user.nom }}</h5>
                  </div>

                  <div class="col-md-8">
                    <div class="row">
                      <div class="col-12 mb-3">
                        <label class="form-label fw-bold">Email</label>
                        <p class="form-control-plaintext">{{ user.email }}</p>
                      </div>

                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Téléphone</label>
                        <p class="form-control-plaintext">{{ user.telephone || 'Non renseigné' }}</p>
                      </div>

                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Localisation</label>
                        <p class="form-control-plaintext">{{ user.localisation || 'Non renseignée' }}</p>
                      </div>

                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Rôle</label>
                        <p class="form-control-plaintext">
                          <span class="badge" [ngClass]="getRoleBadgeClass(user.role)">
                            {{ user.role }}
                          </span>
                        </p>
                      </div>

                      <div class="col-md-6 mb-3">
                        <label class="form-label fw-bold">Membre depuis</label>
                        <p class="form-control-plaintext">
                          {{ user.dateCreation | date:'dd/MM/yyyy' }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Agriculteur Info -->
                <div *ngIf="user.agriculteur" class="border-top pt-4 mt-4">
                  <h5 class="mb-3">📋 Informations Agriculteur</h5>
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold">ID Agriculteur</label>
                      <p class="form-control-plaintext">{{ user.agriculteur.idAgriculteur }}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold">Statut</label>
                      <p class="form-control-plaintext">
                        <span class="badge bg-success">Actif</span>
                      </p>
                    </div>
                  </div>
                  <div class="mt-3">
                    <a [routerLink]="['/agriculteurs/modifier', user.agriculteur.idAgriculteur]"
                       class="btn btn-outline-dark btn-sm me-2">
                      <i class="fas fa-edit me-1"></i>Modifier profil agriculteur
                    </a>
                    <a [routerLink]="['/parcelles', user.agriculteur.idAgriculteur]"
                       class="btn btn-outline-dark btn-sm">
                      <i class="fas fa-map me-1"></i>Voir mes parcelles
                    </a>
                  </div>
                </div>

                <!-- Stats -->
                <div class="border-top pt-4 mt-4">
                  <h5 class="mb-3">📊 Statistiques</h5>
                  <div class="row">
                    <div class="col-md-3 mb-3">
                      <div class="card text-center border-0 bg-light">
                        <div class="card-body">
                          <h2 class="text-dark">0</h2>
                          <small class="text-muted">Parcelles</small>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-3 mb-3">
                      <div class="card text-center border-0 bg-light">
                        <div class="card-body">
                          <h2 class="text-dark">0</h2>
                          <small class="text-muted">Diagnostics</small>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-3 mb-3">
                      <div class="card text-center border-0 bg-light">
                        <div class="card-body">
                          <h2 class="text-dark">0</h2>
                          <small class="text-muted">Synchronisations</small>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-3 mb-3">
                      <div class="card text-center border-0 bg-light">
                        <div class="card-body">
                          <h2 class="text-dark">1</h2>
                          <small class="text-muted">Année</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="border-top pt-4 mt-4">
                  <div class="d-flex justify-content-between">
                    <button class="btn btn-outline-secondary" routerLink="/agriculteurs">
                      ← Retour
                    </button>
                    <div>
                      <button class="btn btn-outline-dark me-2" (click)="refreshProfile()" [disabled]="loading">
                        <i class="fas fa-sync-alt" [class.fa-spin]="loading"></i> Actualiser
                      </button>
                      <button class="btn btn-dark" (click)="editProfile()">
                        <i class="fas fa-edit me-1"></i> Modifier le profil
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      border-radius: 10px;
      border: none;
    }

    .card-header {
      border-radius: 10px 10px 0 0 !important;
    }

    .profile-avatar {
      background: linear-gradient(135deg, #343a40 0%, #212529 100%);
    }

    .form-control-plaintext {
      padding: 0.375rem 0;
      min-height: 38px;
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: any = null;
  loading = false;
  error = '';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.error = '';

    this.authService.getProfile().subscribe({
      next: (data) => {
        this.user = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement du profil';
        this.loading = false;
        console.error(err);
      }
    });
  }

  refreshProfile(): void {
    this.loadProfile();
  }

  editProfile(): void {
    // À implémenter : modifier le profil
    alert('Fonctionnalité de modification à implémenter');
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'bg-danger';
      case 'AGENT': return 'bg-primary';
      case 'AGRICULTEUR': return 'bg-success';
      case 'OBSERVATEUR': return 'bg-info';
      default: return 'bg-secondary';
    }
  }
}
