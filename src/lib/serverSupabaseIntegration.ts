/**
 * Server-side Supabase Integration for Production
 * Replaces in-memory Maps with persistent Supabase storage
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import WebSocket from 'ws';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for server-side Supabase operations.');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  realtime: {
    transport: WebSocket as unknown as typeof globalThis.WebSocket,
  },
});

export function getServiceClient() {
  return supabase;
}

// ============================================
// USER ACCOUNTS MANAGEMENT
// ============================================

export async function createUserAccount(userData: {
  userId: string;
  email: string;
  passwordHash?: string;
  authProvider?: string;
  facebookId?: string;
  name?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .insert({
        user_id: userData.userId,
        email: userData.email,
        password_hash: userData.passwordHash,
        auth_provider: userData.authProvider || 'email',
        facebook_id: userData.facebookId,
        name: userData.name,
        avatar_url: userData.avatarUrl,
        is_verified: userData.isVerified || false,
        is_active: true,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create user account:', error);
      return { success: false, error: error.message };
    }
    return { success: true, user: data };
  } catch (err: any) {
    console.error('Error creating user account:', err);
    return { success: false, error: err.message || 'Failed to create account' };
  }
}

export async function getUserAccount(userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error getting user account:', err);
    return null;
  }

}

export async function createDataRequest(userId: string, requestType: 'export' | 'deletion' | 'access') {
  const { data, error } = await supabase
    .from('data_requests')
    .insert({ user_id: userId, request_type: requestType })
    .select('id, request_type, status, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function createAuditLog(userId: string, eventType: string, description: string, metadata: Record<string, unknown> = {}) {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: userId,
    event_type: eventType,
    description,
    metadata
  });
  if (error) throw error;
}

export async function exportUserData(userId: string) {
  const tables = ['profiles', 'swipes', 'matches', 'messages', 'blocks', 'reports', 'notifications', 'data_requests'];
  const result: Record<string, unknown[]> = {};
  for (const table of tables) {
    const column = table === 'profiles' ? 'id' : table === 'reports' ? 'reporter_id' : 'user_id';
    const { data, error } = await supabase.from(table).select('*').eq(column, userId);
    if (error) throw error;
    result[table] = data || [];
  }

  return result;
}

export async function getRecommendationData(userId: string) {
  const [{ data: profile, error: profileError }, { data: candidates, error: candidatesError }, { data: swipes, error: swipesError }, { data: blocks, error: blocksError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('profiles').select(
      'id,name,age,gender,city,country,country_code,latitude,longitude,bio,job,studies,alcohol,personality,zodiac,pets,photos,interests,details,key_question,is_verified,is_online,is_suspended,onboarding_completed,avatar_url,created_at,last_active_at'
    )
      .eq('is_suspended', false)
      .eq('onboarding_completed', true)
      .neq('id', userId)
      .limit(200),
    supabase.from('swipes').select('target_id').eq('user_id', userId),
    supabase.from('blocks').select('user_id,blocked_user_id').or(`user_id.eq.${userId},blocked_user_id.eq.${userId}`)
  ]);
  if (profileError || candidatesError || swipesError || blocksError) {
    throw profileError || candidatesError || swipesError || blocksError;
  }
  const excluded = new Set((swipes || []).map((swipe) => String(swipe.target_id)));
  (blocks || []).forEach((block: any) => {
    const otherId = String(block.user_id) === userId ? block.blocked_user_id : block.user_id;
    if (otherId) excluded.add(String(otherId));
  });
  return {
    profile,
    candidates: (candidates || []).filter((candidate) => !excluded.has(String(candidate.id)))
  };
}

export async function getUserStatistics(userId: string) {
  const [{ count: views }, { count: likes }, { count: matches }, { count: messages }] = await Promise.all([
    supabase.from('profile_visits').select('*', { count: 'exact', head: true }).eq('visited_user_id', userId),
    supabase.from('swipes').select('*', { count: 'exact', head: true }).eq('target_id', userId).eq('is_liked', true),
    supabase.from('matches').select('*', { count: 'exact', head: true }).or(`user_id.eq.${userId},matched_user_id.eq.${userId}`),
    supabase.from('messages').select('*', { count: 'exact', head: true }).or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
  ]);
  return { views: views || 0, likes: likes || 0, matches: matches || 0, messages: messages || 0 };
}

export async function getUserAccountByEmail(email: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error getting user account by email:', err);
    return null;
  }
}

export async function getUserAccountByFacebookId(facebookId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('facebook_id', facebookId)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error getting user account by Facebook ID:', err);
    return null;
  }
}

export async function updateUserAccount(userId: string, updates: any): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Failed to update user account:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error updating user account:', err);
    return { success: false, error: err.message || 'Failed to update account' };
  }
}

export async function updateLastLogin(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_accounts')
      .update({ last_login_at: new Date().toISOString() })
      .eq('user_id', userId);
    
    return !error;
  } catch (err) {
    console.error('Error updating last login:', err);
    return false;
  }
}

export async function deactivateAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_accounts')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Failed to deactivate account:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error deactivating account:', err);
    return { success: false, error: err.message || 'Failed to deactivate account' };
  }
}

export async function deleteAccount(userId: string, email: string, reason?: string): Promise<{ success: boolean; error?: string; token?: string }> {
  try {
    // Create deletion request with token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const { error } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: userId,
        email,
        reason,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      });
    
    if (error) {
      console.error('Failed to create deletion request:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, token };
  } catch (err: any) {
    console.error('Error creating deletion request:', err);
    return { success: false, error: err.message || 'Failed to create deletion request' };
  }
}

export async function confirmAccountDeletion(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get deletion request
    const { data: request, error: fetchError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    
    if (fetchError || !request) {
      return { success: false, error: 'Invalid or expired deletion token' };
    }
    
    // Mark account as deleted
    const { error: updateError } = await supabase
      .from('user_accounts')
      .update({ 
        is_deleted: true,
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', request.user_id);
    
    if (updateError) {
      console.error('Failed to mark account as deleted:', updateError);
      return { success: false, error: updateError.message };
    }
    
    // Update deletion request status
    await supabase
      .from('account_deletion_requests')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', request.id);
    
    return { success: true };
  } catch (err: any) {
    console.error('Error confirming account deletion:', err);
    return { success: false, error: err.message || 'Failed to delete account' };
  }
}

export async function cancelAccountDeletion(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('account_deletion_requests')
      .update({ status: 'cancelled' })
      .eq('token', token)
      .eq('status', 'pending');
    
    if (error) {
      console.error('Failed to cancel deletion request:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Error cancelling account deletion:', err);
    return { success: false, error: err.message || 'Failed to cancel deletion' };
  }
}

// ============================================
// PROFILE UPDATES HISTORY
// ============================================

export async function logProfileUpdate(userId: string, fieldName: string, oldValue: any, newValue: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profile_updates_history')
      .insert({
        user_id: userId,
        field_name: fieldName,
        old_value: oldValue,
        new_value: newValue,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to log profile update:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error logging profile update:', err);
    return false;
  }
}

export async function getProfileUpdateHistory(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('profile_updates_history')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Failed to get profile update history:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Error getting profile update history:', err);
    return [];
  }
}

// ============================================
// ENHANCED PROFILE MANAGEMENT
// ============================================

export async function updateUserProfileInSupabase(userId: string, profileData: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current profile for logging
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Failed to update profile:', error);
      return { success: false, error: error.message };
    }
    
    // Log changes
    if (currentProfile) {
      for (const [key, newValue] of Object.entries(profileData)) {
        if (currentProfile[key] !== newValue) {
          await logProfileUpdate(userId, key, currentProfile[key], newValue);
        }
      }
    }
    
    return { success: true };
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return { success: false, error: err.message || 'Failed to update profile' };
  }
}

export async function getUserProfileFromSupabase(userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error getting profile from Supabase:', err);
    return null;
  }
}

export async function updateUserPhoto(userId: string, photoUrl: string, isPrimary: boolean = false): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('photos')
      .eq('id', userId)
      .maybeSingle();
    
    const currentPhotos = currentProfile?.photos || [];
    let updatedPhotos = [...currentPhotos];
    
    if (isPrimary) {
      // Remove current primary photo
      updatedPhotos = updatedPhotos.map((photo: any) => ({ ...photo, isPrimary: false }));
      // Add new primary photo
      updatedPhotos.unshift({ url: photoUrl, isPrimary: true, addedAt: new Date().toISOString() });
    } else {
      updatedPhotos.push({ url: photoUrl, isPrimary: false, addedAt: new Date().toISOString() });
    }
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        photos: updatedPhotos,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Failed to update user photo:', error);
      return { success: false, error: error.message };
    }
    
    await logProfileUpdate(userId, 'photos', currentPhotos, updatedPhotos);
    
    return { success: true };
  } catch (err: any) {
    console.error('Error updating user photo:', err);
    return { success: false, error: err.message || 'Failed to update photo' };
  }
}

export async function deleteUserPhoto(userId: string, photoUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('photos')
      .eq('id', userId)
      .maybeSingle();
    
    const currentPhotos = currentProfile?.photos || [];
    const updatedPhotos = currentPhotos.filter((photo: any) => photo.url !== photoUrl);
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        photos: updatedPhotos,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Failed to delete user photo:', error);
      return { success: false, error: error.message };
    }
    
    await logProfileUpdate(userId, 'photos', currentPhotos, updatedPhotos);
    
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting user photo:', err);
    return { success: false, error: err.message || 'Failed to delete photo' };
  }
}

// ============================================
// USER PROFILES STORE
// ============================================

export async function saveUserProfile(email: string, profile: any, photos: any[] = []): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles_store')
      .upsert({
        email,
        profile,
        photos,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to save user profile:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving user profile:', err);
    return false;
  }
}

export async function getUserProfile(email: string): Promise<{ profile: any; photos: any[] } | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles_store')
      .select('profile, photos')
      .eq('email', email)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }
    
    return {
      profile: data.profile,
      photos: data.photos || []
    };
  } catch (err) {
    console.error('Error getting user profile:', err);
    return null;
  }
}

export async function hasUserProfile(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_profiles_store')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    return !error && !!data;
  } catch (err) {
    console.error('Error checking user profile:', err);
    return false;
  }
}

// ============================================
// ENCOUNTERS LIKES STORE
// ============================================

export async function addEncounterLike(userId: string, likedUserId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('encounters_likes')
      .insert({
        user_id: userId,
        liked_user_id: likedUserId
      });
    
    if (error) {
      console.error('Failed to add encounter like:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error adding encounter like:', err);
    return false;
  }
}

export async function getEncounterLikes(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('encounters_likes')
      .select('liked_user_id')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Failed to get encounter likes:', error);
      return [];
    }
    
    return data?.map(item => item.liked_user_id) || [];
  } catch (err) {
    console.error('Error getting encounter likes:', err);
    return [];
  }
}

export async function hasEncounterLike(userId: string, likedUserId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('encounters_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('liked_user_id', likedUserId)
      .maybeSingle();
    
    return !error && !!data;
  } catch (err) {
    console.error('Error checking encounter like:', err);
    return false;
  }
}

export async function removeEncounterLike(userId: string, likedUserId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('encounters_likes')
      .delete()
      .eq('user_id', userId)
      .eq('liked_user_id', likedUserId);
    
    return !error;
  } catch (err) {
    console.error('Error removing encounter like:', err);
    return false;
  }
}

// ============================================
// ENCOUNTERS MATCHES STORE
// ============================================

export async function addEncounterMatch(userId: string, matchedUserId: string, matchData: any = {}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('encounters_matches')
      .insert({
        user_id: userId,
        matched_user_id: matchedUserId,
        match_data: matchData
      });
    
    if (error) {
      console.error('Failed to add encounter match:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error adding encounter match:', err);
    return false;
  }
}

export async function getEncounterMatches(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('encounters_matches')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Failed to get encounter matches:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Error getting encounter matches:', err);
    return [];
  }
}

export async function hasEncounterMatch(userId: string, matchedUserId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('encounters_matches')
      .select('id')
      .eq('user_id', userId)
      .eq('matched_user_id', matchedUserId)
      .maybeSingle();
    
    return !error && !!data;
  } catch (err) {
    console.error('Error checking encounter match:', err);
    return false;
  }
}

// ============================================
// USER SECURITY
// ============================================

export async function getUserSecurity(email: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('user_security')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Error getting user security:', err);
    return null;
  }
}

export async function saveUserSecurity(email: string, securityData: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_security')
      .upsert({
        email,
        ...securityData,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to save user security:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving user security:', err);
    return false;
  }
}

export async function updateUserSecurity(email: string, updates: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_security')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('email', email);
    
    if (error) {
      console.error('Failed to update user security:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error updating user security:', err);
    return false;
  }
}

// ============================================
// USER PASSWORDS
// ============================================

export async function saveUserPassword(email: string, passwordHash: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_passwords')
      .upsert({
        email,
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to save user password:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving user password:', err);
    return false;
  }
}

export async function getUserPassword(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_passwords')
      .select('password_hash')
      .eq('email', email)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }
    
    return data.password_hash;
  } catch (err) {
    console.error('Error getting user password:', err);
    return null;
  }
}

export async function hasUserPassword(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_passwords')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    return !error && !!data;
  } catch (err) {
    console.error('Error checking user password:', err);
    return false;
  }
}

// ============================================
// RESET TOKENS
// ============================================

export async function createResetToken(token: string, email: string, expires: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reset_tokens')
      .insert({
        token,
        email,
        expires_at: new Date(expires).toISOString()
      });
    
    if (error) {
      console.error('Failed to create reset token:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error creating reset token:', err);
    return false;
  }
}

export async function validateResetToken(token: string): Promise<{ email: string; expires: number } | null> {
  try {
    const { data, error } = await supabase
      .from('reset_tokens')
      .select('email, expires_at')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }
    
    return {
      email: data.email,
      expires: new Date(data.expires_at).getTime()
    };
  } catch (err) {
    console.error('Error validating reset token:', err);
    return null;
  }
}

export async function deleteResetToken(token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reset_tokens')
      .delete()
      .eq('token', token);
    
    return !error;
  } catch (err) {
    console.error('Error deleting reset token:', err);
    return false;
  }
}

// ============================================
// PUSH SUBSCRIPTIONS
// ============================================

export async function addPushSubscription(userId: string, subscription: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,endpoint' });
    
    if (error) {
      console.error('Failed to add push subscription:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error adding push subscription:', err);
    return false;
  }
}

export async function getPushSubscriptions(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Failed to get push subscriptions:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error getting push subscriptions:', err);
    return [];
  }
}

export async function getPushSubscriptionUserIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('user_id');
    if (error) {
      console.error('Failed to list push subscription users:', error);
      return [];
    }
    return [...new Set((data || []).map((row: any) => String(row.user_id)).filter(Boolean))];
  } catch (err) {
    console.error('Error listing push subscription users:', err);
    return [];
  }
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
    
    return !error;
  } catch (err) {
    console.error('Error removing push subscription:', err);
    return false;
  }
}

// ============================================
// SECURITY LOGS
// ============================================

export async function logSecurityEvent(userId: string | null, ipAddress: string, eventType: string, description: string, metadata: any = {}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('security_logs')
      .insert({
        user_id: userId,
        ip_address: ipAddress,
        event_type: eventType,
        description,
        metadata
      });
    
    if (error) {
      console.error('Failed to log security event:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error logging security event:', err);
    return false;
  }
}

export async function getSecurityLogs(userId: string, limit: number = 50): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Failed to get security logs:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Error getting security logs:', err);
    return [];
  }
}

// ============================================
// TELEMETRY
// ============================================

export async function logTelemetry(userId: string | null, eventType: string, screenName: string, action: string, metadata: any = {}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('telemetry')
      .insert({
        user_id: userId,
        event_type: eventType,
        screen_name: screenName,
        action,
        metadata
      });
    
    if (error) {
      console.error('Failed to log telemetry:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error logging telemetry:', err);
    return false;
  }
}

export async function getTelemetry(userId: string, limit: number = 100): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('telemetry')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Failed to get telemetry:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Error getting telemetry:', err);
    return [];
  }
}

// ============================================
// RATE LIMITING (fallback for production without Redis)
// ============================================

export async function checkRateLimit(ipAddress: string, endpoint: string, maxRequests: number = 100, windowMs: number = 60000): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);
    
    // Clean up old entries
    await supabase
      .from('rate_limits')
      .delete()
      .lt('expires_at', now.toISOString());
    
    // Get current count
    const { data, error } = await supabase
      .from('rate_limits')
      .select('request_count')
      .eq('ip_address', ipAddress)
      .eq('endpoint', endpoint)
      .gt('window_start', windowStart.toISOString())
      .maybeSingle();
    
    if (error) {
      console.error('Failed to check rate limit:', error);
      return { allowed: true, remaining: maxRequests };
    }
    
    const currentCount = data?.request_count || 0;
    const remaining = maxRequests - currentCount;
    
    if (currentCount >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    
    // Increment count
    await supabase
      .from('rate_limits')
      .upsert({
        ip_address: ipAddress,
        endpoint,
        request_count: currentCount + 1,
        window_start: windowStart.toISOString(),
        expires_at: new Date(now.getTime() + windowMs).toISOString()
      });
    
    return { allowed: true, remaining: remaining - 1 };
  } catch (err) {
    console.error('Error checking rate limit:', err);
    return { allowed: true, remaining: maxRequests };
  }
}

// ============================================
// USER ACTIVITY TRACKING
// ============================================

export async function updateUserLastActive(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);
    
    return !error;
  } catch (err) {
    console.error('Error updating last active:', err);
    return false;
  }
}

export async function getUserLastActive(userId: string): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('last_active_at')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !data?.last_active_at) {
      return null;
    }
    
    return new Date(data.last_active_at);
  } catch (err) {
    console.error('Error getting last active:', err);
    return null;
  }
}

export async function updateLastInactivityPushSent(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ last_inactivity_push_sent: new Date().toISOString() })
      .eq('id', userId);
    
    return !error;
  } catch (err) {
    console.error('Error updating last inactivity push:', err);
    return false;
  }
}

export async function getLastInactivityPushSent(userId: string): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('last_inactivity_push_sent')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !data?.last_inactivity_push_sent) {
      return null;
    }
    
    return new Date(data.last_inactivity_push_sent);
  } catch (err) {
    console.error('Error getting last inactivity push:', err);
    return null;
  }
}

// ============================================
// HEALTH CHECK & MONITORING
// ============================================

export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  services: { supabase: boolean; database: boolean };
}> {
  const services = {
    supabase: false,
    database: false
  };

  try {
    const { error } = await supabase.from('profiles').select('id').limit(0);
    if (error) console.error('Supabase health check failed:', error.message);
    services.supabase = !error;
    services.database = !error;
  } catch (error) {
    console.error('Supabase health check failed:', error);
  }

  return {
    status: services.supabase ? 'healthy' : 'unhealthy',
    services
  };
}

export async function getSystemStats(): Promise<any> {
  try {
    const [
      resetTokensCount,
      userPasswordsCount,
      pushSubscriptionsCount,
      securityLogsCount,
      telemetryCount
    ] = await Promise.all([
      supabase.from('reset_tokens').select('id', { count: 'exact', head: true }),
      supabase.from('user_passwords').select('id', { count: 'exact', head: true }),
      supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }),
      supabase.from('security_logs').select('id', { count: 'exact', head: true }),
      supabase.from('telemetry').select('id', { count: 'exact', head: true })
    ]);

    return {
      resetTokens: resetTokensCount.count || 0,
      userPasswords: userPasswordsCount.count || 0,
      pushSubscriptions: pushSubscriptionsCount.count || 0,
      securityLogs: securityLogsCount.count || 0,
      telemetry: telemetryCount.count || 0,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('Failed to get system stats:', err);
    return null;
  }
}

// ============================================
// CLEANUP FUNCTIONS
// ============================================

export async function cleanupExpiredData(): Promise<void> {
  try {
    const now = new Date().toISOString();
    
    await supabase
      .from('reset_tokens')
      .delete()
      .lt('expires_at', now);
    
    await supabase
      .from('rate_limits')
      .delete()
      .lt('expires_at', now);
    
    console.log('Cleanup completed successfully');
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
}

// Export for use in server.ts
export default {
  // User Accounts
  createUserAccount,
  getUserAccount,
  getUserAccountByEmail,
  updateUserAccount,
  updateLastLogin,
  deactivateAccount,
  deleteAccount,
  confirmAccountDeletion,
  cancelAccountDeletion,
  
  // Profile Management
  updateUserProfileInSupabase,
  getUserProfileFromSupabase,
  updateUserPhoto,
  deleteUserPhoto,
  logProfileUpdate,
  getProfileUpdateHistory,
  
  // Legacy Profile Store (to be phased out)
  saveUserProfile,
  getUserProfile,
  hasUserProfile,
  
  // Encounters
  addEncounterLike,
  getEncounterLikes,
  hasEncounterLike,
  removeEncounterLike,
  addEncounterMatch,
  getEncounterMatches,
  hasEncounterMatch,
  
  // Security
  getUserSecurity,
  saveUserSecurity,
  updateUserSecurity,
  
  // Passwords
  saveUserPassword,
  getUserPassword,
  hasUserPassword,
  
  // Reset Tokens
  createResetToken,
  validateResetToken,
  deleteResetToken,
  
  // Push
  addPushSubscription,
  getPushSubscriptions,
  getPushSubscriptionUserIds,
  removePushSubscription,
  
  // Logging
  logSecurityEvent,
  getSecurityLogs,
  logTelemetry,
  getTelemetry,
  
  // Rate Limiting
  checkRateLimit,
  
  // Activity
  updateUserLastActive,
  getUserLastActive,
  updateLastInactivityPushSent,
  getLastInactivityPushSent,
  
  // Maintenance
  cleanupExpiredData,
  healthCheck,
  getSystemStats
};