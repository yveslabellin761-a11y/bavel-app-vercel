import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Sparkles, CheckCircle2, X, Flame, ShieldCheck, Clock } from 'lucide-react';
import { CreditPackage, monetizationService } from '../../services/monetizationService';
import { aiMonetizationEngine } from '../../services/aiMonetizationEngine';
import { useUX } from '../../context/UXContext';
import { Button } from '../../components/ui/button';
import { PaymentCheckoutModal, PaymentItem } from '../../components/modals/PaymentCheckoutModal';

interface CreditsStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreditsStoreModal: React.FC<CreditsStoreModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { triggerFeedback, playSound } = useUX();

  // Get dynamic prices computed by AI Monetization Engine
  const dynamicPrices = aiMonetizationEngine.getDynamicPrices();
  const [selectedPack, setSelectedPack] = useState<CreditPackage>(dynamicPrices.credits[1]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // Update selection if pricing list regenerates or filters change
  useEffect(() => {
    if (isOpen) {
      const prices = aiMonetizationEngine.getDynamicPrices();
      setSelectedPack(prices.credits[1] || prices.credits[0]);
    }
  }, [isOpen]);

  const handlePurchase = async () => {
    setShowCheckout(true);
  };

  const handleClose = () => {
    if (!isSuccess && !isProcessing) {
      // User closed the purchase dialog without checking out: log their hesitation
      aiMonetizationEngine.registerHesitation();
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentPrices = aiMonetizationEngine.getDynamicPrices();

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-neutral-900 text-white rounded-3xl p-6 shadow-2xl border border-neutral-800 overflow-hidden"
          >
            {/* Active Promo Header Banner */}
            {currentPrices.hasActiveFlashPromo && (
              <div className="bg-gradient-to-r from-red-600 via-pink-600 to-amber-500 py-1.5 px-4 -mx-6 -mt-6 mb-4 flex items-center justify-between text-[11px] font-black tracking-wide text-white animate-pulse">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  OFFRE D'ACQUISITION ACTIVE (-35%)
                </span>
                <span className="bg-black/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Dépêchez-vous !
                </span>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Boutique de Crédits</h3>
                  <p className="text-[11px] text-neutral-400">Débloquez des boosts, superlikes et interactions</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isSuccess ? (
              <div className="space-y-4">
                {/* Credit Packages Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {currentPrices.credits.map((pkg) => {
                    const isSelected = selectedPack.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => {
                          triggerFeedback('light');
                          setSelectedPack(pkg);
                        }}
                        className={`relative p-3.5 rounded-2xl cursor-pointer border-2 transition-all text-left ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/20 scale-[1.02]'
                            : 'bg-neutral-800/60 border-neutral-700/60 hover:bg-neutral-800'
                        }`}
                      >
                        {pkg.bonus && (
                          <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow">
                            {pkg.bonus}
                          </span>
                        )}

                        <div className="flex items-center space-x-1.5 text-amber-400 font-black text-xl mb-1">
                          <Coins className="w-5 h-5" />
                          <span>{pkg.credits}</span>
                        </div>

                        <div className="flex flex-col">
                          <p className="text-xs font-bold text-white leading-tight">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
                              pkg.priceEUR
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <p className="text-xs text-center text-neutral-400">
                    Paiement par carte bancaire. Le montant est confirmé avant redirection vers Stripe.
                  </p>
                </div>

                {/* Summary & Checkout CTA */}
                <div className="pt-2">
                  <Button
                    onClick={handlePurchase}
                    disabled={isProcessing}
                    className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-[#e20030] hover:opacity-90 text-white font-black text-sm shadow-xl shadow-rose-500/25"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isProcessing
                      ? 'Validation du paiement...'
                      : `Acheter ${selectedPack.credits} crédits · ${new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(selectedPack.priceEUR)}`}
                  </Button>

                  <p className="text-[10px] text-center text-neutral-400 mt-2 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Paiement 100% chiffré et sécurisé. Crédits instantanés.
                  </p>
                </div>
              </div>
            ) : (
              /* Success View */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-6 space-y-4"
              >
                <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h4 className="text-lg font-black text-white">Recharge Confirmée !</h4>
                  <p className="text-xs text-neutral-300 mt-1">
                    +{selectedPack.credits} crédits ont été ajoutés à votre solde.
                  </p>
                </div>

                <Button
                  onClick={onClose}
                  className="w-full h-12 rounded-2xl bg-white text-neutral-900 hover:bg-neutral-100 font-bold text-sm"
                >
                  Continuer à swiper
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </AnimatePresence>
      {showCheckout && (
        <PaymentCheckoutModal
          item={{
            type: 'credits',
            productId: selectedPack.id,
            title: `${selectedPack.credits} crédits`,
            amount: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
              selectedPack.priceEUR
            ),
            creditsToAdd: selectedPack.credits,
            creditsAmount: selectedPack.credits,
            description: 'Crédits Bavel'
          }}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </>
  );
};
