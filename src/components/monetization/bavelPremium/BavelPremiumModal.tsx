import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart } from 'lucide-react';
import { PaymentCheckoutModal, PaymentItem } from '../../modals/PaymentCheckoutModal';
import { BavelPremiumModalProps } from './types';

// Premium custom SVG icons matching Bavel visual identity (IMG_4386.PNG & IMG_4322)
const HeartSolidIcon = () => (
  <svg className="w-11 h-11 text-[#1c0d18]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const MessageBubbleIcon = () => (
  <svg className="w-10 h-10 text-[#1c0d18]" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M26 15a9 9 0 0 1-9 9c-1.8 0-3.5-.5-5-1.4L6 24l1.5-5.5C6.5 17.1 6 15.6 6 14a9 9 0 0 1 9-9h2a9 9 0 0 1 9 9z" fill="currentColor" fillOpacity="0.15" />
    <path d="M12 13h8M12 17h5" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const UnlimitedSwipesIcon = () => (
  <svg className="w-10 h-10 text-[#1c0d18]" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="9" width="16" height="18" rx="4" transform="rotate(-12 13 18)" fill="currentColor" fillOpacity="0.15" />
    <rect x="11" y="5" width="16" height="18" rx="4" transform="rotate(8 19 14)" fill="currentColor" fillOpacity="0.25" />
    <rect x="9" y="7" width="15" height="18" rx="3.5" fill="none" />
  </svg>
);

const IncognitoIcon = () => (
  <svg className="w-10 h-10 text-[#1c0d18]" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 14h20M9 14l3-8h8l3 8" strokeWidth="2.5" />
    <circle cx="10" cy="21" r="3.5" fill="currentColor" fillOpacity="0.2" />
    <circle cx="22" cy="21" r="3.5" fill="currentColor" fillOpacity="0.2" />
    <path d="M13.5 21h5" strokeWidth="2" />
  </svg>
);

const FiveHeartsIcon = () => (
  <svg className="w-10 h-10 text-[#1c0d18]" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 26s-9-6.5-9-12a6 6 0 0 1 10.2-4.24A6 6 0 0 1 27 14c0 5.5-9 12-9 12z" fill="currentColor" />
    <path d="M5 23L27 9" strokeWidth="2.8" strokeLinecap="round" />
  </svg>
);

const UndoSwipeIcon = () => (
  <svg className="w-10 h-10 text-[#1c0d18]" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 12a10 10 0 1 1 2.9 8.2" />
    <polyline points="8 6 8 13 15 13" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-10 h-10 text-[#1c0d18]" viewBox="0 0 32 32" fill="currentColor">
    <path d="M16 4l3.8 8.2L29 13.5l-6.8 6.1L24 28l-8-4.6L8 28l1.8-8.4L3 13.5l9.2-1.3L16 4z" />
  </svg>
);

const FilterIcon = () => (
  <svg className="w-10 h-10 text-[#1c0d18]" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="4 6 28 6 18 18 18 26 14 28 14 18 4 6" fill="currentColor" fillOpacity="0.15" />
  </svg>
);

const NoAdsIcon = () => (
  <svg className="w-10 h-10 text-[#1c0d18]" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="16" cy="16" r="12" />
    <line x1="7.5" y1="24.5" x2="24.5" y2="7.5" />
  </svg>
);

const BonusIcon = () => (
  <svg className="w-10 h-10 text-[#1c0d18]" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="16" cy="16" r="11" />
    <path d="M16 9v14M9 16h14" strokeWidth="3" />
  </svg>
);

const getPremiumSlides = (likesCount: number = 1) => [
  {
    id: 'who_liked_you',
    title: `${likesCount} personne${likesCount > 1 ? 's' : ''} vous ont donné un Like !`,
    description: 'Découvrez qui a aimé votre profil pour pouvoir discuter tout de suite',
    icon: HeartSolidIcon,
  },
  {
    id: 'unlimited_messages',
    title: 'Discuter en illimité',
    description: 'Envoyez autant de messages que vous souhaitez avec tous vos matchs.',
    icon: MessageBubbleIcon,
  },
  {
    id: 'unlimited_swipes',
    title: 'Swipes illimités',
    description: 'Swipez autant que vous voulez sans aucune restriction sur Rencontres.',
    icon: UnlimitedSwipesIcon,
  },
  {
    id: 'incognito_mode',
    title: 'Mode Incognito',
    description: 'Visitez des profils sans être vu et masquez votre statut en ligne.',
    icon: IncognitoIcon,
  },
  {
    id: 'coups_de_coeur',
    title: '5 Coups de Cœur par jour',
    description: 'Démarquez-vous de la foule et montrez un grand intérêt.',
    icon: FiveHeartsIcon,
  },
  {
    id: 'undo',
    title: 'Annulez vos Swipes à gauche',
    description: 'Possibilité de revenir sur un profil que vous avez passé.',
    icon: UndoSwipeIcon,
  },
  {
    id: 'extra_included',
    title: 'Toutes les options Extra incluses',
    description: 'Bavel Premium inclut automatiquement toutes les fonctionnalités de Bavel Extra.',
    icon: StarIcon,
  },
  {
    id: 'boost_visibility',
    title: 'Passez en tête des résultats',
    description: 'Obtenez jusqu\'à 5 fois plus de visibilité auprès des profils proches de vous.',
    icon: BonusIcon,
  },
  {
    id: 'advanced_filters',
    title: 'Filtres de recherche avancés',
    description: 'Trouvez exactement la personne recherchée selon vos critères précis.',
    icon: FilterIcon,
  },
  {
    id: 'no_ads',
    title: 'Expérience sans publicité',
    description: 'Profitez d\'une navigation fluide et 100% sans aucune publicité.',
    icon: NoAdsIcon,
  }
];

const premiumPlans = [
  {
    id: '1week',
    duration: '1',
    unit: 'semaine',
    price: '11,99 €',
    crossedPrice: null,
    footer: '11,99 €/semaine',
    badge: null,
  },
  {
    id: '1month',
    duration: '1',
    unit: 'mois',
    price: '29,99 €',
    crossedPrice: '51 €',
    footer: '29,99 €/mois',
    badge: 'CHOIX Nº 1',
  },
  {
    id: '3months',
    duration: '3',
    unit: 'mois',
    price: '59,99 €',
    crossedPrice: '154 €',
    footer: '20 €/mois',
    badge: null,
  },
  {
    id: '6months',
    duration: '6',
    unit: 'mois',
    price: '89,99 €',
    crossedPrice: '308 €',
    footer: '15 €/mois',
    badge: null,
  },
  {
    id: 'lifetime',
    duration: '∞',
    unit: 'À vie',
    price: '149,99 €',
    crossedPrice: null,
    footer: null,
    badge: 'MEILLEUR PRIX',
  }
];

export const BavelPremiumModal: React.FC<BavelPremiumModalProps> = ({ 
  onClose, 
  initialSlideId, 
  onSubscribe,
  likesCount = 1,
  onOpenComparison
}) => {
  const slides = getPremiumSlides(likesCount);
  const initialIndex = initialSlideId 
    ? slides.findIndex(s => s.id === initialSlideId || (initialSlideId === 'likes' && s.id === 'who_liked_you')) 
    : 0;

  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialIndex !== -1 ? initialIndex : 0);
  const [selectedPlanId, setSelectedPlanId] = useState('1month');
  const [direction, setDirection] = useState(0);
  const [checkoutItem, setCheckoutItem] = useState<PaymentItem | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);

  const currentSlide = slides[currentSlideIndex] || slides[0];
  const IconComponent = currentSlide.icon;

  const handleNextSlide = () => {
    setDirection(1);
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    resetAutoPlay();
  };

  const handlePrevSlide = () => {
    setDirection(-1);
    setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
    resetAutoPlay();
  };

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayTimer.current = setInterval(() => {
      setDirection(1);
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, 3800);
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
    const plan = premiumPlans.find(p => p.id === selectedPlanId) || premiumPlans[1];
    
    setCheckoutItem({
      type: 'subscription',
      productId: `premium_${plan.id}`,
      subscriptionPlan: 'premium',
      title: `Bavel Premium (${plan.duration} ${plan.unit})`,
      amount: plan.price,
      description: 'Accès VIP complet à toutes les fonctionnalités Premium de Bavel',
    });
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      className="fixed inset-0 z-[300] bg-[#1a0c16] flex flex-col justify-between overflow-hidden text-white font-sans select-none"
    >
      {/* Top Header Bar (matches IMG_4386.PNG: Close, Title, Comparer) */}
      <div className="pt-3 px-4 pb-1 shrink-0">
        <div className="flex items-center justify-between relative h-11">
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-start text-white/90 hover:text-white active:scale-95 transition-all cursor-pointer z-10"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" strokeWidth={2.5} />
          </button>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[17px] font-bold text-white tracking-wide">Premium</span>
          </div>

          <button 
            onClick={() => {
              if (onOpenComparison) {
                onOpenComparison();
              } else {
                onClose();
              }
            }}
            className="text-[14.5px] font-medium text-white/90 hover:text-white transition-opacity cursor-pointer z-10 pr-1"
          >
            Comparer
          </button>
        </div>
      </div>

      {/* Central Auto-Rotating Carousel & Hero */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 relative overflow-hidden py-1">
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
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 40 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="flex flex-col items-center text-center w-full max-w-[340px]"
            >
              {/* White Icon Badge with Dark Icon (IMG_4386.PNG) */}
              <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-white flex items-center justify-center shadow-2xl mb-5 shrink-0">
                <IconComponent />
              </div>

              {/* Slide Title */}
              <h2 className="text-[20px] sm:text-[22px] font-bold text-white leading-tight mb-2.5 px-2">
                {currentSlide.title}
              </h2>

              {/* Slide Description */}
              <p className="text-[13.5px] sm:text-[14px] text-white/80 leading-relaxed max-w-[320px] font-normal px-2">
                {currentSlide.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator */}
          <div className="flex justify-center items-center space-x-1.5 mt-6">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setDirection(idx > currentSlideIndex ? 1 : -1);
                  setCurrentSlideIndex(idx);
                  resetAutoPlay();
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlideIndex 
                    ? 'w-1.5 bg-white' 
                    : 'w-1.5 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Pricing Grid + Disclaimer + Action Button */}
      <div className="shrink-0 pb-6 pt-1">
        {/* Horizontal Scrollable Plans (matches IMG_4386.PNG) */}
        <div className="flex space-x-2.5 overflow-x-auto px-4 pt-4 pb-2 no-scrollbar justify-start sm:justify-center items-stretch touch-pan-x">
          {premiumPlans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`relative min-w-[108px] w-[112px] shrink-0 bg-[#2b1322] rounded-[22px] pt-3.5 pb-3 px-2 flex flex-col items-center justify-between text-center cursor-pointer transition-all select-none ${
                  isSelected 
                    ? 'border-2 border-white shadow-xl ring-2 ring-white/10' 
                    : 'border-2 border-transparent hover:border-white/20 opacity-90'
                }`}
              >
                {/* Badge pill resting at top border */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-tight shadow-md whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                {/* Duration */}
                <div className="flex flex-col items-center mt-0.5">
                  <span className="text-[28px] sm:text-[32px] font-black text-white leading-none tracking-tight">
                    {plan.duration}
                  </span>
                  <span className="text-[13px] font-medium text-white/90 mt-0.5 mb-2">
                    {plan.unit}
                  </span>
                </div>

                {/* Prices */}
                <div className="flex flex-col items-center w-full">
                  {plan.crossedPrice ? (
                    <span className="text-[11px] font-medium text-white/40 line-through leading-tight">
                      {plan.crossedPrice}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-transparent leading-tight select-none">
                      -
                    </span>
                  )}
                  <span className="text-[14.5px] font-black text-white leading-tight">
                    {plan.price}
                  </span>
                  {plan.footer ? (
                    <span className="text-[10px] font-normal text-white/70 leading-tight mt-0.5">
                      {plan.footer}
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal text-transparent leading-tight mt-0.5 select-none">
                      -
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclaimer Text (matches IMG_4386.PNG) */}
        <p className="text-[10px] sm:text-[10.5px] text-white/70 text-center px-6 mt-3 mb-3.5 leading-snug font-normal">
          Facturation récurrente - annulation possible à tout moment.<br />
          <span className="underline cursor-pointer hover:text-white">Conditions générales</span> &{' '}
          <span className="underline cursor-pointer hover:text-white">Politique de confidentialité</span>. Le pourcentage de crédits bonus est susceptible de changer lors de futurs achats de crédits.
        </p>

        {/* Big White Continuer Button */}
        <div className="px-4">
          <button
            onClick={handleSubscribeClick}
            className="w-full bg-white hover:bg-neutral-100 text-black font-extrabold text-[16px] py-4 rounded-full shadow-lg active:scale-[0.98] transition-all cursor-pointer text-center"
          >
            Continuer
          </button>
        </div>
      </div>

      {/* Payment Checkout Modal Integration */}
      {checkoutItem && (
        <PaymentCheckoutModal
          item={checkoutItem}
          onClose={() => setCheckoutItem(null)}
        />
      )}
    </motion.div>
  );
};

export default BavelPremiumModal;
