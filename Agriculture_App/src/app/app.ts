import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AgriculteurService } from './services/api/agriculteur';
import { AuthService  } from './services/api/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  template: `
  <div class="app-background">
    <div class="app-container">
      <!-- Navbar -->
      <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow">
        <div class="container">
          <a class="navbar-brand fw-bold" routerLink="/">
            🌾 AgriManager
          </a>

          <div class="collapse navbar-collapse">
            <ul class="navbar-nav me-auto">
              <li class="nav-item">
                <a class="nav-link" routerLink="/agriculteurs" routerLinkActive="active">
                  👨‍🌾 Agriculteurs
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/meteo" routerLinkActive="active">
                  🏡 Fermes
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/synchronisation" routerLinkActive="active">
                   🗺️ Parcelles
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/diagnostic" routerLinkActive="active">
                  🛰️ Vue Satellite
                </a>
              </li>
              <ng-container *ngIf="!isAuthenticated; else authenticatedMenu">
      <a class="nav-link" routerLink="/login">Connexion</a>
      <a class="nav-link" routerLink="/register">Inscription</a>
    </ng-container>

    <ng-template #authenticatedMenu>
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
          👤 {{ (currentUser$ | async)?.prenom || 'Utilisateur' }}
        </a>
        <ul class="dropdown-menu">
          <li><a class="dropdown-item" routerLink="/profile">Mon profil</a></li>
          <li *ngIf="isAdmin"><a class="dropdown-item" routerLink="/admin">Admin</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" (click)="logout()">Déconnexion</a></li>
        </ul>
      </li>
    </ng-template>

            </ul>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="container mt-4">
        <router-outlet></router-outlet>
      </main>
</div>
      <!-- Footer -->
      <footer class="mt-5 py-4 bg-dark  border-top">
        <div class="container text-center text-white">
          <p class="mb-0">
            AgricultureApp &copy; 2024 - Gestion des parcelles agricoles Offline/Online
          </p>
          <small>Développé avec Angular 17+ et .NET 8</small>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    main {
      flex: 1;
    }

    .navbar-nav .nav-link.active {
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 5px;
    }

    footer {
      margin-top: auto;
    }
        .app-background {
      min-height: 100vh;
      background:
        /* Overlay vert très léger pour améliorer la lisibilité */
        linear-gradient(rgba(37, 40, 37, 0.85), rgba(52, 80, 52, 0.9)),
        /* Image d'agriculture */
        url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');

      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      background-repeat: no-repeat;
      display: flex;
      flex-direction: column;
    }


  `]
})
export class App {
  currentUser$ = this.authService.currentUser$;

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }



  constructor(private authService: AuthService, private agriculteurService: AgriculteurService) {}

  logout(): void {
    this.authService.logout();
    // Optionnel: rediriger vers la page de login
    window.location.href = '/login';
  }

  ngOnInit() {
    console.log('AgricultureApp initialisée');
  }
}
