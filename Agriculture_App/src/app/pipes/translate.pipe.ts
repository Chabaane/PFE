// pipes/translate.pipe.ts
import { Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { TranslationService } from '../services/translation/translation.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false  // impure pour détecter les changements de langue
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private currentLang: string;
  private sub: Subscription;

  constructor(private translationService: TranslationService) {
    this.currentLang = translationService.getCurrentLanguage();
    this.sub = translationService.currentLanguage$.subscribe(lang => {
      this.currentLang = lang;
    });
  }

  transform(value: string): string {
    return this.translationService.translateStatic(value);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
