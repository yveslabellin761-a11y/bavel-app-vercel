import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, Heart, MessageCircle, Search, X, Sparkles,
  Check, Trash2, Eye, EyeOff, RefreshCw, Lock, Sparkle, ArrowRight,
  Zap, Clock
} from 'lucide-react';
import { saveLikeToSupabase, subscribeToLikes } from '../../../lib/supabase';
import { ProfileModal } from '../Modals';
import { OneDayPremiumModal } from '../../modals/OneDayPremiumModal';
import BavelPremiumModal from '../../modals/BavelPremiumModal';
import { WantMoreLikesModal, ExtraShowsMenu, RechargeCreditsMenu } from '../Monetization';
import { aiMonetizationEngine } from '../../../services/aiMonetizationEngine';
import { aiSystemEngine } from '../../../services/aiSystemEngine';
import { monetizationService } from '../../../services/monetizationService';
import { FEATURES_PER_TIER, getTierPrivileges } from '../../../config/featuresConfig';
import { pushNotificationService } from '../../../services/push/pushNotificationService';
import { authFetch } from '../../../lib/authFetch';

interface LikesTabProps {
  onNavigateToTab?: (tab: string) => void;
  likedProfiles?: any[];
  discussions?: any[];
  userPhotos?: string[];
  unreadLikesCount?: number;
  receivedLikesTotal?: number;
  dbProfiles?: any[];
  receivedLikes?: string[];
  userProfile?: any;
  showToast?: (msg: string) => void;
  loadSupabaseData?: () => void;
  onLikeProfile?: (id: string | number) => Promise<boolean | undefined>;
  onRemoveLike?: (id: string | number) => Promise<void>;
  onDismissReceivedLike?: (id: string | number) => Promise<void>;
  onOpenChat?: (profile: any) => void;
  isPremium?: boolean;
  onActivatePremium?: () => void;
}

export function LikesTab({ 
  onNavigateToTab,
  likedProfiles = [],
  discussions = [],
  userPhotos = [],
  unreadLikesCount = 0,
  receivedLikesTotal = 0,
  dbProfiles = [],
  receivedLikes = [],
  userProfile,
  showToast,
  loadSupabaseData,
  onLikeProfile,
  onRemoveLike,
  onDismissReceivedLike,
  onOpenChat,
  isPremium = false,
  onActivatePremium
}: LikesTabProps) {
  const [showWantMoreLikes, setShowWantMoreLikes] = useState(false);
  const [showExtraShows, setShowExtraShows] = useState(false);
  const [showRechargeCredits, setShowRechargeCredits] = useState(false);
  const [showOneDayPremium, setShowOneDayPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Sub-tabs in Received Mode: 'all' = "Tous les Likes 🔒", 'new' = "Nouveaux Likes 🔒"
  const [likesSubTab, setLikesSubTab] = useState<'all' | 'new'>('all');

  const [searchQuery, setSearchQuery] = useState('');
  
  // Profile modal inspection state
  const [inspectingProfile, setInspectingProfile] = useState<any | null>(null);

  // Match celebration modal state
  const [matchedProfile, setMatchedProfile] = useState<any | null>(null);

  // Action loading state
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);
  const [serverReceivedLikes, setServerReceivedLikes] = useState<any[]>([]);

  // Permission 1: Discover who liked you (Condition 1: Extra Non, Premium Oui)
  const userTier = (userProfile?.tier || (isPremium ? 'premium' : monetizationService.getUserStatus())).toLowerCase();
  const privileges = getTierPrivileges(userTier);
  const canUnlockLikes = Boolean(isPremium || privileges.canSeeWhoLikedMe || monetizationService.hasPermission('canSeeWhoLikedYou'));
  const [showUnblurredPreview, setShowUnblurredPreview] = useState(canUnlockLikes);

  useEffect(() => {
    setShowUnblurredPreview(canUnlockLikes);
  }, [canUnlockLikes]);

  useEffect(() => {
    let active = true;
    if (!userProfile?.id) return;
    authFetch('/api/likes/received')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Likes reçus indisponibles')))
      .then(payload => {
        if (active && Array.isArray(payload.likes)) setServerReceivedLikes(payload.likes);
      })
      .catch(error => console.error('Impossible de charger les likes reçus:', error));
    const unsubscribe = subscribeToLikes(String(userProfile.id), (like) => {
      if (like?.is_liked !== true) return;
      authFetch('/api/likes/received')
        .then(response => response.ok ? response.json() : null)
        .then(payload => {
          if (active && Array.isArray(payload?.likes)) setServerReceivedLikes(payload.likes);
        })
        .catch(error => console.error('Impossible de synchroniser les likes reçus:', error));
    });
    return () => { active = false; unsubscribe(); };
  }, [userProfile?.id]);

  // AI Personalized Dynamic Offer state
  const [aiOffer, setAiOffer] = useState<{
    title: string;
    subtitle: string;
    price: string;
    actionText: string;
    badge?: string;
    reason?: string;
  }>({
    title: "Premium pendant 1 jour",
    subtitle: "Découvrez toutes les personnes à qui vous plaisez et profitez de swipes illimités ainsi que d'autres avantages Premium.",
    price: "5,99 €",
    actionText: "Profitez-en pour 5,99 €",
    badge: "OFFRE FLASH"
  });

  // Fetch AI Offer dynamically tailored to user profile & activity
  useEffect(() => {
    const likesCount = receivedLikes.length || 6;
    const rec = aiMonetizationEngine.getSecretLikeRecommendation(likesCount);
    const dynamicPrices = aiMonetizationEngine.getDynamicPrices();
    
    setAiOffer({
      title: rec.title,
      subtitle: rec.subtitle,
      price: `${dynamicPrices.extraEUR} €`,
      actionText: `Activer le Pass Premium • ${dynamicPrices.extraCFA.toLocaleString()} FCFA (${dynamicPrices.extraEUR} €)`,
      badge: "ALERTE COMPATIBILITÉ",
      reason: rec.compatibilityScore === null
        ? "La compatibilité sera calculée après comparaison réelle des profils."
        : `Score de compatibilité de ${rec.compatibilityScore}%`
    });
  }, [receivedLikes.length, isPremium]);

  // Registry of all profiles to locate details for liked IDs
  const allProfiles = useMemo(() => {
    return dbProfiles || [];
  }, [dbProfiles]);

  // Set of matched profile IDs for status indicator
  const matchedProfileIds = useMemo(() => {
    return new Set(
      discussions.map(d => String(d.id || d.user_id))
    );
  }, [discussions]);

  // Get matching liked profiles (Sent likes), eliminating duplicates
  const likedProfilesList = useMemo(() => {
    const uniqueIds = Array.from(new Set(likedProfiles.map(id => String(id))));
    const list = uniqueIds
      .map(id => allProfiles.find(p => String(p.id) === id || String(p.user_id) === id))
      .filter(Boolean) as any[];

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.city?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q) ||
      p.relation?.toLowerCase().includes(q)
    );
  }, [likedProfiles, allProfiles, searchQuery]);

  // Map received likes to profiles returned by the authenticated server.
  const receivedLikesProfiles = useMemo(() => {
    const serverProfilesById = new Map(serverReceivedLikes.map(profile => [String(profile.id), profile]));
    const uniqueIds = Array.from(new Set([
      ...receivedLikes.map(id => String(id)),
      ...serverReceivedLikes.map(profile => String(profile.id))
    ]));
    let list = uniqueIds
      .map(id => allProfiles.find(p => String(p.user_id) === id || String(p.id) === id))
      .map((p, index) => p || serverProfilesById.get(uniqueIds[index]))
      .filter(Boolean)
      .map(p => ({
        id: p.id || p.user_id,
        name: p.name,
        age: p.age,
        location: p.city || p.location || 'Emplacement indisponible',
        img: p.avatarUrl || p.img || (p.photos && p.photos[0]) || '',
        relation: p.relation,
        profile: p,
        isMatched: matchedProfileIds.has(String(p.id || p.user_id)),
        isNew: Boolean(p.likedAt && Date.now() - new Date(p.likedAt).getTime() < 24 * 60 * 60 * 1000)
      }));

    if (likesSubTab === 'new') {
      list = list.filter((p) => p.isNew);
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.location?.toLowerCase().includes(q)
    );
  }, [receivedLikes, serverReceivedLikes, allProfiles, matchedProfileIds, searchQuery, likesSubTab]);

  // Handle Match / Like Back (Création automatique du Match réciproque & Affichage immédiat de la bannière de Match)
  const handleLikeBack = async (profile: any) => {
    if (!profile) return;
    const targetId = profile.id || profile.user_id;
    setActionLoadingId(targetId);

    // 2. Retour haptique doux
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([40, 30, 80]); } catch {}
    }

    // 3. Chime sonore de Match
    try {
      if (typeof window !== 'undefined') {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.25); // G5
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch {}

    try {
      // 4. Enregistrement asynchrone du like réciproque & création du match
      const currentUserId = userProfile?.id;
      if (!currentUserId) return;
      if (onLikeProfile) {
        await onLikeProfile(targetId);
      } else {
        await saveLikeToSupabase(currentUserId, String(targetId));
      }

      // 5. Retrait de la liste des likes en attente
      if (onDismissReceivedLike) {
        await onDismissReceivedLike(targetId);
      }

      if (loadSupabaseData) await loadSupabaseData();
      setMatchedProfile(profile);
      if (showToast) showToast(`🎉 C'est un Match avec ${profile.name} !`);
    } catch (err) {
      setMatchedProfile(null);
      if (showToast) showToast('Impossible de confirmer ce match. Réessayez.');
      console.error("Failed to persist match:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Dismiss / Refuse Match Request (Refus du match [ ✕ ])
  const handleDismiss = async (profile: any) => {
    if (!profile) return;
    const senderId = profile.id || profile.user_id;
    setActionLoadingId(senderId);

    try {
      // Haptic feedback
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(30); } catch {}
      }

      if (onDismissReceivedLike) {
        await onDismissReceivedLike(senderId);
      }
      if (showToast) {
        showToast(`Demande de ${profile.name || 'profil'} refusée`);
      }
      if (loadSupabaseData) await loadSupabaseData();
    } catch (err) {
      console.warn("Failed to dismiss like:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Un-like Sent Profile
  const handleUnlike = async (profile: any) => {
    if (!profile) return;
    const targetId = profile.id || profile.user_id;
    setActionLoadingId(targetId);

    try {
      if (onRemoveLike) {
        await onRemoveLike(targetId);
      }
      if (loadSupabaseData) await loadSupabaseData();
    } catch (err) {
      console.warn("Failed to remove like:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="pt-2 sm:pt-4 bg-white relative pb-20 min-h-screen font-sans">
      {/* 1-Day Premium Unlock Modal */}
      {showOneDayPremium && (
        <OneDayPremiumModal 
          onClose={() => setShowOneDayPremium(false)}
        />
      )}

      {/* Bavel Premium Modal (IMG_4262.PNG) - Likes & Admirers unlock */}
      {showPremiumModal && (
        <BavelPremiumModal 
          initialSlideId="likes"
          likesCount={receivedLikesProfiles.length || 1}
          onClose={() => setShowPremiumModal(false)}
          onSubscribe={() => {
            setShowPremiumModal(false);
            if (onActivatePremium) onActivatePremium();
            setShowUnblurredPreview(true);
            if (showToast) showToast('🎉 Bavel Premium activé avec succès !');
          }}
        />
      )}

      {/* Monetization & Feature Modals */}
      {showWantMoreLikes && (
        <WantMoreLikesModal 
          onClose={() => setShowWantMoreLikes(false)} 
          onOpenRecharge={() => {
            setShowWantMoreLikes(false);
            setShowRechargeCredits(true);
          }} 
          userPhotos={userPhotos}
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

      {/* Inspect Profile Modal */}
      {inspectingProfile && (
        <ProfileModal
          profile={inspectingProfile}
          onClose={() => setInspectingProfile(null)}
          isLiked={likedProfiles.some(id => String(id) === String(inspectingProfile.id || inspectingProfile.user_id))}
          onLike={() => {
            handleLikeBack(inspectingProfile);
            setInspectingProfile(null);
          }}
          onMessage={() => {
            if (onOpenChat) onOpenChat(inspectingProfile);
            setInspectingProfile(null);
            onNavigateToTab?.('discussions');
          }}
        />
      )}

      {/* Match Celebration Dialog & Banner */}
      <AnimatePresence>
        {matchedProfile && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.82, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.82, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="bg-gradient-to-b from-neutral-900 via-neutral-900 to-black text-white rounded-[32px] max-w-sm w-full p-6 text-center shadow-2xl relative overflow-hidden border border-white/15"
            >
              {/* Top Banner Tag */}
              <motion.div 
                initial={{ y: -15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-[#e20030] via-rose-500 to-amber-500 text-white px-5 py-2 rounded-full font-black text-[15px] sm:text-[16px] mb-5 shadow-lg tracking-wider uppercase border border-white/20"
              >
                <span>🔥 C'EST UN MATCH !</span>
              </motion.div>

              <h2 className="text-[20px] font-black text-white tracking-tight mb-1">
                Coup de foudre partagé !
              </h2>
              <p className="text-gray-300 text-[13px] font-medium leading-snug mb-6 max-w-[270px] mx-auto">
                Vous et <span className="font-bold text-white underline decoration-rose-500 underline-offset-4">{matchedProfile.name}</span> vous vous plaisez mutuellement.
              </p>

              {/* Dual Avatars with Match Heart */}
              <div className="flex items-center justify-center -space-x-4 mb-7 relative">
                <motion.div 
                  initial={{ x: -30, rotate: -8, opacity: 0 }}
                  animate={{ x: 0, rotate: -4, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring' }}
                  className="w-22 h-22 rounded-full overflow-hidden border-3 border-white shadow-xl bg-gray-800 relative"
                >
                  <img 
                    src={userPhotos[0] || (userProfile?.avatarUrl) || ''} 
                    alt="Vous" 
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <motion.div 
                  initial={{ x: 30, rotate: 8, opacity: 0 }}
                  animate={{ x: 0, rotate: 4, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring' }}
                  className="w-22 h-22 rounded-full overflow-hidden border-3 border-[#e20030] shadow-xl bg-gray-800 relative z-10"
                >
                  <img 
                    src={matchedProfile.img || matchedProfile.avatarUrl || (matchedProfile.photos && matchedProfile.photos[0]) || ''} 
                    alt={matchedProfile.name} 
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-gradient-to-tr from-[#e20030] to-rose-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                  <Heart className="w-4 h-4 text-white fill-white animate-pulse" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col space-y-2.5">
                <button
                  onClick={() => {
                    const target = matchedProfile;
                    setMatchedProfile(null);
                    if (onOpenChat) onOpenChat(target);
                    onNavigateToTab?.('discussions');
                  }}
                  className="w-full bg-gradient-to-r from-[#e20030] to-rose-600 hover:from-[#c9002b] hover:to-rose-700 text-white font-black py-3.5 rounded-full text-[14.5px] shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-transform cursor-pointer border border-white/20"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Envoyer un message</span>
                </button>
                <button
                  onClick={() => setMatchedProfile(null)}
                  className="w-full bg-white/15 hover:bg-white/25 text-white font-bold py-3 rounded-full text-[13.5px] backdrop-blur-md border border-white/15 transition-colors cursor-pointer active:scale-95"
                >
                  Continuer sur les Likes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header text and subtitle */}
      <div className="px-5 pt-4 pb-4">
        <h1 className="text-[26px] font-bold text-black mb-1.5">
          Voici vos Likes
        </h1>
        <p className="text-[15px] text-gray-500 leading-snug pr-2">
          Plus vite vous renvoyez un Like, plus grandes sont vos chances de discuter et de vous rencontrer !
        </p>
      </div>

      {/* Main black button */}
      <div className="px-5 mb-6">
        <button
          type="button"
          onClick={() => setShowPremiumModal(true)}
          className="w-full bg-[#111111] hover:bg-black active:scale-[0.98] text-white font-semibold py-4 rounded-full text-[16px] transition-all cursor-pointer shadow-sm"
        >
          Voir mes Likes
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SOUS-ONGLETS : Tous les Likes 🔒 | Nouveaux Likes 🔒 */}
      {/* ========================================================================= */}
      <div className="flex border-b border-gray-200 px-5 mb-5 space-x-6">
        <button
          onClick={() => {
            setLikesSubTab('all');
          }}
          className={`pb-3 text-[16px] font-semibold relative cursor-pointer flex items-center justify-center space-x-1.5 ${
            likesSubTab === 'all' ? 'text-black' : 'text-gray-500'
          }`}
        >
          <span>Tous les Likes</span>
          {!isPremium && <Lock className="w-3.5 h-3.5 stroke-[2.5]" />}
          {likesSubTab === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
          )}
        </button>

        <button
          onClick={() => {
            setLikesSubTab('new');
            if (!isPremium && !showUnblurredPreview) {
              setShowPremiumModal(true);
            }
          }}
          className={`pb-3 text-[16px] font-semibold relative cursor-pointer flex items-center justify-center space-x-1.5 ${
            likesSubTab === 'new' ? 'text-black' : 'text-gray-500'
          }`}
        >
          <span>Nouveaux Likes</span>
          {!isPremium && <Lock className="w-3.5 h-3.5 stroke-[2.5]" />}
          {likesSubTab === 'new' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black" />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* GRILLE DES PROFILS QUI VOUS ONT LIKÉ (2 COLONNES) */}
      {/* ========================================================================= */}
      <div className="px-4 pb-20">
        {receivedLikesProfiles.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {receivedLikesProfiles.map((p) => (
              <div key={p.id} className="rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white flex flex-col">
                {/* Image */}
                <div 
                  onClick={() => {
                    if (isPremium || showUnblurredPreview) {
                      setInspectingProfile(p.profile);
                      pushNotificationService.triggerProfileViewPush(p.profile.name || p.name, String(p.profile.id || p.id));
                    } else {
                      setShowPremiumModal(true);
                    }
                  }}
                  className="relative flex-1 w-full bg-gray-100 min-h-[120px]"
                >
                  <img 
                    src={p.img} 
                    alt={p.name || 'Admirateur'} 
                    loading="lazy"
                    decoding="async"
                    className={`w-full h-full absolute inset-0 object-cover ${
                      !isPremium && !showUnblurredPreview ? 'filter blur-md scale-110' : ''
                    }`} 
                  />
                </div>
                {/* Bottom Bar */}
                <div className="flex h-7 bg-white divide-x divide-gray-100 shrink-0 border-t border-gray-100">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(p.profile);
                    }}
                    className="flex-1 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100"
                  >
                    <X className="w-5 h-5 text-black" strokeWidth={2} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPremium && !showUnblurredPreview) {
                        setShowPremiumModal(true);
                      } else {
                        handleLikeBack(p.profile);
                      }
                    }}
                    className="flex-1 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100"
                  >
                    <Heart className="w-5 h-5 text-black fill-black" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}

            {/* Promo Card */}
            <div 
              onClick={() => setShowExtraShows(true)}
              className="rounded-xl border border-gray-200 bg-white flex flex-col items-center justify-between p-3 shadow-sm relative min-h-[120px] cursor-pointer hover:border-gray-300 transition-colors"
            >
              {/* Top Right Coins */}
              <div className="absolute top-2 right-2 flex items-center space-x-1">
                <span className="text-[11px] font-semibold text-gray-700">150</span>
                <div className="w-[14px] h-[14px] bg-gray-500 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>

              {/* Center Icon */}
              <div className="w-[40px] h-[40px] bg-[#E8E0FF] rounded-full flex items-center justify-center mt-4 mb-2">
                <Zap className="w-5 h-5 text-black fill-black" strokeWidth={1} />
              </div>

              {/* Text */}
              <p className="text-[11px] text-center text-gray-500 mb-3 px-1 leading-snug">
                Plus de visibilité, 4x plus de Likes.
              </p>

              {/* Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExtraShows(true);
                }}
                className="w-full bg-[#111111] hover:bg-black text-white font-semibold py-2 rounded-full text-[12px] transition-colors cursor-pointer active:scale-95"
              >
                Activer
              </button>
            </div>

            {/* Rest of the profiles */}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-gray-50 rounded-[24px] p-6 border border-gray-100 mt-8">
            <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-3">
              <Heart className="w-6 h-6 text-[#e20030] fill-[#e20030]/20" strokeWidth={1.8} />
            </div>
            <h4 className="text-[15px] font-black text-black mb-1">Aucun like reçu pour le moment</h4>
            <p className="text-[12px] text-gray-500 mb-4 max-w-[240px] mx-auto leading-relaxed">
              Ajoutez de nouvelles photos ou explorez les profils dans l'onglet Rencontres pour déclencher des coups de cœur !
            </p>
            <button 
              onClick={() => onNavigateToTab?.('encounters')}
              className="bg-black text-white text-[12.5px] font-bold px-6 py-2.5 rounded-full shadow-xs active:scale-95 transition-transform cursor-pointer"
            >
              Explorer les profils
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
