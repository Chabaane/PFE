// components/language-switcher/language-switcher.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutoTranslatorService, Language } from '../../services/auto-translator/auto-translator.service';
import { Subscription } from 'rxjs';

interface LangOption {
  code: Language;
  nativeLabel: string;
  subLabel: string;
  flag: string;   // emoji drapeau
}

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ls-wrap">
      <!-- Bouton trigger avec libellé "Langue" + drapeau actuel -->
      <button class="ls-btn" [class.ls-btn--open]="open" (click)="toggle()" [attr.aria-expanded]="open">
        <span class="ls-label">🌐</span>

        <svg class="ls-arrow" [class.ls-arrow--up]="open" width="10" height="6" viewBox="0 0 10 6">
          <path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>
        </svg>
      </button>

      <!-- Dropdown -->
      <div class="ls-panel" [class.ls-panel--open]="open" role="listbox">
        <p class="ls-heading">Choisir la langue</p>

        <button
          *ngFor="let l of langs"
          class="ls-option"
          [class.ls-option--active]="l.code === current.code"
          [disabled]="translating"
          (click)="pick(l)"
          role="option">
          <span class="ls-o-flag">{{ l.flag }}</span>
          <span class="ls-o-labels" [dir]="l.code === 'ar' ? 'rtl' : 'ltr'">
            <b class="ls-o-native">{{ l.nativeLabel }}</b>
            <span class="ls-o-sub">{{ l.subLabel }}</span>
          </span>
          <svg *ngIf="l.code === current.code" class="ls-tick" width="14" height="14" viewBox="0 0 14 14">
            <path d="M2 7l3.5 3.5L12 3.5" stroke="#4ba293" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </button>

        <div class="ls-progress" *ngIf="translating">
          <span class="ls-spinner"></span>
          <span class="ls-progress-text">Traduction...</span>
        </div>
      </div>

      <div *ngIf="open" class="ls-backdrop" (click)="close()"></div>
    </div>
  `,
  styles: [`
    .ls-wrap { position: relative; display: inline-block; z-index: 1000; }

    .ls-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 13px;
      background: rgba(255,255,255,0.09);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 999px;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s;
      font-family: inherit;
    }
    .ls-btn:hover, .ls-btn--open {
      background: rgba(75,162,147,.28);
      border-color: #4ba293;
      box-shadow: 0 0 0 3px rgba(75,162,147,.18);
    }
    .ls-label {
      font-size: 12px;
      font-weight: 500;
      margin-right: 4px;
    }
    .ls-flag { font-size: 16px; line-height: 1; }
    .ls-code { font-family: 'Courier New', monospace; font-size: 10px; margin-left: 2px; }
    .ls-arrow { opacity: .6; transition: transform .22s; flex-shrink: 0; }
    .ls-arrow--up { transform: rotate(180deg); }

    .ls-panel {
      position: absolute; top: calc(100% + 9px); right: 0;
      width: 220px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,.04), 0 16px 40px rgba(0,0,0,.16);
      overflow: hidden;
      opacity: 0;
      transform: translateY(-8px) scale(0.95);
      transform-origin: top right;
      transition: opacity 0.2s, transform 0.2s;
      pointer-events: none;
    }
    .ls-panel--open {
      opacity: 1;
      transform: none;
      pointer-events: all;
    }
    .ls-heading {
      margin: 0;
      padding: 11px 15px 8px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #bbb;
      border-bottom: 1px solid #f2f2f2;
    }
    .ls-option {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 10px;
      margin: 3px 0;
      background: transparent;
      border: none;
      border-radius: 9px;
      cursor: pointer;
      transition: background 0.14s;
      text-align: left;
    }
    .ls-option:first-of-type { margin-top: 6px; }
    .ls-option:last-of-type  { margin-bottom: 3px; }
    .ls-option:hover { background: #f4faf9; }
    .ls-option--active { background: rgba(75,162,147,.09); }
    .ls-option:disabled { cursor: not-allowed; opacity: 0.55; }
    .ls-o-flag { font-size: 22px; flex-shrink: 0; }
    .ls-o-labels { flex: 1; display: flex; flex-direction: column; gap: 1px; }
    .ls-o-native { font-size: 13.5px; font-weight: 700; color: #111; }
    .ls-o-sub { font-size: 10.5px; color: #aaa; }
    .ls-tick { flex-shrink: 0; }
    .ls-progress {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 15px;
      border-top: 1px solid #f2f2f2;
      font-size: 11.5px;
      color: #aaa;
    }
    .ls-spinner {
      width: 13px;
      height: 13px;
      border: 2px solid #e8e8e8;
      border-top-color: #4ba293;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ls-backdrop { position: fixed; inset: 0; z-index: -1; }
  `]
})
export class LanguageSwitcherComponent implements OnInit, OnDestroy {
  open = false;
  translating = false;
  private sub!: Subscription;

  langs: LangOption[] = [
    { code: 'fr', nativeLabel: 'Français', subLabel: 'French', flag: '🇫🇷' },
    { code: 'ar', nativeLabel: 'العربية',   subLabel: 'Arabic', flag: '🇹🇳' },
    { code: 'en', nativeLabel: 'English',  subLabel: 'Anglais', flag: '🇬🇧' },
  ];

  current: LangOption = this.langs[0];

  constructor(public translator: AutoTranslatorService) {}

  ngOnInit(): void {
    this.sub = this.translator.lang$.subscribe(lang => {
      this.current = this.langs.find(l => l.code === lang) ?? this.langs[0];
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  toggle(): void { this.open = !this.open; }
  close(): void { this.open = false; }

  pick(l: LangOption): void {
    if (l.code === this.current.code) {
      this.close();
      return;
    }
    this.translating = true;
    setTimeout(() => {
      this.translator.setLanguage(l.code);
      this.translating = false;
      this.close();
      this.showToast(l.code);
    }, 480);
  }

  private showToast(lang: Language): void {
    const messages: Record<Language, string> = {
      fr: '🇫🇷 Langue : Français',
      ar: '🇹🇳 اللغة : العربية',
      en: '🇬🇧 Language: English'
    };
    const toast = document.createElement('div');
    toast.textContent = messages[lang];
    Object.assign(toast.style, {
      position: 'fixed', bottom: '28px', left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(20,22,28,.96)', color: '#fff',
      padding: '12px 26px', borderRadius: '50px',
      fontSize: '13px', fontWeight: '600',
      boxShadow: '0 8px 32px rgba(0,0,0,.3)',
      border: '1px solid rgba(75,162,147,.35)',
      zIndex: '99999', transition: 'opacity .4s',
      fontFamily: 'inherit', whiteSpace: 'nowrap'
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 2800);
  }
}
