import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, Heart, RotateCcw, Sliders, Check, X, ShieldCheck } from 'lucide-react';
import { monetizationService } from '../../services/monetizationService';
import { aiMonetizationEngine } from '../../services/aiMonetizationEngine';
import { useUX } from '../../context/UXContext';
import { Button } from '../../components/ui/button';

const PAYMENTS_ENABLED = import.meta.env.PROD && import.meta.env.VITE_PAYMENTS_ENABLED !== 'false';

interface PremiumPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PremiumPassModal: React.FC<PremiumPassModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { triggerFeedback, playSound } = useUX();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const perks = [
    { icon: Heart, label: 'Découvrir qui a aimé votre profil sans flou' },
    { icon: RotateCcw, label: 'Annuler (Rewind) vos swipes à l’infini' },
    { icon: Sliders, label: 'Filtres de recherche avancés (taille, diplôme, vérifiés)' },
    { icon: ShieldCheck, label: 'Messages prioritaires' }
  ];

  const handleSubscribe = async () => {
    if (!PAYMENTS_ENABLED) return;
    setIsProcessing(true);
    triggerFeedback('medium');

    const ok = await monetizationService.activateSubscription('premium', 'card');
    setIsProcessing(false);

    if (ok) {
      aiMonetizationEngine.registerPurchase();
      setIsSuccess(true);
      playSound('match');
      triggerFeedback('heavy');
      onSuccess?.();
      onClose();
    } else {
      setErrorMessage('Le paiement Premium est indisponible. Aucun débit n’a été effectué.');
    }
  };

  const handleClose = () => {
    if (!isSuccess && !isProcessing) {
      aiMonetizationEngine.registerHesitation();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-neutral-900 text-white rounded-3xl p-6 shadow-2xl border border-amber-500/40 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Bavel Premium</h3>
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

          {!PAYMENTS_ENABLED && (
            <div
              role="status"
              className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100"
            >
              Les paiements sont temporairement suspendus. Aucune souscription ni aucun débit ne sera effectué.
            </div>
          )}

          <div className="my-3 rounded-2xl border border-rose-500 bg-rose-500/10 p-4">
            <p className="text-sm font-bold text-white">Premium · 1 mois</p>
            <p className="mt-1 text-lg font-black text-white">29,99 €</p>
            <p className="text-[10px] text-neutral-400">Paiement ponctuel, sans renouvellement automatique.</p>
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

          {errorMessage && (
            <p role="alert" className="mt-2 text-center text-xs text-red-300">
              {errorMessage}
            </p>
          )}

          {/* Action CTA */}
          <div className="pt-2">
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing || !PAYMENTS_ENABLED}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 text-white font-black text-sm shadow-xl shadow-amber-500/20"
            >
              <Crown className="w-4 h-4 mr-2" />
              {isProcessing ? 'Activation...' : PAYMENTS_ENABLED ? 'Continuer vers le paiement' : 'Paiements suspendus'}
            </Button>
            <p className="text-[10px] text-center text-neutral-400 mt-2">
              {PAYMENTS_ENABLED
                ? 'Paiement ponctuel par carte, sans renouvellement automatique.'
                : 'Les offres ne peuvent pas être souscrites pour le moment.'}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
