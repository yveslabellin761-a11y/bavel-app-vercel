import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Search, Bell, Star, Phone, Video, Mic, MicOff, 
  VideoOff, PhoneOff, Send, MoreHorizontal, X, Image as ImageIcon,
  Smile, Paperclip, Check, CheckCheck, Clock, MessageSquare, Zap, Sparkles,
  Flame, Crown, Coins
} from 'lucide-react';
import { User } from '../../../types';
import BavelPremiumModal from '../../modals/BavelPremiumModal';
import { OneDayPremiumModal } from '../../modals/OneDayPremiumModal';
import { NotificationsView, SearchDiscussions, DiscussionsSortMenu, ActionMenu, ReportMenu } from '../Modals';
import { WantMoreLikesModal, RechargeCreditsMenu } from '../Monetization';
import { ActivityMenu } from '../SettingsMenu';
import { ChatConversationView } from './ChatConversationView';
import { BavelAvatar, BavelSupportChatView } from './BavelSupportChatView';
import { bavelSupportService } from '../../../services/bavelSupportService';
import { monetizationService } from '../../../services/monetizationService';
import { useWebRTC } from '../../../hooks/useWebRTC';
import { useChat } from '../../../hooks/useChat';
import { useNotifications } from '../../../hooks/useNotifications';
import { pushNotificationService } from '../../../services/push/pushNotificationService';
import { subscribeToMessages, unsubscribeFromChannel } from '../../../lib/supabase';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: Date;
  read: boolean;
  type?: 'text' | 'image' | 'voice' | 'call';
  callDuration?: number;
  callType?: 'voice' | 'video';
}

export interface Discussion {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  age?: number;
  online?: boolean;
  lastSeen?: Date;
  unreadCount: number;
  messages: Message[];
  lastMessage?: string;
  lastMessageTime?: Date;
  typing?: boolean;
  allowVoiceCall?: boolean;
  allowVideoCall?: boolean;
}

interface DiscussionsTabProps {
  userId?: string;
  onNavigateToTab?: (tab: string) => void;
  activeChatId?: string | null;
  setActiveChatId?: (id: string | null) => void;
  onOpenUserProfile?: (userId: string) => void;
  activeChat?: any;
  setActiveChat?: (chat: any) => void;
  discussions?: any[];
  setDiscussions?: (discussions: any[]) => void;
  receivedLikesCount?: number;
  isPremium?: boolean;
  onActivatePremium?: () => void;
}

export type RealtimePromoType = 
  | 'zero_credits' 
  | 'new_like' 
  | null;

export function DiscussionsTab({ 
  userId: propUserId,
  onNavigateToTab,
  activeChatId: propActiveChatId,
  setActiveChatId: propSetActiveChatId,
  onOpenUserProfile,
  activeChat: propActiveChat,
  setActiveChat: propSetActiveChat,
  discussions: propDiscussions,
  setDiscussions: propSetDiscussions,
  receivedLikesCount = 0,
  isPremium = false,
  onActivatePremium
}: DiscussionsTabProps) {
  const userId = propUserId;

  // Real-time Chat Hook backed by Supabase
  const {
    discussions: hookDiscussions,
    loading,
    error,
    sendMessage,
    markAsRead,
    deleteDiscussion,
    muteDiscussion,
    blockUser,
    reportUser,
    loadMoreMessages,
    refreshDiscussions
  } = useChat(userId || '');

  // WebRTC Call Hook
  const {
    callState,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    answerCall,
    rejectCall,
    isCallSupported,
    checkPermissions
  } = useWebRTC(userId);

  // Notifications Hook
  const {
    notifications,
    unreadCount: notificationsUnreadCount,
    markAllAsRead,
    markAsRead: markNotificationAsRead,
    deleteNotification,
    clearAll,
    triggerTestNotification,
    fetchNotifications
  } = useNotifications(userId);

  // Local Modal States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortOption, setSortOption] = useState<string>('recent');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showActivityMenu, setShowActivityMenu] = useState(false);
  const [showWantMoreLikes, setShowWantMoreLikes] = useState(false);
  const [showRechargeCredits, setShowRechargeCredits] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showOneDayPremiumModal, setShowOneDayPremiumModal] = useState(false);
  const [premiumSlideId, setPremiumSlideId] = useState<string | undefined>(undefined);
  const [showCallUI, setShowCallUI] = useState(false);
  const [callPermissionsGranted, setCallPermissionsGranted] = useState(false);

  // User credits subscription to react only when a real need occurs (solde à zéro)
  const [userCredits, setUserCredits] = useState<number>(() => monetizationService.getCredits());

  useEffect(() => {
    const unsub = monetizationService.subscribe(() => {
      setUserCredits(monetizationService.getCredits());
    });
    return unsub;
  }, []);

  // Realtime subscription for messages
  const realtimeChannelRef = useRef<any>(null);
  
  useEffect(() => {
    // Only subscribe if user is authenticated and has an active chat
    if (propActiveChatId && userId) {
      realtimeChannelRef.current = subscribeToMessages(propActiveChatId, (newMessage) => {
        // Update discussions with new message
        if (typeof propSetDiscussions === 'function' && propDiscussions) {
          const updated = propDiscussions.map((disc: any) => {
            if (disc.id === propActiveChatId) {
              return {
                ...disc,
                messages: [...disc.messages, {
                  id: newMessage.id,
                  text: newMessage.text,
                  sender: newMessage.sender_id === userId ? 'user' : 'other',
                  timestamp: new Date(newMessage.timestamp),
                  read: newMessage.is_read,
                  type: 'text'
                }],
                lastMessage: newMessage.text,
                lastMessageTime: new Date(newMessage.timestamp)
              };
            }
            return disc;
          });
          propSetDiscussions(updated);
        }
      });
    }
    
    return () => {
      if (realtimeChannelRef.current) {
        unsubscribeFromChannel(realtimeChannelRef.current);
      }
    };
  }, [propActiveChatId, userId, propSetDiscussions, propDiscussions]);

  const [activePromo, setActivePromo] = useState<RealtimePromoType>(null);
  const prevLikesRef = useRef<number>(receivedLikesCount);
  const isMountedRef = useRef<boolean>(false);

  const handleDismissPromo = useCallback(() => {
    if (activePromo === 'zero_credits') {
      try {
        localStorage.setItem('bavel_dismissed_zero_credits_alert', 'true');
      } catch {}
    } else if (activePromo === 'new_like') {
      try {
        localStorage.setItem('bavel_last_dismissed_likes_count', receivedLikesCount.toString());
      } catch {}
    }
    setActivePromo(null);
  }, [activePromo, receivedLikesCount]);

  // Swipe & Action States
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [ignoredIds, setIgnoredIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('bavel_ignored_discussions') || '[]');
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reportingDiscussionId, setReportingDiscussionId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleIgnore = (discussionId: string) => {
    const disc = displayDiscussions.find(d => d.id === discussionId);
    const name = disc && disc.name ? disc.name.replace(" ✨", "") : "Utilisateur";
    setIgnoredIds(prev => {
      const next = [...prev, discussionId];
      localStorage.setItem('bavel_ignored_discussions', JSON.stringify(next));
      return next;
    });
    setSwipedId(null);
    showToast(`Discussion avec ${name} masquée.`);
  };

  const handleReportClick = (discussionId: string) => {
    setSwipedId(null);
    setReportingDiscussionId(discussionId);
  };

  const handleConfirmReport = async (reason: string) => {
    if (!reportingDiscussionId) return;
    const disc = displayDiscussions.find(d => d.id === reportingDiscussionId);
    const name = disc && disc.name ? disc.name.replace(" ✨", "") : "Utilisateur";
    
    setIgnoredIds(prev => {
      const next = [...prev, reportingDiscussionId];
      localStorage.setItem('bavel_ignored_discussions', JSON.stringify(next));
      return next;
    });
    
    await reportUser(reportingDiscussionId, reason);
    setReportingDiscussionId(null);
    showToast(`Signalement envoyé (${reason}). ${name} a été bloqué pour votre sécurité.`);
    refreshDiscussions();
  };

  // Favorites tracking (starred ids)
  const [starredIds, setStarredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bavel_starred_discussion_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleStarred = useCallback((discussionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds(prev => {
      const next = prev.includes(discussionId) 
        ? prev.filter(id => id !== discussionId)
        : [...prev, discussionId];
      localStorage.setItem('bavel_starred_discussion_ids', JSON.stringify(next));
      return next;
    });
  }, []);

  // Active Chat State Management
  const [localActiveChatId, setLocalActiveChatId] = useState<string | null>(null);

  const activeChatId = useMemo(() => {
    if (propActiveChatId !== undefined && propActiveChatId !== null) return propActiveChatId;
    if (propActiveChat !== undefined && propActiveChat !== null) return propActiveChat.id || propActiveChat.user_id || null;
    return localActiveChatId;
  }, [propActiveChatId, propActiveChat, localActiveChatId]);

  const currentUserName = 'Membre';

  const bavelDiscussionItem = useMemo(() => {
    const msgs = bavelSupportService.getMessages();
    const lastMsgObj = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    const lastMsgSnippet = lastMsgObj 
      ? (lastMsgObj.text.length > 55 ? lastMsgObj.text.substring(0, 52) + '...' : lastMsgObj.text)
      : `Salut ${currentUserName} 👋 Ça fait plaisir de vous rev...`;

    return {
      id: 'bavel_official',
      userId: 'bavel_official',
      name: 'Bavel',
      avatar: 'bavel_avatar',
      online: false,
      unreadCount: 0,
      messages: [],
      lastMessage: lastMsgSnippet,
      lastMessageTime: new Date('2026-07-23T12:44:00'),
      isBavelSupport: true
    };
  }, [currentUserName]);

  // Combined Real Discussions from Props or Hook or Test Discussions
  const rawDiscussions = useMemo(() => {
    let list: Discussion[] = [];
    if (propDiscussions && propDiscussions.length > 0) {
      list = propDiscussions.map((d: any) => ({
        id: String(d.id || d.user_id),
        userId: String(d.user_id || d.id),
        name: d.name || 'Utilisateur',
        avatar: d.img || d.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
        age: d.age,
        online: d.online ?? true,
        unreadCount: d.unreadCount || 0,
        messages: d.messages || [],
        lastMessage: d.lastMessage || d.initialMessage || 'Coucou 👋',
        lastMessageTime: d.lastMessageTime ? new Date(d.lastMessageTime) : new Date(),
        allowVoiceCall: d.allowVoiceCall !== false,
        allowVideoCall: d.allowVideoCall !== false,
        tagline: d.tagline,
        location: d.location
      }));
    } else if (hookDiscussions && hookDiscussions.length > 0) {
      list = hookDiscussions;
    }

    return list;
  }, [propDiscussions, hookDiscussions]);

  // Filtered & Sorted Discussions (Excluding Ignored & Blocked)
  const displayDiscussions = useMemo(() => {
    const list = rawDiscussions.filter(d => !ignoredIds.includes(d.id) && !ignoredIds.includes(d.userId) && d.id !== 'bavel_official');
    
    // Sort according to current option
    const sorted = [...list].sort((a, b) => {
      if (sortOption === 'unread') {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount;
      } else if (sortOption === 'favorites') {
        const isA = starredIds.includes(a.id);
        const isB = starredIds.includes(b.id);
        if (isA !== isB) return isA ? -1 : 1;
      }
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });

    if (!ignoredIds.includes('bavel_official')) {
      return [bavelDiscussionItem, ...sorted];
    }
    return sorted;
  }, [rawDiscussions, ignoredIds, sortOption, starredIds, bavelDiscussionItem]);

  const totalUnreadCount = useMemo(() => {
    return displayDiscussions.reduce((acc, d) => acc + (d.unreadCount || 0), 0);
  }, [displayDiscussions]);

  // Contextual Real-Time Need Engine (Le besoin en temps réel, sans timers intempestifs)
  // Comme un homme qui cherche un comprimé uniquement quand il a mal à la tête :
  // Aucune apparition aléatoire, aucun timer d'auto-masquage ou de clignotement.
  useEffect(() => {
    // Règle 1: Membres VIP - Aucun affichage publicitaire ou bandeau promotionnel
    if (isPremium) {
      if (activePromo !== null) setActivePromo(null);
      return;
    }

    // Règle 2: Événement en temps réel - Un nouveau like vient d'arriver pendant la session
    const hasNewIncomingLike = isMountedRef.current && receivedLikesCount > prevLikesRef.current;
    prevLikesRef.current = receivedLikesCount;

    if (hasNewIncomingLike) {
      const dismissedLikesCount = parseInt(localStorage.getItem('bavel_last_dismissed_likes_count') || '0', 10);
      if (receivedLikesCount > dismissedLikesCount) {
        setActivePromo('new_like');
        return;
      }
    }

    // Règle 3: Vrai besoin critique - Crédits à 0 ("mal de tête" = besoin d'un comprimé)
    if (userCredits <= 0) {
      const hasDismissed = localStorage.getItem('bavel_dismissed_zero_credits_alert') === 'true';
      if (!hasDismissed) {
        setActivePromo('zero_credits');
        return;
      }
    } else {
      // Dès que l'utilisateur a des crédits, réinitialiser la fermeture pour les futures alertes si crédits épuisés
      if (localStorage.getItem('bavel_dismissed_zero_credits_alert') === 'true') {
        localStorage.removeItem('bavel_dismissed_zero_credits_alert');
      }
      if (activePromo === 'zero_credits') {
        setActivePromo(null);
      }
    }

    isMountedRef.current = true;
  }, [isPremium, userCredits, receivedLikesCount, activePromo]);

  const activeChat = useMemo(() => {
    if (propActiveChat !== undefined && propActiveChat !== null) {
      return {
        id: String(propActiveChat.id || propActiveChat.user_id),
        userId: String(propActiveChat.user_id || propActiveChat.id),
        name: propActiveChat.name || 'Utilisateur',
        avatar: propActiveChat.img || propActiveChat.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
        age: propActiveChat.age,
        online: propActiveChat.online ?? true,
        unreadCount: propActiveChat.unreadCount || 0,
        messages: propActiveChat.messages || [],
        lastMessage: propActiveChat.lastMessage || propActiveChat.initialMessage || 'Coucou 👋'
      };
    }
    if (!activeChatId) return null;
    return displayDiscussions.find(d => d.id === activeChatId || d.userId === activeChatId) || null;
  }, [propActiveChat, activeChatId, displayDiscussions]);

  const setActiveChatId = useCallback((id: string | null) => {
    if (propSetActiveChatId !== undefined) {
      propSetActiveChatId(id);
    } else if (propSetActiveChat !== undefined) {
      if (id === null) {
        propSetActiveChat(null);
      } else {
        const found = displayDiscussions.find(d => d.id === id || d.userId === id);
        propSetActiveChat(found || { id });
      }
    } else {
      setLocalActiveChatId(id);
    }
  }, [propSetActiveChatId, propSetActiveChat, displayDiscussions]);

  // Mark as read & record match visit on active chat open
  useEffect(() => {
    if (activeChatId) {
      pushNotificationService.recordMatchVisit(activeChatId);
      const discussion = displayDiscussions.find(d => d.id === activeChatId || d.userId === activeChatId);
      if (discussion) {
        if (discussion.userId) pushNotificationService.recordMatchVisit(discussion.userId);
        if (discussion.unreadCount > 0) {
          markAsRead(activeChatId);
        }
      }
    }
  }, [activeChatId, displayDiscussions, markAsRead]);

  // Periodic evaluation for unvisited matches older than 24h
  useEffect(() => {
    if (rawDiscussions && rawDiscussions.length > 0) {
      const timer = setTimeout(() => {
        pushNotificationService.checkUnvisitedMatchReminders(rawDiscussions);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [rawDiscussions]);

  // Call UI synchronization
  useEffect(() => {
    if (callState.isActive) {
      setShowCallUI(true);
    } else {
      setShowCallUI(false);
    }
  }, [callState.isActive]);

  const handleOpenChat = useCallback((discussionId: string) => {
    setActiveChatId(discussionId);
    markAsRead(discussionId);
  }, [setActiveChatId, markAsRead]);

  const handleCloseChat = useCallback(() => {
    setActiveChatId(null);
  }, [setActiveChatId]);

  const handleSendMessage = useCallback(async (text: string, type: 'text' | 'image' = 'text') => {
    if (!activeChatId) return;
    try {
      await sendMessage(activeChatId, text, type);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [activeChatId, sendMessage]);

  const handleStartVoiceCall = useCallback(async () => {
    if (!activeChat) return;
    if (!callPermissionsGranted) {
      const granted = await checkPermissions();
      setCallPermissionsGranted(granted);
      if (!granted) return;
    }
    try {
      await startCall(activeChat.userId, 'voice');
    } catch (error) {
      console.error('Failed to start voice call:', error);
    }
  }, [activeChat, startCall, callPermissionsGranted, checkPermissions]);

  const handleStartVideoCall = useCallback(async () => {
    if (!activeChat) return;
    if (!callPermissionsGranted) {
      const granted = await checkPermissions();
      setCallPermissionsGranted(granted);
      if (!granted) return;
    }
    try {
      await startCall(activeChat.userId, 'video');
    } catch (error) {
      console.error('Failed to start video call:', error);
    }
  }, [activeChat, startCall, callPermissionsGranted, checkPermissions]);

  const handleEndCall = useCallback(() => {
    endCall();
  }, [endCall]);

  const handleAnswerCall = useCallback(() => {
    answerCall();
  }, [answerCall]);

  const handleRejectCall = useCallback(() => {
    rejectCall();
  }, [rejectCall]);

  const handleToggleMute = useCallback(() => {
    toggleMute();
  }, [toggleMute]);

  const handleToggleVideo = useCallback(() => {
    toggleVideo();
  }, [toggleVideo]);

  const handleMarkAllNotificationsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const handleOpenUserProfile = useCallback((targetUserId: string) => {
    if (onOpenUserProfile) {
      onOpenUserProfile(targetUserId);
    }
  }, [onOpenUserProfile]);

  const handleBlockUser = useCallback(async (discussionId: string) => {
    try {
      await blockUser(discussionId);
      if (activeChatId === discussionId) {
        setActiveChatId(null);
      }
      showToast("Utilisateur bloqué avec succès.");
      refreshDiscussions();
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  }, [blockUser, activeChatId, setActiveChatId, refreshDiscussions]);

  const handleDeleteDiscussion = useCallback(async (discussionId: string) => {
    try {
      await deleteDiscussion(discussionId);
      if (activeChatId === discussionId) {
        setActiveChatId(null);
      }
      showToast("Discussion supprimée.");
      refreshDiscussions();
    } catch (error) {
      console.error('Failed to delete discussion:', error);
    }
  }, [deleteDiscussion, activeChatId, setActiveChatId, refreshDiscussions]);

  const handleMuteDiscussion = useCallback(async (discussionId: string) => {
    try {
      await muteDiscussion(discussionId);
      showToast("Notifications en sourdine pour cette discussion.");
    } catch (error) {
      console.error('Failed to mute discussion:', error);
    }
  }, [muteDiscussion]);

  // Format call duration helper
  const formatCallDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Format relative timestamp helper for mobile
  const formatDate = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours} h`;
    if (days < 7) return `${days} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }, []);

  return (
    <div className="pt-2 px-3.5 h-full flex flex-col bg-white relative pb-8">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 left-4 right-4 max-w-sm mx-auto bg-black/95 text-white px-3.5 py-2.5 rounded-xl shadow-xl z-[400] flex items-center space-x-2 text-[12px] font-bold"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      {showNotifications && (
        <NotificationsView 
          onClose={() => setShowNotifications(false)}
          notifications={notifications}
          unreadCount={notificationsUnreadCount}
          onMarkAllAsRead={handleMarkAllNotificationsRead}
          onMarkAsRead={markNotificationAsRead}
          onDeleteNotification={deleteNotification}
          onClearAll={clearAll}
          onTriggerTest={(type) => triggerTestNotification(type)}
          onNavigateToChat={(senderId) => {
            if (senderId) {
              setActiveChatId(String(senderId));
            }
          }}
        />
      )}
      
      {/* Search Modal */}
      {showSearch && (
        <SearchDiscussions 
          onClose={() => setShowSearch(false)}
          discussions={displayDiscussions}
          onSelectDiscussion={handleOpenChat}
        />
      )}
      
      {/* Sort Menu Modal */}
      {showSortMenu && (
        <DiscussionsSortMenu 
          onClose={() => setShowSortMenu(false)}
          discussions={displayDiscussions}
          onSort={(sorted) => {
            setSortOption('custom');
          }}
        />
      )}
      
      {/* Activity Menu Modal */}
      {showActivityMenu && (
        <ActivityMenu 
          onClose={() => setShowActivityMenu(false)}
          userId={userId}
        />
      )}
      
      {/* Monetization Modals */}
      {showWantMoreLikes && (
        <WantMoreLikesModal 
          onClose={() => setShowWantMoreLikes(false)} 
          onOpenRecharge={() => {
            setShowWantMoreLikes(false);
            setShowRechargeCredits(true);
          }} 
        />
      )}
      
      {showRechargeCredits && (
        <RechargeCreditsMenu 
          onClose={() => setShowRechargeCredits(false)}
        />
      )}
      
      <AnimatePresence>
        {showOneDayPremiumModal && (
          <OneDayPremiumModal
            onClose={() => setShowOneDayPremiumModal(false)}
          />
        )}
        {showPremiumModal && (
          <BavelPremiumModal 
            onClose={() => {
              setShowPremiumModal(false);
              setPremiumSlideId(undefined);
            }} 
            initialSlideId={premiumSlideId}
          />
        )}
      </AnimatePresence>
      
      {/* Action Menu (Block, Report, Mute, Delete) */}
      {showActionMenu && activeChat && (
        <ActionMenu 
          onClose={() => setShowActionMenu(false)}
          onBlock={() => handleBlockUser(activeChat.id)}
          onReport={() => {
            setShowActionMenu(false);
            setReportingDiscussionId(activeChat.id);
          }}
          onMute={() => handleMuteDiscussion(activeChat.id)}
          onDelete={() => handleDeleteDiscussion(activeChat.id)}
          onViewProfile={() => handleOpenUserProfile(activeChat.userId)}
        />
      )}

      {/* Report Menu */}
      {reportingDiscussionId && (
        <ReportMenu 
          onClose={() => setReportingDiscussionId(null)}
          onSelectReason={handleConfirmReport}
          userName={displayDiscussions.find(d => d.id === reportingDiscussionId)?.name || 'Utilisateur'}
        />
      )}

      {/* Chat Conversation View Modal */}
      <AnimatePresence>
        {activeChatId === 'bavel_official' ? (
          <BavelSupportChatView
            userName={currentUserName}
            onClose={handleCloseChat}
            onNavigateToTab={onNavigateToTab}
            onOpenPremium={() => setShowPremiumModal(true)}
          />
        ) : activeChat && (
          <ChatConversationView
            discussion={activeChat}
            isPremium={isPremium}
            onClose={handleCloseChat}
            onSendMessage={handleSendMessage}
            onStartVoiceCall={handleStartVoiceCall}
            onStartVideoCall={handleStartVideoCall}
            onLoadMore={loadMoreMessages}
            onOpenUserProfile={() => handleOpenUserProfile(activeChat.userId)}
            formatDate={formatDate}
            isCallActive={callState.isActive && (callState as any).targetUserId === activeChat.userId}
            callType={(callState as any).type}
            onDelete={() => handleDeleteDiscussion(activeChat.id)}
            onOpenPremium={(slideId) => setShowPremiumModal(true)}
          />
        )}
      </AnimatePresence>

      {/* Call UI Sheet */}
      <AnimatePresence>
        {showCallUI && (callState as any).targetUserId && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-2xl rounded-t-3xl border-t-2 border-gray-100"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                    {activeChat?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-black text-[15px]">{activeChat?.name || 'Appel'}</h3>
                    <p className="text-[12px] text-gray-500">
                      {callState.status === 'connecting' && 'Connexion...'}
                      {callState.status === 'ringing' && 'Sonnerie...'}
                      {callState.status === 'connected' && `En cours • ${formatCallDuration((callState as any).duration || 0)}`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleEndCall}
                  className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                  aria-label="Raccrocher"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center justify-center space-x-4">
                {(callState as any).type === 'video' && (
                  <button 
                    onClick={handleToggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      (callState as any).isVideoOff ? 'bg-gray-200 text-gray-600' : 'bg-blue-500 text-white'
                    }`}
                    aria-label={(callState as any).isVideoOff ? 'Activer la vidéo' : 'Désactiver la vidéo'}
                  >
                    {(callState as any).isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </button>
                )}
                <button 
                  onClick={handleToggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    callState.isMuted ? 'bg-gray-200 text-gray-600' : 'bg-blue-500 text-white'
                  }`}
                  aria-label={callState.isMuted ? 'Activer le micro' : 'Désactiver le micro'}
                >
                  {callState.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button 
                  onClick={handleEndCall}
                  className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                  aria-label="Raccrocher"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex justify-between items-center mb-3 shrink-0 pt-1">
        <div className="flex items-center space-x-2">
          <h1 className="text-[20px] sm:text-[22px] font-black text-black tracking-tight">Discussions</h1>
          {totalUnreadCount > 0 && (
            <span className="bg-[#ff2d55] text-white font-black text-[10.5px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs">
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2.5">
          {/* Booster Icon */}
          <button 
            className="p-1.5 cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center rounded-full hover:bg-gray-100" 
            onClick={() => setShowActivityMenu(true)}
            title="Votre activité"
            aria-label="Votre activité"
          >
            <div className="w-[20px] h-[20px] rounded-full border-[1.8px] border-[#ff6a00] flex items-center justify-center relative bg-white shadow-xs">
              <div className="w-[1.5px] h-[6px] bg-[#ff6a00] rounded-full absolute top-[3px] origin-bottom rotate-[35deg]" />
              <div className="w-1 h-1 rounded-full bg-[#ff6a00]" />
            </div>
          </button>

          {/* Notification Bell */}
          <button 
            onClick={() => setShowNotifications(true)} 
            className="p-1.5 relative cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center rounded-full hover:bg-gray-100"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="w-[19px] h-[19px] text-black fill-black" strokeWidth={1.2} />
            {notificationsUnreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#ff2d55] rounded-full border border-white shadow-xs" />
            )}
          </button>

          {/* Search Icon */}
          <button 
            onClick={() => setShowSearch(true)} 
            className="p-1.5 cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Rechercher"
          >
            <Search className="w-[19px] h-[19px] text-black" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Top Carousel: Likes et Matchs */}
      <div className="mb-3.5 shrink-0">
        <h3 className="text-[13px] font-black text-black mb-2 tracking-tight">Likes et Matchs</h3>
        <div className="flex space-x-3 overflow-x-auto pb-1 scrollbar-hide">
          {/* First slot: Likes received button */}
          <button 
            onClick={() => {
              if (onNavigateToTab) {
                onNavigateToTab('likes');
              } else {
                setShowWantMoreLikes(true);
              }
            }}
            className="flex flex-col items-center space-y-1 shrink-0 cursor-pointer group active:scale-95 transition-transform"
            aria-label="Voir les likes"
          >
            <div className="relative w-[50px] h-[50px] rounded-full p-[2px] bg-gradient-to-tr from-[#ff2d55] via-[#ff5e3a] to-[#ff9500] shrink-0 flex items-center justify-center shadow-xs">
              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-[#ff2d55] fill-[#ff2d55]" />
              </div>
              {receivedLikesCount > 0 && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-[#ff2d55] text-white text-[8.5px] font-black px-1.5 py-0.5 rounded-full flex items-center space-x-0.5 border-2 border-white shadow-xs z-10 whitespace-nowrap">
                  <span>❤️</span>
                  <span>{receivedLikesCount}</span>
                </div>
              )}
            </div>
            <span className="text-[11px] font-extrabold text-gray-600 group-hover:text-black tracking-tight">
              Likes
            </span>
          </button>
          
          {/* Real Matches Slots (Excluding Bavel Support from top story bubbles) */}
          {displayDiscussions
            .filter((disc) => disc.id !== 'bavel_official' && !(disc as any).isBavelSupport)
            .map((disc) => (
            <button
              key={`match-story-${disc.id}`}
              onClick={() => handleOpenChat(disc.id)}
              className="flex flex-col items-center space-y-1 shrink-0 cursor-pointer group active:scale-95 transition-transform"
              aria-label={`Match avec ${disc.name}`}
            >
              <div className="relative w-[50px] h-[50px] rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-pink-500 shrink-0 flex items-center justify-center shadow-xs">
                <img 
                  src={disc.avatar} 
                  alt={disc.name} 
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <span className="text-[11px] font-extrabold text-gray-700 group-hover:text-black tracking-tight flex items-center justify-center space-x-1 max-w-[58px]">
                <span className="truncate">{disc.name.split(' ')[0]}</span>
                {disc.online && (
                  <span className="w-2 h-2 bg-[#2ad546] rounded-full shrink-0" title="En ligne" />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Header */}
      <div className="flex justify-between items-center mb-2 shrink-0">
        <h2 className="text-[15px] font-black text-black tracking-tight">Messages</h2>
        <button 
          onClick={() => setShowSortMenu(true)} 
          className="flex items-center space-x-1 text-black font-extrabold text-[12px] p-1 rounded-md hover:bg-gray-100 active:opacity-70 transition-all cursor-pointer"
          aria-label="Trier les messages"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 20V4" />
            <path d="m3 16 4 4 4-4" />
            <path d="M14 9h7" strokeWidth="2.5" />
            <path d="M14 15h4" strokeWidth="2.5" />
          </svg>
          <span className="tracking-tight">Trier par</span>
        </button>
      </div>

      {/* Discussions List */}
      <div className="flex-1 overflow-y-auto pb-20 scrollbar-hide space-y-2">
        {/* Dynamic Contextual Need-Based Banner (Activé UNIQUEMENT en cas de besoin réel, jamais en boucle) */}
        <AnimatePresence mode="wait">
          {activePromo === 'new_like' && (
            <motion.div
              key="promo-new-like"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden mb-2"
            >
              <div className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-rose-50/95 via-pink-50/85 to-rose-50/95 border border-rose-100 shadow-2xs">
                <button
                  onClick={() => {
                    if (onNavigateToTab) {
                      onNavigateToTab('likes');
                    } else {
                      setShowWantMoreLikes(true);
                    }
                    handleDismissPromo();
                  }}
                  className="flex-1 flex items-center space-x-3 text-left active:opacity-75 transition-all min-w-0 cursor-pointer"
                >
                  <div className="relative w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-full bg-gradient-to-br from-[#ff2d55] to-[#e20030] flex items-center justify-center shrink-0 shadow-xs border border-rose-200">
                    <Heart className="w-5 h-5 text-white fill-white" />
                    <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 bg-amber-400 text-black text-[8.5px] font-black rounded-full shadow-xs">
                      HOT
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center space-x-1.5">
                      <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-950 tracking-tight leading-snug truncate">
                        {receivedLikesCount === 1 ? '1 nouvelle personne s’intéresse à vous !' : `${receivedLikesCount} nouvelles personnes vous ont liké !`}
                      </h3>
                      <span className="text-[8.5px] sm:text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 tracking-wide shrink-0">
                        En direct
                      </span>
                    </div>
                    <p className="text-[11.5px] sm:text-[12px] text-gray-600 font-medium leading-tight mt-0.5 truncate">
                      Découvrez qui attend votre réponse pour matcher
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissPromo();
                  }}
                  className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center -mr-1 text-gray-400 hover:text-gray-700 active:scale-90 rounded-full hover:bg-black/5 transition-all shrink-0 cursor-pointer"
                  title="Fermer"
                  aria-label="Fermer la notification de like"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real Discussions List */}
        {loading && displayDiscussions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#e20030] border-t-transparent"></div>
          </div>
        ) : displayDiscussions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-gray-50 rounded-2xl p-6 border border-gray-100 my-2">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-2.5 text-[#e20030]">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-[14px] font-black text-black mb-1">Aucune discussion pour l'instant</h3>
            <p className="text-gray-500 text-[12px] max-w-[220px] mb-4 leading-relaxed">
              Dès que vous matchez ou likez un profil en retour, vos conversations apparaîtront ici.
            </p>
            <button 
              onClick={() => onNavigateToTab?.('encounters')}
              className="bg-black text-white font-bold text-[12.5px] py-2 px-5 rounded-full shadow-xs active:scale-95 transition-transform cursor-pointer"
            >
              Découvrir des profils
            </button>
          </div>
        ) : (
          displayDiscussions.map((discussion) => {
            const hasUnread = discussion.unreadCount > 0;
            
            return (
              <div 
                key={discussion.id}
                className="w-full relative overflow-hidden rounded-2xl bg-zinc-100"
              >
                {/* Underlying Action Buttons - Always rendered in background */}
                <div className="absolute inset-y-0 right-0 flex z-0 rounded-r-2xl overflow-hidden">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIgnore(discussion.id);
                    }}
                    className="h-full px-4 bg-[#121212] text-white font-extrabold text-[12.5px] tracking-tight flex items-center justify-center cursor-pointer active:opacity-90 transition-opacity"
                  >
                    Ignorer
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReportClick(discussion.id);
                    }}
                    className="h-full px-4 bg-[#e20030] text-white font-extrabold text-[12.5px] tracking-tight flex items-center justify-center cursor-pointer active:opacity-90 transition-opacity"
                  >
                    Signaler
                  </button>
                </div>

                {/* Sliding Card Container */}
                <motion.div 
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: -140, right: 0 }}
                  dragElastic={{ left: 0.05, right: 0.05 }}
                  onDragEnd={(event, info) => {
                    if (info.offset.x < -35) {
                      setSwipedId(discussion.id);
                    } else if (info.offset.x > 35) {
                      setSwipedId(null);
                    } else {
                      if (swipedId === discussion.id && info.offset.x > 15) {
                        setSwipedId(null);
                      }
                    }
                  }}
                  animate={{ x: swipedId === discussion.id ? -140 : 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="relative z-10 bg-white w-full flex items-center justify-between py-2 px-2.5 rounded-2xl cursor-grab active:cursor-grabbing border border-gray-100 shadow-2xs hover:border-gray-200 transition-colors"
                >
                  <button 
                    onClick={() => {
                      if (swipedId) {
                        setSwipedId(null);
                      } else {
                        handleOpenChat(discussion.id);
                      }
                    }}
                    className="flex-1 flex items-center space-x-3 text-left active:opacity-75 transition-all min-w-0"
                    aria-label={`Conversation avec ${discussion.name}`}
                  >
                    <div className="relative w-[48px] h-[48px] rounded-full shrink-0 shadow-xs">
                      {discussion.id === 'bavel_official' || (discussion as any).isBavelSupport ? (
                        <BavelAvatar size={48} />
                      ) : (
                        <div className="w-full h-full rounded-full overflow-hidden border border-gray-100 bg-zinc-100 relative">
                          <img 
                            src={discussion.avatar} 
                            alt={discussion.name} 
                            className="w-full h-full object-cover rounded-full"
                            loading="lazy"
                            draggable="false"
                          />
                          {hasUnread && (
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#ff2d55] rounded-full border-1.5 border-white shadow-xs z-10" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <h3 className={`text-[13.5px] ${hasUnread ? 'font-black text-black' : 'font-bold text-black'} tracking-tight truncate`}>
                            {discussion.name}
                          </h3>
                          {discussion.online && (
                            <span className="w-2.5 h-2.5 bg-[#2ad546] rounded-full shrink-0 shadow-xs" title="En ligne" />
                          )}
                        </div>
                        {discussion.lastMessageTime && (
                          <span className="text-[10.5px] text-gray-400 font-semibold shrink-0 ml-1">
                            {formatDate(discussion.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      
                      <p className={`text-[12px] leading-tight truncate ${
                        hasUnread ? 'text-black font-extrabold' : 'text-gray-500 font-medium'
                      }`}>
                        {discussion.lastMessage || 'Nouvelle conversation'}
                      </p>
                    </div>
                  </button>
                  
                  {/* Star Favorite Button */}
                  {swipedId !== discussion.id && (
                    <div className="pl-1.5 shrink-0">
                      <button
                        onClick={(e) => toggleStarred(discussion.id, e)}
                        className="p-1.5 cursor-pointer hover:scale-115 active:scale-90 transition-all text-gray-300"
                        title="Favori"
                      >
                        <Star 
                          className={`w-[17px] h-[17px] transition-all ${
                            starredIds.includes(discussion.id) 
                              ? 'text-amber-400 fill-amber-400' 
                              : 'text-gray-300'
                          }`} 
                          strokeWidth={starredIds.includes(discussion.id) ? 1.0 : 1.5}
                        />
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
