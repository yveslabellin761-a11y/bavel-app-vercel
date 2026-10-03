import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playSynthAudio } from '../../../utils/audio';

export interface BurstPoint {
  id: string;
  x: number;
  y: number;
  particles: Array<{
    id: number;
    angle: number;
    distance: number;
    size: number;
    rotation: number;
    emoji?: string;
    isHeartIcon?: boolean;
    color: string;
    delay: number;
    duration: number;
  }>;
}

const HEART_COLORS = [
  '#e20030', // Bavel brand red
  '#ff2d55', // Vibrant rose
  '#ff4757', // Coral red
  '#ff6b81', // Soft pink
  '#f368e0', // Bright magenta
  '#ff3838', // Deep scarlet
  '#fd79a8', // Bubblegum pink
  '#ffa502', // Golden sparkle
  '#ff5252', // Crimson
];

const HEART_EMOJIS = ['❤️', '💖', '💕', '💗', '✨', '💓', '💘', '⭐'];

export function useHeartBurst() {
  const [bursts, setBursts] = useState<BurstPoint[]>([]);

  const triggerBurst = useCallback((event?: React.MouseEvent | { clientX: number; clientY: number } | null) => {
    try {
      playSynthAudio('like');
    } catch (e) {}

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([15, 30, 20]);
      } catch (e) {}
    }

    let x = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
    let y = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;

    if (event) {
      if ('clientX' in event && 'clientY' in event && event.clientX && event.clientY) {
        x = event.clientX;
        y = event.clientY;
      } else if ('currentTarget' in event && event.currentTarget) {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
    }

    const burstId = `burst_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const particleCount = 18;

    const particles = Array.from({ length: particleCount }).map((_, i) => {
      const angle = (i * (360 / particleCount) + (Math.random() * 25 - 12)) * (Math.PI / 180);
      const distance = 45 + Math.random() * 75;
      const size = 12 + Math.random() * 14;
      const rotation = (Math.random() - 0.5) * 90;
      const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
      const emoji = Math.random() > 0.35 
        ? HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)]
        : undefined;

      return {
        id: i,
        angle,
        distance,
        size,
        rotation,
        emoji,
        isHeartIcon: !emoji,
        color,
        delay: Math.random() * 0.08,
        duration: 0.75 + Math.random() * 0.35,
      };
    });

    const newBurst: BurstPoint = {
      id: burstId,
      x,
      y,
      particles,
    };

    setBursts((prev) => [...prev, newBurst]);

    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== burstId));
    }, 1100);
  }, []);

  return { bursts, triggerBurst };
}

export function HeartParticleBurstOverlay({ bursts }: { bursts: BurstPoint[] }) {
  if (!bursts || bursts.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {bursts.map((burst) => (
          <React.Fragment key={burst.id}>
            {/* Shockwave halo ring 1 */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 2.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                left: burst.x - 30,
                top: burst.y - 30,
                width: 60,
                height: 60,
                borderRadius: '50%',
                border: '3px solid #ff2d55',
                boxShadow: '0 0 20px rgba(255, 45, 85, 0.5)',
              }}
            />

            {/* Shockwave halo ring 2 (subtle glow) */}
            <motion.div
              initial={{ scale: 0.1, opacity: 0.8 }}
              animate={{ scale: 3.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.05 }}
              style={{
                position: 'absolute',
                left: burst.x - 40,
                top: burst.y - 40,
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(226,0,48,0.3) 0%, rgba(255,107,129,0) 70%)',
              }}
            />

            {/* Radial floating particles */}
            {burst.particles.map((p) => {
              const targetX = Math.cos(p.angle) * p.distance;
              const targetY = Math.sin(p.angle) * p.distance - (20 + Math.random() * 25); // Add slight upward buoyancy

              return (
                <motion.div
                  key={`${burst.id}_${p.id}`}
                  initial={{
                    x: burst.x,
                    y: burst.y,
                    scale: 0,
                    opacity: 1,
                    rotate: 0,
                  }}
                  animate={{
                    x: burst.x + targetX,
                    y: burst.y + targetY,
                    scale: [0, 1.4, 1.1, 0],
                    opacity: [1, 1, 0.85, 0],
                    rotate: p.rotation * 2,
                  }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    ease: [0.175, 0.885, 0.32, 1.275],
                  }}
                  style={{
                    position: 'absolute',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {p.emoji ? (
                    <span 
                      style={{ 
                        fontSize: `${p.size}px`, 
                        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))',
                        display: 'block'
                      }}
                    >
                      {p.emoji}
                    </span>
                  ) : (
                    <svg
                      width={p.size}
                      height={p.size}
                      viewBox="0 0 24 24"
                      fill={p.color}
                      style={{ filter: 'drop-shadow(0 2px 6px rgba(226,0,48,0.4))' }}
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  )}
                </motion.div>
              );
            })}
          </React.Fragment>
        ))}
      </AnimatePresence>
    </div>
  );
}
