// components/marketplace/marketplace.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MarketplaceService, Produit, ProduitPage, Panier, Commande, Avis, FiltresProduit } from '../../services/api/marketplace.service';
import { Subscription, debounceTime, Subject } from 'rxjs';

type Vue = 'catalogue' | 'detail' | 'panier' | 'checkout' | 'confirmation' | 'mescommandes' | 'admin';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
<div class="mp-root" [class.mp-sidebar-open]="panierOuvert">

  <!-- ════════════════════ HEADER MARKETPLACE ════════════════════ -->
  <header class="mp-header">
    <div class="mp-header-inner">
      <div class="mp-brand" (click)="goTo('catalogue')">
        <span class="mp-brand-icon">🌿</span>
        <div>
          <span class="mp-brand-title">AgriShop</span>
          <span class="mp-brand-sub">Médicaments & Intrants Agricoles</span>
        </div>
      </div>

      <!-- Barre de recherche -->
      <div class="mp-search-bar">
        <span class="mp-search-icon">🔍</span>
        <input
          type="text"
          class="mp-search-input"
          placeholder="Rechercher un produit, fabricant, maladie..."
          [(ngModel)]="rechercheTexte"
          (ngModelChange)="onRecherche($event)">
        <button *ngIf="rechercheTexte" class="mp-search-clear" (click)="rechercheTexte=''; onRecherche('')">✕</button>
      </div>

      <!-- Actions header -->
      <div class="mp-header-actions">
        <a routerLink="/marketplace/diagnostic" class="btn-diagnostic">
          🔬 Identifier une maladie par photo
        </a>
        <button class="mp-nav-btn" [class.active]="vueActive==='mescommandes'" (click)="goTo('mescommandes')">
          📦 Mes commandes
        </button>
        <button class="mp-nav-btn mp-admin-btn" (click)="goTo('admin')">
          ⚙️ Admin
        </button>
        <button class="mp-panier-btn" (click)="togglePanier()">
          🛒
          <span class="mp-panier-badge" *ngIf="nombreArticles > 0">{{ nombreArticles }}</span>
          <span class="mp-panier-total" *ngIf="panier?.total">{{ panier!.total | number:'1.2-2' }} TND</span>
        </button>
      </div>
    </div>
  </header>

  <!-- ════════════════════ CATALOGUE ════════════════════ -->
  <div class="mp-body" *ngIf="vueActive === 'catalogue'">

    <!-- Filtres sidebar -->
    <aside class="mp-filters">
      <h3 class="mp-filters-title">Filtrer</h3>

      <!-- Catégories -->
      <div class="mp-filter-group">
        <label class="mp-filter-label">Catégorie</label>
        <div class="mp-cat-list">
          <button
            *ngFor="let cat of categoriesAvecTous"
            class="mp-cat-btn"
            [class.active]="filtres.categorie === cat || (!filtres.categorie && cat==='Tous')"
            (click)="setCategorie(cat)">
            <span>{{ catIcon(cat) }}</span> {{ cat }}
          </button>
        </div>
      </div>

      <!-- Prix -->
      <div class="mp-filter-group">
        <label class="mp-filter-label">Prix (TND)</label>
        <div class="mp-prix-range">
          <input type="number" class="mp-prix-input" [(ngModel)]="filtres.prixMin" placeholder="Min" (change)="chargerProduits()">
          <span>–</span>
          <input type="number" class="mp-prix-input" [(ngModel)]="filtres.prixMax" placeholder="Max" (change)="chargerProduits()">
        </div>
      </div>

      <!-- Options -->
      <div class="mp-filter-group">
        <label class="mp-filter-label">Options</label>
        <label class="mp-checkbox">
          <input type="checkbox" [(ngModel)]="filtres.enPromotion" (change)="chargerProduits()">
          <span>En promotion 🏷️</span>
        </label>
        <label class="mp-checkbox">
          <input type="checkbox" [(ngModel)]="filtres.enStock" (change)="chargerProduits()">
          <span>En stock uniquement</span>
        </label>
      </div>

      <!-- Réinitialiser -->
      <button class="mp-reset-btn" (click)="resetFiltres()">Réinitialiser les filtres</button>
    </aside>

    <!-- Contenu principal -->
    <main class="mp-main">

      <!-- Barre de tri + compteur -->
      <div class="mp-toolbar">
        <span class="mp-count">{{ page.total }} produit{{ page.total > 1 ? 's' : '' }} trouvé{{ page.total > 1 ? 's' : '' }}</span>
        <div class="mp-sort">
          <label>Trier par</label>
          <select class="mp-sort-select" [(ngModel)]="filtres.tri" (change)="chargerProduits()">
            <option value="recent">Plus récents</option>
            <option value="prix_asc">Prix croissant</option>
            <option value="prix_desc">Prix décroissant</option>
            <option value="note">Mieux notés</option>
            <option value="nom">Nom A-Z</option>
          </select>
        </div>
      </div>

      <!-- Loader -->
      <div class="mp-loader" *ngIf="chargement">
        <div class="mp-spinner"></div>
        <p>Chargement des produits...</p>
      </div>

      <!-- Grille produits -->
      <div class="mp-grid" *ngIf="!chargement">
        <div class="mp-produit-card" *ngFor="let p of page.produits" (click)="voirDetail(p)">

          <!-- Badge promo -->
          <div class="mp-promo-badge" *ngIf="p.estEnPromotion">
            -{{ promoPercent(p) }}%
          </div>

          <!-- Image -->
          <div class="mp-card-img">
            <img *ngIf="p.imageUrl" [src]="p.imageUrl" [alt]="p.nom" (error)="onImgError($event)">
            <div class="mp-card-img-placeholder" *ngIf="!p.imageUrl">
              {{ catIcon(p.categorie) }}
            </div>
          </div>

          <!-- Contenu -->
          <div class="mp-card-body">
            <span class="mp-card-cat">{{ p.categorie }}</span>
            <h3 class="mp-card-nom">{{ p.nom }}</h3>
            <p class="mp-card-fabricant" *ngIf="p.fabricant">{{ p.fabricant }}</p>

            <!-- Note étoiles -->
            <div class="mp-stars" *ngIf="p.nombreAvis > 0">
              <span *ngFor="let s of stars(p.noteMoyenne)" [class]="s">★</span>
              <span class="mp-stars-count">({{ p.nombreAvis }})</span>
            </div>

            <!-- Prix -->
            <div class="mp-card-prix">
              <span class="mp-prix-effectif">{{ p.prixEffectif | number:'1.2-2' }} TND</span>
              <span class="mp-prix-barre" *ngIf="p.estEnPromotion">{{ p.prix | number:'1.2-2' }}</span>
              <span class="mp-unite">/{{ p.unite }}</span>
            </div>

            <!-- Stock -->
            <div class="mp-stock" [class.mp-stock-low]="p.stockDisponible <= 5" [class.mp-stock-out]="p.stockDisponible === 0">
              {{ p.stockDisponible === 0 ? '❌ Rupture de stock' : p.stockDisponible <= 5 ? '⚠️ Plus que ' + p.stockDisponible : '✅ En stock' }}
            </div>
          </div>

          <!-- Actions -->
          <div class="mp-card-footer" (click)="$event.stopPropagation()">
            <button class="mp-btn-detail" (click)="voirDetail(p)">Voir détail</button>
            <button class="mp-btn-add"
              [disabled]="p.stockDisponible === 0 || ajoutEnCours[p.idProduit]"
              (click)="ajouterAuPanier(p, $event)">
              <span *ngIf="!ajoutEnCours[p.idProduit]">🛒 Ajouter</span>
              <span *ngIf="ajoutEnCours[p.idProduit]">✓ Ajouté !</span>
            </button>
          </div>
        </div>

        <!-- Aucun produit -->
        <div class="mp-empty" *ngIf="page.produits.length === 0">
          <div class="mp-empty-icon">🌱</div>
          <h3>Aucun produit trouvé</h3>
          <p>Essayez de modifier vos filtres de recherche</p>
          <button class="mp-reset-btn" (click)="resetFiltres()">Effacer les filtres</button>
        </div>
      </div>

      <!-- Pagination -->
      <div class="mp-pagination" *ngIf="page.totalPages > 1">
        <button (click)="goPage(filtres.page! - 1)" [disabled]="filtres.page === 1">‹ Précédent</button>
        <span *ngFor="let p of pageNumbers()">
          <button [class.active]="p === filtres.page" (click)="goPage(p)">{{ p }}</button>
        </span>
        <button (click)="goPage(filtres.page! + 1)" [disabled]="filtres.page === page.totalPages">Suivant ›</button>
      </div>
    </main>
  </div>

  <!-- ════════════════════ DÉTAIL PRODUIT ════════════════════ -->
  <div class="mp-detail" *ngIf="vueActive === 'detail' && produitDetail">
    <button class="mp-back-btn" (click)="goTo('catalogue')">← Retour au catalogue</button>

    <div class="mp-detail-grid">
      <!-- Image -->
      <div class="mp-detail-img-col">
        <div class="mp-detail-img">
          <img *ngIf="produitDetail.imageUrl" [src]="produitDetail.imageUrl" [alt]="produitDetail.nom" (error)="onImgError($event)">
          <div class="mp-detail-img-ph" *ngIf="!produitDetail.imageUrl">{{ catIcon(produitDetail.categorie) }}</div>
        </div>
        <div class="mp-promo-tag" *ngIf="produitDetail.estEnPromotion">
          🏷️ Promotion -{{ promoPercent(produitDetail) }}%
        </div>
      </div>

      <!-- Info -->
      <div class="mp-detail-info">
        <span class="mp-detail-cat">{{ produitDetail.categorie }}</span>
        <h1 class="mp-detail-nom">{{ produitDetail.nom }}</h1>
        <p class="mp-detail-fab" *ngIf="produitDetail.fabricant">par {{ produitDetail.fabricant }}</p>

        <!-- Note -->
        <div class="mp-detail-stars" *ngIf="produitDetail.nombreAvis > 0">
          <span *ngFor="let s of stars(produitDetail.noteMoyenne)" [class]="s">★</span>
          <span class="mp-stars-count">{{ produitDetail.noteMoyenne | number:'1.1-1' }}/5 ({{ produitDetail.nombreAvis }} avis)</span>
        </div>

        <!-- Prix -->
        <div class="mp-detail-prix-bloc">
          <span class="mp-detail-prix">{{ produitDetail.prixEffectif | number:'1.2-2' }} TND</span>
          <span class="mp-detail-unite">/{{ produitDetail.unite }}</span>
          <span class="mp-detail-prix-ancien" *ngIf="produitDetail.estEnPromotion">{{ produitDetail.prix | number:'1.2-2' }} TND</span>
        </div>

        <!-- Stock -->
        <div class="mp-detail-stock" [class.low]="produitDetail.stockDisponible <= 5">
          {{ produitDetail.stockDisponible > 0 ? '✅ ' + produitDetail.stockDisponible + ' ' + produitDetail.unite + ' disponible(s)' : '❌ Rupture de stock' }}
        </div>

        <!-- Quantité + Ajouter -->
        <div class="mp-detail-actions">
          <div class="mp-qty">
            <button (click)="qtyDetail = qtyDetail > 1 ? qtyDetail - 1 : qtyDetail">−</button>

            <button (click)="qtyDetail = qtyDetail < produitDetail.stockDisponible ? qtyDetail + 1 : qtyDetail">+</button>
          </div>
          <button class="mp-btn-add-detail"
            [disabled]="produitDetail.stockDisponible === 0"
            (click)="ajouterAuPanierDetail()">
            🛒 Ajouter au panier — {{ (produitDetail.prixEffectif * qtyDetail) | number:'1.2-2' }} TND
          </button>
        </div>

        <!-- Infos produit -->
        <div class="mp-detail-specs">
          <div class="mp-spec" *ngIf="produitDetail.numeroAMM">
            <span class="mp-spec-label">N° AMM</span>
            <span class="mp-spec-val">{{ produitDetail.numeroAMM }}</span>
          </div>
          <div class="mp-spec" *ngIf="produitDetail.matieresActives">
            <span class="mp-spec-label">Matières actives</span>
            <span class="mp-spec-val">{{ produitDetail.matieresActives }}</span>
          </div>
          <div class="mp-spec" *ngIf="produitDetail.culturesCompatibles">
            <span class="mp-spec-label">Cultures</span>
            <span class="mp-spec-val">{{ produitDetail.culturesCompatibles }}</span>
          </div>
        </div>

        <div class="mp-detail-desc">
          <h4>Description</h4>
          <p>{{ produitDetail.description }}</p>
        </div>
      </div>
    </div>

    <!-- Avis section -->
    <div class="mp-avis-section">
      <h3>Avis clients ({{ avis.length }})</h3>

      <!-- Formulaire avis -->
      <div class="mp-avis-form">
        <h4>Laisser un avis</h4>
        <input type="text" class="mp-input" placeholder="Votre nom" [(ngModel)]="nouveauAvis.nomAuteur">
        <div class="mp-note-select">
          <span>Note : </span>
          <span *ngFor="let i of [1,2,3,4,5]"
            class="mp-star-btn"
            [class.active]="i <= nouveauAvis.note"
            (click)="nouveauAvis.note = i">★</span>
        </div>
        <textarea class="mp-textarea" placeholder="Votre commentaire (optionnel)" [(ngModel)]="nouveauAvis.commentaire" rows="3"></textarea>
        <button class="mp-btn-avis" (click)="soumettreAvis()" [disabled]="!nouveauAvis.nomAuteur || !nouveauAvis.note">
          Publier mon avis
        </button>
      </div>

      <!-- Liste avis -->
      <div class="mp-avis-list">
        <div class="mp-avis-item" *ngFor="let a of avis">
          <div class="mp-avis-header">
            <span class="mp-avis-auteur">{{ a.nomAuteur }}</span>
            <span class="mp-avis-verifie" *ngIf="a.verifie">✓ Achat vérifié</span>
            <div class="mp-stars-small">
              <span *ngFor="let s of stars(a.note)" [class]="s">★</span>
            </div>
            <span class="mp-avis-date">{{ a.dateAvis | date:'dd/MM/yyyy' }}</span>
          </div>
          <p class="mp-avis-comment" *ngIf="a.commentaire">{{ a.commentaire }}</p>
        </div>
        <div class="mp-empty-avis" *ngIf="avis.length === 0">Aucun avis pour ce produit. Soyez le premier !</div>
      </div>
    </div>
  </div>

  <!-- ════════════════════ PANIER SIDEBAR ════════════════════ -->
  <div class="mp-panier-overlay" *ngIf="panierOuvert" (click)="togglePanier()"></div>
  <div class="mp-panier-sidebar" [class.open]="panierOuvert">
    <div class="mp-panier-header">
      <h2>🛒 Mon Panier <span class="mp-panier-nb" *ngIf="nombreArticles">({{ nombreArticles }})</span></h2>
      <button class="mp-close-btn" (click)="togglePanier()">✕</button>
    </div>

    <div class="mp-panier-body" *ngIf="panier && panier.lignes.length > 0">
      <div class="mp-panier-ligne" *ngFor="let l of panier.lignes">
        <div class="mp-panier-img">
          <img *ngIf="l.imageUrl" [src]="l.imageUrl" [alt]="l.nomProduit" (error)="onImgError($event)">
          <span *ngIf="!l.imageUrl">📦</span>
        </div>
        <div class="mp-panier-info">
          <span class="mp-panier-nom">{{ l.nomProduit }}</span>
          <span class="mp-panier-pu">{{ l.prixUnitaire | number:'1.2-2' }} TND/{{ l.unite }}</span>
          <div class="mp-panier-qty">
            <button (click)="updateQty(l, l.quantite - 1)">−</button>
            <span>{{ l.quantite }}</span>
            <button (click)="updateQty(l, l.quantite + 1)" [disabled]="l.quantite >= l.stockDisponible">+</button>
          </div>
        </div>
        <div class="mp-panier-right">
          <span class="mp-panier-st">{{ l.sousTotal | number:'1.2-2' }} TND</span>
          <button class="mp-panier-del" (click)="supprimerLigne(l.idLignePanier)">🗑️</button>
        </div>
      </div>
    </div>

    <div class="mp-panier-empty" *ngIf="!panier || panier.lignes.length === 0">
      <div style="font-size:48px">🛒</div>
      <p>Votre panier est vide</p>
      <button class="mp-btn-continuer" (click)="togglePanier(); goTo('catalogue')">Parcourir le catalogue</button>
    </div>

    <div class="mp-panier-footer" *ngIf="panier && panier.lignes.length > 0">
      <div class="mp-panier-recap">
        <div class="mp-recap-row"><span>Sous-total</span><span>{{ panier.sousTotal | number:'1.2-2' }} TND</span></div>
        <div class="mp-recap-row"><span>Livraison</span>
          <span [class.free]="panier.fraisLivraison === 0">{{ panier.fraisLivraison === 0 ? 'Gratuite 🎉' : panier.fraisLivraison + ' TND' }}</span>
        </div>
        <div class="mp-recap-row mp-recap-total"><span>Total</span><span>{{ panier.total | number:'1.2-2' }} TND</span></div>
        <p class="mp-livraison-note" *ngIf="panier.fraisLivraison > 0">
          ➕ {{ (100 - panier.sousTotal) | number:'1.2-2' }} TND de plus pour la livraison gratuite
        </p>
      </div>
      <button class="mp-btn-commander" (click)="togglePanier(); goTo('checkout')">
        Passer la commande →
      </button>
      <button class="mp-btn-vider" (click)="viderPanier()">Vider le panier</button>
    </div>
  </div>

  <!-- ════════════════════ CHECKOUT ════════════════════ -->
  <div class="mp-checkout" *ngIf="vueActive === 'checkout'">
    <button class="mp-back-btn" (click)="togglePanier()">← Retour au panier</button>
    <h2 class="mp-section-title">🏠 Finaliser votre commande</h2>

    <div class="mp-checkout-grid">
      <!-- Formulaire -->
      <div class="mp-checkout-form">
        <form [formGroup]="checkoutForm" (ngSubmit)="passerCommande()">

          <div class="mp-form-section">
            <h3>👤 Informations personnelles</h3>
            <div class="mp-form-row">
              <div class="mp-form-group">
                <label>Nom complet *</label>
                <input type="text" class="mp-input" formControlName="nomClient" placeholder="Ex: Ahmed Ben Ali">
                <small *ngIf="checkoutForm.get('nomClient')?.invalid && checkoutForm.get('nomClient')?.touched" class="mp-err">Nom requis</small>
              </div>
              <div class="mp-form-group">
                <label>Téléphone *</label>
                <input type="tel" class="mp-input" formControlName="telephoneClient" placeholder="Ex: 55 123 456">
                <small *ngIf="checkoutForm.get('telephoneClient')?.invalid && checkoutForm.get('telephoneClient')?.touched" class="mp-err">Téléphone requis</small>
              </div>
            </div>
            <div class="mp-form-group">
              <label>Email *</label>
              <input type="email" class="mp-input" formControlName="emailClient" placeholder="votre@email.com">
            </div>
          </div>

          <div class="mp-form-section">
            <h3>📍 Adresse de livraison</h3>
            <div class="mp-form-group">
              <label>Adresse *</label>
              <input type="text" class="mp-input" formControlName="adresseLivraison" placeholder="Rue, numéro, quartier">
            </div>
            <div class="mp-form-row">
              <div class="mp-form-group">
                <label>Ville *</label>
                <input type="text" class="mp-input" formControlName="villeLivraison">
              </div>
              <div class="mp-form-group">
                <label>Gouvernorat *</label>
                <select class="mp-input" formControlName="gouvernoratLivraison">
                  <option value="">Sélectionner...</option>
                  <option *ngFor="let g of gouvernorats" [value]="g">{{ g }}</option>
                </select>
              </div>
              <div class="mp-form-group">
                <label>Code postal</label>
                <input type="text" class="mp-input" formControlName="codePostalLivraison">
              </div>
            </div>
          </div>

          <div class="mp-form-section">
            <h3>💳 Mode de paiement</h3>
            <div class="mp-paiement-options">
              <label class="mp-paiement-opt" *ngFor="let m of modesPaiement" [class.selected]="checkoutForm.get('modePaiement')?.value === m.value">
                <input type="radio" formControlName="modePaiement" [value]="m.value">
                <span class="mp-paiement-icon">{{ m.icon }}</span>
                <div>
                  <span class="mp-paiement-label">{{ m.label }}</span>
                  <span class="mp-paiement-desc">{{ m.desc }}</span>
                </div>
              </label>
            </div>
          </div>

          <div class="mp-form-group">
            <label>Notes (optionnel)</label>
            <textarea class="mp-textarea" formControlName="notesCommande" placeholder="Instructions de livraison, commentaires..." rows="2"></textarea>
          </div>

          <button type="submit" class="mp-btn-confirmer" [disabled]="checkoutForm.invalid || commandeEnCours">
            <span *ngIf="!commandeEnCours">✅ Confirmer la commande — {{ panier?.total | number:'1.2-2' }} TND</span>
            <span *ngIf="commandeEnCours">⏳ Traitement en cours...</span>
          </button>
        </form>
      </div>

      <!-- Récap commande -->
      <div class="mp-checkout-recap">
        <h3>📋 Récapitulatif</h3>
        <div class="mp-recap-items" *ngIf="panier">
          <div class="mp-recap-item" *ngFor="let l of panier.lignes">
            <span class="mp-ri-qty">{{ l.quantite }}×</span>
            <span class="mp-ri-nom">{{ l.nomProduit }}</span>
            <span class="mp-ri-prix">{{ l.sousTotal | number:'1.2-2' }} TND</span>
          </div>
          <hr>
          <div class="mp-recap-row"><span>Sous-total</span><span>{{ panier.sousTotal | number:'1.2-2' }} TND</span></div>
          <div class="mp-recap-row">
            <span>Livraison</span>
            <span [class.free]="panier.fraisLivraison===0">{{ panier.fraisLivraison===0 ? 'Gratuite 🎉' : panier.fraisLivraison+' TND' }}</span>
          </div>
          <div class="mp-recap-row mp-recap-total"><span>Total</span><span>{{ panier.total | number:'1.2-2' }} TND</span></div>
        </div>
        <div class="mp-checkout-garanties">
          <div class="mp-garantie">🔒 Paiement 100% sécurisé</div>
          <div class="mp-garantie">🚚 Livraison 24-48h</div>
          <div class="mp-garantie">✅ Produits certifiés AMM</div>
          <div class="mp-garantie">↩️ Retour sous 14 jours</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ════════════════════ CONFIRMATION ════════════════════ -->
  <div class="mp-confirmation" *ngIf="vueActive === 'confirmation' && commandeConfirmee">
    <div class="mp-confirm-card">
      <div class="mp-confirm-check">✅</div>
      <h2>Commande confirmée !</h2>
      <p class="mp-confirm-num">N° <strong>{{ commandeConfirmee.numeroCommande }}</strong></p>
      <p class="mp-confirm-msg">
        Merci {{ commandeConfirmee.nomClient }} ! Votre commande a bien été enregistrée.<br>
        Vous recevrez une confirmation à <strong>{{ commandeConfirmee.emailClient }}</strong>.
      </p>
      <div class="mp-confirm-recap">
        <div *ngFor="let l of commandeConfirmee.lignes" class="mp-ri">
          <span>{{ l.quantite }}× {{ l.nomProduit }}</span>
          <span>{{ l.sousTotal | number:'1.2-2' }} TND</span>
        </div>
        <hr>
        <div class="mp-ri mp-ri-total">
          <strong>Total</strong>
          <strong>{{ commandeConfirmee.total | number:'1.2-2' }} TND</strong>
        </div>
      </div>
      <div class="mp-confirm-timeline">
        <div class="mp-tl-step done">📥 Commande reçue</div>
        <div class="mp-tl-step">✅ Confirmation</div>
        <div class="mp-tl-step">📦 Préparation</div>
        <div class="mp-tl-step">🚚 Expédition</div>
        <div class="mp-tl-step">🏠 Livraison</div>
      </div>
      <div class="mp-confirm-actions">
        <button class="mp-btn-continuer" (click)="goTo('mescommandes')">Voir mes commandes</button>
        <button class="mp-btn-detail" (click)="goTo('catalogue')">Continuer les achats</button>
      </div>
    </div>
  </div>

  <!-- ════════════════════ MES COMMANDES ════════════════════ -->
  <div class="mp-mes-commandes" *ngIf="vueActive === 'mescommandes'">
    <h2 class="mp-section-title">📦 Mes Commandes</h2>

    <div class="mp-loader" *ngIf="chargementCommandes">
      <div class="mp-spinner"></div>
    </div>

    <div class="mp-commandes-list" *ngIf="!chargementCommandes">
      <div class="mp-commande-card" *ngFor="let c of mesCommandes" (click)="voirCommande(c)">
        <div class="mp-cmd-header">
          <span class="mp-cmd-num">{{ c.numeroCommande }}</span>
          <span class="mp-cmd-statut" [class]="'statut-' + c.statut.toLowerCase()">
            {{ statutIcon(c.statut) }} {{ c.statut }}
          </span>
        </div>
        <div class="mp-cmd-body">
          <span class="mp-cmd-date">{{ c.dateCommande | date:'dd/MM/yyyy HH:mm' }}</span>
          <span class="mp-cmd-items">{{ c.lignes.length }} article(s)</span>
          <span class="mp-cmd-total">{{ c.total | number:'1.2-2' }} TND</span>
        </div>
        <div class="mp-cmd-produits">
          <span *ngFor="let l of c.lignes.slice(0,3)">{{ l.nomProduit }}</span>
          <span *ngIf="c.lignes.length > 3">+{{ c.lignes.length - 3 }} autres</span>
        </div>
      </div>

      <div class="mp-empty" *ngIf="mesCommandes.length === 0">
        <div style="font-size:48px">📦</div>
        <h3>Aucune commande</h3>
        <p>Vous n'avez pas encore passé de commande.</p>
        <button class="mp-btn-continuer" (click)="goTo('catalogue')">Découvrir le catalogue</button>
      </div>
    </div>
  </div>

  <!-- ════════════════════ ADMIN ════════════════════ -->
  <div class="mp-admin" *ngIf="vueActive === 'admin'">
    <h2 class="mp-section-title">⚙️ Administration Marketplace</h2>

    <!-- Stats -->
    <div class="mp-admin-stats" *ngIf="stats">
      <div class="mp-stat-card mp-stat-green">
        <div class="mp-stat-val">{{ stats.totalProduits }}</div>
        <div class="mp-stat-lbl">Produits actifs</div>
      </div>
      <div class="mp-stat-card mp-stat-blue">
        <div class="mp-stat-val">{{ stats.totalCommandes }}</div>
        <div class="mp-stat-lbl">Commandes totales</div>
      </div>
      <div class="mp-stat-card mp-stat-orange">
        <div class="mp-stat-val">{{ stats.chiffreAffaires | number:'1.0-0' }} TND</div>
        <div class="mp-stat-lbl">Chiffre d'affaires</div>
      </div>
      <div class="mp-stat-card mp-stat-red">
        <div class="mp-stat-val">{{ stats.commandesEnAttente }}</div>
        <div class="mp-stat-lbl">En attente</div>
      </div>
    </div>

    <!-- Tabs admin -->
    <div class="mp-admin-tabs">
      <button [class.active]="adminTab==='produits'" (click)="adminTab='produits'">📦 Produits</button>
      <button [class.active]="adminTab==='commandes'" (click)="adminTab='commandes'; chargerCommandesAdmin()">📋 Commandes</button>
    </div>

    <!-- Tab Produits -->
    <div *ngIf="adminTab==='produits'">
      <button class="mp-btn-add-produit" (click)="ouvrirFormProduit()">+ Ajouter un produit</button>

      <!-- Formulaire ajout/édition -->
      <div class="mp-admin-form" *ngIf="formProduitOuvert">
        <h3>{{ editProduit ? 'Modifier' : 'Nouveau' }} Produit</h3>
        <div class="mp-form-row">
          <div class="mp-form-group"><label>Nom *</label><input type="text" class="mp-input" [(ngModel)]="produitForm.nom"></div>
          <div class="mp-form-group"><label>Catégorie *</label>
            <select class="mp-input" [(ngModel)]="produitForm.categorie">
              <option *ngFor="let c of categoriesList" [value]="c">{{ c }}</option>
            </select>
          </div>
        </div>
        <div class="mp-form-group"><label>Description</label><textarea class="mp-textarea" [(ngModel)]="produitForm.description" rows="3"></textarea></div>
        <div class="mp-form-row">
          <div class="mp-form-group"><label>Prix (TND) *</label><input type="number" class="mp-input" [(ngModel)]="produitForm.prix"></div>
          <div class="mp-form-group"><label>Unité</label>
            <select class="mp-input" [(ngModel)]="produitForm.unite">
              <option value="L">Litre (L)</option><option value="ml">mL</option>
              <option value="Kg">Kg</option><option value="g">g</option><option value="unité">Unité</option>
            </select>
          </div>
          <div class="mp-form-group"><label>Stock</label><input type="number" class="mp-input" [(ngModel)]="produitForm.stockDisponible"></div>
        </div>
        <div class="mp-form-row">
          <div class="mp-form-group"><label>Fabricant</label><input type="text" class="mp-input" [(ngModel)]="produitForm.fabricant"></div>
          <div class="mp-form-group"><label>N° AMM</label><input type="text" class="mp-input" [(ngModel)]="produitForm.numeroAMM"></div>
        </div>
        <div class="mp-form-row">
          <div class="mp-form-group"><label>Matières actives</label><input type="text" class="mp-input" [(ngModel)]="produitForm.matieresActives"></div>
          <div class="mp-form-group"><label>Cultures compatibles</label><input type="text" class="mp-input" [(ngModel)]="produitForm.culturesCompatibles"></div>
        </div>
        <div class="mp-form-group"><label>URL Image</label><input type="text" class="mp-input" [(ngModel)]="produitForm.imageUrl" placeholder="https://..."></div>
        <div class="mp-form-row">
          <label class="mp-checkbox"><input type="checkbox" [(ngModel)]="produitForm.estEnPromotion"><span>En promotion</span></label>
          <div class="mp-form-group" *ngIf="produitForm.estEnPromotion"><label>Prix promo</label><input type="number" class="mp-input" [(ngModel)]="produitForm.prixPromo"></div>
        </div>
        <div class="mp-form-actions">
          <button class="mp-btn-save" (click)="sauvegarderProduit()">💾 Sauvegarder</button>
          <button class="mp-btn-cancel" (click)="formProduitOuvert=false">Annuler</button>
        </div>
      </div>

      <!-- Table produits -->
      <div class="mp-admin-table-wrap">
        <table class="mp-admin-table">
          <thead>
            <tr><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Note</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of page.produits">
              <td>
                <div class="mp-tbl-produit">
                  <span class="mp-tbl-icon">{{ catIcon(p.categorie) }}</span>
                  <span>{{ p.nom }}</span>
                </div>
              </td>
              <td><span class="mp-badge-cat">{{ p.categorie }}</span></td>
              <td>
                <span *ngIf="!p.estEnPromotion">{{ p.prix | number:'1.2-2' }} TND</span>
                <span *ngIf="p.estEnPromotion"><del>{{ p.prix | number:'1.2-2' }}</del> <strong>{{ p.prixPromo | number:'1.2-2' }} TND</strong></span>
              </td>
              <td [class.low-stock]="p.stockDisponible <= 5">{{ p.stockDisponible }} {{ p.unite }}</td>
              <td>{{ p.noteMoyenne | number:'1.1-1' }}⭐ ({{ p.nombreAvis }})</td>
              <td>
                <button class="mp-tbl-btn edit" (click)="editerProduit(p)">✏️</button>
                <button class="mp-tbl-btn del" (click)="supprimerProduit(p.idProduit)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tab Commandes admin -->
    <div *ngIf="adminTab==='commandes'">
      <div class="mp-admin-table-wrap">
        <table class="mp-admin-table">
          <thead>
            <tr><th>N° Commande</th><th>Client</th><th>Total</th><th>Statut</th><th>Date</th><th>Action</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of commandesAdmin">
              <td><strong>{{ c.numeroCommande }}</strong></td>
              <td>{{ c.nomClient }}<br><small>{{ c.emailClient }}</small></td>
              <td><strong>{{ c.total | number:'1.2-2' }} TND</strong></td>
              <td>
                <select class="mp-statut-select" [value]="c.statut" (change)="changerStatut(c, $event)">
                  <option *ngFor="let s of statuts" [value]="s">{{ s }}</option>
                </select>
              </td>
              <td>{{ c.dateCommande | date:'dd/MM/yy HH:mm' }}</td>
              <td><button class="mp-tbl-btn" (click)="voirCommande(c)">👁️</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Toast notifications -->
  <div class="mp-toast" [class.show]="toastVisible" [class]="'mp-toast ' + toastType + (toastVisible ? ' show' : '')">
    {{ toastMsg }}
  </div>
</div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════════════════════ */
    /*  MARKETPLACE — Design organique & premium                   */
    /* ═══════════════════════════════════════════════════════════ */
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');

    :host { display: block; }

    .mp-root {
      font-family: 'DM Sans', sans-serif;
      background: #f7f8f3;
      min-height: 100vh;
      color: #1a2010;
    }

    /* ── Header ── */
    .mp-header {
      background: #1a2e1a;
      position: sticky; top: 0; z-index: 100;
      box-shadow: 0 2px 20px rgba(0,0,0,0.2);
    }

    .mp-header-inner {
      max-width: 1400px; margin: 0 auto;
      padding: 0 24px; height: 68px;
      display: flex; align-items: center; gap: 20px;
    }

    .mp-brand {
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; flex-shrink: 0;
    }

    .mp-brand-icon { font-size: 28px; }

    .mp-brand-title {
      font-family: 'Fraunces', serif;
      color: white; font-size: 20px; font-weight: 700;
      display: block; line-height: 1.1;
    }

    .mp-brand-sub { color: #7ab878; font-size: 10px; display: block; }

    .mp-search-bar {
      flex: 1; max-width: 600px;
      display: flex; align-items: center;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 50px; padding: 0 16px;
      transition: all .2s;
    }

    .mp-search-bar:focus-within {
      background: white; border-color: #4ba293;
      box-shadow: 0 0 0 3px rgba(75,162,147,.2);
    }

    .mp-search-bar:focus-within .mp-search-icon { color: #4ba293; }

    .mp-search-icon { color: rgba(255,255,255,.6); margin-right: 8px; font-size: 14px; }

    .mp-search-input {
      flex: 1; background: none; border: none; outline: none;
      color: white; font-size: 14px; padding: 10px 0;
      font-family: 'DM Sans', sans-serif;
    }

    .mp-search-bar:focus-within .mp-search-input { color: #1a2010; }

    .mp-search-clear { background: none; border: none; color: rgba(255,255,255,.5); cursor: pointer; font-size: 12px; }
    .mp-search-bar:focus-within .mp-search-clear { color: #999; }

    .mp-header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

    .mp-nav-btn {
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,.8); padding: 8px 14px; border-radius: 8px;
      cursor: pointer; font-size: 12px; font-weight: 600;
      transition: all .2s; font-family: 'DM Sans', sans-serif;
    }

    .mp-nav-btn:hover, .mp-nav-btn.active { background: rgba(75,162,147,.3); border-color: #4ba293; color: white; }
    .mp-admin-btn { background: rgba(255,160,0,.1); border-color: rgba(255,160,0,.2); }

    .mp-panier-btn {
      display: flex; align-items: center; gap: 8px;
      background: #4ba293; border: none; color: white;
      padding: 10px 18px; border-radius: 50px;
      cursor: pointer; font-size: 14px; font-weight: 700;
      position: relative; transition: all .2s;
      font-family: 'DM Sans', sans-serif;
    }

    .mp-panier-btn:hover { background: #3a8478; transform: translateY(-1px); }

    .mp-panier-badge {
      position: absolute; top: -6px; right: -6px;
      background: #e74c3c; color: white;
      width: 20px; height: 20px; border-radius: 50%;
      font-size: 11px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
    }

    .mp-panier-total { font-size: 12px; opacity: .85; }

    /* ── Layout catalogue ── */
    .mp-body { display: flex; max-width: 1400px; margin: 0 auto; padding: 24px; gap: 24px; }

    /* ── Filtres ── */
    .mp-filters {
      width: 240px; flex-shrink: 0;
      background: white; border-radius: 16px;
      padding: 20px; height: fit-content;
      box-shadow: 0 2px 12px rgba(0,0,0,.06);
      position: sticky; top: 92px;
    }

    .mp-filters-title { font-family: 'Fraunces', serif; font-size: 18px; margin-bottom: 20px; color: #1a2010; }

    .mp-filter-group { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f0f0eb; }
    .mp-filter-group:last-child { border-bottom: none; margin-bottom: 0; }

    .mp-filter-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; display: block; margin-bottom: 10px; }

    .mp-cat-list { display: flex; flex-direction: column; gap: 4px; }

    .mp-cat-btn {
      text-align: left; padding: 8px 12px; border: none;
      background: transparent; border-radius: 8px;
      font-size: 13px; cursor: pointer; transition: all .15s;
      color: #444; font-family: 'DM Sans', sans-serif;
    }

    .mp-cat-btn:hover { background: #f5faf5; }
    .mp-cat-btn.active { background: #e8f5e8; color: #2e7d32; font-weight: 600; }

    .mp-prix-range { display: flex; align-items: center; gap: 8px; }
    .mp-prix-input { width: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }

    .mp-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; padding: 4px 0; }
    .mp-checkbox input { width: 16px; height: 16px; cursor: pointer; }

    .mp-reset-btn {
      width: 100%; padding: 10px; background: #f0f0eb;
      border: none; border-radius: 8px; cursor: pointer;
      font-size: 13px; color: #666; transition: all .15s;
      font-family: 'DM Sans', sans-serif;
    }

    .mp-reset-btn:hover { background: #e8e8e0; }

    /* ── Produits main ── */
    .mp-main { flex: 1; }

    .mp-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px;
    }

    .mp-count { font-size: 13px; color: #888; }

    .mp-sort { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #888; }

    .mp-sort-select {
      padding: 7px 12px; border: 1px solid #ddd;
      border-radius: 8px; font-size: 13px;
      background: white; cursor: pointer;
      font-family: 'DM Sans', sans-serif;
    }

    /* ── Grille produits ── */
    .mp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 18px;
    }

    .mp-produit-card {
      background: white; border-radius: 16px;
      overflow: hidden; cursor: pointer;
      transition: all .25s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,.06);
      display: flex; flex-direction: column;
      position: relative;
    }

    .mp-produit-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0,0,0,.12);
    }

    .mp-promo-badge {
      position: absolute; top: 12px; left: 12px;
      background: #e74c3c; color: white;
      font-size: 11px; font-weight: 800;
      padding: 4px 10px; border-radius: 20px;
      z-index: 1;
    }

    .mp-card-img {
      height: 160px; background: #f5faf5;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }

    .mp-card-img img { width: 100%; height: 100%; object-fit: cover; }
    .mp-card-img-placeholder { font-size: 56px; }

    .mp-card-body { padding: 14px; flex: 1; }

    .mp-card-cat {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .8px; color: #4ba293; display: block; margin-bottom: 6px;
    }

    .mp-card-nom { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 600; color: #1a2010; margin: 0 0 4px; line-height: 1.3; }
    .mp-card-fabricant { font-size: 11px; color: #999; margin: 0 0 8px; }

    .mp-stars { display: flex; align-items: center; gap: 1px; margin-bottom: 8px; }
    .mp-stars .full { color: #f59c26; font-size: 13px; }
    .mp-stars .half { color: #f59c26; font-size: 13px; opacity: .6; }
    .mp-stars .empty { color: #ddd; font-size: 13px; }
    .mp-stars-count { font-size: 11px; color: #999; margin-left: 4px; }

    .mp-card-prix { display: flex; align-items: baseline; gap: 6px; margin-bottom: 8px; }
    .mp-prix-effectif { font-size: 18px; font-weight: 800; color: #1a2010; }
    .mp-prix-barre { font-size: 12px; color: #bbb; text-decoration: line-through; }
    .mp-unite { font-size: 11px; color: #999; }

    .mp-stock { font-size: 11px; font-weight: 600; }
    .mp-stock-low { color: #f59c26; }
    .mp-stock-out { color: #e74c3c; }

    .mp-card-footer {
      display: flex; gap: 8px; padding: 12px 14px;
      border-top: 1px solid #f5f5f0;
    }

    .mp-btn-detail {
      flex: 1; padding: 9px; background: #f5faf5;
      border: 1px solid #dceede; border-radius: 8px;
      cursor: pointer; font-size: 12px; font-weight: 600; color: #2e7d32;
      transition: all .15s; font-family: 'DM Sans', sans-serif;
    }

    .mp-btn-detail:hover { background: #e8f5e8; }

    .mp-btn-add {
      flex: 1; padding: 9px; background: #4ba293;
      border: none; border-radius: 8px;
      cursor: pointer; font-size: 12px; font-weight: 700; color: white;
      transition: all .2s; font-family: 'DM Sans', sans-serif;
    }

    .mp-btn-add:hover:not(:disabled) { background: #3a8478; }
    .mp-btn-add:disabled { background: #ccc; cursor: not-allowed; }

    /* ── Empty state ── */
    .mp-empty {
      grid-column: 1/-1; text-align: center;
      padding: 60px 20px; color: #888;
    }

    .mp-empty-icon { font-size: 64px; margin-bottom: 16px; }

    /* ── Pagination ── */
    .mp-pagination {
      display: flex; justify-content: center; align-items: center;
      gap: 6px; margin-top: 32px;
    }

    .mp-pagination button {
      padding: 8px 14px; border: 1px solid #ddd;
      border-radius: 8px; background: white; cursor: pointer;
      font-size: 13px; transition: all .15s;
      font-family: 'DM Sans', sans-serif;
    }

    .mp-pagination button.active { background: #4ba293; color: white; border-color: #4ba293; }
    .mp-pagination button:hover:not(.active):not(:disabled) { background: #f5f5f0; }
    .mp-pagination button:disabled { opacity: .4; cursor: not-allowed; }

    /* ── Loader ── */
    .mp-loader { text-align: center; padding: 60px; color: #888; }

    .mp-spinner {
      width: 40px; height: 40px; margin: 0 auto 16px;
      border: 3px solid #e0e0e0; border-top-color: #4ba293;
      border-radius: 50%; animation: spin .8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Détail ── */
    .mp-detail {
      max-width: 1200px; margin: 0 auto;
      padding: 24px;
    }

    .mp-back-btn {
      background: none; border: 1px solid #ddd; padding: 8px 16px;
      border-radius: 8px; cursor: pointer; font-size: 13px; color: #666;
      margin-bottom: 24px; transition: all .15s;
      font-family: 'DM Sans', sans-serif;
    }

    .mp-back-btn:hover { background: #f5f5f0; }

    .mp-detail-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 40px; margin-bottom: 40px; }

    .mp-detail-img { background: white; border-radius: 20px; overflow: hidden; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
    .mp-detail-img img { width: 100%; height: 100%; object-fit: cover; }
    .mp-detail-img-ph { font-size: 100px; }

    .mp-promo-tag { background: #ffeaea; color: #e74c3c; padding: 10px 16px; border-radius: 10px; text-align: center; font-weight: 700; margin-top: 12px; }

    .mp-detail-cat { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #4ba293; display: block; margin-bottom: 8px; }
    .mp-detail-nom { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 700; color: #1a2010; margin: 0 0 8px; line-height: 1.15; }
    .mp-detail-fab { color: #888; font-size: 14px; margin-bottom: 16px; }

    .mp-detail-stars { display: flex; align-items: center; gap: 3px; margin-bottom: 20px; font-size: 18px; }
    .mp-detail-stars .full { color: #f59c26; }
    .mp-detail-stars .half { color: #f59c26; opacity: .6; }
    .mp-detail-stars .empty { color: #ddd; }

    .mp-detail-prix-bloc { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
    .mp-detail-prix { font-family: 'Fraunces', serif; font-size: 38px; font-weight: 700; color: #1a2010; }
    .mp-detail-unite { font-size: 14px; color: #888; }
    .mp-detail-prix-ancien { font-size: 18px; color: #bbb; text-decoration: line-through; }

    .mp-detail-stock { font-size: 14px; font-weight: 600; margin-bottom: 24px; }
    .mp-detail-stock.low { color: #f59c26; }

    .mp-detail-actions { display: flex; gap: 16px; margin-bottom: 28px; }

    .mp-qty {
      display: flex; align-items: center;
      background: white; border: 2px solid #ddd;
      border-radius: 12px; overflow: hidden;
    }

    .mp-qty button {
      background: none; border: none; padding: 10px 16px;
      cursor: pointer; font-size: 20px; color: #4ba293;
      transition: background .15s;
    }

    .mp-qty button:hover { background: #f5faf5; }
    .mp-qty input { width: 50px; text-align: center; border: none; font-size: 16px; font-weight: 700; outline: none; }

    .mp-btn-add-detail {
      flex: 1; padding: 14px 24px; background: #1a2e1a;
      border: none; border-radius: 12px; color: white;
      font-size: 15px; font-weight: 700; cursor: pointer;
      transition: all .2s; font-family: 'DM Sans', sans-serif;
    }

    .mp-btn-add-detail:hover:not(:disabled) { background: #2d4a2d; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,.2); }
    .mp-btn-add-detail:disabled { background: #ccc; cursor: not-allowed; transform: none; }

    .mp-detail-specs { background: #f9faf5; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; }
    .mp-spec { display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px solid #eee; }
    .mp-spec:last-child { border-bottom: none; }
    .mp-spec-label { font-size: 12px; font-weight: 700; color: #888; width: 140px; flex-shrink: 0; }
    .mp-spec-val { font-size: 13px; color: #333; }

    .mp-detail-desc h4 { font-size: 14px; font-weight: 700; margin-bottom: 8px; }
    .mp-detail-desc p { font-size: 14px; color: #555; line-height: 1.7; }

    /* ── Avis ── */
    .mp-avis-section { border-top: 1px solid #eee; padding-top: 32px; }
    .mp-avis-section h3 { font-family: 'Fraunces', serif; font-size: 22px; margin-bottom: 24px; }

    .mp-avis-form { background: white; border-radius: 16px; padding: 20px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .mp-avis-form h4 { margin-bottom: 14px; }

    .mp-note-select { display: flex; align-items: center; gap: 4px; margin: 12px 0; }
    .mp-star-btn { font-size: 24px; cursor: pointer; color: #ddd; transition: color .15s; }
    .mp-star-btn.active { color: #f59c26; }

    .mp-btn-avis {
      background: #4ba293; color: white; border: none;
      padding: 10px 24px; border-radius: 8px; cursor: pointer;
      font-size: 14px; font-weight: 700; margin-top: 12px;
      font-family: 'DM Sans', sans-serif; transition: all .2s;
    }

    .mp-btn-avis:hover:not(:disabled) { background: #3a8478; }
    .mp-btn-avis:disabled { background: #ccc; cursor: not-allowed; }

    .mp-avis-item { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .mp-avis-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
    .mp-avis-auteur { font-weight: 700; font-size: 14px; }
    .mp-avis-verifie { font-size: 11px; color: #4ba293; background: #e8f5f0; padding: 2px 8px; border-radius: 10px; }
    .mp-stars-small { display: flex; gap: 1px; }
    .mp-stars-small .full { color: #f59c26; font-size: 14px; }
    .mp-stars-small .half { color: #f59c26; font-size: 14px; opacity: .6; }
    .mp-stars-small .empty { color: #ddd; font-size: 14px; }
    .mp-avis-date { font-size: 11px; color: #bbb; margin-left: auto; }
    .mp-avis-comment { font-size: 13px; color: #555; line-height: 1.6; }
    .mp-empty-avis { color: #aaa; font-size: 14px; padding: 20px 0; }

    /* ── Panier Sidebar ── */
    .mp-panier-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 200; }

    .mp-panier-sidebar {
      position: fixed; top: 0; right: -460px; width: 460px; height: 100vh;
      background: white; z-index: 300;
      display: flex; flex-direction: column;
      box-shadow: -4px 0 40px rgba(0,0,0,.15);
      transition: right .3s cubic-bezier(.16,1,.3,1);
    }

    .mp-panier-sidebar.open { right: 0; }

    .mp-panier-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid #f0f0eb;
      background: #1a2e1a; color: white;
    }

    .mp-panier-header h2 { font-family: 'Fraunces', serif; font-size: 20px; margin: 0; }
    .mp-panier-nb { font-size: 14px; opacity: .7; }

    .mp-close-btn { background: none; border: none; color: rgba(255,255,255,.7); font-size: 18px; cursor: pointer; padding: 4px; }

    .mp-panier-body { flex: 1; overflow-y: auto; padding: 16px; }

    .mp-panier-ligne {
      display: flex; gap: 12px; padding: 14px 0;
      border-bottom: 1px solid #f5f5f0; align-items: center;
    }

    .mp-panier-img {
      width: 60px; height: 60px; border-radius: 10px;
      background: #f5faf5; display: flex; align-items: center; justify-content: center;
      overflow: hidden; flex-shrink: 0; font-size: 24px;
    }

    .mp-panier-img img { width: 100%; height: 100%; object-fit: cover; }

    .mp-panier-info { flex: 1; }
    .mp-panier-nom { font-size: 13px; font-weight: 600; color: #1a2010; display: block; margin-bottom: 3px; }
    .mp-panier-pu { font-size: 11px; color: #888; display: block; margin-bottom: 8px; }

    .mp-panier-qty { display: flex; align-items: center; gap: 8px; }
    .mp-panier-qty button { width: 28px; height: 28px; border: 1px solid #ddd; border-radius: 6px; background: white; cursor: pointer; font-size: 16px; }
    .mp-panier-qty button:disabled { opacity: .4; cursor: not-allowed; }
    .mp-panier-qty span { font-size: 14px; font-weight: 700; min-width: 20px; text-align: center; }

    .mp-panier-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    .mp-panier-st { font-size: 15px; font-weight: 800; color: #1a2010; }
    .mp-panier-del { background: none; border: none; cursor: pointer; font-size: 16px; opacity: .5; transition: opacity .15s; }
    .mp-panier-del:hover { opacity: 1; }

    .mp-panier-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #888; }

    .mp-panier-footer { padding: 16px 20px; border-top: 2px solid #f0f0eb; }

    .mp-panier-recap { margin-bottom: 16px; }
    .mp-recap-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .mp-recap-total { font-weight: 800; font-size: 17px; border-top: 1px solid #eee; padding-top: 10px; margin-top: 4px; }
    .mp-recap-row .free { color: #27ae60; font-weight: 700; }

    .mp-livraison-note { font-size: 11px; color: #4ba293; background: #e8f5f0; padding: 8px 12px; border-radius: 8px; margin-top: 8px; }

    .mp-btn-commander {
      width: 100%; padding: 15px; background: #1a2e1a;
      border: none; border-radius: 12px; color: white;
      font-size: 16px; font-weight: 700; cursor: pointer;
      transition: all .2s; margin-bottom: 8px;
      font-family: 'DM Sans', sans-serif;
    }

    .mp-btn-commander:hover { background: #2d4a2d; transform: translateY(-1px); }

    .mp-btn-vider {
      width: 100%; padding: 10px; background: transparent;
      border: 1px solid #ddd; border-radius: 8px;
      cursor: pointer; font-size: 13px; color: #e74c3c;
      font-family: 'DM Sans', sans-serif; transition: all .15s;
    }

    .mp-btn-vider:hover { background: #ffeaea; border-color: #e74c3c; }
    .mp-btn-continuer { background: #4ba293; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; font-family: 'DM Sans', sans-serif; }

    /* ── Checkout ── */
    .mp-checkout { max-width: 1200px; margin: 0 auto; padding: 24px; }

    .mp-section-title { font-family: 'Fraunces', serif; font-size: 28px; margin-bottom: 24px; color: #1a2010; }

    .mp-checkout-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; }

    .mp-form-section { background: white; border-radius: 16px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .mp-form-section h3 { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #1a2010; }

    .mp-form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }

    .mp-form-group { display: flex; flex-direction: column; gap: 6px; }
    .mp-form-group label { font-size: 12px; font-weight: 700; color: #666; }

    .mp-input {
      padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 14px; outline: none; transition: border-color .2s;
      font-family: 'DM Sans', sans-serif; background: white;
    }

    .mp-input:focus { border-color: #4ba293; box-shadow: 0 0 0 3px rgba(75,162,147,.1); }

    .mp-textarea {
      padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 14px; outline: none; resize: vertical;
      font-family: 'DM Sans', sans-serif; transition: border-color .2s;
    }

    .mp-textarea:focus { border-color: #4ba293; }

    .mp-err { color: #e74c3c; font-size: 11px; }

    .mp-paiement-options { display: flex; flex-direction: column; gap: 10px; }

    .mp-paiement-opt {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; border: 2px solid #eee;
      border-radius: 10px; cursor: pointer; transition: all .15s;
    }

    .mp-paiement-opt.selected { border-color: #4ba293; background: #e8f5f0; }
    .mp-paiement-opt input { display: none; }
    .mp-paiement-icon { font-size: 22px; }
    .mp-paiement-label { font-weight: 700; font-size: 14px; display: block; }
    .mp-paiement-desc { font-size: 11px; color: #888; }

    .mp-btn-confirmer {
      width: 100%; padding: 16px; background: #1a2e1a;
      border: none; border-radius: 12px; color: white;
      font-size: 16px; font-weight: 700; cursor: pointer;
      transition: all .2s; margin-top: 16px;
      font-family: 'DM Sans', sans-serif;
    }

    .mp-btn-confirmer:hover:not(:disabled) { background: #2d4a2d; }
    .mp-btn-confirmer:disabled { background: #ccc; cursor: not-allowed; }

    .mp-checkout-recap {
      background: white; border-radius: 16px; padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,.06);
      height: fit-content; position: sticky; top: 92px;
    }

    .mp-checkout-recap h3 { font-size: 16px; font-weight: 700; margin-bottom: 16px; }

    .mp-recap-items { margin-bottom: 16px; }
    .mp-recap-item { display: flex; gap: 8px; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f5f5f0; }
    .mp-ri-qty { color: #888; flex-shrink: 0; }
    .mp-ri-nom { flex: 1; }
    .mp-ri-prix { font-weight: 700; flex-shrink: 0; }
    .mp-recap-row .free { color: #27ae60; font-weight: 700; }

    .mp-checkout-garanties { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #eee; }
    .mp-garantie { font-size: 12px; color: #666; }

    /* ── Confirmation ── */
    .mp-confirmation { max-width: 640px; margin: 40px auto; padding: 24px; }

    .mp-confirm-card {
      background: white; border-radius: 24px; padding: 40px;
      text-align: center; box-shadow: 0 8px 40px rgba(0,0,0,.1);
    }

    .mp-confirm-check { font-size: 64px; margin-bottom: 16px; }
    .mp-confirm-card h2 { font-family: 'Fraunces', serif; font-size: 28px; margin-bottom: 8px; }
    .mp-confirm-num { font-size: 18px; color: #4ba293; font-weight: 700; margin-bottom: 12px; }
    .mp-confirm-msg { font-size: 14px; color: #666; line-height: 1.7; margin-bottom: 24px; }

    .mp-confirm-recap { text-align: left; background: #f9faf5; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
    .mp-ri { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .mp-ri-total { font-size: 16px; padding-top: 10px; }

    .mp-confirm-timeline {
      display: flex; justify-content: space-between; margin-bottom: 28px;
      padding: 16px; background: #f9faf5; border-radius: 12px;
    }

    .mp-tl-step { font-size: 11px; text-align: center; color: #bbb; }
    .mp-tl-step.done { color: #4ba293; font-weight: 700; }

    .mp-confirm-actions { display: flex; gap: 12px; justify-content: center; }

    /* ── Mes commandes ── */
    .mp-mes-commandes { max-width: 900px; margin: 0 auto; padding: 24px; }

    .mp-commandes-list { display: flex; flex-direction: column; gap: 12px; }

    .mp-commande-card {
      background: white; border-radius: 16px; padding: 20px;
      cursor: pointer; transition: all .2s;
      box-shadow: 0 2px 8px rgba(0,0,0,.06);
    }

    .mp-commande-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,.1); transform: translateY(-1px); }

    .mp-cmd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .mp-cmd-num { font-family: 'Fraunces', serif; font-size: 16px; font-weight: 700; }
    .mp-cmd-statut { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .statut-enattente { background: #fff3cd; color: #856404; }
    .statut-confirmee { background: #d4edda; color: #155724; }
    .statut-enpreparation { background: #cce5ff; color: #004085; }
    .statut-expediee { background: #d1ecf1; color: #0c5460; }
    .statut-livree { background: #d4edda; color: #155724; }
    .statut-annulee { background: #f8d7da; color: #721c24; }

    .mp-cmd-body { display: flex; gap: 20px; font-size: 13px; color: #888; margin-bottom: 10px; }
    .mp-cmd-total { color: #1a2010; font-weight: 800; }

    .mp-cmd-produits { display: flex; flex-wrap: wrap; gap: 8px; }
    .mp-cmd-produits span { font-size: 12px; background: #f5faf5; color: #4ba293; padding: 4px 10px; border-radius: 20px; }

    /* ── Admin ── */
    .mp-admin { max-width: 1400px; margin: 0 auto; padding: 24px; }

    .mp-admin-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }

    .mp-stat-card { background: white; border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .mp-stat-val { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 700; }
    .mp-stat-lbl { font-size: 12px; color: #888; margin-top: 4px; }
    .mp-stat-green .mp-stat-val { color: #27ae60; }
    .mp-stat-blue .mp-stat-val { color: #2980b9; }
    .mp-stat-orange .mp-stat-val { color: #e67e22; }
    .mp-stat-red .mp-stat-val { color: #e74c3c; }

    .mp-admin-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: #f0f0eb; padding: 4px; border-radius: 12px; width: fit-content; }
    .mp-admin-tabs button { padding: 10px 20px; border: none; border-radius: 8px; background: transparent; cursor: pointer; font-size: 14px; font-weight: 600; font-family: 'DM Sans', sans-serif; }
    .mp-admin-tabs button.active { background: white; box-shadow: 0 2px 8px rgba(0,0,0,.08); }

    .mp-btn-add-produit {
      background: #1a2e1a; color: white; border: none;
      padding: 12px 24px; border-radius: 10px; cursor: pointer;
      font-size: 14px; font-weight: 700; margin-bottom: 16px;
      font-family: 'DM Sans', sans-serif; transition: all .2s;
    }

    .mp-btn-add-produit:hover { background: #2d4a2d; }

    .mp-admin-form { background: white; border-radius: 16px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 12px rgba(0,0,0,.08); border: 2px solid #4ba293; }
    .mp-admin-form h3 { margin-bottom: 20px; font-family: 'Fraunces', serif; font-size: 20px; }

    .mp-form-actions { display: flex; gap: 12px; margin-top: 16px; }
    .mp-btn-save { background: #4ba293; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 700; font-family: 'DM Sans', sans-serif; }
    .mp-btn-cancel { background: transparent; border: 1px solid #ddd; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; }

    .mp-admin-table-wrap { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
    .mp-admin-table { width: 100%; border-collapse: collapse; }
    .mp-admin-table th { padding: 14px 16px; background: #f9faf5; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #888; text-align: left; border-bottom: 1px solid #eee; }
    .mp-admin-table td { padding: 14px 16px; border-bottom: 1px solid #f5f5f0; font-size: 13px; }
    .mp-admin-table tr:hover td { background: #fafafa; }

    .mp-tbl-produit { display: flex; align-items: center; gap: 10px; }
    .mp-tbl-icon { font-size: 20px; }

    .mp-badge-cat { background: #e8f5e8; color: #2e7d32; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }

    .low-stock { color: #e74c3c; font-weight: 700; }

    .mp-tbl-btn { background: none; border: 1px solid #eee; padding: 6px 10px; border-radius: 6px; cursor: pointer; margin: 0 2px; transition: all .15s; }
    .mp-tbl-btn:hover { background: #f5f5f0; }
    .mp-tbl-btn.del:hover { background: #ffeaea; border-color: #e74c3c; }

    .mp-statut-select { border: 1px solid #ddd; padding: 6px 10px; border-radius: 6px; font-size: 12px; background: white; cursor: pointer; font-family: 'DM Sans', sans-serif; }

    /* ── Toast ── */
    .mp-toast {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%) translateY(80px);
      padding: 13px 28px; border-radius: 50px;
      font-size: 14px; font-weight: 700;
      box-shadow: 0 8px 32px rgba(0,0,0,.2);
      opacity: 0; transition: all .4s cubic-bezier(.34,1.56,.64,1);
      z-index: 9999; pointer-events: none;
      font-family: 'DM Sans', sans-serif; white-space: nowrap;
    }

    .mp-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    .mp-toast.success { background: #1a2e1a; color: white; }
    .mp-toast.error { background: #e74c3c; color: white; }
    .mp-toast.info { background: #2980b9; color: white; }

    /* ── Responsive ── */
    @media (max-width: 1024px) {
      .mp-body { flex-direction: column; }
      .mp-filters { width: 100%; position: static; display: flex; flex-wrap: wrap; gap: 16px; }
      .mp-filter-group { margin: 0; padding: 0; border: none; }
      .mp-detail-grid { grid-template-columns: 1fr; }
      .mp-checkout-grid { grid-template-columns: 1fr; }
      .mp-admin-stats { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 640px) {
      .mp-header-inner { padding: 0 12px; gap: 10px; }
      .mp-nav-btn { display: none; }
      .mp-panier-sidebar { width: 100%; right: -100%; }
      .mp-admin-stats { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class MarketplaceComponent implements OnInit, OnDestroy {

  vueActive: Vue = 'catalogue';
  panierOuvert = false;
  chargement = false;
  chargementCommandes = false;
  commandeEnCours = false;
  adminTab: 'produits' | 'commandes' = 'produits';
  formProduitOuvert = false;
  editProduit: Produit | null = null;

  page: ProduitPage = { produits: [], total: 0, page: 1, totalPages: 0 };
  panier: Panier | null = null;
  mesCommandes: Commande[] = [];
  commandesAdmin: Commande[] = [];
  commandeConfirmee: Commande | null = null;
  produitDetail: Produit | null = null;
  avis: Avis[] = [];
  categories: string[] = [];
  stats: any = null;

  filtres: FiltresProduit = { page: 1, taillePage: 12, tri: 'recent' };
  rechercheTexte = '';
  qtyDetail = 1;
  nombreArticles = 0;
  ajoutEnCours: Record<number, boolean> = {};

  nouveauAvis = { nomAuteur: '', note: 0, commentaire: '' };

  checkoutForm: FormGroup;

  private searchSubject = new Subject<string>();
  private subs: Subscription[] = [];

  categoriesList = ['Fongicide', 'Insecticide', 'Herbicide', 'Acaricide', 'Engrais', 'Régulateur de croissance', 'Nématicide', 'Molluscicide'];

  gouvernorats = ['Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan','Kasserine','Kébili','Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan'];

  modesPaiement = [
    { value: 'A la livraison', icon: '💵', label: 'Paiement à la livraison', desc: 'Payez en espèces à la réception' },
    { value: 'Virement', icon: '🏦', label: 'Virement bancaire', desc: 'Virement sur notre compte BIAT' },
    { value: 'CB', icon: '💳', label: 'Carte bancaire', desc: 'Visa, Mastercard — Paiement sécurisé' },
  ];

  statuts = ['EnAttente','Confirmee','EnPreparation','Expediee','Livree','Annulee'];

  produitForm: any = { nom: '', description: '', categorie: 'Fongicide', prix: 0, unite: 'L', stockDisponible: 0, fabricant: '', numeroAMM: '', matieresActives: '', culturesCompatibles: '', imageUrl: '', estEnPromotion: false, prixPromo: null };

  private readonly marketplaceService = inject(MarketplaceService);
  private readonly fb = inject(FormBuilder);

  constructor() {
    this.checkoutForm = this.fb.group({
      nomClient:            ['', Validators.required],
      emailClient:          ['', [Validators.required, Validators.email]],
      telephoneClient:      ['', Validators.required],
      adresseLivraison:     ['', Validators.required],
      villeLivraison:       ['', Validators.required],
      gouvernoratLivraison: ['', Validators.required],
      codePostalLivraison:  [''],
      modePaiement:         ['A la livraison', Validators.required],
      notesCommande:        ['']
    });
  }

  ngOnInit(): void {
    this.chargerProduits();
    this.chargerCategories();
    this.chargerStats();

    this.subs.push(
      this.marketplaceService.panier$.subscribe(p => {
        this.panier = p;
        this.nombreArticles = p?.nombreArticles || 0;
      }),
      this.searchSubject.pipe(debounceTime(400)).subscribe(v => {
        this.filtres.recherche = v;
        this.filtres.page = 1;
        this.chargerProduits();
      })
    );

    this.chargerMesCommandes();
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }


  // ── Navigation ────────────────────────────────────────────────────────────
  goTo(vue: Vue): void { this.vueActive = vue; window.scrollTo(0, 0); }

  togglePanier(): void { this.panierOuvert = !this.panierOuvert; }

  // ── Produits ─────────────────────────────────────────────────────────────
  chargerProduits(): void {
    this.chargement = true;
    this.marketplaceService.getProduits(this.filtres).subscribe({
      next: p => { this.page = p; this.chargement = false; },
      error: () => { this.chargement = false; this.showToast('Erreur de chargement', 'error'); }
    });
  }

  chargerCategories(): void {
    this.marketplaceService.getCategories().subscribe(c => this.categories = c);
  }

  chargerStats(): void {
    this.marketplaceService.getStats().subscribe({ next: s => this.stats = s, error: () => {} });
  }

  onRecherche(v: string): void { this.searchSubject.next(v); }

  setCategorie(cat: string): void {
    this.filtres.categorie = cat === 'Tous' ? undefined : cat;
    this.filtres.page = 1;
    this.chargerProduits();
  }

  resetFiltres(): void {
    this.filtres = { page: 1, taillePage: 12, tri: 'recent' };
    this.rechercheTexte = '';
    this.chargerProduits();
  }

  goPage(p: number): void {
    if (p < 1 || p > this.page.totalPages) return;
    this.filtres.page = p;
    this.chargerProduits();
    window.scrollTo(0, 0);
  }

  pageNumbers(): number[] {
    const arr = [];
    for (let i = 1; i <= this.page.totalPages; i++) arr.push(i);
    return arr;
  }

  // ── Détail ────────────────────────────────────────────────────────────────
  voirDetail(p: Produit): void {
    this.produitDetail = p;
    this.qtyDetail = 1;
    this.avis = [];
    this.nouveauAvis = { nomAuteur: '', note: 0, commentaire: '' };
    this.goTo('detail');
    this.marketplaceService.getAvis(p.idProduit).subscribe(a => this.avis = a);
  }

  // ── Panier ────────────────────────────────────────────────────────────────
  ajouterAuPanier(p: Produit, event: Event): void {
    event.stopPropagation();
    this.ajoutEnCours[p.idProduit] = true;
    this.marketplaceService.ajouterAuPanier(p.idProduit, 1).subscribe({
      next: () => {
        this.showToast(`✅ ${p.nom} ajouté au panier`, 'success');
        setTimeout(() => { this.ajoutEnCours[p.idProduit] = false; }, 1500);
      },
      error: () => {
        this.showToast('Erreur lors de l\'ajout', 'error');
        this.ajoutEnCours[p.idProduit] = false;
      }
    });
  }

  ajouterAuPanierDetail(): void {
    if (!this.produitDetail) return;
    this.marketplaceService.ajouterAuPanier(this.produitDetail.idProduit, this.qtyDetail).subscribe({
      next: () => {
        this.showToast(`✅ Ajouté au panier (×${this.qtyDetail})`, 'success');
        this.panierOuvert = true;
      },
      error: () => this.showToast('Erreur lors de l\'ajout', 'error')
    });
  }
  get categoriesAvecTous(): string[] {
    return ['Tous', ...this.categories];
  }
  updateQty(ligne: any, qty: number): void {
    if (qty < 1) { this.supprimerLigne(ligne.idLignePanier); return; }
    this.marketplaceService.updateQuantite(ligne.idLignePanier, qty).subscribe();
  }

  supprimerLigne(id: number): void {
    this.marketplaceService.supprimerLigne(id).subscribe(() => this.showToast('Article retiré', 'info'));
  }

  viderPanier(): void {
    if (!confirm('Vider le panier ?')) return;
    this.marketplaceService.viderPanier().subscribe(() => this.showToast('Panier vidé', 'info'));
  }

  // ── Commande ─────────────────────────────────────────────────────────────
  passerCommande(): void {
    if (this.checkoutForm.invalid) {
      Object.values(this.checkoutForm.controls).forEach(c => c.markAsTouched());
      return;
    }
    this.commandeEnCours = true;
    const dto = this.checkoutForm.value;
    this.marketplaceService.passerCommande(dto).subscribe({
      next: cmd => {
        this.commandeConfirmee = cmd;
        this.commandeEnCours = false;
        this.goTo('confirmation');
        this.chargerMesCommandes();
      },
      error: err => {
        this.commandeEnCours = false;
        this.showToast(err.error?.message || 'Erreur lors de la commande', 'error');
      }
    });
  }

  chargerMesCommandes(): void {
    this.chargementCommandes = true;
    this.marketplaceService.getMesCommandes().subscribe({
      next: cmds => { this.mesCommandes = cmds; this.chargementCommandes = false; },
      error: () => this.chargementCommandes = false
    });
  }

  voirCommande(c: Commande): void {
    this.commandeConfirmee = c;
    this.goTo('confirmation');
  }

  chargerCommandesAdmin(): void {
    this.marketplaceService.getMesCommandes().subscribe(c => this.commandesAdmin = c);
  }

  changerStatut(c: Commande, event: Event): void {
    const statut = (event.target as HTMLSelectElement).value;
    this.marketplaceService.updateStatutCommande(c.idCommande, statut).subscribe({
      next: () => this.showToast(`Statut mis à jour : ${statut}`, 'success'),
      error: () => this.showToast('Erreur mise à jour statut', 'error')
    });
  }

  // ── Avis ─────────────────────────────────────────────────────────────────
  soumettreAvis(): void {
    if (!this.produitDetail || !this.nouveauAvis.note || !this.nouveauAvis.nomAuteur) return;
    this.marketplaceService.soumettreAvis({ idProduit: this.produitDetail.idProduit, ...this.nouveauAvis }).subscribe({
      next: a => {
        this.avis.unshift(a);
        this.nouveauAvis = { nomAuteur: '', note: 0, commentaire: '' };
        this.showToast('✅ Avis publié !', 'success');
      },
      error: () => this.showToast('Erreur publication avis', 'error')
    });
  }

  // ── Admin produits ────────────────────────────────────────────────────────
  ouvrirFormProduit(): void {
    this.editProduit = null;
    this.produitForm = this.emptyProduitForm();
    this.formProduitOuvert = true;
  }

  editerProduit(p: Produit): void {
    this.editProduit = p;
    this.produitForm = { ...p };
    this.formProduitOuvert = true;
    window.scrollTo(0, 0);
  }

  sauvegarderProduit(): void {
    if (this.editProduit) {
      this.marketplaceService.updateProduit(this.editProduit.idProduit, this.produitForm).subscribe({
        next: () => { this.chargerProduits(); this.formProduitOuvert = false; this.showToast('Produit modifié ✅', 'success'); },
        error: () => this.showToast('Erreur modification', 'error')
      });
    } else {
      this.marketplaceService.createProduit(this.produitForm).subscribe({
        next: () => { this.chargerProduits(); this.formProduitOuvert = false; this.showToast('Produit créé ✅', 'success'); },
        error: () => this.showToast('Erreur création', 'error')
      });
    }
  }

  supprimerProduit(id: number): void {
    if (!confirm('Supprimer ce produit ?')) return;
    this.marketplaceService.deleteProduit(id).subscribe({
      next: () => { this.chargerProduits(); this.showToast('Produit supprimé', 'info'); },
      error: () => this.showToast('Erreur suppression', 'error')
    });
  }

  private emptyProduitForm() {
    return { nom: '', description: '', categorie: 'Fongicide', prix: 0, unite: 'L', stockDisponible: 0, fabricant: '', numeroAMM: '', matieresActives: '', culturesCompatibles: '', imageUrl: '', estEnPromotion: false, prixPromo: null };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  catIcon(cat: string): string {
    const icons: Record<string, string> = {
      'Fongicide': '🍄', 'Insecticide': '🦟', 'Herbicide': '🌿',
      'Acaricide': '🕷️', 'Engrais': '🌱', 'Régulateur de croissance': '🌾',
      'Nématicide': '🐛', 'Molluscicide': '🐌', 'Tous': '🌍'
    };
    return icons[cat] || '🧪';
  }

  promoPercent(p: Produit): number {
    if (!p.estEnPromotion || !p.prixPromo) return 0;
    return Math.round((1 - p.prixPromo / p.prix) * 100);
  }

  stars(note: number): string[] {
    return [1, 2, 3, 4, 5].map(i => {
      if (note >= i) return 'full';
      if (note >= i - 0.5) return 'half';
      return 'empty';
    });
  }

  statutIcon(s: string): string {
    const icons: Record<string, string> = {
      'EnAttente': '⏳', 'Confirmee': '✅', 'EnPreparation': '📦',
      'Expediee': '🚚', 'Livree': '🏠', 'Annulee': '❌', 'Remboursee': '↩️'
    };
    return icons[s] || '📋';
  }

  onImgError(e: Event): void {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  toastMsg = ''; toastVisible = false; toastType = 'success';
  private toastTimeout: any;

  showToast(msg: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMsg = msg; this.toastType = type; this.toastVisible = true;
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastVisible = false, 3000);
  }
}
