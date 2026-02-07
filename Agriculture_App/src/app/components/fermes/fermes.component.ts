// fermes.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fermes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <h2><i class="bi bi-house-door"></i> Gestion des Fermes</h2>
      <p>Contenu de la gestion des fermes...</p>
    </div>
  `
})
export class FermesComponent {}
