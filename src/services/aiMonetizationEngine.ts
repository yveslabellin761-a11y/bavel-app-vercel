/**
 * Shadow AI Monetization & Recommendation Engine for Bavel
 * Governs:
 * 1. Frustration & Churn Prediction (unanswered chats, streak of right-swipes with no matches)
 * 2. Catalog pricing (prices come from the configured product catalog)
 * 3. Secret-like presentation without fabricated compatibility or scarcity
 * 4. ROI of Boost Optimization (re-ranks profiles and increases match rate dramatically during Boost)
 * 5. Virtual Currency Valuation (restricts chatting with top-tier profiles unless priority message or gift is used)
 */

import { User } from '../types';
import { monetizationService, CreditPackage, CREDIT_PACKAGES } from './monetizationService';
import { smartMatchService } from './smartMatchService';

export interface ShadowAIState {
  consecutiveRightSwipes: number;
  lastSwipeTime: number;
  frustrationScore: number; // 0 to 100
  isHesitantBuyer: boolean;
  activePromotions: Array<{
    id: string;
    title: string;
    discountPercent: number;
    expiresAt: number;
  }>;
}

class AIMonetizationEngine {
  private state: ShadowAIState = {
    consecutiveRightSwipes: 0,
    lastSwipeTime: Date.now(),
    frustrationScore: 0,
    isHesitantBuyer: false,
    activePromotions: [],
  };

  private listeners: (() => void)[] = [];

  constructor() {
    // Entitlements and prices are server-owned; no client-side personalization is used.
  }

  private save() {
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // --- 1. FRUSTRATION ANALYSIS (Churn & Pay Prediction) ---
  
  /**
   * Log a right swipe. If user swipes right too many times without matches, frustration grows!
   */
  public logRightSwipe(hadMatch: boolean): { triggerFrustrationPopup: boolean; message?: string } {
    const now = Date.now();
    this.state.lastSwipeTime = now;

    if (hadMatch) {
      this.state.consecutiveRightSwipes = 0;
      this.state.frustrationScore = Math.max(0, this.state.frustrationScore - 25);
      this.save();
      return { triggerFrustrationPopup: false };
    }

    this.state.consecutiveRightSwipes += 1;
    
    // Increase frustration score based on streak
    this.state.frustrationScore = Math.min(100, this.state.frustrationScore + 12);

    this.save();

    // If frustration is high (e.g. 7+ likes in a row without a single match)
    if (this.state.consecutiveRightSwipes >= 7 && this.state.frustrationScore >= 70) {
      // Lower frustration slightly so we don't spam them immediately next swipe
      this.state.frustrationScore = 40;
      this.save();

      return {
        triggerFrustrationPopup: true,
        message: "Votre visibilité est basse à l'instant. Activez le Boost maintenant pour apparaître en priorité auprès de 10 fois plus de profils qualifiés !"
      };
    }

    return { triggerFrustrationPopup: false };
  }

  /**
   * Log an unreplied conversation step to track frustration.
   */
  public logUnansweredChatfrustration(): boolean {
    this.state.frustrationScore = Math.min(100, this.state.frustrationScore + 20);
    this.save();

    if (this.state.frustrationScore >= 80) {
      this.state.frustrationScore = 45; // Cool down
      this.save();
      return true; // Suggest to buy a Boost or virtual gift to stand out
    }
    return false;
  }

  // --- 2. DYNAMIC PRICING ENGINE ---

  /**
   * Tracks when user closes checkout window. Mark them as hesitant.
   * If hesitant, offer them a flash promo next time they look!
   */
  public registerHesitation() {
    this.state.isHesitantBuyer = false;
    this.state.activePromotions = [];
    this.notify();
  }

  public clearHesitation() {
    this.state.isHesitantBuyer = false;
    this.state.activePromotions = this.state.activePromotions.filter(p => p.id !== 'flash_promo_hesitation');
    this.save();
  }

  public registerPurchase() {
    this.state.isHesitantBuyer = false;
    this.state.activePromotions = [];
    this.save();
  }

  /**
   * Calculates the tailored price for a subscription or credits package.
   * Leverages device status, geographic wealth, previous buys, and hesitation discounts.
   */
  public getDynamicPrices() {
    const baseExtraCFA = 3900;
    const basePremiumCFA = 7800;

    return {
      credits: CREDIT_PACKAGES,
      extraCFA: baseExtraCFA,
      premiumCFA: basePremiumCFA,
      extraEUR: Math.round((baseExtraCFA / 655.95) * 100) / 100,
      premiumEUR: Math.round((basePremiumCFA / 655.95) * 100) / 100,
      originalExtraCFA: undefined,
      originalPremiumCFA: undefined,
      hasActiveFlashPromo: false,
      promoTimeRemainingMs: 0,
    };
  }

  // --- 3. THE "SECRET LIKE" ENGINE ---

  /**
   * Generates tailored affinity notifications/descriptions for blurred profiles
   */
  public getSecretLikeRecommendation(likedProfilesCount: number): { title: string; subtitle: string; compatibilityScore: number | null } {
    const count = Math.max(0, Math.floor(likedProfilesCount));
    return {
      title: count === 1 ? 'Une personne a aimé ton profil.' : `${count} personnes ont aimé ton profil.`,
      subtitle: 'La compatibilité sera calculée après comparaison réelle de vos intérêts, intentions et distance. Aucun score ne doit être inventé.',
      compatibilityScore: null
    };
  }

  // --- 4. ROI OF THE BOOST OPTIMIZATION ---

  /**
   * When user is boosted, filter candidates to favor connections with highly active, compatible users.
   * Also guarantees high matching rates!
   */
  public optimizeCandidatesForBoostedUser<T extends { id: string | number; name: string; online?: boolean; isVerified?: boolean; verified?: boolean; compatibility_score?: number; distance?: number }>(
    candidates: T[],
    isBoostActive: boolean
  ): T[] {
    if (!isBoostActive) return candidates;

    return [...candidates].sort((a, b) => {
      const score = (candidate: typeof a) =>
        (candidate.compatibility_score || 0) +
        (candidate.online ? 12 : 0) +
        (candidate.isVerified || candidate.verified ? 6 : 0) +
        (typeof candidate.distance === 'number' ? Math.max(0, 10 - candidate.distance / 10) : 0);
      return score(b) - score(a);
    });
  }

  /**
   * Decide if a swipe action during Boost should trigger an INSTANT match to validate the user's ROI.
   */
  public shouldGuaranteeMatchDuringBoost(): boolean {
    // A paid visibility feature may reorder eligible profiles, but it must
    // never fabricate a reciprocal like or a match.
    return false;
  }

  // --- 5. IN-APP CURRENCY PROMOTION (Popular Profiles Chat Wall) ---

  /**
   * Evaluates if a target profile is "Highly Popular"
   * If yes, triggers the paywall asking for virtual credits for priority delivery.
   */
  public isProfileHighlyPopular(profile: any): boolean {
    if (!profile) return false;
    
    if (profile.popular === true || profile.eloScore > 1400) {
      return true;
    }
    return false;
  }
}

export const aiMonetizationEngine = new AIMonetizationEngine();
