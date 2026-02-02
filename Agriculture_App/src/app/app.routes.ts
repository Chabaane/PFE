import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
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
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/auth/profile/profile.component')
      .then(m => m.ProfileComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'agriculteurs',
    loadComponent: () => import('./components/agriculteur-list/agriculteur-list')
      .then(m => m.AgriculteurListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'agriculteurs/nouveau',
    loadComponent: () => import('./components/agriculteur-form/agriculteur-form.component')
      .then(m => m.AgriculteurFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'agriculteurs/modifier/:id',
    loadComponent: () => import('./components/agriculteur-form/agriculteur-form.component')
      .then(m => m.AgriculteurFormComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'parcelles/:agriculteurId',
    loadComponent: () => import('./components/carte-parcelle/carte-parcelle')
      .then(m => m.CarteParcelleComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'dessiner-parcelle/:agriculteurId',
    loadComponent: () => import('./components/dessin-parcelle/dessin-parcelle')
      .then(m => m.DessinParcelleComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'meteo',
    loadComponent: () => import('./components/donnees-meteo/donnees-meteo')
      .then(m => m.DonneesMeteoComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'diagnostic',
    loadComponent: () => import('./components/diagnostic-satellite/diagnostic-satellite')
      .then(m => m.DiagnosticSatelliteComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'synchronisation',
    loadComponent: () => import('./components/synchronisation-status/synchronisation-status')
      .then(m => m.SynchronisationStatusComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
