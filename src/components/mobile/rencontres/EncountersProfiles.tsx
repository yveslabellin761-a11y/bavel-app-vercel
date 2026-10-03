import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { forwardRef, useImperativeHandle } from 'react';
import confetti from 'canvas-confetti';
import { 
  SlidersHorizontal, MapPin, Heart, MessageCircle, MessageCircleMore, User as UserIcon, 
  Settings, HelpCircle, Camera, Zap, Search, Bell, Gauge, Edit3, Mail,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Smile, Plus, Copy, MoreHorizontal, Lock, CheckCircle, Check, X, Star, Shield, Eye, EyeOff, FileText, RotateCcw,
  Navigation, Baby, Target, Ruler, Languages, Wine, Sparkles, Dog, Brain, Flame, Cigarette, GraduationCap, BookOpen, Coffee, Clapperboard, ChevronsUp, Megaphone, Battery, Send,
  Radio, Locate, LocateFixed, RefreshCw, Map, Compass, Image as ImageIcon, Briefcase,
  Phone, Video, Mic, CheckCheck, Gift, Ban, ThumbsUp, ArrowUp, Coins, Volume2, VolumeX, UserX, PhoneOff, MicOff, VideoOff, Play, Pause, Trash2, Hand, Users, Pencil, ShieldAlert
} from 'lucide-react';
import { User } from '../../../types';
import { CoupDeCoeurModal, ActionMenu, EncounterCardMenu, MatchModal, HeartPiercedIcon } from '../Modals';
import { ExtraShowsMenu, RechargeCreditsMenu } from '../Monetization';
import { EncountersFiltersMenu } from './EncountersFilters';
import { SwipeActions } from '../swipes/SwipeActions';
import { SwipeThemeProvider } from '../contexts/SwipeThemeContext';
import { ChatConversationView } from '../discussions/ChatConversationView';
import BavelPremiumModal from '../../modals/BavelPremiumModal';

import { ProfileModal, FullScreenPhotoGalleryModal } from '../Modals';
import { preloadNextProfiles } from '../../../utils/imageOptimizer';
import { pushNotificationService } from '../../../services/push/pushNotificationService';
import { presenceService } from '../../../services/presenceService';
import { aiMonetizationEngine } from '../../../services/aiMonetizationEngine';
import { aiSystemEngine } from '../../../services/aiSystemEngine';
import { securityService } from '../../../services/securityService';
import { monetizationService } from '../../../services/monetizationService';
import { FEATURES_PER_TIER, getTierPrivileges } from '../../../config/featuresConfig';
import { authFetch } from '../../../lib/authFetch';
import {
  cleanCity,
  getProfileDistanceInfo,
} from './encounterLocation';

interface SwipeProfileCardProps {
  profile: any;
  parentX: any;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onOpenActionMenu: () => void;
  userCoords?: { latitude: number; longitude: number } | null;
}

export interface SwipeProfileCardRef {
  swipe: (direction: 'left' | 'right') => Promise<void>;
}

export const SwipeProfileCard = forwardRef<SwipeProfileCardRef, SwipeProfileCardProps>(({
  profile,
  parentX,
  onSwipeLeft,
  onSwipeRight,
  onOpenActionMenu,
  userCoords
}, ref) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [30, 100], [0, 1]);
  const passOpacity = useTransform(x, [-30, -100], [0, 1]);

  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [isDistanceToggled, setIsDistanceToggled] = useState(false);

  // Fullscreen Photo Gallery & Detailed Profile Modal states
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFullScreenGalleryOpen, setIsFullScreenGalleryOpen] = useState(false);
  const [galleryStartIdx, setGalleryStartIdx] = useState(0);

  const openFullScreenGallery = (idx: number = 0) => {
    setGalleryStartIdx(idx);
    setIsFullScreenGalleryOpen(true);
  };

  const rawPhotos = profile.photos && profile.photos.length > 0 
    ? profile.photos 
    : [profile.img || profile.avatarUrl];
  const profileDetails = Array.isArray(profile.details)
    ? profile.details
    : Object.entries(profile.details && typeof profile.details === 'object' ? profile.details : {})
      .filter(([key, value]) => key !== 'prompts' && typeof value === 'string')
      .map(([label, name]) => ({ label, name }));
  
  const photos = Array.from(new Set(rawPhotos)) as string[];
  const extraPhotos = photos.slice(1).filter(p => p !== photos[0]);

  const handleMediaSecurityNotice = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
    setShowSecurityAlert(true);
    setTimeout(() => setShowSecurityAlert(false), 2800);
  };

  useEffect(() => {
    const unsubscribe = x.on('change', (latest) => {
      if (parentX) {
        parentX.set(latest);
      }
    });
    return () => unsubscribe();
  }, [x, parentX]);

  useImperativeHandle(ref, () => ({
    swipe: async (direction: 'left' | 'right') => {
      const targetX = direction === 'left' ? -480 : 480;
      await animate(x, targetX, {
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1]
      });
      if (direction === 'left') {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    }
  }));

  const handleDragEnd = (_event: any, info: any) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    if (offset > 100 || velocity > 500) {
      animate(x, 480, { duration: 0.22, ease: "easeOut" }).then(() => {
        onSwipeRight();
      });
    } else if (offset < -100 || velocity < -500) {
      animate(x, -480, { duration: 0.22, ease: "easeOut" }).then(() => {
        onSwipeLeft();
      });
    } else {
      animate(x, 0, { type: "spring", stiffness: 380, damping: 30 });
    }
  };

  return (
    <motion.div
      style={{ x, rotate, zIndex: 10, transformOrigin: '50% 100%' }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.65}
      onDragEnd={handleDragEnd}
      onContextMenu={handleMediaSecurityNotice}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 350, damping: 28 } }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
      className="absolute inset-0 rounded-[24px] sm:rounded-[28px] overflow-hidden bg-white shadow-lg border border-slate-200/80 flex flex-col cursor-grab active:cursor-grabbing select-none touch-pan-y transform-gpu smooth-gpu user-select-none"
    >
      {/* Screenshot & DRM Protection Floating Security Banner */}
      <AnimatePresence>
        {showSecurityAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-16 left-4 right-4 z-[100] bg-black/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl border border-rose-500/50 shadow-2xl flex items-center space-x-2.5 pointer-events-none"
          >
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
            <p className="text-[11.5px] font-bold leading-tight">
              🔒 <span className="text-rose-300">Protection Médias Badoo</span> : Captures d'écran bloquées pour préserver la vie privée des membres.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe Badge Overlays */}
      <motion.div 
        style={{ opacity: likeOpacity, rotate: -15, scale: likeOpacity }}
        className="absolute top-10 left-5 z-40 border-[3px] border-[#30d158] text-[#30d158] bg-white/95 backdrop-blur-xs font-black tracking-wider text-lg uppercase px-3.5 py-1 rounded-2xl shadow-xl flex items-center space-x-1.5 pointer-events-none origin-center"
      >
        <Heart className="w-6 h-6 fill-[#30d158]" strokeWidth={0} />
        <span>LIKE</span>
      </motion.div>
      <motion.div 
        style={{ opacity: passOpacity, rotate: 15, scale: passOpacity }}
        className="absolute top-10 right-5 z-40 border-[3px] border-[#ff2d55] text-[#ff2d55] bg-white/95 backdrop-blur-xs font-black tracking-wider text-lg uppercase px-3.5 py-1 rounded-2xl shadow-xl flex items-center space-x-1.5 pointer-events-none origin-center"
      >
        <X className="w-6 h-6 text-[#ff2d55]" strokeWidth={3.5} />
        <span>PASS</span>
      </motion.div>

      {/* Scrollable content */}
      <div className="flex-1 w-full h-full overflow-y-auto scrollbar-hide pointer-events-auto touch-pan-y select-none" onContextMenu={handleMediaSecurityNotice}>
        {/* Main Photo with gradient and info on top - fills entire card view */}
        <div 
          onClick={() => openFullScreenGallery(0)}
          className="relative w-full h-full min-h-[560px] sm:min-h-[640px] bg-slate-100 pointer-events-auto shrink-0 overflow-hidden select-none cursor-pointer group"
        >
          <img 
            src={photos[0]} 
            alt={profile.name} 
            className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-300 group-hover:scale-102" 
            draggable={false} 
            onDragStart={handleMediaSecurityNotice}
            loading="eager"
          />
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"></div>

          <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-auto z-20">
             <div 
               onClick={(e) => {
                 e.stopPropagation();
                 setIsProfileModalOpen(true);
               }}
               className="cursor-pointer"
             >
               <h2 className="text-[19px] sm:text-[21px] font-bold text-white drop-shadow-md tracking-tight leading-tight mb-1.5 flex items-center gap-1.5 flex-wrap">
                 {Boolean(profile?.verified === true || profile?.isVerified === true || profile?.is_verified === true || profile?.isPhotoVerified === true) && (
                   <span 
                     className="w-4 h-4 rounded-full bg-[#0084ff] text-white inline-flex items-center justify-center shrink-0 shadow-xs"
                     title="Profil vérifié par photo"
                   >
                     <Check className="w-2.5 h-2.5 stroke-[3]" />
                   </span>
                 )}
                 <span>{profile.name}, {profile.age}</span>
                 {(() => {
                   const isOnline = profile.online !== undefined 
                     ? Boolean(profile.online) 
                     : presenceService.getPresenceForProfile(profile).isOnline;
                   return isOnline ? (
                     <span 
                       className="w-2.5 h-2.5 rounded-full bg-[#30d158] inline-block shrink-0 shadow-xs ml-0.5" 
                       title="En ligne" 
                     />
                   ) : null;
                 })()}
               </h2>
               <div className="flex flex-col space-y-1.5">
                 {/* Badge "Vient de s'inscrire" conforme à 100% à la photo de référence */}
                 {(() => {
                   const isNewRegistrant = Boolean(
                     profile.tagline === "Vient de s'inscrire" ||
                     profile.isNewUser ||
                     profile.isNew ||
                     profile.is_new ||
                     profile.relation === "Vient de s'inscrire" ||
                     profile.joinedRecently
                   );

                   if (isNewRegistrant) {
                     return (
                       <div className="bg-white text-black text-[11.5px] font-bold px-2.5 py-1 rounded-full flex items-center w-max gap-1.5 shadow-sm tracking-tight">
                         {/* Icône feuille / pousse comme sur la photo */}
                         <svg className="w-3.5 h-3.5 text-black shrink-0" viewBox="0 0 24 24" fill="currentColor">
                           <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
                         </svg>
                         <span>Vient de s&apos;inscrire</span>
                       </div>
                     );
                   }

                   return (
                     <div className="bg-white/95 backdrop-blur-xs text-black text-[11px] font-bold px-3 py-1 rounded-full flex items-center w-max gap-1.5 shadow-sm tracking-tight">
                       {profile.relation === 'Une histoire sérieuse' || profile.relation?.toLowerCase() === 'une histoire serieuse' ? (
                         <Heart className="w-3 h-3 text-black fill-black" strokeWidth={0} />
                       ) : profile.relation === 'Discuter' || profile.relation?.toLowerCase() === 'discuter' ? (
                         <MessageCircle className="w-3 h-3 text-black fill-black" strokeWidth={0} />
                       ) : (
                         <Coffee className="w-3 h-3 text-black fill-black" strokeWidth={0} />
                       )}
                       <span>{profile.relation || 'Une histoire sérieuse'}</span>
                     </div>
                   );
                 })()}

                 {/* Immediate Distance or Location Badge (Photo 1 & Photo 2 design) */}
                 {(() => {
                   const distInfo = getProfileDistanceInfo(profile, userCoords);
                   const city = cleanCity(profile.location, profile.city);
                   const isCityDefault = Boolean(profile.showCityOnly || profile.showDistance === false);
                   const showCity = isDistanceToggled ? !isCityDefault : isCityDefault;
                   const badgeText = showCity ? city : distInfo.text;

                   return (
                     <div 
                       onClick={(e) => {
                         e.stopPropagation();
                         setIsDistanceToggled(prev => !prev);
                       }}
                       className="bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center w-max gap-1.5 border border-white/15 shadow-sm tracking-tight pointer-events-auto cursor-pointer active:scale-95 transition-transform select-none"
                       title="Appuyer pour basculer entre distance et ville"
                     >
                       <MapPin className="w-3 h-3 text-white fill-white shrink-0" />
                       <span>{badgeText}</span>
                     </div>
                   );
                 })()}
               </div>
             </div>
             <button 
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 e.preventDefault();
                 onOpenActionMenu();
               }} 
               onPointerDown={(e) => e.stopPropagation()}
               className="text-white p-2 rounded-full bg-black/40 hover:bg-black/60 active:scale-90 backdrop-blur-md transition-all z-30 pointer-events-auto cursor-pointer flex items-center justify-center shadow-lg border border-white/20"
               aria-label="Options du profil"
             >
               <MoreHorizontal className="w-5 h-5 text-white filter drop-shadow-md" strokeWidth={2.8} />
             </button>
          </div>
        </div>
        
        {/* Details Section */}
        <div className="p-4 sm:p-5 pb-28 bg-white">
          <div className="mb-4">
            <h3 className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">Localisation</h3>
            <div className="text-[16px] font-black text-black mb-0.5">{cleanCity(profile.location, profile.city)}</div>
            <div className="flex items-center text-gray-500 text-[11.5px] font-medium">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              Emplacement actuel
            </div>
          </div>

          {((profile.relation && profile.relation !== "Je préfère ne pas le dire") || 
            (profile.status && profile.status !== "Je préfère ne pas le dire") || 
            (profile.orientation && profile.orientation !== "Je préfère ne pas le dire")) && (
            <div className="mb-4">
              <h3 className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-2">Au niveau relations</h3>
              <div className="flex flex-wrap gap-2">
                {profile.relation && profile.relation !== "Je préfère ne pas le dire" && (
                  <span className="bg-gray-100 text-black text-[12px] font-bold px-3 py-1.5 rounded-full flex items-center space-x-1.5">
                    <span>☕</span>
                    <span>{profile.relation}</span>
                  </span>
                )}
                {profile.status && profile.status !== "Je préfère ne pas le dire" && (
                  <span className="bg-gray-100 text-black text-[12px] font-bold px-3 py-1.5 rounded-full flex items-center space-x-1.5">
                    <Heart className="w-3.5 h-3.5 text-black fill-black" strokeWidth={0} />
                    <span>{profile.status}</span>
                  </span>
                )}
                {profile.orientation && profile.orientation !== "Je préfère ne pas le dire" && (
                  <span className="bg-gray-100 text-black text-[12px] font-bold px-3 py-1.5 rounded-full flex items-center space-x-1.5">
                    <span className="text-[12px] font-normal">⚥</span>
                    <span>{profile.orientation}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {profile.language && profile.language !== "Je préfère ne pas le dire" && (
            <div className="mb-4">
              <h3 className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-2">Langues parlées</h3>
              <div className="flex flex-wrap gap-2">
                <span className="bg-gray-100 text-black text-[12px] font-bold px-3 py-1.5 rounded-full flex items-center space-x-1.5">
                  <span className="font-serif text-[12px]">文A</span>
                  <span>{profile.language}</span>
                </span>
              </div>
            </div>
          )}

          {profileDetails.filter((d: any) => d && d !== "Je préfère ne pas le dire" && d !== "not_say" && d !== "not say").length > 0 && (
            <div className="mb-4">
              <h3 className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-2">Plus d'infos</h3>
              <div className="flex flex-wrap gap-2">
                {profileDetails.filter((d: any) => d && d !== "Je préfère ne pas le dire" && d !== "not_say" && d !== "not say").map((d: any, i: number) => {
                  const dLabel = typeof d === 'object' && d !== null
                    ? d.name ? `${d.label}: ${d.name}` : (d.label || String(d))
                    : String(d);
                  return (
                    <span key={i} className="bg-gray-100 text-black text-[12px] font-bold px-3 py-1.5 rounded-full flex items-center space-x-1">
                      <span>{dLabel}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Extra photos if available */}
          {extraPhotos.length > 0 && (
            <div className="space-y-3 mt-5">
              {extraPhotos.map((photoUrl: string, idx: number) => (
                <div 
                  key={idx} 
                  onClick={(e) => {
                    e.stopPropagation();
                    openFullScreenGallery(idx + 1);
                  }}
                  className="w-full rounded-[18px] overflow-hidden shadow-sm bg-slate-100 cursor-pointer relative group pointer-events-auto"
                >
                  <img 
                    src={photoUrl} 
                    alt={`${profile.name} extra ${idx + 1}`} 
                    className="w-full rounded-[18px] object-cover aspect-[3/4] pointer-events-none bg-slate-100" 
                    draggable={false} 
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                    <span className="opacity-0 group-hover:opacity-100 bg-black/75 text-white text-[11.5px] font-extrabold px-3 py-1.5 rounded-full backdrop-blur-md transition-opacity border border-white/20 flex items-center space-x-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Plein écran ({idx + 2}/{photos.length})</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-b-[20px]"></div>

      {/* Detailed Profile Modal when clicking profile */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
        onLike={() => {
          setIsProfileModalOpen(false);
          onSwipeRight();
        }}
      />

      {/* Fullscreen Interactive Photo Gallery Modal */}
      <FullScreenPhotoGalleryModal
        isOpen={isFullScreenGalleryOpen}
        onClose={() => setIsFullScreenGalleryOpen(false)}
        photos={photos}
        initialIndex={galleryStartIdx}
        profileName={profile.name}
      />
    </motion.div>
  );
});

export function EncountersProfiles({ 
  onNavigateToTab,
  genderPreference = 'les_deux',
  setGenderPreference,
  likedProfiles: propLikedProfiles,
  setLikedProfiles: propLikedProfilesSetter,
  onLikeProfile,
  setActiveChat: propSetActiveChat,
  discussions: propDiscussions,
  setDiscussions: propSetDiscussions,
  userLookingFor,
  isPremium,
  onActivatePremium,
  profiles = [],
  receivedLikes = [],
  userProfile,
  loadSupabaseData,
  userPosition
}: { 
  onNavigateToTab?: (tab: string) => void;
  genderPreference?: 'homme' | 'femme' | 'les_deux';
  setGenderPreference?: (pref: 'homme' | 'femme' | 'les_deux') => void;
  likedProfiles?: (string | number)[];
  setLikedProfiles?: React.Dispatch<React.SetStateAction<(string | number)[]>> | ((ids: (string | number)[]) => void);
  onLikeProfile?: (id: string | number) => Promise<boolean | undefined>;
  setActiveChat?: (profile: any) => void;
  discussions?: any[];
  setDiscussions?: (discs: any[]) => void;
  userLookingFor?: 'serieuse' | 'discuter' | 'rencontres';
  isPremium?: boolean;
  onActivatePremium?: () => void;
  profiles?: any[];
  receivedLikes?: string[];
  userProfile?: any;
  loadSupabaseData?: () => void;
  userPosition?: GeolocationPosition;
}) {
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(() => {
    if (userPosition?.coords) {
      return {
        latitude: userPosition.coords.latitude,
        longitude: userPosition.coords.longitude
      };
    }
    return null;
  });

  useEffect(() => {
    if (userPosition?.coords) {
      setUserCoords({
        latitude: userPosition.coords.latitude,
        longitude: userPosition.coords.longitude
      });
    } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        () => {},
        { timeout: 4000, maximumAge: 60000 }
      );
    }
  }, [userPosition]);

  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 60]);
  const [distanceRange, setDistanceRange] = useState<[number, number]>([1, 100]);
  const [advancedFilters, setAdvancedFilters] = useState<any>({});
  const [showExtraShows, setShowExtraShows] = useState(false);
  const [showRechargeCredits, setShowRechargeCredits] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumSlideId, setPremiumSlideId] = useState<string | undefined>(undefined);
  // Pile d'historique (Stack LIFO) des profils vus pour restauration instantanée en React
  const [profileHistory, setProfileHistory] = useState<{
    profile: any;
    index: number;
    wasPass: boolean;
    timestamp: number;
  }[]>([]);
  const [swipeHistory, setSwipeHistory] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const nextScale = useTransform(x, [-200, 0, 200], [1, 0.96, 1]);

  const [isPageTurning, setIsPageTurning] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showCoupDeCoeurModal, setShowCoupDeCoeurModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    x.set(0); // Reset x when index changes to allow next card to center
  }, [currentIndex, x]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const [selectedIntent, setSelectedIntent] = useState<string>('Tous');

  // Real-time Bavel AI™ Swipe Network Sync
  const sendBavelAiSwipe = async (targetId: string | number, targetName: string, direction: 'like' | 'pass' | 'superlike', note?: string) => {
    try {
      const res = await authFetch('/api/encounters/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetProfileId: String(targetId),
          targetProfileName: targetName,
          direction,
          note
        })
      });
      if (res.ok) {
        const data = await res.json();
        return { ...data, success: data.success !== false };
      }
    } catch (err) {
      console.error("Erreur enregistrement swipe Bavel AI:", err);
    }
    return { success: false, isMatch: false };
  };

  // Local state fallbacks if props are not provided
  const [localLikedProfiles, setLocalLikedProfiles] = useState<(string | number)[]>([]);
  const likedProfiles = propLikedProfiles !== undefined ? propLikedProfiles : localLikedProfiles;
  const setLikedProfiles = (val: (string | number)[] | ((prev: (string | number)[]) => (string | number)[])) => {
    if (propLikedProfilesSetter !== undefined) {
      if (typeof val === 'function') {
        propLikedProfilesSetter(val(likedProfiles));
      } else {
        propLikedProfilesSetter(val);
      }
    } else {
      if (typeof val === 'function') {
        setLocalLikedProfiles(val);
      } else {
        setLocalLikedProfiles(val);
      }
    }
  };

  const [localActiveChat, setLocalActiveChat] = useState<any>(null);
  // Prevent duplicate rendering: if parent handles setActiveChat, don't show local active chat
  const activeChat = propSetActiveChat !== undefined ? null : localActiveChat;
  const setActiveChat = propSetActiveChat !== undefined ? propSetActiveChat : setLocalActiveChat;

  const [localDiscussions, setLocalDiscussions] = useState<any[]>([]);
  const discussions = propDiscussions !== undefined ? propDiscussions : localDiscussions;
  const setDiscussions = propSetDiscussions !== undefined ? propSetDiscussions : setLocalDiscussions;

  const cardRef = useRef<any>(null);

  // Real-time Bavel AI™ Engine state
  const [bavelAiProfiles, setBavelAiProfiles] = useState<any[]>([]);
  const [isBavelAiLoading, setIsBavelAiLoading] = useState<boolean>(false);
  const [bavelAiError, setBavelAiError] = useState<string | null>(null);
  const [encounterRequestVersion, setEncounterRequestVersion] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchBavelAiEncounters = async () => {
      setIsBavelAiLoading(true);
      setBavelAiError(null);
      try {
        const res = await authFetch('/api/encounters/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            genderPreference,
            minAge: ageRange[0],
            maxAge: ageRange[1],
            latitude: userCoords?.latitude,
            longitude: userCoords?.longitude,
            intent: selectedIntent,
            minDistanceKm: distanceRange[0],
            maxDistanceKm: distanceRange[1],
            advancedFilters
          })
        });
        if (!res.ok) {
          throw new Error(`encounters_profiles_${res.status}`);
        }
        const data = await res.json();
        if (isMounted) {
          setBavelAiProfiles(Array.isArray(data.profiles) ? data.profiles : []);
        }
      } catch (err) {
        console.error("Erreur chargement rencontres Bavel AI:", err);
        if (isMounted) {
          setBavelAiProfiles([]);
          setBavelAiError('Impossible de charger les profils. Vérifiez votre connexion puis réessayez.');
        }
      } finally {
        if (isMounted) setIsBavelAiLoading(false);
      }
    };

    fetchBavelAiEncounters();
    return () => { isMounted = false; };
  }, [genderPreference, ageRange, distanceRange, selectedIntent, advancedFilters, userCoords?.latitude, userCoords?.longitude, userProfile?.id, encounterRequestVersion]);

  const encounterProfiles = useMemo(() => {
    return bavelAiProfiles;
  }, [bavelAiProfiles]);

  const filteredCandidates = useMemo(() => {
    const filtered = encounterProfiles.filter(p => {
      // Gender filter
      const genderMatch = genderPreference === 'les_deux' || p.gender === genderPreference;
      if (!genderMatch) return false;

      // Age filter
      if (p.age < ageRange[0] || p.age > ageRange[1]) return false;

      // Intent filter ("Je suis ici pour...")
      if (selectedIntent !== 'Tous') {
        const pRelation = (p as any).relation?.toLowerCase() || '';
        const targetIntent = selectedIntent.toLowerCase();
        if (targetIntent === 'une histoire sérieuse' && !pRelation.includes('sérieuse') && !pRelation.includes('serieuse')) {
          return false;
        }
        if (targetIntent === 'discuter' && !pRelation.includes('discuter') && !pRelation.includes('amitié')) {
          return false;
        }
        if (targetIntent === 'des rencontres' && !pRelation.includes('rencontres') && !pRelation.includes('spontané')) {
          return false;
        }
      }

      // Advanced filters
      if (advancedFilters.lookingFor && advancedFilters.lookingFor !== 'Tous' && (p as any).relation !== advancedFilters.lookingFor) return false;
      if (advancedFilters.verifiedOnly && !((p as any).verified || (p as any).isVerified || (p as any).is_verified)) return false;
      if (advancedFilters.onlineOnly && (p as any).online !== true) return false;
      if (advancedFilters.photosOnly && !((p as any).photos?.some(Boolean) || (p as any).img || (p as any).avatarUrl)) return false;
      if (typeof p.distanceKm === 'number' &&
          (p.distanceKm < distanceRange[0] || p.distanceKm > distanceRange[1])) return false;
      if (advancedFilters.status && advancedFilters.status !== 'Tous' && (p as any).status !== advancedFilters.status) return false;
      if (advancedFilters.religion && advancedFilters.religion !== 'Tous' && !(p as any).details?.some((d: string) => d.includes(advancedFilters.religion))) return false;
      
      return true;
    });

    return filtered;
  }, [encounterProfiles, genderPreference, ageRange, distanceRange, selectedIntent, advancedFilters]);

  // Lock deck order to prevent current active profile from shifting during background data refreshes
  const [deckProfiles, setDeckProfiles] = useState<any[]>([]);
  const prevFilterKeyRef = useRef<string>('');

  useEffect(() => {
    const filterKey = `${genderPreference}_${ageRange.join('-')}_${selectedIntent}_${JSON.stringify(advancedFilters)}`;
    
    // If user changed explicit filters, reset index and rebuild deck
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      const rankedByAffinity = aiSystemEngine.rankProfilesByAffinityAndProximity(userProfile || {}, filteredCandidates);
      const isBoosted = monetizationService.getBoostState().isActive;
      const optimized = aiMonetizationEngine.optimizeCandidatesForBoostedUser(rankedByAffinity, isBoosted);
      setDeckProfiles(optimized);
      setCurrentIndex(0);
      return;
    }

    // Otherwise (data refresh), append newly added profiles at tail without shifting existing order
    setDeckProfiles(prev => {
      if (prev.length === 0) {
        const ranked = aiSystemEngine.rankProfilesByAffinityAndProximity(userProfile || {}, filteredCandidates);
        return ranked;
      }
      const existingIds = new Set(prev.map(p => String(p.id)));
      const newAdditions = filteredCandidates.filter(p => !existingIds.has(String(p.id)));
      return newAdditions.length > 0 ? [...prev, ...newAdditions] : prev;
    });
  }, [filteredCandidates, genderPreference, ageRange, selectedIntent, advancedFilters, userProfile?.id]);

  const filteredEncounterProfiles = deckProfiles.length > 0 ? deckProfiles : filteredCandidates;

  const isEndOfStack = currentIndex >= filteredEncounterProfiles.length;

  const currentProfile = !isEndOfStack
    ? filteredEncounterProfiles[currentIndex]
    : null;

  const nextProfile = filteredEncounterProfiles.length > 0 && currentIndex + 1 < filteredEncounterProfiles.length
    ? filteredEncounterProfiles[currentIndex + 1]
    : null;

  // Preload next 3 profiles for instant, 60 FPS transitions
  useEffect(() => {
    if (filteredEncounterProfiles.length > 0) {
      const upcoming = filteredEncounterProfiles.slice(currentIndex + 1, currentIndex + 4);
      preloadNextProfiles(upcoming.map(p => ({ photo: (p as any).img || (p as any).photos?.[0] })));
    }
  }, [filteredEncounterProfiles, currentIndex]);

  const handleNext = async (wasPass: boolean = false) => {
    // Contrôle de la limite de Swipes (Condition 5)
    const userTier = (userProfile?.tier || (isPremium ? 'premium' : monetizationService.getUserStatus())).toLowerCase();
    const privileges = getTierPrivileges(userTier);

    if (!privileges.unlimitedSwipes && (userProfile?.daily_likes_count || 0) >= 50) {
      showToast("⚠️ Limite atteinte ! Passez à l'offre EXTRA ou PREMIUM pour swiper en illimité.");
      setPremiumSlideId('unlimited_likes');
      setShowPremiumModal(true);
      return;
    }

    // Badoo AI Bot Sentinel Surveillance
    const velocityCheck = securityService.recordSwipeAndCheckVelocity();
    if (velocityCheck.isVelocityAbnormal && velocityCheck.message) {
      showToast(velocityCheck.message);
    }

    if (currentProfile) {
      if (wasPass) {
        const passResult = await sendBavelAiSwipe(currentProfile.id, currentProfile.name, 'pass');
        if (!passResult.success) {
          x.set(0);
          showToast('Le profil n’a pas pu être passé. Réessayez.');
          return;
        }
      }
      // 1. Sauvegarde dans la pile d'historique (Stack LIFO) pour réaffichage instantané
      setProfileHistory(prev => [...prev, {
        profile: currentProfile,
        index: currentIndex,
        wasPass,
        timestamp: Date.now()
      }]);
      setSwipeHistory(prev => [...prev, currentIndex]);

    }

    setCurrentIndex(prev => prev + 1);
  };

  const handleUndo = async () => {
    const userTier = (userProfile?.tier || (isPremium ? 'premium' : monetizationService.getUserStatus())).toLowerCase();
    const privileges = getTierPrivileges(userTier);

    // 1. Contrôle des droits de l'offre (Extra et Premium autorisés)
    if (!privileges.rewindSwipe && !monetizationService.hasPermission('canRewindSwipes') && !isPremium) {
      setPremiumSlideId('undo');
      setShowPremiumModal(true);
      showToast("⚠️ L'annulation du swipe est réservée aux membres EXTRA et PREMIUM !");
      return;
    }

    if (profileHistory.length === 0 && swipeHistory.length === 0) {
      showToast("Aucun profil précédent à réafficher.");
      return;
    }

    // 2. Récupérer le dernier profil de la pile d'historique (Stack LIFO)
    const lastItem = profileHistory[profileHistory.length - 1];
    const prevIndex = lastItem ? lastItem.index : (swipeHistory[swipeHistory.length - 1] ?? Math.max(0, currentIndex - 1));

    try {
      const response = await authFetch('/api/encounters/undo', { method: 'POST' });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        showToast(payload?.error || "Impossible d'annuler ce swipe.");
        return;
      }

      setProfileHistory(prev => prev.slice(0, -1));
      setSwipeHistory(prev => prev.slice(0, -1));
      setCurrentIndex(prevIndex);

      if (lastItem && !lastItem.wasPass && lastItem.profile?.id) {
        setLikedProfiles(prev => prev.filter(id => id !== lastItem.profile.id));
      }
      showToast("⏪ Profil précédent réaffiché !");
    } catch (error: any) {
      console.error("Erreur annulation swipe:", error);
      showToast("Impossible d'annuler ce swipe. Vérifiez votre connexion.");
    }
  };

  const handleLike = async () => {
    if (currentProfile) {
      if (!userProfile?.id) {
        showToast('Connectez-vous pour aimer un profil.');
        return;
      }
      if (!likedProfiles.includes(currentProfile.id)) {
        setLikedProfiles([...likedProfiles, currentProfile.id]);
      }
      const serverSwipe = await sendBavelAiSwipe(currentProfile.id, currentProfile.name, 'like');
      pushNotificationService.triggerNewLikePush(currentProfile.name, currentProfile.img);
      
      if (serverSwipe?.isMatch) {
        showToast(`🎉 Match avec ${currentProfile.name} !`);
        triggerMatchExplosion();
      } else {
        showToast(`❤️ Like envoyé à ${currentProfile.name} !`);
      }

      // Refresh Supabase data to check for instant matches
      if (typeof loadSupabaseData === 'function') {
        loadSupabaseData();
      }
    }
    handleNext(false);
  };

  const triggerMatchExplosion = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
    try {
      const duration = 2.2 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 35, spread: 360, ticks: 70, zIndex: 999 };

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 60 * (timeLeft / duration);

        confetti({ ...defaults, particleCount, origin: { x: 0.25, y: 0.6 }, colors: ['#e20030', '#ff2d55', '#ffd700', '#7c3aed'] });
        confetti({ ...defaults, particleCount, origin: { x: 0.75, y: 0.6 }, colors: ['#e20030', '#ff2d55', '#ffd700', '#7c3aed'] });
      }, 200);
    } catch (e) {
      console.log('Confetti exception:', e);
    }
  };

  const handleLikeDirect = async () => {
    let isMatch = false;
    if (currentProfile) {
      // Real-time Bavel AI swipe
      const swipeRes = await sendBavelAiSwipe(currentProfile.id, currentProfile.name, 'like');
      if (!swipeRes.success) {
        showToast('Le like n’a pas pu être envoyé. Réessayez.');
        return;
      }

      if (onLikeProfile) {
        const propMatch = await onLikeProfile(currentProfile.id);
        isMatch = Boolean(propMatch || swipeRes?.isMatch);
      } else {
        if (!likedProfiles.includes(currentProfile.id)) {
          setLikedProfiles([...likedProfiles, currentProfile.id]);
        }
        isMatch = Boolean(swipeRes?.isMatch);
      }

      if (loadSupabaseData) {
        loadSupabaseData();
      }
    }
    
    if (isMatch) {
      triggerMatchExplosion();
      setShowMatchModal(true);
    } else {
      handleNext();
    }
  };

  const handleLikeClick = async () => {
    if (isPageTurning) return;
    setIsPageTurning(true);
    if (cardRef.current) {
      cardRef.current.swipe('right').finally(() => {
        setIsPageTurning(false);
      });
    } else {
      handleLikeDirect().finally(() => {
        setIsPageTurning(false);
      });
    }
  };

  const handlePassClick = () => {
    if (isPageTurning) return;
    setIsPageTurning(true);
    if (cardRef.current) {
      cardRef.current.swipe('left').finally(() => {
        setIsPageTurning(false);
      });
    } else {
      handleNext(true);
      setIsPageTurning(false);
    }
  };

  const handleCloseMatch = () => {
    setShowMatchModal(false);
    handleNext();
  };

  const handleOpenChat = () => {
    setShowMatchModal(false);
    if (currentProfile) {
      // Check if this matched profile is already in active discussions
      const alreadyExists = discussions.some((d: any) => d.id === currentProfile.id || d.name === currentProfile.name);
      if (!alreadyExists) {
        const newMatchChat = {
          id: currentProfile.id,
          name: currentProfile.name,
          age: currentProfile.age,
          img: currentProfile.img,
          online: true,
          initialMessage: "Coucou ! J'espère que tu vas bien. On a matché ! 😊",
          gender: currentProfile.gender
        };
        setDiscussions([newMatchChat, ...discussions]);
      }
      setActiveChat(currentProfile);
      if (onNavigateToTab) {
        onNavigateToTab('discussions');
      }
    }
  };

  return (
    <SwipeThemeProvider>
      <div className="pt-1 sm:pt-2 px-2 sm:px-3 h-full flex flex-col relative pb-0">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[260] bg-black/95 text-white text-[12.5px] font-bold px-4 py-2 rounded-full shadow-lg border border-white/20 flex items-center space-x-2"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {showCoupDeCoeurModal && currentProfile && (
        <CoupDeCoeurModal 
          profile={currentProfile}
          onClose={() => setShowCoupDeCoeurModal(false)}
          onOpenRecharge={() => {
            setShowCoupDeCoeurModal(false);
            setShowRechargeCredits(true);
          }}
        />
      )}

      {showFilters && (
        <EncountersFiltersMenu 
          onClose={() => setShowFilters(false)} 
          genderPreference={genderPreference}
          setGenderPreference={setGenderPreference}
          ageRange={ageRange}
          setAgeRange={setAgeRange}
          distanceRange={distanceRange}
          setDistanceRange={setDistanceRange}
          advancedFilters={advancedFilters}
          setAdvancedFilters={setAdvancedFilters}
        />
      )}
      {showExtraShows && (
        <ExtraShowsMenu 
          onClose={() => setShowExtraShows(false)} 
          onOpenRecharge={() => {
            setShowExtraShows(false);
            setShowRechargeCredits(true);
          }} 
        />
      )}
      {showRechargeCredits && (
        <RechargeCreditsMenu onClose={() => setShowRechargeCredits(false)} />
      )}
      {showActionMenu && (
        <EncounterCardMenu 
          profileName={currentProfile?.name}
          onClose={() => setShowActionMenu(false)}
          onBlock={() => {
            setShowActionMenu(false);
            void (async () => {
              if (!userProfile?.id || !currentProfile?.id) return;
              const response = await authFetch('/api/blocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blockedUserId: String(currentProfile.id) })
              });
              if (!response.ok) {
                showToast('Blocage impossible. Réessayez.');
                return;
              }
              showToast('Utilisateur bloqué');
              handleNext(true);
            })();
          }}
          onReport={() => {
            setShowActionMenu(false);
            void (async () => {
              if (!userProfile?.id || !currentProfile?.id) return;
              const response = await authFetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reportedId: String(currentProfile.id),
                  category: 'other',
                  description: 'Signalement envoyé depuis la section Rencontres.'
                })
              });
              showToast(response.ok ? 'Signalement transmis aux modérateurs' : 'Signalement impossible. Réessayez.');
            })();
          }}
        />
      )}
      {showMatchModal && (
        <MatchModal 
          matchedProfile={currentProfile} 
          onClose={handleCloseMatch} 
          onChat={handleOpenChat} 
        />
      )}
      <AnimatePresence>
        {activeChat && (
          <ChatConversationView 
            profile={activeChat} 
            isPremium={isPremium}
            onActivatePremium={onActivatePremium}
            onClose={() => { setActiveChat(null); handleNext(); }} 
            onOpenPremium={(slideId) => {
              setPremiumSlideId(slideId);
              setShowPremiumModal(true);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPremiumModal && (
          <BavelPremiumModal 
            onClose={() => {
              setShowPremiumModal(false);
              setPremiumSlideId(undefined);
            }} 
            initialSlideId={premiumSlideId}
            profileName={currentProfile?.name}
            onSubscribe={() => {
              onActivatePremium?.();
              showToast("✨ Bavel Premium activé !");
            }}
          />
        )}
      </AnimatePresence>


      <div className="pt-1 pb-1 flex items-center justify-between shrink-0">
        <h1 className="text-[26px] sm:text-[28px] font-black text-black tracking-tight">Rencontres</h1>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowExtraShows(true)} 
            className="p-1 relative transition-transform active:scale-90"
            title="Extra Shows"
          >
            <Zap className="w-6 h-6 text-black" strokeWidth={2} />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ff2d55] border-2 border-white rounded-full"></div>
          </button>
          {(profileHistory.length > 0 || swipeHistory.length > 0) && (
            <button 
              onClick={handleUndo}
              className="p-1 hover:bg-gray-50 rounded-full transition-transform active:scale-90"
              title="Annuler le dernier swipe"
            >
              <RotateCcw className="w-6 h-6 text-[#ff9500]" strokeWidth={2.5} />
            </button>
          )}
          <button 
            onClick={() => setShowFilters(true)} 
            className="p-1 hover:bg-gray-50 rounded-full transition-transform active:scale-90"
          >
            <SlidersHorizontal className="w-6 h-6 text-black" strokeWidth={2} />
          </button>
        </div>
      </div>


      <div className="flex-1 relative min-h-0 mb-1">
        {isBavelAiLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <RefreshCw className="w-8 h-8 animate-spin text-black mb-4" />
            <p className="text-gray-600 font-medium">Chargement des profils réels...</p>
          </div>
        ) : bavelAiError ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-gray-600 font-medium mb-5">{bavelAiError}</p>
            <button
              type="button"
              onClick={() => setEncounterRequestVersion(value => value + 1)}
              className="bg-black text-white font-bold px-6 py-3 rounded-full active:scale-95 transition-transform"
            >
              Réessayer
            </button>
          </div>
        ) : isEndOfStack ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-6 -mt-4"
          >
            {/* Illustration */}
            <div className="relative w-52 h-52 mb-6 flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                {/* Purple Sleeve */}
                <path 
                  d="M 54,118 L 70,168 L 96,168 L 80,118 Z" 
                  fill="#B296ED" 
                  stroke="#000000" 
                  strokeWidth="2.5" 
                  strokeLinejoin="round" 
                />

                {/* Hand Main Body (white fill with black stroke) */}
                <path 
                  d="M 80,118 C 80,102 88,82 96,64 C 100,52 106,38 116,38 C 124,38 128,44 126,54 C 122,68 114,80 108,88 C 120,88 136,88 148,88 C 156,88 156,102 148,102 C 154,102 154,116 146,116 C 152,116 152,130 144,130 C 148,130 148,144 138,144 C 120,144 95,148 80,160 Z" 
                  fill="#FFFFFF" 
                  stroke="#000000" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />

                {/* Finger separation inner lines */}
                <path d="M 108,102 L 148,102" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 104,116 L 146,116" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 100,130 L 144,130" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />

                {/* 5 Radiating lines above thumb */}
                <path d="M 88,28 L 98,36" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 102,18 L 108,28" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 118,12 L 118,24" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 134,18 L 128,28" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 148,28 L 138,36" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Text Title */}
            <h2 className="text-[22px] font-bold text-black mb-3 tracking-tight">C'est tout... pour le moment</h2>

            {/* Paragraph */}
            <p className="text-[#666666] text-[15px] font-normal leading-[1.45] max-w-[310px] mb-8">
              Consultez votre liste de Likes pour trouver un Match, ou bien modifiez vos filtres pour voir d'autres profils.
            </p>

            {/* Action Buttons */}
            <div className="w-full flex flex-col items-center space-y-2.5">
              {(profileHistory.length > 0 || swipeHistory.length > 0) && (
                <button 
                  onClick={handleUndo}
                  className="w-full max-w-[260px] bg-[#ff9500] hover:bg-[#e08500] text-white font-bold py-3 rounded-full text-[14px] sm:text-[15px] shadow-sm active:scale-95 transition-transform flex items-center justify-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
                  <span>Annuler le dernier swipe</span>
                </button>
              )}
              <button 
                onClick={() => setCurrentIndex(0)}
                className="w-full max-w-[260px] bg-black text-white font-bold py-3.5 rounded-full text-[15px] shadow-xs active:scale-95 transition-transform flex items-center justify-center space-x-2"
              >
                <span>Recommencer le défilé</span>
              </button>
              <button 
                onClick={() => onNavigateToTab?.('likes')}
                className="w-full max-w-[260px] bg-gray-100 text-black font-semibold py-3 rounded-full text-[14px] active:scale-95 transition-transform"
              >
                Voir mes Likes
              </button>
              <button 
                onClick={() => setShowFilters(true)}
                className="text-[#666666] text-[14px] font-medium py-1 active:scale-95 transition-transform hover:text-black"
              >
                Modifier les filtres
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="h-full relative" style={{ perspective: '1500px', transformStyle: 'preserve-3d' }}>
            {nextProfile && (
              <motion.div 
                className="absolute inset-0 rounded-[24px] sm:rounded-[28px] overflow-hidden bg-white shadow-md border border-slate-200/80 flex flex-col pointer-events-none"
                style={{
                  scale: isPageTurning ? 1 : nextScale,
                  zIndex: 0
                }}
              >
                {/* Scrollable content */}
                <div className="flex-1 w-full h-full overflow-y-auto scrollbar-hide">
                  {/* Main Photo with gradient and info on top */}
                  <div className="relative w-full h-full min-h-[560px] sm:min-h-[640px] bg-slate-100 pointer-events-none shrink-0 overflow-hidden">
                    <img 
                      src={nextProfile.img} 
                      alt={nextProfile.name} 
                      className="w-full h-full object-cover pointer-events-none" 
                      draggable={false} 
                      loading="eager"
                    />
                    <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/60 to-transparent"></div>
                    
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                       <div>
                         <h2 className="text-[19px] sm:text-[21px] font-bold text-white drop-shadow-md tracking-tight leading-tight mb-1.5 flex items-center gap-1.5 flex-wrap">
                           {nextProfile.verified && (
                             <span 
                               className="w-4 h-4 rounded-full bg-[#0084ff] text-white inline-flex items-center justify-center shrink-0 shadow-xs"
                               title="Profil vérifié par photo"
                             >
                               <Check className="w-2.5 h-2.5 stroke-[3]" />
                             </span>
                           )}
                           <span>{nextProfile.name}, {nextProfile.age}</span>
                           {nextProfile.online === true && (
                             <span 
                               className="w-2.5 h-2.5 rounded-full bg-[#30d158] inline-block shrink-0 shadow-xs" 
                               title="En ligne" 
                             />
                           )}
                         </h2>
                         <div className="flex flex-col space-y-1.5">
                           <div className="bg-white/95 backdrop-blur-xs text-black text-[11px] font-bold px-3 py-1 rounded-full flex items-center w-max gap-1.5 shadow-sm tracking-tight">
                             <Heart className="w-3 h-3 text-black fill-black" strokeWidth={0} />
                             <span>{nextProfile.relation || 'Une histoire sérieuse'}</span>
                           </div>
                           <div className="bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center w-max gap-1.5 border border-white/15 shadow-sm tracking-tight">
                             <MapPin className="w-3 h-3 text-white fill-white shrink-0" />
                             <span>{getProfileDistanceInfo(nextProfile, userCoords).text}</span>
                           </div>
                         </div>
                       </div>
                       <div className="text-white p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center">
                         <MoreHorizontal className="w-5 h-5 text-white filter drop-shadow-md" strokeWidth={2.8} />
                       </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {currentProfile && (
                <SwipeProfileCard
                  key={currentProfile.id}
                  ref={cardRef}
                  profile={currentProfile}
                  parentX={x}
                  onSwipeLeft={() => handleNext(true)}
                  onSwipeRight={() => {
                    handleLikeDirect();
                  }}
                  onOpenActionMenu={() => setShowActionMenu(true)}
                  userCoords={userCoords}
                />
              )}
            </AnimatePresence>

            {/* Floating Action Buttons */}
            {currentProfile && (
              <SwipeActions
                onPass={() => handlePassClick()}
                onCoupDeCoeur={() => {
                  if (!isPageTurning) setShowCoupDeCoeurModal(true);
                }}
                onLike={() => handleLikeClick()}
                onUndo={() => handleUndo()}
                canUndo={profileHistory.length > 0 || swipeHistory.length > 0}
                isPageTurning={isPageTurning}
              />
            )}
          </div>
        )}
      </div>
    </div>
    </SwipeThemeProvider>
  );
}
