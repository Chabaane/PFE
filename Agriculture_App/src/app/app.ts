// app.component.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatComponent } from "./components/chat/chat.component";
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { AutoTranslatorService } from './services/auto-translator/auto-translator.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ChatbotComponent, ChatComponent],
  template: `
    <router-outlet></router-outlet>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class AppComponent implements OnInit{
  title = 'AgriManager';
  constructor(private translator: AutoTranslatorService) {}

  ngOnInit(): void {
    // ✅ UNE SEULE LIGNE — toute l'app est maintenant traduite automatiquement
    this.translator.init();
  }
}
