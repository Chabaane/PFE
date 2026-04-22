// services/translation/translation.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type Language = 'fr' | 'ar' | 'en';

export interface TranslationCache {
  [key: string]: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {

  // MyMemory API - 100% gratuit, 5000 mots/jour, sans clé API
  private readonly MYMEMORY_API = 'https://api.mymemory.translated.net/get';

  private currentLanguage = new BehaviorSubject<Language>('fr');
  currentLanguage$ = this.currentLanguage.asObservable();

  // Cache local pour éviter les requêtes répétées
  private cache: Map<string, string> = new Map();

  // Dictionnaire statique de secours (termes agricoles courants)
  private readonly staticDict: Record<string, Record<Language, string>> = {
    'Agriculteurs': { fr: 'Agriculteurs', ar: 'المزارعون', en: 'Farmers' },
    'Fermes': { fr: 'Fermes', ar: 'المزارع', en: 'Farms' },
    'Parcelles': { fr: 'Parcelles', ar: 'القطع الأرضية', en: 'Plots' },
    'Vue Satellite': { fr: 'Vue Satellite', ar: 'صورة الأقمار الاصطناعية', en: 'Satellite View' },
    'Agroclimatique': { fr: 'Agroclimatique', ar: 'زراعي مناخي', en: 'Agroclimatic' },
    'Scan Feuilles': { fr: 'Scan Feuilles', ar: 'مسح الأوراق', en: 'Leaf Scan' },
    'Mon profil': { fr: 'Mon profil', ar: 'ملفي الشخصي', en: 'My Profile' },
    'Tableau de bord': { fr: 'Tableau de bord', ar: 'لوحة التحكم', en: 'Dashboard' },
    'Déconnexion': { fr: 'Déconnexion', ar: 'تسجيل الخروج', en: 'Logout' },
    'Connexion': { fr: 'Connexion', ar: 'تسجيل الدخول', en: 'Login' },
    'Email': { fr: 'Email', ar: 'البريد الإلكتروني', en: 'Email' },
    'Mot de passe': { fr: 'Mot de passe', ar: 'كلمة المرور', en: 'Password' },
    'Se connecter': { fr: 'Se connecter', ar: 'تسجيل الدخول', en: 'Sign In' },
    'Créer un compte': { fr: 'Créer un compte', ar: 'إنشاء حساب', en: 'Create Account' },
    'Nom': { fr: 'Nom', ar: 'الاسم', en: 'Name' },
    'Prénom': { fr: 'Prénom', ar: 'الاسم الأول', en: 'First Name' },
    'Téléphone': { fr: 'Téléphone', ar: 'الهاتف', en: 'Phone' },
    'Localisation': { fr: 'Localisation', ar: 'الموقع', en: 'Location' },
    'Rôle': { fr: 'Rôle', ar: 'الدور', en: 'Role' },
    'Chargement': { fr: 'Chargement', ar: 'جارٍ التحميل', en: 'Loading' },
    'Erreur': { fr: 'Erreur', ar: 'خطأ', en: 'Error' },
    'Succès': { fr: 'Succès', ar: 'نجاح', en: 'Success' },
    'Supprimer': { fr: 'Supprimer', ar: 'حذف', en: 'Delete' },
    'Modifier': { fr: 'Modifier', ar: 'تعديل', en: 'Edit' },
    'Ajouter': { fr: 'Ajouter', ar: 'إضافة', en: 'Add' },
    'Enregistrer': { fr: 'Enregistrer', ar: 'حفظ', en: 'Save' },
    'Annuler': { fr: 'Annuler', ar: 'إلغاء', en: 'Cancel' },
    'Retour': { fr: 'Retour', ar: 'رجوع', en: 'Back' },
    'Surface': { fr: 'Surface', ar: 'المساحة', en: 'Area' },
    'Culture': { fr: 'Culture', ar: 'المحصول', en: 'Crop' },
    'Diagnostic': { fr: 'Diagnostic', ar: 'التشخيص', en: 'Diagnosis' },
    'Nbr Agriculteurs': { fr: 'Nbr Agriculteurs', ar: 'عدد المزارعين', en: 'Farmers Count' },
    'Nbr parcelles': { fr: 'Nbr parcelles', ar: 'عدد القطع', en: 'Plots Count' },
    'Surface plantée': { fr: 'Surface plantée', ar: 'المساحة المزروعة', en: 'Planted Area' },
    'Stat. générales': { fr: 'Stat. générales', ar: 'إحصاءات عامة', en: 'General Stats' },
    'Stat. variétés': { fr: 'Stat. variétés', ar: 'إحصاءات الأصناف', en: 'Variety Stats' },
    'Stat. régions': { fr: 'Stat. régions', ar: 'إحصاءات المناطق', en: 'Region Stats' },
    'Surface par variété': { fr: 'Surface par variété', ar: 'المساحة حسب الصنف', en: 'Area by Variety' },
    'Surface par région': { fr: 'Surface par région', ar: 'المساحة حسب المنطقة', en: 'Area by Region' },
    'Bienvenue': { fr: 'Bienvenue', ar: 'مرحباً', en: 'Welcome' },
    'Actualiser': { fr: 'Actualiser', ar: 'تحديث', en: 'Refresh' },
    'Admin': { fr: 'Admin', ar: 'المسؤول', en: 'Admin' },
    'Se souvenir de moi': { fr: 'Se souvenir de moi', ar: 'تذكرني', en: 'Remember Me' },
    'Mot de passe oublié ?': { fr: 'Mot de passe oublié ?', ar: 'نسيت كلمة المرور؟', en: 'Forgot Password?' },
    'Confirmer le mot de passe': { fr: 'Confirmer le mot de passe', ar: 'تأكيد كلمة المرور', en: 'Confirm Password' },
    'Agriculteur': { fr: 'Agriculteur', ar: 'مزارع', en: 'Farmer' },
    'Agent agricole': { fr: 'Agent agricole', ar: 'عون زراعي', en: 'Agricultural Agent' },
    'Observateur': { fr: 'Observateur', ar: 'مراقب', en: 'Observer' },
  };

  constructor(private http: HttpClient) {
    // Charger la langue sauvegardée
    const saved = localStorage.getItem('app_language') as Language;
    if (saved && ['fr', 'ar', 'en'].includes(saved)) {
      this.currentLanguage.next(saved);
    }
  }

  getCurrentLanguage(): Language {
    return this.currentLanguage.value;
  }

  setLanguage(lang: Language): void {
    this.currentLanguage.next(lang);
    localStorage.setItem('app_language', lang);
    // Appliquer la direction RTL pour l'arabe
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }

  // Traduction depuis le dictionnaire statique (instantané)
  translateStatic(key: string): string {
    const lang = this.currentLanguage.value;
    return this.staticDict[key]?.[lang] ?? key;
  }

  // Traduction dynamique via MyMemory API (gratuite)
  translateDynamic(text: string, sourceLang: Language = 'fr'): Observable<string> {
    const targetLang = this.currentLanguage.value;
    if (targetLang === sourceLang) return of(text);

    const cacheKey = `${sourceLang}:${targetLang}:${text}`;
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    const langPair = `${sourceLang}|${targetLang}`;
    const url = `${this.MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    return this.http.get<any>(url).pipe(
      map(res => {
        const translated = res?.responseData?.translatedText || text;
        this.cache.set(cacheKey, translated);
        return translated;
      }),
      catchError(() => of(text))
    );
  }

  // Traduire un tableau de textes (batch)
  translateBatch(texts: string[], sourceLang: Language = 'fr'): Observable<string[]> {
    const combined = texts.join(' ||| ');
    return this.translateDynamic(combined, sourceLang).pipe(
      map(result => {
        const parts = result.split(' ||| ');
        return texts.map((t, i) => parts[i] || t);
      })
    );
  }

  isRTL(): boolean {
    return this.currentLanguage.value === 'ar';
  }
}
