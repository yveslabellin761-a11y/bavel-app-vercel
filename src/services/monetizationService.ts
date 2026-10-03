/**
 * Monetization & Freemium Economic System
 * Handles credits, virtual currency, boosts with 30-min timers, and VIP passes.
 */

import { Transaction, BoostState } from '../types';
import { authFetch } from '../lib/authFetch';

export type MonetizationTier = 'free' | 'extra' | 'premium' | 'vip';

/**
 * Matrice des 9 autorisations et restrictions Bavel Extra & Bavel Premium
 */
export interface MonetizationPermissions {
  // 1- Découvrir qui a donné un like : Extra (NON) - Premium (OUI)
  canSeeWhoLikedYou: boolean;
  // 2- Envoyer vos messages en priorité : Extra (NON) - Premium (OUI)
  hasPriorityMessaging: boolean;
  // 3- Profiter de filtres illimités : Extra (NON) - Premium (OUI)
  hasUnlimitedFilters: boolean;
  // 4- Consulter les profils en toute discrétion (mode incognito / invisible) : Extra (NON) - Premium (OUI)
  canBrowseIncognito: boolean;
  // 5- Swiper aussi souvent que vous voulez (illimité) : Extra (OUI) - Premium (OUI)
  hasUnlimitedSwipes: boolean;
  // 6- Supprimer toutes les pubs (zéro pub) : Extra (OUI) - Premium (OUI)
  hasNoAds: boolean;
  // 7- Un coup de cœur par jour offert : Extra (OUI) - Premium (OUI)
  hasDailyCoupDeCoeur: boolean;
  // 8- Annuler des swipes accidentels (rewind / retour arrière) : Extra (OUI) - Premium (OUI)
  canRewindSwipes: boolean;
  // 9- Des crédits bonus pour tout achat de crédits (+20% à +50%) : Extra (OUI) - Premium (OUI)
  hasBonusCreditsOnPurchase: boolean;
}

export const MONETIZATION_MATRIX: Record<MonetizationTier, MonetizationPermissions> = {
  free: {
    canSeeWhoLikedYou: false,
    hasPriorityMessaging: false,
    hasUnlimitedFilters: false,
    canBrowseIncognito: false,
    hasUnlimitedSwipes: false,
    hasNoAds: false,
    hasDailyCoupDeCoeur: false,
    canRewindSwipes: false,
    hasBonusCreditsOnPurchase: false,
  },
  extra: {
    canSeeWhoLikedYou: false,
    hasPriorityMessaging: false,
    hasUnlimitedFilters: false,
    canBrowseIncognito: false,
    hasUnlimitedSwipes: true,
    hasNoAds: true,
    hasDailyCoupDeCoeur: true,
    canRewindSwipes: true,
    hasBonusCreditsOnPurchase: true,
  },
  premium: {
    canSeeWhoLikedYou: true,
    hasPriorityMessaging: true,
    hasUnlimitedFilters: true,
    canBrowseIncognito: true,
    hasUnlimitedSwipes: true,
    hasNoAds: true,
    hasDailyCoupDeCoeur: true,
    canRewindSwipes: true,
    hasBonusCreditsOnPurchase: true,
  },
  vip: {
    canSeeWhoLikedYou: true,
    hasPriorityMessaging: true,
    hasUnlimitedFilters: true,
    canBrowseIncognito: true,
    hasUnlimitedSwipes: true,
    hasNoAds: true,
    hasDailyCoupDeCoeur: true,
    canRewindSwipes: true,
    hasBonusCreditsOnPurchase: true,
  }
};

export interface CreditPackage {
  id: string;
  credits: number;
  priceCFA: number;
  priceEUR: number;
  popular?: boolean;
  bonus?: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'pack_100', credits: 100, priceCFA: 1500, priceEUR: 2.49 },
  { id: 'pack_550', credits: 550, priceCFA: 6000, priceEUR: 8.99, popular: true, bonus: '+10% GRATUIT' },
  { id: 'pack_1250', credits: 1250, priceCFA: 12000, priceEUR: 17.99, bonus: '+25% GRATUIT' },
  { id: 'pack_3000', credits: 3000, priceCFA: 25000, priceEUR: 36.99, bonus: 'BEST DEAL +50%' },
];

export const BOOST_COST_CREDITS = 100;

class MonetizationService {
  private credits: number = 0;
  private userStatus: MonetizationTier = 'free';
  private transactions: Transaction[] = [];
  private boostState: BoostState = {
    isActive: false,
    startedAt: null,
    expiresAt: null,
    multiplier: 1,
  };
  private listeners: (() => void)[] = [];

  constructor() {
    this.init();
  }

  private init() {
    void this.refreshWallet();
  }

  public async refreshWallet(): Promise<boolean> {
    try {
      const response = await authFetch('/api/wallet');
      if (!response.ok) return false;
      const payload = await response.json();
      this.credits = Number(payload.wallet?.balance || 0);
      const tier = String(payload.wallet?.tier || 'free');
      this.userStatus = tier === 'freemium' ? 'free' : (['free', 'extra', 'premium', 'vip'].includes(tier) ? tier as MonetizationTier : 'free');
      const details = payload.wallet?.boost;
      if (details?.expiresAt && Number(details.expiresAt) > Date.now()) this.boostState = details;
      this.notify();
      return true;
    } catch (error) {
      console.error('Wallet refresh failed:', error);
      return false;
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Monetization listener error:', e);
      }
    });
  }

  // ============================================
  // GESTION DES PERMISSIONS EN TEMPS RÉEL
  // ============================================

  public getPermissions(tier?: MonetizationTier): MonetizationPermissions {
    const currentTier = tier || this.userStatus;
    return MONETIZATION_MATRIX[currentTier] || MONETIZATION_MATRIX.free;
  }

  public hasPermission(permissionKey: keyof MonetizationPermissions): boolean {
    const permissions = this.getPermissions();
    return Boolean(permissions[permissionKey]);
  }

  public getUserStatus(): MonetizationTier {
    return this.userStatus;
  }

  public isPremium(): boolean {
    return this.userStatus === 'premium' || this.userStatus === 'vip';
  }

  public isExtra(): boolean {
    return this.userStatus === 'extra';
  }

  public isFree(): boolean {
    return this.userStatus === 'free';
  }

  /**
   * Vérification détaillée avec explication pour l'UI et Bavel AI
   */
  public checkFeatureAccess(featureKey: keyof MonetizationPermissions): {
    allowed: boolean;
    requiredTier: 'extra' | 'premium';
    featureLabel: string;
    description: string;
  } {
    const allowed = this.hasPermission(featureKey);
    const labels: Record<keyof MonetizationPermissions, { label: string; tier: 'extra' | 'premium'; desc: string }> = {
      canSeeWhoLikedYou: {
        label: 'Découvrir qui vous a liké',
        tier: 'premium',
        desc: 'Voyez tous vos admirateurs secrets sans attendre de liker en retour.'
      },
      hasPriorityMessaging: {
        label: 'Messages prioritaires',
        tier: 'premium',
        desc: 'Placez vos messages tout en haut de la boîte de réception de vos matchs.'
      },
      hasUnlimitedFilters: {
        label: 'Filtres de recherche illimités',
        tier: 'premium',
        desc: 'Affinez vos critères par taille, silhouette, études, signe astro et habitudes.'
      },
      canBrowseIncognito: {
        label: 'Navigation en toute discrétion (Mode Incognito)',
        tier: 'premium',
        desc: 'Visitez les profils sans laisser de trace et masquez votre statut en ligne.'
      },
      hasUnlimitedSwipes: {
        label: 'Swipes illimités',
        tier: 'extra',
        desc: 'Swipez autant que vous le souhaitez sans être bloqué par le quota quotidien de 50 likes.'
      },
      hasNoAds: {
        label: 'Suppression totale des publicités',
        tier: 'extra',
        desc: 'Naviguez sans aucune interruption publicitaire.'
      },
      hasDailyCoupDeCoeur: {
        label: '1 Coup de Cœur par jour offert',
        tier: 'extra',
        desc: 'Envoyez un Super Like quotidien gratuit pour multiplier vos chances par 3.'
      },
      canRewindSwipes: {
        label: 'Annulation des swipes accidentels (Rewind)',
        tier: 'extra',
        desc: 'Revenez en arrière instantanément si vous avez passé un profil par erreur.'
      },
      hasBonusCreditsOnPurchase: {
        label: 'Crédits bonus sur tout achat',
        tier: 'extra',
        desc: 'Bénéficiez de +20% à +50% de crédits offerts à chaque rechargement.'
      }
    };

    const config = labels[featureKey];
    return {
      allowed,
      requiredTier: config.tier,
      featureLabel: config.label,
      description: config.desc
    };
  }

  // ============================================
  // TRANSACTIONS & CRÉDITS
  // ============================================

  public async spendCredits(amount: number, description = 'achat'): Promise<boolean> {
    const response = await authFetch('/api/wallet/spend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, purpose: description.toLowerCase().includes('super') ? 'super_like' : 'profile_boost', description })
    });
    if (!response.ok) return false;
    const payload = await response.json();
    this.credits = Number(payload.balance);
    this.notify();
    return true;
  }

  public getCredits(): number {
    return this.credits;
  }

  public getTransactions(): Transaction[] {
    return [...this.transactions];
  }

  public getBoostState(): BoostState {
    if (this.boostState.isActive && this.boostState.expiresAt && Date.now() > this.boostState.expiresAt) {
      this.clearBoost();
    }
    return { ...this.boostState };
  }

  public async addCredits(amount: number, reason = 'reward'): Promise<boolean> {
    const response = await authFetch('/api/wallet/reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description: reason })
    });
    if (!response.ok) return false;
    const payload = await response.json();
    this.credits = Number(payload.balance);
    this.notify();
    return true;
  }

  public purchaseCredits(pkg: CreditPackage, provider: Transaction['provider']): Promise<boolean> {
    void pkg;
    void provider;
    console.error('Credit purchase must use the authenticated payment checkout.');
    return Promise.resolve(false);
  }

  public async activateBoost(): Promise<{ success: boolean; error?: string }> {
    const response = await authFetch('/api/wallet/boost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return { success: false, error: payload?.error || 'Erreur lors de l’activation.' };
    this.credits = Number(payload.balance);
    this.boostState = payload.boost;
    this.notify();
    return { success: true };
  }

  public activateSubscription(status: MonetizationTier, provider: Transaction['provider']): Promise<boolean> {
    return (async () => {
      if (status === 'free') return false;
      const amounts: Record<'extra' | 'premium' | 'vip', number> = {
        extra: 3500,
        premium: 7500,
        vip: 15000
      };
      const response = await authFetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: provider === 'card' ? 'card' : 'mobile_money',
          amount: amounts[status as 'extra' | 'premium' | 'vip'],
          currency: 'XOF',
          description: `Abonnement Bavel ${status}`,
          productType: 'subscription',
          productId: `${status}_1month`
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.paymentUrl) return false;
      window.location.assign(payload.paymentUrl);
      return true;
    })().catch((error) => {
      console.error('Subscription checkout failed:', error);
      return false;
    });
  }

  private clearBoost() {
    this.boostState = {
      isActive: false,
      startedAt: null,
      expiresAt: null,
      multiplier: 1,
    };
    this.notify();
  }
}

export const monetizationService = new MonetizationService();
