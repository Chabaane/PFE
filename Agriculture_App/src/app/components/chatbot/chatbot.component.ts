// components/chatbot/chatbot.component.ts
import {
  Component, OnInit, OnDestroy, AfterViewChecked,
  Input, ElementRef, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule }      from '@angular/common';
import { FormsModule }       from '@angular/forms';
import { Subscription }      from 'rxjs';
import { ChatbotService, ChatMessage, QuickSuggestion } from '../../services/chatbot.service';

// ─── Component ──────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<!-- ══ BOUTON FLOTTANT (chat fermé) ══════════════════════════════════════════ -->
<div class="chat-fab" *ngIf="!isOpen" (click)="ouvrirChat()">
  <div class="fab-icon">🤖</div>
  <div class="fab-pulse"></div>
  <span class="fab-badge" *ngIf="unreadCount > 0">{{unreadCount > 9 ? '9+' : unreadCount}}</span>
  <div class="fab-tooltip">AgriBot — Assistant IA</div>
</div>

<!-- ══ FENÊTRE DU CHAT ════════════════════════════════════════════════════════ -->
<div class="chat-window" [class.open]="isOpen" [class.maximized]="isMaximized">

  <!-- ── HEADER ────────────────────────────────────────────────────────────── -->
  <div class="chat-header">
    <div class="header-identity">
      <div class="bot-avatar">
        <span class="bot-avatar-icon">🤖</span>
        <span class="bot-status-dot" [class.online]="isOnline"></span>
      </div>
      <div class="header-info">
        <span class="bot-name">AgriBot</span>
        <span class="bot-subtitle" [class.typing]="isTyping">
          <span *ngIf="!isTyping">{{ isOnline ? '● En ligne · AgriManager IA' : '○ Mode hors ligne' }}</span>
          <span *ngIf="isTyping" class="typing-text">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            En train d'écrire...
          </span>
        </span>
      </div>
    </div>
    <div class="header-actions">
      <button class="hbtn" title="Nouvelle conversation" (click)="demanderEffacer()">
        🗑️
      </button>
      <button class="hbtn" title="Agrandir" (click)="toggleMaximize()">
        {{ isMaximized ? '⬜' : '⤢' }}
      </button>
      <button class="hbtn hbtn-close" title="Fermer" (click)="fermerChat()">
        ✕
      </button>
    </div>
  </div>

  <!-- ── BANNIÈRE HORS LIGNE ────────────────────────────────────────────────── -->
  <div class="offline-banner" *ngIf="!isOnline">
    📡 Mode hors ligne — Certaines fonctionnalités sont limitées
  </div>

  <!-- ── CORPS : MESSAGES ──────────────────────────────────────────────────── -->
  <div class="chat-body" #scrollContainer>

    <div *ngFor="let msg of messages; trackBy: trackById"
         class="msg-row"
         [class.user-row]="msg.role === 'user'"
         [class.bot-row]="msg.role === 'bot'">

      <!-- Avatar bot -->
      <div class="msg-avatar bot-av" *ngIf="msg.role === 'bot'">🤖</div>

      <div class="msg-bubble-wrap" [class.user-wrap]="msg.role === 'user'">

        <!-- Bulle de message -->
        <div class="msg-bubble"
             [class.user-bubble]="msg.role === 'user'"
             [class.bot-bubble]="msg.role === 'bot'"
             [class.loading-bubble]="msg.isLoading">

          <!-- Indicateur typing -->
          <div class="typing-indicator" *ngIf="msg.isLoading">
            <span></span><span></span><span></span>
          </div>

          <!-- Contenu texte -->
          <div class="msg-text" *ngIf="!msg.isLoading"
               [innerHTML]="formatMessage(msg.content)">
          </div>

          <!-- ── Carte riche : Statistiques ─────────────────────────────────── -->
          <div class="rich-card stats-card"
               *ngIf="!msg.isLoading && msg.action === 'compter_parcelles' && msg.data">
            <div class="rich-card-header">📊 Vos Parcelles</div>
            <div class="stat-value">{{msg.data.nombre}}</div>
            <div class="stat-label">parcelle(s) enregistrée(s)</div>
          </div>

          <!-- ── Carte riche : Surface ──────────────────────────────────────── -->
          <div class="rich-card surface-card"
               *ngIf="!msg.isLoading && msg.action === 'surface_totale' && msg.data">
            <div class="rich-card-header">📐 Surface Totale</div>
            <div class="stat-value">{{msg.data.surface | number:'1.2-2'}}</div>
            <div class="stat-label">hectares cultivés</div>
          </div>

          <!-- ── Carte riche : Météo ────────────────────────────────────────── -->
          <div class="rich-card meteo-card"
               *ngIf="!msg.isLoading && msg.action === 'meteo' && msg.data">
            <div class="rich-card-header">🌤️ Météo — {{msg.data.parcelle}}</div>
            <div class="meteo-main">
              <span class="meteo-temp">{{msg.data.temperature}}°C</span>
              <span class="meteo-condition">{{msg.data.condition}}</span>
            </div>
            <div class="meteo-details">
              <span>💧 {{msg.data.humidite}}%</span>
              <span>💨 {{msg.data.vent}} km/h</span>
              <span *ngIf="msg.data.precipitation > 0">🌧️ {{msg.data.precipitation}} mm</span>
            </div>
            <div class="meteo-conseil">{{msg.data.conseil}}</div>
          </div>

          <!-- ── Carte riche : Détail Parcelle ─────────────────────────────── -->
          <div class="rich-card parcelle-card"
               *ngIf="!msg.isLoading && msg.action === 'detail_parcelle' && msg.data?.Nom">
            <div class="rich-card-header">🌱 {{msg.data.Nom}}</div>
            <div class="parcelle-details">
              <div class="pd-row"><span>📐 Surface</span><strong>{{msg.data.Surface}}</strong></div>
              <div class="pd-row" *ngIf="msg.data.Culture"><span>🌾 Culture</span><strong>{{msg.data.Culture}}</strong></div>
              <div class="pd-row" *ngIf="msg.data.Gouvernorat"><span>📍 Gouvernorat</span><strong>{{msg.data.Gouvernorat}}</strong></div>
              <div class="pd-row" *ngIf="msg.data.Altitude"><span>⛰️ Altitude</span><strong>{{msg.data.Altitude}}</strong></div>
              <div class="pd-row" *ngIf="msg.data.Pente"><span>📉 Pente</span><strong>{{msg.data.Pente}}</strong></div>
            </div>
            <div class="card-actions">
              <button class="card-btn" (click)="ouvrirFormulaireParcelle()">✏️ Modifier</button>
              <button class="card-btn card-btn-secondary" (click)="voirSurCarte(msg.data)">🗺️ Sur la carte</button>
            </div>
          </div>

          <!-- ── Carte riche : Alertes Météo ───────────────────────────────── -->
          <div class="rich-card alerte-card"
               *ngIf="!msg.isLoading && msg.action === 'alerte_meteo' && msg.data?.alertes?.length > 0">
            <div class="rich-card-header">⚠️ Alertes Actives ({{msg.data.alertes.length}})</div>
            <div *ngFor="let alerte of msg.data.alertes" class="alerte-item"
                 [class.canicule]="alerte.type === 'canicule'"
                 [class.gel]="alerte.type === 'gel'"
                 [class.vent]="alerte.type === 'vent'">
              {{alerte.message}}
            </div>
          </div>

          <!-- ── Carte riche : Cultures ─────────────────────────────────────── -->
          <div class="rich-card cultures-card"
               *ngIf="!msg.isLoading && msg.action === 'liste_cultures' && msg.data?.cultures?.length > 0">
            <div class="rich-card-header">🌱 Vos Cultures</div>
            <div class="cultures-chips">
              <span *ngFor="let c of msg.data.cultures" class="culture-chip">{{c}}</span>
            </div>
          </div>

          <!-- ── Actions boutons (créer / modifier) ────────────────────────── -->
          <div class="msg-actions" *ngIf="!msg.isLoading && msg.action === 'creer_parcelle'">
            <button class="action-btn primary" (click)="ouvrirFormulaireParcelle()">
              ➕ Ouvrir le formulaire
            </button>
          </div>
          <div class="msg-actions" *ngIf="!msg.isLoading && msg.action === 'modifier_parcelle' && msg.data">
            <button class="action-btn primary" (click)="modifierParcelle(msg.data)">
              ✏️ Modifier la parcelle
            </button>
          </div>

        </div>

        <!-- Horodatage -->
        <span class="msg-time">{{msg.timestamp | date:'HH:mm'}}</span>
      </div>

      <!-- Avatar utilisateur -->
      <div class="msg-avatar user-av" *ngIf="msg.role === 'user'">👤</div>
    </div>

    <!-- Ancre scroll -->
    <div #scrollAnchor></div>
  </div>

  <!-- ── SUGGESTIONS RAPIDES ───────────────────────────────────────────────── -->
  <div class="suggestions-bar" *ngIf="showSuggestions && !isLoading">
    <div class="suggestions-scroll">
      <button *ngFor="let s of visibleSuggestions"
              class="sug-chip"
              [class.sug-stats]="s.category === 'stats'"
              [class.sug-meteo]="s.category === 'meteo'"
              [class.sug-conseil]="s.category === 'conseil'"
              [class.sug-altitude]="s.category === 'altitude'"
              [class.sug-agroclimat]="s.category === 'agroclimat'"
              (click)="envoyerSuggestion(s)">
        {{s.icon}} {{s.label}}
      </button>
    </div>
    <button class="sug-toggle" (click)="toggleSuggestions()" title="Afficher plus">
      {{suggestionsFull ? '▲' : '▼'}}
    </button>
  </div>

  <!-- ── ZONE DE SAISIE ────────────────────────────────────────────────────── -->
  <div class="chat-input-area">
    <div class="input-wrapper" [class.focused]="inputFocused">
      <textarea
        #inputRef
        [(ngModel)]="messageCourant"
        (keydown)="onKeydown($event)"
        (focus)="inputFocused = true"
        (blur)="inputFocused = false"
        (input)="autoResize($event)"
        placeholder="Écrivez votre message..."
        rows="1"
        [disabled]="isLoading"
        maxlength="500"
      ></textarea>
      <div class="input-controls">
        <span class="char-count" *ngIf="messageCourant.length > 400">
          {{500 - messageCourant.length}}
        </span>
        <button class="sug-toggle-btn" title="Suggestions" (click)="showSuggestions = !showSuggestions">
          💡
        </button>
      </div>
    </div>
    <button class="send-btn"
            [disabled]="!messageCourant.trim() || isLoading"
            (click)="envoyerMessage()">
      <span *ngIf="!isLoading">➤</span>
      <span *ngIf="isLoading" class="spin">⌛</span>
    </button>
  </div>

  <!-- Powered by -->
  <div class="powered-by">Propulsé par AgriManager Intelligence</div>
</div>
  `,
  styles: [`
  /* ════════════════════════════════════════════════════════════
     Variables
  ════════════════════════════════════════════════════════════ */
  :host {
    --green:      #16a34a;
    --green-dark: #14532d;
    --green-light:#dcfce7;
    --blue:       #2563eb;
    --blue-light: #dbeafe;
    --amber:      #d97706;
    --red:        #dc2626;
    --red-light:  #fee2e2;
    --bg:         #f8fafc;
    --card:       #ffffff;
    --border:     #e2e8f0;
    --text:       #1e293b;
    --muted:      #64748b;
    --radius:     16px;
    --shadow:     0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  }

  /* ════════════════════════════════════════════════════════════
     BOUTON FLOTTANT
  ════════════════════════════════════════════════════════════ */
  .chat-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 58px;
    height: 58px;
    background: linear-gradient(135deg, var(--green), var(--green-dark));
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9998;
    box-shadow: 0 4px 20px rgba(22,163,74,0.45);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .chat-fab:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(22,163,74,0.6); }
  .chat-fab:hover .fab-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
  .fab-icon { font-size: 1.6rem; }
  .fab-pulse {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid rgba(22,163,74,0.4);
    animation: pulse-ring 2s ease-out infinite;
  }
  .fab-badge {
    position: absolute;
    top: -4px; right: -4px;
    background: var(--red);
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 2px solid white;
  }
  .fab-tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%) translateY(6px);
    background: #1e293b;
    color: white;
    font-size: 0.72rem;
    padding: 5px 10px;
    border-radius: 8px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: all 0.2s;
  }
  @keyframes pulse-ring {
    0%   { transform: scale(1);   opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  /* ════════════════════════════════════════════════════════════
     FENÊTRE DE CHAT
  ════════════════════════════════════════════════════════════ */
  .chat-window {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 400px;
    height: 650px;
    background: var(--card);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    z-index: 9999;
    overflow: hidden;
    transform: scale(0.85) translateY(40px);
    opacity: 0;
    pointer-events: none;
    transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .chat-window.open {
    transform: scale(1) translateY(0);
    opacity: 1;
    pointer-events: all;
  }
  .chat-window.maximized {
    width: min(700px, 96vw);
    height: min(88vh, 820px);
    bottom: 2vh;
    right: 2vw;
  }
  @media (max-width: 480px) {
    .chat-window {
      width: calc(100vw - 16px);
      height: calc(100dvh - 16px);
      bottom: 8px;
      right: 8px;
      border-radius: 12px;
    }
    .chat-fab { bottom: 16px; right: 16px; }
  }

  /* ════════════════════════════════════════════════════════════
     HEADER
  ════════════════════════════════════════════════════════════ */
  .chat-header {
    background: linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%);
    padding: 12px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    user-select: none;
  }
  .header-identity { display: flex; align-items: center; gap: 10px; }
  .bot-avatar {
    width: 42px; height: 42px;
    background: rgba(255,255,255,0.15);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem;
    position: relative;
    border: 2px solid rgba(255,255,255,0.3);
  }
  .bot-status-dot {
    position: absolute;
    bottom: 1px; right: 1px;
    width: 10px; height: 10px;
    border-radius: 50%;
    background: #94a3b8;
    border: 2px solid white;
  }
  .bot-status-dot.online { background: #4ade80; }
  .bot-name  { color: white; font-weight: 700; font-size: 0.98rem; display: block; }
  .bot-subtitle {
    color: rgba(255,255,255,0.75);
    font-size: 0.7rem;
    display: block;
    margin-top: 1px;
  }
  .bot-subtitle.typing { color: #86efac; }
  .typing-text { display: flex; align-items: center; gap: 4px; }
  .typing-text .dot {
    width: 4px; height: 4px;
    background: #86efac;
    border-radius: 50%;
    animation: dot-bounce 1.2s infinite;
  }
  .typing-text .dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-text .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot-bounce {
    0%, 80%, 100% { transform: translateY(0); }
    40%           { transform: translateY(-4px); }
  }
  .header-actions { display: flex; gap: 4px; }
  .hbtn {
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2);
    color: white;
    width: 30px; height: 30px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .hbtn:hover    { background: rgba(255,255,255,0.25); }
  .hbtn-close:hover { background: rgba(220,38,38,0.6); }

  /* ════════════════════════════════════════════════════════════
     BANNIÈRE HORS LIGNE
  ════════════════════════════════════════════════════════════ */
  .offline-banner {
    background: #fef3c7;
    border-bottom: 1px solid #fde68a;
    color: #92400e;
    font-size: 0.75rem;
    text-align: center;
    padding: 5px 10px;
    flex-shrink: 0;
  }

  /* ════════════════════════════════════════════════════════════
     CORPS — MESSAGES
  ════════════════════════════════════════════════════════════ */
  .chat-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #f0f4f8;
    scroll-behavior: smooth;
  }
  .chat-body::-webkit-scrollbar        { width: 4px; }
  .chat-body::-webkit-scrollbar-thumb  { background: #cbd5e1; border-radius: 2px; }

  /* ── Rangée de message ─────────────────────────────────────────────────── */
  .msg-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    animation: msg-in 0.25s ease;
  }
  .user-row { flex-direction: row-reverse; }
  @keyframes msg-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Avatar ───────────────────────────────────────────────────────────────── */
  .msg-avatar {
    width: 30px; height: 30px;
    border-radius: 50%;
    font-size: 1rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .bot-av  { background: #e0f2fe; }
  .user-av { background: #dcfce7; }

  /* ── Bulle + horodatage ──────────────────────────────────────────────────── */
  .msg-bubble-wrap {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 78%;
  }
  .user-wrap { align-items: flex-end; }
  .msg-bubble {
    padding: 10px 13px;
    border-radius: 16px;
    font-size: 0.86rem;
    line-height: 1.5;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    word-break: break-word;
    position: relative;
  }
  .bot-bubble  {
    background: white;
    color: var(--text);
    border-bottom-left-radius: 4px;
  }
  .user-bubble {
    background: linear-gradient(135deg, var(--green), #15803d);
    color: white;
    border-bottom-right-radius: 4px;
  }
  .loading-bubble { padding: 12px 16px; }
  .msg-time {
    font-size: 0.65rem;
    color: var(--muted);
    padding: 0 4px;
  }

  /* ── Markdown dans les bulles ──────────────────────────────────────────── */
  .msg-text :global(strong) { font-weight: 700; }
  .msg-text :global(em)     { font-style: italic; }
  .msg-text :global(code)   {
    background: rgba(0,0,0,0.07);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.82em;
    font-family: monospace;
  }
  .msg-text :global(ul), .msg-text :global(ol) {
    margin: 4px 0 0 16px;
    padding: 0;
  }
  .msg-text :global(li) { margin-bottom: 2px; }
  .user-bubble .msg-text :global(code) { background: rgba(255,255,255,0.2); }

  /* ── Indicateur typing ──────────────────────────────────────────────────── */
  .typing-indicator {
    display: flex; gap: 5px; align-items: center; padding: 2px 0;
  }
  .typing-indicator span {
    width: 8px; height: 8px;
    background: #94a3b8;
    border-radius: 50%;
    animation: typing-bounce 1.3s ease-in-out infinite;
  }
  .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
  .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typing-bounce {
    0%,60%,100% { transform: translateY(0);  opacity: 0.4; }
    30%         { transform: translateY(-7px); opacity: 1; }
  }

  /* ════════════════════════════════════════════════════════════
     CARTES RICHES
  ════════════════════════════════════════════════════════════ */
  .rich-card {
    margin-top: 8px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
    font-size: 0.82rem;
  }
  .rich-card-header {
    padding: 7px 11px;
    font-weight: 700;
    font-size: 0.8rem;
    background: #f8fafc;
    border-bottom: 1px solid var(--border);
    color: var(--text);
  }

  /* Stat */
  .stats-card .stat-value, .surface-card .stat-value {
    font-size: 2rem;
    font-weight: 800;
    text-align: center;
    padding: 8px 0 2px;
    color: var(--green);
  }
  .stat-label {
    text-align: center;
    color: var(--muted);
    padding-bottom: 10px;
    font-size: 0.75rem;
  }
  .surface-card .stat-value { color: var(--blue); }

  /* Météo */
  .meteo-main {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 11px 4px;
  }
  .meteo-temp {
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--amber);
  }
  .meteo-condition { font-size: 0.85rem; color: var(--muted); }
  .meteo-details {
    display: flex;
    gap: 10px;
    padding: 0 11px 6px;
    font-size: 0.78rem;
    color: var(--muted);
  }
  .meteo-conseil {
    background: #f0fdf4;
    border-top: 1px solid var(--border);
    padding: 6px 11px;
    font-size: 0.78rem;
    color: #15803d;
  }

  /* Parcelle */
  .pd-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 11px;
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.8rem;
    color: var(--muted);
  }
  .pd-row strong { color: var(--text); }
  .card-actions {
    display: flex;
    gap: 6px;
    padding: 8px 11px;
  }
  .card-btn {
    flex: 1;
    padding: 5px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--green);
    color: white;
    transition: opacity 0.15s;
  }
  .card-btn:hover { opacity: 0.85; }
  .card-btn-secondary { background: var(--blue-light); color: var(--blue); }

  /* Alertes */
  .alerte-item {
    padding: 6px 11px;
    font-size: 0.8rem;
    border-bottom: 1px solid #fee2e2;
    color: #7f1d1d;
    background: #fef2f2;
  }
  .alerte-item.gel     { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }
  .alerte-item.canicule{ background: #fff7ed; color: #9a3412; border-color: #fed7aa; }
  .alerte-item.vent    { background: #f5f3ff; color: #4c1d95; border-color: #ddd6fe; }

  /* Cultures */
  .cultures-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 11px;
  }
  .culture-chip {
    background: #dcfce7;
    color: #14532d;
    border-radius: 20px;
    padding: 3px 10px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  /* ── Boutons action dans bulles ─────────────────────────────────────────── */
  .msg-actions { margin-top: 8px; }
  .action-btn {
    padding: 7px 14px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 0.78rem;
    font-weight: 600;
    background: var(--green);
    color: white;
    transition: opacity 0.15s;
    width: 100%;
  }
  .action-btn:hover { opacity: 0.85; }

  /* ════════════════════════════════════════════════════════════
     SUGGESTIONS
  ════════════════════════════════════════════════════════════ */
  .suggestions-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: white;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
    overflow: hidden;
  }
  .suggestions-scroll {
    display: flex;
    gap: 5px;
    overflow-x: auto;
    flex: 1;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .suggestions-scroll::-webkit-scrollbar { display: none; }
  .sug-chip {
    white-space: nowrap;
    padding: 4px 10px;
    border-radius: 20px;
    border: 1px solid var(--border);
    background: var(--bg);
    cursor: pointer;
    font-size: 0.73rem;
    color: var(--text);
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .sug-chip:hover    { transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
  .sug-stats         { border-color: #bfdbfe; background: #eff6ff; color: var(--blue); }
  .sug-meteo         { border-color: #fde68a; background: #fffbeb; color: #92400e; }
  .sug-conseil       { border-color: #bbf7d0; background: #f0fdf4; color: #14532d; }
  .sug-altitude      { border-color: #e9d5ff; background: #f5f3ff; color: #4c1d95; }
  .sug-agroclimat    { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
  .sug-toggle        {
    background: none; border: none; cursor: pointer;
    color: var(--muted); font-size: 0.75rem; padding: 2px 4px; flex-shrink: 0;
  }

  /* ════════════════════════════════════════════════════════════
     ZONE DE SAISIE
  ════════════════════════════════════════════════════════════ */
  .chat-input-area {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 10px 12px;
    background: white;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .input-wrapper {
    flex: 1;
    display: flex;
    align-items: flex-end;
    border: 1.5px solid var(--border);
    border-radius: 14px;
    background: var(--bg);
    padding: 6px 10px;
    transition: border-color 0.2s;
    gap: 4px;
  }
  .input-wrapper.focused { border-color: var(--green); background: white; }
  .input-wrapper textarea {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.88rem;
    font-family: inherit;
    resize: none;
    max-height: 120px;
    line-height: 1.4;
    color: var(--text);
    padding: 0;
  }
  .input-wrapper textarea:focus { outline: none; }
  .input-wrapper textarea::placeholder { color: #94a3b8; }
  .input-wrapper textarea:disabled { opacity: 0.5; }
  .input-controls { display: flex; align-items: center; gap: 4px; }
  .char-count    { font-size: 0.65rem; color: #f97316; }
  .sug-toggle-btn {
    background: none; border: none; cursor: pointer;
    font-size: 1rem; color: var(--muted); padding: 0;
    transition: transform 0.15s;
  }
  .sug-toggle-btn:hover { transform: scale(1.2); }

  .send-btn {
    width: 40px; height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--green), var(--green-dark));
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1rem;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(22,163,74,0.35);
  }
  .send-btn:hover:not(:disabled) {
    transform: scale(1.06);
    box-shadow: 0 4px 14px rgba(22,163,74,0.5);
  }
  .send-btn:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
  .spin { animation: spin 0.8s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ════════════════════════════════════════════════════════════
     FOOTER
  ════════════════════════════════════════════════════════════ */
  .powered-by {
    text-align: center;
    font-size: 0.62rem;
    color: #94a3b8;
    padding: 3px 0 5px;
    background: white;
    border-top: 1px solid #f1f5f9;
    flex-shrink: 0;
    letter-spacing: 0.02em;
  }
  `]
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {

  @Input() agriculteurId: number = 0;

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollAnchor')    private scrollAnchor!:    ElementRef<HTMLDivElement>;
  @ViewChild('inputRef')        private inputRef!:        ElementRef<HTMLTextAreaElement>;

  // ── État ────────────────────────────────────────────────────────────────
  messages:       ChatMessage[] = [];
  messageCourant  = '';
  isLoading       = false;
  isTyping        = false;
  isOpen          = false;
  isMaximized     = false;
  isOnline        = navigator.onLine;
  inputFocused    = false;
  showSuggestions = true;
  suggestionsFull = false;
  unreadCount     = 0;

  private shouldScroll   = false;
  private subs           = new Subscription();
  private onlineFn!:  EventListenerObject;
  private offlineFn!: EventListenerObject;

  // ── Suggestions filtrées ─────────────────────────────────────────────────
  get visibleSuggestions(): QuickSuggestion[] {
    return this.suggestionsFull
      ? this.chatbotService.suggestions
      : this.chatbotService.suggestions.slice(0, 5);
  }

  constructor(
    private chatbotService: ChatbotService,
    private cdr: ChangeDetectorRef
  ) {}

  // ── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.subs.add(this.chatbotService.messages$.subscribe(msgs => {
      this.messages    = msgs;
      this.shouldScroll = true;
      this.cdr.markForCheck();
    }));

    this.subs.add(this.chatbotService.isLoading$.subscribe(v => {
      this.isLoading = v;
      this.cdr.markForCheck();
    }));

    this.subs.add(this.chatbotService.isTyping$.subscribe(v => {
      this.isTyping = v;
      this.cdr.markForCheck();
    }));

    this.subs.add(this.chatbotService.unreadCount$.subscribe(v => {
      this.unreadCount = v;
      this.cdr.markForCheck();
    }));

    // Connexion réseau
    this.onlineFn  = { handleEvent: () => { this.isOnline = true;  this.ajouterSysteme('✅ Connexion rétablie !'); this.cdr.markForCheck(); } };
    this.offlineFn = { handleEvent: () => { this.isOnline = false; this.ajouterSysteme('📡 Mode hors ligne activé.'); this.cdr.markForCheck(); } };
    window.addEventListener('online',  this.onlineFn);
    window.addEventListener('offline', this.offlineFn);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    window.removeEventListener('online',  this.onlineFn);
    window.removeEventListener('offline', this.offlineFn);
  }

  // ── Actions UI ──────────────────────────────────────────────────────────

  ouvrirChat(): void {
    this.isOpen = true;
    this.chatbotService.reinitialiserNonLus();
    setTimeout(() => {
      this.scrollToBottom();
      this.inputRef?.nativeElement.focus();
    }, 320);
  }

  fermerChat(): void {
    this.isOpen = false;
  }

  toggleMaximize(): void {
    this.isMaximized = !this.isMaximized;
    setTimeout(() => this.scrollToBottom(), 100);
  }

  demanderEffacer(): void {
    if (confirm('Effacer toute la conversation ?')) {
      this.chatbotService.effacerHistorique();
    }
  }

  toggleSuggestions(): void {
    this.suggestionsFull = !this.suggestionsFull;
  }

  // ── Envoi de message ────────────────────────────────────────────────────

  async envoyerMessage(): Promise<void> {
    const msg = this.messageCourant.trim();
    if (!msg || this.isLoading) return;

    this.messageCourant = '';
    this.resetTextareaHeight();

    if (this.isOnline) {
      await this.chatbotService.envoyerMessage(msg, this.agriculteurId, this.isOpen);
    } else {
      this.chatbotService.envoyerMessageHorsLigne(msg);
    }
  }

  envoyerSuggestion(s: QuickSuggestion): void {
    this.messageCourant = s.text;
    this.envoyerMessage();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.envoyerMessage();
    }
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  // ── Actions sur les cartes riches ────────────────────────────────────────

  ouvrirFormulaireParcelle(): void {
    window.dispatchEvent(new CustomEvent('open-parcelle-form', { detail: { action: 'create' } }));
  }

  modifierParcelle(parcelle: any): void {
    window.dispatchEvent(new CustomEvent('open-parcelle-form', { detail: { action: 'edit', parcelle } }));
  }

  voirSurCarte(parcelle: any): void {
    window.dispatchEvent(new CustomEvent('center-map-on-parcelle', { detail: parcelle }));
  }

  // ── Formatage Markdown ────────────────────────────────────────────────────

  formatMessage(content: string): string {
    if (!content) return '';
    let s = content;

    // Sécurité HTML basique (pas de DOMSanitizer ici car on contrôle le backend)
    s = s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Markdown
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g,     '<em>$1</em>');
    s = s.replace(/`(.+?)`/g,       '<code>$1</code>');

    // Listes • et -
    s = s.replace(/^[•\-] (.+)$/gm, '<li>$1</li>');
    s = s.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');

    // Liens
    s = s.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline">$1</a>'
    );

    // Sauts de ligne (après les listes pour ne pas casser les <ul>)
    s = s.replace(/\n/g, '<br>');

    return s;
  }

  // ── Utilitaires ─────────────────────────────────────────────────────────

  trackById(_: number, msg: ChatMessage): string { return msg.id; }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* noop */ }
  }

  private resetTextareaHeight(): void {
    if (this.inputRef?.nativeElement) {
      this.inputRef.nativeElement.style.height = 'auto';
    }
  }

  private ajouterSysteme(msg: string): void {
    // Injection directe dans le subject (message système temporaire)
    const msgs = [...this.chatbotService['messagesSubject'].value];
    msgs.push({
      id: `sys_${Date.now()}`,
      role: 'bot',
      content: msg,
      timestamp: new Date(),
    });
    this.chatbotService['messagesSubject'].next(msgs);
  }
}
