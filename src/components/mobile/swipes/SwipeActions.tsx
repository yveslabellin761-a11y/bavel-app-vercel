// components/SwipeActions.tsx
import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Heart, RotateCcw } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface SwipeActionsProps {
  onPass: () => void;
  onCoupDeCoeur: () => void;
  onLike: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  isPageTurning?: boolean;
  size?: 'sm' | 'default' | 'lg';
  showTooltips?: boolean;
  keyboardShortcuts?: boolean;
}

/**
 * Icône "Cœur transpercé par une flèche" (Cupidon / Coup de foudre)
 * Reproduction fidèle à 100% basée sur la capture d'écran réelle :
 * - Corps du cœur noir avec entaille/découpe diagonale de la flèche
 * - Pointe de flèche barbelée en haut à droite avec dégagement net
 * - Empennage / plumes d'aileron en bas à gauche
 */
export function CupidHeartArrowIcon({ className = "w-6 h-6 text-black" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Corps du cœur avec fente de flèche et empennage bas-gauche */}
      <path
        d="M15.47 9.73 L16.8 8.4 L18.13 8.27 L18.13 8.4 L19.33 8.53 L19.33 9.07 L19.6 9.33 L19.6 11.73 L19.33 12.0 L19.33 12.8 L19.07 12.93 L18.93 13.73 L18.67 13.87 L18.67 14.27 L18.4 14.4 L18.0 15.33 L17.6 15.6 L17.6 15.87 L17.33 15.87 L17.33 16.13 L16.53 16.93 L16.27 16.93 L16.27 17.2 L15.73 17.33 L15.07 18.0 L14.8 18.0 L14.8 18.13 L14.53 18.13 L14.0 18.53 L12.8 18.8 L12.8 18.93 L11.33 19.07 L11.33 19.2 L10.27 19.2 L10.27 19.07 L8.8 18.93 L8.8 18.8 L8.4 18.8 L8.4 18.67 L8.0 18.67 L8.0 18.53 L7.6 18.53 L7.6 18.4 L6.93 18.53 L6.93 18.8 L5.87 19.73 L6.0 20.27 L6.27 20.27 L6.4 20.67 L6.67 20.67 L6.67 20.93 L6.93 21.07 L6.93 21.33 L6.53 21.73 L3.47 21.73 L3.47 21.6 L2.93 21.47 L2.93 19.2 L2.8 19.2 L2.93 19.07 L2.93 18.8 L2.8 18.8 L2.93 18.67 L2.93 17.87 L3.6 17.73 L3.6 17.87 L4.0 18.0 L4.0 18.27 L4.27 18.27 L4.27 18.53 L4.93 18.67 L5.07 18.27 L5.33 18.27 L5.33 18.0 L5.73 17.87 L5.73 17.33 L5.33 16.93 L5.07 16.93 L4.27 16.13 L4.27 15.87 L4.0 15.87 L4.0 15.6 L3.6 15.33 L3.6 15.07 L3.33 14.93 L3.33 14.67 L3.07 14.53 L3.07 14.27 L2.67 13.73 L2.67 13.33 L2.4 13.2 L2.27 12.0 L2.0 11.73 L2.0 9.33 L2.27 9.07 L2.4 8.27 L2.67 8.13 L2.8 7.6 L3.73 6.67 L4.27 6.53 L4.4 6.27 L4.67 6.27 L4.93 6.0 L5.47 6.0 L5.47 5.87 L7.73 5.87 L7.73 6.0 L8.27 6.0 L8.53 6.27 L8.93 6.27 L9.07 6.53 L9.33 6.53 L10.4 7.6 L10.4 7.87 L10.8 8.27 L11.07 8.13 L11.2 7.6 L12.27 6.53 L12.53 6.53 L12.67 6.27 L13.07 6.27 L13.07 6.13 L13.73 6.0 L13.73 5.87 L16.0 5.87 L16.0 6.0 L16.27 6.0 L16.27 7.6 L13.73 10.0 L13.73 10.67 L14.0 10.93 L14.4 10.93 L15.47 9.87 Z"
      />
      {/* Pointe de flèche en haut à droite avec cran barbelé */}
      <path
        d="M19.07 7.33 L18.0 7.33 L18.0 7.2 L17.6 7.2 L17.33 6.93 L17.33 4.13 L17.73 3.73 L17.73 3.47 L18.93 2.4 L19.33 2.4 L19.6 2.67 L19.6 4.8 L19.73 4.93 L21.87 4.93 L22.13 5.2 L22.13 5.73 L20.93 6.93 L20.67 6.93 L20.53 7.2 L19.2 7.33 Z"
      />
    </svg>
  );
}

// Bouton d'action circulaire blanc épuré conforme au format mobile
const ActionButton = ({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
  size = 'large',
  haptic = true,
  showTooltip = true,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  size?: 'medium' | 'large';
  haptic?: boolean;
  showTooltip?: boolean;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (haptic && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
    onClick();
  };

  const isMedium = size === 'medium';
  // Tailles adaptées au format mobile pour une proportion optimale
  const sizeClasses = isMedium
    ? 'w-[42px] h-[42px] sm:w-[46px] sm:h-[46px]'
    : 'w-[50px] h-[50px] sm:w-[56px] sm:h-[56px]';

  const button = (
    <motion.button
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 450, damping: 22 }}
      disabled={disabled}
      onClick={handleClick}
      className={`
        relative ${sizeClasses}
        bg-white 
        rounded-full 
        flex items-center justify-center 
        shadow-[0_6px_20px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.06)] 
        active:shadow-[0_2px_8px_rgba(0,0,0,0.12)]
        transition-all duration-150 
        disabled:opacity-50 disabled:cursor-not-allowed
        touch-manipulation cursor-pointer 
        group overflow-hidden select-none
        border border-black/[0.04]
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black
      `}
      aria-label={label}
      aria-disabled={disabled}
      aria-describedby={shortcut ? `shortcut-${label.replace(/\s/g, '-')}` : undefined}
    >
      {/* Icône en noir pur conforme à la photo */}
      <span className="text-black z-20 flex items-center justify-center transition-transform">
        {icon}
      </span>

      {/* Raccourci clavier (survol desktop) */}
      {shortcut && (
        <span 
          id={`shortcut-${label.replace(/\s/g, '-')}`}
          className="absolute -bottom-1 -right-1 text-[8px] font-mono bg-black/80 text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none"
        >
          {shortcut}
        </span>
      )}
    </motion.button>
  );

  if (showTooltip) {
    return (
      <Tooltip.Root delayDuration={400}>
        <Tooltip.Trigger asChild>
          <div className="pointer-events-auto">
            {button}
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-black/90 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg backdrop-blur-sm border border-white/10 max-w-[200px] z-50"
            sideOffset={8}
            side="top"
          >
            {label}
            {shortcut && (
              <span className="ml-2 text-[10px] opacity-60 font-mono">
                {shortcut}
              </span>
            )}
            <Tooltip.Arrow className="fill-black/90" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }

  return <div className="pointer-events-auto">{button}</div>;
};

export function SwipeActions({
  onPass,
  onCoupDeCoeur,
  onLike,
  onUndo,
  canUndo = false,
  isPageTurning = false,
  showTooltips = true,
  keyboardShortcuts = true,
}: SwipeActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastActionRef = useRef<(() => void) | undefined>(undefined);

  // 📌 Gestion des raccourcis clavier
  useEffect(() => {
    if (!keyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (isPageTurning) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onPass();
          lastActionRef.current = onPass;
          break;
        case 'ArrowRight':
          e.preventDefault();
          onLike();
          lastActionRef.current = onLike;
          break;
        case 'ArrowUp':
          e.preventDefault();
          onCoupDeCoeur();
          lastActionRef.current = onCoupDeCoeur;
          break;
        case 'z':
        case 'Z':
          if ((e.ctrlKey || e.metaKey) && canUndo && onUndo) {
            e.preventDefault();
            onUndo();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPass, onLike, onCoupDeCoeur, onUndo, canUndo, isPageTurning, keyboardShortcuts]);

  // 📢 Annonceur d'accessibilité (pour les lecteurs d'écran)
  const announceAction = (action: string) => {
    const announcer = document.getElementById('swipe-actions-announcer');
    if (announcer) {
      announcer.textContent = `Action: ${action}`;
    }
  };

  const wrapAction = (action: () => void, name: string) => {
    return () => {
      action();
      announceAction(name);
    };
  };

  return (
    <>
      {/* Annonceur accessible (caché visuellement) */}
      <div
        id="swipe-actions-announcer"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      <Tooltip.Provider>
        <div 
          ref={containerRef}
          className="absolute bottom-4 sm:bottom-6 left-0 right-0 flex justify-center items-center gap-2.5 sm:gap-4 px-3 z-30 pointer-events-auto select-none"
          role="toolbar"
          aria-label="Actions de swipe"
        >
          {/* 0. Bouton Annuler / Rewind (Rotation jaune) */}
          {onUndo && (
            <ActionButton
              icon={
                <RotateCcw 
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${canUndo ? 'text-[#ff9500]' : 'text-neutral-300'}`} 
                  strokeWidth={2.5} 
                />
              }
              label="Annuler le swipe"
              shortcut="⌘Z"
              onClick={wrapAction(onUndo, 'Annuler le swipe')}
              disabled={!canUndo || isPageTurning}
              size="medium"
              showTooltip={showTooltips}
            />
          )}

          {/* 1. Bouton X (Passer) - Cercle blanc compact, X noir */}
          <ActionButton
            icon={
              <X 
                className="w-5 h-5 sm:w-6 sm:h-6 text-black" 
                strokeWidth={3.2} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            }
            label="Passer"
            shortcut="←"
            onClick={wrapAction(onPass, 'Passer')}
            disabled={isPageTurning}
            size="large"
            showTooltip={showTooltips}
          />

          {/* 2. Bouton Cœur Flèche (Coup de Cœur / Coup de foudre) - Cercle blanc compact, Cœur fléché noir 100% visible */}
          <ActionButton
            icon={
              <CupidHeartArrowIcon className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            }
            label="Coup de Cœur"
            shortcut="↑"
            onClick={wrapAction(onCoupDeCoeur, 'Coup de cœur')}
            disabled={isPageTurning}
            size="medium"
            showTooltip={showTooltips}
          />

          {/* 3. Bouton Cœur (Liker) - Cercle blanc compact, Cœur noir plein */}
          <ActionButton
            icon={
              <Heart 
                className="w-5 h-5 sm:w-6 sm:h-6 text-black fill-black" 
                strokeWidth={0} 
              />
            }
            label="Liker"
            shortcut="→"
            onClick={wrapAction(onLike, 'Liker')}
            disabled={isPageTurning}
            size="large"
            showTooltip={showTooltips}
          />
        </div>
      </Tooltip.Provider>
    </>
  );
}