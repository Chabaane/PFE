// components/auth/register/register.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, RegisterDto } from '../../../services/api/auth.service';
import { RouterModule } from '@angular/router';

// Validateur personnalisé pour vérifier la correspondance des mots de passe
function passwordMatchValidator(control: AbstractControl) {
  const password = control.get('motDePasse')?.value;
  const confirmPassword = control.get('confirmMotDePasse')?.value;

  if (password !== confirmPassword) {
    control.get('confirmMotDePasse')?.setErrors({ mismatch: true });
    return { mismatch: true };
  } else {
    control.get('confirmMotDePasse')?.setErrors(null);
    return null;
  }
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  template: `
    <div class="register-container">
  <div class="register-card">
    <!-- Register Header -->
    <div class="register-header">
      <h1>Créer un compte</h1>
      <p class="welcome-text">Rejoignez AgriManager pour gérer vos parcelles agricoles</p>
    </div>

    <!-- Register Form -->
    <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label for="nom" class="form-label">Nom *</label>
            <input
              type="text"
              id="nom"
              formControlName="nom"
              class="form-control"
              [class.is-invalid]="registerForm.get('nom')?.invalid && registerForm.get('nom')?.touched"
              placeholder="Votre nom">
            <div *ngIf="registerForm.get('nom')?.invalid && registerForm.get('nom')?.touched"
                 class="error-messages">
              <small class="text-danger">Le nom est requis</small>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="form-group">
            <label for="prenom" class="form-label">Prénom *</label>
            <input
              type="text"
              id="prenom"
              formControlName="prenom"
              class="form-control"
              [class.is-invalid]="registerForm.get('prenom')?.invalid && registerForm.get('prenom')?.touched"
              placeholder="Votre prénom">
            <div *ngIf="registerForm.get('prenom')?.invalid && registerForm.get('prenom')?.touched"
                 class="error-messages">
              <small class="text-danger">Le prénom est requis</small>
            </div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="email" class="form-label">Email *</label>
        <input
          type="email"
          id="email"
          formControlName="email"
          class="form-control"
          [class.is-invalid]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
          placeholder="exemple@email.com">
        <div *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched"
             class="error-messages">
          <small *ngIf="registerForm.get('email')?.errors?.['required']" class="text-danger">
            L'email est requis
          </small>
          <small *ngIf="registerForm.get('email')?.errors?.['email']" class="text-danger">
            Veuillez entrer un email valide
          </small>
        </div>
      </div>

      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label for="motDePasse" class="form-label">Mot de passe *</label>
            <div class="password-input-container">
              <input
                [type]="showPassword ? 'text' : 'password'"
                id="motDePasse"
                formControlName="motDePasse"
                class="form-control"
                [class.is-invalid]="registerForm.get('motDePasse')?.invalid && registerForm.get('motDePasse')?.touched"
                placeholder="Minimum 6 caractères">
              <button
                type="button"
                class="password-toggle"
                (click)="togglePasswordVisibility()">
                <span class="password-toggle-icon">{{ showPassword ? '👁️' : '👁️‍🗨️' }}</span>
              </button>
            </div>
            <div *ngIf="registerForm.get('motDePasse')?.invalid && registerForm.get('motDePasse')?.touched"
                 class="error-messages">
              <small *ngIf="registerForm.get('motDePasse')?.errors?.['required']" class="text-danger">
                Le mot de passe est requis
              </small>
              <small *ngIf="registerForm.get('motDePasse')?.errors?.['minlength']" class="text-danger">
                Minimum 6 caractères
              </small>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="form-group">
            <label for="confirmMotDePasse" class="form-label">Confirmer le mot de passe *</label>
            <input
              [type]="showConfirmPassword ? 'text' : 'password'"
              id="confirmMotDePasse"
              formControlName="confirmMotDePasse"
              class="form-control"
              [class.is-invalid]="registerForm.get('confirmMotDePasse')?.invalid && registerForm.get('confirmMotDePasse')?.touched"
              placeholder="Confirmez votre mot de passe">
            <div *ngIf="registerForm.get('confirmMotDePasse')?.invalid && registerForm.get('confirmMotDePasse')?.touched"
                 class="error-messages">
              <small *ngIf="registerForm.get('confirmMotDePasse')?.errors?.['required']" class="text-danger">
                La confirmation est requise
              </small>
              <small *ngIf="registerForm.get('confirmMotDePasse')?.errors?.['mismatch']" class="text-danger">
                Les mots de passe ne correspondent pas
              </small>
            </div>
          </div>
        </div>
      </div>

      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label for="telephone" class="form-label">Téléphone</label>
            <input
              type="tel"
              id="telephone"
              formControlName="telephone"
              class="form-control"
              placeholder="Votre numéro">
          </div>
        </div>

        <div class="col-md-6">
          <div class="form-group">
            <label for="localisation" class="form-label">Localisation</label>
            <input
              type="text"
              id="localisation"
              formControlName="localisation"
              class="form-control"
              placeholder="Votre région">
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="role" class="form-label">Rôle *</label>
        <select
          id="role"
          formControlName="role"
          class="form-control"
          [class.is-invalid]="registerForm.get('role')?.invalid && registerForm.get('role')?.touched">
          <option value="">Sélectionnez un rôle</option>
          <option value="AGRICULTEUR">Agriculteur</option>
          <option value="AGENT">Agent agricole</option>
          <option value="OBSERVATEUR">Observateur</option>
        </select>
        <div *ngIf="registerForm.get('role')?.invalid && registerForm.get('role')?.touched"
             class="error-messages">
          <small class="text-danger">Le rôle est requis</small>
        </div>
        <small class="text-muted d-block mt-2">
          Agriculteur: Gère ses propres données<br>
          Agent: Gère tous les agriculteurs<br>
          Observateur: Consultation seulement
        </small>
      </div>

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="alert alert-danger" role="alert">
        {{ errorMessage }}
      </div>

      <!-- Success Message -->
      <div *ngIf="successMessage" class="alert alert-success" role="alert">
        {{ successMessage }}
      </div>

      <!-- Register Button -->
      <div class="form-group mt-4">
        <button
          type="submit"
          class="btn btn-primary w-100 register-button"
          [disabled]="registerForm.invalid || isLoading">
          <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2"></span>
          {{ isLoading ? 'Création en cours...' : 'Créer mon compte' }}
        </button>
      </div>

      <!-- Login Link -->
      <div class="login-section text-center mt-3">
        <p class="mb-0">
          Vous avez déjà un compte ?
          <a routerLink="/auth/login" class="login-link">Se connecter</a>
        </p>
      </div>
    </form>
  </div>
</div>
  `,
  styles: [`
    /* Styles similaires au login avec quelques ajustements */
    .register-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }

    .register-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      padding: 40px;
      animation: fadeIn 0.5s ease-out;
    }

    .register-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .register-header h1 {
      color: #333;
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 10px;
    }

    /* Ajouter les styles nécessaires */
    .text-muted {
      color: #6c757d !important;
      font-size: 12px;
    }

    .alert-success {
      background-color: #d4edda;
      border-color: #c3e6cb;
      color: #155724;
      padding: 12px 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .register-button {
      background: linear-gradient(135deg, #1e1f24 0%, #4ba293 100%);
      border: none;
      padding: 14px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
      color: white;
    }

    .register-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(40, 167, 69, 0.4);
    }

    .login-link {
      color: #28a745;
      font-weight: 600;
      text-decoration: none;
    }

    .login-link:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  registerForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      confirmMotDePasse: ['', Validators.required],
      telephone: [''],
      localisation: [''],
      role: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      // Marquer tous les champs comme touchés
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const userData: RegisterDto = this.registerForm.value;

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Compte créé avec succès ! Redirection...';

        // Redirection après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/agriculteurs']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;

        if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Données invalides';
        } else if (error.status === 409) {
          this.errorMessage = 'Cet email est déjà utilisé';
        } else {
          this.errorMessage = 'Erreur lors de la création du compte';
        }
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
