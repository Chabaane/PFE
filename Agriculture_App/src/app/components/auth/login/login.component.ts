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
    <div class="login-page">
      <div class="login-wrapper">
        <!-- Section Image (Gauche) -->
        <div class="login-aside">
          <div class="aside-bg"></div>
          <div class="aside-overlay">
            <div class="brand">
              <div class="brand-logo">
                <img
                  src="assets/images/logo-light.png"
                  alt="AgriManager Logo"
                  class="logo-img"
                >
              </div>
            </div>
            <div class="aside-footer">
              <h3 class="fade-in-up">Cultivons l'avenir ensemble</h3>
              <p class="fade-in-up delay-1">La plateforme intelligente pour la gestion de vos exploitations agricoles et le suivi de vos récoltes en temps réel.</p>
            </div>
          </div>
        </div>

        <!-- Section Formulaire (Droite) -->
        <div class="login-main">
          <div class="login-container">
            <div class="login-header">
              <h1>Connexion</h1>
              <p class="welcome-text">Heureux de vous revoir ! Veuillez vous connecter à votre compte.</p>
            </div>

            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
              <div class="form-group">
                <label for="email" class="form-label">Email</label>
                <div class="input-wrapper">
                  <span class="input-icon">✉️</span>
                  <input
                    type="email"
                    id="email"
                    formControlName="email"
                    class="form-control"
                    [class.is-invalid]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched"
                    placeholder="nom@exemple.com">
                </div>
                <div *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched" class="error-messages">
                  <small *ngIf="loginForm.get('email')?.errors?.['required']" class="text-danger">L'email est requis</small>
                  <small *ngIf="loginForm.get('email')?.errors?.['email']" class="text-danger">Format email invalide</small>
                </div>
              </div>

              <div class="form-group">
                <label for="motDePasse" class="form-label">Mot de passe</label>
                <div class="input-wrapper">
                  <span class="input-icon">🔒</span>
                  <input
                    [type]="showPassword ? 'text' : 'password'"
                    id="motDePasse"
                    formControlName="motDePasse"
                    class="form-control"
                    [class.is-invalid]="loginForm.get('motDePasse')?.invalid && loginForm.get('motDePasse')?.touched"
                    placeholder="Votre mot de passe">
                  <button type="button" class="password-toggle" (click)="togglePasswordVisibility()">
                    {{ showPassword ? '👁️' : '👁️‍🗨️' }}
                  </button>
                </div>
                <div *ngIf="loginForm.get('motDePasse')?.invalid && loginForm.get('motDePasse')?.touched" class="error-messages">
                  <small *ngIf="loginForm.get('motDePasse')?.errors?.['required']" class="text-danger">Mot de passe requis</small>
                </div>
              </div>

              <div class="form-options">
                <label class="remember-me">
                  <input type="checkbox" formControlName="rememberMe">
                  <span>Se souvenir de moi</span>
                </label>
                <a (click)="forgotPassword()" class="forgot-link">Mot de passe oublié ?</a>
              </div>

              <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>

              <button type="submit" class="btn-submit" [disabled]="loginForm.invalid || isLoading">
                <span *ngIf="isLoading" class="loader"></span>
                {{ isLoading ? 'Connexion en cours...' : 'Se connecter' }}
              </button>

              <div class="register-section">
                <p>Pas encore de compte ? <a routerLink="/auth/register" class="register-link">S'inscrire gratuitement</a></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100%;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .login-page {
      height: 100vh;
      width: 100%;
      display: flex;
      background: #ffffff;
    }

    .login-wrapper {
      display: flex;
      width: 100%;
      height: 100%;
    }

    /* --- SECTION GAUCHE (IMAGE) --- */
    .login-aside {
      flex: 1.2;
      position: relative;
      overflow: hidden;
      display: none;
    }

    @media (min-width: 992px) {
      .login-aside { display: block; }
    }

    .aside-bg {
      position: absolute;
      inset: 0;
      background-image: url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop');
      background-size: cover;
      background-position: center;
      z-index: 1;
    }

    .aside-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(45, 90, 39, 0.75) 0%, rgba(26, 46, 26, 0.6) 100%);
      z-index: 2;
      padding: 60px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: white;
    }

    .brand {
      margin-top: -20px;
    }

    .logo-img {
      width: 280px; /* Taille ajustée pour être plus élégante */
      height: auto;
      object-fit: contain;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
    }

    .aside-footer h3 {
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 20px;
      line-height: 1.1;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .aside-footer p {
      font-size: 19px;
      opacity: 0.95;
      line-height: 1.6;
      max-width: 480px;
    }

    /* --- SECTION DROITE (FORMULAIRE) --- */
    .login-main {
      flex: 1;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .login-container {
      width: 100%;
      max-width: 420px;
      animation: fadeInRight 0.8s ease-out;
    }

    @keyframes fadeInRight {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .login-header h1 {
      font-size: 36px;
      color: #1a2e1a;
      margin-bottom: 12px;
      font-weight: 800;
      letter-spacing: -1px;
    }
    .welcome-text { color: #64748b; margin-bottom: 45px; font-size: 16px; }

    .form-group { margin-bottom: 24px; }
    .form-label {
      display: block;
      font-weight: 600;
      margin-bottom: 10px;
      color: #334155;
      font-size: 14px;
    }

    .input-wrapper { position: relative; }
    .input-icon {
      position: absolute;
      left: 18px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      opacity: 0.6;
    }

    .form-control {
      width: 100%;
      padding: 16px 16px 16px 52px;
      border: 2px solid #f1f5f9;
      background: #f8fafc;
      border-radius: 14px;
      font-size: 15px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-sizing: border-box;
      color: #1e293b;
    }

    .form-control:focus {
      outline: none;
      border-color: #2d5a27;
      background: white;
      box-shadow: 0 10px 15px -3px rgba(45, 90, 39, 0.1);
    }

    .form-control.is-invalid { border-color: #ef4444; background: #fffafb; }

    .password-toggle {
      position: absolute;
      right: 18px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      opacity: 0.6;
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 30px 0;
      font-size: 14px;
    }

    .remember-me {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      color: #475569;
      font-weight: 500;
    }
    .remember-me input {
      width: 18px;
      height: 18px;
      accent-color: #2d5a27;
      cursor: pointer;
    }

    .forgot-link {
      color: #2d5a27;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
    }

    .btn-submit {
      width: 100%;
      padding: 18px;
      background: #2d5a27;
      color: white;
      border: none;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      box-shadow: 0 4px 6px -1px rgba(45, 90, 39, 0.2);
    }

    .btn-submit:hover:not(:disabled) {
      background: #1e3a1a;
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(45, 90, 39, 0.2);
    }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    .register-section {
      text-align: center;
      margin-top: 35px;
      padding-top: 25px;
      border-top: 1px solid #f1f5f9;
    }
    .register-section p { color: #64748b; font-size: 15px; }
    .register-link { color: #2d5a27; font-weight: 700; text-decoration: none; margin-left: 5px; }

    .alert-error {
      background: #fff1f2;
      color: #be123c;
      padding: 14px;
      border-radius: 10px;
      margin-bottom: 25px;
      font-size: 14px;
      border: 1px solid #ffe4e6;
    }

    .loader {
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .fade-in-up {
      animation: fadeInUp 1s ease-out forwards;
      opacity: 0;
    }
    .delay-1 { animation-delay: 0.3s; }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
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

  onSubmit(): void {
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

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/agriculteurs']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.status === 401 ? 'Email ou mot de passe incorrect' : 'Une erreur est survenue';
        this.loginForm.get('motDePasse')?.reset();
      },
      complete: () => this.isLoading = false
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  forgotPassword(): void {
    alert('Fonctionnalité à venir !');
  }
}
