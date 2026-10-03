/**
 * Heartbeat & Presence Service (Badoo Live Status)
 * Manages WebSocket / SSE heartbeat signals and real-time online status determination.
 */
import { authFetch } from '../lib/authFetch';

export interface PresenceState {
  isOnline: boolean;
  lastActiveText: string;
  heartbeatTimestamp: number;
}

class PresenceService {
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInFlight = false;
  private listeners: Set<() => void> = new Set();
  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') void this.sendHeartbeat();
  };

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Starts periodic 30-second heartbeat ping to backend / WebSocket server
   */
  public startHeartbeat() {
    if (this.heartbeatInterval) return;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    // Send initial heartbeat
    this.sendHeartbeat();

    // Loop every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  /**
   * Stops heartbeat ping when app unmounts
   */
  public stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private async sendHeartbeat() {
    if (this.heartbeatInFlight || typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    this.heartbeatInFlight = true;
    try {
      const response = await authFetch('/api/presence/heartbeat', { method: 'POST' });
      if (response.status === 401) return;
      if (!response.ok) {
        throw new Error(`Presence heartbeat failed with status ${response.status}.`);
      }
      this.notify();
    } catch (error) {
      console.error('Presence heartbeat failed:', error);
    } finally {
      this.heartbeatInFlight = false;
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  /**
   * Deterministically returns the presence state for any profile.
   * If profile has explicit online properties or is active recently, returns formatted presence.
   */
  public getPresenceForProfile(profile: any): PresenceState {
    if (!profile) {
      return { isOnline: false, lastActiveText: 'Hors ligne', heartbeatTimestamp: 0 };
    }

    const lastActive = profile.last_active_at ? new Date(profile.last_active_at).getTime() : 0;
    const isOnline = Boolean(profile.is_online ?? profile.isOnline) &&
      lastActive > Date.now() - 90_000;
    if (isOnline) {
      return { isOnline: true, lastActiveText: 'En ligne', heartbeatTimestamp: Date.now() };
    }
    const minutesAgo = lastActive
      ? Math.max(1, Math.floor((Date.now() - lastActive) / 60000))
      : null;
    return {
      isOnline: false,
      lastActiveText: minutesAgo ? `Actif il y a ${minutesAgo} min` : 'Hors ligne',
      heartbeatTimestamp: lastActive,
    };
  }
}

export const presenceService = new PresenceService();
