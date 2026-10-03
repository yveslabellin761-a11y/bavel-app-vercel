import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SlidersHorizontal, MapPin, Heart, MessageCircle, MessageCircleMore, User as UserIcon, 
  Settings, HelpCircle, Camera, Zap, Search, Bell, Gauge, Edit3, Mail,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Smile, Plus, Copy, MoreHorizontal, Lock, CheckCircle, Check, X, Star, Shield, Eye, EyeOff, FileText, RotateCcw,
  Navigation, Baby, Target, Ruler, Languages, Wine, Sparkles, Dog, Brain, Flame, Cigarette, GraduationCap, BookOpen, Coffee, Clapperboard, ChevronsUp, Megaphone, Battery, Send,
  Radio, Locate, LocateFixed, RefreshCw, Map, Compass, Image as ImageIcon, Briefcase,
  Phone, Video, Mic, CheckCheck, Gift, Ban, ThumbsUp, ArrowUp, Coins, Volume2, VolumeX, UserX, PhoneOff, MicOff, VideoOff, Play, Pause, Trash2, Hand, Users, Pencil,
  AlertTriangle, Flag, ShieldAlert, AlertOctagon, ThumbsDown
} from 'lucide-react';
import { User } from '../../types';
import BavelPremiumModal from '../modals/BavelPremiumModal';
import { PhotoAdviceModal } from '../modals/PhotoAdviceModal';
import { playSynthAudio } from '../../utils/audio';
import { REWARDED_ADS_ENABLED } from './RewardedAdsManager';
import { aiSystemEngine } from '../../services/aiSystemEngine';
import { authFetch } from '../../lib/authFetch';

export function ActionMenu({ 
  onClose, 
  onHide,
  onBlock,
  onReport,
  onMute,
  onDelete,
  onViewProfile,
  onShare,
  onFavorite,
}: { 
  onClose: () => void; 
  onHide?: () => void;
  onBlock?: () => void;
  onReport?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
  onViewProfile?: () => void;
  onShare?: () => void;
  onFavorite?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="relative bg-white/95 backdrop-blur-xl rounded-t-[28px] flex flex-col pt-3 pb-8 px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-white/60 z-10 space-y-1" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-300/80 rounded-full mx-auto mb-3" />

        <button 
          onClick={() => { if (onFavorite) onFavorite(); onClose(); }}
          className="w-full py-3.5 text-[15px] font-semibold text-slate-900 border-b border-gray-100 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-400 shrink-0" />
          <span>Ajouter aux favoris</span>
        </button>

        <button 
          onClick={() => { if (onHide) onHide(); onClose(); }}
          className="w-full py-3.5 text-[15px] font-semibold text-slate-900 border-b border-gray-100 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
        >
          <EyeOff className="w-4.5 h-4.5 text-gray-600 shrink-0" />
          <span>Masquer le profil</span>
        </button>

        <button 
          onClick={() => { if (onBlock) onBlock(); onClose(); }}
          className="w-full py-3.5 text-[15px] font-semibold text-rose-600 border-b border-gray-100 hover:bg-rose-50/80 active:bg-rose-100 rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Ban className="w-4.5 h-4.5 text-rose-600 shrink-0" />
          <span>Bloquer</span>
        </button>

        <button 
          onClick={() => { if (onReport) onReport(); onClose(); }}
          className="w-full py-3.5 text-[15px] font-bold text-rose-600 border-b border-gray-100 hover:bg-rose-50/80 active:bg-rose-100 rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Shield className="w-4.5 h-4.5 text-rose-600 shrink-0" />
          <span>Signaler</span>
        </button>

        <button 
          onClick={onClose} 
          className="w-full py-3.5 text-[15px] font-bold text-gray-500 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-colors text-center mt-1 cursor-pointer"
        >
          Annuler
        </button>
      </motion.div>
    </div>
  );
}

/**
 * Menu réservé strictement et exclusivement aux 3 points des cartes d'annonce de la section Rencontres.
 * Comporte uniquement : Bloquer et Signaler (avec bouton Annuler).
 */
export function EncounterCardMenu({
  onClose,
  onBlock,
  onReport,
  profileName,
}: {
  onClose: () => void;
  onBlock: () => void;
  onReport: () => void;
  profileName?: string;
}) {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />
      
      {/* Bottom Sheet réservé aux cartes Rencontres */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="relative bg-white/95 backdrop-blur-xl rounded-t-[28px] flex flex-col pt-3 pb-8 px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-white/60 z-10 space-y-1 select-none" 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-300/80 rounded-full mx-auto mb-3" />

        {/* 1. Bloquer */}
        <button 
          onClick={() => { onBlock(); onClose(); }}
          className="w-full py-3.5 text-[15px] font-bold text-rose-600 border-b border-gray-100 hover:bg-rose-50/80 active:bg-rose-100 rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Ban className="w-4.5 h-4.5 text-rose-600 shrink-0" />
          <span>Bloquer</span>
        </button>

        {/* 2. Signaler */}
        <button 
          onClick={() => { onReport(); onClose(); }}
          className="w-full py-3.5 text-[15px] font-bold text-rose-600 border-b border-gray-100 hover:bg-rose-50/80 active:bg-rose-100 rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
        >
          <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0" />
          <span>Signaler</span>
        </button>

        {/* 3. Annuler */}
        <button 
          onClick={onClose} 
          className="w-full py-3.5 text-[15px] font-bold text-gray-500 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-colors text-center mt-1 cursor-pointer"
        >
          Annuler
        </button>
      </motion.div>
    </div>
  );
}

/* Full-screen Photo Gallery Modal matching IMG_4519.PNG & IMG_4520.PNG */
export function FullScreenPhotoGalleryModal({
  isOpen,
  onClose,
  photos,
  initialIndex = 0,
  profileName
}: {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  initialIndex?: number;
  profileName?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setDirection(0);
    }
  }, [isOpen, initialIndex]);

  if (!isOpen || !photos || photos.length === 0) return null;

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const modalRoot = typeof document !== 'undefined' ? document.getElementById('mobile-modal-root') : null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[350] bg-black flex flex-col justify-between overflow-hidden select-none pointer-events-auto"
        >
          {/* Top Header Bar matching IMG_4519.PNG */}
          <div className="pt-4 pb-3 px-4 flex items-center justify-between z-30 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 text-white hover:opacity-80 transition-opacity active:scale-90 cursor-pointer"
              aria-label="Fermer"
            >
              <X className="w-6.5 h-6.5 text-white" strokeWidth={2.5} />
            </button>

            <span className="text-[17px] sm:text-[19px] font-extrabold text-white tracking-wide drop-shadow-md">
              {currentIndex + 1} sur {photos.length}
            </span>

            {/* Spacer for symmetrical title centering */}
            <div className="w-10" />
          </div>

          {/* Main Swipeable Photo Canvas matching IMG_4519.PNG & IMG_4520.PNG */}
          <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.img
                key={currentIndex}
                src={photos[currentIndex]}
                alt={`${profileName || 'Photo'} ${currentIndex + 1}`}
                initial={{ opacity: 0, x: direction > 0 ? 120 : direction < 0 ? -120 : 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -120 : 120 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={(_, info) => {
                  const swipeThreshold = 40;
                  if (info.offset.x < -swipeThreshold) {
                    handleNext();
                  } else if (info.offset.x > swipeThreshold) {
                    handlePrev();
                  }
                }}
                className="w-full h-full object-contain max-h-[88vh] cursor-grab active:cursor-grabbing transform-gpu"
              />
            </AnimatePresence>

            {/* Left / Right Nav Arrows & Tap Zones */}
            {photos.length > 1 && (
              <>
                <div 
                  onClick={handlePrev}
                  className="absolute left-0 top-0 bottom-0 w-1/4 z-15 cursor-pointer" 
                />
                <div 
                  onClick={handleNext}
                  className="absolute right-0 top-0 bottom-0 w-1/4 z-15 cursor-pointer" 
                />

                <button
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 z-20 cursor-pointer border border-white/10"
                >
                  <ChevronLeft className="w-6 h-6 text-white" strokeWidth={3} />
                </button>

                <button
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 z-20 cursor-pointer border border-white/10"
                >
                  <ChevronRight className="w-6 h-6 text-white" strokeWidth={3} />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {photos.length > 1 && (
            <div className="py-4 px-4 flex items-center justify-center space-x-2.5 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent overflow-x-auto scrollbar-hide">
              {photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > currentIndex ? 1 : -1);
                    setCurrentIndex(i);
                  }}
                  className={`relative w-11 h-11 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    currentIndex === i ? 'border-white scale-110 shadow-lg ring-2 ring-white/30' : 'border-white/20 opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return modalRoot ? createPortal(content, modalRoot) : content;
}


export function MoodsMenu({ 
  onClose, 
  currentMood, 
  onSelectMood 
}: { 
  onClose: () => void; 
  currentMood?: { emoji: string; label: string } | null;
  onSelectMood: (mood: { emoji: string; label: string }) => void;
}) {
  const moods = [
    { emoji: '😌', label: 'Faisons connaissance' },
    { emoji: '🥰', label: 'Relation long terme' },
    { emoji: '😂', label: 'Faites-moi rire' },
    { emoji: '👋', label: 'Envie de discuter' },
    { emoji: '✌️', label: 'Plutôt confiant' },
    { emoji: '✨', label: 'Énergie positive' },
    { emoji: '🙌', label: 'Envie d\'aventure' },
    { emoji: '🔎', label: 'L\'âme sœur' },
    { emoji: '🤗', label: 'Amitiés nouvelles' },
    { emoji: '😉', label: 'Envie de flirter' },
  ];

  return (
    <div className="fixed inset-0 z-[140] flex flex-col justify-end">
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
        className="relative bg-white rounded-t-[28px] w-full flex flex-col z-10 p-4 shadow-2xl overflow-hidden max-h-[85dvh]"
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2 shrink-0" />
        
        {/* Header */}
        <div className="flex items-center space-x-3 mb-3 shrink-0 px-1">
          <div className="bg-[#EBE4FF] w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-purple-100 shadow-xs">
            <Smile className="w-5 h-5 text-black fill-black" strokeWidth={1} />
          </div>
          <div>
            <h2 className="text-[19px] font-black text-black leading-tight tracking-tight">Quel est votre mood ?</h2>
            <p className="text-[12px] text-gray-500 font-medium">Partagez ce que vous ressentez en ce moment.</p>
          </div>
        </div>

        {/* 2-Column Compact Grid - fits on one screen without scrolling */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {moods.map((mood, idx) => {
            const isSelected = currentMood?.emoji === mood.emoji;
            return (
              <motion.button 
                key={idx}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onSelectMood(mood);
                  onClose();
                }}
                className={`py-2 px-2.5 rounded-xl border flex items-center justify-between transition-all text-left ${
                  isSelected 
                    ? 'bg-[#EBE4FF] border-purple-400 shadow-xs' 
                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0 pr-1">
                  <span className="text-[17px] shrink-0">{mood.emoji}</span>
                  <span className={`text-[12px] leading-tight truncate ${isSelected ? 'font-extrabold text-black' : 'font-bold text-gray-800'}`}>
                    {mood.label}
                  </span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  isSelected ? 'border-black bg-black' : 'border-gray-300'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between shrink-0 pt-2 border-t border-gray-100">
          <button 
            onClick={onClose} 
            className="text-[13px] font-bold text-gray-400 hover:text-black px-2 py-1 transition-colors"
          >
            Passer
          </button>
          <button 
            onClick={onClose}
            className="bg-[#1a1a1a] text-white px-5 py-2 rounded-full font-bold text-[13px] shadow-sm hover:bg-black transition-colors"
          >
            Valider
          </button>
        </div>
      </motion.div>
    </div>
  );
}


export function ChatActionView({ profile, onClose, onMoreMenu, onOpenProfile, onUnlock }: { profile: any, onClose: () => void, onMoreMenu: () => void, onOpenProfile?: () => void, onUnlock?: () => void }) {
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [avatarIndex, setAvatarIndex] = useState(0);

  const photosList = (profile.photos && profile.photos.length > 0)
    ? profile.photos
    : (profile.images && profile.images.length > 0)
      ? profile.images
      : [profile.img, 'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=800&q=80', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 bg-white z-[200] flex flex-col font-sans"
    >
      {/* Fullscreen Photo Lightbox with Left/Right Swipe Gallery */}
      <AnimatePresence>
        {showPhotoLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[350] bg-black/95 flex flex-col justify-between cursor-pointer select-none overflow-hidden"
            onClick={() => setShowPhotoLightbox(false)}
          >
            {/* Top Bar with counter & close button */}
            <div className="pt-10 px-4 flex justify-between items-center text-white/90 z-10 shrink-0">
              <span className="text-[13px] font-semibold bg-black/40 px-3 py-1 rounded-full backdrop-blur-xs">
                {activePhotoIndex + 1} / {photosList.length}
              </span>
              <button 
                onClick={() => setShowPhotoLightbox(false)} 
                className="p-1.5 text-white/80 hover:text-white rounded-full bg-black/40 backdrop-blur-xs"
              >
                <X className="w-5.5 h-5.5" />
              </button>
            </div>

            {/* Swipeable Gallery Canvas */}
            <div className="flex-1 relative w-full flex items-center justify-center overflow-hidden">
              <motion.div 
                className="flex w-full h-full items-center"
                drag="x"
                dragConstraints={{ left: -((photosList.length - 1) * 320), right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -40 && activePhotoIndex < photosList.length - 1) {
                    setActivePhotoIndex(prev => prev + 1);
                  } else if (info.offset.x > 40 && activePhotoIndex > 0) {
                    setActivePhotoIndex(prev => prev - 1);
                  }
                }}
                animate={{ x: `-${activePhotoIndex * 100}%` }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              >
                {photosList.map((photoUrl: string, idx: number) => (
                  <div key={idx} className="w-full h-full shrink-0 flex items-center justify-center p-2">
                    <img 
                      src={photoUrl} 
                      alt={`${profile.name} ${idx + 1}`}
                      className="max-w-full max-h-full object-contain rounded-md pointer-events-none"
                    />
                  </div>
                ))}
              </motion.div>

              {/* Side tap areas for left/right navigation */}
              {photosList.length > 1 && (
                <>
                  {activePhotoIndex > 0 && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePhotoIndex(prev => prev - 1);
                      }} 
                      className="absolute left-0 top-0 bottom-0 w-1/4 z-10" 
                    />
                  )}
                  {activePhotoIndex < photosList.length - 1 && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePhotoIndex(prev => prev + 1);
                      }} 
                      className="absolute right-0 top-0 bottom-0 w-1/4 z-10" 
                    />
                  )}
                </>
              )}
            </div>

            {/* Bottom Dots Indicator */}
            {photosList.length > 1 && (
              <div className="pb-8 flex justify-center space-x-1.5 z-10 shrink-0">
                {photosList.map((_: any, i: number) => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-1.5 rounded-full transition-all ${activePhotoIndex === i ? 'bg-white scale-125' : 'bg-white/30'}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 pt-10 pb-2 shrink-0 bg-white">
        <button onClick={onClose} className="p-2 -ml-2 text-black hover:opacity-70 active:scale-95 transition-transform">
          <X className="w-6.5 h-6.5 text-black" strokeWidth={2} />
        </button>
        <button onClick={onMoreMenu} className="p-2 -mr-2 text-black hover:opacity-70 active:scale-95 transition-transform">
          <MoreHorizontal className="w-6.5 h-6.5 text-black" strokeWidth={2} />
        </button>
      </div>

      {/* User Profile Preview Bar */}
      <div className="px-4 py-3 flex items-start space-x-3 bg-white border-b border-gray-100/80 pb-4 shrink-0">
        {/* Swipeable Avatar Thumbnail Frame */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            setActivePhotoIndex(avatarIndex);
            setShowPhotoLightbox(true);
          }}
          className="w-[78px] h-[94px] rounded-2xl overflow-hidden shadow-2xs shrink-0 relative bg-gray-100 cursor-pointer select-none group"
        >
          <motion.div 
            className="flex w-full h-full"
            drag={photosList.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -15 && avatarIndex < photosList.length - 1) {
                setAvatarIndex(prev => prev + 1);
              } else if (info.offset.x > 15 && avatarIndex > 0) {
                setAvatarIndex(prev => prev - 1);
              }
            }}
            animate={{ x: `-${avatarIndex * 100}%` }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          >
            {photosList.map((photoUrl: string, idx: number) => (
              <div key={idx} className="w-[78px] h-[94px] shrink-0 relative">
                <img 
                  src={photoUrl} 
                  className="w-full h-full object-cover pointer-events-none" 
                  alt={`${profile.name} ${idx + 1}`} 
                />
              </div>
            ))}
          </motion.div>

          {/* Small dots indicator on the avatar frame if multiple photos */}
          {photosList.length > 1 && (
            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center space-x-1 z-10 pointer-events-none">
              {photosList.map((_: any, i: number) => (
                <div 
                  key={i} 
                  className={`w-1 h-1 rounded-full transition-all ${avatarIndex === i ? 'bg-white scale-125 shadow-xs' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Profile Info Right Column (Clickable to open profile details) */}
        <div 
          onClick={onOpenProfile}
          className="flex-1 min-w-0 pl-1 cursor-pointer group"
        >
          {/* Row 1: Badges + Name, Age */}
          <div className="flex items-center space-x-1.5 flex-wrap">
            <div className="w-[18px] h-[18px] bg-[#ff2d55] rounded-full flex items-center justify-center shrink-0 shadow-2xs">
              <Heart className="w-2.5 h-2.5 text-white fill-white" />
            </div>
            <div className="w-[18px] h-[18px] bg-[#007aff] rounded-full flex items-center justify-center shrink-0 shadow-2xs">
              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </div>
            <h2 className="text-[20px] font-bold text-black tracking-tight truncate group-hover:text-gray-700">
              {profile.name}, {profile.age}
            </h2>
          </div>

          {/* Row 2: Location tag & Chevron button (>) */}
          <div className="flex items-center justify-between w-full mt-1.5 pr-1">
            <div className="flex items-center space-x-1.5 text-black">
              <MapPin className="w-3.5 h-3.5 text-black fill-black shrink-0" />
              <span className="text-[13.5px] font-bold text-black">{profile.location || 'Paris'}</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenProfile) onOpenProfile();
              }}
              className="p-1 -mr-1 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-black shrink-0" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Middle Spacer */}
      <div className="flex-1 bg-white" />

      {/* Bottom Popup Card */}
      <div className="p-4 pb-8 shrink-0 w-full">
        <div className="bg-[#f4f4f6] rounded-[28px] px-6 py-8 flex flex-col items-center text-center shadow-2xs">
          <div className="w-14 h-14 bg-[#eadaff] rounded-full flex items-center justify-center mb-4">
            <svg viewBox="0 0 32 32" className="w-7 h-7">
              <path d="M16 4C9.37 4 4 8.7 4 14.5C4 17.8 5.8 20.7 8.6 22.7C8.1 24.5 7.1 26.2 5.5 27.3C7.8 27.5 10.3 27 12.3 25.7C13.5 26.1 14.7 26.3 16 26.3C22.63 26.3 28 21.6 28 15.8C28 10 22.63 4 16 4Z" fill="black" />
              <circle cx="11" cy="15" r="1.5" fill="white" />
              <circle cx="16" cy="15" r="1.5" fill="white" />
              <circle cx="21" cy="15" r="1.5" fill="white" />
            </svg>
          </div>

          <h3 className="text-[19px] font-bold text-black mb-2.5 tracking-tight">
            Engagez la conversation avec {profile.name}
          </h3>

          <p className="text-[#666666] text-[14.5px] leading-[1.45] max-w-[285px] mb-7 font-normal">
            Utilisez des crédits pour envoyer des messages sans avoir matché.
          </p>

          <button 
            onClick={onUnlock} 
            className="w-full bg-[#111111] hover:bg-black text-white font-bold py-3.5 rounded-full text-[16px] shadow-xs active:scale-[0.98] transition-transform"
          >
            Discuter pour 250 crédits
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function ProfileModal({
  isOpen = true,
  profile,
  onClose,
  onPrevious = () => {},
  onNext = () => {},
  hasPrevious = false,
  hasNext = false,
  direction = 0,
  isLiked = false,
  onLike = () => {},
  onMessage,
  onHide,
  onSendBackgroundWave
}: {
  isOpen?: boolean;
  profile: any;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  direction?: number;
  isLiked?: boolean;
  onLike?: (e?: any) => void;
  onMessage?: () => void;
  onHide?: () => void;
  onSendBackgroundWave?: (profile: any) => void;
}) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [hasWaved, setHasWaved] = useState(false);
  const [showWaveBanner, setShowWaveBanner] = useState(false);
  const [inputText, setInputText] = useState("");
  
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : dir < 0 ? '-100%' : 0,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir > 0 ? '-100%' : dir < 0 ? '100%' : 0,
      opacity: 0,
    })
  };

  const isNewRegistrant = useMemo(() => {
    if (profile.isNewUser || profile.isNew || profile.isNewRegistrant) return true;
    const createdAt = profile.createdAt || profile.registeredAt || profile.joinedAt;
    if (createdAt) {
      const regDate = new Date(createdAt).getTime();
      const hours = (Date.now() - regDate) / (1000 * 60 * 60);
      return Number.isFinite(regDate) && hours >= 0 && hours <= 48;
    }
    return false;
  }, [profile]);

  const locationBadgeText = useMemo(() => {
    const profileCity = profile.city || (profile.location ? profile.location.split(',')[0].trim() : '');
    if (typeof profile.distanceText === 'string' && profile.distanceText.trim()) return profile.distanceText;
    const distanceKm = Number(profile.distanceKm ?? profile.distance);
    if (Number.isFinite(distanceKm) && distanceKm >= 0) return `à environ ${Math.round(distanceKm)} km`;
    return profileCity || profile.location || 'Localisation non renseignée';
  }, [profile]);

  // Scrollbar indicator state (appears on scroll, disappears when idle matching IMG_4501.PNG)
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [thumbRatio, setThumbRatio] = useState(0.25);
  const scrollTimeoutRef = useRef<any>(null);

  const handleCardScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll > 0) {
      setScrollProgress(el.scrollTop / maxScroll);
      setThumbRatio(Math.max(0.12, Math.min(0.35, el.clientHeight / el.scrollHeight)));
    }
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 900);
  };

  const isViewedProfileVerified = Boolean(
    profile.verified === true || profile.isVerified === true || profile.is_verified === true || profile.isPhotoVerified === true
  );

  // Active photo index (0 = most recent photo in first position)
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Fullscreen Photo Gallery Modal state (matching IMG_4519.PNG & IMG_4520.PNG)
  const [isFullScreenGalleryOpen, setIsFullScreenGalleryOpen] = useState(false);
  const [galleryStartIdx, setGalleryStartIdx] = useState(0);

  const openFullScreenGallery = (idx: number = 0) => {
    setGalleryStartIdx(idx);
    setIsFullScreenGalleryOpen(true);
  };

  useEffect(() => {
    setActivePhotoIdx(0);
  }, [profile.id]);

  const photos = (Array.isArray(profile.photos) ? profile.photos : [profile.img || profile.avatarUrl])
    .filter((photo: unknown): photo is string => typeof photo === 'string' && photo.length > 0);
  const profileDetails = profile.details && typeof profile.details === 'object' && !Array.isArray(profile.details)
    ? profile.details as Record<string, unknown>
    : {};
  const rawLanguages = profileDetails.languages;
  const profileLanguages = (Array.isArray(rawLanguages) ? rawLanguages : typeof rawLanguages === 'string' ? rawLanguages.split(',') : [])
    .map((language: unknown) => String(language).trim())
    .filter(Boolean);
  const relationshipTags = [
    { icon: MessageCircle, text: profile.lookingFor || profile.key_question || profile.keyQuestion || profile.purpose },
    { icon: Heart, text: profile.relation || profileDetails.relation },
    { icon: null, text: profile.sexuality || profileDetails.sexuality }
  ].filter(item => typeof item.text === 'string' && Boolean(item.text.trim()));
  const infoTags = [
    { icon: '👶', text: profile.children || profileDetails.children },
    { icon: '🚬', text: profile.smoking || profileDetails.smoking },
    { icon: '🍷', text: profile.alcohol || profileDetails.alcohol },
    { icon: '📏', text: profile.height || profileDetails.height },
    { icon: '🎓', text: profile.education || profileDetails.education },
    { icon: '🗣️', text: profile.personality || profileDetails.personality },
    { icon: '🐾', text: profile.pets || profileDetails.pets },
    { icon: '🤲', text: profile.religion || profileDetails.religion },
    { icon: '♈', text: profile.zodiac || profileDetails.zodiac }
  ].filter(item => typeof item.text === 'string' && Boolean(item.text.trim()));
  const aboutText = typeof profile.bio === 'string' && profile.bio.trim()
    ? profile.bio.trim()
    : typeof profile.tagline === 'string' && profile.tagline.trim()
      ? profile.tagline.trim()
      : '';
  const profilePrompts = Array.isArray(profile.prompts)
    ? profile.prompts
    : Array.isArray(profileDetails.prompts)
      ? profileDetails.prompts
      : [];

  if (isOpen === false) return null;

  const modalRoot = typeof document !== 'undefined' ? document.getElementById('mobile-modal-root') : null;

  const modalContent = (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="absolute inset-0 z-[150] overflow-hidden flex flex-col justify-end items-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 pt-6 pb-2 pointer-events-auto"
      onClick={onClose}
    >
      {/* Top Notification Banner */}
      <AnimatePresence>
        {showWaveBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-0 left-0 right-0 z-[200] bg-white rounded-b-[16px] shadow-xl flex items-center justify-between pointer-events-auto overflow-hidden h-[72px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-4 h-full">
              <img src={photos[0]} className="w-[72px] h-full object-cover shrink-0" />
              <span className="text-[15px] font-medium text-black">Vous avez fait un petit coucou à {profile.name}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-black shrink-0 mr-4" strokeWidth={2.5} />
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Floating Card Modal */}
      <motion.div 
        initial={{ y: '100%', scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: '100%', scale: 0.95 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] h-[88%] max-h-[720px] my-auto bg-black rounded-[28px] flex flex-col overflow-hidden shadow-2xl border border-white/10 transform-gpu smooth-gpu"
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={profile.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Scrollable Container with scroll indicator listener */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleCardScroll}
              className="w-full h-full overflow-y-auto scrollbar-hide relative pb-36 bg-black"
            >
              
              {/* Absolute Top Header */}
              <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
                <div className="h-24 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0" />
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
                  <div className="flex items-center space-x-2 text-white">
                    {isLiked && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        className="shrink-0 flex items-center"
                      >
                        <Heart className="w-4.5 h-4.5 text-rose-500 fill-rose-500 drop-shadow-sm" strokeWidth={2.5} />
                      </motion.div>
                    )}
                    {isViewedProfileVerified && (
                      <div className="w-[18px] h-[18px] bg-[#0084ff] rounded-full flex items-center justify-center shrink-0 shadow-sm">
                        <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
                      </div>
                    )}
                    <h1 className="text-[17px] font-bold leading-none drop-shadow-md tracking-wide truncate max-w-[150px]">
                      {profile.name || 'Membre'}{profile.age ? `, ${profile.age}` : ''}
                    </h1>
                    {(profile.online === true || profile.is_online === true) && (
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0 shadow-sm border border-black/20"></div>
                    )}
                  </div>
                     
                  <button onClick={() => setShowMoreMenu(true)} className="p-1.5 -mr-1 text-white drop-shadow-md hover:opacity-80">
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Main Profile Photo - Full Height so details are hidden until scrolling */}
              <div 
                onClick={() => { if (photos.length) openFullScreenGallery(activePhotoIdx); }}
                className={`relative w-full h-full min-h-[700px] sm:min-h-[720px] shrink-0 bg-gray-900 select-none ${photos.length ? 'cursor-pointer group' : ''}`}
              >
                {photos.length ? (
                  <img 
                    src={photos[activePhotoIdx] || photos[0]} 
                    alt={`Photo de profil de ${profile.name || 'ce membre'}`} 
                    decoding="async" 
                    loading="eager" 
                    className="w-full h-full object-cover shrink-0 transform-gpu transition-all duration-300" 
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
                    <Camera className="h-12 w-12" aria-hidden="true" />
                    <span className="text-sm font-semibold">Aucune photo disponible</span>
                  </div>
                )}

                {/* Left/Right Tap zones for quick photo browsing */}
                {photos.length > 1 && (
                  <>
                    <div 
                      onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(prev => (prev > 0 ? prev - 1 : photos.length - 1)); }}
                      className="absolute top-16 bottom-24 left-0 w-1/3 z-25 cursor-pointer" 
                    />
                    <div 
                      onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(prev => (prev + 1) % photos.length); }}
                      className="absolute top-16 bottom-24 right-0 w-1/3 z-25 cursor-pointer" 
                    />
                  </>
                )}

                {/* Tags overlay placed below the header matching IMG_4501.PNG */}
                <div className="absolute top-14 left-4 right-4 flex flex-col items-start gap-2 z-20 pointer-events-none">
                  {/* Badge 1: New Registrant (48h) or User Intent / Mood */}
                  {(isNewRegistrant || profile.mood?.label || profile.lookingFor || profile.key_question || profile.keyQuestion || profile.purpose) && (
                  <div className="bg-white px-3 py-1.2 rounded-full flex items-center space-x-1.5 shadow-sm pointer-events-auto border border-gray-100/80">
                    {isNewRegistrant ? (
                      <>
                        <span className="text-[12px] leading-none">🌱</span>
                        <span className="text-[11.5px] font-bold text-black">Vient de s'inscrire</span>
                      </>
                    ) : profile.mood?.label ? (
                      <>
                        <span className="text-[12px] leading-none">{profile.mood.emoji || '✌️'}</span>
                        <span className="text-[11.5px] font-bold text-black">{profile.mood.label}</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-3.5 h-3.5 text-black fill-black" strokeWidth={1} />
                        <span className="text-[11.5px] font-bold text-black">
                          {profile.lookingFor || profile.key_question || profile.keyQuestion || profile.purpose}
                        </span>
                      </>
                    )}
                  </div>
                  )}

                  {/* Badge 2: Smart Location (~Distance if same city/radius vs City Name if another city) */}
                  <div className="bg-black/40 backdrop-blur-md px-3 py-1.2 rounded-full flex items-center space-x-1.5 shadow-sm pointer-events-auto border border-white/10">
                    <MapPin className="w-3.5 h-3.5 text-white fill-white shrink-0" />
                    <span className="text-[11.5px] font-bold text-white">{locationBadgeText}</span>
                  </div>
                </div>
              </div>

              {/* Details Section */}
              <div className="bg-white px-4 py-4 flex flex-col space-y-4 rounded-t-[28px] relative z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] -mt-6">
                
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wider">Localisation</h3>
                  <p className="text-[16px] font-black text-black mb-0.5">{profile.location || profile.city || 'Localisation non renseignée'}</p>
                  <div className="flex items-center space-x-1 text-gray-500">
                    <MapPin className="w-3 h-3 fill-gray-500 text-white" />
                    <span className="text-[11px] font-medium">Emplacement</span>
                  </div>
                </div>

                {relationshipTags.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Au niveau relations</h3>
                    <div className="flex flex-wrap gap-1">
                      {relationshipTags.map((item, index) => (
                        <div key={`${item.text}-${index}`} className="bg-[#f2f2f2] px-2.5 py-1 rounded-full inline-flex items-center space-x-1">
                          {item.icon === MessageCircle ? <MessageCircle className="w-3 h-3 text-black fill-black" strokeWidth={1} /> :
                            item.icon === Heart ? <Heart className="w-3 h-3 text-black fill-black" strokeWidth={1} /> :
                              <span className="text-[12px] font-bold text-black leading-none mt-0.5">⚥</span>}
                          <span className="text-[11.5px] font-bold text-black">{String(item.text)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profileLanguages.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Les langues que je parle</h3>
                    <div className="flex flex-wrap gap-1">
                      {profileLanguages.map((language: string) => (
                        <span key={language} className="bg-[#f2f2f2] px-2.5 py-1 rounded-full inline-flex items-center space-x-1">
                          <span className="text-[12px] font-bold text-black leading-none">文A</span>
                          <span className="text-[11.5px] font-bold text-black">{language}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {infoTags.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Plus d'infos sur moi</h3>
                    <div className="flex flex-wrap gap-1">
                      {infoTags.map((item, index) => (
                        <div key={`${item.text}-${index}`} className="bg-[#f2f2f2] px-2.5 py-1 rounded-full inline-flex items-center space-x-1">
                          <span className="text-[12px]">{item.icon}</span>
                          <span className="text-[11.5px] font-bold text-black">{String(item.text)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description / Tagline */}
                {aboutText && <div>
                  <h3 className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">À propos</h3>
                  <p className="text-[14px] font-extrabold text-black leading-snug">
                    {aboutText}
                  </p>
                </div>}

                {/* Questions-Clés / Prompts */}
                {profilePrompts.length > 0 && (
                  <div className="flex flex-col space-y-2.5">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Questions-Clés</h3>
                    {profilePrompts.map((p: any, idx: number) => (
                      <div key={idx} className="bg-[#f8f8f8] rounded-[18px] px-4 py-2.5 flex flex-col items-start border border-gray-50 shadow-3xs">
                        <span className="text-[10.5px] font-bold text-gray-400 mb-0.5 leading-tight">{p.question}</span>
                        <p className="text-[13px] font-extrabold text-black leading-tight">{p.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Superposed Photos Gallery Deck (Empilement de cartes photos superposées - Plus récente en premier) */}
              {photos.length > 1 && (
                <div className="bg-white px-4 py-5 flex flex-col space-y-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-[17px] sm:text-[19px] font-extrabold text-black tracking-tight">
                        Photos ({photos.length})
                      </h3>
                      <span className="bg-purple-50 text-[#8a4af3] text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-100/60">
                        ✨ Plus récente en 1er
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-400">
                      Toucher pour feuilleter
                    </span>
                  </div>

                  {/* Superposed Stacked Photo Cards Container */}
                  <div className="relative w-full h-[360px] sm:h-[390px] my-1 flex items-center justify-center">
                    {photos.map((photo: string, index: number) => {
                      const total = photos.length;
                      const stackPos = (index - activePhotoIdx + total) % total;
                      
                      // Only render top 3 stacked cards for performance & visual aesthetic
                      if (stackPos >= 3) return null;

                      const isTop = stackPos === 0;
                      const zIndex = 30 - stackPos * 10;
                      const scale = 1 - stackPos * 0.05;
                      const translateY = stackPos * 14;
                      const rotate = stackPos === 0 ? 0 : stackPos === 1 ? 3 : -3;

                      return (
                        <motion.div
                          key={index}
                          initial={false}
                          animate={{
                            scale,
                            y: translateY,
                            rotate,
                            zIndex,
                            opacity: stackPos === 0 ? 1 : stackPos === 1 ? 0.9 : 0.75
                          }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          onClick={() => openFullScreenGallery(index)}
                          className={`absolute top-0 w-[92%] sm:w-[88%] h-[320px] sm:h-[350px] rounded-[24px] overflow-hidden shadow-xl border-2 ${
                            isTop ? 'border-white cursor-pointer' : 'border-gray-100 cursor-pointer'
                          } bg-gray-900 group`}
                        >
                          <img 
                            src={photo} 
                            alt={`${profile.name} photo ${index + 1}`} 
                            className="w-full h-full object-cover transform-gpu transition-transform duration-300 group-hover:scale-105" 
                          />
                          
                          {/* Top Card Badge */}
                          {isTop && (
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-extrabold flex items-center space-x-1.5 border border-white/20 shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Photo {index + 1}/{photos.length} {index === 0 ? "(Plus récente)" : ""}</span>
                            </div>
                          )}

                          {/* Fullscreen Gallery Hint Badge */}
                          {isTop && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openFullScreenGallery(index);
                              }}
                              className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs text-black text-[10.5px] font-extrabold px-3 py-1 rounded-full shadow-md flex items-center space-x-1 hover:bg-white active:scale-95 transition-all"
                            >
                              <ImageIcon className="w-3 h-3 text-black" />
                              <span>Plein écran</span>
                              <ChevronRight className="w-3.5 h-3.5 text-black" strokeWidth={3} />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Stacked Thumbnail Dot Indicators */}
                  <div className="flex items-center justify-center space-x-2 pt-1">
                    {photos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActivePhotoIdx(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          activePhotoIdx === idx ? 'w-6 bg-black' : 'w-2 bg-gray-300 hover:bg-gray-400'
                        }`}
                        title={`Photo ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Verification Section */}
              {isViewedProfileVerified && (
                <div className="bg-white px-4 py-6 flex flex-col space-y-4 border-t border-gray-100/60">
                  <h3 className="text-[18px] sm:text-[20px] font-extrabold text-gray-400 leading-tight">Vérification</h3>
                  
                  <div className="flex items-center space-x-3.5 pt-1">
                    <div className="relative w-11 h-11 shrink-0">
                      {photos[0] && <img src={photos[0]} alt="" className="w-11 h-11 rounded-full object-cover shadow-xs border border-gray-100" />}
                      <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-[#0084ff] rounded-full border-2 border-white flex items-center justify-center shadow-2xs">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                      </div>
                    </div>
                    <span className="text-[17px] sm:text-[19px] font-extrabold text-black tracking-tight">
                      Profil vérifié
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Floating Right Scrollbar Indicator (Small & Compact Pill) */}
        <div 
          className={`absolute right-1 top-20 bottom-24 w-1 z-50 pointer-events-none transition-opacity duration-300 ${
            isScrolling ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="relative w-full h-full bg-black/20 rounded-full overflow-hidden">
            <div 
              className="absolute w-full h-7 bg-white/95 rounded-full shadow-xs transition-all duration-75"
              style={{
                top: `calc(${scrollProgress * 100}% - ${scrollProgress * 28}px)`
              }}
            />
          </div>
        </div>

        {/* Bottom shadow gradient overlay on the photo */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-20" />

        {/* Floating Bottom Actions */}
        <div className={`absolute ${!profile.requiresCredits ? 'bottom-[78px]' : 'bottom-4'} left-0 right-0 pointer-events-none flex justify-center items-center z-[180] transition-all duration-200`}>
          <div className="flex items-center justify-center gap-3.5 px-4 pointer-events-auto">
            <button 
              onClick={hasPrevious ? onPrevious : onClose} 
              className="w-[48px] h-[48px] bg-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:scale-105 shrink-0"
            >
              {hasPrevious ? (
                <ChevronLeft className="w-6 h-6 text-black" strokeWidth={3} />
              ) : (
                <X className="w-5.5 h-5.5 text-black" strokeWidth={2.5} />
              )}
            </button>

            <button 
              onClick={() => {
                if (profile.requiresCredits) {
                  onMessage?.();
                } else if (!hasWaved) {
                  setHasWaved(true);
                  setShowWaveBanner(true);
                  setTimeout(() => setShowWaveBanner(false), 4000);
                  profile.initialMessage = "Coucou 👋";
                  onSendBackgroundWave?.(profile);
                } else {
                  onMessage?.();
                }
              }}
              className="w-[58px] h-[58px] bg-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:scale-105 shrink-0"
            >
              {(profile.requiresCredits || hasWaved) ? (
                <MessageCircle className="w-6 h-6 text-black fill-black" strokeWidth={1} />
              ) : (
                <span className="text-[30px] leading-none -mt-1 -mr-1">👋</span>
              )}
            </button>

            <AnimatePresence>
              {!isLiked && (
                <motion.button 
                  key="like-btn"
                  initial={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  onClick={(e) => onLike?.(e)}
                  className="w-[58px] h-[58px] bg-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:scale-105 shrink-0 cursor-pointer"
                >
                  <Heart className="w-6 h-6 text-black fill-black" strokeWidth={1} />
                </motion.button>
              )}
            </AnimatePresence>

            <button 
              onClick={hasNext ? onNext : onClose}
              className="w-[48px] h-[48px] bg-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:scale-105 shrink-0"
            >
              {hasNext ? (
                <ChevronRight className="w-6 h-6 text-black" strokeWidth={3} />
              ) : (
                <X className="w-5.5 h-5.5 text-black" strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>

        {showMoreMenu && <ActionMenu onClose={() => setShowMoreMenu(false)} onHide={onHide} />}

        {/* Message Input Pill (only when not requiring credits) */}
        <AnimatePresence>
          {(!profile.requiresCredits) && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="absolute bottom-3 left-4 right-4 z-[200] bg-white rounded-full shadow-2xl p-1.5 flex items-center justify-between pointer-events-auto border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (inputText.trim()) {
                      profile.initialMessage = inputText.trim();
                    }
                    onMessage?.();
                  }
                }}
                placeholder="Votre message..."
                className="flex-1 bg-transparent border-none outline-none text-[14px] text-black pl-4 placeholder-gray-400 font-bold w-full min-w-0"
              />
              <button 
                className={`w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0 text-white shadow-sm transition-colors ${inputText.trim() ? 'bg-black hover:bg-gray-800' : 'bg-gray-400 hover:bg-gray-500'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (inputText.trim()) {
                    profile.initialMessage = inputText.trim();
                  }
                  onMessage?.();
                }}
              >
                <Send className="w-4 h-4 -ml-[1px] mt-[1px]" fill="white" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fullscreen Interactive Photo Viewer Modal matching IMG_4519.PNG & IMG_4520.PNG */}
        <FullScreenPhotoGalleryModal 
          isOpen={isFullScreenGalleryOpen}
          onClose={() => setIsFullScreenGalleryOpen(false)}
          photos={photos}
          initialIndex={galleryStartIdx}
          profileName={profile.name}
        />
      </motion.div>
    </motion.div>
  );

  if (modalRoot) {
    return createPortal(modalContent, modalRoot);
  }

  return modalContent;
}

export function MatchModal({ matchedProfile, onClose, onChat }: { matchedProfile: any, onClose: () => void, onChat: () => void }) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="flex flex-col items-center text-center max-w-sm w-full"
        >
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="bg-gradient-to-r from-[#e20030] via-rose-500 to-amber-500 text-white px-7 py-3 rounded-full font-black text-[22px] mb-8 shadow-2xl tracking-wider uppercase border border-white/20"
          >
            🔥 C'EST UN MATCH !
          </motion.div>

          <div className="flex items-center justify-center space-x-[-24px] mb-8 relative">
            <motion.div 
              initial={{ x: -40, rotate: -12, opacity: 0 }}
              animate={{ x: 0, rotate: -6, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-2xl relative"
            >
              <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80" alt="You" className="w-full h-full object-cover" />
            </motion.div>
            <motion.div 
              initial={{ x: 40, rotate: 12, opacity: 0 }}
              animate={{ x: 0, rotate: 6, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-2xl z-10 relative"
            >
              <img src={matchedProfile.img} alt={matchedProfile.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </motion.div>
          </div>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[19px] font-bold mb-8 text-gray-100"
          >
            Vous et <span className="text-white font-extrabold underline decoration-rose-500 underline-offset-4">{matchedProfile.name}</span> vous vous plaisez !
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col space-y-3 w-full max-w-[280px]"
          >
            <motion.button 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={onChat}
              className="bg-white text-black font-black py-4 rounded-full text-[17px] shadow-2xl hover:bg-gray-100 transition-colors"
            >
              Envoyer un message
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={onClose}
              className="bg-white/15 text-white font-bold py-3.5 rounded-full text-[16px] backdrop-blur-md border border-white/20 hover:bg-white/25 transition-colors"
            >
              Continuer les rencontres
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function CoupDeCoeurModal({ 
  profile, 
  onClose, 
  onOpenRecharge
}: { 
  profile: any; 
  onClose: () => void; 
  onOpenRecharge?: () => void;
}) {
  const handleSendCredits = () => {
    onOpenRecharge?.();
  };

  if (!profile) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex flex-col justify-end">
        {/* Semi-transparent Backdrop closer */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="relative bg-white rounded-t-[28px] w-full max-w-sm mx-auto px-4 pt-5 pb-5 sm:pb-6 flex flex-col items-center shadow-2xl z-10 overflow-hidden"
        >
          {/* Drag Handle accent */}
          <div className="w-8 h-1 bg-gray-200 rounded-full absolute top-2.5 left-1/2 -translate-x-1/2" />

          <>
              {/* Profile Photo with Overlay Icon */}
              <div className="relative mt-2">
                <div className="w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] rounded-full overflow-hidden border border-gray-100 shadow-md">
                  <img src={profile.img} alt={profile.name} className="w-full h-full object-cover" />
                </div>
                {/* Pierced Heart overlay Badge */}
                <div className="w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] bg-[#141414] rounded-full border-[2.5px] border-white flex items-center justify-center absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 shadow-md">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    <path d="M2 20l7-7m1-1l2-2" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M9 13H5v4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Text content - Optimized mobile typography */}
              <h2 className="text-[17px] sm:text-[19px] font-black text-black text-center mt-4 px-2 leading-tight">
                Montrez-lui que son profil vous intéresse vraiment
              </h2>
              
              <p className="text-[13px] sm:text-[14px] text-[#737373] text-center mt-2 px-3 leading-normal mb-5 font-medium">
                Envoyez un Coup de cœur à <span className="font-black text-black">{profile.name}</span> pour augmenter vos chances de matcher
              </p>

              {/* Action Buttons */}
              <div className="w-full flex flex-col space-y-2.5">
                <button
                  onClick={handleSendCredits}
                  disabled={!onOpenRecharge}
                  className="w-full bg-[#121212] text-white font-black py-3 rounded-full text-[14px] sm:text-[15px] shadow-sm disabled:cursor-not-allowed disabled:opacity-50 active:scale-98"
                  style={{ minHeight: '44px' }}
                >
                  Recharger pour envoyer (50 crédits)
                </button>
                <button
                  type="button"
                  disabled={!REWARDED_ADS_ENABLED}
                  className="w-full bg-white border border-gray-200 text-gray-500 font-black py-3 rounded-full text-[14px] sm:text-[15px] shadow-xs cursor-not-allowed opacity-70 flex items-center justify-center space-x-2"
                  style={{ minHeight: '44px' }}
                >
                  <Clapperboard className="w-4.5 h-4.5 text-black" strokeWidth={2} />
                  <span>Envoi gratuit bientôt disponible</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-[#737373] hover:text-black font-bold text-[13.5px] mt-2.5 py-1.5 transition-colors duration-150 cursor-pointer"
                style={{ minHeight: '36px' }}
              >
                Peut-être plus tard
              </button>
          </>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function HeartPiercedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Vibrant purple-pink gradient for premium dating look */}
        <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        {/* Bright gold/amber gradient for the Cupid arrow */}
        <linearGradient id="arrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* Heart */}
      <path 
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
        fill="url(#heartGrad)" 
      />
      {/* Cupid's Arrow */}
      {/* White outer shadow/border for the arrow so it stands out against the gradient background */}
      <path 
        d="M3 21l18-18" 
        stroke="white" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
      />
      <path 
        d="M3 21l18-18" 
        stroke="url(#arrowGrad)" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
      
      {/* Arrowhead */}
      <path 
        d="M15 3h6v6" 
        stroke="white" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M15 3h6v6" 
        stroke="url(#arrowGrad)" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Feathers */}
      <path 
        d="M6 21l-3-3M8 19l-3-3" 
        stroke="white" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
      />
      <path 
        d="M6 21l-3-3M8 19l-3-3" 
        stroke="url(#arrowGrad)" 
        strokeWidth="2" 
        strokeLinecap="round" 
      />
    </svg>
  );
}

export function SearchDiscussions({ 
  onClose,
  discussions = [],
  onSelectDiscussion
}: { 
  onClose: () => void;
  discussions?: any[];
  onSelectDiscussion?: (discussion: any) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return discussions.filter(d => 
      d.name?.toLowerCase().includes(q) || 
      d.initialMessage?.toLowerCase().includes(q)
    );
  }, [query, discussions]);

  return (
    <div className="fixed inset-0 bg-white z-[120] flex flex-col">
      <div className="flex items-center px-4 py-2.5 shrink-0 border-b border-gray-100 mt-8 space-x-2.5">
        <div className="flex-1 bg-gray-100 rounded-xl flex items-center px-3 py-2">
          <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder="Rechercher" 
            className="bg-transparent border-none outline-none text-[14px] text-black w-full placeholder-gray-500"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button onClick={onClose} className="text-black text-[14px] font-medium">
          Annuler
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {query.trim() === '' ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-center text-gray-500 text-[13.5px] leading-relaxed">
              Vous pouvez rechercher un nom ou un message particulier
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-center text-gray-500 text-[13.5px]">
              Aucun résultat pour "{query}"
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  if (onSelectDiscussion) onSelectDiscussion(d);
                  onClose();
                }}
                className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-xl transition-colors text-left"
              >
                <img src={d.img} className="w-11 h-11 rounded-full object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[14px] text-black">{d.name}</h4>
                  <p className="text-[12.5px] text-gray-500 truncate">{d.initialMessage}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DiscussionsSortMenu({ 
  onClose,
  discussions = [],
  onSort
}: { 
  onClose: () => void;
  discussions?: any[];
  onSort?: (sorted: any[]) => void;
}) {
  const [selectedId, setSelectedId] = useState('recent');
  const options = [
    { id: 'recent', label: 'Plus récents' },
    { id: 'unread', label: 'Non lus' },
    { id: 'online', label: 'En ligne' },
    { id: 'requests', label: 'Demandes de discussion' },
    { id: 'favorites', label: 'Dans vos favoris' },
    { id: 'your_turn', label: 'À votre tour de répondre' }
  ];

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (onSort) {
      let sorted = [...discussions];
      const starredIds = (() => {
        try {
          const saved = localStorage.getItem('bavel_starred_discussion_ids');
          return saved ? JSON.parse(saved) : [];
        } catch(e) { return []; }
      })();

      if (id === 'unread') {
        sorted.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
      } else if (id === 'online') {
        sorted.sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
      } else if (id === 'requests') {
        sorted = sorted.filter(d => (d.unreadCount || 0) > 0 || (d.messages && d.messages.some((m: any) => m.sender === 'other' && !m.read)));
      } else if (id === 'favorites') {
        sorted = sorted.filter(d => starredIds.includes(d.id));
      } else if (id === 'your_turn') {
        sorted = sorted.filter(d => {
          const lastMsg = d.messages && d.messages.length > 0 ? d.messages[d.messages.length - 1] : null;
          return lastMsg && lastMsg.sender === 'other';
        });
      } else {
        sorted.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
      }
      onSort(sorted);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      
      <div className="relative bg-white rounded-t-[28px] flex flex-col pt-3 pb-8 px-4 shadow-xl">
        <div className="flex flex-col space-y-2.5 mt-2">
          {options.map((opt) => {
            const isSelected = opt.id === selectedId;
            return (
              <button 
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className={`w-full py-3 px-4 rounded-[16px] flex items-center justify-between text-[14px] font-bold border border-gray-100 ${
                  isSelected ? 'bg-[#f4ebff] text-black' : 'bg-white text-black'
                }`}
              >
                <span>{opt.label}</span>
                <div className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-black' : 'border-gray-300'
                }`}>
                  {isSelected && <div className="w-[10px] h-[10px] rounded-full bg-black"></div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function NotificationsView({ 
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkAllAsRead,
  onMarkAsRead,
  onDeleteNotification,
  onClearAll,
  onTriggerTest,
  onNavigateToChat,
  onNavigateToLikes,
  onNavigateToProfile
}: { 
  onClose: () => void;
  notifications?: any[];
  unreadCount?: number;
  onMarkAllAsRead?: () => void;
  onMarkAsRead?: (id: string) => void;
  onDeleteNotification?: (id: string) => void;
  onClearAll?: () => void;
  onTriggerTest?: (type?: string) => void;
  onNavigateToChat?: (senderId?: string) => void;
  onNavigateToLikes?: () => void;
  onNavigateToProfile?: (senderId?: string) => void;
}) {
  const [activeSort, setActiveSort] = useState<'recent' | 'unread' | 'visits' | 'their_favs' | 'your_favs'>('recent');
  const [showSortModal, setShowSortModal] = useState(false);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [ignoredIds, setIgnoredIds] = useState<string[]>([]);
  const [starredIds, setStarredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bavel_starred_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Default sample notifications if none or few provided, matching Image 1
  const initialDefaultList = useMemo(() => [
    {
      id: 'notif_alex',
      senderId: 'user_alex',
      senderName: 'Alex 👋',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
      body: 'A vu votre profil',
      type: 'visit',
      read: false,
      timestamp: new Date(Date.now() - 5 * 60000)
    },
    {
      id: 'notif_marie',
      senderId: 'user_marie',
      senderName: 'Marie',
      senderAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
      body: 'A vu votre profil',
      type: 'visit',
      read: true,
      timestamp: new Date(Date.now() - 30 * 60000)
    },
    {
      id: 'notif_ryma',
      senderId: 'user_ryma',
      senderName: 'Ryma',
      senderAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80',
      body: 'A vu votre profil',
      type: 'visit',
      read: true,
      timestamp: new Date(Date.now() - 2 * 3600000)
    },
    {
      id: 'notif_marguerite',
      senderId: 'user_marguerite',
      senderName: 'Marguerite',
      senderAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
      body: 'A vu votre profil',
      type: 'visit',
      read: true,
      timestamp: new Date(Date.now() - 5 * 3600000)
    },
    {
      id: 'notif_cindy',
      senderId: 'user_cindy',
      senderName: 'Cindy',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
      body: 'A vu votre profil',
      type: 'visit',
      read: true,
      timestamp: new Date(Date.now() - 24 * 3600000)
    }
  ], []);

  // Combine passed notifications with defaults to ensure complete list
  const allNotifications = useMemo(() => {
    const list = notifications.filter(n => 
      !n.title?.toLowerCase().includes('bienvenue sur bavel') && 
      !n.body?.toLowerCase().includes('votre profil est prêt')
    );
    // Merge defaults if not present
    initialDefaultList.forEach(def => {
      if (!list.some(n => n.id === def.id || n.senderName === def.senderName)) {
        list.push(def);
      }
    });
    return list;
  }, [notifications, initialDefaultList]);

  // Toast message trigger
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Toggle star favorite status
  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try {
        localStorage.setItem('bavel_starred_notifications', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Handle Ignore action
  const handleIgnoreNotif = (id: string, name: string) => {
    setIgnoredIds(prev => [...prev, id]);
    setSwipedId(null);
    showToast(`Notification de ${name} ignorée.`);
    if (onDeleteNotification) onDeleteNotification(id);
  };

  // Handle Report action
  const handleReportNotif = (id: string, name: string) => {
    setIgnoredIds(prev => [...prev, id]);
    setSwipedId(null);
    showToast(`${name} a été signalé(e).`);
    if (onDeleteNotification) onDeleteNotification(id);
  };

  // Filtered and Sorted Notifications List
  const filteredNotifications = useMemo(() => {
    let list = allNotifications.filter(n => !ignoredIds.includes(n.id));

    if (activeSort === 'unread') {
      list = list.filter(n => !n.read);
    } else if (activeSort === 'visits') {
      list = list.filter(n => n.type === 'visit' || n.body?.includes('A vu votre profil'));
    } else if (activeSort === 'their_favs') {
      list = list.filter(n => n.type === 'like' || n.type === 'coup_de_coeur');
    } else if (activeSort === 'your_favs') {
      list = list.filter(n => starredIds.includes(n.id));
    } else {
      // Recent (default)
      list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    }

    return list;
  }, [allNotifications, activeSort, ignoredIds, starredIds]);

  const sortOptions = [
    { id: 'recent', label: 'Plus récents' },
    { id: 'unread', label: 'Non lus' },
    { id: 'visits', label: 'Ont vu votre profil' },
    { id: 'their_favs', label: 'Dans leurs favoris' },
    { id: 'your_favs', label: 'Dans vos favoris' }
  ];

  const handleNotificationClick = (notif: any) => {
    if (swipedId === notif.id) {
      setSwipedId(null);
      return;
    }
    if (!notif.read && onMarkAsRead) {
      onMarkAsRead(notif.id);
    }

    if (notif.type === 'message' && onNavigateToChat) {
      onClose();
      onNavigateToChat(notif.senderId);
    } else if ((notif.type === 'match' || notif.type === 'match_reminder') && onNavigateToChat) {
      onClose();
      onNavigateToChat(notif.senderId);
    } else if ((notif.type === 'like' || notif.type === 'coup_de_coeur' || notif.type === 'like_promo') && onNavigateToLikes) {
      onClose();
      onNavigateToLikes();
    } else if (onNavigateToProfile && notif.senderId) {
      onClose();
      onNavigateToProfile(notif.senderId);
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 bg-white z-[120] flex flex-col max-w-md mx-auto shadow-2xl pt-10 font-sans"
    >
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 left-4 right-4 max-w-xs mx-auto bg-black/90 text-white px-4 py-2.5 rounded-xl shadow-xl z-[400] text-center text-[13px] font-bold"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header matching Image 1 */}
      <div className="flex items-center justify-between px-4 h-[56px] shrink-0 bg-white relative z-10 border-b border-gray-50">
        <button 
          onClick={onClose} 
          className="w-10 h-10 -ml-2 flex items-center justify-center active:scale-95 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Fermer"
        >
          <ChevronLeft className="w-7 h-7 text-black" strokeWidth={2.5} />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-[18px] font-extrabold text-black tracking-tight">
            Notifications
          </h1>
        </div>
        
        <div className="w-10" />
      </div>

      {/* "Trier par" Button matching Image 1 */}
      <div className="flex justify-end px-5 py-2.5">
        <button 
          onClick={() => setShowSortModal(true)}
          className="flex items-center gap-1.5 text-black font-extrabold text-[15px] hover:opacity-80 active:scale-95 transition-all cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3v18M7 21l-4-4M7 21l4-4M17 21V3M17 3l4 4M17 3l-4 4"/>
          </svg>
          <span>Trier par</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        {/* Row 1: PROMO LIKE BLURRED (always visible at top matching Image 1) */}
        <div 
          onClick={() => {
            if (onNavigateToLikes) {
              onClose();
              onNavigateToLikes();
            }
          }}
          className="flex items-center gap-4 py-3 px-5 hover:bg-gray-50/80 transition-colors cursor-pointer border-b border-gray-50"
        >
          <div className="relative shrink-0">
            <div className="w-[58px] h-[58px] rounded-full overflow-hidden border border-gray-100 bg-gray-200">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80" 
                alt="Blurred Profile" 
                className="w-full h-full object-cover filter blur-md scale-110" 
              />
            </div>
            <div className="absolute top-0.5 right-0.5 w-[14px] h-[14px] bg-[#e20030] rounded-full border-[2.5px] border-white shadow-xs" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[15px] text-black font-semibold leading-snug">
              Vous voulez voir qui vous a donné un Like ?
            </p>
          </div>
        </div>

        {/* Dynamic Notification Rows with Left Swipe Action matching Image 2 */}
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <p className="text-[14px] text-gray-400 font-medium max-w-[260px] leading-relaxed">
              Aucune notification dans cette catégorie.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const avatarUrl = notif.senderAvatar || notif.img;
            const isStarred = starredIds.includes(notif.id);
            const isSwiped = swipedId === notif.id;

            return (
              <div 
                key={notif.id}
                className="relative overflow-hidden border-b border-gray-50/60"
              >
                {/* Underneath Swipe Action Buttons (Ignorer & Signaler) - Always in background */}
                <div className="absolute inset-y-0 right-0 flex items-center z-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIgnoreNotif(notif.id, notif.senderName || 'cet utilisateur');
                    }}
                    className="h-full px-5 bg-[#121212] text-white text-[14px] font-bold flex items-center justify-center active:bg-black transition-colors"
                  >
                    Ignorer
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReportNotif(notif.id, notif.senderName || 'cet utilisateur');
                    }}
                    className="h-full px-5 bg-[#e20030] text-white text-[14px] font-bold flex items-center justify-center active:bg-red-700 transition-colors"
                  >
                    Signaler
                  </button>
                </div>

                {/* Main Row Content (Draggable/Slidable towards Left) */}
                <motion.div 
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: -160, right: 0 }}
                  dragElastic={0.05}
                  animate={{ x: isSwiped ? -160 : 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -35 || info.velocity.x < -200) {
                      setSwipedId(notif.id);
                    } else if (info.offset.x > 35) {
                      setSwipedId(null);
                    } else if (isSwiped && info.offset.x > 15) {
                      setSwipedId(null);
                    }
                  }}
                  onClick={() => {
                    if (swipedId === notif.id) {
                      setSwipedId(null);
                      return;
                    }
                    if (swipedId !== null) {
                      setSwipedId(null);
                      return;
                    }
                    handleNotificationClick(notif);
                  }}
                  className="relative z-10 bg-white flex items-center gap-4 py-3.5 px-5 hover:bg-gray-50/80 transition-colors cursor-pointer select-none"
                >
                  <div className="relative shrink-0">
                    {avatarUrl ? (
                      <div className="w-[58px] h-[58px] rounded-full overflow-hidden border border-gray-100 bg-gray-100 shadow-3xs">
                        <img 
                          src={avatarUrl} 
                          alt={notif.senderName || 'Notification'} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-[58px] h-[58px] rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                        <Bell className="w-6 h-6 text-gray-400" />
                      </div>
                    )}

                    {!notif.read && (
                      <div className="absolute top-0.5 right-0.5 w-[14px] h-[14px] bg-[#e20030] rounded-full border-[2.5px] border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-black text-black text-[16px] tracking-tight">
                        {notif.senderName || notif.title}
                      </span>
                    </div>
                    <div className="text-gray-500 font-medium text-[14.5px] truncate">
                      {notif.body || 'A vu votre profil'}
                    </div>
                  </div>

                  {/* Star Favorite Button matching Image 1 */}
                  <button 
                    onClick={(e) => toggleStar(e, notif.id)}
                    className="shrink-0 p-1.5 -mr-1 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <Star 
                      className={`w-[22px] h-[22px] transition-colors ${
                        isStarred 
                          ? 'text-amber-400 fill-amber-400' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`} 
                      strokeWidth={1.5}
                    />
                  </button>
                </motion.div>
              </div>
            );
          })
        )}
      </div>

      {/* "Trier par" Bottom Sheet Modal matching Image 3 */}
      <AnimatePresence>
        {showSortModal && (
          <div className="fixed inset-0 z-[300] flex flex-col justify-end font-sans">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setShowSortModal(false)}
            />

            {/* Bottom Sheet Container */}
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative bg-white rounded-t-[32px] w-full max-w-md mx-auto p-5 pb-8 shadow-2xl z-10 flex flex-col space-y-3"
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-2" />

              <div className="space-y-2.5 pt-1">
                {sortOptions.map((opt) => {
                  const isSelected = activeSort === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setActiveSort(opt.id as any);
                        setShowSortModal(false);
                      }}
                      className={`w-full py-3.5 px-4 rounded-[22px] flex items-center justify-between text-[15px] transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#f0e6ff] text-black font-extrabold border border-purple-200/80 shadow-3xs' 
                          : 'bg-[#f7f7f8] text-gray-800 font-bold hover:bg-gray-100'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'border-black bg-white' : 'border-gray-400'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


// Custom interactive playback widget for recorded voice notes
export function VoiceNoteBubble({ msg, isMe }: { msg: any, isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // percentage 0 to 100
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(msg.duration || 0);
  const [playbackError, setPlaybackError] = useState(false);
  const audioElemRef = useRef<HTMLAudioElement | null>(null);

  const duration = audioDuration;
  const waveform = msg.waveformData || Array.from({ length: 24 }, (_, index) => 5 + ((index * 7) % 13));

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    setPlaybackError(false);
    if (!msg.audioUrl) {
      setPlaybackError(true);
      return;
    }

    if (!audioElemRef.current) {
      audioElemRef.current = new Audio(msg.audioUrl);
      audioElemRef.current.preload = 'metadata';
      audioElemRef.current.onloadedmetadata = () => {
        if (audioElemRef.current && Number.isFinite(audioElemRef.current.duration)) {
          setAudioDuration(audioElemRef.current.duration);
        }
      };
      audioElemRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
        setCurrentTime(0);
      };
      audioElemRef.current.ontimeupdate = () => {
        if (audioElemRef.current) {
          const current = audioElemRef.current.currentTime;
          const total = audioElemRef.current.duration;
          if (Number.isFinite(total) && total > 0) {
            setAudioDuration(total);
            setCurrentTime(current);
            setPlaybackProgress((current / total) * 100);
          }
        }
      };
      audioElemRef.current.onerror = () => {
        setIsPlaying(false);
        setPlaybackError(true);
      };
    }
    audioElemRef.current.currentTime = (playbackProgress / 100) * (audioElemRef.current.duration || 0);
    audioElemRef.current.play().then(() => setIsPlaying(true)).catch((error) => {
      console.warn('Voice note playback failed:', error);
      setIsPlaying(false);
      setPlaybackError(true);
    });
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (audioElemRef.current) {
      audioElemRef.current.pause();
    }
  };

  useEffect(() => {
    return () => {
      if (audioElemRef.current) {
        audioElemRef.current.pause();
        audioElemRef.current = null;
      }
    };
  }, []);

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`flex items-center space-x-3 p-3.5 rounded-[22px] w-[260px] ${
      isMe 
        ? 'bg-[#8A3FFC] text-white rounded-tr-[4px] shadow-sm' 
        : 'bg-gray-100 text-black rounded-tl-[4px] shadow-xs'
    }`}>
      <button 
        onClick={togglePlay}
        disabled={!msg.audioUrl}
        aria-label={msg.audioUrl ? (isPlaying ? 'Mettre en pause la note vocale' : 'Lire la note vocale') : 'Note vocale indisponible'}
        title={!msg.audioUrl ? 'Note vocale indisponible' : undefined}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-90 ${
          isMe ? 'bg-white text-[#8A3FFC]' : 'bg-[#8A3FFC] text-white'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col justify-center">
        {/* EQ Wave bars rendering */}
        <div className="flex items-end space-x-[2px] h-6 px-0.5">
          {waveform.map((height: number, index: number) => {
            const stepPercent = (index / waveform.length) * 100;
            const isPlayed = stepPercent <= playbackProgress;
            return (
              <div 
                key={index}
                style={{ height: `${height}px` }}
                className={`w-[2.5px] rounded-full transition-colors ${
                  isPlayed 
                    ? (isMe ? 'bg-white' : 'bg-[#8A3FFC]') 
                    : (isMe ? 'bg-white/40' : 'bg-gray-300')
                }`}
              />
            );
          })}
        </div>
        
        {/* Progress timing tracker */}
        <div className="flex items-center justify-between text-[10px] font-bold mt-1.5 px-0.5 opacity-80 select-none">
          <span>{formatSeconds(currentTime)}</span>
          <span>{formatSeconds(duration)}</span>
        </div>
        {playbackError && <span className="text-[10px] mt-1 opacity-80">Lecture indisponible</span>}
        {!msg.audioUrl && <span className="text-[10px] mt-1 opacity-80">Note vocale indisponible</span>}
      </div>
    </div>
  );
}







export function AddMediaSourceMenu({ 
  onClose, 
  onSelectGallery, 
  onSelectCamera, 
  onSyncFacebook,
  onOpenAdvice
}: { 
  onClose: () => void; 
  onSelectGallery?: () => void; 
  onSelectCamera?: () => void; 
  onSyncFacebook?: () => void;
  onOpenAdvice?: () => void;
}) {
  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-white z-[130] flex flex-col justify-between overflow-hidden"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-start pt-12 px-6 pb-4">
        <button onClick={onClose} className="p-2 -ml-2 text-black hover:opacity-70 transition-opacity">
          <X className="w-7 h-7" strokeWidth={2.5} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-8 pt-4 flex flex-col">
        <h1 className="text-[26px] font-black text-black tracking-tight leading-snug mb-10">
          Ajouter des photos depuis :
        </h1>

        <div className="grid grid-cols-2 gap-y-8 gap-x-6 max-w-sm">
          {/* Vos photos */}
          <button 
            onClick={() => {
              onClose();
              if (onSelectGallery) onSelectGallery();
            }}
            className="flex flex-col items-center space-y-3 group active:scale-95 transition-transform"
          >
            <div className="w-[84px] h-[84px] rounded-full bg-[#f3e8ff] flex items-center justify-center shadow-xs">
              <ImageIcon className="w-9 h-9 text-black" strokeWidth={1.75} />
            </div>
            <span className="text-[15px] font-bold text-black">Vos photos</span>
          </button>

          {/* Appareil photo */}
          <button 
            onClick={() => {
              onClose();
              if (onSelectCamera) onSelectCamera();
            }}
            className="flex flex-col items-center space-y-3 group active:scale-95 transition-transform"
          >
            <div className="w-[84px] h-[84px] rounded-full bg-[#f3e8ff] flex items-center justify-center shadow-xs">
              <Camera className="w-9 h-9 text-black" strokeWidth={1.75} />
            </div>
            <span className="text-[15px] font-bold text-black">Appareil photo</span>
          </button>

          {/* Facebook */}
          <div className="flex flex-col items-center space-y-3">
            <button 
              onClick={() => {
                onClose();
                if (onSyncFacebook) onSyncFacebook();
              }}
              className="flex flex-col items-center space-y-3 group active:scale-95 transition-transform"
            >
              <div className="w-[84px] h-[84px] rounded-full bg-[#1877f2] flex items-center justify-center shadow-md">
                <span className="text-white font-black text-4xl">f</span>
              </div>
              <span className="text-[15px] font-bold text-black">Facebook</span>
            </button>
            <button 
              onClick={() => {
                onClose();
                if (onSyncFacebook) onSyncFacebook();
              }}
              className="text-[13px] font-bold text-black underline underline-offset-2 hover:opacity-70"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Advice Footer */}
      <div 
        onClick={() => {
          onClose();
          if (onOpenAdvice) onOpenAdvice();
        }}
        className="pb-12 px-6 flex flex-col items-center justify-center text-center space-y-1 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <span className="text-[18px]">📸</span>
        <span className="text-[14px] font-bold text-black">Conseils et règlement sur les photos</span>
        <ChevronUp className="w-5 h-5 text-black mt-1" strokeWidth={2.5} />
      </div>
    </motion.div>
  );
}

export function FullProfilePhotoModal({ 
  onClose, 
  userPhotos = [], 
  userProfile, 
  userMood,
  onOpenEditProfile,
  onOpenAddMedia
}: { 
  onClose: () => void; 
  userPhotos?: string[]; 
  userProfile?: any;
  userMood?: { emoji: string; label: string } | null;
  onOpenEditProfile?: () => void;
  onOpenAddMedia?: () => void;
}) {
  const photoUrl = userPhotos[0] || '';
  const name = userProfile?.name?.trim() || 'Votre profil';
  const profileAge = Number(userProfile?.age);
  const ageLabel = Number.isFinite(profileAge) && profileAge >= 18 ? `, ${profileAge}` : '';
  const city = userProfile?.city?.trim() || '';

  const isInvalid = (val: string) => {
    if (!val) return true;
    const lower = val.toLowerCase().trim();
    return lower === "je préfère ne pas le dire" || lower === "je prefere ne pas le dire" || lower === "not_say" || lower === "not say" || lower === "tous";
  };

  const getDetailPills = () => {
    const details = userProfile?.details || {};
    const pills: { emoji: string; text: string }[] = [];

    if (details.children && !isInvalid(details.children)) {
      pills.push({ emoji: '👶', text: details.children });
    }
    if (details.smoking && !isInvalid(details.smoking)) {
      pills.push({ emoji: '🚬', text: details.smoking });
    }
    if (details.alcohol && !isInvalid(details.alcohol)) {
      const alcText = details.alcohol === 'Occasionnellement' ? "À l'occasion" : details.alcohol;
      pills.push({ emoji: '🍷', text: alcText });
    }
    if (details.height && !isInvalid(details.height)) {
      pills.push({ emoji: '📏', text: details.height });
    }
    if (details.education && !isInvalid(details.education)) {
      const eduText = details.education === 'Diplôme universitaire' ? "Diplôme universitaire ou supérieur" : details.education;
      pills.push({ emoji: '🎓', text: eduText });
    }
    if (details.personality && !isInvalid(details.personality)) {
      const persText = details.personality === 'Rêveur' ? "Introverti" : details.personality;
      pills.push({ emoji: '🗣️', text: persText });
    }
    if (details.pets && !isInvalid(details.pets)) {
      const petsText = details.pets === 'Chien' ? "Autres" : details.pets;
      pills.push({ emoji: '🐾', text: petsText });
    }
    if (details.religion && !isInvalid(details.religion)) {
      pills.push({ emoji: '⛪', text: details.religion });
    }
    if (details.zodiac && !isInvalid(details.zodiac)) {
      const zodiacEmojis: Record<string, string> = {
        'Bélier': '♈', 'Taureau': '♉', 'Gémeaux': '♊', 'Cancer': '♋',
        'Lion': '♌', 'Vierge': '♍', 'Balance': '♎', 'Scorpion': '♏',
        'Sagittaire': '♐', 'Capricorne': '♑', 'Verseau': '♒', 'Poissons': '♓'
      };
      pills.push({ emoji: zodiacEmojis[details.zodiac] || '✨', text: details.zodiac });
    }
    if (details.languages && !isInvalid(details.languages)) {
      pills.push({ emoji: '🗣️', text: details.languages });
    }

    return pills;
  };

  const detailPills = getDetailPills();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[120] flex items-center justify-center p-2.5 sm:p-4 select-none"
    >
      {/* Backdrop tap to close */}
      <div onClick={onClose} className="absolute inset-0 z-0" />

      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 15 }}
        transition={{ type: "spring", damping: 26, stiffness: 340 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[345px] h-[82vh] rounded-[32px] shadow-2xl relative flex flex-col overflow-hidden border border-gray-100"
      >
        {/* Subtle top-right close button */}
        <button 
          onClick={onClose} 
          className="absolute right-3 top-3.5 z-50 w-7 h-7 rounded-full bg-black/25 backdrop-blur-md text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer hover:bg-black/40"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Scrollable Area */}
        <div className="w-full h-full overflow-y-auto scrollbar-hide flex flex-col relative pb-28">
          
          {/* PHOTO SECTION (Occupies full height of card initially) */}
          <div className="relative w-full h-[82vh] shrink-0 flex flex-col justify-start p-5">
            <div className="absolute inset-0 z-0">
              {photoUrl ? (
                <>
                  <img src={photoUrl} alt={`Photo de profil de ${name}`} className="w-full h-full object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55 pointer-events-none" />
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-neutral-900 text-white">
                  <Camera className="h-10 w-10 text-white/70" aria-hidden="true" />
                  <p className="text-sm font-semibold">Aucune photo ajoutée</p>
                  {onOpenAddMedia && (
                    <button
                      type="button"
                      onClick={() => { onClose(); onOpenAddMedia(); }}
                      className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black"
                    >
                      Ajouter une photo
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Overlaid details on TOP-LEFT of photo as shown in the design */}
            <div className="relative z-10 flex flex-col items-start space-y-1.5 pt-4">
              <div className="flex items-center space-x-1.5">
                {Boolean(userProfile?.isVerified) && (
                  <span 
                    className="w-4 h-4 rounded-full bg-[#0084ff] text-white inline-flex items-center justify-center shrink-0 shadow-xs"
                    title="Profil vérifié par photo"
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                  </span>
                )}
                <h1 className="text-[16px] font-black text-white tracking-tight drop-shadow-sm">
                  {name}{ageLabel}
                </h1>
                {(userProfile?.is_online === true || userProfile?.isOnline === true) && (
                  <span className="w-2 h-2 rounded-full bg-[#30d158] border-2 border-white shadow-sm" aria-label="En ligne" />
                )}
              </div>

              {/* Location badge - dark transparent pill with suitcase/briefcase icon */}
              {city && <div className="bg-black/35 backdrop-blur-xs px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-sm border border-white/10">
                <span className="text-[9.5px]">💼</span>
                <span className="text-[9.5px] font-extrabold text-white tracking-tight">{city}</span>
              </div>}
            </div>

            {/* Right side vertical scroll indicator pill */}
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-1 h-14 bg-white/45 rounded-full z-10" />
          </div>

          {/* DETAILS SECTION (White Background, revealed on scroll down) */}
          <div className="bg-white w-full relative z-20 px-5 pt-5 flex flex-col space-y-4">
            
            {/* Header: Name, Age */}
            <div className="flex items-center space-x-2 pb-0.5">
              <h2 className="text-[18px] font-black text-black tracking-tight">{name}{ageLabel}</h2>
              {(userProfile?.is_online === true || userProfile?.isOnline === true) && (
                <span className="w-2 h-2 rounded-full bg-[#30d158]" aria-label="En ligne" />
              )}
            </div>

            {/* Localisation */}
            {city && <div className="flex flex-col space-y-0.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Localisation</span>
              <span className="text-[17px] font-extrabold text-black">{city}</span>
              <div className="flex items-center space-x-1.5 text-gray-400 mt-0.5">
                <span className="text-[12px]">💼</span>
                <span className="text-[11px] font-semibold text-gray-500">La localisation choisie</span>
              </div>
            </div>}

            {/* À propos de moi */}
            <div className="flex flex-col space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">À propos de moi</span>
              <p className="text-[14px] font-extrabold text-black leading-snug whitespace-pre-line">
                {userProfile?.bio || 'Aucune description ajoutée.'}
              </p>
            </div>

            {/* Questions-Clés */}
            {userProfile?.details?.prompts && userProfile.details.prompts.length > 0 && (
              <div className="flex flex-col space-y-2.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Questions-Clés</span>
                {userProfile.details.prompts.map((p: any, idx: number) => (
                  <div key={idx} className="bg-[#f4f4f6] rounded-[18px] px-4 py-2.5 flex flex-col items-start">
                    <span className="text-[10.5px] font-bold text-gray-400 mb-0.5 leading-tight">{p.question}</span>
                    <p className="text-[13px] font-extrabold text-black leading-tight">{p.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Au niveau relations */}
            {((userProfile?.keyQuestion && !isInvalid(userProfile.keyQuestion)) ||
              (userProfile?.details?.relation && !isInvalid(userProfile.details.relation)) ||
              (userProfile?.details?.sexuality && !isInvalid(userProfile.details.sexuality))) && (
              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Au niveau relations</span>
                <div className="flex flex-wrap gap-1">
                  {userProfile?.keyQuestion && !isInvalid(userProfile.keyQuestion) && (
                    <div className="bg-[#f4f4f6] px-2.5 py-1.5 rounded-full flex items-center space-x-1 shrink-0">
                      <span className="text-[12px]">❤️</span>
                      <span className="text-[11.5px] font-extrabold text-black whitespace-nowrap">{userProfile.keyQuestion}</span>
                    </div>
                  )}
                  {userProfile?.details?.relation && !isInvalid(userProfile.details.relation) && (
                    <div className="bg-[#f4f4f6] px-2.5 py-1.5 rounded-full flex items-center space-x-1 shrink-0">
                      <span className="text-[12px]">🖤</span>
                      <span className="text-[11.5px] font-extrabold text-black whitespace-nowrap">{userProfile.details.relation}</span>
                    </div>
                  )}
                  {userProfile?.details?.sexuality && !isInvalid(userProfile.details.sexuality) && (
                    <div className="bg-[#f4f4f6] px-2.5 py-1.5 rounded-full flex items-center space-x-1 shrink-0">
                      <span className="text-[12px]">👫</span>
                      <span className="text-[11.5px] font-extrabold text-black whitespace-nowrap">{userProfile.details.sexuality}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Plus d'infos sur moi */}
            {detailPills.length > 0 && (
              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plus d'infos sur moi</span>
                <div className="flex flex-wrap gap-1">
                  {detailPills.map((pill, idx) => (
                    <div key={idx} className="bg-[#f4f4f6] px-2.5 py-1.5 rounded-full flex items-center space-x-1 shrink-0">
                      <span className="text-[12px]">{pill.emoji}</span>
                      <span className="text-[11.5px] font-extrabold text-black whitespace-nowrap">{pill.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emploi */}
            {userProfile?.job && (
              <div className="flex flex-col space-y-0.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Emploi</span>
                <span className="text-[15.5px] font-extrabold text-black">{userProfile.job}</span>
              </div>
            )}

            {/* Études */}
            {userProfile?.studies && (
              <div className="flex flex-col space-y-0.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Études</span>
                <span className="text-[15.5px] font-extrabold text-black">{userProfile.studies}</span>
              </div>
            )}

            {/* Ce que j'aime bien... */}
            {userProfile?.interests && userProfile.interests.length > 0 && (
              <div className="flex flex-col space-y-1.5 pb-4">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ce que j'aime bien...</span>
                <div className="flex flex-wrap gap-1.5">
                  {userProfile.interests.map((interest: any, idx: number) => {
                    const isObj = typeof interest === 'object' && interest !== null;
                    const label = isObj ? (interest.label || interest.name || '') : String(interest);
                    const icon = isObj ? interest.icon : null;
                    return (
                      <div key={label || idx} className="bg-[#f4f4f6] px-3.5 py-2 rounded-full flex items-center space-x-1.5 shrink-0">
                        {icon && <span className="text-[15px]">{icon}</span>}
                        <span className="text-[12px] font-extrabold text-black whitespace-nowrap">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* PINNED FLOATING BUTTONS AT THE BOTTOM */}
        <div className="absolute bottom-5 left-0 right-0 z-30 flex items-center justify-center space-x-5 pointer-events-none">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              if (onOpenAddMedia) onOpenAddMedia();
            }}
            className="pointer-events-auto w-[50px] h-[50px] rounded-full bg-white shadow-lg flex items-center justify-center active:scale-95 transition-transform border border-gray-100 relative cursor-pointer"
            title="Ajouter des photos"
          >
            <Camera className="w-5.5 h-5.5 text-black" strokeWidth={2.2} />
            <div className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-[#ff2d55] text-white flex items-center justify-center text-[9px] font-black border-2 border-white">+</div>
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              if (onOpenEditProfile) onOpenEditProfile();
            }}
            className="pointer-events-auto w-[50px] h-[50px] rounded-full bg-white shadow-lg flex items-center justify-center active:scale-95 transition-transform border border-gray-100 cursor-pointer"
            title="Modifier le profil"
          >
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
}



export function FacebookInfoModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info'
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error';
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-[340px] rounded-2xl p-6 shadow-xl border border-gray-100 flex flex-col items-center text-center"
      >
        <div className={`w-12 h-12 rounded-full mb-4 flex items-center justify-center ${
          type === 'success' ? 'bg-emerald-50 text-emerald-500' :
          type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
        }`}>
          {type === 'success' && (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {type === 'error' && (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {type === 'info' && (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        
        <h3 className="text-[17px] font-bold text-black mb-2">{title}</h3>
        <p className="text-[13.5px] text-gray-500 leading-relaxed mb-6 whitespace-pre-line">{message}</p>
        
        <button
          onClick={onClose}
          className="w-full bg-[#1877f2] text-white font-bold text-[14px] py-3 rounded-full hover:bg-[#166fe5] active:scale-98 transition-all cursor-pointer"
        >
          D'accord
        </button>
      </motion.div>
    </div>
  );
}

export function ReportMenu({ 
  onClose, 
  onSelectReason,
  userName = 'l\'utilisateur'
}: { 
  onClose: () => void; 
  onSelectReason: (reason: string) => void;
  userName?: string;
}) {
  const reportReasons = [
    { id: 'fake_profile', label: 'Profil fake', icon: UserX },
    { id: 'inappropriate_content', label: 'Contenu inapproprié', icon: AlertTriangle },
    { id: 'scam_commercial', label: 'Scam ou commercial', icon: Flag },
    { id: 'identity_hate', label: 'Haine identitaire', icon: ShieldAlert },
    { id: 'badoo_conduct', label: 'Attitude en dehors de Badoo', icon: Ban },
    { id: 'minor', label: 'Personne mineure', icon: Baby },
    { id: 'illegal_eu', label: 'Contenu illégal dans l\'UE', icon: AlertOctagon },
    { id: 'not_interested', label: 'Je ne suis pas intéressé', icon: ThumbsDown },
  ];

  return (
    <div className="fixed inset-0 z-[350] flex flex-col justify-end">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />
      
      {/* Bottom Sheet Modal */}
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white rounded-t-[32px] w-full flex flex-col z-10 p-5 shadow-2xl overflow-hidden max-h-[85dvh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 shrink-0" />
        
        {/* Title */}
        <h2 className="text-[20px] font-black text-black text-center mb-2 tracking-tight">Signaler</h2>
        
        {/* Subtitle description */}
        <p className="text-[12.5px] text-gray-500 font-medium text-center mb-5 leading-snug px-2">
          Nous tenons à protéger notre communauté et à assurer votre sécurité. Pas d'inquiétude : quoi que vous fassiez, votre choix restera anonyme.
        </p>

        {/* Options List */}
        <div className="flex-1 overflow-y-auto space-y-1 pb-6 scrollbar-hide">
          {reportReasons.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectReason(item.label);
                  onClose();
                }}
                className="w-full flex items-center space-x-3.5 py-3.5 px-3 rounded-2xl hover:bg-zinc-50 active:bg-zinc-100 transition-colors text-left group cursor-pointer"
              >
                <div className="w-6 h-6 flex items-center justify-center shrink-0 text-black">
                  <IconComponent className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <span className="text-[15px] font-bold text-black group-hover:text-gray-900 tracking-tight flex-1">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

export function AiVibeCheckModal({
  profile,
  currentUser,
  onClose,
  onOpenChatWithIcebreaker
}: {
  profile: any;
  currentUser?: any;
  onClose: () => void;
  onOpenChatWithIcebreaker?: (profile: any, text: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<{
    score: number | null;
    badge: string;
    reason: string;
    signals: string[];
    sharedPoints: string[];
    icebreakers: string[];
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function fetchAiMatch() {
      setLoading(true);
      setData(null);
      setErrorMessage(null);
      try {
        const timeoutId = setTimeout(() => abortController.abort(), 6000);
        const res = await authFetch('/api/ai/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            userProfile: currentUser || {},
            targetProfile: profile
          })
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const resData = await res.json();
          if (isMounted) {
            setData(resData);
            setErrorMessage(null);
          }
        } else {
          if (isMounted) {
            setData(null);
            setErrorMessage("Le calcul de compatibilité interne est indisponible.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setData(null);
          setErrorMessage(err?.name === 'AbortError'
            ? "Le calcul de compatibilité a dépassé le délai autorisé."
            : "Le calcul de compatibilité interne est indisponible.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchAiMatch();
    return () => { 
      isMounted = false;
      abortController.abort();
    };
  }, [profile, currentUser]);

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-[320] flex flex-col justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative bg-white rounded-t-[32px] w-full max-w-lg mx-auto flex flex-col z-10 p-5 shadow-2xl overflow-hidden max-h-[90dvh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-3 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-rose-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="text-[17px] font-black text-slate-900 tracking-tight leading-none">
                Affinité de profil
              </h3>
              <p className="text-[11.5px] text-purple-600 font-bold mt-0.5">
                Estimation par règles, sans IA générative
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-hide">
          {/* Target Profile Card */}
          <div className="flex items-center space-x-3.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <img
              src={profile.avatarUrl || profile.photos?.[0] || profile.img}
              alt={profile.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-[16px] font-black text-slate-900 truncate">
                {profile.name}, {profile.age} ans
              </h4>
              <p className="text-[12px] text-gray-500 truncate">
                {profile.occupation || 'Membre Bavel'} • {profile.city || profile.neighborhood || 'Abidjan'}
              </p>
            </div>
            {data && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-[12px] font-extrabold rounded-full border border-purple-200 shrink-0">
                {data.badge}
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-[13.5px] font-bold text-gray-600 animate-pulse">
                Comparaison des informations de profil...
              </p>
            </div>
          ) : data ? (
            <>
              {/* Overall Score Dial */}
              <div className="bg-gradient-to-br from-purple-50 via-rose-50 to-amber-50 p-4 rounded-2xl border border-purple-100/60 flex flex-col items-center text-center relative overflow-hidden">
                <div className="text-[42px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-rose-600 to-amber-600 leading-none">
                  {data.score === null ? '—' : `${data.score}%`}
                </div>
                <div className="text-[12px] font-black uppercase tracking-wider text-purple-900 mt-1">
                  {data.score === null ? 'Données insuffisantes' : 'Affinité indicative'}
                </div>
                <p className="text-[13.5px] font-medium text-slate-700 mt-2 max-w-sm leading-relaxed bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-purple-100 shadow-3xs">
                  "{data.reason}"
                </p>
              </div>

              <div className="space-y-2.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                <h5 className="text-[12px] font-black text-gray-500 uppercase tracking-wider mb-2">
                  Éléments comparés
                </h5>
                {data.signals?.length ? (
                  <ul className="space-y-1.5 text-[12px] font-medium text-slate-700">
                    {data.signals.map((signal, index) => <li key={index}>{signal}</li>)}
                  </ul>
                ) : <p className="text-xs text-neutral-500">Aucune information suffisante pour détailler le calcul.</p>}
              </div>

              {/* Shared Points */}
              {data.sharedPoints && data.sharedPoints.length > 0 && (
                <div>
                  <h5 className="text-[12px] font-black text-gray-500 uppercase tracking-wider mb-2">
                    Points forts partagés
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {data.sharedPoints.map((pt, i) => {
                      const ptLabel = typeof pt === 'object' && pt !== null ? ((pt as any).label || (pt as any).name || String(pt)) : String(pt);
                      return (
                        <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[12px] font-bold rounded-lg border border-purple-100 flex items-center space-x-1">
                          <Check className="w-3 h-3 text-purple-600 stroke-[3]" />
                          <span>{ptLabel}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Suggested AI Icebreakers */}
              {data.icebreakers && data.icebreakers.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h5 className="text-[12px] font-black text-gray-500 uppercase tracking-wider flex items-center space-x-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span>Accroches recommandées</span>
                  </h5>
                  <div className="space-y-2">
                    {data.icebreakers.map((ice, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (onOpenChatWithIcebreaker) {
                            onOpenChatWithIcebreaker(profile, ice);
                          }
                          onClose();
                        }}
                        className="w-full text-left p-3 rounded-xl bg-purple-50/80 hover:bg-purple-100/80 active:bg-purple-200/80 border border-purple-200/80 text-[13px] font-bold text-slate-800 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <span className="flex-1 pr-2">"{ice}"</span>
                        <Send className="w-4 h-4 text-purple-600 shrink-0 group-hover:scale-110 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : errorMessage ? (
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{errorMessage}</p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
