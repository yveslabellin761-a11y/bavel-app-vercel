import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SlidersHorizontal, MapPin, Heart, MessageCircle, MessageCircleMore, User as UserIcon, 
  Settings, HelpCircle, Camera, CameraOff, Zap, Search, Bell, Gauge, Edit3, Mail,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Smile, Plus, Copy, MoreHorizontal, Lock, CheckCircle, CheckCircle2, Check, X, Star, Shield, Eye, EyeOff, FileText, RotateCcw,
  Navigation, Baby, Target, Ruler, Languages, Wine, Sparkles, Dog, Brain, Flame, Cigarette, GraduationCap, BookOpen, Coffee, Clapperboard, ChevronsUp, Megaphone, Battery, Send,
  Radio, Locate, LocateFixed, RefreshCw, RotateCw, Map, Compass, Image as ImageIcon, Briefcase,
  Phone, Video, Mic, CheckCheck, Gift, Ban, ThumbsUp, ArrowUp, Coins, Volume2, VolumeX, UserX, PhoneOff, MicOff, VideoOff, Play, Pause, Trash2, Hand, Users, Pencil, LayoutGrid, Clock, Flag,
  AlertTriangle, Reply, CornerUpLeft
} from 'lucide-react';
import { User } from '../../../types';
import { getSupabase, saveMessageToSupabase, sendMessageThroughServer } from '../../../lib/supabase';
import { playSynthAudio } from '../../../utils/audio';

import { VoiceNoteBubble, ChatActionView, ReportMenu } from '../Modals';
import { ChatReportSheet } from './ChatReportSheet';
import { ChatSafetyDetectorModal } from './ChatSafetyDetectorModal';
import { ImageCompressionService } from '../../../services/media/imageCompression';
import { aiMonetizationEngine } from '../../../services/aiMonetizationEngine';
import { aiSystemEngine } from '../../../services/aiSystemEngine';
import { monetizationService } from '../../../services/monetizationService';
import { RechargeCreditsMenu } from '../Monetization';
import { securityService } from '../../../services/securityService';
import { chatService } from '../../../services/chatService';
import { pushNotificationService } from '../../../services/push/pushNotificationService';
import { sendCallSignal, fetchCallSignals, fetchIncomingCallSignals, addFavorite, removeFavorite } from '../../../services/advancedService';
import { authFetch } from '../../../lib/authFetch';
import BavelPremiumModal from '../../modals/BavelPremiumModal';

interface SwipeableMessageBubbleProps {
  msg: any;
  isMe: boolean;
  onSwipeReply: (msg: any) => void;
  onPressStart: (msg: any) => void;
  onPressEnd: () => void;
  onContextMenu: (msg: any) => void;
  children: React.ReactNode;
}

function SwipeableMessageBubble({
  msg,
  isMe,
  onSwipeReply,
  onPressStart,
  onPressEnd,
  onContextMenu,
  children
}: SwipeableMessageBubbleProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const isThresholdMet = dragOffset >= 38;

  return (
    <div className={`relative flex items-center ${isMe ? 'justify-end' : 'justify-start'} w-full max-w-[85%]`}>
      {/* Reply icon indicator ALWAYS on the LEFT side (WhatsApp style) */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-all duration-150 z-0 pl-1"
        style={{
          opacity: Math.min(1, Math.max(0, dragOffset / 22)),
          transform: `scale(${Math.min(1.15, Math.max(0.6, dragOffset / 32))})`
        }}
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shadow-xs transition-colors ${
            isThresholdMet ? 'bg-purple-600 text-white shadow-purple-200' : 'bg-gray-200 text-gray-700'
          }`}
        >
          <Reply className="w-3.5 h-3.5" strokeWidth={2.5} />
        </div>
      </div>

      {/* Swipeable Bubble Container - ALWAYS swipe to the right (WhatsApp style) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 65 }}
        dragElastic={0.22}
        dragSnapToOrigin={true}
        onDrag={(_, info) => {
          if (info.offset.x > 0) {
            setDragOffset(info.offset.x);
          } else {
            setDragOffset(0);
          }
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x >= 38) {
            onSwipeReply(msg);
          }
          setDragOffset(0);
        }}
        onMouseDown={() => onPressStart(msg)}
        onMouseUp={onPressEnd}
        onMouseLeave={onPressEnd}
        onTouchStart={() => onPressStart(msg)}
        onTouchEnd={onPressEnd}
        onTouchCancel={onPressEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(msg);
        }}
        className="w-fit max-w-full touch-pan-y cursor-grab active:cursor-grabbing relative z-10 select-none"
      >
        {children}
      </motion.div>
    </div>
  );
}

export function ChatConversationView({ 
  profile: propProfile, 
  discussion,
  onClose, 
  onMoreMenu, 
  onRechargeForReadReceipt, 
  onOpenPremium,
  onSendMessage,
  onStartVoiceCall,
  onStartVideoCall,
  onLoadMore,
  onOpenUserProfile,
  onOpenActionMenu,
  renderMessage,
  formatDate,
  isCallActive,
  callType,
  onDelete,
  isPremium: propIsPremium,
  onActivatePremium
}: { 
  profile?: any;
  discussion?: any;
  onClose: () => void; 
  onMoreMenu?: () => void; 
  onRechargeForReadReceipt?: (name: string) => void; 
  onOpenPremium?: (slideId?: string) => void;
  onSendMessage?: (text: string, type?: any) => void;
  onStartVoiceCall?: () => void;
  onStartVideoCall?: () => void;
  onLoadMore?: (id: string) => void;
  onOpenUserProfile?: () => void;
  onOpenActionMenu?: () => void;
  renderMessage?: any;
  formatDate?: any;
  isCallActive?: boolean;
  callType?: any;
  onDelete?: () => void;
  isPremium?: boolean;
  onActivatePremium?: () => void;
}) {
  const profile = propProfile || discussion || {};
  const profileDetails = profile.details && typeof profile.details === 'object' ? profile.details : {};
  const rawLanguages = profile.languages ?? profileDetails.languages;
  const profileLanguages = (Array.isArray(rawLanguages) ? rawLanguages : typeof rawLanguages === 'string' ? rawLanguages.split(',') : [])
    .map((language: unknown) => String(language).trim())
    .filter(Boolean);
  const profilePrompts = Array.isArray(profileDetails.prompts) ? profileDetails.prompts : [];
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [showReportContentScreen, setShowReportContentScreen] = useState(false);
  const [selectedReportedMsgIds, setSelectedReportedMsgIds] = useState<any[]>([]);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showIgnoreModal, setShowIgnoreModal] = useState(false);
  const [showBlockAndReportModal, setShowBlockAndReportModal] = useState(false);
  const [showReportReasonsModal, setShowReportReasonsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const isUserPremium = propIsPremium ?? monetizationService.isPremium() ?? false;

  const shouldBlockForCriteriaMismatch = useMemo(() => {
    if (isUserPremium) return false;
    if (profile?.criteriaMismatch === true || profile?.requiresPremiumForChat === true || profile?.isCriteriaMismatch === true) {
      return true;
    }
    return false;
  }, [profile, isUserPremium]);

  const discId = discussion?.id || profile?.id || profile?.userId || 'unknown';
  const partnerName = profile?.name || discussion?.name || 'cette personne';

  const isBavel = useMemo(() => {
    const id = String(discId || '').toLowerCase();
    const name = String(partnerName || '').toLowerCase();
    return id === 'bavel_official' || id === 'bavel' || name === 'bavel' || (profile as any)?.isBavelSupport || (profile as any)?.isOfficial;
  }, [discId, partnerName, profile]);

  // Favorites tracking
  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bavel_starred_discussion_ids');
      if (!saved) return false;
      const arr = JSON.parse(saved);
      return arr.includes(discId) || (profile?.id && arr.includes(profile.id)) || (profile?.userId && arr.includes(profile.userId));
    } catch {
      return false;
    }
  });

  const handleToggleFavorite = async () => {
    setShowOptionsMenu(false);
    try {
      const saved = localStorage.getItem('bavel_starred_discussion_ids');
      let arr: string[] = saved ? JSON.parse(saved) : [];
      let nextFav = false;
      if (arr.includes(discId) || (profile?.id && arr.includes(profile.id)) || (profile?.userId && arr.includes(profile.userId))) {
        await removeFavorite(String(profile?.id || profile?.userId || discId));
        arr = arr.filter((id: string) => id !== discId && id !== profile?.id && id !== profile?.userId);
        nextFav = false;
        setFeedbackToast(`Retiré des favoris.`);
      } else {
        await addFavorite(String(profile?.id || profile?.userId || discId));
        arr.push(discId);
        nextFav = true;
        setFeedbackToast(`Ajouté aux favoris ⭐`);
      }
      localStorage.setItem('bavel_starred_discussion_ids', JSON.stringify(arr));
      setIsFavorite(nextFav);
      window.dispatchEvent(new CustomEvent('bavel_favorites_updated', { detail: { id: discId, isFavorite: nextFav } }));
    } catch (error) {
      console.error('Favorite toggle failed:', error);
      setFeedbackToast(`Favoris indisponibles.`);
    }
    setTimeout(() => {
      setFeedbackToast(null);
    }, 2800);
  };

  const handleViewProfileFromMenu = () => {
    setShowOptionsMenu(false);
    setShowFullProfile(true);
  };

  const handleIgnoreFromMenu = () => {
    setShowOptionsMenu(false);
    setShowIgnoreModal(true);
  };

  const handleOpenBlockAndReport = () => {
    setShowOptionsMenu(false);
    setShowBlockAndReportModal(true);
  };

  const handleStartReporting = () => {
    setShowBlockAndReportModal(false);
    setShowReportReasonsModal(true);
  };

  const handleUnmatch = () => {
    setShowBlockAndReportModal(false);
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDeleteOrUnmatch = () => {
    setShowDeleteConfirmModal(false);
    try {
      const saved = localStorage.getItem('bavel_ignored_discussions');
      const arr: string[] = saved ? JSON.parse(saved) : [];
      if (!arr.includes(discId)) arr.push(discId);
      if (profile?.id && !arr.includes(profile.id)) arr.push(profile.id);
      if (profile?.userId && !arr.includes(profile.userId)) arr.push(profile.userId);
      localStorage.setItem('bavel_ignored_discussions', JSON.stringify(arr));
      window.dispatchEvent(new CustomEvent('bavel_discussions_updated'));
    } catch (e) {
      console.error(e);
    }
    setFeedbackToast(`Match avec ${partnerName} supprimé.`);
    setTimeout(() => {
      setFeedbackToast(null);
      if (onDelete) {
        onDelete();
      } else if (onClose) {
        onClose();
      }
    }, 1000);
  };

  const handleSelectReportReason = async (reason: string) => {
    setShowReportReasonsModal(false);
    try {
      const savedBlocked = localStorage.getItem('bavel_blocked_users');
      const blockedArr: string[] = savedBlocked ? JSON.parse(savedBlocked) : [];
      if (!blockedArr.includes(discId)) blockedArr.push(discId);
      if (profile?.id && !blockedArr.includes(profile.id)) blockedArr.push(profile.id);
      if (profile?.userId && !blockedArr.includes(profile.userId)) blockedArr.push(profile.userId);
      localStorage.setItem('bavel_blocked_users', JSON.stringify(blockedArr));

      const savedIgnored = localStorage.getItem('bavel_ignored_discussions');
      const ignoredArr: string[] = savedIgnored ? JSON.parse(savedIgnored) : [];
      if (!ignoredArr.includes(discId)) ignoredArr.push(discId);
      if (profile?.id && !ignoredArr.includes(profile.id)) ignoredArr.push(profile.id);
      if (profile?.userId && !ignoredArr.includes(profile.userId)) ignoredArr.push(profile.userId);
      localStorage.setItem('bavel_ignored_discussions', JSON.stringify(ignoredArr));

      await chatService.reportUser(localStorage.getItem('bavel_user_id') || 'current_user', discId, reason);
      window.dispatchEvent(new CustomEvent('bavel_discussions_updated'));
    } catch (e) {
      console.error(e);
    }
    setFeedbackToast(`Signalement envoyé (${reason}). ${partnerName} a été bloqué(e).`);
    setTimeout(() => {
      setFeedbackToast(null);
      if (onClose) onClose();
    }, 1200);
  };

  // Selfie verification is currently unavailable; do not rely on an in-memory flag.
  const isUserVerified = securityService.isVerified();

  const requiresVerificationForThisProfile = Boolean(
    profile.requiresVerifiedPartner || profile.requiresVerification
  );

  // 3. Block ONLY if this specific profile requires verification AND the user is NOT verified yet
  const shouldBlockForVerification = requiresVerificationForThisProfile && !isUserVerified;

  const handleMoreMenu = () => setShowOptionsMenu(true);

  const allowVoiceCall = profile 
    && profile.allowVoiceCall !== false 
    && profile.allowAudioCall !== false;

  const allowVideoCall = profile 
    && profile.allowVideoCall !== false;

  const initialMsgs = profile?.messages || discussion?.messages;

  const [messages, setMessages] = useState<Array<{ 
    id: number | string, 
    text?: string, 
    sender: 'me' | 'them', 
    time: string,
    type?: 'text' | 'voice' | 'call' | 'image' | 'video' | 'gif' | 'location' | 'system_block',
    audioUrl?: string,
    duration?: number,
    callType?: 'audio' | 'video',
    status?: 'sent' | 'delivered' | 'read',
    isEphemeral?: boolean,
    isViewed?: boolean,
    isPrivateContent?: boolean
  }>>(() => {
    if (initialMsgs && initialMsgs.length > 0) {
      return initialMsgs.map((m: any, index: number) => ({
        id: index + 1,
        text: m.text,
        sender: (m.sender === 'me' || m.sender === 'user') ? 'me' : 'them',
        time: m.time || (m.timestamp ? new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '14:52'),
        type: m.type || 'text',
        status: 'read'
      }));
    }
    return [];
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getSupabase()?.auth.getUser().then(({ data }) => {
      if (active) setCurrentUserId(data.user?.id || null);
    }).catch(() => {
      if (active) setCurrentUserId(null);
    });
    return () => { active = false; };
  }, []);
  const targetUserId = String(profile.user_id || profile.id || '');
  const [matchId, setMatchId] = useState('');

  useEffect(() => {
    if (!currentUserId || !targetUserId) {
      setMatchId('');
      return;
    }
    let active = true;
    void (async () => {
      try {
        const { data, error } = await getSupabase()
          .from('matches')
          .select('id')
          .or(`and(user_id.eq.${currentUserId},matched_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},matched_user_id.eq.${currentUserId})`)
          .limit(1);
        if (error) {
          console.error('Conversation match lookup failed:', error);
          if (active) setMatchId('');
          return;
        }
        if (active) setMatchId(data?.[0]?.id || '');
      } catch (error) {
        console.error('Conversation match lookup failed:', error);
        if (active) setMatchId('');
      }
    })();
    return () => { active = false; };
  }, [currentUserId, targetUserId]);

  const hasExchangedMessages = useMemo(() => {
    return messages.some(m => m.sender === 'me');
  }, [messages]);

  useEffect(() => {
    if (!currentUserId || !matchId) return;
    let active = true;
    const fetchMessages = async () => {
      const client = getSupabase();
      if (!client) return;
      try {
        const { data, error } = await client
          .from('messages')
          .select('*')
          .eq('match_id', matchId)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('Error fetching messages from Supabase:', error.message);
          return;
        }

        if (data && data.length > 0) {
          const hydratedMessages = await Promise.all(data.map(async (m: any) => {
            const messageContent = m.content || m.text || '';
            const isGif = messageContent.startsWith('[GIF] ');
            const messageType = isGif
              ? 'gif'
              : m.message_type === 'image' || m.message_type === 'voice'
              ? m.message_type
                : messageContent.startsWith('data:image/')
                  ? 'image'
                  : 'text';
            const isEphemeral = m.is_ephemeral === true;
            let text = isGif ? messageContent.slice('[GIF] '.length) : messageContent;
            let audioUrl: string | undefined;
            if (messageType === 'image' && m.media_url && !isEphemeral) {
              try {
                const mediaResponse = await authFetch(`/api/messages/${encodeURIComponent(m.id)}/media-url`);
                const mediaPayload = await mediaResponse.json().catch(() => null);
                if (!mediaResponse.ok) {
                  throw new Error(mediaPayload?.error || 'Image indisponible.');
                }
                text = mediaPayload.url;
              } catch (error) {
                console.error(`Chat image ${m.id} could not be loaded:`, error);
                text = '';
              }
            }
            if (messageType === 'voice' && m.media_url) {
              try {
                const mediaResponse = await authFetch(`/api/messages/${encodeURIComponent(m.id)}/media-url`);
                const mediaPayload = await mediaResponse.json().catch(() => null);
                if (!mediaResponse.ok || typeof mediaPayload?.url !== 'string') {
                  throw new Error(mediaPayload?.error || 'Note vocale indisponible.');
                }
                audioUrl = mediaPayload.url;
              } catch (error) {
                console.error(`Chat voice note ${m.id} could not be loaded:`, error);
              }
            }
            return {
              id: m.id,
              text: isEphemeral && (m.media_viewed_at || !m.media_url) ? '' : text,
              sender: (m.sender_id === currentUserId ? 'me' : 'them') as 'me' | 'them',
              time: new Date(m.created_at || m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              type: messageType,
              status: (m.is_read ? 'read' : 'sent') as 'read' | 'sent',
              audioUrl,
              duration: m.duration,
              isEphemeral,
              isViewed: Boolean(m.media_viewed_at || !m.media_url),
              isPrivateContent: Boolean(m.is_private_content)
            };
          }));
          if (active) setMessages(hydratedMessages);
        } else if (initialMsgs && initialMsgs.length > 0) {
          if (active) setMessages(initialMsgs.map((m: any, index: number) => ({
            id: index + 1,
            text: m.text,
            sender: (m.sender === 'me' || m.sender === 'user') ? 'me' : 'them',
            time: m.time || (m.timestamp ? new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '14:52'),
            type: m.type || 'text',
            status: 'read'
          })));
        } else {
          if (active) setMessages([]);
        }
      } catch (err) {
        console.warn('Failed to load messages from Supabase:', err);
      }
    };

    fetchMessages();

    const client = getSupabase();
    let channel: any = null;
    
    if (client) {
      channel = client
        .channel(`public:messages:match_id=eq.${matchId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
          () => {
            fetchMessages();
          }
        )
        .subscribe();
    }
    
    return () => {
      active = false;
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, [matchId, currentUserId, profile.initialMessage, profile.name]);

  const [inputText, setInputText] = useState('');
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<any | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isReciprocalConversation = useMemo(() => {
    const hasUserSent = messages.some(m => m.sender === 'me' && m.type !== 'system_block');
    const hasPartnerSent = messages.some(m => m.sender === 'them' && m.type !== 'system_block');
    return hasUserSent && hasPartnerSent;
  }, [messages]);

  const handlePressStart = (msg: any) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && window.navigator?.vibrate) {
        try { window.navigator.vibrate(40); } catch (_) {}
      }
      setSelectedMessageForAction(msg);
    }, 450);
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Swipe to reveal timestamps drawer (IMG_4448.PNG)
  const [chatDragOffset, setChatDragOffset] = useState(0);
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isHorizontalChatSwipeRef = useRef<boolean | null>(null);

  const handleChatTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    touchStartXRef.current = clientX;
    touchStartYRef.current = clientY;
    isHorizontalChatSwipeRef.current = null;
    setIsDraggingChat(true);
  };

  const handleChatTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - touchStartXRef.current;
    const deltaY = clientY - touchStartYRef.current;

    if (isHorizontalChatSwipeRef.current === null) {
      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        isHorizontalChatSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isHorizontalChatSwipeRef.current && deltaX < 0) {
      // Pulling left: deltaX is negative
      const clampedOffset = Math.max(-75, deltaX * 0.85);
      setChatDragOffset(clampedOffset);
    }
  };

  const handleChatTouchEnd = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isHorizontalChatSwipeRef.current = null;
    setIsDraggingChat(false);
    setChatDragOffset(0);
  };

  const handleSwipeReply = (msg: any) => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      try { window.navigator.vibrate(25); } catch (_) {}
    }
    setReplyingToMessage(msg);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 80);
  };

  const [showRechargeMenu, setShowRechargeMenu] = useState(false);
  const [bypassedPopularWall, setBypassedPopularWall] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(true);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [showReadReceiptModal, setShowReadReceiptModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const QUESTIONS_DATABASE = [
    "Quel type de personne t'attire, bizarrement ?",
    "Cite-moi une chose qui ne passe pas avec toi...",
    "Que préfères-tu boire en confinement ? Du vin, du café ou des cocktails ?",
    "Si tu pouvais régler un problème de société, ce serait...",
    "Quel est ton endroit préféré pour un premier rendez-vous ?",
    "Quelle est ta plus grande passion dans la vie ?",
    "Si on partait en voyage demain, quelle serait notre destination ?",
    "Quel est ton talent caché le plus surprenant ?"
  ];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showCallWarningModal, setShowCallWarningModal] = useState(false);

  const [showMediaDrawer, setShowMediaDrawer] = useState(false);
  const [activeMediaTab, setActiveMediaTab] = useState<'gallery' | 'location'>('gallery');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showWaitingReplyModal, setShowWaitingReplyModal] = useState(false);

  const waitingForReply = useMemo(() => {
    if (messages.length === 0) return false;
    const lastMsg = messages[messages.length - 1];
    const hasSentMessage = messages.some(m => m.sender === 'me');
    return hasSentMessage && lastMsg.sender === 'me';
  }, [messages]);

  const isTopProfile = useMemo(() => {
    return aiMonetizationEngine.isProfileHighlyPopular(profile);
  }, [profile]);

  const shouldEnforcePopularWall = useMemo(() => {
    return isTopProfile && !hasExchangedMessages && !bypassedPopularWall;
  }, [isTopProfile, hasExchangedMessages, bypassedPopularWall]);

  const lastThemMsgIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'them' && messages[i].type !== 'system_block') {
        return i;
      }
    }
    return -1;
  }, [messages]);

  // Enhanced Chat States
  const [isTyping] = useState(false);
  const [isEphemeralToggle, setIsEphemeralToggle] = useState(false);
  const [viewingEphemeralMsg, setViewingEphemeralMsg] = useState<any | null>(null);
  const [ephemeralSeconds, setEphemeralSeconds] = useState(5);
  const ephemeralImageUrlRef = useRef<string | null>(null);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'gif'>('emoji');

  const GIPHY_PRESETS = [
    { id: 'g1', tag: 'Sourire', url: 'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif' },
    { id: 'g2', tag: 'Flirt', url: 'https://media.giphy.com/media/26hpKMTa5Hg1XUA36/giphy.gif' },
    { id: 'g3', tag: 'Bisou', url: 'https://media.giphy.com/media/l0G192BfLFiMMf39C/giphy.gif' },
    { id: 'g4', tag: 'Coucou', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif' },
    { id: 'g5', tag: 'Danse', url: 'https://media.giphy.com/media/l2JIdnF6aJcAqz3qM/giphy.gif' },
    { id: 'g6', tag: 'Rire', url: 'https://media.giphy.com/media/10pA4ee7MzvMBS/giphy.gif' },
    { id: 'g7', tag: 'Cœur', url: 'https://media.giphy.com/media/26FLdmIp6wJr91JAI/giphy.gif' },
    { id: 'g8', tag: 'Clin d\'œil', url: 'https://media.giphy.com/media/Gf3AUz3eBNbTW/giphy.gif' }
  ];

  const gallerySamples = [
    { id: 'cam', isCameraTile: true },
    { id: 'img1', url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&auto=format&fit=crop&q=80' },
    { id: 'img2', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=80' },
    { id: 'img3', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80' },
  ];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const bannerScrollRef = useRef<HTMLDivElement | null>(null);

  // In-Chat Live Camera & Video recording states ("À la volée" - environment/rear camera by default)
  const [showChatCamera, setShowChatCamera] = useState(false);
  const [chatCameraFacing, setChatCameraFacing] = useState<'environment' | 'user'>('environment');
  const [chatCameraFlash, setChatCameraFlash] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordSeconds, setVideoRecordSeconds] = useState(0);
  const chatVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatStreamRef = useRef<MediaStream | null>(null);
  const chatVideoRecorderRef = useRef<MediaRecorder | null>(null);
  const chatVideoChunksRef = useRef<Blob[]>([]);
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Voice recording states with MediaRecorder
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceAudioChunksRef = useRef<Blob[]>([]);
  const voiceStreamRef = useRef<MediaStream | null>(null);

  // Calling states (WebRTC with STUN & getUserMedia)
  const [activeCall, setActiveCall] = useState<null | {
    type: 'audio' | 'video',
    status: 'ringing' | 'connected',
    duration: number
  }>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callFacingMode, setCallFacingMode] = useState<'user' | 'environment'>('user');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callIdRef = useRef<string | null>(null);
  const processedSignalsRef = useRef(new Set<string>());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const emojis = [
    { char: '🌹' },
    { char: '❤️‍🔥' },
    { char: '🌈' },
    { char: '😄' },
    { char: '☕' },
    { char: '🦋' },
    { char: '🍾' },
    { char: '🎮' },
    { char: '👑' },
    { char: '🎈' },
    { char: '🥤' },
    { char: '💌' },
    { char: '💘' },
    { char: '😎' },
    { char: '🏋️' },
    { char: '💡' },
  ];

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall?.type]);

  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isCameraOff;
      });
    }
  }, [isCameraOff, localStream]);

  useEffect(() => {
    let connectTimer: NodeJS.Timeout | null = null;
    if (activeCall && activeCall.status === 'connected') {
      connectTimer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (connectTimer) clearInterval(connectTimer);
    };
  }, [activeCall?.status]);

  // STUN config for WebRTC mobile NAT traversal
  const rtcConfig = useMemo(() => ({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }), []);

  // WebRTC Native Call Initiation
  const startCalling = async (type: 'audio' | 'video') => {
    const hasThemReplied = messages.some(msg => msg.sender === 'them');
    if (!hasThemReplied) {
      setShowCallWarningModal(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { facingMode: callFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });
      setLocalStream(stream);

      // WebRTC RTCPeerConnection initialization
      try {
        const callId = crypto.randomUUID();
        callIdRef.current = callId;
        processedSignalsRef.current.clear();
        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            void sendCallSignal({
              callId,
              receiverId: String(profile?.id || (profile as any)?.userId),
              signalType: 'ice',
              payload: event.candidate.toJSON()
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendCallSignal({
          callId,
          receiverId: String(profile?.id || (profile as any)?.userId),
          signalType: 'offer',
          payload: { ...offer, callType: type }
        });
      } catch (rtcErr) {
        console.warn('WebRTC peer connection setup fallback:', rtcErr);
      }

      setActiveCall({
        type,
        status: 'connected',
        duration: 0
      });
      setCallDuration(0);
      setIsMuted(false);
      setIsCameraOff(false);
      setShowFullProfile(false);
      playSynthAudio('voice_start');

      // Trigger native Web Push to wake up partner device even if app is closed
      const targetPartnerId = String(profile?.id || (profile as any)?.userId || 'partner');
      pushNotificationService.sendCallPushNotification({
        targetUserId: targetPartnerId,
        callType: type,
      }).catch(e => console.warn('Push call trigger background fallback:', e));
    } catch (err) {
      console.error("Access to camera or microphone failed:", err);
      setFeedbackToast("Accès caméra/micro refusé. Veuillez autoriser l'accès dans votre navigateur.");
      setTimeout(() => setFeedbackToast(null), 3500);
    }
  };

  useEffect(() => {
    if (!callIdRef.current || !profile?.id) return;
    const timer = window.setInterval(async () => {
      const callId = callIdRef.current;
      const pc = peerConnectionRef.current;
      if (!callId || !pc) return;
      try {
        const signals = await fetchCallSignals(callId);
        for (const signal of signals) {
          if (processedSignalsRef.current.has(signal.id) || signal.sender_id === currentUserId) continue;
          processedSignalsRef.current.add(signal.id);
          if (signal.signal_type === 'answer' && signal.payload) {
            await pc.setRemoteDescription(signal.payload);
            setActiveCall((prev) => prev ? { ...prev, status: 'connected' } : prev);
          } else if (signal.signal_type === 'ice' && signal.payload) {
            await pc.addIceCandidate(signal.payload);
          } else if (signal.signal_type === 'hangup') {
            endCalling();
          }
        }
      } catch (error) {
        console.warn('Call signaling poll failed:', error);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [profile?.id, currentUserId, activeCall?.status]);

  useEffect(() => {
    if (activeCall || callIdRef.current) return;
    const timer = window.setInterval(async () => {
      try {
        const [incoming] = await fetchIncomingCallSignals();
        if (!incoming || processedSignalsRef.current.has(incoming.id)) return;
        processedSignalsRef.current.add(incoming.id);
        const callType = incoming.payload?.callType === 'video' ? 'video' : 'audio';
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video' ? { facingMode: 'user' } : false
        });
        const pc = new RTCPeerConnection(rtcConfig);
        const callId = String(incoming.call_id);
        callIdRef.current = callId;
        peerConnectionRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) remoteVideoRef.current.srcObject = event.streams[0];
        };
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            void sendCallSignal({
              callId,
              receiverId: incoming.sender_id,
              signalType: 'ice',
              payload: event.candidate.toJSON()
            });
          }
        };
        await pc.setRemoteDescription(incoming.payload);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendCallSignal({
          callId,
          receiverId: incoming.sender_id,
          signalType: 'answer',
          payload: answer
        });
        setLocalStream(stream);
        setActiveCall({ type: callType, status: 'connected', duration: 0 });
      } catch (error) {
        console.warn('Incoming WebRTC call failed:', error);
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [activeCall, rtcConfig]);

  const toggleCallCameraFacing = async () => {
    if (!activeCall || activeCall.type !== 'video' || !localStream) return;
    const nextFacing = callFacingMode === 'user' ? 'environment' : 'user';
    setCallFacingMode(nextFacing);

    try {
      localStream.getTracks().forEach(track => track.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: nextFacing }
      });
      setLocalStream(newStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
    } catch (e) {
      console.warn('Failed to switch call camera:', e);
    }
  };

  const endCalling = () => {
    if (!activeCall) return;
    
    playSynthAudio('hangup');
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (_) {}
      peerConnectionRef.current = null;
    }
    const targetPartnerId = String(profile?.id || (profile as any)?.userId || '');
    if (callIdRef.current && targetPartnerId) {
      void sendCallSignal({
        callId: callIdRef.current,
        receiverId: targetPartnerId,
        signalType: 'hangup',
        payload: {}
      }).catch((error) => console.warn('Call hangup signal failed:', error));
    }
    callIdRef.current = null;
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    const log = {
      id: Date.now(),
      sender: 'me' as const,
      time: 'Maintenant',
      type: 'call' as const,
      callType: activeCall.type,
      duration: callDuration
    };

    setMessages(prev => [...prev, log]);
    setActiveCall(null);
  };

  // 1. 🎙️ Enregistrement d'un Message Vocal (Microphone) avec MediaRecorder natif
  const initiateVoiceRecord = async () => {
    voiceAudioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      voiceMediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          voiceAudioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recorderMimeType = recorder.mimeType.split(';')[0] || 'audio/webm';
        const audioBlob = new Blob(voiceAudioChunksRef.current, { type: recorderMimeType });
        const elapsed = recordingSeconds || 1;

        if (voiceStreamRef.current) {
          voiceStreamRef.current.getTracks().forEach(track => track.stop());
          voiceStreamRef.current = null;
        }
        const mimeType = audioBlob.type.split(';')[0];
        if (!['audio/webm', 'audio/ogg', 'audio/mp4'].includes(mimeType) || audioBlob.size > 6 * 1024 * 1024) {
          setFeedbackToast('Format ou taille de note vocale non pris en charge. Limite : 6 Mo.');
          setTimeout(() => setFeedbackToast(null), 4000);
          return;
        }
        if (!audioBlob.size) {
          setFeedbackToast('Aucun son n’a été enregistré.');
          setTimeout(() => setFeedbackToast(null), 3500);
          return;
        }
        void (async () => {
          try {
            const audioData = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error('Lecture de la note vocale impossible.'));
              reader.onload = () => typeof reader.result === 'string'
                ? resolve(reader.result)
                : reject(new Error('Format de note vocale invalide.'));
              reader.readAsDataURL(audioBlob);
            });
            const receiverId = String(profile.user_id || profile.id || discussion?.userId || '');
            const response = await authFetch('/api/messages/voice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ receiverId, audioData })
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.message?.id || typeof payload.mediaUrl !== 'string') {
              throw new Error(payload?.error || 'Le serveur n’a pas confirmé l’envoi de la note vocale.');
            }
            setMessages(prev => prev.some(message => message.id === payload.message.id) ? prev : [...prev, {
              id: payload.message.id,
              sender: 'me' as const,
              time: new Date(payload.message.created_at || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              type: 'voice' as const,
              duration: elapsed,
              audioUrl: payload.mediaUrl,
              status: 'sent' as const
            }]);
          } catch (error) {
            console.error('Chat voice note send failed:', error);
            setFeedbackToast(error instanceof Error ? error.message : 'La note vocale n’a pas été envoyée.');
            setTimeout(() => setFeedbackToast(null), 4000);
          }
        })();
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      playSynthAudio('voice_start');

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Accès micro refusé ou indisponible:", err);
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach(track => track.stop());
        voiceStreamRef.current = null;
      }
      setIsRecording(false);
      setFeedbackToast('Enregistrement vocal indisponible. Vérifiez les permissions du microphone.');
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  const cancelVoiceRecord = () => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state !== 'inactive') {
      voiceMediaRecorderRef.current.onstop = null;
      voiceMediaRecorderRef.current.stop();
    }
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach(track => track.stop());
      voiceStreamRef.current = null;
    }
    voiceAudioChunksRef.current = [];
    playSynthAudio('voice_stop');
  };

  const finalizeVoiceRecord = () => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    playSynthAudio('voice_stop');

    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state !== 'inactive') {
      voiceMediaRecorderRef.current.stop();
    } else {
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach(track => track.stop());
        voiceStreamRef.current = null;
      }
      setFeedbackToast('Cet appareil ne prend pas en charge l’enregistrement vocal.');
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  // 2. 📸 Prendre une Photo ou Vidéo "à la volée" (Caméra arrière { facingMode: "environment" } par défaut)
  const openChatCamera = async (facing: 'environment' | 'user' = chatCameraFacing) => {
    try {
      if (chatStreamRef.current) {
        chatStreamRef.current.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      chatStreamRef.current = mediaStream;
      if (chatVideoRef.current) {
        chatVideoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn("Camera stream failed, falling back to file picker:", err);
      setShowChatCamera(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        fileInputRef.current?.click();
      }
    }
  };

  const toggleChatCameraFacing = () => {
    const next = chatCameraFacing === 'environment' ? 'user' : 'environment';
    setChatCameraFacing(next);
    openChatCamera(next);
  };

  const closeChatCamera = () => {
    if (isRecordingVideo && chatVideoRecorderRef.current) {
      try {
        chatVideoRecorderRef.current.stop();
      } catch (_) {}
    }
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    if (chatStreamRef.current) {
      chatStreamRef.current.getTracks().forEach(track => track.stop());
      chatStreamRef.current = null;
    }
    setIsRecordingVideo(false);
    setVideoRecordSeconds(0);
    setShowChatCamera(false);
  };

  useEffect(() => {
    if (showChatCamera) {
      openChatCamera(chatCameraFacing);
    } else {
      closeChatCamera();
    }
    return () => {
      if (chatStreamRef.current) {
        chatStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current);
      }
    };
  }, [showChatCamera]);

  // Option A : Prendre une Photo instantanée
  const takeChatPhoto = () => {
    if (chatVideoRef.current && chatCanvasRef.current) {
      const video = chatVideoRef.current;
      const canvas = chatCanvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        
        if (chatCameraFacing === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.setTransform(1, 0, 0, 1, 0, 0);

        const photoBase64 = canvas.toDataURL('image/jpeg', 0.88);
        handleSendImage(photoBase64);
        playSynthAudio('beep');
        closeChatCamera();
      }
    }
  };

  // Option B : Enregistrer une courte séquence Vidéo
  const toggleVideoRecord = () => {
    setFeedbackToast('L’envoi de vidéos dans le chat n’est pas encore disponible.');
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (viewingEphemeralMsg) {
      setEphemeralSeconds(5);
      timer = setInterval(() => {
        setEphemeralSeconds(prev => {
          if (prev <= 1) {
            if (timer) clearInterval(timer);
            setMessages(msgs => msgs.map(m =>
              m.id === viewingEphemeralMsg.id
                ? { ...m, isViewed: true, text: '' }
                : m
            ));
            if (ephemeralImageUrlRef.current) {
              URL.revokeObjectURL(ephemeralImageUrlRef.current);
              ephemeralImageUrlRef.current = null;
            }
            setViewingEphemeralMsg(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [viewingEphemeralMsg]);

  useEffect(() => () => {
    if (ephemeralImageUrlRef.current) {
      URL.revokeObjectURL(ephemeralImageUrlRef.current);
      ephemeralImageUrlRef.current = null;
    }
  }, []);

  const handleSendQuestion = async (questionText: string) => {
    const newMsg = {
      text: questionText,
      sender: 'me' as const,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      type: 'text' as const,
      status: 'sent' as const
    };

    const questionReceiverId = profile?.user_id || profile?.id || discussion?.userId;
    try {
      if (!questionReceiverId) throw new Error('Destinataire de conversation introuvable.');
      const savedMessage = await sendMessageThroughServer(matchId, questionReceiverId, questionText);
      if (!savedMessage?.id) throw new Error('Le serveur n’a pas confirmé l’envoi.');
      setMessages(prev => prev.some(message => message.id === savedMessage.id)
        ? prev
        : [...prev, { ...newMsg, id: savedMessage.id, status: 'sent' as const }]);
      setShowQuestionModal(false);
    } catch (error) {
      console.error('Chat question send failed:', error);
      setFeedbackToast(error instanceof Error ? error.message : 'La question n’a pas été envoyée.');
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  const [rudeWarningData, setRudeWarningData] = useState<{
    originalText: string;
    reason: string;
    suggestedReformulation?: string;
  } | null>(null);

  const [revealedPrivateImages, setRevealedPrivateImages] = useState<Record<number, boolean>>({});
  const [privateDetectorMsg, setPrivateDetectorMsg] = useState<any | null>(null);

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim()) return;

    const deceptionResult = aiSystemEngine.analyzeScamProbability(textToSend, messages.filter(m => m.sender === 'me').length);
    if (deceptionResult.isSuspicious) {
      alert(`🚨 Détecteur de fraude (Anti-Scam) :\n\n${deceptionResult.reason}`);
      return;
    }

    try {
      const rudeRes = await authFetch('/api/ai/rude-detector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textToSend })
      });
      const rudeData = await rudeRes.json();
      if (!rudeData.isSafe || rudeData.isRude) {
        setRudeWarningData({
          originalText: textToSend,
          reason: rudeData.reason || "Propos déplacés détectés par le système de modération.",
          suggestedReformulation: rudeData.suggestedReformulation
        });
        return;
      }
    } catch (err) {
      console.error("Internal message moderation unavailable:", err);
      alert("La modération interne est indisponible. Le message n’a pas été envoyé.");
      return;
    }

    const userText = textToSend;
    setInputText('');
    setReplyingToMessage(null);
    setRudeWarningData(null);
    const newMsg = {
      text: userText,
      sender: 'me' as const,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      type: 'text' as const,
      status: 'sent' as const
    };

    const targetId = profile.user_id || profile.id || '';
    try {
      const savedMessage = await sendMessageThroughServer(matchId, targetId, userText);
      if (!savedMessage?.id) throw new Error('Le serveur n’a pas confirmé l’envoi.');
      setMessages(prev => prev.some(message => message.id === savedMessage.id)
        ? prev
        : [...prev, { ...newMsg, id: savedMessage.id, status: 'sent' as const }]);
    } catch (error) {
      console.error('Chat text message send failed:', error);
      setInputText(userText);
      setFeedbackToast(error instanceof Error ? error.message : 'Le message n’a pas été envoyé.');
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    const added = {
      text: gifUrl,
      sender: 'me' as const,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      type: 'gif' as const,
      status: 'sent' as const
    };
    try {
      const receiverId = String(profile.user_id || profile.id || discussion?.userId || '');
      const savedMessage = await sendMessageThroughServer(matchId, receiverId, `[GIF] ${gifUrl}`, 'image');
      if (!savedMessage?.id) throw new Error('Le serveur n’a pas confirmé l’envoi du GIF.');
      setMessages(prev => prev.some(message => message.id === savedMessage.id)
        ? prev
        : [...prev, { ...added, id: savedMessage.id, status: 'sent' as const }]);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Chat GIF send failed:', error);
      setFeedbackToast(error instanceof Error ? error.message : 'Le GIF n’a pas été envoyé.');
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  const handleSendImage = async (base64Image: string, isEphemeralParam: boolean = false) => {
    const isEphemeralPhoto = isEphemeralParam || isEphemeralToggle;
    const receiverId = String(profile.user_id || profile.id || '');
    try {
      const response = await authFetch('/api/messages/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId,
          imageBase64: base64Image,
          isEphemeral: isEphemeralPhoto
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'L’image n’a pas pu être envoyée.');
      }

      const savedMessage = data?.message;
      if (!savedMessage?.id) throw new Error('Le serveur n’a pas confirmé l’enregistrement de l’image.');
      const added = {
        id: savedMessage.id,
        text: isEphemeralPhoto ? '' : String(data.mediaUrl || ''),
        sender: 'me' as const,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        type: 'image' as const,
        status: 'sent' as const,
        isEphemeral: isEphemeralPhoto,
        isViewed: false,
        isPrivateContent: Boolean(data.moderation?.blurRequired || data.moderation?.isPrivateContent)
      };
      setMessages(prev => prev.some(message => message.id === added.id) ? prev : [...prev, added]);
    } catch (error) {
      console.error('Chat image send failed:', error);
      alert(error instanceof Error
        ? `${error.message} L’image n’a pas été envoyée.`
        : 'L’image n’a pas été envoyée.');
    }
  };

  const handleOpenEphemeralImage = async (message: (typeof messages)[number]) => {
    if (message.isViewed) return;
    if (
      message.isPrivateContent &&
      !window.confirm('Cette photo a été détectée comme potentiellement sensible. L’ouvrir une seule fois ?')
    ) {
      return;
    }
    try {
      const response = await authFetch(`/api/messages/${encodeURIComponent(message.id)}/media-url`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        if (response.status === 410) {
          setMessages(prev => prev.map(item =>
            item.id === message.id ? { ...item, isViewed: true, text: '' } : item
          ));
        }
        throw new Error(payload?.error || 'Cette photo éphémère est indisponible.');
      }
      if (!response.headers.get('Content-Type')?.startsWith('image/')) {
        throw new Error('Le serveur n’a pas renvoyé une image valide.');
      }
      const imageUrl = URL.createObjectURL(await response.blob());
      if (ephemeralImageUrlRef.current) URL.revokeObjectURL(ephemeralImageUrlRef.current);
      ephemeralImageUrlRef.current = imageUrl;
      setMessages(prev => prev.map(item =>
        item.id === message.id ? { ...item, isViewed: true, text: '' } : item
      ));
      setViewingEphemeralMsg({ ...message, text: imageUrl });
    } catch (error) {
      console.error('Opening ephemeral chat image failed:', error);
      alert(error instanceof Error ? error.message : 'Cette photo éphémère est indisponible.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await ImageCompressionService.compressImageFile(file, {
          maxWidth: 1080,
          maxHeight: 1080,
          quality: 0.8,
          format: 'image/webp',
        });
        handleSendImage(compressed.dataUrl);
      } catch (err) {
        console.warn('Fallback to uncompressed file reader:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            handleSendImage(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    setShowMediaDrawer(false);
  };

  const handleToggleLocation = () => {
    const nextState = !locationEnabled;
    setLocationEnabled(nextState);
    if (nextState) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const locText = `📍 Localisation partagée (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`;
            saveMessageToSupabase(matchId, currentUserId, locText, true);
            setMessages(prev => [...prev, {
              id: Date.now(),
              text: locText,
              sender: 'me',
              time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              type: 'location'
            }]);
          },
          (err) => {
            console.warn('Geolocation error:', err);
            const fallbackLoc = profile.location ? `📍 ${profile.location}` : null;
            if (!fallbackLoc) return;
            saveMessageToSupabase(matchId, currentUserId, fallbackLoc, true);
            setMessages(prev => [...prev, {
              id: Date.now(),
              text: fallbackLoc,
              sender: 'me',
              time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              type: 'location'
            }]);
          }
        );
      } else {
        const fallbackLoc = profile.location ? `📍 ${profile.location}` : null;
        if (!fallbackLoc) return;
        saveMessageToSupabase(matchId, currentUserId, fallbackLoc, true);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: fallbackLoc,
          sender: 'me',
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          type: 'location'
        }]);
      }
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const photos = Array.isArray(profile?.photos) ? profile.photos.filter((photo: unknown): photo is string => typeof photo === 'string' && photo.length > 0) : [];
  const mainPhoto = (typeof profile?.img === 'string' && profile.img) || photos[photos.length - 1] || '';

  useEffect(() => {
    if (bannerScrollRef.current && photos.length >= 2) {
      // Scroll to the far right initially so the main photo + profile info card are visible on entry (IMG_4396.PNG)
      bannerScrollRef.current.scrollLeft = bannerScrollRef.current.scrollWidth;
    }
  }, [photos.length, isInputFocused]);

  if (showFullProfile) {
    const isProfileVerified = Boolean(
      profile.verified === true || 
      profile.isVerified === true || 
      profile.is_verified === true || 
      profile.isPhotoVerified === true
    );

    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed inset-0 bg-white z-[140] flex flex-col h-[100dvh] overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="pt-6 sm:pt-8 pb-2 px-4 flex items-center justify-between shrink-0 bg-white border-b border-gray-100/60 z-20">
          <button 
            onClick={() => setShowFullProfile(false)} 
            className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors active:scale-95 cursor-pointer"
            aria-label="Retour"
          >
            <ChevronLeft className="w-8 h-8 text-black" strokeWidth={2.2} />
          </button>
          <div className="flex items-center space-x-6">
            {allowVoiceCall && (
              <button 
                onClick={() => startCalling('audio')} 
                className="p-1 hover:scale-105 active:scale-95 transition-transform cursor-pointer" 
                aria-label="Appel vocal"
              >
                <Phone className="w-[22px] h-[22px] text-black fill-black" />
              </button>
            )}
            {allowVideoCall && (
              <button 
                onClick={() => startCalling('video')} 
                className="p-1 hover:scale-105 active:scale-95 transition-transform cursor-pointer" 
                aria-label="Appel vidéo"
              >
                <Video className="w-[26px] h-[26px] text-black fill-black" />
              </button>
            )}
            <button 
              onClick={() => setShowOptionsMenu(true)} 
              className="p-1 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              aria-label="Options"
            >
              <MoreHorizontal className="w-7 h-7 text-black" strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Scrollable Profile Body matching photos 1, 2, 3 */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative select-none">
          {/* 1. Hero Photo Card (menu button voir profil 1.PNG) */}
          <div className="mx-3 sm:mx-4 mt-2 mb-6 rounded-[28px] sm:rounded-[34px] overflow-hidden relative shadow-md bg-gray-100 h-[480px] sm:h-[540px] shrink-0">
            {mainPhoto ? (
              <img 
                src={mainPhoto} 
                alt={partnerName ? `Photo de ${partnerName}` : 'Photo de profil'} 
                className="w-full h-full object-cover object-[center_30%]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-gray-500">
                Aucune photo disponible
              </div>
            )}

            {/* Gradient Top & Bottom for readability */}
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

            {/* Top Overlay inside Image Card */}
            <div className="absolute top-5 inset-x-5 z-10 flex items-center justify-between">
              {/* Blue check + Name, Age */}
              <div className="flex items-center space-x-2 text-white drop-shadow-md">
                {isProfileVerified && (
                  <span className="w-5 h-5 rounded-full bg-[#0084ff] text-white flex items-center justify-center shrink-0 shadow-xs" title="Profil vérifié">
                    <Check className="w-3 h-3 stroke-[3.5]" />
                  </span>
                )}
                <h1 className="text-[22px] sm:text-[24px] font-extrabold tracking-tight">
                  {partnerName}{profile.age ? `, ${profile.age}` : ''}
                </h1>
              </div>

              {/* 3-dots button on photo */}
              <button 
                onClick={() => setShowOptionsMenu(true)}
                className="w-8 h-8 rounded-full bg-black/25 backdrop-blur-xs text-white flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
              >
                <MoreHorizontal className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* Tag Pills on Photo (menu button voir profil 1.PNG) */}
            <div className="absolute top-16 left-5 z-10 flex flex-col items-start space-y-2">
              {(profile.relationshipGoal || profile.relationship) && (
                <div className="bg-white text-black px-3.5 py-1.5 rounded-full flex items-center space-x-1.5 shadow-sm">
                  <Heart className="w-3.5 h-3.5 fill-black text-black" />
                  <span className="text-[13px] font-bold">{profile.relationshipGoal || profile.relationship}</span>
                </div>
              )}

              {profile.distance && (
                <div className="bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center space-x-1.5 shadow-sm border border-white/10 text-white">
                  <MapPin className="w-3.5 h-3.5 text-white fill-white" />
                  <span className="text-[13px] font-bold">{profile.distance}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Detailed Profile Sections (menu button voir profil2.PNG & voir profil 3.PNG) */}
          <div className="px-5 sm:px-6 space-y-6 text-left pb-36">
            {/* Localisation */}
            {(profile.location || profile.city) && <div>
              <p className="text-[13.5px] text-gray-500 font-bold">Localisation</p>
              <h2 className="text-[20px] sm:text-[22px] font-extrabold text-black tracking-tight mt-0.5">
                {profile.location || profile.city}
              </h2>
            </div>}

            {/* Au niveau relations */}
            <div>
              <p className="text-[13.5px] text-gray-500 font-bold mb-2.5">Au niveau relations</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <Heart className="w-4 h-4 fill-black text-black" />
                  <span>{profile.relationshipGoal || profile.keyQuestion || "Non renseigné"}</span>
                </span>
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <Heart className="w-4 h-4 fill-black text-black" />
                  <span>{profile.maritalStatus || profileDetails.relation || "Non renseigné"}</span>
                </span>
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <span className="text-[14px]">⚥</span>
                  <span>{profile.orientation || profileDetails.sexuality || "Non renseigné"}</span>
                </span>
              </div>
            </div>

            {/* Les langues que je parle */}
            <div>
              <p className="text-[13.5px] text-gray-500 font-bold mb-2.5">Les langues que je parle</p>
              <div className="flex flex-wrap gap-2">
                {profileLanguages.length > 0 ? profileLanguages.map((language: string) => (
                  <span key={language} className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-1.5">
                    <span className="font-bold text-[13px]">文A</span>
                    <span>{language}</span>
                  </span>
                )) : <span className="text-sm text-gray-500">Non renseigné</span>}
              </div>
            </div>

            {/* Plus d'infos sur moi */}
            <div>
              <p className="text-[13.5px] text-gray-500 font-bold mb-2.5">Plus d'infos sur moi</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <span>👶</span>
                  <span>{profile.children || profileDetails.children || "Non renseigné"}</span>
                </span>
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <span>🚭</span>
                  <span>{profile.smoking || profileDetails.smoking || "Non renseigné"}</span>
                </span>
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <span>🍷</span>
                  <span>{profile.drinking || profileDetails.alcohol || "Non renseigné"}</span>
                </span>
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <span>📏</span>
                  <span>{profile.height || profileDetails.height || "Non renseigné"}</span>
                </span>
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <span>🎓</span>
                  <span>{profile.education || profileDetails.education || "Non renseigné"}</span>
                </span>
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <span>💭</span>
                  <span>{profile.personality || profileDetails.personality || "Non renseigné"}</span>
                </span>
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <span>🐾</span>
                  <span>{profile.pets || profileDetails.pets || "Non renseigné"}</span>
                </span>
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <span>🤲</span>
                  <span>{profile.religion || profileDetails.religion || "Non renseigné"}</span>
                </span>
                <span className="bg-[#F4F4F5] text-black font-semibold text-[14px] px-4 py-2 rounded-full flex items-center space-x-2">
                  <span>♈</span>
                  <span>{profile.zodiac || profileDetails.zodiac || "Non renseigné"}</span>
                </span>
              </div>
            </div>

            {/* Questions & Réponses (menu button voir profil 3.PNG) */}
            <div className="space-y-5 pt-2">
              {profilePrompts.length > 0 && (
                <div className="space-y-3">
                  {profilePrompts.map((prompt: any, index: number) => (
                    <div key={`${prompt.question}-${index}`}>
                      <p className="text-[13px] text-gray-500 font-bold">{prompt.question}</p>
                      <p className="text-[18px] sm:text-[19px] font-extrabold text-black mt-0.5 leading-snug">{prompt.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              {(profile.job || profile.occupation) && (
                <div>
                  <p className="text-[13px] text-gray-500 font-bold">Emploi</p>
                  <p className="text-[18px] sm:text-[19px] font-extrabold text-black mt-0.5">
                    {profile.job || profile.occupation}
                  </p>
                </div>
              )}

              {profile.is_verified === true && (
                <div>
                  <p className="text-[13px] text-gray-500 font-bold mb-2">Vérification</p>
                  <div className="flex items-center space-x-3">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                      {mainPhoto && <img src={mainPhoto} alt="" className="w-full h-full object-cover" />}
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#0084ff] rounded-full flex items-center justify-center text-white">
                        <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                      </div>
                    </div>
                    <span className="text-[15px] font-bold text-black">Profil vérifié</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Action Buttons at Bottom (photos 1, 2, 3) */}
        <div className="fixed bottom-6 inset-x-0 flex items-center justify-center space-x-5 z-40 pointer-events-none">
          {/* Message Action Button */}
          <button 
            type="button"
            onClick={() => setShowFullProfile(false)}
            className="w-[58px] h-[58px] sm:w-[62px] sm:h-[62px] bg-white rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.2)] active:scale-90 transition-transform cursor-pointer pointer-events-auto border border-gray-100/60"
            aria-label="Discussion"
          >
            <MessageCircle className="w-7 h-7 text-black fill-black" strokeWidth={1.5} />
          </button>

          {/* Heart Action Button */}
          <button 
            type="button"
            onClick={handleToggleFavorite}
            className="w-[58px] h-[58px] sm:w-[62px] sm:h-[62px] bg-white rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.2)] active:scale-90 transition-transform cursor-pointer pointer-events-auto border border-gray-100/60"
            aria-label="Favoris"
          >
            <Heart 
              className={`w-7 h-7 transition-colors ${isFavorite ? "fill-[#E20030] text-[#E20030]" : "fill-black text-black"}`} 
              strokeWidth={1.5} 
            />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 bg-white z-[130] flex flex-col h-[100dvh]"
    >
      {/* 1. Header Container */}
      <div className="bg-white shrink-0 z-10 border-b border-gray-100/80 shadow-2xs">
        {/* Top Action Bar */}
        <div className="pt-6 sm:pt-8 pb-2 px-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
            <button 
              onClick={onClose} 
              className="p-1 -ml-1 hover:bg-gray-100 rounded-full transition-colors active:scale-95 cursor-pointer shrink-0"
              aria-label="Retour"
            >
              {shouldBlockForVerification || shouldBlockForCriteriaMismatch ? (
                <X className="w-6 h-6 text-black" strokeWidth={2.2} />
              ) : (
                <ChevronLeft className="w-6 h-6 text-black" strokeWidth={2.2} />
              )}
            </button>

            {/* In State 2 (When cursor is in text input / typing): Show Avatar + Name + Online Status in header */}
            {(isInputFocused || inputText.trim().length > 0) && (
              <div 
                onClick={() => setShowFullProfile(true)} 
                className="flex items-center space-x-2.5 min-w-0 cursor-pointer animate-fade-in"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-100">
                  {mainPhoto ? (
                    <img src={mainPhoto} alt={profile.name ? `Photo de ${profile.name}` : 'Photo de profil'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Aucune photo</div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="text-[15px] font-bold text-black tracking-tight truncate leading-tight">
                    {profile.name || partnerName}
                  </h2>
                  <span className="text-[11px] text-gray-500 font-normal truncate leading-tight mt-0.5">
                    {profile.statusText || profile.lastSeen || (profile.online === true || profile.is_online === true ? 'En ligne' : '')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3.5 shrink-0">
            {allowVoiceCall && (
              <button 
                onClick={() => startCalling('audio')} 
                className="p-1 text-black hover:opacity-75 transition-opacity active:scale-95 cursor-pointer"
                aria-label="Appel vocal"
              >
                <Phone className="w-5 h-5 text-black" strokeWidth={2} />
              </button>
            )}
            {allowVideoCall && (
              <button 
                onClick={() => startCalling('video')} 
                className="p-1 text-black hover:opacity-75 transition-opacity active:scale-95 cursor-pointer"
                aria-label="Appel vidéo"
              >
                <Video className="w-5.5 h-5.5 text-black" strokeWidth={2} />
              </button>
            )}
            <button 
              onClick={handleMoreMenu} 
              className="p-1 text-black hover:opacity-75 transition-opacity active:scale-95 cursor-pointer"
              aria-label="Plus d'options"
            >
              <MoreHorizontal className="w-5.5 h-5.5 text-black" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Profile Card Banner - State 1 (When NOT input focused / initial access - Swipeable Gallery) */}
        {!(isInputFocused || inputText.trim().length > 0) && (
          <div className="border-t border-gray-100/90 bg-white">
            <div 
              ref={bannerScrollRef}
              className="px-3.5 py-2.5 flex items-center space-x-2.5 overflow-x-auto no-scrollbar scroll-smooth select-none touch-pan-x"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Gallery Photos thumbnails */}
              {photos.map((photoUrl: string, idx: number) => (
                <div 
                  key={idx}
                  onClick={() => setShowFullProfile(true)}
                  className="w-[62px] h-[68px] rounded-2xl overflow-hidden shadow-2xs border border-gray-200/80 shrink-0 bg-gray-100 cursor-pointer active:scale-95 transition-transform"
                >
                  <img 
                    src={photoUrl} 
                    alt={profile.name ? `Photo ${idx + 1} de ${profile.name}` : `Photo de profil ${idx + 1}`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}

              {/* Profile Info Text Card */}
              <div 
                onClick={() => setShowFullProfile(true)}
                className="flex items-center justify-between min-w-[210px] flex-1 cursor-pointer hover:bg-gray-50/80 transition-colors py-0.5 pl-1 pr-1.5 shrink-0"
              >
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {/* Verified Checkmark Badge + Name & Age */}
                  <div className="flex items-center space-x-1 flex-wrap">
                    {Boolean(profile?.verified === true || profile?.isVerified === true || profile?.is_verified === true || profile?.isPhotoVerified === true) && (
                      <div className="w-5 h-5 bg-[#0088FF] rounded-full flex items-center justify-center shrink-0 shadow-2xs mr-0.5" title="Profil vérifié par photo">
                        <Check className="w-3 h-3 text-white stroke-[3.5]" />
                      </div>
                    )}

                    <h2 className="text-[16px] font-bold text-black tracking-tight truncate leading-tight">
                      {profile.name || partnerName}{profile.age ? `, ${profile.age}` : ''}
                    </h2>
                    {(profile.online === true || profile.is_online === true) && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 ml-1" aria-label="En ligne" />}
                  </div>

                  {/* City Name */}
                  {(profile.location || profile.city) && (
                    <p className="text-[13px] font-bold text-black truncate mt-0.5">{profile.location || profile.city}</p>
                  )}

                  {/* Pin icon + Emplacement + ChevronRight */}
                  {profile.distance && (
                    <div className="flex items-center space-x-1 text-[12.5px] text-gray-800 font-semibold mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-black shrink-0" />
                      <span>{profile.distance}</span>
                    </div>
                  )}

                  {/* Intention Tag Pill matching IMG_4485.PNG */}
                  {(profile.intention || profile.relationGoal || profile.relation) && (
                    <div className="inline-flex items-center space-x-1.5 bg-[#f4f4f7] px-2.5 py-0.5 rounded-full text-[12px] font-semibold text-gray-800 mt-1 max-w-fit">
                      {profile.intentionEmoji && <span>{profile.intentionEmoji}</span>}
                      <span className="truncate">{profile.intention || profile.relationGoal || profile.relation}</span>
                    </div>
                  )}
                </div>

                {/* Chevron Arrow */}
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 ml-2" strokeWidth={2} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Verification Required Gate Box (IMG_4398.PNG) or Criteria Mismatch Locked Card (IMG_4485.PNG) or Active Chat Feed */}
      {shouldBlockForVerification ? (
        <div className="flex-1 bg-white flex flex-col justify-between overflow-y-auto">
          {/* Empty Space */}
          <div className="flex-1 min-h-[100px]" />

          {/* Verification Card Popup matching IMG_4398.PNG */}
          <div className="p-4 pb-8 bg-white border-t border-gray-100/60 animate-fade-in">
            <div className="bg-[#F2F2F6] rounded-[28px] p-6 text-center shadow-2xs border border-gray-200/50 max-w-sm mx-auto">
              {/* Blue Checkmark Badge Icon */}
              <div className="w-14 h-14 bg-[#0088FF] rounded-full flex items-center justify-center text-white mx-auto mb-4 shadow-sm">
                <Check className="w-8 h-8 stroke-[3.5] text-white" />
              </div>

              {/* Headline */}
              <h3 className="text-[18px] sm:text-[19px] font-black text-black tracking-tight mb-2">
                Vous devez faire vérifier votre profil
              </h3>

              <p className="text-[13.5px] text-gray-500 leading-relaxed font-normal mb-6 px-1">
                Cette personne exige un profil vérifié. Le service de vérification photo est temporairement indisponible.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-[#111111] hover:bg-black text-white font-bold text-[15px] py-3.5 rounded-full shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
              >
                Fermer la conversation
              </button>
            </div>
          </div>
        </div>
      ) : shouldBlockForCriteriaMismatch ? (
        <div className="flex-1 bg-white flex flex-col justify-between overflow-y-auto">
          {/* Empty Space matching conversation background */}
          <div className="flex-1 min-h-[100px]" />

          {/* Criteria Mismatch Locked Card matching IMG_4485.PNG */}
          <div className="p-4 pb-8 bg-white border-t border-gray-100/60 animate-fade-in w-full">
            <div className="bg-[#F2F2F6] rounded-[28px] p-6 text-center shadow-2xs border border-gray-200/50 max-w-sm mx-auto flex flex-col items-center">
              {/* Dark Circle Icon Badge */}
              <div className="w-14 h-14 bg-[#231728] rounded-full flex items-center justify-center text-white mx-auto mb-3.5 shadow-sm">
                <div className="w-7 h-7 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>
              </div>

              {/* Headline */}
              <h3 className="text-[19px] sm:text-[20px] font-black text-black tracking-tight mb-2">
                Passez premium pour discuter
              </h3>

              {/* Description */}
              <p className="text-[13.5px] text-gray-500 leading-relaxed font-normal mb-6 px-1 max-w-[310px]">
                Vous ne correspondez pas tout à fait à ses critères... Passez premium pour pouvoir lui envoyer un message :)
              </p>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenPremium) {
                    onOpenPremium('criteria');
                  } else {
                    setShowPremiumModal(true);
                  }
                }}
                className="w-full bg-[#111111] hover:bg-black text-white font-bold text-[15px] py-3.5 rounded-full shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
              >
                Profitez de Bavel Premium
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Messages Feed */}
          <div 
            onTouchStart={handleChatTouchStart}
            onTouchMove={handleChatTouchMove}
            onTouchEnd={handleChatTouchEnd}
            onTouchCancel={handleChatTouchEnd}
            onMouseDown={handleChatTouchStart}
            onMouseMove={handleChatTouchMove}
            onMouseUp={handleChatTouchEnd}
            onMouseLeave={handleChatTouchEnd}
            className="flex-1 overflow-y-auto overflow-x-hidden bg-white px-4 py-2 flex flex-col relative select-none"
          >
            <div 
              style={{
                transform: `translateX(${chatDragOffset}px)`,
                transition: isDraggingChat ? 'none' : 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
              className="w-full flex flex-col min-h-full"
            >
              <div className="text-center my-4">
                <span className="text-gray-400 text-[13px] font-medium tracking-tight">
                  {profile.matchDate || "Aujourd'hui"}
                </span>
              </div>

              <div className="flex flex-col space-y-4">
                {messages.map((msg, index) => {
                  const isMe = msg.sender === 'me';
                  const isSelected = selectedMessageForAction?.id === msg.id;

                  return (
                    <div 
                      key={msg.id} 
                      className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full transition-all ${
                        isSelected ? 'relative z-[260]' : ''
                      }`}
                    >
                      {/* Swipe to reply wrapper on message bubble */}
                      <SwipeableMessageBubble
                        msg={msg}
                        isMe={isMe}
                        onSwipeReply={handleSwipeReply}
                        onPressStart={handlePressStart}
                        onPressEnd={handlePressEnd}
                        onContextMenu={(m) => setSelectedMessageForAction(m)}
                      >
                        {msg.type === 'voice' ? (
                          <div
                            className={`transition-transform duration-150 select-none ${
                              isSelected ? 'scale-[1.03] ring-2 ring-purple-400 rounded-3xl shadow-2xl bg-white' : ''
                            }`}
                          >
                            <VoiceNoteBubble msg={msg} isMe={isMe} />
                          </div>
                        ) : msg.type === 'gif' ? (
                          <div 
                            className={`rounded-[20px] overflow-hidden shadow-xs my-1 border border-gray-200 bg-black p-1 flex flex-col transition-all ${
                              isSelected ? 'ring-2 ring-purple-400 scale-[1.03] shadow-2xl' : ''
                            } ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <img 
                              src={msg.text} 
                              alt="GIF Giphy" 
                              className="max-h-[190px] w-auto max-w-full rounded-[16px] object-cover" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex items-center space-x-1.5 px-2 pt-1 text-[10px] text-gray-400 font-extrabold select-none">
                              <span className="bg-white/20 text-white px-1 rounded text-[9px] font-black tracking-tighter">GIPHY</span>
                              <span>{msg.time}</span>
                            </div>
                          </div>
                        ) : msg.type === 'image' ? (
                          msg.isEphemeral ? (
                            isMe ? (
                              <div className="flex items-center space-x-2 bg-purple-50 text-purple-700 border border-purple-100 px-4 py-2.5 rounded-[22px] text-[13px] font-semibold my-1">
                                <Flame className="w-4 h-4 text-purple-500 shrink-0" />
                                <span>Photo éphémère envoyée</span>
                              </div>
                            ) : (
                            msg.isViewed ? (
                              <div className="flex items-center space-x-2 bg-gray-100 text-gray-500 border border-gray-200 px-4 py-2.5 rounded-[22px] text-[13px] font-semibold my-1">
                                <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                                <span>Photo expirée (Vue unique)</span>
                              </div>
                            ) : (
                              <button 
                                type="button"
                                onClick={() => handleOpenEphemeralImage(msg)}
                                className="flex items-center space-x-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 text-white px-4 py-3 rounded-[22px] font-extrabold text-[13.5px] shadow-md my-1 active:scale-95 transition-transform cursor-pointer"
                              >
                                <Sparkles className="w-4 h-4 text-yellow-300 animate-spin shrink-0" />
                                <span>Photo éphémère - Appuyer pour voir</span>
                                <Eye className="w-4 h-4 ml-0.5 shrink-0" />
                              </button>
                            )
                            )
                          ) : (
                            <div 
                              onClick={() => {
                                if (msg.isPrivateContent && !revealedPrivateImages[msg.id]) {
                                  setPrivateDetectorMsg(msg);
                                } else {
                                  setPreviewImageUrl(msg.text || null);
                                }
                              }}
                              className={`relative rounded-[18px] overflow-hidden shadow-xs my-1 border border-gray-150/40 bg-white p-1 flex flex-col cursor-pointer transition-shadow hover:shadow-md ${
                                isSelected ? 'ring-2 ring-purple-400 scale-[1.03] shadow-2xl' : ''
                              } ${isMe ? 'items-end' : 'items-start'}`}
                            >
                              <div className="relative overflow-hidden rounded-[14px]">
                                <img 
                                  src={msg.text} 
                                  alt="Transmise" 
                                  className={`max-h-[200px] w-auto max-w-full rounded-[14px] object-cover transition-all duration-300 ${
                                    msg.isPrivateContent && !revealedPrivateImages[msg.id] ? 'blur-2xl scale-110 brightness-75' : ''
                                  }`} 
                                  referrerPolicy="no-referrer"
                                />
                                {msg.isPrivateContent && !revealedPrivateImages[msg.id] && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/40 backdrop-blur-md text-white rounded-[14px]">
                                    <Shield className="w-7 h-7 text-rose-400 mb-1 fill-rose-500/20 stroke-[2.5]" />
                                    <span className="text-[11.5px] font-extrabold text-rose-200">
                                      Private Detector™
                                    </span>
                                    <span className="text-[10px] text-gray-200 mt-0.5 leading-tight font-medium">
                                      Image intime potentielle floutée automatiquement.
                                    </span>
                                    <span className="mt-2 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-full text-[10px] font-black border border-white/30">
                                      Appuyer pour afficher
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 font-extrabold px-1 pt-1.5 select-none flex items-center justify-between w-full">
                                <span>{msg.time}</span>
                                {msg.isPrivateContent && (
                                  <span className="text-[9px] text-purple-600 font-black px-1.5 py-0.5 bg-purple-50 rounded">
                                    🛡️ Private Detector™
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        ) : msg.type === 'location' ? (
                          <div 
                            className={`flex items-center space-x-2 bg-purple-50 border border-purple-200/60 px-4 py-2.5 rounded-[20px] text-[14px] text-purple-950 font-bold shadow-xs my-1 cursor-pointer select-none ${
                              isSelected ? 'ring-2 ring-purple-400 scale-[1.03] shadow-2xl bg-white' : ''
                            }`}
                          >
                            <MapPin className="w-4 h-4 text-purple-600 fill-purple-600 shrink-0" />
                            <span>{msg.text}</span>
                          </div>
                        ) : msg.type === 'call' ? (
                          <div className="flex items-center space-x-2.5 bg-gray-50 border border-gray-100/80 px-4 py-2 rounded-2xl text-[13px] text-gray-500 font-semibold shadow-xs mx-auto my-1 select-none">
                            {msg.callType === 'video' ? (
                              <Video className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
                            ) : (
                              <Phone className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
                            )}
                            <span>
                              {msg.duration && msg.duration > 0 
                                ? `Appel ${msg.callType === 'video' ? 'vidéo' : 'vocal'} terminé (${formatDuration(msg.duration)})`
                                : `Appel ${msg.callType === 'video' ? 'vidéo' : 'vocal'} manqué`
                              }
                            </span>
                          </div>
                        ) : msg.type === 'system_block' ? (
                          <div className="flex flex-col items-start w-full max-w-[85%] my-2">
                            <div className="bg-white border border-gray-150/50 px-4 py-3.5 rounded-[22px] rounded-tl-[4px] text-[14.5px] text-black font-medium leading-relaxed shadow-xs">
                              {msg.text}
                            </div>
                            <div className="text-[12px] text-gray-400 mt-1.5 pl-1.5 font-bold tracking-tight">
                              L'équipe Bavel
                            </div>
                          </div>
                        ) : (
                          <div 
                            className={`px-3.5 py-2.5 rounded-[18px] transition-all duration-150 cursor-pointer select-none ${
                              isSelected 
                                ? 'bg-white text-black shadow-[0_12px_36px_rgba(0,0,0,0.3)] ring-2 ring-white scale-[1.03] ' + (isMe ? 'rounded-tr-[4px]' : 'rounded-tl-[4px]')
                                : isMe 
                                  ? 'bg-[#F0E6FF] text-black rounded-tr-[4px]' 
                                  : 'bg-gray-100 text-black rounded-tl-[4px]'
                            } text-[13.5px] font-medium leading-normal shadow-2xs`}
                          >
                            {msg.text}
                          </div>
                        )}
                      </SwipeableMessageBubble>

                      {/* Timestamps in right margin (revealed on pull left matching IMG_4448.PNG) */}
                      {msg.type !== 'system_block' && (
                        <div 
                          className="absolute -right-16 top-1/2 -translate-y-1/2 w-14 text-left pointer-events-none select-none text-gray-500 text-[13px] font-normal tracking-tight"
                          style={{
                            opacity: Math.min(1, Math.max(0, (Math.abs(chatDragOffset) - 10) / 25))
                          }}
                        >
                          {msg.time}
                        </div>
                      )}

                      {/* Read receipt trigger link under user's sent message */}
                      {isMe && msg.status !== 'read' && msg.type !== 'system_block' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenPremium) {
                              onOpenPremium('read_receipt');
                            } else if (onRechargeForReadReceipt) {
                              onRechargeForReadReceipt(profile.name);
                            } else {
                              setShowReadReceiptModal(true);
                            }
                          }}
                          className="text-[11px] text-black/70 hover:text-black font-medium underline mt-1 cursor-pointer hover:opacity-80 transition-opacity self-end text-right"
                        >
                          Vous voulez savoir si {profile.name} a lu votre message ?
                        </button>
                      )}

                      {/* Status indicator for My messages */}
                      {isMe && msg.type !== 'system_block' && (
                        <div className="flex items-center space-x-1 text-gray-400 text-[11px] font-bold mt-1 self-end select-none pr-1">
                          <span>{msg.time}</span>
                          {msg.status === 'sent' && (
                            <Check className="w-3.5 h-3.5 text-gray-400" strokeWidth={2.5} />
                          )}
                          {msg.status === 'delivered' && (
                            <CheckCheck className="w-3.5 h-3.5 text-gray-400" strokeWidth={2.5} />
                          )}
                          {msg.status === 'read' && (
                            <div className="flex items-center space-x-0.5 text-blue-500">
                              <CheckCheck className="w-3.5 h-3.5 text-blue-500" strokeWidth={3} />
                              <span className="text-[10px] font-extrabold">Lu</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Signaler option under the interlocutor's last message */}
                      {!isMe && index === lastThemMsgIndex && msg.type !== 'system_block' && (
                        <button
                          onClick={() => setShowReportSheet(true)}
                          className="flex items-center space-x-1.5 text-gray-500 hover:text-black text-[13px] font-medium mt-1.5 pl-1 cursor-pointer select-none transition-colors active:scale-95 self-start"
                          type="button"
                        >
                          <Flag className="w-3.5 h-3.5 text-gray-600 fill-gray-600 shrink-0" />
                          <span className="underline decoration-gray-400 underline-offset-2 text-gray-600">Signaler</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex-1" />

        {/* Notification Prompt */}
        {showNotificationPrompt && !hasExchangedMessages && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 mb-4 bg-[#f9f9f9] rounded-[24px] p-6 relative flex flex-col items-center text-center shadow-sm border border-gray-100"
          >
            <button 
              onClick={() => setShowNotificationPrompt(false)}
              className="absolute top-4 right-4 text-gray-400 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-md mb-4">
              <ArrowUp className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>

            <h3 className="text-[17px] font-bold text-black mb-1.5 tracking-tight">Vous voulez recevoir une réponse ?</h3>
            <p className="text-[14px] text-gray-500 font-medium leading-snug px-1 mb-5">
              Démarquez-vous en plaçant votre message en tout premier dans sa liste.
            </p>

            <button 
              onClick={() => onOpenPremium?.('priority')}
              className="w-[80%] max-w-[240px] bg-[#1a1a1a] text-white font-bold py-3 rounded-[24px] text-[15px] hover:bg-black transition-colors cursor-pointer"
            >
              Message prioritaire
            </button>
          </motion.div>
        )}
            </div>
          </div>

      {/* 3. Input Bar & Recording Panel */}
      {shouldBlockForVerification || shouldBlockForCriteriaMismatch ? null : profile.conversationClosed === true ? (
        <div className="px-4 py-4 bg-white shrink-0 border-t border-gray-50 flex flex-col items-center w-full">
          <div className="w-full bg-[#f4f4f7] rounded-[24px] p-6 flex flex-col items-center text-center">
            <h4 className="text-[15.5px] font-black text-black mb-4">
              Cette conversation a été clôturée.
            </h4>
            <button 
              onClick={() => {
                if (onDelete) {
                  onDelete();
                } else {
                  onClose();
                }
              }}
              className="w-full bg-[#121212] text-white font-extrabold py-3.5 px-6 rounded-full text-[14px] tracking-tight active:scale-95 transition-transform cursor-pointer"
            >
              Supprimer la conversation
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shrink-0 border-t border-gray-100 flex flex-col">
          {/* Reply Banner when replyingToMessage is set */}
          {replyingToMessage && (
            <div className="bg-purple-50/90 border-b border-purple-200/60 px-4 py-2 flex items-center justify-between animate-fade-in">
              <div className="flex items-center space-x-2.5 text-[12.5px] overflow-hidden min-w-0">
                <div className="w-1 h-7 bg-purple-600 rounded-full shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-purple-950 text-[11.5px] tracking-tight">
                    Répondre à {replyingToMessage.sender === 'me' ? 'vous-même' : partnerName}
                  </span>
                  <span className="text-gray-600 truncate text-[12px] font-medium">
                    {replyingToMessage.text || (replyingToMessage.type === 'voice' ? 'Note vocale' : 'Message')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingToMessage(null)}
                className="p-1 rounded-full text-gray-400 hover:text-black hover:bg-purple-100 active:scale-90 transition-all cursor-pointer shrink-0 ml-2"
                aria-label="Annuler la réponse"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}

          {/* Main Input Row */}
          <div className="px-3 pt-2.5 pb-3 flex items-center space-x-2 w-full">
            {shouldEnforcePopularWall ? (
              <div className="w-full flex flex-col items-center p-3.5 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 rounded-[22px] border border-yellow-500/30 text-white shadow-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <span className="text-[12px] font-black uppercase tracking-wider text-amber-400">Profil Très Populaire</span>
                </div>
                <p className="text-[12px] text-neutral-300 font-medium leading-relaxed text-center mb-3.5 px-3">
                  {profile.name} reçoit énormément de sollicitations en ce moment. Utilisez 25 crédits pour lui envoyer un message prioritaire qui s'affichera tout en haut de son écran !
                </p>
                <div className="flex items-center space-x-2 w-full">
                  <button
                    onClick={async () => {
                      const success = await monetizationService.spendCredits(25, `Message Prioritaire à ${profile.name}`);
                      if (success) {
                        playSynthAudio('boost');
                        setBypassedPopularWall(true);
                        saveMessageToSupabase(matchId, currentUserId, `⭐ Message Prioritaire Envoyé !`, true);
                        setMessages(prev => [...prev, {
                          id: Date.now(),
                          text: `⭐ Message Prioritaire : Discussion Débloquée !`,
                          sender: 'me',
                          time: 'Maintenant',
                          type: 'text'
                        }]);
                        alert(`🔓 Félicitations ! Votre message prioritaire est actif et s'affichera en premier.`);
                      } else {
                        setShowRechargeMenu(true);
                      }
                    }}
                    className="flex-1 h-10 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-black font-black text-[12px] rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Coins className="w-3.5 h-3.5 fill-current" />
                    <span>Envoyer en Priorité (25)</span>
                  </button>
                  <button
                    onClick={() => {
                      onOpenPremium?.('chat');
                    }}
                    className="h-10 px-4 bg-white/10 hover:bg-white/15 text-white font-bold text-[11.5px] rounded-full transition-all cursor-pointer active:scale-95"
                  >
                    Passer Premium
                  </button>
                </div>
              </div>
            ) : isRecording ? (
              <div className="w-full flex items-center justify-between bg-red-50/70 border border-red-100 rounded-full px-4 py-2.5 transition-all">
                <button 
                  onClick={cancelVoiceRecord}
                  className="w-9 h-9 bg-white text-red-500 rounded-full flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-center justify-center space-x-3.5 px-3">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                  </span>
                  <span className="text-[14px] text-red-700 font-extrabold select-none">
                    Vocal... {formatDuration(recordingSeconds)}
                  </span>

                  <div className="flex items-center space-x-[2px]">
                    {[6, 11, 8, 14, 9, 13, 7, 12, 10, 15, 8, 11].map((height, i) => (
                      <div 
                        key={i} 
                        style={{ 
                          height: `${height}px`,
                          animationDelay: `${i * 0.08}s`
                        }} 
                        className="w-[2.5px] bg-red-400 rounded-full animate-pulse"
                      />
                    ))}
                  </div>
                </div>

                <button 
                  onClick={finalizeVoiceRecord}
                  className="w-11 h-11 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" fill="currentColor" />
                </button>
              </div>
            ) : (
              <>
                {/* Plus button on the left */}
                <div className="relative shrink-0">
                  <button 
                    onClick={() => {
                      if (waitingForReply) {
                        setShowWaitingReplyModal(true);
                        return;
                      }
                      setShowMediaDrawer(prev => !prev);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1 cursor-pointer active:scale-95 transition-transform"
                    aria-label="Options média"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      showMediaDrawer ? 'bg-black text-white' : 'bg-gray-100 text-black hover:bg-gray-200'
                    }`}>
                      <Plus className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                  </button>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  <input 
                    type="file" 
                    ref={cameraInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    capture="user" 
                    className="hidden" 
                  />
                </div>
                
                {/* Text Input Box with Smile Icon */}
                <div className="flex-1 relative flex items-center">
                  <input 
                    ref={textInputRef}
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    placeholder="Votre message..."
                    className="w-full bg-white border border-gray-300 rounded-full px-3.5 py-2 pr-9 text-[13.5px] outline-none text-black placeholder-gray-400 font-medium shadow-2xs"
                  />
                  <button 
                    onClick={() => {
                      setShowEmojiPicker(prev => !prev);
                      setShowMediaDrawer(false);
                    }}
                    className="absolute right-2.5 p-1 cursor-pointer"
                    type="button"
                    aria-label="Émoticones"
                  >
                    <Smile className={`w-5 h-5 transition-colors ${showEmojiPicker ? 'text-purple-600' : 'text-black'}`} strokeWidth={2.2} />
                  </button>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center space-x-1 shrink-0">
                  {!inputText && (
                    <button 
                      onClick={() => setShowQuestionModal(true)}
                      className="p-0.5 shrink-0 active:scale-95 transition-transform cursor-pointer"
                      title="Poser une question"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#E8DAFF] flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-purple-900 fill-purple-900" strokeWidth={1} />
                      </div>
                    </button>
                  )}
                  {inputText ? (
                    <button 
                      onClick={() => handleSend()}
                      className="p-0.5 shrink-0 animate-fade-in active:scale-95 transition-transform cursor-pointer"
                    >
                      <div className="w-8.5 h-8.5 bg-black rounded-full flex items-center justify-center shadow-xs">
                        <Send className="w-3.5 h-3.5 text-white" fill="currentColor" strokeWidth={1.5} />
                      </div>
                    </button>
                  ) : (
                    <button 
                      onClick={initiateVoiceRecord}
                      className="p-0.5 shrink-0 active:scale-95 transition-transform cursor-pointer"
                      aria-label="Enregistrer un message vocal"
                    >
                      <div className="w-8.5 h-8.5 bg-black hover:bg-gray-800 rounded-full flex items-center justify-center text-white shadow-xs transition-colors">
                        <Mic className="w-4 h-4 text-white" strokeWidth={2} />
                      </div>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Media Options Drawer */}
          <AnimatePresence>
            {showMediaDrawer && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="bg-white border-t border-gray-100 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <div className="flex items-center space-x-3">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setActiveMediaTab('gallery')}
                      className={`p-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        activeMediaTab === 'gallery' ? 'bg-black text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Camera className="w-5 h-5" strokeWidth={2.2} />
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setActiveMediaTab('location')}
                      className={`p-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        activeMediaTab === 'location' ? 'bg-black text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <MapPin className="w-5 h-5" strokeWidth={2.2} />
                    </motion.button>
                  </div>

                  <button
                    onClick={() => {
                      setIsEphemeralToggle(prev => !prev);
                      playSynthAudio('beep');
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[12px] font-extrabold transition-all cursor-pointer ${
                      isEphemeralToggle 
                        ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-sm ring-2 ring-orange-300/50' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${isEphemeralToggle ? 'text-yellow-200 fill-yellow-200 animate-pulse' : 'text-gray-500'}`} />
                    <span>Vue unique {isEphemeralToggle ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {activeMediaTab === 'gallery' && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <button
                        onClick={() => {
                          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                            setShowChatCamera(true);
                            setShowMediaDrawer(false);
                          } else if (cameraInputRef.current) {
                            cameraInputRef.current.click();
                          } else {
                            fileInputRef.current?.click();
                          }
                        }}
                        className="aspect-square bg-gradient-to-br from-neutral-800 to-neutral-950 rounded-2xl flex flex-col items-center justify-center text-white active:scale-95 transition-transform shadow-xs cursor-pointer group"
                      >
                        <Camera className="w-7 h-7 text-neutral-200 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-neutral-300 mt-1">Caméra</span>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-2xl flex flex-col items-center justify-center text-gray-700 active:scale-95 transition-transform cursor-pointer"
                      >
                        <ImageIcon className="w-6 h-6 text-purple-600 mb-0.5" />
                        <span className="text-[10px] font-bold text-gray-600">Galerie</span>
                      </button>

                      {gallerySamples.filter(s => !s.isCameraTile).slice(0, 2).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.url) handleSendImage(item.url);
                            setShowMediaDrawer(false);
                          }}
                          className="aspect-square rounded-2xl overflow-hidden shadow-2xs hover:opacity-90 active:scale-95 transition-all cursor-pointer relative group"
                        >
                          <img src={item.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          {isEphemeralToggle && (
                            <div className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-orange-400">
                              <Flame className="w-3 h-3 fill-current" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeMediaTab === 'location' && (
                  <div className="px-4 pb-4 pt-2">
                    <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 bg-purple-600 text-white rounded-full flex items-center justify-center">
                          <MapPin className="w-5 h-5 fill-white" />
                        </div>
                        <div>
                          <p className="text-[13px] font-extrabold text-purple-950">Partager ma position</p>
                          <p className="text-[11px] text-purple-700 font-medium">Partage votre ville actuelle</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleToggleLocation();
                          setShowMediaDrawer(false);
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[12px] rounded-full active:scale-95 transition-all shadow-xs cursor-pointer"
                      >
                        Envoyer
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emoji & GIPHY Drawer */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="bg-white border-t border-gray-100 overflow-hidden"
              >
                <div className="flex items-center justify-center space-x-2 px-4 pt-3 pb-2 border-b border-gray-100">
                  <button
                    onClick={() => setPickerTab('emoji')}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-extrabold transition-all cursor-pointer ${
                      pickerTab === 'emoji' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Émojis
                  </button>
                  <button
                    onClick={() => setPickerTab('gif')}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-extrabold transition-all cursor-pointer ${
                      pickerTab === 'gif' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    GIFs (GIPHY)
                  </button>
                </div>

                {pickerTab === 'emoji' ? (
                  <div className="p-3 grid grid-cols-8 gap-2 max-h-40 overflow-y-auto">
                    {emojis.map((em, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInputText(prev => prev + em.char);
                        }}
                        className="text-2xl p-1.5 hover:bg-gray-100 rounded-xl active:scale-90 transition-transform cursor-pointer"
                      >
                        {em.char}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-2">
                      {GIPHY_PRESETS.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => handleSendGif(g.url)}
                          className="aspect-square rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 active:scale-95 transition-all cursor-pointer relative group"
                        >
                          <img src={g.url} alt={g.tag} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-black transition-opacity">
                            {g.tag}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
        </>
      )}

      {/* Question Picker Modal - Faithful replication of IMG_4387.PNG */}
      <AnimatePresence>
        {showQuestionModal && (
          <div 
            onClick={() => setShowQuestionModal(false)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[32px] p-6 pt-8 pb-5 max-w-[360px] w-full shadow-2xl flex flex-col items-center text-center"
            >
              {/* Subtitle */}
              <p className="text-[15px] sm:text-[15.5px] font-medium text-neutral-800 mb-6 px-2">
                Tout d'abord, choisissez une question...
              </p>

              {/* Central Question Display */}
              <h3 className="text-[21px] sm:text-[23px] font-black text-black leading-tight tracking-tight mb-8 px-2 min-h-[58px] flex items-center justify-center">
                {QUESTIONS_DATABASE[currentQuestionIndex]}
              </h3>

              {/* 'Changer de question' Button with Soft Lilac Pill */}
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(prev => (prev + 1) % QUESTIONS_DATABASE.length)}
                className="bg-[#efe8fd] hover:bg-[#e7dcfa] active:scale-95 transition-all text-neutral-900 font-bold text-[14.5px] px-5 py-2.5 rounded-full flex items-center justify-center gap-2.5 mb-6 cursor-pointer select-none"
              >
                <RotateCw className="w-4 h-4 text-black stroke-[2.8]" />
                <span>Changer de question</span>
              </button>

              {/* 'Envoyer' Action Button */}
              <button
                type="button"
                onClick={() => handleSendQuestion(QUESTIONS_DATABASE[currentQuestionIndex])}
                className="w-full py-2.5 flex items-center justify-center gap-2 text-black font-extrabold text-[16px] hover:opacity-80 active:scale-95 transition-all cursor-pointer select-none"
              >
                <Send className="w-5 h-5 text-black fill-black" strokeWidth={1} />
                <span>Envoyer</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ephemeral Photo Countdown Overlay */}
      <AnimatePresence>
        {viewingEphemeralMsg && (
          <div className="fixed inset-0 z-[250] bg-black flex flex-col items-center justify-center p-4">
            <div className="absolute top-10 right-5 flex items-center space-x-2 bg-red-600/80 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white font-black text-[13px]">
              <Flame className="w-4 h-4 animate-bounce fill-current" />
              <span>Autodestruction dans {ephemeralSeconds}s</span>
            </div>
            <img 
              src={viewingEphemeralMsg.text} 
              alt="Photo éphémère" 
              className="max-h-[80dvh] max-w-full rounded-2xl object-contain shadow-2xl" 
            />
          </div>
        )}
      </AnimatePresence>

      {/* In-Chat Native Camera & Video Capture Modal ("À la volée") */}
      <AnimatePresence>
        {showChatCamera && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-0 z-[220] bg-black text-white flex flex-col justify-between"
          >
            {/* Camera Header Bar */}
            <div className="w-full flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent z-10">
              <button 
                onClick={closeChatCamera} 
                className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Status or Recording Timer */}
              {isRecordingVideo ? (
                <div className="flex items-center space-x-2 bg-red-600/90 text-white px-3.5 py-1.5 rounded-full text-[13px] font-black animate-pulse shadow-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                  <span>REC {formatDuration(videoRecordSeconds)}</span>
                </div>
              ) : (
                <span className="text-[14px] font-black tracking-tight text-white/90">
                  {chatCameraFacing === 'environment' ? 'Caméra arrière' : 'Caméra avant'}
                </span>
              )}

              {/* Flip camera button */}
              <button 
                onClick={toggleChatCameraFacing} 
                className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
                title="Basculer la caméra"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewport */}
            <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center bg-black">
              <video 
                ref={chatVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${chatCameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <canvas ref={chatCanvasRef} className="hidden" />

              {/* Flash / Light visual flash overlay */}
              {chatCameraFlash && (
                <div className="absolute inset-0 bg-white z-20 pointer-events-none animate-ping" />
              )}
            </div>

            {/* Bottom Shutter Controls */}
            <div className="w-full flex flex-col items-center pb-8 pt-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10 px-6">
              <div className="flex items-center justify-around w-full max-w-sm mb-4">
                {/* Photo Trigger */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={takeChatPhoto}
                    disabled={isRecordingVideo}
                    className={`w-18 h-18 rounded-full border-4 border-white bg-white/20 active:scale-90 transition-transform shadow-2xl flex items-center justify-center cursor-pointer ${
                      isRecordingVideo ? 'opacity-30 pointer-events-none' : ''
                    }`}
                    title="Prendre une photo instantanée"
                  >
                    <div className="w-14 h-14 rounded-full bg-white shadow-inner" />
                  </button>
                  <span className="text-[12px] font-bold text-white/80 mt-1.5">Photo</span>
                </div>

                {/* Video Recording Trigger */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={toggleVideoRecord}
                    className={`w-18 h-18 rounded-full border-4 ${
                      isRecordingVideo ? 'border-red-400 bg-red-600 animate-pulse' : 'border-red-500 bg-red-500/20'
                    } active:scale-90 transition-transform shadow-2xl flex items-center justify-center cursor-pointer`}
                    title={isRecordingVideo ? "Arrêter l'enregistrement" : "Enregistrer une vidéo"}
                  >
                    {isRecordingVideo ? (
                      <div className="w-7 h-7 rounded-md bg-white" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-red-600 shadow-inner" />
                    )}
                  </button>
                  <span className="text-[12px] font-bold text-white/80 mt-1.5">
                    {isRecordingVideo ? 'Arrêter' : 'Vidéo'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImageUrl && (
          <div 
            onClick={() => setPreviewImageUrl(null)}
            className="fixed inset-0 z-[250] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          >
            <button 
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-8 right-6 text-white p-2 rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={previewImageUrl} 
              alt="Aperçu" 
              className="max-h-[85dvh] max-w-full rounded-2xl object-contain shadow-2xl" 
            />
          </div>
        )}
      </AnimatePresence>

      {/* Rude Warning Modal */}
      <AnimatePresence>
        {rudeWarningData && (
          <div className="fixed inset-0 z-[260] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-[17px] font-black text-center text-black mb-1.5">Attention au respect</h3>
              <p className="text-[13px] text-gray-600 text-center mb-4">
                {rudeWarningData.reason}
              </p>

              {rudeWarningData.suggestedReformulation && (
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 mb-4">
                  <p className="text-[11px] font-bold text-purple-700 uppercase mb-1">Suggestion bienveillante :</p>
                  <p className="text-[13px] font-semibold text-purple-950">"{rudeWarningData.suggestedReformulation}"</p>
                </div>
              )}

              <div className="flex flex-col space-y-2">
                {rudeWarningData.suggestedReformulation && (
                  <button
                    onClick={() => {
                      handleSend(rudeWarningData.suggestedReformulation);
                      setRudeWarningData(null);
                    }}
                    className="w-full py-3 bg-purple-600 text-white font-bold rounded-full text-xs hover:bg-purple-700 active:scale-95 transition-all cursor-pointer"
                  >
                    Utiliser la suggestion
                  </button>
                )}
                <button
                  onClick={() => setRudeWarningData(null)}
                  className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold rounded-full text-xs hover:bg-gray-200 active:scale-95 transition-all cursor-pointer"
                >
                  Modifier mon message
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WebRTC Live Calling Screen Overlay */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="fixed inset-0 z-[280] bg-neutral-950 text-white flex flex-col justify-between p-6"
          >
            {/* Top Bar with Call Info */}
            <div className="flex flex-col items-center pt-8 z-20">
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/20 px-3.5 py-1 rounded-full mb-2.5 border border-emerald-500/30 shadow-xs">
                Appel {activeCall.type === 'video' ? 'Vidéo' : 'Vocal'} en direct
              </span>
              <h2 className="text-[22px] font-black tracking-tight">{profile.name}</h2>
              <p className="text-[14px] font-bold text-gray-300 mt-1">{formatDuration(callDuration)}</p>
            </div>

            {/* Video / Avatar Viewport Area */}
            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-3xl bg-neutral-900 border border-white/10 shadow-2xl">
              {activeCall.type === 'video' ? (
                <>
                  {/* Remote / Main View */}
                  <div className="w-full h-full relative flex items-center justify-center bg-neutral-900">
                    {mainPhoto ? (
                      <img src={mainPhoto} alt={profile.name ? `Photo de ${profile.name}` : 'Photo de profil'} className="w-full h-full object-cover filter brightness-90" />
                    ) : (
                      <span className="text-sm text-gray-400">Aucune photo disponible</span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                  </div>

                  {/* Picture-in-Picture Local Selfie Stream */}
                  <div className="absolute top-4 right-4 w-28 aspect-3/4 rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl bg-black z-20">
                    <video 
                      ref={localVideoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`w-full h-full object-cover ${callFacingMode === 'user' ? 'scale-x-[-1]' : ''} ${isCameraOff ? 'hidden' : ''}`}
                    />
                    {isCameraOff && (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-900 text-gray-400">
                        <CameraOff className="w-6 h-6 mb-1" />
                        <span className="text-[9px] font-bold">Cam off</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl ring-8 ring-purple-500/20 animate-pulse">
                      {mainPhoto ? (
                        <img src={mainPhoto} alt={profile.name ? `Photo de ${profile.name}` : 'Photo de profil'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Aucune photo</div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-emerald-500 text-white p-2.5 rounded-full shadow-lg">
                      <Phone className="w-5 h-5 fill-current" />
                    </div>
                  </div>
                  {/* Visual Soundwave Indicator */}
                  <div className="flex items-center space-x-1.5 mt-8 h-8">
                    {[16, 28, 12, 32, 22, 14, 26, 18, 30, 10].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: isMuted ? 6 : [h * 0.4, h, h * 0.4] }}
                        transition={{ repeat: Infinity, duration: 0.8 + (i % 3) * 0.2, ease: "easeInOut" }}
                        className={`w-1.5 rounded-full ${isMuted ? 'bg-gray-600' : 'bg-emerald-400'}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Calling Bottom Control Bar */}
            <div className="flex items-center justify-center space-x-5 pb-6 pt-2 z-20">
              {/* Mute Mic */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
                title={isMuted ? "Activer le micro" : "Couper le micro"}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* Flip camera for video call */}
              {activeCall.type === 'video' && (
                <button
                  onClick={toggleCallCameraFacing}
                  className="w-14 h-14 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-all cursor-pointer"
                  title="Changer de caméra"
                >
                  <RotateCw className="w-6 h-6" />
                </button>
              )}

              {/* Toggle Camera for video call */}
              {activeCall.type === 'video' && (
                <button
                  onClick={() => setIsCameraOff(!isCameraOff)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isCameraOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                  title={isCameraOff ? "Activer la caméra" : "Couper la caméra"}
                >
                  {isCameraOff ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                </button>
              )}

              {/* End Call Button */}
              <button
                onClick={endCalling}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer"
                title="Raccrocher"
              >
                <PhoneOff className="w-7 h-7 fill-current" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 1. Menu des 3 points (...) — Conforme fidèlement à PHOTO 1                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showOptionsMenu && (
          <div className="fixed inset-0 z-[300] flex flex-col justify-end p-4 pb-6 sm:pb-8">
            {/* Backdrop sombre */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/55 backdrop-blur-2xs cursor-pointer"
              onClick={() => setShowOptionsMenu(false)}
            />

            {/* Floating Card Panel conforme au design Photo 1 */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative bg-white rounded-[22px] sm:rounded-[26px] w-full max-w-sm sm:max-w-md mx-auto overflow-hidden shadow-2xl z-10 select-none divide-y divide-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              {isBavel ? (
                <>
                  {/* Option 1: Ajouter aux favoris / Retirer des favoris */}
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className="w-full py-4.5 text-center text-[17px] font-normal text-black active:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  </button>

                  {/* Option 2: Voir la promo */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsMenu(false);
                      if (onOpenPremium) {
                        onOpenPremium('recharge');
                      } else {
                        setShowRechargeMenu(true);
                      }
                    }}
                    className="w-full py-4.5 text-center text-[17px] font-normal text-black active:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Voir la promo
                  </button>
                </>
              ) : (
                <>
                  {/* Option 1: Ajouter aux Favoris / Retirer des Favoris */}
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className="w-full py-4.5 text-center text-[17px] font-normal text-black active:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {isFavorite ? "Retirer des Favoris" : "Ajouter aux Favoris"}
                  </button>

                  {/* Option 2: Voir profil */}
                  <button
                    type="button"
                    onClick={handleViewProfileFromMenu}
                    className="w-full py-4.5 text-center text-[17px] font-normal text-black active:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Voir profil
                  </button>

                  {/* Option 3: Ignorer */}
                  <button
                    type="button"
                    onClick={handleIgnoreFromMenu}
                    className="w-full py-4.5 text-center text-[17px] font-normal text-black active:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Ignorer
                  </button>

                  {/* Option 4: Bloquer et signaler (Texte rouge) */}
                  <button
                    type="button"
                    onClick={handleOpenBlockAndReport}
                    className="w-full py-4.5 text-center text-[17px] font-normal text-[#E02020] active:bg-red-50/70 transition-colors cursor-pointer"
                  >
                    Bloquer et signaler
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. Menu Bloquer et Signaler — Conforme fidèlement à PHOTO 2               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showBlockAndReportModal && (
          <div className="fixed inset-0 z-[310] flex flex-col justify-end">
            {/* Backdrop sombre */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/55 backdrop-blur-2xs cursor-pointer"
              onClick={() => setShowBlockAndReportModal(false)}
            />

            {/* Bottom Sheet Panel conforme au design Photo 2 */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-white rounded-t-[32px] w-full max-w-lg mx-auto overflow-hidden shadow-2xl z-10 select-none pt-6 pb-9 px-6 flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bouton de fermeture X en haut à droite */}
              <button
                type="button"
                onClick={() => setShowBlockAndReportModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all cursor-pointer z-20"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Titre principal */}
              <h2 className="text-[23px] sm:text-[25px] font-extrabold text-black tracking-tight mb-2 pr-8 text-left leading-tight">
                Signaler {partnerName}
              </h2>

              {/* Paragraphe explicatif de la charte */}
              <p className="text-[14px] sm:text-[14.5px] text-gray-500 font-normal leading-relaxed mb-6 text-left">
                Si quelqu'un n'a pas respecté notre charte, dites-le nous. Cette personne ne saura pas que vous l'avez signalée, ni pourquoi.
              </p>

              {/* 3 Étapes numérotées */}
              <div className="flex flex-col space-y-4 mb-6">
                <div className="flex items-center space-x-3.5">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="text-[14.5px] sm:text-[15px] font-bold text-black">
                    Expliquez-nous la situation
                  </span>
                </div>

                <div className="flex items-center space-x-3.5">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="text-[14.5px] sm:text-[15px] font-bold text-black">
                    Nous allons examiner votre signalement
                  </span>
                </div>

                <div className="flex items-center space-x-3.5">
                  <span className="w-6 h-6 rounded-full bg-black text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="text-[14.5px] sm:text-[15px] font-bold text-black">
                    Nous vous tiendrons au courant
                  </span>
                </div>
              </div>

              {/* Carte informative / Suppression de Match */}
              <div
                onClick={handleUnmatch}
                className="bg-[#F4F4F5] rounded-2xl p-4 flex items-center space-x-3.5 mb-6 text-left cursor-pointer hover:bg-gray-200/80 active:scale-[0.99] transition-all"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-black shrink-0">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-black" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" opacity="0.25" />
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="currentColor" strokeWidth="2" />
                    <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] sm:text-[14.5px] font-bold text-black leading-snug">
                    Vous pensez que cette personne n'a pas violé notre charte ?
                  </div>
                  <div className="text-[13px] text-gray-500 font-normal mt-0.5">
                    Supprimer le Match
                  </div>
                </div>
              </div>

              {/* Bouton principal : Commencer le signalement */}
              <button
                type="button"
                onClick={handleStartReporting}
                className="w-full bg-black active:bg-gray-900 text-white font-bold py-4 rounded-full text-[16px] text-center shadow-xs transition-colors mb-3 cursor-pointer select-none"
              >
                Commencer le signalement
              </button>

              {/* Bouton secondaire : Supprimer le Match */}
              <button
                type="button"
                onClick={handleUnmatch}
                className="w-full py-2.5 text-center text-black font-bold text-[16px] hover:opacity-75 active:scale-[0.99] transition-opacity cursor-pointer select-none"
              >
                Supprimer le Match
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. Modal Supprimer le Match et bloquer (Menu button ignore.PNG)           */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showIgnoreModal && (
          <div className="fixed inset-0 z-[310] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/55 backdrop-blur-2xs cursor-pointer"
              onClick={() => setShowIgnoreModal(false)}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative bg-white rounded-t-[32px] w-full max-w-lg mx-auto overflow-hidden shadow-2xl z-10 select-none pt-6 pb-9 px-6 flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bouton X de fermeture */}
              <button
                type="button"
                onClick={() => setShowIgnoreModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-gray-100 active:scale-95 transition-all cursor-pointer z-20"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Titre */}
              <h2 className="text-[23px] sm:text-[25px] font-extrabold text-black tracking-tight mb-6 pr-8 text-left leading-tight">
                Supprimer le Match et bloquer {partnerName}
              </h2>

              {/* 3 Lignes explicatives avec icônes exactes */}
              <div className="flex flex-col space-y-4 mb-6">
                <div className="flex items-center space-x-3.5 text-left">
                  <EyeOff className="w-5.5 h-5.5 text-black shrink-0" strokeWidth={2.2} />
                  <span className="text-[15px] font-bold text-black leading-snug">
                    Vous ne verrez plus vos profils respectifs
                  </span>
                </div>

                <div className="flex items-center space-x-3.5 text-left">
                  <VolumeX className="w-5.5 h-5.5 text-black shrink-0" strokeWidth={2.2} />
                  <span className="text-[15px] font-bold text-black leading-snug">
                    Vous ne recevrez plus de messages de sa part
                  </span>
                </div>

                <div className="flex items-center space-x-3.5 text-left">
                  <Ban className="w-5.5 h-5.5 text-black shrink-0" strokeWidth={2.2} />
                  <span className="text-[15px] font-bold text-black leading-snug">
                    Nous bloquerons tout autre compte que cette personne tentera de créer
                  </span>
                </div>
              </div>

              {/* Carte informative Charte / Signalement */}
              <div
                onClick={() => {
                  setShowIgnoreModal(false);
                  setShowReportReasonsModal(true);
                }}
                className="bg-[#F4F4F5] rounded-2xl p-4 flex items-center space-x-3.5 mb-6 text-left cursor-pointer hover:bg-gray-200/80 active:scale-[0.99] transition-all"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-black shrink-0">
                  <Flag className="w-5 h-5 text-black fill-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] sm:text-[14.5px] font-bold text-black leading-snug">
                    Cette personne a enfreint notre charte ?
                  </div>
                  <div className="text-[13px] text-gray-500 font-normal mt-0.5">
                    Signalez son comportement à notre équipe
                  </div>
                </div>
              </div>

              {/* Bouton principal : Supprimer le Match et bloquer */}
              <button
                type="button"
                onClick={() => {
                  setShowIgnoreModal(false);
                  handleConfirmDeleteOrUnmatch();
                }}
                className="w-full bg-[#111111] active:bg-black text-white font-bold py-4 rounded-full text-[16px] text-center shadow-xs transition-colors mb-3 cursor-pointer select-none"
              >
                Supprimer le Match et bloquer
              </button>

              {/* Bouton secondaire : Signaler */}
              <button
                type="button"
                onClick={() => {
                  setShowIgnoreModal(false);
                  setShowReportReasonsModal(true);
                }}
                className="w-full py-2.5 text-center text-[#E02020] font-bold text-[16px] hover:opacity-75 active:scale-[0.99] transition-opacity cursor-pointer select-none"
              >
                Signaler
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sheet options du message (Bouton Signaler dans le fil) */}
      <AnimatePresence>
        {showReportSheet && (
          <ChatReportSheet
            isOpen={showReportSheet}
            onClose={() => setShowReportSheet(false)}
            onReport={() => {
              setShowReportSheet(false);
              setSelectedReportedMsgIds([]);
              setShowReportContentScreen(true);
            }}
            onDelete={() => {
              setShowReportSheet(false);
              setShowDeleteUserModal(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* Contenu à signaler — Conforme fidèlement à siganle le contenu 1 & 2.jpg     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showReportContentScreen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[360] bg-white flex flex-col select-none overflow-hidden"
          >
            {/* Top Bar Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setShowReportContentScreen(false)}
                className="p-1 -ml-1 text-black hover:opacity-70 active:scale-95 transition-all cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-6 h-6 stroke-[2.4]" />
              </button>
              <h2 className="text-[17px] font-bold text-black text-center flex-1 pr-6">
                Contenu à signaler
              </h2>
            </div>

            {/* Scrollable Message Feed with Checkboxes */}
            <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 bg-white">
              {messages.map((msg, idx) => {
                const isMe = msg.sender === 'me';
                const isChecked = selectedReportedMsgIds.includes(msg.id);

                return (
                  <div key={msg.id || idx} className="w-full flex flex-col">
                    {/* Interlocutor message with selectable checkbox */}
                    {!isMe && msg.type !== 'system_block' ? (
                      <div 
                        onClick={() => {
                          setSelectedReportedMsgIds(prev => 
                            prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id]
                          );
                        }}
                        className="flex items-center space-x-3 w-full max-w-[88%] cursor-pointer group py-0.5"
                      >
                        {/* Checkbox fidèle au design */}
                        <div 
                          className={`w-6 h-6 rounded-[7px] border-2 flex items-center justify-center transition-all shrink-0 ${
                            isChecked 
                              ? 'bg-[#111111] border-black text-white shadow-xs' 
                              : 'border-black/90 bg-white group-hover:border-black'
                          }`}
                        >
                          {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>

                        {/* Speech bubble */}
                        <div className="bg-[#f1f1f3] text-black rounded-[18px] rounded-tl-[4px] px-3.5 py-2.5 text-[14px] font-medium leading-normal shadow-2xs">
                          {msg.text}
                        </div>
                      </div>
                    ) : isMe && msg.type !== 'system_block' ? (
                      /* My message aligned to the right */
                      <div className="flex flex-col items-end w-full max-w-[85%] self-end py-0.5">
                        <div className="bg-[#F0E6FF] text-black rounded-[18px] rounded-tr-[4px] px-3.5 py-2.5 text-[14px] font-medium leading-normal shadow-2xs">
                          {msg.text}
                        </div>
                        {msg.status === 'read' && (
                          <div className="flex items-center space-x-1 text-black font-semibold text-[11px] mt-1 pr-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Vu</span>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {/* Bottom prompt link */}
              <div className="pt-3 pb-2 text-center">
                <span className="text-[12px] text-black font-semibold underline underline-offset-2">
                  Vous voulez savoir si {partnerName} a lu votre message ?
                </span>
              </div>
            </div>

            {/* Bottom Bar: Red Pill "Signaler" Button */}
            <div className="p-4 pb-7 sm:pb-8 border-t border-gray-100 bg-white shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowReportContentScreen(false);
                  setFeedbackToast("Signalement envoyé. Merci de nous aider à garder la communauté sûre.");
                  setTimeout(() => setFeedbackToast(null), 3200);
                }}
                className="w-full bg-[#E03D4F] active:bg-[#c93041] hover:bg-[#d43748] text-white font-bold py-3.5 sm:py-4 rounded-full text-[16px] text-center shadow-xs transition-all cursor-pointer select-none active:scale-[0.99]"
              >
                Signaler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 3. Modal Supprimer l'utilisateur — Conforme à supprimer l'utilisateur.PNG */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showDeleteUserModal && (
          <div className="fixed inset-0 z-[370] flex items-center justify-center p-6 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-2xs cursor-pointer"
              onClick={() => setShowDeleteUserModal(false)}
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative bg-white rounded-[22px] max-w-[310px] w-full overflow-hidden shadow-2xl z-10 flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-6.5 text-center text-[15.5px] font-normal text-[#1a1a1a] leading-snug">
                Pas de souci, cette personne ne peut plus répondre.
              </div>
              <div className="border-t border-gray-200/90 w-full" />
              <button
                type="button"
                onClick={() => {
                  setShowDeleteUserModal(false);
                  handleConfirmDeleteOrUnmatch();
                }}
                className="w-full py-3.5 text-center font-bold text-[16.5px] text-black active:bg-gray-100 transition-colors cursor-pointer select-none"
              >
                OK
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation de suppression du match */}
      <AnimatePresence>
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-[350] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-2xs cursor-pointer"
              onClick={() => setShowDeleteConfirmModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl z-10 flex flex-col items-center text-center select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-[17.5px] font-bold text-gray-950 mb-1.5">
                Supprimer le match avec {partnerName} ?
              </h3>
              <p className="text-[13px] text-gray-500 font-medium leading-relaxed mb-5">
                Cette conversation sera retirée de vos discussions et cette personne ne pourra plus vous contacter.
              </p>
              <div className="w-full flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={handleConfirmDeleteOrUnmatch}
                  className="w-full py-3.5 bg-red-600 active:bg-red-700 text-white font-bold rounded-2xl text-[15px] transition-colors cursor-pointer shadow-sm"
                >
                  Supprimer le match
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="w-full py-3.5 bg-gray-100 active:bg-gray-200 text-gray-800 font-semibold rounded-2xl text-[15px] transition-colors cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal choix de motif de signalement */}
      <AnimatePresence>
        {showReportReasonsModal && (
          <ReportMenu
            userName={partnerName}
            onClose={() => setShowReportReasonsModal(false)}
            onSelectReason={(reason) => {
              handleSelectReportReason(reason);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal d'action Long-Press Message (IMG_4453.PNG & IMG_4454.PNG) */}
      <AnimatePresence>
        {selectedMessageForAction && (
          <div className="fixed inset-0 z-[250] flex flex-col justify-end pointer-events-auto select-none">
            {/* Sombre fond flouté d'ambiance */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/45 backdrop-blur-[1px] cursor-pointer"
              onClick={() => setSelectedMessageForAction(null)}
            />

            {/* Menu flottant bas arrondi fidèle au design */}
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 340 }}
              className="relative mx-4 sm:mx-auto max-w-sm w-[calc(100%-2rem)] bg-white rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-[0_12px_45px_rgba(0,0,0,0.3)] z-[260] mb-6 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {isReciprocalConversation && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const targetMsg = selectedMessageForAction;
                      setSelectedMessageForAction(null);
                      setReplyingToMessage(targetMsg);
                      setTimeout(() => {
                        textInputRef.current?.focus();
                      }, 100);
                    }}
                    className="w-full py-4 text-center text-[17px] font-bold text-black active:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Répondre
                  </button>
                  <div className="w-full h-[1px] bg-gray-100/90" />
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  const targetMsg = selectedMessageForAction;
                  if (targetMsg?.text) {
                    try {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(targetMsg.text);
                      }
                    } catch (_) {}
                    setFeedbackToast("Message copié !");
                    setTimeout(() => {
                      setFeedbackToast(null);
                    }, 2200);
                  }
                  setSelectedMessageForAction(null);
                }}
                className="w-full py-4 text-center text-[17px] font-bold text-black active:bg-gray-100 transition-colors cursor-pointer"
              >
                Copier
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notification Toast de confirmation */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-14 inset-x-4 z-[400] bg-gray-950 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-[13px] font-medium border border-white/10"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="flex-1 leading-snug">{feedbackToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safety Detector Modal (Badoo Blurred Nudity Warning) */}
      <ChatSafetyDetectorModal
        isOpen={Boolean(privateDetectorMsg)}
        message={privateDetectorMsg}
        onClose={() => setPrivateDetectorMsg(null)}
        onConfirmReveal={(msgToReveal) => {
          setRevealedPrivateImages(prev => ({ ...prev, [msgToReveal.id]: true }));
          setPreviewImageUrl(msgToReveal.text || null);
          setPrivateDetectorMsg(null);
        }}
        onReportPhoto={() => {
          setPrivateDetectorMsg(null);
          handleOpenBlockAndReport();
        }}
      />

      {/* Recharge Credits Menu */}
      {showRechargeMenu && (
        <RechargeCreditsMenu 
          onClose={() => setShowRechargeMenu(false)}
          onRechargeSuccess={(creditsAdded) => {
            void monetizationService.refreshWallet();
            setShowRechargeMenu(false);
          }}
        />
      )}

      {/* Premium Subscription Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <BavelPremiumModal
            onClose={() => setShowPremiumModal(false)}
            initialSlideId="criteria"
            profileName={profile.name}
            onSubscribe={() => {
              void monetizationService.refreshWallet();
              if (onActivatePremium) onActivatePremium();
              setShowPremiumModal(false);
              setFeedbackToast("✨ Bavel Premium activé ! Vous pouvez maintenant discuter.");
              setTimeout(() => setFeedbackToast(null), 4000);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ChatConversationView;
