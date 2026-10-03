export type Tier = 'freemium' | 'extra' | 'premium';

export interface TierFeatures {
  canSeeWhoLikedMe: boolean;    // 1. Découvrir qui a liké
  priorityMessages: boolean;    // 2. Messages en priorité
  unlimitedFilters: boolean;    // 3. Filtres illimités
  incognitoMode: boolean;       // 4. Consulter en discrétion
  unlimitedSwipes: boolean;     // 5. Swipes illimités (limité à 50)
  noAds: boolean;               // 6. Supprimer les pubs
  dailyCoupDeCoeur: boolean;    // 7. Un coup de cœur par jour
  rewindSwipe: boolean;         // 8. Annuler un swipe accidentel
  bonusCredits: boolean;        // 9. Crédits bonus à l'achat
}

export const FEATURES_PER_TIER: Record<string, TierFeatures> = {
  freemium: {
    canSeeWhoLikedMe: false,    // 1. Découvrir qui a liké
    priorityMessages: false,    // 2. Messages en priorité
    unlimitedFilters: false,    // 3. Filtres illimités
    incognitoMode: false,       // 4. Consulter en discrétion
    unlimitedSwipes: false,     // 5. Swipes illimités (limité à 50)
    noAds: false,               // 6. Supprimer les pubs
    dailyCoupDeCoeur: false,    // 7. Un coup de cœur par jour
    rewindSwipe: false,         // 8. Annuler un swipe accidentel
    bonusCredits: false,        // 9. Crédits bonus à l'achat
  },
  extra: {
    canSeeWhoLikedMe: false,    // ❌ Non
    priorityMessages: false,    // ❌ Non
    unlimitedFilters: false,    // ❌ Non
    incognitoMode: false,       // ❌ Non
    unlimitedSwipes: true,      // ✅ Oui
    noAds: true,                // ✅ Oui
    dailyCoupDeCoeur: true,     // ✅ Oui
    rewindSwipe: true,          // ✅ Oui
    bonusCredits: true,         // ✅ Oui
  },
  premium: {
    canSeeWhoLikedMe: true,     // ✅ Oui
    priorityMessages: true,     // ✅ Oui
    unlimitedFilters: true,     // ✅ Oui
    incognitoMode: true,        // ✅ Oui
    unlimitedSwipes: true,      // ✅ Oui
    noAds: true,                // ✅ Oui
    dailyCoupDeCoeur: true,     // ✅ Oui
    rewindSwipe: true,          // ✅ Oui
    bonusCredits: true,         // ✅ Oui
  }
};

// Aliases for compatibility with various internal naming conventions
FEATURES_PER_TIER.free = FEATURES_PER_TIER.freemium;
FEATURES_PER_TIER.vip = FEATURES_PER_TIER.premium;

/**
 * Helper to safely get the privileges for any user tier
 */
export function getTierPrivileges(tier?: string): TierFeatures {
  const normalizedTier = (tier || 'freemium').toLowerCase();
  if (normalizedTier === 'extra') return FEATURES_PER_TIER.extra;
  if (normalizedTier === 'premium' || normalizedTier === 'vip') return FEATURES_PER_TIER.premium;
  return FEATURES_PER_TIER.freemium;
}
