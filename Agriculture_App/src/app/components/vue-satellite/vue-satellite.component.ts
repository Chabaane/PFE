// vue-satellite.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vue-satellite',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <h2><i class="bi bi-globe"></i> Vue Satellite</h2>
      <p>Contenu de la vue satellite...</p>
    </div>
  `
})
export class VueSatelliteComponent {}
