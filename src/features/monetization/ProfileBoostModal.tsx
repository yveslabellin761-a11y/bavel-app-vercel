import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Sparkles, 
  Clock, 
  Zap, 
  X, 
  Coins, 
  TrendingUp, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  monetizationService, 
  BOOST_COST_CREDITS 
} from '../../services/monetizationService';
import { useUX } from '../../context/UXContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface ProfileBoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStore?: () => void;
}

export const ProfileBoostModal: React.FC<ProfileBoostModalProps> = ({
  isOpen,
  onClose,
  onOpenStore,
}) => {
  const { triggerFeedback, playSound } = useUX();
  const [credits, setCredits] = useState(monetizationService.getCredits());
  const [boostState, setBoostState] = useState(monetizationService.getBoostState());
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = monetizationService.subscribe(() => {
      setCredits(monetizationService.getCredits());
      setBoostState(monetizationService.getBoostState());
    });
    return unsub;
  }, []);

  // Countdown timer when boost is active
  useEffect(() => {
    if (!boostState.isActive || !boostState.expiresAt) return;

    const interval = setInterval(() => {
      const remainingMs = boostState.expiresAt! - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('00:00');
        setBoostState(monetizationService.getBoostState());
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [boostState]);

  const handleActivate = async () => {
    setErrorMsg(null);
    if (credits < BOOST_COST_CREDITS) {
      setErrorMsg('Solde insuffisant pour activer le Boost (100 crédits requis).');
      return;
    }

    const res = await monetizationService.activateBoost();
    if (res.success) {
      playSound('match');
      triggerFeedback('heavy');
    } else {
      setErrorMsg(res.error || 'Erreur lors de l’activation.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-neutral-900 text-white rounded-3xl p-6 shadow-2xl border border-neutral-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 text-[#e20030] flex items-center justify-center border border-rose-500/30">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Boost de Profil</h3>
                <p className="text-[11px] text-neutral-400">Propulsez votre visibilité x5 pendant 30 min</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Boost Status / Animation Card */}
          <div className="relative p-6 rounded-3xl bg-gradient-to-b from-rose-950/40 via-neutral-900 to-neutral-950 border border-rose-800/40 text-center flex flex-col items-center justify-center overflow-hidden my-3">
            {/* Surge Waves Animation */}
            {boostState.isActive ? (
              <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full bg-[#e20030]/30"
                />
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0.2, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5, ease: 'easeInOut' }}
                  className="absolute inset-2 rounded-full bg-[#e20030]/40"
                />
                <div className="relative w-16 h-16 rounded-full bg-[#e20030] text-white flex items-center justify-center shadow-[0_0_25px_#e20030]">
                  <Flame className="w-8 h-8" />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-rose-500/20 text-[#e20030] border-2 border-rose-500/40 flex items-center justify-center mb-3 shadow-lg shadow-rose-500/10">
                <TrendingUp className="w-10 h-10" />
              </div>
            )}

            {boostState.isActive ? (
              <div>
                <Badge className="bg-rose-500 text-white font-black text-xs px-3 py-1 mb-2 animate-bounce">
                  BOOST EN COURS 🔥
                </Badge>
                <div className="text-3xl font-black tracking-tight text-white mb-1 font-mono">
                  {timeLeft || '30:00'}
                </div>
                <p className="text-xs text-neutral-300">
                  Votre profil est actuellement au sommet de la pile de cartes !
                </p>
              </div>
            ) : (
              <div>
                <h4 className="text-lg font-black text-white">Prêt à dominer les swipes ?</h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                  Passez en tête de liste pour tous les célibataires à proximité et recevez jusqu’à 5x plus de matchs.
                </p>
              </div>
            )}
          </div>

          {/* Balance & Price Info */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 my-3 text-xs">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              Votre solde :
              <strong className="text-white ml-1">{credits} crédits</strong>
            </span>
            <span className="font-bold text-rose-400">Coût : {BOOST_COST_CREDITS} crédits</span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center space-x-2 my-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action CTA */}
          <div className="space-y-2 pt-2">
            {!boostState.isActive ? (
              credits >= BOOST_COST_CREDITS ? (
                <Button
                  onClick={handleActivate}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-rose-600 to-[#e20030] hover:opacity-90 text-white font-black text-sm shadow-xl shadow-rose-600/30"
                >
                  <Flame className="w-4 h-4 mr-2 fill-white" />
                  Activer le Boost (30 min)
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    onClose();
                    onOpenStore?.();
                  }}
                  className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 text-white font-black text-sm"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Recharger des crédits (+100 requis)
                </Button>
              )
            ) : (
              <Button
                onClick={onClose}
                className="w-full h-12 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm"
              >
                Continuer à swiper
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
