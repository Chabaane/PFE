// chat.component.ts amélioré
import { Component, ElementRef, ViewChild, AfterViewChecked, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { Subscription } from 'rxjs';

export interface ChatMessage {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Bouton flottant -->
    <div class="chat-fab" *ngIf="!isOpen" (click)="toggleChat()">
      <div class="fab-icon">🌾</div>
      <div class="fab-pulse"></div>
      <span class="fab-badge" *ngIf="unreadCount > 0">{{unreadCount > 9 ? '9+' : unreadCount}}</span>
      <div class="fab-tooltip">AgriBot — Assistant IA</div>
    </div>

    <!-- Fenêtre de chat -->
    <div class="chat-window" [class.open]="isOpen" [class.minimized]="isMinimized">

      <!-- Header -->
      <div class="chat-header">
        <div class="header-identity">
          <div class="bot-avatar">
            <span class="bot-avatar-icon">🌾</span>
            <span class="bot-status-dot" [class.online]="isOnline"></span>
          </div>
          <div class="header-info">
            <span class="bot-name">AgriBot IA</span>
            <span class="bot-subtitle" [class.typing]="isTyping">
              <span *ngIf="!isTyping">{{ isOnline ? '● En ligne · Expert agronome' : '○ Mode hors ligne' }}</span>
              <span *ngIf="isTyping" class="typing-text">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                En train d'écrire...
              </span>
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button class="hbtn" title="Nouvelle conversation" (click)="clearChat(); $event.stopPropagation()">
            🗑️
          </button>
          <button class="hbtn" title="Réduire" (click)="toggleMinimize(); $event.stopPropagation()">
            {{ isMinimized ? '⬜' : '−' }}
          </button>
          <button class="hbtn hbtn-close" title="Fermer" (click)="toggleChat()">
            ✕
          </button>
        </div>
      </div>

      <!-- Bannière hors ligne -->
      <div class="offline-banner" *ngIf="!isOnline">
        📡 Mode hors ligne — Certaines fonctionnalités sont limitées
      </div>

      <!-- Corps du chat -->
      <div class="chat-body" #messagesContainer>

        <!-- Message d'accueil -->
        <div class="msg-row bot-row" *ngIf="messages.length === 0 && !loading">
          <div class="msg-avatar bot-av">🌾</div>
          <div class="msg-bubble-wrap">
            <div class="msg-bubble bot-bubble">
              <div class="msg-text">
                Bonjour ! 👋 Je suis votre assistant agricole. Posez-moi vos questions sur :
                <ul>
                  <li>🌾 Les cultures (blé, olivier...)</li>
                  <li>💧 L'irrigation et l'eau</li>
                  <li>🌡️ Les conditions climatiques</li>
                  <li>📊 L'interprétation NDVI</li>
                </ul>
              </div>
            </div>
            <span class="msg-time">{{ getTime() }}</span>
          </div>
        </div>

        <!-- Messages existants -->
        <div *ngFor="let msg of messages; trackBy: trackByDate"
             class="msg-row"
             [class.user-row]="msg.sender === 'user'"
             [class.bot-row]="msg.sender === 'bot'">

          <!-- Avatar bot -->
          <div class="msg-avatar bot-av" *ngIf="msg.sender === 'bot'">🌾</div>

          <div class="msg-bubble-wrap" [class.user-wrap]="msg.sender === 'user'">
            <div class="msg-bubble" [class.user-bubble]="msg.sender === 'user'" [class.bot-bubble]="msg.sender === 'bot'">
              <div class="msg-text" [innerHTML]="msg.sender === 'bot' ? formatMessage(msg.text) : msg.text"></div>
            </div>
            <span class="msg-time">{{ msg.timestamp | date:'HH:mm' }}</span>
          </div>

          <!-- Avatar user -->
          <div class="msg-avatar user-av" *ngIf="msg.sender === 'user'">👤</div>
        </div>

        <!-- Loading / Typing indicator -->
        <div class="msg-row bot-row" *ngIf="loading">
          <div class="msg-avatar bot-av">🌾</div>
          <div class="msg-bubble-wrap">
            <div class="msg-bubble bot-bubble loading-bubble">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Ancre de scroll -->
        <div #scrollAnchor></div>
      </div>

      <!-- Suggestions -->
      <div class="suggestions-bar" *ngIf="suggestions.length > 0 && !loading && !input">
        <div class="suggestions-scroll">
          <button *ngFor="let s of suggestions" class="sug-chip" [class.sug-culture]="s.includes('blé') || s.includes('oliviers')" [class.sug-eau]="s.includes('irrigation') || s.includes('eau')" [class.sug-climat]="s.includes('chaleur') || s.includes('climat')" [class.sug-ndvi]="s.includes('NDVI')" (click)="sendSuggestion(s)">
            {{ s }}
          </button>
        </div>
      </div>

      <!-- Zone de saisie -->
      <div class="chat-input-area">
        <div class="input-wrapper" [class.focused]="inputFocused">
          <textarea
            #inputRef
            [(ngModel)]="input"
            (keydown)="handleKeyDown($event)"
            (focus)="inputFocused = true"
            (blur)="inputFocused = false"
            (input)="autoResize($event)"
            placeholder="Posez votre question..."
            rows="1"
            [disabled]="loading"
            maxlength="500"
          ></textarea>
          <div class="input-controls">
            <span class="char-count" *ngIf="input.length > 400">
              {{500 - input.length}}
            </span>
          </div>
        </div>
        <button class="send-btn" [disabled]="!input.trim() || loading" (click)="send()">
          <span *ngIf="!loading">➤</span>
          <span *ngIf="loading" class="spin">⌛</span>
        </button>
      </div>

      <!-- Footer -->
      <div class="powered-by">Propulsé par AgriManager Intelligence</div>
    </div>
  `,
  styles: [`
    /* ════════════════════════════════════════════════════════════
       Variables & Reset
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
    .chat-fab:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(22,163,74,0.6);
    }
    .chat-fab:hover .fab-tooltip {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
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
    .chat-window.minimized {
      width: auto;
      height: auto;
      min-width: 280px;
    }
    .chat-window.minimized .chat-header {
      border-radius: var(--radius);
    }
    .chat-window.minimized .chat-body,
    .chat-window.minimized .suggestions-bar,
    .chat-window.minimized .chat-input-area,
    .chat-window.minimized .powered-by {
      display: none;
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

    /* Rangée de message */
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

    /* Avatars */
    .msg-avatar {
      width: 30px; height: 30px;
      border-radius: 50%;
      font-size: 1rem;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .bot-av  { background: #e0f2fe; }
    .user-av { background: #dcfce7; }

    /* Bulles */
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
    }
    .bot-bubble {
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

    /* Typing indicator */
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

    /* Contenu des messages */
    .msg-text :host(strong) { font-weight: 700; }
    .msg-text :host(em)     { font-style: italic; }
    .msg-text :host(code)   {
      background: rgba(0,0,0,0.07);
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 0.82em;
      font-family: monospace;
    }
    .msg-text :host(ul), .msg-text :host(ol) {
      margin: 4px 0 0 16px;
      padding: 0;
    }
    .msg-text :host(li) { margin-bottom: 2px; }
    .user-bubble .msg-text :host(code) { background: rgba(255,255,255,0.2); }

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
    .sug-chip:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .sug-culture { border-color: #bbf7d0; background: #f0fdf4; color: #14532d; }
    .sug-eau     { border-color: #bfdbfe; background: #eff6ff; color: var(--blue); }
    .sug-climat  { border-color: #fde68a; background: #fffbeb; color: #92400e; }
    .sug-ndvi    { border-color: #e9d5ff; background: #f5f3ff; color: #4c1d95; }

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
    .char-count { font-size: 0.65rem; color: #f97316; }

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
export class ChatComponent implements AfterViewChecked, OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('scrollAnchor') private scrollAnchor!: ElementRef;
  @ViewChild('inputRef') private inputRef!: ElementRef<HTMLTextAreaElement>;

  input = '';
  loading = false;
  isMinimized = false;
  isOpen = false;
  isOnline = navigator.onLine;
  isTyping = false;
  inputFocused = false;
  unreadCount = 0;
  sessionId = '';

  messages: ChatMessage[] = [];

  suggestions = [
    '🌾 Comment cultiver le blé ?',
    '💧 Quand irriguer mes oliviers ?',
    '🌡️ Que faire en cas de forte chaleur ?',
    '📊 Mon NDVI est à 0.4, que faire ?'
  ];

  private onlineFn!: EventListenerObject;
  private offlineFn!: EventListenerObject;

  constructor(private chat: ChatService) {}

  ngOnInit() {
    this.sessionId = localStorage.getItem('chat_session_id') ||
                     Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('chat_session_id', this.sessionId);
    this.loadChatHistory();

    // Gestion de la connexion
    this.onlineFn = { handleEvent: () => {
      this.isOnline = true;
      this.addSystemMessage('✅ Connexion rétablie !');
    } };
    this.offlineFn = { handleEvent: () => {
      this.isOnline = false;
      this.addSystemMessage('📡 Mode hors ligne activé.');
    } };
    window.addEventListener('online', this.onlineFn);
    window.addEventListener('offline', this.offlineFn);
  }

  ngOnDestroy() {
    window.removeEventListener('online', this.onlineFn);
    window.removeEventListener('offline', this.offlineFn);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  getTime(): string {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch { /* noop */ }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
      setTimeout(() => {
        this.scrollToBottom();
        this.inputRef?.nativeElement.focus();
      }, 320);
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
  }

  clearChat() {
    this.messages = [];
    this.sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('chat_session_id', this.sessionId);
    localStorage.removeItem(`chat_messages_${this.sessionId}`);
  }

  loadChatHistory() {
    const saved = localStorage.getItem(`chat_messages_${this.sessionId}`);
    if (saved) {
      try {
        this.messages = JSON.parse(saved);
      } catch(e) {}
    }
  }

  saveChatHistory() {
    if (this.messages.length > 0) {
      localStorage.setItem(`chat_messages_${this.sessionId}`, JSON.stringify(this.messages.slice(-50)));
    }
  }

  formatMessage(text: string): string {
    if (!text) return '';
    let s = text;
    s = s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
    s = s.replace(/`(.*?)`/g, '<code>$1</code>');
    s = s.replace(/^[•\-] (.+)$/gm, '<li>$1</li>');
    s = s.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  sendSuggestion(suggestion: string) {
    this.input = suggestion;
    this.send();
  }

  send() {
    if (!this.input.trim() || this.loading) return;

    const userMessage: ChatMessage = {
      text: this.input,
      sender: 'user',
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    this.saveChatHistory();
    this.loading = true;

    const data = {
      message: this.input,
      parcelleNom: localStorage.getItem('current_parcelle') || "Parcelle principale",
      ndvi: parseFloat(localStorage.getItem('current_ndvi') || '0.5'),
      temperature: parseFloat(localStorage.getItem('current_temperature') || '25'),
      humidity: parseFloat(localStorage.getItem('current_humidity') || '50'),
      altitude: parseFloat(localStorage.getItem('current_altitude') || '100'),
      sessionId: this.sessionId
    };

    const messageText = this.input;
    this.input = '';
    this.resetTextareaHeight();

    this.chat.send(data).subscribe({
      next: (res) => {
        const botMessage: ChatMessage = {
          text: res.reply,
          sender: 'bot',
          timestamp: new Date()
        };
        this.messages.push(botMessage);
        this.loading = false;
        this.saveChatHistory();
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Chat error:', err);
        const errorMessage: ChatMessage = {
          text: "❌ Désolé, une erreur s'est produite. Veuillez réessayer.",
          sender: 'bot',
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        this.loading = false;
        this.scrollToBottom();
      }
    });
  }

  private resetTextareaHeight(): void {
    if (this.inputRef?.nativeElement) {
      this.inputRef.nativeElement.style.height = 'auto';
    }
  }

  private addSystemMessage(msg: string): void {
    const systemMessage: ChatMessage = {
      text: msg,
      sender: 'bot',
      timestamp: new Date()
    };
    this.messages.push(systemMessage);
    this.saveChatHistory();
    this.scrollToBottom();
  }

  trackByDate(_: number, msg: ChatMessage): string {
  // Vérification de sécurité pour éviter l'erreur
  if (!msg || !msg.timestamp) {
    return `${_}_${Date.now()}`;
  }

  // Si timestamp est déjà un Date
  if (msg.timestamp instanceof Date) {
    return `${msg.timestamp.getTime()}`;
  }

  // Si timestamp est un nombre (timestamp Unix)
  if (typeof msg.timestamp === 'number') {
    return `${msg.timestamp}`;
  }

  // Si timestamp est une chaîne
  if (typeof msg.timestamp === 'string') {
    const parsed = new Date(msg.timestamp);
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getTime()}`;
    }
  }

  // Fallback
  return `${_}_${Date.now()}`;
}
}
