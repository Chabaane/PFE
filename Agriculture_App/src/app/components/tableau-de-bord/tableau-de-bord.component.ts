// components/tableau-de-bord/tableau-de-bord.component.ts
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgriculteurService } from '../../services/api/agriculteur';
import { ParcelleService, Parcelle } from '../../services/api/parcelle.service';
import { forkJoin } from 'rxjs';

declare var Chart: any;

interface StatVariete {
  nom: string;
  surface: number;
  couleur: string;
}

interface StatRegion {
  region: string;
  surface: number;
}

@Component({
  selector: 'app-tableau-de-bord',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tdb-wrapper">

      <!-- ══ Stat. générales ══════════════════════════════════════════════════ -->
      <section class="tdb-section mb-4">
        <div class="tdb-section-header">
          <span>Stat. générales</span>
        </div>
        <div class="tdb-cards-row">

          <!-- Agriculteurs -->
          <div class="tdb-stat-card tdb-blue">
            <div class="tdb-stat-icon">
              <i class="bi bi-person-fill"></i>
            </div>
            <div class="tdb-stat-body">
              <div class="tdb-stat-label">Nbr Agriculteurs</div>
              <div class="tdb-stat-value" *ngIf="!loading; else skeleton">{{ nbrAgriculteurs }}</div>
            </div>
          </div>

          <!-- Parcelles -->
          <div class="tdb-stat-card tdb-orange">
            <div class="tdb-stat-icon">
              <i class="bi bi-grid-fill"></i>
            </div>
            <div class="tdb-stat-body">
              <div class="tdb-stat-label">Nbr parcelles</div>
              <div class="tdb-stat-value" *ngIf="!loading; else skeleton">{{ nbrParcelles }}</div>
            </div>
          </div>

          <!-- Surface -->
          <div class="tdb-stat-card tdb-teal tdb-full">
            <div class="tdb-stat-icon">
              <i class="bi bi-layers-fill"></i>
            </div>
            <div class="tdb-stat-body">
              <div class="tdb-stat-label">Surface plantée</div>
              <div class="tdb-stat-value" *ngIf="!loading; else skeleton">
                {{ surfaceTotale | number:'1.3-3' }} ha
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- ══ Graphiques ════════════════════════════════════════════════════ -->
      <div class="tdb-charts-row">

        <!-- Stat. variétés -->
        <section class="tdb-section tdb-chart-box">
          <div class="tdb-section-header">
            <span>Stat. variétés</span>
          </div>
          <div class="tdb-chart-content">
            <h6 class="tdb-chart-title">Surface par variété</h6>
            <div class="tdb-pie-wrapper">
              <canvas id="pieChart"></canvas>
            </div>
          </div>
        </section>

        <!-- Stat. régions -->
        <section class="tdb-section tdb-chart-box">
          <div class="tdb-section-header">
            <span>Stat. régions</span>
          </div>
          <div class="tdb-chart-content">
            <h6 class="tdb-chart-title">Surface par région</h6>
            <div class="tdb-bar-wrapper">
              <canvas id="barChart"></canvas>
            </div>
          </div>
        </section>

      </div>

    </div>

    <ng-template #skeleton>
      <div class="tdb-skeleton"></div>
    </ng-template>
  `,
  styles: [`
    /* ── Wrapper global ── */
    .tdb-wrapper {
      padding: 0 4px;
      font-family: 'Segoe UI', sans-serif;
      color: #333;
    }

    /* ── Section card ── */
    .tdb-section {
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    }

    .tdb-section-header {
      background: linear-gradient(90deg, #26b5c8, #3dd0e0);
      color: #fff;
      font-weight: 600;
      font-size: 0.95rem;
      padding: 11px 20px;
      letter-spacing: 0.3px;
    }

    /* ── Stat cards row ── */
    .tdb-cards-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      padding: 18px;
      background: #f0f4f8;
    }

    .tdb-stat-card {
      display: flex;
      align-items: center;
      gap: 14px;
      border-radius: 12px;
      padding: 18px 20px;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .tdb-stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(0,0,0,0.1);
    }

    /* Couleurs des cartes */
    .tdb-blue   { background: #dce9f9; }
    .tdb-orange { background: #fef3dc; }
    .tdb-teal   { background: #d6f3f6; }

    /* Pleine largeur */
    .tdb-full { grid-column: 1 / -1; }

    /* Icône */
    .tdb-stat-icon {
      font-size: 1.9rem;
      opacity: 0.65;
    }
    .tdb-blue   .tdb-stat-icon { color: #2196f3; }
    .tdb-orange .tdb-stat-icon { color: #f59c26; }
    .tdb-teal   .tdb-stat-icon { color: #26b5c8; }

    /* Textes */
    .tdb-stat-label {
      font-size: 0.82rem;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .tdb-blue   .tdb-stat-label { color: #1565c0; }
    .tdb-orange .tdb-stat-label { color: #e07b00; }
    .tdb-teal   .tdb-stat-label { color: #00838f; }

    .tdb-stat-value {
      font-size: 1.55rem;
      font-weight: 700;
      color: #444;
    }

    /* Skeleton loader */
    .tdb-skeleton {
      width: 80px;
      height: 26px;
      border-radius: 6px;
      background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ── Charts row ── */
    .tdb-charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .tdb-chart-box {
      min-height: 360px;
    }

    .tdb-chart-content {
      padding: 18px;
    }

    .tdb-chart-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 14px;
    }

    .tdb-pie-wrapper,
    .tdb-bar-wrapper {
      position: relative;
      width: 100%;
      height: 280px;
    }

    /* ── Responsive ── */
    @media (max-width: 768px) {
      .tdb-charts-row { grid-template-columns: 1fr; }
      .tdb-cards-row  { grid-template-columns: 1fr; }
      .tdb-full       { grid-column: auto; }
    }
  `]
})
export class TableauDeBordComponent implements OnInit, AfterViewInit, OnDestroy {

  nbrAgriculteurs = 0;
  nbrParcelles    = 0;
  surfaceTotale   = 0;
  loading         = true;

  private parcelles: Parcelle[] = [];
  private pieChartInstance: any;
  private barChartInstance: any;
  private chartsReady = false;

  // Palette couleurs pour le pie chart
  private readonly PALETTE = [
    '#3498db','#2ecc71','#e67e22','#e74c3c','#9b59b6',
    '#1abc9c','#f39c12','#d35400','#16a085','#8e44ad',
    '#2980b9','#27ae60','#c0392b','#f1c40f','#7f8c8d'
  ];

  constructor(
    private agriculteurService: AgriculteurService,
    private parcelleService: ParcelleService
  ) {}

  ngOnInit(): void {
    this.chargerDonnees();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    this.chargerChartJs().then(() => {
      if (!this.loading) this.dessinerGraphiques();
    });
  }

  ngOnDestroy(): void {
    this.pieChartInstance?.destroy();
    this.barChartInstance?.destroy();
  }

  // ── Chargement des données ────────────────────────────────────────────────

  private chargerDonnees(): void {
    forkJoin({
      agriculteurs: this.agriculteurService.getAll(),
      parcelles: this.parcelleService.getAllParcelles()
    }).subscribe({
      next: ({ agriculteurs, parcelles }) => {
        this.nbrAgriculteurs = agriculteurs.length;
        this.nbrParcelles    = parcelles.length;
        this.parcelles       = parcelles;
        this.surfaceTotale   = parcelles.reduce((s, p) => s + (p.surface || 0), 0);
        this.loading = false;
        if (this.chartsReady) this.dessinerGraphiques();
      },
      error: err => {
        console.error('Erreur chargement tableau de bord:', err);
        this.loading = false;
      }
    });
  }

  // ── Chargement Chart.js depuis CDN ────────────────────────────────────────

  private chargerChartJs(): Promise<void> {
    return new Promise(resolve => {
      if ((window as any).Chart) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  // ── Dessin des graphiques ─────────────────────────────────────────────────

  private dessinerGraphiques(): void {
    setTimeout(() => {
      this.dessinerPieVarietes();
      this.dessinerBarRegions();
    }, 100);
  }

  private dessinerPieVarietes(): void {
    const canvas = document.getElementById('pieChart') as HTMLCanvasElement;
    if (!canvas || !(window as any).Chart) return;

    // Agréger surfaces par culture
    const map = new Map<string, number>();
    this.parcelles.forEach(p => {
      const key = p.culture || 'Inconnue';
      map.set(key, (map.get(key) || 0) + (p.surface || 0));
    });

    // Trier et prendre les 10 premiers
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = sorted.map(e => e[0]);
    const data   = sorted.map(e => parseFloat(e[1].toFixed(3)));
    const total  = data.reduce((s, v) => s + v, 0);

    this.pieChartInstance?.destroy();
    this.pieChartInstance = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: this.PALETTE.slice(0, labels.length),
          borderWidth: 1,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { size: 11 }, boxWidth: 14, padding: 8 }
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const pct = ((ctx.raw / total) * 100).toFixed(1);
                return ` ${ctx.label}: ${ctx.raw} ha (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  private dessinerBarRegions(): void {
    const canvas = document.getElementById('barChart') as HTMLCanvasElement;
    if (!canvas || !(window as any).Chart) return;

    // Agréger surfaces par gouvernorat
    const map = new Map<string, number>();
    this.parcelles.forEach(p => {
      const key = p.gouvernorat || 'Inconnue';
      map.set(key, (map.get(key) || 0) + (p.surface || 0));
    });

    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = sorted.map(e => e[0]);
    const data   = sorted.map(e => parseFloat(e[1].toFixed(3)));

    this.barChartInstance?.destroy();
    this.barChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Surface (Ha)',
          data,
          backgroundColor: '#42a5f5',
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.raw} Ha`
            }
          },
          datalabels: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Surface (Ha)',
              font: { size: 11 }
            },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  }
}
