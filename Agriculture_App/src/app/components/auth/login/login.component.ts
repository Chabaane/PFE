// components/auth/login/login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, LoginDto } from '../../../services/api/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  template: `
    <div class="login-container">
  <div class="login-card">
    <!-- Login Header -->
    <div class="login-header">
      <h1>Login</h1>
      <p class="welcome-text">Welcome back! Please login to your account.</p>
    </div>

    <!-- Login Form -->
    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
      <!-- Email Field -->
      <div class="form-group">
        <label for="email" class="form-label">Email</label>
        <input
          type="email"
          id="email"
          formControlName="email"
          class="form-control"
          [class.is-invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
          placeholder="Entrez votre email"
          autocomplete="email">

        <!-- Email Validation Messages -->
        <div *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
             class="error-messages">
          <small *ngIf="loginForm.get('email')?.errors?.['required']" class="text-danger">
            L'email est requis
          </small>
          <small *ngIf="loginForm.get('email')?.errors?.['email']" class="text-danger">
            Veuillez entrer un email valide
          </small>
        </div>
      </div>

      <!-- Password Field -->
      <div class="form-group">
        <label for="motDePasse" class="form-label">Mot de passe</label>
        <div class="password-input-container">
          <input
            [type]="showPassword ? 'text' : 'password'"
            id="motDePasse"
            formControlName="motDePasse"
            class="form-control"
            [class.is-invalid]="loginForm.get('motDePasse')?.invalid && loginForm.get('motDePasse')?.touched"
            placeholder="Entrez votre mot de passe"
            autocomplete="current-password">

          <button
            type="button"
            class="password-toggle"
            (click)="togglePasswordVisibility()">
            <span class="password-toggle-icon">{{ showPassword ? '👁️' : '👁️‍🗨️' }}</span>
          </button>
        </div>

        <!-- Password Validation Messages -->
        <div *ngIf="loginForm.get('motDePasse')?.invalid && loginForm.get('motDePasse')?.touched"
             class="error-messages">
          <small *ngIf="loginForm.get('motDePasse')?.errors?.['required']" class="text-danger">
            Le mot de passe est requis
          </small>
          <small *ngIf="loginForm.get('motDePasse')?.errors?.['minlength']" class="text-danger">
            Le mot de passe doit contenir au moins 6 caractères
          </small>
        </div>
      </div>

      <!-- Remember Me & Forgot Password -->
      <div class="form-options">
        <div class="remember-me">
          <input
            type="checkbox"
            id="rememberMe"
            formControlName="rememberMe"
            class="form-check-input">
          <label for="rememberMe" class="form-check-label">
            Se souvenir de moi
          </label>
        </div>

        <a href="javascript:void(0)" class="forgot-password-link" (click)="forgotPassword()">
          Mot de passe oublié ?
        </a>
      </div>

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="alert alert-danger" role="alert">
        {{ errorMessage }}
      </div>

      <!-- Login Button -->
      <button
        type="submit"
        class="btn btn-primary w-100 login-button"
        [disabled]="loginForm.invalid || isLoading">
        <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2"></span>
        {{ isLoading ? 'Connexion en cours...' : 'Se connecter' }}
      </button>

      <!-- Register Link -->
      <div class="register-section text-center mt-3">
        <p class="mb-0">
          Vous n'avez pas de compte ?
          <a routerLink="/auth/register" class="register-link">S'inscrire</a>
        </p>
      </div>
    </form>
  </div>
</div>
  `,
  styles: [`
    /* Main Container */
    .login-container {
      width: 100%;
      max-width: 420px;
      margin: 0 auto;
    }

    /* Login Card */
    .login-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      padding: 40px;
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Header */
    .login-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .login-header h1 {
      color: #333;
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .welcome-text {
      color: #666;
      font-size: 14px;
      margin: 0;
    }

    /* Form Groups */
    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      color: #333;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }

    /* Form Controls */
    .form-control {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.3s;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-control.is-invalid {
      border-color: #dc3545;
    }

    .form-control.is-invalid:focus {
      box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
    }

    /* Password Input Container */
    .password-input-container {
      position: relative;
    }

    .password-toggle {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 5px;
    }

    .password-toggle-icon {
      font-size: 16px;
    }

    /* Error Messages */
    .error-messages {
      margin-top: 5px;
    }

    .text-danger {
      color: #dc3545 !important;
      font-size: 12px;
    }

    /* Form Options */
    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
    }

    .remember-me {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-check-input {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .form-check-label {
      color: #666;
      font-size: 14px;
      cursor: pointer;
      user-select: none;
    }

    /* Forgot Password */
    .forgot-password-link {
      color: #667eea;
      font-size: 14px;
      text-decoration: none;
      transition: color 0.3s;
      cursor: pointer;
    }

    .forgot-password-link:hover {
      color: #764ba2;
      text-decoration: underline;
    }

    /* Alert */
    .alert-danger {
      background-color: #ffeaea;
      border-color: #ffcccc;
      color: #dc3545;
      padding: 12px 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    /* Login Button */
    .login-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      padding: 14px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
      color: white;
    }

    .login-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }

    .login-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    /* Register Section */
    .register-section {
      padding-top: 20px;
      border-top: 1px solid #eee;
    }

    .register-section p {
      color: #666;
      font-size: 14px;
    }

    .register-link {
      color: #667eea;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.3s;
    }

    .register-link:hover {
      color: #764ba2;
      text-decoration: underline;
    }

    /* Responsive Design */
    @media (max-width: 480px) {
      .login-card {
        padding: 30px 20px;
        margin: 0 15px;
      }

      .login-header h1 {
        font-size: 24px;
      }

      .form-options {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
      }

      .forgot-password-link {
        align-self: flex-end;
      }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  // Soumettre le formulaire
  onSubmit(): void {
    // Marquer tous les champs comme touchés pour afficher les erreurs
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials: LoginDto = {
      email: this.loginForm.value.email,
      motDePasse: this.loginForm.value.motDePasse
    };

    // Appel au service d'authentification
    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading = false;

        // Gérer "Se souvenir de moi"
        if (this.loginForm.value.rememberMe) {
          // Déjà géré par AuthService
        }

        // Redirection après login réussi
        this.router.navigate(['/agriculteurs']);
      },
      error: (error) => {
        this.isLoading = false;

        // Gérer différents types d'erreurs
        if (error.status === 401) {
          this.errorMessage = 'Email ou mot de passe incorrect';
        } else if (error.status === 0) {
          this.errorMessage = 'Erreur de connexion au serveur';
        } else {
          this.errorMessage = error.error?.message || 'Une erreur est survenue';
        }

        // Réinitialiser le mot de passe
        this.loginForm.get('motDePasse')?.reset();
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  // Afficher/cacher le mot de passe
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // Mot de passe oublié
  forgotPassword(): void {
    alert('Fonctionnalité de réinitialisation de mot de passe à venir !');
  }

  // Raccourci pour accéder aux contrôles du formulaire
  get email() {
    return this.loginForm.get('email');
  }

  get motDePasse() {
    return this.loginForm.get('motDePasse');
  }
}
