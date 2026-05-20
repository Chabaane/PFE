import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgriculteurService } from '../../services/api/agriculteur';
import { Agriculteur } from '../../models/agriculteur';

@Component({
  selector: 'app-agriculteur-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './agriculteur-list.html',
  styleUrls: ['./agriculteur-list.scss']
})
export class AgriculteurListComponent implements OnInit {

  /* ── Data ── */
  agriculteurs: Agriculteur[] = [];
  filteredAgriculteurs: Agriculteur[] = [];
  localisations: string[] = [];
  loading = true;
  error = '';

  /* ── Search & filter ── */
  searchQuery = '';
  filterLocalisation = '';

  /* ── Sort ── */
  sortField: keyof Agriculteur | '' = '';
  sortAsc = true;

  /* ── Selection ── */
  selectedIds = new Set<number>();

  /* ── Avatar colors ── */
  private colors = [
    '#2e9c5f','#3b82f6','#8b5cf6','#f59e0b',
    '#ef4444','#06b6d4','#ec4899','#10b981'
  ];

  constructor(private agriculteurService: AgriculteurService) {}

  ngOnInit(): void { this.loadAgriculteurs(); }

  /* ── Load ── */
  loadAgriculteurs(): void {
    this.loading = true;
    this.error = '';
    this.agriculteurService.getAll().subscribe({
      next: (data) => {
        this.agriculteurs = data;
        this.localisations = [...new Set(
          data.map(a => a.localisation).filter(Boolean)
        )].sort() as string[];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur de connexion à l\'API';
        console.error(err);
        this.loading = false;
      }
    });
  }

  /* ── Search + filter ── */
  applyFilters(): void {
    const q = this.searchQuery.toLowerCase().trim();

    // Filtrage
    let result = this.agriculteurs;

    if (q) {
      result = result.filter(a => {
        const prenom = (a.prenom || '').toLowerCase();
        const nom = (a.nom || '').toLowerCase();
        const tel = (a.telephone || '').toLowerCase();
        const loc = (a.localisation || '').toLowerCase();
        const id = (a.idAgriculteur || '').toString();

        return prenom.includes(q) ||
               nom.includes(q) ||
               tel.includes(q) ||
               loc.includes(q) ||
               id.includes(q);
      });
    }

    if (this.filterLocalisation) {
      result = result.filter(a => a.localisation === this.filterLocalisation);
    }

    // Tri
    if (this.sortField) {
      result = [...result].sort((a, b) => {
        const va = a[this.sortField as keyof Agriculteur];
        const vb = b[this.sortField as keyof Agriculteur];

        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;

        const strA = String(va).toLowerCase();
        const strB = String(vb).toLowerCase();

        return this.sortAsc
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    }

    this.filteredAgriculteurs = result;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filterLocalisation = '';
    this.applyFilters();
  }

  /* ── Sort ── */
  sort(field: keyof Agriculteur): void {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
    this.applyFilters();
  }

  sortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortAsc ? 'fa-sort-up' : 'fa-sort-down';
  }

  /* ── Selection ── */
  isSelected(id: number): boolean { return this.selectedIds.has(id); }
  toggleSelect(id: number): void {
    this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id);
  }
  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.filteredAgriculteurs.forEach(a => this.selectedIds.add(a.idAgriculteur));
    } else {
      this.selectedIds.clear();
    }
  }

  /* ── Delete ── */
  delete(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet agriculteur ?')) return;
    this.agriculteurService.delete(id).subscribe({
      next: () => this.refresh(),
      error: (err) => {
        this.error = 'Erreur lors de la suppression';
        console.error(err);
      }
    });
  }

  refresh(): void { this.loadAgriculteurs(); }

  /* ── Avatar helpers ── */
  initials(prenom: string, nom: string): string {
    return ((prenom?.[0] ?? '') + (nom?.[0] ?? '')).toUpperCase();
  }
  avatarColor(nom: string): string {
    return this.colors[(nom?.charCodeAt(0) ?? 0) % this.colors.length];
  }
}
