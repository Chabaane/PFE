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
  private polygonLayer = L.featureGroup(); // Changed from L.layerGroup() to L.featureGroup()

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

  // 🔧 Fix marker bug
  private fixLeafletIcons() {
    delete (L.Icon.Default.prototype as any)._getIconUrl;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
      iconUrl: 'assets/leaflet/marker-icon.png',
      shadowUrl: 'assets/leaflet/marker-shadow.png',
    });
  }

  // 🌍 Init map
  private initMap(): void {
    this.map = L.map('map').setView([34, 9], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
      .addTo(this.map);

    this.polygonLayer.addTo(this.map); // featureGroup can be added directly
  }

  // 📦 Charger parcelles
  private loadParcelles(): void {
    this.parcelleService.getAllParcelles().subscribe({
      next: (data) => {
        this.parcelles = data;
        console.log('PARCELLES:', this.parcelles);

        if (this.map) {
          this.displayPolygons();
        } else {
          console.warn('Map not initialized yet');
        }
      },
      error: (err) => {
        console.error('Error loading parcelles:', err);
      }
    });
  }

  // 🟩 Affichage polygones
  // 🟩 Affichage polygones
private displayPolygons(): void {
  console.log('Displaying polygons, map exists:', !!this.map);
  console.log('Number of parcelles:', this.parcelles.length);

  if (!this.map) {
    console.error('Map is not initialized');
    return;
  }

  this.polygonLayer.clearLayers();

  this.parcelles.forEach((p, index) => {
    // Utilisez 'geometrie' au lieu de 'contourJson'
    const geometryData = p.geometrie;

    console.log(`Parcelle ${index}:`, {
      hasGeometry: !!geometryData,
      geometryData: geometryData?.substring(0, 100),
      couleur: p.couleur
    });

    if (!geometryData) {
      console.warn(`Parcelle ${index} has no geometry data`);
      return;
    }

    try {
      // Si c'est une chaîne, parsez-la
      let parsed = typeof geometryData === 'string' ? JSON.parse(geometryData) : geometryData;
      console.log(`Parsed data type:`, parsed.type);

      let geojson;

      // ✅ CAS 1 : C'est un objet Feature GeoJSON
      if (parsed.type === 'Feature' && parsed.geometry) {
        geojson = parsed.geometry;
        console.log(`Parcelle ${index} is a Feature with ${parsed.geometry.type}`);
      }
      // ✅ CAS 2 : C'est déjà un objet Geometry (Polygon, MultiPolygon)
      else if (parsed.type === 'Polygon' || parsed.type === 'MultiPolygon') {
        geojson = parsed;
      }
      // ✅ CAS 3 : Tableau de points (format [{lng, lat}])
      else if (Array.isArray(parsed)) {
        const coords = parsed.map((pt: any) => [pt.lng, pt.lat]);

        if (coords.length === 0) {
          console.warn(`Parcelle ${index} has empty coordinates array`);
          return;
        }

        // Fermer le polygone
        coords.push(coords[0]);

        geojson = {
          type: 'Polygon',
          coordinates: [coords]
        };
        console.log(`Parcelle ${index} converted from array, ${coords.length} points`);
      }
      else {
        console.warn(`Parcelle ${index}: Format inconnu`, parsed);
        return;
      }

      // Ajouter la couche à la carte
      const layer = L.geoJSON(geojson, {
        style: {
          color: p.couleur || '#2e7d32',
          weight: 2,
          fillOpacity: 0.2
        },
        onEachFeature: (feature, layer) => {
          // Ajouter un popup avec les infos de la parcelle
          let popupContent = `<strong>${p.nom}</strong><br>`;
          popupContent += `Surface: ${p.surface} ha<br>`;
          popupContent += `Couleur: ${p.couleur}<br>`;
          if (p.culture) popupContent += `Culture: ${p.culture}<br>`;
          if (p.agriculteurId) popupContent += `Agriculteur ID: ${p.agriculteurId}`;

          layer.bindPopup(popupContent);
        }
      }).addTo(this.polygonLayer);

      console.log(`Parcelle ${index} added to map`);

    } catch (err) {
      console.error(`Erreur parsing geometry for parcelle ${index}:`, err);
    }
  });

  const layerCount = this.polygonLayer.getLayers().length;
  console.log('Total layers in polygonLayer:', layerCount);

  // Ajuster la vue pour voir tous les polygones
  if (layerCount > 0) {
    try {
      const bounds = this.polygonLayer.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds);
        console.log('Map bounds adjusted to fit polygons');
      }
    } catch (err) {
      console.error('Error getting bounds:', err);
    }
  } else {
    console.warn('No polygons were added to the map');
  }
}

  // 🔥 Générer points dans polygone
  // Dans dessin-parcelle.ts
private generatePoints(geometry: any, maxPoints: number = 50): any[] {
  try {
    // Obtenir les limites du polygone
    const bbox = turf.bbox(geometry);

    // Calculer la surface pour adapter la densité
    const area = turf.area(geometry);

    // Déterminer l'espacement entre points
    let cellSize;
    if (area > 500000) { // > 50 hectares
      cellSize = 0.02;
    } else if (area > 100000) { // > 10 hectares
      cellSize = 0.01;
    } else if (area > 10000) { // > 1 hectare
      cellSize = 0.005;
    } else {
      cellSize = 0.002;
    }

    // Générer la grille
    const grid = turf.pointGrid(bbox, cellSize);

    // Filtrer les points dans le polygone
    const pointsInPolygon = grid.features.filter(pt =>
      turf.booleanPointInPolygon(pt, geometry)
    );

    console.log(`Points dans polygone: ${pointsInPolygon.length}, surface: ${area}m²`);

    // Si trop de points, prendre un échantillon
    if (pointsInPolygon.length > maxPoints) {
      const step = Math.ceil(pointsInPolygon.length / maxPoints);
      const sampled = pointsInPolygon.filter((_, index) => index % step === 0);
      console.log(`Échantillonnage: ${pointsInPolygon.length} -> ${sampled.length} points`);
      return sampled;
    }

    return pointsInPolygon;
  } catch (err) {
    console.error('Erreur génération points:', err);
    return [];
  }
}
  // 🌡️ Construire heatmap
 // Dans dessin-parcelle.ts
// Dans dessin-parcelle.ts - Version simplifiée
// Dans dessin-parcelle.ts
async showElevation(): Promise<void> {
  if (this.heatLayer) {
    this.map.removeLayer(this.heatLayer);
  }

  console.log('Génération de la carte d\'altitude en cours...');

  const heatPoints: [number, number, number][] = [];
  let totalPointsProcessed = 0;

  for (const p of this.parcelles) {
    if (!p.geometrie) continue;

    try {
      let parsed = JSON.parse(p.geometrie);

      let geometry;
      if (parsed.type === 'Feature' && parsed.geometry) {
        geometry = parsed.geometry;
      } else {
        geometry = parsed;
      }

      const points = this.generatePoints(geometry, 50);
      console.log(`Parcelle ${p.nom}: ${points.length} points générés`);

      // Traiter chaque point
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const [lng, lat] = pt.geometry.coordinates;

        try {
          const elevation = await this.elevationService.getElevation(lat, lng);

          // Vérifier que l'altitude est valide
          if (elevation && !isNaN(elevation) && elevation > 0) {
            heatPoints.push([lat, lng, elevation]);
          } else {
            // Si altitude invalide, utiliser une valeur par défaut
            heatPoints.push([lat, lng, 100]);
          }

          totalPointsProcessed++;

          // Log toutes les 10 requêtes
          if (totalPointsProcessed % 10 === 0) {
            console.log(`${totalPointsProcessed} points traités...`);
          }

        } catch (err) {
          console.error('Erreur altitude pour point:', pt, err);
          // Ajouter quand même un point avec altitude 0 pour ne pas casser la carte
          heatPoints.push([lat, lng, 0]);
        }
      }
    } catch (err) {
      console.error('Erreur parsing geometry:', err);
    }
  }

  console.log(`Total points traités: ${totalPointsProcessed}`);
  console.log(`Points heatmap valides: ${heatPoints.length}`);

  if (heatPoints.length === 0) {
    console.warn('Aucun point valide - utilisation de données mock');
    this.addTestHeatPoints();
    return;
  }

  // Normaliser les altitudes pour une meilleure visualisation
  const elevations = heatPoints.map(p => p[2]);
  const maxElevation = Math.max(...elevations);
  const minElevation = Math.min(...elevations);

  console.log(`Altitudes - Min: ${minElevation}m, Max: ${maxElevation}m`);

  this.heatLayer = (L as any).heatLayer(heatPoints, {
    radius: 20,
    blur: 15,
    maxZoom: 12,
    minOpacity: 0.3,
    gradient: {
      0.0: 'blue',
      0.2: 'green',
      0.4: 'yellow',
      0.6: 'orange',
      0.8: 'red',
      1.0: 'darkred'
    }
  }).addTo(this.map);

  console.log('Heatmap ajoutée avec succès');
}

private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ajouter des points de test pour visualiser la heatmap
private addTestHeatPoints(): void {
  const testPoints: [number, number, number][] = [];
  const bounds = this.map.getBounds();

  // Créer une grille de points dans la vue actuelle
  const latStep = (bounds.getNorth() - bounds.getSouth()) / 20;
  const lngStep = (bounds.getEast() - bounds.getWest()) / 20;

  for (let lat = bounds.getSouth(); lat <= bounds.getNorth(); lat += latStep) {
    for (let lng = bounds.getWest(); lng <= bounds.getEast(); lng += lngStep) {
      // Simuler une altitude qui varie
      const elevation = Math.sin(lat * 50) * 100 + Math.cos(lng * 50) * 100 + 200;
      testPoints.push([lat, lng, Math.max(0, elevation)]);
    }
  }

  this.heatLayer = (L as any).heatLayer(testPoints, {
    radius: 25,
    blur: 15,
    gradient: {
      0.1: 'green',
      0.3: 'lime',
      0.5: 'yellow',
      0.7: 'orange',
      1.0: 'red'
    }
  }).addTo(this.map);

  console.log(`Points de test ajoutés: ${testPoints.length}`);
}

  // 🔁 switch couches
  setLayer(type: string) {
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
    }

    if (type === 'altitude') {
      this.showElevation();
    } else {
      this.displayPolygons();
    }
  }
}
