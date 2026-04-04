// components/carte-parcelle/carte-parcelle.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-draw';
import { ParcelleService, Parcelle, DessinParcelleDto } from '../../services/api/parcelle.service';
import area from '@turf/area';
import { polygon } from '@turf/helpers';
// Ajoutez cet import avec les autres
import { ChatbotComponent } from '../chatbot/chatbot.component';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface AltitudePoint { lat: number; lng: number; altitude: number; }
interface AltitudeStats  { min: number; max: number; mean: number; denivele: number; }

/** Enregistrement météo horaire stocké en mémoire */
interface MeteoRecord {
  timestamp: number;          // unix ms
  temperature: number;        // °C
  humidity: number;           // %
  pressure: number;           // hPa
  windSpeed: number;          // m/s
  windDirection: number;      // °
  windDirectionLabel: string; // N, NE, E…
  precipitation: number;      // mm
  solarRadiation: number;     // W/m²
  weatherCode: number;        // WMO code
  weatherLabel: string;
  weatherIcon: string;        // emoji
}

/** Résumé agronomique calculé depuis l'historique */
interface MeteoSummary {
  chaleurCumulee: number;     // GDD Growing Degree Days (base 10°C)
  froidCumule: number;        // Chilling hours (<7°C)
  precipTotale: number;       // mm total
  rayonnementTotal: number;   // kWh/m²
  tempMoyenne: number;
  tempMin: number;
  tempMax: number;
  humMoyenne: number;
  nbMesures: number;
  derniereMAJ: Date | null;
}

// ─── Palette SVG icons par agriculteur (déterministe par id % 12) ────────────

const FARMER_ICONS = [
  // 0 - blé vert
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#2d7a2d" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🌾</text>
    <polygon points="22,42 15,54 29,54" fill="#2d7a2d"/>
  </svg>`,
  // 1 - olive bleu
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#1a6b9a" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🫒</text>
    <polygon points="22,42 15,54 29,54" fill="#1a6b9a"/>
  </svg>`,
  // 2 - tracteur orange
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#e07820" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🚜</text>
    <polygon points="22,42 15,54 29,54" fill="#e07820"/>
  </svg>`,
  // 3 - vigne violet
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#7b3fa0" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🍇</text>
    <polygon points="22,42 15,54 29,54" fill="#7b3fa0"/>
  </svg>`,
  // 4 - maïs jaune
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#c9a800" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🌽</text>
    <polygon points="22,42 15,54 29,54" fill="#c9a800"/>
  </svg>`,
  // 5 - eau/irrigation bleu ciel
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#1588c8" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">💧</text>
    <polygon points="22,42 15,54 29,54" fill="#1588c8"/>
  </svg>`,
  // 6 - semence vert clair
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#3aa86e" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🌱</text>
    <polygon points="22,42 15,54 29,54" fill="#3aa86e"/>
  </svg>`,
  // 7 - soleil rouge
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#c83030" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🌻</text>
    <polygon points="22,42 15,54 29,54" fill="#c83030"/>
  </svg>`,
  // 8 - ferme brun
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#8b5a2b" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🏡</text>
    <polygon points="22,42 15,54 29,54" fill="#8b5a2b"/>
  </svg>`,
  // 9 - citron vert indigo
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#3d5a80" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🍋</text>
    <polygon points="22,42 15,54 29,54" fill="#3d5a80"/>
  </svg>`,
  // 10 - rose/feuille teal
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#0d7377" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🍀</text>
    <polygon points="22,42 15,54 29,54" fill="#0d7377"/>
  </svg>`,
  // 11 - poivron rouge foncé
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#a03030" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🌶️</text>
    <polygon points="22,42 15,54 29,54" fill="#a03030"/>
  </svg>`,
];

// ─── WMO weather code → label + emoji ─────────────────────────────────────────

function wmoToInfo(code: number): { label: string; icon: string } {
  if (code === 0)                return { label: 'Ciel dégagé',      icon: '☀️' };
  if (code <= 2)                 return { label: 'Partiellement nuageux', icon: '⛅' };
  if (code === 3)                return { label: 'Couvert',           icon: '☁️' };
  if (code <= 49)                return { label: 'Brouillard',        icon: '🌫️' };
  if (code <= 59)                return { label: 'Bruine',            icon: '🌦️' };
  if (code <= 69)                return { label: 'Pluie',             icon: '🌧️' };
  if (code <= 79)                return { label: 'Neige',             icon: '❄️' };
  if (code <= 84)                return { label: 'Averses',           icon: '🌦️' };
  if (code <= 94)                return { label: 'Orages',            icon: '⛈️' };
  return { label: 'Orage violent', icon: '🌩️' };
}

function degToDir(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSO','SO','OSO','O','ONO','NO','NNO'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ─── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-carte-parcelle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe, DatePipe,ChatbotComponent ],
  template: `
    <div class="container-fluid mt-4">

      <!-- En-tête -->
      <div class="row mb-4">
        <div class="col-md-8">
          <h3><i class="fas fa-map-marked-alt me-2"></i>Carte des Parcelles - Agriculteur {{agriculteurId}}</h3>
          <p class="text-muted">Visualisez et gérez les parcelles de l'agriculteur sur la carte</p>
        </div>
        <div class="col-md-4 text-end">
          <button class="btn btn-success me-2" (click)="dessinerNouvelleParcelle()">
            <i class="fas fa-draw-polygon me-1"></i> Dessiner une parcelle
          </button>
          <button class="btn btn-primary" (click)="synchroniser()" [disabled]="!hasOfflineData">
            <i class="fas fa-sync-alt me-1" [class.fa-spin]="synchronisationEnCours"></i>
            Synchroniser ({{parcellesOfflineCount}})
          </button>
        </div>
      </div>

      <!-- Cartes de statistiques -->
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="card text-center border-success">
            <div class="card-body">
              <h5 class="card-title text-success">{{parcelles.length}}</h5>
              <p class="card-text">Parcelles</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center border-info">
            <div class="card-body">
              <h5 class="card-title text-info">{{surfaceTotale}} ha</h5>
              <p class="card-text">Surface totale</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center border-warning">
            <div class="card-body">
              <h5 class="card-title text-warning">{{parcellesOfflineCount}}</h5>
              <p class="card-text">Non synchronisées</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center border-primary">
            <div class="card-body">
              <h5 class="card-title text-primary">{{connectionStatus}}</h5>
              <p class="card-text">Connexion</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Carte et liste -->
      <div class="row">

        <!-- Carte Leaflet -->
        <div class="col-md-8">
          <div class="card shadow-sm position-relative">
            <div class="card-header bg-dark text-white">
              <div class="d-flex justify-content-between align-items-center">
                <span><i class="fas fa-map me-2"></i>Carte Interactive</span>
                <div class="d-flex gap-2 align-items-center">
                  <div class="map-mode-selector">
                    <button class="btn btn-sm"
                            [class.btn-light]="modeAffichage !== 'altitude'"
                            [class.btn-warning]="modeAffichage === 'altitude'"
                            (click)="basculerModeAltitude()">
                      <i class="fas fa-mountain me-1"></i>
                      <span *ngIf="modeAffichage !== 'altitude'">Altitude</span>
                      <span *ngIf="modeAffichage === 'altitude'">
                        <span *ngIf="!altitudeLoading">Altitude ✓</span>
                        <span *ngIf="altitudeLoading"><i class="fas fa-spinner fa-spin me-1"></i>Chargement...</span>
                      </span>
                    </button>
                  </div>
                  <button class="btn btn-sm btn-light" (click)="centrerCarte()">
                    <i class="fas fa-crosshairs"></i>
                  </button>
                  <button class="btn btn-sm btn-light" (click)="changerMode()">
                    {{modeDessin ? 'Annuler le dessin' : 'Mode dessin'}}
                  </button>
                </div>
              </div>
            </div>

            <div class="card-body p-0 position-relative">
              <div id="map" style="height:600px;"></div>

              <!-- ── Panneau Météo principal flottant ── -->
              <div class="meteo-panel" *ngIf="showMeteoPanel && meteoActuel" [@slideIn]>
                <!-- Header -->
                <div class="mp-header">
                  <button class="mp-collapse-btn" (click)="toggleMeteoPanel()">
                    <i class="fas fa-chevron-left"></i>
                  </button>
                  <div class="mp-header-info">
                    <div class="mp-location">
                      <i class="fas fa-map-pin me-1"></i>
                      <span>{{selectedPointName || 'Point sélectionné'}}</span>
                    </div>
                    <div class="mp-refresh-info">
                      <span *ngIf="meteoActuel">MAJ: {{meteoActuel.timestamp | date:'HH:mm'}}</span>
                      <button class="btn-refresh" (click)="rafraichirMeteo()" [disabled]="meteoLoading">
                        <i class="fas fa-sync-alt" [class.fa-spin]="meteoLoading"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Maintenant -->
                <div class="mp-now">
                  <div class="mp-now-icon">{{meteoActuel.weatherIcon}}</div>
                  <div class="mp-now-temp">{{meteoActuel.temperature | number:'1.1-1'}}°C</div>
                  <div class="mp-now-label">{{meteoActuel.weatherLabel}}</div>
                  <div class="mp-now-grid">
                    <div class="mp-now-item">
                      <i class="fas fa-tint"></i>
                      <span>{{meteoActuel.humidity}}%</span>
                      <small>Humidité</small>
                    </div>
                    <div class="mp-now-item">
                      <i class="fas fa-wind"></i>
                      <span>{{meteoActuel.windSpeed | number:'1.1-1'}} m/s</span>
                      <small>Vent {{meteoActuel.windDirectionLabel}}</small>
                    </div>
                    <div class="mp-now-item">
                      <i class="fas fa-tachometer-alt"></i>
                      <span>{{meteoActuel.pressure | number:'1.0-0'}}</span>
                      <small>hPa</small>
                    </div>
                    <div class="mp-now-item">
                      <i class="fas fa-cloud-rain"></i>
                      <span>{{meteoActuel.precipitation | number:'1.1-1'}}</span>
                      <small>mm pluie</small>
                    </div>
                    <div class="mp-now-item">
                      <i class="fas fa-sun"></i>
                      <span>{{meteoActuel.solarRadiation | number:'1.0-0'}}</span>
                      <small>W/m² solaire</small>
                    </div>
                    <div class="mp-now-item wind-dir-item">
                      <div class="wind-compass">
                        <div class="wind-needle" [style.transform]="'rotate(' + meteoActuel.windDirection + 'deg)'"></div>
                      </div>
                      <span>{{meteoActuel.windDirection}}°</span>
                      <small>Direction</small>
                    </div>
                  </div>
                </div>

                <!-- Données agronomiques cumulées -->
                <div class="mp-agro" *ngIf="meteoSummary">
                  <div class="mp-agro-title">
                    <i class="fas fa-seedling me-1"></i> Bilan agronomique
                    <small class="ms-2 text-muted">({{meteoSummary.nbMesures}} mesures)</small>
                  </div>
                  <div class="mp-agro-grid">
                    <div class="mp-agro-item hot">
                      <div class="mp-agro-val">{{meteoSummary.chaleurCumulee | number:'1.0-0'}}</div>
                      <div class="mp-agro-unit">GDD</div>
                      <div class="mp-agro-label">Chaleur cumulée</div>
                    </div>
                    <div class="mp-agro-item cold">
                      <div class="mp-agro-val">{{meteoSummary.froidCumule | number:'1.0-0'}}</div>
                      <div class="mp-agro-unit">h</div>
                      <div class="mp-agro-label">Heures de froid</div>
                    </div>
                    <div class="mp-agro-item rain">
                      <div class="mp-agro-val">{{meteoSummary.precipTotale | number:'1.1-1'}}</div>
                      <div class="mp-agro-unit">mm</div>
                      <div class="mp-agro-label">Précipitations</div>
                    </div>
                    <div class="mp-agro-item solar">
                      <div class="mp-agro-val">{{meteoSummary.rayonnementTotal | number:'1.2-2'}}</div>
                      <div class="mp-agro-unit">kWh/m²</div>
                      <div class="mp-agro-label">Rayonnement</div>
                    </div>
                    <div class="mp-agro-item temp-range">
                      <div class="mp-agro-val">{{meteoSummary.tempMin | number:'1.1-1'}}° / {{meteoSummary.tempMax | number:'1.1-1'}}°</div>
                      <div class="mp-agro-unit">min/max</div>
                      <div class="mp-agro-label">T° extrêmes</div>
                    </div>
                    <div class="mp-agro-item hum-avg">
                      <div class="mp-agro-val">{{meteoSummary.humMoyenne | number:'1.0-0'}}%</div>
                      <div class="mp-agro-unit">moy.</div>
                      <div class="mp-agro-label">Humidité moy.</div>
                    </div>
                  </div>
                </div>

                <!-- Historique (dernières 5 mesures) -->
                <div class="mp-history" *ngIf="historique.length > 1">
                  <div class="mp-history-title">
                    <i class="fas fa-history me-1"></i> Historique récent
                  </div>
                  <div class="mp-history-list">
                    <div *ngFor="let rec of historique.slice(-5).reverse(); let i = index"
                         class="mp-history-row" [class.mp-history-now]="i===0">
                      <span class="mp-h-time">{{rec.timestamp | date:'HH:mm'}}</span>
                      <span class="mp-h-icon">{{rec.weatherIcon}}</span>
                      <span class="mp-h-temp">{{rec.temperature | number:'1.1-1'}}°</span>
                      <span class="mp-h-hum"><i class="fas fa-tint"></i> {{rec.humidity}}%</span>
                      <span class="mp-h-wind"><i class="fas fa-wind"></i> {{rec.windSpeed | number:'1.0-0'}} m/s</span>
                      <span class="mp-h-rain"><i class="fas fa-cloud-rain"></i> {{rec.precipitation | number:'1.1-1'}}mm</span>
                    </div>
                  </div>
                </div>

                <!-- Bouton effacer historique -->
                <div class="mp-footer">
                  <button class="btn btn-sm btn-outline-secondary" (click)="effacerHistorique()">
                    <i class="fas fa-trash me-1"></i>Effacer historique
                  </button>
                  <small class="text-muted">Actualisation auto: 1h</small>
                </div>
              </div>



              <!-- Légende Altitude -->
              <div class="altitude-legend" *ngIf="modeAffichage === 'altitude' && altitudeParcelleActive">
                <div class="legend-title"><i class="fas fa-mountain me-1"></i>Altitude - {{altitudeParcelleActive.nom}}</div>
                <div class="legend-gradient"></div>
                <div class="legend-labels">
                  <span class="legend-max">{{altitudeStats?.max}} m</span>
                  <span class="legend-mid">{{altitudeStats ? ((altitudeStats.max + altitudeStats.min) / 2 | number:'1.0-0') : ''}} m</span>
                  <span class="legend-min">{{altitudeStats?.min}} m</span>
                </div>
                <div class="legend-stats" *ngIf="altitudeStats">
                  <div><i class="fas fa-arrow-up text-danger me-1"></i>Max: <strong>{{altitudeStats.max}} m</strong></div>
                  <div><i class="fas fa-arrow-down text-success me-1"></i>Min: <strong>{{altitudeStats.min}} m</strong></div>
                  <div><i class="fas fa-ruler-vertical text-warning me-1"></i>Dénivelé: <strong>{{altitudeStats.denivele}} m</strong></div>
                  <div><i class="fas fa-chart-line text-info me-1"></i>Moy: <strong>{{altitudeStats.mean | number:'1.0-0'}} m</strong></div>
                </div>
              </div>

              <div class="altitude-hint" *ngIf="modeAffichage === 'altitude' && !altitudeParcelleActive && !altitudeLoading">
                <i class="fas fa-hand-pointer me-1"></i> Cliquez sur une parcelle pour afficher sa carte d'altitude
              </div>
            </div>
          </div>
        </div>

        <!-- Liste des parcelles -->
        <div class="col-md-4">
          <div class="card shadow-sm h-100">
            <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <span><i class="fas fa-list me-2"></i>Liste des Parcelles</span>
              <span *ngIf="modeAffichage === 'altitude'" class="badge bg-warning text-dark">
                <i class="fas fa-mountain me-1"></i>Mode Altitude
              </span>
            </div>
            <div class="card-body p-0">
              <div class="list-group list-group-flush" *ngIf="parcelles.length > 0">
                <div *ngFor="let parcelle of parcelles"
                     class="list-group-item list-group-item-action parcelle-item"
                     [class.active]="parcelle.id === parcelleSelectionnee?.id"
                     [class.altitude-active]="modeAffichage === 'altitude' && parcelle.id === altitudeParcelleActive?.id"
                     (click)="selectionnerParcelle(parcelle)">
                  <!-- Icon agriculteur -->
                  <div class="parcelle-farmer-icon" [innerHTML]="getFarmerIconSvg(parcelle.agriculteurId || agriculteurId)"></div>
                  <div class="parcelle-info">
                    <div class="parcelle-nom">
                      {{parcelle.nom}}
                      <span *ngIf="!parcelle.estSynchronise" class="badge bg-warning ms-2">Hors ligne</span>
                    </div>
                    <div class="parcelle-meta">
                      <span>{{parcelle.surface}} ha</span>
                      <span class="mx-2">•</span>
                      <span>{{parcelle.gouvernorat || 'Localisation inconnue'}}</span>
                    </div>
                    <div *ngIf="parcelle.culture" class="parcelle-culture">
                      <i class="fas fa-seedling me-1"></i>{{parcelle.culture}}
                    </div>
                    <!-- Mini météo si disponible pour cette parcelle -->
                    <div *ngIf="getMeteoParcelle(parcelle.id)" class="meteo-mini-stats">
                      <span>{{getMeteoParcelle(parcelle.id)!.weatherIcon}}</span>
                      <span class="ms-1">{{getMeteoParcelle(parcelle.id)!.temperature | number:'1.1-1'}}°</span>
                      <span class="ms-2"><i class="fas fa-tint" style="color:#64b5f6;font-size:0.7rem;"></i> {{getMeteoParcelle(parcelle.id)!.humidity}}%</span>
                      <span class="ms-2"><i class="fas fa-wind" style="color:#90a4ae;font-size:0.7rem;"></i> {{getMeteoParcelle(parcelle.id)!.windSpeed | number:'1.0-0'}} m/s</span>
                    </div>
                    <!-- Mini stats altitude -->
                    <div *ngIf="modeAffichage === 'altitude' && altitudeParcelleActive?.id === parcelle.id && altitudeStats"
                         class="altitude-mini-stats">
                      <span class="text-danger"><i class="fas fa-arrow-up"></i> {{altitudeStats.max}}m</span>
                      <span class="mx-1 text-muted">|</span>
                      <span class="text-success"><i class="fas fa-arrow-down"></i> {{altitudeStats.min}}m</span>
                      <span class="mx-1 text-muted">|</span>
                      <span class="text-warning">Δ{{altitudeStats.denivele}}m</span>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-outline-danger btn-delete"
                          (click)="supprimerParcelle(parcelle.id); $event.stopPropagation()">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <div *ngIf="parcelles.length === 0" class="text-center py-5">
                <i class="fas fa-map-marked-alt fa-3x text-muted mb-3"></i>
                <p class="text-muted">Aucune parcelle trouvée</p>
                <button class="btn btn-success" (click)="dessinerNouvelleParcelle()">
                  <i class="fas fa-plus me-1"></i> Créer la première parcelle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal d'édition de parcelle -->
      <div class="modal fade" [class.show]="modalVisible" [style.display]="modalVisible ? 'block' : 'none'">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-dark text-white">
              <h5 class="modal-title">{{estModification ? 'Modifier' : 'Nouvelle'}} Parcelle</h5>
              <button type="button" class="btn-close btn-close-white" (click)="fermerModal()"></button>
            </div>
            <div class="modal-body">
              <form #parcelleForm="ngForm" *ngIf="parcelleEnEdition">
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Nom *</label>
                      <input type="text" class="form-control" [(ngModel)]="parcelleEnEdition.nom" name="nom" required>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Surface (ha) *</label>
                      <input type="number" class="form-control" [(ngModel)]="parcelleEnEdition.surface" name="surface" step="0.01" min="0.01" required>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Couleur</label>
                      <div class="d-flex gap-2">
                        <div *ngFor="let couleur of couleurs" class="color-option"
                             [style.background-color]="couleur"
                             [class.selected]="parcelleEnEdition.couleur === couleur"
                             (click)="parcelleEnEdition.couleur = couleur"></div>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Culture</label>
                      <select class="form-control" [(ngModel)]="parcelleEnEdition.culture" name="culture">
                        <option value="">Sélectionner</option>
                        <option value="Blé">Blé</option>
                        <option value="Orge">Orge</option>
                        <option value="Maïs">Maïs</option>
                        <option value="Olives">Olives</option>
                        <option value="Vigne">Vigne</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-4">
                    <div class="mb-3">
                      <label class="form-label">Gouvernorat</label>
                      <input type="text" class="form-control" [(ngModel)]="parcelleEnEdition.gouvernorat" name="gouvernorat">
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="mb-3">
                      <label class="form-label">Délégation</label>
                      <input type="text" class="form-control" [(ngModel)]="parcelleEnEdition.delegation" name="delegation">
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="mb-3">
                      <label class="form-label">Secteur</label>
                      <input type="text" class="form-control" [(ngModel)]="parcelleEnEdition.secteur" name="secteur">
                    </div>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" [(ngModel)]="parcelleEnEdition.description" name="description" rows="3"></textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="fermerModal()">Annuler</button>
              <button type="button" class="btn btn-primary"
                      (click)="sauvegarderParcelle()"
                      [disabled]="!parcelleEnEdition || !parcelleForm || !parcelleForm.valid || sauvegardeEnCours">
                <i class="fas fa-save me-1"></i>
                {{sauvegardeEnCours ? 'Enregistrement...' : 'Enregistrer'}}
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Chatbot Assistant -->
      <app-chatbot
        [agriculteurId]="agriculteurId"
        (onAction)="handleChatbotAction($event)">
      </app-chatbot>
    </div>
  `,
  styles: [`
    /* ─── Carte ─────────────────────────────────────────────────────────────── */
    #map { border-radius: 0 0 0.375rem 0.375rem; height: 600px; width: 100%; }

    /* ─── Bouton toggle météo ──────────────────────────────────────────────── */
    .meteo-toggle-btn {
      position: absolute; top: 20px; left: 20px; z-index: 1000;
      background: white; border: none; border-radius: 40px;
      padding: 10px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; transition: all 0.3s ease; font-weight: 500; color: #333;
    }
    .meteo-toggle-btn:hover { background:#f8f9fa; transform:scale(1.05); box-shadow:0 4px 15px rgba(0,0,0,0.3); }
    .meteo-toggle-btn.active { background:#1e3c72; color:white; }
    .meteo-toggle-btn i { font-size:1.2rem; color:#f39c12; }
    .meteo-toggle-btn.active i { color:white; }

    /* ─── Panneau Météo Principal ──────────────────────────────────────────── */
    .meteo-panel {
      position: absolute;
      top: 0; left: 0; bottom: 0;
      width: 300px;
      z-index: 1000;
      background: linear-gradient(175deg, #0f2c54 0%, #1a4a7c 35%, #0e3d6e 100%);
      color: white;
      overflow-y: auto;
      overflow-x: hidden;
      box-shadow: 4px 0 24px rgba(0,0,0,0.4);
      font-family: 'Segoe UI', system-ui, sans-serif;
      display: flex;
      flex-direction: column;
    }
    .meteo-panel::-webkit-scrollbar { width: 4px; }
    .meteo-panel::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
    .meteo-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }

    /* Header */
    .mp-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 14px 10px;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
    .mp-collapse-btn {
      background: rgba(255,255,255,0.15); border: none; color: white;
      width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s; flex-shrink: 0;
    }
    .mp-collapse-btn:hover { background: rgba(255,255,255,0.25); }
    .mp-header-info { flex: 1; min-width: 0; }
    .mp-location { font-size: 0.78rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mp-refresh-info { display: flex; align-items: center; gap: 8px; font-size: 0.68rem; color: rgba(255,255,255,0.6); margin-top: 2px; }
    .btn-refresh {
      background: none; border: none; color: rgba(255,255,255,0.6);
      cursor: pointer; padding: 2px 4px; font-size: 0.75rem;
      transition: color 0.2s;
    }
    .btn-refresh:hover { color: white; }

    /* Maintenant */
    .mp-now {
      padding: 18px 16px 14px;
      text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
    .mp-now-icon { font-size: 3rem; line-height: 1; margin-bottom: 4px; }
    .mp-now-temp { font-size: 2.4rem; font-weight: 800; letter-spacing: -1px; }
    .mp-now-label { font-size: 0.82rem; color: rgba(255,255,255,0.7); margin-bottom: 16px; }
    .mp-now-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      gap: 8px; margin-top: 4px;
    }
    .mp-now-item {
      background: rgba(255,255,255,0.08);
      border-radius: 10px; padding: 8px 6px;
      display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .mp-now-item i { font-size: 1rem; color: #7ec8e3; margin-bottom: 2px; }
    .mp-now-item span { font-size: 0.82rem; font-weight: 700; }
    .mp-now-item small { font-size: 0.62rem; color: rgba(255,255,255,0.55); text-align: center; }

    /* Boussole vent */
    .wind-compass {
      width: 28px; height: 28px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      position: relative; margin-bottom: 2px;
    }
    .wind-needle {
      position: absolute; top: 2px; left: 50%; margin-left: -1px;
      width: 2px; height: 10px;
      background: linear-gradient(to bottom, #ff6b6b 50%, rgba(255,255,255,0.3) 50%);
      transform-origin: bottom center;
      border-radius: 2px;
    }

    /* Bilan agronomique */
    .mp-agro {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
    .mp-agro-title {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.8px; color: rgba(255,255,255,0.5); margin-bottom: 10px;
    }
    .mp-agro-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px;
    }
    .mp-agro-item {
      border-radius: 10px; padding: 9px 6px; text-align: center;
    }
    .mp-agro-item.hot     { background: linear-gradient(135deg, rgba(255,100,30,0.3), rgba(255,60,0,0.15)); border: 1px solid rgba(255,100,30,0.25); }
    .mp-agro-item.cold    { background: linear-gradient(135deg, rgba(100,180,255,0.3), rgba(50,130,255,0.15)); border: 1px solid rgba(100,180,255,0.25); }
    .mp-agro-item.rain    { background: linear-gradient(135deg, rgba(60,160,255,0.3), rgba(20,100,200,0.15)); border: 1px solid rgba(60,160,255,0.25); }
    .mp-agro-item.solar   { background: linear-gradient(135deg, rgba(255,220,50,0.3), rgba(255,170,0,0.15)); border: 1px solid rgba(255,220,50,0.25); }
    .mp-agro-item.temp-range { background: linear-gradient(135deg, rgba(255,120,120,0.25), rgba(100,180,255,0.2)); border: 1px solid rgba(200,200,200,0.2); }
    .mp-agro-item.hum-avg { background: linear-gradient(135deg, rgba(100,220,180,0.25), rgba(50,170,130,0.15)); border: 1px solid rgba(100,220,180,0.2); }
    .mp-agro-val { font-size: 0.9rem; font-weight: 800; line-height: 1.1; }
    .mp-agro-unit { font-size: 0.6rem; color: rgba(255,255,255,0.5); margin: 1px 0; }
    .mp-agro-label { font-size: 0.6rem; color: rgba(255,255,255,0.65); }

    /* Historique */
    .mp-history { padding: 12px 16px; flex-shrink: 0; }
    .mp-history-title {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.8px; color: rgba(255,255,255,0.5); margin-bottom: 8px;
    }
    .mp-history-row {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 8px; border-radius: 7px; font-size: 0.72rem;
      margin-bottom: 3px; transition: background 0.15s;
    }
    .mp-history-row:hover { background: rgba(255,255,255,0.07); }
    .mp-history-now { background: rgba(255,255,255,0.1); font-weight: 700; }
    .mp-h-time { color: rgba(255,255,255,0.5); min-width: 34px; }
    .mp-h-icon { font-size: 0.9rem; }
    .mp-h-temp { min-width: 38px; font-weight: 600; }
    .mp-h-hum  { color: #64b5f6; min-width: 38px; }
    .mp-h-wind { color: #b0bec5; min-width: 44px; }
    .mp-h-rain { color: #4fc3f7; }

    /* Footer */
    .mp-footer {
      padding: 10px 16px;
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1px solid rgba(255,255,255,0.08);
      font-size: 0.68rem;
      margin-top: auto; flex-shrink: 0;
    }
    .mp-footer .btn-outline-secondary {
      border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.6);
      font-size: 0.68rem; padding: 2px 8px;
    }
    .mp-footer .btn-outline-secondary:hover { background: rgba(255,255,255,0.1); }
    .mp-footer .text-muted { color: rgba(255,255,255,0.35) !important; }

    /* ─── Icône agriculteur dans la liste ─────────────────────────────────── */
    .parcelle-farmer-icon {
      width: 36px; height: 36px; flex-shrink: 0; margin-right: 10px;
    }
    .parcelle-farmer-icon svg { width: 100%; height: 100%; }

    /* ─── Mini stats météo dans la liste ──────────────────────────────────── */
    .meteo-mini-stats {
      font-size: 0.72rem; color: #555; margin-top: 2px;
      display: flex; align-items: center; gap: 2px;
    }

    /* ─── Légende Altitude ────────────────────────────────────────────────── */
    .altitude-legend {
      position: absolute; bottom: 30px; right: 10px; z-index: 1000;
      background: rgba(255,255,255,0.96); border-radius: 12px; padding: 14px 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25); min-width: 170px;
      border: 1px solid rgba(0,0,0,0.08);
    }
    .legend-title { font-weight:700; font-size:0.82rem; color:#333; margin-bottom:10px; display:flex; align-items:center; }
    .legend-gradient {
      height:130px; width:22px; border-radius:6px;
      background: linear-gradient(to top, #1a7a1a, #4CAF50, #a8d95a, #ffe066, #ff9800, #e53935);
      float:left; margin-right:8px; box-shadow:0 1px 4px rgba(0,0,0,0.15);
    }
    .legend-labels {
      float:left; height:130px; display:flex; flex-direction:column;
      justify-content:space-between; font-size:0.78rem; font-weight:600; color:#444; margin-right:4px;
    }
    .legend-max{color:#c62828;} .legend-mid{color:#e65100;} .legend-min{color:#1b5e20;}
    .legend-stats {
      clear:both; padding-top:10px; margin-top:8px; border-top:1px solid #eee;
      display:flex; flex-direction:column; gap:4px; font-size:0.78rem; color:#555;
    }
    .altitude-hint {
      position:absolute; bottom:30px; right:10px; z-index:1000;
      background:rgba(255,193,7,0.92); color:#333; padding:10px 16px;
      border-radius:20px; font-size:0.82rem; font-weight:600;
      box-shadow:0 2px 10px rgba(0,0,0,0.2);
    }

    /* ─── Liste parcelles ────────────────────────────────────────────────── */
    .parcelle-item {
      display:flex; align-items:center; padding:12px 15px; cursor:pointer;
      transition:all 0.2s; border-left:3px solid transparent;
    }
    .parcelle-item.active { background-color:#e3f2fd; border-left-color:#2196f3; }
    .parcelle-item.altitude-active { background-color:#fff8e1; border-left-color:#ffc107; }
    .parcelle-info { flex:1; min-width:0; }
    .parcelle-nom { font-weight:600; color:#333; margin-bottom:4px; display:flex; align-items:center; }
    .parcelle-meta { font-size:0.8rem; color:#6c757d; margin-bottom:2px; }
    .parcelle-culture { font-size:0.75rem; color:#2a5298; }
    .altitude-mini-stats { font-size:0.72rem; margin-top:3px; color:#555; }
    .btn-delete { opacity:0; transition:opacity 0.2s; }
    .parcelle-item:hover .btn-delete { opacity:1; }

    /* ─── Color picker ───────────────────────────────────────────────────── */
    .color-option {
      width:40px; height:30px; cursor:pointer; border:2px solid transparent;
      transition:all 0.2s; border-radius:4px;
    }
    .color-option:hover { transform:scale(1.05); box-shadow:0 2px 8px rgba(0,0,0,0.2); }
    .color-option.selected { border:2px solid white; box-shadow:0 0 0 2px #007bff; }

    /* ─── Responsive ─────────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .altitude-legend { right:5px; bottom:10px; }
      .meteo-panel { width: 260px; }
    }
  `]
})
export class CarteParcelleComponent implements OnInit, OnDestroy {
  @ViewChild('parcelleForm') parcelleForm!: NgForm;

  // ── Météo ──────────────────────────────────────────────────────────────────
  selectedLat?: number;
  selectedLng?: number;
  selectedPointName = '';
  showMeteoPanel = false;
  meteoLoading = false;

  /** Enregistrement actuel */
  meteoActuel: MeteoRecord | null = null;

  /** Historique stocké en mémoire (tous les appels horaires) */
  historique: MeteoRecord[] = [];

  /** Résumé agronomique calculé */
  meteoSummary: MeteoSummary | null = null;

  /** Cache météo par parcelle id → dernier record */
  private meteoParParcelle: Map<number, MeteoRecord> = new Map();

  /** Timer de rafraîchissement horaire */
  private meteoTimer: any;

  // ── Agriculteur & parcelles ────────────────────────────────────────────────
  agriculteurId!: number;
  parcelles: Parcelle[] = [];
  parcelleSelectionnee: Parcelle | null = null;
  parcelleEnEdition: DessinParcelleDto & { id?: number } | null = null;
  estModification = false;

  // ── Carte Leaflet ─────────────────────────────────────────────────────────
  map!: L.Map;
  drawnItems: L.FeatureGroup = new L.FeatureGroup();
  drawControl: any = null;
  modeDessin = false;

  /** Marqueurs météo sur la carte, indexés par parcelle.id */
  private meteoMarkers: Map<number, L.Marker> = new Map();

  // ── États UI ──────────────────────────────────────────────────────────────
  modalVisible = false;
  sauvegardeEnCours = false;
  synchronisationEnCours = false;
  hasOfflineData = false;
  parcellesOfflineCount = 0;
  surfaceTotale = 0;
  connectionStatus = navigator.onLine ? 'En ligne' : 'Hors ligne';
  couleurs = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];

  // ── Mode Altitude ─────────────────────────────────────────────────────────
  modeAffichage: 'normal' | 'altitude' = 'normal';
  altitudeLoading = false;
  altitudeParcelleActive: Parcelle | null = null;
  altitudeStats: AltitudeStats | null = null;
  private altitudeLayers: Map<number, L.Layer> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parcelleService: ParcelleService,
    private cdr: ChangeDetectorRef
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.agriculteurId = +params['agriculteurId'];
      this.chargerParcelles();
      setTimeout(() => this.initCarte(), 100);
    });
    window.addEventListener('online',  this.mettreAJourStatutConnexion.bind(this));
    window.addEventListener('offline', this.mettreAJourStatutConnexion.bind(this));

  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
    if (this.meteoTimer) clearInterval(this.meteoTimer);
    window.removeEventListener('online',  this.mettreAJourStatutConnexion.bind(this));
    window.removeEventListener('offline', this.mettreAJourStatutConnexion.bind(this));

  }

  handleChatbotAction(event: any): void {
  if (event.action === 'create') {
    this.dessinerNouvelleParcelle();
  } else if (event.action === 'edit' && event.parcelle) {
    this.selectionnerParcelle(event.parcelle);
    this.parcelleEnEdition = { ...event.parcelle };
    this.estModification = true;
    this.modalVisible = true;
  }
}


  // ── Init carte ─────────────────────────────────────────────────────────────

  private initCarte(): void {
    this.map = L.map('map', { zoomSnap: 0.25, zoomDelta: 0.5, preferCanvas: true })
               .setView([34.0, 9.0], 6);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20, attribution: '© Esri' }
    ).addTo(this.map);
    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20, attribution: '© Esri' }
    ).addTo(this.map);

    this.drawnItems.addTo(this.map);
    this.initControlesDessin();

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.onMapClick(e.latlng.lat, e.latlng.lng, 'Point sélectionné');
    });
  }

  // ── Météo : méthodes publiques ─────────────────────────────────────────────

  toggleMeteoPanel(): void {
    this.showMeteoPanel = !this.showMeteoPanel;
    if (this.showMeteoPanel && !this.meteoActuel && this.selectedLat && this.selectedLng) {
      this.chargerMeteoPoint(this.selectedLat, this.selectedLng, this.selectedPointName);
    }
  }

  async rafraichirMeteo(): Promise<void> {
    if (this.selectedLat && this.selectedLng) {
      await this.chargerMeteoPoint(this.selectedLat, this.selectedLng, this.selectedPointName);
    }
  }

  effacerHistorique(): void {
    if (confirm('Effacer tout l\'historique météo ?')) {
      this.historique = [];
      this.meteoSummary = null;
      // Vider également le stockage localStorage
      try { localStorage.removeItem(`meteo_hist_${this.agriculteurId}`); } catch {}
    }
  }

  getMeteoParcelle(parcelleId: number): MeteoRecord | undefined {
    return this.meteoParParcelle.get(parcelleId);
  }

  /** Renvoie le SVG de l'icône agriculteur (déterministe par id) */
  getFarmerIconSvg(agriculteurId: number): string {
    const idx = Math.abs(agriculteurId) % FARMER_ICONS.length;
    return FARMER_ICONS[idx];
  }

  // ── Météo : clic sur carte ou sélection parcelle ───────────────────────────

  private async onMapClick(lat: number, lng: number, nom: string): Promise<void> {
    this.selectedLat = lat;
    this.selectedLng = lng;
    this.selectedPointName = nom;
    if (this.showMeteoPanel) {
      await this.chargerMeteoPoint(lat, lng, nom);
    }
  }

  // ── Météo : appel API Open-Meteo ───────────────────────────────────────────

  /**
   * Charge les données météo via Open-Meteo (CORS libre, sans clé API).
   * Variables : temperature_2m, relative_humidity_2m, surface_pressure,
   *             wind_speed_10m, wind_direction_10m, precipitation,
   *             shortwave_radiation, weather_code
   */
  async chargerMeteoPoint(lat: number, lng: number, nom: string): Promise<void> {
    this.meteoLoading = true;
    try {
      const url = `https://api.open-meteo.com/v1/forecast`
        + `?latitude=${lat}&longitude=${lng}`
        + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,`
        + `weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,`
        + `precipitation,shortwave_radiation`
        + `&wind_speed_unit=ms`
        + `&timezone=auto`;

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Météo: ${resp.status}`);
      const data = await resp.json();
      const c = data.current;

      const wmoInfo = wmoToInfo(c.weather_code);
      const record: MeteoRecord = {
        timestamp:          Date.now(),
        temperature:        c.temperature_2m,
        humidity:           c.relative_humidity_2m,
        pressure:           c.surface_pressure,
        windSpeed:          c.wind_speed_10m,
        windDirection:      c.wind_direction_10m,
        windDirectionLabel: degToDir(c.wind_direction_10m),
        precipitation:      c.precipitation ?? 0,
        solarRadiation:     c.shortwave_radiation ?? 0,
        weatherCode:        c.weather_code,
        weatherLabel:       wmoInfo.label,
        weatherIcon:        wmoInfo.icon
      };

      this.meteoActuel = record;

      // Stocker dans l'historique
      this.historique.push(record);
      this.sauvegarderHistorique();
      this.calculerBilanAgronomique();

      this.cdr.detectChanges();
    } catch (err) {
      console.error('Erreur météo:', err);
    } finally {
      this.meteoLoading = false;
    }
  }

  /**
   * Charge la météo pour toutes les parcelles et place les marqueurs sur la carte.
   * Appelé au chargement initial et toutes les heures.
   */
  private async chargerMeteoPourToutesParcelles(): Promise<void> {
    for (const parcelle of this.parcelles) {
      if (!parcelle.latitude || !parcelle.longitude) continue;
      try {
        await this.sleep(300); // éviter le rate-limit
        const url = `https://api.open-meteo.com/v1/forecast`
          + `?latitude=${parcelle.latitude}&longitude=${parcelle.longitude}`
          + `&current=temperature_2m,relative_humidity_2m,weather_code,`
          + `wind_speed_10m,wind_direction_10m,precipitation,shortwave_radiation`
          + `&wind_speed_unit=ms&timezone=auto`;

        const resp = await fetch(url);
        if (!resp.ok) continue;
        const data = await resp.json();
        const c = data.current;
        const wmoInfo = wmoToInfo(c.weather_code);

        const record: MeteoRecord = {
          timestamp:          Date.now(),
          temperature:        c.temperature_2m,
          humidity:           c.relative_humidity_2m,
          pressure:           0,
          windSpeed:          c.wind_speed_10m,
          windDirection:      c.wind_direction_10m,
          windDirectionLabel: degToDir(c.wind_direction_10m),
          precipitation:      c.precipitation ?? 0,
          solarRadiation:     c.shortwave_radiation ?? 0,
          weatherCode:        c.weather_code,
          weatherLabel:       wmoInfo.label,
          weatherIcon:        wmoInfo.icon
        };

        this.meteoParParcelle.set(parcelle.id, record);
        this.mettreAJourMarqueurMeteo(parcelle, record);
        this.cdr.detectChanges();
      } catch (e) {
        console.error(`Météo parcelle ${parcelle.nom}:`, e);
      }
    }
  }

  /** Crée ou met à jour le marqueur Leaflet pour une parcelle */
  private mettreAJourMarqueurMeteo(parcelle: Parcelle, record: MeteoRecord): void {
    if (!parcelle.latitude || !parcelle.longitude) return;

    // Supprimer l'ancien marqueur
    if (this.meteoMarkers.has(parcelle.id)) {
      this.map.removeLayer(this.meteoMarkers.get(parcelle.id)!);
    }

    const farmerIdx = Math.abs((parcelle.agriculteurId || this.agriculteurId)) % FARMER_ICONS.length;
    const iconColors = [
      '#2d7a2d','#1a6b9a','#e07820','#7b3fa0','#c9a800','#1588c8',
      '#3aa86e','#c83030','#8b5a2b','#3d5a80','#0d7377','#a03030'
    ];
    const bgColor = iconColors[farmerIdx];

    const iconHtml = `
      <div style="
        background:${bgColor};
        border:2.5px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        width:38px;height:38px;
        box-shadow:0 3px 10px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="transform:rotate(45deg);font-size:1.05rem;line-height:1;">
          ${record.weatherIcon}
        </div>
      </div>
      <div style="
        background:rgba(0,0,0,0.75);color:white;
        font-size:0.62rem;font-weight:700;
        padding:2px 5px;border-radius:4px;
        text-align:center;margin-top:2px;white-space:nowrap;
        backdrop-filter:blur(4px);
      ">
        ${record.temperature.toFixed(1)}°C
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'meteo-marker-icon',
      iconSize: [42, 58],
      iconAnchor: [21, 54],
      popupAnchor: [0, -54]
    });

    const popupContent = `
      <div style="font-family:system-ui,sans-serif;min-width:210px;padding:4px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="font-size:2rem;">${record.weatherIcon}</span>
          <div>
            <div style="font-weight:700;font-size:0.95rem;color:#1a3c5e;">${parcelle.nom}</div>
            <div style="font-size:0.75rem;color:#666;">${record.weatherLabel}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.78rem;">
          <div style="background:#f0f7ff;border-radius:6px;padding:6px 8px;">
            <div style="color:#555;font-size:0.65rem;margin-bottom:1px;">🌡️ Température</div>
            <strong style="color:#1565C0;">${record.temperature.toFixed(1)} °C</strong>
          </div>
          <div style="background:#f0f7ff;border-radius:6px;padding:6px 8px;">
            <div style="color:#555;font-size:0.65rem;margin-bottom:1px;">💧 Humidité</div>
            <strong style="color:#1565C0;">${record.humidity} %</strong>
          </div>
          <div style="background:#f0f7ff;border-radius:6px;padding:6px 8px;">
            <div style="color:#555;font-size:0.65rem;margin-bottom:1px;">💨 Vent</div>
            <strong style="color:#1565C0;">${record.windSpeed.toFixed(1)} m/s ${record.windDirectionLabel}</strong>
          </div>
          <div style="background:#f0f7ff;border-radius:6px;padding:6px 8px;">
            <div style="color:#555;font-size:0.65rem;margin-bottom:1px;">🌧️ Pluie</div>
            <strong style="color:#1565C0;">${record.precipitation.toFixed(1)} mm</strong>
          </div>
          <div style="background:#f0f7ff;border-radius:6px;padding:6px 8px;">
            <div style="color:#555;font-size:0.65rem;margin-bottom:1px;">☀️ Rayonnement</div>
            <strong style="color:#1565C0;">${record.solarRadiation.toFixed(0)} W/m²</strong>
          </div>
          <div style="background:#f0f7ff;border-radius:6px;padding:6px 8px;">
            <div style="color:#555;font-size:0.65rem;margin-bottom:1px;">🗓️ MAJ</div>
            <strong style="color:#1565C0;">${new Date(record.timestamp).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</strong>
          </div>
        </div>
        <div style="margin-top:8px;font-size:0.68rem;color:#999;text-align:center;">
          📍 ${parcelle.surface} ha • ${parcelle.gouvernorat||'Tunisie'}
        </div>
      </div>
    `;

    const marker = L.marker([parcelle.latitude, parcelle.longitude], { icon })
      .bindPopup(popupContent, { maxWidth: 240 })
      .on('click', () => {
        this.selectedLat = parcelle.latitude!;
        this.selectedLng = parcelle.longitude!;
        this.selectedPointName = parcelle.nom;
        this.meteoActuel = record;
        this.showMeteoPanel = true;
        this.cdr.detectChanges();
      });

    marker.addTo(this.map);
    this.meteoMarkers.set(parcelle.id, marker);
  }

  // ── Bilan agronomique ──────────────────────────────────────────────────────

  private calculerBilanAgronomique(): void {
    if (!this.historique.length) { this.meteoSummary = null; return; }

    const BASE_CHALEUR = 10;  // base GDD
    const SEUIL_FROID  = 7;   // <7°C = heure de froid

    let chaleurCumulee = 0;
    let froidCumule    = 0;
    let precipTotale   = 0;
    let rayonnementTotal = 0;
    let tempMin = Infinity, tempMax = -Infinity;
    const temps: number[] = [];
    const hums: number[] = [];

    this.historique.forEach(r => {
      // GDD horaire (1/24 de jour)
      const gddHoraire = Math.max(0, r.temperature - BASE_CHALEUR) / 24;
      chaleurCumulee += gddHoraire;

      // Heures de froid
      if (r.temperature < SEUIL_FROID) froidCumule += 1;

      precipTotale     += r.precipitation;
      rayonnementTotal += r.solarRadiation / 1000; // W/m² → kWh/m² approx (1h)
      if (r.temperature < tempMin) tempMin = r.temperature;
      if (r.temperature > tempMax) tempMax = r.temperature;
      temps.push(r.temperature);
      hums.push(r.humidity);
    });

    this.meteoSummary = {
      chaleurCumulee,
      froidCumule,
      precipTotale,
      rayonnementTotal,
      tempMoyenne: temps.reduce((a,b) => a+b, 0) / temps.length,
      tempMin,
      tempMax,
      humMoyenne: hums.reduce((a,b) => a+b, 0) / hums.length,
      nbMesures: this.historique.length,
      derniereMAJ: new Date(this.historique[this.historique.length - 1].timestamp)
    };
  }

  // ── Stockage localStorage ─────────────────────────────────────────────────

  private sauvegarderHistorique(): void {
    try {
      // Garder les 720 dernières mesures (30 jours × 24h)
      const slice = this.historique.slice(-720);
      localStorage.setItem(`meteo_hist_${this.agriculteurId}`, JSON.stringify(slice));
    } catch (e) { /* quota dépassé */ }
  }

  private chargerHistoriqueStocke(): void {
    try {
      const raw = localStorage.getItem(`meteo_hist_${this.agriculteurId}`);
      if (raw) {
        this.historique = JSON.parse(raw) as MeteoRecord[];
        if (this.historique.length) {
          this.meteoActuel = this.historique[this.historique.length - 1];
          this.calculerBilanAgronomique();
        }
      }
    } catch {}
  }

  // ── Rafraîchissement horaire ───────────────────────────────────────────────

  private demarrerRafraichissementHoraire(): void {
    // Appel immédiat
    this.chargerMeteoPourToutesParcelles();
    // Puis toutes les heures
    this.meteoTimer = setInterval(() => {
      this.chargerMeteoPourToutesParcelles();
      // Aussi rafraîchir le point sélectionné si panel ouvert
      if (this.showMeteoPanel && this.selectedLat && this.selectedLng) {
        this.chargerMeteoPoint(this.selectedLat, this.selectedLng, this.selectedPointName);
      }
    }, 3_600_000); // 1 heure
  }

  // ── Mode Altitude ──────────────────────────────────────────────────────────

  basculerModeAltitude(): void {
    if (this.modeAffichage === 'altitude') {
      this.desactiverModeAltitude();
    } else {
      this.modeAffichage = 'altitude';
      this.afficherParcellesSurCarte();
    }
  }

  private desactiverModeAltitude(): void {
    this.modeAffichage = 'normal';
    this.altitudeParcelleActive = null;
    this.altitudeStats = null;
    this.altitudeLayers.forEach(layer => this.map.removeLayer(layer));
    this.altitudeLayers.clear();
    this.afficherParcellesSurCarte();
  }

  async afficherHeatmapAltitude(parcelle: Parcelle): Promise<void> {
    if (!parcelle.geometrie) return;
    if (this.altitudeParcelleActive && this.altitudeLayers.has(this.altitudeParcelleActive.id)) {
      this.map.removeLayer(this.altitudeLayers.get(this.altitudeParcelleActive.id)!);
      this.altitudeLayers.delete(this.altitudeParcelleActive.id);
    }
    this.altitudeLoading = true;
    this.altitudeParcelleActive = parcelle;
    this.altitudeStats = null;
    try {
      const geoJson = JSON.parse(parcelle.geometrie);
      const coords  = this.extraireCoordonnees(geoJson);
      if (!coords.length) { this.altitudeLoading = false; return; }
      const grille  = this.genererGrille(coords, 8);
      const pts     = await this.recupererAltitudes(grille);
      const altitudes = pts.map(p => p.altitude);
      const min  = Math.round(Math.min(...altitudes));
      const max  = Math.round(Math.max(...altitudes));
      const mean = altitudes.reduce((s, a) => s + a, 0) / altitudes.length;
      this.altitudeStats = { min, max, mean, denivele: max - min };
      const heatLayer = this.creerCoucheHeatmap(pts, min, max, coords);
      heatLayer.addTo(this.map);
      this.altitudeLayers.set(parcelle.id, heatLayer);
    } catch (err) {
      console.error('Erreur altitude:', err);
    } finally {
      this.altitudeLoading = false;
    }
  }

  // ── Altitude : méthodes privées ────────────────────────────────────────────

  private extraireCoordonnees(geoJson: any): [number, number][] {
    let coords: any = [];
    if (geoJson.type === 'Feature')      coords = geoJson.geometry?.coordinates ?? [];
    else if (geoJson.type === 'Polygon') coords = geoJson.coordinates ?? [];
    else if (geoJson.type === 'FeatureCollection' && geoJson.features?.length)
      coords = geoJson.features[0].geometry?.coordinates ?? [];
    return (coords[0] ?? []) as [number, number][];
  }

  private genererGrille(polygonCoords: [number, number][], steps = 8): { lat: number; lng: number }[] {
    const lngs = polygonCoords.map(c => c[0]);
    const lats = polygonCoords.map(c => c[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const stepLng = (maxLng - minLng) / (steps + 1);
    const stepLat = (maxLat - minLat) / (steps + 1);
    const points: { lat: number; lng: number }[] = [];
    for (let i = 1; i <= steps; i++) {
      for (let j = 1; j <= steps; j++) {
        const lng = minLng + i * stepLng;
        const lat = minLat + j * stepLat;
        if (this.pointDansPolygone(lng, lat, polygonCoords)) points.push({ lat, lng });
      }
    }
    polygonCoords.forEach(([lng, lat]) => points.push({ lat, lng }));
    return points;
  }

  private pointDansPolygone(px: number, py: number, poly: [number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const intersect = ((yi > py) !== (yj > py)) &&
                        (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private async recupererAltitudes(points: { lat: number; lng: number }[]): Promise<AltitudePoint[]> {
    const BATCH = 100;
    const results: AltitudePoint[] = [];
    for (let i = 0; i < points.length; i += BATCH) {
      const batch = points.slice(i, i + BATCH);
      const lats  = batch.map(p => p.lat).join(',');
      const lngs  = batch.map(p => p.lng).join(',');
      const resp  = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`);
      if (!resp.ok) throw new Error(`Altitude: ${resp.status}`);
      const data: { elevation: number[] } = await resp.json();
      data.elevation.forEach((el, idx) => results.push({ lat: batch[idx].lat, lng: batch[idx].lng, altitude: el }));
    }
    return results;
  }

  private creerCoucheHeatmap(points: AltitudePoint[], minAlt: number, maxAlt: number, polyCoords: [number, number][]): L.Layer {
    const lngs = polyCoords.map(c => c[0]);
    const lats = polyCoords.map(c => c[1]);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const W = 400, H = 400, POWER = 2;
    const range = maxAlt - minAlt || 1;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(W, H);
    const data = imgData.data;
    const pts = points.map(p => ({
      nx: (p.lng - minLng) / (maxLng - minLng),
      ny: 1 - (p.lat - minLat) / (maxLat - minLat),
      alt: p.altitude
    }));
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const nx = px / (W - 1), ny = py / (H - 1);
        const lng = minLng + nx * (maxLng - minLng);
        const lat = maxLat - ny * (maxLat - minLat);
        if (!this.pointDansPolygone(lng, lat, polyCoords)) continue;
        let ws = 0, vs = 0;
        for (const pt of pts) {
          const d2 = (nx - pt.nx) ** 2 + (ny - pt.ny) ** 2;
          if (d2 < 1e-10) { vs = pt.alt; ws = 1; break; }
          const w = 1 / d2 ** (POWER / 2);
          ws += w; vs += w * pt.alt;
        }
        const ratio = Math.max(0, Math.min(1, (vs / ws - minAlt) / range));
        const [r, g, b] = this.altRGB(ratio);
        const idx = (py * W + px) * 4;
        data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = 180;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const blurred = document.createElement('canvas');
    blurred.width = W; blurred.height = H;
    const bCtx = blurred.getContext('2d')!;
    bCtx.filter = 'blur(10px)';
    bCtx.drawImage(canvas, 0, 0);
    const overlay = L.imageOverlay(blurred.toDataURL(), [[minLat, minLng], [maxLat, maxLng]], { opacity: 1, interactive: false });
    const contour = L.polygon(polyCoords.map(([lng, lat]) => [lat, lng] as [number, number]),
      { color: '#fff', weight: 2.5, fillOpacity: 0, dashArray: '6,3', interactive: false });
    return L.layerGroup([overlay, contour]);
  }

  private altRGB(r: number): [number, number, number] {
    const s: [number, [number, number, number]][] = [
      [0.00,[26,122,26]],[0.20,[76,175,80]],[0.40,[168,217,90]],
      [0.55,[255,224,102]],[0.70,[255,152,0]],[0.85,[229,57,53]],[1.00,[130,20,10]]
    ];
    for (let i = 0; i < s.length - 1; i++) {
      const [r1,c1] = s[i], [r2,c2] = s[i+1];
      if (r >= r1 && r <= r2) {
        const t = (r - r1) / (r2 - r1);
        return [Math.round(c1[0]+t*(c2[0]-c1[0])), Math.round(c1[1]+t*(c2[1]-c1[1])), Math.round(c1[2]+t*(c2[2]-c1[2]))];
      }
    }
    return [130, 20, 10];
  }

  // ── Chargement & affichage parcelles ──────────────────────────────────────

  private chargerParcelles(): void {
    this.chargerHistoriqueStocke();
    this.parcelleService.getParcellesByAgriculteur(this.agriculteurId).subscribe({
      next: (parcelles) => {
        this.parcelles = parcelles;
        this.calculerStatistiques();
        this.afficherParcellesSurCarte();
        // Démarrer la récupération météo pour toutes les parcelles
        this.demarrerRafraichissementHoraire();
      },
      error: (err) => console.error('Erreur chargement:', err)
    });
  }

  private afficherParcellesSurCarte(): void {
    this.drawnItems.clearLayers();
    this.parcelles.forEach(parcelle => {
      if (!parcelle.geometrie) return;
      try {
        const geoJson = JSON.parse(parcelle.geometrie);
        const style = this.modeAffichage === 'altitude'
          ? { color: '#ffffff', fillColor: 'transparent', fillOpacity: 0, weight: 2.5, dashArray: '5,3' }
          : { color: parcelle.couleur, fillColor: parcelle.couleur, fillOpacity: 0.3, weight: 2 };
        const layer = L.geoJSON(geoJson, { style });
        layer.bindPopup(`<strong>${parcelle.nom}</strong><br>Surface: ${parcelle.surface} ha<br>${parcelle.culture || ''}`);
        layer.on('click', () => this.selectionnerParcelle(parcelle));
        this.drawnItems.addLayer(layer);
      } catch {}
    });
  }

  private calculerStatistiques(): void {
    this.surfaceTotale = this.parcelles.reduce((s, p) => s + p.surface, 0);
    this.parcellesOfflineCount = this.parcelles.filter(p => !p.estSynchronise).length;
    this.hasOfflineData = this.parcellesOfflineCount > 0;
  }

  selectionnerParcelle(parcelle: Parcelle): void {
    this.parcelleSelectionnee = parcelle;
    if (parcelle.latitude && parcelle.longitude) {
      this.map.setView([parcelle.latitude, parcelle.longitude], 15);
      this.onMapClick(parcelle.latitude, parcelle.longitude, parcelle.nom);
    }
    if (this.modeAffichage === 'altitude' && this.altitudeParcelleActive?.id !== parcelle.id) {
      this.afficherHeatmapAltitude(parcelle);
    }
  }

  // ── Dessin ─────────────────────────────────────────────────────────────────

  private calculerSurfacePolygone(latlngs: L.LatLng[]): number {
    const coords = latlngs.map(p => [p.lng, p.lat]);
    coords.push(coords[0]);
    return +(area(polygon([coords])) / 10000).toFixed(3);
  }

  dessinerNouvelleParcelle(): void {
    this.modeDessin = true;
    new (L as any).Draw.Polygon(this.map, this.drawControl.options.draw.polygon).enable();
  }

  changerMode(): void {
    if (this.modeDessin) {
      this.modeDessin = false;
      if (this.map) { this.map.removeControl(this.drawControl); this.initControlesDessin(); }
    } else {
      this.dessinerNouvelleParcelle();
    }
  }

  ouvrirModalAvecGeometrie(layer: L.Layer): void {
    const pol = layer as L.Polygon;
    const center = pol.getBounds().getCenter();
    const latlngs = pol.getLatLngs()[0] as L.LatLng[];
    this.parcelleEnEdition = {
      nom: `Parcelle ${new Date().toLocaleDateString()}`,
      surface: this.calculerSurfacePolygone(latlngs),
      couleur: '#4CAF50',
      latitude: center.lat,
      longitude: center.lng,
      geometrie: JSON.stringify((layer as any).toGeoJSON())
    };
    this.estModification = false;
    this.modalVisible = true;
    this.modeDessin = false;
  }

  async sauvegarderParcelle(): Promise<void> {
    if (!this.parcelleEnEdition || !this.parcelleForm.valid) return;
    this.sauvegardeEnCours = true;
    try {
      const parcelleId = (this.parcelleEnEdition as any).id;
      if (this.estModification && parcelleId) {
        console.log('Mise à jour parcelle:', parcelleId);
      } else {
        const parcelle = await this.parcelleService.createParcelle(
          this.agriculteurId, this.parcelleEnEdition).toPromise();
        if (parcelle) {
          this.parcelles.push(parcelle);
          this.calculerStatistiques();
          this.afficherParcellesSurCarte();
          this.fermerModal();
        }
      }
    } catch (err: any) {
      alert(err.message || 'Erreur sauvegarde');
    } finally {
      this.sauvegardeEnCours = false;
    }
  }

  supprimerParcelle(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette parcelle ?')) {
      this.parcelles = this.parcelles.filter(p => p.id !== id);
      if (this.altitudeLayers.has(id)) { this.map.removeLayer(this.altitudeLayers.get(id)!); this.altitudeLayers.delete(id); }
      if (this.altitudeParcelleActive?.id === id) { this.altitudeParcelleActive = null; this.altitudeStats = null; }
      if (this.meteoMarkers.has(id)) { this.map.removeLayer(this.meteoMarkers.get(id)!); this.meteoMarkers.delete(id); }
      this.meteoParParcelle.delete(id);
      this.calculerStatistiques();
      this.afficherParcellesSurCarte();
      if (this.parcelleSelectionnee?.id === id) this.parcelleSelectionnee = null;
    }
  }

  centrerCarte(): void { this.map.setView([34.0, 9.0], 6); }

  synchroniser(): void {
    this.synchronisationEnCours = true;
    this.parcelleService.synchroniserParcelles().subscribe({
      next:     () => { this.chargerParcelles(); alert('Synchronisation terminée !'); },
      error:    () => { alert('Erreur synchronisation'); },
      complete: () => { this.synchronisationEnCours = false; }
    });
  }

  fermerModal(): void {
    this.modalVisible = false;
    this.parcelleEnEdition = null;
    this.estModification = false;
    if (this.drawnItems.getLayers().length > this.parcelles.length) {
      const layers = this.drawnItems.getLayers();
      this.drawnItems.removeLayer(layers[layers.length - 1]);
    }
  }

  private initControlesDessin(): void {
    const drawOptions: any = {
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: { color: '#e1e100', message: 'Polygone invalide' },
          shapeOptions: { color: '#4CAF50', fillColor: '#4CAF50', fillOpacity: 0.3 }
        },
        polyline: false, circle: false, rectangle: false, marker: false, circlemarker: false
      },
      edit: { featureGroup: this.drawnItems, remove: true }
    };
    this.drawControl = new (L as any).Control.Draw(drawOptions);
    this.map.addControl(this.drawControl);
    this.map.on('draw:created', (e: any) => { this.drawnItems.addLayer(e.layer); this.ouvrirModalAvecGeometrie(e.layer); });
  }

  private sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

  private mettreAJourStatutConnexion(): void {
    this.connectionStatus = navigator.onLine ? 'En ligne' : 'Hors ligne';
    if (navigator.onLine && this.hasOfflineData) this.synchroniser();
  }


}
