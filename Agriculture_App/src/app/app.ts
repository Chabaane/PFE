import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AgriculteurService } from './services/api/agriculteur';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  template: `
    <div class="app-container">
      <!-- Navbar -->
      <nav class="navbar navbar-expand-lg navbar-dark bg-success shadow">
        <div class="container">
          <a class="navbar-brand fw-bold" routerLink="/">
            🌾 AgricultureApp
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
                  ⛅ Météo
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/diagnostic" routerLinkActive="active">
                  🛰️ Diagnostic
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" routerLink="/synchronisation" routerLinkActive="active">
                  🔄 Synchronisation
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="container mt-4">
        <router-outlet></router-outlet>
      </main>

      <!-- Footer -->
      <footer class="mt-5 py-4 bg-light border-top">
        <div class="container text-center text-muted">
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
  `]
})
export class App {
  constructor(private agriculteurService: AgriculteurService) {}

  ngOnInit() {
    console.log('AgricultureApp initialisée');
  }
}
