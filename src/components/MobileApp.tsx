import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, animate } from 'motion/react';
import { 
  SlidersHorizontal, MapPin, Heart, MessageCircle, MessageCircleMore, User as UserIcon, 
  Settings, HelpCircle, Camera, Zap, Search, Bell, Gauge, Edit3, Mail,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Smile, Plus, Copy, MoreHorizontal, Lock, CheckCircle, Check, X, Star, Shield, Eye, EyeOff, FileText, RotateCcw,
  Navigation, Baby, Target, Ruler, Languages, Wine, Sparkles, Dog, Brain, Flame, Cigarette, GraduationCap, BookOpen, Coffee, Clapperboard, ChevronsUp, Megaphone, Battery, Send,
  Radio, Locate, LocateFixed, RefreshCw, Map, Compass, Image as ImageIcon, Briefcase,
  Phone, Video, Mic, CheckCheck, Gift, Ban, ThumbsUp, ArrowUp, Coins, Volume2, VolumeX, UserX, PhoneOff, MicOff, VideoOff, Play, Pause, Trash2, Hand, Users, Pencil
} from 'lucide-react';
import { LoginScreen } from './auth/LoginScreen';
const googleLogout = () => {
  try {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.disableAutoSelect();
    }
  } catch (e) {}
};
import { SplashScreen } from './auth/SplashScreen';
import { RegisterWizard } from './auth/RegisterWizard';
import { ResetPasswordModal } from './auth/ResetPasswordModal';
import { PhotoAdviceModal } from './modals/PhotoAdviceModal';
import { User } from '../types';
import { EditProfileMenu } from './mobile/profils/EditProfileMenu';
import { ActionMenu, MoodsMenu, ChatActionView, ProfileModal, MatchModal, CoupDeCoeurModal, HeartPiercedIcon, SearchDiscussions, DiscussionsSortMenu, NotificationsView, VoiceNoteBubble, AddMediaSourceMenu, FullProfilePhotoModal, FacebookInfoModal } from './mobile/Modals';
import { ExtraShowsMenu, AllFeaturesModal, WantMoreLikesModal, RechargeCreditsMenu } from './mobile/Monetization';

import { SettingsMenu, HelpCenterMenu, LookingForMenu, ActivityMenu, InvisibleModeMenu, ConfidentialityMenu } from './mobile/SettingsMenu';

import { SafetyCentreMenu, CommunityCharterMenu } from './mobile/SafetyCentreMenu';
const DiscoverTab = React.lazy(() => import('./mobile/discover/DiscoverTab').then((module) => ({ default: module.DiscoverTab })));
const AdminPanel = React.lazy(() => import('./mobile/AdminPanel').then((module) => ({ default: module.AdminPanel })));
import { AdminProtectedRoute } from './RouteGuards';
import { isCompletedProfile } from '../lib/accountStore';
const EncountersTab = React.lazy(() => import('./mobile/rencontres/EncountersTab').then((module) => ({ default: module.EncountersTab })));
const LikesTab = React.lazy(() => import('./mobile/likes/LikesTab').then((module) => ({ default: module.LikesTab })));
const DiscussionsTab = React.lazy(() => import('./mobile/discussions/DiscussionsTab').then((module) => ({ default: module.DiscussionsTab })));
const ProfileTab = React.lazy(() => import('./mobile/profils/ProfileTab').then((module) => ({ default: module.ProfileTab })));
import { initAutoDarkMode } from '../utils/autoDarkMode';
import { aiSystemEngine } from '../services/aiSystemEngine';
import { monetizationService, MonetizationTier, MonetizationPermissions } from '../services/monetizationService';
import { FEATURES_PER_TIER, getTierPrivileges } from '../config/featuresConfig';
import BavelPremiumModal from './modals/BavelPremiumModal';
import { useNotificationContext } from '../context/NotificationContext';
import { supabase, getSupabase, initSupabase, isSupabaseConfigured, syncProfileToSupabase, saveMessageToSupabase, saveLikeToSupabase, removeLikeFromSupabase, dismissReceivedLikeInSupabase, updatePassword, fetchAllProfilesFromSupabase, fetchLikesFromSupabase, fetchReceivedLikesFromSupabase, createMatchInSupabase, fetchMatchesFromSupabase, fetchProfileFromSupabase, fetchMessagesFromSupabase } from '../lib/supabase';
import { authFetch } from '../lib/authFetch';
export const poseImg = '/src/assets/images/pose_verification_reference_1784880975491.jpg';




import { useMobileAppState } from '../hooks/useMobileAppState';
import { useAuth } from '../context/AuthContext';

const FONT_CLASSES = [
  { className: 'text-xs', baseSize: 12 },
  { className: 'text-sm', baseSize: 14 },
  { className: 'text-base', baseSize: 16 },
  { className: 'text-lg', baseSize: 18 },
  { className: 'text-xl', baseSize: 20 },
  { className: 'text-2xl', baseSize: 24 },
  { className: 'text-3xl', baseSize: 30 },
  { className: 'text-4xl', baseSize: 36 },
  { className: 'text-[8px]', baseSize: 8 },
  { className: 'text-[8.5px]', baseSize: 8.5 },
  { className: 'text-[9px]', baseSize: 9 },
  { className: 'text-[9.5px]', baseSize: 9.5 },
  { className: 'text-[10px]', baseSize: 10 },
  { className: 'text-[10.5px]', baseSize: 10.5 },
  { className: 'text-[11px]', baseSize: 11 },
  { className: 'text-[11.5px]', baseSize: 11.5 },
  { className: 'text-[12px]', baseSize: 12 },
  { className: 'text-[12.5px]', baseSize: 12.5 },
  { className: 'text-[13px]', baseSize: 13 },
  { className: 'text-[13.5px]', baseSize: 13.5 },
  { className: 'text-[14px]', baseSize: 14 },
  { className: 'text-[14.5px]', baseSize: 14.5 },
  { className: 'text-[15px]', baseSize: 15 },
  { className: 'text-[15.5px]', baseSize: 15.5 },
  { className: 'text-[16px]', baseSize: 16 },
  { className: 'text-[17px]', baseSize: 17 },
  { className: 'text-[17.5px]', baseSize: 17.5 },
  { className: 'text-[18px]', baseSize: 18 },
  { className: 'text-[19px]', baseSize: 19 },
  { className: 'text-[20px]', baseSize: 20 },
  { className: 'text-[21px]', baseSize: 21 },
  { className: 'text-[22px]', baseSize: 22 },
  { className: 'text-[24px]', baseSize: 24 },
  { className: 'text-[26px]', baseSize: 26 },
  { className: 'text-[28px]', baseSize: 28 },
  { className: 'text-[32px]', baseSize: 32 }
];

const EMPTY_PROFILE = {
  name: '',
  age: 18,
  city: '',
  gender: '',
  job: '',
  studies: '',
  bio: '',
  details: {
    height: '',
    children: '',
    alcohol: '',
    languages: '',
    relation: '',
    sexuality: '',
    smoking: '',
    zodiac: '',
    pets: '',
    religion: '',
    education: '',
    personality: '',
    prompts: []
  },
  keyQuestion: '',
  interests: []
};

const EMPTY_PHOTOS = ['', '', '', '', '', ''];

const getCleanBaseProfile = (prev: any) => {
  if (!prev || !prev.id || prev.id === 'current_user_id' || prev.name === 'Steven') {
    return EMPTY_PROFILE;
  }
  return prev;
};

function StyleBlock({ textScale }: { textScale: number }) {
  const css = FONT_CLASSES.map(({ className, baseSize }) => {
    const selector = className
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\./g, '\\.');
    
    const computedSize = Math.max(9, Math.round(baseSize * textScale * 10) / 10);
    const computedLineHeight = Math.max(12, Math.round(computedSize * 1.35 * 10) / 10);
    
    return `.${selector} { font-size: ${computedSize}px !important; line-height: ${computedLineHeight}px !important; }`;
  }).join('\n');

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export function MobileApp({ user }: { user: User }) {
  const { showSplash, showLogin, setShowLogin, activeTab, setActiveTab } = useMobileAppState();
  const { user: authenticatedUser, profile: authenticatedProfile, loading: authLoading } = useAuth();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => prev === msg ? null : prev);
    }, 2500);
  };
  const processedPaymentReference = useRef<string | null>(null);
  const profileSaveWarningShown = useRef(false);

  useEffect(() => {
    if (!authenticatedUser || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('payment_reference');
    if (!reference || processedPaymentReference.current === reference) return;
    processedPaymentReference.current = reference;
    params.delete('payment_reference');
    const remainingQuery = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`
    );

    let active = true;
    const checkOrder = async () => {
      for (let attempt = 0; attempt < 20 && active; attempt += 1) {
        try {
          const response = await authFetch(`/api/payments/orders/${encodeURIComponent(reference)}`);
          if (response.ok) {
            const payload = await response.json();
            const status = payload?.order?.status;
            if (status === 'paid') {
              const walletRefreshed = await monetizationService.refreshWallet();
              if (active) {
                showToast(
                  walletRefreshed
                    ? 'Paiement confirmé. Vos avantages sont à jour.'
                    : 'Paiement confirmé, mais le portefeuille n’a pas pu être actualisé.'
                );
              }
              return;
            }
            if (status === 'failed' || status === 'cancelled') {
              if (active) showToast('Le paiement n’a pas été confirmé.');
              return;
            }
          } else if (response.status === 404) {
            if (active) showToast('Commande de paiement introuvable.');
            return;
          }
        } catch (error) {
          console.error('Payment confirmation check failed:', error);
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
      if (active) showToast('Paiement en attente de confirmation du prestataire.');
    };

    void checkOrder();
    return () => {
      active = false;
    };
  }, [authenticatedUser]);

  const [textScale, setTextScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('bavel_text_scale');
      return saved ? parseFloat(saved) : 1.0;
    } catch (e) {
      return 1.0;
    }
  });

  useEffect(() => {
    const handleScaleUpdate = () => {
      try {
        const saved = localStorage.getItem('bavel_text_scale');
        if (saved) setTextScale(parseFloat(saved));
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('bavel-text-scale-updated', handleScaleUpdate);
    return () => window.removeEventListener('bavel-text-scale-updated', handleScaleUpdate);
  }, []);

  useEffect(() => {
    const handleBavelNavigate = (e: any) => {
      const target = e.detail;
      if (target === 'swipe' || target === 'encounters' || target === 'rencontres') {
        setActiveTab('encounters');
      } else if (target) {
        setActiveTab(target);
      }
    };
    window.addEventListener('bavel_navigate', handleBavelNavigate);
    return () => window.removeEventListener('bavel_navigate', handleBavelNavigate);
  }, [setActiveTab]);

  const [discoverSubTab, setDiscoverSubTab] = useState<'all' | 'foryou'>('all');

  const handleTextScaleChange = (scale: number) => {
    setTextScale(scale);
    localStorage.setItem('bavel_text_scale', scale.toString());
  };

  const [showRegisterWizard, setShowRegisterWizard] = useState(false);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showPremiumUpsell, setShowPremiumUpsell] = useState(false);
  const [tempRegisterData, setTempRegisterData] = useState<{ name?: string; email?: string; phone?: string }>({});

  useEffect(() => {
    if (!authLoading && authenticatedUser && !authenticatedUser.onboardingCompleted) {
      setTempRegisterData({
        name: authenticatedUser.name || '',
        email: authenticatedUser.email || '',
        phone: authenticatedUser.phone || ''
      });
      setShowLogin(false);
      setShowRegisterWizard(true);
    }
  }, [authLoading, authenticatedUser, authenticatedProfile]);

  const {
    unreadCount: notificationsUnreadCount,
    activeToastNotification,
    dismissToastNotification
  } = useNotificationContext();

  const [activeChat, setActiveChat] = useState<any>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [userMood, setUserMood] = useState<{ emoji: string; label: string }>({
    emoji: '✌️',
    label: 'Plutôt confiant'
  });
  const [userLookingFor, setUserLookingFor] = useState<'serieuse' | 'discuter' | 'rencontres'>('serieuse');
  const [showMoods, setShowMoods] = useState(false);
  const [isMoodsCollapsed, setIsMoodsCollapsed] = useState(false);
  const [genderPreference, setGenderPreference] = useState<'homme' | 'femme' | 'les_deux'>('les_deux');
  const [userStatus, setUserStatus] = useState<MonetizationTier>(() => monetizationService.getUserStatus());
  const [monetizationPermissions, setMonetizationPermissions] = useState<MonetizationPermissions>(() => monetizationService.getPermissions());
  const [isPremium, setIsPremium] = useState<boolean>(() => monetizationService.isPremium());
  const [isExtra, setIsExtra] = useState<boolean>(() => monetizationService.isExtra());

  useEffect(() => {
    const unsubscribe = monetizationService.subscribe(() => {
      const currentTier = monetizationService.getUserStatus();
      setUserStatus(currentTier);
      setIsPremium(monetizationService.isPremium());
      setIsExtra(monetizationService.isExtra());
      setMonetizationPermissions(monetizationService.getPermissions());
    });
    return unsubscribe;
  }, []);

  const handleActivatePremium = () => {
    void monetizationService.refreshWallet();
  };

  // Shared interactive states for 100% prototype completion
  const [likedProfileIds, setLikedProfileIds] = useState<(string | number)[]>([]);

  const [hiddenProfileIds, setHiddenProfileIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('bavel_hidden_profile_ids');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('bavel_hidden_profile_ids', JSON.stringify(hiddenProfileIds));
  }, [hiddenProfileIds]);

  // Initialize native device dark mode + night time detection (19h - 7h)
  useEffect(() => {
    const cleanupDarkMode = initAutoDarkMode();
    return cleanupDarkMode;
  }, []);

  const [dbProfiles, setDbProfiles] = useState<any[]>([]);
  const [receivedLikes, setReceivedLikes] = useState<string[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [unreadLikesCount, setUnreadLikesCount] = useState<number>(0);
  const [receivedLikesTotal, setReceivedLikesTotal] = useState<number>(0);

  // Check today's birthday celebrations automatically
  useEffect(() => {
    if (dbProfiles && dbProfiles.length > 0) {
      aiSystemEngine.checkBirthdayCelebrations(dbProfiles);
    }
  }, [dbProfiles]);

  const [userPhotos, setUserPhotos] = useState<string[]>(EMPTY_PHOTOS);
  const [userProfile, setUserProfile] = useState<any>(() => ({ ...EMPTY_PROFILE }));

  const privileges = useMemo(() => {
    const tier = userProfile?.tier || (isPremium ? 'premium' : (isExtra ? 'extra' : userStatus));
    return getTierPrivileges(tier);
  }, [userProfile?.tier, isPremium, isExtra, userStatus]);

  const isInitialLoadRef = useRef(true);

  const loadSupabaseData = async (isInitial: boolean = false) => {
    // 1. Fetch profiles
    const fetchedProfiles = await fetchAllProfilesFromSupabase();
    const currentProfilesList = fetchedProfiles && fetchedProfiles.length > 0 ? fetchedProfiles : [];
    setDbProfiles(currentProfilesList);

    // 2. Fetch current user id
    const { data: { user: authUser } } = await getSupabase().auth.getUser();
    const currentUserId = authUser?.id;
    if (!currentUserId) return;

    // 3. Fetch the canonical profile from Supabase
    const userProf = await fetchProfileFromSupabase(currentUserId);
    const savedUser = localStorage.getItem('app_user') ? JSON.parse(localStorage.getItem('app_user')!) : null;
    const userEmail = savedUser?.email || authUser.email || userProfile?.email || '';

    const hasSupabaseProfile = userProf && isCompletedProfile(userProf);

    if (hasSupabaseProfile) {
      setUserProfile((prev: any) => {
        const prevClean = getCleanBaseProfile(prev);
        const base = EMPTY_PROFILE;
        const merged = {
          ...base,
          id: userProf.user_id,
          name: userProf.name || prevClean?.name || base.name,
          email: userEmail || userProf.email || prevClean?.email || '',
          age: userProf.age || prevClean?.age || base.age,
          city: userProf.city || prevClean?.city || base.city,
          gender: userProf.gender || prevClean?.gender || base.gender,
          job: userProf.job || prevClean?.job || base.job,
          studies: userProf.studies || prevClean?.studies || base.studies,
          bio: userProf.bio || prevClean?.bio || base.bio,
          details: {
            ...base.details,
            ...(prevClean?.details || {}),
            ...(userProf.details || {}),
            alcohol: userProf.alcohol || prevClean?.details?.alcohol || base.details?.alcohol,
            zodiac: userProf.zodiac || prevClean?.details?.zodiac || base.details?.zodiac,
            pets: userProf.pets || prevClean?.details?.pets || base.details?.pets,
            personality: userProf.personality || prevClean?.details?.personality || base.details?.personality,
          },
          keyQuestion: userProf.key_question || prevClean?.keyQuestion || base.keyQuestion,
          interests: userProf.interests || prevClean?.interests || base.interests,
          onboardingCompleted: true
        };
        return merged;
      });
      if (userProf.photos && userProf.photos.length > 0) {
        const paddedPhotos = [...userProf.photos];
        while (paddedPhotos.length < 6) {
          paddedPhotos.push('');
        }
        setUserPhotos(paddedPhotos);
      }
      setShowRegisterWizard(false);
      setShowLogin(false);
      if (isInitial && isInitialLoadRef.current) {
        setActiveTab('encounters');
        isInitialLoadRef.current = false;
      }
    } else if (currentUserId !== 'current_user_id' && userEmail) {
      // Supabase is the source of truth; a browser cache cannot complete onboarding.
      setTempRegisterData({
        name: savedUser?.name || userProf?.name || '',
        email: userEmail,
        phone: savedUser?.phone || userProf?.phone || ''
      });
      setShowRegisterWizard(true);
      setShowLogin(false);
      setUserProfile((prev: any) => {
        const base = getCleanBaseProfile(prev);
        return {
          ...base,
          id: currentUserId,
          name: savedUser?.name || prev?.name || '',
          email: userEmail,
          isGoogle: !!savedUser?.isGoogle
        };
      });
      setUserPhotos((prev) => {
        if (!prev) {
          return EMPTY_PHOTOS;
        }
        return prev;
      });
    }

    // 5. Fetch likes
    const likesResponse = await authFetch('/api/likes/sent');
    if (likesResponse.ok) {
      const likesPayload = await likesResponse.json();
      setLikedProfileIds(
        Array.isArray(likesPayload.likes)
          ? likesPayload.likes.map((like: any) => String(like.id))
          : []
      );
    }

    // 6. Fetch received likes
    const recLikes = await fetchReceivedLikesFromSupabase(currentUserId);
    if (recLikes) {
      setReceivedLikes(recLikes);
      setReceivedLikesTotal(recLikes.length);
    }

    // 7. Fetch matches & compute discussions
    const matches = await fetchMatchesFromSupabase(currentUserId);
    if (matches && matches.length > 0) {
      const dynamicDiscussions = [];
      for (const m of matches) {
        const matchedProfileId = m.user_id === currentUserId ? m.profile_id : m.user_id;
        // Find profile details
        const prof = currentProfilesList.find((p: any) => p.user_id === matchedProfileId || p.id === matchedProfileId);
        if (prof) {
          // Fetch last message for this match
          const matchId = [currentUserId, matchedProfileId].sort().join('_');
          const msgs = await fetchMessagesFromSupabase(matchId, currentUserId);
          const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : null;
          const unreadCount = msgs ? msgs.filter((m: any) => m.sender_id !== currentUserId && m.is_read === false).length : 0;

          dynamicDiscussions.push({
            id: prof.id,
            user_id: prof.user_id,
            name: prof.name,
            age: prof.age,
            img: prof.img,
            online: prof.online,
            initialMessage: lastMsg ? lastMsg.text : (prof.bio || "Coucou 👋"),
            gender: prof.gender,
            unreadCount
          });
        }
      }
      setDiscussions(dynamicDiscussions);
    } else {
      setDiscussions([]);
    }
  };

  useEffect(() => {
    loadSupabaseData(true);

    const handleSupabaseReady = () => {
      loadSupabaseData(false);
    };
    window.addEventListener('bavel_supabase_ready', handleSupabaseReady);

    // Setup Supabase Realtime for Matches, Likes, Profiles, and Messages
    let matchesChannel: any = null;
    let profilesChannel: any = null;
    let likesChannel: any = null;
    let messagesChannel: any = null;
    let activeClient: any = null;
    
    const setupRealtime = async () => {
      const client = await initSupabase();
      if (!client) return;
      activeClient = client;

      const { data: { user: authUser } } = await client.auth.getUser();
      const currentUserId = authUser?.id;
      if (!currentUserId) return;
      
      matchesChannel = client
        .channel('public:matches')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          () => {
            loadSupabaseData();
          }
        )
        .subscribe();

      profilesChannel = client
        .channel('public:profiles')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => {
            loadSupabaseData();
          }
        )
        .subscribe();

      likesChannel = client
        .channel(`public:likes:${currentUserId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'swipes', filter: `target_id=eq.${currentUserId}` },
          (payload: any) => {
            if (payload.new?.is_liked === true && payload.new.target_id === currentUserId) {
              setUnreadLikesCount((prev) => prev + 1);
            }
            loadSupabaseData();
          }
        )
        .subscribe();

      messagesChannel = client
        .channel('public:messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload: any) => {
            const newMsg = payload.new;
            if (newMsg && newMsg.sender_id !== currentUserId) {
              setDiscussions((prev) => {
                return prev.map((d) => {
                  const matchId = [currentUserId, d.user_id || d.id].sort().join('_');
                  if (newMsg.match_id === matchId) {
                    return {
                      ...d,
                      initialMessage: newMsg.content || newMsg.text || 'Nouveau message',
                      unreadCount: (d.unreadCount || 0) + 1
                    };
                  }
                  return d;
                });
              });
            }
            loadSupabaseData();
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      window.removeEventListener('bavel_supabase_ready', handleSupabaseReady);
      if (activeClient) {
        if (matchesChannel) activeClient.removeChannel(matchesChannel);
        if (profilesChannel) activeClient.removeChannel(profilesChannel);
        if (likesChannel) activeClient.removeChannel(likesChannel);
        if (messagesChannel) activeClient.removeChannel(messagesChannel);
      }
    };
  }, []);

  const totalUnreadCount = discussions.reduce((acc, curr) => acc + (curr.unreadCount || 0), 0);

  const handleTabChange = (tab: string) => {
    if (tab === 'likes') {
      setUnreadLikesCount(0);
    }
    setActiveTab(tab);
    setIsDetailViewOpen(false);
    setIsMoodsCollapsed(false);
  };

  const handleOpenChat = (profile: any) => {
    if (profile && profile.id) {
      setDiscussions((prev) => {
        const alreadyExists = prev.some((d) => d.id === profile.id);
        if (alreadyExists) {
          return prev.map((d) => (d.id === profile.id ? { ...d, unreadCount: 0 } : d));
        } else {
          return [{
            id: profile.id,
            name: profile.name,
            age: profile.age,
            img: profile.img,
            online: profile.online,
            initialMessage: profile.initialMessage || "Coucou 👋",
            gender: profile.gender
          }, ...prev];
        }
      });
    }
    setActiveChat(profile);
  };

  const handleSendBackgroundWave = (profile: any) => {
    if (profile && profile.id) {
      const userMessage = profile.initialMessage || "Coucou ça va ? 👋";
      
      // Envoi du message réel dans Supabase
      (async () => {
        try {
          const savedUser = localStorage.getItem('app_user') ? JSON.parse(localStorage.getItem('app_user')!) : null;
          const currentUserId = savedUser?.id || 'current_user_id';
          const targetId = profile.user_id || profile.id;
          const matchId = [currentUserId, targetId].sort().join('_');

          // Create match in Supabase
          await createMatchInSupabase(currentUserId, targetId);

          // Sauvegarde du message envoyé par l'utilisateur
          await saveMessageToSupabase(matchId, currentUserId, userMessage, true);
          
          loadSupabaseData(); // Refresh UI with real data
        } catch (err) {
          console.warn('Failed to save wave message to Supabase:', err);
        }
      })();
    }
  };

  const handleLikeProfile = async (profileId: string | number) => {
    try {
      const response = await authFetch('/api/encounters/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProfileId: String(profileId), direction: 'like' })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Like non enregistré');
      setLikedProfileIds((prev: number[]) => prev.some(id => String(id) === String(profileId))
        ? prev
        : [...prev, profileId as number]);
      await loadSupabaseData();
      return Boolean(payload?.isMutualMatch);
    } catch (e) {
      console.error("Failed to save like", e);
      return false;
    }
  };

  const handleRemoveLike = async (profileId: string | number) => {
    try {
      const response = await authFetch(`/api/likes/${encodeURIComponent(String(profileId))}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Like non retiré');
      setLikedProfileIds((prev: number[]) => prev.filter((id) => String(id) !== String(profileId)));
      await loadSupabaseData();
      showToast("Like retiré avec succès");
    } catch (e) {
      console.error("Failed to remove like", e);
    }
  };

  const handleDismissReceivedLike = async (senderId: string | number) => {
    try {
      const response = await authFetch(`/api/likes/received/${encodeURIComponent(String(senderId))}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Like reçu non traité');
      setReceivedLikes((prev: string[]) => prev.filter((id) => String(id) !== String(senderId)));
      setReceivedLikesTotal((prev) => Math.max(0, prev - 1));
      await loadSupabaseData();
      showToast("Profil passé");
    } catch (e) {
      console.error("Failed to dismiss received like", e);
    }
  };

  useEffect(() => {
    if (authenticatedUser && userPhotos) {
      localStorage.setItem('bavel_user_photos', JSON.stringify(userPhotos));
    }
  }, [authenticatedUser?.id, userPhotos]);

  useEffect(() => {
    if (
      authenticatedUser &&
      userProfile?.id === authenticatedUser.id &&
      userProfile.name &&
      userProfile.name !== 'Membre' &&
      userProfile.name !== 'Guest'
    ) {
      localStorage.setItem('bavel_user_profile', JSON.stringify(userProfile));
      let active = true;
      void syncProfileToSupabase(userProfile, userPhotos).then((savedProfile) => {
        if (!active) return;
        if (savedProfile) {
          profileSaveWarningShown.current = false;
        } else if (!profileSaveWarningShown.current) {
          profileSaveWarningShown.current = true;
          showToast('La sauvegarde du profil sur le serveur a échoué. Vérifiez votre connexion.');
        }
      }).catch((error) => {
        console.error('Unexpected profile sync failure:', error);
        if (active && !profileSaveWarningShown.current) {
          profileSaveWarningShown.current = true;
          showToast('La sauvegarde du profil sur le serveur a échoué. Vérifiez votre connexion.');
        }
      });
      return () => {
        active = false;
      };
    }
  }, [authenticatedUser?.id, userProfile, userPhotos]);

  useEffect(() => {
    const handleProfileUpdated = () => {
      try {
        const saved = localStorage.getItem('bavel_user_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.id === authenticatedUser?.id) setUserProfile(parsed);
        }
      } catch (err) {
        console.error('Error refreshing profile state:', err);
      }
    };
    window.addEventListener('bavel-profile-updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('bavel-profile-updated', handleProfileUpdated);
    };
  }, []);

  const { user: authUser, userRole, isAdmin, profile: authProfile, photos: authPhotos, logout: authLogout, setProfileData } = useAuth();

  // Sync authContext user/profile to local state when auth resolves
  useEffect(() => {
    if (authUser) {
      setShowLogin(false);
      setShowRegisterWizard(false);

      if (authProfile) {
        setUserProfile(authProfile);
      } else {
        setUserProfile((prev: any) => {
          const base = getCleanBaseProfile(prev);
          return {
            ...base,
            email: authUser.email || base.email,
            name: authUser.name || base.name,
            id: authUser.id
          };
        });
      }

      if (Array.isArray(authPhotos)) {
        setUserPhotos(authPhotos);
      }
    }
  }, [authUser, authProfile, authPhotos]);

  const handleAppLogout = async () => {
    try {
      googleLogout();
    } catch (e) {
      // ignore if googleLogout fails
    }
    await authLogout();
    setShowLogin(true);
    // Don't reload - let the auth state update naturally
  };


  // Real-time listener for Supabase Auth state changes (including Google OAuth redirect)
  useEffect(() => {
    let subscription: any = null;

    const setupAuth = async () => {
      const client = await initSupabase();
      if (!client) return;

      client.auth.getSession().then(({ data: { session } }) => {
        // Avoid auto-login if URL has recovery token
        if (session?.user && !window.location.hash.includes('type=recovery')) {
          setShowLogin(false);
          if (window.location.hash.includes('type=signup')) {
            setShowWelcomeModal(true);
            // Clean the hash to avoid triggering again on refresh
            window.history.replaceState(null, '', window.location.pathname);
          }

          const isGoogle = session.user.app_metadata?.provider === 'google' || 
                           session.user.identities?.some((id: any) => id.provider === 'google') ||
                           session.user.email?.endsWith('@gmail.com');
          const appUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Membre',
            isGoogle: !!isGoogle
          };
          localStorage.setItem('app_user', JSON.stringify(appUser));
          setUserProfile((prev: any) => {
            const base = getCleanBaseProfile(prev);
            return {
              ...base,
              email: session.user.email,
              name: appUser.name,
              id: session.user.id,
              isGoogle: !!isGoogle
            };
          });
          loadSupabaseData();
        }
      });

      const { data } = client.auth.onAuthStateChange((event, session) => {
        // Ignore SIGNED_OUT event to prevent auto-reconnection after logout
        if (event === 'SIGNED_OUT') {
          return;
        }
        if (event === 'PASSWORD_RECOVERY') {
          setShowPasswordRecovery(true);
          setShowLogin(false);
        } else if (event === 'SIGNED_IN' && session?.user && !showPasswordRecovery && !window.location.hash.includes('type=recovery')) {
          setShowLogin(false);
          if (window.location.hash.includes('type=signup')) {
            setShowWelcomeModal(true);
            window.history.replaceState(null, '', window.location.pathname);
          }

          const isGoogle = session.user.app_metadata?.provider === 'google' || 
                           session.user.identities?.some((id: any) => id.provider === 'google') ||
                           session.user.email?.endsWith('@gmail.com');
          const appUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Membre',
            isGoogle: !!isGoogle
          };
          localStorage.setItem('app_user', JSON.stringify(appUser));
          setUserProfile((prev: any) => {
            const base = getCleanBaseProfile(prev);
            return {
              ...base,
              email: session.user.email,
              name: appUser.name,
              id: session.user.id,
              isGoogle: !!isGoogle
            };
          });
          loadSupabaseData();
        }
      });
      subscription = data.subscription;
    };

    setupAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [showPasswordRecovery]);

  const [showGlobalEditProfile, setShowGlobalEditProfile] = useState(false);

  // Swipe between main bottom tabs (left / right)
  const tabs = ['discover', 'encounters', 'likes', 'discussions', 'profile'];
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Disable horizontal tab swiping when in encounters or discover to preserve card swipe gestures
    if (activeTab === 'encounters' || activeTab === 'discover') return;
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (activeTab === 'encounters' || activeTab === 'discover') {
      setTouchStartX(null);
      return;
    }
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX;
    if (Math.abs(diffX) > 90) {
      const currentIndex = tabs.indexOf(activeTab);
      if (diffX < 0 && currentIndex < tabs.length - 1) {
        // Swipe left -> Next tab
        setActiveTab(tabs[currentIndex + 1]);
      } else if (diffX > 0 && currentIndex > 0) {
        // Swipe right -> Previous tab
        setActiveTab(tabs[currentIndex - 1]);
      }
    }
    setTouchStartX(null);
  };

  if (showSplash) {
    return (
      <>
        <StyleBlock textScale={textScale} />
        <SplashScreen />
      </>
    );
  }

  if (showPasswordRecovery) {
    return (
      <>
        <StyleBlock textScale={textScale} />
        <ResetPasswordModal 
          onComplete={() => {
            setShowPasswordRecovery(false);
            setShowLogin(true);
          }}
        />
      </>
    );
  }

  if (showWelcomeModal) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 z-[9999] font-sans">
        <StyleBlock textScale={textScale} />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[340px] bg-gradient-to-b from-[#1a0836] to-[#0d021c] p-6 rounded-[28px] shadow-2xl border border-white/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Félicitations !</h2>
            <p className="text-white/70 mb-6 text-sm leading-relaxed">
              Votre adresse <strong>{userProfile?.email}</strong> a bien été confirmée.<br/><br/>
              Votre compte est maintenant actif. Vous pouvez commencer à utiliser l'application et faire de belles rencontres.
            </p>
            <button 
              onClick={() => {
                setShowWelcomeModal(false);
                // Optionally show register wizard if profile is incomplete
                if (!isCompletedProfile(userProfile)) {
                  setTempRegisterData({ email: userProfile?.email || '' });
                  setShowRegisterWizard(true);
                } else {
                  setActiveTab('discover');
                }
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-[15px] bg-white text-black shadow-lg"
            >
              Continuer sur l'application
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showRegisterWizard) {
    return (
      <>
        <StyleBlock textScale={textScale} />
        <RegisterWizard 
          initialName={tempRegisterData.name || ''}
          initialEmail={tempRegisterData.email || ''}
          initialPhone={tempRegisterData.phone || ''}
          onComplete={async (finalData) => {
            const base = EMPTY_PROFILE;
            const { data: { user: authUser } } = await getSupabase().auth.getUser();
            if (!authUser) {
              showToast('Session expirée. Reconnectez-vous.');
              return;
            }
            
            const finalPhotos = finalData.photos && finalData.photos.length > 0 ? finalData.photos : [];
            const paddedPhotos = [...finalPhotos];
            while (paddedPhotos.length < 6) {
              paddedPhotos.push('');
            }
            setUserPhotos(paddedPhotos);

            const userEmail = finalData.email || tempRegisterData.email || userProfile.email || '';
            const completedProfile = {
              ...base,
              id: authUser.id,
              name: finalData.name,
              gender: finalData.gender.toLowerCase(),
              birthday: finalData.birthday,
              email: userEmail,
              phone: finalData.phone || tempRegisterData.phone || '',
              purpose: finalData.purpose || '',
              city: finalData.city || '',
              location: finalData.location || finalData.city || '',
              country: finalData.country || '',
              countryCode: finalData.countryCode || '',
              locationSource: finalData.locationSource || 'manual',
              latitude: finalData.latitude,
              longitude: finalData.longitude,
              bio: finalData.bio || '',
              height: finalData.height || '',
              school: finalData.school || '',
              studies: finalData.school || '',
              jobTitle: finalData.jobTitle || '',
              company: finalData.company || '',
              job: finalData.jobTitle ? (finalData.company ? `${finalData.jobTitle} chez ${finalData.company}` : finalData.jobTitle) : '',
              drinking: finalData.drinking || '',
              smoking: finalData.smoking || '',
              kids: finalData.kids || '',
              educationLevel: finalData.educationLevel || '',
              personality: finalData.personality || '',
              interests: finalData.interests || [],
              pets: finalData.pets || '',
              starSign: finalData.starSign || '',
              religion: finalData.religion || '',
              details: {
                ...base.details,
                relation: finalData.relationshipStatus || finalData.purpose || '',
                sexuality: finalData.sexualOrientation || '',
                orientation: finalData.sexualOrientation || '',
                alcohol: finalData.drinking || '',
                smoking: finalData.smoking || '',
                children: finalData.kids || '',
                education: finalData.educationLevel || '',
                personality: finalData.personality || '',
                pets: finalData.pets || '',
                zodiac: finalData.starSign || '',
                religion: finalData.religion || '',
                height: finalData.height || ''
              },
              age: (() => {
                if (!finalData.birthday) return 18;
                const today = new Date();
                const birthDate = new Date(finalData.birthday);
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                  age--;
                }
                return age;
              })()
            };

            setUserProfile(completedProfile);
            setProfileData(completedProfile, paddedPhotos);
            try {
              localStorage.setItem('bavel_user_profile', JSON.stringify(completedProfile));
              localStorage.setItem('bavel_user_photos', JSON.stringify(paddedPhotos));
              const savedUser = localStorage.getItem('app_user') ? JSON.parse(localStorage.getItem('app_user')!) : {};
              savedUser.email = userEmail;
              savedUser.name = finalData.name;
              savedUser.onboardingCompleted = true;
              localStorage.setItem('app_user', JSON.stringify(savedUser));
            } catch (e) {
              console.error(e);
            }
            setShowRegisterWizard(false);
            setShowLogin(false);
            setActiveTab('encounters');

          }}
          onBack={() => {
            setShowRegisterWizard(false);
            setShowLogin(true);
          }}
        />
      </>
    );
  }

  if (showLogin) {
    return (
      <>
        <StyleBlock textScale={textScale} />
        <LoginScreen 
          onLoginSuccess={(userData) => {
            const userEmail = userData?.email || '';
            const activeProfile = userData?.savedProfile || null;
            const activePhotos = userData?.savedPhotos || null;

            if (userData?.name || userEmail || userData?.phone) {
              const savedUser = localStorage.getItem('app_user') ? JSON.parse(localStorage.getItem('app_user')!) : {};
              if (userData.isGoogle) {
                savedUser.isGoogle = true;
              }
              if (userData.name) savedUser.name = userData.name;
              if (userEmail) savedUser.email = userEmail;
              if (userData.phone) savedUser.phone = userData.phone;
              if (activeProfile || !userData.isNewUser) {
                savedUser.onboardingCompleted = true;
              }
              localStorage.setItem('app_user', JSON.stringify(savedUser));
            }

            if (activeProfile || !userData?.isNewUser) {
              const profToUse = activeProfile || {
                ...EMPTY_PROFILE,
                name: userData?.name || 'Membre',
                email: userEmail,
                onboardingCompleted: true
              };
              setUserProfile(profToUse);
              if (activePhotos && activePhotos.length > 0) {
                setUserPhotos(activePhotos);
                setProfileData(profToUse, activePhotos);
              } else {
                setProfileData(profToUse);
              }
              setShowRegisterWizard(false);
              setShowLogin(false);
              setActiveTab('encounters');
              loadSupabaseData(); // Ensure fresh data is fetched

            } else if (userData?.isNewUser) {
              // Asynchronously verify with Supabase just in case it's a server restart issue
              const checkSupabaseProfile = async () => {
                const savedUser = localStorage.getItem('app_user') ? JSON.parse(localStorage.getItem('app_user')!) : null;
                const userId = savedUser?.id || 'current_user_id';
                const userProf = await fetchProfileFromSupabase(userId);
                
                if (userProf && isCompletedProfile(userProf)) {
                  // They actually have a profile!
                  savedUser.onboardingCompleted = true;
                  localStorage.setItem('app_user', JSON.stringify(savedUser));
                  
                  setUserProfile(userProf);
                  if (userProf.photos && userProf.photos.length > 0) {
                    const paddedPhotos = [...userProf.photos];
                    while (paddedPhotos.length < 6) paddedPhotos.push('');
                    setUserPhotos(paddedPhotos);
                  }
                  
                  setShowRegisterWizard(false);
                  setShowLogin(false);
                  setActiveTab('encounters');
                  loadSupabaseData();
                } else {
                  // Truly a new user
                  setTempRegisterData({
                    name: userData?.name || '',
                    email: userEmail,
                    phone: userData?.phone || ''
                  });
                  setShowRegisterWizard(true);
                  setShowLogin(false);
                }
              };
              
              checkSupabaseProfile();
            } else {
              loadSupabaseData();
            }
          }} 
          onRegisterStart={(userData) => {
            setTempRegisterData(userData);
            setShowRegisterWizard(true);
            setShowLogin(false);
          }}
        />
      </>
    );
  }

  const activeProfiles = dbProfiles.filter(p => !p.isSuspended);

  return (
    <>
      <StyleBlock textScale={textScale} />
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="bavel-app-shell flex flex-col bg-white text-black font-sans overflow-hidden w-full h-[100dvh] md:w-[390px] md:h-[calc(100vh-2rem)] md:max-h-[844px] md:rounded-[40px] md:shadow-2xl md:mx-auto md:my-auto md:mt-4 relative border-x-0 md:border-[8px] md:border-gray-900 shrink-0 select-none mobile-scale"
    >
      <div className={`min-h-0 flex-1 ${activeTab === 'encounters' ? 'overflow-hidden pb-[calc(76px+env(safe-area-inset-bottom))]' : 'overflow-y-auto pb-[calc(88px+env(safe-area-inset-bottom))]'} scrollbar-hide relative`}>
        {toastMessage && (
          <div className="absolute top-[80px] left-4 right-4 bg-[#1a1a1a]/95 backdrop-blur-xs text-white px-3 py-2.5 rounded-xl shadow-lg z-[150] flex items-center space-x-2 text-[12px] font-bold">
            <span>{toastMessage}</span>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="h-full transform-gpu smooth-gpu"
          >
            <React.Suspense fallback={<div className="flex h-full min-h-[200px] items-center justify-center text-sm text-gray-500">Chargement...</div>}>
            {activeTab === 'discover' && (
              <DiscoverTab 
                currentUserProfile={userProfile}
                userMood={userMood} 
                onOpenMoods={() => setShowMoods(true)} 
                onNavigateToTab={setActiveTab}
                setActiveChat={handleOpenChat}
                genderPreference={genderPreference}
                setGenderPreference={setGenderPreference}
                likedProfiles={likedProfileIds}
                setLikedProfiles={setLikedProfileIds}
                onLikeProfile={handleLikeProfile}
                hiddenProfiles={hiddenProfileIds}
                setHiddenProfiles={setHiddenProfileIds}
                userPhotos={userPhotos}
                onSendBackgroundWave={handleSendBackgroundWave}
                profiles={activeProfiles}
                onDetailToggle={setIsDetailViewOpen}
                onScrollStateChange={setIsMoodsCollapsed}
                onSubTabChange={setDiscoverSubTab}
              />
            )}
            {activeTab === 'encounters' && (
              <EncountersTab 
                onNavigateToTab={setActiveTab} 
                genderPreference={genderPreference}
                setGenderPreference={setGenderPreference}
                likedProfiles={likedProfileIds}
                setLikedProfiles={setLikedProfileIds}
                onLikeProfile={handleLikeProfile}
                setActiveChat={handleOpenChat}
                discussions={discussions}
                setDiscussions={setDiscussions}
                userLookingFor={userLookingFor}
                isPremium={isPremium}
                onActivatePremium={handleActivatePremium}
                profiles={activeProfiles}
                receivedLikes={receivedLikes}
                userProfile={userProfile}
                loadSupabaseData={loadSupabaseData}
              />
            )}
            {activeTab === 'likes' && (
              <LikesTab 
                onNavigateToTab={handleTabChange} 
                likedProfiles={likedProfileIds}
                discussions={discussions}
                userPhotos={userPhotos}
                unreadLikesCount={unreadLikesCount}
                receivedLikesTotal={receivedLikesTotal}
                dbProfiles={dbProfiles}
                receivedLikes={receivedLikes}
                userProfile={userProfile}
                showToast={showToast}
                loadSupabaseData={loadSupabaseData}
                onLikeProfile={handleLikeProfile}
                onRemoveLike={handleRemoveLike}
                onDismissReceivedLike={handleDismissReceivedLike}
                onOpenChat={handleOpenChat}
                isPremium={isPremium}
                onActivatePremium={handleActivatePremium}
              />
            )}
            {activeTab === 'discussions' && (
              <DiscussionsTab 
                userId={userProfile?.id || 'current_user_id'}
                onNavigateToTab={setActiveTab} 
                activeChat={activeChat}
                setActiveChat={handleOpenChat}
                discussions={discussions}
                setDiscussions={setDiscussions}
                receivedLikesCount={receivedLikesTotal}
                isPremium={isPremium}
                onActivatePremium={handleActivatePremium}
              />
            )}
            {activeTab === 'profile' && (
              <ProfileTab 
                userMood={userMood} 
                onOpenMoods={() => setShowMoods(true)} 
                userLookingFor={userLookingFor}
                setUserLookingFor={setUserLookingFor}
                userPhotos={userPhotos}
                setUserPhotos={setUserPhotos}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                onLogout={handleAppLogout}
                textScale={textScale}
                onChangeTextScale={handleTextScaleChange}
                onOpenAdmin={() => {
                  const isUserAdmin = Boolean(
                    isAdmin || 
                    userRole === 'admin' || 
                    authUser?.role === 'admin' || 
                    authUser?.isAdmin === true || 
                    isAdmin
                  );
                  if (isUserAdmin) {
                    setShowAdminPanel(true);
                  }
                }}
              />
            )}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showMoods && (
          <MoodsMenu 
            onClose={() => setShowMoods(false)} 
            currentMood={userMood}
            onSelectMood={(m) => setUserMood(m)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminPanel && (
          <React.Suspense fallback={null}>
          <AdminPanel 
            profiles={dbProfiles} 
            onClose={() => setShowAdminPanel(false)} 
            onForceRefresh={loadSupabaseData} 
            onUpdateProfiles={setDbProfiles}
            messages={discussions}
            matches={discussions}
          />
          </React.Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGlobalEditProfile && (
          <EditProfileMenu 
            onClose={() => setShowGlobalEditProfile(false)} 
            userPhotos={userPhotos} 
            setUserPhotos={setUserPhotos} 
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            userMood={userMood}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTab === 'discover' && discoverSubTab !== 'foryou' && !showGlobalEditProfile && !showAdminPanel && !showMoods && !isDetailViewOpen && (
          <motion.button 
            layout
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.06, y: -1 }}
            whileTap={{ scale: 0.95, y: 0 }}
            onClick={() => setShowMoods(true)} 
            transition={{ type: 'spring', damping: 22, stiffness: 400 }}
            className={`absolute bottom-[88px] right-4 h-11 bg-white/95 backdrop-blur-xl text-slate-900 rounded-full flex items-center shadow-[0_8px_25px_rgba(124,58,237,0.25)] border border-purple-200/90 z-40 active:bg-purple-50 overflow-hidden touch-manipulation cursor-pointer group select-none transform-gpu ${
              isMoodsCollapsed ? 'w-11 justify-center px-0' : 'px-2.5 space-x-2'
            }`}
            title="Changer mon humeur"
          >
            {/* Glow accent */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none rounded-full" />

            {/* Emoji Badge inside */}
            <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-xs shrink-0 z-10">
              <span className="text-[15px] leading-none select-none filter drop-shadow-xs">
                {userMood ? userMood.emoji : '😌'}
              </span>
            </div>

            <AnimatePresence initial={false}>
              {!isMoodsCollapsed && (
                <motion.span 
                  initial={{ opacity: 0, x: -4, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 'auto' }}
                  exit={{ opacity: 0, x: -4, width: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="z-10 font-black text-[13px] tracking-tight text-purple-950 whitespace-nowrap pr-1 block overflow-hidden"
                >
                  Moods
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Real-time In-App Push Notification Banner with Framer Motion Bounce */}
      <AnimatePresence>
        {activeToastNotification && (
          <motion.div
            initial={{ y: -90, opacity: 0, scale: 0.85, rotateX: 15 }}
            animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ y: -90, opacity: 0, scale: 0.85 }}
            transition={{
              type: "spring",
              stiffness: 520,
              damping: 20,
              mass: 0.8,
              bounce: 0.5
            }}
            drag="y"
            dragConstraints={{ top: -90, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -25) {
                dismissToastNotification();
              }
            }}
            onClick={() => {
              if (activeToastNotification.type === 'message' || activeToastNotification.type === 'match') {
                setActiveTab('discussions');
              } else if (activeToastNotification.type === 'like' || activeToastNotification.type === 'coup_de_coeur') {
                setActiveTab('likes');
              }
              dismissToastNotification();
            }}
            className="absolute top-4 inset-x-3 z-[300] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-purple-200/50 dark:border-purple-900/40 rounded-2xl p-3 shadow-[0_16px_40px_rgba(124,58,237,0.22)] cursor-pointer flex items-center gap-3 active:scale-[0.98] transition-all"
          >
            <div className="relative shrink-0">
              {activeToastNotification.senderAvatar ? (
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ repeat: 2, duration: 0.8 }}
                    className="absolute -inset-1 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 opacity-60 blur-xs"
                  />
                  <img 
                    src={activeToastNotification.senderAvatar} 
                    alt="" 
                    className="relative w-11 h-11 rounded-full object-cover shrink-0 border border-white dark:border-neutral-800 shadow-md" 
                  />
                </div>
              ) : (
                <motion.div 
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-purple-500/30"
                >
                  <Sparkles className="w-5 h-5 fill-white/30" />
                </motion.div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <h4 className="text-[13.5px] font-extrabold text-gray-900 dark:text-white truncate">
                  {activeToastNotification.title}
                </h4>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-purple-100 dark:bg-purple-900/40 px-1.5 py-0.2 rounded-full shrink-0 ml-1">
                  À l'instant
                </span>
              </div>
              <p className="text-[12px] text-gray-600 dark:text-gray-300 truncate leading-snug font-medium">
                {activeToastNotification.body}
              </p>
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); dismissToastNotification(); }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full shrink-0 transition-colors"
              aria-label="Fermer la notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPremiumUpsell && (
          <BavelPremiumModal
            onClose={() => setShowPremiumUpsell(false)}
            onSubscribe={() => {
              setShowPremiumUpsell(false);
              handleActivatePremium();
            }}
          />
        )}
      </AnimatePresence>

      {/* Bannière de publicité affichée uniquement pour le niveau freemium (!privileges.noAds) */}
      {!privileges.noAds && (
        <div id="ads-banner" className="ads-banner mx-2 mb-1 px-3 py-1.5 bg-neutral-900/90 text-neutral-300 text-[11px] rounded-xl flex items-center justify-between border border-neutral-700/50 shrink-0 z-30">
          <div className="flex items-center gap-1.5 truncate">
            <span className="bg-amber-400/20 text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Pub</span>
            <span className="truncate text-neutral-300 text-[11px]">Publicité - Passez Extra ou Premium pour la retirer</span>
          </div>
          <button 
            onClick={() => setShowPremiumUpsell(true)}
            className="text-amber-400 hover:text-amber-300 font-bold whitespace-nowrap text-[11px] ml-2 underline cursor-pointer"
          >
            Retirer
          </button>
        </div>
      )}

      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        unreadCount={totalUnreadCount} 
        unreadLikesCount={unreadLikesCount} 
      />

      <div id="mobile-modal-root" className="absolute inset-0 pointer-events-none z-[150]" />
    </motion.div>
    </>
  );
}




function BottomNav({ 
  activeTab, 
  setActiveTab, 
  unreadCount = 0, 
  unreadLikesCount = 0 
}: { 
  activeTab: string, 
  setActiveTab: (t: string) => void, 
  unreadCount?: number, 
  unreadLikesCount?: number 
}) {
  const tabs = [
    { 
      id: 'discover', 
      label: 'À découvrir', 
      icon: MapPin,
      gradient: 'from-[#9c1f35] via-rose-600 to-fuchsia-600',
      activeShadow: 'shadow-[0_10px_22px_-4px_rgba(156,31,53,0.42),0_4px_10px_-2px_rgba(225,29,72,0.25)]',
      accentColor: 'text-[#9c1f35]'
    },
    { 
      id: 'encounters', 
      label: 'Rencontres', 
      icon: Flame,
      gradient: 'from-[#9c1f35] via-rose-600 to-fuchsia-600',
      activeShadow: 'shadow-[0_10px_22px_-4px_rgba(156,31,53,0.42),0_4px_10px_-2px_rgba(225,29,72,0.25)]',
      accentColor: 'text-[#9c1f35]'
    },
    { 
      id: 'likes', 
      label: 'Likes', 
      icon: Heart,
      gradient: 'from-[#9c1f35] via-rose-600 to-fuchsia-600',
      activeShadow: 'shadow-[0_10px_22px_-4px_rgba(156,31,53,0.42),0_4px_10px_-2px_rgba(225,29,72,0.25)]',
      accentColor: 'text-[#9c1f35]'
    },
    { 
      id: 'discussions', 
      label: 'Discussions', 
      icon: MessageCircle,
      gradient: 'from-[#9c1f35] via-rose-600 to-fuchsia-600',
      activeShadow: 'shadow-[0_10px_22px_-4px_rgba(156,31,53,0.42),0_4px_10px_-2px_rgba(225,29,72,0.25)]',
      accentColor: 'text-[#9c1f35]'
    },
    { 
      id: 'profile', 
      label: 'Profils', 
      icon: UserIcon,
      gradient: 'from-[#9c1f35] via-rose-600 to-fuchsia-600',
      activeShadow: 'shadow-[0_10px_22px_-4px_rgba(156,31,53,0.42),0_4px_10px_-2px_rgba(225,29,72,0.25)]',
      accentColor: 'text-[#9c1f35]'
    }
  ];

  return (
    <nav aria-label="Navigation principale" className="bavel-bottom-nav absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-200/80 px-1 sm:px-2 pt-1 flex justify-between items-center z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button 
            key={tab.id}
            whileTap={{ scale: 0.88 }}
            onClick={() => setActiveTab(tab.id)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            className="flex-1 flex flex-col items-center justify-center relative group cursor-pointer select-none py-0.5"
          >
            {/* 3D Glass/Clay Pod Container */}
            <div className="relative mb-0.5 flex items-center justify-center">
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
                className={`relative w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-[12px] sm:rounded-[14px] flex items-center justify-center transition-all duration-300 overflow-hidden ${
                  isActive 
                    ? `bg-gradient-to-b ${tab.gradient} ${tab.activeShadow} border border-white/40 ring-1 ring-black/5` 
                    : 'bg-slate-100/90 border border-slate-200/60 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.9),0_2px_5px_rgba(0,0,0,0.03)] group-hover:bg-slate-200/80'
                }`}
              >
                {/* 3D Specular Highlight Line on Active Pod */}
                {isActive && (
                  <>
                    <div className="absolute inset-x-1.5 top-0.5 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent rounded-full z-20 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/20 pointer-events-none z-10" />
                  </>
                )}

                {/* Animated 3D Icon */}
                <motion.div
                  animate={{ scale: isActive ? 1.05 : 1, y: isActive ? -0.5 : 0 }}
                  transition={{ type: "spring", stiffness: 450, damping: 22 }}
                  className="relative z-20 flex items-center justify-center"
                >
                  <Icon 
                    className={`w-[17px] h-[17px] sm:w-[19px] sm:h-[19px] transition-all duration-200 ${
                      isActive 
                        ? 'text-white fill-white/20 filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]' 
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`} 
                    strokeWidth={isActive ? 2.5 : 2.0}
                  />
                </motion.div>
              </motion.div>

              {/* Unread Badge for Discussions */}
              {tab.id === 'discussions' && unreadCount > 0 && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="absolute -top-1 -right-1 bg-gradient-to-b from-rose-500 to-pink-600 text-white font-black text-[8px] sm:text-[9px] min-w-[15px] h-[15px] sm:min-w-[17px] sm:h-[17px] px-1 rounded-full flex items-center justify-center border-1.5 border-white shadow-[0_4px_10px_rgba(244,63,94,0.5)] z-30"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.div>
              )}

              {/* Unread Badge for Likes */}
              {tab.id === 'likes' && unreadLikesCount > 0 && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="absolute -top-1 -right-1 bg-gradient-to-b from-rose-500 to-pink-600 text-white font-black text-[8px] sm:text-[9px] min-w-[15px] h-[15px] sm:min-w-[17px] sm:h-[17px] px-1 rounded-full flex items-center justify-center border-1.5 border-white shadow-[0_4px_10px_rgba(244,63,94,0.5)] z-30"
                >
                  {unreadLikesCount > 99 ? '99+' : unreadLikesCount}
                </motion.div>
              )}
            </div>
            
            {/* Label with dynamic active color */}
            <span 
              className={`text-[8.5px] sm:text-[9.5px] font-black tracking-tight whitespace-nowrap leading-none transition-all duration-200 ${
                isActive ? `${tab.accentColor} scale-102` : 'text-slate-400 font-bold group-hover:text-slate-600'
              }`}
            >
              {tab.label}
            </span>
          </motion.button>
        )
      })}
    </nav>
  );
}
