import { getBackendBaseUrl } from '../lib/apiUrl';
import { getSupabase } from '../lib/supabase';

export interface NotificationItem {
  id: string;
  type: 'like' | 'match' | 'match_reminder' | 'visit' | 'message' | 'coup_de_coeur' | 'system' | 'gift' | 'security';
  title: string;
  body: string;
  timestamp: string | Date;
  read: boolean;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  actionUrl?: string;
  iconType?: string;
  metadata?: Record<string, any>;
}

// Synthesize pleasant, organic audio chimes using the Web Audio API without external mp3 files
export function playNotificationAudio(type: string = 'default') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (type === 'match_reminder') {
      // Gentle, soothing chime for 24h match reminder (A4 major chord with soft decay)
      const softNotes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      softNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.0001, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.09, now + i * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.65);
      });
    } else if (type === 'match') {
      // Celebratory melodic arpeggio for reciprocal match
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.001, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    } else if (type === 'like' || type === 'coup_de_coeur') {
      // Warm heart chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now); // F5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      osc2.frequency.setValueAtTime(1046.5, now + 0.12); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } else if (type === 'message') {
      // Modern messaging bubble pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Standard gentle double-tap notification
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) {
    // Silent fail if browser audio is not permitted
  }
}

// Trigger mobile haptic feedback if supported
export function triggerHapticFeedback(pattern: number[] = [60, 40, 60]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}

// Display native browser system notification if authorized
export function displaySystemNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/public/favicon.ico',
        badge: '/public/favicon.ico',
        ...options
      });
    } catch (e) {
      console.warn("Native Notification error:", e);
    }
  }
}

export const notificationService = {
  // Fetch real notifications list for user
  getNotifications: async (userId: string): Promise<NotificationItem[]> => {
    try {
      const cleanId = String(userId || 'guest').toLowerCase().trim();
      const response = await authFetch(`/api/users/${cleanId}/notifications`);
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (e) {
      console.warn("Failed to fetch notifications from server:", e);
    }
    return [];
  },

  // Get live unread count
  getUnreadCount: async (userId: string): Promise<number> => {
    try {
      const cleanId = String(userId || 'guest').toLowerCase().trim();
      const response = await authFetch(`/api/users/${cleanId}/notifications/unread-count`);
      if (response.ok) {
        const data = await response.json();
        return Number(data?.unreadCount) || 0;
      }
    } catch (e) {
      console.warn("Failed to fetch unread count:", e);
    }
    return 0;
  },

  // Create and send a new notification to a recipient
  createNotification: async (notifData: Partial<NotificationItem> & { userId: string; title: string }): Promise<NotificationItem | null> => {
    try {
      const response = await authFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifData)
      });
      if (response.ok) {
        const result = await response.json();
        return result.notification || null;
      }
    } catch (e) {
      console.warn("Failed to create notification:", e);
    }
    return null;
  },

  // Mark single notification as read
  markAsRead: async (notificationId: string): Promise<void> => {
    try {
      await authFetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
    } catch (e) {
      console.warn("Failed to mark notification as read:", e);
    }
  },

  // Mark all notifications as read for a user
  markAllAsRead: async (userId: string): Promise<void> => {
    try {
      const cleanId = String(userId || 'guest').toLowerCase().trim();
      await authFetch(`/api/users/${cleanId}/notifications/read-all`, { method: 'POST' });
    } catch (e) {
      console.warn("Failed to mark all notifications as read:", e);
    }
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<void> => {
    try {
      await authFetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn("Failed to delete notification:", e);
    }
  },

  // Clear all notifications
  clearAll: async (userId: string): Promise<void> => {
    try {
      const cleanId = String(userId || 'guest').toLowerCase().trim();
      await authFetch(`/api/users/${cleanId}/notifications`, { method: 'DELETE' });
    } catch (e) {
      console.warn("Failed to clear notifications:", e);
    }
  },

  // Trigger test notification
  triggerTestNotification: async (userId: string, type?: string): Promise<NotificationItem | null> => {
    try {
      const cleanId = String(userId || 'guest').toLowerCase().trim();
      const response = await authFetch('/api/notifications/test-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: cleanId, type })
      });
      if (response.ok) {
        const data = await response.json();
        return data.notification || null;
      }
    } catch (e) {
      console.warn("Failed to trigger test notification:", e);
    }
    return null;
  },

  // Real-time WebSocket connection with automatic reconnect and ping/pong
  connectWebSocket: () => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let pingInterval: any = null;
    let isExplicitlyClosed = false;

    const callbacks: Array<(data: any) => void> = [];
    const statusCallbacks: Array<(status: 'connected' | 'disconnected' | 'reconnecting') => void> = [];

    const notifyStatus = (status: 'connected' | 'disconnected' | 'reconnecting') => {
      statusCallbacks.forEach(cb => {
        try { cb(status); } catch (e) {}
      });
    };

    const setupConnection = async () => {
      if (typeof window === 'undefined' || isExplicitlyClosed) return;

      try {
        const { data: { session }, error } = await getSupabase().auth.getSession();
        if (error) throw error;
        if (!session?.access_token) throw new Error('Session requise pour les notifications temps réel.');
        const wsUrl = new URL('/ws/notifications', getBackendBaseUrl());
        wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(wsUrl, ['bavel-notifications', `bavel-auth.${session.access_token}`]);

        ws.onopen = () => {
          notifyStatus('connected');

          // Keep alive ping every 25 seconds
          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              try { ws.send(JSON.stringify({ type: 'ping' })); } catch (e) {}
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            callbacks.forEach(cb => {
              try { cb(data); } catch (err) { console.error("Error in WS notification listener:", err); }
            });
          } catch (err) {
            console.error("Error parsing WS message:", err);
          }
        };

        ws.onclose = () => {
          notifyStatus('disconnected');
          if (pingInterval) clearInterval(pingInterval);
          if (!isExplicitlyClosed) {
            notifyStatus('reconnecting');
            reconnectTimeout = setTimeout(setupConnection, 3000);
          }
        };

        ws.onerror = () => {
          // Handled by onclose
        };
      } catch (e) {
        console.warn("WebSocket init error:", e);
        if (!isExplicitlyClosed) {
          reconnectTimeout = setTimeout(setupConnection, 5000);
        }
      }
    };

    setupConnection();

    return {
      onNotification: (callback: (data: any) => void) => {
        callbacks.push(callback);
      },
      onStatusChange: (callback: (status: 'connected' | 'disconnected' | 'reconnecting') => void) => {
        statusCallbacks.push(callback);
      },
      sendMarkRead: (notificationId: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: 'mark_read', notificationId }));
          } catch (e) {}
        }
      },
      disconnect: () => {
        isExplicitlyClosed = true;
        if (pingInterval) clearInterval(pingInterval);
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
          try { ws.close(); } catch (e) {}
        }
      }
    };
  }
};
import { authFetch } from '../lib/authFetch';
