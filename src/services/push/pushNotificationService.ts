/**
 * Push Notification Reactivation & Proximity Engine
 * Handles FCM / Web Push permissions, background triggers, and cross-path alerts.
 * 
 * @version 3.0.0
 * @author Bavel Team
 */

import { displaySystemNotification, playNotificationAudio, triggerHapticFeedback } from '../notificationService';
import { getSupabase } from '../../lib/supabase';
import { getApiUrl } from '../../lib/apiUrl';
import { authFetch } from '../../lib/authFetch';

// ============================================
// 1. TYPES
// ============================================

export type PushNotificationType = 
  | 'inactivity_48h' 
  | 'secret_match' 
  | 'proximity_cross' 
  | 'boost_reminder' 
  | 'match_reminder_24h'
  | 'match_reminder_72h'
  | 'message_received'
  | 'message_read'
  | 'profile_view'
  | 'weekly_roundup'
  | 'social_activity'
  | 'new_like'
  | 'super_like'
  | 'system_update';

export type NotificationPriority = 'high' | 'medium' | 'low';
export type NotificationSound = 'match' | 'like' | 'system' | 'match_reminder' | 'message' | 'superlike' | 'call';

export interface PushNotificationTrigger {
  id: string;
  type: PushNotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  scheduledAt?: string;
  triggeredAt?: string;
  targetId?: string;
  targetName?: string;
  priority?: NotificationPriority;
  sound?: NotificationSound;
  silent?: boolean;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface Match {
  id: string;
  name: string;
  avatar?: string;
  matchedAt?: string | number;
  createdAt?: string | number;
  timestamp?: string | number;
  userId?: string;
  profileId?: string;
  lastMessage?: string;
  lastMessageTime?: string | Date;
  unreadCount?: number;
}

export interface NotificationPreference {
  id: string;
  label: string;
  enabled: boolean;
  category: 'matches' | 'messages' | 'likes' | 'system' | 'marketing';
}

export interface PushNotificationConfig {
  enableHaptics: boolean;
  enableSound: boolean;
  maxRemindersPerMatch: number;
  reminderCooldownHours: number;
  matchReminderDelayHours: number;
  inactivityDelayHours: number;
  enableVibration: boolean;
  vibrationPatterns: {
    [key: string]: number[];
  };
}

// ============================================
// 2. CONSTANTES
// ============================================

const STORAGE_KEYS = {
  PUSH_PERMISSION: 'bavel_push_permission',
  LAST_ACTIVE: 'bavel_last_active_timestamp',
  MATCH_VISITS: 'bavel_match_visits_map',
  MATCH_REMINDERS_SENT: 'bavel_match_reminders_sent_map',
  NOTIFICATION_SETTINGS: 'bavel_notification_settings',
  LAST_NOTIFICATION: 'bavel_last_notification_timestamp',
  PUSH_TOKEN: 'bavel_push_token',
  PUSH_SUBSCRIBED: 'bavel_push_subscribed',
} as const;

const DEFAULT_CONFIG: PushNotificationConfig = {
  enableHaptics: true,
  enableSound: true,
  maxRemindersPerMatch: 3,
  reminderCooldownHours: 24,
  matchReminderDelayHours: 24,
  inactivityDelayHours: 48,
  enableVibration: true,
  vibrationPatterns: {
    match: [200, 100, 200, 100, 300],
    superlike: [150, 75, 150, 75, 200],
    like: [50, 30, 50],
    message: [100, 50, 100, 50, 100],
    match_reminder: [40, 60, 40],
    call: [100, 50, 100, 50, 200, 100, 300],
    default: [100, 50, 100],
  },
};

const DEFAULT_PREFERENCES: NotificationPreference[] = [
  { id: 'matches_new', label: 'Nouveaux Matchs', enabled: true, category: 'matches' },
  { id: 'matches_reminder', label: 'Rappels de Matchs (> 24h)', enabled: true, category: 'matches' },
  { id: 'messages', label: 'Nouveaux Messages', enabled: true, category: 'messages' },
  { id: 'likes', label: 'Nouveaux Likes', enabled: true, category: 'likes' },
  { id: 'super_likes', label: 'Super Likes', enabled: true, category: 'likes' },
  { id: 'profile_views', label: 'Vues de Profil', enabled: false, category: 'likes' },
  { id: 'system_updates', label: 'Mises à jour Système', enabled: true, category: 'system' },
  { id: 'weekly_roundup', label: 'Résumé Hebdomadaire', enabled: true, category: 'marketing' },
  { id: 'promotions', label: 'Offres Promotionnelles', enabled: false, category: 'marketing' },
];

// ============================================
// 3. CLASSE PRINCIPALE
// ============================================

class PushNotificationService {
  private isSupported: boolean = false;
  private permissionState: NotificationPermission = 'default';
  private subscription: PushSubscription | null = null;
  private config: PushNotificationConfig = DEFAULT_CONFIG;
  private preferences: NotificationPreference[] = DEFAULT_PREFERENCES;
  private isInitialized: boolean = false;
  private queuedNotifications: PushNotificationTrigger[] = [];
  private lastNotificationTimestamp: number = 0;
  private notificationCooldownMs: number = 1000; // 1 seconde entre notifications

  // ============================================
  // 3.1 CONSTRUCTEUR
  // ============================================

  constructor() {
    if (typeof window !== 'undefined') {
      this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
      if (this.isSupported) {
        this.permissionState = Notification.permission;
      }
    }
    this.loadConfig();
    this.loadPreferences();
    this.recordActivity();
    this.setupBackgroundCheck();
  }

  // ============================================
  // 3.2 CONFIGURATION
  // ============================================

  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('bavel_push_config');
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {}
  }

  public updateConfig(config: Partial<PushNotificationConfig>): void {
    this.config = { ...this.config, ...config };
    try {
      localStorage.setItem('bavel_push_config', JSON.stringify(this.config));
    } catch {}
  }

  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.preferences = this.preferences.map(p => ({
          ...p,
          enabled: parsed[p.id] !== undefined ? parsed[p.id] : p.enabled,
        }));
      }
    } catch {}
  }

  public getPreferences(): NotificationPreference[] {
    return [...this.preferences];
  }

  public updatePreference(id: string, enabled: boolean): void {
    this.preferences = this.preferences.map(p => 
      p.id === id ? { ...p, enabled } : p
    );
    this.savePreferences();
  }

  private savePreferences(): void {
    try {
      const obj: Record<string, boolean> = {};
      this.preferences.forEach(p => { obj[p.id] = p.enabled; });
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(obj));
    } catch {}
  }

  public isPreferenceEnabled(id: string): boolean {
    const pref = this.preferences.find(p => p.id === id);
    return pref ? pref.enabled : false;
  }

  // ============================================
  // 3.3 ACTIVITÉ
  // ============================================

  public recordActivity(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now().toString());
      void getSupabase().auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        return fetch(getApiUrl('/api/user/ping'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        });
      }).catch(() => {});
    }
  }

  public getLastActiveTimestamp(): number {
    try {
      const ts = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
      return ts ? parseInt(ts, 10) : Date.now();
    } catch {
      return Date.now();
    }
  }

  public getInactivityHours(): number {
    const lastActive = this.getLastActiveTimestamp();
    return (Date.now() - lastActive) / (3600 * 1000);
  }

  public isInactive(hours: number = 48): boolean {
    return this.getInactivityHours() >= hours;
  }

  // ============================================
  // 3.4 PERMISSIONS
  // ============================================

  public async requestPushPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      this.permissionState = result;
      localStorage.setItem(STORAGE_KEYS.PUSH_PERMISSION, result);
      
      if (result === 'granted') {
        await this.registerServiceWorker();
      }
      
      return result === 'granted';
    } catch (error) {
      console.warn('Push permission request failed:', error);
      return false;
    }
  }

  public getPermissionState(): NotificationPermission {
    return this.permissionState;
  }

  public isPermissionGranted(): boolean {
    return this.permissionState === 'granted';
  }

  // ============================================
  // 3.5 SERVICE WORKER
  // ============================================

  private async registerServiceWorker(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.subscription = await registration.pushManager.getSubscription();
        if (this.subscription) {
          localStorage.setItem(STORAGE_KEYS.PUSH_SUBSCRIBED, 'true');
        }
      }
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  }

  private async getVapidPublicKey(): Promise<string> {
    try {
      const res = await authFetch(getApiUrl('/api/push/vapid-public-key'));
      if (res.ok) {
        const data = await res.json();
        if (data && data.publicKey) {
          return data.publicKey;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch VAPID key from server:', e);
    }
    const configuredKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!configuredKey) {
      throw new Error('Web Push is not configured: VAPID public key is unavailable.');
    }
    return configuredKey;
  }

  public async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.isSupported) {
      return null;
    }

    if (!this.isPermissionGranted()) {
      const granted = await this.requestPushPermission();
      if (!granted) return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = await this.getVapidPublicKey();
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidKey),
      });

      this.subscription = subscription;
      localStorage.setItem(STORAGE_KEYS.PUSH_SUBSCRIBED, 'true');
      
      // Envoyer la subscription au serveur
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.warn('Push subscription failed:', error);
      return null;
    }
  }

  public async unsubscribeFromPush(): Promise<boolean> {
    try {
      if (this.subscription) {
        const endpoint = this.subscription.endpoint;
        await this.subscription.unsubscribe();
        this.subscription = null;
        localStorage.setItem(STORAGE_KEYS.PUSH_SUBSCRIBED, 'false');

        try {
          const response = await authFetch(getApiUrl('/api/push/unsubscribe'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint }),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } catch (error) {
          console.warn('Failed to remove push subscription from server:', error);
        }

        return true;
      }
      return false;
    } catch (error) {
      console.warn('Unsubscribe failed:', error);
      return false;
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    const response = await authFetch(getApiUrl('/api/push/subscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }

  /**
   * Envoie une notification Push native Web Push (Apple APNs / Google FCM)
   * pour réveiller le téléphone du partenaire même si l'application est fermée.
   */
  public async sendCallPushNotification(params: {
    targetUserId: string;
    callType: 'video' | 'audio';
  }): Promise<boolean> {
    try {
      const response = await authFetch(getApiUrl('/api/push/call-notify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: params.targetUserId,
          callType: params.callType,
        })
      });
      if (!response.ok) return false;
      const result = await response.json().catch(() => null);
      return typeof result?.acceptedByPushService === 'number' && result.acceptedByPushService > 0;
    } catch (err) {
      console.warn('Failed to trigger remote call Web Push:', err);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // ============================================
  // 3.6 MATCH VISITS
  // ============================================

  public recordMatchVisit(matchId: string): void {
    if (typeof localStorage === 'undefined' || !matchId) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MATCH_VISITS);
      const visits = raw ? JSON.parse(raw) : {};
      visits[String(matchId)] = Date.now();
      localStorage.setItem(STORAGE_KEYS.MATCH_VISITS, JSON.stringify(visits));
    } catch (error) {
      console.warn('Failed to record match visit:', error);
    }
  }

  public isMatchVisited(matchId: string): boolean {
    if (typeof localStorage === 'undefined' || !matchId) return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MATCH_VISITS);
      if (!raw) return false;
      const visits = JSON.parse(raw);
      return Boolean(visits[String(matchId)]);
    } catch {
      return false;
    }
  }

  public getMatchVisitTimestamp(matchId: string): number | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MATCH_VISITS);
      if (!raw) return null;
      const visits = JSON.parse(raw);
      return visits[String(matchId)] || null;
    } catch {
      return null;
    }
  }

  public isMatchUnvisitedOlderThan(
    match: Match, 
    hours: number = 24
  ): boolean {
    if (!match || !match.id) return false;
    if (this.isMatchVisited(match.id)) return false;

    const timeVal = match.matchedAt || match.createdAt || match.timestamp;
    if (!timeVal) return false;

    const matchTime = new Date(timeVal).getTime();
    if (isNaN(matchTime)) return false;

    const delayMs = hours * 60 * 60 * 1000;
    return (Date.now() - matchTime) >= delayMs;
  }

  // ============================================
  // 3.7 REMINDERS
  // ============================================

  public triggerMatchReminderPush(match: {
    id: string;
    name: string;
    avatar?: string;
    hoursAgo?: number;
    customMessage?: string;
    priority?: NotificationPriority;
  }): PushNotificationTrigger | null {
    // Vérifier les préférences
    if (!this.isPreferenceEnabled('matches_reminder')) {
      return null;
    }

    // Vérifier le cooldown
    const reminderKey = `reminder_${match.id}`;
    const lastReminder = this.getLastReminderSent(reminderKey);
    const cooldownMs = this.config.reminderCooldownHours * 60 * 60 * 1000;
    
    if (lastReminder && (Date.now() - lastReminder) < cooldownMs) {
      return null;
    }

    // Vérifier le nombre de rappels
    const count = this.getReminderCount(match.id);
    if (count >= this.config.maxRemindersPerMatch) {
      return null;
    }

    const hours = match.hoursAgo || 24;
    const trigger: PushNotificationTrigger = {
      id: `push_match_reminder_${match.id}_${Date.now()}`,
      type: 'match_reminder_24h',
      title: `✨ Rappel doux : ${match.name} attend votre message`,
      body: match.customMessage || `Vous avez matché il y a plus de ${hours}h et n'avez pas encore discuté. Ne laissez pas passer cette belle rencontre ! 💕`,
      icon: match.avatar || '/public/favicon.ico',
      triggeredAt: new Date().toISOString(),
      targetId: match.id,
      targetName: match.name,
      priority: match.priority || 'medium',
      sound: 'match_reminder',
    };

    this.sendPush(trigger);
    this.recordReminderSent(reminderKey, match.id);
    
    return trigger;
  }

  private getLastReminderSent(key: string): number | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MATCH_REMINDERS_SENT);
      if (!raw) return null;
      const map = JSON.parse(raw);
      return map[key] || null;
    } catch {
      return null;
    }
  }

  private recordReminderSent(key: string, matchId: string): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MATCH_REMINDERS_SENT);
      const map = raw ? JSON.parse(raw) : {};
      map[key] = Date.now();
      // Incrémenter le compteur
      const countKey = `count_${matchId}`;
      map[countKey] = (map[countKey] || 0) + 1;
      localStorage.setItem(STORAGE_KEYS.MATCH_REMINDERS_SENT, JSON.stringify(map));
    } catch {}
  }

  private getReminderCount(matchId: string): number {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MATCH_REMINDERS_SENT);
      if (!raw) return 0;
      const map = JSON.parse(raw);
      return map[`count_${matchId}`] || 0;
    } catch {
      return 0;
    }
  }

  public checkUnvisitedMatchReminders(
    matches: Match[]
  ): PushNotificationTrigger[] {
    if (!Array.isArray(matches) || matches.length === 0) return [];
    if (!this.isPreferenceEnabled('matches_reminder')) return [];

    const triggers: PushNotificationTrigger[] = [];
    const now = Date.now();

    for (const match of matches) {
      const matchId = String(match.id);
      
      if (this.isMatchVisited(matchId)) continue;

      const isOlder = this.isMatchUnvisitedOlderThan(
        match, 
        this.config.matchReminderDelayHours
      );

      if (isOlder) {
        const hours = Math.floor(
          (now - new Date(match.matchedAt || match.createdAt || now).getTime()) / 
          (3600 * 1000)
        );
        
        const trigger = this.triggerMatchReminderPush({
          id: matchId,
          name: match.name || 'Votre match',
          avatar: match.avatar,
          hoursAgo: hours,
        });

        if (trigger) {
          triggers.push(trigger);
          break; // 1 reminder par check
        }
      }
    }

    return triggers;
  }

  // ============================================
  // 3.8 NOTIFICATIONS SPECIFIQUES
  // ============================================

  public triggerInactivityPush(customMsg?: string): PushNotificationTrigger | null {
    if (!this.isPreferenceEnabled('system_updates')) return null;
    
    // Vérifier si on a déjà envoyé une notification d'inactivité récemment
    const lastNotif = this.getLastNotificationTimestamp();
    if (lastNotif && (Date.now() - lastNotif) < 12 * 60 * 60 * 1000) {
      return null;
    }

    const retentionHooks = [
      {
        title: "🔥 Plus de rencontres vous attendent !",
        body: "Retournez dans l'application Bavel pour découvrir de nouveaux profils compatibles près de chez vous !"
      },
      {
        title: "👀 Quelqu'un s'intéresse à votre profil...",
        body: "De nouveaux visiteurs ont consulté votre profil. Revenez sur Bavel pour voir qui c'est !"
      },
      {
        title: "💬 Vos matchs n'attendent que vous !",
        body: "Cela fait un moment que vous n'êtes pas venu. Ouvrez l'application pour relancer la discussion !"
      },
      {
        title: "✨ De nouveaux profils sont disponibles !",
        body: "Faites de nouvelles rencontres dès maintenant sur Bavel Côte d'Ivoire !"
      }
    ];

    const randomHook = retentionHooks[Math.floor(Math.random() * retentionHooks.length)];

    const trigger: PushNotificationTrigger = {
      id: `push_inact_${Date.now()}`,
      type: 'inactivity_48h',
      title: randomHook.title,
      body: customMsg || randomHook.body,
      triggeredAt: new Date().toISOString(),
      priority: 'high',
      sound: 'system',
    };

    this.sendPush(trigger);
    this.recordNotificationSent();
    return trigger;
  }

  /**
   * Déclenche une notification de relance d'inactivité en temps réel
   * envoyée au téléphone via Web Push native (APNs / FCM).
   */
  public triggerRealInactivityPush(variant?: number): PushNotificationTrigger {
    const hooks = [
      {
        title: "🔥 Retournez sur Bavel pour plus de rencontres !",
        body: "Cela fait 1 à 2 jours que vous ne vous êtes pas connecté. De nouveaux profils vous attendent autour de vous !"
      },
      {
        title: "👀 Nouveaux visiteurs sur votre profil !",
        body: "Quelqu'un est passé sur votre fiche. Revenez dans l'application pour découvrir de qui il s'agit !"
      },
      {
        title: "💖 Un coup de cœur vous attend sur Bavel !",
        body: "Ne manquez pas vos opportunités de rencontres. Connectez-vous pour voir vos suggestions du jour."
      }
    ];

    const selected = (variant !== undefined && hooks[variant]) ? hooks[variant] : hooks[Math.floor(Math.random() * hooks.length)];

    const trigger: PushNotificationTrigger = {
      id: `push_retention_real_${Date.now()}`,
      type: 'inactivity_48h',
      title: selected.title,
      body: selected.body,
      triggeredAt: new Date().toISOString(),
      priority: 'high',
      sound: 'system',
    };

    // Envoyer la notification locale
    this.sendPush(trigger);
    this.recordNotificationSent();

    // Envoyer la notification Push serveur temps réel au téléphone
    try {
      authFetch(getApiUrl('/api/push/inactivity-test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }).catch((error) => console.warn('Failed to send inactivity push:', error));
    } catch (_) {}

    return trigger;
  }

  public triggerSecretMatchPush(targetName?: string): PushNotificationTrigger {
    const trigger: PushNotificationTrigger = {
      id: `push_secret_${Date.now()}`,
      type: 'secret_match',
      title: targetName ? `⚡ Coup de Cœur envoyé à ${targetName} !` : '💘 Nouveau Match Secret !',
      body: targetName 
        ? `${targetName} a reçu une alerte prioritaire FCM. Vous êtes en haut de sa liste de Rencontres !`
        : 'Tu as un nouveau match secret ! Débloque ton profil pour lui parler avant qu\'il ne disparaisse.',
      triggeredAt: new Date().toISOString(),
      priority: 'high',
      sound: 'match',
      targetName,
    };

    this.sendPush(trigger);
    return trigger;
  }

  public triggerSuperLikePush(targetName: string): PushNotificationTrigger {
    const trigger: PushNotificationTrigger = {
      id: `push_superlike_${Date.now()}`,
      type: 'super_like',
      title: `⭐ ${targetName} vous a envoyé un Super Like !`,
      body: `Ne laissez pas passer cette chance ! ${targetName} vous attend sur Bavel.`,
      triggeredAt: new Date().toISOString(),
      priority: 'high',
      sound: 'superlike',
      targetName,
    };

    this.sendPush(trigger);
    return trigger;
  }

  public triggerProximityPush(
    targetName: string, 
    distanceMeters: number = 350
  ): PushNotificationTrigger {
    if (!this.isPreferenceEnabled('matches_new')) return null;

    const trigger: PushNotificationTrigger = {
      id: `push_prox_${Date.now()}`,
      type: 'proximity_cross',
      title: `⚡ Vous êtes à moins de ${distanceMeters}m !`,
      body: `Vous venez de croiser ${targetName} dans la vraie vie. Ouvrez Bavel pour démarrer la discussion !`,
      triggeredAt: new Date().toISOString(),
      priority: 'high',
      sound: 'like',
      targetName,
    };

    this.sendPush(trigger);
    return trigger;
  }

  public triggerMessagePush(
    senderName: string, 
    message: string,
    matchId: string
  ): PushNotificationTrigger {
    if (!this.isPreferenceEnabled('messages')) return null;

    const trigger: PushNotificationTrigger = {
      id: `push_msg_${Date.now()}`,
      type: 'message_received',
      title: `💬 Nouveau message de ${senderName}`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      triggeredAt: new Date().toISOString(),
      priority: 'high',
      sound: 'message',
      targetId: matchId,
      targetName: senderName,
    };

    this.sendPush(trigger);

    // Relayer le message via Web Push serveur
    this.sendRemotePush({
      title: trigger.title,
      body: trigger.body,
      type: 'message_received',
      data: { matchId }
    });

    return trigger;
  }

  /**
   * Déclenche une notification lorsqu'un profil est visité
   */
  public triggerProfileViewPush(
    viewerName: string,
    viewerId?: string
  ): PushNotificationTrigger | null {
    const trigger: PushNotificationTrigger = {
      id: `push_view_${Date.now()}`,
      type: 'profile_view',
      title: '👀 Nouveau visiteur sur votre profil !',
      body: `${viewerName} vient de consulter votre profil. Découvrez ce qui l'intéresse chez vous !`,
      triggeredAt: new Date().toISOString(),
      priority: 'high',
      sound: 'system',
      targetId: viewerId,
      targetName: viewerName,
    };

    this.sendPush(trigger);

    // Transmettre la notification Web Push serveur
    this.sendRemotePush({
      title: trigger.title,
      body: trigger.body,
      type: 'profile_view',
      data: { viewerId, viewerName }
    });

    return trigger;
  }

  /**
   * Déclenche une notification lorsqu'un Like est reçu sur une photo ou un profil
   */
  public triggerNewLikePush(
    likerName: string,
    likerAvatar?: string
  ): PushNotificationTrigger | null {
    const trigger: PushNotificationTrigger = {
      id: `push_like_${Date.now()}`,
      type: 'new_like',
      title: '💖 Quelqu\'un a aimé votre photo !',
      body: `${likerName} a eu un coup de cœur pour vous. Ouvrez l'application pour voir son profil !`,
      triggeredAt: new Date().toISOString(),
      priority: 'high',
      sound: 'like',
      image: likerAvatar,
      targetName: likerName,
    };

    this.sendPush(trigger);

    // Transmettre la notification Web Push serveur
    this.sendRemotePush({
      title: trigger.title,
      body: trigger.body,
      type: 'new_like',
      data: { likerName }
    });

    return trigger;
  }

  /**
   * Déclenche une notification lorsqu'un nouveau profil compatible est détecté
   */
  public triggerNewCompatibleProfilePush(
    profileName: string,
    location?: string
  ): PushNotificationTrigger | null {
    const locText = location ? ` à ${location}` : ' près de chez vous';
    const trigger: PushNotificationTrigger = {
      id: `push_compat_${Date.now()}`,
      type: 'social_activity',
      title: '✨ Nouveau profil très compatible !',
      body: `${profileName} vient de rejoindre Bavel${locText}. Vous partagez plusieurs passions communes !`,
      triggeredAt: new Date().toISOString(),
      priority: 'medium',
      sound: 'match_reminder',
      targetName: profileName,
    };

    this.sendPush(trigger);

    // Transmettre la notification Web Push serveur
    this.sendRemotePush({
      title: trigger.title,
      body: trigger.body,
      type: 'social_activity',
      data: { profileName, location }
    });

    return trigger;
  }

  /**
   * Utilitaire pour relayer l'envoi vers le serveur Web Push native
   */
  private sendRemotePush(payload: { title: string; body: string; type: string; data?: any }): void {
    try {
      authFetch(getApiUrl('/api/push/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          type: payload.type,
          data: payload.data
        }),
      }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }).catch((error) => console.warn('Failed to relay remote push:', error));
    } catch (error) {
      console.warn('Failed to prepare remote push:', error);
    }
  }

  public triggerWeeklyRoundup(
    matchesCount: number,
    likesCount: number,
    viewsCount: number
  ): PushNotificationTrigger | null {
    if (!this.isPreferenceEnabled('weekly_roundup')) return null;

    const trigger: PushNotificationTrigger = {
      id: `push_weekly_${Date.now()}`,
      type: 'weekly_roundup',
      title: '📊 Votre semaine sur Bavel',
      body: `${matchesCount} nouveaux matchs, ${likesCount} likes reçus, ${viewsCount} vues de profil !`,
      triggeredAt: new Date().toISOString(),
      priority: 'low',
      sound: 'system',
    };

    this.sendPush(trigger);
    return trigger;
  }

  // ============================================
  // 3.9 ENVOI DE NOTIFICATIONS
  // ============================================

  public sendPush(trigger: PushNotificationTrigger): void {
    // Vérifier le cooldown
    if (this.lastNotificationTimestamp && 
        (Date.now() - this.lastNotificationTimestamp) < this.notificationCooldownMs) {
      // Mettre en file d'attente
      this.queuedNotifications.push(trigger);
      return;
    }

    this.executePush(trigger);
  }

  private executePush(trigger: PushNotificationTrigger): void {
    // Sons
    if (this.config.enableSound && trigger.sound) {
      playNotificationAudio(trigger.sound as NotificationSound);
    }

    // Haptique
    if (this.config.enableHaptics && this.config.enableVibration) {
      const pattern = this.config.vibrationPatterns[trigger.type] || 
                     this.config.vibrationPatterns.default;
      triggerHapticFeedback(pattern);
    }

    // Notification système
    if (this.isPermissionGranted()) {
      const options: any = {
        body: trigger.body,
        icon: trigger.icon || '/favicon.ico',
        badge: trigger.badge || '/favicon.ico',
        tag: trigger.id,
        requireInteraction: trigger.priority === 'high',
        silent: trigger.silent || false,
        data: {
          url: `/notifications/${trigger.id}`,
          type: trigger.type,
          targetId: trigger.targetId,
          ...trigger.data,
        },
        actions: trigger.actions || [
          { action: 'open', title: 'Ouvrir' },
          { action: 'close', title: 'Fermer' },
        ],
      };

      if (trigger.image) {
        options.image = trigger.image;
      }

      displaySystemNotification(trigger.title, options);
      this.lastNotificationTimestamp = Date.now();
    }

    // Traiter la file d'attente
    this.processQueue();
  }

  public sendLocalPushNotification(opts: {
    title: string;
    body: string;
    icon?: string;
    tab?: string;
    sound?: NotificationSound;
  }): void {
    const trigger: PushNotificationTrigger = {
      id: `push_local_${Date.now()}`,
      type: 'system_update',
      title: opts.title,
      body: opts.body,
      icon: opts.icon,
      sound: opts.sound || 'system',
      data: { tab: opts.tab },
      triggeredAt: new Date().toISOString(),
    };
    this.sendPush(trigger);
  }

  private processQueue(): void {
    if (this.queuedNotifications.length === 0) return;
    
    setTimeout(() => {
      const next = this.queuedNotifications.shift();
      if (next) {
        this.executePush(next);
      }
    }, this.notificationCooldownMs);
  }

  private recordNotificationSent(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_NOTIFICATION, Date.now().toString());
    } catch {}
  }

  private getLastNotificationTimestamp(): number | null {
    try {
      const ts = localStorage.getItem(STORAGE_KEYS.LAST_NOTIFICATION);
      return ts ? parseInt(ts, 10) : null;
    } catch {
      return null;
    }
  }

  // ============================================
  // 3.10 BACKGROUND CHECK
  // ============================================

  private setupBackgroundCheck(): void {
    if (typeof window === 'undefined') return;

    // Vérification toutes les heures
    setInterval(() => {
      this.runBackgroundCheck();
    }, 60 * 60 * 1000);
  }

  public runBackgroundCheck(matches: Match[] = []): void {
    // 1. Vérifier l'inactivité
    if (this.isInactive(this.config.inactivityDelayHours)) {
      this.triggerInactivityPush();
    }

    // 2. Vérifier les rappels de match
    if (matches.length > 0) {
      this.checkUnvisitedMatchReminders(matches);
    }
  }

  // ============================================
  // 3.11 UTILITAIRES
  // ============================================

  public getQueuedNotifications(): PushNotificationTrigger[] {
    return [...this.queuedNotifications];
  }

  public clearQueuedNotifications(): void {
    this.queuedNotifications = [];
  }

  public getConfig(): PushNotificationConfig {
    return { ...this.config };
  }

  public isSupportedBrowser(): boolean {
    return this.isSupported;
  }

  public resetAllSettings(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      this.preferences = DEFAULT_PREFERENCES;
      this.savePreferences();
      this.queuedNotifications = [];
    } catch {}
  }

  // ============================================
  // 3.12 NOTIFICATION ACTIONS
  // ============================================

  public handleNotificationAction(action: string, data: any): void {
    switch (action) {
      case 'open':
        // Ouvrir l'application
        if (data.url) {
          window.location.href = data.url;
        }
        break;
      case 'reply':
        // Ouvrir la discussion
        if (data.targetId) {
          window.location.href = `/chat/${data.targetId}`;
        }
        break;
      case 'close':
        // Fermer simplement
        break;
      default:
        console.warn('Unknown notification action:', action);
    }
  }
}

// ============================================
// 4. EXPORT
// ============================================

export const pushNotificationService = new PushNotificationService();

// ============================================
// 5. EXPORTS PAR DÉFAUT
// ============================================

export default pushNotificationService;