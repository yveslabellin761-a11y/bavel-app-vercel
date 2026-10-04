import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw } from 'lucide-react';
import { PaymentCheckoutModal, PaymentItem } from '../../modals/PaymentCheckoutModal';
import { BavelExtraModalProps, BavelExtraPlan, BavelExtraSlide } from './types';

// Custom icons tailored to 100% match screenshots (IMG_4314 - IMG_4319)
const CardsStackIcon = () => (
  <svg
    className="w-10 h-10 text-[#4f0a2d]"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect
      x="5"
      y="9"
      width="16"
      height="18"
      rx="4"
      transform="rotate(-12 13 18)"
      fill="currentColor"
      fillOpacity="0.15"
    />
    <rect
      x="11"
      y="5"
      width="16"
      height="18"
      rx="4"
      transform="rotate(8 19 14)"
      fill="currentColor"
      fillOpacity="0.25"
    />
    <rect x="9" y="7" width="15" height="18" rx="3.5" fill="none" />
  </svg>
);

const HeartCoinIcon = () => (
  <svg
    className="w-10 h-10 text-[#4f0a2d]"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="15" cy="16" r="11" />
    <path d="M15 20s-4.5-3.2-4.5-6a3 3 0 0 1 5.1-2.12A3 3 0 0 1 20.7 14c0 2.8-5.7 6-5.7 6z" fill="currentColor" />
    <path d="M26 11.5a11 11 0 0 1 0 9" strokeWidth="3" />
  </svg>
);

const ProhibitionIcon = () => (
  <svg
    className="w-10 h-10 text-[#4f0a2d]"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="16" cy="16" r="12" />
    <line x1="7.5" y1="24.5" x2="24.5" y2="7.5" />
  </svg>
);

const HeartArrowIcon = () => (
  <svg
    className="w-10 h-10 text-[#4f0a2d]"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path
      d="M16 26s-9-6.5-9-12a6 6 0 0 1 10.2-4.24A6 6 0 0 1 27 14c0 5.5-9 12-9 12z"
      fill="currentColor"
      fillOpacity="0.2"
    />
    <path d="M16 26s-9-6.5-9-12a6 6 0 0 1 10.2-4.24A6 6 0 0 1 27 14c0 5.5-9 12-9 12z" />
    <path d="M5 23L27 9" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M22 8.5l5.5 0.5l-0.5 5.5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UndoIcon = () => (
  <svg
    className="w-10 h-10 text-[#4f0a2d]"
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 12a10 10 0 1 1 2.9 8.2" />
    <polyline points="8 6 8 13 15 13" />
  </svg>
);

const extraSlides = [
  {
    id: 'unlimited_swipes',
    title: 'Swipez aussi souvent que vous voulez',
    description: 'Profitez de swipes illimités sur Rencontres.',
    icon: CardsStackIcon
  },
  {
    id: 'bonus_credits',
    title: 'Des crédits bonus pour tout achat de crédits',
    description: 'Recevez au moins 20 % de crédits en plus sur vos achats de crédits.',
    icon: HeartCoinIcon
  },
  {
    id: 'no_ads',
    title: 'Supprimez toutes les pubs',
    description: "Désactivez toutes les publicités sur l'application.",
    icon: ProhibitionIcon
  },
  {
    id: 'coup_de_coeur',
    title: '1 Coup de Cœur par jour',
    description: "Indiquez à une personne qu'elle vous plaît et démarquez-vous vraiment des autres.",
    icon: HeartArrowIcon
  },
  {
    id: 'undo',
    title: 'Annulez vos Swipes à gauche',
    description: 'Possibilité de revenir sur un Swipe à gauche.',
    icon: UndoIcon
  }
];

const extraPlans = [
  {
    id: '1week',
    duration: '1',
    unit: 'semaine',
    price: '5,99 €',
    crossedPrice: null,
    footer: '5,99 €/semaine',
    badge: null
  },
  {
    id: '1month',
    duration: '1',
    unit: 'mois',
    price: '14,99 €',
    crossedPrice: '25 €',
    footer: '14,99 €/mois',
    badge: 'CHOIX Nº 1'
  },
  {
    id: '3months',
    duration: '3',
    unit: 'mois',
    price: '29,99 €',
    crossedPrice: '77 €',
    footer: '10 €/mois',
    badge: null
  },
  {
    id: '6months',
    duration: '6',
    unit: 'mois',
    price: '44,99 €',
    crossedPrice: '154 €',
    footer: '7,50 €/mois',
    badge: 'MEILLEUR PRIX'
  }
];

export const BavelExtraModal: React.FC<BavelExtraModalProps> = ({
  onClose,
  initialSlideId,
  onSubscribe,
  onOpenComparison,
  onSwitchToPremium
}) => {
  const initialIndex = initialSlideId ? extraSlides.findIndex((s) => s.id === initialSlideId) : 0;

  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialIndex !== -1 ? initialIndex : 0);
  const [selectedPlanId, setSelectedPlanId] = useState('1month');
  const [direction, setDirection] = useState(0);
  const [checkoutItem, setCheckoutItem] = useState<PaymentItem | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);

  const currentSlide = extraSlides[currentSlideIndex] || extraSlides[0];
  const IconComponent = currentSlide.icon;

  const handleNextSlide = () => {
    setDirection(1);
    setCurrentSlideIndex((prev) => (prev + 1) % extraSlides.length);
    resetAutoPlay();
  };

  const handlePrevSlide = () => {
    setDirection(-1);
    setCurrentSlideIndex((prev) => (prev - 1 + extraSlides.length) % extraSlides.length);
    resetAutoPlay();
  };

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayTimer.current = setInterval(() => {
      setDirection(1);
      setCurrentSlideIndex((prev) => (prev + 1) % extraSlides.length);
    }, 3500);
  };

  const stopAutoPlay = () => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current);
      autoPlayTimer.current = null;
    }
  };

  const resetAutoPlay = () => {
    startAutoPlay();
  };

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = touchStartX - currentX;

    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
      setTouchStartX(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartX(null);
  };

  const handleSubscribeClick = () => {
    const plan = extraPlans.find((p) => p.id === selectedPlanId) || extraPlans[1];

    setCheckoutItem({
      type: 'subscription',
      productId: `extra_${plan.id}`,
      subscriptionPlan: 'extra',
      title: `Bavel Extra (${plan.duration} ${plan.unit})`,
      amount: plan.price,
      description: 'Accès illimité aux fonctionnalités Bavel Extra'
    });
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="fixed inset-0 z-[300] bg-[#4f0a2d] flex flex-col justify-between overflow-hidden text-white font-sans select-none"
    >
      {/* Top Header Bar */}
      <div className="pt-3 px-4 pb-1 shrink-0">
        <div className="flex items-center justify-between relative h-10">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-white/90 hover:text-white active:scale-95 transition-all cursor-pointer z-10"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" strokeWidth={2.5} />
          </button>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[17px] font-bold text-white tracking-wide">Extra</span>
          </div>

          <button
            onClick={() => {
              if (onOpenComparison) {
                onOpenComparison();
              } else {
                onClose();
              }
            }}
            className="text-[14px] font-medium text-white/90 hover:text-white transition-opacity cursor-pointer z-10"
          >
            Comparer
          </button>
        </div>

        {/* Navigation Tabs (Extra | Premium) */}
        <div className="flex border-b border-white/10 mt-2 relative">
          <button className="w-1/2 py-2 text-center text-[15px] font-bold text-white relative cursor-pointer">
            Extra
            <motion.div
              layoutId="extraActiveUnderline"
              className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white"
            />
          </button>

          <button
            onClick={() => {
              if (onSwitchToPremium) {
                onSwitchToPremium();
              }
            }}
            className="w-1/2 py-2 text-center text-[15px] font-medium text-white/60 hover:text-white/80 transition-colors cursor-pointer"
          >
            Premium
          </button>
        </div>
      </div>

      {/* Central Auto-Rotating Carousel */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 relative overflow-hidden py-2">
        <div
          className="w-full flex flex-col items-center cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 45 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 45 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="flex flex-col items-center text-center w-full max-w-[340px]"
            >
              {/* White Icon Badge */}
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-white flex items-center justify-center shadow-xl mb-4 shrink-0">
                <IconComponent />
              </div>

              {/* Slide Title */}
              <h2 className="text-[19px] sm:text-[21px] font-bold text-white leading-snug mb-2 px-2">
                {currentSlide.title}
              </h2>

              {/* Slide Description */}
              <p className="text-[13px] sm:text-[14px] text-white/90 leading-snug max-w-[310px] font-normal px-2">
                {currentSlide.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator */}
          <div className="flex justify-center items-center space-x-2 mt-5">
            {extraSlides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setDirection(idx > currentSlideIndex ? 1 : -1);
                  setCurrentSlideIndex(idx);
                  resetAutoPlay();
                }}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlideIndex ? 'w-2 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Pricing Grid + Disclaimer + Action Button */}
      <div className="shrink-0 pb-6 pt-2">
        {/* Horizontal Scrollable Plans */}
        <div className="flex space-x-2.5 overflow-x-auto px-4 pt-4 pb-2 no-scrollbar justify-start sm:justify-center items-stretch touch-pan-x">
          {extraPlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`relative min-w-[105px] w-[110px] shrink-0 bg-[#68133b] rounded-[20px] pt-3.5 pb-3 px-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all select-none ${
                  isSelected ? 'border-2 border-white shadow-lg' : 'border-2 border-transparent hover:border-white/30'
                }`}
              >
                {/* Badge pill resting at top border */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-tight shadow-xs whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                {/* Duration */}
                <div className="flex flex-col items-center mt-1">
                  <span className="text-[28px] sm:text-[32px] font-extrabold text-white leading-none tracking-tight">
                    {plan.duration}
                  </span>
                  <span className="text-[12.5px] font-medium text-white mt-0.5 mb-2">{plan.unit}</span>
                </div>

                {/* Prices */}
                <div className="flex flex-col items-center w-full">
                  {plan.crossedPrice ? (
                    <span className="text-[11px] font-medium text-white/50 line-through leading-tight">
                      {plan.crossedPrice}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-transparent leading-tight select-none">-</span>
                  )}
                  <span className="text-[14px] font-bold text-white leading-tight">{plan.price}</span>
                  <span className="text-[10px] font-normal text-white/80 leading-tight mt-0.5">{plan.footer}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclaimer Text */}
        <p className="text-[10.5px] text-white/80 text-center px-6 mt-3.5 mb-4 leading-snug font-normal">
          Achat ponctuel sans renouvellement automatique. Les paiements sont temporairement suspendus.
          <br />
          <span className="underline cursor-pointer hover:text-white">Conditions générales</span> &{' '}
          <span className="underline cursor-pointer hover:text-white">Politique de confidentialité</span>. Le
          pourcentage de crédits bonus est susceptible de changer lors de futurs achats de crédits.
        </p>

        {/* Big White Continuer Button */}
        <div className="px-4">
          <button
            onClick={handleSubscribeClick}
            className="w-full bg-white text-black font-extrabold text-[15.5px] py-3.5 rounded-full shadow-lg hover:bg-gray-100 active:scale-[0.98] transition-all cursor-pointer text-center"
          >
            Continuer
          </button>
        </div>
      </div>

      {/* Payment Checkout Modal Integration */}
      {checkoutItem && <PaymentCheckoutModal item={checkoutItem} onClose={() => setCheckoutItem(null)} />}
    </motion.div>
  );
};

export default BavelExtraModal;
