import React, { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { prefetchFeatureChunks } from './routes';
import { PwaExperience } from './features/pwa/PwaExperience';
const LoginScreen = React.lazy(() => import('./components/auth/LoginScreen').then((module) => ({ default: module.LoginScreen })));
const AuthenticatedExperience = React.lazy(() =>
  import('./AuthenticatedExperience').then((module) => ({ default: module.AuthenticatedExperience }))
);
import { DefaultFallback } from './routes';

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [callbackHandled, setCallbackHandled] = useState(false);
  const [callbackError, setCallbackError] = useState<string | undefined>();
  const [callbackState, setCallbackState] = useState<{ error: string | null } | null>(() => {
    const inMemory = (window as Window & { __bavelOAuthCallback?: { error: string | null } }).__bavelOAuthCallback;
    if (inMemory) return inMemory;
    try {
      const stored = window.sessionStorage.getItem('bavel_oauth_callback');
      return stored ? JSON.parse(stored) as { error: string | null } : null;
    } catch {
      return null;
    }
  });
  const isAuthCallback = window.location.pathname === '/auth/callback' || Boolean(callbackState);

  useEffect(() => {
    if (!loading && user) prefetchFeatureChunks();
  }, [loading, user?.id]);

  useEffect(() => {
    if (!isAuthCallback) {
      setCallbackHandled(true);
      return;
    }
    if (loading) return;

    if (!user) {
      const callbackParams = new URLSearchParams(
        window.location.search || window.location.hash.replace(/^#/, '')
      );
      const error = callbackState?.error || callbackParams.get('error') || callbackParams.get('error_code');
      setCallbackError(
        error === 'access_denied'
          ? 'Connexion annulée. Vous pouvez réessayer.'
          : 'La connexion n’a pas abouti. Vérifiez la configuration du fournisseur puis réessayez.'
      );
    }

    window.history.replaceState(null, '', '/');
    delete (window as Window & { __bavelOAuthCallback?: { error: string | null } }).__bavelOAuthCallback;
    try {
      window.sessionStorage.removeItem('bavel_oauth_callback');
    } catch {
      // Callback state is also cleared from memory.
    }
    setCallbackState(null);
    setCallbackHandled(true);
  }, [callbackState, isAuthCallback, loading, user]);

  if (isAuthCallback && (loading || !callbackHandled)) {
    return <DefaultFallback />;
  }

  if (loading) {
    return <DefaultFallback />;
  }

  if (!user) {
    return (
      <React.Suspense fallback={<DefaultFallback />}>
        <LoginScreen
          initialAuthError={callbackError}
          onLoginSuccess={() => {
            // Supabase auth state changes are observed by AuthProvider.
          }}
        />
      </React.Suspense>
    );
  }

  return (
    <React.Suspense fallback={<DefaultFallback />}>
      <AuthenticatedExperience user={user} />
    </React.Suspense>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <>
        <PwaExperience />
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </>
    </MotionConfig>
  );
}
