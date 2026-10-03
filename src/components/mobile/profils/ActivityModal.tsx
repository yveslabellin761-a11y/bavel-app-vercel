import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Clapperboard, ChevronsUp, Zap, Smile, Megaphone
} from 'lucide-react';
import { monetizationService } from '../../../services/monetizationService';
import { activityService, DailyActivityData } from '../../../services/activityService';
import BavelPremiumModal from '../../modals/BavelPremiumModal';
import { ExtraShowsMenu } from '../Monetization';
import { ProfileBoostModal } from '../../../features/monetization';
import { PaymentCheckoutModal } from '../../modals/PaymentCheckoutModal';
import { playSynthAudio } from '../../../utils/audio';

interface CreditOption {
  id: string;
  credits: number;
  oldPrice: string;
  price: string;
  isBestChoice?: boolean;
}

const TRIPLE_POPULARITY_OPTIONS: CreditOption[] = [
  {
    id: 'opt-3050',
    credits: 3050,
    oldPrice: '182 €',
    price: '59,99 €',
    isBestChoice: true,
  },
  {
    id: 'opt-1350',
    credits: 1350,
    oldPrice: '80 €',
    price: '39,99 €',
    isBestChoice: false,
  },
  {
    id: 'opt-450',
    credits: 450,
    oldPrice: '26 €',
    price: '19,99 €',
    isBestChoice: false,
  },
];

const RECEIVE_MESSAGES_OPTIONS: CreditOption[] = [
  {
    id: 'msg-3050',
    credits: 3050,
    oldPrice: '182 €',
    price: '59,99 €',
    isBestChoice: true,
  },
  {
    id: 'msg-1350',
    credits: 1350,
    oldPrice: '80 €',
    price: '39,99 €',
    isBestChoice: false,
  },
  {
    id: 'msg-450',
    credits: 450,
    oldPrice: '26 €',
    price: '19,99 €',
    isBestChoice: false,
  },
  {
    id: 'msg-100',
    credits: 100,
    oldPrice: '',
    price: '5,99 €',
    isBestChoice: false,
  },
];

export function ActivityModal({ 
  onClose, 
  userId 
}: { 
  onClose: () => void; 
  userId?: string;
}) {
  const [days, setDays] = useState<DailyActivityData[]>(() => activityService.get7DaysData());
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6); // Default to "Ce jour"

  // Sub-modal states
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showExtraShows, setShowExtraShows] = useState(false);
  const [showTriplePopularityModal, setShowTriplePopularityModal] = useState(false);
  const [showReceiveMessagesModal, setShowReceiveMessagesModal] = useState(false);
  const [showMoreMatchesModal, setShowMoreMatchesModal] = useState(false);
  const [showTopListModal, setShowTopListModal] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('opt-3050');
  const [selectedMessageOptionId, setSelectedMessageOptionId] = useState<string>('msg-3050');
  const [selectedMatchesOptionId, setSelectedMatchesOptionId] = useState<string>('opt-3050');
  const [selectedTopListOptionId, setSelectedTopListOptionId] = useState<string>('msg-3050');
  const [showCheckoutModal, setShowCheckoutModal] = useState<CreditOption | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    void activityService.loadFromServer().catch(error => {
      console.error('Chargement activité indisponible:', error);
      setToastMessage('Les statistiques d’activité sont momentanément indisponibles.');
    });
    const handleUpdate = () => {
      setDays(activityService.get7DaysData());
    };
    handleUpdate();
    const unsub = activityService.subscribe(handleUpdate);
    return unsub;
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const currentDay = days[selectedDayIndex] || days[days.length - 1] || {
    dateKey: '',
    dayLabel: 'Ce jour',
    isToday: true,
    activityLevel: 'très basse',
    yPercent: 70,
    needleAngle: -75,
    contacts: 0,
    visits: 0,
    likes: 0,
    swipes: 0
  };

  const getGaugeColor = (level: string) => {
    switch (level) {
      case 'très forte': return '#9333ea';
      case 'forte': return '#10b981';
      case 'moyenne': return '#eab308';
      case 'basse': return '#f97316';
      default: return '#e20030';
    }
  };

  const formatStatsSubtitle = (day: DailyActivityData) => {
    const cLabel = day.contacts > 1 ? `${day.contacts} nouveaux contacts` : `${day.contacts} nouveau contact`;
    const vLabel = day.visits > 1 ? `${day.visits} nouvelles visites` : `${day.visits} nouvelle visite`;
    const lLabel = day.likes > 1 ? `${day.likes} nouveaux likes` : `${day.likes} nouveau like`;
    return `${cLabel} • ${vLabel} • ${lLabel}`;
  };

  // SVG dimensions for compact single-screen fit
  const svgWidth = 330;
  const svgHeight = 44;
  const marginX = 18;
  const stepX = (svgWidth - marginX * 2) / Math.max(days.length - 1, 1);

  // Calculate coordinates
  const points = days.map((day, i) => {
    const x = marginX + i * stepX;
    const y = (day.yPercent / 100) * svgHeight;
    return { x, y, day, index: i };
  });

  const linePath = points.reduce((acc, pt, i) => {
    if (i === 0) {
      return `M 0,${pt.y} L ${pt.x},${pt.y}`;
    }
    return `${acc} L ${pt.x},${pt.y}`;
  }, '') + ` L ${svgWidth},${points[points.length - 1]?.y || (svgHeight / 2)}`;

  const selectedCreditOption = TRIPLE_POPULARITY_OPTIONS.find(o => o.id === selectedOptionId) || TRIPLE_POPULARITY_OPTIONS[0];
  const selectedMessageCreditOption = RECEIVE_MESSAGES_OPTIONS.find(o => o.id === selectedMessageOptionId) || RECEIVE_MESSAGES_OPTIONS[0];
  const selectedMatchesCreditOption = TRIPLE_POPULARITY_OPTIONS.find(o => o.id === selectedMatchesOptionId) || TRIPLE_POPULARITY_OPTIONS[0];
  const selectedTopListCreditOption = RECEIVE_MESSAGES_OPTIONS.find(o => o.id === selectedTopListOptionId) || RECEIVE_MESSAGES_OPTIONS[0];

  const handleContinueTriplePopularity = () => {
    setShowTriplePopularityModal(false);
    setShowCheckoutModal(selectedCreditOption);
  };

  const handleContinueReceiveMessages = () => {
    setShowReceiveMessagesModal(false);
    setShowCheckoutModal(selectedMessageCreditOption);
  };

  const handleContinueMoreMatches = () => {
    setShowMoreMatchesModal(false);
    setShowCheckoutModal(selectedMatchesCreditOption);
  };

  const handleContinueTopList = () => {
    setShowTopListModal(false);
    setShowCheckoutModal(selectedTopListCreditOption);
  };

  return (
    <div className="fixed inset-0 bg-white z-[110] flex flex-col h-[100dvh] overflow-hidden font-sans select-none px-3.5 py-2.5 justify-between">
      
      {/* Top Section: Header, Speedometer Gauge, Activity Level & Chart */}
      <div className="shrink-0 flex flex-col">
        {/* Header with Close button */}
        <div className="flex items-center justify-between mb-0.5">
          <button 
            onClick={onClose} 
            className="p-1 -ml-1 text-black hover:opacity-70 transition-opacity active:scale-95 cursor-pointer rounded-full"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={2.5} />
          </button>
        </div>

        {/* Speedometer and Activity Header */}
        <div className="flex flex-col items-center justify-center -mt-1">
          <div className="relative w-8 h-8 flex items-center justify-center mb-0.5">
            <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
              <path 
                d="M 6 23 A 12 12 0 1 1 26 23" 
                stroke="#e5e7eb" 
                strokeWidth="2.8" 
                strokeLinecap="round" 
              />
              <path 
                d="M 6 23 A 12 12 0 0 1 26 23" 
                stroke={getGaugeColor(currentDay.activityLevel)} 
                strokeWidth="3.4" 
                strokeLinecap="round" 
              />
              <circle cx="16" cy="18" r="2.2" fill={getGaugeColor(currentDay.activityLevel)} />
              <g style={{ transform: `rotate(${currentDay.needleAngle}deg)`, transformOrigin: '16px 18px', transition: 'transform 0.4s ease-out' }}>
                <line 
                  x1="16" 
                  y1="18" 
                  x2="10" 
                  y2="13.5" 
                  stroke={getGaugeColor(currentDay.activityLevel)} 
                  strokeWidth="2.8" 
                  strokeLinecap="round" 
                />
              </g>
            </svg>
          </div>

          <h2 className="text-[15px] sm:text-[16px] font-extrabold text-black tracking-tight text-center">
            Votre activité : <span style={{ color: getGaugeColor(currentDay.activityLevel) }}>{currentDay.activityLevel}</span>
          </h2>
        </div>

        {/* Activity Chart Section */}
        <div className="w-full bg-white pt-1">
          <div className="relative w-full overflow-visible">
            {/* SVG Graph View */}
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
              className="w-full h-[46px] overflow-visible"
            >
              {/* Vertical Guide Lines */}
              {points.map((pt) => {
                const isSelected = selectedDayIndex === pt.index;
                return (
                  <line 
                    key={`line-${pt.index}`}
                    x1={pt.x} 
                    y1="0" 
                    x2={pt.x} 
                    y2={svgHeight} 
                    stroke={isSelected ? getGaugeColor(currentDay.activityLevel) : "#e5e7eb"} 
                    strokeWidth={isSelected ? "1.5" : "0.9"} 
                    className="transition-colors duration-200"
                  />
                );
              })}

              {/* Connected Line Graph */}
              <path 
                d={linePath} 
                fill="none" 
                stroke="#111827" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />

              {/* Data Points */}
              {points.map((pt) => {
                const isSelected = selectedDayIndex === pt.index;
                return (
                  <g 
                    key={`pt-${pt.index}`} 
                    onClick={() => setSelectedDayIndex(pt.index)} 
                    className="cursor-pointer"
                  >
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r="14" 
                      fill="transparent" 
                    />
                    {isSelected ? (
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r="5" 
                        fill={getGaugeColor(currentDay.activityLevel)} 
                        stroke={getGaugeColor(currentDay.activityLevel)} 
                        strokeWidth="2" 
                      />
                    ) : (
                      <circle 
                        cx={pt.x} 
                        cy={pt.y} 
                        r="4" 
                        fill="#ffffff" 
                        stroke="#111827" 
                        strokeWidth="1.8" 
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Day Labels Below the Chart */}
            <div className="flex justify-between items-center px-0.5 mt-0.5 text-center">
              {days.map((d, i) => {
                const isSelected = selectedDayIndex === i;
                return (
                  <button
                    key={d.dateKey || `day-${i}`}
                    onClick={() => setSelectedDayIndex(i)}
                    className="flex-1 flex flex-col items-center py-0.5 transition-transform active:scale-95 cursor-pointer"
                  >
                    <span 
                      className={`text-[11px] sm:text-[11.5px] leading-none ${
                        isSelected 
                          ? 'font-extrabold text-[#e20030]' 
                          : 'font-semibold text-black'
                      }`}
                    >
                      {d.dayLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats Subtitle Line */}
          <p className="text-center text-[11.5px] sm:text-[12.5px] text-gray-600 font-medium mt-1 tracking-tight px-1">
            {formatStatsSubtitle(currentDay)}
          </p>
        </div>
      </div>

      {/* Middle/Bottom List: Exactly 6 Cards Sized for Single Screen Fit */}
      <div className="flex-1 flex flex-col justify-evenly py-1 gap-1.5 overflow-hidden">
        
        {/* Card 1: 10 crédits gratuits */}
        <button 
          disabled
          className="w-full flex items-center p-2 sm:p-2.5 bg-white border border-gray-200/90 rounded-[16px] shadow-2xs text-left cursor-not-allowed opacity-70 shrink-0"
        >
          <div className="w-10 h-10 rounded-full bg-[#f3e5ff] flex items-center justify-center shrink-0 mr-3">
            <Clapperboard className="w-5 h-5 text-black fill-black" strokeWidth={1} />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-[14px] sm:text-[14.5px] font-bold text-black leading-tight mb-0.5">
              10 crédits gratuits — bientôt disponibles
            </h4>
            <p className="text-[11px] sm:text-[11.5px] text-gray-500 leading-tight truncate">
              Cette récompense est suspendue jusqu’à la validation sécurisée des visionnages.
            </p>
          </div>
        </button>

        {/* Card 2: Passez en tête de liste */}
        <button 
          onClick={() => setShowTopListModal(true)}
          className="w-full flex items-center p-2 sm:p-2.5 bg-white border border-gray-200/90 rounded-[16px] shadow-2xs hover:border-gray-300 active:scale-[0.98] transition-all text-left cursor-pointer shrink-0"
        >
          <div className="w-10 h-10 rounded-full bg-[#f3e5ff] flex items-center justify-center shrink-0 mr-3">
            <ChevronsUp className="w-5 h-5 text-black" strokeWidth={2.6} />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-[14px] sm:text-[14.5px] font-bold text-black leading-tight mb-0.5">
              Passez en tête de liste
            </h4>
            <p className="text-[11px] sm:text-[11.5px] text-gray-500 leading-tight truncate">
              Plus de personnes vous remarqueront si vous passez devant tout le monde
            </p>
          </div>
        </button>

        {/* Card 3: Plus de Matchs */}
        <button 
          onClick={() => setShowMoreMatchesModal(true)}
          className="w-full flex items-center p-2 sm:p-2.5 bg-white border border-gray-200/90 rounded-[16px] shadow-2xs hover:border-gray-300 active:scale-[0.98] transition-all text-left cursor-pointer shrink-0"
        >
          <div className="w-10 h-10 rounded-full bg-[#f3e5ff] flex items-center justify-center shrink-0 mr-3">
            <Zap className="w-5 h-5 text-black fill-black" strokeWidth={1} />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-[14px] sm:text-[14.5px] font-bold text-black leading-tight mb-0.5">
              Plus de Matchs
            </h4>
            <p className="text-[11px] sm:text-[11.5px] text-gray-500 leading-tight truncate">
              Faites en sorte que les utilisateurs tombent plus souvent sur votre profil
            </p>
          </div>
        </button>

        {/* Card 4: Activez Badoo Premium */}
        <button 
          onClick={() => setShowPremiumModal(true)}
          className="w-full flex items-center p-2 sm:p-2.5 bg-white border border-gray-200/90 rounded-[16px] shadow-2xs hover:border-gray-300 active:scale-[0.98] transition-all text-left cursor-pointer shrink-0"
        >
          <div className="w-10 h-10 rounded-full bg-[#351829] flex items-center justify-center shrink-0 mr-3 shadow-2xs">
            <Smile className="w-5 h-5 text-white fill-white" strokeWidth={1} />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-[14px] sm:text-[14.5px] font-bold text-black leading-tight mb-0.5">
              Activez Badoo Premium
            </h4>
            <p className="text-[11px] sm:text-[11.5px] text-gray-500 leading-tight truncate">
              Boostez votre popularité et profitez d'options exclusives dont les autres ne disposent pas
            </p>
          </div>
        </button>

        {/* Card 5: Recevez plus de messages */}
        <button 
          onClick={() => setShowReceiveMessagesModal(true)}
          className="w-full flex items-center p-2 sm:p-2.5 bg-white border border-gray-200/90 rounded-[16px] shadow-2xs hover:border-gray-300 active:scale-[0.98] transition-all text-left cursor-pointer shrink-0"
        >
          <div className="w-10 h-10 rounded-full bg-[#f3e5ff] flex items-center justify-center shrink-0 mr-3">
            <Megaphone className="w-5 h-5 text-black fill-black" strokeWidth={1} />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-[14px] sm:text-[14.5px] font-bold text-black leading-tight mb-0.5">
              Recevez plus de messages
            </h4>
            <p className="text-[11px] sm:text-[11.5px] text-gray-500 leading-tight truncate">
              Faites savoir à tout le monde que vous êtes en ligne pour discuter
            </p>
          </div>
        </button>

        {/* Card 6: Triplez votre popularité */}
        <button 
          onClick={() => setShowTriplePopularityModal(true)}
          className="w-full flex items-center p-2 sm:p-2.5 bg-white border border-gray-200/90 rounded-[16px] shadow-2xs hover:border-gray-300 active:scale-[0.98] transition-all text-left cursor-pointer shrink-0"
        >
          <div className="w-10 h-10 rounded-full bg-[#f3e5ff] flex items-center justify-center shrink-0 mr-3">
            <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="7" width="15" height="10" rx="3" stroke="currentColor" strokeWidth="2.2" />
              <rect x="5.5" y="9.5" width="7" height="5" rx="1.5" fill="currentColor" />
              <path d="M19 10C19.5523 10 20 10.4477 20 11V13C20 13.5523 19.5523 14 19 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-[14px] sm:text-[14.5px] font-bold text-black leading-tight mb-0.5">
              Triplez votre popularité
            </h4>
            <p className="text-[11px] sm:text-[11.5px] text-gray-500 leading-tight truncate">
              Achetez toutes les options de popularité : vous économiserez 50 crédits
            </p>
          </div>
        </button>

      </div>

      {/* Triple Popularity Dedicated Full-Screen / Modal (100% Faithful to IMG_4301.PNG) */}
      <AnimatePresence>
        {showTriplePopularityModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-white flex flex-col h-[100dvh] overflow-hidden font-sans select-none px-4 pt-3 pb-6 justify-between"
          >
            {/* Header */}
            <div className="relative flex items-center justify-center shrink-0 pt-1">
              <button 
                onClick={() => setShowTriplePopularityModal(false)}
                className="absolute left-0 p-2 text-black hover:opacity-70 transition-opacity active:scale-95 rounded-full cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-6 h-6 text-black" strokeWidth={2.5} />
              </button>
              <h2 className="text-[16.5px] sm:text-[17.5px] font-extrabold text-black tracking-tight text-center">
                Rechargez vos crédits
              </h2>
            </div>

            {/* Central Content */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full px-1">
              
              {/* Lavender circle with solid horizontal battery icon */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#ede4ff] flex items-center justify-center mb-5 sm:mb-6 shrink-0">
                <svg className="w-11 h-11 sm:w-13 sm:h-13 text-[#1f2937]" viewBox="0 0 28 28" fill="none">
                  {/* Battery body with rounded corners */}
                  <rect 
                    x="3.5" 
                    y="7.5" 
                    width="18" 
                    height="13" 
                    rx="3.5" 
                    fill="#1f2937" 
                  />
                  {/* Battery terminal */}
                  <path 
                    d="M23 11.5C23.8284 11.5 24.5 12.1716 24.5 13V15C24.5 15.8284 23.8284 16.5 23 16.5" 
                    stroke="#1f2937" 
                    strokeWidth="2.4" 
                    strokeLinecap="round" 
                  />
                </svg>
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-[20px] sm:text-[22px] font-black text-black tracking-tight text-center mb-2">
                3 fois plus de popularité
              </h3>
              <p className="text-[13.5px] sm:text-[14px] text-gray-500 font-medium text-center leading-snug px-2 mb-7 sm:mb-8">
                Il vous faut 300 crédits pour débloquer nos options de popularité.
              </p>

              {/* The 3 Pricing Cards in a Row */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full items-stretch">
                {TRIPLE_POPULARITY_OPTIONS.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`relative flex flex-col items-center justify-between text-center rounded-[20px] pt-4 pb-3.5 px-1 sm:px-2 cursor-pointer transition-all active:scale-[0.97] min-h-[145px] sm:min-h-[155px] ${
                        isSelected 
                          ? 'border-[2px] border-black bg-white shadow-xs' 
                          : 'border border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {/* Top Badge for Choice #1 */}
                      {opt.isBestChoice && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[9.5px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full tracking-wider uppercase whitespace-nowrap shadow-xs">
                          CHOIX Nº 1
                        </div>
                      )}

                      {/* Credits count */}
                      <div className="pt-1 flex flex-col items-center">
                        <span className="text-[20px] sm:text-[22px] font-black text-black leading-tight tracking-tight">
                          {opt.credits}
                        </span>
                        <span className="text-[13px] sm:text-[14px] font-bold text-black leading-none mt-0.5">
                          crédits
                        </span>
                      </div>

                      {/* Prices (Old struck-through + current) */}
                      <div className="flex flex-col items-center mt-2">
                        <span className="text-[12px] sm:text-[13px] font-medium text-gray-400 line-through leading-none mb-1">
                          {opt.oldPrice}
                        </span>
                        <span className="text-[15px] sm:text-[16px] font-black text-black leading-none">
                          {opt.price}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Button */}
            <div className="w-full max-w-sm mx-auto shrink-0 pt-3">
              <button
                onClick={handleContinueTriplePopularity}
                className="w-full bg-[#111111] hover:bg-black text-white font-bold py-3.5 sm:py-4 rounded-full text-[15.5px] sm:text-[16px] shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recevez plus de messages Dedicated Full-Screen / Modal (100% Faithful to uploaded screenshot) */}
      <AnimatePresence>
        {showReceiveMessagesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-white flex flex-col h-[100dvh] overflow-hidden font-sans select-none px-4 pt-3 pb-6 justify-between"
          >
            {/* Header */}
            <div className="relative flex items-center justify-center shrink-0 pt-1">
              <button 
                onClick={() => setShowReceiveMessagesModal(false)}
                className="absolute left-0 p-2 text-black hover:opacity-70 transition-opacity active:scale-95 rounded-full cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-6 h-6 text-black" strokeWidth={2.5} />
              </button>
              <h2 className="text-[16.5px] sm:text-[17.5px] font-extrabold text-black tracking-tight text-center">
                Rechargez vos crédits
              </h2>
            </div>

            {/* Central Content */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-0.5">
              
              {/* Lavender circle with solid megaphone icon */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#ede4ff] flex items-center justify-center mb-5 sm:mb-6 shrink-0">
                <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 32 32" fill="none">
                  {/* Flared cone */}
                  <path 
                    d="M25 7.5L12 11.5V20.5L25 24.5V7.5Z" 
                    fill="#111111" 
                  />
                  {/* Speaker base */}
                  <path 
                    d="M12 11.5H7.5C5.567 11.5 4 13.067 4 15V17C4 18.933 5.567 20.5 7.5 20.5H12V11.5Z" 
                    fill="#111111" 
                  />
                  {/* Handle */}
                  <path 
                    d="M8.5 20.5V25C8.5 25.8284 9.17157 26.5 10 26.5C10.8284 26.5 11.5 25.8284 11.5 25V20.5H8.5Z" 
                    fill="#111111" 
                  />
                </svg>
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-[20px] sm:text-[22px] font-black text-black tracking-tight text-center mb-2">
                Recevez plus de messages
              </h3>
              <p className="text-[13.5px] sm:text-[14px] text-gray-500 font-medium text-center leading-snug px-3 mb-7 sm:mb-8 max-w-xs">
                Il vous faut 100 crédits pour montrer aux autres que vous êtes en ligne.
              </p>

              {/* Pricing Cards Horizontal Row */}
              <div className="flex gap-2 sm:gap-2.5 w-full overflow-x-auto pb-2 pt-3 px-1 no-scrollbar justify-start sm:justify-center">
                {RECEIVE_MESSAGES_OPTIONS.map((opt) => {
                  const isSelected = selectedMessageOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedMessageOptionId(opt.id)}
                      className={`relative flex flex-col items-center justify-between text-center rounded-[20px] pt-4 pb-3.5 px-1.5 cursor-pointer transition-all active:scale-[0.97] min-h-[145px] sm:min-h-[155px] min-w-[88px] sm:min-w-[96px] flex-1 max-w-[105px] ${
                        isSelected 
                          ? 'border-[2px] border-black bg-white shadow-xs' 
                          : 'border border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {/* Top Badge for Choice #1 */}
                      {opt.isBestChoice && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] sm:text-[9.5px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase whitespace-nowrap shadow-xs">
                          CHOIX Nº 1
                        </div>
                      )}

                      {/* Credits count */}
                      <div className="pt-1 flex flex-col items-center">
                        <span className="text-[19px] sm:text-[21px] font-black text-black leading-tight tracking-tight">
                          {opt.credits}
                        </span>
                        <span className="text-[12.5px] sm:text-[13.5px] font-bold text-black leading-none mt-0.5">
                          crédits
                        </span>
                      </div>

                      {/* Prices (Old struck-through + current) */}
                      <div className="flex flex-col items-center mt-2">
                        {opt.oldPrice ? (
                          <span className="text-[11.5px] sm:text-[12.5px] font-medium text-gray-400 line-through leading-none mb-1">
                            {opt.oldPrice}
                          </span>
                        ) : (
                          <span className="h-[13px] mb-1"></span>
                        )}
                        <span className="text-[14.5px] sm:text-[15.5px] font-black text-black leading-none">
                          {opt.price}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Button */}
            <div className="w-full max-w-sm mx-auto shrink-0 pt-3">
              <button
                onClick={handleContinueReceiveMessages}
                className="w-full bg-[#111111] hover:bg-black text-white font-bold py-3.5 sm:py-4 rounded-full text-[15.5px] sm:text-[16px] shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Obtenez plus de Matchs Dedicated Full-Screen / Modal (100% Faithful to uploaded screenshot) */}
      <AnimatePresence>
        {showMoreMatchesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-white flex flex-col h-[100dvh] overflow-hidden font-sans select-none px-4 pt-3 pb-6 justify-between"
          >
            {/* Header */}
            <div className="relative flex items-center justify-center shrink-0 pt-1">
              <button 
                onClick={() => setShowMoreMatchesModal(false)}
                className="absolute left-0 p-2 text-black hover:opacity-70 transition-opacity active:scale-95 rounded-full cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-6 h-6 text-black" strokeWidth={2.5} />
              </button>
              <h2 className="text-[16.5px] sm:text-[17.5px] font-extrabold text-black tracking-tight text-center">
                Rechargez vos crédits
              </h2>
            </div>

            {/* Central Content */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-1">
              
              {/* Lavender circle with solid lightning bolt icon */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#ede4ff] flex items-center justify-center mb-5 sm:mb-6 shrink-0">
                <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 32 32" fill="none">
                  <path 
                    d="M17.5 3L6 17.5H15L13.5 29L26 14.5H17L17.5 3Z" 
                    fill="#111111" 
                  />
                </svg>
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-[20px] sm:text-[22px] font-black text-black tracking-tight text-center mb-2">
                Obtenez plus de Matchs
              </h3>
              <p className="text-[13.5px] sm:text-[14px] text-gray-500 font-medium text-center leading-snug px-3 mb-7 sm:mb-8 max-w-xs">
                Il vous faut 150 crédits pour montrer votre profil plus souvent dans la section Rencontres.
              </p>

              {/* Pricing Cards Horizontal Row (3 Cards) */}
              <div className="flex gap-2.5 sm:gap-3 w-full pb-2 pt-3 px-1 justify-center">
                {TRIPLE_POPULARITY_OPTIONS.map((opt) => {
                  const isSelected = selectedMatchesOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedMatchesOptionId(opt.id)}
                      className={`relative flex flex-col items-center justify-between text-center rounded-[20px] pt-4 pb-3.5 px-2 cursor-pointer transition-all active:scale-[0.97] min-h-[155px] sm:min-h-[165px] flex-1 max-w-[115px] ${
                        isSelected 
                          ? 'border-[2px] border-black bg-white shadow-xs' 
                          : 'border border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {/* Top Badge for Choice #1 */}
                      {opt.isBestChoice && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] sm:text-[9.5px] font-black px-2.5 py-0.5 rounded-full tracking-wider uppercase whitespace-nowrap shadow-xs">
                          CHOIX Nº 1
                        </div>
                      )}

                      {/* Credits count */}
                      <div className="pt-1 flex flex-col items-center">
                        <span className="text-[20px] sm:text-[22px] font-black text-black leading-tight tracking-tight">
                          {opt.credits}
                        </span>
                        <span className="text-[13px] sm:text-[14px] font-bold text-black leading-none mt-0.5">
                          crédits
                        </span>
                      </div>

                      {/* Prices (Old struck-through + current) */}
                      <div className="flex flex-col items-center mt-2">
                        <span className="text-[12px] sm:text-[13px] font-medium text-gray-400 line-through leading-none mb-1">
                          {opt.oldPrice}
                        </span>
                        <span className="text-[15px] sm:text-[16px] font-black text-black leading-none">
                          {opt.price}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Button */}
            <div className="w-full max-w-sm mx-auto shrink-0 pt-3">
              <button
                onClick={handleContinueMoreMatches}
                className="w-full bg-[#111111] hover:bg-black text-white font-bold py-3.5 sm:py-4 rounded-full text-[15.5px] sm:text-[16px] shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Passez en tête de liste Dedicated Full-Screen / Modal (100% Faithful to uploaded screenshot) */}
      <AnimatePresence>
        {showTopListModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-white flex flex-col h-[100dvh] overflow-hidden font-sans select-none px-4 pt-3 pb-6 justify-between"
          >
            {/* Header */}
            <div className="relative flex items-center justify-center shrink-0 pt-1">
              <button 
                onClick={() => setShowTopListModal(false)}
                className="absolute left-0 p-2 text-black hover:opacity-70 transition-opacity active:scale-95 rounded-full cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-6 h-6 text-black" strokeWidth={2.5} />
              </button>
              <h2 className="text-[16.5px] sm:text-[17.5px] font-extrabold text-black tracking-tight text-center">
                Rechargez vos crédits
              </h2>
            </div>

            {/* Central Content */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-0.5">
              
              {/* Lavender circle with double chevron up icon */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#ede4ff] flex items-center justify-center mb-5 sm:mb-6 shrink-0">
                <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 32 32" fill="none">
                  {/* Top chevron */}
                  <path 
                    d="M16 6.5L7.5 15L9.6 17.1L16 10.7L22.4 17.1L24.5 15L16 6.5Z" 
                    fill="#111111" 
                  />
                  {/* Bottom chevron */}
                  <path 
                    d="M16 13.5L7.5 22L9.6 24.1L16 17.7L22.4 24.1L24.5 22L16 13.5Z" 
                    fill="#111111" 
                  />
                </svg>
              </div>

              {/* Title & Subtitle */}
              <h3 className="text-[20px] sm:text-[22px] font-black text-black tracking-tight text-center mb-2">
                Passez en tête de liste
              </h3>
              <p className="text-[13.5px] sm:text-[14px] text-gray-500 font-medium text-center leading-snug px-3 mb-7 sm:mb-8 max-w-xs">
                Il vous faut 100 crédits pour passer en tête dans la section À proximité.
              </p>

              {/* Pricing Cards Horizontal Row (4 Cards) */}
              <div className="flex gap-2 sm:gap-2.5 w-full overflow-x-auto pb-2 pt-3 px-1 no-scrollbar justify-start sm:justify-center">
                {RECEIVE_MESSAGES_OPTIONS.map((opt) => {
                  const isSelected = selectedTopListOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedTopListOptionId(opt.id)}
                      className={`relative flex flex-col items-center justify-between text-center rounded-[20px] pt-4 pb-3.5 px-1.5 cursor-pointer transition-all active:scale-[0.97] min-h-[145px] sm:min-h-[155px] min-w-[88px] sm:min-w-[96px] flex-1 max-w-[105px] ${
                        isSelected 
                          ? 'border-[2px] border-black bg-white shadow-xs' 
                          : 'border border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {/* Top Badge for Choice #1 */}
                      {opt.isBestChoice && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] sm:text-[9.5px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase whitespace-nowrap shadow-xs">
                          CHOIX Nº 1
                        </div>
                      )}

                      {/* Credits count */}
                      <div className="pt-1 flex flex-col items-center">
                        <span className="text-[19px] sm:text-[21px] font-black text-black leading-tight tracking-tight">
                          {opt.credits}
                        </span>
                        <span className="text-[12.5px] sm:text-[13.5px] font-bold text-black leading-none mt-0.5">
                          crédits
                        </span>
                      </div>

                      {/* Prices (Old struck-through + current) */}
                      <div className="flex flex-col items-center mt-2">
                        {opt.oldPrice ? (
                          <span className="text-[11.5px] sm:text-[12.5px] font-medium text-gray-400 line-through leading-none mb-1">
                            {opt.oldPrice}
                          </span>
                        ) : (
                          <span className="h-[13px] mb-1"></span>
                        )}
                        <span className="text-[14.5px] sm:text-[15.5px] font-black text-black leading-none">
                          {opt.price}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Button */}
            <div className="w-full max-w-sm mx-auto shrink-0 pt-3">
              <button
                onClick={handleContinueTopList}
                className="w-full bg-[#111111] hover:bg-black text-white font-bold py-3.5 sm:py-4 rounded-full text-[15.5px] sm:text-[16px] shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Checkout Modal (opened when clicking Continuer) */}
      {showCheckoutModal && (
        <PaymentCheckoutModal
          item={{
            type: 'credits',
            productId: `pack_${showCheckoutModal.credits === 100 ? '100_show' : showCheckoutModal.credits}`,
            title: `Pack ${showCheckoutModal.credits} crédits`,
            amount: showCheckoutModal.price,
            creditsToAdd: showCheckoutModal.credits,
            creditsAmount: showCheckoutModal.credits,
            description: 'Pack de crédits avec options de visibilité et popularité débloquées'
          }}
          onClose={() => setShowCheckoutModal(null)}
        />
      )}

      {/* Rewarded Video Ad Modal */}
      {/* Premium Subscription Modal */}
      {showPremiumModal && (
        <BavelPremiumModal onClose={() => setShowPremiumModal(false)} />
      )}

      {/* Boost Modal */}
      {showBoostModal && (
        <ProfileBoostModal isOpen={showBoostModal} onClose={() => setShowBoostModal(false)} />
      )}

      {/* Extra Shows Modal */}
      {showExtraShows && (
        <ExtraShowsMenu onClose={() => setShowExtraShows(false)} />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/90 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-lg z-[200]"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
