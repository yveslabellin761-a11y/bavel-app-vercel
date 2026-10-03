import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { X, Star, Heart, RefreshCw } from 'lucide-react';
import { SwipeCard, SwipeCardRef } from './SwipeCard';
import { Profile } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useOfflineStore } from '../../store/useOfflineStore';
import { useUX } from '../../context/UXContext';
import { EmptyState } from '../../components/ux/EmptyState';
import { cn } from '../../lib/utils';

// ============================================
// 1. TYPES
// ============================================

export interface VirtualSwipeDeckProps {
  profiles: Profile[];
  currentUserId: string;
  onMatchCreated?: (profile: Profile) => void;
  onShowDetails?: (profile: Profile) => void;
  onResetDeck?: () => void;
  onSwipe?: (profile: Profile, direction: 'left' | 'right' | 'up' | 'down') => void;
  onDeckEmpty?: () => void;
  prefetchCount?: number;
  enableVirtualization?: boolean;
  maxVisibleCards?: number;
  className?: string;
  emptyStateMessage?: string;
  emptyStateActionLabel?: string;
  swipeThreshold?: number;
  velocityThreshold?: number;
  enableHaptics?: boolean;
  enableSound?: boolean;
}

export interface SwipeHistoryItem {
  profileId: string;
  direction: 'left' | 'right' | 'up' | 'down';
  timestamp: number;
}

// ============================================
// 2. SOUS-COMPOSANTS
// ============================================

// 2.1 Loading Skeleton
const LoadingSkeleton: React.FC = () => (
  <div className="relative w-full h-[72vh] max-h-[640px] select-none touch-none">
    <div className="absolute inset-0 rounded-[32px] overflow-hidden bg-neutral-800/50 animate-pulse">
      <div className="w-full h-full bg-gradient-to-b from-neutral-700/50 to-neutral-900/50" />
      <div className="absolute bottom-0 inset-x-0 p-6 space-y-3">
        <div className="h-8 w-48 bg-neutral-700/50 rounded-lg" />
        <div className="h-4 w-32 bg-neutral-700/50 rounded" />
        <div className="h-3 w-56 bg-neutral-700/50 rounded" />
      </div>
    </div>
  </div>
);

// 2.2 Swipe Counter
const SwipeCounter: React.FC<{
  current: number;
  total: number;
  className?: string;
}> = ({ current, total, className }) => (
  <div className={cn(
    'absolute bottom-4 left-1/2 -translate-x-1/2 z-10',
    'px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10',
    className
  )}>
    <span className="text-[10px] font-bold text-white/70">
      {current + 1} / {total}
    </span>
  </div>
);

// 2.3 Action Buttons
const ActionButtons: React.FC<{
  onPass: () => void;
  onSuperLike: () => void;
  onLike: () => void;
  isDisabled?: boolean;
}> = ({ onPass, onSuperLike, onLike, isDisabled }) => {
  const buttonClass = (color: string) => cn(
    'w-14 h-14 rounded-full flex items-center justify-center',
    'transition-all duration-200 active:scale-90',
    'shadow-lg backdrop-blur-md border border-white/20',
    isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer',
    color
  );

  return (
    <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center space-x-4 z-10">
      <button
        onClick={onPass}
        disabled={isDisabled}
        className={buttonClass('bg-rose-500/20 hover:bg-rose-500/30 text-rose-400')}
        aria-label="Passer"
      >
        <X className="w-6 h-6 stroke-[2.5]" />
      </button>

      <button
        onClick={onSuperLike}
        disabled={isDisabled}
        className={buttonClass('bg-blue-500/20 hover:bg-blue-500/30 text-blue-400')}
        aria-label="Super Like"
      >
        <Star className="w-6 h-6 fill-blue-400" />
      </button>

      <button
        onClick={onLike}
        disabled={isDisabled}
        className={buttonClass('bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400')}
        aria-label="Liker"
      >
        <Heart className="w-6 h-6 fill-emerald-400" />
      </button>
    </div>
  );
};

// ============================================
// 3. COMPOSANT PRINCIPAL
// ============================================

export const VirtualSwipeDeck: React.FC<VirtualSwipeDeckProps> = React.memo(({
  profiles,
  currentUserId,
  onMatchCreated,
  onShowDetails,
  onResetDeck,
  onSwipe,
  onDeckEmpty,
  prefetchCount = 2,
  enableVirtualization = true,
  maxVisibleCards = 3,
  className = '',
  emptyStateMessage = "Vous avez parcouru tous les profils !",
  emptyStateActionLabel = "Recommencer",
  swipeThreshold = 100,
  velocityThreshold = 400,
  enableHaptics = true,
  enableSound = true,
}) => {
  // ============================================
  // 3.1 ÉTATS
  // ============================================

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [nextProfile, setNextProfile] = useState<Profile | null>(null);

  // ============================================
  // 3.2 REFS
  // ============================================

  const cardRefs = useRef<Map<string, any>>(new Map());
  const isMounted = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // 3.3 HOOKS
  // ============================================

  const { 
    addOptimisticLike, 
    addOptimisticPass, 
    addOptimisticSuperLike,
    likedUserIds,
    passedUserIds,
    superLikedUserIds,
    undoLastSwipe,
    getLikedCount,
    getSwipeCount,
  } = useAppStore();

  const { enqueueAction, pendingCount } = useOfflineStore();
  const { triggerFeedback, playSound } = useUX();

  // ============================================
  // 3.4 MÉMOISATION
  // ============================================

  const filteredProfiles = useMemo(() => {
    return profiles.filter(profile => {
      // Éviter les doublons
      if (likedUserIds.has(profile.id)) return false;
      if (passedUserIds.has(profile.id)) return false;
      if (superLikedUserIds.has(profile.id)) return false;
      return true;
    });
  }, [profiles, likedUserIds, passedUserIds, superLikedUserIds]);

  const visibleCards = useMemo(() => {
    if (!enableVirtualization) {
      return filteredProfiles.slice(currentIndex);
    }

    const visible = filteredProfiles.slice(
      currentIndex,
      currentIndex + maxVisibleCards
    );

    // Précharger les profils suivants
    const nextBatch = filteredProfiles.slice(
      currentIndex + maxVisibleCards,
      currentIndex + maxVisibleCards + prefetchCount
    );

    return [...visible, ...nextBatch];
  }, [filteredProfiles, currentIndex, maxVisibleCards, prefetchCount, enableVirtualization]);

  const isDeckEmpty = currentIndex >= filteredProfiles.length;

  const swipeStats = useMemo(() => ({
    likedCount: getLikedCount(),
    totalSwipes: getSwipeCount(),
    pendingOffline: pendingCount,
    remaining: filteredProfiles.length - currentIndex,
  }), [getLikedCount, getSwipeCount, pendingCount, filteredProfiles.length, currentIndex]);

  // ============================================
  // 3.5 EFFETS
  // ============================================

  // Nettoyage
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Mise à jour du profil courant
  useEffect(() => {
    if (!isDeckEmpty && filteredProfiles[currentIndex]) {
      setCurrentProfile(filteredProfiles[currentIndex]);
      setNextProfile(filteredProfiles[currentIndex + 1] || null);
    }
  }, [filteredProfiles, currentIndex, isDeckEmpty]);

  // Notification quand le deck est vide
  useEffect(() => {
    if (isDeckEmpty) {
      onDeckEmpty?.();
    }
  }, [isDeckEmpty, onDeckEmpty]);

  // ============================================
  // 3.6 HANDLERS - SWIPE
  // ============================================

  const performSwipe = useCallback(async (
    profile: Profile,
    direction: 'left' | 'right' | 'up' | 'down',
  ) => {
    if (isAnimating || !profile) return;

    setIsAnimating(true);
    setDirection(direction);
    setCurrentProfile(profile);

    // Enregistrer dans l'historique
    setSwipeHistory(prev => [...prev, {
      profileId: profile.id,
      direction,
      timestamp: Date.now(),
    }]);

    // Callback
    onSwipe?.(profile, direction);

    try {
      switch (direction) {
        case 'right':
          addOptimisticLike(profile.id);
          enqueueAction('LIKE_USER', { userId: currentUserId, targetId: profile.id });
          if (enableHaptics) triggerFeedback('medium');
          if (enableSound) playSound?.('like');
          
          // Vérifier si c'est un match
          if ((profile as any).isMatchCandidate) {
            onMatchCreated?.(profile);
          }
          break;

        case 'left':
          addOptimisticPass(profile.id);
          enqueueAction('PASS_USER', { userId: currentUserId, targetId: profile.id });
          if (enableHaptics) triggerFeedback('light');
          break;

        case 'up':
          addOptimisticSuperLike(profile.id);
          enqueueAction('SUPERLIKE_USER', { userId: currentUserId, targetId: profile.id });
          if (enableHaptics) triggerFeedback('heavy');
          if (enableSound) playSound?.('superlike');
          onMatchCreated?.(profile);
          break;

        case 'down':
          // Swipe Down - généralement pour passer ou revenir en arrière
          if (enableHaptics) triggerFeedback('light');
          break;
      }

      // Avancer l'index
      setCurrentIndex(prev => prev + 1);

    } catch (error) {
      console.error('Swipe error:', error);
    } finally {
      setIsAnimating(false);
      setDirection(null);
    }
  }, [
    isAnimating,
    addOptimisticLike,
    addOptimisticPass,
    addOptimisticSuperLike,
    enqueueAction,
    currentUserId,
    onMatchCreated,
    onSwipe,
    enableHaptics,
    enableSound,
    triggerFeedback,
    playSound,
  ]);

  // ============================================
  // 3.7 HANDLERS - UNDO
  // ============================================

  const handleUndo = useCallback(() => {
    const lastSwipe = swipeHistory[swipeHistory.length - 1];
    if (!lastSwipe) return;

    // Annuler dans le store
    undoLastSwipe();

    // Reculer l'index
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setSwipeHistory(prev => prev.slice(0, -1));

    triggerFeedback('light');
  }, [swipeHistory, undoLastSwipe, triggerFeedback]);

  // ============================================
  // 3.8 HANDLERS - RESET
  // ============================================

  const handleReset = useCallback(() => {
    setCurrentIndex(0);
    setSwipeHistory([]);
    onResetDeck?.();
    triggerFeedback('medium');
  }, [onResetDeck, triggerFeedback]);

  // ============================================
  // 3.9 RENDU - EMPTY STATE
  // ============================================

  if (isDeckEmpty) {
    return (
      <div className={cn(
        'flex items-center justify-center h-full min-h-[480px]',
        className
      )}>
        <EmptyState
          type="discovery_end"
          title="Fin du deck"
          description={emptyStateMessage}
          actionLabel={emptyStateActionLabel}
          onAction={handleReset}
          icon={<RefreshCw className="w-8 h-8" />}
        />
      </div>
    );
  }

  // ============================================
  // 3.10 RENDU - LOADING
  // ============================================

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // ============================================
  // 3.11 RENDU - DECK
  // ============================================

  const renderCards = () => {
    const cardsToRender = visibleCards.slice(0, maxVisibleCards);
    
    return cardsToRender.map((profile, idx) => {
      const isTop = idx === 0;
      const cardIndex = currentIndex + idx;
      
      return (
        <SwipeCard
          key={profile.id}
          ref={(ref) => {
            if (ref) {
              cardRefs.current.set(profile.id, ref);
            } else {
              cardRefs.current.delete(profile.id);
            }
          }}
          profile={profile}
          isTop={isTop}
          index={cardIndex}
          totalCards={filteredProfiles.length}
          onSwipeLeft={() => performSwipe(profile, 'left')}
          onSwipeRight={() => performSwipe(profile, 'right')}
          onSwipeUp={() => performSwipe(profile, 'up')}
          onSwipeDown={() => performSwipe(profile, 'down')}
          onShowDetails={onShowDetails}
          swipeThreshold={swipeThreshold}
          velocityThreshold={velocityThreshold}
          enableHaptics={enableHaptics}
          enableSound={enableSound}
          className={cn(
            'transition-all duration-300',
            !isTop && 'scale-[0.96] opacity-70'
          )}
        />
      );
    });
  };

  return (
    <div className={cn(
      'relative w-full h-[72vh] max-h-[640px] select-none touch-none',
      className
    )}>
      <AnimatePresence mode="popLayout">
        {renderCards()}
      </AnimatePresence>

      {/* Swipe Counter */}
      <SwipeCounter
        current={currentIndex}
        total={filteredProfiles.length}
        className={cn(
          'transition-opacity duration-300',
          isAnimating ? 'opacity-0' : 'opacity-100'
        )}
      />

      {/* Action Buttons */}
      <ActionButtons
        onPass={() => {
          if (currentProfile) {
            performSwipe(currentProfile, 'left');
          }
        }}
        onSuperLike={() => {
          if (currentProfile) {
            performSwipe(currentProfile, 'up');
          }
        }}
        onLike={() => {
          if (currentProfile) {
            performSwipe(currentProfile, 'right');
          }
        }}
        isDisabled={isAnimating || !currentProfile}
      />

      {/* Statistiques en overlay */}
      {swipeStats.pendingOffline > 0 && (
        <div className="absolute top-4 right-4 z-20 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-bold flex items-center space-x-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>{swipeStats.pendingOffline} en attente</span>
        </div>
      )}

      {/* Bouton Undo */}
      {swipeHistory.length > 0 && (
        <button
          onClick={handleUndo}
          className={cn(
            'absolute top-4 left-4 z-20',
            'px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md',
            'text-white/70 text-[10px] font-bold',
            'border border-white/10 hover:bg-black/70 transition-all',
            'active:scale-95 cursor-pointer'
          )}
          aria-label="Annuler le dernier swipe"
        >
          <RefreshCw className="w-3.5 h-3.5 inline mr-1.5" />
          Annuler
        </button>
      )}
    </div>
  );
});

VirtualSwipeDeck.displayName = 'VirtualSwipeDeck';

// ============================================
// 4. EXPORT PAR DÉFAUT
// ============================================

export default VirtualSwipeDeck;