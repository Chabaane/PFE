// services/chatbot.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../environments/environment';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  action?: string;
  data?: any;
  isLoading?: boolean;
  /** Type de carte riche à afficher */
  cardType?: 'parcelle-detail' | 'meteo' | 'stats' | 'alerte' | 'conseil' | 'liste';
}

export interface ChatRequest {
  message: string;
  agriculteurId: number;
  historique: Array<{ role: string; message: string }>;
}

export interface ChatResponse {
  reponse: string;
  action: string;
  donnees: any;
}

export interface QuickSuggestion {
  label: string;
  icon: string;
  text: string;
  category: 'stats' | 'meteo' | 'parcelle' | 'conseil' | 'altitude' | 'agroclimat';
}

// ─── Service ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChatbotService {

  private readonly apiUrl = `${environment.apiUrl}/api/Chatbot`;
  private readonly STORAGE_KEY = 'agribot_messages_v2';
  private readonly MAX_HISTORY_STORED = 50;

  // ── Observables publics ──────────────────────────────────────────────────
  private messagesSubject   = new BehaviorSubject<ChatMessage[]>([]);
  private isLoadingSubject  = new BehaviorSubject<boolean>(false);
  private isTypingSubject   = new BehaviorSubject<boolean>(false);
  private unreadCountSubject = new BehaviorSubject<number>(0);

  messages$    = this.messagesSubject.asObservable();
  isLoading$   = this.isLoadingSubject.asObservable();
  isTyping$    = this.isTypingSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  // ── Suggestions rapides ──────────────────────────────────────────────────
  readonly suggestions: QuickSuggestion[] = [
    { icon: '📊', label: 'Mes parcelles',    text: 'Combien de parcelles ai-je ?',      category: 'stats'     },
    { icon: '📐', label: 'Surface totale',   text: 'Quelle est ma surface totale ?',     category: 'stats'     },
    { icon: '🌤️', label: 'Météo',            text: 'Météo actuelle',                     category: 'meteo'     },
    { icon: '⚠️', label: 'Alertes',          text: 'Y a-t-il des alertes météo ?',       category: 'meteo'     },
    { icon: '🌱', label: 'Conseils blé',     text: 'Conseils pour le blé',               category: 'conseil'   },
    { icon: '🫒', label: 'Conseils olive',   text: 'Conseils pour les oliviers',         category: 'conseil'   },
    { icon: '⛰️', label: 'Altitude',         text: 'Altitude maximale de mes parcelles', category: 'altitude'  },
    { icon: '🌡️', label: 'Unités de froid',  text: 'Diagnostic unités de froid',         category: 'agroclimat'},
    { icon: '➕', label: 'Créer parcelle',   text: 'Comment créer une nouvelle parcelle ?', category: 'parcelle'},
    { icon: '📋', label: 'Mes cultures',     text: 'Quelles cultures ai-je ?',           category: 'stats'     },
  ];

  constructor(private http: HttpClient) {
    this.chargerHistoriqueLocal();
  }

  // ── Méthode principale : envoyer un message ──────────────────────────────

  async envoyerMessage(message: string, agriculteurId: number, isOpen: boolean = true): Promise<void> {
    if (!message.trim()) return;

    const userMsg = this.creerMessage('user', message);
    this.ajouterMessage(userMsg);
    this.isLoadingSubject.next(true);
    this.isTypingSubject.next(true);

    // Message bot temporaire (typing)
    const loadingMsg = this.creerMessage('bot', '', true);
    this.ajouterMessage(loadingMsg);

    // Incrémenter le badge non-lu si le chat est fermé
    if (!isOpen) {
      this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
    }

    try {
      // Préparer l'historique (max 10 derniers échanges)
      const historique = this.messagesSubject.value
        .filter(m => !m.isLoading && m.role !== 'system')
        .slice(-10)
        .map(m => ({ role: m.role, message: m.content }));

      const request: ChatRequest = { message, agriculteurId, historique };

      // Délai minimal pour l'animation typing (UX)
      const [response] = await Promise.all([
        this.http.post<ChatResponse>(`${this.apiUrl}/chat`, request).toPromise(),
        this.delai(600)
      ]);

      const botMsg = this.creerMessage(
        'bot',
        response?.reponse || "Je n'ai pas compris votre demande. Tapez **aide** pour voir les commandes.",
        false,
        response?.action,
        response?.donnees
      );

      this.remplacerMessageLoading(botMsg);
      this.sauvegarderHistoriqueLocal();

    } catch (error: any) {
      const errorMsg = this.creerMessage(
        'bot',
        `❌ **Connexion impossible** — Je bascule en mode hors ligne.\n\n${this.reponseHorsLigne(message)}`
      );
      this.remplacerMessageLoading(errorMsg);
    } finally {
      this.isLoadingSubject.next(false);
      this.isTypingSubject.next(false);
    }
  }

  // ── Mode hors ligne ──────────────────────────────────────────────────────

  envoyerMessageHorsLigne(message: string): void {
    const userMsg  = this.creerMessage('user', message);
    const botMsg   = this.creerMessage('bot', this.reponseHorsLigne(message));
    this.ajouterMessage(userMsg);
    this.ajouterMessage(botMsg);
    this.sauvegarderHistoriqueLocal();
  }

  private reponseHorsLigne(message: string): string {
    const msg = message.toLowerCase();

    if (msg.match(/bonjour|salut|hello|bonsoir/))
      return '👋 **Bonjour !** Je suis AgriBot. Je suis en mode **hors ligne** actuellement. Reconnectez-vous pour profiter de toutes mes fonctionnalités !';

    if (msg.match(/aide|help|commande/))
      return `📋 **Commandes disponibles (hors ligne)**\n\n• Conseils agricoles de base\n• Informations générales\n\n📡 **En ligne :** accès aux données de vos parcelles, météo, statistiques et bien plus !`;

    if (msg.match(/conseil|astuce/))
      return `💡 **Conseils généraux**\n\n• 🌅 Arrosez tôt le matin ou en soirée\n• 🔍 Inspectez vos cultures 2× par semaine\n• 🔄 Pratiquez la rotation des cultures\n• 🌿 Utilisez du paillage contre l'évaporation\n• 📓 Tenez un cahier de suivi des pratiques`;

    if (msg.match(/météo|temps|pluie|température/))
      return `⚠️ **Mode hors ligne** — Les données météo nécessitent une connexion internet. Reconnectez-vous pour accéder aux prévisions en temps réel.`;

    if (msg.match(/parcelle|surface|culture/))
      return `⚠️ **Mode hors ligne** — L'accès à vos données de parcelles nécessite une connexion. Reconnectez-vous pour consulter vos informations.`;

    return `📡 Je suis en **mode hors ligne**. Certaines fonctionnalités sont limitées. Reconnectez-vous pour accéder à l'ensemble de mes capacités.\n\nTapez **aide** pour voir ce que je peux faire hors ligne.`;
  }

  // ── Gestion de l'historique ───────────────────────────────────────────────

  effacerHistorique(): void {
    const welcome = this.creerMessage('bot', this.messageAccueil());
    this.messagesSubject.next([welcome]);
    this.unreadCountSubject.next(0);
    this.sauvegarderHistoriqueLocal();
  }

  reinitialiserNonLus(): void {
    this.unreadCountSubject.next(0);
  }

  // ── Méthodes privées ─────────────────────────────────────────────────────

  private creerMessage(
    role: 'user' | 'bot' | 'system',
    content: string,
    isLoading = false,
    action?: string,
    data?: any
  ): ChatMessage {
    return {
      id:        `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      timestamp: new Date(),
      isLoading,
      action,
      data,
    };
  }

  private ajouterMessage(message: ChatMessage): void {
    this.messagesSubject.next([...this.messagesSubject.value, message]);
  }

  private remplacerMessageLoading(message: ChatMessage): void {
    const sans = this.messagesSubject.value.filter(m => !m.isLoading);
    this.messagesSubject.next([...sans, message]);
  }

  private delai(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  private sauvegarderHistoriqueLocal(): void {
    try {
      const toSave = this.messagesSubject.value
        .filter(m => !m.isLoading)
        .slice(-this.MAX_HISTORY_STORED)
        .map(m => ({ ...m, timestamp: m.timestamp.toISOString() }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* quota exceeded ou SSR */ }
  }

  private chargerHistoriqueLocal(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        if (parsed.length > 0) {
          this.messagesSubject.next(parsed);
          return;
        }
      }
    } catch { /* JSON corrompu */ }

    // Aucun historique → message de bienvenue
    this.messagesSubject.next([this.creerMessage('bot', this.messageAccueil())]);
  }

  private messageAccueil(): string {
    return `🌾 **Bienvenue sur AgriManager !**

Je suis **AgriBot**, votre assistant agricole intelligent propulsé par l'IA.

**Ce que je peux faire pour vous :**
• 📊 Statistiques de vos parcelles (nombre, surface, cultures)
• 🌤️ Météo et alertes climatiques
• ⛰️ Analyse d'altitude et de pente
• 🌡️ Diagnostic agroclimatique (unités de froid/chaleur)
• 💡 Conseils personnalisés pour chaque culture
• 📋 Gestion de vos parcelles

**Exemples :** *"Combien de parcelles ?"* · *"Météo pour ma parcelle olive"* · *"Conseils pour le blé"*

Tapez **aide** pour la liste complète des commandes. 🌱`;
  }
}
