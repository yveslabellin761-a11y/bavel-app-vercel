import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Sliders, EyeOff, RotateCcw } from 'lucide-react';
import { PaymentCheckoutModal, PaymentItem } from './PaymentCheckoutModal';

interface OneDayPremiumModalProps {
  onClose: () => void;
}

export function OneDayPremiumModal({ onClose }: OneDayPremiumModalProps) {
  // 4 hours, 10 minutes, 2 seconds in seconds = 15002 seconds
  const [timeLeft, setTimeLeft] = useState<number>(4 * 3600 + 10 * 60 + 2);
  const [checkoutItem, setCheckoutItem] = useState<PaymentItem | null>(null);

  // Live ticking countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const handleBuy = () => {
    setCheckoutItem({
      type: 'subscription',
      productId: 'premium_1day',
      title: 'Premium pendant 1 jour',
      amount: '5,99 €',
      subscriptionPlan: 'premium',
      description: 'Accès illimité à toutes les fonctionnalités Premium pendant 24h.'
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed inset-0 z-[600] bg-white text-black flex flex-col justify-between overflow-y-auto select-none font-sans"
      >
        {/* Top Header / Close Button */}
        <div className="w-full flex justify-end p-5 relative z-10">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-black hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-7 h-7" strokeWidth={2.5} />
          </button>
        </div>

        {/* Main Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 max-w-md mx-auto w-full py-2">
          
          {/* Light Purple Circle with % Icon */}
          <div className="w-20 h-20 rounded-full bg-[#e8dbfc] flex items-center justify-center mb-4 shadow-xs">
            <span className="text-[32px] font-black text-black leading-none select-none">%</span>
          </div>

          {/* Title */}
          <h2 className="text-[20px] sm:text-[22px] font-black text-black text-center tracking-tight leading-tight">
            Premium pendant 1 jour
          </h2>

          {/* Subtitle */}
          <p className="text-[13px] sm:text-[14px] font-medium text-gray-600 text-center mt-1 mb-5">
            Les principaux avantages pour vous
          </p>

          {/* Advantages List */}
          <div className="w-full space-y-3.5 px-2 mb-6">
            {/* Item 1 */}
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
                <Heart className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[13.5px] sm:text-[14.5px] font-extrabold text-black">
                Découvrez à qui vous plaisez !
              </span>
            </div>

            {/* Item 2 */}
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sliders className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[13.5px] sm:text-[14.5px] font-extrabold text-black">
                Profitez de filtres illimités
              </span>
            </div>

            {/* Item 3 */}
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
                <EyeOff className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[13.5px] sm:text-[14.5px] font-extrabold text-black">
                Consultez les profils en mode incognito
              </span>
            </div>

            {/* Item 4 */}
            <div className="flex items-center space-x-3">
              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 shadow-xs">
                <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-[13.5px] sm:text-[14.5px] font-extrabold text-black">
                Annulez vos Swipes à gauche
              </span>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="text-[12.5px] sm:text-[13px] font-semibold text-gray-800 text-center mb-4 flex items-center justify-center space-x-1.5">
            <span>L'offre prend fin dans</span>
            <span className="text-[#e01e37] font-black tracking-wider font-mono text-[14px]">
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Main CTA Button */}
          <button
            onClick={handleBuy}
            className="w-full py-3 bg-black hover:bg-zinc-900 active:scale-98 text-white font-black text-[15px] rounded-full shadow-md transition-transform cursor-pointer"
          >
            Profitez-en pour 5,99 €
          </button>

          {/* Footer Subtext */}
          <p className="text-[11px] font-medium text-gray-500 text-center mt-2">
            Paiement unique. Prix : 5,99 €
          </p>
        </div>

        {/* Payment Checkout Modal */}
        {checkoutItem && (
          <PaymentCheckoutModal
            item={checkoutItem}
            onClose={() => setCheckoutItem(null)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
