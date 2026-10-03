import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Star, Shield, Play, Ban, Sparkles, Coins, Flame, Heart, ChevronRight, X,
  ThumbsUp, RotateCcw, ArrowUp, SlidersHorizontal, EyeOff, CheckCheck, ChevronsUp, Megaphone,
  Tv, Gift, Check
} from 'lucide-react';
import { User } from '../../types';
import BavelPremiumModal from '../modals/BavelPremiumModal';
import { BavelExtraModal, BavelExtraCard, BavelPremiumCard } from '../monetization';
import { PaymentCheckoutModal, PaymentItem } from '../modals/PaymentCheckoutModal';

// Re-export Bavel Extra and Bavel Premium tools from separated directories
export { BavelExtraModal, BavelPremiumModal, BavelExtraCard, BavelPremiumCard };

export function ExtraShowsMenu({ onClose, onOpenRecharge }: { onClose: () => void; onOpenRecharge?: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white rounded-t-[24px] flex flex-col items-center pt-6 pb-5 px-5 max-h-[90vh] z-10 shadow-2xl"
      >
        <motion.div 
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-16 h-16 bg-[#f3e5ff] rounded-full flex items-center justify-center mb-4 shadow-sm"
        >
          <Zap className="w-8 h-8 text-[#e20030] fill-[#e20030]" strokeWidth={1} />
        </motion.div>
        
        <h2 className="text-[18px] font-bold text-black mb-1.5 text-center">Extra Shows ⚡</h2>
        
        <p className="text-[13px] text-gray-500 leading-snug text-center mb-6 max-w-[260px]">
          Soyez vu(e) par plus de personnes pour augmenter vos chances de matcher.
        </p>

        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            onClose();
            if (onOpenRecharge) onOpenRecharge();
          }}
          className="w-full bg-[#1a1a1a] text-white rounded-full py-3.5 text-[14px] font-bold mb-3 shadow-md active:bg-black transition-colors cursor-pointer"
        >
          Profitez d'Extra Shows pour 150 crédits
        </motion.button>

        <button onClick={onClose} className="w-full text-black py-1.5 text-[13.5px] font-medium mb-4 hover:underline cursor-pointer">
          Peut-être plus tard
        </button>

        <p className="text-[10.5px] text-gray-400 text-center leading-tight">
          *Sur la base du top 10% d'un échantillon de 2,7 millions de personnes
        </p>
      </motion.div>
    </div>
  );
}

// 1. Dedicated "Toutes les fonctionnalités" Modal (Plum/Purple Cards Layout)
export function AllFeaturesModal({ 
  onClose, 
  initialTab = 'extra',
  onSubscribe,
  onOpenExtra,
  onOpenPremium
}: { 
  onClose: () => void; 
  initialTab?: 'extra' | 'premium';
  onSubscribe?: () => void;
  onOpenExtra?: () => void;
  onOpenPremium?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'extra' | 'premium'>(initialTab);
  const [checkoutItem, setCheckoutItem] = useState<PaymentItem | null>(null);

  const handleCTA = () => {
    if (activeTab === 'extra') {
      if (onOpenExtra) {
        onClose();
        onOpenExtra();
      } else {
        setCheckoutItem({
          type: 'subscription',
          productId: 'extra_1month',
          subscriptionPlan: 'extra',
          title: 'Bavel Extra (1 mois)',
          amount: '14,99 €',
          description: 'Accès illimité aux fonctionnalités Bavel Extra'
        });
      }
    } else {
      if (onOpenPremium) {
        onClose();
        onOpenPremium();
      } else {
        setCheckoutItem({
          type: 'subscription',
          productId: 'premium_1month',
          subscriptionPlan: 'premium',
          title: 'Bavel Premium (1 mois)',
          amount: '29,99 €',
          description: 'Accès VIP complet à toutes les fonctionnalités Premium'
        });
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-[#480A2B] z-[300] flex flex-col h-[100dvh] font-sans text-white select-none overflow-hidden"
    >
      {/* Header */}
      <div className="pt-9 pb-1.5 px-4 flex items-center justify-between shrink-0 relative">
        <button 
          onClick={onClose} 
          className="absolute right-3.5 top-9 p-2 text-white/90 hover:text-white transition-colors cursor-pointer z-20"
          aria-label="Fermer"
        >
          <X className="w-5.5 h-5.5" strokeWidth={2.2} />
        </button>

        <div className="w-full text-center">
          <h1 className="text-[13.5px] font-bold text-white tracking-tight">
            Toutes les fonctionnalités
          </h1>
          <div className="flex justify-center items-center mt-1 mb-0.5">
            <span className="text-[22px] font-zapfino mr-2">Bavel</span>
            <span className="text-[18px] font-normal text-white/90">
              {activeTab === 'extra' ? 'Extra' : 'Premium'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/15 mx-5 shrink-0 mt-0.5">
        <button
          onClick={() => setActiveTab('extra')}
          className={`flex-1 pb-2 font-bold text-[14px] transition-colors relative text-center cursor-pointer ${
            activeTab === 'extra' ? 'text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          Extra
          {activeTab === 'extra' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('premium')}
          className={`flex-1 pb-2 font-bold text-[14px] transition-colors relative text-center cursor-pointer ${
            activeTab === 'premium' ? 'text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          Premium
          {activeTab === 'premium' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
          )}
        </button>
      </div>

      {/* Subtitle */}
      <div className="text-center py-2 text-white/80 text-[12.5px] font-medium shrink-0">
        Découvrez les avantages
      </div>

      {/* Content Cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3.5 scrollbar-hide">
        {activeTab === 'extra' ? (
          <>
            {/* Card 1: Messages prioritaires */}
            <div className="bg-[#EFE5FA] text-black rounded-[20px] p-4 shadow-sm">
              <h2 className="text-[15.5px] font-extrabold text-black mb-3 tracking-tight">
                Messages prioritaires
              </h2>
              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Heart className="w-5 h-5 text-white fill-white" strokeWidth={0} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    1 Coup de Cœur par jour
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Indiquez à une personne qu'elle vous plaît et démarquez-vous vraiment des autres.
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Prenez le contrôle */}
            <div className="bg-[#EFE5FA] text-black rounded-[20px] p-4 shadow-sm space-y-4">
              <h2 className="text-[15.5px] font-extrabold text-black mb-1.5 tracking-tight">
                Prenez le contrôle
              </h2>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Ban className="w-5 h-5 text-white" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Supprimez toutes les pubs
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Désactivez toutes les publicités qui apparaissent sur l'application.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <ThumbsUp className="w-5 h-5 text-white fill-white" strokeWidth={1} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Swipez aussi souvent que vous voulez
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Profitez de swipes illimités sur Rencontres.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <RotateCcw className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Annulez vos Swipes à gauche
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Possibilité de revenir sur un Swipe à gauche.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Coins className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Des crédits bonus pour tout achat de crédits
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Pour tout achat de crédits sur l'application, recevez des crédits supplémentaires.
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* TAB PREMIUM */}
            {/* Card 1: Exclusivités Bavel Premium */}
            <div className="bg-[#EFE5FA] text-black rounded-[20px] p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-black/10 pb-2.5">
                <h2 className="text-[15.5px] font-extrabold text-black tracking-tight">
                  Exclusivités Bavel Premium
                </h2>
                <span className="bg-[#480A2B] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Premium
                </span>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Heart className="w-5 h-5 text-white fill-white" strokeWidth={0} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Découvrez qui vous a donné un Like
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Débloquez toutes les personnes qui vous ont déjà envoyé un Like.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <ArrowUp className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Les messages que vous envoyez ont la priorité
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Vos messages envoyés apparaîtront en tête de liste pour leurs destinataires.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <SlidersHorizontal className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Profitez de filtres illimités
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Utilisez des options de filtres illimités pour trouver le type de personnes que vous recherchez.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <EyeOff className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Consultez les profils en toute discrétion
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Consultez le profil d'une autre personne sans qu'elle en soit notifiée. Mettez votre profil en pause sans perdre vos Matchs et vos messages.
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Toutes les fonctionnalités Bavel Extra incluses */}
            <div className="bg-[#EFE5FA] text-black rounded-[20px] p-4 shadow-sm space-y-4 border-2 border-[#480A2B]/20">
              <div className="flex items-center justify-between border-b border-black/10 pb-2.5">
                <h2 className="text-[15.5px] font-extrabold text-black tracking-tight">
                  Inclus : Toutes les fonctionnalités Bavel Extra
                </h2>
                <span className="bg-[#480A2B]/15 text-[#480A2B] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Inclus dans Premium
                </span>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Heart className="w-5 h-5 text-white fill-white" strokeWidth={0} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    1 Coup de Cœur par jour
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Indiquez à une personne qu'elle vous plaît et démarquez-vous vraiment des autres.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Ban className="w-5 h-5 text-white" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Supprimez toutes les pubs
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Désactivez toutes les publicités qui apparaissent sur l'application.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <ThumbsUp className="w-5 h-5 text-white fill-white" strokeWidth={1} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Swipez aussi souvent que vous voulez
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Profitez de swipes illimités sur Rencontres.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <RotateCcw className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Annulez vos Swipes à gauche
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Possibilité de revenir sur un Swipe à gauche.
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Coins className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <div className="font-extrabold text-[13.5px] text-black leading-snug">
                    Des crédits bonus pour tout achat de crédits
                  </div>
                  <div className="text-[#555] text-[12px] leading-snug mt-0.5 font-medium">
                    Pour tout achat de crédits sur l'application, recevez des crédits supplémentaires.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-3.5 bg-gradient-to-t from-[#480A2B] via-[#480A2B]/95 to-transparent pt-5 z-30">
        <button 
          onClick={handleCTA}
          className="w-full bg-white hover:bg-gray-100 text-black font-extrabold py-3.5 rounded-full text-[14px] shadow-lg active:scale-[0.98] transition-transform cursor-pointer"
        >
          {activeTab === 'extra' 
            ? "Profitez d'Extra (à partir de 5,99 €)" 
            : "Passez à Premium (à partir de 11,99 €)"}
        </button>
      </div>

      {checkoutItem && (
        <PaymentCheckoutModal
          item={checkoutItem}
          onClose={() => setCheckoutItem(null)}
        />
      )}
    </motion.div>
  );
}

// 2. Dedicated "Comparaison" Modal (Triggered by the "Comparer" link inside Bavel Extra / Bavel Premium)
export function BavelComparisonModal({ 
  onClose,
  onOpenExtra,
  onOpenPremium
}: { 
  onClose: () => void;
  onOpenExtra?: () => void;
  onOpenPremium?: () => void;
}) {
  const [checkoutItem, setCheckoutItem] = useState<PaymentItem | null>(null);

  const handleSubscribePremium = () => {
    if (onOpenPremium) {
      onClose();
      onOpenPremium();
    } else {
      setCheckoutItem({
        type: 'subscription',
        productId: 'premium_1month',
        subscriptionPlan: 'premium',
        title: 'Bavel Premium (1 mois)',
        amount: '29,99 €',
        description: 'Accès VIP complet à toutes les fonctionnalités Premium'
      });
    }
  };

  const handleSubscribeExtra = () => {
    if (onOpenExtra) {
      onClose();
      onOpenExtra();
    } else {
      setCheckoutItem({
        type: 'subscription',
        productId: 'extra_1month',
        subscriptionPlan: 'extra',
        title: 'Bavel Extra (1 mois)',
        amount: '14,99 €',
        description: 'Accès illimité aux fonctionnalités Bavel Extra'
      });
    }
  };

  const comparisonItems = [
    {
      id: 'like',
      title: 'Découvrez qui vous a donné un Like',
      icon: () => <Heart className="w-5 h-5 text-white fill-white" strokeWidth={0} />,
      extra: false,
      premium: true,
    },
    {
      id: 'priority_msg',
      title: 'Envoyez vos messages en priorité',
      icon: () => <ArrowUp className="w-5 h-5 text-white" strokeWidth={2.8} />,
      extra: false,
      premium: true,
    },
    {
      id: 'unlimited_filters',
      title: 'Profitez de filtres illimités',
      icon: () => <SlidersHorizontal className="w-5 h-5 text-white" strokeWidth={2.5} />,
      extra: false,
      premium: true,
    },
    {
      id: 'incognito',
      title: 'Consultez les profils en toute discrétion',
      icon: () => (
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10h18M6 10l2-5h8l2 5" />
          <circle cx="8" cy="15" r="2.5" />
          <circle cx="16" cy="15" r="2.5" />
          <path d="M10.5 15h3" />
        </svg>
      ),
      extra: false,
      premium: true,
    },
    {
      id: 'swipes',
      title: 'Swipez aussi souvent que vous voulez',
      icon: () => <ThumbsUp className="w-5 h-5 text-white fill-white" strokeWidth={1} />,
      extra: true,
      premium: true,
    },
    {
      id: 'no_ads',
      title: 'Supprimez toutes les pubs',
      icon: () => <Ban className="w-5 h-5 text-white" strokeWidth={2.5} />,
      extra: true,
      premium: true,
    },
    {
      id: 'coup_de_coeur',
      title: '1 Coup de Cœur par jour',
      icon: () => (
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
          <path d="M3 18L21 6" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      ),
      extra: true,
      premium: true,
    },
    {
      id: 'undo',
      title: 'Annulez des swipes accidentels',
      icon: () => <RotateCcw className="w-5 h-5 text-white" strokeWidth={2.8} />,
      extra: true,
      premium: true,
    },
    {
      id: 'bonus_credits',
      title: 'Des crédits bonus pour tout achat de crédits',
      icon: () => (
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10M7 12h10" strokeWidth="2.5" />
        </svg>
      ),
      extra: true,
      premium: true,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-white z-[300] flex flex-col h-[100dvh] font-sans text-black select-none overflow-hidden"
    >
      {/* Top Bar Indicator & Header */}
      <div className="pt-2 px-4 pb-2 shrink-0 border-b border-gray-100 relative">
        <div className="w-full h-1.5 bg-[#480A2B] rounded-full mb-3 mt-1" />

        <div className="flex items-center justify-between relative h-10 px-1">
          <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200/60 rounded-full px-2.5 py-0.5 text-[12px] font-bold text-amber-900 shadow-2xs">
            <span className="text-amber-500 font-extrabold text-[11px]">⚡</span>
            <span>12</span>
          </div>

          <h1 className="absolute inset-0 flex items-center justify-center text-[18px] sm:text-[19px] font-bold text-black tracking-tight pointer-events-none">
            Comparaison
          </h1>

          <button 
            onClick={onClose} 
            className="p-1.5 -mr-1 text-black hover:opacity-70 transition-opacity cursor-pointer z-10"
            aria-label="Fermer"
          >
            <X className="w-6 h-6 text-black" strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex items-center justify-between pt-4 pb-1 px-1">
          <span className="text-[#888888] font-medium text-[13.5px] flex-1">
            Les avantages
          </span>
          <span className="text-black font-semibold text-[14.5px] w-16 text-center">
            Extra
          </span>
          <span className="text-black font-semibold text-[14.5px] w-16 text-center">
            Premium
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-1 space-y-0 no-scrollbar">
        {comparisonItems.map((item, idx) => {
          const IconComp = item.icon;
          return (
            <div 
              key={item.id}
              className={`flex items-center justify-between py-3.5 ${
                idx < comparisonItems.length - 1 ? 'border-b border-dashed border-gray-200' : ''
              }`}
            >
              <div className="w-9.5 h-9.5 rounded-full bg-[#480A2B] flex items-center justify-center shrink-0 text-white shadow-2xs">
                <IconComp />
              </div>

              <div className="text-[13.5px] sm:text-[14px] font-medium text-black leading-snug flex-1 pl-3 pr-2">
                {item.title}
              </div>

              <div className="w-16 flex items-center justify-center shrink-0">
                {item.extra ? (
                  <Check className="w-5 h-5 text-black stroke-[3]" />
                ) : (
                  <X className="w-4.5 h-4.5 text-gray-400 stroke-[2.2]" />
                )}
              </div>

              <div className="w-16 flex items-center justify-center shrink-0">
                {item.premium ? (
                  <Check className="w-5 h-5 text-black stroke-[3]" />
                ) : (
                  <X className="w-4.5 h-4.5 text-gray-400 stroke-[2.2]" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 bg-white border-t border-gray-100 p-4 space-y-2.5 z-20 shadow-lg">
        <button 
          onClick={handleSubscribePremium}
          className="w-full bg-[#121212] hover:bg-black text-white font-extrabold text-[15.5px] py-3.5 rounded-full shadow-md active:scale-[0.98] transition-transform cursor-pointer text-center"
        >
          Activez Premium
        </button>

        <button 
          onClick={handleSubscribeExtra}
          className="w-full bg-white border border-black hover:bg-gray-100 text-black font-extrabold text-[15.5px] py-3.5 rounded-full shadow-xs active:scale-[0.98] transition-transform cursor-pointer text-center"
        >
          Profitez d'Extra
        </button>
      </div>

      {checkoutItem && (
        <PaymentCheckoutModal
          item={checkoutItem}
          onClose={() => setCheckoutItem(null)}
        />
      )}
    </motion.div>
  );
}

export function WantMoreLikesModal({ 
  onClose, 
  onOpenRecharge, 
  userPhotos = [] 
}: { 
  onClose: () => void; 
  onOpenRecharge: () => void; 
  userPhotos?: string[]; 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-white z-[220] flex flex-col justify-between items-center py-10 px-6 font-sans select-none"
    >
      {/* Top Header Close button */}
      <div className="w-full flex items-center justify-start shrink-0">
        <button 
          onClick={onClose} 
          className="p-1.5 -ml-1.5 text-black hover:opacity-70 transition-opacity cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-6.5 h-6.5 text-black" strokeWidth={2.2} />
        </button>
      </div>

      {/* Main Content Center */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-auto w-full max-w-[320px]">
        {/* 3 Overlapping Avatars */}
        <div className="relative flex justify-center items-center mb-8 h-[110px] w-full">
          {/* Left Avatar */}
          <div className="w-[82px] h-[82px] rounded-full overflow-hidden border-[2.5px] border-white shadow-sm shrink-0 z-0 translate-x-[20px]">
            <img 
              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80" 
              alt="Profile left" 
              className="w-full h-full object-cover" 
            />
          </div>

          {/* Middle Avatar (Main user photo with lightning badge) */}
           <div className="relative w-[112px] h-[112px] rounded-full overflow-hidden border-[3.5px] border-white shadow-md shrink-0 z-10">
            <img 
              src={userPhotos[0] || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80"} 
              alt="Profile center" 
              className="w-full h-full object-cover object-top" 
            />
            {/* Lightning Zap Badge */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 w-[30px] h-[30px] rounded-full bg-[#EBE4FF] border-[2.5px] border-white flex items-center justify-center shadow-xs z-20">
              <Zap className="w-4 h-4 text-black fill-black" strokeWidth={0} />
            </div>
          </div>

          {/* Right Avatar */}
          <div className="w-[82px] h-[82px] rounded-full overflow-hidden border-[2.5px] border-white shadow-sm shrink-0 z-0 -translate-x-[20px]">
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80" 
              alt="Profile right" 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-[22px] font-black text-black mb-2.5 tracking-tight leading-snug">
          Vous voulez plus de Likes ?
        </h2>

        {/* Subtitle */}
        <p className="text-gray-500 text-[13.5px] font-medium leading-[1.38] mb-8 px-2">
          Découvrez plus de personnes dans Rencontres, ou augmentez vos chances grâce aux Extra Shows !
        </p>

        {/* Black Pill Action Button */}
        <button 
          onClick={onOpenRecharge}
          className="w-full bg-[#111111] hover:bg-black text-white font-bold py-3.5 rounded-full text-[15px] shadow-sm active:scale-[0.98] transition-transform cursor-pointer mb-3"
        >
          Encore plus de Likes
        </button>

        {/* Close Text Link */}
        <button 
          onClick={onClose}
          className="text-gray-500 font-semibold text-[13.5px] py-1 hover:text-black hover:underline transition-colors cursor-pointer"
        >
          Fermer
        </button>
      </div>

      <div className="w-full shrink-0 h-4" />
    </motion.div>
  );
}

export function RechargeCreditsMenu({ 
  onClose, 
  initialSlideIndex = 0, 
  targetProfileName, 
  showReadReceiptBenefit = false, 
  showUnlockChatBenefit = false,
  onRechargeSuccess
}: { 
  onClose: () => void; 
  initialSlideIndex?: number; 
  targetProfileName?: string; 
  showReadReceiptBenefit?: boolean; 
  showUnlockChatBenefit?: boolean;
  onRechargeSuccess?: (creditsAdded: number) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(initialSlideIndex);
  const [checkoutItem, setCheckoutItem] = useState<PaymentItem | null>(null);
  const benefits = [
    ...(showUnlockChatBenefit ? [{
      title: `Discutez avec ${targetProfileName || 'cette personne'}`,
      description: `Il vous faut 250 crédits pour démarrer cette discussion`,
      renderIcon: () => (
        <svg viewBox="0 0 32 32" className="w-11 h-11">
          <path d="M16 4C9.37 4 4 8.7 4 14.5C4 17.8 5.8 20.7 8.6 22.7C8.1 24.5 7.1 26.2 5.5 27.3C7.8 27.5 10.3 27 12.3 25.7C13.5 26.1 14.7 26.3 16 26.3C22.63 26.3 28 21.6 28 15.8C28 10 22.63 4 16 4Z" fill="black" />
          <circle cx="11" cy="15" r="1.5" fill="white" />
          <circle cx="16" cy="15" r="1.5" fill="white" />
          <circle cx="21" cy="15" r="1.5" fill="white" />
        </svg>
      )
    }] : []),
    ...(showReadReceiptBenefit ? [{
      title: `Vous voulez savoir si ${targetProfileName || 'cette personne'} a lu votre message ?`,
      description: `Grâce aux accusés de réception, vous saurez si ${targetProfileName || 'cette personne'} a vu votre message... Et tout ça pour seulement 50 crédits !`,
      renderIcon: () => (
        <CheckCheck className="w-12 h-12 text-black" strokeWidth={3} />
      )
    }] : []),
    {
      title: "Obtenez plus de Matchs",
      description: "Il vous faut 150 crédits pour montrer votre profil plus souvent dans la section Rencontres.",
      renderIcon: () => (
        <Zap className="w-11 h-11 text-black fill-black" strokeWidth={1} />
      )
    },
    {
      title: "Passez en tête de liste",
      description: "Il vous faut 100 crédits pour passer en tête dans la section À proximité.",
      renderIcon: () => (
        <ChevronsUp className="w-12 h-12 text-black" strokeWidth={3} />
      )
    },
    {
      title: "Recevez plus de messages",
      description: "Il vous faut 100 crédits pour montrer aux autres que vous êtes en ligne.",
      renderIcon: () => (
        <Megaphone className="w-10 h-10 text-black fill-black" />
      )
    }
  ];

  // Auto-slide carousel animation timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % benefits.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [benefits.length]);

  const packages = [
    { credits: 3050, price: "59,99 €", oldPrice: "182 €", badge: "CHOIX N° 1" },
    { credits: 1350, price: "39,99 €", oldPrice: "80 €" },
    { credits: 450, price: "19,99 €", oldPrice: "26 €" },
    { credits: 100, price: "5,99 €" }
  ];

  const [selectedPackage, setSelectedPackage] = useState(0);

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-white z-[250] flex flex-col h-[100dvh] font-sans select-none"
    >
      {/* Top Header */}
      <div className="pt-10 pb-3 px-4 flex items-center justify-between shrink-0 bg-white relative border-b border-gray-100/50">
        <button onClick={onClose} className="p-2 -ml-2 text-black hover:opacity-70 active:scale-95 transition-transform z-10 cursor-pointer">
          <X className="w-6.5 h-6.5 text-black" strokeWidth={2.2} />
        </button>
        <h1 className="text-[17px] font-extrabold text-black absolute inset-x-0 text-center tracking-tight pointer-events-none">
          Rechargez vos crédits
        </h1>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto pb-4 scrollbar-hide">
        {/* Carousel Slide */}
        <div className="mt-2 mb-2 flex-1 flex flex-col justify-center items-center">
          <div className="relative w-full h-[235px] overflow-hidden">
            <motion.div 
              className="flex h-full w-full"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -30) {
                  setActiveIndex(prev => (prev + 1) % benefits.length);
                } else if (info.offset.x > 30) {
                  setActiveIndex(prev => (prev - 1 + benefits.length) % benefits.length);
                }
              }}
              animate={{ x: `-${activeIndex * 100}%` }}
              transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
            >
              {benefits.map((benefit, i) => (
                <div key={i} className="w-full shrink-0 px-6 flex flex-col items-center text-center">
                  <div className="w-28 h-28 rounded-full bg-[#EADAFF] flex items-center justify-center mb-4 shadow-2xs">
                    {benefit.renderIcon()}
                  </div>
                  <h2 className="text-[20px] font-extrabold text-black mb-2 tracking-tight max-w-[320px] leading-tight">
                    {benefit.title}
                  </h2>
                  <p className="text-[#666666] text-[14px] leading-[1.38] font-normal max-w-[310px] px-2">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center space-x-2 mt-2">
            {benefits.map((_, i) => (
              <button 
                key={i} 
                onClick={() => setActiveIndex(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeIndex === i ? 'bg-black w-2' : 'bg-gray-300 w-2'
                }`}
              />
            ))}
          </div>
        </div>



        {/* Packages Horizontal Scrolling List */}
        <div className="w-full my-3">
          <div className="flex space-x-3 overflow-x-auto px-4 pt-4 pb-2 scrollbar-hide">
            {packages.map((pkg, i) => (
              <button 
                key={i}
                onClick={() => setSelectedPackage(i)}
                className={`relative w-[115px] shrink-0 rounded-[18px] p-3 pt-5 flex flex-col items-center justify-between min-h-[148px] transition-all bg-white cursor-pointer select-none ${
                  selectedPackage === i 
                    ? 'border-[2px] border-black shadow-2xs' 
                    : 'border border-[#E5E5E5] hover:border-gray-300'
                }`}
              >
                {pkg.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-[3px] uppercase tracking-wider whitespace-nowrap shadow-2xs">
                    {pkg.badge}
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <span className="text-[22px] font-extrabold text-black leading-none pt-1">
                    {pkg.credits}
                  </span>
                  <span className="text-[13.5px] font-bold text-black mt-1">
                    crédits
                  </span>
                </div>
                <div className="flex flex-col items-center mt-3">
                  {pkg.oldPrice ? (
                    <span className="text-[12px] text-[#8E8E93] line-through font-normal">
                      {pkg.oldPrice}
                    </span>
                  ) : (
                    <span className="text-[12px] opacity-0 font-normal">0 €</span>
                  )}
                  <span className="text-[15px] font-bold text-black mt-0.5">
                    {pkg.price}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Sticky Button */}
      <div className="px-4 pb-8 pt-2 bg-white shrink-0">
        <button 
          onClick={() => {
            const pkg = packages[selectedPackage];
            const fcfaEquivalent = pkg.credits === 3050 ? '39 000 FCFA' : pkg.credits === 1350 ? '26 000 FCFA' : pkg.credits === 450 ? '13 000 FCFA' : '3 900 FCFA';
            setCheckoutItem({
              type: 'credits',
              productId: `pack_${pkg.credits === 100 ? '100_show' : pkg.credits}`,
              title: `Recharge ${pkg.credits} crédits Bavel`,
              amount: `${pkg.price} (${fcfaEquivalent})`,
              creditsAmount: pkg.credits,
              description: `Achat sécurisé de ${pkg.credits} crédits via Mobile Money ou Carte`
            });
          }}
          className="w-full bg-[#121212] hover:bg-black active:bg-black text-white font-bold py-4 rounded-full text-[16px] active:scale-[0.98] transition-transform shadow-md cursor-pointer"
        >
          Continuer
        </button>
      </div>

      {checkoutItem && (
        <PaymentCheckoutModal
          item={checkoutItem}
          onClose={() => setCheckoutItem(null)}
        />
      )}

    </motion.div>
  );
}