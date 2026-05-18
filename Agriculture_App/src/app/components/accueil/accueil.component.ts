import { Component , AfterViewInit  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './accueil.component.html',
  styleUrls: ['./accueil.component.scss'],

  // Le CSS reste dans le template (inline) – pas de fichier .scss externe
})
export class AccueilComponent implements AfterViewInit {
  ngAfterViewInit(): void {
        const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.unobserve(e.target);
          }
        });
      },
      {
        threshold: 0.1
      }
    );

    document
      .querySelectorAll('.fade-in')
      .forEach(el => obs.observe(el));
     // Code à exécuter après la vue a été initialisée
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
