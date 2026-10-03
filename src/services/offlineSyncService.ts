/**
 * Robust Offline Action Sync Manager
 * Queues mutations when offline and processes them sequentially with backoff upon reconnection.
 */

export type OfflineActionType = 'LIKE_USER' | 'PASS_USER' | 'SUPERLIKE_USER' | 'SEND_MESSAGE' | 'UPDATE_PROFILE';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  userId: string;
  payload: any;
  timestamp: number;
  retryCount: number;
  nextAttemptAt: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

const LEGACY_STORAGE_KEY = 'bavel_offline_action_queue';
const STORAGE_KEY_PREFIX = 'bavel_offline_action_queue:';

async function getAuthenticatedUserId(): Promise<string | null> {
  const { getSupabase } = await import('../lib/supabase');
  const { data, error } = await getSupabase().auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

export class OfflineSyncService {
  private queue: OfflineAction[] = [];
  private userId: string | null = null;
  private bindingGeneration = 0;
  private isProcessing = false;
  private listeners: ((queue: OfflineAction[]) => void)[] = [];
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private actionExecutor: (action: OfflineAction) => Promise<void>;

  constructor(
    actionExecutor?: (action: OfflineAction) => Promise<void>,
    private readonly resolveUserId: () => Promise<string | null> = getAuthenticatedUserId
  ) {
    this.actionExecutor = actionExecutor ?? ((action) => this.executeAction(action));
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
    }
  }

  private readonly handleOnline = () => {
    void this.processQueue();
  };

  private storageKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${encodeURIComponent(userId)}`;
  }

  private loadQueue(userId: string): void {
    try {
      const stored = localStorage.getItem(this.storageKey(userId));
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (!Array.isArray(parsed)) throw new Error('Offline queue must be an array.');
        this.queue = parsed
          .filter(
            (action): action is OfflineAction =>
              Boolean(action) &&
              typeof action.id === 'string' &&
              ['LIKE_USER', 'PASS_USER', 'SUPERLIKE_USER', 'SEND_MESSAGE', 'UPDATE_PROFILE'].includes(action.type) &&
              action.userId === userId &&
              typeof action.timestamp === 'number' &&
              typeof action.retryCount === 'number' &&
              ['pending', 'syncing', 'failed'].includes(action.status)
          )
          .map((action) => ({
            ...action,
            nextAttemptAt: Number.isFinite(action.nextAttemptAt) ? action.nextAttemptAt : 0,
            status: action.status === 'syncing' ? 'pending' : action.status
          }));
      }
    } catch (error) {
      console.error('Offline action queue could not be restored:', error);
      this.queue = [];
    }

    this.migrateLegacyQueue(userId);
  }

  private migrateLegacyQueue(userId: string): void {
    try {
      const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) throw new Error('Legacy offline queue must be an array.');

      const migratedIds = new Set<string>();
      const matchingActions = parsed.flatMap((action): OfflineAction[] => {
        if (!action || typeof action !== 'object') return [];
        const legacy = action as Partial<OfflineAction>;
        const payload = legacy.payload;
        const owner = payload?.userId || payload?.senderId || payload?.profile?.id;
        if (
          owner !== userId ||
          typeof legacy.id !== 'string' ||
          !['LIKE_USER', 'PASS_USER', 'SUPERLIKE_USER', 'SEND_MESSAGE', 'UPDATE_PROFILE'].includes(
            String(legacy.type)
          ) ||
          !['pending', 'failed', 'syncing'].includes(String(legacy.status)) ||
          typeof legacy.timestamp !== 'number'
        ) {
          return [];
        }
        migratedIds.add(legacy.id);
        return [
          {
            ...(legacy as OfflineAction),
            userId,
            retryCount: Number.isFinite(legacy.retryCount) ? Number(legacy.retryCount) : 0,
            nextAttemptAt: Number.isFinite(legacy.nextAttemptAt) ? Number(legacy.nextAttemptAt) : 0,
            status: legacy.status === 'syncing' ? 'pending' : legacy.status === 'failed' ? 'failed' : 'pending'
          }
        ];
      });
      if (!migratedIds.size) return;

      const actionsById = new Map([...this.queue, ...matchingActions].map((action) => [action.id, action]));
      const migratedQueue = [...actionsById.values()];
      localStorage.setItem(this.storageKey(userId), JSON.stringify(migratedQueue));
      this.queue = migratedQueue;

      const remainingLegacy = parsed.filter(
        (action) => !action || typeof action !== 'object' || !migratedIds.has(String((action as { id?: unknown }).id))
      );
      if (remainingLegacy.length) localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(remainingLegacy));
      else localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      console.error('Legacy offline action queue could not be migrated:', error);
      throw new Error('Impossible de sécuriser les anciennes actions hors ligne sur cet appareil.');
    }
  }

  private saveQueue(): void {
    if (!this.userId) {
      throw new Error('Une session utilisateur est requise pour enregistrer des actions hors ligne.');
    }
    try {
      localStorage.setItem(this.storageKey(this.userId), JSON.stringify(this.queue));
    } catch (error) {
      console.error('Offline action queue could not be persisted:', error);
      throw new Error('Impossible d’enregistrer les actions hors ligne sur cet appareil.');
    }
    this.notifyListeners();
  }

  public subscribe(listener: (queue: OfflineAction[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.queue);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l([...this.queue]));
  }

  public getQueue(): OfflineAction[] {
    return [...this.queue];
  }

  public getPendingCount(): number {
    return this.queue.filter((a) => a.status === 'pending' || a.status === 'failed').length;
  }

  public bindUser(userId: string | null): void {
    if (userId === this.userId) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.userId = userId;
    this.bindingGeneration += 1;
    this.queue = [];
    if (userId) {
      try {
        this.loadQueue(userId);
      } catch (error) {
        console.error('Offline actions could not be isolated for the active account:', error);
        this.queue = [];
      }
    }
    this.notifyListeners();
  }

  private async matchesAuthenticatedUser(userId: string): Promise<boolean> {
    try {
      return (await this.resolveUserId()) === userId;
    } catch (error) {
      console.error('Offline synchronization paused because the active session could not be verified:', error);
      return false;
    }
  }

  public enqueue(type: OfflineActionType, payload: any): OfflineAction {
    const ownerId = payload?.userId || payload?.senderId || payload?.profile?.id;
    if (!this.userId || ownerId !== this.userId) {
      throw new Error('La session active ne correspond pas au compte de cette action hors ligne.');
    }
    const action: OfflineAction = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      userId: this.userId,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      nextAttemptAt: 0,
      status: 'pending'
    };

    this.queue.push(action);
    try {
      this.saveQueue();
    } catch (error) {
      this.queue = this.queue.filter((queued) => queued.id !== action.id);
      throw error;
    }

    // If we are currently online, process immediately in the background
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void this.processQueue();
    }

    return action;
  }

  public async processQueue(retryFailed = false): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || !this.userId) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    this.isProcessing = true;
    const processingUserId = this.userId;
    const processingGeneration = this.bindingGeneration;
    let canScheduleRetry = true;

    try {
      if (!(await this.matchesAuthenticatedUser(processingUserId))) {
        canScheduleRetry = false;
        return;
      }
      if (this.bindingGeneration !== processingGeneration) {
        canScheduleRetry = false;
        return;
      }
      if (retryFailed) {
        this.queue.forEach((action) => {
          if (action.status === 'failed') {
            action.status = 'pending';
            action.retryCount = 0;
            action.nextAttemptAt = 0;
          }
        });
      }
      const pendingActions = this.queue.filter(
        (action) => action.status === 'pending' && action.nextAttemptAt <= Date.now()
      );

      for (const action of pendingActions) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) break;
        if (
          action.userId !== processingUserId ||
          this.bindingGeneration !== processingGeneration ||
          !(await this.matchesAuthenticatedUser(action.userId))
        ) {
          canScheduleRetry = false;
          break;
        }
        action.status = 'syncing';
        this.saveQueue();

        try {
          await this.actionExecutor(action);
          if (this.bindingGeneration !== processingGeneration) {
            canScheduleRetry = false;
            break;
          }
          action.status = 'completed';
        } catch (error) {
          if (this.bindingGeneration !== processingGeneration) {
            canScheduleRetry = false;
            break;
          }
          console.warn(`[Sync] Failed action ${action.id}:`, error);
          action.retryCount += 1;
          action.status = action.retryCount >= 5 ? 'failed' : 'pending';
          action.nextAttemptAt = Date.now() + Math.min(5 * 60_000, 1000 * 2 ** action.retryCount);
        }

        this.saveQueue();
      }

      this.queue = this.queue.filter((action) => action.status !== 'completed');
      this.saveQueue();
    } finally {
      this.isProcessing = false;
      if (this.bindingGeneration !== processingGeneration) {
        if (this.userId && (typeof navigator === 'undefined' || navigator.onLine)) {
          void this.processQueue();
        }
      } else if (canScheduleRetry) {
        this.scheduleRetry();
      }
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const nextRetry = this.queue
      .filter((action) => action.status === 'pending')
      .reduce((soonest, action) => Math.min(soonest, action.nextAttemptAt), Infinity);
    if (!Number.isFinite(nextRetry)) return;
    this.retryTimer = setTimeout(
      () => {
        void this.processQueue();
      },
      Math.max(0, nextRetry - Date.now())
    );
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'LIKE_USER': {
        const { userId, targetId } = action.payload;
        const { saveLikeToSupabase } = await import('../lib/supabase');
        const result = await saveLikeToSupabase(userId, targetId, false);
        if (!result.data) throw new Error('Like non synchronisé.');
        break;
      }
      case 'SUPERLIKE_USER': {
        const { userId, targetId } = action.payload;
        const { saveLikeToSupabase } = await import('../lib/supabase');
        const result = await saveLikeToSupabase(userId, targetId, true);
        if (!result.data) throw new Error('Super-like non synchronisé.');
        break;
      }
      case 'PASS_USER': {
        const { userId, targetId } = action.payload;
        const { saveSwipeToSupabase } = await import('../lib/supabase');
        const result = await saveSwipeToSupabase(userId, targetId, false);
        if (result.error) throw new Error(result.error);
        break;
      }
      case 'SEND_MESSAGE': {
        const { senderId, targetId, text, clientMessageId } = action.payload;
        const { chatService } = await import('./chatService');
        const sent = await chatService.sendMessage(senderId, targetId, text, 'text', clientMessageId);
        if (!sent.id) throw new Error('Le serveur n’a pas confirmé le message.');
        break;
      }
      case 'UPDATE_PROFILE': {
        const { profile } = action.payload;
        const { syncProfileToSupabase } = await import('../lib/supabase');
        const result = await syncProfileToSupabase(profile);
        if (!result) throw new Error('Profil non synchronisé.');
        break;
      }
      default:
        throw new Error(`Action hors ligne inconnue: ${String(action.type)}`);
    }
  }

  public clearQueue(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const previousQueue = this.queue;
    this.queue = [];
    try {
      this.saveQueue();
    } catch (error) {
      this.queue = previousQueue;
      throw error;
    }
  }

  public dispose(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    if (typeof window !== 'undefined') window.removeEventListener('online', this.handleOnline);
    this.listeners = [];
  }
}

export const offlineSyncService = new OfflineSyncService();
