import { useState, useCallback, useEffect } from 'react';
import { AuthState, AuthMode, EmailTab } from '../types';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../../../lib/supabase';

interface UseAuthOptions {
  onLoginSuccess?: (data: any) => void;
  onRegisterStart?: (data: any) => void;
  onError?: (error: Error) => void;
}

export const useAuth = (options: UseAuthOptions = {}) => {
  const { onLoginSuccess, onRegisterStart, onError } = options;

  // ============================================
  // ÉTATS
  // ============================================

  const [state, setState] = useState<AuthState>({
    mode: 'main',
    emailTab: 'login',
    isLoading: false,
    error: null,
  });

  const [emailState, setEmailState] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    rememberMe: false,
  });

  // ============================================
  // ACTIONS
  // ============================================

  const setMode = useCallback((mode: AuthMode) => {
    setState((prev) => ({ ...prev, mode, error: null }));
  }, []);

  const setEmailTab = useCallback((emailTab: EmailTab) => {
    setState((prev) => ({ ...prev, emailTab, error: null }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
    if (error && onError) {
      onError(new Error(error));
    }
  }, [onError]);

  const setIsLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({ ...prev, isLoading }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // ============================================
  // EMAIL AUTH
  // ============================================

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (!email || !password) {
        throw new Error('Veuillez remplir tous les champs');
      }

      const result = await signInWithEmail(email, password);
      
      if (result.error) {
        throw new Error(result.error);
      }

      onLoginSuccess?.({
        email,
        name: result.data?.user?.user_metadata?.name || email.split('@')[0],
        isNewUser: false,
      });

      return { success: true, data: result.data };
    } catch (err: any) {
      const errorMsg = err.message || 'Identifiants invalides';
      setState((prev) => ({ ...prev, error: errorMsg }));
      return { success: false, error: errorMsg };
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [onLoginSuccess]);

  const registerWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (!email || !password) {
        throw new Error('Veuillez remplir tous les champs');
      }

      const result = await signUpWithEmail(email, password, name);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (onRegisterStart) {
        onRegisterStart({ email, name: name || '' });
      } else {
        onLoginSuccess?.({ email, name: name || '', isNewUser: true });
      }

      return { success: true, data: result.data };
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur lors de l\'inscription';
      setState((prev) => ({ ...prev, error: errorMsg }));
      return { success: false, error: errorMsg };
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [onRegisterStart, onLoginSuccess]);

  const loginWithGoogle = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await signInWithGoogle();
      
      if (result.error) {
        throw new Error(result.error);
      }

      onLoginSuccess?.({ isGoogle: true });
      return { success: true, data: result.data };
    } catch (err: any) {
      const errorMsg = err.message || 'Connexion Google impossible';
      setState((prev) => ({ ...prev, error: errorMsg }));
      return { success: false, error: errorMsg };
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [onLoginSuccess]);

  // ============================================
  // RETOUR
  // ============================================

  return {
    // État
    ...state,
    emailState,
    setEmailState,
    
    // Actions
    setMode,
    setEmailTab,
    setError,
    clearError,
    setIsLoading,
    
    // Auth methods
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
  };
};