import React, { useRef, useCallback, useState, useMemo } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'motion/react';
import { Heart, X, Star, MapPin, Sparkles, Info, Shield, Clock, ChevronUp } from 'lucide-react';
import { Profile } from '../../types';
import { useUX } from '../../context/UXContext';
import { cn } from '../../lib/utils';

// ============================================
// 1. TYPES
// ============================================

export interface SwipeCardProps {
  profile: Profile;
  isTop: boolean;
  onSwipeLeft: (profile: Profile) => void;
  onSwipeRight: (profile: Profile) => void;
  onSwipeUp: (profile: Profile) => void;
  onShowDetails?: (profile: Profile) => void;
  onSwipeDown?: (profile: Profile) => void;
  index?: number;
  totalCards?: number;
  enableHaptics?: boolean;
  enableSound?: boolean;
  swipeThreshold?: number;
  velocityThreshold?: number;
  showBadges?: boolean;
  showSuperLikeIndicator?: boolean;
  className?: string;
}

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  velocity: number;
  offset: { x: number; y: number };
}

// ============================================
// 2. CONSTANTES
// ============================================

const DEFAULT_SWIPE_THRESHOLD = 100;
const DEFAULT_VELOCITY_THRESHOLD = 400;
const DRAG_ELASTIC = 0.8;
const ANIMATION_DURATION = 0.3;

// ============================================
// 3. SOUS-COMPOSANTS
// ============================================

// 3.1 Swipe Badge
const SwipeBadge: React.FC<{
  type: 'like' | 'pass' | 'superlike';
  opacity: any;
  position: 'left' | 'right' | 'center';
}> = ({ type, opacity, position }) => {
  const configs = {
    like: {
      icon: Heart,
      label: 'LIKE',
      color: 'bg-emerald-500/90',
      rotate: '-12deg',
    },
    pass: {
      icon: X,
      label: 'PASSER',
      color: 'bg-rose-600/90',
      rotate: '12deg',
    },
    superlike: {
      icon: Star,
      label: 'SUPER LIKE',
      color: 'bg-blue-500/95',
      rotate: '0deg',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  const positionClasses = {
    left: 'top-8 left-8',
    right: 'top-8 right-8',
    center: 'bottom-32 inset-x-0 mx-auto w-max',
  };

  return (
    <motion.div
      style={{ opacity }}
      className={cn(
        'absolute z-30 pointer-events-none',
        positionClasses[position]
      )}
    >
      <div
        className={cn(
          'flex items-center space-x-2 px-4 py-2 rounded-2xl',
          'text-white font-black text-xl tracking-wider uppercase',
          'border-2 border-white shadow-xl',
          config.color,
          type === 'superlike' && 'scale-110'
        )}
        style={{ 
          transform: type === 'superlike' ? 'scale(1.1)' : `rotate(${config.rotate})` 
        }}
      >
        <Icon className={cn(
          'w-6 h-6',
          type === 'like' ? 'fill-white' : 'stroke-[3]',
          type === 'superlike' && 'fill-white'
        )} />
        <span>{config.label}</span>
      </div>
    </motion.div>
  );
};

// 3.2 Profile Info
const ProfileInfo: React.FC<{
  profile: Profile;
  onShowDetails?: () => void;
  isTop?: boolean;
}> = ({ profile, onShowDetails, isTop = true }) => {
  const photoUrl = useMemo(() => {
    return (profile as any).img ||
      (profile as any).photos?.[0] ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80';
  }, [profile]);

  const isVerified = Boolean((profile as any).verified === true || (profile as any).isVerified === true || (profile as any).is_verified === true || (profile as any).isPhotoVerified === true);
  const isOnline = (profile as any).online;
  const distance = (profile as any).distance || '3';
  const city = (profile as any).city ? `${(profile as any).city}${(profile as any).country ? `, ${(profile as any).country}` : ''}` : ((profile as any).location || 'À proximité');

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
      {/* Gradient Overlay */}
      <div className="bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-20 pb-6 px-6">
        <div className="flex items-end justify-between pointer-events-auto">
          <div>
            {/* Nom & Âge */}
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow text-white">
                {profile.name}, {profile.age}
              </h2>

              {/* Badge Vérifié */}
              {isVerified && (
                <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shadow-lg shadow-blue-500/30">
                  ✓
                </div>
              )}

              {/* Statut en ligne */}
              {isOnline && (
                <div className="flex items-center space-x-1">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                  <span className="text-[10px] font-bold text-emerald-400">En ligne</span>
                </div>
              )}
            </div>

            {/* Localisation & Distance */}
            <p className="text-xs sm:text-sm text-neutral-300 font-medium flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>{city}</span>
              <span className="w-1 h-1 rounded-full bg-neutral-500" />
              <span>{distance} km</span>
            </p>

            {/* Bio */}
            {profile.bio && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xs sm:text-sm text-neutral-200 line-clamp-2 mt-2 font-normal leading-relaxed max-w-[80%]"
              >
                {profile.bio}
              </motion.p>
            )}
          </div>

          {/* Bouton Détails */}
          {onShowDetails && isTop && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onShowDetails();
              }}
              className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all active:scale-90 shadow-lg"
              aria-label="Voir profil complet"
            >
              <Info className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

// 3.3 Swipe Indicator
const SwipeIndicator: React.FC<{
  direction: 'left' | 'right' | 'up' | 'down' | null;
  isDragging: boolean;
}> = ({ direction, isDragging }) => {
  if (!isDragging || !direction) return null;

  const configs = {
    left: { icon: X, color: 'text-rose-500', label: 'PASSER' },
    right: { icon: Heart, color: 'text-emerald-500', label: 'LIKE' },
    up: { icon: Star, color: 'text-blue-500', label: 'SUPER LIKE' },
    down: { icon: X, color: 'text-gray-400', label: 'IGNORER' },
  };

  const config = configs[direction];
  const Icon = config.icon;

  return (
    <div className={cn(
      'absolute inset-0 flex items-center justify-center z-30 pointer-events-none',
      direction === 'up' ? 'items-start pt-20' : '',
      direction === 'down' ? 'items-end pb-20' : ''
    )}>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className={cn(
          'flex items-center space-x-2 px-6 py-3 rounded-2xl',
          'text-white font-black text-2xl uppercase',
          'border-2 border-white shadow-2xl backdrop-blur-md',
          direction === 'left' && 'bg-rose-500/80 rotate-[-12deg]',
          direction === 'right' && 'bg-emerald-500/80 rotate-[12deg]',
          direction === 'up' && 'bg-blue-500/80',
          direction === 'down' && 'bg-gray-700/80'
        )}
      >
        <Icon className={cn(
          'w-8 h-8',
          direction === 'left' ? 'stroke-[3]' : 'fill-white'
        )} />
        <span>{config.label}</span>
      </motion.div>
    </div>
  );
};

// 3.4 Card Background
const CardBackground: React.FC<{ photoUrl: string }> = React.memo(({ photoUrl }) => (
  <div className="absolute inset-0 bg-neutral-900">
    <img
      src={photoUrl}
      alt="Profile"
      className="w-full h-full object-cover pointer-events-none select-none"
      draggable={false}
      loading="lazy"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
  </div>
));

CardBackground.displayName = 'CardBackground';

// 3.5 Stack Indicator
const StackIndicator: React.FC<{
  index: number;
  total: number;
}> = ({ index, total }) => (
  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-1.5">
    {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
      <div
        key={i}
        className={cn(
          'w-1.5 h-1.5 rounded-full transition-all duration-300',
          i === index ? 'bg-white w-3' : 'bg-white/30'
        )}
      />
    ))}
    {total > 5 && (
      <span className="text-[10px] font-bold text-white/50 ml-1">
        +{total - 5}
      </span>
    )}
  </div>
);

// ============================================
// 4. COMPOSANT PRINCIPAL
// ============================================

export interface SwipeCardRef {
  swipe: (direction: 'left' | 'right' | 'up' | 'down', velocity?: number) => Promise<void>;
  reset: () => void;
}

export const SwipeCard = React.forwardRef<SwipeCardRef, SwipeCardProps>(({
  profile,
  isTop,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onShowDetails,
  index = 0,
  totalCards = 1,
  enableHaptics = true,
  enableSound = true,
  swipeThreshold = DEFAULT_SWIPE_THRESHOLD,
  velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
  showBadges = true,
  showSuperLikeIndicator = true,
  className = '',
}, ref) => {
  // ============================================
  // 4.1 HOOKS
  // ============================================

  const { triggerFeedback, playSound } = useUX();
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null);
  const isMounted = useRef(true);

  // ============================================
  // 4.2 TRANSFORMS
  // ============================================

  const rotate = useTransform(x, [-250, 0, 250], [-18, 0, 18]);
  const scale = useTransform(x, [-250, 0, 250], [0.95, 1, 0.95]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-20, -120], [0, 1]);
  const superLikeOpacity = useTransform(y, [-20, -100], [0, 1]);
  const downOpacity = useTransform(y, [20, 100], [0, 1]);

  // ============================================
  // 4.3 PHOTO URL
  // ============================================

  const photoUrl = useMemo(() => {
    return (profile as any).img ||
      (profile as any).photos?.[0] ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80';
  }, [profile]);

  // ============================================
  // 4.4 HAPTIC FEEDBACK
  // ============================================

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success') => {
    if (!enableHaptics) return;
    triggerFeedback(type);
  }, [enableHaptics, triggerFeedback]);

  const triggerSound = useCallback((sound: 'like' | 'pass' | 'superlike' | 'match') => {
    if (!enableSound) return;
    if (sound !== 'pass') {
      playSound?.(sound);
    }
  }, [enableSound, playSound]);

  // ============================================
  // 4.5 SWIPE LOGIC
  // ============================================

  const performSwipe = useCallback(async (
    direction: 'left' | 'right' | 'up' | 'down',
    velocity: number = 1
  ) => {
    const configs = {
      left: {
        x: -window.innerWidth - 100,
        y: 0,
        callback: () => {
          triggerHaptic('light');
          onSwipeLeft(profile);
        },
        sound: 'pass' as const,
      },
      right: {
        x: window.innerWidth + 100,
        y: 0,
        callback: () => {
          triggerHaptic('medium');
          triggerSound('like');
          onSwipeRight(profile);
        },
        sound: 'like' as const,
      },
      up: {
        x: 0,
        y: -window.innerHeight,
        callback: () => {
          triggerHaptic('heavy');
          triggerSound('superlike');
          onSwipeUp(profile);
        },
        sound: 'superlike' as const,
      },
      down: {
        x: 0,
        y: window.innerHeight,
        callback: () => {
          triggerHaptic('light');
          onSwipeDown?.(profile);
        },
        sound: 'pass' as const,
      },
    };

    const config = configs[direction];
    if (!config) return;

    const duration = Math.max(0.2, 0.35 - velocity * 0.1);

    await controls.start({
      x: config.x,
      y: config.y,
      opacity: 0,
      rotate: direction === 'left' ? -15 : direction === 'right' ? 15 : 0,
      transition: { duration, ease: 'easeOut' },
    });

    config.callback();
  }, [controls, profile, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, triggerHaptic, triggerSound]);

  // ============================================
  // 4.6 DRAG HANDLER
  // ============================================

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setSwipeDirection(null);
  }, []);

  const handleDrag = useCallback((_event: any, info: PanInfo) => {
    const offsetX = info.offset.x;
    const offsetY = info.offset.y;

    // Déterminer la direction dominante
    const absX = Math.abs(offsetX);
    const absY = Math.abs(offsetY);

    if (absX > absY && absX > 30) {
      setSwipeDirection(offsetX > 0 ? 'right' : 'left');
    } else if (absY > absX && absY > 30) {
      setSwipeDirection(offsetY < 0 ? 'up' : 'down');
    } else {
      setSwipeDirection(null);
    }
  }, []);

  const handleDragEnd = useCallback(async (_event: any, info: PanInfo) => {
    setIsDragging(false);
    setSwipeDirection(null);

    const offsetX = info.offset.x;
    const offsetY = info.offset.y;
    const velocityX = info.velocity.x;
    const velocityY = info.velocity.y;

    const absX = Math.abs(offsetX);
    const absY = Math.abs(offsetY);

    // Superlike (Up)
    if ((offsetY < -swipeThreshold && absY > absX) || velocityY < -velocityThreshold) {
      await performSwipe('up', Math.abs(velocityY) / 1000);
      return;
    }

    // Swipe Down
    if ((offsetY > swipeThreshold && absY > absX) || velocityY > velocityThreshold) {
      await performSwipe('down', Math.abs(velocityY) / 1000);
      return;
    }

    // Like (Right)
    if (offsetX > swipeThreshold || velocityX > velocityThreshold) {
      await performSwipe('right', Math.abs(velocityX) / 1000);
      return;
    }

    // Pass (Left)
    if (offsetX < -swipeThreshold || velocityX < -velocityThreshold) {
      await performSwipe('left', Math.abs(velocityX) / 1000);
      return;
    }

    // Spring back
    controls.start({
      x: 0,
      y: 0,
      rotate: 0,
      transition: { type: 'spring', damping: 20, stiffness: 300 },
    });
  }, [controls, swipeThreshold, velocityThreshold, performSwipe]);

  // ============================================
  // 4.7 EXPOSED METHODS (via ref)
  // ============================================

  React.useImperativeHandle(ref, () => ({
    swipe: performSwipe,
    reset: () => {
      controls.start({
        x: 0,
        y: 0,
        opacity: 1,
        rotate: 0,
        transition: { type: 'spring', damping: 20, stiffness: 300 },
      });
    },
  }), [controls, performSwipe]);

  // ============================================
  // 4.8 RENDU
  // ============================================

  const stackScale = 1 - (index / 20);

  return (
    <motion.div
      style={{
        x,
        y,
        rotate: isTop ? rotate : 0,
        scale: isTop ? scale : stackScale,
        willChange: 'transform',
        zIndex: totalCards - index,
      }}
      animate={controls}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={DRAG_ELASTIC}
      onDragStart={isTop ? handleDragStart : undefined}
      onDrag={isTop ? handleDrag : undefined}
      onDragEnd={isTop ? handleDragEnd : undefined}
      className={cn(
        'absolute inset-0 w-full h-full rounded-[32px] overflow-hidden select-none touch-none shadow-2xl bg-neutral-900',
        !isTop && 'pointer-events-none',
        className
      )}
    >
      {/* Background */}
      <CardBackground photoUrl={photoUrl} />

      {/* Stack Indicator */}
      {totalCards > 1 && <StackIndicator index={index} total={totalCards} />}

      {/* Swipe Badges */}
      {showBadges && isTop && (
        <>
          <SwipeBadge type="like" opacity={likeOpacity} position="left" />
          <SwipeBadge type="pass" opacity={passOpacity} position="right" />
          {showSuperLikeIndicator && (
            <SwipeBadge type="superlike" opacity={superLikeOpacity} position="center" />
          )}
        </>
      )}

      {/* Drag Indicator */}
      <SwipeIndicator
        direction={swipeDirection}
        isDragging={isDragging}
      />

      {/* Profile Info */}
      <ProfileInfo
        profile={profile}
        onShowDetails={isTop ? () => onShowDetails?.(profile) : undefined}
        isTop={isTop}
      />

      {/* Super Like Hint (floating) */}
      {isTop && showSuperLikeIndicator && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
        >
          <div className="flex items-center space-x-1.5 text-[10px] font-bold text-white/30">
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Swipez vers le haut pour Super Like</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});

SwipeCard.displayName = 'SwipeCard';

// ============================================
// 5. EXPORT PAR DÉFAUT
// ============================================

export default SwipeCard;