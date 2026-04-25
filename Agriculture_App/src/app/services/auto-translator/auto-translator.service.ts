// services/auto-translator/auto-translator.service.ts
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  AUTO-TRANSLATOR — Aucune modification des composants existants         ║
// ║  Il suffit d'injecter ce service UNE SEULE FOIS dans AppComponent       ║
// ║  et toute l'application est traduite automatiquement.                   ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export type Language = 'fr' | 'ar' | 'en';

@Injectable({ providedIn: 'root' })
export class AutoTranslatorService implements OnDestroy {

  // ── API gratuite MyMemory (5000 mots/jour, zéro clé API) ──────────────
  private readonly API = 'https://api.mymemory.translated.net/get';

  // ── Langue courante ───────────────────────────────────────────────────
  private langSubject = new BehaviorSubject<Language>(
    (localStorage.getItem('agri_lang') as Language) || 'fr'
  );
  lang$ = this.langSubject.asObservable();

  // ── Cache : { "fr|ar|Bonjour" → "مرحبا" } ────────────────────────────
  private cache = new Map<string, string>();

  // ── Dictionnaire statique (termes agricoles — instantané, zéro réseau) ─
  private dict: Record<string, Record<Language, string>> = {
    'Agriculteurs':               { fr: 'Agriculteurs',          ar: 'المزارعون',                    en: 'Farmers' },
    'Fermes':                     { fr: 'Fermes',                ar: 'المزارع',                      en: 'Farms' },
    'Parcelles':                  { fr: 'Parcelles',             ar: 'القطع الأرضية',                en: 'Plots' },
    'Vue Satellite':              { fr: 'Vue Satellite',         ar: 'صورة الأقمار الاصطناعية',      en: 'Satellite View' },
    'Agroclimatique':             { fr: 'Agroclimatique',        ar: 'زراعي مناخي',                  en: 'Agroclimatic' },
    'Scan Feuilles':              { fr: 'Scan Feuilles',         ar: 'مسح الأوراق',                  en: 'Leaf Scan' },
    'Mon profil':                 { fr: 'Mon profil',            ar: 'ملفي الشخصي',                  en: 'My Profile' },
    'Tableau de bord':            { fr: 'Tableau de bord',       ar: 'لوحة التحكم',                  en: 'Dashboard' },
    'Déconnexion':                { fr: 'Déconnexion',           ar: 'تسجيل الخروج',                 en: 'Logout' },
    'Admin':                      { fr: 'Admin',                 ar: 'المسؤول',                      en: 'Admin' },
    'Email':                      { fr: 'Email',                 ar: 'البريد الإلكتروني',            en: 'Email' },
    'Mot de passe':               { fr: 'Mot de passe',          ar: 'كلمة المرور',                  en: 'Password' },
    'Se connecter':               { fr: 'Se connecter',          ar: 'تسجيل الدخول',                 en: 'Sign In' },
    'Connexion':                  { fr: 'Connexion',             ar: 'تسجيل الدخول',                 en: 'Login' },
    'Créer un compte':            { fr: 'Créer un compte',       ar: 'إنشاء حساب',                   en: 'Create Account' },
    'Créer mon compte':           { fr: 'Créer mon compte',      ar: 'إنشاء حسابي',                  en: 'Create My Account' },
    'Nom':                        { fr: 'Nom',                   ar: 'الاسم',                        en: 'Name' },
    'Prénom':                     { fr: 'Prénom',                ar: 'الاسم الأول',                  en: 'First Name' },
    'Téléphone':                  { fr: 'Téléphone',             ar: 'الهاتف',                       en: 'Phone' },
    'Localisation':               { fr: 'Localisation',          ar: 'الموقع',                       en: 'Location' },
    'Rôle':                       { fr: 'Rôle',                  ar: 'الدور',                        en: 'Role' },
    'Chargement':                 { fr: 'Chargement',            ar: 'جارٍ التحميل',                 en: 'Loading' },
    'Chargement...':              { fr: 'Chargement...',         ar: 'جارٍ التحميل...',              en: 'Loading...' },
    'Erreur':                     { fr: 'Erreur',                ar: 'خطأ',                          en: 'Error' },
    'Supprimer':                  { fr: 'Supprimer',             ar: 'حذف',                          en: 'Delete' },
    'Modifier':                   { fr: 'Modifier',              ar: 'تعديل',                        en: 'Edit' },
    'Ajouter':                    { fr: 'Ajouter',               ar: 'إضافة',                        en: 'Add' },
    'Enregistrer':                { fr: 'Enregistrer',           ar: 'حفظ',                          en: 'Save' },
    'Annuler':                    { fr: 'Annuler',               ar: 'إلغاء',                        en: 'Cancel' },
    'Retour':                     { fr: 'Retour',                ar: 'رجوع',                         en: 'Back' },
    '← Retour':                   { fr: '← Retour',              ar: 'رجوع →',                      en: '← Back' },
    'Surface':                    { fr: 'Surface',               ar: 'المساحة',                      en: 'Area' },
    'Culture':                    { fr: 'Culture',               ar: 'المحصول',                      en: 'Crop' },
    'Diagnostic':                 { fr: 'Diagnostic',            ar: 'التشخيص',                      en: 'Diagnosis' },
    'Nbr Agriculteurs':           { fr: 'Nbr Agriculteurs',      ar: 'عدد المزارعين',                en: 'Farmers Count' },
    'Nbr parcelles':              { fr: 'Nbr parcelles',         ar: 'عدد القطع',                    en: 'Plots Count' },
    'Surface plantée':            { fr: 'Surface plantée',       ar: 'المساحة المزروعة',             en: 'Planted Area' },
    'Stat. générales':            { fr: 'Stat. générales',       ar: 'إحصاءات عامة',                 en: 'General Stats' },
    'Stat. variétés':             { fr: 'Stat. variétés',        ar: 'إحصاءات الأصناف',              en: 'Variety Stats' },
    'Stat. régions':              { fr: 'Stat. régions',         ar: 'إحصاءات المناطق',              en: 'Region Stats' },
    'Surface par variété':        { fr: 'Surface par variété',   ar: 'المساحة حسب الصنف',            en: 'Area by Variety' },
    'Surface par région':         { fr: 'Surface par région',    ar: 'المساحة حسب المنطقة',          en: 'Area by Region' },
    'Actualiser':                 { fr: 'Actualiser',            ar: 'تحديث',                        en: 'Refresh' },
    'Se souvenir de moi':         { fr: 'Se souvenir de moi',    ar: 'تذكرني',                       en: 'Remember Me' },
    'Mot de passe oublié ?':      { fr: 'Mot de passe oublié ?', ar: 'نسيت كلمة المرور؟',           en: 'Forgot Password?' },
    'Confirmer le mot de passe':  { fr: 'Confirmer le mot de passe', ar: 'تأكيد كلمة المرور',       en: 'Confirm Password' },
    'Agriculteur':                { fr: 'Agriculteur',           ar: 'مزارع',                        en: 'Farmer' },
    'Agent agricole':             { fr: 'Agent agricole',        ar: 'عون زراعي',                    en: 'Agricultural Agent' },
    'Observateur':                { fr: 'Observateur',           ar: 'مراقب',                        en: 'Observer' },
    'Mon Profil':                 { fr: 'Mon Profil',            ar: 'ملفي الشخصي',                  en: 'My Profile' },
    'Informations Agriculteur':   { fr: 'Informations Agriculteur', ar: 'معلومات المزارع',           en: 'Farmer Information' },
    'Statistiques':               { fr: 'Statistiques',          ar: 'الإحصاءات',                    en: 'Statistics' },
    'Voir mes parcelles':         { fr: 'Voir mes parcelles',    ar: 'عرض قطعي الأرضية',             en: 'View My Plots' },
    'Modifier profil agriculteur':{ fr: 'Modifier profil agriculteur', ar: 'تعديل ملف المزارع',     en: 'Edit Farmer Profile' },
    'Bienvenue':                  { fr: 'Bienvenue',             ar: 'مرحباً',                       en: 'Welcome' },
    'Connexion en cours...':      { fr: 'Connexion en cours...', ar: 'جارٍ تسجيل الدخول...',        en: 'Signing in...' },
    'Création en cours...':       { fr: 'Création en cours...', ar: 'جارٍ الإنشاء...',              en: 'Creating...' },
    "Vous n'avez pas de compte ?":{ fr: "Vous n'avez pas de compte ?", ar: 'ليس لديك حساب؟',        en: "Don't have an account?" },
    "S'inscrire":                 { fr: "S'inscrire",            ar: 'إنشاء حساب',                   en: 'Register' },
    'Vous avez déjà un compte ?': { fr: 'Vous avez déjà un compte ?', ar: 'لديك حساب بالفعل؟',      en: 'Already have an account?' },
    'Carte':                      { fr: 'Carte',                 ar: 'الخريطة',                      en: 'Map' },
    'Dessin':                     { fr: 'Dessin',                ar: 'الرسم',                        en: 'Drawing' },
    'Ferme':                      { fr: 'Ferme',                 ar: 'المزرعة',                      en: 'Farm' },
    'Chat':                       { fr: 'Chat',                  ar: 'المحادثة',                     en: 'Chat' },
    'Assistant':                  { fr: 'Assistant',             ar: 'المساعد',                      en: 'Assistant' },
  };

  // ── MutationObserver pour détecter les changements du DOM Angular ─────
  private observer: MutationObserver | null = null;
  private translationPending = false;

  // ── Nœuds originaux (pour re-traduire si langue change) ──────────────
  // { node → texte original en français }
  private originalTexts = new WeakMap<Node, string>();

  constructor(private http: HttpClient) {}

  // ══════════════════════════════════════════════════════════════════════
  //  MÉTHODE PRINCIPALE — À appeler UNE SEULE FOIS dans AppComponent
  // ══════════════════════════════════════════════════════════════════════
  init(): void {
    // Appliquer la langue sauvegardée au démarrage
    const saved = localStorage.getItem('agri_lang') as Language;
    if (saved && saved !== 'fr') {
      this.applyLanguage(saved);
    }

    // Observer les mutations du DOM (Angular re-render)
    this.observer = new MutationObserver(() => {
      if (!this.translationPending && this.currentLang !== 'fr') {
        this.translationPending = true;
        // Debounce : attendre la fin du cycle Angular
        setTimeout(() => {
          this.translateDOM(document.body, 'fr', this.currentLang);
          this.translationPending = false;
        }, 150);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  //  CHANGER DE LANGUE
  // ══════════════════════════════════════════════════════════════════════
  setLanguage(lang: Language): void {
    const previous = this.currentLang;
    localStorage.setItem('agri_lang', lang);
    this.langSubject.next(lang);

    // RTL pour l'arabe
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    this.applyLanguage(lang);
  }

  get currentLang(): Language {
    return this.langSubject.value;
  }

  isRTL(): boolean {
    return this.currentLang === 'ar';
  }

  // ══════════════════════════════════════════════════════════════════════
  //  APPLIQUER LA TRADUCTION SUR TOUT LE DOM
  // ══════════════════════════════════════════════════════════════════════
  private applyLanguage(target: Language): void {
    if (target === 'fr') {
      // Restaurer les textes originaux français
      this.restoreOriginals(document.body);
    } else {
      this.translateDOM(document.body, 'fr', target);
    }
  }

  // ── Parcours récursif du DOM ─────────────────────────────────────────
  private translateDOM(root: Element, source: Language, target: Language): void {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Ignorer les scripts, styles, et nœuds vides
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'code', 'pre', 'input', 'textarea'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          const text = node.textContent?.trim() ?? '';
          if (text.length < 2) return NodeFilter.FILTER_REJECT;
          // Ignorer les nombres purs
          if (/^\d+([.,]\d+)?$/.test(text)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodesToTranslate: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      nodesToTranslate.push(node as Text);
    }

    // Traduire chaque nœud
    nodesToTranslate.forEach(textNode => {
      const raw = textNode.textContent?.trim() ?? '';
      if (!raw) return;

      // Sauvegarder le texte original si pas encore fait
      if (!this.originalTexts.has(textNode)) {
        this.originalTexts.set(textNode, textNode.textContent ?? '');
      }

      const original = this.originalTexts.get(textNode)!.trim();

      // 1. Chercher dans le dictionnaire statique (instantané)
      const staticResult = this.findInDict(original, target);
      if (staticResult) {
        textNode.textContent = (textNode.textContent ?? '').replace(original, staticResult);
        return;
      }

      // 2. Chercher dans le cache
      const cacheKey = `${source}|${target}|${original}`;
      if (this.cache.has(cacheKey)) {
        textNode.textContent = (textNode.textContent ?? '').replace(original, this.cache.get(cacheKey)!);
        return;
      }

      // 3. Appel API MyMemory (pour les textes non couverts par le dictionnaire)
      if (original.length > 1 && original.length < 500) {
        this.fetchTranslation(original, source, target).then(translated => {
          if (translated && translated !== original) {
            this.cache.set(cacheKey, translated);
            if (textNode.isConnected) {
              textNode.textContent = (textNode.textContent ?? '').replace(original, translated);
            }
          }
        });
      }
    });

    // Traduire aussi les placeholders et titres
    root.querySelectorAll('[placeholder]').forEach(el => {
      const attr = el.getAttribute('placeholder') ?? '';
      const staticR = this.findInDict(attr, target);
      if (staticR) el.setAttribute('placeholder', staticR);
    });

    root.querySelectorAll('[title]').forEach(el => {
      const attr = el.getAttribute('title') ?? '';
      const staticR = this.findInDict(attr, target);
      if (staticR) el.setAttribute('title', staticR);
    });
  }

  // ── Restaurer les textes originaux ───────────────────────────────────
  private restoreOriginals(root: Element): void {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const original = this.originalTexts.get(node);
      if (original !== undefined) {
        node.textContent = original;
      }
    }
  }

  // ── Recherche dans le dictionnaire statique ──────────────────────────
  private findInDict(text: string, target: Language): string | null {
    const trimmed = text.trim();
    // Recherche exacte
    if (this.dict[trimmed]) return this.dict[trimmed][target];
    // Recherche insensible à la casse
    const lower = trimmed.toLowerCase();
    for (const key of Object.keys(this.dict)) {
      if (key.toLowerCase() === lower) return this.dict[key][target];
    }
    return null;
  }

  // ── Appel API MyMemory ────────────────────────────────────────────────
    private async fetchTranslation(text: string, from: Language, to: Language): Promise<string> {
    try {
      const url = `${this.API}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
      const res = await fetch(url);
      const data = await res.json();
      return data?.responseData?.translatedText ?? text;
    } catch {
      return text;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  //  AJOUTER DES TRADUCTIONS PERSONNALISÉES (extensible)
  // ══════════════════════════════════════════════════════════════════════
  addTranslations(entries: Record<string, Record<Language, string>>): void {
    Object.assign(this.dict, entries);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
