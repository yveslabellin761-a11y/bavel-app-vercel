import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { User, Profile, Message } from '../types';
import { activityService } from '../services/activityService';

// ============================================
// 1. TYPES
// ============================================

export type TabType = 'encounters' | 'discover' | 'likes' | 'discussions' | 'profile';

export interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface SwipeAction {
  userId: string;
  type: 'like' | 'pass' | 'superlike';
  timestamp: number;
}

export interface Notification {
  id: string;
  type: 'match' | 'message' | 'like' | 'superlike' | 'system';
  title: string;
  body?: string;
  userId?: string;
  read: boolean;
  createdAt: Date;
}

export interface AppState {
  // ============================================
  // NAVIGATION
  // ============================================
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  previousTab: TabType | null;
  navigateToTab: (tab: TabType, recordHistory?: boolean) => void;
  goBackToPreviousTab: () => void;
  navigationHistory: TabType[];
  clearNavigationHistory: () => void;

  // ============================================
  // ACTIVE CHAT
  // ============================================
  activeChatUserId: string | null;
  setActiveChatUserId: (userId: string | null) => void;
  activeChatProfile: any | null;
  setActiveChatProfile: (profile: any | null) => void;
  isChatOpen: boolean;
  openChat: (userId: string, profile?: any) => void;
  closeChat: () => void;

  // ============================================
  // SWIPES & LIKES (Optimistic)
  // ============================================
  likedUserIds: Set<string>;
  passedUserIds: Set<string>;
  superLikedUserIds: Set<string>;
  swipeHistory: SwipeAction[];
  swipeHistoryMax: number;
  
  addOptimisticLike: (userId: string) => void;
  addOptimisticPass: (userId: string) => void;
  addOptimisticSuperLike: (userId: string) => void;
  undoLastSwipe: () => SwipeAction | null;
  clearSwipes: () => void;
  isLiked: (userId: string) => boolean;
  isPassed: (userId: string) => boolean;
  isSuperLiked: (userId: string) => boolean;
  getLikedCount: () => number;
  getSwipeCount: () => number;
  getLastSwipe: () => SwipeAction | null;

  // ============================================
  // BLOCKED USERS
  // ============================================
  blockedUserIds: Set<string>;
  addBlockedUser: (userId: string) => void;
  removeBlockedUser: (userId: string) => void;
  isBlocked: (userId: string) => boolean;
  clearBlocked: () => void;

  // ============================================
  // UNREAD MESSAGES
  // ============================================
  unreadMessagesCount: Record<string, number>;
  incrementUnreadCount: (userId: string) => void;
  decrementUnreadCount: (userId: string) => void;
  clearUnreadCount: (userId: string) => void;
  getTotalUnreadCount: () => number;
  getUnreadCountForUser: (userId: string) => number;
  hasUnreadMessages: (userId: string) => boolean;
  markAllAsRead: () => void;

  // ============================================
  // NOTIFICATIONS
  // ============================================
  notifications: Notification[];
  unreadNotificationsCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  getUnreadNotificationsCount: () => number;

  // ============================================
  // SEARCH
  // ============================================
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
  clearSearch: () => void;
  searchFilters: Record<string, any>;
  setSearchFilter: (key: string, value: any) => void;
  clearSearchFilters: () => void;

  // ============================================
  // USER
  // ============================================
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  isLoggedIn: boolean;
  login: (user: User) => void;
  logout: () => void;

  // ============================================
  // PERFORMANCE & ACCESSIBILITY
  // ============================================
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
  lowDataMode: boolean;
  setLowDataMode: (lowData: boolean) => void;
  isOnline: boolean;
  setIsOnline: (status: boolean) => void;
  networkQuality: 'high' | 'medium' | 'low';
  setNetworkQuality: (quality: 'high' | 'medium' | 'low') => void;

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================
  toasts: Toast[];
  showToast: (message: string, options?: Partial<Omit<Toast, 'id' | 'message'>>) => string;
  hideToast: (id: string) => void;
  clearToasts: () => void;

  // ============================================
  // ERRORS
  // ============================================
  error: string | null;
  errorDetails: any | null;
  setError: (error: string | null, details?: any) => void;
  clearError: () => void;

  // ============================================
  // LAST ACTIVITY & SESSION
  // ============================================
  lastActivity: Date | null;
  updateLastActivity: () => void;
  sessionStart: Date | null;
  sessionDuration: number;
  getSessionDuration: () => number;

  // ============================================
  // ONBOARDING
  // ============================================
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  nextOnboardingStep: () => void;
  previousOnboardingStep: () => void;

  // ============================================
  // PREFERENCES
  // ============================================
  preferences: {
    language: string;
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    hapticEnabled: boolean;
    autoPlayVideos: boolean;
    showOnlineStatus: boolean;
  };
  updatePreference: <K extends keyof AppState['preferences']>(
    key: K,
    value: AppState['preferences'][K]
  ) => void;

  // ============================================
  // RESET
  // ============================================
  resetAll: () => void;
  resetSwipes: () => void;
  resetNotifications: () => void;
}

// ============================================
// 2. ÉTAT INITIAL
// ============================================

const initialState: Omit<AppState, 
  | 'setActiveTab'
  | 'navigateToTab'
  | 'goBackToPreviousTab'
  | 'clearNavigationHistory'
  | 'setActiveChatUserId'
  | 'setActiveChatProfile'
  | 'openChat'
  | 'closeChat'
  | 'addOptimisticLike'
  | 'addOptimisticPass'
  | 'addOptimisticSuperLike'
  | 'undoLastSwipe'
  | 'clearSwipes'
  | 'isLiked'
  | 'isPassed'
  | 'isSuperLiked'
  | 'getLikedCount'
  | 'getSwipeCount'
  | 'getLastSwipe'
  | 'addBlockedUser'
  | 'removeBlockedUser'
  | 'isBlocked'
  | 'clearBlocked'
  | 'incrementUnreadCount'
  | 'decrementUnreadCount'
  | 'clearUnreadCount'
  | 'getTotalUnreadCount'
  | 'getUnreadCountForUser'
  | 'hasUnreadMessages'
  | 'markAllAsRead'
  | 'addNotification'
  | 'markNotificationAsRead'
  | 'markAllNotificationsAsRead'
  | 'removeNotification'
  | 'clearNotifications'
  | 'getUnreadNotificationsCount'
  | 'setSearchQuery'
  | 'setIsSearching'
  | 'clearSearch'
  | 'setSearchFilter'
  | 'clearSearchFilters'
  | 'setCurrentUser'
  | 'updateCurrentUser'
  | 'login'
  | 'logout'
  | 'setReducedMotion'
  | 'setLowDataMode'
  | 'setIsOnline'
  | 'setNetworkQuality'
  | 'showToast'
  | 'hideToast'
  | 'clearToasts'
  | 'setError'
  | 'clearError'
  | 'updateLastActivity'
  | 'getSessionDuration'
  | 'setHasCompletedOnboarding'
  | 'setOnboardingStep'
  | 'nextOnboardingStep'
  | 'previousOnboardingStep'
  | 'updatePreference'
  | 'resetAll'
  | 'resetSwipes'
  | 'resetNotifications'
> = {
  // Navigation
  activeTab: 'encounters',
  previousTab: null,
  navigationHistory: ['encounters'],

  // Chat
  activeChatUserId: null,
  activeChatProfile: null,
  isChatOpen: false,

  // Swipes
  likedUserIds: new Set<string>(),
  passedUserIds: new Set<string>(),
  superLikedUserIds: new Set<string>(),
  swipeHistory: [],
  swipeHistoryMax: 100,

  // Blocked
  blockedUserIds: new Set<string>(),

  // Unread
  unreadMessagesCount: {},

  // Notifications
  notifications: [],
  unreadNotificationsCount: 0,

  // Search
  searchQuery: '',
  isSearching: false,
  searchFilters: {},

  // User
  currentUser: null,
  isLoggedIn: false,

  // Performance
  reducedMotion: false,
  lowDataMode: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  networkQuality: 'high' as 'high' | 'medium' | 'low',

  // Toast
  toasts: [],

  // Errors
  error: null,
  errorDetails: null,

  // Activity
  lastActivity: new Date(),
  sessionStart: new Date(),
  sessionDuration: 0,

  // Onboarding
  hasCompletedOnboarding: false,
  onboardingStep: 0,

  // Preferences
  preferences: {
    language: 'fr',
    notificationsEnabled: true,
    soundEnabled: true,
    hapticEnabled: true,
    autoPlayVideos: false,
    showOnlineStatus: true,
  },
};

// ============================================
// 3. STORE PRINCIPAL
// ============================================

export const useAppStore = create<AppState>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // ============================================
          // ÉTAT INITIAL
          // ============================================
          ...initialState,

          // ============================================
          // NAVIGATION
          // ============================================
          setActiveTab: (activeTab) => {
            set((state) => {
              state.activeTab = activeTab;
            });
          },

          navigateToTab: (tab: TabType, recordHistory = true) => {
            set((state) => {
              if (recordHistory) {
                state.previousTab = state.activeTab;
                state.navigationHistory.push(state.activeTab);
                if (state.navigationHistory.length > 50) {
                  state.navigationHistory.shift();
                }
              }
              state.activeTab = tab;
            });
          },

          goBackToPreviousTab: () => {
            set((state) => {
              if (state.navigationHistory.length > 1) {
                state.activeTab = state.navigationHistory.pop()!;
                state.previousTab = state.navigationHistory[state.navigationHistory.length - 1] || null;
              }
            });
          },

          clearNavigationHistory: () => {
            set((state) => {
              state.navigationHistory = [state.activeTab];
              state.previousTab = null;
            });
          },

          // ============================================
          // ACTIVE CHAT
          // ============================================
          setActiveChatUserId: (activeChatUserId) => {
            set((state) => {
              state.activeChatUserId = activeChatUserId;
              state.isChatOpen = !!activeChatUserId;
            });
          },

          setActiveChatProfile: (activeChatProfile) => {
            set((state) => {
              state.activeChatProfile = activeChatProfile;
            });
          },

          openChat: (userId: string, profile?: any) => {
            set((state) => {
              state.activeChatUserId = userId;
              state.activeChatProfile = profile || null;
              state.isChatOpen = true;
              // Marquer les messages comme lus
              if (state.unreadMessagesCount[userId]) {
                state.unreadMessagesCount[userId] = 0;
              }
            });
          },

          closeChat: () => {
            set((state) => {
              state.activeChatUserId = null;
              state.activeChatProfile = null;
              state.isChatOpen = false;
            });
          },

          // ============================================
          // SWIPES & LIKES
          // ============================================
          addOptimisticLike: (userId: string) => {
            set((state) => {
              state.likedUserIds.add(userId);
              state.swipeHistory.push({
                userId,
                type: 'like',
                timestamp: Date.now(),
              });
              if (state.swipeHistory.length > state.swipeHistoryMax) {
                state.swipeHistory.shift();
              }
            });
            activityService.recordActivity('like');
            activityService.recordActivity('swipe');
          },

          addOptimisticPass: (userId: string) => {
            set((state) => {
              state.passedUserIds.add(userId);
              state.swipeHistory.push({
                userId,
                type: 'pass',
                timestamp: Date.now(),
              });
              if (state.swipeHistory.length > state.swipeHistoryMax) {
                state.swipeHistory.shift();
              }
            });
            activityService.recordActivity('swipe');
          },

          addOptimisticSuperLike: (userId: string) => {
            set((state) => {
              state.superLikedUserIds.add(userId);
              state.likedUserIds.add(userId);
              state.swipeHistory.push({
                userId,
                type: 'superlike',
                timestamp: Date.now(),
              });
              if (state.swipeHistory.length > state.swipeHistoryMax) {
                state.swipeHistory.shift();
              }
            });
            activityService.recordActivity('like');
            activityService.recordActivity('swipe');
          },

          undoLastSwipe: () => {
            const lastSwipe = get().swipeHistory[get().swipeHistory.length - 1];
            if (!lastSwipe) return null;

            set((state) => {
              state.swipeHistory.pop();
              state.likedUserIds.delete(lastSwipe.userId);
              state.passedUserIds.delete(lastSwipe.userId);
              state.superLikedUserIds.delete(lastSwipe.userId);
            });

            return lastSwipe;
          },

          clearSwipes: () => {
            set((state) => {
              state.likedUserIds = new Set();
              state.passedUserIds = new Set();
              state.superLikedUserIds = new Set();
              state.swipeHistory = [];
            });
          },

          isLiked: (userId: string) => get().likedUserIds.has(userId),
          isPassed: (userId: string) => get().passedUserIds.has(userId),
          isSuperLiked: (userId: string) => get().superLikedUserIds.has(userId),

          getLikedCount: () => get().likedUserIds.size,
          getSwipeCount: () => get().swipeHistory.length,
          getLastSwipe: () => {
            const history = get().swipeHistory;
            return history.length > 0 ? history[history.length - 1] : null;
          },

          // ============================================
          // BLOCKED USERS
          // ============================================
          addBlockedUser: (userId: string) => {
            set((state) => {
              state.blockedUserIds.add(userId);
              // Nettoyer les likes/pass pour l'utilisateur bloqué
              state.likedUserIds.delete(userId);
              state.passedUserIds.delete(userId);
              state.superLikedUserIds.delete(userId);
            });
          },

          removeBlockedUser: (userId: string) => {
            set((state) => {
              state.blockedUserIds.delete(userId);
            });
          },

          isBlocked: (userId: string) => get().blockedUserIds.has(userId),

          clearBlocked: () => {
            set((state) => {
              state.blockedUserIds = new Set();
            });
          },

          // ============================================
          // UNREAD MESSAGES
          // ============================================
          incrementUnreadCount: (userId: string) => {
            set((state) => {
              state.unreadMessagesCount[userId] = (state.unreadMessagesCount[userId] || 0) + 1;
            });
          },

          decrementUnreadCount: (userId: string) => {
            set((state) => {
              if (state.unreadMessagesCount[userId] && state.unreadMessagesCount[userId] > 0) {
                state.unreadMessagesCount[userId]--;
              }
            });
          },

          clearUnreadCount: (userId: string) => {
            set((state) => {
              delete state.unreadMessagesCount[userId];
            });
          },

          getTotalUnreadCount: () => {
            const state = get();
            return Object.values(state.unreadMessagesCount).reduce((a, b) => a + b, 0);
          },

          getUnreadCountForUser: (userId: string) => {
            return get().unreadMessagesCount[userId] || 0;
          },

          hasUnreadMessages: (userId: string) => {
            return (get().unreadMessagesCount[userId] || 0) > 0;
          },

          markAllAsRead: () => {
            set((state) => {
              state.unreadMessagesCount = {};
            });
          },

          // ============================================
          // NOTIFICATIONS
          // ============================================
          addNotification: (notification) => {
            const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            const newNotif: Notification = {
              ...notification,
              id,
              read: false,
              createdAt: new Date(),
            };
            set((state) => {
              state.notifications.unshift(newNotif);
              if (state.notifications.length > 100) {
                state.notifications.pop();
              }
              state.unreadNotificationsCount = state.notifications.filter(n => !n.read).length;
            });
          },

          markNotificationAsRead: (id: string) => {
            set((state) => {
              const notif = state.notifications.find(n => n.id === id);
              if (notif && !notif.read) {
                notif.read = true;
                state.unreadNotificationsCount = state.notifications.filter(n => !n.read).length;
              }
            });
          },

          markAllNotificationsAsRead: () => {
            set((state) => {
              state.notifications.forEach(n => n.read = true);
              state.unreadNotificationsCount = 0;
            });
          },

          removeNotification: (id: string) => {
            set((state) => {
              state.notifications = state.notifications.filter(n => n.id !== id);
              state.unreadNotificationsCount = state.notifications.filter(n => !n.read).length;
            });
          },

          clearNotifications: () => {
            set((state) => {
              state.notifications = [];
              state.unreadNotificationsCount = 0;
            });
          },

          getUnreadNotificationsCount: () => get().unreadNotificationsCount,

          // ============================================
          // SEARCH
          // ============================================
          setSearchQuery: (searchQuery) => {
            set((state) => {
              state.searchQuery = searchQuery;
            });
          },

          setIsSearching: (isSearching) => {
            set((state) => {
              state.isSearching = isSearching;
            });
          },

          clearSearch: () => {
            set((state) => {
              state.searchQuery = '';
              state.isSearching = false;
              state.searchFilters = {};
            });
          },

          setSearchFilter: (key: string, value: any) => {
            set((state) => {
              state.searchFilters[key] = value;
            });
          },

          clearSearchFilters: () => {
            set((state) => {
              state.searchFilters = {};
            });
          },

          // ============================================
          // USER
          // ============================================
          setCurrentUser: (user) => {
            set((state) => {
              state.currentUser = user;
              state.isLoggedIn = !!user;
            });
          },

          updateCurrentUser: (updates) => {
            set((state) => {
              if (state.currentUser) {
                state.currentUser = { ...state.currentUser, ...updates };
              }
            });
          },

          login: (user) => {
            set((state) => {
              state.currentUser = user;
              state.isLoggedIn = true;
              state.sessionStart = new Date();
            });
          },

          logout: () => {
            set((state) => {
              state.currentUser = null;
              state.isLoggedIn = false;
              state.likedUserIds = new Set();
              state.passedUserIds = new Set();
              state.superLikedUserIds = new Set();
              state.swipeHistory = [];
              state.unreadMessagesCount = {};
              state.notifications = [];
              state.unreadNotificationsCount = 0;
            });
          },

          // ============================================
          // PERFORMANCE & ACCESSIBILITY
          // ============================================
          setReducedMotion: (reducedMotion) => {
            set((state) => {
              state.reducedMotion = reducedMotion;
            });
          },

          setLowDataMode: (lowDataMode) => {
            set((state) => {
              state.lowDataMode = lowDataMode;
            });
          },

          setIsOnline: (isOnline) => {
            set((state) => {
              state.isOnline = isOnline;
            });
          },

          setNetworkQuality: (networkQuality) => {
            set((state) => {
              state.networkQuality = networkQuality;
              if (networkQuality === 'low') {
                state.lowDataMode = true;
              }
            });
          },

          // ============================================
          // TOAST
          // ============================================
          showToast: (message, options = {}) => {
            const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            const toast: Toast = {
              id,
              message,
              type: options.type || 'info',
              duration: options.duration || 3000,
              action: options.action,
            };
            set((state) => {
              state.toasts.push(toast);
              if (state.toasts.length > 5) {
                state.toasts.shift();
              }
            });
            if (toast.duration && toast.duration > 0) {
              setTimeout(() => {
                get().hideToast(id);
              }, toast.duration);
            }
            return id;
          },

          hideToast: (id) => {
            set((state) => {
              state.toasts = state.toasts.filter(t => t.id !== id);
            });
          },

          clearToasts: () => {
            set((state) => {
              state.toasts = [];
            });
          },

          // ============================================
          // ERRORS
          // ============================================
          setError: (error, details) => {
            set((state) => {
              state.error = error;
              state.errorDetails = details || null;
            });
            if (error) {
              // Afficher un toast d'erreur
              get().showToast(error, { type: 'error' });
            }
          },

          clearError: () => {
            set((state) => {
              state.error = null;
              state.errorDetails = null;
            });
          },

          // ============================================
          // ACTIVITY & SESSION
          // ============================================
          updateLastActivity: () => {
            set((state) => {
              state.lastActivity = new Date();
            });
          },

          getSessionDuration: () => {
            const state = get();
            if (!state.sessionStart) return 0;
            return Math.floor((Date.now() - state.sessionStart.getTime()) / 1000);
          },

          // ============================================
          // ONBOARDING
          // ============================================
          setHasCompletedOnboarding: (hasCompletedOnboarding) => {
            set((state) => {
              state.hasCompletedOnboarding = hasCompletedOnboarding;
            });
          },

          setOnboardingStep: (onboardingStep) => {
            set((state) => {
              state.onboardingStep = onboardingStep;
            });
          },

          nextOnboardingStep: () => {
            set((state) => {
              state.onboardingStep++;
            });
          },

          previousOnboardingStep: () => {
            set((state) => {
              if (state.onboardingStep > 0) {
                state.onboardingStep--;
              }
            });
          },

          // ============================================
          // PREFERENCES
          // ============================================
          updatePreference: (key, value) => {
            set((state) => {
              state.preferences[key] = value;
            });
          },

          // ============================================
          // RESET
          // ============================================
          resetAll: () => {
            set(() => initialState);
          },

          resetSwipes: () => {
            set((state) => {
              state.likedUserIds = new Set();
              state.passedUserIds = new Set();
              state.superLikedUserIds = new Set();
              state.swipeHistory = [];
            });
          },

          resetNotifications: () => {
            set((state) => {
              state.notifications = [];
              state.unreadNotificationsCount = 0;
              state.unreadMessagesCount = {};
            });
          },
        })),
        {
          name: 'bavel-app-storage',
          version: 1,
          partialize: (state) => ({
            // Ne persiste que ce qui est nécessaire
            activeTab: state.activeTab,
            reducedMotion: state.reducedMotion,
            lowDataMode: state.lowDataMode,
            searchQuery: state.searchQuery,
            searchFilters: state.searchFilters,
            preferences: state.preferences,
            hasCompletedOnboarding: state.hasCompletedOnboarding,
            onboardingStep: state.onboardingStep,
            blockedUserIds: Array.from(state.blockedUserIds),
            unreadMessagesCount: state.unreadMessagesCount,
            likedUserIds: Array.from(state.likedUserIds),
            superLikedUserIds: Array.from(state.superLikedUserIds),
            passedUserIds: Array.from(state.passedUserIds),
            swipeHistory: state.swipeHistory,
            notifications: state.notifications,
            isLoggedIn: state.isLoggedIn,
            currentUser: state.currentUser,
          }),
          merge: (persistedState: any, currentState) => {
            // Reconstitue les Sets depuis les Arrays persistés
            return {
              ...currentState,
              ...persistedState,
              likedUserIds: new Set(persistedState.likedUserIds || []),
              superLikedUserIds: new Set(persistedState.superLikedUserIds || []),
              passedUserIds: new Set(persistedState.passedUserIds || []),
              blockedUserIds: new Set(persistedState.blockedUserIds || []),
              swipeHistory: persistedState.swipeHistory || [],
              notifications: persistedState.notifications || [],
              unreadMessagesCount: persistedState.unreadMessagesCount || {},
            };
          },
        }
      )
    ),
    { name: 'BavelAppStore', enabled: process.env.NODE_ENV === 'development' }
  )
);

// ============================================
// 4. SÉLECTEURS PERSONNALISÉS
// ============================================

// Navigation
export const useActiveTab = () => useAppStore((state) => state.activeTab);
export const useCanGoBack = () => useAppStore((state) => state.navigationHistory.length > 1);

// Chat
export const useActiveChat = () => useAppStore((state) => ({
  userId: state.activeChatUserId,
  profile: state.activeChatProfile,
  isOpen: state.isChatOpen,
}));

// Swipes
export const useLikedCount = () => useAppStore((state) => state.likedUserIds.size);
export const useIsLiked = (userId: string) => useAppStore((state) => state.likedUserIds.has(userId));
export const useIsPassed = (userId: string) => useAppStore((state) => state.passedUserIds.has(userId));
export const useIsSuperLiked = (userId: string) => useAppStore((state) => state.superLikedUserIds.has(userId));
export const useCanUndo = () => useAppStore((state) => state.swipeHistory.length > 0);
export const useSwipeHistory = () => useAppStore((state) => state.swipeHistory);

// Unread
export const useTotalUnreadCount = () => useAppStore((state) => {
  return Object.values(state.unreadMessagesCount).reduce((a, b) => a + b, 0);
});
export const useUnreadCountForUser = (userId: string) => 
  useAppStore((state) => state.unreadMessagesCount[userId] || 0);
export const useHasUnreadMessages = (userId: string) => 
  useAppStore((state) => (state.unreadMessagesCount[userId] || 0) > 0);

// Notifications
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useUnreadNotificationsCount = () => 
  useAppStore((state) => state.unreadNotificationsCount);
export const useHasUnreadNotifications = () => 
  useAppStore((state) => state.unreadNotificationsCount > 0);

// User
export const useCurrentUser = () => useAppStore((state) => state.currentUser);
export const useIsLoggedIn = () => useAppStore((state) => state.isLoggedIn);

// Performance
export const useReducedMotion = () => useAppStore((state) => state.reducedMotion);
export const useLowDataMode = () => useAppStore((state) => state.lowDataMode);
export const useIsOnline = () => useAppStore((state) => state.isOnline);
export const useNetworkQuality = () => useAppStore((state) => state.networkQuality);

// Preferences
export const usePreferences = () => useAppStore((state) => state.preferences);
export const usePreference = <K extends keyof AppState['preferences']>(key: K) => 
  useAppStore((state) => state.preferences[key]);

// Onboarding
export const useOnboardingStep = () => useAppStore((state) => state.onboardingStep);
export const useHasCompletedOnboarding = () => 
  useAppStore((state) => state.hasCompletedOnboarding);

// ============================================
// 5. EXPORT
// ============================================

export default useAppStore;