// components/auth/register/register.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, RegisterDto } from '../../../services/api/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
          <div class="card shadow">
            <div class="card-header bg-dark text-white text-center">
              <h4>📝 Créer un compte</h4>
            </div>
            <div class="card-body">
              <form (ngSubmit)="onSubmit()" #registerForm="ngForm">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Nom *</label>
                    <input type="text" class="form-control"
                           [(ngModel)]="userData.nom"
                           name="nom"
                           required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Prénom *</label>
                    <input type="text" class="form-control"
                           [(ngModel)]="userData.prenom"
                           name="prenom"
                           required>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">Email *</label>
                  <input type="email" class="form-control"
                         [(ngModel)]="userData.email"
                         name="email"
                         required
                         email>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Mot de passe *</label>
                    <input type="password" class="form-control"
                           [(ngModel)]="userData.motDePasse"
                           name="motDePasse"
                           required
                           minlength="6">
                    <small class="text-muted">Minimum 6 caractères</small>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Confirmer le mot de passe *</label>
                    <input type="password" class="form-control"
                           [(ngModel)]="userData.confirmMotDePasse"
                           name="confirmMotDePasse"
                           required>
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Téléphone</label>
                    <input type="tel" class="form-control"
                           [(ngModel)]="userData.telephone"
                           name="telephone">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Localisation</label>
                    <input type="text" class="form-control"
                           [(ngModel)]="userData.localisation"
                           name="localisation">
                  </div>
                </div>

                <div class="mb-4">
                  <label class="form-label">Rôle *</label>
                  <select class="form-select"
                          [(ngModel)]="userData.role"
                          name="role"
                          required>
                    <option value="AGRICULTEUR">Agriculteur</option>
                    <option value="AGENT">Agent agricole</option>
                    <option value="OBSERVATEUR">Observateur</option>
                  </select>
                  <small class="text-muted">
                    Agriculteur: Gère ses propres données<br>
                    Agent: Gère tous les agriculteurs<br>
                    Observateur: Consultation seulement
                  </small>
                </div>

                <div *ngIf="error" class="alert alert-danger">
                  {{ error }}
                </div>

                <div *ngIf="success" class="alert alert-success">
                  {{ success }}
                </div>

                <div class="d-flex justify-content-between">
                  <button type="button" class="btn btn-outline-secondary" routerLink="/login">
                    ← Retour
                  </button>
                  <button type="submit" class="btn btn-dark" [disabled]="loading">
                    <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
                    S'inscrire
                  </button>
                </div>
              </form>
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

    .form-label {
      font-weight: 500;
    }

    small.text-muted {
      font-size: 0.85rem;
    }
  `]
})
export class RegisterComponent {
  userData: RegisterDto = {
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    confirmMotDePasse: '',
    telephone: '',
    localisation: '',
    role: 'AGRICULTEUR'
  };

  loading = false;
  error = '';
  success = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    // Validation
    if (this.userData.motDePasse !== this.userData.confirmMotDePasse) {
      this.error = 'Les mots de passe ne correspondent pas';
      return;
    }

    if (this.userData.motDePasse.length < 6) {
      this.error = 'Le mot de passe doit contenir au moins 6 caractères';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.register(this.userData).subscribe({
      next: (response) => {
        this.success = 'Compte créé avec succès ! Redirection...';
        setTimeout(() => {
          this.router.navigate(['/agriculteurs']);
        }, 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Erreur lors de la création du compte';
        this.loading = false;
      }
    });
  }
}
