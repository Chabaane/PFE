// components/auth/register/register.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, RegisterDto } from '../../../services/api/auth.service';
import { RouterModule } from '@angular/router';

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
    <div class="register-page">
      <div class="register-wrapper">
        <!-- Section Image (Gauche) -->
        <div class="register-aside">
          <div class="aside-bg"></div>
          <div class="aside-overlay">
            <div class="brand">
              <img src="assets/images/logo-light.png" alt="AgriManager Logo" class="logo-img">
            </div>
            <div class="aside-footer">
              <h3 class="fade-in-up">Rejoignez la communauté</h3>
              <p class="fade-in-up delay-1">Optimisez vos rendements et gérez vos ressources avec précision grâce à nos outils d'analyse avancés.</p>
            </div>
          </div>
        </div>

        <!-- Section Formulaire (Droite) -->
        <div class="register-main">
          <div class="register-container">
            <div class="register-header">
              <h1>Créer un compte</h1>
              <p class="welcome-text">Commencez votre aventure avec AgriManager dès aujourd'hui.</p>
            </div>

            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
              <div class="form-row">
                <div class="form-group">
                  <label for="nom" class="form-label">Nom</label>
                  <input type="text" id="nom" formControlName="nom" class="form-control" placeholder="Nom">
                  <div *ngIf="registerForm.get('nom')?.invalid && registerForm.get('nom')?.touched" class="error-messages">
                    <small class="text-danger">Requis</small>
                  </div>
                </div>
                <div class="form-group">
                  <label for="prenom" class="form-label">Prénom</label>
                  <input type="text" id="prenom" formControlName="prenom" class="form-control" placeholder="Prénom">
                  <div *ngIf="registerForm.get('prenom')?.invalid && registerForm.get('prenom')?.touched" class="error-messages">
                    <small class="text-danger">Requis</small>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="email" class="form-label">Email</label>
                <div class="input-wrapper">
                  <span class="input-icon">✉️</span>
                  <input type="email" id="email" formControlName="email" class="form-control with-icon" placeholder="votre@email.com">
                </div>
                <div *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="error-messages">
                  <small *ngIf="registerForm.get('email')?.errors?.['required']" class="text-danger">L'email est requis</small>
                  <small *ngIf="registerForm.get('email')?.errors?.['email']" class="text-danger">Email invalide</small>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="motDePasse" class="form-label">Mot de passe</label>
                  <div class="input-wrapper">
                    <input [type]="showPassword ? 'text' : 'password'" id="motDePasse" formControlName="motDePasse" class="form-control" placeholder="******">
                    <button type="button" class="password-toggle" (click)="showPassword = !showPassword">
                      {{ showPassword ? '👁️' : '👁️‍🗨️' }}
                    </button>
                  </div>
                </div>
                <div class="form-group">
                  <label for="confirmMotDePasse" class="form-label">Confirmation</label>
                  <div class="input-wrapper">
                    <input [type]="showPassword ? 'text' : 'password'" id="confirmMotDePasse" formControlName="confirmMotDePasse" class="form-control" placeholder="******">
                  </div>
                </div>
              </div>
              <div *ngIf="registerForm.get('confirmMotDePasse')?.errors?.['mismatch'] && registerForm.get('confirmMotDePasse')?.touched" class="error-messages mismatch-error">
                <small class="text-danger">Les mots de passe ne correspondent pas</small>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="telephone" class="form-label">Téléphone</label>
                  <input type="tel" id="telephone" formControlName="telephone" class="form-control" placeholder="06...">
                </div>
                <div class="form-group">
                  <label for="localisation" class="form-label">Localisation</label>
                  <input type="text" id="localisation" formControlName="localisation" class="form-control" placeholder="Région">
                </div>
              </div>

              <div class="form-group">
                <label for="role" class="form-label">Rôle</label>
                <div class="input-wrapper">
                  <select id="role" formControlName="role" class="form-control select-control">
                    <option value="">Sélectionnez un rôle</option>
                    <option value="AGRICULTEUR">Agriculteur</option>
                    <option value="AGENT">Agent agricole</option>
                    <option value="OBSERVATEUR">Observateur</option>
                  </select>
                </div>
                <div *ngIf="registerForm.get('role')?.invalid && registerForm.get('role')?.touched" class="error-messages">
                  <small class="text-danger">Le rôle est requis</small>
                </div>
              </div>

              <div *ngIf="errorMessage" class="alert-error">{{ errorMessage }}</div>
              <div *ngIf="successMessage" class="alert-success">{{ successMessage }}</div>

              <button type="submit" class="btn-submit" [disabled]="registerForm.invalid || isLoading">
                <span *ngIf="isLoading" class="loader"></span>
                {{ isLoading ? 'Création...' : 'Créer mon compte' }}
              </button>

              <div class="login-section">
                <p>Déjà un compte ? <a routerLink="/auth/login" class="register-link">Se connecter</a></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; width: 100%; font-family: 'Inter', 'Segoe UI', sans-serif; }
    .register-page { height: 100vh; width: 100%; display: flex; background: white; }
    .register-wrapper { display: flex; width: 100%; height: 100%; }

    /* --- GAUCHE --- */
    .register-aside { flex: 1; position: relative; overflow: hidden; display: none; }
    @media (min-width: 992px) { .register-aside { display: block; } }

    .aside-bg {
      position: absolute; inset: 0;
      background-image: url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2000&auto=format&fit=crop');
      background-size: cover; background-position: center; z-index: 1;
    }

    .aside-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(45, 90, 39, 0.8) 0%, rgba(26, 46, 26, 0.6) 100%);
      z-index: 2; padding: 60px; display: flex; flex-direction: column; justify-content: space-between; color: white;
    }

    .brand { margin-top: -20px; }
    .logo-img { width: 260px; height: auto; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.15)); }
    .aside-footer h3 { font-size: 42px; font-weight: 800; margin-bottom: 15px; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.2); }
    .aside-footer p { font-size: 18px; opacity: 0.95; line-height: 1.6; max-width: 460px; }

    /* --- DROITE --- */
    .register-main { flex: 1.2; background: white; display: flex; align-items: center; justify-content: center; padding: 40px; overflow-y: auto; }
    .register-container { width: 100%; max-width: 560px; padding: 20px 0; animation: fadeInRight 0.8s ease-out; }

    @keyframes fadeInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }

    .register-header { margin-bottom: 35px; }
    .register-header h1 { font-size: 36px; color: #1a2e1a; margin-bottom: 8px; font-weight: 800; letter-spacing: -1px; }
    .welcome-text { color: #64748b; font-size: 16px; }

    .form-row { display: flex; gap: 24px; margin-bottom: 4px; }
    .form-row .form-group { flex: 1; }

    .form-group { margin-bottom: 22px; position: relative; }
    .form-label { display: block; font-weight: 600; margin-bottom: 10px; color: #334155; font-size: 14px; }

    .input-wrapper { position: relative; width: 100%; }
    .input-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 18px; z-index: 2; opacity: 0.6; }

    .form-control {
      width: 100%; padding: 14px 16px; border: 2px solid #f1f5f9; background: #f8fafc;
      border-radius: 14px; font-size: 15px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-sizing: border-box; color: #1e293b;
    }
    .form-control.with-icon { padding-left: 48px; }
    .form-control:focus { outline: none; border-color: #2d5a27; background: white; box-shadow: 0 10px 15px -3px rgba(45, 90, 39, 0.1); }
    .form-control.is-invalid { border-color: #ef4444; background: #fffafb; }

    .select-control {
      cursor: pointer; appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 18px center; background-size: 18px;
    }

    .password-toggle { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 18px; opacity: 0.6; z-index: 2; }

    .error-messages { margin-top: 6px; position: absolute; bottom: -18px; }
    .mismatch-error { position: static; margin-bottom: 15px; }
    .text-danger { color: #ef4444; font-size: 12px; font-weight: 500; }

    .btn-submit {
      width: 100%; padding: 18px; background: #2d5a27; color: white; border: none; border-radius: 14px;
      font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.3s; margin-top: 15px;
      box-shadow: 0 4px 6px -1px rgba(45, 90, 39, 0.2);
    }
    .btn-submit:hover:not(:disabled) { background: #1e3a1a; transform: translateY(-2px); box-shadow: 0 20px 25px -5px rgba(45, 90, 39, 0.2); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    .login-section { text-align: center; margin-top: 35px; padding-top: 25px; border-top: 1px solid #f1f5f9; }
    .login-section p { color: #64748b; font-size: 15px; }
    .register-link { color: #2d5a27; font-weight: 700; text-decoration: none; margin-left: 5px; }
    .register-link:hover { text-decoration: underline; }

    .alert-error { background: #fff1f2; color: #be123c; padding: 14px; border-radius: 12px; margin-bottom: 25px; font-size: 14px; border: 1px solid #ffe4e6; font-weight: 500; }
    .alert-success { background: #f0fdf4; color: #15803d; padding: 14px; border-radius: 12px; margin-bottom: 25px; font-size: 14px; border: 1px solid #dcfce7; font-weight: 500; }

    .loader { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; vertical-align: middle; margin-right: 10px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .fade-in-up { animation: fadeInUp 1s ease-out forwards; opacity: 0; }
    .delay-1 { animation-delay: 0.3s; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class RegisterComponent {
  registerForm: FormGroup;
  showPassword = false;
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
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Compte créé avec succès ! Redirection...';
        setTimeout(() => this.router.navigate(['/agriculteurs']), 2000);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 409) {
          this.errorMessage = 'Cet email est déjà utilisé';
        } else {
          this.errorMessage = error.error?.message || 'Erreur lors de la création';
        }
      }
    });
  }
}
