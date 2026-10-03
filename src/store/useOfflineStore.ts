import { create } from 'zustand';
import { offlineSyncService, OfflineAction } from '../services/offlineSyncService';

interface OfflineStoreState {
  queue: OfflineAction[];
  pendingCount: number;
  isSyncing: boolean;
  enqueueAction: (type: OfflineAction['type'], payload: any) => OfflineAction;
  triggerManualSync: () => Promise<void>;
  clearQueue: () => void;
}

export const useOfflineStore = create<OfflineStoreState>((set, get) => {
  // Subscribe to the singleton service
  offlineSyncService.subscribe((queue) => {
    set({
      queue,
      pendingCount: queue.filter((a) => a.status === 'pending' || a.status === 'failed').length,
      isSyncing: queue.some((a) => a.status === 'syncing')
    });
  });

  return {
    queue: offlineSyncService.getQueue(),
    pendingCount: offlineSyncService.getPendingCount(),
    isSyncing: false,

    enqueueAction: (type, payload) => {
      return offlineSyncService.enqueue(type, payload);
    },

    triggerManualSync: async () => {
      set({ isSyncing: true });
      try {
        await offlineSyncService.processQueue(true);
      } finally {
        set({ isSyncing: false });
      }
    },

    clearQueue: () => {
      offlineSyncService.clearQueue();
    }
  };
});
