import React, { lazy, Suspense } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

// ============================================
// 1. TYPES
// ============================================

export interface RouteConfig {
  path: string;
  component: LazyExoticComponent<ComponentType<any>>;
  preload?: () => Promise<unknown>;
  prefetch?: boolean;
  exact?: boolean;
  fallback?: React.ReactNode;
  title?: string;
  description?: string;
  requiresAuth?: boolean;
  roles?: string[];
  meta?: Record<string, any>;
}

export interface RouteModule {
  default: ComponentType<any>;
  preload?: () => Promise<void>;
}

// ============================================
// 2. LAZY LOADED COMPONENTS
// ============================================

/**
 * Lazy loaded feature modules with code splitting
 * to achieve instant cold-start time and optimal performance.
 */

// === FEATURES PRINCIPALES ===

const loadEncountersModule = () => import('../components/mobile/rencontres/EncountersTab');

export const LazyGeoRadar = lazy(() =>
  import('../features/geolocation/GeoRadarView')
    .then((m) => ({
      default: m.GeoRadarView,
    }))
    .catch((error) => {
      console.error('Failed to load GeoRadarView:', error);
      return { default: () => <div>Erreur de chargement du radar</div> };
    })
);

export const LazyVirtualSwipeDeck = lazy(() =>
  import('../features/swipes/VirtualSwipeDeck')
    .then((m) => ({
      default: m.VirtualSwipeDeck,
    }))
    .catch((error) => {
      console.error('Failed to load VirtualSwipeDeck:', error);
      return { default: () => <div>Erreur de chargement du deck</div> };
    })
);

export const LazyOptimisticChatBox = lazy(() =>
  import('../features/chat/OptimisticChatBox')
    .then((m) => ({
      default: m.OptimisticChatBox,
    }))
    .catch((error) => {
      console.error('Failed to load OptimisticChatBox:', error);
      return { default: () => <div>Erreur de chargement du chat</div> };
    })
);

// === FEATURES SUPPLEMENTAIRES ===

export const LazyProfileModal = lazy(() =>
  import('../components/profile/UserProfileView')
    .then((m) => ({
      default: (m as any).UserProfileView || m.default,
    }))
    .catch((error) => {
      console.error('Failed to load ProfileModal:', error);
      return { default: () => <div>Erreur de chargement du profil</div> };
    })
);

export const LazyLikesTab = lazy(() =>
  import('../components/mobile/likes/LikesTab')
    .then((m) => ({
      default: m.LikesTab,
    }))
    .catch((error) => {
      console.error('Failed to load LikesTab:', error);
      return { default: () => <div>Erreur de chargement des likes</div> };
    })
);

export const LazyDiscussionsTab = lazy(() =>
  import('../components/mobile/discussions/DiscussionsTab')
    .then((m) => ({
      default: m.DiscussionsTab,
    }))
    .catch((error) => {
      console.error('Failed to load DiscussionsTab:', error);
      return { default: () => <div>Erreur de chargement des discussions</div> };
    })
);

export const LazyEncountersTab = lazy(() =>
  loadEncountersModule()
    .then((m) => ({
      default: m.EncountersTab,
    }))
    .catch((error) => {
      console.error('Failed to load EncountersTab:', error);
      return { default: () => <div>Erreur de chargement des rencontres</div> };
    })
);

export const LazyLoginScreen = lazy(() =>
  import('../components/auth/LoginScreen')
    .then((m) => ({
      default: m.LoginScreen,
    }))
    .catch((error) => {
      console.error('Failed to load LoginScreen:', error);
      return { default: () => <div>Erreur de chargement de la connexion</div> };
    })
);

export const LazyRegisterWizard = lazy(() =>
  import('../components/auth/RegisterWizard')
    .then((m) => ({
      default: m.RegisterWizard,
    }))
    .catch((error) => {
      console.error('Failed to load RegisterWizard:', error);
      return { default: () => <div>Erreur de chargement de l\'inscription</div> };
    })
);

export const LazyPremiumModal = lazy(() =>
  import('../components/modals/BavelPremiumModal')
    .then((m) => ({
      default: (m as any).BavelPremiumModal || m.default,
    }))
    .catch((error) => {
      console.error('Failed to load PremiumModal:', error);
      return { default: () => <div>Erreur de chargement du premium</div> };
    })
);

// ============================================
// 3. FALLBACK COMPONENTS
// ============================================

export const DefaultFallback: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400 font-medium">Chargement...</p>
    </div>
  </div>
);

export const PageFallback: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex items-center justify-center h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-base text-gray-400 font-medium">
        {message || 'Chargement de la page...'}
      </p>
    </div>
  </div>
);

// ============================================
// 4. ROUTE CONFIGURATION
// ============================================

export const ROUTES: RouteConfig[] = [
  // === AUTH ===
  {
    path: '/login',
    component: LazyLoginScreen,
    exact: true,
    title: 'Connexion',
    description: 'Connectez-vous à votre compte Bavel',
  },
  {
    path: '/register',
    component: LazyRegisterWizard,
    exact: true,
    title: 'Inscription',
    description: 'Créez votre compte Bavel',
  },

  // === MAIN ===
  {
    path: '/',
    component: LazyEncountersTab,
    exact: true,
    preload: loadEncountersModule,
    prefetch: true,
    title: 'Rencontres',
    description: 'Découvrez des personnes près de chez vous',
    requiresAuth: true,
  },
  {
    path: '/encounters',
    component: LazyEncountersTab,
    exact: true,
    preload: loadEncountersModule,
    prefetch: true,
    title: 'Rencontres',
    description: 'Découvrez des personnes près de chez vous',
    requiresAuth: true,
  },
  {
    path: '/likes',
    component: LazyLikesTab,
    exact: true,
    title: 'Likes',
    description: 'Vos likes reçus et envoyés',
    requiresAuth: true,
  },
  {
    path: '/discussions',
    component: LazyDiscussionsTab,
    exact: true,
    title: 'Discussions',
    description: 'Vos conversations',
    requiresAuth: true,
  },
  {
    path: '/chat/:userId',
    component: LazyOptimisticChatBox,
    exact: false,
    title: 'Chat',
    description: 'Conversation en cours',
    requiresAuth: true,
  },
  {
    path: '/profile/:userId?',
    component: LazyProfileModal,
    exact: false,
    title: 'Profil',
    description: 'Profil utilisateur',
    requiresAuth: true,
  },

  // === PREMIUM ===
  {
    path: '/premium',
    component: LazyPremiumModal,
    exact: true,
    title: 'Bavel Premium',
    description: 'Découvrez les avantages Premium',
    requiresAuth: true,
  },

  // === RADAR ===
  {
    path: '/radar',
    component: LazyGeoRadar,
    exact: true,
    title: 'Radar',
    description: 'Personnes à proximité',
    requiresAuth: true,
  },
];

// ============================================
// 5. ROUTE HELPERS
// ============================================

export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return ROUTES.find((route) => {
    if (route.exact) {
      return route.path === path;
    }
    // Support des paramètres dynamiques (/chat/:userId)
    const routeParts = route.path.split('/');
    const pathParts = path.split('/');
    if (routeParts.length !== pathParts.length) return false;
    return routeParts.every((part, i) => part.startsWith(':') || part === pathParts[i]);
  });
};

export const getRouteByComponent = (component: LazyExoticComponent<any>): RouteConfig | undefined => {
  return ROUTES.find((route) => route.component === component);
};

export const getRoutesByAuth = (requiresAuth: boolean): RouteConfig[] => {
  return ROUTES.filter((route) => route.requiresAuth === requiresAuth);
};

export const getRoutesByRole = (role: string): RouteConfig[] => {
  return ROUTES.filter((route) => route.roles?.includes(role));
};

export const getTitle = (path: string): string => {
  const route = getRouteByPath(path);
  return route?.title || 'Bavel';
};

export const getDescription = (path: string): string => {
  const route = getRouteByPath(path);
  return route?.description || 'Application de rencontres Bavel';
};

// ============================================
// 6. PREFETCHING
// ============================================

/** Preload the current route's declared feature chunks during idle time. */
export function prefetchFeatureChunks(): void {
  if (typeof window === 'undefined') return;

  const loaders = [...new Set(
    ROUTES
      .filter((route) => route.prefetch && route.preload)
      .map((route) => route.preload!)
  )];
  const executePrefetch = () => {
    for (const load of loaders) {
      void load().catch((error) => console.warn('Feature prefetch failed:', error));
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(executePrefetch, { timeout: 2000 });
  } else {
    setTimeout(executePrefetch, 1000);
  }
}

/**
 * Prefetch a specific route
 */
export function prefetchRoute(path: string): void {
  const route = getRouteByPath(path);
  if (route?.prefetch && route.preload) {
    void route.preload().catch((error) => console.warn(`Feature prefetch failed for ${path}:`, error));
  }
}

/**
 * Prefetch routes based on user activity
 */
export function prefetchOnInteraction(interaction: 'hover' | 'click' | 'scroll'): void {
  const routesToPrefetch = ROUTES.filter((route) => route.prefetch);
  
  routesToPrefetch.forEach((route) => {
    prefetchRoute(route.path);
  });
}

// ============================================
// 7. WITH SUSPENSE HOC
// ============================================

interface WithSuspenseProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const WithSuspense: React.FC<WithSuspenseProps> = ({
  children,
  fallback = <DefaultFallback />,
}) => (
  <React.Suspense fallback={fallback}>
    {children}
  </React.Suspense>
);

// ============================================
// 8. LAZY LOAD WITH SUSPENSE
// ============================================

interface LazyLoadOptions {
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

export function lazyLoad<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const { fallback = <DefaultFallback />, onError } = options;

  const LazyComponent = lazy(() =>
    factory().catch((error) => {
      console.error('Lazy load error:', error);
      onError?.(error);
      // Retourner un composant d'erreur
      return {
        default: ((props: any) => (
          <div className="p-4 text-center text-red-500">
            <p>Erreur de chargement</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg"
            >
              Réessayer
            </button>
          </div>
        )) as unknown as T,
      };
    })
  );

  return LazyComponent;
}

// ============================================
// 9. EXPORTS PAR DÉFAUT
// ============================================

const RoutesModule = {
  // Lazy components
  LazyGeoRadar,
  LazyVirtualSwipeDeck,
  LazyOptimisticChatBox,
  LazyProfileModal,
  LazyLikesTab,
  LazyDiscussionsTab,
  LazyEncountersTab,
  LazyLoginScreen,
  LazyRegisterWizard,
  LazyPremiumModal,

  // Fallbacks
  DefaultFallback,
  PageFallback,

  // Routes
  ROUTES,

  // Helpers
  getRouteByPath,
  getRouteByComponent,
  getRoutesByAuth,
  getRoutesByRole,
  getTitle,
  getDescription,

  // Prefetch
  prefetchFeatureChunks,
  prefetchRoute,
  prefetchOnInteraction,

  // Utilities
  WithSuspense,
  lazyLoad,
};

export default RoutesModule;