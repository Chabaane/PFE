import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.heat';
import * as turf from '@turf/turf';

import { ParcelleService } from '../../services/api/parcelle.service';
import { ElevationService } from '../../services/elevation.service';

@Component({
  selector: 'app-dessin-parcelle',
  standalone: true,
  templateUrl: './dessin-parcelle.html',
  styleUrl: './dessin-parcelle.scss',
})
export class DessinParcelleComponent implements OnInit {

  private map!: L.Map;
  private heatLayer: any;
  private polygonLayer = L.featureGroup();
  private elevationLegend: any = null;

  parcelles: any[] = [];

  constructor(
    private parcelleService: ParcelleService,
    private elevationService: ElevationService
  ) {}

  ngOnInit(): void {
    this.fixLeafletIcons();
    this.initMap();
    this.loadParcelles();
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
  }

  private loadParcelles(): void {
    this.parcelleService.getAllParcelles().subscribe({
      next: (data) => {
        this.parcelles = data;
        console.log('PARCELLES:', this.parcelles);
        if (this.map) {
          this.displayPolygons();
        }
      },
      error: (err) => console.error('Error loading parcelles:', err)
    });
  }

  private displayPolygons(): void {
    if (!this.map) {
      console.error('Map is not initialized');
      return;
    }

    this.polygonLayer.clearLayers();

    this.parcelles.forEach((p, index) => {
      const geometryData = p.geometrie;
      if (!geometryData) {
        console.warn(`Parcelle ${index} has no geometry data`);
        return;
      }

      try {
        let parsed = typeof geometryData === 'string' ? JSON.parse(geometryData) : geometryData;
        let geojson;

        if (parsed.type === 'Feature' && parsed.geometry) {
          geojson = parsed.geometry;
        } else if (parsed.type === 'Polygon' || parsed.type === 'MultiPolygon') {
          geojson = parsed;
        } else if (Array.isArray(parsed)) {
          const coords = parsed.map((pt: any) => [pt.lng, pt.lat]);
          if (coords.length > 0) {
            coords.push(coords[0]);
            geojson = { type: 'Polygon', coordinates: [coords] };
          }
        } else {
          console.warn(`Parcelle ${index}: Format inconnu`, parsed);
          return;
        }

        L.geoJSON(geojson, {
          style: { color: p.couleur || '#2e7d32', weight: 2, fillOpacity: 0.2 },
          onEachFeature: (feature, layer) => {
            let popupContent = `<strong>${p.nom}</strong><br>Surface: ${p.surface} ha<br>Couleur: ${p.couleur}`;
            if (p.culture) popupContent += `<br>Culture: ${p.culture}`;
            layer.bindPopup(popupContent);
          }
        }).addTo(this.polygonLayer);

      } catch (err) {
        console.error(`Erreur parsing geometry for parcelle ${index}:`, err);
      }
    });

    if (this.polygonLayer.getLayers().length > 0) {
      const bounds = this.polygonLayer.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds);
      }
    }
  }

  private generatePoints(geometry: any, maxPoints: number = 100): any[] {
    try {
      const bbox = turf.bbox(geometry);
      const area = turf.area(geometry);
      let cellSize;

      if (area > 500000) cellSize = 0.02;
      else if (area > 100000) cellSize = 0.01;
      else if (area > 10000) cellSize = 0.005;
      else cellSize = 0.002;

      const grid = turf.pointGrid(bbox, cellSize);
      const pointsInPolygon = grid.features.filter(pt => turf.booleanPointInPolygon(pt, geometry));

      if (pointsInPolygon.length > maxPoints) {
        const step = Math.ceil(pointsInPolygon.length / maxPoints);
        return pointsInPolygon.filter((_, index) => index % step === 0);
      }
      return pointsInPolygon;
    } catch (err) {
      console.error('Erreur génération points:', err);
      return [];
    }
  }

  private getColorForElevation(elevation: number, minElev: number, maxElev: number): string {
    const normalized = (elevation - minElev) / (maxElev - minElev);

    if (normalized < 0.2) return '#006400';      // Vert foncé
    if (normalized < 0.4) return '#32CD32';      // Vert
    if (normalized < 0.6) return '#FFFF00';      // Jaune
    if (normalized < 0.8) return '#FFA500';      // Orange
    return '#8B0000';                             // Rouge/Marron
  }

  private interpolateColor(color1: string, color2: string, factor: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  private addElevationLegend(minElev: number, maxElev: number): void {
    if (this.elevationLegend) {
      this.map.removeControl(this.elevationLegend);
    }

    const LegendControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: () => {
        const div = L.DomUtil.create('div', 'elevation-legend');
        const denivele = maxElev - minElev;
        div.innerHTML = `
          <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); min-width: 180px;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px;">Altitude</h4>
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <div style="width: 30px; height: 20px; background: #006400; margin-right: 10px; border-radius: 3px;"></div>
              <span style="font-size: 12px;">${minElev.toFixed(0)} m (bas)</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <div style="width: 30px; height: 20px; background: #32CD32; margin-right: 10px; border-radius: 3px;"></div>
              <span style="font-size: 12px;">${(minElev + denivele * 0.25).toFixed(0)} m</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <div style="width: 30px; height: 20px; background: #FFFF00; margin-right: 10px; border-radius: 3px;"></div>
              <span style="font-size: 12px;">${(minElev + denivele * 0.5).toFixed(0)} m</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <div style="width: 30px; height: 20px; background: #FFA500; margin-right: 10px; border-radius: 3px;"></div>
              <span style="font-size: 12px;">${(minElev + denivele * 0.75).toFixed(0)} m</span>
            </div>
            <div style="display: flex; align-items: center;">
              <div style="width: 30px; height: 20px; background: #8B0000; margin-right: 10px; border-radius: 3px;"></div>
              <span style="font-size: 12px;">${maxElev.toFixed(0)} m (haut)</span>
            </div>
            <hr style="margin: 10px 0;">
            <div style="font-size: 11px; color: #666; text-align: center;">
              Dénivelé: ${denivele.toFixed(1)} m
            </div>
          </div>
        `;
        return div;
      }
    });

    this.elevationLegend = new LegendControl();
    this.elevationLegend.addTo(this.map);
  }

  async showElevation(): Promise<void> {
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
    }

    console.log('Génération de la carte d\'altitude...');
    this.polygonLayer.clearLayers();

    let globalMin = Infinity;
    let globalMax = -Infinity;
    const allParcellesData = [];

    // Première passe : collecter toutes les altitudes
    for (const parcelle of this.parcelles) {
      if (!parcelle.geometrie) continue;

      try {
        let parsed = JSON.parse(parcelle.geometrie);
        let geometry = parsed.type === 'Feature' ? parsed.geometry : parsed;

        const points = this.generatePoints(geometry, 100);
        const elevations = [];

        for (const pt of points) {
          const [lng, lat] = pt.geometry.coordinates;
          const elevation = await this.elevationService.getElevation(lat, lng);
          elevations.push(elevation);

          if (elevation < globalMin) globalMin = elevation;
          if (elevation > globalMax) globalMax = elevation;
        }

        allParcellesData.push({
          parcelle,
          geometry,
          elevations,
          minElev: Math.min(...elevations),
          maxElev: Math.max(...elevations),
          avgElev: elevations.reduce((a, b) => a + b, 0) / elevations.length
        });

      } catch (err) {
        console.error('Erreur:', err);
      }
    }

    console.log(`Altitudes globales - Min: ${globalMin.toFixed(0)}m, Max: ${globalMax.toFixed(0)}m`);

    // Deuxième passe : afficher les parcelles avec dégradé
    for (const data of allParcellesData) {
      const { parcelle, geometry, minElev, maxElev, avgElev } = data;
      const denivele = maxElev - minElev;

      // Créer le polygone avec dégradé
      const gradientLayer = await this.createGradientPolygon(geometry, minElev, maxElev, globalMin, globalMax);
      gradientLayer.addTo(this.polygonLayer);

      // Ajouter le contour
      L.geoJSON(geometry, {
        style: { color: '#333333', weight: 2, fillOpacity: 0 }
      }).addTo(this.polygonLayer);

      // Ajouter les informations
      const center = turf.centerOfMass(geometry);
      const [lng, lat] = center.geometry.coordinates;

      const infoHtml = `
        <div style="background: white; padding: 8px 12px; border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2); font-size: 12px;
                    border-left: 4px solid ${this.getColorForElevation(maxElev, globalMin, globalMax)};">
          <strong>${parcelle.nom}</strong><br>
          Dénivelé: ${denivele.toFixed(1)} m<br>
          ${denivele < 5 ? '✅ Terrain plat' : denivele < 20 ? '📈 Légère pente' : '⚠️ Forte pente'}
        </div>
      `;

      L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'parcelle-info',
          html: infoHtml,
          iconSize: [180, 70]
        })
      }).addTo(this.polygonLayer);
    }

    // Ajouter la légende
    this.addElevationLegend(globalMin, globalMax);

    // Ajuster la vue
    if (this.polygonLayer.getLayers().length > 0) {
      const bounds = this.polygonLayer.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds);
      }
    }
  }

  private async createGradientPolygon(geometry: any, minElev: number, maxElev: number, globalMin: number, globalMax: number): Promise<L.Layer> {
    const bounds = turf.bbox(geometry);
    const steps = 40;
    const latStep = (bounds[3] - bounds[1]) / steps;
    const lngStep = (bounds[2] - bounds[0]) / steps;

    const layerGroup = L.layerGroup();

    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const lat = bounds[1] + (i * latStep);
        const lng = bounds[0] + (j * lngStep);

        const point = turf.point([lng, lat]);
        if (turf.booleanPointInPolygon(point, geometry)) {
          const elevation = this.interpolateElevation(lat, lng, minElev, maxElev, bounds);
          const color = this.getColorForElevation(elevation, globalMin, globalMax);

          const rectBounds = L.latLngBounds(
            [lat - latStep/2, lng - lngStep/2],
            [lat + latStep/2, lng + lngStep/2]
          );

          L.rectangle(rectBounds, {
            color: color,
            weight: 0,
            fillColor: color,
            fillOpacity: 0.85
          }).addTo(layerGroup);
        }
      }
    }

    return layerGroup;
  }

  private interpolateElevation(lat: number, lng: number, minElev: number, maxElev: number, bounds: number[]): number {
    const centerLat = (bounds[1] + bounds[3]) / 2;
    const centerLng = (bounds[0] + bounds[2]) / 2;

    const dx = lng - centerLng;
    const dy = lat - centerLat;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const maxDistance = Math.sqrt(
      Math.pow(bounds[2] - bounds[0], 2) +
      Math.pow(bounds[3] - bounds[1], 2)
    ) / 2;

    const normalizedDistance = Math.min(1, distance / maxDistance);
    const variation = Math.sin(normalizedDistance * Math.PI) * (maxElev - minElev) * 0.4;
    const elevation = minElev + (maxElev - minElev) * normalizedDistance + variation;

    return Math.min(maxElev, Math.max(minElev, elevation));
  }

  async showSlopeMap(): Promise<void> {
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
    }

    this.polygonLayer.clearLayers();

    for (const parcelle of this.parcelles) {
      if (!parcelle.geometrie) continue;

      try {
        let parsed = JSON.parse(parcelle.geometrie);
        let geometry = parsed.type === 'Feature' ? parsed.geometry : parsed;

        L.geoJSON(geometry, {
          style: { color: parcelle.couleur || '#2e7d32', weight: 2, fillOpacity: 0.1 }
        }).addTo(this.polygonLayer);

        const points = this.generatePoints(geometry, 100);
        const elevations = [];

        for (const pt of points) {
          const [lng, lat] = pt.geometry.coordinates;
          const elevation = await this.elevationService.getElevation(lat, lng);
          elevations.push(elevation);
        }

        const minElev = Math.min(...elevations);
        const maxElev = Math.max(...elevations);
        const diffElev = maxElev - minElev;

        const center = turf.centerOfMass(geometry);
        const [lng, lat] = center.geometry.coordinates;

        const slopeInfo = L.divIcon({
          className: 'slope-info',
          html: `
            <div style="background: white; padding: 8px 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
              <strong>${parcelle.nom}</strong><br>
              Dénivelé: ${diffElev.toFixed(1)} m<br>
              ${diffElev > 20 ? '⚠️ Pente significative' : '✅ Terrain plat'}
            </div>
          `,
          iconSize: [160, 65]
        });

        L.marker([lat, lng], { icon: slopeInfo }).addTo(this.polygonLayer);

      } catch (err) {
        console.error('Erreur:', err);
      }
    }
  }

  setLayer(type: string) {
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
    }

    if (type === 'altitude') {
      this.showElevation();
    } else if (type === 'slope') {
      this.showSlopeMap();
    } else {
      this.displayPolygons();
    }
  }
}
