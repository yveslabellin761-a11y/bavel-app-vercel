import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, 
  Heart, 
  RotateCcw, 
  Sliders, 
  Sparkles, 
  Check, 
  X, 
  ShieldCheck,
  Zap,
  Flame,
  Clock
} from 'lucide-react';
import { monetizationService } from '../../services/monetizationService';
import { aiMonetizationEngine } from '../../services/aiMonetizationEngine';
import { useUX } from '../../context/UXContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

interface PremiumPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PremiumPassModal: React.FC<PremiumPassModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { triggerFeedback, playSound } = useUX();
  const [tier, setTier] = useState<'premium' | 'vip'>('vip');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const perks = [
    { icon: Heart, label: 'Découvrir qui a aimé votre profil sans flou' },
    { icon: RotateCcw, label: 'Annuler (Rewind) vos swipes à l’infini' },
    { icon: Sliders, label: 'Filtres de recherche avancés (taille, diplôme, vérifiés)' },
    { icon: Zap, label: '1 Boost mensuel gratuit offert (valeur 100 crédits)' },
    { icon: ShieldCheck, label: 'Messages prioritaires et badge VIP doré' },
  ];

  const handleSubscribe = async () => {
    setIsProcessing(true);
    triggerFeedback('medium');

    const ok = await monetizationService.activateSubscription(tier, 'mobile_money');
    setIsProcessing(false);

    if (ok) {
      aiMonetizationEngine.registerPurchase();
      setIsSuccess(true);
      playSound('match');
      triggerFeedback('heavy');
      onSuccess?.();
      onClose();
    }
  };

  const handleClose = () => {
    if (!isSuccess && !isProcessing) {
      aiMonetizationEngine.registerHesitation();
    }
    onClose();
  };

  if (!isOpen) return null;

  const dynamicPrices = aiMonetizationEngine.getDynamicPrices();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-neutral-900 text-white rounded-3xl p-6 shadow-2xl border border-amber-500/40 overflow-hidden"
        >
          {/* Active Promo Header Banner */}
          {dynamicPrices.hasActiveFlashPromo && (
            <div className="bg-gradient-to-r from-red-600 via-pink-600 to-amber-500 py-1.5 px-4 -mx-6 -mt-6 mb-4 flex items-center justify-between text-[11px] font-black tracking-wide text-white animate-pulse">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-current" />
                OFFRE EXCLUSIVE ACTIVE (-35%)
              </span>
              <span className="bg-black/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Expires bientôt
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Pass Bavel VIP & Premium</h3>
                <p className="text-[11px] text-neutral-400">Multipliez vos opportunités de rencontres</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tier Selector */}
          <div className="grid grid-cols-2 gap-3 my-3">
            <div
              onClick={() => {
                triggerFeedback('light');
                setTier('premium');
              }}
              className={`p-3 rounded-2xl cursor-pointer border-2 transition-all text-left flex flex-col justify-between ${
                tier === 'premium'
                  ? 'bg-rose-500/15 border-rose-500 shadow-md'
                  : 'bg-neutral-800/60 border-neutral-700'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-neutral-300">Premium Pass</p>
                {dynamicPrices.hasActiveFlashPromo && dynamicPrices.originalExtraCFA && (
                  <span className="text-[9.5px] text-neutral-500 line-through font-bold">
                    {dynamicPrices.originalExtraCFA.toLocaleString()} FCFA
                  </span>
                )}
                <p className="text-base font-black text-white">{dynamicPrices.extraCFA.toLocaleString()} FCFA</p>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">/ mois</p>
            </div>

            <div
              onClick={() => {
                triggerFeedback('light');
                setTier('vip');
              }}
              className={`p-3 rounded-2xl cursor-pointer border-2 transition-all text-left relative flex flex-col justify-between ${
                tier === 'vip'
                  ? 'bg-amber-500/15 border-amber-500 shadow-lg shadow-amber-500/20'
                  : 'bg-neutral-800/60 border-neutral-700'
              }`}
            >
              <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-black">
                CONSEILLÉ
              </span>
              <div>
                <p className="text-xs font-bold text-amber-400">VIP Gold Pass</p>
                {dynamicPrices.hasActiveFlashPromo && dynamicPrices.originalPremiumCFA && (
                  <span className="text-[9.5px] text-neutral-500 line-through font-bold">
                    {dynamicPrices.originalPremiumCFA.toLocaleString()} FCFA
                  </span>
                )}
                <p className="text-base font-black text-white">{dynamicPrices.premiumCFA.toLocaleString()} FCFA</p>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">/ 3 mois (-35%)</p>
            </div>
          </div>

          {/* Perks List */}
          <div className="space-y-2.5 my-4 bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800">
            {perks.map((perk, idx) => {
              const Icon = perk.icon;
              return (
                <div key={idx} className="flex items-center space-x-2.5 text-xs text-neutral-200">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>{perk.label}</span>
                </div>
              );
            })}
          </div>

          {/* Action CTA */}
          <div className="pt-2">
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 text-white font-black text-sm shadow-xl shadow-amber-500/20"
            >
              <Crown className="w-4 h-4 mr-2" />
              {isProcessing ? 'Activation...' : `Activer le Pass ${tier === 'vip' ? 'VIP Gold' : 'Premium'}`}
            </Button>
            <p className="text-[10px] text-center text-neutral-400 mt-2">
              Annulable à tout moment depuis vos paramètres de profil.
              {dynamicPrices.hasActiveFlashPromo && " • Offre flash active temporairement."}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
