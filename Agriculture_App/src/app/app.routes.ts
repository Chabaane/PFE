import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { NoAuthGuard } from './guards/no-auth.guard';
import { AuthLayoutComponent } from './components/auth/auth/auth.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  },

  // Routes d'authentification - Layout spécifique
  {
    path: 'auth',
    component: AuthLayoutComponent,
     // Empêche l'accès si déjà connecté
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'login',
        loadComponent: () => import('./components/auth/login/login.component')
          .then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./components/auth/register/register.component')
          .then(m => m.RegisterComponent)
      }
    ]
  },

  // Routes du dashboard - Layout principal
  {
    path: '',
    component: DashboardComponent,
    canActivate: [AuthGuard], // Protection globale
    children: [
      {
        path: 'profile',
        loadComponent: () => import('./components/auth/profile/profile.component')
          .then(m => m.ProfileComponent)
      },
      {
        path: 'agriculteurs',
        loadComponent: () => import('./components/agriculteur-list/agriculteur-list')
          .then(m => m.AgriculteurListComponent)
      },
      {
        path: 'agriculteurs/nouveau',
        loadComponent: () => import('./components/agriculteur-form/agriculteur-form.component')
          .then(m => m.AgriculteurFormComponent)
      },
      {
        path: 'agriculteurs/modifier/:id',
        loadComponent: () => import('./components/agriculteur-form/agriculteur-form.component')
          .then(m => m.AgriculteurFormComponent)
      },
      {
        path: 'parcelles/:agriculteurId',
        loadComponent: () => import('./components/carte-parcelle/carte-parcelle.component')
          .then(m => m.CarteParcelleComponent)
      },
      {
        path: 'dessiner-parcelle/:agriculteurId',
        loadComponent: () => import('./components/dessin-parcelle/dessin-parcelle')
          .then(m => m.DessinParcelleComponent)
      },
      {
        path: 'meteo',
        loadComponent: () => import('./components/donnees-meteo/meteo-popup.component')
          .then(m => m.MeteoPopupComponent)
      },
      {
        path: 'diagnostic',
        loadComponent: () => import('./components/diagnostic-satellite/diagnostic-satellite')
          .then(m => m.DiagnosticSatelliteComponent)
      },
      {
        path: 'synchronisation',
        loadComponent: () => import('./components/synchronisation-status/synchronisation-status')
          .then(m => m.SynchronisationStatusComponent)
      },
      // Routes avec alias (pour garder la compatibilité)
      {
        path: 'fermes',
        redirectTo: 'meteo'
      },
      {
        path: 'vue-satellite',
        redirectTo: 'diagnostic'
      },
      {
        path: 'parcelles',
        redirectTo: 'synchronisation'
      }
    ]
  },

  // Route 404
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
