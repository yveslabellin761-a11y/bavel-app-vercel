import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  notificationService, 
  NotificationItem, 
  playNotificationAudio, 
  triggerHapticFeedback, 
  displaySystemNotification 
} from '../services/notificationService';
import { pushNotificationService } from '../services/push/pushNotificationService';
import { getSupabase } from '../lib/supabase';
import { getApiUrl } from '../lib/apiUrl';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  activeToastNotification: NotificationItem | null;
  dismissToastNotification: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (enabled: boolean) => void;
  permissionStatus: 'default' | 'granted' | 'denied';
  requestBrowserPermission: () => Promise<boolean>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  sendNotification: (params: Partial<NotificationItem> & { title: string; userId?: string }) => Promise<NotificationItem | null>;
  triggerTestNotification: (type?: string) => Promise<void>;
  triggerMatchReminder: (match: { id: string; name: string; avatar?: string; hoursAgo?: number }) => Promise<void>;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ 
  children, 
  userId 
}: { 
  children: React.ReactNode; 
  userId?: string;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeToastNotification, setActiveToastNotification] = useState<NotificationItem | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  // Sound and Vibration preferences
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bavel_notif_sound');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [vibrationEnabled, setVibrationEnabledState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bavel_notif_vibe');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem('bavel_notif_sound', JSON.stringify(enabled));
    } catch {}
  };

  const setVibrationEnabled = (enabled: boolean) => {
    setVibrationEnabledState(enabled);
    try {
      localStorage.setItem('bavel_notif_vibe', JSON.stringify(enabled));
    } catch {}
  };

  // Synchronize Push Subscriptions with backend
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && permissionStatus === 'granted') {
      pushNotificationService.subscribeToPush().catch(err => {
        console.warn('Auto Web Push subscription failed:', err);
      });
    }
  }, [permissionStatus, userId]);

  // Handle messages from Service Worker (e.g., auto-answer on incoming call notification click)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'INCOMING_CALL_ANSWER') {
        console.log('[SW Message] Incoming call answered from lockscreen notification:', data.payload);
        window.dispatchEvent(new CustomEvent('bavel_incoming_call_autoanswer', { detail: data.payload }));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  const requestBrowserPermission = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        if (permission === 'granted') {
          await pushNotificationService.subscribeToPush();
        }
        return permission === 'granted';
      } catch (err) {
        console.warn("Error requesting notification permission:", err);
      }
    }
    return false;
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const list = await notificationService.getNotifications(userId);
      setNotifications(list);
    } catch (err) {
      console.warn("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    await notificationService.markAsRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await notificationService.markAllAsRead(userId);
  }, [userId]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    await notificationService.deleteNotification(notificationId);
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    await notificationService.clearAll(userId);
  }, [userId]);

  const dismissToastNotification = useCallback(() => {
    setActiveToastNotification(null);
  }, []);

  // Handle incoming real-time notification with granular category & channel filtering
  const handleIncomingNotification = useCallback((notif: NotificationItem) => {
    setNotifications(prev => {
      // Prevent duplicates
      if (prev.some(n => n.id === notif.id)) return prev;
      return [notif, ...prev];
    });

    // Check system-level notification master switch
    const isSystemNativeEnabled = localStorage.getItem('bavel_native_notifications_enabled') !== 'false';

    // Map notification types to granular category IDs
    let catId = 'messages';
    if (notif.type === 'match' || notif.type === 'match_reminder') catId = 'matchs';
    else if (notif.type === 'like' || notif.type === 'coup_de_coeur') catId = 'likes';
    else if (notif.type === 'visit') catId = 'visites';
    else if (notif.type === 'gift') catId = 'cadeaux';

    let showInApp = true;
    let showPush = isSystemNativeEnabled;

    try {
      const savedCategorySettings = localStorage.getItem('bavel_category_notifications');
      if (savedCategorySettings) {
        const catMap = JSON.parse(savedCategorySettings);
        if (catMap && catMap[catId]) {
          showInApp = catMap[catId].inApp !== false;
          showPush = isSystemNativeEnabled && catMap[catId].push !== false;
        }
      }
    } catch (e) {}

    // Play synthesized chime if sound is enabled
    if (soundEnabled && showInApp) {
      playNotificationAudio(notif.type);
    }

    // Trigger haptic vibration if enabled
    if (vibrationEnabled && showInApp) {
      if (notif.type === 'match_reminder') {
        triggerHapticFeedback([40, 60, 40]);
      } else {
        triggerHapticFeedback([70, 50, 70]);
      }
    }

    // Show native system push notification if push channel is active
    if (showPush) {
      displaySystemNotification(notif.title, {
        body: notif.body,
        icon: notif.senderAvatar || '/public/favicon.ico',
        tag: notif.id
      });
    }

    // Show interactive in-app toast banner if inApp channel is active
    if (showInApp) {
      setActiveToastNotification(notif);
    }
  }, [soundEnabled, vibrationEnabled]);

  const sendNotification = useCallback(async (params: Partial<NotificationItem> & { title: string; userId?: string }) => {
    const targetUserId = params.userId || userId;
    const created = await notificationService.createNotification({
      ...params,
      userId: targetUserId
    });
    return created;
  }, [userId]);

  const triggerTestNotification = useCallback(async (type: string = 'match') => {
    const result = await notificationService.triggerTestNotification(userId, type);
    if (result) {
      handleIncomingNotification(result);
    }
  }, [userId, handleIncomingNotification]);

  const triggerMatchReminder = useCallback(async (match: { id: string; name: string; avatar?: string; hoursAgo?: number }) => {
    try {
      const response = await fetch(getApiUrl('/api/notifications/match-reminder/trigger'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          matchId: match.id,
          matchName: match.name,
          matchAvatar: match.avatar,
          hoursAgo: match.hoursAgo || 24
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.notification) {
          handleIncomingNotification(data.notification);
        }
      }
    } catch (e) {
      console.warn("Failed to trigger match reminder:", e);
    }
  }, [userId, handleIncomingNotification]);

  // Connect WebSocket and track activity on mount
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      setConnectionStatus('disconnected');
      return;
    }

    // Record user activity timestamp
    pushNotificationService.recordActivity();

    // Check if background reminders need to be triggered
    try {
      pushNotificationService.runBackgroundCheck();
    } catch (_) {}

    fetchNotifications();

    const ws = notificationService.connectWebSocket();
    const realtimeClient = getSupabase();
    const realtimeChannel = realtimeClient?.channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const row = payload.new as any;
        handleIncomingNotification({
          ...row,
          read: Boolean(row.is_read),
          timestamp: row.created_at,
          senderId: row.sender_id,
          senderName: row.sender_name,
          senderAvatar: row.sender_avatar
        });
      })
      .subscribe();

    ws.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    ws.onNotification((data: any) => {
      if (data.type === 'notification' && data.notification) {
        handleIncomingNotification(data.notification);
      }
    });

    return () => {
      ws.disconnect();
      if (realtimeClient && realtimeChannel) {
        void realtimeClient.removeChannel(realtimeChannel);
      }
    };
  }, [userId, fetchNotifications, handleIncomingNotification]);

  // Auto-dismiss in-app notification after 5 seconds
  useEffect(() => {
    if (!activeToastNotification) return;
    const timer = setTimeout(() => {
      setActiveToastNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeToastNotification]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      activeToastNotification,
      dismissToastNotification,
      soundEnabled,
      setSoundEnabled,
      vibrationEnabled,
      setVibrationEnabled,
      permissionStatus,
      requestBrowserPermission,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
      fetchNotifications,
      sendNotification,
      triggerTestNotification,
      triggerMatchReminder,
      connectionStatus
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}

// Compatibility wrapper for useNotifications hook
export function useNotifications(_userId?: string) {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
