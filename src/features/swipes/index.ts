import React from 'react';
import SwipeCard from './SwipeCard';
import VirtualSwipeDeck from './VirtualSwipeDeck';

// ============================================
// 1. EXPORTS PRINCIPAUX
// ============================================

// Composants
export * from './SwipeCard';
export * from './VirtualSwipeDeck';

// ============================================
// 2. EXPORTS PAR DÉFAUT (pour faciliter l'import)
// ============================================

export { SwipeCard, VirtualSwipeDeck };

// ============================================
// 3. EXPORTS DE TYPES (si disponibles)
// ============================================

export type { SwipeCardProps } from './SwipeCard';
export type { VirtualSwipeDeckProps, SwipeHistoryItem } from './VirtualSwipeDeck';

// ============================================
// 4. EXPORTS DE CONSTANTES
// ============================================

// Valeurs par défaut
export const DEFAULT_SWIPE_CONFIG = {
  threshold: 100,
  velocityThreshold: 400,
  maxVisibleCards: 3,
  prefetchCount: 2,
} as const;

// ============================================
// 5. FONCTIONS UTILITAIRES
// ============================================

/**
 * Vérifie si un profil a été liké
 */
export const isProfileLiked = (profileId: string, likedIds: Set<string>): boolean => {
  return likedIds.has(profileId);
};

/**
 * Vérifie si un profil a été passé
 */
export const isProfilePassed = (profileId: string, passedIds: Set<string>): boolean => {
  return passedIds.has(profileId);
};

/**
 * Vérifie si un profil a été super liké
 */
export const isProfileSuperLiked = (profileId: string, superLikedIds: Set<string>): boolean => {
  return superLikedIds.has(profileId);
};

/**
 * Calcule la progression dans le deck
 */
export const getDeckProgress = (currentIndex: number, totalProfiles: number): number => {
  if (totalProfiles === 0) return 0;
  return Math.min(100, Math.round((currentIndex / totalProfiles) * 100));
};

/**
 * Filtre les profils déjà swipés
 */
export const filterSwipedProfiles = (
  profiles: any[],
  likedIds: Set<string>,
  passedIds: Set<string>,
  superLikedIds: Set<string>
): any[] => {
  return profiles.filter(profile => {
    const id = profile.id;
    return !likedIds.has(id) && !passedIds.has(id) && !superLikedIds.has(id);
  });
};

// ============================================
// 6. HOOK PERSONNALISÉ (optionnel)
// ============================================

/**
 * Hook pour gérer l'état du deck de swipes
 */
export const useSwipeDeck = (profiles: any[], initialIndex: number = 0) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [history, setHistory] = React.useState<any[]>([]);

  const currentProfile = React.useMemo(() => {
    return profiles[currentIndex] || null;
  }, [profiles, currentIndex]);

  const nextProfile = React.useMemo(() => {
    return profiles[currentIndex + 1] || null;
  }, [profiles, currentIndex]);

  const isEnd = React.useMemo(() => {
    return currentIndex >= profiles.length;
  }, [currentIndex, profiles.length]);

  const progress = React.useMemo(() => {
    return getDeckProgress(currentIndex, profiles.length);
  }, [currentIndex, profiles.length]);

  const remaining = React.useMemo(() => {
    return profiles.length - currentIndex;
  }, [currentIndex, profiles.length]);

  const advance = React.useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, profiles.length));
  }, [profiles.length]);

  const goBack = React.useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const reset = React.useCallback(() => {
    setCurrentIndex(0);
    setHistory([]);
  }, []);

  const recordSwipe = React.useCallback((profileId: string, direction: string) => {
    setHistory(prev => [...prev, { profileId, direction, timestamp: Date.now() }]);
  }, []);

  const undoLastSwipe = React.useCallback(() => {
    const last = history[history.length - 1];
    if (last) {
      setHistory(prev => prev.slice(0, -1));
      goBack();
      return last;
    }
    return null;
  }, [history, goBack]);

  return {
    currentIndex,
    currentProfile,
    nextProfile,
    isEnd,
    progress,
    remaining,
    history,
    advance,
    goBack,
    reset,
    recordSwipe,
    undoLastSwipe,
    canUndo: history.length > 0,
    canGoBack: currentIndex > 0,
  };
};

// ============================================
// 7. EXPORT PAR DÉFAUT DU MODULE
// ============================================

const SwipeModule = {
  // Composants
  SwipeCard,
  VirtualSwipeDeck,
  
  // Types
  type: {
    SwipeCardProps: {} as import('./SwipeCard').SwipeCardProps,
    VirtualSwipeDeckProps: {} as import('./VirtualSwipeDeck').VirtualSwipeDeckProps,
    SwipeHistoryItem: {} as import('./VirtualSwipeDeck').SwipeHistoryItem,
  },
  
  // Constantes
  DEFAULT_SWIPE_CONFIG,
  
  // Utilitaires
  isProfileLiked,
  isProfilePassed,
  isProfileSuperLiked,
  getDeckProgress,
  filterSwipedProfiles,
  
  // Hooks
  useSwipeDeck,
};

export default SwipeModule;