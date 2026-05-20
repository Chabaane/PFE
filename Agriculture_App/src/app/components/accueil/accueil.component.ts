// accueil.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface Feature {
  color?: any;
  icon: string;
  title: string;
  description: string;
  tag: string;
  accentColor: string;
}

interface AppModule {
  category: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  badge: string;
}

interface Testimonial {
  stars: number;
  text: string;
  name: string;
  role: string;
  location: string;
  initials: string;
  avatarClass: string;
}

interface StatItem {
  value: string;
  label: string;
  icon: string;
}

interface Product {
  category: string;
  name: string;
  price: string;
  unit: string;
  badge: string;
  badgeClass: string;
  emoji: string;
}

interface Language {
  code: string;
  label: string;
  flag: string;
  sample: string;
  dir: string;
  note: string;
}

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './accueil.component.html',
  styleUrls: ['./accueil.component.scss']
})
export class AccueilComponent implements OnInit, OnDestroy {

  // ── State ───────────────────────────────────────────────
  isNavScrolled = false;
  activeLanguage = 'FR';
  activeModuleIndex = 0;
  private scrollObserver?: IntersectionObserver;

  // ── Data ────────────────────────────────────────────────
  readonly stats: StatItem[] = [
    { value: '1 200+', label: 'Agriculteurs inscrits', icon: '👨‍🌾' },
    { value: '340+',   label: 'Fermes gérées',          icon: '🌾'  },
    { value: '24',     label: 'Gouvernorats couverts',   icon: '🗺️' },
    { value: '16',     label: 'Produits AgriShop',       icon: '🛒'  },
  ];

  readonly languages: Language[] = [
    {
      code: 'FR', label: 'Français', flag: '🇫🇷', dir: 'ltr',
      sample: 'Gérez vos exploitations agricoles avec précision et intelligence.',
      note: 'Langue principale · LTR'
    },
    {
      code: 'AR', label: 'العربية', flag: '🇹🇳', dir: 'rtl',
      sample: 'أدر مزارعك بدقة واحترافية مع AgriManager.',
      note: 'دعم كامل RTL من اليمين إلى اليسار'
    },
    {
      code: 'EN', label: 'English', flag: '🇬🇧', dir: 'ltr',
      sample: 'Manage your farms with precision and intelligence.',
      note: 'International · LTR'
    },
  ];

  readonly heroFeatures: Feature[] = [
    {
      icon: '🗺️',
      title: 'Cartographie Leaflet + 3D',
      description: 'Visualisez et gérez vos parcelles sur carte interactive avec mode Three.js 3D, visualisation NDVI et données météo locales en temps réel.',
      tag: 'Géospatial',
      accentColor: '#2d8c2d',
      color: 'green'
    },
    {
      icon: '🛰️',
      title: 'Analyse Satellite',
      description: 'Altimétrie, détection topographique des zones d\'accumulation d\'eau, risques d\'inondation et relief ombré par image satellite.',
      tag: 'Remote Sensing',
      accentColor: '#2563eb',
      color: 'blue'
    },
    {
      icon: '📊',
      title: 'Tableau de Bord Analytics',
      description: 'KPIs en temps réel, graphiques Chart.js pour la répartition des cultures par région, alertes climatiques et bilans de campagne.',
      tag: 'Analytics',
      accentColor: '#d97706',
      color: 'amber'
    },
    {
      icon: '🛒',
      title: 'Marketplace AgriShop',
      description: 'Catalogue complet d\'intrants agricoles, gestion du panier, système de commandes et avis clients intégrés dans la plateforme.',
      tag: 'E-Commerce',
      accentColor: '#059669',
      color: 'green'
    },
    {
      icon: '🔬',
      title: 'Diagnostic par Image',
      description: 'Identifiez maladies et pathogènes par photo. Recommandation automatique des produits disponibles sur AgriShop en moins de 5 secondes.',
      tag: 'IA Agricole',
      accentColor: '#7c3aed',
      color: 'purple'
    },
    {
      icon: '🌐',
      title: 'Multilinguisme FR/AR/EN',
      description: 'Basculez entre français, arabe (RTL automatique) et anglais. Traduction via dictionnaire agricole intégré et MyMemory API.',
      tag: 'i18n',
      accentColor: '#0891b2',
      color: 'teal'
    },
  ];

  readonly appModules: AppModule[] = [
    {
      category: '🗺️ Cartographie',
      icon: '🗺️',
      title: 'Gestion Géographique des Parcelles',
      description: 'Carte interactive Leaflet avec mode 3D Three.js. Visualisez l\'indice de végétation NDVI, suivez les données météo locales et dessinez vos parcelles directement sur la carte.',
      features: [
        'Carte Leaflet interactive + dessin de polygones',
        'Mode 3D immersif avec Three.js',
        'Visualisation NDVI (indice de végétation)',
        'Données météo géolocalisées en temps réel',
        'Cartes de chaleur (parasites / qualité du sol)',
        'Export et synchronisation hors-ligne',
      ],
      badge: 'Leaflet + Three.js'
    },
    {
      category: '🛰️ Satellite',
      icon: '🛰️',
      title: 'Analyse Satellite Avancée',
      description: 'Interface d\'analyse par image satellite : altimétrie, détection topographique des zones à risque d\'inondation et relief ombré pour une gestion précise du terrain.',
      features: [
        'Analyse altimétrique du terrain',
        'Détection zones d\'accumulation d\'eau',
        'Cartographie des risques d\'inondation',
        'Relief ombré (hillshading)',
        'Analyse agroclimatique prédictive',
        'Suivi phénologique des cultures',
      ],
      badge: 'Remote Sensing'
    },
    {
      category: '🏡 Fermes',
      icon: '🏡',
      title: 'Création & Gestion des Fermes',
      description: 'Dessinez vos fermes directement sur la carte, assignez des agriculteurs, rattachez des parcelles et consultez les statistiques de surface, pente et exposition.',
      features: [
        'Dessin de polygones sur plan cartographique',
        'Assignation d\'agriculteurs aux fermes',
        'Rattachement dynamique de parcelles',
        'Statistiques de surface et pente',
        'Analyse de l\'exposition du terrain',
        'Filtrage par gouvernorat et agriculteur',
      ],
      badge: 'Gestion Foncière'
    },
    {
      category: '📊 Analytique',
      icon: '📊',
      title: 'Centre de Pilotage Analytique',
      description: 'Tableau de bord central avec visualisations Chart.js, répartition des cultures, suivi des unités de froid/chaleur, stades phénologiques et alertes climatiques.',
      features: [
        'Graphiques Chart.js multi-dimensions',
        'Répartition cultures par région & variété',
        'Calcul unités de froid / chaleur',
        'Suivi stades phénologiques',
        'Alertes climatiques configurables',
        'Rapports exportables (CSV / PDF)',
      ],
      badge: 'Chart.js'
    },
    {
      category: '🛒 Commerce',
      icon: '🛒',
      title: 'Marketplace AgriShop',
      description: 'Plateforme e-commerce intégrée : catalogue d\'intrants agricoles, panier, commandes, avis clients, diagnostic de maladies par photo et recommandation automatique.',
      features: [
        'Catalogue fongicides, insecticides, engrais',
        'Gestion du panier & commandes',
        'Avis et notations clients',
        'Diagnostic maladie par photo (IA)',
        'Scanner de feuilles interactif',
        'Livraison gratuite dès 100 TND',
      ],
      badge: 'E-Commerce'
    },
    {
      category: '🛠️ Infrastructure',
      icon: '🛠️',
      title: 'Infrastructure & Utilitaires',
      description: 'Architecture Angular standalone avec sidebar rétractable, mode hors-ligne + synchronisation, assistant virtuel, météo temps réel et multilinguisme complet.',
      features: [
        'Layout sidebar rétractable',
        'Mode hors-ligne + synchronisation serveur',
        'Assistant virtuel chat flottant',
        'Météo temps réel par point GPS',
        'Gestion authentification & rôles',
        'Multilinguisme FR / AR (RTL) / EN',
      ],
      badge: 'Angular Standalone'
    },
  ];

  readonly products: Product[] = [
    { category: 'Fongicide',   name: 'Score 250 EC',    price: '45,90', unit: 'L',  badge: 'En stock',   badgeClass: 'success', emoji: '🍄' },
    { category: 'Insecticide', name: 'Karate Zeon',     price: '89,00', unit: 'L',  badge: 'Promo -15%', badgeClass: 'promo',   emoji: '🪲' },
    { category: 'Engrais',     name: 'NPK 20-20-20',   price: '32,50', unit: 'Kg', badge: 'En stock',   badgeClass: 'success', emoji: '🌿' },
    { category: 'Herbicide',   name: 'Roundup 360',    price: '28,00', unit: 'L',  badge: 'En stock',   badgeClass: 'success', emoji: '🌾' },
    { category: 'Fongicide',   name: 'Topsin M 70 WP', price: '38,00', unit: 'Kg', badge: 'Nouveau',    badgeClass: 'new',     emoji: '🍄' },
    { category: 'Insecticide', name: 'Confidor 200 SL',price: '95,00', unit: 'L',  badge: 'En stock',   badgeClass: 'success', emoji: '🪲' },
  ];

  readonly testimonials: Testimonial[] = [
    {
      stars: 5,
      text: 'AgriManager a révolutionné ma façon de gérer mes 3 fermes. La carte interactive et le mode 3D sont impressionnants. La commande d\'intrants via AgriShop m\'économise 2 jours de déplacement par mois.',
      name: 'Karim Tlili',
      role: 'Agriculteur polyvalent',
      location: 'Sfax',
      initials: 'KT',
      avatarClass: 'avatar-green'
    },
    {
      stars: 5,
      text: 'L\'interface en arabe est parfaite, tout s\'affiche de droite à gauche. Le diagnostic maladie par photo m\'a permis d\'identifier une attaque fongique en 30 secondes et de commander le bon fongicide.',
      name: 'Rania Mansouri',
      role: 'Agricultrice & Ingénieure agronome',
      location: 'Nabeul',
      initials: 'RM',
      avatarClass: 'avatar-teal'
    },
    {
      stars: 5,
      text: 'Le tableau de bord analytique nous donne enfin une vision globale sur toutes nos coopératives. Les alertes climatiques et le suivi phénologique ont réduit nos pertes de récolte de 30% cette saison.',
      name: 'Ali Brahmi',
      role: 'Directeur Coopérative Agricole',
      location: 'Béja',
      initials: 'AB',
      avatarClass: 'avatar-amber'
    },
  ];

  // ── Lifecycle ───────────────────────────────────────────
  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isNavScrolled = window.scrollY > 60;
  }

  ngOnInit(): void {
    this.initScrollAnimations();
    this.initParallaxEffect();
  }

  ngOnDestroy(): void {
    this.scrollObserver?.disconnect();
  }

  // ── Private ─────────────────────────────────────────────
  private initScrollAnimations(): void {
    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            this.scrollObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => {
        this.scrollObserver?.observe(el);
      });
    }, 150);
  }

  private initParallaxEffect(): void {
    // Parallax effect for hero video background
    window.addEventListener('scroll', () => {
      const heroSection = document.querySelector('.hero');
      if (heroSection) {
        const scrollY = window.scrollY;
        const videoContainer = heroSection.querySelector('.hero-video-container') as HTMLElement;
        if (videoContainer) {
          videoContainer.style.transform = `translateY(${scrollY * 0.5}px)`;
        }
      }
    });
  }

  // ── Public ──────────────────────────────────────────────
  setLanguage(code: string): void {
    this.activeLanguage = code;
    // Trigger language change event or service call here
    console.log(`Language changed to: ${code}`);
  }

  setModuleIndex(index: number): void {
    this.activeModuleIndex = index;
    // Add animation trigger for module change
    const modulePanel = document.querySelector('.module-panel');
    if (modulePanel) {
      modulePanel.classList.add('fade-out');
      setTimeout(() => {
        modulePanel.classList.remove('fade-out');
      }, 300);
    }
  }

  getStarArray(n: number): number[] {
    return Array(n).fill(0);
  }

  scrollTo(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ── Animation Helpers ───────────────────────────────────
  onProductHover(event: MouseEvent): void {
    const card = event.currentTarget as HTMLElement;
    card.style.transform = 'translateY(-8px) scale(1.02)';
  }

  onProductLeave(event: MouseEvent): void {
    const card = event.currentTarget as HTMLElement;
    card.style.transform = 'translateY(0) scale(1)';
  }

  addToCart(productName: string): void {
    console.log(`Added to cart: ${productName}`);
    // Trigger add to cart animation
    const button = event?.target as HTMLElement;
    if (button) {
      button.textContent = '✓ Ajouté!';
      setTimeout(() => {
        button.textContent = 'Ajouter au panier';
      }, 2000);
    }
  }
}
