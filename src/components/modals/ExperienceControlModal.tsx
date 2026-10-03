import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { triggerHaptic } from '../../utils/audio';
import { useAppStore } from '../../store/useAppStore';

export interface ExperienceControlModalProps {
  onClose: () => void;
  userProfile?: any;
  onUpdateProfile?: (profile: any) => void;
  onResetDefaults?: () => void;
  initialStep?: 'welcome' | 'step1' | 'step2' | 'step3' | 'complete';
}

// ============================================
// ILLUSTRATION SVG COMPONENTS
// ============================================

const WelcomeIllustration = () => (
  <div className="w-full flex justify-center items-center my-2 h-36">
    <svg viewBox="0 0 200 160" className="w-48 h-36">
      {/* Background Bunting / Flags */}
      <polygon points="20,25 50,75 80,25" fill="#EAE0FB" />
      <polygon points="75,25 105,80 135,25" fill="#D3BDF7" />
      <polygon points="130,25 160,75 190,25" fill="#B582F6" />
      
      {/* Sleeve */}
      <path d="M75,150 C75,130 80,120 95,120 L120,120 C130,120 135,130 135,150 Z" fill="#E20030" />
      <path d="M75,145 Q105,135 135,145" fill="none" stroke="#A80023" strokeWidth="3" />
      {/* Pattern on sleeve */}
      <circle cx="88" cy="132" r="2.5" fill="#FFF" />
      <circle cx="105" cy="132" r="2.5" fill="#FFF" />
      <circle cx="122" cy="132" r="2.5" fill="#FFF" />
      
      {/* Hand / Palm waving */}
      <path d="M85,120 C80,95 82,75 88,50 C90,45 96,45 97,52 L99,80 C100,52 105,42 110,42 C114,42 115,48 114,75 C116,55 120,48 125,48 C129,48 130,55 128,78 C131,62 135,58 139,60 C143,62 142,70 138,88 C132,108 125,120 120,120 Z" fill="#E88F67" />
      
      {/* Ring on finger */}
      <rect x="115" y="80" width="8" height="3" rx="1.5" fill="#FFF" stroke="#E88F67" strokeWidth="0.5" />
      
      {/* Nails */}
      <ellipse cx="88" cy="50" rx="2" ry="3" fill="#E20030" />
      <ellipse cx="110" cy="43" rx="2" ry="3" fill="#E20030" />
      <ellipse cx="125" cy="49" rx="2" ry="3" fill="#E20030" />
      <ellipse cx="139" cy="61" rx="2" ry="3" fill="#E20030" />
    </svg>
  </div>
);

const MessagesIllustration = () => (
  <div className="w-full flex justify-center items-center my-2 h-36">
    <svg viewBox="0 0 240 160" className="w-56 h-36">
      {/* Flashlight Beam */}
      <polygon points="120,80 220,20 220,140" fill="#FFF4AA" opacity="0.8" />
      
      {/* Speech bubbles inside beam */}
      {/* Top Speech Bubble - Purple */}
      <rect x="150" y="30" width="55" height="32" rx="16" fill="#B582F6" />
      <line x1="162" y1="42" x2="192" y2="42" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
      <line x1="162" y1="50" x2="182" y2="50" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
      
      {/* Middle Speech Bubble - Dark/Black */}
      <rect x="110" y="55" width="40" height="24" rx="12" fill="#1C1C1E" />
      
      {/* Bottom Speech Bubble - Red */}
      <rect x="145" y="85" width="48" height="28" rx="14" fill="#E20030" />
      <line x1="157" y1="96" x2="181" y2="96" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
      
      {/* Flashlight Held by Hand */}
      <path d="M30,130 C45,110 65,95 85,85" stroke="#E88F67" strokeWidth="18" strokeLinecap="round" fill="none" />
      <path d="M25,140 L50,115" stroke="#E20030" strokeWidth="22" strokeLinecap="round" fill="none" />
      <path d="M22,142 L48,118" stroke="#FFF" strokeWidth="2" strokeLinecap="round" fill="none" />
      
      {/* Flashlight Body */}
      <rect x="80" y="65" width="40" height="26" rx="4" fill="#1C1C1E" transform="rotate(-15 100 78)" />
      <polygon points="112,60 132,50 126,88 106,78" fill="#D3BDF7" />
      
      {/* Fingers holding flashlight */}
      <circle cx="85" cy="72" r="4" fill="#E88F67" />
      <circle cx="92" cy="70" r="4" fill="#E88F67" />
      <circle cx="99" cy="68" r="4" fill="#E88F67" />
      <ellipse cx="85" cy="72" rx="1.5" ry="2.5" fill="#E20030" />
      <ellipse cx="92" cy="70" rx="1.5" ry="2.5" fill="#E20030" />
      <ellipse cx="99" cy="68" rx="1.5" ry="2.5" fill="#E20030" />
    </svg>
  </div>
);

const NotificationsIllustration = () => (
  <div className="w-full flex justify-center items-center my-2 h-36">
    <svg viewBox="0 0 200 160" className="w-48 h-36">
      {/* Post */}
      <rect x="94" y="110" width="12" height="45" fill="#D2A679" />
      
      {/* Mailbox Body */}
      <path d="M50,50 L140,50 C155,50 165,65 165,80 C165,95 155,110 140,110 L50,110 Z" fill="#EAE0FB" />
      <path d="M50,50 C65,50 75,65 75,80 C75,95 65,110 50,110 Z" fill="#D3BDF7" />
      
      {/* Mailbox Red Interior */}
      <path d="M100,50 C115,50 125,65 125,80 C125,95 115,110 100,110 L150,110 C162,110 170,95 170,80 C170,65 162,50 150,50 Z" fill="#E20030" />
      
      {/* Speech bubble coming out of mailbox */}
      <rect x="135" y="55" width="36" height="24" rx="12" fill="#FFF" />
      <circle cx="147" cy="67" r="2" fill="#E88F67" />
      <circle cx="153" cy="67" r="2" fill="#E88F67" />
      <circle cx="159" cy="67" r="2" fill="#E88F67" />
    </svg>
  </div>
);

const OnlineStatusIllustration = () => (
  <div className="w-full flex justify-center items-center my-2 h-36">
    <svg viewBox="0 0 220 160" className="w-52 h-36">
      {/* Hanging Lamp */}
      <line x1="75" y1="0" x2="75" y2="60" stroke="#B582F6" strokeWidth="2" />
      <path d="M50,80 L100,80 L88,60 L62,60 Z" fill="#B582F6" />
      {/* Light bulb glowing */}
      <circle cx="75" cy="85" r="8" fill="#FFF4AA" />
      <polygon points="75,85 30,150 120,150" fill="#FFF4AA" opacity="0.35" />
      
      {/* Switch Plate on Wall */}
      <rect x="155" y="60" width="28" height="40" rx="3" fill="#D3BDF7" stroke="#FFF" strokeWidth="2" />
      {/* Toggle button */}
      <rect x="163" y="68" width="12" height="12" rx="2" fill="#E20030" />
      <circle cx="169" cy="74" r="2" fill="#FFF" />
      
      {/* Hand pressing switch */}
      <path d="M100,150 C110,130 130,105 160,80 L170,85 C145,115 125,135 115,150 Z" fill="#E88F67" />
      <path d="M80,150 C90,130 110,115 130,105 L155,80 L170,85 L145,112 C125,128 100,150 95,150 Z" fill="#E88F67" />
      <ellipse cx="166" cy="82" rx="3" ry="4" fill="#E20030" />
      
      {/* Green Sweater Sleeve */}
      <path d="M80,150 C82,135 90,120 110,110 L125,118 C110,130 95,140 92,150 Z" fill="#6BB343" />
      <line x1="90" y1="125" x2="98" y2="135" stroke="#4D8B2C" strokeWidth="2" />
      <line x1="98" y1="120" x2="106" y2="130" stroke="#4D8B2C" strokeWidth="2" />
      <line x1="106" y1="115" x2="114" y2="125" stroke="#4D8B2C" strokeWidth="2" />
    </svg>
  </div>
);

const CompletionIllustration = () => (
  <div className="w-full flex justify-center items-center my-2 h-36">
    <svg viewBox="0 0 220 160" className="w-52 h-36">
      {/* Table / Pedestal */}
      <ellipse cx="100" cy="142" rx="45" ry="8" fill="#EAE0FB" />
      
      {/* Ice Cream Bowl */}
      <path d="M80,125 L120,125 L115,135 L85,135 Z" fill="#1C1C1E" />
      <path d="M70,105 Q100,125 130,105 Z" fill="#1C1C1E" />
      
      {/* Ice Cream Scoops */}
      <circle cx="88" cy="98" r="14" fill="#FFF" />
      <circle cx="112" cy="98" r="14" fill="#E20030" />
      <circle cx="100" cy="88" r="16" fill="#FFF" />
      
      {/* Cherry on Top */}
      <circle cx="100" cy="70" r="7" fill="#E20030" />
      <path d="M100,63 Q108,55 112,50" stroke="#4D8B2C" strokeWidth="2" fill="none" />
      
      {/* Hand placing cherry */}
      <path d="M110,48 C120,38 140,30 170,25 C185,45 155,60 130,68 C120,72 112,65 110,48 Z" fill="#E88F67" />
      <ellipse cx="111" cy="51" rx="2" ry="3" fill="#E20030" />
      <ellipse cx="115" cy="42" rx="2" ry="3" fill="#E20030" />
      
      {/* Pink Wavy Sleeve */}
      <path d="M135,65 Q150,55 160,70 Q175,60 185,75 Q195,65 210,80 L210,120 L150,110 Z" fill="#E20030" />
      
      {/* Spoon in bowl */}
      <path d="M60,135 L90,110" stroke="#D3BDF7" strokeWidth="4" strokeLinecap="round" />
    </svg>
  </div>
);

// ============================================
// MAIN EXPERIENCE CONTROL MODAL
// ============================================

export const ExperienceControlModal: React.FC<ExperienceControlModalProps> = ({
  onClose,
  userProfile,
  onUpdateProfile,
  initialStep = 'welcome'
}) => {
  const [step, setStep] = useState<'welcome' | 'step1' | 'step2' | 'step3' | 'complete'>(initialStep);

  // Preference States
  const [messagePreference, setMessagePreference] = useState<'everyone' | 'likes'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bavel_exp_message_pref');
      if (saved === 'likes') return 'likes';
    }
    return 'everyone';
  });

  const [notifications, setNotifications] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bavel_exp_notif_prefs');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {
      messages: true,
      matches: true,
      likes: true,
      profileViews: false,
      other: true,
    };
  });

  const [onlineStatus, setOnlineStatus] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bavel_exp_online_status');
      if (saved === 'false') return false;
    }
    return true;
  });

  const savePreferences = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bavel_exp_message_pref', messagePreference);
      localStorage.setItem('bavel_exp_notif_prefs', JSON.stringify(notifications));
      localStorage.setItem('bavel_exp_online_status', String(onlineStatus));
    }
    if (onUpdateProfile) {
      onUpdateProfile({
        ...userProfile,
        messagePreference,
        notificationPreferences: notifications,
        showOnlineStatus: onlineStatus,
      });
    }
  };

  const handleNext = () => {
    triggerHaptic('light');
    if (step === 'welcome') setStep('step1');
    else if (step === 'step1') setStep('step2');
    else if (step === 'step2') setStep('step3');
    else if (step === 'step3') setStep('complete');
  };

  const handlePrev = () => {
    triggerHaptic('light');
    if (step === 'step1') setStep('welcome');
    else if (step === 'step2') setStep('step1');
    else if (step === 'step3') setStep('step2');
  };

  const toggleNotification = (key: string) => {
    triggerHaptic('light');
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFinishSwiper = () => {
    savePreferences();
    triggerHaptic('success');
    try {
      useAppStore.getState().setActiveTab?.('encounters' as any);
      useAppStore.getState().navigateToTab?.('encounters' as any);
    } catch (e) {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bavel_navigate', { detail: 'encounters' }));
      window.dispatchEvent(new CustomEvent('bavel_navigate', { detail: 'swipe' }));
    }
    onClose();
  };

  const handleFinishSettings = () => {
    savePreferences();
    triggerHaptic('light');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[230] flex items-end justify-center p-0 md:p-4 select-none">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-md bg-white rounded-t-[32px] md:rounded-[32px] flex flex-col min-h-[580px] max-h-[90vh] overflow-hidden shadow-2xl relative"
      >
        <AnimatePresence mode="wait">
          {/* ========================================== */}
          {/* SCREEN 0: WELCOME (IMG_4422.PNG) */}
          {/* ========================================== */}
          {step === 'welcome' && (
            <motion.div
              key="screen-welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-between p-6 pt-8 pb-8 text-center"
            >
              <div className="space-y-4">
                <WelcomeIllustration />
                <h2 className="text-[22px] font-black text-black tracking-tight leading-tight">
                  Le dating selon vos règles
                </h2>
                <p className="text-[13.5px] text-gray-500 font-medium leading-relaxed px-2">
                  Sur Bavel, c'est vous qui décidez ;) Personnalisez votre profil pour gérer les messages que vous recevez, choisir de montrer si vous êtes en ligne, et bien plus encore.
                </p>
              </div>

              <div className="space-y-3 pt-6">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3.5 bg-black hover:bg-gray-800 text-white rounded-full font-extrabold text-[15px] transition-all cursor-pointer active:scale-[0.98] shadow-md"
                >
                  Allons-y !
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-gray-500 hover:text-black font-semibold text-[14px] transition-colors cursor-pointer"
                >
                  Plus tard
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================== */}
          {/* SCREEN 1: STEP 1/3 MESSAGES (IMG_4423.PNG) */}
          {/* ========================================== */}
          {step === 'step1' && (
            <motion.div
              key="screen-step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-between p-6 pt-6 pb-6 text-center"
            >
              <div className="space-y-4">
                <MessagesIllustration />
                <h2 className="text-[20px] font-black text-black tracking-tight leading-snug px-2">
                  De qui voulez-vous recevoir des messages ?
                </h2>

                <div className="space-y-3 pt-2">
                  {/* Option 1: Tout le monde */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setMessagePreference('everyone');
                    }}
                    className={`w-full p-4 rounded-[22px] flex items-center justify-between transition-all cursor-pointer ${
                      messagePreference === 'everyone'
                        ? 'bg-[#efebfe] text-black font-extrabold'
                        : 'bg-[#f4f4f6] text-black font-bold'
                    }`}
                  >
                    <span className="text-[14.5px]">Tout le monde</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      messagePreference === 'everyone' ? 'border-black' : 'border-gray-400'
                    }`}>
                      {messagePreference === 'everyone' && (
                        <div className="w-3 h-3 rounded-full bg-black" />
                      )}
                    </div>
                  </button>

                  {/* Option 2: Les profils à qui j'ai donné un Like */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setMessagePreference('likes');
                    }}
                    className={`w-full p-4 rounded-[22px] flex items-center justify-between transition-all cursor-pointer ${
                      messagePreference === 'likes'
                        ? 'bg-[#efebfe] text-black font-extrabold'
                        : 'bg-[#f4f4f6] text-black font-bold'
                    }`}
                  >
                    <span className="text-[14.5px]">Les profils à qui j'ai donné un Like</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      messagePreference === 'likes' ? 'border-black' : 'border-gray-400'
                    }`}>
                      {messagePreference === 'likes' && (
                        <div className="w-3 h-3 rounded-full bg-black" />
                      )}
                    </div>
                  </button>
                </div>

                <p className="text-[12.5px] text-gray-500 font-normal leading-snug px-3 pt-1">
                  Si tout le monde peut vous envoyer un message, vous aurez plus de chances de trouver des Matchs.
                </p>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-6">
                <div className="w-12 h-12" /> {/* Empty spacer */}
                <span className="text-[13px] font-bold text-gray-400">1/3</span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-12 h-12 rounded-full border border-gray-200 shadow-xs flex items-center justify-center bg-white text-black hover:bg-gray-50 transition-all cursor-pointer active:scale-95"
                  aria-label="Suivant"
                >
                  <ChevronRight className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================== */}
          {/* SCREEN 2: STEP 2/3 NOTIFICATIONS (IMG_4424.PNG) */}
          {/* ========================================== */}
          {step === 'step2' && (
            <motion.div
              key="screen-step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-between p-6 pt-5 pb-6 text-center"
            >
              <div className="space-y-3">
                <NotificationsIllustration />
                <h2 className="text-[19px] font-black text-black tracking-tight leading-snug px-1">
                  Quand voulez-vous recevoir des notifications ?
                </h2>

                <div className="space-y-2.5 pt-1">
                  {[
                    { id: 'messages', label: 'Quand je reçois un message' },
                    { id: 'matches', label: "Quand je matche avec quelqu'un" },
                    { id: 'likes', label: 'Quand je reçois un Like' },
                    { id: 'profileViews', label: "Quand quelqu'un va voir mon profil" },
                    { id: 'other', label: 'Autre' },
                  ].map((item) => {
                    const isChecked = !!notifications[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleNotification(item.id)}
                        className={`w-full p-3.5 rounded-[20px] flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#efebfe] text-black font-extrabold'
                            : 'bg-[#f4f4f6] text-black font-bold'
                        }`}
                      >
                        <span className="text-[14px] text-left">{item.label}</span>
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                          isChecked ? 'bg-black text-white' : 'border-2 border-gray-300 bg-transparent'
                        }`}>
                          {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-12 h-12 rounded-full border border-gray-200 shadow-xs flex items-center justify-center bg-white text-black hover:bg-gray-50 transition-all cursor-pointer active:scale-95"
                  aria-label="Retour"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
                <span className="text-[13px] font-bold text-gray-400">2/3</span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-12 h-12 rounded-full border border-gray-200 shadow-xs flex items-center justify-center bg-white text-black hover:bg-gray-50 transition-all cursor-pointer active:scale-95"
                  aria-label="Suivant"
                >
                  <ChevronRight className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================== */}
          {/* SCREEN 3: STEP 3/3 ONLINE STATUS (IMG_4425.PNG) */}
          {/* ========================================== */}
          {step === 'step3' && (
            <motion.div
              key="screen-step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-between p-6 pt-6 pb-6 text-center"
            >
              <div className="space-y-4">
                <OnlineStatusIllustration />
                <h2 className="text-[20px] font-black text-black tracking-tight leading-snug px-1">
                  Voulez-vous que l'on sache quand vous êtes en ligne ?
                </h2>

                <div className="space-y-3 pt-2">
                  {/* Option Oui */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setOnlineStatus(true);
                    }}
                    className={`w-full p-4 rounded-[22px] flex items-center justify-between transition-all cursor-pointer ${
                      onlineStatus
                        ? 'bg-[#efebfe] text-black font-extrabold'
                        : 'bg-[#f4f4f6] text-black font-bold'
                    }`}
                  >
                    <span className="text-[14.5px]">Oui</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      onlineStatus ? 'border-black' : 'border-gray-400'
                    }`}>
                      {onlineStatus && (
                        <div className="w-3 h-3 rounded-full bg-black" />
                      )}
                    </div>
                  </button>

                  {/* Option Non */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setOnlineStatus(false);
                    }}
                    className={`w-full p-4 rounded-[22px] flex items-center justify-between transition-all cursor-pointer ${
                      !onlineStatus
                        ? 'bg-[#efebfe] text-black font-extrabold'
                        : 'bg-[#f4f4f6] text-black font-bold'
                    }`}
                  >
                    <span className="text-[14.5px]">Non</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      !onlineStatus ? 'border-black' : 'border-gray-400'
                    }`}>
                      {!onlineStatus && (
                        <div className="w-3 h-3 rounded-full bg-black" />
                      )}
                    </div>
                  </button>
                </div>

                <p className="text-[12.5px] text-gray-500 font-normal leading-snug px-3 pt-1">
                  Si vous choisissez de cacher que vous êtes en ligne, vous ne pourrez pas voir non plus si les autres le sont.
                </p>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-6">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-12 h-12 rounded-full border border-gray-200 shadow-xs flex items-center justify-center bg-white text-black hover:bg-gray-50 transition-all cursor-pointer active:scale-95"
                  aria-label="Retour"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
                <span className="text-[13px] font-bold text-gray-400">3/3</span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-12 h-12 rounded-full border border-gray-200 shadow-xs flex items-center justify-center bg-white text-black hover:bg-gray-50 transition-all cursor-pointer active:scale-95"
                  aria-label="Terminer"
                >
                  <ChevronRight className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================== */}
          {/* SCREEN 4: COMPLETION (IMG_4426.PNG) */}
          {/* ========================================== */}
          {step === 'complete' && (
            <motion.div
              key="screen-complete"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col justify-between p-6 pt-8 pb-8 text-center"
            >
              <div className="space-y-4">
                <CompletionIllustration />
                <h2 className="text-[22px] font-black text-black tracking-tight leading-tight">
                  On a terminé !
                </h2>
                <p className="text-[13.5px] text-gray-500 font-medium leading-relaxed px-2">
                  Merci d'avoir personnalisé votre expérience. Il ne nous reste plus qu'à trouver des profils qui vous plaisent !
                </p>
              </div>

              <div className="space-y-3 pt-6">
                <button
                  type="button"
                  onClick={handleFinishSwiper}
                  className="w-full py-3.5 bg-black hover:bg-gray-800 text-white rounded-full font-extrabold text-[15px] transition-all cursor-pointer active:scale-[0.98] shadow-md"
                >
                  Swiper
                </button>
                <button
                  type="button"
                  onClick={handleFinishSettings}
                  className="w-full py-2 text-gray-500 hover:text-black font-semibold text-[14px] transition-colors cursor-pointer"
                >
                  Paramètres
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ExperienceControlModal;
