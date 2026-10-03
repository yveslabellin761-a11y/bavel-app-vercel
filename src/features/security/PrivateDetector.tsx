import React, { useState } from 'react';
import { Eye, EyeOff, ShieldAlert, Flag, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useUX } from '../../context/UXContext';
import { cn } from '../../lib/utils';

interface PrivateDetectorProps {
  src: string;
  alt: string;
  isInitiallySensitive?: boolean;
  className?: string;
  onReport?: () => void;
  onBlockUser?: () => void;
}

export const PrivateDetector: React.FC<PrivateDetectorProps> = ({
  src,
  alt,
  isInitiallySensitive = true,
  className,
  onReport,
  onBlockUser,
}) => {
  const { triggerFeedback } = useUX();
  const [isRevealed, setIsRevealed] = useState(!isInitiallySensitive);
  const [showOptions, setShowOptions] = useState(false);

  const toggleReveal = () => {
    triggerFeedback('medium');
    setIsRevealed(!isRevealed);
  };

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-neutral-900', className)}>
      {/* Image with dynamic blur filter */}
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-all duration-300',
          !isRevealed ? 'filter blur-2xl scale-110 opacity-70' : 'filter-none scale-100 opacity-100'
        )}
      />

      {/* Sensitive Content Warning Overlay */}
      {!isRevealed && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-3 text-center bg-black/50 backdrop-blur-xs">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-1.5 border border-rose-500/30">
            <ShieldAlert className="w-4 h-4" />
          </div>

          <p className="text-xs font-bold text-white leading-tight">Image Potentiellement Sensible</p>
          <p className="text-[10px] text-neutral-300 mb-2">Détecteur privé Bavel actif</p>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleReveal}
              className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold flex items-center gap-1 backdrop-blur-md transition-all active:scale-95"
            >
              <Eye className="w-3 h-3" />
              Révéler
            </button>

            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-1 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-[11px] transition-all"
              title="Options de sécurité"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Options Dropdown */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute bottom-2 inset-x-2 p-2 rounded-xl bg-neutral-900 border border-neutral-700 shadow-xl flex flex-col gap-1 z-20"
              >
                {onReport && (
                  <button
                    onClick={() => {
                      triggerFeedback('medium');
                      setShowOptions(false);
                      onReport();
                    }}
                    className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-neutral-800 text-rose-400 text-[11px] font-bold text-left"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Signaler ce contenu</span>
                  </button>
                )}
                {onBlockUser && (
                  <button
                    onClick={() => {
                      triggerFeedback('heavy');
                      setShowOptions(false);
                      onBlockUser();
                    }}
                    className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 text-[11px] font-bold text-left"
                  >
                    <UserX className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Bloquer l'utilisateur</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Button to Re-hide when revealed */}
      {isRevealed && isInitiallySensitive && (
        <button
          onClick={toggleReveal}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/80 backdrop-blur-xs text-[10px] transition-all"
          title="Masquer à nouveau"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
