// ================================================================
// SERVER AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// ================================================================

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required by server authorization.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: WebSocket as unknown as typeof globalThis.WebSocket
  }
});

// Constants
const JWT_SECRET = process.env.JWT_SECRET;

// ================================================================
// TYPES & INTERFACES
// ================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
    iat: number;
    exp: number;
  };
  userId: string;
}

export interface AdminRequest extends AuthenticatedRequest {
  isAdmin: boolean;
}

// ================================================================
// MIDDLEWARE FUNCTIONS
// ================================================================

/**
 * Middleware to verify JWT token and attach user info to request
 */
export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.substring(7);

    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'JWT_SECRET not configured' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    req.userId = decoded.sub;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to verify Supabase JWT token
 */
export const verifySupabaseToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.substring(7);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      sub: data.user.id,
      email: data.user.email || '',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    req.userId = data.user.id;
    next();
  } catch (error) {
    console.error('Supabase token verification failed:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to require authentication
 */
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', req.userId).single();

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('Admin requirement check failed:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Middleware to rate limit API calls
 */
const requestCounts = new Map<string, number[]>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = (req as AuthenticatedRequest).user?.sub || req.ip || 'unknown';
    const now = Date.now();

    if (!requestCounts.has(identifier)) {
      requestCounts.set(identifier, []);
    }

    const requests = requestCounts.get(identifier)!;
    const recentRequests = requests.filter((time) => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    recentRequests.push(now);
    requestCounts.set(identifier, recentRequests);
    next();
  };
};

// ================================================================
// AUTHORIZATION FUNCTIONS
// ================================================================

/**
 * Check if user can access another user's data
 */
export const canAccessUserData = async (userId: string, targetUserId: string): Promise<boolean> => {
  // Users can only access their own data
  return userId === targetUserId;
};

/**
 * Check if user can message another user
 */
export const canMessage = async (userId: string, targetUserId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('can_message', {
    p_from_id: userId,
    p_to_id: targetUserId
  });

  if (error) {
    console.error('Error checking can_message:', error);
    return false;
  }

  return data === true;
};

/**
 * Check if user can delete match
 */
export const canDeleteMatch = async (userId: string, matchId: string): Promise<boolean> => {
  const { data: match, error } = await supabase
    .from('matches')
    .select('user_id, matched_user_id')
    .eq('id', matchId)
    .single();

  if (error || !match) {
    return false;
  }

  return match.user_id === userId || match.matched_user_id === userId;
};

/**
 * Check if user account is active (not suspended, not muted)
 */
export const isAccountActive = async (userId: string): Promise<boolean> => {
  const { data: profile } = await supabase.from('profiles').select('is_suspended').eq('id', userId).single();

  if (!profile || profile.is_suspended) {
    return false;
  }

  const { data: security } = await supabase
    .from('user_security')
    .select('is_muted, mute_expires_at, is_shadowbanned, shadowban_expires_at')
    .eq('user_id', userId)
    .single();

  if (!security) {
    return true; // New user, no security record yet
  }

  const now = new Date();

  if (security.is_muted && (!security.mute_expires_at || new Date(security.mute_expires_at) > now)) {
    return false;
  }

  if (security.is_shadowbanned && (!security.shadowban_expires_at || new Date(security.shadowban_expires_at) > now)) {
    return false;
  }

  return true;
};

/**
 * Check if user can perform action based on credits
 */
export const hasSufficientCredits = async (userId: string, creditsNeeded: number): Promise<boolean> => {
  const { data: credits } = await supabase.from('credits').select('balance').eq('user_id', userId).single();

  if (!credits) {
    return false;
  }

  return credits.balance >= creditsNeeded;
};

/**
 * Deduct credits from user account (with transaction logging)
 */
export const deductCredits = async (
  userId: string,
  amount: number,
  type: string,
  description?: string,
  referenceId?: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('record_transaction', {
      p_user_id: userId,
      p_amount: -amount,
      p_type: type,
      p_description: description || null,
      p_reference_id: referenceId || null
    });

    if (error) {
      console.error('Error deducting credits:', error);
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error('Credit deduction failed:', error);
    return false;
  }
};

/**
 * Add credits to user account (with transaction logging)
 */
export const addCredits = async (
  userId: string,
  amount: number,
  type: string,
  description?: string,
  referenceId?: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('record_transaction', {
      p_user_id: userId,
      p_amount: amount,
      p_type: type,
      p_description: description || null,
      p_reference_id: referenceId || null
    });

    if (error) {
      console.error('Error adding credits:', error);
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error('Credit addition failed:', error);
    return false;
  }
};

// ================================================================
// LOGGING & AUDIT FUNCTIONS
// ================================================================

/**
 * Log security event to audit trail
 */
export const logSecurityEvent = async (
  userId: string | null,
  eventType: string,
  description: string,
  ipAddress?: string,
  severity: 'info' | 'warning' | 'critical' = 'info'
): Promise<void> => {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      event_type: eventType,
      description,
      ip_address: ipAddress,
      severity
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

/**
 * Log admin action
 */
export const logAdminAction = async (
  adminId: string,
  actionType: string,
  targetUserId: string | null,
  description: string,
  changes?: any,
  reason?: string
): Promise<void> => {
  try {
    await supabase.from('admin_actions').insert({
      admin_id: adminId,
      action_type: actionType,
      target_user_id: targetUserId,
      description,
      changes,
      reason
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};
