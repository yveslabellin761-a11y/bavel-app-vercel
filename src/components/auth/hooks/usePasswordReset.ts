import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabase } from '../../../lib/supabase';

// ============================================
// 1. TYPES
// ============================================

export type ResetStep = 'request' | 'email_sent' | 'enter_new_password' | 'done';

export interface PasswordStrength {
  score: number;
  label: 'Faible' | 'Moyen' | 'Fort' | 'Excellent';
  color: string;
  textColor: string;
}

export interface UsePasswordResetOptions {
  onComplete?: (userData?: any) => void;
  onError?: (error: Error) => void;
  onStepChange?: (step: ResetStep) => void;
  autoDetectToken?: boolean;
  cooldownSeconds?: number;
  minPasswordLength?: number;
  requireUppercase?: boolean;
  requireNumber?: boolean;
  requireSpecialChar?: boolean;
}

export interface UsePasswordResetReturn {
  // État
  email: string;
  setEmail: (email: string) => void;
  step: ResetStep;
  setStep: (step: ResetStep) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (password: string) => void;
  isLoading: boolean;
  error: string | null;
  cooldown: number;
  
  // Métadonnées
  passwordStrength: PasswordStrength;
  isPasswordValid: boolean;
  isFormValid: boolean;
  canResend: boolean;
  attemptCount: number;
  isSuccess: boolean;
  
  // Actions
  detectTokenFromURL: () => string | null;
  requestReset: () => Promise<void>;
  updatePassword: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
  resendEmail: () => Promise<void>;
}

// ============================================
// 2. CONSTANTES
// ============================================

const STORAGE_KEY = 'bavel_reset_email';
const DEFAULT_COOLDOWN = 60; // secondes
const DEFAULT_MIN_PASSWORD_LENGTH = 6;

// ============================================
// 3. UTILITAIRES
// ============================================

const validatePasswordStrength = (password: string, options?: {
  minLength?: number;
  requireUppercase?: boolean;
  requireNumber?: boolean;
  requireSpecialChar?: boolean;
}): PasswordStrength => {
  const {
    minLength = DEFAULT_MIN_PASSWORD_LENGTH,
    requireUppercase = false,
    requireNumber = false,
    requireSpecialChar = false,
  } = options || {};

  let score = 0;
  const checks = [
    password.length >= minLength,
    password.length >= minLength + 2,
    requireNumber ? /\d/.test(password) : password.length >= 10,
    requireUppercase ? /[A-Z]/.test(password) : /[A-Z]/.test(password) || /[^a-zA-Z0-9]/.test(password),
  ];

  checks.forEach((check, index) => {
    if (check) score += 25;
  });

  // Bonus pour la longueur
  if (password.length >= 12) score = Math.min(100, score + 10);
  if (password.length >= 16) score = Math.min(100, score + 10);

  const labels: Record<number, PasswordStrength['label']> = {
    0: 'Faible',
    25: 'Faible',
    50: 'Moyen',
    75: 'Fort',
    100: 'Excellent',
  };

  const colors: Record<PasswordStrength['label'], string> = {
    'Faible': 'bg-rose-500',
    'Moyen': 'bg-amber-500',
    'Fort': 'bg-blue-500',
    'Excellent': 'bg-emerald-500',
  };

  const textColors: Record<PasswordStrength['label'], string> = {
    'Faible': 'text-rose-400',
    'Moyen': 'text-amber-400',
    'Fort': 'text-blue-400',
    'Excellent': 'text-emerald-400',
  };

  const label = labels[score] || 'Faible';

  return {
    score,
    label,
    color: colors[label],
    textColor: textColors[label],
  };
};

const getErrorMessage = (error: any): string => {
  const msg = error?.message || '';
  
  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
    return 'Veuillez confirmer votre adresse email avant de réinitialiser votre mot de passe.';
  }
  if (msg.includes('user not found') || msg.includes('not found')) {
    return 'Aucun compte trouvé avec cette adresse email.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Trop de tentatives. Veuillez attendre quelques minutes.';
  }
  if (msg.includes('invalid') || msg.includes('expired')) {
    return 'Le lien de réinitialisation est invalide ou a expiré.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Problème de connexion. Vérifiez votre réseau.';
  }
  
  return msg || 'Erreur lors de la réinitialisation. Veuillez réessayer.';
};

const saveResetEmail = (email: string) => {
  try {
    if (email) {
      localStorage.setItem(STORAGE_KEY, email);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
};

const loadResetEmail = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

// ============================================
// 4. HOOK PRINCIPAL
// ============================================

export const usePasswordReset = (options: UsePasswordResetOptions = {}): UsePasswordResetReturn => {
  const {
    onComplete,
    onError,
    onStepChange,
    autoDetectToken = true,
    cooldownSeconds = DEFAULT_COOLDOWN,
    minPasswordLength = DEFAULT_MIN_PASSWORD_LENGTH,
    requireUppercase = false,
    requireNumber = false,
    requireSpecialChar = false,
  } = options;

  // ============================================
  // 4.1 ÉTATS
  // ============================================

  const [email, setEmail] = useState<string>(() => loadResetEmail());
  const [step, setStep] = useState<ResetStep>('request');
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // ============================================
  // 4.2 MÉMOISATION
  // ============================================

  const passwordStrength = useMemo(() => {
    return validatePasswordStrength(newPassword, {
      minLength: minPasswordLength,
      requireUppercase,
      requireNumber,
      requireSpecialChar,
    });
  }, [newPassword, minPasswordLength, requireUppercase, requireNumber, requireSpecialChar]);

  const isPasswordValid = useMemo(() => {
    return newPassword.length >= minPasswordLength && 
           (newPassword === confirmNewPassword || !confirmNewPassword);
  }, [newPassword, confirmNewPassword, minPasswordLength]);

  const isFormValid = useMemo(() => {
    return step === 'request' 
      ? email.includes('@') && email.length > 0
      : step === 'enter_new_password'
        ? newPassword.length >= minPasswordLength && 
          newPassword === confirmNewPassword &&
          passwordStrength.score >= 50
        : false;
  }, [step, email, newPassword, confirmNewPassword, minPasswordLength, passwordStrength]);

  const canResend = useMemo(() => cooldown === 0 && !isLoading, [cooldown, isLoading]);

  // ============================================
  // 4.3 COOLDOWN
  // ============================================

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  // ============================================
  // 4.4 DÉTECTION AUTO DU TOKEN
  // ============================================

  const detectTokenFromURL = useCallback((): string | null => {
    try {
      // 1. Vérifier dans le hash (Supabase)
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.replace('#', '?'));
        const accessToken = params.get('access_token');
        if (accessToken) return accessToken;
        
        const type = params.get('type');
        if (type === 'recovery') {
          const tokenParam = params.get('token') || params.get('code');
          if (tokenParam) return tokenParam;
        }
      }

      // 2. Vérifier dans le query string
      const search = window.location.search;
      if (search) {
        const params = new URLSearchParams(search);
        const tokenParam = params.get('token') || params.get('resetToken') || params.get('reset_token');
        if (tokenParam) return tokenParam;
      }

      // 3. Vérifier dans le path (ex: /reset-password/TOKEN)
      const path = window.location.pathname;
      const match = path.match(/\/reset-password\/([^\/]+)/);
      if (match) return match[1];

      // 4. Vérifier dans le fragment de l'URL (pour les apps)
      const fragment = window.location.hash;
      if (fragment.includes('token=')) {
        const params = new URLSearchParams(fragment.replace('#', '?'));
        return params.get('token');
      }

      return null;
    } catch (e) {
      console.error('Erreur de détection du token:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoDetectToken) {
      const detectedToken = detectTokenFromURL();
      if (detectedToken) {
        setToken(detectedToken);
        setStep('enter_new_password');
        // Nettoyer l'URL
        try {
          window.history.replaceState(null, '', window.location.pathname);
        } catch {}
      }
    }
  }, [autoDetectToken, detectTokenFromURL]);

  // ============================================
  // 4.5 SAUVEGARDE DE L'EMAIL
  // ============================================

  useEffect(() => {
    saveResetEmail(email);
  }, [email]);

  // ============================================
  // 4.6 STEP CHANGE
  // ============================================

  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  // ============================================
  // 4.7 ACTIONS
  // ============================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const requestReset = useCallback(async () => {
    if (!email || !email.includes('@')) {
      setError('Veuillez saisir une adresse email valide');
      return;
    }

    if (cooldown > 0) {
      setError(`Veuillez attendre ${cooldown} secondes avant de réessayer`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setAttemptCount(prev => prev + 1);

    try {
      // Appel Supabase
      const client = getSupabase();
      if (client) {
        const { error: err } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
      }

      setStep('email_sent');
      setCooldown(cooldownSeconds);
      
      // Sauvegarder l'email pour référence
      saveResetEmail(email);

    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      onError?.(new Error(errorMsg));
    } finally {
      setIsLoading(false);
    }
  }, [email, cooldown, cooldownSeconds, onError]);

  const updatePassword = useCallback(async () => {
    if (newPassword !== confirmNewPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < minPasswordLength) {
      setError(`Le mot de passe doit contenir au moins ${minPasswordLength} caractères`);
      return;
    }

    if (requireUppercase && !/[A-Z]/.test(newPassword)) {
      setError('Le mot de passe doit contenir au moins une majuscule');
      return;
    }

    if (requireNumber && !/[0-9]/.test(newPassword)) {
      setError('Le mot de passe doit contenir au moins un chiffre');
      return;
    }

    if (requireSpecialChar && !/[^A-Za-z0-9]/.test(newPassword)) {
      setError('Le mot de passe doit contenir au moins un caractère spécial');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Supabase Auth is the only authority for credentials.
      const client = getSupabase();
      if (!client) throw new Error('Service d’authentification indisponible.');
      const { error: err } = await client.auth.updateUser({ password: newPassword });
      if (err) throw err;

      // Succès uniquement après confirmation de Supabase.
      setIsSuccess(true);
      setStep('done');
      setCooldown(0);
      
      // 4. Nettoyer les données sensibles
      saveResetEmail('');
      
      // 5. Callback
      onComplete?.({ email, passwordUpdated: true });

    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      onError?.(new Error(errorMsg));
    } finally {
      setIsLoading(false);
    }
  }, [
    newPassword,
    confirmNewPassword,
    minPasswordLength,
    requireUppercase,
    requireNumber,
    requireSpecialChar,
    email,
    token,
    onComplete,
    onError,
  ]);

  const resendEmail = useCallback(async () => {
    if (!canResend) return;
    await requestReset();
  }, [canResend, requestReset]);

  const reset = useCallback(() => {
    setEmail(loadResetEmail());
    setStep('request');
    setToken(null);
    setNewPassword('');
    setConfirmNewPassword('');
    setError(null);
    setIsLoading(false);
    setCooldown(0);
    setAttemptCount(0);
    setIsSuccess(false);
    
    // Nettoyer les données sensibles
    try {
      localStorage.removeItem('bavel_reset_token');
    } catch {}
  }, []);

  // ============================================
  // 4.8 NETTOYAGE DES ERREURS
  // ============================================

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ============================================
  // 4.9 RETOUR
  // ============================================

  return {
    // État
    email,
    setEmail,
    step,
    setStep,
    token,
    setToken,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    isLoading,
    error,
    cooldown,
    
    // Métadonnées
    passwordStrength,
    isPasswordValid,
    isFormValid,
    canResend,
    attemptCount,
    isSuccess,
    
    // Actions
    detectTokenFromURL,
    requestReset,
    updatePassword,
    reset,
    clearError,
    resendEmail,
  };
};

// ============================================
// 5. EXPORT PAR DÉFAUT
// ============================================

export default usePasswordReset;