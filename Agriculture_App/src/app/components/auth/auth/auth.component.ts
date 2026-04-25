// components/layouts/auth-layout.component.ts
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="auth-layout">
      <!-- Header de l'auth -->
      <nav class="auth-navbar">
        <div class="auth-navbar-container">
          <li class="nav-item">
            <a class="nav-link">
              <img src="assets/images/logo-light.png" alt="Agriculteurs" class="nav-logo">
            </a>
          </li>
          <div class="nav-links">
            <a routerLink="/auth/login" class="nav-link" routerLinkActive="active" >Connexion</a>
            <a routerLink="/auth/register" class="nav-link" routerLinkActive="active">Inscription</a>
          </div>
        </div>
      </nav>

      <!-- Contenu principal (login/register) -->
      <main class="auth-main">
         <div style="position: relative; z-index: 1000; width: 100%;">
         <router-outlet></router-outlet>
         </div>
      </main>

      <!-- Footer de l'auth -->
      <footer class="auth-footer">
        <div class="auth-footer-container">
          <p class="mb-0">
            AgricultureApp &copy; 2024 - Gestion des parcelles agricoles
          </p>
          <small>Développé avec Angular 17+ et .NET 8</small>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    /* Layout principal */
    .auth-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #66ead4 0%, #333334 100%);
    }

    /* Navbar */
    .auth-navbar {
      background: rgba(18, 13, 13, 0.66);
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 15px rgba(0, 0, 0, 0.5);
      padding: 1rem 0;
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .auth-navbar-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Logo */
    .navbar-brand {
      display: flex;
      align-items: center;
      text-decoration: none;
      color: #2c3e50;
      font-size: 1.5rem;
      font-weight: bold;
      transition: transform 0.3s;
    }

    .navbar-brand:hover {
      transform: scale(1.05);
    }

    .navbar-brand::before {
      content: "🌾";
      font-size: 1.8rem;
      margin-right: 0.5rem;
    }

    /* Navigation links */
    .nav-links {
      display: flex;
      gap: 1.5rem;
    }

    .nav-link {
      padding: 0.75rem 1.5rem;
      text-decoration: none;
      color: #f3f0f0;
      font-weight: 500;
      border-radius: 6px;
      transition: all 0.3s;
      border: 2px solid transparent;
      font-size: 1rem;
    }

    .nav-link:hover {
      background: rgba(102, 126, 234, 0.1);
      color: #28292e;
      border-color: rgba(102, 234, 205, 0.2);
    }

    .nav-link.active {
      background: linear-gradient(135deg, #66dbea 0%, #4b8fa2 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(102, 219, 234, 0.3);
      border-color: transparent;
    }
    /* Dans les styles de AuthLayoutComponent */
    .auth-main * {
      position: relative;
      z-index: 10;
    }

    .auth-main > * {
      position: relative;
      z-index: 20;
    }
    /* Main content */
    .auth-main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      position: relative;
      overflow: hidden;
    }

    /* Animation de fond */
    .auth-main::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
      z-index: 0;
      animation: float 20s infinite linear;
    }

    @keyframes float {
      0% {
        transform: translate(0, 0);
      }
      25% {
        transform: translate(10px, 10px);
      }
      50% {
        transform: translate(0, 20px);
      }
      75% {
        transform: translate(-10px, 10px);
      }
      100% {
        transform: translate(0, 0);
      }
    }

    /* Footer */
    .auth-footer {
      background: rgba(0, 0, 0, 0.2);
      padding: 1.5rem 0;
      backdrop-filter: blur(5px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .auth-footer-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      text-align: center;
    }

    .auth-footer p {
      color: white;
      margin: 0 0 0.5rem 0;
      font-size: 0.95rem;
    }

    .auth-footer small {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.85rem;
    }

    /* Effets visuels supplémentaires */
    .auth-layout::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background:
        url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" opacity="0.03"><path d="M50,20 C65,20 75,30 75,45 C75,60 65,70 50,70 C35,70 25,60 25,45 C25,30 35,20 50,20 Z" fill="white"/><path d="M20,50 C20,65 30,75 45,75 C60,75 70,65 70,50 C70,35 60,25 45,25 C30,25 20,35 20,50 Z" fill="white"/></svg>');
      pointer-events: none;
      z-index: 0;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .auth-navbar-container {
        padding: 0 1rem;
        flex-direction: column;
        gap: 1rem;
      }

      .nav-links {
        width: 100%;
        justify-content: center;
      }

      .nav-link {
        padding: 0.6rem 1rem;
        font-size: 0.9rem;
      }

      .auth-main {
        padding: 1.5rem;
      }
      .auth-main {
        position: relative;
      }

      .auth-main > * {
        position: relative;
        z-index: 2;
      }

      .auth-footer-container {
        padding: 0 1rem;
      }
    }

    @media (max-width: 480px) {
      .navbar-brand {
        font-size: 1.3rem;
      }

      .nav-links {
        gap: 0.75rem;
      }

      .nav-link {
        padding: 0.5rem 0.8rem;
        font-size: 0.85rem;
      }

      .auth-footer p {
        font-size: 0.85rem;
      }

      .auth-footer small {
        font-size: 0.75rem;
      }
    }

    /* Effets d'ombre et animation d'entrée */
    .auth-navbar {
      animation: slideDown 0.5s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Effet de transition sur les liens */
    .nav-link {
      position: relative;
      overflow: hidden;
    }

    .nav-link::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: linear-gradient(135deg, #32343c 0%, #4ba29b 100%);
      transform: translateX(-100%);
      transition: transform 0.3s ease;
    }

    .nav-link:hover::after,
    .nav-link.active::after {
      transform: translateX(0);
    }

    /* Effet de pulsur sur le logo */
    .navbar-brand::before {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
      }
    }
    .nav-logo {
      height: 50px;
      width: auto;
      vertical-align: middle;
    }
  `]
})

export class AuthLayoutComponent {


}
