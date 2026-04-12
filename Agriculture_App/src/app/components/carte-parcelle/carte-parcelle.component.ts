// components/carte-parcelle/carte-parcelle.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-draw';
import { ParcelleService, Parcelle, DessinParcelleDto } from '../../services/api/parcelle.service';
import area from '@turf/area';
import { polygon } from '@turf/helpers';
import { ChatbotComponent } from '../chatbot/chatbot.component';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

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

interface Point3D {
  x: number;
  y: number;
  z: number;
  ndvi: number;
  lat: number;
  lng: number;
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

/** Point 3D avec altitude et NDVI */
interface Point3D {
  x: number;
  y: number;
  z: number;
  ndvi: number;
  lat: number;
  lng: number;
}

// ─── Palette SVG icons par agriculteur (déterministe par id % 12) ────────────

const FARMER_ICONS = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 54">
    <circle cx="22" cy="22" r="20" fill="#2d7a2d" stroke="white" stroke-width="2.5"/>
    <text x="22" y="29" text-anchor="middle" font-size="20" fill="white">🌾</text>
    <polygon points="22,42 15,54 29,54" fill="#2d7a2d"/>
  </svg>`,
  // ... (autres icônes conservées)
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
  @ViewChild('canvas3d') canvas3d!: ElementRef<HTMLDivElement>;

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
  modeAffichage: 'normal' | 'altitude' | '3d' = 'normal';
  altitudeLoading = false;
  altitudeParcelleActive: Parcelle | null = null;
  altitudeStats: AltitudeStats | null = null;
  private altitudeLayers: Map<number, L.Layer> = new Map();

  // ── Mode 3D ────────────────────────────────────────────────────────────────
  mode3dActif = false;
  scene3d: THREE.Scene | null = null;
  camera3d: THREE.PerspectiveCamera | null = null;
  renderer3d: THREE.WebGLRenderer | null = null;
  labelRenderer: CSS2DRenderer | null = null;
  controls3d: OrbitControls | null = null;
  terrainGroup: THREE.Group | null = null;
  ndviOverlay: THREE.Mesh | null = null;
  parcelle3dObjects: Map<number, THREE.Group> = new Map();

  // Options NDVI
  ndviOptions = {
    showNdvi: true,
    ndviMin: -0.2,
    ndviMax: 0.8,
    opacity: 0.7
  };

  // Palette NDVI (rouge = faible végétation, vert = forte végétation)
  private ndviColors = [
    { value: -0.2, color: new THREE.Color(0x8B3A3A) }, // Marron/rouge - sol nu
    { value: 0.0, color: new THREE.Color(0xD2B48C) },  // Beige - sol sec
    { value: 0.2, color: new THREE.Color(0xF4A460) },  // Orange clair - végétation faible
    { value: 0.4, color: new THREE.Color(0x9ACD32) },  // Jaune-vert - végétation modérée
    { value: 0.6, color: new THREE.Color(0x228B22) },  // Vert - végétation bonne
    { value: 0.8, color: new THREE.Color(0x006400) }   // Vert foncé - végétation dense
  ];

  // ── Cache altitude avec sessionStorage ──────────────────────────────────────
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
    this.loadAltCache();
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
    if (this.meteoTimer) clearInterval(this.meteoTimer);
    if (this.renderer3d) this.renderer3d.dispose();
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
    return `${lat.toFixed(3)},${lng.toFixed(3)}`;
  }

  // ─── MODE 3D ET NDVI ───────────────────────────────────────────────────────

  /**
   * Bascule vers le mode 3D avec superposition NDVI
   */
  async basculerMode3d(): Promise<void> {
  if (this.mode3dActif) {
    this.desactiverMode3d();
  } else {
    if (this.altitudeLoading) {
      console.log('Chargement en cours...');
      return;
    }

    this.mode3dActif = true;
    this.modeAffichage = '3d';

    this.cdr.detectChanges();

    setTimeout(async () => {
      const mapElement = document.getElementById('map');
      if (mapElement) mapElement.style.display = 'none';

      const canvasElement = document.getElementById('canvas3d');
      if (canvasElement) {
        canvasElement.style.display = 'block';
        canvasElement.style.width = '100%';
        canvasElement.style.height = '600px';
      }

      await this.initScene3d();

      // Si une parcelle est déjà sélectionnée, l'afficher
      if (this.parcelleSelectionnee) {
        await this.afficherParcelleSeule3d(this.parcelleSelectionnee);
      } else if (this.parcelles.length > 0) {
        // Sinon, afficher la première parcelle
        await this.afficherParcelleSeule3d(this.parcelles[0]);
      }
    }, 100);
  }
}

  private desactiverMode3d(): void {
    this.mode3dActif = false;
    this.modeAffichage = 'normal';

    // Réafficher la carte
    const mapElement = document.getElementById('map');
    if (mapElement) mapElement.style.display = 'block';

    // Cacher le canvas 3D
    const canvasElement = document.getElementById('canvas3d');
    if (canvasElement) canvasElement.style.display = 'none';

    // Nettoyer la scène 3D
    if (this.renderer3d) {
      this.renderer3d.dispose();
      this.renderer3d = null;
    }
    if (this.controls3d) {
      this.controls3d.dispose();
      this.controls3d = null;
    }
    this.scene3d = null;
    this.camera3d = null;
    this.labelRenderer = null;
    this.terrainGroup = null;
    this.parcelle3dObjects.clear();
  }

  /**
   * Initialise la scène Three.js
   */
  private async initScene3d(): Promise<void> {
  const container = document.getElementById('canvas3d');
  if (!container) {
    console.error('Canvas 3D non trouvé');
    return;
  }
   this.testerScene3d();
  container.style.display = 'block';

  const width = container.offsetWidth || window.innerWidth;
  const height = container.offsetHeight || 600;
  console.log(container.offsetWidth, container.offsetHeight);
  console.log('Initialisation 3D avec dimensions:', width, 'x', height);

  this.scene3d = new THREE.Scene();
  this.scene3d.background = new THREE.Color(0x87CEEB);
  this.scene3d.fog = new THREE.Fog(0x87CEEB, 50, 150);

  // Camera - position plus proche pour mieux voir
  this.camera3d = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  this.camera3d.position.set(20, 15, 25);  // Position plus proche
  this.camera3d.lookAt(0, 0, 0);

  // Renderer
  this.renderer3d = new THREE.WebGLRenderer({ antialias: true });
  this.renderer3d.setSize(width, height);
  this.renderer3d.shadowMap.enabled = true;
  this.renderer3d.setClearColor(0x87CEEB);

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  container.appendChild(this.renderer3d.domElement);

  // CSS2D Renderer
  this.labelRenderer = new CSS2DRenderer();
  this.labelRenderer.setSize(width, height);
  this.labelRenderer.domElement.style.position = 'absolute';
  this.labelRenderer.domElement.style.top = '0px';
  this.labelRenderer.domElement.style.left = '0px';
  this.labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(this.labelRenderer.domElement);

  // Controls
  this.controls3d = new OrbitControls(this.camera3d, this.renderer3d.domElement);
  this.controls3d.enableDamping = true;
  this.controls3d.dampingFactor = 0.05;
  this.controls3d.rotateSpeed = 1.0;
  this.controls3d.zoomSpeed = 1.2;
  this.controls3d.enablePan = true;
  this.controls3d.target.set(0, 5, 0);

  // Éclairage
  this.ajouterEclairage();

  // Grille d'aide
  const gridHelper = new THREE.GridHelper(50, 20, 0x888888, 0x444444);
  gridHelper.position.y = -2;
  this.scene3d.add(gridHelper);

  // Axes helpers (pour debug)
  const axesHelper = new THREE.AxesHelper(15);
  this.scene3d.add(axesHelper);

  // Démarrer l'animation
  this.animate3d();

  console.log('Scene 3D initialisée avec succès');
}
// Ajoutez cette fonction pour tester la 3D sans données
private testerScene3d(): void {
  if (!this.scene3d) return;

  console.log('Ajout des objets de test...');

  // Ajouter une sphère de test plus grande et mieux positionnée
  const geometry = new THREE.SphereGeometry(5, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0x442200 });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(0, 5, 0);
  sphere.castShadow = true;
  this.scene3d.add(sphere);

  // Ajouter un cube de test
  const boxGeometry = new THREE.BoxGeometry(4, 4, 4);
  const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x44aa44, emissive: 0x226622 });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(-10, 2, -10);
  box.castShadow = true;
  this.scene3d.add(box);

  // Ajouter un plan au sol pour référence
  const planeGeometry = new THREE.PlaneGeometry(40, 40);
  const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x88aa88, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -2;
  plane.receiveShadow = true;
  this.scene3d.add(plane);

  console.log('Objets de test ajoutés à la scène');
}

  private ajouterEclairage(): void {
  if (!this.scene3d) return;

  // Lumière ambiante plus forte
  const ambientLight = new THREE.AmbientLight(0x404060, 0.7);
  this.scene3d.add(ambientLight);

  // Lumière directionnelle principale (soleil)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(10, 20, 5);
  directionalLight.castShadow = true;
  directionalLight.receiveShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  this.scene3d.add(directionalLight);

  // Lumière d'appoint depuis le côté
  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.5);
  fillLight.position.set(-5, 10, 10);
  this.scene3d.add(fillLight);

  // Lumière venant du bas pour éclairer les ombres
  const backLight = new THREE.PointLight(0x4466cc, 0.4);
  backLight.position.set(0, -5, 0);
  this.scene3d.add(backLight);

  // Ajouter une lumière ponctuelle au centre
  const centerLight = new THREE.PointLight(0xffaa66, 0.3);
  centerLight.position.set(0, 10, 0);
  this.scene3d.add(centerLight);
}

  private animate3d(): void {
    requestAnimationFrame(() => this.animate3d());

    if (this.controls3d) {
      this.controls3d.update();
    }

    if (this.renderer3d && this.scene3d && this.camera3d) {
      this.renderer3d.render(this.scene3d, this.camera3d);
    }

    if (this.labelRenderer && this.scene3d && this.camera3d) {
      this.labelRenderer.render(this.scene3d, this.camera3d);
    }
  }


  /**
   * Simule une valeur NDVI basée sur la parcelle et la position
   * À remplacer par une vraie API Sentinel Hub ou autre source NDVI
   */
  private simulerNdvi(lat: number, lng: number, parcelle: Parcelle): number {
    // Simulation réaliste basée sur:
    // - Type de culture
    // - Saison (mois actuel)
    // - Altitude (les zones plus hautes ont moins de végétation)
    // - Position aléatoire cohérente (hash)

    const mois = new Date().getMonth();
    const isSaisonVegetative = mois >= 2 && mois <= 9; // Mars à Octobre

    let ndviBase = 0.3;

    // Type de culture
    switch (parcelle.culture?.toLowerCase()) {
      case 'blé':
      case 'orge':
        ndviBase = isSaisonVegetative ? 0.6 : 0.3;
        break;
      case 'olivier':
        ndviBase = 0.5;
        break;
      case 'vigne':
        ndviBase = isSaisonVegetative ? 0.65 : 0.35;
        break;
      case 'maraîchage':
      case 'tomate':
      case 'pomme de terre':
        ndviBase = isSaisonVegetative ? 0.7 : 0.2;
        break;
      default:
        ndviBase = 0.4;
    }

    // Variation spatiale cohérente (bruit de Perlin simplifié)
    const hash = Math.sin(lat * 100) * Math.cos(lng * 100) * 10000;
    const variation = (Math.sin(hash) + Math.cos(hash * 2)) * 0.15;

    let ndvi = ndviBase + variation;

    // Ajustement par altitude (moins de végétation en haute altitude)
    const altitude = this.altCache.get(this.altKey(lat, lng)) || 100;
    ndvi *= Math.max(0.5, 1 - (altitude - 50) / 500);

    return Math.max(this.ndviOptions.ndviMin, Math.min(this.ndviOptions.ndviMax, ndvi));
  }



  /**
   * Obtient la couleur NDVI pour une valeur donnée
   */
  private getNdviColor(ndvi: number): THREE.Color {
    // Trouver l'intervalle
    for (let i = 0; i < this.ndviColors.length - 1; i++) {
      if (ndvi >= this.ndviColors[i].value && ndvi <= this.ndviColors[i + 1].value) {
        const t = (ndvi - this.ndviColors[i].value) / (this.ndviColors[i + 1].value - this.ndviColors[i].value);
        const r = this.ndviColors[i].color.r * (1 - t) + this.ndviColors[i + 1].color.r * t;
        const g = this.ndviColors[i].color.g * (1 - t) + this.ndviColors[i + 1].color.g * t;
        const b = this.ndviColors[i].color.b * (1 - t) + this.ndviColors[i + 1].color.b * t;
        return new THREE.Color(r, g, b);
      }
    }
    return this.ndviColors[0].color;
  }



  /**
   * Met à jour l'opacité de la superposition NDVI
   */
  updateNdviOpacity(): void {
    if (this.terrainGroup) {
      const terrainMesh = this.terrainGroup.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
      if (terrainMesh && terrainMesh.material) {
        (terrainMesh.material as THREE.MeshStandardMaterial).opacity = this.ndviOptions.opacity;
        (terrainMesh.material as THREE.MeshStandardMaterial).transparent = this.ndviOptions.opacity < 1;
      }
    }
  }

  /**
   * Bascule l'affichage NDVI
   */
  toggleNdvi(): void {
    this.ndviOptions.showNdvi = !this.ndviOptions.showNdvi;
    if (this.terrainGroup) {
      const terrainMesh = this.terrainGroup.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
      if (terrainMesh && terrainMesh.material) {
        if (this.ndviOptions.showNdvi) {
          (terrainMesh.material as THREE.MeshStandardMaterial).vertexColors = true;
        } else {
          (terrainMesh.material as THREE.MeshStandardMaterial).vertexColors = false;
          (terrainMesh.material as THREE.MeshStandardMaterial).color.setHex(0x8B7355);
        }
      }
    }
  }

  // ─── MÉTHODES ALTITUDE EXISTANTES (adaptées) ───────────────────────────────

  basculerModeAltitude(): void {
    if (this.modeAffichage === 'altitude') {
      this.desactiverModeAltitude();
    } else if (this.modeAffichage !== '3d') {
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
      const coords = this.extraireCoordonnees(geoJson);
      if (!coords.length) {
        this.altitudeLoading = false;
        return;
      }

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

  private async recupererAltitudesAvecCache(points: { lat: number; lng: number }[]): Promise<AltitudePoint[]> {
    const results: AltitudePoint[] = [];
    const toFetch: { lat: number; lng: number; key: string }[] = [];
    const seen = new Set<string>();

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

  // ── MÉTHODES MÉTÉO (inchangées) ───────────────────────────────────────────

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

    // Mode 3D - Afficher uniquement la parcelle sélectionnée
    if (this.modeAffichage === '3d' && this.mode3dActif) {
      this.afficherParcelleSeule3d(parcelle);
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
      if (this.parcelle3dObjects.has(id)) {
        if (this.scene3d) this.scene3d.remove(this.parcelle3dObjects.get(id)!);
        this.parcelle3dObjects.delete(id);
      }
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
  // Ajouter une légende d'altitude en 3D
private ajouterLegendeAltitude(): void {
  const div = document.createElement('div');
  div.innerHTML = `
    <div style="background:rgba(0,0,0,0.7);padding:8px 12px;border-radius:8px;color:white;font-size:12px;">
      <strong>⛰️ Altitude</strong><br>
      <span style="color:#1a7a1a">■</span> Basse: ${this.altitudeStats?.min || 0}m<br>
      <span style="color:#e53935">■</span> Haute: ${this.altitudeStats?.max || 0}m<br>
      Dénivelé: ${this.altitudeStats?.denivele || 0}m
    </div>
  `;
  const label = new CSS2DObject(div);
  label.position.set(-15, 10, -15);
  this.scene3d?.add(label);
}
  private ajouterMarqueursCulture(parcelle: Parcelle, position: { x: number; z: number; y: number }): void {
  if (!this.scene3d) return;

  const div = document.createElement('div');
  div.className = 'culture-marker-3d';
  div.innerHTML = `
    <div style="background:${parcelle.couleur || '#4CAF50'};border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
      ${this.getCultureIcon(parcelle.culture || '')}
    </div>
    <div style="background:rgba(0,0,0,0.7);color:white;font-size:10px;padding:2px 6px;border-radius:4px;margin-top:2px;text-align:center;">
      ${parcelle.nom}<br>${parcelle.surface}ha
    </div>
  `;

  const label = new CSS2DObject(div);
  label.position.set(position.x, position.y + 2, position.z);
  this.scene3d.add(label);
}

private getCultureIcon(culture: string): string {
  const icons: { [key: string]: string } = {
    'Blé': '🌾',
    'Olives': '🫒',
    'Vigne': '🍇',
    'Maïs': '🌽',
    'Tomate': '🍅',
    'Orge': '🌾'
  };
  return icons[culture] || '🌱';
}
// Au clic sur le terrain, afficher la valeur NDVI
private setupRaycaster(): void {
  if (!this.renderer3d || !this.scene3d || !this.camera3d) return;

  // Supprimer l'ancien event listener pour éviter les doublons
  const oldListener = (this.renderer3d.domElement as any).__raycasterListener;
  if (oldListener) {
    this.renderer3d.domElement.removeEventListener('click', oldListener);
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const clickHandler = (event: MouseEvent) => {
    const rect = this.renderer3d!.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, this.camera3d!);

    // Chercher spécifiquement le terrain dans terrainGroup
    const terrainMesh = this.terrainGroup?.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh | undefined;

    let intersects: THREE.Intersection[] = [];
    if (terrainMesh) {
      intersects = raycaster.intersectObject(terrainMesh);
    } else {
      intersects = raycaster.intersectObjects(this.scene3d!.children, true);
    }

    if (intersects.length > 0) {
      const point = intersects[0].point;
      console.log(`Clic 3D - Position: (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`);
      this.afficherValeurNdvi(point);
    }
  };

  this.renderer3d.domElement.addEventListener('click', clickHandler);
  (this.renderer3d.domElement as any).__raycasterListener = clickHandler;
}

private afficherValeurNdvi(point: THREE.Vector3): void {
  // Calculer la valeur NDVI approximative à cette position
  // Idéalement, il faudrait interpoler depuis les points existants
  let ndvi = 0.5;

  // Essayer de trouver le point le plus proche dans les données
  if (this.terrainGroup && (this.terrainGroup.userData as any).points3d) {
    const points3d = (this.terrainGroup.userData as any).points3d as Point3D[];
    let minDist = Infinity;
    for (const p of points3d) {
      const dist = Math.hypot(p.x - point.x, p.z - point.z);
      if (dist < minDist) {
        minDist = dist;
        ndvi = p.ndvi;
      }
    }
  }

  // Créer un popup temporaire en CSS2D au lieu de alert()
  this.afficherPopupNdvi(point, ndvi);
}

private afficherPopupNdvi(point: THREE.Vector3, ndvi: number): void {
  if (!this.scene3d) return;

  // Supprimer l'ancien popup s'il existe
  if ((this.scene3d as any).__ndviPopup) {
    this.scene3d.remove((this.scene3d as any).__ndviPopup);
  }

  const div = document.createElement('div');
  const interpretation = this.getNdviInterpretation(ndvi);
  const color = ndvi > 0.6 ? '#228B22' : ndvi > 0.4 ? '#9ACD32' : ndvi > 0.2 ? '#F4A460' : '#8B3A3A';

  div.innerHTML = `
    <div style="background:rgba(0,0,0,0.85);color:white;padding:10px 15px;border-radius:12px;font-size:13px;text-align:center;border-left:4px solid ${color};backdrop-filter:blur(8px);">
      <strong>📍 NDVI: ${ndvi.toFixed(3)}</strong><br>
      ${interpretation}
      <div style="font-size:10px;color:#aaa;margin-top:4px;">Cliquez sur la carte pour fermer</div>
    </div>
  `;

  const popup = new CSS2DObject(div);
  popup.position.set(point.x, point.y + 2, point.z);
  this.scene3d.add(popup);
  (this.scene3d as any).__ndviPopup = popup;

  // Fermer le popup au prochain clic (déjà géré par le remplacement)
  setTimeout(() => {
    if ((this.scene3d as any).__ndviPopup === popup) {
      this.scene3d?.remove(popup);
      (this.scene3d as any).__ndviPopup = null;
    }
  }, 5000);
}

private getNdviInterpretation(ndvi: number): string {
  if (ndvi > 0.6) return '🌿 Végétation très dense et saine';
  if (ndvi > 0.4) return '🌱 Végétation modérée, bonne santé';
  if (ndvi > 0.2) return '⚠️ Végétation faible, surveiller';
  return '🔴 Sol nu ou végétation stressée';
}

   ///////////////////////
   /**
 * Affiche une seule parcelle en 3D
 */
private async afficherParcelleSeule3d(parcelle: Parcelle): Promise<void> {
  if (!this.scene3d || !parcelle.geometrie) {
    console.log('Scene 3D non disponible');
    return;
  }

  this.altitudeLoading = true;

  try {
    // Nettoyer l'affichage 3D existant
    this.nettoyerScene3d();

    // Extraire les coordonnées de la parcelle
    const geoJson = JSON.parse(parcelle.geometrie);
    const coords = this.extraireCoordonnees(geoJson);
    if (coords.length < 3) return;

    // Calculer les bounds de cette parcelle seulement
    const bounds = this.calculerBoundsParcelle(coords);

    // Générer une grille plus fine pour la parcelle (12x12 pour plus de détails)
    const grille = this.genererGrille(coords, 12);
    const pointsAvecAlt = await this.recupererAltitudesAvecCache(grille);

    // Calculer les statistiques d'altitude
    const altitudes = pointsAvecAlt.map(p => p.altitude);
    const min = Math.round(Math.min(...altitudes));
    const max = Math.round(Math.max(...altitudes));
    const mean = altitudes.reduce((s, a) => s + a, 0) / altitudes.length;
    this.altitudeStats = { min, max, mean, denivele: max - min };

    // Convertir les points en 3D
    const points3d: Point3D[] = [];
    pointsAvecAlt.forEach(point => {
      const ndvi = this.simulerNdvi(point.lat, point.lng, parcelle);
      const { x, z } = this.geoToWorldParcelle(point.lng, point.lat, bounds);
      const y = point.altitude * 0.3; // Facteur d'échelle verticale
      points3d.push({ x, y, z, ndvi, lat: point.lat, lng: point.lng });
    });

    // Créer le terrain 3D pour cette parcelle
    this.creerTerrain3dParcelle(points3d, bounds, parcelle);

    // Ajouter un contour coloré autour de la parcelle
    this.ajouterContourParcelle(coords, bounds, parcelle.couleur || '#4CAF50');
      // ⭐ RECONFIGURER LE RAYCASTER APRÈS LA CRÉATION DU TERRAIN
    this.setupRaycaster();

    // Centrer la caméra sur la parcelle
    this.centrerCameraSurParcelle(points3d);

  } catch (err) {
    console.error('Erreur affichage parcelle 3D:', err);
    alert('Erreur lors du chargement 3D de la parcelle');
  } finally {
    this.altitudeLoading = false;
    this.cdr.detectChanges();
  }
}

/**
 * Nettoie la scène 3D (garde seulement les éléments de base)
 */
private nettoyerScene3d(): void {
  if (!this.scene3d) return;

  // Supprimer le terrain existant
  if (this.terrainGroup) {
    this.scene3d.remove(this.terrainGroup);
    this.terrainGroup = null;
  }

  // Supprimer tous les labels (garder la grille et les axes si présents)
  this.scene3d.children.forEach(child => {
    if (child instanceof CSS2DObject || (child instanceof THREE.Mesh && child !== this.scene3d?.getObjectByName('gridHelper'))) {
      this.scene3d?.remove(child);
    }
  });
}

/**
 * Calcule les bounds d'une seule parcelle
 */
private calculerBoundsParcelle(coords: [number, number][]): { minLng: number; maxLng: number; minLat: number; maxLat: number } {
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats)
  };
}

/**
 * Convertit des coordonnées pour une parcelle individuelle
 */
private geoToWorldParcelle(lng: number, lat: number, bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number }): { x: number; z: number } {
  // Échelle plus grande pour mieux voir le détail de la parcelle
  const scale = 50;
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng) - 0.5) * scale;
  const z = ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat) - 0.5) * scale;
  return { x, z };
}

/**
 * Crée le terrain 3D pour une parcelle unique
 */
private creerTerrain3dParcelle(points: Point3D[], bounds: any, parcelle: Parcelle): void {
  if (!this.scene3d) return;

  this.terrainGroup = new THREE.Group();
   // Stocker les points pour le raycaster
  this.terrainGroup.userData = { points3d: points };

  this.scene3d.add(this.terrainGroup);

  // Créer une grille pour le terrain
  const resolution = 40;
  const stepX = 50 / resolution;
  const stepZ = 50 / resolution;

  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // Map des hauteurs pour interpolation rapide
  const heightMap = new Map<string, { height: number; ndvi: number }>();
  points.forEach(p => {
    const key = `${Math.round(p.x * 10)},${Math.round(p.z * 10)}`;
    heightMap.set(key, { height: p.y, ndvi: p.ndvi });
  });

  const getHeightAt = (x: number, z: number): { height: number; ndvi: number } => {
    let closestDist = Infinity;
    let closestHeight = 0;
    let closestNdvi = 0;

    for (const p of points) {
      const dx = p.x - x;
      const dz = p.z - z;
      const dist = dx * dx + dz * dz;
      if (dist < closestDist) {
        closestDist = dist;
        closestHeight = p.y;
        closestNdvi = p.ndvi;
      }
    }
    return { height: closestHeight, ndvi: closestNdvi };
  };

  // Générer les vertices
  for (let i = 0; i <= resolution; i++) {
    const z = -25 + i * stepZ;
    for (let j = 0; j <= resolution; j++) {
      const x = -25 + j * stepX;
      const { height, ndvi } = getHeightAt(x, z);

      vertices.push(x, height, z);

      const color = this.getNdviColor3D(ndvi);
      colors.push(color.r, color.g, color.b);

      if (i < resolution && j < resolution) {
        const a = i * (resolution + 1) + j;
        const b = i * (resolution + 1) + j + 1;
        const c = (i + 1) * (resolution + 1) + j;
        const d = (i + 1) * (resolution + 1) + j + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.6,
    metalness: 0.1,
    flatShading: false
  });

  const terrainMesh = new THREE.Mesh(geometry, material);
  terrainMesh.castShadow = true;
  terrainMesh.receiveShadow = true;
  this.terrainGroup.add(terrainMesh);

  this.scene3d.add(this.terrainGroup);

  // Ajouter le label de la parcelle
  this.ajouterLabelParcelle3d(parcelle, points);
}

/**
 * Ajoute un contour coloré autour de la parcelle
 */
private ajouterContourParcelle(coords: [number, number][], bounds: any, couleur: string): void {
  if (!this.scene3d) return;

  const points3d: THREE.Vector3[] = [];

  coords.forEach(([lng, lat]) => {
    const { x, z } = this.geoToWorldParcelle(lng, lat, bounds);
    points3d.push(new THREE.Vector3(x, 0.5, z));
  });

  // Fermer le contour
  if (points3d.length > 0) {
    points3d.push(points3d[0].clone());
  }

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points3d);
  const lineMaterial = new THREE.LineBasicMaterial({ color: couleur, linewidth: 2 });
  const contourLine = new THREE.Line(lineGeometry, lineMaterial);
  this.terrainGroup?.add(contourLine);

  // Ajouter des poteaux aux sommets
  const poleMaterial = new THREE.MeshStandardMaterial({ color: couleur });
  points3d.forEach(point => {
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.2, 1, 4);
    const pole = new THREE.Mesh(poleGeo, poleMaterial);
    pole.position.set(point.x, point.y + 0.5, point.z);
    this.terrainGroup?.add(pole);
  });
}

/**
 * Ajoute un label en 3D pour la parcelle
 */
private ajouterLabelParcelle3d(parcelle: Parcelle, points: Point3D[]): void {
  if (!this.scene3d || points.length === 0) return;

  // Calculer le centre de la parcelle
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerZ = points.reduce((sum, p) => sum + p.z, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length + 3;

  const div = document.createElement('div');
  div.innerHTML = `
    <div style="background:${parcelle.couleur || '#4CAF50'};border-radius:12px;padding:8px 16px;color:white;font-weight:bold;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.3);backdrop-filter:blur(4px);border:2px solid white;">
      <div style="font-size:14px;">🌾 ${parcelle.nom}</div>
      <div style="font-size:11px;opacity:0.9;">${parcelle.surface} ha | ${parcelle.culture || 'Sans culture'}</div>
      <div style="font-size:10px;margin-top:4px;">
        ⛰️ ${this.altitudeStats?.min || 0}m → ${this.altitudeStats?.max || 0}m (Δ${this.altitudeStats?.denivele || 0}m)
      </div>
    </div>
  `;

  const label = new CSS2DObject(div);
  label.position.set(centerX, centerY, centerZ);
  this.scene3d.add(label);
}

/**
 * Centre la caméra sur la parcelle
 */
private centrerCameraSurParcelle(points: Point3D[]): void {
  if (!this.camera3d || !this.controls3d || points.length === 0) return;

  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerZ = points.reduce((sum, p) => sum + p.z, 0) / points.length;
  const maxY = Math.max(...points.map(p => p.y));

  // Positionner la caméra pour bien voir la parcelle
  const distance = 30;
  this.camera3d.position.set(centerX + distance * 0.7, maxY + distance * 0.5, centerZ + distance);
  this.controls3d.target.set(centerX, maxY / 2, centerZ);
  this.controls3d.update();
}

/**
 * Retourne la couleur NDVI pour le terrain 3D
 */
private getNdviColor3D(ndvi: number): { r: number; g: number; b: number } {
  if (ndvi > 0.6) return { r: 34/255, g: 139/255, b: 34/255 };   // Vert foncé
  if (ndvi > 0.4) return { r: 154/255, g: 205/255, b: 50/255 };  // Vert clair
  if (ndvi > 0.2) return { r: 244/255, g: 164/255, b: 96/255 };   // Orange
  return { r: 139/255, g: 69/255, b: 19/255 };                     // Marron
}

}
