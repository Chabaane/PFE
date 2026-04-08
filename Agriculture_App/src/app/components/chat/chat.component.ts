import { Component, ElementRef, ViewChild, AfterViewChecked, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

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
    <div class="chat-widget" [class.minimized]="isMinimized" [class.open]="isOpen">
      <!-- Chat Header -->
      <div class="chat-header" (click)="toggleChat()">
        <div class="header-content">
          <i class="bi bi-robot"></i>
          <div class="header-text">
            <strong>AgriBot IA</strong>
            <small>Expert agronome</small>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn-icon" (click)="clearChat(); $event.stopPropagation()" title="Nouvelle conversation">
            <i class="bi bi-plus-lg"></i>
          </button>
          <button class="btn-icon" (click)="toggleMinimize(); $event.stopPropagation()">
            <i class="bi" [class.bi-dash-lg]="!isMinimized" [class.bi-chat-dots]="isMinimized"></i>
          </button>
        </div>
      </div>

      <!-- Chat Body -->
      <div class="chat-body" *ngIf="!isMinimized">
        <!-- Messages -->
        <div class="messages-container" #messagesContainer>
          <!-- Message d'accueil -->
          <div class="message bot" *ngIf="messages.length === 0 && !loading">
            <div class="message-avatar">
              <i class="bi bi-robot"></i>
            </div>
            <div class="message-content">
              <div class="message-text">
                Bonjour ! 👋 Je suis votre assistant agricole. Posez-moi vos questions sur :
                <ul>
                  <li>🌾 Les cultures (blé, olivier...)</li>
                  <li>💧 L'irrigation et l'eau</li>
                  <li>🌡️ Les conditions climatiques</li>
                  <li>📊 L'interprétation NDVI</li>
                </ul>
              </div>
              <div class="message-time">{{ getTime() }}</div>
            </div>
          </div>

          <!-- Messages existants -->
          <div *ngFor="let m of messages" class="message" [class.user]="m.sender === 'user'" [class.bot]="m.sender === 'bot'">
            <div class="message-avatar" *ngIf="m.sender === 'bot'">
              <i class="bi bi-robot"></i>
            </div>
            <div class="message-avatar" *ngIf="m.sender === 'user'">
              <i class="bi bi-person-circle"></i>
            </div>
            <div class="message-content">
              <div class="message-text" [innerHTML]="m.sender === 'bot' ? formatMessage(m.text) : m.text">
              </div>
              <div class="message-time">{{ m.timestamp | date:'HH:mm' }}</div>
            </div>
          </div>

          <!-- Loading indicator -->
          <div class="message bot" *ngIf="loading">
            <div class="message-avatar">
              <i class="bi bi-robot"></i>
            </div>
            <div class="message-content">
              <div class="message-text typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <div class="suggestions" *ngIf="suggestions.length > 0 && !input">
            <button *ngFor="let s of suggestions" class="suggestion-chip" (click)="sendSuggestion(s)">
              {{ s }}
            </button>
          </div>
          <div class="input-group">
            <textarea
              [(ngModel)]="input"
              (keyup.enter)="send()"
              (keydown.enter)="$event.preventDefault()"
              (keydown)="handleKeyDown($event)"
              placeholder="Posez votre question..."
              rows="1"
              class="chat-input"
            ></textarea>
            <button class="send-btn" (click)="send()" [disabled]="!input.trim() || loading">
              <i class="bi bi-send-fill"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      max-width: calc(100vw - 40px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 1000;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
    }

    .chat-widget.minimized {
      width: auto;
      height: auto;
    }

    .chat-widget.minimized .chat-header {
      border-radius: 40px;
      padding: 8px 16px;
    }

    .chat-header {
      background: linear-gradient(135deg, #2e7d32, #1b5e20);
      color: white;
      padding: 12px 16px;
      border-radius: 16px 16px 0 0;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s ease;
    }

    .chat-header:hover {
      background: linear-gradient(135deg, #388e3c, #2e7d32);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-content i {
      font-size: 24px;
    }

    .header-text {
      display: flex;
      flex-direction: column;
    }

    .header-text strong {
      font-size: 14px;
    }

    .header-text small {
      font-size: 11px;
      opacity: 0.8;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: rgba(255,255,255,0.3);
      transform: scale(1.05);
    }

    .chat-body {
      display: flex;
      flex-direction: column;
      height: 500px;
      max-height: 60vh;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f5f5f5;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .messages-container::-webkit-scrollbar-track {
      background: #e0e0e0;
    }

    .messages-container::-webkit-scrollbar-thumb {
      background: #4caf50;
      border-radius: 3px;
    }

    .message {
      display: flex;
      gap: 10px;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message.user {
      flex-direction: row-reverse;
    }

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .message.bot .message-avatar {
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      color: white;
    }

    .message.user .message-avatar {
      background: linear-gradient(135deg, #2196f3, #1976d2);
      color: white;
    }

    .message-avatar i {
      font-size: 18px;
    }

    .message-content {
      max-width: 70%;
      display: flex;
      flex-direction: column;
    }

    .message.user .message-content {
      align-items: flex-end;
    }

    .message-text {
      background: white;
      padding: 10px 14px;
      border-radius: 18px;
      word-wrap: break-word;
      line-height: 1.4;
      font-size: 14px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .message.user .message-text {
      background: linear-gradient(135deg, #4caf50, #388e3c);
      color: white;
    }

    .message.bot .message-text {
      background: white;
      color: #333;
    }

    .message-text ul {
      margin: 8px 0 0 20px;
      padding: 0;
    }

    .message-text li {
      margin: 4px 0;
    }

    .message-time {
      font-size: 10px;
      color: #999;
      margin-top: 4px;
      padding: 0 4px;
    }

    .message.user .message-time {
      text-align: right;
    }

    /* Typing indicator */
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 8px 12px;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #4caf50;
      border-radius: 50%;
      animation: typing 1.4s infinite;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-10px); opacity: 1; }
    }

    /* Input area */
    .input-area {
      border-top: 1px solid #e0e0e0;
      padding: 12px;
      background: white;
      border-radius: 0 0 16px 16px;
    }

    .suggestions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .suggestion-chip {
      background: #e8f5e9;
      border: 1px solid #4caf50;
      color: #2e7d32;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .suggestion-chip:hover {
      background: #4caf50;
      color: white;
      transform: translateY(-2px);
    }

    .input-group {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .chat-input {
      flex: 1;
      border: 1px solid #e0e0e0;
      border-radius: 24px;
      padding: 10px 16px;
      font-size: 14px;
      resize: none;
      font-family: inherit;
      max-height: 100px;
      transition: all 0.2s;
    }

    .chat-input:focus {
      outline: none;
      border-color: #4caf50;
      box-shadow: 0 0 0 2px rgba(76,175,80,0.1);
    }

    .send-btn {
      background: linear-gradient(135deg, #4caf50, #2e7d32);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(76,175,80,0.3);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Code blocks dans les messages */
    .message-text pre {
      background: #f4f4f4;
      padding: 8px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
    }

    .message-text code {
      background: #f4f4f4;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: monospace;
    }
  `]
})
export class ChatComponent implements AfterViewChecked, OnInit {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  input = '';
  loading = false;
  isMinimized = false;
  isOpen = true;
  sessionId = '';

  messages: ChatMessage[] = [];

  suggestions = [
    '🌾 Comment cultiver le blé ?',
    '💧 Quand irriguer mes oliviers ?',
    '🌡️ Que faire en cas de forte chaleur ?',
    '📊 Mon NDVI est à 0.4, que faire ?'
  ];

  constructor(private chat: ChatService) {}

  ngOnInit() {
    this.sessionId = localStorage.getItem('chat_session_id') ||
                     Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('chat_session_id', this.sessionId);
    this.loadChatHistory();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  getTime(): string {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
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
    // Convertir markdown simple
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    return formatted;
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
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

    this.input = '';

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
}
