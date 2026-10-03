import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ============================================
// 1. TYPES
// ============================================

export interface RememberMeData {
  email: string;
  name?: string;
  avatar?: string;
  userId?: string;
  lastLogin?: string;
  lastLoginTimestamp?: number;
  loginCount?: number;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    notifications?: boolean;
    soundEnabled?: boolean;
    hapticEnabled?: boolean;
  };
  device?: {
    type?: 'mobile' | 'tablet' | 'desktop';
    browser?: string;
    os?: string;
  };
}

export interface RememberMeAccount extends RememberMeData {
  id: string;
  createdAt: string;
  updatedAt: string;
  isCurrent: boolean;
}

export interface UseRememberMeOptions {
  maxAccounts?: number;
  autoLoad?: boolean;
  storageKey?: string;
  enableEncryption?: boolean;
  enableDeviceTracking?: boolean;
  onAccountSwitch?: (account: RememberMeAccount) => void;
  onError?: (error: Error) => void;
}

export interface UseRememberMeReturn {
  // État
  currentEmail: string;
  currentData: RememberMeData | null;
  currentAccount: RememberMeAccount | null;
  savedEmail: string | null;
  savedEmails: string[];
  savedAccounts: RememberMeAccount[];
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Métadonnées
  hasSavedEmail: boolean;
  hasMultipleAccounts: boolean;
  lastAccount: RememberMeAccount | null;
  accountCount: number;
  isFirstLogin: boolean;
  
  // Actions principales
  saveEmail: (email: string, remember?: boolean, data?: Partial<RememberMeData>) => void;
  clearSavedEmail: () => void;
  removeAccount: (email: string) => void;
  loadFromStorage: () => void;
  
  // Actions avancées
  toggleRemember: (enabled: boolean) => void;
  switchAccount: (email: string) => RememberMeAccount | null;
  updateAccountData: (email: string, data: Partial<RememberMeData>) => void;
  getAccountByEmail: (email: string) => RememberMeAccount | null;
  getLastLogin: () => Date | null;
  getLoginCount: (email: string) => number;
  
  // Utilitaires
  formatLastLogin: (email?: string) => string;
  isAccountExpired: (email: string, maxAge?: number) => boolean;
  clearAll: () => void;
  refresh: () => void;
}

// ============================================
// 2. CONSTANTES
// ============================================

const DEFAULT_OPTIONS: Required<Omit<UseRememberMeOptions, 'onAccountSwitch' | 'onError'>> = {
  maxAccounts: 5,
  autoLoad: true,
  storageKey: 'bavel',
  enableEncryption: false,
  enableDeviceTracking: false,
};

const STORAGE_KEYS = {
  email: 'remember_email',
  enabled: 'remember_me',
  accounts: 'remember_accounts',
  current: 'remember_user_data',
  metadata: 'remember_metadata',
  timestamp: 'remember_timestamp',
} as const;

// ============================================
// 3. UTILITAIRES
// ============================================

const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

const getDeviceInfo = (): RememberMeData['device'] => {
  if (typeof window === 'undefined') return undefined;
  
  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  else if (ua.includes('Opera')) browser = 'Opera';
  
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  return {
    type: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    browser,
    os,
  };
};

const getCurrentTimestamp = (): number => Date.now();

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTimeAgo = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `il y a ${years} an${years > 1 ? 's' : ''}`;
  if (months > 0) return `il y a ${months} mois`;
  if (weeks > 0) return `il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
  if (days > 0) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
  if (hours > 0) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
  return 'à l\'instant';
};

// ============================================
// 4. HOOK PRINCIPAL
// ============================================

export const useRememberMe = (options: UseRememberMeOptions = {}): UseRememberMeReturn => {
  const {
    maxAccounts = DEFAULT_OPTIONS.maxAccounts,
    autoLoad = DEFAULT_OPTIONS.autoLoad,
    storageKey = DEFAULT_OPTIONS.storageKey,
    enableEncryption = DEFAULT_OPTIONS.enableEncryption,
    enableDeviceTracking = DEFAULT_OPTIONS.enableDeviceTracking,
    onAccountSwitch,
    onError,
  } = options;

  // ============================================
  // 4.1 ÉTATS
  // ============================================

  const [currentEmail, setCurrentEmail] = useState<string>('');
  const [currentData, setCurrentData] = useState<RememberMeData | null>(null);
  const [currentAccount, setCurrentAccount] = useState<RememberMeAccount | null>(null);
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [savedAccounts, setSavedAccounts] = useState<RememberMeAccount[]>([]);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    lastCleared?: number;
    totalLogins?: number;
    firstLogin?: string;
  }>({});

  const isMounted = useRef(true);
  const errorTimeout = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // 4.2 KEY GENERATION
  // ============================================

  const getKey = useCallback((key: string): string => {
    return `${storageKey}_${key}`;
  }, [storageKey]);

  // ============================================
  // 4.3 CHARGEMENT
  // ============================================

  const loadFromStorage = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);

      const prefix = getKey('');
      
      // Charger l'email courant
      const email = localStorage.getItem(getKey(STORAGE_KEYS.email)) || '';
      const enabled = localStorage.getItem(getKey(STORAGE_KEYS.enabled)) === 'true';
      
      // Charger la liste des comptes
      const accountsJson = localStorage.getItem(getKey(STORAGE_KEYS.accounts));
      let accounts: RememberMeAccount[] = accountsJson ? JSON.parse(accountsJson) : [];
      
      // Charger les données de l'utilisateur courant
      const userDataJson = localStorage.getItem(getKey(STORAGE_KEYS.current));
      const userData: RememberMeData | null = userDataJson ? JSON.parse(userDataJson) : null;
      
      // Charger les métadonnées
      const metadataJson = localStorage.getItem(getKey(STORAGE_KEYS.metadata));
      if (metadataJson) {
        setMetadata(JSON.parse(metadataJson));
      }

      // Mettre à jour les comptes avec l'état courant
      accounts = accounts.map(acc => ({
        ...acc,
        isCurrent: acc.email === email,
      }));

      // Trouver le compte courant
      const currentAcc = accounts.find(acc => acc.email === email) || null;

      setCurrentEmail(email);
      setCurrentData(userData);
      setCurrentAccount(currentAcc);
      setSavedEmails(accounts.map(acc => acc.email));
      setSavedAccounts(accounts);
      setIsEnabled(enabled);

      return { email, accounts, userData };
    } catch (e) {
      console.error('Erreur de chargement:', e);
      const errorMsg = 'Impossible de charger les données sauvegardées';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return null;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [getKey, onError]);

  // ============================================
  // 4.4 SAUVEGARDE
  // ============================================

  const saveEmail = useCallback((email: string, remember: boolean = true, data?: Partial<RememberMeData>) => {
    try {
      setError(null);

      if (remember && email) {
        // Créer ou mettre à jour les données utilisateur
        const deviceInfo = enableDeviceTracking ? getDeviceInfo() : undefined;
        const timestamp = getCurrentTimestamp();
        
        // Charger les comptes existants
        const accountsJson = localStorage.getItem(getKey(STORAGE_KEYS.accounts));
        let accounts: RememberMeAccount[] = accountsJson ? JSON.parse(accountsJson) : [];
        
        // Préparer les données complètes
        const fullData: RememberMeData = {
          email,
          lastLogin: new Date(timestamp).toISOString(),
          lastLoginTimestamp: timestamp,
          ...data,
          preferences: {
            ...data?.preferences,
          },
          device: deviceInfo || data?.device,
        };

        // Créer ou mettre à jour le compte
        const existingIndex = accounts.findIndex(acc => acc.email === email);
        const account: RememberMeAccount = {
          ...fullData,
          id: existingIndex >= 0 ? accounts[existingIndex].id : generateId(),
          createdAt: existingIndex >= 0 ? accounts[existingIndex].createdAt : new Date(timestamp).toISOString(),
          updatedAt: new Date(timestamp).toISOString(),
          isCurrent: true,
          loginCount: (existingIndex >= 0 ? accounts[existingIndex].loginCount || 0 : 0) + 1,
        };

        // Mettre à jour ou ajouter le compte
        if (existingIndex >= 0) {
          accounts[existingIndex] = account;
        } else {
          accounts.unshift(account);
        }

        // Limiter le nombre de comptes
        if (accounts.length > maxAccounts) {
          accounts = accounts.slice(0, maxAccounts);
        }

        // Marquer le compte comme courant
        accounts = accounts.map(acc => ({
          ...acc,
          isCurrent: acc.email === email,
        }));

        // Sauvegarder
        localStorage.setItem(getKey(STORAGE_KEYS.email), email);
        localStorage.setItem(getKey(STORAGE_KEYS.enabled), 'true');
        localStorage.setItem(getKey(STORAGE_KEYS.accounts), JSON.stringify(accounts));
        localStorage.setItem(getKey(STORAGE_KEYS.current), JSON.stringify(fullData));
        localStorage.setItem(getKey(STORAGE_KEYS.timestamp), String(timestamp));

        // Mettre à jour les métadonnées
        const newMetadata = {
          ...metadata,
          totalLogins: (metadata.totalLogins || 0) + 1,
          firstLogin: metadata.firstLogin || new Date(timestamp).toISOString(),
        };
        localStorage.setItem(getKey(STORAGE_KEYS.metadata), JSON.stringify(newMetadata));
        setMetadata(newMetadata);

        // Mettre à jour l'état
        setCurrentEmail(email);
        setCurrentData(fullData);
        setCurrentAccount(account);
        setSavedEmails(accounts.map(acc => acc.email));
        setSavedAccounts(accounts);
        setIsEnabled(true);

      } else {
        // Désactiver "Se souvenir de moi"
        localStorage.removeItem(getKey(STORAGE_KEYS.email));
        localStorage.removeItem(getKey(STORAGE_KEYS.current));
        localStorage.removeItem(getKey(STORAGE_KEYS.timestamp));
        localStorage.setItem(getKey(STORAGE_KEYS.enabled), 'false');
        
        setCurrentEmail('');
        setCurrentData(null);
        setCurrentAccount(null);
        setIsEnabled(false);
      }
    } catch (e) {
      console.error('Erreur de sauvegarde:', e);
      const errorMsg = 'Impossible de sauvegarder les données';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      throw e;
    }
  }, [getKey, maxAccounts, metadata, enableDeviceTracking, onError]);

  // ============================================
  // 4.5 SUPPRESSION
  // ============================================

  const clearSavedEmail = useCallback(() => {
    try {
      setError(null);
      
      localStorage.removeItem(getKey(STORAGE_KEYS.email));
      localStorage.removeItem(getKey(STORAGE_KEYS.current));
      localStorage.removeItem(getKey(STORAGE_KEYS.accounts));
      localStorage.removeItem(getKey(STORAGE_KEYS.timestamp));
      localStorage.setItem(getKey(STORAGE_KEYS.enabled), 'false');
      
      // Mettre à jour les métadonnées
      const newMetadata = {
        ...metadata,
        lastCleared: getCurrentTimestamp(),
      };
      localStorage.setItem(getKey(STORAGE_KEYS.metadata), JSON.stringify(newMetadata));
      setMetadata(newMetadata);

      setCurrentEmail('');
      setCurrentData(null);
      setCurrentAccount(null);
      setSavedEmails([]);
      setSavedAccounts([]);
      setIsEnabled(false);
    } catch (e) {
      console.error('Erreur de suppression:', e);
      const errorMsg = 'Impossible de supprimer les données';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
    }
  }, [getKey, metadata, onError]);

  const removeAccount = useCallback((email: string) => {
    try {
      setError(null);
      
      const accountsJson = localStorage.getItem(getKey(STORAGE_KEYS.accounts));
      let accounts: RememberMeAccount[] = accountsJson ? JSON.parse(accountsJson) : [];
      
      accounts = accounts.filter(acc => acc.email !== email);
      localStorage.setItem(getKey(STORAGE_KEYS.accounts), JSON.stringify(accounts));
      
      // Si c'est l'email courant, le supprimer aussi
      if (currentEmail === email) {
        localStorage.removeItem(getKey(STORAGE_KEYS.email));
        localStorage.removeItem(getKey(STORAGE_KEYS.current));
        localStorage.removeItem(getKey(STORAGE_KEYS.timestamp));
        
        setCurrentEmail('');
        setCurrentData(null);
        setCurrentAccount(null);
        setIsEnabled(false);
      }
      
      setSavedEmails(accounts.map(acc => acc.email));
      setSavedAccounts(accounts);
    } catch (e) {
      console.error('Erreur de suppression du compte:', e);
      const errorMsg = 'Impossible de supprimer le compte';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
    }
  }, [getKey, currentEmail, onError]);

  const clearAll = useCallback(() => {
    try {
      const prefix = getKey('');
      const keys = Object.values(STORAGE_KEYS).map(key => getKey(key));
      keys.forEach(key => localStorage.removeItem(key));
      
      setCurrentEmail('');
      setCurrentData(null);
      setCurrentAccount(null);
      setSavedEmails([]);
      setSavedAccounts([]);
      setIsEnabled(false);
      setMetadata({});
      setError(null);
    } catch (e) {
      console.error('Erreur de nettoyage:', e);
      const errorMsg = 'Impossible de nettoyer les données';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
    }
  }, [getKey, onError]);

  // ============================================
  // 4.6 ACTIONS AVANCÉES
  // ============================================

  const toggleRemember = useCallback((enabled: boolean) => {
    if (enabled && currentEmail) {
      saveEmail(currentEmail, true, currentData || undefined);
    } else {
      clearSavedEmail();
    }
  }, [currentEmail, currentData, saveEmail, clearSavedEmail]);

  const switchAccount = useCallback((email: string): RememberMeAccount | null => {
    try {
      const account = savedAccounts.find(acc => acc.email === email);
      if (!account) return null;

      // Mettre à jour le compte courant
      const updatedAccounts = savedAccounts.map(acc => ({
        ...acc,
        isCurrent: acc.email === email,
      }));

      localStorage.setItem(getKey(STORAGE_KEYS.accounts), JSON.stringify(updatedAccounts));
      localStorage.setItem(getKey(STORAGE_KEYS.email), email);
      localStorage.setItem(getKey(STORAGE_KEYS.current), JSON.stringify(account));
      localStorage.setItem(getKey(STORAGE_KEYS.timestamp), String(getCurrentTimestamp()));

      setCurrentEmail(email);
      setCurrentData(account);
      setCurrentAccount(account);
      setSavedAccounts(updatedAccounts);
      setIsEnabled(true);

      onAccountSwitch?.(account);
      return account;
    } catch (e) {
      console.error('Erreur de changement de compte:', e);
      return null;
    }
  }, [savedAccounts, getKey, onAccountSwitch]);

  const updateAccountData = useCallback((email: string, data: Partial<RememberMeData>) => {
    try {
      const accounts = [...savedAccounts];
      const index = accounts.findIndex(acc => acc.email === email);
      if (index === -1) return;

      accounts[index] = {
        ...accounts[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(getKey(STORAGE_KEYS.accounts), JSON.stringify(accounts));
      
      // Si c'est le compte courant, mettre à jour aussi
      if (email === currentEmail) {
        localStorage.setItem(getKey(STORAGE_KEYS.current), JSON.stringify(accounts[index]));
        setCurrentData(accounts[index]);
        setCurrentAccount(accounts[index]);
      }

      setSavedAccounts(accounts);
      setSavedEmails(accounts.map(acc => acc.email));
    } catch (e) {
      console.error('Erreur de mise à jour:', e);
    }
  }, [savedAccounts, currentEmail, getKey]);

  const getAccountByEmail = useCallback((email: string): RememberMeAccount | null => {
    return savedAccounts.find(acc => acc.email === email) || null;
  }, [savedAccounts]);

  const getLoginCount = useCallback((email: string): number => {
    const account = getAccountByEmail(email);
    return account?.loginCount || 0;
  }, [getAccountByEmail]);

  const getLastLogin = useCallback((): Date | null => {
    if (currentAccount?.lastLoginTimestamp) {
      return new Date(currentAccount.lastLoginTimestamp);
    }
    return null;
  }, [currentAccount]);

  // ============================================
  // 4.7 UTILITAIRES
  // ============================================

  const formatLastLogin = useCallback((email?: string): string => {
    const account = email ? getAccountByEmail(email) : currentAccount;
    if (!account?.lastLoginTimestamp) return 'Jamais';
    return formatDate(account.lastLoginTimestamp);
  }, [currentAccount, getAccountByEmail]);

  const isAccountExpired = useCallback((email: string, maxAge: number = 30 * 24 * 60 * 60 * 1000): boolean => {
    const account = getAccountByEmail(email);
    if (!account?.lastLoginTimestamp) return true;
    return (getCurrentTimestamp() - account.lastLoginTimestamp) > maxAge;
  }, [getAccountByEmail]);

  const refresh = useCallback(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // ============================================
  // 4.8 MÉMOISATION
  // ============================================

  const hasSavedEmail = useMemo(() => currentEmail.length > 0, [currentEmail]);
  const hasMultipleAccounts = useMemo(() => savedEmails.length > 1, [savedEmails]);
  const lastAccount = useMemo(() => {
    return savedAccounts.length > 0 ? savedAccounts[0] : null;
  }, [savedAccounts]);
  const accountCount = useMemo(() => savedAccounts.length, [savedAccounts]);
  const isFirstLogin = useMemo(() => accountCount === 0, [accountCount]);

  // ============================================
  // 4.9 EFFET INITIAL
  // ============================================

  useEffect(() => {
    isMounted.current = true;
    
    if (autoLoad) {
      loadFromStorage();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted.current = false;
      if (errorTimeout.current) {
        clearTimeout(errorTimeout.current);
      }
    };
  }, [autoLoad, loadFromStorage]);

  // ============================================
  // 4.10 GESTION DES ERREURS (auto-clean)
  // ============================================

  useEffect(() => {
    if (error) {
      if (errorTimeout.current) {
        clearTimeout(errorTimeout.current);
      }
      errorTimeout.current = setTimeout(() => {
        if (isMounted.current) {
          setError(null);
        }
      }, 5000);
    }
    return () => {
      if (errorTimeout.current) {
        clearTimeout(errorTimeout.current);
      }
    };
  }, [error]);

  // ============================================
  // 4.11 RETOUR
  // ============================================

  return {
    // État
    currentEmail,
    currentData,
    currentAccount,
    savedEmail: currentEmail || (savedEmails.length > 0 ? savedEmails[0] : null),
    savedEmails,
    savedAccounts,
    isEnabled,
    isLoading,
    error,
    
    // Métadonnées
    hasSavedEmail,
    hasMultipleAccounts,
    lastAccount,
    accountCount,
    isFirstLogin,
    
    // Actions principales
    saveEmail,
    clearSavedEmail,
    removeAccount,
    loadFromStorage,
    
    // Actions avancées
    toggleRemember,
    switchAccount,
    updateAccountData,
    getAccountByEmail,
    getLastLogin,
    getLoginCount,
    
    // Utilitaires
    formatLastLogin,
    isAccountExpired,
    clearAll,
    refresh,
  };
};

// ============================================
// 5. EXPORT PAR DÉFAUT
// ============================================

export default useRememberMe;