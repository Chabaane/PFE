// components/dessin-parcelle/dessin-parcelle.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import * as L from 'leaflet';
import 'leaflet.heat';
import * as turf from '@turf/turf';

import { ParcelleService } from '../../services/api/parcelle.service';
import { ElevationService } from '../../services/elevation.service';

declare var google: any;

interface PhotoTerrain {
  id: string;
  thumb: string;
  description: string;
  distance: number;
  direction: string;
  lat: number;
  lng: number;
  url: string;
  erreur?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Leaflet Canvas Overlay helper
//  Draws any pixel-level gradient inside a polygon using a hidden canvas,
//  then projects it onto the map as a single ImageOverlay → no thousands of
//  rectangles, no "too many requests" issues, buttery-smooth rendering.
// ─────────────────────────────────────────────────────────────────────────────

class CanvasPolygonOverlay {
  private overlay: L.ImageOverlay | null = null;

  constructor(private map: L.Map) {}

  /**
   * @param geoJson   Polygon / MultiPolygon GeoJSON geometry
   * @param getValue  (normalizedX, normalizedY) → value in [0, 1]
   * @param getColor  value in [0,1] → [r, g, b] tuple
   * @param resolution canvas pixels per side (higher = sharper, slower)
   */
  draw(
    geoJson: any,
    getValue: (nx: number, ny: number) => number,
    getColor: (v: number) => [number, number, number],
    resolution = 400
  ): void {
    this.remove();

    const bbox = turf.bbox(geoJson); // [minLng, minLat, maxLng, maxLat]
    const [minLng, minLat, maxLng, maxLat] = bbox;

    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(resolution, resolution);

    for (let py = 0; py < resolution; py++) {
      for (let px = 0; px < resolution; px++) {
        // normalised [0,1] top-left origin
        const nx = px / (resolution - 1);
        const ny = py / (resolution - 1);

        // geographic coords (canvas y is inverted vs lat)
        const lng = minLng + nx * (maxLng - minLng);
        const lat = maxLat - ny * (maxLat - minLat); // inverted

        const inPoly = turf.booleanPointInPolygon(turf.point([lng, lat]), geoJson);
        const idx = (py * resolution + px) * 4;

        if (inPoly) {
          const v = getValue(nx, ny);
          const [r, g, b] = getColor(v);
          imgData.data[idx]     = r;
          imgData.data[idx + 1] = g;
          imgData.data[idx + 2] = b;
          imgData.data[idx + 3] = 210; // slight transparency
        } else {
          imgData.data[idx + 3] = 0; // transparent outside polygon
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');

    const bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
    this.overlay = L.imageOverlay(dataUrl, bounds, { opacity: 1, interactive: false });
    this.overlay.addTo(this.map);
  }

  remove(): void {
    if (this.overlay) {
      this.map.removeLayer(this.overlay);
      this.overlay = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Color palette helpers
// ─────────────────────────────────────────────────────────────────────────────

function lerpColor(stops: Array<[number, [number, number, number]]>, t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

// Altitude: deep-green → lime → yellow → orange → dark-red
const ALTITUDE_STOPS: Array<[number, [number, number, number]]> = [
  [0.00, [0,   100,  0  ]],   // #006400
  [0.25, [50,  205,  50 ]],   // #32CD32
  [0.50, [255, 235,  59 ]],   // warm yellow
  [0.75, [255, 152,  0  ]],   // orange
  [1.00, [139, 0,    0  ]],   // #8B0000
];

// Parasite pressure: green → yellow → orange → red
const PARASITE_STOPS: Array<[number, [number, number, number]]> = [
  [0.00, [46,  204, 113]],   // #2ecc71
  [0.33, [241, 196, 15 ]],   // #f1c40f
  [0.66, [230, 126, 34 ]],   // #e67e22
  [1.00, [231, 76,  60 ]],   // #e74c3c
];

// Soil quality: red (faible) → orange (moyenne) → green (bonne)
const SOIL_STOPS: Array<[number, [number, number, number]]> = [
  [0.00, [231, 76,  60 ]],   // faible
  [0.50, [243, 156, 18 ]],   // moyenne
  [1.00, [39,  174, 96 ]],   // bonne
];

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-dessin-parcelle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dessin-parcelle.html',
  styleUrl: './dessin-parcelle.scss',
})
export class DessinParcelleComponent implements OnInit, OnDestroy {

  // ── Carte principale
  private map!: L.Map;
  private heatLayer: any;
  private polygonLayer = L.featureGroup();
  private elevationLegend: any = null;
  private elevationCanvasOverlay: CanvasPolygonOverlay | null = null;

  modeVue: 'satellite' | 'parasites' | 'sols' = 'satellite';

  private parasiteMapInstance: L.Map | null = null;
  private solsMapInstance: L.Map | null = null;
  private parasiteCanvasOverlay: CanvasPolygonOverlay | null = null;
  private solsCanvasOverlay: CanvasPolygonOverlay | null = null;

  parcelles: any[] = [];
  parcelleSelectionnee: any = null;

  private googleMap: any = null;
  private googleMapLoaded = false;

  modalOuvert = false;

  private minimapInstance: L.Map | null = null;
  private minimapMarker: L.Marker | null = null;
  private minimapPolygon: L.Polygon | null = null;
  private satMapInstance: L.Map | null = null;
  private satMapPolygon: L.Polygon | null = null;
  private satMapMarker: L.Marker | null = null;

  positionActuelle = { lat: 0, lng: 0 };
  altitudeActuelle = '—';
  pasDepalcement = 2;

  mapillaryUrl: SafeResourceUrl = '' as any;
  mapillaryLink = '';
  photosProches: PhotoTerrain[] = [];

  constructor(
    private parcelleService: ParcelleService,
    private elevationService: ElevationService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.fixLeafletIcons();
    this.initMap();
    this.loadParcelles();
  }

  ngOnDestroy(): void {
    this.detruireModal();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOuvert) this.fermerModal();
  }

  private fixLeafletIcons() {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
    });
  }

  private initMap(): void {
    this.map = L.map('map').setView([34, 9], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
    this.polygonLayer.addTo(this.map);
    this.map.on('click', () => { this.parcelleSelectionnee = null; });
  }

  private loadParcelles(): void {
    this.parcelleService.getAllParcelles().subscribe({
      next: (data) => {
        this.parcelles = data;
        if (this.map) this.displayPolygons();
      },
      error: (err) => console.error('Error loading parcelles:', err)
    });
  }

  private displayPolygons(): void {
    if (!this.map) return;
    this.polygonLayer.clearLayers();
    this.parcelles.forEach((p, index) => {
      const geometryData = p.geometrie;
      if (!geometryData) return;
      try {
        let parsed = typeof geometryData === 'string' ? JSON.parse(geometryData) : geometryData;
        let geojson: any;
        if (parsed.type === 'Feature' && parsed.geometry) {
          geojson = parsed.geometry;
        } else if (parsed.type === 'Polygon' || parsed.type === 'MultiPolygon') {
          geojson = parsed;
        } else if (Array.isArray(parsed)) {
          const coords = parsed.map((pt: any) => [pt.lng, pt.lat]);
          if (coords.length > 0) { coords.push(coords[0]); geojson = { type: 'Polygon', coordinates: [coords] }; }
        } else { return; }

        const layer = L.geoJSON(geojson, {
          style: { color: p.couleur || '#2e7d32', weight: 2, fillOpacity: 0.2 },
          onEachFeature: (feature, l) => {
            let popup = `<strong>${p.nom}</strong><br>Surface: ${p.surface} ha`;
            if (p.culture) popup += `<br>Culture: ${p.culture}`;
            l.bindPopup(popup);
          }
        });
        layer.on('click', () => {
          this.parcelleSelectionnee = p;
          try {
            const bounds = layer.getBounds();
            if (bounds.isValid()) this.map.fitBounds(bounds);
          } catch (e) {
            if (p.latitude && p.longitude) this.map.setView([p.latitude, p.longitude], 14);
          }
        });
        this.polygonLayer.addLayer(layer);
      } catch (err) { console.error(`Erreur parsing geometry ${index}:`, err); }
    });
    if (this.polygonLayer.getLayers().length > 0) {
      const b = this.polygonLayer.getBounds();
      if (b.isValid()) this.map.fitBounds(b);
    }
  }

  // ══════════════════════════════════════════════════════
  //  OUVERTURE MODAL VUE SATELLITE
  // ══════════════════════════════════════════════════════

  ouvrirVue360(): void {
    if (!this.parcelleSelectionnee?.latitude || !this.parcelleSelectionnee?.longitude) {
      alert('Veuillez sélectionner une parcelle en cliquant dessus sur la carte.');
      return;
    }
    this.positionActuelle = {
      lat: this.parcelleSelectionnee.latitude,
      lng: this.parcelleSelectionnee.longitude
    };
    this.modalOuvert = true;
    this.modeVue = 'satellite';
    setTimeout(() => {
      this.initSatelliteMap();
      this.initMinimap();
      this.recupererAltitude();
    }, 200);
  }

  // ──────────────────────────────────────────────────────
  //  CANVAS OVERLAY — Pression parasitaire
  // ──────────────────────────────────────────────────────

  private initParasiteMap(): void {
    const el = document.getElementById('parasite-map');
    if (!el) return;
    if (this.parasiteMapInstance) {
      this.parasiteMapInstance.remove();
      this.parasiteMapInstance = null;
    }

    const lat = this.parcelleSelectionnee.latitude;
    const lng = this.parcelleSelectionnee.longitude;

    this.parasiteMapInstance = L.map('parasite-map').setView([lat, lng], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM & CartoDB',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.parasiteMapInstance);

    const geometrie = this.parcelleSelectionnee.geometrie;
    if (!geometrie) return;

    let geoJson: any;
    try {
      geoJson = JSON.parse(geometrie);
      if (geoJson.type === 'Feature') geoJson = geoJson.geometry;
    } catch { return; }

    const bbox = turf.bbox(geoJson);

    // ── Simulate a few pressure hotspots ──────────────────
    const nbFoyers = 8;
    const foyers: Array<{ nx: number; ny: number; intensity: number }> = [];
    for (let i = 0; i < nbFoyers; i++) {
      foyers.push({
        nx: Math.random(),
        ny: Math.random(),
        intensity: 0.3 + Math.random() * 0.7,
      });
    }

    // IDW (Inverse Distance Weighting) in normalised [0,1] space
    const getValue = (nx: number, ny: number): number => {
      let totalW = 0, totalV = 0;
      for (const f of foyers) {
        const d2 = Math.pow(nx - f.nx, 2) + Math.pow(ny - f.ny, 2);
        const w = d2 < 1e-8 ? 1e8 : 1 / d2;
        totalW += w;
        totalV += f.intensity * w;
      }
      const raw = totalW > 0 ? totalV / totalW : 0;
      return Math.max(0, Math.min(1, raw));
    };

    const getColor = (v: number): [number, number, number] => lerpColor(PARASITE_STOPS, v);

    // ── Draw canvas overlay ────────────────────────────────
    this.parasiteCanvasOverlay = new CanvasPolygonOverlay(this.parasiteMapInstance);
    this.parasiteCanvasOverlay.draw(geoJson, getValue, getColor, 350);

    // ── Polygon border ────────────────────────────────────
    this.dessinerContourSurCarte(this.parasiteMapInstance, true);

    // ── Clickable invisible markers on a coarse grid ───────
    // These carry popup info without flooding the DOM with rectangles
    this.addParasiteClickMarkers(geoJson, bbox, foyers, getValue);

    // ── Legend ────────────────────────────────────────────
    this.addCanvasLegend(this.parasiteMapInstance, 'parasite');

    // ── Map click: navigate + show popup if on a parasitePoint ──
    this.parasiteMapInstance.on('click', (e: L.LeafletMouseEvent) => {
      this.allerVers(e.latlng.lat, e.latlng.lng);
    });
  }

  /**
   * Adds a sparse grid of transparent circle markers that open popups
   * when clicked, without visually covering the canvas gradient.
   */
  private addParasiteClickMarkers(
    geoJson: any,
    bbox: number[],
    foyers: Array<{ nx: number; ny: number; intensity: number }>,
    getValue: (nx: number, ny: number) => number
  ): void {
    if (!this.parasiteMapInstance) return;

    const [minLng, minLat, maxLng, maxLat] = bbox;
    const steps = 20; // coarser grid for markers only
    const latStep = (maxLat - minLat) / steps;
    const lngStep = (maxLng - minLng) / steps;

    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const cellLat = minLat + i * latStep;
        const cellLng = minLng + j * lngStep;

        if (!turf.booleanPointInPolygon(turf.point([cellLng, cellLat]), geoJson)) continue;

        const nx = (cellLng - minLng) / (maxLng - minLng);
        const ny = 1 - (cellLat - minLat) / (maxLat - minLat);
        const intensity = getValue(nx, ny);

        let niveau: string, hexColor: string;
        if (intensity < 0.25)      { niveau = 'Faible';   hexColor = '#2ecc71'; }
        else if (intensity < 0.5)  { niveau = 'Modérée';  hexColor = '#f1c40f'; }
        else if (intensity < 0.75) { niveau = 'Élevée';   hexColor = '#e67e22'; }
        else                       { niveau = 'Critique';  hexColor = '#e74c3c'; }

        const popupContent = `
          <div style="min-width:200px;background:#1e293b;color:#e2e8f0;padding:12px;
                      border-radius:10px;border-left:4px solid ${hexColor};font-size:12px;line-height:1.6;">
            <strong style="font-size:13px;">🐛 Pression parasitaire</strong><br>
            📍 <span style="color:#94a3b8;">${cellLat.toFixed(5)}°N, ${cellLng.toFixed(5)}°E</span><br>
            ⚠️ Niveau : <strong style="color:${hexColor}">${niveau}</strong><br>
            📊 Intensité : <strong>${(intensity * 100).toFixed(1)} %</strong>
          </div>`;

        // Invisible marker (transparent icon) to capture clicks
        const transparentIcon = L.divIcon({
          className: '',
          html: `<div style="width:24px;height:24px;border-radius:50%;
                             background:rgba(255,255,255,0.03);
                             border:1px solid rgba(255,255,255,0.08);
                             cursor:pointer;"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        L.marker([cellLat, cellLng], { icon: transparentIcon })
          .bindPopup(popupContent, { maxWidth: 260 })
          .addTo(this.parasiteMapInstance!);
      }
    }
  }

  // ──────────────────────────────────────────────────────
  //  CANVAS OVERLAY — Qualité des sols
  // ──────────────────────────────────────────────────────

  private initSolsMap(): void {
    const el = document.getElementById('sols-map');
    if (!el) return;
    if (this.solsMapInstance) {
      this.solsMapInstance.remove();
      this.solsMapInstance = null;
    }

    const lat = this.parcelleSelectionnee.latitude;
    const lng = this.parcelleSelectionnee.longitude;

    this.solsMapInstance = L.map('sols-map').setView([lat, lng], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM & CartoDB',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.solsMapInstance);

    const geometrie = this.parcelleSelectionnee.geometrie;
    if (!geometrie) return;

    let geoJson: any;
    try {
      geoJson = JSON.parse(geometrie);
      if (geoJson.type === 'Feature') geoJson = geoJson.geometry;
    } catch { return; }

    const bbox = turf.bbox(geoJson);
    const [minLng, minLat, maxLng, maxLat] = bbox;

    // ── Generate soil sample points ────────────────────────
    const nbSamples = 6;
    const soilSamples: Array<{
      nx: number; ny: number;
      pH: number; N: number; P: number; K: number; quality: number;
    }> = [];

    for (let i = 0; i < nbSamples; i++) {
      const pH = 5.5 + Math.random() * 3.5;
      const N  = 20  + Math.random() * 180;
      const P  = 5   + Math.random() * 60;
      const K  = 30  + Math.random() * 200;

      // quality: 0 = faible, 0.5 = moyenne, 1 = bonne
      let quality: number;
      if (pH >= 6.5 && pH <= 7.5 && N > 100 && P > 30 && K > 100) quality = 1.0;
      else if (pH < 5.5 || pH > 8.5 || N < 40 || P < 10 || K < 50) quality = 0.0;
      else quality = 0.5;

      soilSamples.push({ nx: Math.random(), ny: Math.random(), pH, N, P, K, quality });
    }

    // IDW interpolation for soil quality
    const getValue = (nx: number, ny: number): number => {
      let totalW = 0, totalQ = 0;
      for (const s of soilSamples) {
        const d2 = Math.pow(nx - s.nx, 2) + Math.pow(ny - s.ny, 2);
        const w = d2 < 1e-8 ? 1e8 : 1 / d2;
        totalW += w;
        totalQ += s.quality * w;
      }
      return Math.max(0, Math.min(1, totalW > 0 ? totalQ / totalW : 0.5));
    };

    const getColor = (v: number): [number, number, number] => lerpColor(SOIL_STOPS, v);

    // ── Canvas gradient overlay ────────────────────────────
    this.solsCanvasOverlay = new CanvasPolygonOverlay(this.solsMapInstance);
    this.solsCanvasOverlay.draw(geoJson, getValue, getColor, 350);

    // ── Polygon border ─────────────────────────────────────
    this.dessinerContourSurCarte(this.solsMapInstance, true);

    // ── Clickable markers with detailed soil popup ─────────
    this.addSoilClickMarkers(geoJson, bbox, soilSamples, getValue);

    // ── Legend ────────────────────────────────────────────
    this.addCanvasLegend(this.solsMapInstance, 'sols');

    this.solsMapInstance.on('click', (e: L.LeafletMouseEvent) => {
      this.allerVers(e.latlng.lat, e.latlng.lng);
    });
  }

  private addSoilClickMarkers(
    geoJson: any,
    bbox: number[],
    samples: Array<{ nx: number; ny: number; pH: number; N: number; P: number; K: number; quality: number }>,
    getValue: (nx: number, ny: number) => number
  ): void {
    if (!this.solsMapInstance) return;

    const [minLng, minLat, maxLng, maxLat] = bbox;
    const steps = 18;
    const latStep = (maxLat - minLat) / steps;
    const lngStep = (maxLng - minLng) / steps;

    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const cellLat = minLat + i * latStep;
        const cellLng = minLng + j * lngStep;

        if (!turf.booleanPointInPolygon(turf.point([cellLng, cellLat]), geoJson)) continue;

        const nx = (cellLng - minLng) / (maxLng - minLng);
        const ny = 1 - (cellLat - minLat) / (maxLat - minLat);
        const quality = getValue(nx, ny);

        // Interpolate NPK values from nearest sample
        let closest = samples[0];
        let minDist = Infinity;
        for (const s of samples) {
          const d = Math.hypot(nx - s.nx, ny - s.ny);
          if (d < minDist) { minDist = d; closest = s; }
        }

        const pHv = Math.min(9, Math.max(5, closest.pH + (Math.random() - 0.5) * 0.4));
        const Nv  = Math.min(200, Math.max(20, closest.N + (Math.random() - 0.5) * 20));
        const Pv  = Math.min(65,  Math.max(5,  closest.P + (Math.random() - 0.5) * 10));
        const Kv  = Math.min(250, Math.max(30, closest.K + (Math.random() - 0.5) * 30));

        let hexColor: string, label: string, conseil: string;
        if (quality > 0.65)      { hexColor = '#27ae60'; label = 'Bonne';   conseil = '✅ Sol fertile, bon équilibre'; }
        else if (quality > 0.35) { hexColor = '#f39c12'; label = 'Moyenne'; conseil = '⚠️ Amendements conseillés'; }
        else                     { hexColor = '#e74c3c'; label = 'Faible';  conseil = '❌ Nécessite correction (chaulage, fertilisation)'; }

        const popupContent = `
          <div style="min-width:220px;background:#1e293b;color:#e2e8f0;padding:12px;
                      border-radius:10px;border-left:4px solid ${hexColor};font-size:12px;line-height:1.7;">
            <strong style="font-size:13px;">🌱 Analyse de sol</strong><br>
            🧪 pH : <strong>${pHv.toFixed(1)}</strong><br>
            <span style="color:#60a5fa;">■</span> Azote (N) : <strong>${Nv.toFixed(0)} mg/kg</strong><br>
            <span style="color:#fb923c;">■</span> Phosphore (P) : <strong>${Pv.toFixed(0)} mg/kg</strong><br>
            <span style="color:#a78bfa;">■</span> Potassium (K) : <strong>${Kv.toFixed(0)} mg/kg</strong><br>
            <hr style="margin:6px 0;border-color:#334155;">
            <span style="font-size:11px;">${conseil}</span>
          </div>`;

        const transparentIcon = L.divIcon({
          className: '',
          html: `<div style="width:24px;height:24px;border-radius:50%;
                             background:rgba(255,255,255,0.03);
                             border:1px solid rgba(255,255,255,0.08);
                             cursor:pointer;"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        L.marker([cellLat, cellLng], { icon: transparentIcon })
          .bindPopup(popupContent, { maxWidth: 270 })
          .addTo(this.solsMapInstance!);
      }
    }
  }

  // ──────────────────────────────────────────────────────
  //  Shared canvas legend
  // ──────────────────────────────────────────────────────

  private addCanvasLegend(map: L.Map, type: 'parasite' | 'sols'): void {
    const ctrl = (L as any).control({ position: 'bottomright' });
    ctrl.onAdd = () => {
      const div = L.DomUtil.create('div');

      if (type === 'parasite') {
        div.innerHTML = `
          <div style="background:rgba(15,23,42,0.9);padding:10px 14px;border-radius:10px;
                      color:white;font-size:12px;backdrop-filter:blur(6px);
                      border:1px solid rgba(255,255,255,0.1);min-width:150px;">
            <strong style="font-size:12px;">⚠️ Pression parasitaire</strong>
            <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
              ${this.gradientLegendBar(PARASITE_STOPS)}
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;margin-top:2px;">
                <span>Faible</span><span>Critique</span>
              </div>
            </div>
          </div>`;
      } else {
        div.innerHTML = `
          <div style="background:rgba(15,23,42,0.9);padding:10px 14px;border-radius:10px;
                      color:white;font-size:12px;backdrop-filter:blur(6px);
                      border:1px solid rgba(255,255,255,0.1);min-width:150px;">
            <strong style="font-size:12px;">🌱 Qualité des sols</strong>
            <div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
              ${this.gradientLegendBar(SOIL_STOPS)}
              <div style="display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;margin-top:2px;">
                <span>Faible</span><span>Bonne</span>
              </div>
            </div>
          </div>`;
      }
      return div;
    };
    ctrl.addTo(map);
  }

  /** Renders a smooth CSS gradient bar from the stop array */
  private gradientLegendBar(stops: Array<[number, [number, number, number]]>): string {
    const parts = stops.map(([, [r, g, b]]) => `rgb(${r},${g},${b})`).join(', ');
    return `<div style="height:14px;border-radius:6px;
                        background:linear-gradient(to right, ${parts});
                        border:1px solid rgba(255,255,255,0.15);"></div>`;
  }

  // ──────────────────────────────────────────────────────
  //  ALTITUDE — canvas gradient on main map
  // ──────────────────────────────────────────────────────

  async showElevation(): Promise<void> {
    if (this.heatLayer) this.map.removeLayer(this.heatLayer);
    if (this.elevationCanvasOverlay) { this.elevationCanvasOverlay.remove(); this.elevationCanvasOverlay = null; }
    this.polygonLayer.clearLayers();

    let gMin = Infinity, gMax = -Infinity;

    // ── Step 1 : collect one elevation per parcelle (center point only)
    //   to determine the global range without spamming the API.
    const parcelleData: Array<{
      parcelle: any; geometry: any; centerElev: number;
    }> = [];

    for (const p of this.parcelles) {
      if (!p.geometrie) continue;
      try {
        let parsed = JSON.parse(p.geometrie);
        const geometry = parsed.type === 'Feature' ? parsed.geometry : parsed;
        const center = turf.centerOfMass(geometry);
        const [lng, lat] = center.geometry.coordinates;
        const elev = await this.elevationService.getElevation(lat, lng);
        if (elev < gMin) gMin = elev;
        if (elev > gMax) gMax = elev;
        parcelleData.push({ parcelle: p, geometry, centerElev: elev });
      } catch { /* skip */ }
    }

    if (!isFinite(gMin)) return;
    // Ensure a minimum range so the gradient isn't flat
    if (gMax - gMin < 5) { gMin -= 2.5; gMax += 2.5; }
    const range = gMax - gMin;

    // ── Step 2 : draw each parcelle as a canvas gradient ──────────────────
    for (const { parcelle, geometry, centerElev } of parcelleData) {
      const bbox = turf.bbox(geometry);
      const [minLng, minLat, maxLng, maxLat] = bbox;

      // Simple elevation model: radial gradient outward from center
      const cx = turf.centerOfMass(geometry).geometry.coordinates;
      const cNx = (cx[0] - minLng) / (maxLng - minLng);
      const cNy = 1 - (cx[1] - minLat) / (maxLat - minLat);

      // Normalised center elevation
      const centreNorm = (centerElev - gMin) / range;

      const getValue = (nx: number, ny: number): number => {
        const d = Math.hypot(nx - cNx, ny - cNy);
        const maxD = Math.sqrt(cNx * cNx + cNy * cNy +
                               (1 - cNx) * (1 - cNx) + (1 - cNy) * (1 - cNy)) * 0.5;
        const variation = Math.sin(d / (maxD + 0.001) * Math.PI) * 0.25;
        return Math.max(0, Math.min(1, centreNorm - variation));
      };

      const getColor = (v: number): [number, number, number] => lerpColor(ALTITUDE_STOPS, v);

      const canvasOv = new CanvasPolygonOverlay(this.map);
      canvasOv.draw(geometry, getValue, getColor, 300);

      // Polygon outline
      L.geoJSON(geometry, { style: { color: '#333', weight: 2, fillOpacity: 0 } })
        .addTo(this.polygonLayer);

      // Info label
      const denivele = range * 0.4; // approximate per-parcel (we only have 1 sample)
      const [lng, lat] = cx;
      const infoHtml = `
        <div style="background:rgba(15,23,42,0.9);padding:8px 12px;border-radius:8px;
                    font-size:12px;color:#e2e8f0;border-left:4px solid
                    ${this.rgbToCss(lerpColor(ALTITUDE_STOPS, centreNorm))};
                    backdrop-filter:blur(4px);">
          <strong>${parcelle.nom}</strong><br>
          ~${centerElev.toFixed(0)} m
        </div>`;
      L.marker([lat, lng], {
        icon: L.divIcon({ className: 'parcelle-info', html: infoHtml, iconSize: [160, 55] })
      }).addTo(this.polygonLayer);
    }

    this.addElevationLegend(gMin, gMax);
    const b = this.polygonLayer.getBounds();
    if (b.isValid()) this.map.fitBounds(b);
  }

  private rgbToCss([r, g, b]: [number, number, number]): string {
    return `rgb(${r},${g},${b})`;
  }

  // ── Elevation legend with smooth gradient bar ──────────────────────────────

  private addElevationLegend(min: number, max: number): void {
    if (this.elevationLegend) this.map.removeControl(this.elevationLegend);
    const d = max - min;
    const stops = ALTITUDE_STOPS.map(([, [r, g, b]]) => `rgb(${r},${g},${b})`).join(', ');

    const LC = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: () => {
        const div = L.DomUtil.create('div', 'elevation-legend');
        div.innerHTML = `
          <div style="background:rgba(15,23,42,0.92);padding:12px 16px;border-radius:10px;
                      box-shadow:0 4px 20px rgba(0,0,0,0.5);min-width:180px;
                      border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(6px);">
            <h4 style="margin:0 0 10px 0;font-size:13px;color:#e2e8f0;font-weight:600;">
              🏔 Altitude
            </h4>
            <div style="height:16px;border-radius:6px;
                        background:linear-gradient(to right, ${stops});
                        border:1px solid rgba(255,255,255,0.15);margin-bottom:6px;"></div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;">
              <span>${min.toFixed(0)} m</span>
              <span>${(min + d * 0.5).toFixed(0)} m</span>
              <span>${max.toFixed(0)} m</span>
            </div>
            <hr style="margin:8px 0;border-color:rgba(255,255,255,0.1);">
            <div style="font-size:11px;color:#64748b;text-align:center;">
              Dénivelé total : ${d.toFixed(1)} m
            </div>
          </div>`;
        return div;
      }
    });
    this.elevationLegend = new LC();
    this.elevationLegend.addTo(this.map);
  }

  async showSlopeMap(): Promise<void> {
    if (this.heatLayer) this.map.removeLayer(this.heatLayer);
    this.polygonLayer.clearLayers();

    for (const p of this.parcelles) {
      if (!p.geometrie) continue;
      try {
        let parsed = JSON.parse(p.geometrie);
        const geometry = parsed.type === 'Feature' ? parsed.geometry : parsed;
        L.geoJSON(geometry, {
          style: { color: p.couleur || '#2e7d32', weight: 2, fillOpacity: 0.1 }
        }).addTo(this.polygonLayer);

        // Only fetch 2 elevation samples per parcelle to avoid request flood
        const center = turf.centerOfMass(geometry);
        const [clng, clat] = center.geometry.coordinates;
        const bbox = turf.bbox(geometry);
        const cornerLat = bbox[1];
        const cornerLng = bbox[0];

        const [elevCenter, elevCorner] = await Promise.all([
          this.elevationService.getElevation(clat, clng),
          this.elevationService.getElevation(cornerLat, cornerLng),
        ]);

        const diff = Math.abs(elevCenter - elevCorner);
        const infoHtml = `
          <div style="background:rgba(15,23,42,0.9);padding:8px 12px;border-radius:8px;
                      border:1px solid rgba(255,255,255,0.1);font-size:12px;color:#e2e8f0;
                      backdrop-filter:blur(4px);">
            <strong>${p.nom}</strong><br>
            Dénivelé ~${diff.toFixed(1)} m<br>
            ${diff > 20 ? '⚠️ Pente significative' : '✅ Terrain plat'}
          </div>`;
        L.marker([clat, clng], {
          icon: L.divIcon({ className: 'slope-info', html: infoHtml, iconSize: [165, 65] })
        }).addTo(this.polygonLayer);
      } catch { /* skip */ }
    }
  }

  setLayer(type: string) {
    if (this.heatLayer) this.map.removeLayer(this.heatLayer);
    if (type === 'altitude') this.showElevation();
    else if (type === 'slope') this.showSlopeMap();
    else this.displayPolygons();
  }

  // ══════════════════════════════════════════════════════
  //  SATELLITE MAP
  // ══════════════════════════════════════════════════════

  private initSatelliteMap(): void {
    const el = document.getElementById('satellite-view-map');
    if (!el) return;
    if (this.satMapInstance) { this.satMapInstance.remove(); this.satMapInstance = null; }

    const lat = this.parcelleSelectionnee.latitude;
    const lng = this.parcelleSelectionnee.longitude;

    this.satMapInstance = L.map('satellite-view-map', {
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
    }).setView([lat, lng], 18);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri World Imagery', maxZoom: 20 }
    ).addTo(this.satMapInstance);

    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20, opacity: 0.7 }
    ).addTo(this.satMapInstance);

    this.dessinerContourSurCarte(this.satMapInstance, true);

    const posIcon = L.divIcon({
      className: '',
      html: `<div style="width:20px;height:20px;background:#00E5FF;border:3px solid white;
                         border-radius:50%;box-shadow:0 0 0 4px rgba(0,229,255,0.35);"></div>`,
      iconSize: [20, 20], iconAnchor: [10, 10]
    });
    this.satMapMarker = L.marker([lat, lng], { icon: posIcon })
      .addTo(this.satMapInstance)
      .bindTooltip(this.parcelleSelectionnee.nom, { permanent: false });

    L.control.scale({ metric: true, imperial: false }).addTo(this.satMapInstance);

    this.satMapInstance.on('click', (e: L.LeafletMouseEvent) => {
      this.allerVers(e.latlng.lat, e.latlng.lng);
    });
  }

  private initMinimap(): void {
    const el = document.getElementById('minimap-satellite');
    if (!el) return;
    if (this.minimapInstance) { this.minimapInstance.remove(); this.minimapInstance = null; }

    const lat = this.parcelleSelectionnee.latitude;
    const lng = this.parcelleSelectionnee.longitude;

    this.minimapInstance = L.map('minimap-satellite', {
      zoomControl: false, attributionControl: false,
      dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, keyboard: false,
    }).setView([lat, lng], 15);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20 }
    ).addTo(this.minimapInstance);

    this.dessinerContourSurCarte(this.minimapInstance, false);

    const miniIcon = L.divIcon({
      className: '',
      html: `<div style="width:12px;height:12px;background:#00E5FF;border:2px solid white;
                         border-radius:50%;box-shadow:0 0 0 2px rgba(0,229,255,0.5);"></div>`,
      iconSize: [12, 12], iconAnchor: [6, 6]
    });
    this.minimapMarker = L.marker([lat, lng], { icon: miniIcon }).addTo(this.minimapInstance);
  }

  private dessinerContourSurCarte(carte: L.Map, fitBounds: boolean): void {
    const geometrie = this.parcelleSelectionnee?.geometrie;
    if (!geometrie) return;
    try {
      const geoJson = JSON.parse(geometrie);
      const coords = this.extraireCoordonnees(geoJson);
      if (coords.length >= 3) {
        const pts: L.LatLngTuple[] = coords.map(c => [c[1], c[0]] as L.LatLngTuple);
        const poly = L.polygon(pts, {
          color: '#FF3D00', weight: 3, fillColor: '#FF3D00', fillOpacity: 0.1
        }).addTo(carte);
        if (fitBounds) carte.fitBounds(poly.getBounds(), { padding: [40, 40] });
        if (carte === this.satMapInstance) this.satMapPolygon = poly;
        else this.minimapPolygon = poly;
      }
    } catch (e) { console.warn('Erreur contour modal:', e); }
  }

  private async recupererAltitude(): Promise<void> {
    try {
      const { lat, lng } = this.positionActuelle;
      const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
      const data = await res.json();
      this.altitudeActuelle = data.elevation?.[0] ? Math.round(data.elevation[0]).toString() : '—';
    } catch { this.altitudeActuelle = '—'; }
  }

  // ══════════════════════════════════════════════════════
  //  NAVIGATION
  // ══════════════════════════════════════════════════════

  deplacer(direction: 'nord' | 'sud' | 'est' | 'ouest'): void {
    const pas = 0.00009 * this.pasDepalcement;
    switch (direction) {
      case 'nord': this.positionActuelle.lat += pas; break;
      case 'sud':  this.positionActuelle.lat -= pas; break;
      case 'est':  this.positionActuelle.lng += pas; break;
      case 'ouest':this.positionActuelle.lng -= pas; break;
    }
    this.allerVers(this.positionActuelle.lat, this.positionActuelle.lng);
  }

  allerVers(lat: number, lng: number): void {
    this.positionActuelle = { lat, lng };
    if (this.satMapMarker && this.satMapInstance) {
      this.satMapMarker.setLatLng([lat, lng]);
      this.satMapInstance.panTo([lat, lng], { animate: true, duration: 0.3 });
    }
    if (this.minimapMarker && this.minimapInstance) {
      this.minimapMarker.setLatLng([lat, lng]);
      this.minimapInstance.panTo([lat, lng], { animate: false });
    }
    this.recupererAltitude();
  }

  centrerSurParcelle(): void {
    const { latitude, longitude } = this.parcelleSelectionnee;
    this.allerVers(latitude, longitude);
    if (this.satMapInstance && this.satMapPolygon)
      this.satMapInstance.fitBounds(this.satMapPolygon.getBounds(), { padding: [40, 40] });
  }

  switchMode(mode: 'satellite' | 'parasites' | 'sols'): void {
    this.modeVue = mode;
    if (mode === 'satellite') {
      setTimeout(() => { if (this.satMapInstance) this.satMapInstance.invalidateSize(); }, 50);
    } else if (mode === 'parasites') {
      setTimeout(() => {
        if (!this.parasiteMapInstance) this.initParasiteMap();
        else this.parasiteMapInstance.invalidateSize();
      }, 50);
    } else if (mode === 'sols') {
      setTimeout(() => {
        if (!this.solsMapInstance) this.initSolsMap();
        else this.solsMapInstance.invalidateSize();
      }, 50);
    }
  }

  fermerModal(event?: MouseEvent): void {
    if (event && event.target !== event.currentTarget) return;
    this.detruireModal();
    this.modalOuvert = false;
  }

  private detruireModal(): void {
    this.satMapInstance?.remove();     this.satMapInstance = null;
    this.minimapInstance?.remove();    this.minimapInstance = null;
    if (this.parasiteCanvasOverlay)    { this.parasiteCanvasOverlay.remove(); this.parasiteCanvasOverlay = null; }
    if (this.solsCanvasOverlay)        { this.solsCanvasOverlay.remove(); this.solsCanvasOverlay = null; }
    if (this.parasiteMapInstance)      { this.parasiteMapInstance.remove(); this.parasiteMapInstance = null; }
    if (this.solsMapInstance)          { this.solsMapInstance.remove(); this.solsMapInstance = null; }
    this.satMapMarker  = null; this.satMapPolygon  = null;
    this.minimapMarker = null; this.minimapPolygon = null;
  }

  private extraireCoordonnees(geoJson: any): [number, number][] {
    let coords: any = [];
    if (geoJson.type === 'Feature') coords = geoJson.geometry?.coordinates ?? [];
    else if (geoJson.type === 'Polygon') coords = geoJson.coordinates ?? [];
    else if (geoJson.type === 'FeatureCollection' && geoJson.features?.length)
      coords = geoJson.features[0].geometry?.coordinates ?? [];
    return (coords[0] ?? []) as [number, number][];
  }

  // ══════════════════════════════════════════════════════
  //  Google Maps (unchanged)
  // ══════════════════════════════════════════════════════

  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="maps.googleapis.com"]')) { resolve(); return; }
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=VOTRE_CLE_API&libraries=geometry&callback=initGoogleMapCallback`;
      s.async = true; s.defer = true; s.onerror = reject;
      (window as any).initGoogleMapCallback = () => resolve();
      document.head.appendChild(s);
    });
  }

  private initGoogleMap(): void {
    const { latitude, longitude, geometrie, nom } = this.parcelleSelectionnee;
    const el = document.getElementById('google-map');
    if (!el) return;
    this.googleMap = new google.maps.Map(el, {
      center: { lat: latitude, lng: longitude }, zoom: 18, mapTypeId: 'satellite',
      tilt: 0, mapTypeControl: true, streetViewControl: true, fullscreenControl: true,
    });
    try {
      const coords = this.extraireCoordonnees(JSON.parse(geometrie));
      if (coords.length >= 3)
        new google.maps.Polygon({
          paths: coords.map(c => ({ lat: c[1], lng: c[0] })),
          strokeColor: '#FF0000', strokeOpacity: 0.8, strokeWeight: 2,
          fillColor: '#FF0000', fillOpacity: 0.35, map: this.googleMap,
        });
    } catch {}
    new google.maps.Marker({
      position: { lat: latitude, lng: longitude }, map: this.googleMap,
      title: nom, animation: google.maps.Animation.DROP
    });
  }

  // ── unused helpers kept for backward compat ────────────────────────────────

  private generatePoints(geometry: any, maxPoints = 100): any[] {
    try {
      const bbox = turf.bbox(geometry), area = turf.area(geometry);
      const cellSize = area > 500000 ? 0.02 : area > 100000 ? 0.01 : area > 10000 ? 0.005 : 0.002;
      const grid = turf.pointGrid(bbox, cellSize);
      const pts = grid.features.filter(pt => turf.booleanPointInPolygon(pt, geometry));
      if (pts.length > maxPoints) { const step = Math.ceil(pts.length / maxPoints); return pts.filter((_, i) => i % step === 0); }
      return pts;
    } catch { return []; }
  }
}
