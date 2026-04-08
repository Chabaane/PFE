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
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#2d7a2d" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🌾</text>
    <polygon points="22,42 15,54 29,54" fill="#2d7a2d"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#1a6b9a" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🫒</text>
    <polygon points="22,42 15,54 29,54" fill="#1a6b9a"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#e07820" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🚜</text>
    <polygon points="22,42 15,54 29,54" fill="#e07820"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#7b3fa0" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🍇</text>
    <polygon points="22,42 15,54 29,54" fill="#7b3fa0"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#c9a800" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🌽</text>
    <polygon points="22,42 15,54 29,54" fill="#c9a800"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#1588c8" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">💧</text>
    <polygon points="22,42 15,54 29,54" fill="#1588c8"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#3aa86e" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🌱</text>
    <polygon points="22,42 15,54 29,54" fill="#3aa86e"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#c83030" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🌻</text>
    <polygon points="22,42 15,54 29,54" fill="#c83030"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#8b5a2b" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🏡</text>
    <polygon points="22,42 15,54 29,54" fill="#8b5a2b"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#3d5a80" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🍋</text>
    <polygon points="22,42 15,54 29,54" fill="#3d5a80"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#0d7377" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🍀</text>
    <polygon points="22,42 15,54 29,54" fill="#0d7377"/>
  </svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#a03030" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🌶️</text>
    <polygon points="22,42 15,54 29,54" fill="#a03030"/>
  </svg>`,
];

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

@Component({
  selector: 'app-carte-parcelle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DecimalPipe, DatePipe, ChatbotComponent],
  templateUrl: './carte-parcelle.html',
  styleUrls: ['./carte-parcelle.scss']
})
export class CarteParcelleComponent implements OnInit, OnDestroy {
  @ViewChild('parcelleForm') parcelleForm!: NgForm;

  // ── Météo ──────────────────────────────────────────────────────────────────
  selectedLat?: number;
  selectedLng?: number;
  selectedPointName = '';
  showMeteoPanel = false;
  meteoLoading = false;
  meteoActuel: MeteoRecord | null = null;
  historique: MeteoRecord[] = [];
  meteoSummary: MeteoSummary | null = null;
  private meteoParParcelle: Map<number, MeteoRecord> = new Map();
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

  // ── Mode Altitude (avec cache optimisé) ────────────────────────────────────
  modeAffichage: 'normal' | 'altitude' = 'normal';
  altitudeLoading = false;
  altitudeParcelleActive: Parcelle | null = null;
  altitudeStats: AltitudeStats | null = null;
  private altitudeLayers: Map<number, L.Layer> = new Map();

  // ── Cache altitude avec sessionStorage (CORRECTION 1) ──────────────────────
  private readonly ALT_CACHE_KEY = 'altitude_cache_cp_v2';
  private altCache: Map<string, number> = new Map();

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
    window.addEventListener('online', this.mettreAJourStatutConnexion.bind(this));
    window.addEventListener('offline', this.mettreAJourStatutConnexion.bind(this));
    this.loadAltCache(); // Charger le cache altitude depuis sessionStorage
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
    if (this.meteoTimer) clearInterval(this.meteoTimer);
    window.removeEventListener('online', this.mettreAJourStatutConnexion.bind(this));
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

  // ─── MÉTHODES ALTITUDE AVEC CACHE OPTIMISÉ ─────────────────────────────────

  private loadAltCache(): void {
    try {
      const raw = sessionStorage.getItem(this.ALT_CACHE_KEY);
      if (raw) {
        this.altCache = new Map(Object.entries(JSON.parse(raw)));
      }
    } catch (e) {
      console.warn('Erreur chargement cache altitude:', e);
    }
  }

  private saveAltCache(): void {
    try {
      sessionStorage.setItem(this.ALT_CACHE_KEY, JSON.stringify(Object.fromEntries(this.altCache)));
    } catch (e) {
      console.warn('Erreur sauvegarde cache altitude (quota dépassé?)', e);
    }
  }

  private altKey(lat: number, lng: number): string {
    // Arrondi à 3 décimales (~111m) pour le cache (CORRECTION 1)
    return `${lat.toFixed(3)},${lng.toFixed(3)}`;
  }

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

    // Supprimer l'ancienne couche altitude
    if (this.altitudeParcelleActive && this.altitudeLayers.has(this.altitudeParcelleActive.id)) {
      this.map.removeLayer(this.altitudeLayers.get(this.altitudeParcelleActive.id)!);
      this.altitudeLayers.delete(this.altitudeParcelleActive.id);
    }

    this.altitudeLoading = true;
    this.altitudeParcelleActive = parcelle;
    this.altitudeStats = null;

    try {
      const geoJson = JSON.parse(parcelle.geometrie);
      const coords = this.extraireCoordonnees(geoJson);
      if (!coords.length) {
        this.altitudeLoading = false;
        return;
      }

      // CORRECTION 2: Grille réduite 6×6 (au lieu de 8×8) pour moins de requêtes
      const grille = this.genererGrille(coords, 6);
      const pointsAvecAltitude = await this.recupererAltitudesAvecCache(grille);

      const altitudes = pointsAvecAltitude.map(p => p.altitude);
      const min = Math.round(Math.min(...altitudes));
      const max = Math.round(Math.max(...altitudes));
      const mean = altitudes.reduce((s, a) => s + a, 0) / altitudes.length;
      this.altitudeStats = { min, max, mean, denivele: max - min };

      const heatLayer = this.creerCoucheHeatmap(pointsAvecAltitude, min, max, coords);
      heatLayer.addTo(this.map);
      this.altitudeLayers.set(parcelle.id, heatLayer);
    } catch (err) {
      console.error('Erreur chargement altitude:', err);
      alert('Impossible de charger les données d\'altitude. Veuillez réessayer.');
    } finally {
      this.altitudeLoading = false;
    }
  }

  /**
   * Récupère les altitudes avec cache sessionStorage + retry backoff (CORRECTION 1 & 3)
   */
  private async recupererAltitudesAvecCache(points: { lat: number; lng: number }[]): Promise<AltitudePoint[]> {
    const results: AltitudePoint[] = [];
    const toFetch: { lat: number; lng: number; key: string }[] = [];
    const seen = new Set<string>();

    // Séparer points en cache / à fetcher, avec déduplication
    for (const p of points) {
      const key = this.altKey(p.lat, p.lng);
      if (seen.has(key)) continue;
      seen.add(key);
      const cached = this.altCache.get(key);
      if (cached !== undefined) {
        results.push({ lat: p.lat, lng: p.lng, altitude: cached });
      } else {
        toFetch.push({ lat: p.lat, lng: p.lng, key });
      }
    }

    if (!toFetch.length) return results;

    const BATCH = 100;
    for (let i = 0; i < toFetch.length; i += BATCH) {
      const batch = toFetch.slice(i, i + BATCH);
      const lats = batch.map(p => p.lat).join(',');
      const lngs = batch.map(p => p.lng).join(',');
      const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;

      let lastErr: Error | null = null;
      // CORRECTION 3: Retry avec backoff exponentiel
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await this.wait(1000 * Math.pow(2, attempt));
        try {
          const res = await fetch(url);
          if (res.status === 429) {
            lastErr = new Error('429');
            continue;
          }
          if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
          const data: { elevation: number[] } = await res.json();
          data.elevation.forEach((el, idx) => {
            this.altCache.set(batch[idx].key, el);
            results.push({ lat: batch[idx].lat, lng: batch[idx].lng, altitude: el });
          });
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = e;
          if (e.message !== '429') break;
        }
      }

      // Fallback: si toujours 429 après retries, utiliser interpolation
      if (lastErr && lastErr.message === '429') {
        batch.forEach(p => {
          const alt = this.interpAltitude(p.lat, p.lng);
          this.altCache.set(p.key, alt);
          results.push({ lat: p.lat, lng: p.lng, altitude: alt });
        });
      } else if (lastErr) {
        throw lastErr;
      }

      if (i + BATCH < toFetch.length) await this.wait(500);
    }

    this.saveAltCache();
    return results;
  }

  /**
   * Interpolation d'altitude à partir des points en cache (fallback anti-429)
   */
  private interpAltitude(lat: number, lng: number): number {
    if (this.altCache.size === 0) return 100;
    let bestDist = Infinity, bestAlt = 100;
    this.altCache.forEach((alt, key) => {
      const [kl, kg] = key.split(',').map(Number);
      const d = (lat - kl) ** 2 + (lng - kg) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestAlt = alt;
      }
    });
    return bestAlt;
  }

  private wait(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  private extraireCoordonnees(geoJson: any): [number, number][] {
    let coords: any = [];
    if (geoJson.type === 'Feature') coords = geoJson.geometry?.coordinates ?? [];
    else if (geoJson.type === 'Polygon') coords = geoJson.coordinates ?? [];
    else if (geoJson.type === 'FeatureCollection' && geoJson.features?.length)
      coords = geoJson.features[0].geometry?.coordinates ?? [];
    return (coords[0] ?? []) as [number, number][];
  }

  private genererGrille(polygonCoords: [number, number][], steps = 6): { lat: number; lng: number }[] {
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
        if (this.pointDansPolygone(lng, lat, polygonCoords)) {
          points.push({ lat, lng });
        }
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
          ws += w;
          vs += w * pt.alt;
        }

        const ratio = Math.max(0, Math.min(1, (vs / ws - minAlt) / range));
        const [r, g, b] = this.altitudeVersRGB(ratio);
        const idx = (py * W + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 180;
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

  private altitudeVersRGB(ratio: number): [number, number, number] {
    const stops: [number, [number, number, number]][] = [
      [0.00, [26, 122, 26]],
      [0.20, [76, 175, 80]],
      [0.40, [168, 217, 90]],
      [0.55, [255, 224, 102]],
      [0.70, [255, 152, 0]],
      [0.85, [229, 57, 53]],
      [1.00, [130, 20, 10]]
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      const [r1, c1] = stops[i];
      const [r2, c2] = stops[i + 1];
      if (ratio >= r1 && ratio <= r2) {
        const t = (ratio - r1) / (r2 - r1);
        return [
          Math.round(c1[0] + t * (c2[0] - c1[0])),
          Math.round(c1[1] + t * (c2[1] - c1[1])),
          Math.round(c1[2] + t * (c2[2] - c1[2]))
        ];
      }
    }
    return [130, 20, 10];
  }

  // ── MÉTHODES MÉTÉO (inchangées depuis version 2) ───────────────────────────

  private async onMapClick(lat: number, lng: number, nom: string): Promise<void> {
    this.selectedLat = lat;
    this.selectedLng = lng;
    this.selectedPointName = nom;
    if (this.showMeteoPanel) {
      await this.chargerMeteoPoint(lat, lng, nom);
    }
  }

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
      try { localStorage.removeItem(`meteo_hist_${this.agriculteurId}`); } catch {}
    }
  }

  getMeteoParcelle(parcelleId: number): MeteoRecord | undefined {
    return this.meteoParParcelle.get(parcelleId);
  }

  getFarmerIconSvg(agriculteurId: number): string {
    const idx = Math.abs(agriculteurId) % FARMER_ICONS.length;
    return FARMER_ICONS[idx];
  }

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
        timestamp: Date.now(),
        temperature: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        pressure: c.surface_pressure,
        windSpeed: c.wind_speed_10m,
        windDirection: c.wind_direction_10m,
        windDirectionLabel: degToDir(c.wind_direction_10m),
        precipitation: c.precipitation ?? 0,
        solarRadiation: c.shortwave_radiation ?? 0,
        weatherCode: c.weather_code,
        weatherLabel: wmoInfo.label,
        weatherIcon: wmoInfo.icon
      };

      this.meteoActuel = record;
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

  private async chargerMeteoPourToutesParcelles(): Promise<void> {
    for (const parcelle of this.parcelles) {
      if (!parcelle.latitude || !parcelle.longitude) continue;
      try {
        await this.sleep(300);
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
          timestamp: Date.now(),
          temperature: c.temperature_2m,
          humidity: c.relative_humidity_2m,
          pressure: 0,
          windSpeed: c.wind_speed_10m,
          windDirection: c.wind_direction_10m,
          windDirectionLabel: degToDir(c.wind_direction_10m),
          precipitation: c.precipitation ?? 0,
          solarRadiation: c.shortwave_radiation ?? 0,
          weatherCode: c.weather_code,
          weatherLabel: wmoInfo.label,
          weatherIcon: wmoInfo.icon
        };

        this.meteoParParcelle.set(parcelle.id, record);
        this.mettreAJourMarqueurMeteo(parcelle, record);
        this.cdr.detectChanges();
      } catch (e) {
        console.error(`Météo parcelle ${parcelle.nom}:`, e);
      }
    }
  }

  private mettreAJourMarqueurMeteo(parcelle: Parcelle, record: MeteoRecord): void {
    if (!parcelle.latitude || !parcelle.longitude) return;

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
      <div style="background:${bgColor};border:2.5px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:38px;height:38px;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <div style="transform:rotate(45deg);font-size:1.05rem;line-height:1;">${record.weatherIcon}</div>
      </div>
      <div style="background:rgba(0,0,0,0.75);color:white;font-size:0.62rem;font-weight:700;padding:2px 5px;border-radius:4px;text-align:center;margin-top:2px;white-space:nowrap;backdrop-filter:blur(4px);">
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
          📍 ${parcelle.surface} ha • ${parcelle.gouvernorat || 'Tunisie'}
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

  private calculerBilanAgronomique(): void {
    if (!this.historique.length) { this.meteoSummary = null; return; }

    const BASE_CHALEUR = 10;
    const SEUIL_FROID = 7;

    let chaleurCumulee = 0;
    let froidCumule = 0;
    let precipTotale = 0;
    let rayonnementTotal = 0;
    let tempMin = Infinity, tempMax = -Infinity;
    const temps: number[] = [];
    const hums: number[] = [];

    this.historique.forEach(r => {
      const gddHoraire = Math.max(0, r.temperature - BASE_CHALEUR) / 24;
      chaleurCumulee += gddHoraire;
      if (r.temperature < SEUIL_FROID) froidCumule += 1;
      precipTotale += r.precipitation;
      rayonnementTotal += r.solarRadiation / 1000;
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
      tempMoyenne: temps.reduce((a, b) => a + b, 0) / temps.length,
      tempMin,
      tempMax,
      humMoyenne: hums.reduce((a, b) => a + b, 0) / hums.length,
      nbMesures: this.historique.length,
      derniereMAJ: new Date(this.historique[this.historique.length - 1].timestamp)
    };
  }

  private sauvegarderHistorique(): void {
    try {
      const slice = this.historique.slice(-720);
      localStorage.setItem(`meteo_hist_${this.agriculteurId}`, JSON.stringify(slice));
    } catch (e) {}
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

  private demarrerRafraichissementHoraire(): void {
    this.chargerMeteoPourToutesParcelles();
    this.meteoTimer = setInterval(() => {
      this.chargerMeteoPourToutesParcelles();
      if (this.showMeteoPanel && this.selectedLat && this.selectedLng) {
        this.chargerMeteoPoint(this.selectedLat, this.selectedLng, this.selectedPointName);
      }
    }, 3600000);
  }

  // ── CHARGEMENT PARCELLES ET CARTE ──────────────────────────────────────────

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

  private chargerParcelles(): void {
    this.chargerHistoriqueStocke();
    this.parcelleService.getParcellesByAgriculteur(this.agriculteurId).subscribe({
      next: (parcelles) => {
        this.parcelles = parcelles;
        this.calculerStatistiques();
        this.afficherParcellesSurCarte();
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
      } catch (err) {
        console.error('Erreur parsing GeoJSON:', err);
      }
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
      next: () => { this.chargerParcelles(); alert('Synchronisation terminée !'); },
      error: () => { alert('Erreur synchronisation'); },
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
