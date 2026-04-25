// components/dashboard/dashboard.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '../../services/api/auth.service';
import { ChatComponent } from '../chat/chat.component';
import { LanguageSwitcherComponent } from 'src/app/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, ChatComponent, LanguageSwitcherComponent],
  template: `
    <div class="app-wrapper">
      <!-- Navbar largeur normale (container, pas container-fluid) -->
      <nav class="navbar navbar-expand-lg navbar-dark fixed-top shadow">
        <div class="container">
          <!-- Logo -->
          <a class="navbar-brand" routerLink="/agriculteurs">
            <img src="assets/images/logo-light.png" alt="AgriManager" class="nav-logo">
          </a>

          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar">
            <span class="navbar-toggler-icon"></span>
          </button>

          <div class="collapse navbar-collapse" id="mainNavbar">
            <ul class="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center gap-2">
              <li class="nav-item">
                <a class="nav-link" routerLink="/marketplace" routerLinkActive="active">
                  <i class="bi bi-shop me-1"></i>
                  AgriShop
                </a>
              </li>



              <!-- Liens de navigation : icône toujours visible, texte au survol -->
              <li class="nav-item">
                <a class="nav-link" routerLink="/agriculteurs" routerLinkActive="active">
                  <i class="bi bi-person-fill me-1"></i>
                  <span class="nav-text">Agriculteurs</span>
                </a>
              </li>

              <li class="nav-item">
                <a class="nav-link" routerLink="/fermes" routerLinkActive="active">
                  <i class="bi bi-house-door-fill me-1"></i>
                  <span class="nav-text">Fermes</span>
                </a>
              </li>

              <li class="nav-item">
                <a class="nav-link" routerLink="/parcelles/:agriculteurId" routerLinkActive="active">
                  <i class="bi bi-geo-alt-fill me-1"></i>
                  <span class="nav-text">Parcelles</span>
                </a>
              </li>

             <li class="nav-item">
                <a class="nav-link" routerLink="/vue-satellite" routerLinkActive="active">
                  <i class="bi bi-map-fill me-1"></i>
                  <span class="nav-text">Vue Satellite</span>
                </a>
              </li>

              <li class="nav-item">
                <a class="nav-link" routerLink="/diagnostic" routerLinkActive="active">
                  <i class="bi bi-cloud-sun-fill me-1"></i>
                  <span class="nav-text">Agroclimatique</span>
                </a>
              </li>

             <li class="nav-item">
                <a class="nav-link" routerLink="/leaf-scan" routerLinkActive="active">
                  <i class="bi bi-search me-1"></i>
                  <span class="nav-text">Scan Feuilles</span>
                </a>
              </li>


              <!-- Sélecteur de langue (comportement normal) -->
              <li class="nav-item">
                <app-language-switcher></app-language-switcher>
              </li>

              <!-- Dropdown utilisateur (comportement normal) -->
              <li class="nav-item dropdown" *ngIf="isAuthenticated">
                <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" data-bs-toggle="dropdown">
                  <div class="avatar me-2">{{ getUserName()?.charAt(0) }}</div>

                </a>
                <ul class="dropdown-menu dropdown-menu-end premium-dropdown">
                  <li><a class="dropdown-item" routerLink="/profile"><i class="bi bi-person me-2"></i> Mon profil</a></li>
                  <li><a class="dropdown-item" routerLink="/tableau-de-bord"><i class="bi bi-speedometer2 me-2 text-info"></i> Tableau de bord</a></li>
                  <li><a class="dropdown-item" routerLink="/admin/users"><i class="bi bi-shield-lock me-2"></i> Admin</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-danger" (click)="logout()"><i class="bi bi-box-arrow-right me-2"></i> Déconnexion</a></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main class="main-content">
        <div class="container mt-4 pt-2">
          <router-outlet></router-outlet>
        </div>
      </main>

      <app-chat></app-chat>

      <footer class="footer mt-auto py-3 bg-dark text-white text-center">
        <div class="container">
          <p class="mb-0">AgricultureApp &copy; 2024 - Gestion des parcelles agricoles Offline/Online</p>
          <small>Développé avec Angular 17+ et .NET 8</small>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    /* Structure globale */
    .app-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(rgba(37, 40, 37, 0.85), rgba(52, 80, 52, 0.9)),
                  url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80');
      background-size: cover;
      background-position: center;
      background-attachment: fixed;
    }

    /* Navbar fixe, largeur normale (grâce au .container) */
    .navbar {
      background: rgba(30, 30, 30, 0.9);
      backdrop-filter: blur(12px);
      padding: 0.5rem 0;
      z-index: 1030;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .nav-logo {
      height: 45px;
      width: auto;
      transition: opacity 0.2s;
    }
    .nav-logo:hover { opacity: 0.8; }

    /* Liens de navigation : texte masqué par défaut */
    .navbar-nav .nav-link {
      color: #f0f0f0 !important;
      padding: 0.5rem 0.8rem;
      border-radius: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    /* Augmentation de la taille des icônes de la navbar */
    .navbar-nav .nav-link i {
      font-size: 1.4rem;  /* Ajustez selon vos préférences */
    }
    .navbar-nav .nav-link:hover {
      background-color: rgba(255,255,255,0.1);
      transform: translateY(-2px);
      color: #4caf50 !important;
    }
    .navbar-nav .nav-link.active {
      background-color: rgba(76, 175, 80, 0.2);
      color: #4caf50 !important;
    }

    /* Texte du lien : invisible par défaut, apparaît au survol */
    .nav-text {
      display: inline-block;
      max-width: 0;
      overflow: hidden;
      white-space: nowrap;
      transition: max-width 0.3s ease;
      vertical-align: middle;
    }
    .nav-link:hover .nav-text {
      max-width: 100px; /* assez large pour le texte le plus long */
    }

    /* Avatar utilisateur */
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      font-size: 14px;
    }

    /* Dropdown */
    .premium-dropdown {
      border-radius: 16px;
      border: none;
      padding: 8px 0;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      background: #fff;
    }
    .dropdown-item {
      padding: 8px 20px;
      transition: background 0.15s;
    }
    .dropdown-item:hover {
      background-color: rgba(76,175,80,0.1);
    }
    .dropdown-item.text-danger:hover {
      background-color: rgba(220,53,69,0.1);
    }

    /* Contenu principal */
    .main-content {
      flex: 1;
      margin-top: 70px;
    }

    /* Footer */
    .footer {
      background: rgba(30, 30, 30, 0.9);
      backdrop-filter: blur(4px);
      font-size: 0.85rem;
    }

    /* Responsive : sur mobile, le texte reste visible (pas de hover) */
    @media (max-width: 991px) {
      .navbar-nav {
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        gap: 6px;
      }
      .nav-item {
        width: 100%;
        text-align: center;
      }
      .main-content {
        margin-top: 60px;
      }
      .nav-text {
        max-width: 100px !important;
      }
    }

    /* Suppression d'éventuels textes parasites */
    app-language-switcher::before,
    app-language-switcher::after {
      content: none !important;
      display: none !important;
    }
  `]
})
export class DashboardComponent {
  constructor(private authService: AuthService) {}

  hasPermission(permission: string): boolean {
    return this.authService.hasPermission(permission);
  }
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
