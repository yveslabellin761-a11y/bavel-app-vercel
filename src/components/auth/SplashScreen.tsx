import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles } from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

interface SplashScreenProps {
  /** Contrôle la visibilité du splash screen */
  isVisible?: boolean;
  /** Callback appelé après le délai minimum */
  onComplete?: () => void;
  /** Durée minimum d'affichage en ms */
  minDisplayTime?: number;
  /** Variante de style */
  variant?: 'default' | 'premium' | 'dark';
  /** Couleur d'accentuation personnalisée */
  accentColor?: string;
}

// ============================================
// 2. COMPOSANT PRINCIPAL
// ============================================

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isVisible = true,
  onComplete,
  minDisplayTime = 2000,
  variant = 'default',
  accentColor = 'from-purple-600 via-rose-500 to-amber-400',
}) => {
  const [isExiting, setIsExiting] = useState(false);

  // Délai automatique avant fermeture
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onComplete?.();
      }, 400); // Attendre la fin de l'animation de sortie
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [isVisible, onComplete, minDisplayTime]);

  // Configurations par variante
  const variants = {
    default: {
      background: 'from-[#16042c] via-[#1f093a] to-[#0d021a]',
      orbColor1: 'bg-purple-600/30',
      orbColor2: 'bg-rose-600/30',
      textColor: 'electric-text',
      badgeGradient: 'from-purple-600 via-rose-500 to-amber-400',
      dotGradient: 'from-purple-400 to-rose-400',
    },
    premium: {
      background: 'from-[#1a0a2e] via-[#2d1b4e] to-[#1a0a2e]',
      orbColor1: 'bg-blue-600/30',
      orbColor2: 'bg-indigo-600/30',
      textColor: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400',
      badgeGradient: 'from-blue-500 via-purple-500 to-pink-500',
      dotGradient: 'from-blue-400 to-purple-400',
    },
    dark: {
      background: 'from-[#0a0a0a] via-[#141414] to-[#0a0a0a]',
      orbColor1: 'bg-white/10',
      orbColor2: 'bg-white/5',
      textColor: 'text-white',
      badgeGradient: 'from-white/20 to-white/10',
      dotGradient: 'from-white/40 to-white/20',
    },
  };

  const config = variants[variant] || variants.default;

  // Configuration des points de l'onde
  const dots = [0, 1, 2, 3, 4];

  // Si invisible et non en cours de sortie, ne rien afficher
  if (!isVisible && !isExiting) return null;

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 bg-[#0d021c] z-[9999] flex items-center justify-center p-0 md:p-4 select-none will-change-transform will-change-opacity"
          role="status"
          aria-label="Chargement de l'application Bavel"
        >
          <motion.div
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className={`
              w-full h-full md:max-w-[370px] md:max-h-[740px]
              bg-gradient-to-b ${config.background}
              text-white md:rounded-[36px] shadow-2xl
              flex flex-col justify-center items-center relative
              overflow-hidden border border-white/10 p-6
              will-change-transform
            `}
          >
            {/* ========================================== */}
            {/* AMBIENT GLOWING ORBS */}
            {/* ========================================== */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`absolute -top-24 -left-24 w-80 h-80 ${config.orbColor1} rounded-full blur-[100px] pointer-events-none will-change-transform will-change-opacity`}
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={`absolute -bottom-24 -right-24 w-80 h-80 ${config.orbColor2} rounded-full blur-[100px] pointer-events-none will-change-transform will-change-opacity`}
            />

            {/* ========================================== */}
            {/* CONTEU CENTRAL */}
            {/* ========================================== */}
            <div className="flex flex-col items-center justify-center z-10 my-auto">
              {/* Badge logo animé */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mb-6 relative"
              >
                <div className={`
                  w-20 h-20 rounded-3xl
                  bg-gradient-to-tr ${config.badgeGradient}
                  p-0.5 shadow-2xl shadow-rose-950/50
                  will-change-transform
                `}>
                  <div className="w-full h-full bg-[#16042c] rounded-[22px] flex items-center justify-center relative overflow-hidden">
                    <motion.div
                      animate={{
                        scale: [1, 1.12, 1],
                        rotate: [0, 2, -2, 0],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="will-change-transform"
                    >
                      <Heart className="w-10 h-10 text-rose-500 fill-rose-500/30 drop-shadow-[0_0_12px_rgba(244,63,94,0.3)]" />
                    </motion.div>

                    {/* Effet de brillance */}
                    <motion.div
                      animate={{
                        opacity: [0, 1, 0],
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 0.5,
                      }}
                      className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] pointer-events-none"
                    />
                  </div>
                </div>

                {/* Badge "Nouveau" */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.3 }}
                  className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full shadow-lg shadow-rose-500/50"
                >
                  ✨ NEW
                </motion.div>
              </motion.div>

              {/* Nom de la marque */}
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.2,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`
                  text-[42px] font-zapfino
                  drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]
                  mb-8 leading-normal pb-4 pt-2 text-center
                  ${config.textColor}
                  will-change-transform will-change-opacity
                `}
              >
                Bavel
              </motion.h1>

              {/* Points d'onde animés */}
              <div className="flex items-center space-x-2.5">
                {dots.map((index) => (
                  <motion.div
                    key={index}
                    animate={{
                      y: ['0px', '-10px', '0px'],
                      scale: [1, 1.35, 1],
                      opacity: [0.35, 1, 0.35],
                    }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.15,
                    }}
                    className={`
                      w-2.5 h-2.5 rounded-full
                      bg-gradient-to-r ${config.dotGradient}
                      shadow-sm shadow-purple-500/50
                      will-change-transform will-change-opacity
                    `}
                  />
                ))}
              </div>

              {/* Version de l'app (optionnel) */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="text-[10px] text-white/30 font-mono mt-8 tracking-wider"
              >
                v3.2.1 • Édition Premium
              </motion.p>
            </div>

            {/* ========================================== */}
            {/* FOOTER - INDICATEUR DE CHARGEMENT */}
            {/* ========================================== */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="absolute bottom-8 left-0 right-0 flex justify-center"
            >
              <div className="flex items-center space-x-2 text-[10px] text-white/30 font-medium">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="w-3 h-3 border-2 border-white/20 border-t-purple-400 rounded-full"
                />
                <span>Chargement</span>
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  ...
                </motion.span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// 3. EXPORT PAR DÉFAUT
// ============================================

export default SplashScreen;