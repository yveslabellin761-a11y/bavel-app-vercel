import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { parseProfileLocation } from './locationProfile';
import {
  getProfilePhotoStoragePath,
  signProfilePhotoReferences,
  toStoredProfilePhotoReference
} from './profilePhotoUrls';
import { normalizeProfileInterests } from './profileInterests';
import { normalizeProfileDetails } from './profileDetails';
import { getApiUrl } from './apiUrl';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { NATIVE_OAUTH_REDIRECT_URL, registerNativeOAuthCallbackListener } from './nativeOAuth';

// ============================================
// PRODUCTION SUPABASE CONFIGURATION
// ============================================

// Use import.meta.env for frontend, process.env for backend
const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
  '';

const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) ||
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.'
  );
}

if (SUPABASE_URL.includes('your-project') || SUPABASE_URL.includes('your-anon-key')) {
  throw new Error(
    'Supabase configuration contains placeholder values. Please replace with your actual Supabase credentials.'
  );
}

export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}
export function getSupabaseAnonKey(): string {
  return SUPABASE_ANON_KEY;
}
export function checkIsSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export const isSupabaseConfigured = checkIsSupabaseConfigured();

export const BAVEL_STORAGE_BUCKET = 'profile-photos';

// ============================================
// CLIENT SUPABASE
// ============================================

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  // Check if Supabase is already initialized globally
  if (typeof window !== 'undefined' && (window as any).__supabaseClient) {
    supabaseInstance = (window as any).__supabaseClient;
    return supabaseInstance;
  }

  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      experimental: { passkey: true }
    },
    db: { schema: 'public' },
    global: { headers: { 'X-Client-Info': 'bavel-production' } }
  });

  // Store globally to prevent multiple instances
  if (typeof window !== 'undefined') {
    (window as any).__supabaseClient = supabaseInstance;
  }

  return supabaseInstance;
}

export async function initSupabase(): Promise<SupabaseClient> {
  return getSupabase();
}

export { registerNativeOAuthCallbackListener } from './nativeOAuth';

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabase();
    if (client) {
      const val = (client as any)[prop];
      return typeof val === 'function' ? val.bind(client) : val;
    }
    return (target as any)[prop];
  }
});

// ============================================
// TYPES (schéma Supabase canonique)
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          name: string;
          age: number | null;
          city: string | null;
          gender: string | null;
          job: string | null;
          studies: string | null;
          bio: string | null;
          photos: string[];
          details: any;
          key_question: string | null;
          interests: any;
          latitude: number | null;
          longitude: number | null;
          is_online: boolean;
          is_suspended: boolean;
          tier: string;
          onboarding_completed: boolean;
          is_verified: boolean;
          quiz_data: any; // ✅ JSONB pour les données du quiz
          quiz_completed: boolean; // ✅ Boolean pour le statut du quiz
          quiz_completed_at: string | null; // ✅ Timestamp de complétion
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          match_id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          message_type: string | null;
          media_url: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      likes: {
        Row: {
          id: string;
          user_id: string; // ✅ user_id (pas sender_id)
          target_id: string;
          is_super_like: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['likes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['likes']['Insert']>;
      };
      matches: {
        Row: {
          id: string;
          user_id: string;
          matched_user_id: string;
          created_at: string;
          last_message_at: string | null;
          last_message_by: string | null;
          is_archived: boolean;
        };
        Insert: Omit<Database['public']['Tables']['matches']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['matches']['Insert']>;
      };
      swipes: {
        Row: {
          id: string;
          user_id: string;
          liked_user_id: string;
          is_liked: boolean;
          is_super_like: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['swipes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['swipes']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: any;
          is_read: boolean; // ✅ is_read (pas read)
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
    };
  };
}

// ============================================
// AUTHENTICATION
// ============================================

function extractAuthError(err: any, defaultMsg: string): string {
  if (!err) return defaultMsg;
  if (typeof err === 'string') return err;
  if (err.message && typeof err.message === 'string') {
    const m = err.message.toLowerCase();
    if (m.includes('invalid login credentials') || m.includes('invalid_grant')) {
      return 'Adresse e-mail ou mot de passe incorrect.';
    }
    if (m.includes('user already registered') || m.includes('already exists')) {
      return 'Un compte existe déjà avec cette adresse e-mail.';
    }
    if (m.includes('email not confirmed')) {
      return 'Veuillez confirmer votre adresse e-mail avant de vous connecter.';
    }
    return err.message;
  }
  if (err.error_description && typeof err.error_description === 'string') return err.error_description;
  return defaultMsg;
}

export async function signUpWithEmail(email: string, password: string, username?: string) {
  const client = await initSupabase();
  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: username ? { display_name: username, name: username, full_name: username } : undefined
      }
    });

    if (error) throw error;

    if (data.user && data.user.identities?.length === 0) {
      return { data: null, error: 'Cet e-mail possède déjà un compte. Veuillez vous connecter.' };
    }

    if (data.user) {
      const appUser = {
        id: data.user.id,
        email: data.user.email,
        name: username || data.user.user_metadata?.name || 'Membre',
        isGoogle: false,
        onboardingCompleted: false
      };
      localStorage.setItem('app_user', JSON.stringify(appUser));
    }

    return { data, error: null };
  } catch (err: any) {
    const msg = extractAuthError(err, "Erreur lors de l'inscription");
    console.warn('Supabase Sign Up Error:', msg);
    return { data: null, error: msg };
  }
}

export async function signInWithEmail(email: string, password: string) {
  const client = await initSupabase();
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data.user) {
      const appUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || 'Membre',
        isGoogle: data.user.app_metadata?.provider === 'google'
      };
      localStorage.setItem('app_user', JSON.stringify(appUser));
    }

    return { data, error: null };
  } catch (err: any) {
    const msg = extractAuthError(err, 'Identifiants ou mot de passe invalides');
    console.warn('Supabase Sign In Error:', msg);
    return { data: null, error: msg };
  }
}

export async function resetPasswordForEmail(email: string) {
  const client = await initSupabase();
  try {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`
    });
    if (error) throw error;
    return { error: null, success: true };
  } catch (err: any) {
    const msg = extractAuthError(err, 'Erreur lors de la réinitialisation');
    return { error: msg, success: false };
  }
}

export async function updatePassword(newPassword: string) {
  const client = await initSupabase();
  try {
    const { data, error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    const msg = extractAuthError(err, 'Erreur de modification du mot de passe');
    return { data: null, error: msg };
  }
}

export async function signInWithGoogle() {
  try {
    const client = await initSupabase();
    const isNative = Capacitor.isNativePlatform();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: isNative ? NATIVE_OAUTH_REDIRECT_URL : `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
        skipBrowserRedirect: isNative
      }
    });
    if (error) throw error;
    if (isNative && data.url) await Browser.open({ url: data.url });
    return { data, error: null };
  } catch (err: any) {
    const msg = extractAuthError(err, 'Erreur lors de la connexion Google');
    return { data: null, error: msg };
  }
}

export async function signInWithFacebook() {
  try {
    const client = await initSupabase();
    const isNative = Capacitor.isNativePlatform();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: isNative ? NATIVE_OAUTH_REDIRECT_URL : `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: isNative
      }
    });
    if (error) throw error;
    if (isNative && data.url) await Browser.open({ url: data.url });
    return { data, error: null };
  } catch (err: any) {
    const msg = extractAuthError(err, 'Erreur lors de la connexion Facebook');
    return { data: null, error: msg };
  }
}

export async function signInWithPasskey(options?: { signal?: AbortSignal }) {
  try {
    const client = await initSupabase();
    const { data, error } = await client.auth.signInWithPasskey({ options });
    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    const msg = extractAuthError(err, 'Impossible de se connecter avec cette clé d’accès.');
    return { data: null, error: msg };
  }
}

export async function registerPasskey(options?: { signal?: AbortSignal }) {
  try {
    const client = await initSupabase();
    const { data, error } = await client.auth.registerPasskey({ options });
    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    const msg = extractAuthError(err, 'Impossible d’enregistrer cette clé d’accès.');
    return { data: null, error: msg };
  }
}

export async function signOutFromSupabase() {
  try {
    const client = await initSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    const msg = extractAuthError(err, 'Erreur lors de la déconnexion');
    return { error: msg };
  } finally {
    [
      'app_user',
      'bavel_user_profile',
      'bavel_user_photos',
      'bavel_accounts_by_email',
      'bavel_blocked_users',
      'bavel_auth_user'
    ].forEach((key) => localStorage.removeItem(key));
  }
}

export async function deleteAccountFromSupabase(userId?: string) {
  const client = await initSupabase();
  try {
    const {
      data: { session }
    } = await client.auth.getSession();
    if (!session?.user) return { error: 'Session expirée. Reconnectez-vous.', success: false };
    if (userId && userId !== session.user.id) return { error: 'Utilisateur non autorisé.', success: false };

    const response = await fetch(getApiUrl('/api/account'), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
      credentials: 'include'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Suppression du compte impossible.');

    localStorage.removeItem('app_user');
    localStorage.removeItem('bavel_user_profile');
    localStorage.removeItem('bavel_user_photos');
    localStorage.removeItem('bavel_accounts_by_email');
    localStorage.removeItem('bavel_blocked_users');
    localStorage.removeItem('bavel_auth_user');
    await client.auth.signOut({ scope: 'local' });
    return { error: null, success: true };
  } catch (err: any) {
    const msg = extractAuthError(err, 'Erreur lors de la suppression du compte');
    return { error: msg, success: false };
  }
}

// ============================================
// PROFILES (identité canonique Supabase Auth)
// ============================================

export async function syncProfileToSupabase(profile: any, photos?: string[]) {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError) throw authError;

    const authenticatedUser = authData.user;
    if (!authenticatedUser?.id || !authenticatedUser.email) {
      console.warn('syncProfileToSupabase: An authenticated user with an email is required');
      return null;
    }

    const photoList = Array.isArray(photos)
      ? photos.filter(Boolean)
      : Array.isArray(profile.photos)
        ? profile.photos.filter(Boolean)
        : [];
    const rawBirthday = profile.birthday ?? profile.birthDate;
    const parsedBirthday = typeof rawBirthday === 'string' && rawBirthday.trim() ? new Date(rawBirthday) : null;
    const birthday =
      parsedBirthday && !Number.isNaN(parsedBirthday.getTime()) ? parsedBirthday.toISOString().slice(0, 10) : null;
    const birthdayAge = birthday
      ? Math.max(
          0,
          new Date().getUTCFullYear() -
            new Date(`${birthday}T00:00:00.000Z`).getUTCFullYear() -
            (new Date().toISOString().slice(5, 10) < birthday.slice(5, 10) ? 1 : 0)
        )
      : null;

    const payload: any = {
      name: profile.name || profile.username || 'Membre',
      age: birthdayAge ?? (typeof profile.age === 'number' ? profile.age : parseInt(profile.age) || null),
      ...(birthday ? { birthday } : {}),
      gender: profile.gender
        ? profile.gender === 'female'
          ? 'femme'
          : profile.gender === 'male'
            ? 'homme'
            : profile.gender
        : 'homme',
      city: profile.city || '',
      country: profile.country || parseProfileLocation(profile.location, profile.countryCode).country || '',
      country_code:
        profile.countryCode || parseProfileLocation(profile.location, profile.countryCode).countryCode || null,
      location_source: profile.locationSource || 'manual',
      location_updated_at: new Date().toISOString(),
      ...(Object.prototype.hasOwnProperty.call(profile, 'latitude')
        ? {
            latitude:
              typeof profile.latitude === 'number' &&
              Number.isFinite(profile.latitude) &&
              Math.abs(profile.latitude) <= 90
                ? profile.latitude
                : null
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(profile, 'longitude')
        ? {
            longitude:
              typeof profile.longitude === 'number' &&
              Number.isFinite(profile.longitude) &&
              Math.abs(profile.longitude) <= 180
                ? profile.longitude
                : null
          }
        : {}),
      bio: profile.bio || '',
      job: profile.job || profile.occupation || '',
      studies: profile.studies || profile.school || '',
      ...(Array.isArray(photos) || Array.isArray(profile.photos)
        ? { photos: photoList.map(toStoredProfilePhotoReference) }
        : {}),
      interests: normalizeProfileInterests(profile.interests),
      details: normalizeProfileDetails(profile.details),
      key_question: profile.keyQuestion || profile.key_question || '',
      is_online: true,
      last_active_at: new Date().toISOString(),
      onboarding_completed: Boolean(profile.onboardingCompleted || profile.onboarding_completed),
      updated_at: new Date().toISOString(),
      email: authenticatedUser.email.trim().toLowerCase()
    };

    const { data, error } = await client
      .from('profiles')
      .upsert({ id: authenticatedUser.id, ...payload }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('Supabase profile sync error:', error.message || error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Failed to sync profile to Supabase:', err);
    return null;
  }
}

// ============================================
// QUIZ / ONBOARDING (intégré dans profiles)
// ============================================

/**
 * Save quiz data to Supabase (dans la table profiles)
 */
export async function saveQuizToSupabase(userId: string, quizData: any): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const quizPayload = {
      gender: quizData.gender || '',
      birthday: quizData.birthday || '',
      purpose: quizData.purpose || '',
      city: quizData.city || '',
      latitude: quizData.latitude || null,
      longitude: quizData.longitude || null,
      sexual_orientation: quizData.sexualOrientation || '',
      relationship_status: quizData.relationshipStatus || '',
      bio: quizData.bio || '',
      height: quizData.height || '',
      school: quizData.school || '',
      job_title: quizData.jobTitle || '',
      company: quizData.company || '',
      drinking: quizData.drinking || '',
      smoking: quizData.smoking || '',
      kids: quizData.kids || '',
      education_level: quizData.educationLevel || '',
      personality: quizData.personality || '',
      interests: Array.isArray(quizData.interests) ? quizData.interests : [],
      pets: quizData.pets || '',
      star_sign: quizData.starSign || '',
      religion: quizData.religion || '',
      languages: quizData.languages || '',
      prompt1_question: quizData.prompt1Question || '',
      prompt1_answer: quizData.prompt1Answer || '',
      prompt2_question: quizData.prompt2Question || '',
      prompt2_answer: quizData.prompt2Answer || '',
      prompt3_question: quizData.prompt3Question || '',
      prompt3_answer: quizData.prompt3Answer || ''
    };

    const payload = {
      quiz_data: quizPayload,
      quiz_completed: true,
      quiz_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from('profiles').update(payload).eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('Failed to save quiz to Supabase:', err);
    return { success: false, error: err.message || 'Failed to save quiz' };
  }
}

export async function completeOnboardingInSupabase(quizData: any, photos: string[] = []) {
  const client = getSupabase();
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) return { success: false, error: 'Session expirée. Reconnectez-vous.' };
  const profile = {
    ...quizData,
    id: user.id,
    email: user.email || quizData.email,
    age: quizData.birthday ? Math.max(0, new Date().getFullYear() - new Date(quizData.birthday).getFullYear()) : null,
    onboardingCompleted: true,
    photos
  };
  const synced = await syncProfileToSupabase(profile, photos);
  if (!synced) return { success: false, error: 'Profil impossible à enregistrer.' };
  return saveQuizToSupabase(user.id, quizData);
}

/**
 * Fetch quiz data for a user (depuis la table profiles)
 */
export async function fetchQuizFromSupabase(userId: string): Promise<any | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('quiz_data, quiz_completed, quiz_completed_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Failed to fetch quiz from Supabase:', err);
    return null;
  }
}

/**
 * Check if user has completed the quiz
 */
export async function hasUserCompletedQuiz(userId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { data, error } = await client.from('profiles').select('quiz_completed').eq('id', userId).maybeSingle();

    if (error) return false;
    return data?.quiz_completed || false;
  } catch (err) {
    console.warn('Failed to check quiz completion:', err);
    return false;
  }
}

export async function fetchProfileFromSupabase(userId: string) {
  const client = getSupabase();
  if (!client || !userId) return null;

  try {
    const res = await client.from('profiles').select('*').eq('id', userId).maybeSingle();

    if (res.error) {
      console.warn('Supabase profile fetch error:', res.error.message || res.error);
      return null;
    }

    if (!res.data) return null;
    const signedPhotos = await signProfilePhotoReferences(
      client,
      Array.isArray(res.data.photos) ? res.data.photos : []
    );
    let signedAvatar = '';
    if (typeof res.data.avatar_url === 'string' && res.data.avatar_url) {
      [signedAvatar] = await signProfilePhotoReferences(client, [res.data.avatar_url]);
    }
    return {
      ...res.data,
      photos: signedPhotos,
      avatar_url: signedAvatar || signedPhotos.find(Boolean) || ''
    };
  } catch (err) {
    console.warn('Failed to fetch profile from Supabase:', err);
    return null;
  }
}

export async function fetchAllProfilesFromSupabase() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const {
      data: { session },
      error: sessionError
    } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.access_token) return [];

    const response = await fetch(getApiUrl('/api/profiles'), {
      headers: { Authorization: `Bearer ${session.access_token}` },
      credentials: 'include'
    });
    if (!response.ok) throw new Error(`Profile discovery request failed (${response.status}).`);

    const result = await response.json();
    if (!Array.isArray(result?.profiles)) {
      throw new Error('Profile discovery returned an invalid response.');
    }
    return result.profiles;
  } catch (err) {
    console.warn('Failed to fetch public profiles from the application server:', err);
    return null;
  }
}

export async function fetchMatchedProfilesFromSupabase() {
  const client = getSupabase();
  if (!client) return null;

  try {
    const {
      data: { session },
      error: sessionError
    } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.access_token) return [];

    const response = await fetch(getApiUrl('/api/chat/matched-profiles'), {
      headers: { Authorization: `Bearer ${session.access_token}` },
      credentials: 'include'
    });
    if (!response.ok) throw new Error(`Matched chat profiles request failed (${response.status}).`);

    const result = await response.json();
    if (!Array.isArray(result?.profiles)) {
      throw new Error('Matched chat profiles returned an invalid response.');
    }
    return result.profiles;
  } catch (err) {
    console.warn('Failed to fetch matched chat profiles:', err);
    return null;
  }
}

// ============================================
// SWIPES & LIKES (✅ user_id au lieu de sender_id)
// ============================================

export async function saveSwipeToSupabase(userId: string, likedUserId: string, isLiked: boolean = true) {
  const client = getSupabase();
  if (!client) return { isMatch: false, error: 'Supabase client is unavailable.' };

  if (!userId || !likedUserId) {
    return { isMatch: false, error: 'Missing required IDs' };
  }

  try {
    const { error: swipeError } = await client.from('swipes').upsert(
      {
        user_id: userId,
        target_id: likedUserId,
        is_liked: isLiked
      },
      { onConflict: 'user_id,target_id' }
    );

    if (swipeError) throw swipeError;

    if (!isLiked) return { isMatch: false, error: null };

    // Vérifier match mutuel
    const { data: reverseLike, error: reverseLikeError } = await client
      .from('swipes')
      .select('id')
      .eq('user_id', likedUserId)
      .eq('target_id', userId)
      .maybeSingle();
    if (reverseLikeError) throw reverseLikeError;

    let isMatch = false;
    if (reverseLike) {
      const match = await createMatchInSupabase(userId, likedUserId);
      if (!match) throw new Error('Le match mutuel n’a pas pu être enregistré.');
      isMatch = true;
    }

    return { isMatch, error: null };
  } catch (err: any) {
    console.warn('Error saving swipe:', err);
    return { isMatch: false, error: err?.message };
  }
}

/**
 * Delete the last swipe for a user
 */
export async function deleteLastSwipeFromSupabase(userId: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabase();
  if (!client) return { success: false, error: 'Supabase not configured' };

  try {
    const { error } = await client
      .from('swipes')
      .delete()
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.warn('Failed to delete last swipe:', err);
    return { success: false, error: err.message || 'Failed to delete last swipe' };
  }
}

export async function saveLikeToSupabase(userId: string, targetId: string, isSuperLike: boolean = false) {
  const client = getSupabase();
  if (!client) return { data: null, isMatch: false };
  if (!userId || !targetId) return { data: null, isMatch: false };

  try {
    const { error: likeError } = await client.from('swipes').upsert(
      {
        user_id: userId,
        target_id: targetId,
        is_liked: true,
        is_super_like: isSuperLike
      },
      { onConflict: 'user_id,target_id' }
    );
    if (likeError) throw likeError;

    const { data: reverseLike, error: reverseLikeError } = await client
      .from('swipes')
      .select('id')
      .eq('user_id', targetId)
      .eq('target_id', userId)
      .maybeSingle();
    if (reverseLikeError) throw reverseLikeError;

    let isMatch = false;
    if (reverseLike) {
      const match = await createMatchInSupabase(userId, targetId);
      if (!match) throw new Error('Le match mutuel n’a pas pu être enregistré.');
      isMatch = true;
    }

    return { data: true, isMatch };
  } catch (err) {
    console.warn('Failed to save like to Supabase:', err);
    return { data: null, isMatch: false };
  }
}

export async function fetchLikesFromSupabase(userId: string) {
  const client = getSupabase();
  if (!client || !userId) return [];

  try {
    const { data, error } = await client.from('swipes').select('target_id').eq('user_id', userId).eq('is_liked', true);

    if (error) {
      console.warn('Supabase fetch likes error:', error.message || error);
      return [];
    }
    return data ? data.map((item) => item.target_id) : [];
  } catch (err) {
    console.warn('Failed to fetch likes from Supabase:', err);
    return [];
  }
}

export async function fetchReceivedLikesFromSupabase(userId: string) {
  const client = getSupabase();
  if (!client || !userId) return [];

  try {
    const { data, error } = await client.from('swipes').select('user_id').eq('target_id', userId);

    if (error) {
      console.warn('Supabase fetch received likes error:', error.message || error);
      return [];
    }
    return data ? data.map((item) => item.user_id) : []; // ✅
  } catch (err) {
    console.warn('Failed to fetch received likes from Supabase:', err);
    return [];
  }
}

export async function removeLikeFromSupabase(userId: string, targetId: string) {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from('swipes')
      .delete()
      .eq('user_id', userId) // ✅
      .eq('target_id', targetId);

    if (error) {
      console.warn('Supabase remove like error:', error.message || error);
      return false;
    }

    await client
      .from('matches')
      .delete()
      .or(
        `and(user_id.eq.${userId},matched_user_id.eq.${targetId}),and(user_id.eq.${targetId},matched_user_id.eq.${userId})`
      );

    return true;
  } catch (err) {
    console.warn('Failed to remove like from Supabase:', err);
    return false;
  }
}

export async function dismissReceivedLikeInSupabase(userId: string, senderId: string) {
  // ⚠️ Ta table likes n'a PAS de colonne is_dismissed
  // On supprime directement le like à la place
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client
      .from('swipes')
      .delete()
      .eq('user_id', senderId)
      .eq('target_id', userId)
      .eq('is_liked', true);

    if (error) {
      console.warn('Supabase dismiss received like error:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to dismiss received like:', err);
    return false;
  }
}

export async function createMatchInSupabase(userId: string, profileId: string) {
  const client = getSupabase();
  if (!client || !userId || !profileId) return null;

  try {
    const { data: existing } = await client
      .from('matches')
      .select('*')
      .or(
        `and(user_id.eq.${userId},matched_user_id.eq.${profileId}),and(user_id.eq.${profileId},matched_user_id.eq.${userId})`
      )
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await client
      .from('matches')
      .insert({ user_id: userId, matched_user_id: profileId })
      .select();

    if (error) {
      console.warn('Supabase create match error:', error.message || error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Failed to create match in Supabase:', err);
    return null;
  }
}

export async function fetchMatchesFromSupabase(userId: string) {
  if (!userId) return [];
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('matches')
      .select('*')
      .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch matches error:', error.message || error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Failed to fetch matches from Supabase:', err);
    return [];
  }
}

// ============================================
// MESSAGES (champs canoniques is_read et created_at)
// ============================================

export async function saveMessageToSupabase(
  matchId: string,
  senderId: string,
  text: string,
  isUser: boolean = true,
  receiverId?: string
) {
  const client = getSupabase();
  if (!client || !senderId) return null;

  try {
    let rawReceiver = receiverId || '';
    if (!rawReceiver) {
      const { data: match, error: matchError } = await client
        .from('matches')
        .select('user_id,matched_user_id')
        .eq('id', matchId)
        .or(`user_id.eq.${senderId},matched_user_id.eq.${senderId}`)
        .maybeSingle();
      if (matchError || !match) {
        console.warn('Unable to resolve message recipient:', matchError?.message || 'match not found');
        return null;
      }
      rawReceiver = match.user_id === senderId ? match.matched_user_id : match.user_id;
    }

    const message = await sendMessageThroughServer(
      matchId,
      rawReceiver,
      text,
      text.startsWith('[GIF]') ? 'image' : 'text'
    );
    return message ? [message] : null;
  } catch (err) {
    console.warn('Failed to save message to Supabase:', err);
    return null;
  }
}

export async function sendMessageThroughServer(
  matchId: string,
  receiverId: string,
  content: string,
  type = 'text',
  clientMessageId?: string
) {
  const {
    data: { session }
  } = await getSupabase().auth.getSession();
  if (!session?.access_token) throw new Error('Session utilisateur requise.');
  const response = await fetch(getApiUrl('/api/messages'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ matchId, receiverId, content, type, clientMessageId })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Message bloqué.');
  return payload?.message || null;
}

export async function fetchMessagesFromSupabase(matchId: string, currentUserId: string) {
  const client = getSupabase();
  if (!client || !currentUserId) return [];

  try {
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase messages fetch error:', error.message || error);
      return [];
    }

    return (data || []).map((m: any) => ({
      id: m.id,
      matchId: m.match_id,
      match_id: m.match_id,
      senderId: m.sender_id,
      sender_id: m.sender_id,
      receiver_id: m.receiver_id,
      text: m.content || '',
      content: m.content || '',
      isUser: m.sender_id === currentUserId,
      is_user: m.sender_id === currentUserId,
      timestamp: m.created_at || new Date().toISOString(),
      read: m.is_read || false,
      is_read: m.is_read || false
    }));
  } catch (err) {
    console.warn('Failed to fetch messages from Supabase:', err);
    return [];
  }
}

export async function markMessagesAsReadInSupabase(matchId: string, currentUserId: string) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is unavailable.');

  const { error } = await client
    .from('messages')
    .update({ is_read: true })
    .eq('match_id', matchId)
    .eq('receiver_id', currentUserId)
    .neq('sender_id', currentUserId);
  if (error) {
    console.error('Failed to mark messages as read:', error);
    throw error;
  }
  return true;
}

// ============================================
// REALTIME
// ============================================

export function subscribeToMessages(matchId: string, callback: (message: any) => void) {
  const client = getSupabase();
  if (!client) return () => {};

  try {
    const channel = client.channel(`chat_${matchId}`).on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`
      },
      (payload) => {
        const m = payload.new;
        callback({
          id: m.id,
          matchId: m.match_id,
          match_id: m.match_id,
          senderId: m.sender_id,
          sender_id: m.sender_id,
          receiver_id: m.receiver_id,
          text: m.content || '',
          content: m.content || '',
          isUser: false,
          is_user: false,
          timestamp: m.created_at || new Date().toISOString(),
          read: m.is_read || false,
          is_read: m.is_read || false
        });
      }
    );

    channel.subscribe();

    return () => {
      const supabaseClient = getSupabase();
      if (supabaseClient) {
        supabaseClient.removeChannel(channel);
      }
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}

export function subscribeToMatches(userId: string, callback: (match: any) => void) {
  const client = getSupabase();
  if (!client) return () => {};

  try {
    const channel = client
      .channel(`matches_${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, (payload) => {
        const m = payload.new;
        if (m.user_id === userId || m.matched_user_id === userId) {
          callback(m);
        }
      });

    channel.subscribe();

    return () => {
      const supabaseClient = getSupabase();
      if (supabaseClient) {
        supabaseClient.removeChannel(channel);
      }
    };
  } catch (err) {
    console.warn('Realtime matches subscription error:', err);
    return () => {};
  }
}

/**
 * Subscribe to real-time likes (notifications when someone likes the user)
 */
export function subscribeToLikes(userId: string, callback: (like: any) => void) {
  const client = getSupabase();
  if (!client) return () => {};

  try {
    const channel = client.channel(`likes_${userId}`).on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'swipes',
        filter: `target_id=eq.${userId}`
      },
      (payload) => {
        if (payload.new?.is_liked === true) callback(payload.new);
      }
    );

    channel.subscribe();

    return () => {
      const supabaseClient = getSupabase();
      if (supabaseClient) {
        supabaseClient.removeChannel(channel);
      }
    };
  } catch (err) {
    console.warn('Realtime likes subscription error:', err);
    return () => {};
  }
}

/**
 * Subscribe to real-time profile updates
 */
export function subscribeToProfileUpdates(userId: string, callback: (profile: any) => void) {
  const client = getSupabase();
  if (!client) return () => {};

  try {
    const channel = client.channel(`profile_${userId}`).on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new);
      }
    );

    channel.subscribe();

    return () => {
      const supabaseClient = getSupabase();
      if (supabaseClient) {
        supabaseClient.removeChannel(channel);
      }
    };
  } catch (err) {
    console.warn('Realtime profile updates subscription error:', err);
    return () => {};
  }
}

/**
 * Unsubscribe from a realtime channel
 */
export function unsubscribeFromChannel(channel: any) {
  if (channel) {
    const client = getSupabase();
    if (client) {
      client.removeChannel(channel);
    }
  }
}

// ============================================
// STORAGE
// ============================================

export async function uploadProfilePhotoToSupabase(
  file: File | Blob,
  userId: string,
  slotIndex: number = 0
): Promise<{ url: string; path: string }> {
  const client = getSupabase();
  if (!client) throw new Error('Connexion Supabase indisponible.');
  if (!userId || userId.includes('/') || !Number.isInteger(slotIndex) || slotIndex < 0) {
    throw new Error('Identifiant utilisateur ou emplacement photo invalide.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('La photo ne doit pas dépasser 10 Mio.');
  }

  try {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    if (authData.user?.id !== userId) {
      throw new Error('Vous devez être connecté pour téléverser cette photo.');
    }

    const fileExt =
      file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/png'
          ? 'png'
          : file.type === 'image/jpeg' || file.type === 'image/jpg'
            ? 'jpg'
            : null;
    if (!fileExt) throw new Error('Format photo non pris en charge.');
    const filePath = `${userId}/profile_${slotIndex}_${Date.now()}.${fileExt}`;

    const { error } = await client.storage
      .from(BAVEL_STORAGE_BUCKET)
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (error) throw error;

    try {
      const signedPhotos = await signProfilePhotoReferences(client, [filePath]);
      if (!signedPhotos[0]) throw new Error('URL temporaire de la photo indisponible.');
      return { url: signedPhotos[0], path: filePath };
    } catch (error) {
      const { error: cleanupError } = await client.storage.from(BAVEL_STORAGE_BUCKET).remove([filePath]);
      if (cleanupError) {
        console.error('Failed to remove profile photo after signing failed:', cleanupError);
      }
      throw error;
    }
  } catch (err) {
    console.error('Supabase Storage photo upload failed:', err);
    throw err;
  }
}

export async function updateProfilePhotosInSupabase(userId: string, photos: string[]): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error('Connexion Supabase indisponible.');

  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user || authData.user.id !== userId) {
    throw new Error('Vous devez être connecté pour modifier ces photos.');
  }

  const storedPhotos = photos.filter(Boolean).map((photo) => {
    const path = getProfilePhotoStoragePath(photo);
    if (!path || path.split('/')[0] !== userId) {
      throw new Error('Chaque photo doit être stockée dans votre espace privé avant son enregistrement.');
    }
    return toStoredProfilePhotoReference(photo);
  });

  const { error } = await client
    .from('profiles')
    .update({
      photos: storedPhotos.filter(Boolean),
      avatar_url: storedPhotos.find(Boolean) || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select('id')
    .single();
  if (error) throw error;
}

export async function deleteUploadedProfilePhotoFromSupabase(path: string): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error('Connexion Supabase indisponible.');

  const { error } = await client.storage.from(BAVEL_STORAGE_BUCKET).remove([path]);
  if (error) throw error;
}

// ============================================
// MODERATION
// ============================================

export async function deleteDiscussionInSupabase(userId: string, targetId: string) {
  const client = getSupabase();
  if (!client) return false;

  try {
    await client
      .from('matches')
      .delete()
      .or(
        `and(user_id.eq.${userId},matched_user_id.eq.${targetId}),and(user_id.eq.${targetId},matched_user_id.eq.${userId})`
      );
    return true;
  } catch (err) {
    console.warn('Failed to delete discussion from Supabase:', err);
    return false;
  }
}

export async function blockUserInSupabase(userId: string, targetId: string) {
  const client = getSupabase();
  try {
    await deleteDiscussionInSupabase(userId, targetId);
    if (client) {
      await client.from('blocks').insert({
        user_id: userId,
        blocked_user_id: targetId
      });
      await client
        .from('swipes')
        .delete()
        .or(`and(user_id.eq.${userId},target_id.eq.${targetId}),and(user_id.eq.${targetId},target_id.eq.${userId})`);
    }
    return true;
  } catch (err) {
    console.warn('Failed to block user:', err);
    return false;
  }
}

export async function reportUserInSupabase(userId: string, targetId: string, reason: string) {
  const client = getSupabase();
  try {
    if (client) {
      await client.from('reports').insert({
        reporter_id: userId,
        reported_id: targetId,
        category: 'other',
        description: reason,
        status: 'pending'
      });
    }
    await blockUserInSupabase(userId, targetId);
    return true;
  } catch (err) {
    console.warn('Failed to report user:', err);
    await blockUserInSupabase(userId, targetId);
    return true;
  }
}

// ============================================
// MONETIZATION
// ============================================

export async function fetchUserCredits(userId: string): Promise<number> {
  const client = getSupabase();
  try {
    const { data, error } = await client.from('credits').select('balance').eq('user_id', userId).single();

    if (error) {
      if (error.code === 'PGRST116') return 0;
      throw error;
    }
    return data?.balance || 0;
  } catch (err) {
    console.warn('Failed to fetch user credits:', err);
    return 0;
  }
}

export async function fetchUserTransactions(userId: string): Promise<any[]> {
  const client = getSupabase();
  try {
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Failed to fetch user transactions:', err);
    return [];
  }
}

export async function fetchActiveBoost(userId: string): Promise<any | null> {
  const client = getSupabase();
  try {
    const { data, error } = await client
      .from('boosts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  } catch (err) {
    console.warn('Failed to fetch active boost:', err);
    return null;
  }
}

export async function fetchUserSubscription(userId: string): Promise<any | null> {
  const client = getSupabase();
  try {
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  } catch (err) {
    console.warn('Failed to fetch user subscription:', err);
    return null;
  }
}

export async function fetchUserTier(userId: string): Promise<'free' | 'extra' | 'premium' | 'vip'> {
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from('credits')
      .select('tier,premium_expires_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (data?.premium_expires_at && new Date(data.premium_expires_at).getTime() <= Date.now()) return 'free';
    const tier = String(data?.tier || '').toLowerCase();
    if (tier === 'extra' || tier === 'premium' || tier === 'vip') return tier;
    return 'free';
  } catch (err) {
    console.warn('Failed to fetch user tier:', err);
    return 'free';
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  getSupabase,
  supabase,
  isSupabaseConfigured,
  BAVEL_STORAGE_BUCKET,

  signUpWithEmail,
  signInWithEmail,
  resetPasswordForEmail,
  updatePassword,
  signInWithGoogle,
  signInWithPasskey,
  registerPasskey,
  signOutFromSupabase,
  deleteAccountFromSupabase,

  syncProfileToSupabase,
  fetchProfileFromSupabase,
  fetchAllProfilesFromSupabase,
  fetchMatchedProfilesFromSupabase,
  saveQuizToSupabase,
  fetchQuizFromSupabase,
  hasUserCompletedQuiz,

  saveSwipeToSupabase,
  saveLikeToSupabase,
  fetchLikesFromSupabase,
  fetchReceivedLikesFromSupabase,
  removeLikeFromSupabase,
  dismissReceivedLikeInSupabase,
  createMatchInSupabase,
  fetchMatchesFromSupabase,
  deleteLastSwipeFromSupabase,

  saveMessageToSupabase,
  fetchMessagesFromSupabase,
  markMessagesAsReadInSupabase,
  subscribeToMessages,
  subscribeToMatches,
  subscribeToLikes,
  subscribeToProfileUpdates,
  unsubscribeFromChannel,

  uploadProfilePhotoToSupabase,

  deleteDiscussionInSupabase,
  blockUserInSupabase,
  reportUserInSupabase,

  fetchUserCredits,
  fetchUserTransactions,
  fetchActiveBoost,
  fetchUserSubscription,
  fetchUserTier
};
