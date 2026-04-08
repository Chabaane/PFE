// components/dashboard/dashboard.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '../../services/api/auth.service';
import { ChatComponent } from '../chat/chat.component';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink , ChatComponent],
  template: `
    <div class="app-background">
      <div class="app-container">
        <!-- Navbar -->
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow">
          <div class="container">
           <li class="nav-item">
              <a class="nav-link" routerLink="/agriculteurs" routerLinkActive="active">
                <img src="assets/images/logo-light.png" alt="Agriculteurs" class="nav-logo">
              </a>
            </li>

            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
              <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse" id="navbarNav">

      <!-- Menu principal -->
      <ul class="navbar-nav ms-auto align-items-center gap-2">

        <li class="nav-item">
          <a class="nav-link" routerLink="/agriculteurs" routerLinkActive="active">
            <i class="bi bi-person-fill me-1"></i> Agriculteurs
          </a>
        </li>

        <li class="nav-item">
          <a class="nav-link" routerLink="/fermes" routerLinkActive="active">
            <i class="bi bi-house-door-fill me-1"></i> Fermes
          </a>
        </li>

        <li class="nav-item">
          <a class="nav-link" routerLink="/parcelles/:agriculteurId" routerLinkActive="active">
            <i class="bi bi-geo-alt-fill me-1"></i> Parcelles
          </a>
        </li>

        <li class="nav-item">
          <a class="nav-link" routerLink="/vue-satellite" routerLinkActive="active">
            <i class="bi bi-globe me-1"></i> Vue Satellite
          </a>
        </li>

        <li class="nav-item">
          <a class="nav-link" routerLink="/diagnostic" routerLinkActive="active">
            <i class="bi bi-cloud-sun-fill me-1"></i> Agroclimatique
          </a>
        </li>

        <!-- Dropdown utilisateur -->
        <li class="nav-item dropdown ms-3" *ngIf="isAuthenticated">
          <a class="nav-link dropdown-toggle d-flex align-items-center"
             href="#"
             data-bs-toggle="dropdown">

            <!-- Avatar -->
            <div class="avatar me-2">
              {{ getUserName()?.charAt(0) }}
            </div>

            {{ getUserName() }}

            <span *ngIf="isAdmin()" ></span>
          </a>

          <ul class="dropdown-menu dropdown-menu-end premium-dropdown">
            <li>
              <a class="dropdown-item" routerLink="/profile">
                <i class="bi bi-person me-2"></i> Mon profil
              </a>
            </li>

            <li>
              <a class="dropdown-item" routerLink="/tableau-de-bord">
                <i class="bi bi-speedometer2 me-2 text-info"></i> Tableau de bord
              </a>
            </li>

            <li *ngIf="isAdmin()">
              <a class="dropdown-item" routerLink="/admin">
                <i class="bi bi-shield-lock me-2"></i> Admin
              </a>
            </li>

            <li><hr class="dropdown-divider"></li>

            <li>
              <a class="dropdown-item text-danger" (click)="logout()">
                <i class="bi bi-box-arrow-right me-2"></i> Déconnexion
              </a>
            </li>
          </ul>
        </li>

      </ul>
    </div>
          </div>
        </nav>

        <!-- Main Content -->
        <main class="container mt-4">
          <router-outlet></router-outlet>
        </main>


        <!-- Chat widget flottant en bas à droite -->
        <app-chat></app-chat>

      </div>

      <!-- Footer -->
      <footer class="mt-5 py-4 bg-dark border-top">
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


    footer {
      margin-top: auto;
    }

    .app-background {
      min-height: 100vh;
      background:
        linear-gradient(rgba(37, 40, 37, 0.85), rgba(52, 80, 52, 0.9)),
        url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
      background-repeat: no-repeat;
      display: flex;
      flex-direction: column;
    }
    .nav-logo {
    height: 50px;  /* Ajustez selon la taille désirée */
    width: auto;
    vertical-align: middle;
}

    /* Optionnel : si vous voulez un effet au survol */
    .nav-link:hover .nav-logo {
        opacity: 0.8;
        transition: opacity 0.3s ease;
    }
    .custom-navbar {
    background: linear-gradient(90deg, #1e3c2f, #2e5e4e);
    padding: 10px 20px;
}

.navbar-brand {
    font-size: 1.3rem;
    letter-spacing: 1px;
}

.nav-link {
    margin-left: 15px;
    font-weight: 500;
    transition: all 0.3s ease;
}

.nav-link:hover {
    color: #4caf50 !important;
    transform: translateY(-2px);
}

.nav-link.active {
    color: #4caf50 !important;
    border-bottom: 2px solid #4caf50;
}

.nav-icon {
    margin-right: 6px;
    font-size: 18px;
}
   ////
   /* Navbar Glass Effect */
.premium-navbar {
  background: rgba(30, 60, 47, 0.85);
  backdrop-filter: blur(10px);
  padding: 10px 25px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  z-index: 1000;
}

/* Nav links */
.navbar-nav .nav-link {
  padding: 8px 15px;
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.navbar-nav .nav-link:hover {
  background-color: rgba(255,255,255,0.08);
  transform: translateY(-2px);
}

.navbar-nav .nav-link.active {
  background-color: rgba(76, 175, 80, 0.2);
  color: #4caf50 !important;
}

/* Avatar rond */
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 14px;
}

/* Dropdown premium */
.premium-dropdown {
  border-radius: 15px;
  border: none;
  padding: 8px 0;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  animation: fadeDropdown 0.2s ease-in-out;
}

.dropdown-item {
  padding: 10px 20px;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  background-color: rgba(76,175,80,0.1);
}

.dropdown-item.text-danger:hover {
  background-color: rgba(220,53,69,0.1);
}

/* Animation */
@keyframes fadeDropdown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

   ///
  `]
})
export class DashboardComponent {
  constructor(private authService: AuthService) {}

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  getUserName(): string {
    const user = (this.authService as any).currentUserSubject?.value;
    return user?.prenom || 'Utilisateur';
  }

  logout(): void {
    this.authService.logout();
    window.location.href = '/auth/login';
  }
}
