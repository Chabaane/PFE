import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'agriculteurs',
    pathMatch: 'full'
  },
  {
    path: 'agriculteurs',
    loadComponent: () => import('./components/agriculteur-list/agriculteur-list')
      .then(m => m.AgriculteurListComponent)
  },
  {
    path: 'parcelles/:agriculteurId',
    loadComponent: () => import('./components/carte-parcelle/carte-parcelle')
      .then(m => m.CarteParcelleComponent ),
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
      .then(m => m.DonneesMeteoComponent)
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
  {
    path: '**',
    redirectTo: 'agriculteurs'
  }
];
