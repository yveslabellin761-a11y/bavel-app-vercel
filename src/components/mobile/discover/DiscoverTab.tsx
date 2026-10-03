import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SlidersHorizontal, MapPin, Heart, MessageCircle, MessageCircleMore, User as UserIcon, 
  Settings, HelpCircle, Camera, Zap, Search, Bell, Gauge, Edit3, Mail,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Smile, Plus, Copy, MoreHorizontal, MoreVertical, Lock, CheckCircle, Check, X, Star, Shield, Eye, EyeOff, FileText, RotateCcw,
  Navigation, Baby, Target, Ruler, Languages, Wine, Sparkles, Dog, Brain, Flame, Cigarette, GraduationCap, BookOpen, Coffee, Clapperboard, ChevronsUp, Megaphone, Battery, Send,
  Radio, Locate, LocateFixed, RefreshCw, Map, Compass, Image as ImageIcon, Briefcase,
  Phone, Video, Mic, CheckCheck, Gift, Ban, ThumbsUp, ArrowUp, Coins, Volume2, VolumeX, UserX, PhoneOff, MicOff, VideoOff, Play, Pause, Trash2, Hand, Users, Pencil
} from 'lucide-react';
import { User } from '../../../types';
import { ActionMenu } from '../Modals';
import { ConfidentialityMenu } from '../SettingsMenu';

import { MoodsMenu, ChatActionView, ProfileModal, AiVibeCheckModal } from '../Modals';
import { ExtraShowsMenu, WantMoreLikesModal, RechargeCreditsMenu } from '../Monetization';
import { DiscoverFiltersMenu } from './DiscoverFilters';
import { LazyBlurImage } from '../ui/LazyBlurImage';
import { GeoRadarView } from '../../../features/geolocation/GeoRadarView';
import { BadooLiveModal } from '../../../features/live/BadooLiveModal';
import { pushNotificationService } from '../../../services/push/pushNotificationService';
import { useHeartBurst, HeartParticleBurstOverlay } from '../ui/HeartParticleBurst';
import { authFetch } from '../../../lib/authFetch';
import { addFavorite } from '../../../services/advancedService';

function getProfileDetail(profile: any, key: string, legacyMatcher?: (value: string) => boolean): string | undefined {
  const details = profile?.details;
  if (details && !Array.isArray(details) && typeof details[key] === 'string') return details[key];
  if (Array.isArray(details) && legacyMatcher) {
    return details.find((value: unknown): value is string =>
      typeof value === 'string' && legacyMatcher(value)
    );
  }
  return undefined;
}

export function DiscoverTab({ 
  currentUserProfile,
  userMood, 
  onOpenMoods,
  onNavigateToTab,
  setActiveChat,
  genderPreference = 'les_deux',
  setGenderPreference,
  likedProfiles: propLikedProfiles,
  setLikedProfiles: propLikedProfilesSetter,
  hiddenProfiles = [],
  setHiddenProfiles = () => {},
  userPhotos = [],
  onSendBackgroundWave,
  profiles = [],
  onDetailToggle,
  onLikeProfile,
  onScrollStateChange,
  onSubTabChange
}: { 
  currentUserProfile?: User;
  userMood?: { emoji: string; label: string } | null; 
  onOpenMoods?: () => void;
  onNavigateToTab?: (tab: string) => void;
  setActiveChat?: (profile: any) => void;
  genderPreference?: 'homme' | 'femme' | 'les_deux';
  setGenderPreference?: (pref: 'homme' | 'femme' | 'les_deux') => void;
  likedProfiles?: (string | number)[];
  setLikedProfiles?: React.Dispatch<React.SetStateAction<(string | number)[]>> | ((ids: (string | number)[]) => void);
  hiddenProfiles?: number[];
  setHiddenProfiles?: React.Dispatch<React.SetStateAction<number[]>> | ((ids: number[]) => void);
  userPhotos?: string[];
  onSendBackgroundWave?: (profile: any) => void;
  profiles?: any[];
  onDetailToggle?: (isOpen: boolean) => void;
  onLikeProfile?: (id: string | number) => Promise<boolean | undefined>;
  onScrollStateChange?: (isScrolledDown: boolean) => void;
  onSubTabChange?: (subTab: 'all' | 'foryou') => void;
}) {
  const [subTab, setSubTab] = useState<'all' | 'foryou'>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const { bursts, triggerBurst } = useHeartBurst();

  // Geolocation Choice State (memorized in localStorage)
  const [geoChoice, setGeoChoice] = useState<'granted' | 'dismissed' | null>(() => {
    try {
      return (localStorage.getItem('bavel_geolocation_choice') as 'granted' | 'dismissed') || null;
    } catch {
      return null;
    }
  });

  const handleAuthorizeLocation = () => {
    try {
      localStorage.setItem('bavel_geolocation_choice', 'granted');
    } catch {}
    setGeoChoice('granted');
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setToastMsg("📍 Géolocalisation activée");
          setTimeout(() => setToastMsg(null), 3000);
        },
        () => {
          setToastMsg("📍 Géolocalisation enregistrée");
          setTimeout(() => setToastMsg(null), 3000);
        },
        { timeout: 5000 }
      );
    }
  };

  const handleDismissLocation = () => {
    try {
      localStorage.setItem('bavel_geolocation_choice', 'dismissed');
    } catch {}
    setGeoChoice('dismissed');
  };

  // Lookalikes & 3D Liveness State Hooks
  const [selectedCelebrity, setSelectedCelebrity] = useState<string | null>(null);
  const [customCelebrityPhoto, setCustomCelebrityPhoto] = useState<string | null>(null);
  const [lookalikeScanning, setLookalikeScanning] = useState(false);
  const [lookalikeScanProgress, setLookalikeScanProgress] = useState(0);
  const [lookalikeResults, setLookalikeResults] = useState<any[]>([]);

  const [livenessActive, setLivenessActive] = useState(false);
  const [livenessStep, setLivenessStep] = useState<'blink' | 'smile' | 'turn_left'>('blink');
  const [livenessStatus, setLivenessStatus] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [livenessScanProgress, setLivenessScanProgress] = useState(0);

  useEffect(() => {
    if (onSubTabChange) {
      onSubTabChange(subTab);
    }
  }, [subTab, onSubTabChange]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'tous' | 'en_ligne' | 'nouveau'>('tous');
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 80]);
  const [advancedFilters, setAdvancedFilters] = useState<any>({});
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [profileInActionMenu, setProfileInActionMenu] = useState<any>(null);
  const [showExtraShows, setShowExtraShows] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [aiVibeProfile, setAiVibeProfile] = useState<any>(null);

  // Badoo Official Modules Modal States
  const [showRadarModal, setShowRadarModal] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);

  // Meilisearch / Elasticsearch Dynamic Faceted Search & Infinite Scroll States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFacet, setActiveFacet] = useState<'all' | 'online' | 'new' | 'nearby' | 'popular' | 'common_interests'>('all');
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite Scroll Trigger via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 12);
        }
      },
      { rootMargin: '200px', threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount]);

  // Deterministic profile-affinity estimates from the server.
  const [aiScoresMap, setAiScoresMap] = useState<Record<string | number, any>>(() => {
    return {};
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiToastMsg, setAiToastMsg] = useState<string | null>(null);
  const [isBakingAi, setIsBakingAi] = useState<boolean>(false);

  // ==========================================
  // FACIAL LOOKALIKE & LIVENESS ACTUATORS
  // ==========================================

  const runLookalikeScan = (photoUrl: string, celebrityName: string) => {
    setSelectedCelebrity(celebrityName);
    setLookalikeScanning(false);
    setLookalikeScanProgress(0);
    setLookalikeResults([]);
    setAiToastMsg('La comparaison faciale n’est pas activée : Bavel ne fabrique aucun score biométrique.');
  };

  const runLivenessSelfieCheck = () => {
    setLivenessStatus('idle');
    setLivenessScanProgress(0);
    setAiToastMsg('La vérification selfie doit être réalisée depuis le parcours sécurisé de vérification.');
  };

  const resetLivenessCheck = () => {
    setLivenessStatus('idle');
    setLivenessScanProgress(0);
    setLivenessStep('blink');
  };

  // Behavioral Telemetry recorder (Tracks Dwell Time, Photo Clicks & Tag Interactions)
  const sendBehavioralTelemetry = async (eventType: string, targetProfileId: number, category?: string, dwellTimeSeconds: number = 3) => {
    try {
      const response = await authFetch('/api/ai/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          targetProfileId,
          category,
          dwellTimeSeconds
        })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `Réponse de télémétrie invalide (${response.status}).`);
      }
    } catch (error) {
      console.error('Échec de l’enregistrement du signal de recommandation:', error);
    }
  };

  // Recalculate profile compatibility using the internal scoring engine.
  const handleForceRefreshAi = async () => {
    setIsBakingAi(true);
    try {
      const res = await authFetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile: currentUserProfile || { mood: userMood },
          candidateProfiles: sourceProfiles.slice(0, 15),
          userInteractions: { likedIds: propLikedProfiles || [] },
          forceRefresh: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.recommendations && Array.isArray(data.recommendations)) {
          const newMap: Record<string | number, any> = {};
          data.recommendations.forEach((item: any) => { newMap[item.id] = item; });
          setAiScoresMap(prev => ({ ...prev, ...newMap }));
        }
        setAiToastMsg("Recommandations recalculées à partir des informations de profil disponibles.");
        setTimeout(() => setAiToastMsg(null), 3500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBakingAi(false);
    }
  };

  useEffect(() => {
    if (onDetailToggle) {
      onDetailToggle(!!selectedProfile);
    }
  }, [selectedProfile, onDetailToggle]);

  const sourceProfiles = useMemo(() => {
    return profiles || [];
  }, [profiles]);

  const sourceProfilesIdsStr = useMemo(() => {
    return sourceProfiles.map(p => p.id).join(',');
  }, [sourceProfiles]);

  const propLikedProfilesIdsStr = useMemo(() => {
    return (propLikedProfiles || []).join(',');
  }, [propLikedProfiles]);

  const userMoodStr = userMood ? `${userMood.emoji}:${userMood.label}` : '';

  // Fetch profile-affinity estimates from the server with graceful fallback
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function fetchRealtimeAiRecommendations() {
      if (!sourceProfiles || sourceProfiles.length === 0) return;
      setIsAiLoading(true);
      try {
        const timeoutId = setTimeout(() => abortController.abort(), 6000);
        const res = await authFetch('/api/ai/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            userProfile: currentUserProfile || { mood: userMood },
            candidateProfiles: sourceProfiles.slice(0, 15),
            userInteractions: { likedIds: propLikedProfiles || [] }
          })
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.recommendations && Array.isArray(data.recommendations)) {
              const newMap: Record<string | number, any> = {};
              data.recommendations.forEach((item: any) => {
                newMap[item.id] = item;
              });
              setAiScoresMap(prev => ({ ...prev, ...newMap }));
            }
          }
        } else {
          if (isMounted) {
            setAiScoresMap({});
            setAiToastMsg("Le calcul d’affinité de profil est temporairement indisponible.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setAiScoresMap({});
          if (err?.name !== 'AbortError') {
            console.error("Internal recommendations unavailable:", err);
            setAiToastMsg("Le calcul d’affinité de profil est temporairement indisponible.");
          }
        }
      } finally {
        if (isMounted) setIsAiLoading(false);
      }
    }

    fetchRealtimeAiRecommendations();
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [sourceProfilesIdsStr, userMoodStr, propLikedProfilesIdsStr, currentUserProfile]);
  const [selectedChatAction, setSelectedChatAction] = useState<any>(null);
  const [rechargeTargetProfile, setRechargeTargetProfile] = useState<any>(null);
  const [rechargeReason, setRechargeReason] = useState<'default' | 'chatUnlock'>('default');
  const [showConfidentiality, setShowConfidentiality] = useState(false);
  const [direction, setDirection] = useState(0);
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

  const dynamicCountdownText = 'Recommandations mises à jour en temps réel';

  const filteredProfiles = useMemo(() => {
    let result = sourceProfiles.filter(p => !hiddenProfiles.includes(p.id));

    if (genderPreference !== 'les_deux') {
      result = result.filter(p => p.gender === genderPreference);
    }
    if (filterType === 'en_ligne') {
      result = result.filter(p => p.online);
    } else if (filterType === 'nouveau') {
      result = result.filter(p => p.isNew === true || p.is_new === true);
    }
    result = result.filter(p => p.age >= ageRange[0] && p.age <= ageRange[1]);

    // Real-Time Meilisearch / Elasticsearch Faceted Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => {
        const nameMatch = p.name?.toLowerCase().includes(q);
        const locMatch = p.location?.toLowerCase().includes(q);
        const relationMatch = p.relation?.toLowerCase().includes(q);
        const bioMatch = p.bio?.toLowerCase().includes(q);
        const tagMatch = p.tags && p.tags.some((t: string) => t.toLowerCase().includes(q));
        const interestMatch = p.interests && p.interests.some((i: string) => i.toLowerCase().includes(q));
        return nameMatch || locMatch || relationMatch || bioMatch || tagMatch || interestMatch;
      });
    }

    if (activeFacet !== 'all') {
      if (activeFacet === 'online') {
        result = result.filter(p => p.online);
      } else if (activeFacet === 'new') {
        result = result.filter(p => p.isNew === true || p.is_new === true);
      } else if (activeFacet === 'nearby') {
        result = result.filter(p => typeof p.distanceKm === 'number' && p.distanceKm <= 5);
      } else if (activeFacet === 'popular') {
        result = result.filter(p => typeof p.popularity_score === 'number' && p.popularity_score >= 85);
      } else if (activeFacet === 'common_interests') {
        result = result.filter(p => p.interests && p.interests.length > 0);
      }
    }

    // Apply Advanced Filters with 100% robust matching and realistic fallback logic
    result = result.filter(p => {
      // 1. Ici pour (lookingFor)
      if (advancedFilters.lookingFor && advancedFilters.lookingFor !== 'Tous') {
        const relation = (p as any).relation;
        if (!relation) return false;
        if (advancedFilters.lookingFor === 'Une histoire sérieuse') {
          if (!relation.includes('sérieuse') && !relation.includes('stable') && !relation.includes('belle histoire')) return false;
        } else if (advancedFilters.lookingFor === 'Discuter') {
          if (!relation.includes('Discuter') && !relation.includes('connaissances')) return false;
        } else if (advancedFilters.lookingFor === 'Des rencontres') {
          if (!relation.includes('rencontre') && !relation.includes('rencontres') && !relation.includes('connaissances') && !relation.includes('histoire')) return false;
        } else {
          if (!relation.toLowerCase().includes(advancedFilters.lookingFor.toLowerCase())) return false;
        }
      }

      // 2. Profils vérifiés
      if (advancedFilters.verifiedOnly) {
        const isVerified = (p as any).verified === true || (p as any).is_verified === true;
        if (!isVerified) return false;
      }

      // 3. Statut de relation (status)
      if (advancedFilters.status && advancedFilters.status !== 'Tous') {
        const status = (p as any).status;
        if (!status) return false;
        if (status !== advancedFilters.status) return false;
      }

      // 4. Religion
      if (advancedFilters.religion && advancedFilters.religion !== 'Tous') {
        const religion = (p as any).religion || getProfileDetail(p, 'religion');
        if (!religion) return false;
        if (religion !== advancedFilters.religion) return false;
      }

      // 5. Tabac (smoking)
      if (advancedFilters.smoking && advancedFilters.smoking !== 'Tous') {
        const smokingDetail = getProfileDetail(p, 'smoking', value => /fumeur|fumeuse/i.test(value));
        const smoking = (p as any).smoking || (smokingDetail
          ? /Non-fumeur|Non-fumeuse/i.test(smokingDetail) ? 'Non-fumeur' : 'Fumeur'
          : undefined);
        if (!smoking) return false;
        if (smoking !== advancedFilters.smoking) return false;
      }

      // 6. Enfants (children)
      if (advancedFilters.children && advancedFilters.children !== 'Tous') {
        const children = (p as any).children || getProfileDetail(p, 'children');
        if (!children) return false;
        if (children !== advancedFilters.children) return false;
      }

      // 7. Langue (language)
      if (advancedFilters.language && advancedFilters.language !== 'Tous') {
        const language = (p as any).language || getProfileDetail(p, 'languages');
        if (!language) return false;
        if (!language.includes(advancedFilters.language)) return false;
      }

      // 8. Alcool (alcohol)
      if (advancedFilters.alcohol && advancedFilters.alcohol !== 'Tous') {
        const alcohol = (p as any).alcohol || getProfileDetail(p, 'alcohol');
        if (!alcohol) return false;
        if (alcohol !== advancedFilters.alcohol) return false;
      }

      // 9. Signe astrologique (zodiac)
      if (advancedFilters.zodiac && advancedFilters.zodiac !== 'Tous') {
        const signs = ['Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge', 'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'];
        const zodiac = (p as any).zodiac || getProfileDetail(p, 'zodiac', value => signs.includes(value));
        if (!zodiac) return false;
        if (zodiac !== advancedFilters.zodiac) return false;
      }

      // 10. Animaux de compagnie (pets)
      if (advancedFilters.pets && advancedFilters.pets !== 'Tous' && advancedFilters.pets !== 'Je préfère ne pas le dire') {
        const pets = (p as any).pets || getProfileDetail(p, 'pets');
        if (!pets) return false;
        
        let matched = false;
        const target = advancedFilters.pets;
        if (target === 'Chien(s)' && (pets === 'Chien' || pets === 'Les deux' || pets === 'Chien(s)')) matched = true;
        else if (target === 'Chat(s)' && (pets === 'Chat' || pets === 'Les deux' || pets === 'Chat(s)')) matched = true;
        else if (target === 'Chats et chiens' && (pets === 'Les deux' || pets === 'Chats et chiens' || pets === 'Chien' || pets === 'Chat')) matched = true;
        else if (target === 'Pas d\'animaux' && (pets === 'Aucun' || pets === 'Pas d\'animaux')) matched = true;
        else if (target === 'Autres') matched = true;
        else if (target === pets) matched = true;

        if (!matched) return false;
      }

      // 11. Trait de personnalité (personality)
      if (advancedFilters.personality && advancedFilters.personality !== 'Tous' && advancedFilters.personality !== 'Je préfère ne pas le dire') {
        const personality = (p as any).personality || getProfileDetail(p, 'personality');
        if (!personality) return false;
        
        let matched = false;
        const target = advancedFilters.personality;
        if (target === 'Introverti' && (personality === 'Introverti' || personality === 'Calme' || personality === 'Rêveur')) matched = true;
        else if (target === 'Extraverti' && (personality === 'Extraverti' || personality === 'Aventurier' || personality === 'Épicurien')) matched = true;
        else if (target === 'Un peu des deux') matched = true;
        else if (target === personality) matched = true;

        if (!matched) return false;
      }

      // 12. Sexualité
      if (advancedFilters.sexuality && advancedFilters.sexuality !== 'Tous') {
        const orientation = (p as any).orientation || getProfileDetail(p, 'sexuality') || 'Hétéro';
        if (!orientation.toLowerCase().includes(advancedFilters.sexuality.toLowerCase())) return false;
      }

      // 13. Taille (height)
      if (advancedFilters.height && advancedFilters.height !== 'Tous') {
        let pHeightNum: number | null = typeof (p as any).height === 'number' ? (p as any).height : null;
        const hStr = getProfileDetail(p, 'height', value => value.includes('cm'));
        if (hStr) pHeightNum = parseInt(hStr) || null;
        if (pHeightNum === null) return false;
        if (advancedFilters.height === 'Moins de 160 cm' && pHeightNum >= 160) return false;
        if (advancedFilters.height === '160-170 cm' && (pHeightNum < 160 || pHeightNum > 170)) return false;
        if (advancedFilters.height === '170-180 cm' && (pHeightNum < 170 || pHeightNum > 180)) return false;
        if (advancedFilters.height === '180-190 cm' && (pHeightNum < 180 || pHeightNum > 190)) return false;
        if (advancedFilters.height === 'Plus de 190 cm' && pHeightNum <= 190) return false;
      }

      // 14. Niveau d'études (education)
      if (advancedFilters.education && advancedFilters.education !== 'Tous') {
        const edu = (p as any).education || getProfileDetail(p, 'education', value => /Diplôme|Bac|Master|Doctorat|Secondaire/i.test(value));
        if (!edu) return false;
        if (!edu.toLowerCase().includes(advancedFilters.education.toLowerCase())) return false;
      }

      // 15. Emplacement
      if (advancedFilters.location && advancedFilters.location !== 'Emplacement actuel' && advancedFilters.location !== 'Tous') {
        const pLoc = [p.location, p.city, p.country, p.country_code, p.countryCode].filter(Boolean).join(' ');
        const filterLocClean = advancedFilters.location.replace(/Emplacement actuel \((.*)\)/i, '$1').trim().toLowerCase();
        if (!pLoc.toLowerCase().includes(filterLocClean) && !filterLocClean.includes(pLoc.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    return result;
  }, [sourceProfiles, hiddenProfiles, genderPreference, filterType, ageRange, advancedFilters, searchQuery, activeFacet]);

  const sourceForYou = [...sourceProfiles].sort((a, b) =>
    (aiScoresMap[b.id]?.compatibilityScore ?? 0)
      - (aiScoresMap[a.id]?.compatibilityScore ?? 0)
  );

  let filteredForYou = sourceForYou.filter(p => !hiddenProfiles.includes(p.id));
  if (genderPreference !== 'les_deux') {
    filteredForYou = filteredForYou.filter(p => p.gender === genderPreference);
  }
  if (filterType === 'en_ligne') {
    filteredForYou = filteredForYou.filter(p => p.online);
  }
  filteredForYou = filteredForYou.filter(p => p.age >= ageRange[0] && p.age <= ageRange[1]);

  const currentList = subTab === 'all' ? filteredProfiles : filteredForYou;
  const selectedIndex = selectedProfile ? currentList.findIndex(p => p.id === selectedProfile.id) : -1;
  const hasPrevious = selectedIndex > 0;
  const hasNext = selectedIndex !== -1 && selectedIndex < currentList.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      setDirection(-1);
      setSelectedProfile(currentList[selectedIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setDirection(1);
      setSelectedProfile(currentList[selectedIndex + 1]);
    }
  };

  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const lastScrollY = useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
      setIsScrolledDown(true);
      if (onScrollStateChange) onScrollStateChange(true);
    } else if (currentScrollY < lastScrollY.current) {
      setIsScrolledDown(false);
      if (onScrollStateChange) onScrollStateChange(false);
    }
    lastScrollY.current = currentScrollY;
  };

  return (
    <div className="pt-8 px-3.5 relative h-full flex flex-col">
      <HeartParticleBurstOverlay bursts={bursts} />

      {selectedProfile && (
        <ProfileModal 
          profile={selectedProfile} 
          onClose={() => setSelectedProfile(null)}
          onPrevious={handlePrevious}
          onNext={handleNext}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          direction={direction}
          isLiked={likedProfiles.includes(selectedProfile.id)}
          onLike={(e?: any) => {
            triggerBurst(e);
            if (onLikeProfile) onLikeProfile(selectedProfile.id);
            else setLikedProfiles(prev => [...prev, selectedProfile.id]);
          }}
          onHide={() => {
            const idToHide = selectedProfile.id;
            if (typeof setHiddenProfiles === 'function') {
              (setHiddenProfiles as any)((prev: number[]) => [...prev, idToHide]);
            }
            setSelectedProfile(null);
          }}
          onMessage={() => {
            const prof = selectedProfile;
            setSelectedProfile(null);
            if (prof.requiresCredits) {
              setSelectedChatAction(prof);
            } else {
              if (setActiveChat) {
                setActiveChat(prof);
              }
              if (onNavigateToTab) {
                onNavigateToTab('discussions');
              }
            }
          }}
          onSendBackgroundWave={onSendBackgroundWave}
        />
      )}

      <AnimatePresence>
        {selectedChatAction && (
          <ChatActionView 
            profile={selectedChatAction} 
            onClose={() => setSelectedChatAction(null)}
            onMoreMenu={() => {
              setProfileInActionMenu(selectedChatAction);
              setShowActionMenu(true);
            }}
            onOpenProfile={() => {
              const prof = selectedChatAction;
              setSelectedChatAction(null);
              setSelectedProfile(prof);
            }}
            onUnlock={() => {
              const prof = selectedChatAction;
              setSelectedChatAction(null);
              setRechargeTargetProfile(prof);
              setRechargeReason('chatUnlock');
            }}
          />
        )}
        {aiVibeProfile && (
          <AiVibeCheckModal
            profile={aiVibeProfile}
            currentUser={currentUserProfile}
            onClose={() => setAiVibeProfile(null)}
            onOpenChatWithIcebreaker={(prof, icebreakerText) => {
              setAiVibeProfile(null);
              if (setActiveChat) {
                setActiveChat({ ...prof, initialMessage: icebreakerText });
              }
              if (onNavigateToTab) {
                onNavigateToTab('discussions');
              }
            }}
          />
        )}
        {rechargeTargetProfile && (
          <RechargeCreditsMenu 
            targetProfileName={rechargeTargetProfile.name}
            onClose={() => {
              setRechargeTargetProfile(null);
              setRechargeReason('default');
            }}
            showUnlockChatBenefit={rechargeReason === 'chatUnlock'}
          />
        )}
        {showConfidentiality && (
          <ConfidentialityMenu onClose={() => setShowConfidentiality(false)} />
        )}
      </AnimatePresence>

      {/* Badoo Features Modals */}
      <BadooLiveModal
        isOpen={showLiveModal}
        onClose={() => setShowLiveModal(false)}
        onOpenStore={() => {
          setShowLiveModal(false);
          setRechargeTargetProfile({ name: '' });
          setRechargeReason('default');
        }}
      />

      {showRadarModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center">
          <div className="w-full max-w-lg h-[90vh] bg-neutral-900 rounded-3xl overflow-hidden relative shadow-2xl border border-neutral-800">
            <GeoRadarView
              profiles={sourceProfiles}
              onSelectProfile={(p) => {
                setShowRadarModal(false);
                setSelectedProfile(p);
              }}
              onClose={() => setShowRadarModal(false)}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-3 shrink-0 gap-1.5">
        <h1 className="text-[22px] font-black text-black truncate whitespace-nowrap tracking-tight">Profils à découvrir</h1>
        <div className="flex items-center space-x-1.5 shrink-0">
          <button 
            onClick={() => setShowExtraShows(true)} 
            className="w-[28px] h-[28px] rounded-full bg-[#f3e5ff] hover:bg-[#ebd5ff] flex items-center justify-center relative transition-colors shadow-2xs"
            title="Extra Shows"
          >
            <Zap className="w-[14px] h-[14px] text-[#e20030] fill-[#e20030]" strokeWidth={1} />
            <div className="absolute top-0 right-0 w-2 h-2 bg-[#e20030] rounded-full border border-white"></div>
          </button>
          {subTab !== 'foryou' && (
            <button 
              onClick={() => setShowFilters(true)} 
              className="w-[28px] h-[28px] rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center relative transition-colors shadow-2xs active:scale-95"
              title="Filtrer à découvrir"
            >
              <SlidersHorizontal className="w-[14px] h-[14px] text-black" strokeWidth={2} />
              {(filterType !== 'tous' || 
                genderPreference !== 'les_deux' || 
                ageRange[0] !== 18 || 
                ageRange[1] !== 80 || 
                Object.keys(advancedFilters).some(k => advancedFilters[k] && advancedFilters[k] !== 'Tous' && advancedFilters[k] !== 'Emplacement actuel')
              ) && (
                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#e20030] rounded-full border border-white"></div>
              )}
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <DiscoverFiltersMenu 
          onClose={() => setShowFilters(false)} 
          genderPreference={genderPreference}
          setGenderPreference={setGenderPreference}
          filterType={filterType}
          setFilterType={setFilterType}
          ageRange={ageRange}
          setAgeRange={setAgeRange}
          advancedFilters={advancedFilters}
          setAdvancedFilters={setAdvancedFilters}
        />
      )}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-[320] bg-black/90 text-white text-[12px] font-bold px-4 py-2 rounded-full shadow-lg border border-gray-800 flex items-center space-x-2"
          >
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {showActionMenu && profileInActionMenu && (
        <ActionMenu 
          onClose={() => { setShowActionMenu(false); setProfileInActionMenu(null); }} 
          onFavorite={async () => {
            try {
              await addFavorite(String(profileInActionMenu.id));
              setToastMsg(`⭐ ${profileInActionMenu.name} ajouté(e) aux favoris`);
            } catch (error) {
              console.error('Favorite action failed:', error);
              setToastMsg('Impossible de sauvegarder ce favori');
            }
            setTimeout(() => setToastMsg(null), 3000);
            setShowActionMenu(false);
            setProfileInActionMenu(null);
          }}
          onHide={() => {
            if (typeof setHiddenProfiles === 'function') {
              (setHiddenProfiles as any)((prev: number[]) => [...prev, profileInActionMenu.id]);
            }
            setToastMsg(`🙈 Profil de ${profileInActionMenu.name} masqué`);
            setTimeout(() => setToastMsg(null), 3000);
            setShowActionMenu(false);
            setProfileInActionMenu(null);
          }}
          onBlock={() => {
            if (typeof setHiddenProfiles === 'function') {
              (setHiddenProfiles as any)((prev: number[]) => [...prev, profileInActionMenu.id]);
            }
            setToastMsg(`🚫 ${profileInActionMenu.name} bloqué(e)`);
            setTimeout(() => setToastMsg(null), 3000);
            setShowActionMenu(false);
            setProfileInActionMenu(null);
          }}
          onReport={() => {
            if (typeof setHiddenProfiles === 'function') {
              (setHiddenProfiles as any)((prev: number[]) => [...prev, profileInActionMenu.id]);
            }
            setToastMsg(`🛡️ Profil de ${profileInActionMenu.name} signalé`);
            setTimeout(() => setToastMsg(null), 3000);
            setShowActionMenu(false);
            setProfileInActionMenu(null);
          }}
        />
      )}
      {showExtraShows && (
        <ExtraShowsMenu 
          onClose={() => setShowExtraShows(false)} 
          onOpenRecharge={() => {
            setShowExtraShows(false);
            setRechargeTargetProfile({ name: '' });
            setRechargeReason('default');
          }} 
        />
      )}



      <div className="flex items-center justify-between border-b border-gray-100 mb-3 shrink-0 pr-1">
        <div className="flex space-x-4">
          <button 
            onClick={() => setSubTab('all')}
            className={`pb-2 border-b-[2px] font-bold text-[14px] transition-all cursor-pointer relative ${subTab === 'all' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
          >
            Tout le monde
          </button>
          <button 
            onClick={() => setSubTab('foryou')}
            className={`pb-2 border-b-[2px] font-bold text-[14px] transition-all cursor-pointer relative ${subTab === 'foryou' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
          >
            Pour vous
          </button>
        </div>
      </div>

      <div onScroll={handleScroll} className="flex-1 overflow-y-auto pb-24 scrollbar-hide flex flex-col">
        {geoChoice === null ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 my-auto select-none"
          >
            {/* Lavender/Purple Icon Circle */}
            <div className="w-20 h-20 bg-[#EDE7F6] rounded-full flex items-center justify-center mb-8 shadow-2xs shrink-0">
              <MapPin className="w-10 h-10 text-black fill-black" strokeWidth={1.5} />
            </div>

            {/* Title */}
            <h2 className="text-[22px] sm:text-[24px] font-black text-black text-center tracking-tight leading-tight mb-3.5 max-w-[320px]">
              Vous cherchez des gens près de chez vous ?
            </h2>

            {/* Description */}
            <p className="text-[14.5px] sm:text-[15.5px] text-gray-500 font-normal text-center leading-relaxed mb-9 max-w-[320px]">
              Donnez-nous accès à votre géolocalisation pour voir qui est dans le coin.
            </p>

            {/* Authorize Button */}
            <button
              type="button"
              onClick={handleAuthorizeLocation}
              className="w-full max-w-[280px] bg-[#111111] hover:bg-black text-white font-bold py-3.5 rounded-full text-[16px] text-center shadow-xs active:scale-[0.98] transition-all cursor-pointer mb-5"
            >
              Autoriser
            </button>

            {/* On verra plus tard Link */}
            <button
              type="button"
              onClick={handleDismissLocation}
              className="text-[15px] text-gray-500 font-medium hover:text-black transition-colors cursor-pointer text-center bg-transparent border-0"
            >
              On verra plus tard
            </button>
          </motion.div>
        ) : subTab === 'all' ? (
          filteredProfiles.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 mt-2"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <SlidersHorizontal className="w-5 h-5 text-gray-400" />
              </div>
              <h3 className="text-[14.5px] font-bold text-black mb-1">Aucun profil ne correspond</h3>
              <p className="text-[12.5px] text-gray-400 max-w-[220px] mb-4">Essayez d'élargir vos critères de recherche pour découvrir plus de profils.</p>
              <button 
                onClick={() => {
                  setFilterType('tous');
                  if (setGenderPreference) setGenderPreference('les_deux');
                  setAgeRange([18, 80]);
                  setAdvancedFilters({});
                  setSearchQuery('');
                  setActiveFacet('all');
                }}
                className="bg-black text-white text-[12.5px] font-bold px-4 py-2 rounded-full hover:bg-gray-800 transition-colors active:scale-95"
              >
                Réinitialiser les filtres
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
          {filteredProfiles.slice(0, visibleCount).map((p, idx) => (
            <motion.button 
              key={p.id} 
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                duration: 0.3, 
                delay: Math.min(idx * 0.03, 0.2), 
                ease: [0.215, 0.61, 0.355, 1] 
              }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedProfile(p)} 
              className="relative aspect-[3/4] rounded-2xl overflow-hidden group text-left shadow-xs border border-gray-100/80 bg-gray-100 transform-gpu smooth-gpu cursor-pointer"
            >
              <LazyBlurImage src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 transform-gpu" />
              
              {/* Gradient for text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />

              {/* Profile Mood Emoji Badge */}
              {p.moodEmoji && (
                <div className="absolute top-1.5 left-1.5 bg-white/95 backdrop-blur-xs rounded-full w-5 h-5 flex items-center justify-center shadow-xs text-[11px] z-10">
                  {p.moodEmoji}
                </div>
              )}

              {/* Bottom Profile Info */}
              <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-white z-10">
                <div className="flex items-center space-x-1 truncate">
                  <span className="text-[12px] font-extrabold tracking-tight truncate drop-shadow-xs">{p.name}, {p.age}</span>
                </div>
                {p.online && <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 border border-black/20 shadow-xs" />}
              </div>
            </motion.button>
          ))}

          {/* Infinite Scroll Sentinel */}
          {visibleCount < filteredProfiles.length && (
            <div ref={sentinelRef} className="col-span-3 h-8 w-full" />
          )}
        </div>
        )
      ) : (
        <div className="flex flex-col">
          {/* Header matching Suggestions du jour */}
          <div className="pt-1 pb-3 flex flex-col items-start text-left">
            <div className="inline-flex items-center bg-[#FEF3C7] text-[#92400E] text-[12px] sm:text-[12.5px] font-semibold px-3.5 py-1 rounded-full mb-2.5 shadow-2xs">
              {dynamicCountdownText}
            </div>
            <h2 className="text-[20px] sm:text-[22px] font-bold text-black tracking-tight mb-1">
              Suggestions du jour
            </h2>
            <p className="text-[13px] sm:text-[13.5px] text-gray-500 font-normal leading-snug">
              On vous connaît un peu et on pense que ces personnes vous plairont.
            </p>
          </div>

          {filteredForYou.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 mt-2"
            >
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-[14.5px] font-bold text-black mb-1">Pas encore de suggestions</h3>
              <p className="text-[12.5px] text-gray-500 max-w-[240px] mb-4">
                Nos algorithmes préparent votre prochaine sélection personnalisée. Revenez très bientôt !
              </p>
            </motion.div>
          ) : (
            filteredForYou.map((p, idx) => {
            const isLiked = (likedProfiles || []).some(id => String(id) === String(p.id));

            return (
              <motion.div 
                key={p.id} 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.35, 
                  delay: idx * 0.05, 
                  ease: [0.215, 0.61, 0.355, 1] 
                }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
                onClick={() => {
                  sendBehavioralTelemetry('dwell_time', p.id, p.tags?.[0] || 'art', 5);
                  setSelectedProfile(p);
                  pushNotificationService.triggerProfileViewPush(p.name, String(p.id));
                }} 
                className="rounded-2xl overflow-hidden bg-white border border-gray-100/90 shadow-2xs hover:shadow-md flex flex-col text-left cursor-pointer transition-all mb-3.5"
              >
                <div className="relative h-[230px] sm:h-[250px] w-full overflow-hidden">
                  <img 
                    src={p.img} 
                    alt={p.name} 
                    className="w-full h-full object-cover" 
                    onClick={(e) => {
                      e.stopPropagation();
                      sendBehavioralTelemetry('photo_click', p.id, p.tags?.[0] || 'art', 3);
                      setSelectedProfile(p);
                      pushNotificationService.triggerProfileViewPush(p.name, String(p.id));
                    }}
                  />
                  
                  {/* Top gradient */}
                  <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 via-black/15 to-transparent pointer-events-none" />
                  
                  {/* Bottom gradient */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none" />

                  {/* Profile Header Info + Three Dots Options Button */}
                  <div className="absolute top-2.5 left-3 right-3 flex justify-between items-start z-10">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-1.5">
                        {p.verified && (
                          <div className="bg-white rounded-full p-0.5 shrink-0 shadow-2xs">
                            <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-white" />
                          </div>
                        )}
                        <span className="text-[17px] font-bold text-white tracking-tight drop-shadow-sm">{p.name}, {p.age}</span>
                        {p.online && <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black/20 shadow-xs shrink-0 ml-0.5" />}
                      </div>
                      <span className="text-white/90 text-[11.5px] font-medium drop-shadow-sm mt-0.5">{p.location}</span>
                    </div>

                    {/* Three dots (...) action menu button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfileInActionMenu(p);
                        setShowActionMenu(true);
                      }}
                      title="Options du profil"
                      aria-label="Options du profil"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-black/30 transition-all active:scale-90 cursor-pointer shrink-0"
                    >
                      <MoreHorizontal className="w-5 h-5 drop-shadow-md" />
                    </button>
                  </div>

                  {/* Bottom Tags + Floating Heart Button */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between z-10">
                    <div className="flex flex-wrap gap-1 max-w-[76%]">
                      {p.tags.slice(0, 6).map((t: any, idx: number) => {
                        const tagLabel = typeof t === 'object' && t !== null ? (t.label || t.name || String(t)) : String(t);
                        return (
                          <span 
                            key={tagLabel || idx} 
                            onClick={(e) => {
                              e.stopPropagation();
                              sendBehavioralTelemetry('tag_click', p.id, tagLabel, 1);
                            }}
                            className="bg-white/95 hover:bg-white text-black text-[10.5px] font-medium px-2.5 py-0.5 rounded-full shadow-2xs transition-colors cursor-pointer"
                          >
                            {tagLabel}
                          </span>
                        );
                      })}
                    </div>
                    
                    {/* If the profile is NOT liked, render floating white circle with solid black heart.
                        If the profile IS liked, DO NOT render heart button at all (hides it)! */}
                    {!isLiked && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          triggerBurst(e);
                          sendBehavioralTelemetry('tag_click', p.id, p.tags?.[0] || 'like', 5);
                          if (onLikeProfile) onLikeProfile(p.id);
                          setLikedProfiles(prev => [...prev, p.id]); 
                          pushNotificationService.triggerNewLikePush(p.name, p.img);
                        }} 
                        title="Liker ce profil"
                        className="w-9.5 h-9.5 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform border border-gray-100 cursor-pointer shrink-0 ml-2"
                      >
                        <Heart className="w-4.5 h-4.5 text-black fill-black stroke-[1.5]" />
                      </button>
                    )}
                  </div>
                </div>

                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChatAction(p);
                  }}
                  className="py-2.5 px-3 flex items-center justify-center space-x-2 w-full hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100 cursor-pointer text-black font-bold text-[13px]"
                >
                  <Lock className="w-3.5 h-3.5 text-black stroke-[2.5] shrink-0" />
                  <span>Activer le tchat</span>
                </div>
              </motion.div>
            );
          }))}

          <div className="mt-8 mb-8 px-6 text-center">
            <p className="text-[12.5px] text-gray-500 font-normal leading-relaxed max-w-[340px] mx-auto">
              Les profils recommandés sont générés par notre technologie spécialement conçue pour optimiser les possibilités de matcher. Pour plus d'infos, consultez notre{" "}
              <span className="underline cursor-pointer hover:text-gray-700 font-medium">
                Politique de Confidentialité
              </span>.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export function NearbyPeopleView({ 
  onNavigateToTab,
  setActiveChat,
  onSendBackgroundWave,
  onDetailToggle,
  profiles,
  likedProfiles,
  onLikeProfile
}: { 
  onNavigateToTab?: (tab: string) => void;
  setActiveChat?: (profile: any) => void;
  onSendBackgroundWave?: (profile: any) => void;
  onDetailToggle?: (isOpen: boolean) => void;
  profiles?: any[];
  likedProfiles?: number[];
  onLikeProfile?: (id: string | number) => Promise<boolean | undefined>;
}) {
  const [mode, setMode] = useState<'grid' | 'radar'>('grid');
  const [maxDistance, setMaxDistance] = useState<number>(10);
  const [onlyOnline, setOnlyOnline] = useState<boolean>(false);
  const [selectedNearbyProfile, setSelectedNearbyProfile] = useState<any>(null);

  useEffect(() => {
    if (onDetailToggle) {
      onDetailToggle(!!selectedNearbyProfile);
    }
  }, [selectedNearbyProfile, onDetailToggle]);
  const [selectedChatAction, setSelectedChatAction] = useState<any>(null);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const { bursts, triggerBurst } = useHeartBurst();
  const [gpsLocation, setGpsLocation] = useState<{ name: string; isReal: boolean; accuracy?: string, lat?: number, lon?: number }>({
    name: 'Position non définie',
    isReal: false,
  });

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180; 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; // Distance in km
  };

  const handleRequestLocation = () => {
    setIsScanning(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setTimeout(() => {
            setIsScanning(false);
            setGpsLocation({
              name: `Position GPS (${position.coords.latitude.toFixed(2)}°, ${position.coords.longitude.toFixed(2)}°)`,
              isReal: true,
              accuracy: `${Math.round(position.coords.accuracy)}m`,
              lat: position.coords.latitude,
              lon: position.coords.longitude
            });
            showToast('📍 Position GPS actualisée avec succès !');
          }, 1200);
        },
        () => {
          setTimeout(() => {
            setIsScanning(false);
            setGpsLocation({ name: 'Position non disponible', isReal: false });
            showToast('📍 Autorisation de localisation refusée');
          }, 1200);
        },
        { timeout: 8000 }
      );
    } else {
      setTimeout(() => {
        setIsScanning(false);
        showToast('📍 Géolocalisation indisponible sur cet appareil');
      }, 1000);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleWave = (profile: any, e: React.MouseEvent) => {
    e.stopPropagation();
    showToast(`👋 Vous avez envoyé un coucou à ${profile.name} !`);
    profile.initialMessage = "Coucou ça va ? 👋";
    if (onSendBackgroundWave) {
      onSendBackgroundWave(profile);
    }
    if (profile.requiresCredits) {
      setSelectedChatAction(profile);
    } else {
      if (setActiveChat) setActiveChat(profile);
      if (onNavigateToTab) onNavigateToTab('discussions');
    }
  };

  const handleLike = (profile: any, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerBurst(e);
    if (!(likedProfiles || []).includes(profile.id)) {
      if (onLikeProfile) {
        onLikeProfile(profile.id);
      }
      showToast(`❤️ Vous avez liké ${profile.name} !`);
    }
  };

  const sourceProfiles = profiles || [];

  const profilesWithDistance = useMemo(() => {
    return sourceProfiles.map((p: any) => {
      let distanceKm: number | null = null;
      if (p.latitude && p.longitude && gpsLocation.lat && gpsLocation.lon) {
        distanceKm = getDistanceFromLatLonInKm(gpsLocation.lat, gpsLocation.lon, p.latitude, p.longitude);
      }
      return {
        ...p,
        distanceKm,
        distanceText: distanceKm === null ? 'Distance indisponible' : distanceKm < 1 ? '< 1 km' : `${Math.round(distanceKm)} km`
      };
    });
  }, [sourceProfiles, gpsLocation, maxDistance]);

  const filteredMembers = profilesWithDistance.filter((m: any) => {
    if (m.distanceKm !== null && m.distanceKm > maxDistance) return false;
    if (onlyOnline && !m.online) return false;
    return true;
  });

  return (
    <div className="pt-2 h-full flex flex-col bg-[#f9fafb] relative pb-20 overflow-hidden">
      <HeartParticleBurstOverlay bursts={bursts} />

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[160] bg-black/90 text-white text-[12.5px] font-bold px-4 py-2 rounded-full shadow-lg border border-white/20 flex items-center space-x-2"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Profile Modal */}
      {selectedNearbyProfile && (
        <ProfileModal 
          profile={selectedNearbyProfile} 
          onClose={() => setSelectedNearbyProfile(null)}
          isLiked={(likedProfiles || []).includes(selectedNearbyProfile.id)}
          onLike={() => {
            if (!(likedProfiles || []).includes(selectedNearbyProfile.id)) {
              if (onLikeProfile) {
                onLikeProfile(selectedNearbyProfile.id);
              }
              showToast(`❤️ Liké !`);
            }
          }}
          onMessage={() => {
            const prof = selectedNearbyProfile;
            setSelectedNearbyProfile(null);
            if (prof.requiresCredits) {
              setSelectedChatAction(prof);
            } else {
              if (setActiveChat) {
                setActiveChat(prof);
              }
              if (onNavigateToTab) {
                onNavigateToTab('discussions');
              }
            }
          }}
        />
      )}
      
      {/* Chat Action View */}
      <AnimatePresence>
        {selectedChatAction && (
          <ChatActionView 
            profile={selectedChatAction} 
            onClose={() => setSelectedChatAction(null)}
            onMoreMenu={() => {}}
            onOpenProfile={() => {
              const prof = selectedChatAction;
              setSelectedChatAction(null);
              setSelectedNearbyProfile(prof);
            }}
          />
        )}
      </AnimatePresence>



      {/* Header & Location bar */}
      <div className="px-1 mb-2 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-200">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>GPS Actif</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-gray-200/80 p-0.5 rounded-full flex items-center">
              <button 
                onClick={() => setMode('grid')}
                className={`px-2.5 py-1 rounded-full text-[11.5px] font-extrabold transition-all ${mode === 'grid' ? 'bg-white text-black shadow-xs' : 'text-gray-600'}`}
              >
                Grille
              </button>
              <button 
                onClick={() => setMode('radar')}
                className={`px-2.5 py-1 rounded-full text-[11.5px] font-extrabold transition-all flex items-center space-x-1 ${mode === 'radar' ? 'bg-black text-white shadow-xs' : 'text-gray-600'}`}
              >
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Radar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Location & Refresh bar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-2.5 shadow-2xs flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-full bg-[#EBE4FF] flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 text-[#e20030] fill-[#e20030]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold text-black truncate">{gpsLocation.name}</span>
              <span className="text-[10px] text-gray-400 font-medium leading-none">
                {gpsLocation.isReal ? `Précision: ${gpsLocation.accuracy}` : 'Position estimée pour la recherche'}
              </span>
            </div>
          </div>

          <button 
            onClick={handleRequestLocation}
            disabled={isScanning}
            className="bg-gray-100 hover:bg-gray-200 text-black text-[11px] font-bold px-2.5 py-1.5 rounded-xl flex items-center space-x-1 shrink-0 active:scale-95 transition-transform"
          >
            <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin text-[#e20030]' : 'text-gray-700'}`} />
            <span>{isScanning ? 'Analyse...' : 'Actualiser'}</span>
          </button>
        </div>

        {/* Filter Bar: Radius slider & Online toggle */}
        <div className="flex items-center justify-between bg-gray-100/80 p-2 rounded-xl text-[11.5px] space-x-3">
          <div className="flex items-center space-x-2 flex-1">
            <span className="font-bold text-gray-700 whitespace-nowrap text-[11px]">Rayon: <span className="text-black font-extrabold">{maxDistance} km</span></span>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={maxDistance} 
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full accent-black cursor-pointer h-1.5 bg-gray-300 rounded-lg"
            />
          </div>

          <button 
            onClick={() => setOnlyOnline(!onlyOnline)}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition-colors border ${onlyOnline ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            {onlyOnline ? '🟢 En ligne' : 'Tous'}
          </button>
        </div>
      </div>

      {/* Main Content View */}
      {isScanning ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative w-32 h-32 flex items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#e20030]/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-[#e20030]/60 animate-pulse" />
            <div className="w-16 h-16 rounded-full bg-[#f3e5ff] flex items-center justify-center z-10 shadow-md">
              <Radio className="w-8 h-8 text-[#e20030] animate-spin" />
            </div>
          </div>
          <h3 className="text-[16px] font-bold text-black mb-1">Analyse des signaux GPS...</h3>
          <p className="text-[12px] text-gray-500">Scan des membres à proximité de votre position</p>
        </div>
      ) : mode === 'radar' ? (
        /* RADAR MAP VIEW */
        <div className="flex-1 px-1 flex flex-col items-center justify-center relative overflow-hidden my-auto">
          <div className="relative w-[280px] h-[280px] rounded-full border-2 border-gray-200 bg-gradient-to-br from-purple-50/40 to-rose-50/40 flex items-center justify-center shadow-inner overflow-hidden">
            {/* Concentric distance rings */}
            <div className="absolute w-[210px] h-[210px] rounded-full border border-gray-200/80 border-dashed" />
            <div className="absolute w-[130px] h-[130px] rounded-full border border-gray-200/80" />
            <div className="absolute w-[60px] h-[60px] rounded-full border border-gray-300" />

            {/* Radar Sweep Line */}
            <div className="absolute inset-0 rounded-full pointer-events-none bg-[conic-gradient(from_0deg,transparent_0_300deg,rgba(226,0,48,0.15)_360deg)] animate-spin" style={{ animationDuration: '4s' }} />

            {/* Center User Dot */}
            <div className="relative z-20 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full border-2 border-[#e20030] overflow-hidden shadow-md ring-4 ring-[#e20030]/20">
                <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80" alt="You" className="w-full h-full object-cover" />
              </div>
              <span className="bg-black text-white text-[9px] font-black px-1.5 py-0.2 rounded-full mt-0.5 shadow-xs">Vous</span>
            </div>

            {/* Radar Profile Pins */}
            {filteredMembers.map((member) => {
              const angleRad = (member.radarAngle * Math.PI) / 180;
              const radius = member.radarRadiusRatio * 120;
              const x = Math.cos(angleRad) * radius;
              const y = Math.sin(angleRad) * radius;

              return (
                <motion.div
                  key={member.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.25, zIndex: 30 }}
                  onClick={() => setSelectedNearbyProfile(member)}
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  className="absolute cursor-pointer z-10 group"
                >
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full border-2 border-white overflow-hidden shadow-md ring-2 ring-black/10 group-hover:ring-[#e20030] transition-all">
                      <img src={member.img} alt={member.name} className="w-full h-full object-cover" />
                    </div>
                    {member.online && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
                    )}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[8px] font-extrabold px-1 rounded-full whitespace-nowrap shadow-xs">
                      {member.distanceText}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-3 text-center">
            <span className="text-[12px] font-bold text-black">
              {filteredMembers.length} personne{filteredMembers.length > 1 ? 's' : ''} dans un rayon de {maxDistance} km
            </span>
            <p className="text-[11px] text-gray-500 mt-0.5">Cliquez sur une photo pour voir le profil</p>
          </div>
        </div>
      ) : (
        /* GRID / LIST VIEW */
        <div className="flex-1 overflow-y-auto px-1 pb-24 scrollbar-hide">
          <div className="grid grid-cols-2 gap-2.5">
            {filteredMembers.map((p, idx) => {
              const isLiked = (likedProfiles || []).includes(p.id);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 15, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: idx * 0.04, 
                    ease: [0.215, 0.61, 0.355, 1] 
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedNearbyProfile(p)}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100/90 shadow-xs flex flex-col text-left relative group cursor-pointer"
                >
                  {/* Photo area */}
                  <div className="relative aspect-[4/5] w-full bg-gray-100 overflow-hidden">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

                    {/* Distance Badge top left */}
                    <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-xs border border-white/20">
                      <MapPin className="w-3 h-3 text-[#e20030] fill-[#e20030]" />
                      <span>{p.distanceText}</span>
                    </div>

                    {/* Online badge top right */}
                    {p.online && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center space-x-1 shadow-xs">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span>En ligne</span>
                      </div>
                    )}

                    {/* Info at bottom of photo */}
                    <div className="absolute bottom-2 left-2 right-2 text-white">
                      <div className="flex items-center space-x-1">
                        <span className="text-[15px] font-black tracking-tight drop-shadow-sm">{p.name}, {p.age}</span>
                        {p.verified && (
                          <CheckCircle className="w-3.5 h-3.5 text-blue-400 fill-white shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] text-gray-200 font-medium drop-shadow-xs line-clamp-1">{p.location}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-2 bg-white flex items-center justify-between border-t border-gray-50">
                    <button 
                      onClick={(e) => handleWave(p, e)}
                      title="Envoyer un coucou"
                      className="bg-purple-50 hover:bg-purple-100 text-black rounded-xl px-2.5 py-1.5 text-[11px] font-bold flex items-center space-x-1 transition-colors"
                    >
                      <span className="text-xs">👋</span>
                      <span>Coucou</span>
                    </button>

                    <div className="flex items-center space-x-1.5">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if ((p as any).requiresCredits) {
                            setSelectedChatAction(p);
                          } else {
                            if (setActiveChat) setActiveChat(p);
                            if (onNavigateToTab) onNavigateToTab('discussions');
                          }
                        }}
                        title="Tchat direct"
                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-black transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        onClick={(e) => handleLike(p, e)}
                        title="J'aime"
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                          isLiked ? 'bg-[#e20030] text-white shadow-xs' : 'bg-rose-50 text-[#e20030] hover:bg-rose-100'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : 'fill-[#e20030]'}`} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredMembers.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <MapPin className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-[14px] font-bold text-black mb-1">Aucune personne trouvée</p>
              <p className="text-[12px] text-gray-500 mb-3">Augmentez le rayon de recherche.</p>
              <button 
                onClick={() => setMaxDistance(50)}
                className="bg-black text-white text-[12px] font-bold px-4 py-2 rounded-full"
              >
                Élargir à 50 km
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
