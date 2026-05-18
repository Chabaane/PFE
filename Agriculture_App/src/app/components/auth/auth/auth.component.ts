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


      <!-- Contenu principal (login/register) -->
      <main class="auth-main">
         <div style="position: relative; z-index: 1000; width: 100%;">
         <router-outlet></router-outlet>
         </div>
      </main>

      <!-- Footer de l'auth -->

    </div>
  `,

})

export class AuthLayoutComponent {


}
