import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AgriculteurService } from '../../services/api/agriculteur';
import { LocationService } from '../../services/location.service';
import { Agriculteur } from '../../models/agriculteur';

@Component({
  selector: 'app-agriculteur-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agriculteur-form.component.html',
  styleUrls: ['./agriculteur-form.component.scss']
})
export class AgriculteurFormComponent implements OnInit {

  agriculteur: Agriculteur | null = null;

  formData: any = {
    nom: '',
    prenom: '',
    telephone: '',
    localisation: '',
    operateur: ''
  };

  loading = false;
  error = '';
  isEditMode = false;
  agriculteurId: number | null = null;

  suggestions: any[] = [];
  phonePattern = /^[2459][0-9]{7}$/;

  constructor(
    private agriculteurService: AgriculteurService,
    private locationService: LocationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  // ================= INIT =================
  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.agriculteurId = +params['id'];
        this.loadAgriculteur();
      }
    });
  }

  // ================= LOAD =================
  loadAgriculteur(): void {
    if (!this.agriculteurId) return;

    this.loading = true;

    this.agriculteurService.getById(this.agriculteurId).subscribe({
      next: (data) => {
        this.agriculteur = data;

        // Normalisation pour anciens agriculteurs
        this.formData = {
          nom: data.nom || '',
          prenom: data.prenom || '',
          telephone: data.telephone || '',
          localisation: data.localisation || '',
          operateur: ''
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

  // ================= AUTOCOMPLETE =================
  async onSearchLocation() {
    if (!this.formData.localisation || this.formData.localisation.length < 3) {
      this.suggestions = [];
      return;
    }
    this.suggestions = await this.locationService.search(this.formData.localisation);
  }

  selectLocation(s: any) {
    this.formData.localisation = s.display_name;
    this.suggestions = [];
  }

  // ================= IA =================
  autoSuggest() {
    const tel = this.formData.telephone;
    if (!tel) return;

    if (tel.startsWith('2')) this.formData.operateur = 'Ooredoo';
    else if (tel.startsWith('5')) this.formData.operateur = 'Orange';
    else if (tel.startsWith('9') || tel.startsWith('4')) this.formData.operateur = 'Tunisie Telecom';
    else this.formData.operateur = '';
  }

  // ================= SUBMIT =================
  onSubmit(): void {
    if (!this.isValidForm()) return;

    this.loading = true;

    // 🔹 Payload propre pour anciens + nouveaux
    const payload: any = {
      nom: this.formData.nom,
      prenom: this.formData.prenom
    };
    if (this.formData.telephone && this.formData.telephone.trim() !== '') {
      payload.telephone = this.formData.telephone;
    }
    if (this.formData.localisation && this.formData.localisation.trim() !== '') {
      payload.localisation = this.formData.localisation;
    }

    if (this.isEditMode && this.agriculteurId) {
      this.agriculteurService.update(this.agriculteurId, payload).subscribe({
        next: () => this.router.navigate(['/agriculteurs']),
        error: (err) => this.handleError(err)
      });
    } else {
      this.agriculteurService.create(payload).subscribe({
        next: () => this.router.navigate(['/agriculteurs']),
        error: (err) => this.handleError(err)
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
