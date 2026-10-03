import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { signProfilePhotoReferences } from '../lib/profilePhotoUrls';
import { offlineSyncService } from '../services/offlineSyncService';

const loadSupabase = () => import('../lib/supabase');

function hasCompletedProfile(profile: any): boolean {
  if (!profile) return false;
  if (profile.onboardingCompleted === true) return true;
  const hasName = Boolean(
    typeof profile.name === 'string' && profile.name.trim() && profile.name !== 'Membre' && profile.name !== 'Guest'
  );
  const hasDetails = Boolean(
    profile.gender ||
    profile.birthday ||
    profile.city ||
    profile.bio ||
    profile.age ||
    profile.purpose ||
    profile.height ||
    profile.job ||
    profile.studies ||
    (profile.details && Object.values(profile.details).some(Boolean))
  );
  return hasName && hasDetails;
}

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  phone?: string;
  isGoogle?: boolean;
  role?: 'user' | 'admin';
  isAdmin?: boolean;
  onboardingCompleted?: boolean;
  [key: string]: any;
}

export interface AuthContextType {
  user: AuthUser | null;
  userRole: 'user' | 'admin' | null;
  isAdmin: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  profile: any;
  photos: string[];
  setAuthUser: (user: AuthUser | null) => void;
  setUserRole: (role: 'user' | 'admin' | null) => void;
  setProfileData: (profile: any, photos?: string[]) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  isAdmin: false,
  loading: true,
  isAuthenticated: false,
  profile: null,
  photos: ['', '', '', '', '', ''],
  setAuthUser: () => {},
  setUserRole: () => {},
  setProfileData: () => {},
  logout: async () => {},
  refreshSession: async () => false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRoleState] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>(['', '', '', '', '', '']);
  const sessionLoadId = useRef(0);

  useEffect(() => {
    try {
      localStorage.removeItem('bavel_accounts_by_email');
    } catch (error) {
      console.error('Failed to clear legacy local account cache:', error);
    }
  }, []);

  const setUserRole = (role: 'user' | 'admin' | null) => setUserRoleState(role);

  const loadSession = async (): Promise<boolean> => {
    const loadId = ++sessionLoadId.current;
    const isCurrentLoad = () => sessionLoadId.current === loadId;
    try {
      const { getSupabase } = await loadSupabase();
      const client = getSupabase();
      const {
        data: { session }
      } = await client.auth.getSession();
      if (!isCurrentLoad()) return false;
      if (!session?.user) {
        offlineSyncService.bindUser(null);
        setUser(null);
        setUserRoleState(null);
        setProfile(null);
        setPhotos(['', '', '', '', '', '']);
        return false;
      }
      const authUser = session.user;
      offlineSyncService.bindUser(authUser.id);
      const { data: profileData } = await client.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
      if (!isCurrentLoad()) return false;
      let signedPhotos: string[] = [];
      if (Array.isArray(profileData?.photos)) {
        try {
          signedPhotos = await signProfilePhotoReferences(client, profileData.photos);
        } catch (photoError) {
          console.error('Failed to load private profile photos:', photoError);
        }
      }
      if (!isCurrentLoad()) return false;
      const role = authUser.app_metadata?.role === 'admin' ? 'admin' : 'user';
      setUser({
        id: authUser.id,
        email: authUser.email,
        name: profileData?.name || authUser.user_metadata?.name,
        role,
        isAdmin: role === 'admin',
        onboardingCompleted: hasCompletedProfile(profileData)
      });
      setUserRoleState(role);
      if (profileData) {
        const profileWithSignedPhotos = {
          ...profileData,
          photos: signedPhotos,
          avatar_url: signedPhotos.find(Boolean) || ''
        };
        setProfile(profileWithSignedPhotos);
        setPhotos(signedPhotos);
      } else {
        setProfile(null);
        setPhotos(['', '', '', '', '', '']);
      }
      return true;
    } catch (err) {
      if (isCurrentLoad()) console.error('Supabase session verification failed:', err);
      return false;
    } finally {
      if (isCurrentLoad()) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void loadSession();
    void loadSupabase()
      .then(async ({ getSupabase, registerNativeOAuthCallbackListener }) => {
        if (!active) return;
        const client = getSupabase();
        const { data } = client.auth.onAuthStateChange(() => {
          void loadSession();
        });
        unsubscribe = () => data.subscription.unsubscribe();
        const removeNativeOAuthListener = await registerNativeOAuthCallbackListener(client);
        if (!active) removeNativeOAuthListener();
        else {
          const previousUnsubscribe = unsubscribe;
          unsubscribe = () => {
            previousUnsubscribe?.();
            removeNativeOAuthListener();
          };
        }
      })
      .catch((error: unknown) => {
        console.error('Supabase auth listener initialization failed:', error);
        if (active) setLoading(false);
      });
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadSession();
    };
    const photoRefreshTimer = window.setInterval(
      () => {
        if (document.visibilityState === 'visible') void loadSession();
      },
      10 * 60 * 1000
    );
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      sessionLoadId.current += 1;
      window.clearInterval(photoRefreshTimer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      unsubscribe?.();
    };
  }, []);

  const setAuthUser = (newUser: AuthUser | null) => {
    offlineSyncService.bindUser(newUser?.id ?? null);
    setUser(newUser);
    if (newUser) {
      setUserRoleState(newUser.role || 'user');
    } else {
      setUserRoleState(null);
    }
  };

  const setProfileData = (newProfile: any, newPhotos?: string[]) => {
    setProfile(newProfile);
    setUser((currentUser) =>
      currentUser ? { ...currentUser, onboardingCompleted: hasCompletedProfile(newProfile) } : currentUser
    );
    if (newPhotos) setPhotos(newPhotos);
  };

  const logout = async () => {
    const { getSupabase } = await loadSupabase();
    const client = getSupabase();
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } finally {
      offlineSyncService.bindUser(null);
      setUser(null);
      setUserRoleState(null);
      setProfile(null);
      setPhotos(['', '', '', '', '', '']);
      [
        'app_user',
        'bavel_user_profile',
        'bavel_user_photos',
        'bavel_accounts_by_email',
        'bavel_blocked_users',
        'bavel_remember_me',
        'bavel_remember_email',
        'bavel_auth_user'
      ].forEach((key) => localStorage.removeItem(key));
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        isAdmin,
        loading,
        isAuthenticated: !!user,
        profile,
        photos,
        setAuthUser,
        setUserRole,
        setProfileData,
        logout,
        refreshSession: loadSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
