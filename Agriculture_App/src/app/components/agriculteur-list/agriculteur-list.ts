import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { AgriculteurService } from '../../services/api/agriculteur';
import { Agriculteur } from '../../models/agriculteur';

@Component({
  selector: 'app-agriculteur-list',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbAlertModule],
  templateUrl: './agriculteur-list.html',
  styleUrls: ['./agriculteur-list.scss']
})
export class AgriculteurListComponent implements OnInit {
  agriculteurs: Agriculteur[] = [];
  loading = true;
  error = '';

  constructor(private agriculteurService: AgriculteurService) {}

  ngOnInit(): void {
    this.loadAgriculteurs();
  }

  loadAgriculteurs(): void {
    this.loading = true;
    this.error = '';

    this.agriculteurService.getAll().subscribe({
      next: (data) => {
        this.agriculteurs = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur de connexion à l\'API';
        console.error('Erreur:', err);
        this.loading = false;
      }
    });
  }
  delete(id: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet agriculteur ?')) return;

    this.agriculteurService.delete(id).subscribe({
        next: () => {
            this.refresh();
            // Optionnel : afficher un message de succès
        },
        error: (err) => {
            this.error = 'Erreur lors de la suppression';
            console.error('Erreur:', err);
        }
    });
}

  refresh(): void {
    this.loadAgriculteurs();
  }
}
