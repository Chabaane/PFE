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
    // Nouveaux modes
  modeVue: 'satellite' | 'parasites' | 'sols' = 'satellite';

  // Nouvelles instances de cartes
  private parasiteMapInstance: L.Map | null = null;
  private solsMapInstance: L.Map | null = null;

  // Données simulées pour parasites et sols
  private parasiteHeatLayer: any = null;
  private solsMarkersLayer = L.layerGroup();

  parcelles: any[] = [];
  parcelleSelectionnee: any = null;

  private googleMap: any = null;
  private googleMapLoaded = false;

  // ── Modal Vue Satellite
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

   // Nouvelle méthode : initialiser la carte de pression parasitaire (heatmap)
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

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(this.parasiteMapInstance);

  const geometrie = this.parcelleSelectionnee.geometrie;
  if (!geometrie) return;
  let geoJson;
  try {
    geoJson = JSON.parse(geometrie);
    if (geoJson.type === 'Feature') geoJson = geoJson.geometry;
  } catch(e) { return; }

  const bounds = turf.bbox(geoJson);
  const steps = 50;
  const latStep = (bounds[3] - bounds[1]) / steps;
  const lngStep = (bounds[2] - bounds[0]) / steps;
  const cellGroup = L.layerGroup().addTo(this.parasiteMapInstance);

  // Foyers d'intensité (simulation)
  const intensityPoints: Array<[number, number, number]> = [];
  const nbFoyers = 8;
  for (let i = 0; i < nbFoyers; i++) {
    const foyLat = bounds[1] + Math.random() * (bounds[3] - bounds[1]);
    const foyLng = bounds[0] + Math.random() * (bounds[2] - bounds[0]);
    const intensiteMax = 0.5 + Math.random() * 0.5;
    intensityPoints.push([foyLat, foyLng, intensiteMax]);
  }

  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const cellLat = bounds[1] + i * latStep;
      const cellLng = bounds[0] + j * lngStep;
      if (!turf.booleanPointInPolygon(turf.point([cellLng, cellLat]), geoJson)) continue;

      let totalWeight = 0, totalIntensity = 0;
      for (const [fLat, fLng, fInt] of intensityPoints) {
        const dist = Math.hypot(cellLat - fLat, cellLng - fLng);
        if (dist < 0.00001) {
          totalIntensity = fInt;
          totalWeight = 1;
          break;
        }
        const weight = 1 / (dist * dist);
        totalWeight += weight;
        totalIntensity += fInt * weight;
      }
      let intensity = totalWeight > 0 ? totalIntensity / totalWeight : 0;
      intensity = Math.min(1, Math.max(0, intensity + (Math.random() - 0.5) * 0.1));

      let color, niveau;
      if (intensity < 0.25) { color = '#2ecc71'; niveau = 'Faible'; }
      else if (intensity < 0.5) { color = '#f1c40f'; niveau = 'Modérée'; }
      else if (intensity < 0.75) { color = '#e67e22'; niveau = 'Élevée'; }
      else { color = '#e74c3c'; niveau = 'Critique'; }

      const southWest = L.latLng(cellLat - latStep/2, cellLng - lngStep/2);
      const northEast = L.latLng(cellLat + latStep/2, cellLng + lngStep/2);
      const rect = L.rectangle(L.latLngBounds(southWest, northEast), {
        color: color,
        weight: 0,
        fillColor: color,
        fillOpacity: 0.8,
        interactive: true

      });

      const popupContent = `
        <div style="min-width:200px; background:#1e293b; color:#e2e8f0; padding:10px; border-radius:10px; border-left:4px solid ${color};">
          <strong>🐛 Pression parasitaire</strong><br>
          📍 Position: ${cellLat.toFixed(5)}°, ${cellLng.toFixed(5)}°<br>
          ⚠️ Niveau: <strong style="color:${color}">${niveau}</strong><br>
          📊 Intensité: ${(intensity * 100).toFixed(1)}%<br>
          <hr style="margin:6px 0; border-color:#334155;">
          <span style="font-size:11px;">🔍 Cliquez sur la carte pour vous déplacer</span>
        </div>
      `;
      rect.bindPopup(popupContent);
      // 🔥 AJOUTE ÇA
      rect.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
      });
      rect.addTo(cellGroup);
    }
  }

  this.dessinerContourSurCarte(this.parasiteMapInstance, true);

  const legend = (L as any).control({ position: 'bottomright' });
  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'info-legend');
    div.innerHTML = `
      <div style="background:rgba(0,0,0,0.7); padding:8px 12px; border-radius:8px; color:white; font-size:12px; backdrop-filter:blur(4px);">
        <strong>⚠️ Pression parasitaire</strong><br>
        <div><span style="background:#2ecc71; width:14px; height:14px; display:inline-block; margin-right:6px;"></span> Faible</div>
        <div><span style="background:#f1c40f; width:14px; height:14px; display:inline-block; margin-right:6px;"></span> Modérée</div>
        <div><span style="background:#e67e22; width:14px; height:14px; display:inline-block; margin-right:6px;"></span> Élevée</div>
        <div><span style="background:#e74c3c; width:14px; height:14px; display:inline-block; margin-right:6px;"></span> Critique</div>
      </div>
    `;
    return div;
  };
  legend.addTo(this.parasiteMapInstance);

 this.parasiteMapInstance.on('click', (e: L.LeafletMouseEvent) => {
  if ((e.originalEvent.target as HTMLElement).classList.contains('leaflet-interactive')) {
    return;
  }
  this.allerVers(e.latlng.lat, e.latlng.lng);
});
}



  // Nouvelle méthode : initialiser la carte de qualité des sols (pH, N, P, K)
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

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM & CartoDB',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(this.solsMapInstance);

  const geometrie = this.parcelleSelectionnee.geometrie;
  if (!geometrie) return;
  let geoJson;
  try {
    geoJson = JSON.parse(geometrie);
    if (geoJson.type === 'Feature') geoJson = geoJson.geometry;
  } catch(e) { return; }

  const bounds = turf.bbox(geoJson);
  const steps = 50;
  const latStep = (bounds[3] - bounds[1]) / steps;
  const lngStep = (bounds[2] - bounds[0]) / steps;
  const cellGroup = L.layerGroup().addTo(this.solsMapInstance);

  const analysesPoints: any[] = [];
  const nbFoyers = 6;
  for (let i = 0; i < nbFoyers; i++) {
    const foyLat = bounds[1] + Math.random() * (bounds[3] - bounds[1]);
    const foyLng = bounds[0] + Math.random() * (bounds[2] - bounds[0]);
    const pH = 5.5 + Math.random() * 3.5;
    const N = Math.floor(20 + Math.random() * 180);
    const P = Math.floor(5 + Math.random() * 60);
    const K = Math.floor(30 + Math.random() * 200);
    let qualite = '', conseil = '';
    if (pH >= 6.5 && pH <= 7.5 && N > 100 && P > 30 && K > 100) {
      qualite = 'bonne';
      conseil = '✅ Sol fertile, bon équilibre';
    } else if (pH < 5.5 || pH > 8.5 || N < 40 || P < 10 || K < 50) {
      qualite = 'faible';
      conseil = '❌ Nécessite une correction (chaulage, fertilisation)';
    } else {
      qualite = 'moyenne';
      conseil = '⚠️ Amendements conseillés';
    }
    analysesPoints.push({ lat: foyLat, lng: foyLng, pH, N, P, K, qualite, conseil });
  }

  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const cellLat = bounds[1] + i * latStep;
      const cellLng = bounds[0] + j * lngStep;
      if (!turf.booleanPointInPolygon(turf.point([cellLng, cellLat]), geoJson)) continue;

      let closest = analysesPoints[0];
      let minDist = Infinity;
      for (const p of analysesPoints) {
        const dist = Math.hypot(cellLat - p.lat, cellLng - p.lng);
        if (dist < minDist) { minDist = dist; closest = p; }
      }

      const pHFinal = Math.min(9, Math.max(5, closest.pH + (Math.random() - 0.5) * 0.5));
      const NFinal = Math.min(200, Math.max(20, closest.N + Math.floor((Math.random() - 0.5) * 20)));
      const PFinal = Math.min(65, Math.max(5, closest.P + Math.floor((Math.random() - 0.5) * 10)));
      const KFinal = Math.min(250, Math.max(30, closest.K + Math.floor((Math.random() - 0.5) * 30)));

      let qualiteFinale = '', conseilFinal = '';
      if (pHFinal >= 6.5 && pHFinal <= 7.5 && NFinal > 100 && PFinal > 30 && KFinal > 100) {
        qualiteFinale = 'bonne';
        conseilFinal = '✅ Sol fertile, bon équilibre';
      } else if (pHFinal < 5.5 || pHFinal > 8.5 || NFinal < 40 || PFinal < 10 || KFinal < 50) {
        qualiteFinale = 'faible';
        conseilFinal = '❌ Nécessite une correction (chaulage, fertilisation)';
      } else {
        qualiteFinale = 'moyenne';
        conseilFinal = '⚠️ Amendements conseillés';
      }

      let color;
      if (qualiteFinale === 'bonne') color = '#27ae60';
      else if (qualiteFinale === 'moyenne') color = '#f39c12';
      else color = '#e74c3c';

      const southWest = L.latLng(cellLat - latStep/2, cellLng - lngStep/2);
      const northEast = L.latLng(cellLat + latStep/2, cellLng + lngStep/2);
      const rect = L.rectangle(L.latLngBounds(southWest, northEast), {
        color: color,
        weight: 0,
        fillColor: color,
        fillOpacity: 0.8,
        interactive: true
      });

      const popupContent = `
        <div style="min-width:220px; background:#1e293b; color:#e2e8f0; padding:10px; border-radius:10px; border-left:4px solid ${color};">
          <strong>🌱 Analyse de sol</strong><br>
          📍 Position: ${cellLat.toFixed(5)}°, ${cellLng.toFixed(5)}°<br>
          🧪 pH: <strong>${pHFinal.toFixed(1)}</strong><br>
          🟦 Azote (N): <strong>${NFinal} mg/kg</strong><br>
          🟧 Phosphore (P): <strong>${PFinal} mg/kg</strong><br>
          🟫 Potassium (K): <strong>${KFinal} mg/kg</strong><br>
          <hr style="margin:6px 0; border-color:#334155;">
          <span style="font-size:12px;">${conseilFinal}</span><br>
          <span style="font-size:10px; color:#94a3b8;">🔍 Cliquez sur la carte pour vous déplacer</span>
        </div>
      `;
      rect.bindPopup(popupContent);
      // 🔥 AJOUTE ÇA
      rect.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
      });
      rect.addTo(cellGroup);
    }
  }

  this.dessinerContourSurCarte(this.solsMapInstance, true);

  const legend = (L as any).control({ position: 'bottomright' });
  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'info-legend');
    div.innerHTML = `
      <div style="background:rgba(0,0,0,0.7); padding:8px 12px; border-radius:8px; color:white; font-size:12px; backdrop-filter:blur(4px);">
        <strong>🌱 Qualité des sols</strong><br>
        <div><span style="background:#27ae60; width:14px; height:14px; display:inline-block; margin-right:6px;"></span> Bonne</div>
        <div><span style="background:#f39c12; width:14px; height:14px; display:inline-block; margin-right:6px;"></span> Moyenne</div>
        <div><span style="background:#e74c3c; width:14px; height:14px; display:inline-block; margin-right:6px;"></span> Faible</div>
      </div>
    `;
    return div;
  };
  legend.addTo(this.solsMapInstance);

  this.solsMapInstance.on('click', (e: L.LeafletMouseEvent) => {
    this.allerVers(e.latlng.lat, e.latlng.lng);
  });
}




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

    // Satellite ESRI (gratuit, sans clé API)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri World Imagery', maxZoom: 20 }
    ).addTo(this.satMapInstance);

    // Labels ESRI (noms des lieux, gratuits)
    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 20, opacity: 0.7 }
    ).addTo(this.satMapInstance);

    this.dessinerContourSurCarte(this.satMapInstance, true);

    const posIcon = L.divIcon({
      className: '',
      html: `<div style="width:20px;height:20px;background:#00E5FF;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(0,229,255,0.35);"></div>`,
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
      html: `<div style="width:12px;height:12px;background:#00E5FF;border:2px solid white;border-radius:50%;box-shadow:0 0 0 2px rgba(0,229,255,0.5);"></div>`,
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
          color: '#FF3D00', weight: 3, fillColor: '#FF3D00', fillOpacity: 0.15
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
    this.satMapInstance?.remove();  this.satMapInstance = null;
    this.minimapInstance?.remove(); this.minimapInstance = null;
    if (this.parasiteMapInstance) { this.parasiteMapInstance.remove(); this.parasiteMapInstance = null; }
    if (this.solsMapInstance) { this.solsMapInstance.remove(); this.solsMapInstance = null; }
    this.satMapMarker = null;   this.satMapPolygon = null;
    this.minimapMarker = null;  this.minimapPolygon = null;
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
  //  MÉTHODES EXISTANTES INCHANGÉES
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
    } catch(e) {}
    new google.maps.Marker({ position:{lat:latitude,lng:longitude}, map:this.googleMap, title:nom, animation:google.maps.Animation.DROP });
  }

  private generatePoints(geometry: any, maxPoints = 100): any[] {
    try {
      const bbox = turf.bbox(geometry), area = turf.area(geometry);
      const cellSize = area>500000?0.02:area>100000?0.01:area>10000?0.005:0.002;
      const grid = turf.pointGrid(bbox, cellSize);
      const pts = grid.features.filter(pt => turf.booleanPointInPolygon(pt, geometry));
      if (pts.length > maxPoints) { const step = Math.ceil(pts.length/maxPoints); return pts.filter((_,i)=>i%step===0); }
      return pts;
    } catch { return []; }
  }

  private getColorForElevation(e: number, min: number, max: number): string {
    const n = (e-min)/(max-min);
    return n<0.2?'#006400':n<0.4?'#32CD32':n<0.6?'#FFFF00':n<0.8?'#FFA500':'#8B0000';
  }

  private interpolateColor(c1: string, c2: string, f: number): string {
    const a = this.hexToRgb(c1), b = this.hexToRgb(c2);
    return `rgb(${Math.round(a.r+(b.r-a.r)*f)},${Math.round(a.g+(b.g-a.g)*f)},${Math.round(a.b+(b.b-a.b)*f)})`;
  }

  private hexToRgb(hex: string) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? {r:parseInt(r[1],16),g:parseInt(r[2],16),b:parseInt(r[3],16)} : {r:0,g:0,b:0};
  }

  private addElevationLegend(min: number, max: number): void {
    if (this.elevationLegend) this.map.removeControl(this.elevationLegend);
    const d = max-min;
    const LC = L.Control.extend({ options:{position:'bottomright'}, onAdd:()=>{
      const div = L.DomUtil.create('div','elevation-legend');
      div.innerHTML=`<div style="background:white;padding:12px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.2);min-width:180px;"><h4 style="margin:0 0 10px 0;font-size:14px;">Altitude</h4>
        <div style="display:flex;align-items:center;margin-bottom:6px;"><div style="width:30px;height:20px;background:#006400;margin-right:10px;border-radius:3px;"></div><span style="font-size:12px;">${min.toFixed(0)} m</span></div>
        <div style="display:flex;align-items:center;margin-bottom:6px;"><div style="width:30px;height:20px;background:#32CD32;margin-right:10px;border-radius:3px;"></div><span style="font-size:12px;">${(min+d*0.25).toFixed(0)} m</span></div>
        <div style="display:flex;align-items:center;margin-bottom:6px;"><div style="width:30px;height:20px;background:#FFFF00;margin-right:10px;border-radius:3px;"></div><span style="font-size:12px;">${(min+d*0.5).toFixed(0)} m</span></div>
        <div style="display:flex;align-items:center;margin-bottom:6px;"><div style="width:30px;height:20px;background:#FFA500;margin-right:10px;border-radius:3px;"></div><span style="font-size:12px;">${(min+d*0.75).toFixed(0)} m</span></div>
        <div style="display:flex;align-items:center;"><div style="width:30px;height:20px;background:#8B0000;margin-right:10px;border-radius:3px;"></div><span style="font-size:12px;">${max.toFixed(0)} m</span></div>
        <hr style="margin:10px 0;"><div style="font-size:11px;color:#666;text-align:center;">Dénivelé: ${d.toFixed(1)} m</div></div>`;
      return div;
    }});
    this.elevationLegend = new LC(); this.elevationLegend.addTo(this.map);
  }

  async showElevation(): Promise<void> {
    if (this.heatLayer) this.map.removeLayer(this.heatLayer);
    this.polygonLayer.clearLayers();
    let gMin = Infinity, gMax = -Infinity;
    const allData: any[] = [];
    for (const p of this.parcelles) {
      if (!p.geometrie) continue;
      try {
        let parsed = JSON.parse(p.geometrie);
        let geometry = parsed.type==='Feature'?parsed.geometry:parsed;
        const points = this.generatePoints(geometry, 100), elevations: number[] = [];
        for (const pt of points) {
          const [lng,lat]=pt.geometry.coordinates, el=await this.elevationService.getElevation(lat,lng);
          elevations.push(el); if(el<gMin)gMin=el; if(el>gMax)gMax=el;
        }
        allData.push({parcelle:p,geometry,elevations,minElev:Math.min(...elevations),maxElev:Math.max(...elevations),avgElev:elevations.reduce((a,b)=>a+b,0)/elevations.length});
      } catch {}
    }
    for (const data of allData) {
      const {parcelle,geometry,minElev,maxElev}=data, denivele=maxElev-minElev;
      const gradientLayer = await this.createGradientPolygon(geometry,minElev,maxElev,gMin,gMax);
      gradientLayer.addTo(this.polygonLayer);
      L.geoJSON(geometry,{style:{color:'#333333',weight:2,fillOpacity:0}}).addTo(this.polygonLayer);
      const center=turf.centerOfMass(geometry), [lng,lat]=center.geometry.coordinates;
      const infoHtml=`<div style="background:white;padding:8px 12px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.2);font-size:12px;border-left:4px solid ${this.getColorForElevation(maxElev,gMin,gMax)};"><strong>${parcelle.nom}</strong><br>Dénivelé: ${denivele.toFixed(1)} m<br>${denivele<5?'✅ Terrain plat':denivele<20?'📈 Légère pente':'⚠️ Forte pente'}</div>`;
      L.marker([lat,lng],{icon:L.divIcon({className:'parcelle-info',html:infoHtml,iconSize:[180,70]})}).addTo(this.polygonLayer);
    }
    this.addElevationLegend(gMin,gMax);
    const b=this.polygonLayer.getBounds(); if(b.isValid())this.map.fitBounds(b);
  }

  private async createGradientPolygon(geometry:any,minElev:number,maxElev:number,gMin:number,gMax:number): Promise<L.Layer> {
    const bounds=turf.bbox(geometry), steps=40;
    const latStep=(bounds[3]-bounds[1])/steps, lngStep=(bounds[2]-bounds[0])/steps;
    const lg=L.layerGroup();
    for(let i=0;i<=steps;i++) for(let j=0;j<=steps;j++){
      const lat=bounds[1]+i*latStep, lng=bounds[0]+j*lngStep;
      if(turf.booleanPointInPolygon(turf.point([lng,lat]),geometry)){
        const el=this.interpolateElevation(lat,lng,minElev,maxElev,bounds);
        const color=this.getColorForElevation(el,gMin,gMax);
        L.rectangle(L.latLngBounds([lat-latStep/2,lng-lngStep/2],[lat+latStep/2,lng+lngStep/2]),{color,weight:0,fillColor:color,fillOpacity:0.85}).addTo(lg);
      }
    }
    return lg;
  }

  private interpolateElevation(lat:number,lng:number,minElev:number,maxElev:number,bounds:number[]): number {
    const cLat=(bounds[1]+bounds[3])/2, cLng=(bounds[0]+bounds[2])/2;
    const distance=Math.sqrt(Math.pow(lng-cLng,2)+Math.pow(lat-cLat,2));
    const maxDist=Math.sqrt(Math.pow(bounds[2]-bounds[0],2)+Math.pow(bounds[3]-bounds[1],2))/2;
    const n=Math.min(1,distance/maxDist), variation=Math.sin(n*Math.PI)*(maxElev-minElev)*0.4;
    return Math.min(maxElev,Math.max(minElev,minElev+(maxElev-minElev)*n+variation));
  }

  async showSlopeMap(): Promise<void> {
    if(this.heatLayer)this.map.removeLayer(this.heatLayer); this.polygonLayer.clearLayers();
    for(const p of this.parcelles){
      if(!p.geometrie)continue;
      try{
        let parsed=JSON.parse(p.geometrie), geometry=parsed.type==='Feature'?parsed.geometry:parsed;
        L.geoJSON(geometry,{style:{color:p.couleur||'#2e7d32',weight:2,fillOpacity:0.1}}).addTo(this.polygonLayer);
        const points=this.generatePoints(geometry,100), elevations:number[]=[];
        for(const pt of points){const[lng,lat]=pt.geometry.coordinates; elevations.push(await this.elevationService.getElevation(lat,lng));}
        const diff=Math.max(...elevations)-Math.min(...elevations);
        const center=turf.centerOfMass(geometry), [lng,lat]=center.geometry.coordinates;
        L.marker([lat,lng],{icon:L.divIcon({className:'slope-info',html:`<div style="background:white;padding:8px 12px;border-radius:8px;border:1px solid #ccc;font-size:12px;box-shadow:0 2px 5px rgba(0,0,0,0.1);"><strong>${p.nom}</strong><br>Dénivelé: ${diff.toFixed(1)} m<br>${diff>20?'⚠️ Pente significative':'✅ Terrain plat'}</div>`,iconSize:[160,65]})}).addTo(this.polygonLayer);
      }catch{}
    }
  }

  setLayer(type: string) {
    if(this.heatLayer)this.map.removeLayer(this.heatLayer);
    if(type==='altitude')this.showElevation();
    else if(type==='slope')this.showSlopeMap();
    else this.displayPolygons();
  }
}
