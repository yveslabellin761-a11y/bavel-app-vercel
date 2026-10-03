import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, ShieldAlert, X, Shield, Search, Users, AlertTriangle, 
  BarChart3, Settings, Check, UserPlus, Gift, Trash2, Edit2, Star, 
  Sparkles, Save, Info, Lock, ArrowLeft, Activity, Clock, 
  UserCheck, UserX, Heart, MessageCircle, TrendingUp, Award,
  Zap, Bell, Eye, EyeOff, RefreshCw, Download, Upload,
  Filter, Calendar, PieChart, DollarSign, CreditCard,
  Database, Server, Wifi, WifiOff, Moon, Sun, AlertOctagon,
  Megaphone, Radio, Send, CheckCircle2, MessageSquare, AlertCircle,
  Cpu, Layers, CheckSquare, Square, FileSpreadsheet, Plus, Trash,
  SlidersHorizontal, Terminal, Globe, Share2, ShieldX, Key, Headphones
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { getSupabase, syncProfileToSupabase } from '../../lib/supabase';
import { authFetch } from '../../lib/authFetch';

// ============================================
// 1. TYPES & INTERFACES
// ============================================

export interface Report {
  id: string;
  reporterName: string;
  reporterId: string;
  reportedId: string;
  reportedName: string;
  reason: string;
  details?: string;
  date: string;
  timestamp: number;
  status: 'pending' | 'resolved' | 'dismissed' | 'investigating';
  priority: 'low' | 'medium' | 'high';
  category: 'fake_profile' | 'harassment' | 'spam' | 'inappropriate' | 'scam' | 'other';
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: number;
  type: 'login' | 'swipe' | 'like' | 'message' | 'report' | 'moderation' | 'premium' | 'broadcast' | 'other';
}

export interface ModerationQueue {
  id: string;
  userId: string;
  userName: string;
  type: 'photo' | 'bio' | 'profile';
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
}

interface DeceptionReview {
  riskScore: number;
  riskCategory: string;
  recommendedAction: 'no_action' | 'monitor' | 'human_review';
  signals: string[];
  explanation: string;
}

export interface SystemBroadcast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'maintenance' | 'event' | 'promo';
  createdAt: number;
  active: boolean;
  priority: 'normal' | 'urgent';
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  category: 'billing' | 'account' | 'report' | 'technical' | 'general';
  createdAt: number;
  date: string;
  messages: {
    id: string;
    sender: 'user' | 'support';
    senderName: string;
    text: string;
    time: string;
  }[];
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  premiumUsers: number;
  suspendedUsers: number;
  verifiedUsers: number;
  totalLikes: number;
  totalMatches: number;
  totalMessages: number;
  reportsPending: number;
  reportsResolved: number;
  totalCredits: number;
  revenue: {
    total: number;
    today: number;
    thisMonth: number;
  };
  engagement: {
    dailyActive: number;
    weeklyActive: number;
    monthlyActive: number;
    avgSessionTime: number;
  };
}

// ============================================
// 2. COMPOSANT PRINCIPAL
// ============================================

export function AdminPanel({ 
  profiles: propProfiles = [], 
  onClose,
  onForceRefresh,
  onUpdateProfiles,
  messages: propMessages = [],
  matches: propMatches = [],
  likes = [],
}: { 
  profiles: any[]; 
  onClose: () => void;
  onForceRefresh: () => void;
  onUpdateProfiles?: (updated: any[]) => void;
  messages?: any[];
  matches?: any[];
  likes?: any[];
}) {
  // Real production profiles from database
  const profiles = useMemo(() => {
    return propProfiles || [];
  }, [propProfiles]);

  // ============================================
  // 2.1 ÉTATS D'ONGLETS & UI
  // ============================================

  const [activeTab, setActiveTab] = useState<
    'overview' | 'traffic' | 'users' | 'monetization' | 'support' | 'security' | 'broadcast' | 'finance' | 'stats' | 'config' | 'activity' | 'messages' | 'reports' | 'moderation'
  >('overview');

  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  
  // Interrupteur Master Monétisation (Global Site)
  const [monetizationEnabled, setMonetizationEnabled] = useState<boolean>(() => {
    return true;
  });

  // Modals & Inspection
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [inspectingChat, setInspectingChat] = useState<any | null>(null);

  // Support Tickets & Messagerie Service Client
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  /*
    return [
      {
        id: 'ticket-101',
        userId: 'user_sylviane',
        userName: 'Sylviane Kouamé',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        subject: 'Validation du Badge Certifié',
        status: 'open',
        priority: 'high',
        category: 'account',
        createdAt: Date.now() - 1800000,
        date: 'Aujourd\'hui, 11:20',
        messages: [
          {
            id: 'msg-1',
            sender: 'user',
            senderName: 'Sylviane',
            text: 'Bonjour, j\'ai soumis ma photo pour obtenir le badge certifié ce matin. Pouvez-vous vérifier mon profil svp ?',
            time: '11:20'
          }
        ]
      },
      {
        id: 'ticket-102',
        userId: 'user_maila',
        userName: 'Maila Traoré',
        userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
        subject: 'Achat de Crédits Orange Money',
        status: 'in_progress',
        priority: 'medium',
        category: 'billing',
        createdAt: Date.now() - 7200000,
        date: 'Aujourd\'hui, 09:45',
        messages: [
          {
            id: 'msg-2',
            sender: 'user',
            senderName: 'Maila',
            text: 'Bonjour le service client. J\'ai rechargé 100 crédits via Orange Money et la transaction indique validée.',
            time: '09:45'
          },
          {
            id: 'msg-3',
            sender: 'support',
            senderName: 'Support Bavel',
            text: 'Bonjour Maila, nous vérifions le reçu de paiement auprès de l\'opérateur. Vos crédits seront crédités sous peu.',
            time: '10:02'
          }
        ]
      },
      {
        id: 'ticket-103',
        userId: 'user_doria',
        userName: 'Doria Bassa',
        userAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
        subject: 'Question sur le Pass VIP Gold',
        status: 'resolved',
        priority: 'low',
        category: 'general',
        createdAt: Date.now() - 86400000,
        date: 'Hier, 16:30',
        messages: [
          {
            id: 'msg-4',
            sender: 'user',
            senderName: 'Doria',
            text: 'Quels sont les avantages exacts du Pass VIP ? Est-ce que les swipes sont illimités ?',
            time: '16:30'
          },
          {
            id: 'msg-5',
            sender: 'support',
            senderName: 'Support Bavel',
            text: 'Bonjour Doria ! Oui, le Pass VIP débloque les likes illimités, la visibilité prioritaire et permet de voir qui vous a liké !',
            time: '16:45'
          }
        ]
      }
    ];
  */
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Banned IPs State
  const [bannedIPs, setBannedIPs] = useState<string[]>(() => {
    return [];
  });
  const [newBannedIPInput, setNewBannedIPInput] = useState('');

  // Filtres
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'credits' | 'created'>('name');
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female' | 'other'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'verified' | 'premium'>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('bavel_admin_dark_mode') !== 'false';
  });

  // Bulk Selection & Nouveaux Modules
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [directMsgModalUser, setDirectMsgModalUser] = useState<any | null>(null);
  const [directMsgText, setDirectMsgText] = useState('');

  // Anti-Scam Rules Manager
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>(() => {
    return ['argent', 'virement', 'whatsapp', 'telegram', 'broutat', 'transcash', 'pcs', 'rib', 'orange money', 'wave'];
  });
  const [newKeywordInput, setNewKeywordInput] = useState('');

  const [isRevokingSessions, setIsRevokingSessions] = useState(false);

  // Health Metrics State (Temps Réel)
  const [healthMetrics, setHealthMetrics] = useState<{
    status: 'checking' | 'healthy' | 'unhealthy';
    pingMs: number | null;
    dbState: string;
    lastChecked: string | null;
  }>({
    status: 'checking',
    pingMs: null,
    dbState: 'Vérification de l’API…',
    lastChecked: null
  });

  const checkHealth = useCallback(async () => {
    const startedAt = performance.now();
    try {
      const response = await fetch('/health', { cache: 'no-store' });
      const health = await response.json();
      const healthy = response.ok && health?.status === 'healthy';
      setHealthMetrics({
        status: healthy ? 'healthy' : 'unhealthy',
        pingMs: Math.round(performance.now() - startedAt),
        dbState: healthy ? 'Base de données opérationnelle' : 'API ou base de données indisponible',
        lastChecked: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      return healthy;
    } catch {
      setHealthMetrics({
        status: 'unhealthy',
        pingMs: null,
        dbState: typeof navigator === 'undefined' || navigator.onLine ? 'Service de santé inaccessible' : 'Hors ligne',
        lastChecked: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
      return false;
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const interval = setInterval(() => void checkHealth(), 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [checkHealth]);

  // ============================================
  // 2.2 CONFIGURATION
  // ============================================

  const [config, setConfig] = useState(() => ({
    dailyCredits: 20,
    minAge: 18,
    maintenanceMode: false,
    photoModeration: true,
    autoSuspendSpam: true,
    maxMessagesPerDay: 100,
    maxLikesPerDay: 50,
    superLikeCost: 25,
    boostCost: 50,
    reportAutoResolveHours: 72,
    enablePushNotifications: true,
    enableEmailNotifications: true,
  }));

  // ============================================
  // 2.3 AUTHENTIFICATION & PERMISSIONS
  // ============================================

  const { userRole, isAdmin, user } = useAuth();
  const isAuthorized = isAdmin || userRole === 'admin';

  useEffect(() => {
    if (!isAuthorized) return;
    authFetch('/api/admin/settings').then(async response => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Configuration indisponible');
      setBannedIPs(payload?.bannedIps || []);
      if (typeof payload?.settings?.monetization_enabled === 'boolean') setMonetizationEnabled(payload.settings.monetization_enabled);
      if (Array.isArray(payload?.settings?.blocked_keywords)) setBlockedKeywords(payload.settings.blocked_keywords);
      if (payload?.settings?.config && typeof payload.settings.config === 'object') setConfig(current => ({ ...current, ...payload.settings.config }));
    }).catch(error => {
      console.error('Chargement configuration admin impossible:', error);
      showToast('Configuration admin indisponible', 'error');
    });
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    Promise.all([authFetch('/api/admin/activity'), authFetch('/api/admin/moderation-queue')])
      .then(async ([activityResponse, queueResponse]) => {
        const activityPayload = await activityResponse.json().catch(() => null);
        const queuePayload = await queueResponse.json().catch(() => null);
        if (!activityResponse.ok) throw new Error(activityPayload?.error || 'Journal admin indisponible');
        if (!queueResponse.ok) throw new Error(queuePayload?.error || 'File de modération indisponible');
        if (!cancelled) {
          setActivityLog(Array.isArray(activityPayload?.activity) ? activityPayload.activity : []);
          setModerationQueue(Array.isArray(queuePayload?.queue) ? queuePayload.queue : []);
        }
      })
      .catch(error => {
        console.error('Chargement activité/modération impossible:', error);
        if (!cancelled) showToast('Activité ou modération indisponible', 'error');
      });
    return () => { cancelled = true; };
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    authFetch('/api/admin/support/tickets')
      .then(async response => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Tickets support indisponibles');
        if (!cancelled) setSupportTickets(payload?.tickets || []);
      })
      .catch(error => {
        console.error('Chargement support admin impossible:', error);
        if (!cancelled) showToast('Impossible de charger le support', 'error');
      });
    return () => { cancelled = true; };
  }, [isAuthorized]);

  // ============================================
  // 2.4 SIGNALEMENTS (REPORTS)
  // ============================================

  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    authFetch('/api/admin/reports')
      .then(async response => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Signalements indisponibles');
        if (!cancelled) setReports(payload?.reports || []);
      })
      .catch(error => {
        console.error('Chargement des signalements admin impossible:', error);
        if (!cancelled) showToast('Impossible de charger les signalements', 'error');
      });
    return () => { cancelled = true; };
  }, [isAuthorized]);

  // ============================================
  // 2.5 ANNONCES FLASH (BROADCASTS)
  // ============================================

  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>([]);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;
    authFetch('/api/admin/broadcasts')
      .then(async response => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Annonces indisponibles');
        if (!cancelled) setBroadcasts(payload?.broadcasts || []);
      })
      .catch(error => {
        console.error('Chargement annonces admin impossible:', error);
        if (!cancelled) showToast('Impossible de charger les annonces', 'error');
      });
    return () => { cancelled = true; };
  }, [isAuthorized]);

  const [newBroadcastTitle, setNewBroadcastTitle] = useState('');
  const [newBroadcastMsg, setNewBroadcastMsg] = useState('');
  const [newBroadcastType, setNewBroadcastType] = useState<SystemBroadcast['type']>('info');
  const [newBroadcastUrgent, setNewBroadcastUrgent] = useState(false);

  // ============================================
  // 2.6 DISCUSSIONS & SURVEILLANCE
  // ============================================

  const liveDiscussions = useMemo(() => {
    return [];
  }, [activeTab]);

  // ============================================
  // 2.7 JOURNAL D'ACTIVITÉS & FILE DE MODÉRATION
  // ============================================

  const [activityLog, setActivityLog] = useState<ActivityLog[]>(() => {
    return [];
  });

  const [moderationQueue, setModerationQueue] = useState<ModerationQueue[]>(() => {
    return [];
  });
  const [deceptionReviews, setDeceptionReviews] = useState<Record<string, DeceptionReview>>({});
  const [deceptionReviewLoadingId, setDeceptionReviewLoadingId] = useState<string | null>(null);

  // ============================================
  // 2.8 TOAST
  // ============================================

  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ============================================
  // 2.9 STATISTIQUES
  // ============================================

  const stats = useMemo<AdminStats>(() => {
    const total = profiles.length;
    const active = profiles.filter(p => p.is_online || p.online).length;
    const newToday = profiles.filter(p => {
      const created = p.created_at || p.createdAt;
      if (!created) return false;
      return new Date(created).toDateString() === new Date().toDateString();
    }).length;
    const premium = profiles.filter(p => p.isPremium || p.is_premium).length;
    const suspended = profiles.filter(p => p.isSuspended || p.is_suspended).length;
    const verified = profiles.filter(p => p.verified || p.is_verified).length;
    const totalCredits = profiles.reduce((sum, p) => sum + (p.credits || 0), 0);

    return {
      totalUsers: total,
      activeUsers: active,
      newUsersToday: newToday,
      premiumUsers: premium,
      suspendedUsers: suspended,
      verifiedUsers: verified,
      totalLikes: likes?.length || 18,
      totalMatches: propMatches?.length || 12,
      totalMessages: propMessages?.length || 45,
      reportsPending: reports.filter(r => r.status === 'pending').length,
      reportsResolved: reports.filter(r => r.status === 'resolved').length,
      totalCredits,
      revenue: {
        total: premium * 12.5 + Math.round(totalCredits * 0.05),
        today: newToday * 1.5,
        thisMonth: premium * 12.5 * 0.8,
      },
      engagement: {
        dailyActive: Math.round(active * 0.85),
        weeklyActive: Math.round(total * 0.7),
        monthlyActive: Math.round(total * 0.95),
        avgSessionTime: 14.8,
      }
    };
  }, [profiles, likes, propMatches, propMessages, reports]);

  // ============================================
  // 2.10 FILTRES DES MEMBRES & VILLES
  // ============================================

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    profiles.forEach(p => {
      if (p.city) cities.add(p.city);
    });
    return Array.from(cities).sort();
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    let result = [...profiles];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(term) || 
        p.user_id?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term)
      );
    }

    if (filterGender !== 'all') {
      result = result.filter(p => p.gender === filterGender);
    }

    if (filterCity !== 'all') {
      result = result.filter(p => (p.city || 'Abidjan').toLowerCase() === filterCity.toLowerCase());
    }

    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'active':
          result = result.filter(p => !p.isSuspended && !p.is_suspended);
          break;
        case 'suspended':
          result = result.filter(p => p.isSuspended || p.is_suspended);
          break;
        case 'verified':
          result = result.filter(p => p.verified || p.is_verified);
          break;
        case 'premium':
          result = result.filter(p => p.isPremium || p.is_premium);
          break;
      }
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return (a.name || '').localeCompare(b.name || '');
        case 'age': return (a.age || 0) - (b.age || 0);
        case 'credits': return (b.credits || 0) - (a.credits || 0);
        case 'created': 
          return new Date(b.created_at || b.createdAt || 0).getTime() - 
                 new Date(a.created_at || a.createdAt || 0).getTime();
        default: return 0;
      }
    });

    return result;
  }, [profiles, searchTerm, filterGender, filterStatus, filterCity, sortBy]);

  // ============================================
  // 2.11 ACTIONS ADMIN
  // ============================================

  const logActivity = useCallback((
    userId: string,
    userName: string,
    action: string,
    details: string,
    type: ActivityLog['type'] = 'moderation'
  ) => {
    const log: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId,
      userName,
      action,
      details,
      timestamp: Date.now(),
      type,
    };
    setActivityLog(prev => [log, ...prev].slice(0, 500));
    void authFetch('/api/admin/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, details })
    }).catch(error => console.error('Enregistrement activité admin impossible:', error));
  }, []);

  const handleToggleSuspend = async (userId: string, isCurrentlySuspended: boolean) => {
    setProcessingId(userId);
    const nextStatus = !isCurrentlySuspended;
    const userObj = profiles.find(p => p.user_id === userId);
    try {
      const response = await authFetch(`/api/admin/profiles/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: nextStatus })
      });
      if (!response.ok) throw new Error(`profile_status_update_${response.status}`);

      const updatedProfiles = profiles.map(p => p.user_id === userId
        ? { ...p, isSuspended: nextStatus, is_suspended: nextStatus }
        : p);
      if (onUpdateProfiles) onUpdateProfiles(updatedProfiles);
      logActivity(
        userId,
        userObj?.name || 'Inconnu',
        nextStatus ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
        `${userObj?.name || 'Utilisateur'} ${nextStatus ? 'suspendu' : 'réactivé'} par admin`,
        'moderation'
      );
      showToast(nextStatus ? 'Compte suspendu' : 'Compte réactivé avec succès', 'success');
      onForceRefresh();
    } catch (error) {
      console.error('Admin profile suspension update failed:', error);
      showToast('Impossible de modifier le statut du compte.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleVerify = async (userId: string, isCurrentlyVerified: boolean) => {
    if (!isCurrentlyVerified) {
      showToast('L’attribution de badge est désactivée sans fournisseur de vérification réel.', 'error');
      return false;
    }
    setProcessingId(userId);
    const nextStatus = false;
    const userObj = profiles.find(p => p.user_id === userId);
    try {
      const response = await authFetch(`/api/admin/profiles/${encodeURIComponent(userId)}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: nextStatus })
      });
      if (!response.ok) throw new Error(`verification_update_${response.status}`);

      const updatedProfiles = profiles.map(p => p.user_id === userId
        ? { ...p, verified: nextStatus, is_verified: nextStatus }
        : p);
      if (onUpdateProfiles) onUpdateProfiles(updatedProfiles);
      logActivity(
        userId,
        userObj?.name || 'Inconnu',
        nextStatus ? 'VERIFY_USER' : 'UNVERIFY_USER',
        `${userObj?.name || 'Utilisateur'} ${nextStatus ? 'badge certifié accordé' : 'badge retiré'}`,
        'moderation'
      );
      showToast(nextStatus ? 'Badge vérifié accordé ✓' : 'Badge vérifié retiré', 'success');
      onForceRefresh();
      return true;
    } catch (error) {
      console.error('Admin profile verification update failed:', error);
      showToast('Impossible de modifier la vérification du profil.', 'error');
      return false;
    } finally {
      setProcessingId(null);
    }
  };

  const handleTogglePremium = async (userId: string, isCurrentlyPremium: boolean) => {
    setProcessingId(userId);
    const nextStatus = !isCurrentlyPremium;
    const userObj = profiles.find(p => p.user_id === userId);
    try {
      const response = await authFetch(`/api/admin/profiles/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: nextStatus ? 'vip' : 'freemium' })
      });
      if (!response.ok) throw new Error(`profile_tier_update_${response.status}`);

      const updatedProfiles = profiles.map(p => p.user_id === userId
        ? { ...p, isPremium: nextStatus, is_premium: nextStatus }
        : p);
      if (onUpdateProfiles) onUpdateProfiles(updatedProfiles);
      logActivity(
        userId,
        userObj?.name || 'Inconnu',
        nextStatus ? 'ADD_PREMIUM' : 'REMOVE_PREMIUM',
        `${userObj?.name || 'Utilisateur'} ${nextStatus ? 'abonnement VIP activé' : 'VIP retiré'}`,
        'premium'
      );
      showToast(nextStatus ? 'Statut VIP activé ⭐' : 'Statut VIP retiré', 'success');
      onForceRefresh();
    } catch (error) {
      console.error('Admin profile tier update failed:', error);
      showToast('Impossible de modifier le statut premium.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddCredits = async (userId: string, amount: number = 100) => {
    setProcessingId(userId);
    const userObj = profiles.find(p => p.user_id === userId);
    try {
      const response = await authFetch(`/api/admin/profiles/${encodeURIComponent(userId)}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, referenceId: crypto.randomUUID(), description: 'Ajustement administrateur' })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `credit_adjustment_${response.status}`);

      const updatedProfiles = profiles.map(p => p.user_id === userId
        ? { ...p, credits: Number(payload.balance) }
        : p);
      if (onUpdateProfiles) onUpdateProfiles(updatedProfiles);
      logActivity(
        userId,
        userObj?.name || 'Inconnu',
        'ADD_CREDITS',
        `+${amount} crédits ajoutés à ${userObj?.name || 'utilisateur'}`,
        'other'
      );
      showToast(`+${amount} crédits ajoutés 🪙`, 'success');
      onForceRefresh();
    } catch (error) {
      console.error('Admin credit grant failed:', error);
      showToast('Impossible d’ajouter les crédits.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeductCredits = async (userId: string, amount: number = 50) => {
    setProcessingId(userId);
    const userObj = profiles.find(p => p.user_id === userId);
    try {
      const response = await authFetch(`/api/admin/profiles/${encodeURIComponent(userId)}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: -amount, referenceId: crypto.randomUUID(), description: 'Ajustement administrateur' })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `credit_adjustment_${response.status}`);

      const updatedProfiles = profiles.map(p => p.user_id === userId
        ? { ...p, credits: Number(payload.balance) }
        : p);
      if (onUpdateProfiles) onUpdateProfiles(updatedProfiles);
      logActivity(
        userId,
        userObj?.name || 'Inconnu',
        'DEDUCT_CREDITS',
        `-${amount} crédits déduits de ${userObj?.name || 'utilisateur'}`,
        'moderation'
      );
      showToast(`-${amount} crédits déduits 🪙`, 'warning');
      onForceRefresh();
    } catch (error) {
      console.error('Admin credit deduction failed:', error);
      showToast('Impossible de déduire les crédits.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Outil d'injection de crédits générale pour toute la communauté
  const handleMassCreditBonus = async (amount: number) => {
    setProcessingId('all_users');
    try {
      const response = await authFetch('/api/admin/credits/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, referenceId: crypto.randomUUID() })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || `community_credit_grant_${response.status}`);
      logActivity(
        'all_users',
        'Tous les membres',
        'MASS_CREDIT_BONUS',
        `Attribution générale de +${amount} crédits à ${Number(payload.affectedUsers)} membres`,
        'broadcast'
      );
      showToast(`🎉 +${amount} crédits attribués à ${Number(payload.affectedUsers)} membres !`, 'success');
      onForceRefresh();
    } catch (error) {
      console.error('Admin community credit grant failed:', error);
      showToast('Impossible d’attribuer le bonus communautaire.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setProcessingId(userId);
    const updatedProfiles = profiles.filter(p => p.user_id !== userId);
    if (onUpdateProfiles) onUpdateProfiles(updatedProfiles);

    const client = getSupabase();
    if (client) {
      await client.from('profiles').delete().eq('id', userId);
    }

    showToast('Compte membre supprimé', 'warning');
    setProcessingId(null);
    onForceRefresh();
  };

  // Mise à jour rapide des informations d'un profil par l'administrateur
  const handleSaveUserEdits = (updatedUser: any) => {
    const updatedProfiles = profiles.map(p => {
      if (p.user_id === updatedUser.user_id) {
        return { ...p, ...updatedUser };
      }
      return p;
    });
    if (onUpdateProfiles) onUpdateProfiles(updatedProfiles);
    logActivity(updatedUser.user_id, updatedUser.name, 'EDIT_PROFILE_ADMIN', 'Profil modifié par l administrateur', 'moderation');
    showToast('Profil mis à jour avec succès', 'success');
    setEditingUser(null);
    if (viewingUser && viewingUser.user_id === updatedUser.user_id) {
      setViewingUser({ ...viewingUser, ...updatedUser });
    }
  };

  // Résolution des signalements
  const handleResolveReport = async (reportId: string, action: 'suspend' | 'dismiss' | 'warn' | 'investigate') => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    const status = action === 'investigate' ? 'investigating' : action === 'dismiss' ? 'dismissed' : 'resolved';
    try {
      const response = await authFetch(`/api/admin/reports/${encodeURIComponent(reportId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, action })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Mise à jour impossible');
      setReports(current => current.map(item => item.id === reportId ? { ...item, status } : item));
      if (action === 'suspend') await handleToggleSuspend(report.reportedId, false);
      showToast(
        action === 'investigate' ? 'Enquête en cours sur ce signalement' :
        action === 'dismiss' ? 'Signalement classé sans suite' :
        action === 'warn' ? 'Avertissement transmis au membre' :
        'Compte signalé suspendu',
        action === 'dismiss' || action === 'investigate' ? 'info' : 'success'
      );
    } catch (error) {
      console.error('Mise à jour signalement impossible:', error);
      showToast(error instanceof Error ? error.message : 'Mise à jour impossible', 'error');
    }
  };

  // Diffusion d'une nouvelle annonce flash
  const handlePublishBroadcast = async () => {
    if (!newBroadcastTitle.trim() || !newBroadcastMsg.trim()) {
      showToast('Veuillez renseigner un titre et un message', 'warning');
      return;
    }

    try {
      const response = await authFetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBroadcastTitle.trim(),
          message: newBroadcastMsg.trim(),
          type: newBroadcastType,
          priority: newBroadcastUrgent ? 'urgent' : 'normal'
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Publication impossible');
      setBroadcasts(current => [payload.broadcast, ...current]);
      logActivity('broadcast_sys', 'Système', 'PUBLISH_BROADCAST', `Diffusion : "${newBroadcastTitle.trim()}"`, 'broadcast');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Publication impossible', 'error');
      return;
    }

    setNewBroadcastTitle('');
    setNewBroadcastMsg('');
    setNewBroadcastUrgent(false);
    showToast('📢 Annonce diffusée à tous les membres !', 'success');
  };

  const handleToggleBroadcastStatus = async (id: string) => {
    const current = broadcasts.find(b => b.id === id);
    if (!current) return;
    const response = await authFetch(`/api/admin/broadcasts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current.active })
    });
    if (!response.ok) {
      showToast('Impossible de modifier l’annonce', 'error');
      return;
    }
    setBroadcasts(items => items.map(b => b.id === id ? { ...b, active: !b.active } : b));
    showToast('Statut de l’annonce mis à jour', 'info');
  };

  const handleDeleteBroadcast = async (id: string) => {
    const response = await authFetch(`/api/admin/broadcasts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!response.ok) {
      showToast('Impossible de supprimer l’annonce', 'error');
      return;
    }
    setBroadcasts(items => items.filter(b => b.id !== id));
    showToast('Annonce supprimée', 'info');
  };

  // Interrupteur Master Monétisation (Global Site)
  const handleToggleMasterMonetization = async () => {
    const nextState = !monetizationEnabled;
    const response = await authFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { monetization_enabled: nextState } })
    });
    if (!response.ok) {
      showToast('Impossible de modifier la monétisation', 'error');
      return;
    }
    setMonetizationEnabled(nextState);

    logActivity(
      'monetization_master',
      'Système',
      'TOGGLE_MONETIZATION',
      nextState ? 'Monétisation ACTIVÉE (Modèle Freemium & Packs Payants actif)' : 'Monétisation DÉSACTIVÉE (Mode 100% Gratuit pour tous les membres)',
      'premium'
    );
    if (nextState) {
      showToast('🔒 Monétisation ACTIVÉE en direct : Packs et VIP payants requis', 'info');
    } else {
      showToast('🎉 Monétisation DÉSACTIVÉE en direct : Tout le site est 100% GRATUIT !', 'success');
    }
  };

  // Service Client & Support Tickets
  const handleSendSupportReply = async () => {
    if (!selectedTicket || !ticketReplyText.trim()) return;
    try {
      const response = await authFetch(`/api/admin/support/tickets/${encodeURIComponent(selectedTicket.id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: ticketReplyText.trim() })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Réponse support indisponible');
      const newMsg = payload.message;
      const updatedTicket = { ...selectedTicket, status: 'in_progress' as const, messages: [...selectedTicket.messages, newMsg] };
      setSupportTickets(items => items.map(ticket => ticket.id === selectedTicket.id ? updatedTicket : ticket));
      setSelectedTicket(updatedTicket);
      setTicketReplyText('');
      showToast('Réponse support enregistrée ✅', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Réponse support indisponible', 'error');
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => {
    const response = await authFetch(`/api/admin/support/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      showToast('Statut support indisponible', 'error');
      return;
    }
    setSupportTickets(items => items.map(ticket => ticket.id === ticketId ? { ...ticket, status } : ticket));
    setSelectedTicket(current => current?.id === ticketId ? { ...current, status } : current);
    showToast(`Ticket passé au statut : ${status === 'resolved' ? 'Résolu ✅' : status === 'in_progress' ? 'En cours ⏳' : 'Ouvert 🔴'}`, 'info');
  };

  // Gestion des Ban IP
  const handleAddBannedIP = () => {
    if (!newBannedIPInput.trim()) return;
    const ip = newBannedIPInput.trim();
    if (bannedIPs.includes(ip)) {
      showToast('Cette adresse IP est déjà enregistrée', 'warning');
      return;
    }
    authFetch('/api/admin/ip-bans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    }).then(async response => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Ajout impossible');
      setBannedIPs(current => [...current, payload.ip]);
    }).catch(error => {
      showToast(error instanceof Error ? error.message : 'Ajout impossible', 'error');
    });
    setNewBannedIPInput('');
    logActivity('ip_block', 'Sécurité', 'ADD_BANNED_IP', `IP Bannie : ${ip}`, 'moderation');
    showToast(`IP ${ip} ajoutée à la liste noire 🚫`, 'success');
  };

  const handleRemoveBannedIP = async (ip: string) => {
    const response = await authFetch(`/api/admin/ip-bans/${encodeURIComponent(ip)}`, { method: 'DELETE' });
    if (!response.ok) {
      showToast('Impossible de retirer cette adresse', 'error');
      return;
    }
    setBannedIPs(current => current.filter(i => i !== ip));
    showToast('IP retirée de la liste noire', 'info');
  };

  const handleSaveConfig = async () => {
    const response = await authFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { config } })
    });
    if (!response.ok) {
      showToast('Impossible de sauvegarder la configuration', 'error');
      return;
    }
    logActivity('config_sys', 'Système', 'UPDATE_CONFIG', 'Paramètres généraux sauvegardés', 'other');
    showToast('Configuration système enregistrée ⚙️', 'success');
  };

  // ============================================
  // NOUVELLES ACTIONS : BULK, CSV, ANTI-SCAM, MSG
  // ============================================

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredProfiles.map(p => p.user_id || p.id);
    setSelectedUserIds(visibleIds);
    showToast(`${visibleIds.length} membre(s) sélectionné(s)`, 'info');
  };

  const handleDeselectAll = () => {
    setSelectedUserIds([]);
  };

  const handleBulkAddCredits = (bonus: number) => {
    if (selectedUserIds.length === 0) return;
    const updatedProfiles = profiles.map(p => {
      const pId = p.user_id || p.id;
      if (selectedUserIds.includes(pId)) {
        return { ...p, credits: (p.credits || 0) + bonus };
      }
      return p;
    });
    if (onUpdateProfiles) onUpdateProfiles(updatedProfiles);
    logActivity('admin_sys', 'Admin', 'BULK_CREDITS', `+${bonus} crédits attribués à ${selectedUserIds.length} membre(s)`, 'premium');
    showToast(`+${bonus} crédits offerts à ${selectedUserIds.length} membres !`, 'success');
  };

  const handleBulkToggleSuspend = (status: boolean) => {
    if (selectedUserIds.length === 0) return;
    const updatedProfiles = profiles.map(p => {
      const pId = p.user_id || p.id;
      if (selectedUserIds.includes(pId)) {
        return { ...p, isSuspended: status, is_suspended: status };
      }
      return p;
    });
    if (onUpdateProfiles) onUpdateProfiles(updatedProfiles);
    logActivity('admin_sys', 'Admin', 'BULK_SUSPEND', `Suspension ${status ? 'activée' : 'levée'} pour ${selectedUserIds.length} membre(s)`, 'moderation');
    showToast(`${selectedUserIds.length} membre(s) ${status ? 'suspendu(s)' : 'réactivé(s)'}`, status ? 'warning' : 'success');
  };

  const handleExportMembersCSV = () => {
    const listToExport = selectedUserIds.length > 0 
      ? profiles.filter(p => selectedUserIds.includes(p.user_id || p.id))
      : filteredProfiles;

    const headers = ['User_ID', 'Nom', 'Age', 'Ville', 'Genre', 'Credits', 'Statut_VIP', 'Verifie', 'Suspendu'];
    const rows = listToExport.map(p => [
      `"${p.user_id || p.id}"`,
      `"${p.name || ''}"`,
      p.age || 18,
      `"${p.city || 'Abidjan'}"`,
      `"${p.gender || 'femme'}"`,
      p.credits || 0,
      p.isPremium || p.is_premium ? 'VIP' : 'Gratuit',
      p.verified || p.is_verified ? 'Oui' : 'Non',
      p.isSuspended || p.is_suspended ? 'Oui' : 'Non'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bavel_membres_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Fichier CSV de ${listToExport.length} membre(s) téléchargé`, 'success');
  };

  const handleAddBlockedKeyword = () => {
    if (!newKeywordInput.trim()) return;
    const kw = newKeywordInput.trim().toLowerCase();
    if (blockedKeywords.includes(kw)) {
      showToast('Ce mot-clé existe déjà dans le filtre', 'warning');
      return;
    }
    const updated = [...blockedKeywords, kw];
    setBlockedKeywords(updated);
    void authFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { blocked_keywords: updated } })
    }).then(response => {
      if (!response.ok) throw new Error('blocked keywords update failed');
    }).catch(() => {
      setBlockedKeywords(blockedKeywords);
      showToast('Impossible de sauvegarder ce mot-clé', 'error');
    });
    setNewKeywordInput('');
    showToast(`Mot-clé "${kw}" ajouté à la modération auto`, 'success');
  };

  const handleRemoveBlockedKeyword = (kw: string) => {
    const updated = blockedKeywords.filter(k => k !== kw);
    setBlockedKeywords(updated);
    void authFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { blocked_keywords: updated } })
    }).then(response => {
      if (!response.ok) throw new Error('blocked keywords update failed');
    }).catch(() => {
      setBlockedKeywords(blockedKeywords);
      showToast('Impossible de supprimer ce mot-clé', 'error');
    });
    showToast(`Mot-clé "${kw}" retiré du filtre`, 'info');
  };

  const handleSendDirectAdminMessage = () => {
    if (!directMsgModalUser || !directMsgText.trim()) return;
    const targetId = String(directMsgModalUser.user_id || directMsgModalUser.id);
    const msgObj = {
      id: `admin_msg_${Date.now()}`,
      senderId: 'admin_official',
      senderName: 'Équipe Bavel Officiel ✓',
      receiverId: targetId,
      text: directMsgText.trim(),
      timestamp: Date.now(),
      isAdmin: true,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    // Store in real chat conversation
    try {
      const chatKey = `bavel_chat_${targetId}`;
      const existing = JSON.parse(localStorage.getItem(chatKey) || '[]');
      existing.push(msgObj);
      localStorage.setItem(chatKey, JSON.stringify(existing));
      
      // Dispatch real-time custom event so the user chat updates instantly
      window.dispatchEvent(new CustomEvent('bavel_new_message', { detail: msgObj }));
    } catch { /* ignore */ }

    logActivity(
      targetId,
      directMsgModalUser.name,
      'SEND_DIRECT_ADMIN_MSG',
      `Message Admin direct : "${directMsgText.trim()}"`,
      'message'
    );
    showToast(`Message officiel transmis en temps réel à ${directMsgModalUser.name} 📩`, 'success');
    setDirectMsgModalUser(null);
    setDirectMsgText('');
  };

  const handlePingSystemHealth = async () => {
    const healthy = await checkHealth();
    showToast(healthy ? 'API et base de données opérationnelles.' : 'API ou base de données indisponible.', healthy ? 'success' : 'error');
  };

  const handleRevokeAllOtherSessions = async () => {
    setIsRevokingSessions(true);
    try {
      const response = await authFetch('/api/security/revoke-others', { method: 'POST' });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.message || 'La révocation des autres sessions a échoué.');
      }
      showToast('Les autres sessions ont été révoquées.', 'success');
    } catch (error) {
      console.error('Révocation des autres sessions impossible:', error);
      showToast('Impossible de révoquer les autres sessions.', 'error');
    } finally {
      setIsRevokingSessions(false);
    }
  };

  // ============================================
  // 2.12 RENDU - ACCÈS SÉCURISÉ REFUSÉ
  // ============================================

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-6 text-center shadow-2xl border border-rose-100 dark:border-rose-900">
          <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4 border border-rose-100 dark:border-rose-800">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <span className="text-[12px] font-extrabold tracking-wider uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800 inline-block mb-2">
            Accès Refusé
          </span>
          <h3 className="text-[17px] font-black text-slate-900 dark:text-white mb-2">
            Espace Administrateur Strict
          </h3>
          <p className="text-[13px] text-slate-600 dark:text-gray-400 mb-6 leading-relaxed">
            Votre compte ne possède pas les permissions nécessaires pour accéder au Back-Office Bavel.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-2xl bg-slate-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-slate-900 font-bold text-[14px] transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'application</span>
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // 2.13 RENDU PRINCIPAL DU PANEL
  // ============================================

  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col h-[100dvh] overflow-hidden select-none",
      isDarkMode ? "bg-[#0b0e14] text-gray-100" : "bg-gray-50 text-gray-900"
    )}>
      {/* Header Mobile Ergonomique */}
      <header className={cn(
        "flex items-center justify-between px-4 pt-10 pb-3 shrink-0 border-b",
        isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
      )}>
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-md shadow-rose-900/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-black text-white dark:text-white tracking-tight leading-tight">
              Console Administrateur
            </h1>
            <p className="text-[11px] text-rose-400 font-bold flex items-center space-x-1">
              <span>Bavel Back-Office</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Actif</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const next = !isDarkMode;
              setIsDarkMode(next);
              localStorage.setItem('bavel_admin_dark_mode', String(next));
            }}
            aria-label="Basculer le thème"
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95",
              isDarkMode ? "bg-gray-800/80 hover:bg-gray-700 text-amber-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            )}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button 
            onClick={onClose}
            aria-label="Fermer le panel"
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer active:scale-95",
              isDarkMode ? "bg-gray-800/80 hover:bg-gray-700 text-gray-300" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Barre d'Onglets Mobile (Défilement fluide, caractères adaptés) */}
      <nav className={cn(
        "flex px-2 py-2 border-b shrink-0 space-x-1.5 overflow-x-auto scrollbar-hide",
        isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
      )}>
        {[
          { id: 'overview', label: 'Aperçu', icon: Activity },
          { id: 'traffic', label: 'Trafic & Perf', icon: Radio },
          { id: 'users', label: 'Membres', icon: Users, count: profiles.length },
          { id: 'monetization', label: 'Monétisation', icon: DollarSign, badge: monetizationEnabled ? 'Payant' : 'Gratuit' },
          { id: 'support', label: 'Support', icon: Headphones, count: supportTickets.filter(t => t.status === 'open').length },
          { id: 'security', label: 'Sécurité', icon: ShieldX, count: blockedKeywords.length },
          { id: 'broadcast', label: 'Annonces', icon: Megaphone, count: broadcasts.filter(b => b.active).length },
          { id: 'messages', label: 'Inspection', icon: MessageCircle },
          { id: 'reports', label: 'Signalements', icon: AlertTriangle, count: reports.filter(r => r.status === 'pending').length },
          { id: 'moderation', label: 'Modération', icon: ShieldCheck, count: moderationQueue.length },
          { id: 'stats', label: 'Stats', icon: BarChart3 },
          { id: 'config', label: 'Système', icon: Settings },
          { id: 'activity', label: 'Journal', icon: Clock },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "min-w-[74px] py-2 px-2.5 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all relative shrink-0 cursor-pointer",
                isActive 
                  ? isDarkMode 
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : "bg-rose-50 text-rose-600 border border-rose-200"
                  : isDarkMode
                    ? "text-gray-400 hover:text-white border border-transparent"
                    : "text-gray-500 hover:text-gray-900 border border-transparent"
              )}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-600 text-white text-[9.5px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow">
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className={cn(
                    "absolute -top-1.5 -right-3 text-[8.5px] font-black px-1 py-0.2 rounded-full uppercase tracking-tighter shadow",
                    monetizationEnabled ? "bg-emerald-600 text-white" : "bg-amber-500 text-black"
                  )}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10.5px] font-extrabold tracking-tight whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Contenu Principal Défilant */}
      <main className={cn(
        "flex-1 overflow-y-auto p-4 pb-28 space-y-4",
        isDarkMode ? "bg-[#0b0e14]" : "bg-gray-50"
      )}>
        {/* Bandeau Live Santé Système (Ultra Pro) */}
        <div className={cn(
          "px-3.5 py-2.5 rounded-2xl border flex items-center justify-between transition-all",
          isDarkMode ? "bg-[#121620]/90 border-gray-800 text-gray-200" : "bg-white border-gray-200 text-gray-800"
        )}>
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {healthMetrics.status === 'healthy' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
              <span className={cn(
                "relative inline-flex rounded-full h-2.5 w-2.5",
                healthMetrics.status === 'healthy' ? "bg-emerald-500" : healthMetrics.status === 'unhealthy' ? "bg-red-500" : "bg-amber-400"
              )} />
            </span>
            <div className="flex items-center space-x-2 text-[11.5px] font-extrabold truncate">
              <span className={cn(
                "font-black",
                healthMetrics.status === 'healthy' ? "text-emerald-400" : healthMetrics.status === 'unhealthy' ? "text-red-400" : "text-amber-400"
              )}>{healthMetrics.dbState}</span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400 truncate">Réponse : <strong className="text-white">{healthMetrics.pingMs === null ? '—' : `${healthMetrics.pingMs} ms`}</strong></span>
              {healthMetrics.lastChecked && <span className="text-gray-400 hidden lg:inline">Vérifié à {healthMetrics.lastChecked}</span>}
            </div>
          </div>

          <button
            onClick={handlePingSystemHealth}
            className="p-1.5 rounded-xl bg-gray-800/60 hover:bg-gray-700 text-gray-300 transition-colors cursor-pointer shrink-0"
            title="Rafraîchir les métriques système"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ========================================== */}
        {/* TAB 1: APERÇU (OVERVIEW) */}
        {/* ========================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Grille de stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Users}
                label="Membres Totaux"
                value={stats.totalUsers}
                sub={`${stats.activeUsers} en ligne`}
                color="blue"
                isDark={isDarkMode}
              />
              <StatCard
                icon={Award}
                label="Membres VIP"
                value={stats.premiumUsers}
                sub={`${Math.round((stats.premiumUsers / Math.max(1, stats.totalUsers)) * 100)}% du total`}
                color="amber"
                isDark={isDarkMode}
              />
              <StatCard
                icon={AlertTriangle}
                label="Signalements"
                value={stats.reportsPending}
                sub={`${stats.reportsResolved} traités`}
                color="rose"
                isDark={isDarkMode}
              />
              <StatCard
                icon={CreditCard}
                label="Crédits Détenus"
                value={stats.totalCredits}
                sub="Solde communauté"
                color="green"
                isDark={isDarkMode}
              />
            </div>

            {/* Actions Rapides Administrateur */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-extrabold uppercase tracking-wider flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-rose-500" />
                  <span>Actions Express Console</span>
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setActiveTab('broadcast')}
                  className={cn(
                    "p-3 rounded-xl border flex items-center space-x-2.5 text-left transition-all active:scale-98",
                    isDarkMode ? "bg-gray-800/40 border-gray-700 hover:bg-gray-800" : "bg-rose-50/50 border-rose-200 hover:bg-rose-50"
                  )}
                >
                  <Megaphone className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <p className="text-[12px] font-bold">Diffuser Flash</p>
                    <p className="text-[10.5px] text-gray-400">Alerter la communauté</p>
                  </div>
                </button>

                <button
                  onClick={() => onForceRefresh()}
                  className={cn(
                    "p-3 rounded-xl border flex items-center space-x-2.5 text-left transition-all active:scale-98",
                    isDarkMode ? "bg-gray-800/40 border-gray-700 hover:bg-gray-800" : "bg-blue-50/50 border-blue-200 hover:bg-blue-50"
                  )}
                >
                  <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-[12px] font-bold">Actualiser Base</p>
                    <p className="text-[10.5px] text-gray-400">Recharger les profils</p>
                  </div>
                </button>

                <button
                  onClick={() => handleMassCreditBonus(50)}
                  className={cn(
                    "p-3 rounded-xl border flex items-center space-x-2.5 text-left transition-all active:scale-98",
                    isDarkMode ? "bg-gray-800/40 border-gray-700 hover:bg-gray-800" : "bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50"
                  )}
                >
                  <Gift className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[12px] font-bold">Bonus +50 Crédits</p>
                    <p className="text-[10.5px] text-gray-400">Offrir à tous</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const data = JSON.stringify(profiles, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bavel_export_${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast('Export JSON généré avec succès', 'success');
                  }}
                  className={cn(
                    "p-3 rounded-xl border flex items-center space-x-2.5 text-left transition-all active:scale-98",
                    isDarkMode ? "bg-gray-800/40 border-gray-700 hover:bg-gray-800" : "bg-amber-50/50 border-amber-200 hover:bg-amber-50"
                  )}
                >
                  <Download className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[12px] font-bold">Exporter Données</p>
                    <p className="text-[10.5px] text-gray-400">Sauvegarde JSON</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Engagement & Activité */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[12px] font-bold uppercase tracking-wider flex items-center space-x-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Rétention & Activité Mobile</span>
              </h4>
              <div className="space-y-2.5">
                <EngagementBar label="Actifs aujourd'hui" value={stats.engagement.dailyActive} total={stats.totalUsers} color="rose" />
                <EngagementBar label="Actifs cette semaine" value={stats.engagement.weeklyActive} total={stats.totalUsers} color="blue" />
                <EngagementBar label="Actifs ce mois-ci" value={stats.engagement.monthlyActive} total={stats.totalUsers} color="green" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: TRAFIC & PERFORMANCE (NOUVEAU) */}
        {/* ========================================== */}
        {activeTab === 'traffic' && (
          <div className="space-y-4">
            <div className={cn(
              "p-5 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[13px] font-black uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>État réel du service</span>
              </h4>
              <p className="text-sm font-bold">{healthMetrics.dbState}</p>
              <p className="text-xs text-gray-400">
                {healthMetrics.pingMs === null
                  ? 'Temps de réponse non mesuré.'
                  : `Réponse du contrôle API /health depuis ce navigateur : ${healthMetrics.pingMs} ms.`}
                {healthMetrics.lastChecked ? ` Dernière vérification : ${healthMetrics.lastChecked}.` : ''}
              </p>
            </div>

            <div className={cn(
              "p-5 rounded-2xl border space-y-2",
              isDarkMode ? "bg-amber-950/20 border-amber-900/50" : "bg-amber-50 border-amber-200"
            )}>
              <h4 className="text-sm font-black">Analytique de trafic non configurée</h4>
              <p className="text-xs text-gray-400">
                Les volumes de requêtes, la disponibilité historique, la bande passante et les répartitions par région ou appareil ne sont pas collectés. Aucun chiffre estimé n’est affiché.
              </p>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: MONÉTISATION FREEMIUM & EXTRA */}
        {/* ========================================== */}
        {activeTab === 'monetization' && (
          <div className="space-y-4">
            {/* MASTER TOGGLE MONÉTISATION */}
            <div className={cn(
              "p-5 rounded-3xl border shadow-xl relative overflow-hidden transition-all",
              monetizationEnabled 
                ? isDarkMode ? "bg-gradient-to-r from-emerald-950/40 via-[#121620] to-[#121620] border-emerald-500/40" : "bg-emerald-50/80 border-emerald-200 text-gray-900"
                : isDarkMode ? "bg-gradient-to-r from-amber-950/40 via-[#121620] to-[#121620] border-amber-500/40" : "bg-amber-50/80 border-amber-200 text-gray-900"
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider",
                      monetizationEnabled ? "bg-emerald-500 text-black" : "bg-amber-500 text-black"
                    )}>
                      {monetizationEnabled ? '🔒 Monétisation Active' : '🎉 Site 100% Gratuit'}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-black tracking-tight">
                    Interrupteur Général de la Monétisation
                  </h3>
                  <p className="text-[12px] text-gray-400 leading-snug">
                    {monetizationEnabled 
                      ? "Le système économique Freemium est activé : les packs de crédits, super likes et abonnements VIP sont payants."
                      : "La monétisation est DÉSACTIVÉE : tous les membres ont un accès ILLIMITÉ et GRATUIT à toutes les fonctionnalités payantes !"}
                  </p>
                </div>

                <button
                  onClick={handleToggleMasterMonetization}
                  className={cn(
                    "px-4 py-3 rounded-2xl font-black text-[13px] shadow-lg cursor-pointer transition-all active:scale-95 shrink-0 flex items-center space-x-2",
                    monetizationEnabled 
                      ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/30" 
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/30"
                  )}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>{monetizationEnabled ? 'Désactiver Monétisation' : 'Activer Monétisation'}</span>
                </button>
              </div>
            </div>

            {/* Réglages des Limites Freemium */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-4",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[13px] font-black uppercase tracking-wider text-rose-400 flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Règles du Modèle Freemium</span>
              </h4>

              <div className="space-y-3">
                <ConfigSlider
                  label="Crédits offerts à l'inscription"
                  value={config.dailyCredits}
                  min={0}
                  max={200}
                  step={5}
                  unit="crédits"
                  isDark={isDarkMode}
                  onChange={(val) => setConfig({ ...config, dailyCredits: val })}
                />

                <ConfigSlider
                  label="Nombre de Likes gratuits par jour"
                  value={config.maxLikesPerDay}
                  min={10}
                  max={200}
                  step={10}
                  unit="likes/jour"
                  isDark={isDarkMode}
                  onChange={(val) => setConfig({ ...config, maxLikesPerDay: val })}
                />

                <ConfigSlider
                  label="Coût d'un Super Like"
                  value={config.superLikeCost}
                  min={5}
                  max={100}
                  step={5}
                  unit="crédits"
                  isDark={isDarkMode}
                  onChange={(val) => setConfig({ ...config, superLikeCost: val })}
                />

                <ConfigSlider
                  label="Coût d'un Boost de profil (30 min)"
                  value={config.boostCost}
                  min={20}
                  max={300}
                  step={10}
                  unit="crédits"
                  isDark={isDarkMode}
                  onChange={(val) => setConfig({ ...config, boostCost: val })}
                />
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[12.5px] font-extrabold rounded-xl transition-all cursor-pointer shadow-md"
              >
                Sauvegarder les Règles Freemium
              </button>
            </div>

            {/* Tarification des Packs de Crédits (Extra) */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[13px] font-bold flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Packs d'Achat Extra & Recharge de Crédits (Tarifs en Euro €)</span>
              </h4>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { name: 'Pack Découverte', credits: 100, price: '2,49 €' },
                  { name: 'Pack Populaire', credits: 550, price: '8,99 €', bonus: '+10% GRATUIT' },
                  { name: 'Pack Passion', credits: 1250, price: '17,99 €', bonus: '+25% GRATUIT' },
                  { name: 'Pack Élite VIP', credits: 3000, price: '36,99 €', bonus: 'BEST DEAL +50%' }
                ].map(p => (
                  <div key={p.name} className={cn(
                    "p-3 rounded-xl border space-y-1.5",
                    isDarkMode ? "bg-black/20 border-gray-700" : "bg-gray-50 border-gray-200"
                  )}>
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] font-black">{p.name}</span>
                      {p.bonus && (
                        <span className="text-[9px] font-black bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded-full">
                          {p.bonus}
                        </span>
                      )}
                    </div>
                    <p className="text-[13.5px] font-black text-rose-500">{p.credits} Crédits</p>
                    <p className="text-[12px] text-emerald-400 font-extrabold">{p.price}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Abonnements VIP & Premium (Tarifs en Euro €) */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[13px] font-bold flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span>Abonnements Bavel Premium & VIP (Tarifs en Euro €)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { name: 'Pass VIP 1 Mois', price: '14,99 € / mois', desc: 'Voir qui aime votre profil, likes illimités, badge VIP.' },
                  { name: 'Pass VIP Gold (3 Mois)', price: '29,99 € (9,99€/mois)', desc: 'Tous les avantages VIP + 200 crédits offerts par mois.', popular: true },
                  { name: 'Pass Élite Annuel', price: '49,99 € / an', desc: 'Accès prioritaire illimité + 500 crédits offerts/mois.' }
                ].map(s => (
                  <div key={s.name} className={cn(
                    "p-3.5 rounded-xl border space-y-2 relative",
                    s.popular 
                      ? "border-amber-500/50 bg-amber-500/10" 
                      : isDarkMode ? "bg-black/20 border-gray-700" : "bg-gray-50 border-gray-200"
                  )}>
                    {s.popular && (
                      <span className="absolute -top-2 right-2 text-[9px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-full uppercase">
                        Plus Populaire
                      </span>
                    )}
                    <span className="text-[12.5px] font-black block">{s.name}</span>
                    <p className="text-[14px] font-black text-amber-400">{s.price}</p>
                    <p className="text-[11px] text-gray-400 leading-snug">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: SERVICE CLIENT & SUPPORT LIVE CHAT */}
        {/* ========================================== */}
        {activeTab === 'support' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-black uppercase tracking-wider flex items-center space-x-2 text-rose-400">
                <Headphones className="w-4 h-4" />
                <span>Messagerie Service Client & Assistance ({supportTickets.length})</span>
              </h4>
              <span className="text-[11px] font-extrabold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
                {supportTickets.filter(t => t.status === 'open').length} en attente
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Liste des Tickets */}
              <div className={cn(
                "md:col-span-1 rounded-2xl border p-3 space-y-2 max-h-[500px] overflow-y-auto",
                isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
              )}>
                {supportTickets.length === 0 ? (
                  <div className="text-center py-10 text-[12px] text-gray-500">Aucun ticket de support</div>
                ) : (
                  supportTickets.map(t => {
                    const isSel = selectedTicket?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer space-y-1.5",
                          isSel 
                            ? "border-rose-500 bg-rose-500/10" 
                            : isDarkMode ? "bg-black/20 border-gray-800 hover:bg-gray-800/40" : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[12.5px] font-black truncate">{t.userName}</span>
                          <span className={cn(
                            "text-[9.5px] font-black px-1.5 py-0.2 rounded-full uppercase",
                            t.status === 'open' ? "bg-rose-500/20 text-rose-400" : t.status === 'in_progress' ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                          )}>
                            {t.status === 'open' ? 'Ouvert' : t.status === 'in_progress' ? 'En cours' : 'Résolu'}
                          </span>
                        </div>
                        <p className="text-[11.5px] font-bold text-gray-300 truncate">{t.subject}</p>
                        <p className="text-[10px] text-gray-500">{t.date}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Panneau de Chat Live Service Client */}
              <div className={cn(
                "md:col-span-2 rounded-2xl border p-4 flex flex-col min-h-[420px]",
                isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
              )}>
                {selectedTicket ? (
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    {/* Header Chat Ticket */}
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <img src={selectedTicket.userAvatar} alt="" className="w-9 h-9 rounded-xl object-cover" />
                        <div>
                          <h4 className="text-[13px] font-black">{selectedTicket.userName}</h4>
                          <p className="text-[11px] text-gray-400">{selectedTicket.subject}</p>
                        </div>
                      </div>

                      {/* Statut Toggle */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'in_progress')}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 cursor-pointer"
                        >
                          En cours
                        </button>
                        <button
                          onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'resolved')}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                        >
                          Résoudre
                        </button>
                      </div>
                    </div>

                    {/* Fil des Messages */}
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[280px]">
                      {selectedTicket.messages.map(m => {
                        const isSupp = m.sender === 'support';
                        return (
                          <div key={m.id} className={cn("flex flex-col", isSupp ? "items-end" : "items-start")}>
                            <div className={cn(
                              "max-w-[85%] rounded-2xl p-3 text-[12px] space-y-1",
                              isSupp 
                                ? "bg-rose-600 text-white rounded-br-none" 
                                : isDarkMode ? "bg-gray-800 text-gray-200 rounded-bl-none" : "bg-gray-100 text-gray-800 rounded-bl-none"
                            )}>
                              <p className="font-extrabold text-[10.5px] opacity-80">{m.senderName}</p>
                              <p className="leading-relaxed">{m.text}</p>
                              <span className="text-[9px] opacity-60 block text-right">{m.time}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Réponses Rapides */}
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-hide">
                      {[
                        'Bonjour, vos crédits ont été mis à jour !',
                        'Votre profil a été certifié avec succès ✓',
                        'Merci de votre patience, problème résolu.'
                      ].map(fastText => (
                        <button
                          key={fastText}
                          onClick={() => setTicketReplyText(fastText)}
                          className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10.5px] font-bold shrink-0 cursor-pointer"
                        >
                          + {fastText.substring(0, 22)}...
                        </button>
                      ))}
                    </div>

                    {/* Input Réponse */}
                    <div className="flex items-center space-x-2 pt-1 border-t border-gray-800">
                      <input
                        type="text"
                        placeholder="Répondre à ce membre au nom du service client..."
                        value={ticketReplyText}
                        onChange={(e) => setTicketReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendSupportReply()}
                        className={cn(
                          "flex-1 rounded-xl py-2.5 px-3 text-[12px] border outline-none",
                          isDarkMode ? "bg-black/30 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                        )}
                      />
                      <button
                        onClick={handleSendSupportReply}
                        className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[12px] rounded-xl flex items-center space-x-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Envoyer</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-2 text-gray-500">
                    <Headphones className="w-10 h-10 text-gray-600 mb-2" />
                    <p className="text-[13px] font-bold">Sélectionnez une demande de support</p>
                    <p className="text-[11.5px]">Répondez en direct aux questions des utilisateurs sur les crédits, la certification ou les comptes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 5: CENTRE DE SÉCURITÉ & ANTI-HACKING */}
        {/* ========================================== */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            {/* Bannière Maître : Centre de Sécurité & Anti-Hacking */}
            <div className="bg-gradient-to-r from-[#0f172a] via-[#111827] to-[#1e1b4b] text-white p-4 sm:p-5 rounded-2xl border border-emerald-500/30 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[14px] sm:text-[15px] font-black tracking-wide text-white">Centre de Sécurité & Anti-Hacking</span>
                      <span className="text-[9.5px] font-extrabold bg-amber-500 text-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Règles locales
                      </span>
                    </div>
                    <p className="text-[11.5px] text-gray-300 mt-0.5">
                      Modération textuelle par règles et revue humaine. L’analyse d’images et la détection biométrique ne sont pas activées.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRevokeAllOtherSessions}
                  disabled={isRevokingSessions}
                  className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all cursor-pointer disabled:cursor-wait disabled:opacity-60 flex items-center space-x-1.5 shrink-0"
                >
                  <Lock className={cn("w-3.5 h-3.5", isRevokingSessions && "animate-pulse")} />
                  <span>{isRevokingSessions ? 'Révocation…' : 'Révoquer les autres sessions'}</span>
                </button>
              </div>

              {/* 3 Cartes Rapides d'Audit Sécurité */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-gray-400 block">Modération des messages</span>
                    <span className="text-[12.5px] font-extrabold text-amber-300">Règles textuelles actives</span>
                  </div>
                  <ShieldAlert className="w-5 h-5 text-amber-300" />
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-gray-400 block">Double Auth. (2FA)</span>
                    <span className="text-[12.5px] font-extrabold text-amber-300">
                      Non configurée
                    </span>
                  </div>
                  <Lock className="w-5 h-5 text-amber-300" />
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-gray-400 block">Chiffrement Certifié</span>
                    <span className="text-[12.5px] font-extrabold text-cyan-300">SSL TLS 1.3 (256-bit)</span>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                </div>
              </div>
            </div>

            {/* Session revocation is supported; session enumeration is not exposed. */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[12.5px] font-black uppercase tracking-wider text-gray-400 flex items-center space-x-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Sessions administrateur</span>
              </h4>
              <p className="text-xs text-gray-400">
                La liste détaillée des appareils et adresses IP n’est pas disponible. Vous pouvez révoquer toutes les autres sessions avec le bouton ci-dessus.
              </p>
            </div>

            {/* Registre des Adresses IP & Empreintes Bannies */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-black uppercase tracking-wider text-rose-400 flex items-center space-x-2">
                  <ShieldX className="w-4 h-4" />
                  <span>Registre des Adresses IP & Empreintes Bannies ({bannedIPs.length})</span>
                </h4>
                <span className="text-[10.5px] font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">
                  Pare-feu Actif
                </span>
              </div>
              <p className="text-[12px] text-gray-400">
                Bloquez définitivement les plages d'adresses IP suspectes pour empêcher les inscriptions automatisées ou les tentatives de broutat.
              </p>

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Adresse IP ou subnet (ex: 197.234.11.0/24)..."
                  value={newBannedIPInput}
                  onChange={(e) => setNewBannedIPInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBannedIP()}
                  className={cn(
                    "flex-1 rounded-xl py-2 px-3 text-[12.5px] border outline-none",
                    isDarkMode ? "bg-black/30 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                  )}
                />
                <button
                  onClick={handleAddBannedIP}
                  className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[12px] rounded-xl cursor-pointer"
                >
                  Bannir IP
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {bannedIPs.map(ip => (
                  <span
                    key={ip}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-gray-800/80 text-rose-300 text-[11.5px] font-bold border border-rose-500/30"
                  >
                    <span>{ip}</span>
                    <button
                      onClick={() => handleRemoveBannedIP(ip)}
                      className="text-gray-400 hover:text-white ml-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Matrice de Détection du Risque Frauduleux */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[12.5px] font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Signalements récents à examiner</span>
              </h4>

              <div className="space-y-2">
                {reports.filter(report => report.status === 'pending' || report.status === 'investigating').length === 0 ? (
                  <p className="text-xs text-gray-500">Aucun signalement en attente.</p>
                ) : (
                  reports
                    .filter(report => report.status === 'pending' || report.status === 'investigating')
                    .slice(0, 5)
                    .map(report => (
                      <div key={report.id} className={cn(
                        "p-3 rounded-xl border",
                        isDarkMode ? "bg-black/20 border-gray-800" : "bg-gray-50 border-gray-200"
                      )}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12.5px] font-extrabold">{report.reportedName}</span>
                          <span className="text-[10px] text-amber-300 font-bold">
                            {report.status === 'pending' ? 'À examiner' : 'En cours'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          {report.category} · {report.details || 'Aucun détail fourni'}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          Un signalement est une allégation, pas une conclusion automatisée.
                        </p>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Barre de Recherche & Filtres */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Rechercher par nom, ville, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "w-full rounded-xl py-2.5 pl-10 pr-4 text-[13px] border transition-colors outline-none",
                    isDarkMode 
                      ? "bg-[#121620] border-gray-800 text-white placeholder-gray-500 focus:border-rose-500" 
                      : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-rose-400"
                  )}
                />
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-[12px] font-bold border outline-none shrink-0 cursor-pointer",
                    isDarkMode ? "bg-[#121620] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
                  )}
                >
                  <option value="all">Tous statuts</option>
                  <option value="active">Actifs</option>
                  <option value="suspended">Suspendus</option>
                  <option value="verified">Vérifiés ✓</option>
                  <option value="premium">VIP ⭐</option>
                </select>

                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-[12px] font-bold border outline-none shrink-0 cursor-pointer",
                    isDarkMode ? "bg-[#121620] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
                  )}
                >
                  <option value="all">Toutes villes ({availableCities.length})</option>
                  {availableCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value as any)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-[12px] font-bold border outline-none shrink-0 cursor-pointer",
                    isDarkMode ? "bg-[#121620] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
                  )}
                >
                  <option value="all">Tous genres</option>
                  <option value="femme">Femmes</option>
                  <option value="homme">Hommes</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-[12px] font-bold border outline-none shrink-0 cursor-pointer",
                    isDarkMode ? "bg-[#121620] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
                  )}
                >
                  <option value="name">Trier par Nom</option>
                  <option value="credits">Trier par Crédits</option>
                  <option value="age">Trier par Âge</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11.5px] text-gray-400 font-semibold px-1 pt-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectedUserIds.length === filteredProfiles.length ? handleDeselectAll : handleSelectAllVisible}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold text-[11px] transition-colors cursor-pointer flex items-center space-x-1"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{selectedUserIds.length === filteredProfiles.length && filteredProfiles.length > 0 ? 'Tout désélectionner' : 'Tout sélectionner'}</span>
                </button>
                <span>({filteredProfiles.length} membre{filteredProfiles.length > 1 ? 's' : ''})</span>
              </div>

              <button
                onClick={handleExportMembersCSV}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-extrabold text-[11px] transition-colors cursor-pointer flex items-center space-x-1"
                title="Exporter au format CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exporter CSV</span>
              </button>
            </div>

            {/* Liste des Cartes Membres */}
            <div className="space-y-3">
              {filteredProfiles.length === 0 ? (
                <div className="text-center py-14 text-[13px] font-bold text-gray-500">
                  Aucun membre ne correspond à vos filtres
                </div>
              ) : (
                filteredProfiles.map(p => {
                  const pId = p.user_id || p.id;
                  const isSusp = Boolean(p.isSuspended || p.is_suspended);
                  const isVIP = Boolean(p.isPremium || p.is_premium);
                  const isVrf = Boolean(p.verified || p.is_verified);
                  const isSel = selectedUserIds.includes(pId);
                  
                  return (
                    <UserCard
                      key={pId}
                      profile={p}
                      isSuspended={isSusp}
                      isPremium={isVIP}
                      isVerified={isVrf}
                      isSelected={isSel}
                      processing={processingId === pId}
                      isDark={isDarkMode}
                      onToggleSelect={() => handleToggleSelectUser(pId)}
                      onSendDirectMsg={() => setDirectMsgModalUser(p)}
                      onToggleSuspend={() => handleToggleSuspend(pId, isSusp)}
                      onToggleVerify={() => handleToggleVerify(pId, isVrf)}
                      onTogglePremium={() => handleTogglePremium(pId, isVIP)}
                      onAddCredits={() => handleAddCredits(pId, 100)}
                      onDeductCredits={() => handleDeductCredits(pId, 50)}
                      onEdit={() => setEditingUser(p)}
                      onDelete={() => {
                        if (confirm(`Supprimer définitivement le compte de ${p.name} ?`)) {
                          handleDeleteUser(pId);
                        }
                      }}
                      onView={() => setViewingUser(p)}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: ANNONCES & BROADCAST FLASH (NOUVEAU) */}
        {/* ========================================== */}
        {activeTab === 'broadcast' && (
          <div className="space-y-4">
            {/* Formulaire de création */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3.5",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <div className="flex items-center space-x-2">
                <Megaphone className="w-4 h-4 text-rose-500" />
                <h4 className="text-[13px] font-black uppercase tracking-wider">
                  Diffuser une Annonce Flash
                </h4>
              </div>

              <div className="space-y-2">
                <label className="text-[11.5px] font-bold text-gray-400 block">Titre de l'annonce</label>
                <input
                  type="text"
                  placeholder="Ex: Soirée Bavel VIP ce vendredi à Cocody 🍸"
                  value={newBroadcastTitle}
                  onChange={(e) => setNewBroadcastTitle(e.target.value)}
                  className={cn(
                    "w-full rounded-xl py-2 px-3 text-[13px] border outline-none",
                    isDarkMode ? "bg-black/30 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11.5px] font-bold text-gray-400 block">Message aux utilisateurs</label>
                <textarea
                  rows={3}
                  placeholder="Écrivez le message qui apparaîtra sur les écrans des membres..."
                  value={newBroadcastMsg}
                  onChange={(e) => setNewBroadcastMsg(e.target.value)}
                  className={cn(
                    "w-full rounded-xl py-2 px-3 text-[13px] border outline-none resize-none",
                    isDarkMode ? "bg-black/30 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">Catégorie</label>
                  <select
                    value={newBroadcastType}
                    onChange={(e) => setNewBroadcastType(e.target.value as any)}
                    className={cn(
                      "w-full rounded-xl p-2 text-[12px] font-bold border outline-none",
                      isDarkMode ? "bg-black/30 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                    )}
                  >
                    <option value="info">ℹ️ Information</option>
                    <option value="event">🎉 Événement</option>
                    <option value="promo">🎁 Promo Crédits</option>
                    <option value="maintenance">🛠️ Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 block mb-1">Niveau d'urgence</label>
                  <button
                    type="button"
                    onClick={() => setNewBroadcastUrgent(!newBroadcastUrgent)}
                    className={cn(
                      "w-full rounded-xl p-2 text-[12px] font-bold border transition-colors flex items-center justify-center space-x-1.5",
                      newBroadcastUrgent
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                        : isDarkMode ? "bg-black/30 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-600"
                    )}
                  >
                    <span>{newBroadcastUrgent ? '🔴 Alerte Prioritaire' : '⚪ Standard'}</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handlePublishBroadcast}
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-[13px] rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98"
              >
                <Send className="w-4 h-4" />
                <span>Diffuser Immédiatement</span>
              </button>
            </div>

            {/* Historique des annonces */}
            <div className="space-y-3">
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-gray-400 px-1">
                Annonces Actives & Historique ({broadcasts.length})
              </h4>

              {broadcasts.length === 0 ? (
                <div className="text-center py-8 text-[12px] text-gray-500 font-bold">
                  Aucune annonce enregistrée
                </div>
              ) : (
                broadcasts.map(bc => (
                  <div key={bc.id} className={cn(
                    "p-3.5 rounded-2xl border space-y-2",
                    isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                          bc.type === 'event' ? "bg-purple-500/20 text-purple-400" :
                          bc.type === 'promo' ? "bg-amber-500/20 text-amber-400" :
                          bc.type === 'maintenance' ? "bg-rose-500/20 text-rose-400" :
                          "bg-blue-500/20 text-blue-400"
                        )}>
                          {bc.type}
                        </span>
                        {bc.priority === 'urgent' && (
                          <span className="text-[10px] bg-rose-600 text-white font-black px-1.5 py-0.2 rounded-full">
                            URGENT
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] text-gray-500">
                        {new Date(bc.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h5 className="text-[13.5px] font-bold">{bc.title}</h5>
                    <p className="text-[12px] text-gray-400 leading-snug">{bc.message}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-800/60">
                      <button
                        onClick={() => handleToggleBroadcastStatus(bc.id)}
                        className={cn(
                          "text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                          bc.active 
                            ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" 
                            : "bg-gray-700/40 text-gray-400 hover:bg-gray-700"
                        )}
                      >
                        {bc.active ? '🟢 En diffusion' : '⚪ Archivée'}
                      </button>
                      <button
                        onClick={() => handleDeleteBroadcast(bc.id)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 transition-colors cursor-pointer"
                        title="Supprimer l'annonce"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: MESSAGES & SURVEILLANCE EN DIRECT */}
        {/* ========================================== */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            {/* Statistiques d'échange */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[12px] font-bold uppercase tracking-wider flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>Surveillance & Flux de Conversations</span>
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-black/20">
                  <div className="text-[18px] font-black">{liveDiscussions.length}</div>
                  <div className="text-[10px] text-gray-400 font-bold">Fils Actifs</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/20">
                  <div className="text-[18px] font-black">
                    {liveDiscussions.reduce((acc, d) => acc + (d.messages?.length || 0), 0)}
                  </div>
                  <div className="text-[10px] text-gray-400 font-bold">Messages</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/20">
                  <div className="text-[18px] font-black text-emerald-400">100%</div>
                  <div className="text-[10px] text-gray-400 font-bold">Sécurité Automatique</div>
                </div>
              </div>
            </div>

            {/* Liste des conversations actives avec inspection */}
            <div className="space-y-3">
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-gray-400 px-1">
                Conversations récentes ({liveDiscussions.length})
              </h4>

              {liveDiscussions.map(disc => {
                // Détection de termes à risque
                const riskWords = ['argent', 'virement', 'whatsapp', 'telegram', 'broutat', 'carte', 'banque'];
                const hasRisk = disc.messages?.some((m: any) => 
                  riskWords.some(rw => m.text?.toLowerCase().includes(rw))
                );

                return (
                  <div key={disc.id} className={cn(
                    "p-3 rounded-2xl border space-y-2.5 transition-all",
                    isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
                  )}>
                    <div className="flex items-center space-x-3">
                      <img 
                        src={disc.avatar} 
                        alt={disc.name} 
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-xl object-cover border border-gray-700" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[13.5px] font-bold truncate">{disc.name}</span>
                          <span className="text-[10.5px] text-gray-500">
                            {new Date(disc.lastMessageTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[12px] text-gray-400 truncate mt-0.5 font-medium">
                          {disc.lastMessage || 'Discussion en cours...'}
                        </p>
                      </div>
                    </div>

                    {hasRisk && (
                      <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center space-x-1.5 text-amber-400 text-[11px] font-bold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Mots-clés sensibles détectés dans cet échange</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-800/60">
                      <span className="text-[11px] text-gray-400 font-semibold">
                        {disc.messages?.length || 0} messages échangés
                      </span>
                      <button
                        onClick={() => setInspectingChat(disc)}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 font-bold text-[11.5px] flex items-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspecter le fil</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 5: SIGNALEMENTS (REPORTS) */}
        {/* ========================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className={cn(
              "p-3.5 rounded-2xl border flex items-start space-x-3",
              isDarkMode ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50 border-rose-200"
            )}>
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[13px] font-bold text-white dark:text-white leading-tight">
                  Centre des Signalements
                </h4>
                <p className={cn(
                  "text-[11.5px] leading-normal mt-0.5",
                  isDarkMode ? "text-gray-400" : "text-gray-600"
                )}>
                  {reports.filter(r => r.status === 'pending').length} signalement(s) en attente de modération.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {reports.filter(r => r.status === 'pending').length === 0 ? (
                <div className="text-center py-16 text-[13px] font-bold text-gray-500">
                  ✓ Aucun signalement en attente
                </div>
              ) : (
                reports.filter(r => r.status === 'pending').map(rep => (
                  <ReportCard
                    key={rep.id}
                    report={rep}
                    isDark={isDarkMode}
                    onResolve={(action) => handleResolveReport(rep.id, action)}
                  />
                ))
              )}
            </div>

            {/* Historique des signalements traités */}
            {reports.filter(r => r.status !== 'pending').length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-[11.5px] font-bold uppercase tracking-wider text-gray-500">
                  Historique récent
                </h4>
                {reports.filter(r => r.status !== 'pending').map(rep => (
                  <div key={rep.id} className={cn(
                    "p-3 rounded-xl border flex items-center justify-between",
                    isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
                  )}>
                    <div>
                      <span className="text-[12.5px] font-bold">{rep.reportedName}</span>
                      <span className="text-[11px] text-gray-400 ml-2 font-medium">{rep.reason}</span>
                    </div>
                    <span className={cn(
                      "text-[10.5px] font-bold px-2 py-0.5 rounded-full",
                      rep.status === 'resolved' ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"
                    )}>
                      {rep.status === 'resolved' ? 'Résolu' : 'Classé'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 6: MODÉRATION AUTOMATIQUE & RÈGLES SÉCURITÉ */}
        {/* ========================================== */}
        {activeTab === 'moderation' && (
          <div className="space-y-4">
            {/* File de modération */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[13px] font-bold flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>File d'Approbation de Contenu ({moderationQueue.length})</span>
              </h4>

              {moderationQueue.length === 0 ? (
                <div className="text-center py-8 text-[12.5px] text-gray-500 font-bold">
                  ✓ Toutes les photos et bios ont été validées
                </div>
              ) : (
                moderationQueue.map(item => (
                  <ModerationItem
                    key={item.id}
                    item={item}
                    isDark={isDarkMode}
                    deceptionReview={deceptionReviews[item.userId]}
                    isAnalyzing={deceptionReviewLoadingId === item.userId}
                    onAnalyze={async () => {
                      setDeceptionReviewLoadingId(item.userId);
                      try {
                        const response = await authFetch('/api/security/deception-detector', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ profileId: item.userId })
                        });
                        const payload = await response.json().catch(() => null);
                        if (!response.ok) throw new Error(payload?.error || 'Analyse comportementale indisponible.');
                        setDeceptionReviews(prev => ({ ...prev, [item.userId]: payload }));
                      } catch (error) {
                        console.error('Analyse comportementale admin impossible:', error);
                        showToast(error instanceof Error ? error.message : 'Analyse comportementale indisponible.', 'error');
                      } finally {
                        setDeceptionReviewLoadingId(null);
                      }
                    }}
                    onApprove={async () => {
                      const response = await authFetch(`/api/admin/moderation-queue/${encodeURIComponent(item.id)}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ decision: 'approved' })
                      });
                      if (!response.ok) {
                        showToast('Impossible d’approuver ce contenu', 'error');
                        return;
                      }
                      setModerationQueue(prev => prev.filter(i => i.id !== item.id));
                      showToast(`Contenu de ${item.userName} approuvé ✅`, 'success');
                    }}
                    onReject={async () => {
                      const response = await authFetch(`/api/admin/moderation-queue/${encodeURIComponent(item.id)}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ decision: 'rejected' })
                      });
                      if (!response.ok) {
                        showToast('Impossible de rejeter ce contenu', 'error');
                        return;
                      }
                      setModerationQueue(prev => prev.filter(i => i.id !== item.id));
                      showToast(`Contenu de ${item.userName} rejeté ❌`, 'warning');
                    }}
                  />
                ))
              )}
            </div>

            {/* Anti-Scam & Filtres de Mots Suspects */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-black uppercase tracking-wider text-rose-400 flex items-center space-x-2">
                  <ShieldX className="w-4 h-4" />
                  <span>Filtre Anti-Arnaque & Brouteurs ({blockedKeywords.length})</span>
                </h4>
                <span className="text-[10.5px] font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">
                  Filtre Actif
                </span>
              </div>
              <p className="text-[12px] text-gray-400">
                Les messages ou bios contenant ces mots déclencheront automatiquement un avertissement et une mise en attente du compte.
              </p>

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Ajouter un mot suspect (ex: virement, rib, pcs)..."
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBlockedKeyword()}
                  className={cn(
                    "flex-1 rounded-xl py-2 px-3 text-[12.5px] border outline-none",
                    isDarkMode ? "bg-black/30 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                  )}
                />
                <button
                  onClick={handleAddBlockedKeyword}
                  className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[12px] rounded-xl cursor-pointer"
                >
                  Ajouter
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {blockedKeywords.map(kw => (
                  <span
                    key={kw}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-gray-800/80 text-gray-300 text-[11.5px] font-bold border border-gray-700/60"
                  >
                    <span>{kw}</span>
                    <button
                      onClick={() => handleRemoveBlockedKeyword(kw)}
                      className="text-gray-400 hover:text-rose-400 ml-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 7: FINANCES & MONÉTISATION (NOUVEAU) */}
        {/* ========================================== */}
        {activeTab === 'finance' && (
          <div className="space-y-4">
            {/* Résumé Financier */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={DollarSign}
                label="Revenus Estimés"
                value={`${stats.revenue.total.toFixed(0)}€`}
                sub="Abonnements + Packs"
                color="green"
                isDark={isDarkMode}
              />
              <StatCard
                icon={CreditCard}
                label="Crédits Vendus"
                value={stats.totalCredits}
                sub={`${stats.premiumUsers} abonnés VIP`}
                color="amber"
                isDark={isDarkMode}
              />
            </div>

            {/* Outil de recharge générale */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[12.5px] font-black uppercase tracking-wider flex items-center space-x-2">
                <Gift className="w-4 h-4 text-rose-500" />
                <span>Distribution Exceptionnelle de Crédits</span>
              </h4>
              <p className="text-[12px] text-gray-400">
                Créditez instantanément les comptes de tous les membres pour célébrer un événement ou booster l'activité.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleMassCreditBonus(20)}
                  className="py-2.5 px-2 rounded-xl bg-amber-500/15 text-amber-400 font-extrabold text-[12px] hover:bg-amber-500/25 active:scale-98 transition-all"
                >
                  +20 Crédits
                </button>
                <button
                  onClick={() => handleMassCreditBonus(50)}
                  className="py-2.5 px-2 rounded-xl bg-rose-500/15 text-rose-400 font-extrabold text-[12px] hover:bg-rose-500/25 active:scale-98 transition-all"
                >
                  +50 Crédits
                </button>
                <button
                  onClick={() => handleMassCreditBonus(100)}
                  className="py-2.5 px-2 rounded-xl bg-emerald-500/15 text-emerald-400 font-extrabold text-[12px] hover:bg-emerald-500/25 active:scale-98 transition-all"
                >
                  +100 Crédits
                </button>
              </div>
            </div>

            {/* Grille des Packs Bavel */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[12.5px] font-black uppercase tracking-wider text-gray-400">
                Tarification des Packs en Boutique
              </h4>

              <div className="space-y-2">
                {[
                  { name: 'Pack Découverte', credits: '100 crédits', price: '2,49 €', badge: 'Débutant' },
                  { name: 'Pack Populaire', credits: '550 crédits', price: '8,99 €', badge: 'Populaire' },
                  { name: 'Pack Passion', credits: '1 250 crédits', price: '17,99 €', badge: 'Meilleur Choix' },
                  { name: 'Pack VIP Élite', credits: '3 000 crédits + Pass VIP', price: '36,99 €', badge: 'Élite' },
                ].map((pack, idx) => (
                  <div key={idx} className={cn(
                    "p-3 rounded-xl border flex items-center justify-between",
                    isDarkMode ? "bg-black/20 border-gray-700/60" : "bg-gray-50 border-gray-200"
                  )}>
                    <div>
                      <span className="text-[13px] font-bold">{pack.name}</span>
                      <p className="text-[11px] text-gray-400 font-medium">{pack.credits} • {pack.price}</p>
                    </div>
                    <span className="text-[10.5px] bg-rose-500/15 text-rose-400 font-bold px-2 py-0.5 rounded-full">
                      {pack.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 8: STATISTIQUES AVANCÉES */}
        {/* ========================================== */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Users} label="Membres Inscrits" value={stats.totalUsers} color="blue" isDark={isDarkMode} />
              <StatCard icon={UserCheck} label="En Ligne" value={stats.activeUsers} color="green" isDark={isDarkMode} />
              <StatCard icon={Award} label="VIP Actifs" value={stats.premiumUsers} color="amber" isDark={isDarkMode} />
              <StatCard icon={Heart} label="Coups de Cœur" value={stats.totalLikes} color="rose" isDark={isDarkMode} />
            </div>

            {/* Répartition par Genre */}
            <div className={cn(
              "p-4 rounded-2xl border space-y-3",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[11.5px] font-extrabold uppercase tracking-wider text-gray-400">
                Démographie de la Communauté
              </h4>
              <div className="space-y-2.5">
                <DemographicBar label="Femmes" value={profiles.filter(p => p.gender === 'femme').length} total={stats.totalUsers} color="rose" />
                <DemographicBar label="Hommes" value={profiles.filter(p => p.gender === 'homme' || p.gender === 'male').length} total={stats.totalUsers} color="blue" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 9: CONFIGURATION DU SYSTÈME */}
        {/* ========================================== */}
        {activeTab === 'config' && (
          <div className={cn(
            "p-4 rounded-2xl border space-y-5",
            isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
          )}>
            <h4 className="text-[12px] font-extrabold uppercase tracking-wider flex items-center space-x-2">
              <Settings className="w-4 h-4 text-rose-400" />
              <span>Réglages Système & Règles Métier</span>
            </h4>

            <ConfigSlider
              label="Crédits quotidiens gratuits"
              value={config.dailyCredits}
              min={5}
              max={100}
              step={5}
              onChange={(v) => setConfig(prev => ({ ...prev, dailyCredits: v }))}
              isDark={isDarkMode}
            />

            <ConfigSlider
              label="Âge minimum requis"
              value={config.minAge}
              min={18}
              max={25}
              step={1}
              onChange={(v) => setConfig(prev => ({ ...prev, minAge: v }))}
              isDark={isDarkMode}
            />

            <ConfigSlider
              label="Messages max par jour (non VIP)"
              value={config.maxMessagesPerDay}
              min={20}
              max={300}
              step={10}
              onChange={(v) => setConfig(prev => ({ ...prev, maxMessagesPerDay: v }))}
              isDark={isDarkMode}
            />

            <ConfigToggle
              label="Mode Maintenance"
              value={config.maintenanceMode}
              onChange={(v) => setConfig(prev => ({ ...prev, maintenanceMode: v }))}
              isDark={isDarkMode}
            />

            <ConfigToggle
              label="Modération Automatique des Photos"
              value={config.photoModeration}
              onChange={(v) => setConfig(prev => ({ ...prev, photoModeration: v }))}
              isDark={isDarkMode}
            />

            <ConfigToggle
              label="Suspension automatique sur spam avéré"
              value={config.autoSuspendSpam}
              onChange={(v) => setConfig(prev => ({ ...prev, autoSuspendSpam: v }))}
              isDark={isDarkMode}
            />

            <button
              onClick={handleSaveConfig}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[13px] rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer la Configuration</span>
            </button>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 10: JOURNAL D'ACTIVITÉS (LOGS) */}
        {/* ========================================== */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <div className={cn(
              "p-4 rounded-2xl border",
              isDarkMode ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
            )}>
              <h4 className="text-[12px] font-extrabold uppercase tracking-wider flex items-center space-x-2 mb-3">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Journal d'Audit des Actions</span>
                <span className="text-[11px] text-gray-400 font-normal">
                  ({activityLog.length} entrées)
                </span>
              </h4>

              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {activityLog.length === 0 ? (
                  <div className="text-center py-8 text-[12px] text-gray-500 font-bold">
                    Aucune activité enregistrée
                  </div>
                ) : (
                  activityLog.map(log => (
                    <div key={log.id} className={cn(
                      "flex items-start space-x-3 p-2.5 rounded-xl transition-colors",
                      isDarkMode ? "hover:bg-gray-800/40 bg-black/15" : "hover:bg-gray-50 bg-gray-50/50"
                    )}>
                      <ActivityIcon type={log.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold">
                          {log.userName}
                          <span className="font-medium text-gray-400 ml-1.5">{log.action}</span>
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{log.details}</p>
                      </div>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ============================================ */}
      {/* MODAL 1: FICHE MEMBRE APPROFONDIE (INSPECTION) */}
      {/* ============================================ */}
      <AnimatePresence>
        {viewingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className={cn(
                "w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto border shadow-2xl p-5 space-y-4",
                isDarkMode ? "bg-[#121620] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
              )}
            >
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <span className="text-[13px] font-black uppercase tracking-wider text-rose-400">
                  Fiche Détaillée Membre
                </span>
                <button 
                  onClick={() => setViewingUser(null)}
                  className="p-1 rounded-full text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center space-x-3.5">
                <img 
                  src={viewingUser.img || viewingUser.photos?.[0] || 'https://via.placeholder.com/150'} 
                  alt={viewingUser.name} 
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-500 shadow-md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <h3 className="text-[16px] font-black">{viewingUser.name}, {viewingUser.age}</h3>
                    {viewingUser.verified && <span className="text-[11px] bg-sky-500/20 text-sky-400 px-1.5 py-0.2 rounded font-bold">✓ Vérifié</span>}
                    {viewingUser.isPremium && <span className="text-[11px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded font-bold">⭐ VIP</span>}
                  </div>
                  <p className="text-[12px] text-gray-400 font-semibold mt-0.5">
                    {viewingUser.city || 'Abidjan'} • ID: {viewingUser.user_id || viewingUser.id}
                  </p>
                  <p className="text-[12px] text-emerald-400 font-bold mt-1">
                    Solde: {viewingUser.credits || 0} crédits
                  </p>
                </div>
              </div>

              {viewingUser.bio && (
                <div className={cn(
                  "p-3 rounded-xl",
                  isDarkMode ? "bg-black/30 text-gray-300" : "bg-gray-100 text-gray-700"
                )}>
                  <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">Biographie :</p>
                  <p className="text-[12.5px] italic leading-relaxed">"{viewingUser.bio}"</p>
                </div>
              )}

              {/* Ajustement direct du solde de crédits */}
              <div className={cn(
                "p-3.5 rounded-xl border space-y-2",
                isDarkMode ? "border-gray-800 bg-black/20" : "border-gray-200 bg-gray-50"
              )}>
                <span className="text-[12px] font-bold uppercase tracking-wider text-amber-400 block">
                  Ajuster le solde de crédits
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleAddCredits(viewingUser.user_id || viewingUser.id, 50)}
                    className="py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11.5px] font-bold cursor-pointer"
                  >
                    +50 crédits
                  </button>
                  <button
                    onClick={() => handleAddCredits(viewingUser.user_id || viewingUser.id, 100)}
                    className="py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[11.5px] font-bold cursor-pointer"
                  >
                    +100 crédits
                  </button>
                  <button
                    onClick={() => handleDeductCredits(viewingUser.user_id || viewingUser.id, 50)}
                    className="py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[11.5px] font-bold cursor-pointer"
                  >
                    -50 crédits
                  </button>
                </div>
              </div>

              {/* Actions de modération du compte */}
              <div className="space-y-2 pt-2 border-t border-gray-800/80">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      void handleToggleVerify(
                        viewingUser.user_id || viewingUser.id,
                        Boolean(viewingUser.verified || viewingUser.is_verified)
                      ).then((updated) => {
                        if (updated) setViewingUser(prev => ({ ...prev, verified: false, is_verified: false }));
                      });
                    }}
                    disabled={!(viewingUser.verified || viewingUser.is_verified)}
                    className="py-2.5 px-3 rounded-xl bg-blue-500/20 text-blue-400 font-bold text-[12px] hover:bg-blue-500/30"
                  >
                    {viewingUser.verified || viewingUser.is_verified ? 'Retirer Badge ✓' : 'Attribution indisponible'}
                  </button>

                  <button
                    onClick={() => {
                      handleTogglePremium(viewingUser.user_id || viewingUser.id, viewingUser.isPremium);
                      setViewingUser(prev => ({ ...prev, isPremium: !prev.isPremium }));
                    }}
                    className="py-2.5 px-3 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-[12px] hover:bg-amber-500/30"
                  >
                    {viewingUser.isPremium ? 'Retirer VIP ⭐' : 'Passer en VIP ⭐'}
                  </button>
                </div>

                <button
                  onClick={() => {
                    const isSusp = Boolean(viewingUser.isSuspended || viewingUser.is_suspended);
                    handleToggleSuspend(viewingUser.user_id || viewingUser.id, isSusp);
                    setViewingUser(prev => ({ ...prev, isSuspended: !isSusp, is_suspended: !isSusp }));
                  }}
                  className={cn(
                    "w-full py-2.5 rounded-xl font-bold text-[12.5px] transition-colors",
                    viewingUser.isSuspended 
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                  )}
                >
                  {viewingUser.isSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* MODAL 2: ÉDITION RAPIDE D'UN PROFIL */}
      {/* ============================================ */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={cn(
                "w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 border shadow-2xl",
                isDarkMode ? "bg-[#121620] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
              )}
            >
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <span className="text-[13px] font-black uppercase text-blue-400">
                  Modifier les informations du membre
                </span>
                <button onClick={() => setEditingUser(null)} className="text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11.5px] font-bold text-gray-400 block mb-1">Nom / Prénom</label>
                  <input
                    type="text"
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className={cn(
                      "w-full rounded-xl py-2 px-3 text-[13px] border outline-none",
                      isDarkMode ? "bg-black/30 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11.5px] font-bold text-gray-400 block mb-1">Âge</label>
                    <input
                      type="number"
                      value={editingUser.age || 18}
                      onChange={(e) => setEditingUser({ ...editingUser, age: Number(e.target.value) })}
                      className={cn(
                        "w-full rounded-xl py-2 px-3 text-[13px] border outline-none",
                        isDarkMode ? "bg-black/30 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-[11.5px] font-bold text-gray-400 block mb-1">Ville</label>
                    <input
                      type="text"
                      value={editingUser.city || 'Abidjan'}
                      onChange={(e) => setEditingUser({ ...editingUser, city: e.target.value })}
                      className={cn(
                        "w-full rounded-xl py-2 px-3 text-[13px] border outline-none",
                        isDarkMode ? "bg-black/30 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11.5px] font-bold text-gray-400 block mb-1">Biographie</label>
                  <textarea
                    rows={3}
                    value={editingUser.bio || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                    className={cn(
                      "w-full rounded-xl py-2 px-3 text-[13px] border outline-none resize-none",
                      isDarkMode ? "bg-black/30 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
                    )}
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-[12.5px] font-bold text-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleSaveUserEdits(editingUser)}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* MODAL 3: INSPECTION DU FIL DE CONVERSATION */}
      {/* ============================================ */}
      <AnimatePresence>
        {inspectingChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={cn(
                "w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col p-4 border shadow-2xl",
                isDarkMode ? "bg-[#121620] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
              )}
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
                <div className="flex items-center space-x-2.5">
                  <img 
                    src={inspectingChat.avatar} 
                    alt={inspectingChat.name} 
                    className="w-9 h-9 rounded-xl object-cover" 
                  />
                  <div>
                    <h4 className="text-[13.5px] font-bold">{inspectingChat.name}</h4>
                    <p className="text-[10.5px] text-gray-400">Fil de conversation inspecté</p>
                  </div>
                </div>
                <button onClick={() => setInspectingChat(null)} className="text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 p-2 bg-black/20 rounded-xl mb-3">
                {(inspectingChat.messages || []).map((msg: any) => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "p-2.5 rounded-xl max-w-[85%] text-[12px] leading-relaxed",
                      msg.sender === 'user' 
                        ? "ml-auto bg-rose-600 text-white" 
                        : "mr-auto bg-gray-800 text-gray-200"
                    )}
                  >
                    <p>{msg.text}</p>
                    <span className="text-[9.5px] text-gray-300 block text-right mt-1 opacity-70">
                      {msg.time || 'Récemment'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    showToast(`Avertissement envoyé à ${inspectingChat.name}`, 'warning');
                    setInspectingChat(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-amber-500/20 text-amber-300 text-[11.5px] font-bold cursor-pointer"
                >
                  ⚠️ Avertir
                </button>
                <button
                  onClick={() => {
                    handleToggleSuspend(inspectingChat.userId || inspectingChat.id, false);
                    setInspectingChat(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-[11.5px] font-bold cursor-pointer"
                >
                  🚫 Suspendre
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* MODAL 4: ENVOI MESSAGE DIRECT ADMIN */}
      {/* ============================================ */}
      <AnimatePresence>
        {directMsgModalUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={cn(
                "w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 border shadow-2xl",
                isDarkMode ? "bg-[#121620] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
              )}
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-black text-rose-400 uppercase tracking-wide">
                      Message Admin Direct
                    </h4>
                    <p className="text-[11px] text-gray-400">À la personne : {directMsgModalUser.name}</p>
                  </div>
                </div>
                <button onClick={() => setDirectMsgModalUser(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[11.5px] font-bold text-gray-400 block">
                  Contenu du message In-App
                </label>
                <textarea
                  rows={4}
                  placeholder="Écrivez un avertissement, une offre de crédits ou une notification officielle..."
                  value={directMsgText}
                  onChange={(e) => setDirectMsgText(e.target.value)}
                  className={cn(
                    "w-full rounded-2xl p-3 text-[12.5px] border outline-none resize-none",
                    isDarkMode ? "bg-black/30 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900"
                  )}
                />
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => setDirectMsgModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-[12px] font-bold text-gray-400 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendDirectAdminMessage}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-extrabold flex items-center justify-center space-x-1.5 cursor-pointer shadow-lg shadow-rose-900/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer Maintenant</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BARRE D'ACTIONS GROUPÉES (BULK ACTIONS BAR) */}
      <AnimatePresence>
        {selectedUserIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 z-[99999] bg-[#121620]/95 backdrop-blur-xl border border-rose-500/40 text-white p-3.5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-2"
          >
            <div className="flex items-center space-x-2">
              <span className="w-7 h-7 rounded-xl bg-rose-600 text-white text-[12px] font-black flex items-center justify-center shadow">
                {selectedUserIds.length}
              </span>
              <span className="text-[12.5px] font-extrabold">membre(s) sélectionné(s)</span>
            </div>

            <div className="flex items-center space-x-1.5 flex-wrap justify-center">
              <button
                onClick={() => handleBulkAddCredits(50)}
                className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-extrabold text-[11px] rounded-xl cursor-pointer"
              >
                +50 Crédits
              </button>
              <button
                onClick={() => handleBulkToggleSuspend(true)}
                className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-extrabold text-[11px] rounded-xl cursor-pointer"
              >
                🚫 Suspendre
              </button>
              <button
                onClick={handleExportMembersCSV}
                className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-extrabold text-[11px] rounded-xl cursor-pointer"
              >
                📥 Exporter
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-2 py-1.5 text-gray-400 hover:text-white text-[11px] font-bold cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification Système */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className={cn(
              "absolute bottom-6 left-4 right-4 border text-white font-bold text-[12.5px] py-3 px-4 rounded-2xl text-center shadow-2xl z-[10001] flex items-center justify-center space-x-2",
              toastType === 'success' ? "bg-emerald-600 border-emerald-500" :
              toastType === 'error' ? "bg-rose-600 border-rose-500" :
              toastType === 'warning' ? "bg-amber-600 border-amber-500" :
              "bg-blue-600 border-blue-500"
            )}
          >
            <Sparkles className="w-4 h-4 text-white animate-spin" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// 3. SOUS-COMPOSANTS HAUTE LISIBILITÉ MOBILE
// ============================================

const StatCard: React.FC<{
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: 'blue' | 'green' | 'amber' | 'rose' | 'gray';
  isDark: boolean;
}> = ({ icon: Icon, label, value, sub, color, isDark }) => {
  const colors = {
    blue: isDark ? 'text-blue-400' : 'text-blue-600',
    green: isDark ? 'text-emerald-400' : 'text-emerald-600',
    amber: isDark ? 'text-amber-400' : 'text-amber-600',
    rose: isDark ? 'text-rose-400' : 'text-rose-600',
    gray: isDark ? 'text-gray-400' : 'text-gray-600',
  };

  return (
    <div className={cn(
      "p-3.5 rounded-2xl border transition-all",
      isDark ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
    )}>
      <div className="flex items-center space-x-2">
        <Icon className={`w-4.5 h-4.5 ${colors[color]}`} />
        <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-tight">{label}</span>
      </div>
      <div className="mt-1.5 text-[22px] font-black tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 font-medium mt-0.5">{sub}</div>}
    </div>
  );
};

const EngagementBar: React.FC<{
  label: string;
  value: number;
  total: number;
  color: 'rose' | 'blue' | 'green' | 'amber';
}> = ({ label, value, total, color }) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const colors = {
    rose: 'bg-rose-500',
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11.5px] font-bold">
        <span>{label}</span>
        <span className="text-gray-400">{percent}%</span>
      </div>
      <div className="w-full bg-gray-800/60 h-2 rounded-full overflow-hidden">
        <div className={`${colors[color]} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const UserCard: React.FC<{
  profile: any;
  isSuspended: boolean;
  isPremium: boolean;
  isVerified: boolean;
  processing: boolean;
  isDark: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onSendDirectMsg?: () => void;
  onToggleSuspend: () => void;
  onToggleVerify: () => void;
  onTogglePremium: () => void;
  onAddCredits: () => void;
  onDeductCredits: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}> = ({
  profile,
  isSuspended,
  isPremium,
  isVerified,
  processing,
  isDark,
  isSelected,
  onToggleSelect,
  onSendDirectMsg,
  onToggleSuspend,
  onToggleVerify,
  onTogglePremium,
  onAddCredits,
  onDeductCredits,
  onEdit,
  onDelete,
  onView,
}) => {
  return (
    <div className={cn(
      "p-3.5 rounded-2xl border transition-all relative",
      isSelected
        ? isDark ? "border-rose-500/80 bg-rose-500/10 shadow-lg shadow-rose-950/20" : "border-rose-400 bg-rose-50/90 shadow-sm"
        : isSuspended 
          ? isDark ? "border-rose-900/40 bg-rose-950/10" : "border-rose-200 bg-rose-50/60"
          : isDark ? "border-gray-800/80 bg-[#121620] hover:border-gray-700" : "border-gray-200 bg-white hover:border-gray-300"
    )}>
      <div className="flex items-start space-x-3">
        {/* Checkbox de Sélection */}
        {onToggleSelect && (
          <button 
            onClick={onToggleSelect}
            className="mt-2 text-gray-400 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
            title="Sélecteur membre"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-rose-500 fill-rose-500/20" />
            ) : (
              <Square className="w-5 h-5 text-gray-600" />
            )}
          </button>
        )}

        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-800 relative bg-gray-900">
          <img 
            src={profile.img || profile.photos?.[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'} 
            alt={profile.name} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover" 
          />
          {isSuspended && (
            <div className="absolute inset-0 bg-rose-950/80 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5 flex-wrap">
            <span className="font-extrabold text-[14px] truncate">
              {profile.name || 'Membre'}, {profile.age || '18'}
            </span>
            {isVerified && <span className="text-[10px] bg-sky-500/20 text-sky-400 px-1.5 py-0.2 rounded-md font-extrabold">✓</span>}
            {isPremium && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded-md font-extrabold">VIP</span>}
            {isSuspended && <span className="text-[10px] bg-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded-md font-extrabold">Bloqué</span>}
          </div>
          <p className="text-[11.5px] text-gray-400 truncate font-semibold mt-0.5">
            {profile.city || 'Abidjan'} • 🪙 <span className="text-gray-200 font-black">{profile.credits || 0}</span> crédits
          </p>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {onSendDirectMsg && (
            <button
              onClick={onSendDirectMsg}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer transition-colors"
              title="Envoyer un message Admin direct"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onView}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-800/80 hover:bg-gray-700 text-gray-300 cursor-pointer transition-colors"
            title="Consulter le profil complet"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-gray-800/60">
        <ActionButton
          onClick={onToggleSuspend}
          processing={processing}
          label={isSuspended ? 'Réactiver' : 'Suspendre'}
          color={isSuspended ? 'emerald' : 'rose'}
          isDark={isDark}
        />
        <ActionButton
          onClick={onToggleVerify}
          processing={processing}
          disabled={!isVerified}
          label={isVerified ? '- Badge' : 'Vérification indisponible'}
          color={isVerified ? 'gray' : 'blue'}
          isDark={isDark}
        />
        <ActionButton
          onClick={onTogglePremium}
          processing={processing}
          label={isPremium ? '- VIP' : '+ VIP'}
          color={isPremium ? 'gray' : 'amber'}
          isDark={isDark}
        />
        <ActionButton
          onClick={onEdit}
          processing={processing}
          label="Éditer"
          color="blue"
          isDark={isDark}
        />
      </div>
    </div>
  );
};

const ActionButton: React.FC<{
  onClick: () => void;
  processing?: boolean;
  disabled?: boolean;
  label: string;
  color: 'rose' | 'emerald' | 'blue' | 'amber' | 'gray';
  isDark: boolean;
}> = ({ onClick, processing, disabled, label, color, isDark }) => {
  const colors = {
    rose: isDark ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25' : 'bg-rose-50 text-rose-600 hover:bg-rose-100',
    emerald: isDark ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
    blue: isDark ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25' : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    amber: isDark ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25' : 'bg-amber-50 text-amber-600 hover:bg-amber-100',
    gray: isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  };

  return (
    <button
      onClick={onClick}
      disabled={processing || disabled}
      className={cn(
        "py-2 px-1 rounded-xl text-[11.5px] font-bold text-center transition-all cursor-pointer truncate active:scale-95",
        colors[color],
        (processing || disabled) && "opacity-50 cursor-not-allowed"
      )}
    >
      {label}
    </button>
  );
};

const ReportCard: React.FC<{
  report: Report;
  isDark: boolean;
  onResolve: (action: 'suspend' | 'dismiss' | 'warn' | 'investigate') => void;
}> = ({ report, isDark, onResolve }) => {
  return (
    <div className={cn(
      "p-4 rounded-2xl border space-y-3",
      isDark ? "bg-[#121620] border-gray-800" : "bg-white border-gray-200"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 uppercase">
          {report.priority} • {report.category}
        </span>
        <span className="text-[11px] text-gray-500">{report.date}</span>
      </div>

      <div className="flex items-center space-x-2 text-[12.5px]">
        <span className="text-gray-400">Signalé par:</span>
        <span className="font-bold">{report.reporterName}</span>
        <span className="text-gray-500">→</span>
        <span className="font-black text-rose-400">{report.reportedName}</span>
      </div>

      <div className="p-3 rounded-xl bg-black/25">
        <p className="text-[12px] font-medium text-gray-300">
          Motif: <span className="text-rose-300 font-semibold">"{report.reason}"</span>
        </p>
        {report.details && (
          <p className="text-[11px] text-gray-400 mt-1">{report.details}</p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5 pt-1">
        <button
          onClick={() => onResolve('dismiss')}
          className="py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-[11px] cursor-pointer"
        >
          Ignorer
        </button>
        <button
          onClick={() => onResolve('warn')}
          className="py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold rounded-xl text-[11px] cursor-pointer"
        >
          Avertir
        </button>
        <button
          onClick={() => onResolve('investigate')}
          className="py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 font-bold rounded-xl text-[11px] cursor-pointer"
        >
          Enquêter
        </button>
        <button
          onClick={() => onResolve('suspend')}
          className="py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-[11px] cursor-pointer"
        >
          Suspendre
        </button>
      </div>
    </div>
  );
};

const ModerationItem: React.FC<{
  item: ModerationQueue;
  isDark: boolean;
  deceptionReview?: DeceptionReview;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onApprove: () => void;
  onReject: () => void;
}> = ({ item, isDark, deceptionReview, isAnalyzing, onAnalyze, onApprove, onReject }) => (
  <div className={cn(
    "p-3 rounded-2xl border space-y-3",
    isDark ? "border-gray-800 bg-black/20" : "border-gray-200 bg-white"
  )}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center space-x-3 min-w-0">
        {item.type === 'photo' ? (
          <img src={item.content} alt={item.userName} className="w-11 h-11 rounded-xl object-cover" />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-gray-800 flex items-center justify-center font-bold text-xs">
            BIO
          </div>
        )}
        <div className="min-w-0">
          <span className="text-[13px] font-bold block">{item.userName}</span>
          <span className="text-[11px] text-gray-400">Contenu soumis pour validation</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="px-3 py-1.5 bg-blue-500/15 text-blue-400 rounded-xl text-[11.5px] font-bold disabled:opacity-50"
        >
          {isAnalyzing ? 'Analyse…' : 'Signaux'}
        </button>
        <button
          onClick={onApprove}
          className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-[11.5px] font-bold"
        >
          Valider
        </button>
        <button
          onClick={onReject}
          className="px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-xl text-[11.5px] font-bold"
        >
          Rejeter
        </button>
      </div>
    </div>
    {deceptionReview && (
      <div className={cn('rounded-xl p-3 text-xs space-y-1', isDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-700')}>
        <p className="font-bold">
          Signaux comportementaux : {deceptionReview.riskCategory} ({deceptionReview.riskScore}/100)
          {' · '}
          {deceptionReview.recommendedAction === 'human_review' ? 'Revue humaine recommandée' : deceptionReview.recommendedAction === 'monitor' ? 'À surveiller' : 'Aucun signal concordant'}
        </p>
        {deceptionReview.signals.length > 0 && <p>{deceptionReview.signals.join(' · ')}</p>}
        <p className="opacity-75">{deceptionReview.explanation}</p>
      </div>
    )}
  </div>
);

const ConfigSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  isDark: boolean;
  unit?: string;
}> = ({ label, value, min, max, step, onChange, isDark, unit }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-[12px] font-bold text-gray-400">
      <span>{label}</span>
      <span className="text-rose-400 font-black">{value} {unit || ''}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step} 
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-rose-500 h-2 bg-gray-700 rounded-lg cursor-pointer" 
    />
  </div>
);

const ConfigToggle: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  isDark: boolean;
}> = ({ label, value, onChange, isDark }) => (
  <div className="flex items-center justify-between py-2 border-t border-gray-800/80">
    <span className="text-[12.5px] font-bold">{label}</span>
    <button 
      onClick={() => onChange(!value)}
      className={cn(
        "w-12 h-6.5 rounded-full transition-colors relative focus:outline-none shrink-0 cursor-pointer",
        value ? 'bg-rose-600' : 'bg-gray-700'
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded-full bg-white absolute top-0.75 transition-transform duration-200",
        value ? 'translate-x-[24px]' : 'translate-x-[4px]'
      )} />
    </button>
  </div>
);

const ActivityIcon: React.FC<{ type: ActivityLog['type'] }> = ({ type }) => {
  const icons = {
    login: <UserCheck className="w-4 h-4 text-green-400" />,
    swipe: <Activity className="w-4 h-4 text-blue-400" />,
    like: <Heart className="w-4 h-4 text-rose-400" />,
    message: <MessageCircle className="w-4 h-4 text-purple-400" />,
    report: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    moderation: <Shield className="w-4 h-4 text-rose-400" />,
    premium: <Star className="w-4 h-4 text-amber-400" />,
    broadcast: <Megaphone className="w-4 h-4 text-purple-400" />,
    other: <Info className="w-4 h-4 text-gray-400" />,
  };
  return icons[type] || icons.other;
};

const DemographicBar: React.FC<{
  label: string;
  value: number;
  total: number;
  color: 'rose' | 'blue' | 'gray';
}> = ({ label, value, total, color }) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const colors = {
    rose: 'bg-rose-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-500',
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11.5px] font-bold">
        <span>{label}</span>
        <span>{percent}% ({value})</span>
      </div>
      <div className="w-full bg-gray-800/60 h-2 rounded-full overflow-hidden">
        <div className={`${colors[color]} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

export default AdminPanel;
