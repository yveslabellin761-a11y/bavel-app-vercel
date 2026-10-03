import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, Sparkles, AlertTriangle, Crown, MapPin, CheckCircle2, Flame, RefreshCw } from 'lucide-react';
import { authFetch } from '../../lib/authFetch';

export interface SwipeCardWithLimitProps {
  currentUser: {
    id: string;
    [key: string]: any;
  };
  targetUser: {
    id: string;
    username?: string;
    name?: string;
    age?: number | string;
    city?: string;
    bio?: string;
    avatar_url?: string;
    photos?: string[];
    [key: string]: any;
  };
  onNextProfile: () => void;
  userProfileData: {
    id?: string;
    daily_likes_count?: number;
    is_premium?: boolean;
    [key: string]: any;
  };
  onMatch?: (matchedUser: any) => void;
  onOpenPremium?: () => void;
}

export default function SwipeCardWithLimit({
  currentUser,
  targetUser,
  onNextProfile,
  userProfileData,
  onMatch,
  onOpenPremium
}: SwipeCardWithLimitProps) {
  const [loading, setLoading] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Limite maximum quotidienne pour les utilisateurs gratuits
  const MAX_DAILY_LIKES = 50;
  const currentDailyLikes = userProfileData?.daily_likes_count || 0;
  const remainingLikes = Math.max(0, MAX_DAILY_LIKES - currentDailyLikes);
  const isPremium = Boolean(userProfileData?.is_premium);

  const displayName = targetUser.username || targetUser.name || 'Candidat(e)';
  const displayAge = targetUser.age ? `${targetUser.age} ans` : '';
  const displayAvatar = targetUser.avatar_url || (targetUser.photos && targetUser.photos[0]) || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';

  // 1. Action de Like avec vérification de quota
  const handleLike = async () => {
    // 1. Vérifier si l'utilisateur a dépassé son quota (sauf s'il est premium)
    if (!isPremium && currentDailyLikes >= MAX_DAILY_LIKES) {
      setShowLimitModal(true);
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const response = await authFetch('/api/encounters/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetProfileId: targetUser.id,
          targetProfileName: displayName,
          direction: 'like'
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        if (response.status === 429 && payload?.code === 'DAILY_LIKE_LIMIT') {
          setShowLimitModal(true);
          return;
        }
        throw new Error(payload?.error || 'Impossible de traiter le like.');
      }

      const newCount = currentDailyLikes + 1;
      userProfileData.daily_likes_count = newCount;
      if (payload?.isMatch) {
        setShowMatchModal(true);
        onMatch?.(targetUser);
      } else {
        setFeedback('❤️ Coup de cœur envoyé !');
        setTimeout(() => {
          onNextProfile();
        }, 450);
      }
    } catch (error: any) {
      console.error('Erreur lors du swipe:', error);
      alert(`Erreur : ${error.message || 'Impossible de traiter le like'}`);
      onNextProfile();
    } finally {
      setLoading(false);
    }
  };

  // 2. Action de Passe (Ignorer)
  const handlePass = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/encounters/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetProfileId: targetUser.id,
          targetProfileName: displayName,
          direction: 'pass'
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Impossible de passer ce profil.');
      }
    } catch (e) {
      console.error('Pass swipe failed:', e);
      setFeedback(e instanceof Error ? e.message : 'Impossible de passer ce profil.');
      return;
    } finally {
      setLoading(false);
    }
    onNextProfile();
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center select-none font-sans">
      {/* Barre de quota quotidien adaptée pour mobile */}
      <div className="w-full bg-slate-100/90 border border-slate-200/80 rounded-2xl p-3 mb-3 text-center shadow-xs">
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
          <span className="flex items-center space-x-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Quota de likes du jour</span>
          </span>
          {isPremium ? (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full flex items-center space-x-1">
              <Crown className="w-3 h-3 text-amber-600" />
              <span>Illimité</span>
            </span>
          ) : (
            <span className={`font-bold ${remainingLikes <= 5 ? 'text-rose-600' : 'text-slate-800'}`}>
              {remainingLikes} / {MAX_DAILY_LIKES} restants
            </span>
          )}
        </div>

        {/* Jauge de progression */}
        {!isPremium && (
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                remainingLikes > 15 ? 'bg-gradient-to-r from-purple-500 to-rose-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, (currentDailyLikes / MAX_DAILY_LIKES) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Carte du profil */}
      <div className="relative w-full aspect-3/4 rounded-3xl overflow-hidden shadow-xl bg-slate-900 border border-slate-800 flex flex-col justify-end">
        {/* Photo de profil */}
        <img
          src={displayAvatar}
          alt={displayName}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dégradé sombre pour lisibilité du texte */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

        {/* Toast de confirmation temporaire */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-md py-2.5 px-4 rounded-2xl shadow-lg border border-purple-100 text-purple-900 text-xs sm:text-sm font-bold text-center z-20 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{feedback}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Informations sur le profil */}
        <div className="relative z-10 p-5 text-white">
          <div className="flex items-baseline space-x-2 mb-1">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-md">
              {displayName}
            </h3>
            {displayAge && (
              <span className="text-lg sm:text-xl font-medium text-slate-200 drop-shadow-md">
                {displayAge}
              </span>
            )}
          </div>

          {targetUser.city && (
            <div className="flex items-center space-x-1 text-slate-300 text-xs sm:text-sm font-medium mb-2">
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              <span>{targetUser.city}</span>
            </div>
          )}

          {targetUser.bio && (
            <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed opacity-95">
              {targetUser.bio}
            </p>
          )}
        </div>
      </div>

      {/* Boutons d'actions - Optimisés pour mobile (taille tactile >= 48px) */}
      <div className="flex items-center justify-center space-x-6 mt-4 w-full px-4">
        {/* Bouton Passer */}
        <button
          onClick={handlePass}
          disabled={loading}
          aria-label="Passer ce profil"
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white text-slate-500 hover:text-slate-800 active:scale-95 shadow-lg border border-slate-200 flex items-center justify-center transition-all cursor-pointer min-h-[48px] min-w-[48px] focus:outline-none"
        >
          <X className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2.5} />
        </button>

        {/* Bouton Liker */}
        <button
          onClick={handleLike}
          disabled={loading}
          aria-label="Liker ce profil"
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 active:scale-95 shadow-xl shadow-rose-500/30 flex items-center justify-center transition-all cursor-pointer min-h-[48px] min-w-[48px] focus:outline-none"
        >
          {loading ? (
            <RefreshCw className="w-7 h-7 animate-spin" />
          ) : (
            <Heart className="w-8 h-8 sm:w-9 sm:h-9 fill-current" />
          )}
        </button>
      </div>

      {/* Modal Match Réciproque */}
      <AnimatePresence>
        {showMatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="w-full max-w-xs bg-white rounded-3xl p-6 text-center shadow-2xl border border-pink-100"
            >
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-8 h-8 text-pink-600" />
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">
                C'est un Match ! 🎉
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mb-5">
                Vous et <span className="font-bold text-slate-800">{displayName}</span> vous vous plaisez mutuellement.
              </p>
              <button
                onClick={() => {
                  setShowMatchModal(false);
                  onNextProfile();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl shadow-md cursor-pointer text-sm sm:text-base min-h-[44px]"
              >
                Continuer à swiper
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Quota Atteint */}
      <AnimatePresence>
        {showLimitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="w-full max-w-xs bg-white rounded-3xl p-6 text-center shadow-2xl border border-amber-100"
            >
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </div>
              <h4 className="text-lg sm:text-xl font-black text-slate-900 mb-1">
                Limite de likes atteinte ⏳
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mb-5 leading-relaxed">
                Vous avez utilisé vos <span className="font-bold">50 likes</span> pour aujourd'hui. Vos likes se réinitialisent cette nuit à 00h00 !
              </p>
              <div className="space-y-2.5">
                {onOpenPremium && (
                  <button
                    onClick={() => {
                      setShowLimitModal(false);
                      onOpenPremium();
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl shadow-md flex items-center justify-center space-x-2 text-xs sm:text-sm min-h-[44px] cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-amber-200" />
                    <span>Passer à Bavel Premium ✨</span>
                  </button>
                )}
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl text-xs sm:text-sm min-h-[40px] cursor-pointer"
                >
                  Compris, à demain !
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
