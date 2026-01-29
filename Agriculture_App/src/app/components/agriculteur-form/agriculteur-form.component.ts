import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AgriculteurService } from '../../services/api/agriculteur';
import { Agriculteur, CreateAgriculteurDto, UpdateAgriculteurDto } from '../../models/agriculteur';

@Component({
  selector: 'app-agriculteur-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agriculteur-form.component.html',
  styleUrls: ['./agriculteur-form.component.scss']
})
export class AgriculteurFormComponent implements OnInit {
  agriculteur: Agriculteur | null = null;
  formData: CreateAgriculteurDto | UpdateAgriculteurDto = {
    nom: '',
    prenom: '',
    telephone: '',
    localisation: ''
  };

  loading = false;
  error = '';
  isEditMode = false;
  agriculteurId: number | null = null;

  constructor(
    private agriculteurService: AgriculteurService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.agriculteurId = +params['id'];
        this.loadAgriculteur();
      }
    });
  }

  loadAgriculteur(): void {
    if (!this.agriculteurId) return;

    this.loading = true;
    this.agriculteurService.getById(this.agriculteurId).subscribe({
      next: (data) => {
        this.agriculteur = data;
        this.formData = {
          nom: data.nom,
          prenom: data.prenom,
          telephone: data.telephone || '',
          localisation: data.localisation || ''
        };
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement';
        console.error(err);
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (!this.isValidForm()) return;

    this.loading = true;

    if (this.isEditMode && this.agriculteurId) {
      // Mise à jour
      this.agriculteurService.update(this.agriculteurId, this.formData).subscribe({
        next: () => {
          this.router.navigate(['/agriculteurs']);
        },
        error: (err) => {
          this.handleError(err);
        }
      });
    } else {
      // Création
      this.agriculteurService.create(this.formData as CreateAgriculteurDto).subscribe({
        next: () => {
          this.router.navigate(['/agriculteurs']);
        },
        error: (err) => {
          this.handleError(err);
        }
      });
    }
  }

  private isValidForm(): boolean {
    return !!(this.formData.nom && this.formData.prenom);
  }

  private handleError(err: any): void {
    this.error = 'Une erreur est survenue';
    console.error(err);
    this.loading = false;
  }

  cancel(): void {
    this.router.navigate(['/agriculteurs']);
  }
}
