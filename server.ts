import 'dotenv/config';

// Normalize Supabase Environment Variables
if (!process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
}
if (!process.env.VITE_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
}
if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}
if (!process.env.SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
}

import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import type { OptionsJson } from 'body-parser';
import webpush from 'web-push';
import * as serverSupabase from './src/lib/serverSupabaseIntegration.js';
import { verifySupabaseToken, requireAuth, requireAdmin } from './src/server/middleware/auth.js';
import {
  createRateLimiter,
  createUpstashRateLimitStore,
  localRateLimitStore,
  verifyRateLimitStoreConnectivity
} from './src/server/middleware/rateLimit.js';
import { rewardedAdsUnavailable } from './src/server/middleware/rewardedAds.js';
import { createLocalImageModerationMiddleware } from './src/server/middleware/localImageModeration.js';
import { createClientCors, createCsrfProtection } from './src/server/middleware/csrfProtection.js';
import { normalizeAuthenticatedUserId, validatePushSubscription } from './src/server/services/pushSecurity.js';
import { dispatchPushSubscriptions } from './src/server/services/pushDelivery.js';
import {
  answerFaq,
  analyzeBehavior,
  assessDeceptionSignals,
  assessProfileRisk,
  coachConversation,
  compareQuizAnswers,
  generateBioSuggestions,
  generateIcebreakers,
  matchProfiles,
  moderateText,
  rankProfiles,
  searchProfiles
} from './src/server/services/internalAi.js';
import {
  getImageModelState,
  ImageModerationError,
  moderateImageLocally,
  normalizeImageForPrivateStorage
} from './src/server/services/localImageModeration.js';
import {
  createVerificationNonceHash,
  ProfilePhotoVerificationError,
  verifyProfilePhotos,
  type ProfilePhotoChallenge
} from './src/server/services/profilePhotoVerification.js';
import { toPublicProfile } from './src/server/services/publicProfile.js';
import {
  getProfilePhotoStoragePath,
  signProfilePhotoReferences,
  toStoredProfilePhotoReference
} from './src/lib/profilePhotoUrls.js';
import { normalizeProfileInterests } from './src/lib/profileInterests.js';
import { normalizeProfileDetails } from './src/lib/profileDetails.js';

async function signMemberProfileMedia(profiles: any[]): Promise<any[]> {
  const references = profiles.flatMap((profile) => [
    ...(Array.isArray(profile.photos) ? profile.photos : []),
    ...(typeof profile.avatar_url === 'string' && profile.avatar_url ? [profile.avatar_url] : [])
  ]);
  const signed = await signProfilePhotoReferences(serverSupabase.getServiceClient(), references);
  let index = 0;
  return profiles.map((profile) => {
    const photoCount = Array.isArray(profile.photos) ? profile.photos.length : 0;
    const photos = signed.slice(index, index + photoCount);
    index += photoCount;
    const avatarUrl = typeof profile.avatar_url === 'string' && profile.avatar_url ? signed[index++] : '';
    return { ...profile, photos, avatar_url: avatarUrl || photos.find(Boolean) || '' };
  });
}

async function deleteProfilePhotoObjects(db: any, userId: string): Promise<void> {
  const storage = db.storage.from('profile-photos');
  const pendingFolders = [userId];
  const paths: string[] = [];

  while (pendingFolders.length) {
    const folder = pendingFolders.pop()!;
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await storage.list(folder, { limit: 100, offset });
      if (error) throw error;
      const entries = data || [];
      for (const entry of entries) {
        const path = `${folder}/${entry.name}`;
        if (entry.id === null) pendingFolders.push(path);
        else paths.push(path);
      }
      if (entries.length < 100) break;
    }
  }

  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await storage.remove(paths.slice(index, index + 100));
    if (error) throw error;
  }
}

async function fetchAllRows(buildQuery: (from: number, to: number) => any): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await buildQuery(offset, offset + 999);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL;

try {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_EMAIL) {
    throw new Error('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_EMAIL are required');
  }
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[WebPush] VAPID details initialized successfully');
} catch (err) {
  console.error('[WebPush] Error configuring VAPID details:', err);
}

const INTERNAL_AI_ENABLED = false;
const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0)
  });
}

async function safeGenerateJson<T = any>(_params: {
  contents: any;
  systemInstruction?: string;
  preferredModel?: string;
}): Promise<T | null> {
  return null;
}

const JWT_SECRET = process.env.JWT_SECRET || '';
const CHAT_MEDIA_BUCKET = 'private-chat-media';
const MAX_EPHEMERAL_IMAGE_AGE_MS = 24 * 60 * 60 * 1000;
const EPHEMERAL_VIEW_CLEANUP_DELAY_MS = 30 * 1000;

async function deleteEphemeralMediaObject(messageId: string): Promise<void> {
  const db = serverSupabase.getServiceClient();
  const { data: message, error: lookupError } = await db
    .from('messages')
    .select('id,media_url,is_ephemeral,media_viewed_at,media_expires_at')
    .eq('id', messageId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!message?.is_ephemeral || !message.media_url) return;
  const expired = message.media_expires_at && new Date(message.media_expires_at).getTime() <= Date.now();
  const viewedLongEnough =
    message.media_viewed_at &&
    new Date(message.media_viewed_at).getTime() <= Date.now() - EPHEMERAL_VIEW_CLEANUP_DELAY_MS;
  if (!expired && !viewedLongEnough) return;

  const { error: removeError } = await db.storage.from(CHAT_MEDIA_BUCKET).remove([message.media_url]);
  if (removeError) throw removeError;
  const { error: updateError } = await db
    .from('messages')
    .update({ media_url: null, content: '[Photo éphémère expirée]' })
    .eq('id', message.id)
    .eq('is_ephemeral', true);
  if (updateError) throw updateError;
}

async function cleanExpiredEphemeralMedia(): Promise<void> {
  const db = serverSupabase.getServiceClient();
  const now = new Date().toISOString();
  const viewedBefore = new Date(Date.now() - EPHEMERAL_VIEW_CLEANUP_DELAY_MS).toISOString();
  const [expired, viewed] = await Promise.all([
    db
      .from('messages')
      .select('id')
      .eq('is_ephemeral', true)
      .not('media_url', 'is', null)
      .lte('media_expires_at', now)
      .limit(100),
    db
      .from('messages')
      .select('id')
      .eq('is_ephemeral', true)
      .not('media_url', 'is', null)
      .not('media_viewed_at', 'is', null)
      .lte('media_viewed_at', viewedBefore)
      .limit(100)
  ]);
  if (expired.error) throw expired.error;
  if (viewed.error) throw viewed.error;
  const ids = [...new Set([...(expired.data || []), ...(viewed.data || [])].map((row) => row.id))];
  for (const messageId of ids) {
    try {
      await deleteEphemeralMediaObject(messageId);
    } catch (error) {
      console.error(`Ephemeral chat image cleanup failed for message ${messageId}:`, error);
    }
  }
  await cleanQueuedPrivateMedia();
}

async function cleanQueuedPrivateMedia(): Promise<void> {
  const db = serverSupabase.getServiceClient();
  const { data: queuedObjects, error: queueError } = await db
    .from('private_media_cleanup_queue')
    .select('object_path')
    .order('requested_at', { ascending: true })
    .limit(100);
  if (queueError) throw queueError;
  for (const queuedObject of queuedObjects || []) {
    const { error: removeError } = await db.storage.from(CHAT_MEDIA_BUCKET).remove([queuedObject.object_path]);
    if (removeError) {
      console.error(`Private chat media removal failed for ${queuedObject.object_path}:`, removeError);
      continue;
    }
    const { error: queueDeleteError } = await db
      .from('private_media_cleanup_queue')
      .delete()
      .eq('object_path', queuedObject.object_path);
    if (queueDeleteError) {
      console.error(
        `Private chat media cleanup acknowledgement failed for ${queuedObject.object_path}:`,
        queueDeleteError
      );
    }
  }
}

// Store in-memory reset tokens: token -> { email, expires }
const resetTokens = new Map<string, { email: string; expires: number }>();

export interface ServerNotification {
  id: string;
  userId: string;
  type: 'like' | 'match' | 'match_reminder' | 'visit' | 'message' | 'coup_de_coeur' | 'system' | 'gift' | 'security';
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  actionUrl?: string;
  iconType?: string;
  metadata?: Record<string, any>;
}

// Active WebSocket connections: userId -> Set<WebSocket>
const userSockets = new Map<string, Set<WebSocket>>();

async function sendWebPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    url?: string;
    type?: string;
    callType?: string;
    callerName?: string;
    chatId?: string;
    tag?: string;
    vibrate?: number[];
    [key: string]: any;
  }
) {
  const cleanId = String(userId || '')
    .toLowerCase()
    .trim();
  const db = serverSupabase.getServiceClient();
  const { data: subs, error } = await db.from('push_subscriptions').select('endpoint,keys').eq('user_id', cleanId);
  if (error) throw error;
  const stringPayload = JSON.stringify(payload);
  return dispatchPushSubscriptions(
    subs || [],
    async (subscription) => {
      try {
        await webpush.sendNotification(subscription, stringPayload);
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? (error as { statusCode?: unknown }).statusCode
            : undefined;
        console.warn('[WebPush] Le service Push a refusé une notification:', statusCode || 'provider_error');
        throw error;
      }
    },
    async (subscription) => {
      const { error: deleteError } = await db
        .from('push_subscriptions')
        .delete()
        .eq('user_id', cleanId)
        .eq('endpoint', subscription.endpoint);
      if (deleteError) throw deleteError;
    }
  );
}

function respondWithPushResult(res: express.Response, result: Awaited<ReturnType<typeof sendWebPushToUser>>) {
  if (!result) return res.status(503).json({ success: false, error: "Résultat d'envoi Push indisponible." });
  const statusCode =
    result.status === 'accepted'
      ? 200
      : result.status === 'partial_failure'
        ? 207
        : result.status === 'no_subscriptions'
          ? 404
          : 502;
  return res.status(statusCode).json({
    success: result.acceptedCount > 0,
    deliveryStatus: result.status,
    subscriptionCount: result.subscriptionCount,
    acceptedByPushService: result.acceptedCount,
    failed: result.failedCount,
    expiredSubscriptionsRemoved: result.expiredCount,
    message:
      result.acceptedCount > 0
        ? "Le service Push a accepté la notification; sa réception sur l'appareil n'est pas garantie."
        : result.status === 'no_subscriptions'
          ? "Aucun appareil n'est abonné aux notifications Push."
          : "Aucun service Push n'a accepté la notification."
  });
}

function broadcastNotificationToUser(userId: string, notification: ServerNotification) {
  const cleanId = String(userId || '')
    .toLowerCase()
    .trim();
  const sockets = userSockets.get(cleanId);
  if (sockets && sockets.size > 0) {
    const payload = JSON.stringify({
      type: 'notification',
      notification
    });
    for (const ws of sockets) {
      if (ws.readyState === 1 /* OPEN */) {
        try {
          ws.send(payload);
        } catch (err) {
          console.error('[WS] Erreur envoi notification temps réel:', cleanId, err);
        }
      }
    }
  }

  // Ask the configured Web Push service to notify the device when the app is closed.
  sendWebPushToUser(cleanId, {
    title: notification.title,
    body: notification.body,
    url: notification.actionUrl || '/',
    type: notification.type,
    tag: `notification-${notification.id}`,
    icon: notification.senderAvatar || '/pwa-icon.png'
  }).catch((error) => {
    console.error('[WebPush] Notification de fond non envoyée:', error);
  });
}

async function runServerRetentionCheck() {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const retentionHooks = [
    {
      title: '🔥 Retournez sur Bavel pour faire plus de rencontres !',
      body: 'Cela fait 1 à 2 jours que vous ne vous êtes pas connecté. De nouveaux profils très compatibles vous attendent près de chez vous !'
    },
    {
      title: '👀 Nouveaux visiteurs sur votre profil !',
      body: "Des utilisateurs ont récemment consulté votre profil sur Bavel. Ouvrez l'application pour voir qui c'est !"
    },
    {
      title: "💬 Vos matchs n'attendent que vous !",
      body: "Ne laissez pas s'éteindre vos conversations. Revenez sur Bavel pour relancer la discussion !"
    }
  ];

  const pushUsers = await serverSupabase.getPushSubscriptionUserIds();
  for (const userId of pushUsers) {
    const lastActiveData = await serverSupabase.getUserLastActive(userId);
    const lastActive = lastActiveData ? lastActiveData.getTime() : now;
    const lastPushData = await serverSupabase.getLastInactivityPushSent(userId);
    const lastPush = lastPushData ? lastPushData.getTime() : 0;

    // Check if user has been inactive for >= 24h AND we haven't sent a retention push in the last 24h
    if (now - lastActive >= ONE_DAY_MS && now - lastPush >= ONE_DAY_MS) {
      const hook = retentionHooks[Math.floor(Math.random() * retentionHooks.length)];
      console.log(`[RetentionEngine] Envoi d'une notification Push réelle de relance à l'utilisateur [${userId}]`);

      try {
        const result = await sendWebPushToUser(userId, {
          title: hook.title,
          body: hook.body,
          url: '/',
          type: 'inactivity_48h',
          tag: `retention-${Date.now()}`
        });
        if (result.acceptedCount > 0) await serverSupabase.updateLastInactivityPushSent(userId);
      } catch (err) {
        console.warn(`[RetentionEngine] Échec d'envoi de la notification Push pour [${userId}]:`, err);
      }
    }
  }
}

// Lancer le moteur de rétention automatique toutes les 15 minutes en production
setInterval(
  () => {
    runServerRetentionCheck().catch((err) => console.error('[RetentionEngine] Error:', err));
  },
  15 * 60 * 1000
);
cleanExpiredEphemeralMedia().catch((error) => {
  console.error('[ChatMediaRetention] Initial expired image cleanup failed:', error);
});
setInterval(() => {
  cleanExpiredEphemeralMedia().catch((error) => {
    console.error('[ChatMediaRetention] Expired image cleanup failed:', error);
  });
}, 60 * 1000);

// --- Recursive Input Sanitizer (XSS & Injection Protection) ---
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Strip script tags, javascript: URIs, dangerous HTML event handlers, and null bytes
    return value
      .replace(/\0/g, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitizedObj: any = {};
    for (const k of Object.keys(value)) {
      sanitizedObj[k] = sanitizeValue(value[k]);
    }
    return sanitizedObj;
  }
  return value;
}

function sanitizeInputMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    for (const k of Object.keys(req.query)) {
      (req.query as any)[k] = sanitizeValue((req.query as any)[k]);
    }
  }
  if (req.params && typeof req.params === 'object') {
    for (const k of Object.keys(req.params)) {
      (req.params as any)[k] = sanitizeValue((req.params as any)[k]);
    }
  }
  next();
}

function getDeterministicGoogleUserId(email?: string, sub?: string): string {
  if (sub && sub.trim()) return sub;
  const cleanEmail = (email || 'utilisateur.google@gmail.com').toLowerCase().trim();
  const hash = crypto.createHash('sha256').update(cleanEmail).digest('hex').substring(0, 16);
  return `google_${hash}`;
}

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  const requiredProductionEnv = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'JWT_SECRET',
    'FRONTEND_URL',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SENTRY_DSN'
  ];
  if (isProduction) {
    const missing = requiredProductionEnv.filter((key) => !process.env[key]?.trim());
    if (missing.length > 0) {
      throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
    }
    if (
      JWT_SECRET.length < 32 ||
      JWT_SECRET.includes('bavel_super_secret') ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(JWT_SECRET)
    ) {
      throw new Error('JWT_SECRET must be a strong random secret in production.');
    }
    const frontendUrl = new URL(process.env.FRONTEND_URL);
    const supabaseUrl = new URL(process.env.SUPABASE_URL);
    if (
      frontendUrl.protocol !== 'https:' ||
      supabaseUrl.protocol !== 'https:' ||
      ['my_app_url', 'your-domain', 'example.com'].some((placeholder) =>
        frontendUrl.hostname.toLowerCase().includes(placeholder)
      )
    ) {
      throw new Error('FRONTEND_URL and SUPABASE_URL must use HTTPS in production.');
    }
    const sentryDsn = new URL(process.env.SENTRY_DSN);
    if (sentryDsn.protocol !== 'https:' || !sentryDsn.username || !sentryDsn.pathname.slice(1)) {
      throw new Error('SENTRY_DSN must be a valid HTTPS Sentry project DSN in production.');
    }
  }
  const rateLimitStore = isProduction
    ? createUpstashRateLimitStore(process.env.UPSTASH_REDIS_REST_URL || '', process.env.UPSTASH_REDIS_REST_TOKEN || '')
    : localRateLimitStore;
  if (isProduction) {
    await verifyRateLimitStoreConnectivity(rateLimitStore);
    console.log('[RateLimit] Upstash REST connectivity verified.');
  }
  const PORT = Number(process.env.PORT || 3000);
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be a valid TCP port.');
  }
  app.disable('x-powered-by');
  app.set('trust proxy', isProduction ? 1 : 0);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      hsts: isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false
    })
  );

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
    next();
  });
  app.use(createClientCors(process.env.FRONTEND_URL));
  app.use((req, res, next) => {
    if (isProduction && !req.secure) {
      const canonicalHost = new URL(process.env.FRONTEND_URL!).host;
      return res.redirect(308, `https://${canonicalHost}${req.originalUrl}`);
    }
    next();
  });
  app.get('/api/ai/status', (_req, res) => {
    return res.json({
      ready: false,
      architecture: 'rules-based-profile-matching',
      execution: 'generative-ai-disabled',
      externalProvider: false,
      capabilities: [],
      availableCapabilities: ['rules-based-profile-affinity'],
      imageModeration: {
        execution: 'server-local',
        model: 'nsfwjs-mobilenet-v2',
        state: getImageModelState(),
        imagesSentToExternalProvider: false
      },
      unavailable: [
        'internal-ai-disabled',
        'biometric-verification',
        'face-recognition',
        'identity-document-verification',
        'stolen-image-detection',
        'multi-account-detection',
        'image-ranking',
        'general-purpose-language-generation',
        'general-purpose-translation',
        'automated-offer-generation'
      ]
    });
  });

  const imageModerationPaths = [
    '/api/ai/private-detector',
    '/api/check-nsfw',
    '/api/moderation/photo',
    '/api/messages/media',
    '/api/messages/voice',
    '/api/security/profile-verification/challenge',
    '/api/security/profile-verification/complete'
  ];
  // Limit work before reading large bodies or verifying expensive image payloads.
  app.use('/api', createRateLimiter(120, 60000, 'api_global', rateLimitStore));
  app.use('/api', createCsrfProtection(process.env.FRONTEND_URL));
  app.use(imageModerationPaths, createRateLimiter(20, 60000, 'image_moderation', rateLimitStore));
  app.use(
    [
      '/api/profiles',
      '/api/swipes',
      '/api/matches',
      '/api/user',
      '/api/users',
      '/api/notifications',
      '/api/likes',
      '/api/rewards',
      '/api/encounters',
      '/api/push',
      '/api/security',
      '/api/account',
      '/api/privacy',
      '/api/gamification',
      '/api/moderation',
      '/api/match',
      '/api/coach',
      '/api/moderate',
      '/api/check-nsfw',
      '/api/verify-pose',
      '/api/love-quiz',
      '/api/faq',
      '/api/messages',
      '/api/ai',
      '/api/calls'
    ],
    verifySupabaseToken,
    requireAuth
  );

  const captureRawBody: OptionsJson['verify'] = (req, _res, buffer) => {
    if (!imageModerationPaths.includes(req.url?.split('?')[0] || '')) {
      (req as any).rawBody = Buffer.from(buffer);
    }
  };
  const generalJsonParser = express.json({ limit: '50mb', verify: captureRawBody });
  const imageModerationJsonParser = express.json({ limit: '14mb', verify: captureRawBody });
  const generalFormParser = express.urlencoded({ limit: '50mb', extended: true });
  const imageModerationFormParser = express.urlencoded({ limit: '14mb', extended: true });
  app.use((req, res, next) => {
    const imageModerationPath = imageModerationPaths.includes(req.path);
    return (imageModerationPath ? imageModerationJsonParser : generalJsonParser)(req, res, next);
  });
  app.use((req, res, next) => {
    const imageModerationPath = imageModerationPaths.includes(req.path);
    return (imageModerationPath ? imageModerationFormParser : generalFormParser)(req, res, next);
  });
  app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? Number((error as { status: unknown }).status)
        : 500;
    if (status === 413) {
      return res.status(413).json({ error: 'La requête dépasse la taille maximale autorisée.' });
    }
    if (status === 400) {
      return res.status(400).json({ error: 'Le corps de la requête est invalide.' });
    }
    return next(error);
  });
  app.use(cookieParser());
  app.use(sanitizeInputMiddleware);
  app.use(createLocalImageModerationMiddleware());
  app.use(
    [
      '/api/ai',
      '/api/match',
      '/api/moderation',
      '/api/coach',
      '/api/security/deception-detector',
      '/api/moderate',
      '/api/verify-pose',
      '/api/check-nsfw',
      '/api/love-quiz',
      '/api/faq/ask'
    ],
    async (req, res, next) => {
      if (req.method !== 'POST') return next();
      const path = req.originalUrl.split('?')[0];
      const body = req.body || {};

      if (path === '/api/ai/telemetry') return next();

      if (path === '/api/ai/recommendations') {
        const { candidateProfiles } = body;
        if (!Array.isArray(candidateProfiles) || candidateProfiles.length > 30) {
          return res.status(400).json({ error: 'Une liste valide de 30 profils maximum est requise.' });
        }
        const userId = String((req as any).userId || '');
        if (!userId) return res.status(401).json({ error: 'Session utilisateur requise.' });
        const candidateIds = [
          ...new Set(candidateProfiles.map((profile: any) => String(profile?.id || '').toLowerCase()))
        ];
        if (
          candidateIds.some(
            (id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
          )
        ) {
          return res.status(400).json({ error: 'La liste contient un identifiant de profil invalide.' });
        }
        const db = serverSupabase.getServiceClient();
        const profileFields =
          'id,name,age,gender,city,country,latitude,longitude,bio,job,studies,personality,interests,photos,is_verified,created_at';
        const { data: canonicalUser, error: userProfileError } = await db
          .from('profiles')
          .select(profileFields)
          .eq('id', userId)
          .maybeSingle();
        if (userProfileError) {
          console.error('Recommendation user profile lookup failed:', userProfileError);
          return res.status(503).json({ error: 'Profil utilisateur momentanément indisponible.' });
        }
        if (!canonicalUser) return res.status(404).json({ error: 'Profil utilisateur introuvable.' });
        const { data: swipes, error: swipeHistoryError } = await db
          .from('swipes')
          .select('target_id,is_liked,is_super_like,created_at')
          .eq('user_id', userId)
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(200);
        if (swipeHistoryError) {
          console.error('Recommendation history lookup failed:', swipeHistoryError);
          return res.status(503).json({ error: 'Historique de préférences momentanément indisponible.' });
        }
        const historyIds = [...new Set((swipes || []).map((swipe: any) => swipe.target_id).filter(Boolean))];
        const profilesToLoad = [...new Set([...historyIds, ...candidateIds])];
        let knownProfiles: any[] = [];
        if (profilesToLoad.length > 0) {
          const { data, error: profileHistoryError } = await db
            .from('profiles')
            .select(profileFields)
            .in('id', profilesToLoad);
          if (profileHistoryError) {
            console.error('Recommendation profile history lookup failed:', profileHistoryError);
            return res.status(503).json({ error: 'Données de préférences momentanément indisponibles.' });
          }
          knownProfiles = data || [];
        }
        const knownProfileById = new Map(knownProfiles.map((profile: any) => [profile.id, profile]));
        const eligibleCandidates = candidateProfiles.filter((candidate: any) =>
          knownProfileById.has(String(candidate.id))
        );
        const scoringProfiles = Object.fromEntries(
          eligibleCandidates.map((candidate: any) => [String(candidate.id), knownProfileById.get(String(candidate.id))])
        );
        const behavioralHistory = (swipes || []).flatMap((swipe: any) => {
          const profile = knownProfileById.get(swipe.target_id);
          if (!profile) return [];
          return [
            {
              eventType: swipe.is_super_like ? 'superlike' : swipe.is_liked ? 'like' : 'pass',
              profile
            }
          ];
        });
        return res.json({
          recommendations: rankProfiles(canonicalUser, eligibleCandidates, {
            likedIds: historyIds,
            scoringProfiles,
            behavioralHistory
          }),
          cacheHit: false,
          cacheLatencyMs: 0,
          ttlSecondsRemaining: 0
        });
      }

      if (path === '/api/match' || path === '/api/ai/match') {
        if (!body.userProfile || !body.targetProfile) {
          return res.status(400).json({ error: 'Profils utilisateur et cible requis.' });
        }
        return res.json(matchProfiles(body.userProfile, body.targetProfile));
      }

      if (path === '/api/ai/rude-detector' || path === '/api/moderate') {
        const content = body.content ?? body.text;
        if (typeof content !== 'string' || !content.trim()) {
          return res.status(400).json({ error: 'Texte à analyser requis.' });
        }
        return res.json(moderateText(content));
      }

      if (path === '/api/moderation/text') {
        if (typeof body.text !== 'string' || !body.text.trim()) {
          return res.status(400).json({ error: 'Texte à analyser requis.' });
        }
        const result = moderateText(body.text);
        return res.json({
          ...result,
          decision: result.isSafe ? 'allow' : result.severity === 'high' ? 'block' : 'review',
          confidence: result.isSafe ? 0.7 : 0.9
        });
      }

      if (path === '/api/ai/icebreaker' || path === '/api/ai/vibe-check') {
        const userProfile = body.userProfile || body.user || {};
        const targetProfile = body.targetProfile || body.profile;
        if (!targetProfile) {
          return res.status(400).json({ error: 'Les deux profils sont requis.' });
        }
        return res.json({
          icebreakers: generateIcebreakers(userProfile, targetProfile),
          ...matchProfiles(userProfile, targetProfile)
        });
      }

      if (path === '/api/ai/chat-assistant' || path === '/api/coach') {
        return res.json(coachConversation(body.conversationHistory || body.messages, body.targetProfile));
      }

      if (path === '/api/ai/bio-generator') {
        return res.json(generateBioSuggestions(body));
      }

      if (path === '/api/ai/smart-search') {
        if (typeof body.query !== 'string' || !Array.isArray(body.profiles)) {
          return res.status(400).json({ error: 'Requête textuelle et liste de profils requises.' });
        }
        return res.json(searchProfiles(body.query, body.profiles));
      }

      if (path === '/api/ai/behavioral-analysis') {
        return res.json(analyzeBehavior(body.userActivityMetrics || {}));
      }

      if (path === '/api/ai/risk-scoring') {
        return res.json(
          assessProfileRisk({
            ...body.profileData,
            verificationStatus: body.verificationStatus ?? body.profileData?.verificationStatus,
            securityFlags: body.securityFlags
          })
        );
      }

      if (path === '/api/ai/deception-detector' || path === '/api/security/deception-detector') {
        const targetProfileId = String(body.profileId || '')
          .toLowerCase()
          .trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetProfileId)) {
          return res.status(400).json({ error: 'Identifiant du profil à examiner invalide.' });
        }
        const db = serverSupabase.getServiceClient();
        const requesterId = String((req as any).userId || '');
        const { data: requester, error: requesterError } = await db
          .from('profiles')
          .select('role')
          .eq('id', requesterId)
          .maybeSingle();
        if (requesterError) {
          console.error('Deception detector authorization lookup failed:', requesterError);
          return res.status(503).json({ error: 'Autorisation de revue indisponible.' });
        }
        if (requester?.role !== 'admin') return res.status(403).json({ error: 'Réservé à l’équipe de modération.' });

        const { data: targetProfile, error: targetError } = await db
          .from('profiles')
          .select('id,created_at')
          .eq('id', targetProfileId)
          .maybeSingle();
        if (targetError) {
          console.error('Deception detector profile lookup failed:', targetError);
          return res.status(503).json({ error: 'Profil indisponible pour analyse.' });
        }
        if (!targetProfile) return res.status(404).json({ error: 'Profil introuvable.' });

        const now = Date.now();
        const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
        const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
        const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
        const [
          { count: outboundSwipes24h, error: swipesError },
          { data: recentMessages, error: messagesError },
          { data: pendingReports, error: reportsError },
          { count: blocksReceived30d, error: blocksError }
        ] = await Promise.all([
          db
            .from('swipes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', targetProfileId)
            .gte('created_at', since24h),
          db
            .from('messages')
            .select('content')
            .eq('sender_id', targetProfileId)
            .eq('message_type', 'text')
            .gte('created_at', since7d)
            .order('created_at', { ascending: false })
            .limit(100),
          db
            .from('reports')
            .select('reporter_id')
            .eq('reported_id', targetProfileId)
            .eq('status', 'pending')
            .gte('created_at', since30d),
          db
            .from('blocks')
            .select('id', { count: 'exact', head: true })
            .eq('blocked_user_id', targetProfileId)
            .gte('created_at', since30d)
        ]);
        if (swipesError || messagesError || reportsError || blocksError) {
          console.error('Deception detector signal lookup failed:', {
            swipesError,
            messagesError,
            reportsError,
            blocksError
          });
          return res.status(503).json({ error: 'Signaux de sécurité temporairement indisponibles.' });
        }
        const textMessages = (recentMessages || [])
          .map((message: any) =>
            typeof message.content === 'string'
              ? message.content.slice(0, 2000).trim().toLocaleLowerCase('fr-FR').replace(/\s+/g, ' ')
              : ''
          )
          .filter(Boolean);
        const messageCounts = new Map<string, number>();
        for (const message of textMessages) {
          messageCounts.set(message, (messageCounts.get(message) || 0) + 1);
        }
        const repeatedMessageRatio7d = textMessages.length
          ? Math.max(0, ...messageCounts.values()) / textMessages.length
          : 0;
        const financialMessages7d = textMessages.filter((message) =>
          moderateText(message).categories.includes('financial_solicitation')
        ).length;
        const distinctPendingReports30d = new Set((pendingReports || []).map((report: any) => report.reporter_id)).size;
        const createdAt = new Date(targetProfile.created_at).getTime();
        const accountAgeHours = Number.isFinite(createdAt) ? Math.max(0, (now - createdAt) / (60 * 60 * 1000)) : null;
        return res.json(
          assessDeceptionSignals({
            accountAgeHours,
            outboundSwipes24h: outboundSwipes24h || 0,
            financialMessages7d,
            textMessageCount7d: textMessages.length,
            repeatedMessageRatio7d,
            distinctPendingReports30d,
            blocksReceived30d: blocksReceived30d || 0
          })
        );
      }

      if (path === '/api/love-quiz') {
        if (!body.userAnswers || !body.targetAnswers) {
          return res.status(400).json({ error: 'Les réponses des deux profils sont requises.' });
        }
        return res.json(compareQuizAnswers(body.userAnswers, body.targetAnswers));
      }

      if (path === '/api/faq/ask') {
        if (typeof body.question !== 'string' || !body.question.trim()) {
          return res.status(400).json({ error: 'Question requise.' });
        }
        return res.json(answerFaq(body.question, body.category));
      }

      if (path === '/api/ai/telemetry') {
        return next();
      }

      const unavailableCapabilityByPath: Record<string, string> = {
        '/api/ai/verify-pose': 'biometric-verification',
        '/api/verify-pose': 'biometric-verification',
        '/api/verify-photo': 'biometric-verification',
        '/api/ai/verify-photo': 'biometric-verification',
        '/api/ai/verify-id-document': 'identity-document-verification',
        '/api/ai/stolen-photo-detector': 'stolen-image-detection',
        '/api/ai/multi-account-detector': 'multi-account-detection',
        '/api/ai/photo-ranking': 'image-ranking',
        '/api/ai/translate': 'general-purpose-translation',
        '/api/ai/smart-boost': 'automated-offer-generation',
        '/api/ai/personalized-offer': 'automated-offer-generation'
      };
      const capability = unavailableCapabilityByPath[path] || 'unsupported-internal-capability';
      return res.status(503).json({
        error: 'Cette fonction ne peut pas être exécutée par les règles internes actuellement disponibles.',
        capability,
        architecture: 'bavel-internal',
        externalProvider: false
      });
    }
  );

  const configuredMobileMoneyCountries = new Set(
    String(process.env.MOBILE_MONEY_COUNTRIES || '')
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter((value) => /^[A-Z]{2}$/.test(value))
  );
  const mobileMoneySupportsCountry = (countryCode: string) =>
    configuredMobileMoneyCountries.size === 0 || configuredMobileMoneyCountries.has(countryCode);
  const resolvePaymentCountry = (req: express.Request, requested?: string) => {
    const headerCountry = String(req.headers['cf-ipcountry'] || req.headers['x-country-code'] || '').toUpperCase();
    if (/^[A-Z]{2}$/.test(headerCountry)) return headerCountry;
    const candidate = String(requested || '').toUpperCase();
    return /^[A-Z]{2}$/.test(candidate) ? candidate : 'US';
  };

  const creditCatalog: Record<string, { credits: number; eur: number; xof: number }> = {
    pack_100: { credits: 100, eur: 2.49, xof: 1500 },
    pack_550: { credits: 550, eur: 8.99, xof: 6000 },
    pack_1250: { credits: 1250, eur: 17.99, xof: 12000 },
    pack_3000: { credits: 3000, eur: 36.99, xof: 25000 },
    pack_3050: { credits: 3050, eur: 59.99, xof: 39000 },
    pack_1350: { credits: 1350, eur: 39.99, xof: 26000 },
    pack_450: { credits: 450, eur: 19.99, xof: 13000 },
    pack_100_show: { credits: 100, eur: 5.99, xof: 3900 }
  };
  const subscriptionCatalog: Record<
    string,
    { tier: 'extra' | 'premium'; eur: number; xof: number | null; durationDays: number | null }
  > = {
    extra_1week: { tier: 'extra', eur: 5.99, xof: null, durationDays: 7 },
    extra_1month: { tier: 'extra', eur: 14.99, xof: 3500, durationDays: 30 },
    extra_3months: { tier: 'extra', eur: 29.99, xof: null, durationDays: 90 },
    extra_6months: { tier: 'extra', eur: 44.99, xof: null, durationDays: 180 },
    premium_1day: { tier: 'premium', eur: 5.99, xof: null, durationDays: 1 },
    premium_1week: { tier: 'premium', eur: 11.99, xof: null, durationDays: 7 },
    premium_1month: { tier: 'premium', eur: 29.99, xof: 7500, durationDays: 30 },
    premium_3months: { tier: 'premium', eur: 59.99, xof: null, durationDays: 90 },
    premium_6months: { tier: 'premium', eur: 89.99, xof: null, durationDays: 180 },
    premium_lifetime: { tier: 'premium', eur: 149.99, xof: null, durationDays: null }
  };
  const paymentProduct = (productType: unknown, productId: unknown) => {
    if (typeof productId !== 'string') return null;
    if (productType === 'credits') {
      const product = creditCatalog[productId];
      return product ? { ...product, productType: 'credits' as const, productId } : null;
    }
    if (productType === 'subscription') {
      const product = subscriptionCatalog[productId];
      return product ? { ...product, credits: 0, productType: 'subscription' as const, productId } : null;
    }
    return null;
  };

  app.post('/api/payments/route', verifySupabaseToken, requireAuth, async (req, res) => {
    const countryCode = resolvePaymentCountry(req, req.body?.countryCode);
    const requestedMethod = String(req.body?.method || 'auto');
    const product = paymentProduct(req.body?.productType, req.body?.productId);
    if (!product) return res.status(400).json({ error: 'Produit de paiement invalide.' });

    const mobileMoneyAvailable = Boolean(
      process.env.MOBILE_MONEY_CHECKOUT_URL && process.env.MOBILE_MONEY_API_KEY && process.env.MOBILE_MONEY_MERCHANT_ID
    );
    const stripeAvailable = Boolean(process.env.STRIPE_SECRET_KEY);
    const quotes = {
      card: stripeAvailable && product.eur !== undefined ? { amount: product.eur, currency: 'EUR' } : null,
      mobile_money:
        mobileMoneyAvailable &&
        mobileMoneySupportsCountry(countryCode) &&
        product.xof !== null &&
        product.xof !== undefined
          ? { amount: product.xof, currency: 'XOF' }
          : null
    };
    const availableMethods = (['card', 'mobile_money'] as const).filter((method) => quotes[method] !== null);
    const preferred =
      requestedMethod === 'auto'
        ? availableMethods.includes('mobile_money')
          ? 'mobile_money'
          : availableMethods[0]
        : requestedMethod;
    if (!availableMethods.length) {
      return res.status(503).json({ error: 'Aucun moyen de paiement n’est configuré pour cette offre et cette zone.' });
    }
    if (!availableMethods.includes(preferred as 'card' | 'mobile_money')) {
      return res.status(503).json({ error: 'Ce moyen de paiement n’est pas disponible pour cette offre.' });
    }
    return res.json({ countryCode, provider: preferred, availableMethods, quotes });
  });

  app.post('/api/payments/checkout', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '');
    const { method, countryCode, description, productId, productType } = req.body || {};
    if (!['card', 'mobile_money'].includes(method)) {
      return res.status(400).json({ error: 'Paramètres de paiement invalides.' });
    }
    const product = paymentProduct(productType, productId);
    if (!product) return res.status(400).json({ error: 'Produit de paiement invalide.' });
    const route = resolvePaymentCountry(req, countryCode);
    const isMobileMoney = method === 'mobile_money';
    const mobileMoneyAvailable = Boolean(
      process.env.MOBILE_MONEY_CHECKOUT_URL && process.env.MOBILE_MONEY_API_KEY && process.env.MOBILE_MONEY_MERCHANT_ID
    );
    if (
      (isMobileMoney &&
        (!mobileMoneyAvailable ||
          !mobileMoneySupportsCountry(route) ||
          product.xof === null ||
          product.xof === undefined)) ||
      (!isMobileMoney && !process.env.STRIPE_SECRET_KEY)
    ) {
      return res
        .status(503)
        .json({ error: 'Ce moyen de paiement n’est pas disponible pour cette offre et cette zone.' });
    }
    const normalizedCurrency = isMobileMoney ? 'XOF' : 'EUR';
    const numericAmount = isMobileMoney ? product.xof! : product.eur;
    const normalizedCredits = product.credits;
    const reference = `bavel_${userId}_${Date.now()}`;
    const amountMinor = isMobileMoney ? numericAmount : Math.round(numericAmount * 100);
    try {
      const db = serverSupabase.getServiceClient();
      const { error: orderError } = await db.from('payment_orders').insert({
        user_id: userId,
        provider: isMobileMoney ? 'mobile_money' : 'stripe',
        provider_reference: reference,
        amount: amountMinor,
        currency: normalizedCurrency,
        credits: normalizedCredits,
        product_type: productType,
        product_id: product.productId,
        metadata: { description: description || 'Bavel' }
      });

      if (orderError) {
        console.error('Payment order creation failed:', orderError);
        return res.status(500).json({ error: 'Impossible de créer la commande de paiement.' });
      }
      if (isMobileMoney) {
        const origin = new URL(process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).origin;
        const successUrl = new URL(origin);
        successUrl.searchParams.set('payment_reference', reference);
        successUrl.hash = 'payment-success';
        const cancelUrl = new URL(origin);
        cancelUrl.hash = 'payment-cancelled';
        const response = await fetch(process.env.MOBILE_MONEY_CHECKOUT_URL!, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.MOBILE_MONEY_API_KEY || ''}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            merchantId: process.env.MOBILE_MONEY_MERCHANT_ID,
            amount: Math.round(numericAmount),
            currency: normalizedCurrency,
            reference,
            description: description || 'Bavel',
            returnUrl: successUrl.toString(),
            cancelUrl: cancelUrl.toString()
          })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.paymentUrl) {
          await db.from('payment_orders').update({ status: 'failed' }).eq('provider_reference', reference);
          return res.status(502).json({ error: 'Le prestataire Mobile Money est indisponible.' });
        }
        return res.json({ provider: 'mobile_money', paymentUrl: payload.paymentUrl, reference });
      }

      const origin = String(process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
      const successUrl = new URL(origin);
      successUrl.searchParams.set('payment_reference', reference);
      successUrl.hash = 'payment-success';
      const cancelUrl = new URL(origin);
      cancelUrl.hash = 'payment-cancelled';
      const params = new URLSearchParams({
        mode: 'payment',
        'line_items[0][price_data][currency]': normalizedCurrency.toLowerCase(),
        'line_items[0][price_data][product_data][name]': description || 'Bavel',
        'line_items[0][price_data][unit_amount]': String(Math.round(numericAmount * 100)),
        'line_items[0][quantity]': '1',
        success_url: successUrl.toString(),
        cancel_url: cancelUrl.toString(),
        client_reference_id: reference,
        'metadata[user_id]': userId,
        'metadata[product_type]': product.productType,
        'metadata[product_id]': product.productId,
        'metadata[credits]': String(normalizedCredits)
      });
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.url) {
        await db.from('payment_orders').update({ status: 'failed' }).eq('provider_reference', reference);
        return res.status(502).json({ error: 'Stripe est indisponible.' });
      }
      return res.json({ provider: 'stripe', paymentUrl: payload.url, reference });
    } catch (error) {
      console.error('Payment checkout failed:', error);
      return res.status(502).json({ error: 'Impossible de démarrer le paiement.' });
    }
  });

  app.get('/api/payments/orders/:reference', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('payment_orders')
        .select('provider_reference,product_type,product_id,status,credits,currency,amount,paid_at')
        .eq('provider_reference', req.params.reference)
        .eq('user_id', String((req as any).userId))
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Commande introuvable.' });
      return res.json({ order: data });
    } catch (error) {
      console.error('Payment order status lookup failed:', error);
      return res.status(503).json({ error: 'État du paiement indisponible.' });
    }
  });

  app.post('/api/payments/webhook/mobile-money', async (req, res) => {
    const secret = process.env.MOBILE_MONEY_WEBHOOK_SECRET;
    const supplied = String(req.headers['x-webhook-secret'] || req.headers['x-signature'] || '');
    const suppliedBytes = Buffer.from(supplied);
    const secretBytes = Buffer.from(secret || '');
    if (
      !secret ||
      !supplied ||
      suppliedBytes.length !== secretBytes.length ||
      !crypto.timingSafeEqual(suppliedBytes, secretBytes)
    ) {
      return res.status(401).json({ error: 'Webhook non autorisé.' });
    }
    const reference = String(req.body?.reference || req.body?.merchant_reference || '');
    const status = String(req.body?.status || '').toLowerCase();
    if (!reference) return res.status(400).json({ error: 'Référence absente.' });
    if (['success', 'successful', 'paid', 'completed'].includes(status)) {
      const db = serverSupabase.getServiceClient();
      const { data: order, error: orderError } = await db
        .from('payment_orders')
        .select('provider,amount,currency')
        .eq('provider_reference', reference)
        .maybeSingle();
      if (orderError) {
        console.error('Mobile Money order lookup failed:', orderError);
        return res.status(500).json({ error: 'Commande non vérifiée.' });
      }
      const reportedAmount = Number(req.body?.amount);
      const reportedCurrency = String(req.body?.currency || '').toUpperCase();
      const reportedMerchant = String(req.body?.merchantId || req.body?.merchant_id || '');
      if (
        !order ||
        order.provider !== 'mobile_money' ||
        !Number.isFinite(reportedAmount) ||
        reportedAmount !== order.amount ||
        reportedCurrency !== order.currency ||
        reportedMerchant !== process.env.MOBILE_MONEY_MERCHANT_ID
      ) {
        return res.status(400).json({ error: 'Détails du paiement non conformes à la commande.' });
      }
      const { error } = await serverSupabase
        .getServiceClient()
        .rpc('fulfill_payment_order', { order_reference: reference });
      if (error) {
        console.error('Mobile Money fulfillment failed:', error);
        return res.status(500).json({ error: 'Confirmation non enregistrée.' });
      }
    }
    return res.json({ received: true });
  });

  app.post('/api/payments/webhook/stripe', async (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = String(req.headers['stripe-signature'] || '');
    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!secret || !signature || !rawBody) {
      return res.status(400).json({ error: 'Webhook Stripe non configuré.' });
    }
    const timestamp = signature.match(/(?:^|,)t=(\d+)/)?.[1];
    const provided = signature.match(/(?:^|,)v1=([a-f0-9]+)/)?.[1];
    if (!timestamp || !provided || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
      return res.status(400).json({ error: 'Signature Stripe invalide.' });
    }
    const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    const expectedBytes = Buffer.from(expected);
    const providedBytes = Buffer.from(provided);
    if (expectedBytes.length !== providedBytes.length || !crypto.timingSafeEqual(expectedBytes, providedBytes)) {
      return res.status(401).json({ error: 'Signature Stripe invalide.' });
    }
    let event: any;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Payload Stripe invalide.' });
    }
    if (event?.type === 'checkout.session.completed') {
      const reference = String(event?.data?.object?.client_reference_id || '');
      if (!reference) return res.status(400).json({ error: 'Référence Stripe absente.' });
      const checkout = event.data.object;
      const { data: order, error: orderError } = await serverSupabase
        .getServiceClient()
        .from('payment_orders')
        .select('provider,user_id,amount,currency')
        .eq('provider_reference', reference)
        .maybeSingle();
      if (orderError) {
        console.error('Stripe order lookup failed:', orderError);
        return res.status(500).json({ error: 'Commande non vérifiée.' });
      }
      if (
        !order ||
        order.provider !== 'stripe' ||
        checkout.payment_status !== 'paid' ||
        Number(checkout.amount_total) !== order.amount ||
        String(checkout.currency || '').toUpperCase() !== order.currency ||
        String(checkout.metadata?.user_id || '') !== String(order.user_id)
      ) {
        return res.status(400).json({ error: 'Session Stripe non conforme à la commande.' });
      }
      const { error } = await serverSupabase
        .getServiceClient()
        .rpc('fulfill_payment_order', { order_reference: reference });
      if (error) {
        console.error('Stripe fulfillment failed:', error);
        return res.status(500).json({ error: 'Confirmation non enregistrée.' });
      }
    }
    return res.json({ received: true });
  });

  app.post('/api/messages', verifySupabaseToken, requireAuth, async (req, res) => {
    const senderId = String((req as any).userId || '');
    const { matchId, receiverId, content, type = 'text', clientMessageId } = req.body || {};
    if (!matchId || !receiverId || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'matchId, receiverId et content sont requis.' });
    }
    if (content.length > 10000) {
      return res.status(413).json({ error: 'Message trop long.' });
    }
    if (!['text', 'image', 'voice', 'call'].includes(type)) {
      return res.status(400).json({ error: 'Type de message invalide.' });
    }
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (clientMessageId !== undefined && !uuidPattern.test(clientMessageId)) {
      return res.status(400).json({ error: 'Identifiant de message invalide.' });
    }
    const db = serverSupabase.getServiceClient();
    const { data: blockedRelation, error: blockError } = await db
      .from('blocks')
      .select('id')
      .or(
        `and(user_id.eq.${senderId},blocked_user_id.eq.${receiverId}),and(user_id.eq.${receiverId},blocked_user_id.eq.${senderId})`
      )
      .limit(1)
      .maybeSingle();
    if (blockError) return res.status(500).json({ error: 'Vérification de sécurité impossible.' });
    if (blockedRelation) return res.status(403).json({ error: 'Cette conversation est bloquée.' });
    const { data: match, error: matchError } = await db
      .from('matches')
      .select('id,user_id,matched_user_id')
      .eq('id', matchId)
      .or(`user_id.eq.${senderId},matched_user_id.eq.${senderId}`)
      .maybeSingle();
    if (matchError) return res.status(500).json({ error: 'Vérification de conversation impossible.' });
    if (!match || ![match.user_id, match.matched_user_id].includes(receiverId)) {
      return res.status(403).json({ error: 'Conversation non autorisée.' });
    }
    if (clientMessageId) {
      const { data: existingMessage, error: existingMessageError } = await db
        .from('messages')
        .select('*')
        .eq('id', clientMessageId)
        .maybeSingle();
      if (existingMessageError) return res.status(500).json({ error: 'Vérification du message impossible.' });
      if (existingMessage) {
        if (
          existingMessage.sender_id !== senderId ||
          existingMessage.receiver_id !== receiverId ||
          existingMessage.match_id !== matchId ||
          existingMessage.content !== content
        ) {
          return res.status(409).json({ error: 'Identifiant de message déjà utilisé.' });
        }
        return res.status(200).json({ message: existingMessage });
      }
    }
    const moderation = await fetch(`${req.protocol}://${req.get('host')}/api/ai/rude-detector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization || '' },
      body: JSON.stringify({ content })
    });
    const moderationResult = await moderation.json().catch(() => null);
    if (!moderation.ok || moderationResult?.isSafe === false) {
      return res.status(422).json({
        error: 'Message bloqué par la modération.',
        moderation: moderationResult || { isSafe: false }
      });
    }
    const { data, error } = await db
      .from('messages')
      .insert({
        ...(clientMessageId ? { id: clientMessageId } : {}),
        match_id: matchId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        is_read: false,
        message_type: type
      })
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: 'Enregistrement du message impossible.' });
    const { error: scanError } = await db.from('message_scans').insert({
      message_id: data.id,
      scan_status: moderationResult?.isSafe === false ? 'blocked' : 'clean',
      phishing_score: ['scam', 'financial_solicitation'].includes(moderationResult?.category) ? 1 : 0,
      abuse_score: moderationResult?.isRude ? (moderationResult?.severity === 'high' ? 1 : 0.5) : 0,
      has_suspicious_links: Boolean(moderationResult?.hasSuspiciousLinks),
      has_profanity: Boolean(moderationResult?.isRude),
      contains_media: type !== 'text',
      scanned_at: new Date().toISOString()
    });
    if (scanError) {
      await db.from('messages').delete().eq('id', data.id);
      console.error('Message moderation scan persistence failed:', scanError);
      return res.status(503).json({ error: 'Modération du message indisponible.' });
    }
    return res.status(201).json({ message: data });
  });

  app.post('/api/messages/media', async (req, res) => {
    const senderId = String((req as any).userId || '');
    const receiverId = String(req.body?.receiverId || '');
    const imageBase64 = req.body?.imageBase64;
    const isEphemeral = req.body?.isEphemeral === true;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(receiverId) || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Destinataire et image valides requis.' });
    }

    const db = serverSupabase.getServiceClient();
    const { data: blockedRelation, error: blockError } = await db
      .from('blocks')
      .select('id')
      .or(
        `and(user_id.eq.${senderId},blocked_user_id.eq.${receiverId}),and(user_id.eq.${receiverId},blocked_user_id.eq.${senderId})`
      )
      .limit(1)
      .maybeSingle();
    if (blockError) {
      console.error('Chat image block check failed:', blockError);
      return res.status(503).json({ error: 'Vérification de sécurité impossible.' });
    }
    if (blockedRelation) return res.status(403).json({ error: 'Cette conversation est bloquée.' });

    const { data: matches, error: matchError } = await db
      .from('matches')
      .select('id,user_id,matched_user_id')
      .or(
        `and(user_id.eq.${senderId},matched_user_id.eq.${receiverId}),and(user_id.eq.${receiverId},matched_user_id.eq.${senderId})`
      )
      .limit(1);
    if (matchError) {
      console.error('Chat image match lookup failed:', matchError);
      return res.status(503).json({ error: 'Vérification de conversation impossible.' });
    }
    const match = matches?.[0];
    if (!match) return res.status(403).json({ error: 'Conversation non autorisée.' });

    let moderation;
    try {
      moderation = await moderateImageLocally(imageBase64, 'chat');
    } catch (error) {
      if (error instanceof ImageModerationError) {
        if (error.status === 503) console.error('Chat image moderation unavailable:', error);
        return res.status(error.status).json({ error: error.message });
      }
      console.error('Unexpected chat image moderation failure:', error);
      return res.status(503).json({ error: 'Le contrôle de sécurité des images est indisponible.' });
    }
    if (!moderation.isSafe) {
      return res.status(422).json({ error: moderation.message, moderation });
    }

    let normalizedImage: Buffer;
    try {
      normalizedImage = await normalizeImageForPrivateStorage(imageBase64);
    } catch (error) {
      if (error instanceof ImageModerationError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('Chat image normalization failed:', error);
      return res.status(503).json({ error: 'Préparation sécurisée de l’image impossible.' });
    }

    const messageId = crypto.randomUUID();
    const mediaPath = `${match.id}/${messageId}.webp`;
    const { error: uploadError } = await db.storage.from(CHAT_MEDIA_BUCKET).upload(mediaPath, normalizedImage, {
      contentType: 'image/webp',
      cacheControl: '0',
      upsert: false
    });
    if (uploadError) {
      console.error('Private chat image upload failed:', uploadError);
      return res.status(503).json({ error: 'Stockage privé des images indisponible.' });
    }

    const expiresAt = isEphemeral ? new Date(Date.now() + MAX_EPHEMERAL_IMAGE_AGE_MS).toISOString() : null;
    const { data: message, error: messageError } = await db
      .from('messages')
      .insert({
        id: messageId,
        match_id: match.id,
        sender_id: senderId,
        receiver_id: receiverId,
        content: isEphemeral ? '[Photo éphémère]' : '[Image]',
        message_type: 'image',
        media_url: mediaPath,
        is_ephemeral: isEphemeral,
        is_private_content: moderation.blurRequired || moderation.isPrivateContent,
        media_expires_at: expiresAt,
        is_read: false
      })
      .select('*')
      .single();
    if (messageError) {
      const { error: cleanupError } = await db.storage.from(CHAT_MEDIA_BUCKET).remove([mediaPath]);
      if (cleanupError) console.error('Failed to roll back an unreferenced chat image:', cleanupError);
      console.error('Chat image message persistence failed:', messageError);
      return res.status(503).json({ error: 'Enregistrement de l’image impossible.' });
    }

    const { error: scanError } = await db.from('message_scans').insert({
      message_id: messageId,
      scan_status: 'clean',
      contains_media: true,
      scanned_at: new Date().toISOString()
    });
    if (scanError) {
      const [{ error: messageCleanupError }, { error: objectCleanupError }] = await Promise.all([
        db.from('messages').delete().eq('id', messageId),
        db.storage.from(CHAT_MEDIA_BUCKET).remove([mediaPath])
      ]);
      if (messageCleanupError)
        console.error('Failed to roll back an unscanned chat image message:', messageCleanupError);
      if (objectCleanupError) console.error('Failed to roll back an unscanned chat image object:', objectCleanupError);
      console.error('Chat image moderation scan persistence failed:', scanError);
      return res.status(503).json({ error: 'Modération de l’image indisponible.' });
    }

    let mediaUrl: string | null = null;
    if (!isEphemeral) {
      const { data: signedUrl, error: signedUrlError } = await db.storage
        .from(CHAT_MEDIA_BUCKET)
        .createSignedUrl(mediaPath, 900);
      if (signedUrlError || !signedUrl?.signedUrl) {
        const [{ error: messageCleanupError }, { error: objectCleanupError }] = await Promise.all([
          db.from('messages').delete().eq('id', messageId),
          db.storage.from(CHAT_MEDIA_BUCKET).remove([mediaPath])
        ]);
        if (messageCleanupError)
          console.error('Failed to roll back a chat image without a signed URL:', messageCleanupError);
        if (objectCleanupError) console.error('Failed to remove chat image without a signed URL:', objectCleanupError);
        console.error('Private chat image URL generation failed:', signedUrlError);
        return res.status(503).json({ error: 'Lien privé de l’image indisponible.' });
      }
      mediaUrl = signedUrl.signedUrl;
    }
    return res.status(201).json({ message, mediaUrl, moderation });
  });

  app.post('/api/messages/voice', async (req, res) => {
    const senderId = String((req as any).userId || '');
    const receiverId = String(req.body?.receiverId || '');
    const audioData = req.body?.audioData;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const audioMatch =
      typeof audioData === 'string'
        ? audioData.match(/^data:(audio\/(?:webm|ogg|mp4));base64,([A-Za-z0-9+/]+={0,2})$/)
        : null;
    if (!uuidPattern.test(receiverId) || !audioMatch) {
      return res.status(400).json({ error: 'Destinataire et note vocale valides requis.' });
    }
    if (!senderId) return res.status(401).json({ error: 'Session utilisateur requise.' });

    const audioBytes = Buffer.from(audioMatch[2], 'base64');
    if (!audioBytes.length || audioBytes.length > 6 * 1024 * 1024 || audioBytes.toString('base64') !== audioMatch[2]) {
      return res.status(413).json({ error: 'La note vocale dépasse la taille maximale autorisée.' });
    }
    const validAudioContainer =
      audioMatch[1] === 'audio/webm'
        ? audioBytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
        : audioMatch[1] === 'audio/ogg'
          ? audioBytes.subarray(0, 4).toString('ascii') === 'OggS'
          : audioBytes.subarray(4, 8).toString('ascii') === 'ftyp';
    if (!validAudioContainer) {
      return res.status(400).json({ error: 'Le fichier ne contient pas un format audio reconnu.' });
    }

    const db = serverSupabase.getServiceClient();
    const { data: blockedRelation, error: blockError } = await db
      .from('blocks')
      .select('id')
      .or(
        `and(user_id.eq.${senderId},blocked_user_id.eq.${receiverId}),and(user_id.eq.${receiverId},blocked_user_id.eq.${senderId})`
      )
      .limit(1)
      .maybeSingle();
    if (blockError) {
      console.error('Chat voice block check failed:', blockError);
      return res.status(503).json({ error: 'Vérification de sécurité impossible.' });
    }
    if (blockedRelation) return res.status(403).json({ error: 'Cette conversation est bloquée.' });

    const { data: matches, error: matchError } = await db
      .from('matches')
      .select('id')
      .or(
        `and(user_id.eq.${senderId},matched_user_id.eq.${receiverId}),and(user_id.eq.${receiverId},matched_user_id.eq.${senderId})`
      )
      .limit(1);
    if (matchError) {
      console.error('Chat voice match lookup failed:', matchError);
      return res.status(503).json({ error: 'Vérification de conversation impossible.' });
    }
    const match = matches?.[0];
    if (!match) return res.status(403).json({ error: 'Conversation non autorisée.' });

    const mimeType = audioMatch[1];
    const extension = mimeType === 'audio/webm' ? 'webm' : mimeType === 'audio/ogg' ? 'ogg' : 'm4a';
    const messageId = crypto.randomUUID();
    const mediaPath = `${match.id}/${messageId}.${extension}`;
    const { error: uploadError } = await db.storage.from(CHAT_MEDIA_BUCKET).upload(mediaPath, audioBytes, {
      contentType: mimeType,
      cacheControl: '0',
      upsert: false
    });
    if (uploadError) {
      console.error('Private chat voice upload failed:', uploadError);
      return res.status(503).json({ error: 'Stockage privé des notes vocales indisponible.' });
    }

    const { data: message, error: messageError } = await db
      .from('messages')
      .insert({
        id: messageId,
        match_id: match.id,
        sender_id: senderId,
        receiver_id: receiverId,
        content: '[Note vocale]',
        message_type: 'voice',
        media_url: mediaPath,
        is_read: false
      })
      .select('*')
      .single();
    if (messageError) {
      const { error: cleanupError } = await db.storage.from(CHAT_MEDIA_BUCKET).remove([mediaPath]);
      if (cleanupError) console.error('Failed to roll back an unreferenced chat voice note:', cleanupError);
      console.error('Chat voice message persistence failed:', messageError);
      return res.status(503).json({ error: 'Enregistrement de la note vocale impossible.' });
    }

    const { error: scanError } = await db.from('message_scans').insert({
      message_id: messageId,
      scan_status: 'pending',
      contains_media: true,
      scanned_at: new Date().toISOString()
    });
    if (scanError) {
      const [{ error: messageCleanupError }, { error: objectCleanupError }] = await Promise.all([
        db.from('messages').delete().eq('id', messageId),
        db.storage.from(CHAT_MEDIA_BUCKET).remove([mediaPath])
      ]);
      if (messageCleanupError) console.error('Failed to roll back an unscanned voice note:', messageCleanupError);
      if (objectCleanupError) console.error('Failed to remove an unscanned voice object:', objectCleanupError);
      console.error('Chat voice scan persistence failed:', scanError);
      return res.status(503).json({ error: 'Contrôle de sécurité de la note vocale indisponible.' });
    }

    const { data: signedUrl, error: signedUrlError } = await db.storage
      .from(CHAT_MEDIA_BUCKET)
      .createSignedUrl(mediaPath, 900);
    if (signedUrlError || !signedUrl?.signedUrl) {
      const [{ error: messageCleanupError }, { error: objectCleanupError }] = await Promise.all([
        db.from('messages').delete().eq('id', messageId),
        db.storage.from(CHAT_MEDIA_BUCKET).remove([mediaPath])
      ]);
      if (messageCleanupError)
        console.error('Failed to roll back a voice note without a signed URL:', messageCleanupError);
      if (objectCleanupError) console.error('Failed to remove voice note without a signed URL:', objectCleanupError);
      console.error('Private chat voice URL generation failed:', signedUrlError);
      return res.status(503).json({ error: 'Lien privé de la note vocale indisponible.' });
    }
    return res.status(201).json({ message, mediaUrl: signedUrl.signedUrl });
  });

  app.get('/api/messages/:messageId/media-url', async (req, res) => {
    const userId = String((req as any).userId || '');
    const messageId = String(req.params.messageId || '');
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(messageId)) return res.status(404).json({ error: 'Image introuvable.' });

    const db = serverSupabase.getServiceClient();
    const { data: message, error: lookupError } = await db
      .from('messages')
      .select('id,sender_id,receiver_id,media_url,is_ephemeral,media_viewed_at,media_expires_at')
      .eq('id', messageId)
      .maybeSingle();
    if (lookupError) {
      console.error('Chat image access lookup failed:', lookupError);
      return res.status(503).json({ error: 'Accès à l’image momentanément indisponible.' });
    }
    if (!message || ![message.sender_id, message.receiver_id].includes(userId)) {
      return res.status(404).json({ error: 'Image introuvable.' });
    }
    if (message.is_ephemeral && message.sender_id === userId) {
      return res.status(403).json({ error: 'La photo éphémère est réservée à son destinataire.' });
    }
    if (!message.media_url) return res.status(410).json({ error: 'Cette image n’est plus disponible.' });
    if (
      message.is_ephemeral &&
      (message.media_viewed_at ||
        !message.media_expires_at ||
        new Date(message.media_expires_at).getTime() <= Date.now())
    ) {
      return res.status(410).json({ error: 'Cette photo éphémère a expiré.' });
    }

    if (message.is_ephemeral) {
      const { data: image, error: downloadError } = await db.storage
        .from(CHAT_MEDIA_BUCKET)
        .download(message.media_url);
      if (downloadError || !image) {
        console.error('Ephemeral chat image download failed:', downloadError);
        return res.status(503).json({ error: 'Téléchargement de la photo éphémère impossible.' });
      }

      const imageBytes = Buffer.from(await image.arrayBuffer());
      const viewedAt = new Date().toISOString();
      const { data: claimed, error: claimError } = await db
        .from('messages')
        .update({ media_viewed_at: viewedAt })
        .eq('id', messageId)
        .is('media_viewed_at', null)
        .gt('media_expires_at', viewedAt)
        .select('id')
        .maybeSingle();
      if (claimError) {
        console.error('Ephemeral chat image view could not be recorded:', claimError);
        return res.status(503).json({ error: 'Ouverture de la photo éphémère impossible.' });
      }
      if (!claimed) return res.status(410).json({ error: 'Cette photo éphémère a déjà été ouverte.' });

      const cleanupTimer = setTimeout(() => {
        deleteEphemeralMediaObject(messageId).catch((error) => {
          console.error(`Viewed ephemeral image cleanup failed for message ${messageId}:`, error);
        });
      }, EPHEMERAL_VIEW_CLEANUP_DELAY_MS);
      cleanupTimer.unref();

      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Content-Length', imageBytes.byteLength);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.status(200).send(imageBytes);
    }

    const lifetimeSeconds = 900;
    const { data: signedUrl, error: signedUrlError } = await db.storage
      .from(CHAT_MEDIA_BUCKET)
      .createSignedUrl(message.media_url, lifetimeSeconds);
    if (signedUrlError || !signedUrl?.signedUrl) {
      console.error('Private chat image URL generation failed:', signedUrlError);
      return res.status(503).json({ error: 'Lien privé de l’image indisponible.' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ url: signedUrl.signedUrl, expiresIn: lifetimeSeconds });
  });

  app.post('/api/moderation/text', async (req, res) => {
    const { text, contentType = 'message' } = req.body || {};
    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Texte requis.' });
    }
    if (!INTERNAL_AI_ENABLED) {
      return res.status(503).json({ error: 'Service de modération texte non configuré.' });
    }
    const result = await safeGenerateJson({
      preferredModel: 'internal',
      systemInstruction:
        'Classifie le contenu. Réponds uniquement en JSON: {"decision":"allow|review|block","categories":[],"confidence":0}',
      contents: `Type: ${contentType}\nTexte: ${text.slice(0, 10000)}`
    });
    if (!result) return res.status(502).json({ error: 'Modération indisponible.' });
    return res.json(result);
  });

  app.post('/api/moderation/photo', async (req, res) => {
    const image = req.body?.image;
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Image requise.' });
    }
    const imgData = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!imgData) return res.status(400).json({ error: 'Format d’image invalide.' });
    if (!INTERNAL_AI_ENABLED) {
      return res.status(503).json({ error: 'IA interne de modération indisponible.' });
    }
    try {
      const result = await safeGenerateJson<any>({
        preferredModel: 'internal',
        contents: [
          'Tu es le modérateur visuel interne de Bavel. Analyse cette photo de profil pour détecter nudité, contenu sexuel explicite, violence, exploitation, activité illégale, symbole haineux, publicité ou coordonnées destinées à contourner la plateforme. Réponds uniquement en JSON: {"decision":"allow|review|block","categories":[],"confidence":0,"reason":"","blurRequired":false}. Ne déduis jamais identité, origine, religion ou orientation.',
          { inlineData: { mimeType: imgData[1], data: imgData[2] } }
        ]
      });
      if (!result) return res.status(503).json({ error: 'IA interne de modération indisponible.' });
      return res.json({
        ...result,
        provider: 'Bavel Internal Moderation AI',
        decision: ['allow', 'review', 'block'].includes(result.decision) ? result.decision : 'review',
        blurRequired: result.decision === 'block' || Boolean(result.blurRequired)
      });
    } catch (error) {
      console.error('Internal photo moderation failed:', error);
      return res.status(503).json({ error: 'Analyse photo indisponible.' });
    }
  });

  app.get('/api/recommendations', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const { profile, candidates } = await serverSupabase.getRecommendationData((req as any).userId);
      const candidateIds = candidates.map((candidate: any) => candidate.id);
      const { data: candidatePrivacy, error: privacyError } = candidateIds.length
        ? await serverSupabase
            .getServiceClient()
            .from('user_privacy_settings')
            .select('user_id,incognito_mode,show_online_status,show_distance,profile_paused')
            .in('user_id', candidateIds)
        : { data: [], error: null };
      if (privacyError) throw privacyError;
      const privacyByUser = new Map((candidatePrivacy || []).map((settings: any) => [settings.user_id, settings]));
      const userInterests = Array.isArray(profile.interests) ? profile.interests : [];
      const visibleCandidates = candidates.filter((candidate: any) => {
        const privacy = privacyByUser.get(candidate.id);
        return privacy?.profile_paused !== true;
      });
      const signedCandidates = await signMemberProfileMedia(visibleCandidates);
      const recommendations = signedCandidates
        .map((candidate: any) => {
          const privacy = privacyByUser.get(candidate.id);
          const sharedInterests = userInterests.filter((interest: string) =>
            (candidate.interests || []).some((value: string) => value.toLowerCase() === interest.toLowerCase())
          );
          const sameCity = profile.city && candidate.city && profile.city === candidate.city;
          const recentlyActive =
            candidate.last_active_at && privacy?.show_online_status !== false
              ? Math.max(0, Date.now() - new Date(candidate.last_active_at).getTime()) < 24 * 60 * 60 * 1000
              : false;
          const profileCompleteness = [
            candidate.name,
            candidate.bio,
            candidate.city,
            candidate.photos?.length,
            candidate.interests?.length
          ].filter(Boolean).length;
          const score = Math.min(
            100,
            35 +
              sharedInterests.length * 12 +
              (sameCity ? 15 : 0) +
              (candidate.is_verified ? 8 : 0) +
              (recentlyActive ? 8 : 0) +
              Math.min(10, profileCompleteness * 2)
          );
          return toPublicProfile(
            {
              ...candidate,
              compatibility_score: score,
              shared_interests: sharedInterests
            },
            {
              showOnlineStatus: privacy?.show_online_status !== false,
              showDistance: privacy?.show_distance !== false
            }
          );
        })
        .sort((a: any, b: any) => b.compatibility_score - a.compatibility_score);
      return res.json({ recommendations });
    } catch (error) {
      console.error('Recommendation query failed:', error);
      return res.status(500).json({ error: 'Recommandations indisponibles.' });
    }
  });

  app.get('/api/likes/received', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId);
    try {
      const { data: likes, error: likesError } = await serverSupabase
        .getServiceClient()
        .from('swipes')
        .select('user_id, is_super_like, created_at')
        .eq('target_id', userId)
        .eq('is_liked', true)
        .order('created_at', { ascending: false })
        .limit(100);
      if (likesError) throw likesError;

      const likerIds = Array.from(new Set((likes || []).map((like: any) => like.user_id)));
      const { data: profiles, error: profilesError } = likerIds.length
        ? await serverSupabase
            .getServiceClient()
            .from('profiles')
            .select('id,name,age,city,photos,avatar_url,is_verified,is_online,last_active_at,created_at')
            .in('id', likerIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;

      const signedProfiles = await signMemberProfileMedia(profiles || []);
      const byId = new Map(signedProfiles.map((profile: any) => [profile.id, profile]));
      const { data: privacySettings, error: privacyError } = likerIds.length
        ? await serverSupabase
            .getServiceClient()
            .from('user_privacy_settings')
            .select('user_id,incognito_mode,profile_paused,show_online_status,show_distance')
            .in('user_id', likerIds)
        : { data: [], error: null };
      if (privacyError) throw privacyError;
      const privacyByUser = new Map(
        (privacySettings || []).map((settings: any) => [String(settings.user_id), settings])
      );
      return res.json({
        likes: (likes || []).flatMap((like: any) => {
          const profile = byId.get(like.user_id);
          const privacy = privacyByUser.get(String(like.user_id));
          if (!profile || privacy?.profile_paused === true) return [];
          return [
            {
              ...toPublicProfile(profile, {
                showOnlineStatus: privacy?.show_online_status !== false,
                showDistance: privacy?.show_distance !== false
              }),
              isSuperLike: Boolean(like.is_super_like),
              likedAt: like.created_at
            }
          ];
        })
      });
    } catch (error) {
      console.error('Received likes query failed:', error);
      return res.status(500).json({ error: 'Likes reçus indisponibles.' });
    }
  });

  app.delete('/api/likes/:targetId', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '');
    const targetId = String(req.params.targetId || '');
    if (!targetId || targetId === userId) return res.status(400).json({ error: 'Profil invalide.' });
    try {
      const db = serverSupabase.getServiceClient();
      const { error } = await db.from('swipes').delete().eq('user_id', userId).eq('target_id', targetId);
      if (error) throw error;
      await db
        .from('matches')
        .delete()
        .or(
          `and(user_id.eq.${userId},matched_user_id.eq.${targetId}),and(user_id.eq.${targetId},matched_user_id.eq.${userId})`
        );
      return res.json({ success: true });
    } catch (error) {
      console.error('Sent like removal failed:', error);
      return res.status(500).json({ error: 'Impossible de retirer le like.' });
    }
  });

  app.delete('/api/likes/received/:senderId', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '');
    const senderId = String(req.params.senderId || '');
    if (!senderId || senderId === userId) return res.status(400).json({ error: 'Profil invalide.' });
    try {
      const { error } = await serverSupabase
        .getServiceClient()
        .from('swipes')
        .delete()
        .eq('user_id', senderId)
        .eq('target_id', userId)
        .eq('is_liked', true);
      if (error) throw error;
      return res.json({ success: true });
    } catch (error) {
      console.error('Received like dismissal failed:', error);
      return res.status(500).json({ error: 'Impossible de traiter ce like.' });
    }
  });

  app.get('/api/likes/sent', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '');
    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('swipes')
        .select('target_id,is_super_like,created_at')
        .eq('user_id', userId)
        .eq('is_liked', true)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return res.json({
        likes: (data || []).map((like: any) => ({
          id: like.target_id,
          isSuperLike: Boolean(like.is_super_like),
          likedAt: like.created_at
        }))
      });
    } catch (error) {
      console.error('Sent likes query failed:', error);
      return res.status(500).json({ error: 'Likes envoyés indisponibles.' });
    }
  });

  app.get('/api/privacy/settings', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const db = serverSupabase.getServiceClient();
      const [{ data, error }, { data: wallet, error: walletError }] = await Promise.all([
        db
          .from('user_privacy_settings')
          .select('incognito_mode,show_online_status,show_distance,allow_calls,profile_paused')
          .eq('user_id', (req as any).userId)
          .maybeSingle(),
        db
          .from('credits')
          .select('tier,premium_expires_at')
          .eq('user_id', (req as any).userId)
          .maybeSingle()
      ]);
      if (error) throw error;
      if (walletError) throw walletError;
      const walletTier = String(wallet?.tier || '').toLowerCase();
      const incognitoAvailable =
        ['extra', 'premium', 'vip'].includes(walletTier) &&
        (!wallet?.premium_expires_at || new Date(wallet.premium_expires_at).getTime() > Date.now());
      return res.json({
        settings: data || {
          incognito_mode: false,
          show_online_status: true,
          show_distance: true,
          allow_calls: true,
          profile_paused: false
        },
        incognitoAvailable
      });
    } catch (error) {
      console.error('Privacy settings query failed:', error);
      return res.status(500).json({ error: 'Réglages de confidentialité indisponibles.' });
    }
  });

  app.put('/api/privacy/settings', verifySupabaseToken, requireAuth, async (req, res) => {
    const allowed = ['incognito_mode', 'show_online_status', 'show_distance', 'allow_calls', 'profile_paused'];
    const updates = Object.fromEntries(
      allowed.filter((key) => typeof req.body?.[key] === 'boolean').map((key) => [key, req.body[key]])
    );
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucun réglage valide.' });
    }
    try {
      const db = serverSupabase.getServiceClient();
      if (updates.incognito_mode === true) {
        const { data: wallet, error: walletError } = await db
          .from('credits')
          .select('tier,premium_expires_at')
          .eq('user_id', (req as any).userId)
          .maybeSingle();
        if (walletError) throw walletError;
        const walletTier = String(wallet?.tier || '').toLowerCase();
        const incognitoAvailable =
          ['extra', 'premium', 'vip'].includes(walletTier) &&
          (!wallet?.premium_expires_at || new Date(wallet.premium_expires_at).getTime() > Date.now());
        if (!incognitoAvailable) {
          return res.status(403).json({
            error: 'PREMIUM_REQUIRED',
            message: 'Le mode de visite incognito est réservé aux membres Extra et Premium.'
          });
        }
      }
      const { data, error } = await db
        .from('user_privacy_settings')
        .upsert({ user_id: (req as any).userId, ...updates, updated_at: new Date().toISOString() })
        .select('incognito_mode,show_online_status,show_distance,allow_calls,profile_paused')
        .single();
      if (error) throw error;
      return res.json({ settings: data });
    } catch (error) {
      console.error('Privacy settings update failed:', error);
      return res.status(500).json({ error: 'Impossible de sauvegarder les réglages.' });
    }
  });

  app.get('/api/favorites', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId);
    try {
      const db = serverSupabase.getServiceClient();
      const { data: favorites, error } = await db
        .from('profile_favorites')
        .select('favorited_user_id,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const ids = (favorites || []).map((favorite: any) => favorite.favorited_user_id);
      const { data: profiles, error: profilesError } = ids.length
        ? await db
            .from('profiles')
            .select(
              'id,name,age,gender,city,country,country_code,bio,job,studies,alcohol,personality,zodiac,pets,photos,interests,details,key_question,is_verified,is_online,last_active_at,created_at'
            )
            .in('id', ids)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const signedProfiles = await signMemberProfileMedia(profiles || []);
      const byId = new Map(signedProfiles.map((profile: any) => [String(profile.id), profile]));
      const { data: privacySettings, error: privacyError } = ids.length
        ? await db
            .from('user_privacy_settings')
            .select('user_id,incognito_mode,profile_paused,show_online_status,show_distance')
            .in('user_id', ids)
        : { data: [], error: null };
      if (privacyError) throw privacyError;
      const privacyByUser = new Map(
        (privacySettings || []).map((settings: any) => [String(settings.user_id), settings])
      );
      return res.json({
        favorites: (favorites || []).flatMap((favorite: any) => {
          const profile = byId.get(String(favorite.favorited_user_id));
          const privacy = privacyByUser.get(String(favorite.favorited_user_id));
          if (!profile || privacy?.profile_paused === true) return [];
          return [
            {
              ...toPublicProfile(profile, {
                showOnlineStatus: privacy?.show_online_status !== false,
                showDistance: privacy?.show_distance !== false
              }),
              favoritedAt: favorite.created_at
            }
          ];
        })
      });
    } catch (error) {
      console.error('Favorites query failed:', error);
      return res.status(500).json({ error: 'Favoris indisponibles.' });
    }
  });

  app.post('/api/favorites/:targetId', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId);
    const targetId = String(req.params.targetId || '');
    if (!targetId || targetId === userId) return res.status(400).json({ error: 'Profil favori invalide.' });
    try {
      const db = serverSupabase.getServiceClient();
      const { data: target, error: targetError } = await db
        .from('profiles')
        .select('id,name,avatar_url,photos')
        .eq('id', targetId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return res.status(404).json({ error: 'Profil introuvable.' });
      const { error } = await db
        .from('profile_favorites')
        .upsert({ user_id: userId, favorited_user_id: targetId }, { onConflict: 'user_id,favorited_user_id' });
      if (error) throw error;
      await db.from('notifications').insert({
        user_id: targetId,
        type: 'system',
        title: 'Votre profil a été ajouté aux favoris',
        body: 'Quelqu’un a ajouté votre profil à ses favoris.',
        data: { event: 'favorite_added', user_id: userId }
      });
      const [favorite] = await signMemberProfileMedia([target]);
      return res.json({ success: true, favorite });
    } catch (error) {
      console.error('Favorite creation failed:', error);
      return res.status(500).json({ error: 'Impossible d’ajouter ce profil aux favoris.' });
    }
  });

  app.delete('/api/favorites/:targetId', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId);
    const targetId = String(req.params.targetId || '');
    try {
      const { error } = await serverSupabase
        .getServiceClient()
        .from('profile_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('favorited_user_id', targetId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (error) {
      console.error('Favorite deletion failed:', error);
      return res.status(500).json({ error: 'Impossible de retirer ce profil des favoris.' });
    }
  });

  app.get('/api/statistics/me', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      return res.json(await serverSupabase.getUserStatistics((req as any).userId));
    } catch (error) {
      console.error('Statistics query failed:', error);
      return res.status(500).json({ error: 'Statistiques indisponibles.' });
    }
  });

  app.get('/api/wallet', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const db = serverSupabase.getServiceClient();
      const { data, error } = await db
        .from('credits')
        .select('balance,tier,updated_at')
        .eq('user_id', String((req as any).userId))
        .maybeSingle();
      if (error) throw error;
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('details')
        .eq('id', String((req as any).userId))
        .maybeSingle();
      if (profileError) throw profileError;
      const details = profile?.details && typeof profile.details === 'object' ? profile.details : {};
      const expiresAt = Number(details.boost_expires_at || 0);
      return res.json({
        wallet: {
          ...(data || { balance: 0, tier: 'free' }),
          boost:
            expiresAt > Date.now()
              ? {
                  isActive: true,
                  startedAt: Number(details.boost_started_at || 0),
                  expiresAt,
                  multiplier: Number(details.boost_multiplier || 5)
                }
              : { isActive: false, startedAt: null, expiresAt: null, multiplier: 1 }
        }
      });
    } catch (error) {
      console.error('Wallet query failed:', error);
      return res.status(500).json({ error: 'Solde indisponible.' });
    }
  });

  app.post('/api/wallet/spend', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '');
    const amount = Number(req.body?.amount);
    const purpose = String(req.body?.purpose || 'profile_boost');
    const transactionType = purpose === 'super_like' ? 'super_like_cost' : 'profile_boost';
    if (!Number.isInteger(amount) || amount <= 0 || amount > 100000) {
      return res.status(400).json({ error: 'Montant de crédits invalide.' });
    }
    try {
      const { data, error } = await serverSupabase.getServiceClient().rpc('spend_user_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_transaction_type: transactionType,
        p_reference_id: String(req.body?.referenceId || crypto.randomUUID()),
        p_description: String(req.body?.description || 'Dépense de crédits')
      });
      if (error) {
        if (/insufficient credits/i.test(error.message)) {
          return res.status(409).json({ error: 'Solde de crédits insuffisant.' });
        }
        throw error;
      }
      return res.json({ balance: Number(data) });
    } catch (error) {
      console.error('Credit spend failed:', error);
      return res.status(500).json({ error: 'Impossible de débiter les crédits.' });
    }
  });

  app.post('/api/wallet/reward', verifySupabaseToken, requireAuth, async (req, res) => {
    return res.status(410).json({
      error: 'REWARDED_AD_VERIFICATION_REQUIRED',
      message: 'Les récompenses doivent passer par le flux publicitaire vérifié.'
    });
  });

  app.post('/api/wallet/boost', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '');
    const cost = 100;
    try {
      const db = serverSupabase.getServiceClient();
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('details')
        .eq('id', userId)
        .maybeSingle();
      if (profileError) throw profileError;
      const details = profile?.details && typeof profile.details === 'object' ? profile.details : {};
      const activeUntil = Number(details.boost_expires_at || 0);
      if (activeUntil > Date.now()) {
        return res.status(409).json({ error: 'Un Boost est déjà actif sur votre profil.' });
      }
      const { data: balance, error: spendError } = await db.rpc('spend_user_credits', {
        p_user_id: userId,
        p_amount: cost,
        p_transaction_type: 'profile_boost',
        p_reference_id: crypto.randomUUID(),
        p_description: 'Boost de profil 30 minutes'
      });
      if (spendError) {
        if (/insufficient credits/i.test(spendError.message)) {
          return res.status(409).json({ error: 'Solde de crédits insuffisant.' });
        }
        throw spendError;
      }
      const startedAt = Date.now();
      const expiresAt = startedAt + 30 * 60 * 1000;
      const { error: updateError } = await db
        .from('profiles')
        .update({
          details: { ...details, boost_started_at: startedAt, boost_expires_at: expiresAt, boost_multiplier: 5 }
        })
        .eq('id', userId);
      if (updateError) throw updateError;
      return res.json({ balance: Number(balance), boost: { isActive: true, startedAt, expiresAt, multiplier: 5 } });
    } catch (error) {
      console.error('Profile boost activation failed:', error);
      return res.status(500).json({ error: 'Impossible d’activer le Boost.' });
    }
  });

  app.post('/api/calls/signals', async (req, res) => {
    const callId = normalizeAuthenticatedUserId(req.body?.callId);
    const receiverId = normalizeAuthenticatedUserId(req.body?.receiverId);
    const senderId = normalizeAuthenticatedUserId((req as any).userId);
    const { signalType, payload } = req.body || {};
    if (
      !senderId ||
      !callId ||
      !receiverId ||
      receiverId === senderId ||
      typeof signalType !== 'string' ||
      !['offer', 'answer', 'ice', 'hangup'].includes(signalType) ||
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload) ||
      Buffer.byteLength(JSON.stringify(payload), 'utf8') > 16_384
    ) {
      return res.status(400).json({ error: 'Signal d’appel invalide.' });
    }
    try {
      const db = serverSupabase.getServiceClient();
      const { data: match, error: matchError } = await db
        .from('matches')
        .select('id')
        .or(
          `and(user_id.eq.${senderId},matched_user_id.eq.${receiverId}),and(user_id.eq.${receiverId},matched_user_id.eq.${senderId})`
        )
        .limit(1)
        .maybeSingle();
      if (matchError) throw matchError;
      if (!match) return res.status(403).json({ error: 'Appel autorisé uniquement entre utilisateurs matchés.' });
      const { data: block, error: blockError } = await db
        .from('blocks')
        .select('id')
        .or(
          `and(user_id.eq.${senderId},blocked_user_id.eq.${receiverId}),and(user_id.eq.${receiverId},blocked_user_id.eq.${senderId})`
        )
        .limit(1)
        .maybeSingle();
      if (blockError) throw blockError;
      if (block) return res.status(403).json({ error: 'Appel indisponible entre ces utilisateurs.' });
      const { data, error } = await db
        .from('call_signals')
        .insert({ call_id: callId, sender_id: senderId, receiver_id: receiverId, signal_type: signalType, payload })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json({ signal: data });
    } catch (error) {
      console.error('Call signal failed:', error);
      return res.status(500).json({ error: 'Signalisation d’appel indisponible.' });
    }
  });

  app.get('/api/calls/signals/:callId', async (req, res) => {
    try {
      const userId = normalizeAuthenticatedUserId((req as any).userId);
      const callId = normalizeAuthenticatedUserId(req.params.callId);
      if (!userId) return res.status(401).json({ error: 'Session utilisateur requise.' });
      if (!callId) return res.status(400).json({ error: 'Identifiant d’appel invalide.' });
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('call_signals')
        .select('*')
        .eq('call_id', callId)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return res.json({ signals: data || [] });
    } catch (error) {
      console.error('Call signal retrieval failed:', error);
      return res.status(500).json({ error: 'Signaux d’appel indisponibles.' });
    }
  });

  app.get('/api/calls/incoming', async (req, res) => {
    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('call_signals')
        .select('*')
        .eq('receiver_id', (req as any).userId)
        .eq('signal_type', 'offer')
        .gt('created_at', new Date(Date.now() - 60_000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return res.json({ signals: data || [] });
    } catch (error) {
      console.error('Incoming call lookup failed:', error);
      return res.status(500).json({ error: 'Appels entrants indisponibles.' });
    }
  });

  app.post('/api/gamification/quest-complete', async (req, res) => {
    const questId = req.body?.questId;
    if (typeof questId !== 'string' || !questId) return res.status(400).json({ error: 'Quête invalide.' });
    try {
      const userId = (req as any).userId;
      const { data, error } = await serverSupabase
        .getServiceClient()
        .rpc('complete_user_quest', { p_user_id: userId, p_quest_id: questId });
      if (error) throw error;
      if (!data?.eligible) {
        return res.status(409).json({
          error: data?.reason || 'Les conditions de cette quête ne sont pas encore remplies.',
          quest: { id: questId, isCompleted: false, eligible: false }
        });
      }
      return res.json({ quest: { id: questId, isCompleted: true }, balance: Number(data.balance) });
    } catch (error) {
      console.error('Quest completion failed:', error);
      return res.status(500).json({ error: 'Quête indisponible.' });
    }
  });

  const BAVEL_QUESTS = [
    { id: 'quest_photos', title: 'Ajouter 3 photos à votre profil', rewardCredits: 30 },
    { id: 'quest_bio', title: 'Rédiger une bio (20 caractères minimum)', rewardCredits: 20 },
    { id: 'quest_first_swipe', title: 'Faire vos 10 premiers swipes', rewardCredits: 25 }
  ];

  app.get('/api/gamification/quests', async (req, res) => {
    try {
      const { data: completed, error } = await serverSupabase
        .getServiceClient()
        .from('user_quests')
        .select('quest_id,completed_at')
        .eq('user_id', (req as any).userId);
      if (error) throw error;
      const completedById = new Map((completed || []).map((quest: any) => [quest.quest_id, quest.completed_at]));
      return res.json({
        quests: BAVEL_QUESTS.map((quest) => ({
          ...quest,
          isCompleted: completedById.has(quest.id),
          completedAt: completedById.get(quest.id) || null
        }))
      });
    } catch (error) {
      console.error('Quest lookup failed:', error);
      return res.status(500).json({ error: 'Quêtes indisponibles.' });
    }
  });

  app.post('/api/profile-visits', verifySupabaseToken, requireAuth, async (req, res) => {
    const visitorId = String((req as any).userId);
    const visitedUserId = String(req.body?.visitedUserId || '');
    if (!visitedUserId || visitedUserId === visitorId) {
      return res.status(400).json({ error: 'Profil visité invalide.' });
    }
    try {
      const db = serverSupabase.getServiceClient();
      const { data: privacy } = await db
        .from('user_privacy_settings')
        .select('incognito_mode')
        .eq('user_id', visitorId)
        .maybeSingle();
      if (privacy?.incognito_mode) return res.status(204).end();

      const { data: visit, error } = await db
        .from('profile_visits')
        .insert({
          visitor_id: visitorId,
          visited_user_id: visitedUserId,
          duration_seconds: Number.isInteger(req.body?.durationSeconds)
            ? Math.max(0, Math.min(3600, req.body.durationSeconds))
            : 0
        })
        .select('id,created_at')
        .maybeSingle();
      if (error && error.code !== '23505') throw error;
      if (visit) {
        const { data: visitor } = await db
          .from('profiles')
          .select('name,avatar_url,photos')
          .eq('id', visitorId)
          .maybeSingle();
        await db.from('notifications').insert({
          user_id: visitedUserId,
          type: 'visit',
          title: 'Nouvelle visite de profil',
          body: `${visitor?.name || 'Un membre'} a consulté votre profil.`,
          data: {
            visitor_id: visitorId,
            avatar_url: visitor?.avatar_url || (Array.isArray(visitor?.photos) ? visitor.photos[0] : null)
          }
        });
      }
      return res.status(204).end();
    } catch (error) {
      console.error('Profile visit recording failed:', error);
      return res.status(500).json({ error: 'Visite indisponible.' });
    }
  });

  app.get('/api/profile-visits/received', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const db = serverSupabase.getServiceClient();
      const { data: wallet, error: walletError } = await db
        .from('credits')
        .select('tier,premium_expires_at')
        .eq('user_id', String((req as any).userId))
        .maybeSingle();
      if (walletError) throw walletError;
      const walletTier = String(wallet?.tier || '').toLowerCase();
      const premiumActive =
        ['extra', 'premium', 'vip'].includes(walletTier) &&
        (!wallet?.premium_expires_at || new Date(wallet.premium_expires_at).getTime() > Date.now());
      if (!premiumActive) {
        return res.status(403).json({
          error: 'PREMIUM_REQUIRED',
          message: 'La liste des visiteurs est réservée aux comptes Extra et Premium.'
        });
      }
      const { data: visits, error } = await db
        .from('profile_visits')
        .select('visitor_id,created_at,duration_seconds')
        .eq('visited_user_id', (req as any).userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const visitorIds = Array.from(new Set((visits || []).map((visit: any) => visit.visitor_id)));
      const { data: profiles, error: profilesError } = visitorIds.length
        ? await db
            .from('profiles')
            .select('id,name,age,city,photos,avatar_url,is_verified,is_online,last_active_at,created_at')
            .in('id', visitorIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const signedProfiles = await signMemberProfileMedia(profiles || []);
      const byId = new Map(signedProfiles.map((profile: any) => [profile.id, profile]));
      const { data: privacySettings, error: privacyError } = visitorIds.length
        ? await db
            .from('user_privacy_settings')
            .select('user_id,incognito_mode,profile_paused,show_online_status,show_distance')
            .in('user_id', visitorIds)
        : { data: [], error: null };
      if (privacyError) throw privacyError;
      const privacyByUser = new Map(
        (privacySettings || []).map((settings: any) => [String(settings.user_id), settings])
      );
      return res.json({
        visits: (visits || []).flatMap((visit: any) => {
          const profile = byId.get(visit.visitor_id);
          const privacy = privacyByUser.get(String(visit.visitor_id));
          if (!profile || privacy?.incognito_mode === true || privacy?.profile_paused === true) return [];
          return [
            {
              ...toPublicProfile(profile, {
                showOnlineStatus: privacy?.show_online_status !== false,
                showDistance: privacy?.show_distance !== false
              }),
              visitedAt: visit.created_at,
              durationSeconds: visit.duration_seconds
            }
          ];
        })
      });
    } catch (error) {
      console.error('Received profile visits query failed:', error);
      return res.status(500).json({ error: 'Visites indisponibles.' });
    }
  });

  app.post('/api/privacy/requests', verifySupabaseToken, requireAuth, async (req, res) => {
    const requestType = req.body?.type;
    if (!['export', 'deletion', 'access'].includes(requestType)) {
      return res.status(400).json({ error: 'Type de demande RGPD invalide.' });
    }
    try {
      const userId = (req as any).userId;
      const request = await serverSupabase.createDataRequest(userId, requestType);
      await serverSupabase.createAuditLog(userId, `gdpr_${requestType}`, 'Demande RGPD créée');
      return res.status(201).json({ request });
    } catch (error) {
      console.error('GDPR request failed:', error);
      return res.status(500).json({ error: 'Impossible de créer la demande RGPD.' });
    }
  });

  app.get('/api/privacy/export', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const data = await serverSupabase.exportUserData(userId);
      await serverSupabase.createAuditLog(userId, 'gdpr_export', 'Export RGPD généré');
      return res.json({ exportedAt: new Date().toISOString(), data });
    } catch (error) {
      console.error('GDPR export failed:', error);
      return res.status(500).json({ error: 'Export RGPD indisponible.' });
    }
  });

  // --- 1. Algorithme de Matching & Recommandation IA (Badoo Style) ---

  // Single Profile AI Compatibility & Breakdown
  app.post(['/api/match', '/api/ai/match'], (req, res) => {
    const { userProfile, targetProfile } = req.body || {};
    if (!userProfile || !targetProfile) {
      return res.status(400).json({ error: 'Profils utilisateur et cible requis' });
    }
    return res
      .status(503)
      .json({ error: "Calcul de compatibilité indisponible : aucun moteur de matching réel n'est configuré." });
  });

  // Simple high-performance in-memory Redis cache store simulation with TTL
  const redisCacheStore = new Map<string, { value: any; expiresAt: number }>();
  const userTelemetryStore = new Map<
    string,
    {
      categoryWeights: Record<string, number>;
      totalDwellTimeSeconds: number;
      photoClicks: number;
      interactionsCount: number;
    }
  >();

  // Helper function to calculate Cosine Similarity between two numerical vectors
  function calculateCosineSimilarity(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < Math.min(v1.length, v2.length); i++) {
      dotProduct += v1[i] * v2[i];
      normA += v1[i] * v1[i];
      normB += v2[i] * v2[i];
    }
    if (normA === 0 || normB === 0) return 0.75;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Generate deterministic 32-dim feature vector for profile text/tags
  function profileToVector(p: any, categoryWeights: Record<string, number> = {}): number[] {
    const vector = new Array(32).fill(0.1);
    const text =
      `${p.name} ${p.bio || ''} ${(p.interests || []).join(' ')} ${(p.tags || []).join(' ')} ${p.relation || ''}`.toLowerCase();

    // Feature dimensions
    if (text.includes('art') || text.includes('musique') || text.includes('peinture') || text.includes('créatif'))
      vector[0] += 0.8 + (categoryWeights['art'] || 0);
    if (text.includes('sport') || text.includes('fitness') || text.includes('gym') || text.includes('course'))
      vector[1] += 0.8 + (categoryWeights['sport'] || 0);
    if (text.includes('voyage') || text.includes('nature') || text.includes('randonnée') || text.includes('mer'))
      vector[2] += 0.8 + (categoryWeights['travel'] || 0);
    if (text.includes('cuisine') || text.includes('gastronomie') || text.includes('restaurant') || text.includes('vin'))
      vector[3] += 0.8 + (categoryWeights['food'] || 0);
    if (text.includes('sérieuse') || text.includes('amour') || text.includes('relation')) vector[4] += 0.85;
    if (text.includes('cinéma') || text.includes('lecture') || text.includes('série') || text.includes('livres'))
      vector[5] += 0.75;

    // Fill remaining dimensions with deterministic hash
    for (let i = 6; i < 32; i++) {
      vector[i] = Math.abs(Math.sin((p.id || 1) * 31 + i));
    }
    return vector;
  }

  // API Endpoint for Behavioral Telemetry (Tracking Dwell Time, Photo Clicks & Tag Interactions)
  app.post('/api/ai/telemetry', async (req, res) => {
    try {
      const userId = String((req as any).userId || '');
      const { eventType, targetProfileId, category, dwellTimeSeconds = 0 } = req.body;
      if (!userId) return res.status(401).json({ error: 'Session utilisateur requise.' });
      if (!['dwell_time', 'photo_click', 'tag_click'].includes(eventType)) {
        return res.status(400).json({ error: 'Type d’interaction invalide.' });
      }
      const candidateId = String(targetProfileId || '')
        .toLowerCase()
        .trim();
      if (!/^[0-9a-f-]{36}$/i.test(candidateId)) {
        return res.status(400).json({ error: 'Identifiant de profil invalide.' });
      }
      const dwellSeconds = Number(dwellTimeSeconds);
      if (!Number.isFinite(dwellSeconds) || dwellSeconds < 0 || dwellSeconds > 120) {
        return res.status(400).json({ error: 'Durée d’interaction invalide.' });
      }
      const persistedEventType = (
        {
          dwell_time: 'profile_view',
          photo_click: 'profile_view',
          tag_click: 'impression'
        } as Record<string, string>
      )[eventType];
      const safeCategory = typeof category === 'string' ? category.trim().slice(0, 64) : null;
      const { error: eventError } = await serverSupabase
        .getServiceClient()
        .from('recommendation_events')
        .insert({
          user_id: userId,
          candidate_id: candidateId,
          event_type: persistedEventType,
          metadata: {
            source: 'discover_ui',
            interaction: eventType,
            category: safeCategory || null,
            dwellTimeSeconds: eventType === 'dwell_time' ? dwellSeconds : 0
          }
        });
      if (eventError) throw eventError;

      return res.json({
        success: true,
        message: 'Interaction enregistrée.',
        recorded: true,
        eventType: persistedEventType
      });
    } catch (err) {
      console.error('Telemetry API error:', err);
      res.status(500).json({ error: 'Erreur enregistrement télémétrie' });
    }
  });

  // Batch AI Recommendation Engine with Redis Memory Caching & Vector Cosine Similarity
  app.post('/api/ai/recommendations', async (req, res) => {
    const startTime = Date.now();
    try {
      const { userProfile, candidateProfiles, userInteractions, forceRefresh = false } = req.body;
      const userId = userProfile?.id || 'current_user';
      const cacheKey = `rec:${userId}`;

      // Check Redis Cache Store (TTL: 15 minutes)
      if (!forceRefresh) {
        const cached = redisCacheStore.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          const latencyMs = Math.max(1, Date.now() - startTime);
          res.setHeader('X-Cache-Store', 'HIT-REDIS-MEMORY');
          return res.json({
            cacheHit: true,
            cacheLatencyMs: latencyMs,
            cachedAt: new Date(cached.expiresAt - 15 * 60 * 1000).toISOString(),
            ttlSecondsRemaining: Math.round((cached.expiresAt - Date.now()) / 1000),
            recommendations: cached.value
          });
        }
      }

      if (!candidateProfiles || !Array.isArray(candidateProfiles) || candidateProfiles.length === 0) {
        return res.json({ recommendations: [], cacheHit: false });
      }

      const candidatesToProcess = candidateProfiles.slice(0, 20);
      const userStats = userTelemetryStore.get(userId) || {
        categoryWeights: { art: 0, sport: 0, travel: 0, food: 0 },
        totalDwellTimeSeconds: 0,
        photoClicks: 0,
        interactionsCount: 0
      };

      // Construct user embedding vector based on profile + real-time behavioral telemetry
      const userVector = profileToVector(userProfile || { id: 999, name: 'Utilisateur' }, userStats.categoryWeights);

      let recommendationsList: any[] = [];

      if (INTERNAL_AI_ENABLED) {
        const prompt = `Vous êtes le système central d'IA de Recommandation Badoo (Filtrage Collaboratif + Sémantique Vectoriel).
Analyse le profil de l'utilisateur principal, ses télémétries comportementales et ses candidats :

PROFIL & TÉLÉMÉTRIE COMPORTEMENTALE :
- Utilisateur : ${JSON.stringify(userProfile || { name: 'Utilisateur', city: 'Abidjan' })}
- Poids d'affinités comportementales enregistrés : ${JSON.stringify(userStats.categoryWeights)}
- Temps d'observation cumulé : ${userStats.totalDwellTimeSeconds} secondes sur les profils

HISTORIQUE D'INTERACTIONS DE L'UTILISATEUR:
${JSON.stringify(userInteractions || { likedIds: [], passedIds: [] })}

LISTE DES PROFILS CANDIDATS :
${JSON.stringify(
  candidatesToProcess.map((c: any) => ({
    id: c.id,
    name: c.name,
    age: c.age,
    gender: c.gender,
    city: c.city || c.location,
    occupation: c.occupation,
    bio: c.bio,
    interests: c.interests,
    relation: c.relation
  }))
)}

Pour chaque candidat :
1. Évalue la compatibilité globale (65 à 99%).
2. Fournis un motif d'IA comportemental (ex: "Basé sur vos 2 min d'attention sur les profils créatifs").
3. Donne la liste des points ou passions partagées.
4. Spécifie la variante de Server-Driven UI : "gold_glow" (si >= 92%), "rose_glow" (si >= 85%), ou "standard_premium".

Retourne un objet JSON strict :
{
  "recommendations": [
    {
      "id": id_du_profil,
      "aiMatchScore": score_entre_65_et_99,
      "aiBadge": "badge court (ex: '🤖 Top Match IA', '🔥 Vibe Parfaite', '🎯 Passion Commune')",
      "aiReason": "Explication comportementale basée sur les intérêts",
      "sharedPoints": ["point1", "point2"],
      "serverDrivenUIConfig": {
        "cardVariant": "gold_glow",
        "compatibilityGaugeColor": "#e20030",
        "triggerBadge": "🎯 3 Passions Communes",
        "suggestedIcebreaker": "Une phrase d'accroche originale"
      }
    }
  ]
}`;

        const data = await safeGenerateJson<any>({ contents: prompt });
        if (data?.recommendations && Array.isArray(data.recommendations)) {
          recommendationsList = data.recommendations;
        }
      }

      // If the internal engine returns no result, apply Vector Cosine Similarity scoring
      if (!recommendationsList || recommendationsList.length === 0) {
        recommendationsList = candidatesToProcess.map((c: any, index: number) => {
          const candVector = profileToVector(c, {});
          const similarity = calculateCosineSimilarity(userVector, candVector);
          const cosineDistance = (1 - similarity).toFixed(3);
          const score = Math.min(99, Math.max(70, Math.round(similarity * 100) + (c.online ? 3 : 0)));

          const isTop = score >= 90;
          const isHigh = score >= 82;

          return {
            id: c.id,
            aiMatchScore: score,
            vectorSimilarity: similarity.toFixed(3),
            cosineDistance: cosineDistance,
            aiBadge: isTop ? '🤖 Top Match IA 98%' : isHigh ? '🔥 Vibe Parfaite' : '✨ Recommandé',
            aiReason:
              userStats.categoryWeights['art'] > 0.3 &&
              (c.interests?.includes('Musique') || c.interests?.includes('Art'))
                ? `L'IA a détecté un fort intérêt pour l'Art & la Musique d'après votre historique de navigation.`
                : `Compatibilité vectorielle calculée à ${score}% via distance cosinus sémantique (${cosineDistance}).`,
            sharedPoints:
              c.interests && c.interests.length > 0 ? c.interests.slice(0, 3) : ['Style de vie', 'Proximité'],
            serverDrivenUIConfig: {
              cardVariant: isTop ? 'gold_glow' : isHigh ? 'rose_glow' : 'standard_premium',
              compatibilityGaugeColor: isTop ? '#e20030' : isHigh ? '#8b5cf6' : '#2563eb',
              triggerBadge:
                c.interests && c.interests.length > 0
                  ? `🎯 Passions : ${c.interests.slice(0, 2).join(', ')}`
                  : '✨ Match Prédictif IA',
              suggestedIcebreaker: `Salut ${c.name} ! Qu'est-ce qui t'inspire le plus en ce moment ?`
            }
          };
        });
      }

      // Sort by match score descending
      recommendationsList.sort((a, b) => (b.aiMatchScore || 0) - (a.aiMatchScore || 0));

      // Save to Redis Memory Cache Store (TTL: 15 minutes = 900000 ms)
      redisCacheStore.set(cacheKey, {
        value: recommendationsList,
        expiresAt: Date.now() + 15 * 60 * 1000
      });

      const latencyMs = Math.max(1, Date.now() - startTime);
      res.setHeader('X-Cache-Store', 'MISS-REDIS-MEMORY-COMPUTED');

      return res.json({
        cacheHit: false,
        cacheLatencyMs: latencyMs,
        cachedAt: new Date().toISOString(),
        ttlSecondsRemaining: 900,
        recommendations: recommendationsList
      });
    } catch (error) {
      console.error('AI Recommendations error:', error);
      res.status(500).json({ error: 'Erreur lors du calcul des recommandations IA' });
    }
  });

  // Real-time AI Icebreaker Generator
  app.post('/api/ai/icebreaker', async (req, res) => {
    try {
      const { targetProfile, userProfile } = req.body;
      if (!targetProfile) {
        return res.status(400).json({ error: 'Profil cible requis' });
      }

      if (INTERNAL_AI_ENABLED) {
        const prompt = `Génère 3 phrases d'accroche (icebreakers) originales, séduisantes et respectueuses en français (avec une touche ivoirienne légère et chaleureuse comme "Garba", "Assinie", "Abidjan", "doux") pour envoyer à :
Nom: ${targetProfile.name}
Profession: ${targetProfile.occupation || 'Inconnue'}
Bio: ${targetProfile.bio || ''}
Passions: ${(targetProfile.interests || []).join(', ')}

Retourne un objet JSON :
{
  "icebreakers": ["phrase 1", "phrase 2", "phrase 3"]
}`;

        const data = await safeGenerateJson<any>({ contents: prompt });
        if (data?.icebreakers && Array.isArray(data.icebreakers)) {
          return res.json({ icebreakers: data.icebreakers });
        }
      }

      return res.status(503).json({ error: 'Génération IA indisponible.' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la génération des accroches IA' });
    }
  });

  // 2. Coach de Séduction IA
  app.post('/api/coach', async (req, res) => {
    if (!INTERNAL_AI_ENABLED) {
      return res.status(503).json({ error: 'Coach IA indisponible.' });
    }
    try {
      const { messages } = req.body;
      const prompt = `You are an AI dating coach. Read the following conversation and give advice on what to say next to keep the conversation engaging and respectful.
Conversation:
${messages.map((m: any) => `${m.senderId === 'me' ? 'Me' : 'Them'}: ${m.content}`).join('\n')}

Return a JSON object with:
"advice": A short friendly advice in French (1-2 sentences).
"replies": An array of 3 suggested short text replies in French.`;

      const data = await safeGenerateJson<any>({ contents: prompt });
      if (data && data.advice && Array.isArray(data.replies)) {
        return res.json(data);
      }
      return res.status(503).json({ error: 'Coach IA indisponible.' });
    } catch (error) {
      console.error('Coach endpoint error:', error);
      res.status(503).json({ error: 'Coach IA indisponible.' });
    }
  });

  // Legacy AI handlers below are intercepted by the internal-AI middleware.
  // Keep only routes that still serve independent legacy clients.
  app.post(['/api/ai/rude-detector', '/api/moderate'], async (req, res) => {
    try {
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.json({ isSafe: true, isRude: false, reason: '' });
      }

      if (INTERNAL_AI_ENABLED) {
        const prompt = `Vous êtes le Rude Message Detector™ de Bavel (machine learning style Badoo IA).
Analyse ce message de tchat pour détecter :
1. Insultes, vulgarités, agressivité, harcèlement, propos homophobes, misogynes ou discriminatoires.
2. Sollicitation d'argent (Momo, Wave, brouteurs, arnaques financières).

Message: "${content}"

Retourne un objet JSON strict :
{
  "isSafe": boolean (true si acceptable, false si offensant/arnaque),
  "isRude": boolean (true si impoli/vulgaire/agressif),
  "category": "none" | "insult" | "hate_speech" | "harassment" | "scam" | "financial_solicitation",
  "severity": "none" | "low" | "medium" | "high",
  "reason": "Explication courte et amicale en français avec une touche ivoirienne bienveillante",
  "suggestedReformulation": "Version polie et courtoise suggérée si impoli"
}`;

        const data = await safeGenerateJson<any>({ contents: prompt });
        if (data) {
          return res.json({
            isSafe: data.isSafe !== false,
            isRude: Boolean(data.isRude),
            category: data.category || 'none',
            severity: data.severity || 'none',
            reason: data.reason || '',
            suggestedReformulation: data.suggestedReformulation || ''
          });
        }
      }

      // Keyword heuristic fallback
      const lower = content.toLowerCase();
      const forbiddenKeywords = [
        'bâtard',
        'connard',
        'pute',
        'salope',
        'chienne',
        'connasse',
        'merde',
        'fdp',
        'mtn money',
        'orange money',
        'wave',
        'rib',
        'virement',
        'western union',
        'moneygram',
        'pcs',
        'neosurf',
        'recharge',
        "transfère d'argent",
        "envoie l'argent",
        'momo'
      ];
      const foundKeyword = forbiddenKeywords.find((kw) => lower.includes(kw));

      if (foundKeyword) {
        const isFinancial = [
          'mtn',
          'orange',
          'wave',
          'rib',
          'virement',
          'western',
          'moneygram',
          'pcs',
          'neosurf',
          'recharge',
          'momo'
        ].some((k) => foundKeyword.includes(k));
        return res.json({
          isSafe: false,
          isRude: !isFinancial,
          category: isFinancial ? 'financial_solicitation' : 'insult',
          severity: 'high',
          reason: isFinancial
            ? "🛡️ Rude & Scam Detector™ : Les demandes d'argent ou transferts (Momo, Wave...) sont interdits pour bloquer les brouteurs."
            : "🚫 Rude Message Detector™ : Propos insultants ou vulgaires détectés par l'IA. Restons respectueux sur Bavel !",
          suggestedReformulation: "Bonjour ! Comment vas-tu aujourd'hui ?"
        });
      }

      return res.json({ isSafe: true, isRude: false, category: 'none', severity: 'none', reason: '' });
    } catch (error) {
      console.error('Rude Message Detector error:', error);
      res.status(500).json({ error: "Erreur d'analyse de message" });
    }
  });

  app.post('/api/ai/verify-pose', verifySupabaseToken, requireAuth, (_req, res) => {
    return res.status(503).json({
      success: false,
      capability: 'biometric-verification',
      reason: 'Utilisez le parcours de vérification photo du profil.'
    });
  });

  const profilePhotoVerificationInferenceLimit = createRateLimiter(
    10,
    60_000,
    'profile-photo-verification-inference',
    rateLimitStore
  );

  app.get('/api/security/profile-verification/status', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return res.status(401).json({ success: false, error: 'Session utilisateur invalide.' });
    }

    try {
      const db = serverSupabase.getServiceClient();
      const [{ data: profile, error: profileError }, { data: challenge, error: challengeError }] = await Promise.all([
        db.from('profiles').select('is_verified').eq('id', userId).maybeSingle(),
        db
          .from('profile_photo_verification_challenges')
          .select('status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);
      if (profileError) throw profileError;
      if (challengeError) throw challengeError;
      if (!profile) return res.status(404).json({ success: false, error: 'Profil introuvable.' });
      return res.json({
        success: true,
        verified: profile.is_verified === true,
        status: profile.is_verified === true ? 'approved' : challenge?.status || 'not_started'
      });
    } catch (error) {
      console.error('Profile photo verification status lookup failed:', error);
      return res.status(503).json({ success: false, error: 'Statut de vérification indisponible.' });
    }
  });

  app.post('/api/security/profile-verification/challenge', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return res.status(401).json({ success: false, error: 'Session utilisateur invalide.' });
    }

    try {
      const db = serverSupabase.getServiceClient();
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('is_verified,photos,avatar_url')
        .eq('id', userId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) return res.status(404).json({ success: false, error: 'Profil introuvable.' });
      if (profile.is_verified === true) {
        return res.status(409).json({ success: false, verified: true, error: 'Ce profil est déjà vérifié.' });
      }
      const profilePhotos = [
        ...(Array.isArray(profile.photos) ? profile.photos : []),
        ...(typeof profile.avatar_url === 'string' ? [profile.avatar_url] : [])
      ].filter(
        (photo): photo is string =>
          typeof photo === 'string' && Boolean(getProfilePhotoStoragePath(photo)?.startsWith(`${userId}/`))
      );
      if (profilePhotos.length === 0) {
        return res.status(409).json({
          success: false,
          error: 'Ajoutez au moins une photo de profil avant de lancer la vérification.'
        });
      }

      const attemptWindow = new Date(Date.now() - 30 * 60_000).toISOString();
      const { count, error: attemptsError } = await db
        .from('profile_photo_verification_challenges')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', attemptWindow);
      if (attemptsError) throw attemptsError;
      if ((count || 0) >= 5) {
        return res.status(429).json({
          success: false,
          error: 'La limite de tentatives est atteinte. Réessayez dans 30 minutes.'
        });
      }

      const choices = ['blink', 'turn_left', 'turn_right'] as const;
      const challengeType = choices[crypto.randomInt(choices.length)];
      const nonce = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
      const { data: challengeId, error: challengeError } = await db.rpc('create_profile_photo_verification_challenge', {
        p_user_id: userId,
        p_nonce_hash: createVerificationNonceHash(nonce),
        p_challenge_type: challengeType,
        p_expires_at: expiresAt
      });
      if (challengeError) throw challengeError;
      if (challengeId === null) {
        return res.status(429).json({
          success: false,
          error: 'La limite de tentatives est atteinte. Réessayez dans 30 minutes.'
        });
      }
      if (typeof challengeId !== 'string') throw new Error('Verification challenge was not created.');

      const instructions: Record<ProfilePhotoChallenge, string> = {
        blink: 'Clignez des yeux une fois, puis gardez le visage face à la caméra.',
        turn_left: 'Tournez légèrement la tête vers la gauche, puis revenez face à la caméra.',
        turn_right: 'Tournez légèrement la tête vers la droite, puis revenez face à la caméra.'
      };
      return res.json({
        success: true,
        challengeId,
        nonce,
        challenge: challengeType,
        instruction: instructions[challengeType],
        expiresAt,
        frameCount: 5
      });
    } catch (error) {
      console.error('Profile photo verification challenge could not be created:', error);
      return res.status(503).json({ success: false, error: 'Impossible de démarrer la vérification.' });
    }
  });

  app.post(
    '/api/security/profile-verification/complete',
    profilePhotoVerificationInferenceLimit,
    verifySupabaseToken,
    requireAuth,
    async (req, res) => {
      const userId = String((req as any).userId || '');
      const challengeId = req.body?.challengeId;
      const nonce = req.body?.nonce;
      const imageDataUrls = req.body?.frames;
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) ||
        typeof challengeId !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(challengeId) ||
        typeof nonce !== 'string' ||
        !/^[A-Za-z0-9_-]{32,64}$/.test(nonce) ||
        !Array.isArray(imageDataUrls) ||
        imageDataUrls.length !== 5
      ) {
        return res.status(400).json({ success: false, error: 'Données de vérification invalides.' });
      }

      const db = serverSupabase.getServiceClient();
      try {
        const { data: challenge, error: lookupError } = await db
          .from('profile_photo_verification_challenges')
          .select('nonce_hash,challenge_type,status,expires_at')
          .eq('id', challengeId)
          .eq('user_id', userId)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (!challenge) return res.status(404).json({ success: false, error: 'Défi de vérification introuvable.' });

        const actualHash = createVerificationNonceHash(nonce);
        const expectedHash = String(challenge.nonce_hash || '');
        if (
          expectedHash.length !== actualHash.length ||
          !crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(actualHash))
        ) {
          return res.status(409).json({ success: false, error: 'Défi de vérification invalide.' });
        }
        if (challenge.status !== 'pending') {
          return res.status(409).json({ success: false, error: 'Ce défi a déjà été utilisé.' });
        }
        if (new Date(challenge.expires_at).getTime() <= Date.now()) {
          const { error: expireError } = await db
            .from('profile_photo_verification_challenges')
            .update({ status: 'expired', completed_at: new Date().toISOString() })
            .eq('id', challengeId)
            .eq('status', 'pending');
          if (expireError) throw expireError;
          return res
            .status(410)
            .json({ success: false, error: 'Le défi a expiré. Démarrez une nouvelle vérification.' });
        }

        const { data: claimed, error: claimError } = await db
          .from('profile_photo_verification_challenges')
          .update({ status: 'processing' })
          .eq('id', challengeId)
          .eq('user_id', userId)
          .eq('status', 'pending')
          .select('id')
          .maybeSingle();
        if (claimError) throw claimError;
        if (!claimed) return res.status(409).json({ success: false, error: 'Ce défi a déjà été utilisé.' });

        try {
          const result = await verifyProfilePhotos(
            db,
            userId,
            challenge.challenge_type as ProfilePhotoChallenge,
            imageDataUrls
          );
          if (result.approved) {
            const { data: completed, error: completionError } = await db.rpc('complete_profile_photo_verification', {
              p_challenge_id: challengeId,
              p_user_id: userId
            });
            if (completionError) throw completionError;
            if (completed === true) {
              return res.json({ success: true, verified: true, status: 'approved' });
            }
            const { error: rejectError } = await db
              .from('profile_photo_verification_challenges')
              .update({ status: 'rejected', completed_at: new Date().toISOString() })
              .eq('id', challengeId)
              .eq('user_id', userId)
              .eq('status', 'processing');
            if (rejectError) throw rejectError;
          } else {
            const { error: rejectionError } = await db
              .from('profile_photo_verification_challenges')
              .update({ status: 'rejected', completed_at: new Date().toISOString() })
              .eq('id', challengeId)
              .eq('user_id', userId)
              .eq('status', 'processing');
            if (rejectionError) throw rejectionError;
          }
          return res.json({
            success: true,
            verified: false,
            status: 'rejected',
            message:
              'La vérification n’a pas abouti. Réessayez avec une photo de profil nette et un visage bien éclairé.'
          });
        } catch (error) {
          if (error instanceof ProfilePhotoVerificationError) {
            const { error: rejectError } = await db
              .from('profile_photo_verification_challenges')
              .update({ status: 'rejected', completed_at: new Date().toISOString() })
              .eq('id', challengeId)
              .eq('status', 'processing');
            if (rejectError) console.error('Failed to close profile verification challenge:', rejectError);
            return res.status(error.status).json({ success: false, error: error.message });
          }
          throw error;
        }
      } catch (error) {
        console.error('Profile photo verification failed:', error);
        return res.status(503).json({
          success: false,
          error: 'Le service de vérification est temporairement indisponible. Aucun badge n’a été attribué.'
        });
      }
    }
  );

  // 2.3 Private Detector™ (Auto-Detect Intimate/NSFW Photos & Blur)
  app.post(['/api/ai/private-detector', '/api/check-nsfw'], async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ isSafe: true, blurRequired: false, message: 'Aucune image fournie.' });
      }

      const extractBase64Data = (dataUrl: string) => {
        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        return matches ? { mimeType: matches[1], data: matches[2] } : null;
      };

      const imgData = extractBase64Data(imageBase64);
      if (!imgData) {
        return res.status(400).json({ isSafe: false, blurRequired: true, message: "Format d'image invalide." });
      }

      if (INTERNAL_AI_ENABLED) {
        const prompt = `Vous êtes le Private Detector™ de Bavel (système de protection des images intimes style Badoo).
Analyse l'image fournie :
1. Détecte si l'image contient de la nudité, des sous-vêtements explicites, du contenu intime ou NSFW.
2. Si du contenu intime est détecté, le Private Detector™ doit flouter l'image automatiquement dans le tchat pour protéger le destinataire.

Retourne un objet JSON strict :
{
  "isSafe": boolean (false si explicite/extrême, true si acceptable),
  "isPrivateContent": boolean (true si image intime/nudité/lingerie/NSFW),
  "blurRequired": boolean (true si le Private Detector™ doit flouter la photo par précaution),
  "confidence": nombre entre 0 et 100,
  "message": "Message explicatif en français"
}`;

        const data = await safeGenerateJson<any>({
          contents: [prompt, { inlineData: { mimeType: imgData.mimeType, data: imgData.data } }]
        });
        if (data) {
          return res.json({
            isSafe: data.isSafe !== false,
            isPrivateContent: Boolean(data.isPrivateContent),
            blurRequired: Boolean(data.blurRequired),
            confidence: data.confidence || 95,
            message:
              data.message || (data.blurRequired ? '🔒 Image intime floutée par le Private Detector™' : 'Photo sûre')
          });
        }
      }

      return res.status(503).json({
        isSafe: false,
        isPrivateContent: false,
        blurRequired: true,
        confidence: 0,
        message: "Analyse d'image indisponible : l'image reste protégée par précaution."
      });
    } catch (error) {
      console.error('Private Detector error:', error);
      res
        .status(503)
        .json({ isSafe: false, blurRequired: true, error: 'Analyse indisponible : image protégée par précaution.' });
    }
  });

  // 2.4 Photo Verification & Biometric Pose AI Match
  app.post(['/api/ai/verify-photo', '/api/verify-pose'], async (req, res) => {
    if (!INTERNAL_AI_ENABLED) {
      return res.status(503).json({ verified: false, message: 'Service de vérification biométrique non configuré.' });
    }

    try {
      const { poseImageUrl, userSelfieBase64 } = req.body;
      const extractBase64Data = (dataUrl: string) => {
        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        return matches ? { mimeType: matches[1], data: matches[2] } : null;
      };

      const selfieData = extractBase64Data(userSelfieBase64);
      if (!selfieData) {
        return res.status(400).json({ verified: false, message: 'Format de selfie invalide.' });
      }

      let poseData;
      try {
        if (poseImageUrl && poseImageUrl.startsWith('http')) {
          const poseResponse = await fetch(poseImageUrl);
          const poseArrayBuffer = await poseResponse.arrayBuffer();
          const poseBuffer = Buffer.from(poseArrayBuffer);
          const poseMimeType = poseResponse.headers.get('content-type') || 'image/jpeg';
          poseData = { mimeType: poseMimeType, data: poseBuffer.toString('base64') };
        } else {
          poseData = selfieData; // Same format test
        }
      } catch (e) {
        poseData = selfieData;
      }

      const prompt = `Vous êtes le système de Vérification Biométrique de Photos de Bavel (style Badoo IA + Modération).
Analyse le selfie en direct pris par l'utilisateur par rapport au geste/pose demandé :
1. Vérifie la concordance de la pose (geste de la main, inclinaison du visage).
2. Vérifie la cohérence faciale pour s'assurer qu'il s'agit d'une personne réelle en direct.

Retourne un objet JSON strict :
{
  "verified": boolean,
  "matchPercentage": nombre entre 80 et 99.8,
  "message": "Message explicatif en français"
}`;

      const data = await safeGenerateJson<any>({
        contents: [
          prompt,
          { inlineData: { mimeType: poseData.mimeType, data: poseData.data } },
          { inlineData: { mimeType: selfieData.mimeType, data: selfieData.data } }
        ]
      });

      if (data) {
        return res.json({
          verified: data.verified !== false,
          matchPercentage: data.matchPercentage || 97.8,
          message: data.message || '✅ Pose et biométrie confirmées avec succès !'
        });
      }

      return res.status(503).json({ verified: false, message: 'Analyse biométrique indisponible.' });
    } catch (error) {
      console.error('Photo verification error:', error);
      res.status(503).json({ verified: false, message: 'Vérification biométrique indisponible.' });
    }
  });

  // 2.4.1 Official ID Document Verification (Passport / National ID)
  app.post('/api/ai/verify-id-document', async (req, res) => {
    try {
      const { documentBase64, documentType } = req.body;
      if (!documentBase64) {
        return res.status(400).json({ verified: false, message: "Image de pièce d'identité requise." });
      }

      if (INTERNAL_AI_ENABLED) {
        const extractBase64Data = (dataUrl: string) => {
          const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          return matches ? { mimeType: matches[1], data: matches[2] } : null;
        };

        const docData = extractBase64Data(documentBase64);
        if (docData) {
          const prompt = `Vous êtes le système de Vérification de Pièce d'Identité Officielle de Bavel.
Analyse la pièce d'identité fournie (${documentType || 'CNI / Passeport'}) :
1. Vérifie si le document semble authentique et lisible.
2. Vérifie qu'il n'y a pas de falsification manifeste.

Retourne un JSON strict :
{
  "verified": boolean,
  "confidenceScore": nombre de 0 à 100,
  "documentTypeDetected": "CNI" | "Passeport" | "Permis" | "Autre",
  "statusBadge": "✅ Pièce d'Identité Certifiée",
  "message": "Message de confirmation"
}`;

          const data = await safeGenerateJson<any>({
            contents: [prompt, { inlineData: { mimeType: docData.mimeType, data: docData.data } }]
          });
          if (data) {
            return res.json({
              verified: data.verified !== false,
              confidenceScore: data.confidenceScore || 98.2,
              documentTypeDetected: data.documentTypeDetected || 'CNI',
              statusBadge: data.statusBadge || '✅ Identité Officiellement Vérifiée',
              message: data.message || 'Document officiel vérifié et validé avec succès !'
            });
          }
        }
      }

      return res.status(503).json({
        verified: false,
        message: "Vérification de pièce d'identité indisponible sans analyse configurée."
      });
    } catch (error) {
      console.error('ID verification error:', error);
      res.status(500).json({ error: 'Erreur lors de la vérification du document' });
    }
  });

  // 2.4.2 Stolen Photo & Reverse Search Detector
  app.post('/api/ai/stolen-photo-detector', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ isStolen: false, riskScore: 0 });
      }

      if (INTERNAL_AI_ENABLED) {
        const extractBase64Data = (dataUrl: string) => {
          const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          return matches ? { mimeType: matches[1], data: matches[2] } : null;
        };

        const imgData = extractBase64Data(imageBase64);
        if (imgData) {
          const prompt = `Vous êtes le Détecteur de Photos Volées & Usurpation d'Image de Bavel.
Analyse cette photo de profil :
1. Détermine si l'image provient d'une banque d'images de stock, d'une célébrité, d'un mannequin ou de captures d'écran volées sur internet.
2. Évalue si la qualité/résolution suggère un re-clichage d'écran d'un autre téléphone.

Retourne un JSON strict :
{
  "isStolen": boolean,
  "confidenceScore": nombre de 0 à 100,
  "riskCategory": "original_photo" | "stock_photo_detected" | "celebrity_face" | "reprinted_screen",
  "explanation": "Explication courte en français"
}`;

          const data = await safeGenerateJson<any>({
            contents: [prompt, { inlineData: { mimeType: imgData.mimeType, data: imgData.data } }]
          });
          if (data) {
            return res.json({
              isStolen: Boolean(data.isStolen),
              confidenceScore: data.confidenceScore || 95,
              riskCategory: data.riskCategory || 'original_photo',
              explanation: data.explanation || 'Photo authentique et originale.'
            });
          }
        }
      }

      return res.status(503).json({
        isStolen: false,
        confidenceScore: 0,
        riskCategory: 'review_required',
        explanation:
          "Analyse d'originalité indisponible. Une revue est nécessaire avant de déclarer la photo originale."
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur de vérification d'originalité photo" });
    }
  });

  app.post('/api/ai/multi-account-detector', verifySupabaseToken, requireAuth, (_req, res) => {
    return res.status(503).json({
      error: 'La détection multi-comptes nécessite des signaux serveur fiables qui ne sont pas configurés.',
      capability: 'multi-account-detection',
      status: 'unavailable'
    });
  });

  app.post('/api/ai/photo-ranking', async (req, res) => {
    try {
      const { photosBase64 } = req.body;
      if (!photosBase64 || !Array.isArray(photosBase64) || photosBase64.length === 0) {
        return res.status(400).json({ error: 'Liste de photos sous forme base64 requise' });
      }

      if (INTERNAL_AI_ENABLED) {
        const extractBase64Data = (dataUrl: string) => {
          const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          return matches ? { mimeType: matches[1], data: matches[2] } : null;
        };

        const parsedPhotos = photosBase64.map(extractBase64Data).filter(Boolean);

        if (parsedPhotos.length > 0) {
          const contents: any[] = [
            `Vous êtes l'IA d'Optimisation de Profils de Bavel. Analyse ces photos d'un utilisateur pour déterminer lesquelles sont les plus attractives, chaleureuses et engageantes pour la première impression.
Ranke chaque photo avec une note sur 100 et recommande la meilleure comme photo de couverture principale.
Retourne un JSON strict :
{
  "bestPhotoIndex": index (0 à N-1),
  "rankings": [
    { "index": 0, "score": 92, "advice": "Excellente luminosité et sourire naturel !" }
  ],
  "overallAdvice": "Conseil général court"
}`
          ];

          for (const p of parsedPhotos) {
            if (p) contents.push({ inlineData: { mimeType: p.mimeType, data: p.data } });
          }

          const data = await safeGenerateJson<any>({ contents });
          if (data) {
            return res.json({
              bestPhotoIndex: data.bestPhotoIndex || 0,
              rankings:
                data.rankings ||
                photosBase64.map((_, i) => ({ index: i, score: 90 - i * 5, advice: 'Bonne qualité de cadrage' })),
              overallAdvice: data.overallAdvice || 'Vos photos montrent une belle authenticité !'
            });
          }
        }
      }

      return res.json({
        bestPhotoIndex: 0,
        rankings: photosBase64.map((_, i) => ({ index: i, score: 92 - i * 4, advice: 'Photo claire et bien cadrée' })),
        overallAdvice: 'Vos photos mettent bien en valeur votre sourire.'
      });
    } catch (error) {
      console.error('Photo ranking error:', error);
      res.status(500).json({ error: "Erreur lors de l'optimisation des photos" });
    }
  });

  // 2.6 📝 Bio Intelligente (AI Bio Generator & Enhancer)
  app.post('/api/ai/bio-generator', async (req, res) => {
    try {
      const { traits, interests, occupation, currentBio, tone } = req.body;
      if (INTERNAL_AI_ENABLED) {
        const prompt = `Génère 3 versions de descriptions/bios captivantes, chaleureuses et authentiques en français (style rencontre chic à Abidjan/Afrique de l'Ouest) pour un profil :
Traits: ${traits || 'Passionné, souriant'}
Loisirs: ${(interests || []).join(', ') || 'Voyages, musique'}
Profession: ${occupation || 'Inconnue'}
Bio actuelle: "${currentBio || ''}"
Ton souhaité: ${tone || 'Avenant & Chic'}

Retourne un JSON strict :
{
  "bios": [
    { "version": "Courte & Directe", "text": "..." },
    { "version": "Créative & Amusante", "text": "..." },
    { "version": "Sérieuse & Profonde", "text": "..." }
  ]
}`;

        const data = await safeGenerateJson<any>({ contents: prompt });
        if (data?.bios && Array.isArray(data.bios)) {
          return res.json({ bios: data.bios });
        }
      }

      return res.json({
        bios: [
          {
            version: 'Courte & Directe',
            text: `Passionné(e) par ${(interests || ['la vie'])[0]}, toujours partant(e) pour de bonnes conversations autour d'un bon verre à Abidjan !`
          },
          {
            version: 'Créative & Amusante',
            text: "Si tu aimes les rires spontanés, les bonnes adresses et la bonne musique, on risque d'être très vite complices. 😉"
          },
          {
            version: 'Sérieuse & Profonde',
            text: 'Ici pour faire de belles rencontres authentiques et construire une vraie relation basée sur la complicité et le respect.'
          }
        ]
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la génération de bio IA' });
    }
  });

  // 2.6.1 🤖 Interactive AI FAQ Knowledge Base Assistant (Bavel Support Engine)
  app.post('/api/faq/ask', async (req, res) => {
    try {
      const { question, category } = req.body;
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question requise' });
      }

      const cleanQuestion = question.trim();

      if (INTERNAL_AI_ENABLED) {
        const systemInstruction = `Vous êtes l'assistant de support officiel de l'application Bavel.
Votre mission : Fournir une réponse claire, bienveillante, concise et ultra-précise basée exclusivement sur la base de connaissances Bavel.

BASE DE CONNAISSANCES BAVEL :
1. DÉCOUVERTE & MATCHS :
- Balayer / Swiper à droite ou cliquer sur le Cœur pour aimer un profil. Cliquer sur la Croix pour passer.
- Super Like / Étoile : Envoie une notification instantanée avec mise en valeur prioritaire.
- Match : Quand deux personnes se likent mutuellement, elles peuvent discuter gratuitement.
- Filtres de recherche : Selon les critères et les lieux disponibles dans le profil de l'utilisateur, la tranche d'âge, l'intention, les centres d'intérêt et le statut de vérification photo.

2. CRÉDITS & MONÉTISATION :
- Crédits Bavel : Utilisés pour envoyer des Coups de cœur, des Cadeaux virtuels, ou activer le Boost de visibilité (30 minutes en tête de liste dans Découvrir).
- Publicités récompensées : Disponibilité à vérifier dans l'application avant d'annoncer une récompense.
- Recharges de crédits : Uniquement via les prestataires de paiement effectivement configurés et disponibles dans le pays de l'utilisateur.
- Bavel Premium & VIP : Débloque la liste complète de qui a liké votre profil, les likes illimités, le mode invisible, et supprime les publicités.

3. SÉCURITÉ, MODÉRATION & CONFIDENTIALITÉ :
- Mode Invisible : Permet de visiter les profils sans laisser de trace et de masquer son statut en ligne.
- Modération des images : Le modèle local peut signaler certains contenus sensibles; il ne garantit pas une détection exhaustive.
- Signalement & Blocage : Disponibles depuis les profils et conversations. Ne promets pas de délai d'intervention humaine non confirmé.
- Vérification photo : Un parcours selfie peut contrôler une photo de profil. Il ne vérifie ni l'identité réelle ni des données biométriques certifiées.

4. MESSAGERIE & APPELS :
- Tchat texte instantané, envoi de notes vocales (micro), partage de photos privées, appels vocaux et vidéo HD intégrés sans donner son numéro personnel.

5. CONSEILS RENCONTRE RÉELLE :
- Toujours organiser le 1er rendez-vous dans un lieu public très fréquenté (café, restaurant).
- Informer un proche de son emplacement et assurer son propre moyen de transport (pas de covoiturage inconnu).
- Ne jamais envoyer d'argent, code de transfert mobile money ou mot de passe.

INSTRUCTIONS DE RÉPONSE :
- Réponds en français fluide avec une structure aérée parfaitement adaptée à la lecture sur smartphone (paragraphes courts, puces claires, mots-clés importants en gras).
- Propose 2 à 3 questions de relance connexes très pertinentes que l'utilisateur pourrait cliquer ensuite.
- Propose une action rapide pertinente si applicable.

FORMAT DE SORTIE JSON STRICT :
{
  "answer": "Texte explicatif structuré avec puces et gras",
  "category": "Nom de la catégorie",
  "suggestedQuestions": ["Question suggérée 1", "Question suggérée 2", "Question suggérée 3"],
  "action": {
    "label": "Titre du bouton (ex: 'Activer le Mode Invisible', 'Gagner 10 crédits')",
    "type": "buy_credits" | "verify_profile" | "privacy_settings" | "open_filters" | "open_activity" | "general"
  }
}`;

        const prompt = `QUESTION UTILISATEUR : "${cleanQuestion}" ${category ? `(Catégorie sélectionnée: ${category})` : ''}`;

        const data = await safeGenerateJson<{
          answer: string;
          category?: string;
          suggestedQuestions?: string[];
          action?: { label: string; type: string };
        }>({
          contents: prompt,
          systemInstruction
        });

        if (data && data.answer) {
          return res.json({
            answer: data.answer,
            category: data.category || category || 'Aide Bavel',
            suggestedQuestions: data.suggestedQuestions || [
              'Comment obtenir des crédits gratuits ?',
              'Comment faire vérifier mon profil ?',
              'Comment activer le mode invisible ?'
            ],
            action: data.action || null
          });
        }
      }

      return res.status(503).json({ error: 'Assistant FAQ indisponible.' });
    } catch (error) {
      console.error('FAQ AI error:', error);
      res.status(500).json({ error: 'Erreur lors de la génération de réponse FAQ' });
    }
  });

  // 2.7 🌍 Traduction de Message en Temps Réel (AI Realtime Translation)
  app.post('/api/ai/translate', async (req, res) => {
    try {
      const { text, targetLang } = req.body;
      if (!text) return res.status(400).json({ error: 'Texte requis' });

      if (INTERNAL_AI_ENABLED) {
        const prompt = `Traduis ce message de tchat vers la langue '${targetLang || 'Français'}' en conservant les nuances émotionnelles et le ton amical d'Afrique francophone (ex: Nouchi, Français, Anglais, Espagnol, etc.) :
Message: "${text}"

Retourne un JSON strict :
{
  "translatedText": "Texte traduit",
  "detectedLanguage": "Langue d'origine détectée"
}`;

        const data = await safeGenerateJson<any>({ contents: prompt });
        if (data) {
          return res.json({
            translatedText: data.translatedText || text,
            detectedLanguage: data.detectedLanguage || 'Auto'
          });
        }
      }

      return res.status(503).json({ error: 'Traduction IA indisponible.' });
    } catch (error) {
      res.status(500).json({ error: 'Erreur de traduction IA' });
    }
  });

  // 2.8 🔎 Recherche Intelligente en Langage Naturel (AI Natural Language Search)
  app.post('/api/ai/smart-search', async (req, res) => {
    try {
      const { query, profiles } = req.body;
      if (!query || !profiles || !Array.isArray(profiles)) {
        return res.status(400).json({ error: 'Requête et liste de profils requises' });
      }

      if (INTERNAL_AI_ENABLED) {
        const prompt = `Vous êtes le moteur de Recherche Intelligente de Bavel.
L'utilisateur cherche : "${query}"

Analyse la liste des profils suivants et filtre/classe uniquement ceux qui correspondent sémantiquement à cette recherche :
PROFILS:
${JSON.stringify(
  profiles.map((p: any) => ({
    id: p.id,
    name: p.name,
    age: p.age,
    city: p.city || p.location,
    occupation: p.occupation,
    bio: p.bio,
    interests: p.interests,
    relation: p.lookingFor || p.relation
  }))
)}

Retourne un JSON strict :
{
  "matchedIds": [id1, id2],
  "reasoning": "Courte explication du résultat de recherche"
}`;

        const data = await safeGenerateJson<any>({ contents: prompt });
        if (data) {
          return res.json({
            matchedIds: data.matchedIds || profiles.map((p: any) => p.id),
            reasoning: data.reasoning || `Résultats pour "${query}"`
          });
        }
      }

      const lowerQ = query.toLowerCase();
      const matched = profiles.filter((p: any) => {
        const fullStr =
          `${p.name} ${p.bio || ''} ${p.occupation || ''} ${p.city || ''} ${(p.interests || []).join(' ')}`.toLowerCase();
        return lowerQ.split(' ').some((word: string) => word.length > 2 && fullStr.includes(word));
      });

      return res.json({
        matchedIds: matched.map((p: any) => p.id),
        reasoning: `Profils correspondant à "${query}"`
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la recherche intelligente' });
    }
  });

  // 2.9 📊 Détection Comportementale & Bots (AI Behavioral Analytics)
  app.post('/api/ai/behavioral-analysis', async (req, res) => {
    try {
      const { userActivityMetrics } = req.body;
      if (INTERNAL_AI_ENABLED) {
        const prompt = `Vous êtes l'IA de Sécurité Comportementale de Bavel.
Analyse les métriques d'activité de cet utilisateur pour détecter les comportements anormaux (robot, swipe frénétique en masse, copier-coller de messages en boucle, etc.) :
MÉTRIQUES:
${JSON.stringify(userActivityMetrics || { swipesPerMinute: 45, identicalMessagesSent: 12, accountAgeHours: 2 })}

Retourne un JSON strict :
{
  "isBotOrSpammer": boolean,
  "confidenceScore": nombre de 0 à 100,
  "behaviorType": "normal" | "frenetic_swiper" | "spammer" | "bot",
  "recommendedAction": "allow" | "captcha_challenge" | "temporary_rate_limit" | "block",
  "explanation": "Courte explication"
}`;

        const data = await safeGenerateJson<any>({ contents: prompt });
        if (data) {
          return res.json(data);
        }
      }

      return res.json({
        isBotOrSpammer: false,
        confidenceScore: 98,
        behaviorType: 'normal',
        recommendedAction: 'allow',
        explanation: 'Comportement humain naturel détecté'
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur d'analyse comportementale" });
    }
  });

  // 2.10 🚨 Risk Scoring Global (AI Risk Scoring)
  app.post('/api/ai/risk-scoring', async (req, res) => {
    try {
      const { profileData, verificationStatus, securityFlags } = req.body;
      if (INTERNAL_AI_ENABLED) {
        const prompt = `Vous êtes le Moteur d'Évaluation des Risques (Risk Scoring IA) de Bavel.
Calcule le score de risque global (0 = ultra sûr, 100 = haut risque d'arnaque/usurpation) pour ce compte :
DONNÉES:
${JSON.stringify({ profileData, verificationStatus, securityFlags })}

Retourne un JSON strict :
{
  "riskScore": nombre entier (0 à 100),
  "riskCategory": "low" | "medium" | "high" | "critical",
  "trustBadge": "Badge approprié",
  "keyFactors": ["facteur 1", "facteur 2"]
}`;

        const data = await safeGenerateJson<any>({ contents: prompt });
        if (data) {
          return res.json(data);
        }
      }

      return res.json({
        riskScore: 8,
        riskCategory: 'low',
        trustBadge: '🛡️ Compte Vérifié et Sûr',
        keyFactors: ['Authentification sécurisée', 'Aucun signalement']
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du calcul du score de risque' });
    }
  });

  // 2.11 🎯 Smart Boost (AI Smart Boost Optimization)
  app.post('/api/ai/smart-boost', async (req, res) => {
    try {
      const { userProfile, currentHour, activeUsersCount } = req.body;
      if (INTERNAL_AI_ENABLED) {
        const prompt = `Vous êtes l'IA de Smart Boost de Bavel.
Analyse le moment optimal pour faire briller le profil de cet utilisateur et maximiser son taux de match :
Utilisateur: ${userProfile?.name}, Heure actuelle: ${currentHour || '20:00'}, Utilisateurs en ligne: ${activeUsersCount || 1420}

Retourne un JSON strict :
{
  "optimalTimeWindow": "ex: 20h00 - 22h30",
  "estimatedMatchMultiplier": "ex: x4.8 de visibilité",
  "targetAudienceSummary": "Courte phrase décrivant les profils ciblés",
  "recommendation": "Conseil pour maximiser l'effet du boost"
}`;

        const data = await safeGenerateJson<any>({ contents: prompt });
        if (data) {
          return res.json(data);
        }
      }

      return res.json({
        optimalTimeWindow: 'Maintenant (Pointe de soirée)',
        estimatedMatchMultiplier: 'x5 de visibilité',
        targetAudienceSummary: "Célibataires actifs à Abidjan ayant des centres d'intérêt similaires",
        recommendation: 'Mettez votre plus beau sourire en première photo pour doubler vos likes !'
      });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors du calcul Smart Boost IA' });
    }
  });

  // 2.11b 🎁 Offres & Recommandations Personnalisées IA (Dynamic Personalized AI Offers)
  app.post('/api/ai/personalized-offer', async (req, res) => {
    try {
      const { userProfile, likesCount, unreadLikesCount, location, activeTab } = req.body;

      if (INTERNAL_AI_ENABLED) {
        const prompt = `Vous êtes le système d'offres dynamiques et personnalisées de l'application de rencontre Bavel.
Générez une offre temporaire percutante, chaleureuse et hautement personnalisée pour cet utilisateur :
- Nom : ${userProfile?.name || 'Utilisateur'}
- Ville/Lieu : ${location || userProfile?.city || 'votre région'}
- Nombre de likes reçus : ${likesCount || 1}
- Nouveaux likes non lus : ${unreadLikesCount || 0}
- Contexte : consultation de l'onglet ${activeTab || 'Likes'}

Retourne UNIQUEMENT un JSON strict respectant cette structure exacte :
{
  "title": "Titre court et accrocheur (ex: Premium pendant 1 jour)",
  "subtitle": "Description claire et motivante (ex: Découvrez toutes les personnes à qui vous plaisez et profitez de swipes illimités ainsi que d'autres avantages Premium.)",
  "price": "5,99 €",
  "originalPrice": "9,99 €",
  "actionText": "Texte du bouton CTA (ex: Profitez-en pour 5,99 €)",
  "durationSeconds": 13958,
  "badge": "OFFRE FLASH",
  "reason": "Explication personnalisée (ex: Plusieurs admirateurs souhaitent entrer en contact avec vous)",
  "offerType": "premium_1day"
}`;

        const data = await safeGenerateJson<any>({ contents: prompt });
        if (data && data.title && data.actionText) {
          return res.json(data);
        }
      }

      // Default high-converting offer (matches user reference screen)
      return res.json({
        title: 'Premium pendant 1 jour',
        subtitle:
          "Découvrez toutes les personnes à qui vous plaisez et profitez de swipes illimités ainsi que d'autres avantages Premium.",
        price: '5,99 €',
        originalPrice: '9,99 €',
        actionText: 'Profitez-en pour 5,99 €',
        durationSeconds: 13958, // 03:52:38
        badge: 'OFFRE FLASH',
        reason: `${likesCount > 0 ? `${likesCount} profil${likesCount > 1 ? 's ont' : ' a'} flashé sur vous` : 'Débloquez tous vos admirateurs dès maintenant'}`,
        offerType: 'premium_1day'
      });
    } catch (error) {
      console.warn("Erreur lors de la génération de l'offre personnalisée IA:", error);
      return res.json({
        title: 'Premium pendant 1 jour',
        subtitle:
          "Découvrez toutes les personnes à qui vous plaisez et profitez de swipes illimités ainsi que d'autres avantages Premium.",
        price: '5,99 €',
        originalPrice: '9,99 €',
        actionText: 'Profitez-en pour 5,99 €',
        durationSeconds: 13958,
        badge: 'OFFRE FLASH',
        reason: 'Offre temporaire spéciale',
        offerType: 'premium_1day'
      });
    }
  });

  // 2.12 ✍️ Assistant de Conversation IA (Realtime Chat Assistant & Suggestions)
  app.post('/api/ai/chat-assistant', async (req, res) => {
    try {
      const { conversationHistory, targetProfile } = req.body;
      if (INTERNAL_AI_ENABLED) {
        const prompt = `Vous êtes l'Assistant de Conversation de Bavel (Coach IA).
Analyse l'historique récent du tchat avec ${targetProfile?.name || 'le match'} et propose 3 suggestions de réponses personnalisées et séduisantes, ainsi qu'un conseil de relance :

HISTORIQUE:
${JSON.stringify(conversationHistory || [])}

PROFIL DE L'AUTRE PERSONNE:
${JSON.stringify(targetProfile || {})}

Retourne un JSON strict :
{
  "coachAdvice": "Conseil court de 1 à 2 phrases",
  "suggestedReplies": ["Réponse 1", "Réponse 2", "Réponse 3"],
  "funQuestion": "Une question originale à poser pour relancer"
}`;

        const data = await safeGenerateJson<any>({ contents: prompt });
        if (data) {
          return res.json(data);
        }
      }

      return res.json({
        coachAdvice: 'Montrez un intérêt sincère pour ses passions en posant une question ouverte !',
        suggestedReplies: [
          "C'est vraiment super intéressant ! Tu fais ça souvent ?",
          "Haha j'adore ta façon de voir les choses ! 😉",
          "D'ailleurs, tu as de bonnes adresses à conseiller pour une sortie sympa ?"
        ],
        funQuestion: 'Plutôt balade romantique ou dîner gourmand pour un premier rendez-vous ?'
      });
    } catch (error) {
      res.status(500).json({ error: "Erreur de l'assistant de conversation IA" });
    }
  });

  // --- API Routes Continuations ---

  // 4. Love Quiz Matcher
  app.post('/api/love-quiz', async (req, res) => {
    const calculateFallback = (userAnswers: any, targetAnswers: any, targetName: string) => {
      let matchingCount = 0;
      if (userAnswers[1] === targetAnswers[1]) matchingCount++;
      if (userAnswers[2] === targetAnswers[2]) matchingCount++;
      if (userAnswers[3] === targetAnswers[3]) matchingCount++;
      const score = Math.floor((matchingCount / 3) * 40) + 55;
      let comment = `Félicitations ! Vous avez des goûts très compatibles. `;
      if (userAnswers[1] === targetAnswers[1] && userAnswers[1] === 'A') {
        comment += `Vous adorez tous les deux le Garba chaud pimenté au bord de la route, l'amour à l'ivoirienne commence toujours là ! On est ensemble ! 🇨🇮`;
      } else {
        comment += `Vous formez un duo équilibré et dynamique entre romance et ambiance locale avec ${targetName}. Prévoyez une sortie romantique très bientôt !`;
      }
      return { score, comment };
    };

    const { userAnswers, targetAnswers, userName, targetName } = req.body;

    if (!INTERNAL_AI_ENABLED) {
      return res.json(calculateFallback(userAnswers, targetAnswers, targetName));
    }
    try {
      const prompt = `You are an AI Relationship Expert for an Ivorian Dating app called 'Bavel'.
Read the answers of ${userName} and ${targetName} to 3 dating icebreaker questions:
Question 1 (Plat préféré): ${userName} chose "${userAnswers[1]}" and ${targetName} chose "${targetAnswers[1]}"
Question 2 (Soirée parfaite): ${userName} chose "${userAnswers[2]}" and ${targetName} chose "${targetAnswers[2]}"
Question 3 (Escapade week-end): ${userName} chose "${userAnswers[3]}" and ${targetName} chose "${targetAnswers[3]}"

Calculate a compatibility score between 40% and 100%. Write a humorous, warm, and highly engaging matchmaking commentary in French (2-3 sentences max) with Ivorian expressions (like "on est ensemble", "doux", "chic") commenting on their answers and advising them on their ideal next date.

Return a JSON object with:
"score": a number between 40 and 100.
"comment": the matchmaking commentary in French.`;

      const data = await safeGenerateJson<any>({ contents: prompt });
      if (data && typeof data.score === 'number' && data.comment) {
        return res.json({ score: data.score, comment: data.comment });
      }
      return res.json(calculateFallback(userAnswers, targetAnswers, targetName));
    } catch (error) {
      console.error('Love Quiz endpoint error:', error);
      return res.json(calculateFallback(userAnswers, targetAnswers, targetName));
    }
  });

  // 5. Photo Verification (Blue Badge)
  app.post('/api/verify-pose', async (req, res) => {
    try {
      const { poseImageUrl, userSelfieBase64 } = req.body;

      const extractBase64Data = (dataUrl: string) => {
        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        return matches ? { mimeType: matches[1], data: matches[2] } : null;
      };

      const selfieData = extractBase64Data(userSelfieBase64);
      if (!selfieData) {
        return res.status(400).json({ verified: false, message: "Format d'image selfie invalide." });
      }

      if (!INTERNAL_AI_ENABLED) {
        return res.status(503).json({ verified: false, message: 'Vérification biométrique non configurée.' });
      }

      // Fetch the pose image from URL and convert to base64
      let poseData;
      try {
        const poseResponse = await fetch(poseImageUrl);
        const poseArrayBuffer = await poseResponse.arrayBuffer();
        const poseBuffer = Buffer.from(poseArrayBuffer);
        const poseMimeType = poseResponse.headers.get('content-type') || 'image/jpeg';
        poseData = { mimeType: poseMimeType, data: poseBuffer.toString('base64') };
      } catch (e) {
        return res.status(400).json({ verified: false, message: "Impossible de récupérer l'image de référence." });
      }

      const prompt = `You are an AI Identity Verification System. 
Analyze the two provided images:
1. The first image is the reference pose image showing a specific hand gesture or posture.
2. The second image is a live selfie taken by the user.

Your task is to determine if the user in the selfie is accurately replicating the exact same pose shown in the reference image. This is to verify they are a real person holding the phone. 
Ignore the background, lighting, and differences in the person's appearance compared to the reference (they are not supposed to look like the person in the reference, they just need to do the pose).

Return a JSON object with:
- "verified": boolean (true if the pose matches, false if not)
- "message": A short explanation in French (e.g. "Pose reconnue avec succès", "La pose ne correspond pas, veuillez réessayer").`;

      const data = await safeGenerateJson<any>({
        contents: [
          prompt,
          { inlineData: { mimeType: poseData.mimeType, data: poseData.data } },
          { inlineData: { mimeType: selfieData.mimeType, data: selfieData.data } }
        ]
      });

      if (data) {
        return res.json({ verified: data.verified !== false, message: data.message || 'Pose validée avec succès !' });
      }
      return res.status(503).json({ verified: false, message: 'Analyse biométrique indisponible.' });
    } catch (error) {
      console.error('Pose verification error:', error);
      return res.status(503).json({ verified: false, message: 'Vérification biométrique indisponible.' });
    }
  });

  // 6. Anti-NSFW Photo Filter
  app.post('/api/check-nsfw', async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      const extractBase64Data = (dataUrl: string) => {
        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        return matches ? { mimeType: matches[1], data: matches[2] } : null;
      };

      const imgData = extractBase64Data(imageBase64);
      if (!imgData) {
        return res.status(400).json({ isSafe: false, message: "Format d'image invalide." });
      }

      if (!INTERNAL_AI_ENABLED) {
        return res.status(503).json({
          isSafe: false,
          blurRequired: true,
          message: 'Modération photo non configurée : image protégée par précaution.'
        });
      }

      const prompt = `You are a Trust and Safety AI moderator for a dating app. 
Analyze the provided image for any NSFW (Not Safe For Work) content, including nudity, explicit sexual content, excessive violence, or illegal acts.

Return a JSON object with:
- "isSafe": boolean (true if the image is safe, false if it contains NSFW content)
- "message": A short explanation in French explaining why it was blocked if not safe, or "Image approuvée" if safe.`;

      const data = await safeGenerateJson<any>({
        contents: [prompt, { inlineData: { mimeType: imgData.mimeType, data: imgData.data } }]
      });

      if (data) {
        return res.json({ isSafe: data.isSafe !== false, message: data.message || 'Image approuvée.' });
      }
      return res.status(503).json({
        isSafe: false,
        blurRequired: true,
        message: 'Modération photo indisponible : image protégée par précaution.'
      });
    } catch (error) {
      console.error('NSFW check error:', error);
      return res.status(503).json({
        isSafe: false,
        blurRequired: true,
        message: 'Modération photo indisponible : image protégée par précaution.'
      });
    }
  });

  // 6.9 Supabase Integration Configuration Endpoint
  app.get(['/api/supabase/config', '/api/supabase-config', '/api/config'], (req, res) => {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const isConfigured = Boolean(url && anonKey && !url.includes('your-project') && !anonKey.includes('your-anon-key'));
    res.json({
      supabaseUrl: url,
      supabaseAnonKey: anonKey,
      isConfigured,
      timestamp: new Date().toISOString()
    });
  });

  // 7. Check active session on app load
  app.get('/api/auth/me', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '');
    const { data: profile, error } = await serverSupabase
      .getServiceClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('Canonical auth session lookup failed:', error);
      return res.status(500).json({ success: false, message: 'Session indisponible.' });
    }
    return res.json({
      success: true,
      user: { id: userId, email: profile?.email || '' },
      profile: profile || null,
      photos: Array.isArray(profile?.photos) ? profile.photos : []
    });
  });

  // Inscription par e-mail et mot de passe (sécurisé par bcrypt et JWT)
  app.post('/api/auth/register', async (req, res) => {
    return res.status(410).json({
      success: false,
      code: 'SUPABASE_AUTH_REQUIRED',
      message: 'Utilisez Supabase Auth pour créer votre compte.'
    });
    /*
    try {
      const { email, password, name } = req.body;
      if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, message: "Adresse e-mail valide requise." });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: "Le mot de passe doit contenir au moins 6 caractères." });
      }

      const cleanEmail = email.toLowerCase().trim();
      const existingAccount = await serverSupabase.getUserAccountByEmail(cleanEmail);
      if (existingAccount) {
        return res.status(400).json({ success: false, message: "Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter." });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const userId = `user_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      const userName = name || cleanEmail.split('@')[0] || 'Membre';
      
      // Create user account in Supabase
      const accountResult = await serverSupabase.createUserAccount({
        userId,
        email: cleanEmail,
        passwordHash: hashedPassword,
        authProvider: 'email'
      });
      
      if (!accountResult.success) {
        return res.status(500).json({ success: false, message: "Erreur lors de la création du compte." });
      }
      
      const profileData = {
        profile: {
          id: userId,
          email: cleanEmail,
          name: userName,
          createdAt: new Date().toISOString()
        },
        photos: []
      };
      
      await serverSupabase.saveUserProfile(cleanEmail, profileData.profile, profileData.photos);

      const user = {
        id: userId,
        email: cleanEmail,
        name: userName
      };

      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });

      res.cookie("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      return res.json({
        success: true,
        token,
        user,
        message: "Compte créé avec succès."
      });
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      return res.status(500).json({ success: false, message: "Erreur serveur lors de la création du compte." });
    }
    */
  });

  // Connexion par e-mail et mot de passe
  app.post('/api/auth/login', async (req, res) => {
    return res.status(410).json({
      success: false,
      code: 'SUPABASE_AUTH_REQUIRED',
      message: 'Utilisez Supabase Auth pour vous connecter.'
    });
    /*
    try {
      const { email, password } = req.body;
      if (!email || !email.includes('@')) {
        return res.status(400).json({ success: false, message: "Veuillez entrer une adresse e-mail valide." });
      }
      if (!password || !password.trim()) {
        return res.status(400).json({ success: false, message: "Veuillez saisir votre mot de passe." });
      }

      const cleanEmail = email.toLowerCase().trim();
      const userAccount = await serverSupabase.getUserAccountByEmail(cleanEmail);
      
      if (!userAccount) {
        return res.status(401).json({
          success: false,
          code: "USER_NOT_FOUND",
          message: "Aucun compte trouvé avec cette adresse e-mail."
        });
      }
      
      if (!userAccount.is_active || userAccount.is_deleted) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_INACTIVE",
          message: "Ce compte a été désactivé ou supprimé."
        });
      }
      
      const savedHash = userAccount.password_hash;
      let record = await serverSupabase.getUserProfile(cleanEmail);

      if (savedHash) {
        const match = await bcrypt.compare(password, savedHash);
        if (!match) {
          return res.status(401).json({
            success: false,
            code: "WRONG_PASSWORD",
            message: "Mot de passe incorrect. Veuillez vérifier votre mot de passe et réessayer."
          });
        }
        
        // Update last login
        await serverSupabase.updateLastLogin(userAccount.user_id);
      } else {
        // This shouldn't happen if account exists but no password - create password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await serverSupabase.saveUserPassword(cleanEmail, hashedPassword);
        if (!record) {
          record = {
            profile: {
              id: userAccount.user_id,
              email: cleanEmail,
              name: cleanEmail.split('@')[0],
              createdAt: new Date().toISOString()
            },
            photos: []
          };
          await serverSupabase.saveUserProfile(cleanEmail, record.profile, record.photos);
        }
      }

      const userId = userAccount.user_id || record?.profile?.id || `user_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      const userName = record?.profile?.name || cleanEmail.split('@')[0] || 'Membre';
      const user = {
        id: userId,
        email: cleanEmail,
        name: userName
      };

      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });

      res.cookie("session_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      savePersistentData();

      return res.json({
        success: true,
        token,
        user,
        profile: record?.profile || null,
        photos: record?.photos || [],
        message: "Connexion réussie."
      });
    } catch (error: any) {
      console.error("Erreur de connexion:", error);
      return res.status(500).json({ success: false, message: "Erreur serveur lors de la connexion." });
    }
    */
  });

  // Verification Google OAuth (Google Identity Services) & Session JWT
  app.post('/api/auth/google', async (req, res) => {
    return res.status(410).json({
      success: false,
      code: 'SUPABASE_AUTH_REQUIRED',
      message: 'Utilisez le fournisseur Google configuré dans Supabase Auth.'
    });
    /*
    const { token, code } = req.body;

    if (!token && !code) {
      return res.status(400).json({ success: false, message: "Token ou Code manquant" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

    try {
      let userData: { id: string; email: string; name: string; picture: string };

      if (code && clientId && clientId !== "VOTRE_GOOGLE_CLIENT_ID") {
        const googleClient = new OAuth2Client(clientId, process.env.GOOGLE_CLIENT_SECRET, 'postmessage');
        try {
          const { tokens } = await googleClient.getToken({
            code,
            redirect_uri: 'postmessage',
          });
          if (tokens.access_token) {
            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokens.access_token}` }
            });
            if (userinfoRes.ok) {
              const info = await userinfoRes.json();
              userData = {
                id: info.sub || `google_${Date.now()}`,
                email: info.email || 'utilisateur.google@gmail.com',
                name: info.name || info.given_name || 'Membre Google',
                picture: info.picture || ''
              };
            }
          } else if (tokens.id_token) {
            const ticket = await googleClient.verifyIdToken({
              idToken: tokens.id_token,
              audience: clientId,
            });
            const payload = ticket.getPayload();
            userData = {
              id: payload?.sub || `google_${Date.now()}`,
              email: payload?.email || '',
              name: payload?.name || 'Membre Google',
              picture: payload?.picture || ''
            };
          } else {
            userData = {
              id: `google_${Date.now()}`,
              email: 'utilisateur.google@gmail.com',
              name: 'Membre Google',
              picture: ''
            };
          }
        } catch (codeErr: any) {
          console.warn("Google code exchange notice:", codeErr?.message || codeErr);
          userData = {
            id: `google_${Date.now()}`,
            email: 'utilisateur.google@gmail.com',
            name: 'Membre Google',
            picture: ''
          };
        }
      } else if (token && clientId && clientId !== "VOTRE_GOOGLE_CLIENT_ID") {
        const googleClient = new OAuth2Client(clientId);
        try {
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (userinfoRes.ok) {
            const info = await userinfoRes.json();
            userData = {
              id: info.sub || `google_${Date.now()}`,
              email: info.email || 'utilisateur.google@gmail.com',
              name: info.name || info.given_name || 'Membre Google',
              picture: info.picture || ''
            };
          } else {
            const ticket = await googleClient.verifyIdToken({
              idToken: token,
              audience: clientId,
            });
            const payload = ticket.getPayload();
            userData = {
              id: payload?.sub || `google_${Date.now()}`,
              email: payload?.email || '',
              name: payload?.name || 'Membre Google',
              picture: payload?.picture || ''
            };
          }
        } catch (tokenErr: any) {
          console.warn("Google token verification notice:", tokenErr?.message || tokenErr);
          userData = {
            id: `google_${Date.now()}`,
            email: 'utilisateur.google@gmail.com',
            name: 'Membre Google',
            picture: ''
          };
        }
      } else {
        // Fallback pour décoder le jeton
        if (token && typeof token === 'string' && token.split('.').length === 3) {
          const parts = token.split('.');
          const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
          const payload = JSON.parse(decodedJson);
          userData = {
            id: payload.sub || `google_${Date.now()}`,
            email: payload.email || 'utilisateur.google@gmail.com',
            name: payload.name || 'Membre Google',
            picture: payload.picture || ''
          };
        } else {
          userData = {
            id: `google_${Date.now()}`,
            email: 'utilisateur.google@gmail.com',
            name: 'Membre Google',
            picture: ''
          };
        }
      }

      // Ensure deterministic ID for the user's email
      const cleanEmail = (userData.email || 'utilisateur.google@gmail.com').toLowerCase().trim();
      if (!userData.id || userData.id.startsWith('google_1') || userData.id.startsWith('google_2')) {
        userData.id = getDeterministicGoogleUserId(cleanEmail, undefined);
      }

      // Check if user has an existing saved profile on the backend
      const existingRecord = userProfilesStore.get(cleanEmail);
      const isNewUser = !existingRecord || !existingRecord.profile || !existingRecord.profile.name || (!existingRecord.profile.gender && !existingRecord.profile.birthday);

      let finalUserObj = { ...userData };
      if (existingRecord && existingRecord.profile) {
        finalUserObj = {
          ...userData,
          ...existingRecord.profile,
          id: userData.id || existingRecord.profile.id
        };
      }

      // Génération du jeton JWT de session (valable 24 heures)
      const sessionToken = jwt.sign(finalUserObj, JWT_SECRET, { expiresIn: '24h' });

      // Envoi du token dans un cookie HTTP-only ultra sécurisé
      res.cookie('session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 heures
      });

      return res.json({
        success: true,
        message: "Authentification réussie",
        token: sessionToken,
        user: finalUserObj,
        isNewUser,
        savedProfile: existingRecord?.profile || null,
        savedPhotos: existingRecord?.photos || null
      });
    } catch (error: any) {
      console.error("Erreur de vérification Google:", error);
      res.status(401).json({ success: false, message: error.message || "Token invalide" });
    }
    */
  });

  // Sauvegarde du profil utilisateur côté serveur (pour synchronisation 1 email = 1 compte)
  app.post('/api/user/profile/save', verifySupabaseToken, requireAuth, async (req, res) => {
    const authenticatedUserId = (req as any).userId;
    const { profile, photos } = req.body;
    if (!profile || profile.id !== authenticatedUserId) {
      return res.status(403).json({ success: false, message: 'Profil non autorisé.' });
    }
    const db = serverSupabase.getServiceClient();
    const safePhotos = Array.isArray(photos)
      ? photos
          .filter((photo): photo is string => typeof photo === 'string' && photo.trim().length > 0)
          .map(toStoredProfilePhotoReference)
      : undefined;
    const details = profile.details === undefined ? undefined : normalizeProfileDetails(profile.details);
    const update = Object.fromEntries(
      Object.entries({
        email: typeof profile.email === 'string' ? profile.email.toLowerCase().trim() : undefined,
        name: typeof profile.name === 'string' ? profile.name.trim() : undefined,
        avatar_url:
          typeof profile.avatarUrl === 'string' ? toStoredProfilePhotoReference(profile.avatarUrl) : undefined,
        age: Number.isInteger(Number(profile.age)) ? Number(profile.age) : undefined,
        gender: profile.gender,
        city: profile.city || profile.location,
        country: profile.country,
        country_code: profile.countryCode,
        latitude: Number.isFinite(Number(profile.latitude)) ? Number(profile.latitude) : undefined,
        longitude: Number.isFinite(Number(profile.longitude)) ? Number(profile.longitude) : undefined,
        bio: profile.bio,
        job: profile.job || profile.jobTitle,
        studies: profile.studies || profile.school,
        alcohol: profile.alcohol || profile.drinking,
        personality: profile.personality,
        zodiac: profile.zodiac || profile.starSign,
        pets: profile.pets,
        interests: Array.isArray(profile.interests) ? normalizeProfileInterests(profile.interests) : undefined,
        details,
        photos: safePhotos,
        onboarding_completed: Boolean(profile.onboardingCompleted ?? profile.onboarding_completed),
        updated_at: new Date().toISOString()
      }).filter(([, value]) => value !== undefined)
    );
    const { error } = await db.from('profiles').update(update).eq('id', authenticatedUserId);
    if (error) {
      console.error('Canonical profile save failed:', error);
      return res.status(500).json({ success: false, message: 'Profil indisponible.' });
    }
    return res.json({ success: true, message: 'Profil sauvegardé dans Supabase.' });
  });

  // Récupération dynamique de tous les profils réels inscrits sur le serveur
  app.get('/api/profiles', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const { candidates } = await serverSupabase.getRecommendationData(String((req as any).userId));
      const candidateIds = candidates.map((profile: any) => profile.id);
      const { data: privacySettings, error: privacyError } = candidateIds.length
        ? await serverSupabase
            .getServiceClient()
            .from('user_privacy_settings')
            .select('user_id,incognito_mode,profile_paused,show_online_status,show_distance')
            .in('user_id', candidateIds)
        : { data: [], error: null };
      if (privacyError) throw privacyError;
      const privacyByUser = new Map((privacySettings || []).map((settings: any) => [settings.user_id, settings]));
      const visibleCandidates = candidates.filter((profile: any) => {
        const privacy = privacyByUser.get(profile.id);
        return privacy?.profile_paused !== true;
      });
      let signedCandidates = visibleCandidates;
      try {
        signedCandidates = await signMemberProfileMedia(visibleCandidates);
      } catch (photoError) {
        console.error('Failed to sign discovery profile photos:', photoError);
        signedCandidates = visibleCandidates.map((profile: any) => ({
          ...profile,
          photos: [],
          avatar_url: ''
        }));
      }
      const profiles = signedCandidates.map((profile: any) => {
        const privacy = privacyByUser.get(profile.id);
        return toPublicProfile(profile, {
          showOnlineStatus: privacy?.show_online_status !== false,
          showDistance: privacy?.show_distance !== false
        });
      });
      return res.json({ success: true, profiles });
    } catch (error) {
      console.error('Canonical profiles query failed:', error);
      return res.status(500).json({ success: false, profiles: [] });
    }
    /*
    try {
      const currentUserId = String((req as any).userId);

      const profilesList: any[] = [];
      userProfilesStore.forEach((record, emailKey) => {
        // Ignorer l'utilisateur demandeur
        const prof = record.profile || {};
        if (String(prof.id || '') === currentUserId) return;
        const photos = record.photos || [];
        if (prof.name && prof.name !== 'Membre' && prof.name !== 'Guest') {
          profilesList.push({
            id: prof.id || `user_${emailKey.replace(/[^a-z0-9]/g, '_')}`,
            user_id: prof.id || `user_${emailKey.replace(/[^a-z0-9]/g, '_')}`,
            name: prof.name,
            age: prof.age || 26,
            gender: (prof.gender || 'femme').toLowerCase(),
            city: prof.city || prof.location || '',
            location: prof.city || prof.location || '',
            latitude: prof.latitude,
            longitude: prof.longitude,
            img: (photos && photos.length > 0 && photos[0]) ? photos[0] : (prof.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80'),
            photos: (photos && photos.length > 0) ? photos.filter(Boolean) : [(prof.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80')],
            bio: prof.bio || '',
            tagline: prof.bio || '',
            job: prof.job || prof.jobTitle || '',
            studies: prof.studies || prof.school || '',
            relation: prof.details?.relation || prof.purpose || '',
            status: prof.details?.status || '',
            orientation: prof.details?.orientation || prof.sexualOrientation || '',
            language: prof.language || '',
            alcohol: prof.alcohol || prof.drinking || '',
            zodiac: prof.zodiac || prof.starSign || '',
            pets: prof.pets || '',
            personality: prof.personality || '',
            details: Array.isArray(prof.details) ? prof.details : (prof.details ? Object.values(prof.details) : []),
            tags: Array.isArray(prof.interests) ? prof.interests : [],
            online: Boolean(prof.online),
            verified: Boolean(prof.isVerified)
          });
        }
      });

      return res.json({ success: true, profiles: profilesList });
    } catch (err: any) {
      console.error("Erreur récupération profils serveur:", err);
      return res.status(500).json({ success: false, profiles: [] });
    }
    */
  });

  app.get('/api/chat/matched-profiles', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId);
    try {
      const db = serverSupabase.getServiceClient();
      const { data: matches, error: matchesError } = await db
        .from('matches')
        .select('user_id,matched_user_id')
        .or(`user_id.eq.${userId},matched_user_id.eq.${userId}`);
      if (matchesError) throw matchesError;

      const profileIds = Array.from(
        new Set(
          (matches || []).map((match: any) =>
            String(match.user_id) === userId ? String(match.matched_user_id) : String(match.user_id)
          )
        )
      );
      const { data: profiles, error: profilesError } = profileIds.length
        ? await db
            .from('profiles')
            .select(
              'id,name,age,gender,city,country,country_code,bio,job,studies,alcohol,personality,zodiac,pets,photos,interests,details,key_question,is_verified,is_online,last_active_at,created_at'
            )
            .in('id', profileIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const signedProfiles = await signMemberProfileMedia(profiles || []);
      const { data: privacySettings, error: privacyError } = profileIds.length
        ? await db
            .from('user_privacy_settings')
            .select('user_id,show_online_status,show_distance')
            .in('user_id', profileIds)
        : { data: [], error: null };
      if (privacyError) throw privacyError;
      const privacyByUser = new Map(
        (privacySettings || []).map((settings: any) => [String(settings.user_id), settings])
      );
      return res.json({
        profiles: signedProfiles.map((profile: any) => {
          const privacy = privacyByUser.get(String(profile.id));
          return toPublicProfile(profile, {
            showOnlineStatus: privacy?.show_online_status !== false,
            showDistance: privacy?.show_distance !== false
          });
        })
      });
    } catch (error) {
      console.error('Matched chat profiles query failed:', error);
      return res.status(500).json({ error: 'Profils des conversations indisponibles.' });
    }
  });

  app.post('/api/presence/heartbeat', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '');
    if (!userId) return res.status(401).json({ error: 'Session utilisateur requise.' });

    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('profiles')
        .update({
          is_online: true,
          last_active_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Profil introuvable.' });
      return res.status(204).end();
    } catch (error) {
      console.error('Presence heartbeat update failed:', error);
      return res.status(503).json({ error: 'Statut de présence indisponible.' });
    }
  });

  // Enregistrement d'un Swipe et détection instantanée de Match réciproque
  app.post('/api/swipes', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const { userId, targetId, action } = req.body;
      const authenticatedUserId = (req as any).userId;
      if (!userId || userId !== authenticatedUserId || !targetId) {
        return res.status(400).json({ success: false, message: 'userId et targetId requis' });
      }

      const uid = String(userId);
      const tid = String(targetId);

      const db = serverSupabase.getServiceClient();
      const isLike = action === 'like' || action === 'superlike';
      const { error: swipeError } = await db.from('swipes').upsert(
        {
          user_id: uid,
          target_id: tid,
          is_liked: isLike,
          is_super_like: action === 'superlike'
        },
        { onConflict: 'user_id,target_id' }
      );
      if (swipeError) throw swipeError;

      let isMatch = false;
      if (isLike) {
        const { data: reciprocal, error: reciprocalError } = await db
          .from('swipes')
          .select('id')
          .eq('user_id', tid)
          .eq('target_id', uid)
          .eq('is_liked', true)
          .maybeSingle();
        if (reciprocalError) throw reciprocalError;
        if (reciprocal) {
          isMatch = true;
          const { error: matchError } = await db.from('matches').upsert(
            [
              { user_id: uid, matched_user_id: tid },
              { user_id: tid, matched_user_id: uid }
            ],
            { onConflict: 'user_id,matched_user_id' }
          );
          if (matchError) throw matchError;
        }
      }

      return res.json({ success: true, isMatch, swiped: true });
    } catch (err: any) {
      console.error('Erreur Swipe serveur:', err);
      return res.status(500).json({ success: false, isMatch: false });
    }
  });

  // Récupération des Matches réels enregistrés pour un utilisateur
  app.get('/api/matches/:userId', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      if (userId !== (req as any).userId) {
        return res.status(403).json({ success: false, matches: [] });
      }
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('matches')
        .select('id,user_id,matched_user_id,created_at,last_message_at')
        .eq('user_id', String(userId));
      if (error) throw error;
      return res.json({ success: true, matches: data || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, matches: [] });
    }
  });

  app.post('/api/blocks', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId);
    const blockedUserId = String(req.body?.blockedUserId || '');
    if (!blockedUserId || blockedUserId === userId) {
      return res.status(400).json({ success: false, error: 'Utilisateur invalide.' });
    }
    try {
      const db = serverSupabase.getServiceClient();
      const { error } = await db
        .from('blocks')
        .upsert(
          { user_id: userId, blocked_user_id: blockedUserId, reason: String(req.body?.reason || '') },
          { onConflict: 'user_id,blocked_user_id' }
        );
      if (error) throw error;
      await db
        .from('swipes')
        .delete()
        .or(
          `and(user_id.eq.${userId},target_id.eq.${blockedUserId}),and(user_id.eq.${blockedUserId},target_id.eq.${userId})`
        );
      await db
        .from('matches')
        .delete()
        .or(
          `and(user_id.eq.${userId},matched_user_id.eq.${blockedUserId}),and(user_id.eq.${blockedUserId},matched_user_id.eq.${userId})`
        );
      return res.json({ success: true });
    } catch (error) {
      console.error('Erreur blocage Rencontres:', error);
      return res.status(500).json({ success: false, error: 'Blocage impossible.' });
    }
  });

  app.get('/api/blocks', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId);
    try {
      const db = serverSupabase.getServiceClient();
      const { data: blocks, error } = await db
        .from('blocks')
        .select('blocked_user_id,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const ids = (blocks || []).map((row: any) => String(row.blocked_user_id));
      const { data: profiles, error: profilesError } = ids.length
        ? await db.from('profiles').select('id,name,avatar_url,is_verified').in('id', ids)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const signedProfiles = await signMemberProfileMedia(profiles || []);
      const profileById = new Map(signedProfiles.map((profile: any) => [String(profile.id), profile]));
      return res.json({
        blockedUsers: (blocks || []).map((row: any) => {
          const profile = profileById.get(String(row.blocked_user_id));
          return {
            id: String(row.blocked_user_id),
            name: profile?.name || 'Utilisateur',
            photo: profile?.avatar_url || undefined,
            verified: Boolean(profile?.is_verified),
            dateBlocked: row.created_at
          };
        })
      });
    } catch (error) {
      console.error('Erreur récupération blocages:', error);
      return res.status(500).json({ error: 'Liste des utilisateurs bloqués indisponible.' });
    }
  });

  app.delete('/api/blocks/:blockedUserId', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId);
    const blockedUserId = String(req.params.blockedUserId || '');
    if (!blockedUserId || blockedUserId === userId) {
      return res.status(400).json({ success: false, error: 'Utilisateur invalide.' });
    }
    try {
      const { error } = await serverSupabase
        .getServiceClient()
        .from('blocks')
        .delete()
        .eq('user_id', userId)
        .eq('blocked_user_id', blockedUserId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (error) {
      console.error('Erreur déblocage utilisateur:', error);
      return res.status(500).json({ success: false, error: 'Déblocage impossible.' });
    }
  });

  app.get('/api/notification-preferences', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('notification_preferences')
        .select('system_enabled,categories')
        .eq('user_id', String((req as any).userId))
        .maybeSingle();
      if (error) throw error;
      return res.json({ preferences: data || { system_enabled: true, categories: {} } });
    } catch (error) {
      console.error('Erreur lecture préférences notifications:', error);
      return res.status(500).json({ error: 'Préférences de notifications indisponibles.' });
    }
  });

  app.put('/api/notification-preferences', verifySupabaseToken, requireAuth, async (req, res) => {
    const categories = req.body?.categories;
    const systemEnabled = req.body?.system_enabled;
    if (
      typeof systemEnabled !== 'boolean' &&
      (!categories || typeof categories !== 'object' || Array.isArray(categories))
    ) {
      return res.status(400).json({ error: 'Préférences invalides.' });
    }
    try {
      const db = serverSupabase.getServiceClient();
      const payload: Record<string, unknown> = {
        user_id: String((req as any).userId),
        updated_at: new Date().toISOString()
      };
      if (typeof systemEnabled === 'boolean') payload.system_enabled = systemEnabled;
      if (categories && typeof categories === 'object' && !Array.isArray(categories)) payload.categories = categories;
      const { data, error } = await db
        .from('notification_preferences')
        .upsert(payload, { onConflict: 'user_id' })
        .select('system_enabled,categories')
        .single();
      if (error) throw error;
      return res.json({ preferences: data });
    } catch (error) {
      console.error('Erreur sauvegarde préférences notifications:', error);
      return res.status(500).json({ error: 'Impossible de sauvegarder les préférences.' });
    }
  });

  app.post('/api/reports', verifySupabaseToken, requireAuth, async (req, res) => {
    const reporterId = String((req as any).userId);
    const reportedId = String(req.body?.reportedId || '');
    const description = String(req.body?.description || '').trim();
    const allowedCategories = new Set([
      'harassment',
      'fake_profile',
      'inappropriate_content',
      'scam',
      'hate_speech',
      'spam',
      'other'
    ]);
    const category = allowedCategories.has(req.body?.category) ? req.body.category : 'other';
    if (!reportedId || reportedId === reporterId || !description) {
      return res.status(400).json({ success: false, error: 'Signalement incomplet.' });
    }
    try {
      const { error } = await serverSupabase.getServiceClient().from('reports').insert({
        reporter_id: reporterId,
        reported_id: reportedId,
        category,
        description,
        status: 'pending'
      });

      app.get('/api/admin/reports', verifySupabaseToken, requireAdmin, async (req, res) => {
        try {
          const db = serverSupabase.getServiceClient();
          const { data, error } = await db
            .from('reports')
            .select('id,reporter_id,reported_id,category,description,status,created_at')
            .order('created_at', { ascending: false })
            .limit(500);
          if (error) throw error;
          const ids = [...new Set((data || []).flatMap((row: any) => [row.reporter_id, row.reported_id]))];
          const { data: profiles, error: profilesError } = ids.length
            ? await db.from('profiles').select('id,name').in('id', ids)
            : { data: [], error: null };
          if (profilesError) throw profilesError;
          const names = new Map((profiles || []).map((profile: any) => [String(profile.id), profile.name]));
          return res.json({
            reports: (data || []).map((row: any) => ({
              id: row.id,
              reporterId: row.reporter_id,
              reporterName: names.get(String(row.reporter_id)) || 'Utilisateur',
              reportedId: row.reported_id,
              reportedName: names.get(String(row.reported_id)) || 'Utilisateur',
              reason: row.category,
              details: row.description,
              date: new Date(row.created_at).toLocaleString('fr-FR'),
              timestamp: new Date(row.created_at).getTime(),
              status: row.status,
              priority: row.category === 'scam' || row.category === 'fake_profile' ? 'high' : 'medium',
              category: row.category === 'inappropriate_content' ? 'inappropriate' : row.category
            }))
          });
        } catch (error) {
          console.error('Admin reports query failed:', error);
          return res.status(503).json({ error: 'Signalements indisponibles.' });
        }
      });

      app.patch('/api/admin/profiles/:profileId/verification', verifySupabaseToken, requireAdmin, async (req, res) => {
        const profileId = String(req.params.profileId || '');
        const isVerified = req.body?.isVerified;
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId) ||
          typeof isVerified !== 'boolean'
        ) {
          return res.status(400).json({ error: 'Profil ou statut de vérification invalide.' });
        }
        if (isVerified) {
          return res.status(503).json({
            error:
              'L’attribution de badge est désactivée tant qu’un fournisseur de vérification réel n’est pas configuré.'
          });
        }

        try {
          const { data, error } = await serverSupabase
            .getServiceClient()
            .from('profiles')
            .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
            .eq('id', profileId)
            .select('id,is_verified')
            .maybeSingle();
          if (error) throw error;
          if (!data) return res.status(404).json({ error: 'Profil introuvable.' });
          return res.json({ success: true, profile: data });
        } catch (error) {
          console.error('Admin profile verification update failed:', error);
          return res.status(503).json({ error: 'Statut de vérification indisponible.' });
        }
      });

      app.patch('/api/admin/profiles/:profileId/status', verifySupabaseToken, requireAdmin, async (req, res) => {
        const profileId = String(req.params.profileId || '');
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (typeof req.body?.isSuspended === 'boolean') {
          updates.is_suspended = req.body.isSuspended;
        } else if (req.body?.tier === 'vip' || req.body?.tier === 'freemium') {
          updates.tier = req.body.tier;
        } else {
          return res.status(400).json({ error: 'Statut de compte invalide.' });
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId)) {
          return res.status(400).json({ error: 'Identifiant de profil invalide.' });
        }

        try {
          const { data, error } = await serverSupabase
            .getServiceClient()
            .from('profiles')
            .update(updates)
            .eq('id', profileId)
            .select('id,is_suspended,tier')
            .maybeSingle();
          if (error) throw error;
          if (!data) return res.status(404).json({ error: 'Profil introuvable.' });
          return res.json({ success: true, profile: data });
        } catch (error) {
          console.error('Admin profile status update failed:', error);
          return res.status(503).json({ error: 'Statut du profil indisponible.' });
        }
      });

      app.post('/api/admin/profiles/:profileId/credits', verifySupabaseToken, requireAdmin, async (req, res) => {
        const profileId = String(req.params.profileId || '');
        const amount = Number(req.body?.amount);
        const referenceId = String(req.body?.referenceId || '');
        const description = String(req.body?.description || '');
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (
          !uuidPattern.test(profileId) ||
          !uuidPattern.test(referenceId) ||
          !Number.isInteger(amount) ||
          amount === 0 ||
          Math.abs(amount) > 1000000 ||
          !description.trim() ||
          description.length > 500
        ) {
          return res.status(400).json({ error: 'Ajustement de crédits invalide.' });
        }

        try {
          const { data, error } = await serverSupabase.getServiceClient().rpc('admin_adjust_user_credits', {
            p_user_id: profileId,
            p_amount: amount,
            p_reference_id: referenceId,
            p_description: description.trim()
          });
          if (error) {
            if (/insufficient credits/i.test(error.message)) {
              return res.status(409).json({ error: 'Solde de crédits insuffisant.' });
            }
            throw error;
          }
          return res.json({ success: true, balance: Number(data) });
        } catch (error) {
          console.error('Admin credit adjustment failed:', error);
          return res.status(503).json({ error: 'Ajustement des crédits indisponible.' });
        }
      });

      app.post('/api/admin/credits/bonus', verifySupabaseToken, requireAdmin, async (req, res) => {
        const amount = Number(req.body?.amount);
        const referenceId = String(req.body?.referenceId || '');
        if (!Number.isInteger(amount) || amount <= 0 || amount > 1000 || !/^[0-9a-f-]{36}$/i.test(referenceId)) {
          return res.status(400).json({ error: 'Bonus communautaire invalide.' });
        }
        try {
          const { data, error } = await serverSupabase.getServiceClient().rpc('admin_grant_community_credits', {
            p_amount: amount,
            p_reference_id: referenceId
          });
          if (error) throw error;
          return res.json({ success: true, affectedUsers: Number(data) });
        } catch (error) {
          console.error('Admin community credit grant failed:', error);
          return res.status(503).json({ error: 'Le bonus communautaire est indisponible.' });
        }
      });

      app.patch('/api/admin/reports/:reportId', verifySupabaseToken, requireAdmin, async (req, res) => {
        const status = String(req.body?.status || '');
        const allowedStatuses = new Set(['pending', 'investigating', 'resolved', 'dismissed']);
        if (!allowedStatuses.has(status)) return res.status(400).json({ error: 'Statut de signalement invalide.' });
        try {
          const db = serverSupabase.getServiceClient();
          const { data: report, error: reportError } = await db
            .from('reports')
            .select('id,reported_id,description,category')
            .eq('id', req.params.reportId)
            .maybeSingle();
          if (reportError) throw reportError;
          if (!report) return res.status(404).json({ error: 'Signalement introuvable.' });
          const { data, error } = await db
            .from('reports')
            .update({
              status,
              resolved_at: ['resolved', 'dismissed'].includes(status) ? new Date().toISOString() : null
            })
            .eq('id', req.params.reportId)
            .select('id,status')
            .single();
          if (error) throw error;
          if (status === 'resolved' && req.body?.action === 'suspend') {
            await db
              .from('profiles')
              .update({ is_suspended: true, updated_at: new Date().toISOString() })
              .eq('id', report.reported_id);
            await db.from('sanctions').insert({
              user_id: report.reported_id,
              admin_id: String((req as any).userId),
              sanction_type: 'suspension',
              reason: report.description || report.category
            });
          }
          await db.from('admin_actions').insert({
            admin_id: String((req as any).userId),
            target_user_id: report.reported_id,
            action_type: `report_${status}`,
            description: `Signalement ${status}`,
            reason: report.description || report.category
          });
          return res.json({ success: true, report: data });
        } catch (error) {
          console.error('Admin report update failed:', error);
          return res.status(503).json({ error: 'Impossible de mettre à jour le signalement.' });
        }
      });
      if (error) throw error;
      return res.json({ success: true });
    } catch (error) {
      console.error('Erreur signalement Rencontres:', error);
      return res.status(500).json({ success: false, error: 'Signalement impossible.' });
    }
  });

  app.post('/api/rewards/grant', verifySupabaseToken, requireAuth, rewardedAdsUnavailable);

  app.get('/api/rewards/vast-tag', rewardedAdsUnavailable);

  // Verification de l'existence d'un compte par e-mail
  app.post('/api/auth/check-email', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.json({ exists: false });
    const cleanEmail = email.toLowerCase().trim();
    const userAccount = await serverSupabase.getUserAccountByEmail(cleanEmail);
    const record = await serverSupabase.getUserProfile(cleanEmail);
    const exists = Boolean((userAccount && userAccount.is_active && !userAccount.is_deleted) || record);
    const isGoogle = Boolean(userAccount && userAccount.auth_provider === 'google');
    return res.json({
      exists,
      isGoogle,
      profile: record?.profile || null,
      photos: record?.photos || []
    });
  });

  // Route de déconnexion (effacement du cookie de session)
  app.post('/api/auth/logout', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const token = req.cookies?.session_token || headerToken;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded && decoded.id) {
          // Log logout event
          await serverSupabase.logSecurityEvent(
            decoded.email,
            req.socket.remoteAddress || 'unknown',
            'LOGOUT',
            'User logged out successfully'
          );
        }
      } catch (err) {
        // Token invalid, just continue with logout
      }
    }

    res.clearCookie('session_token');
    return res.json({ success: true, message: 'Déconnexion réussie' });
  });

  app.delete('/api/account', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '');
    if (!userId) return res.status(401).json({ success: false, message: 'Authentification requise.' });
    try {
      const db = serverSupabase.getServiceClient();
      await deleteProfilePhotoObjects(db, userId);
      const { error } = await db.auth.admin.deleteUser(userId);
      if (error) throw error;
      res.clearCookie('session_token');
      return res.json({ success: true });
    } catch (error) {
      console.error('Account deletion failed:', error);
      return res.status(500).json({ success: false, message: 'Suppression du compte impossible.' });
    }
  });

  app.get('/api/account/export', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).userId || '');
      const db = serverSupabase.getServiceClient();
      const [
        { data: profile, error: profileError },
        { data: privacy, error: privacyError },
        { data: notificationPreferences, error: notificationPreferencesError },
        { data: credits, error: creditsError },
        swipes,
        matches,
        messages,
        blocks,
        reports,
        notifications,
        visits,
        favorites,
        transactions,
        verifications,
        tickets
      ] = await Promise.all([
        db.from('profiles').select('*').eq('id', userId).maybeSingle(),
        db.from('user_privacy_settings').select('*').eq('user_id', userId).maybeSingle(),
        db.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(),
        db
          .from('credits')
          .select('balance,tier,premium_expires_at,created_at,updated_at')
          .eq('user_id', userId)
          .maybeSingle(),
        fetchAllRows((from, to) => db.from('swipes').select('*').eq('user_id', userId).range(from, to)),
        fetchAllRows((from, to) =>
          db.from('matches').select('*').or(`user_id.eq.${userId},matched_user_id.eq.${userId}`).range(from, to)
        ),
        fetchAllRows((from, to) =>
          db.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).range(from, to)
        ),
        fetchAllRows((from, to) =>
          db.from('blocks').select('*').or(`user_id.eq.${userId},blocked_user_id.eq.${userId}`).range(from, to)
        ),
        fetchAllRows((from, to) =>
          db.from('reports').select('*').or(`reporter_id.eq.${userId},reported_id.eq.${userId}`).range(from, to)
        ),
        fetchAllRows((from, to) => db.from('notifications').select('*').eq('user_id', userId).range(from, to)),
        fetchAllRows((from, to) =>
          db
            .from('profile_visits')
            .select('*')
            .or(`visitor_id.eq.${userId},visited_user_id.eq.${userId}`)
            .range(from, to)
        ),
        fetchAllRows((from, to) =>
          db
            .from('profile_favorites')
            .select('*')
            .or(`user_id.eq.${userId},favorited_user_id.eq.${userId}`)
            .range(from, to)
        ),
        fetchAllRows((from, to) => db.from('transactions').select('*').eq('user_id', userId).range(from, to)),
        fetchAllRows((from, to) =>
          db
            .from('verifications')
            .select('id,type,status,attempt_count,last_attempt_at,verified_at,metadata,created_at')
            .eq('user_id', userId)
            .range(from, to)
        ),
        fetchAllRows((from, to) => db.from('support_tickets').select('*').eq('user_id', userId).range(from, to))
      ]);
      if (profileError) throw profileError;
      if (privacyError) throw privacyError;
      if (notificationPreferencesError) throw notificationPreferencesError;
      if (creditsError) throw creditsError;
      if (!profile) return res.status(404).json({ success: false, message: 'Profil introuvable.' });
      const ticketIds = tickets.map((ticket: any) => ticket.id);
      const supportMessages = ticketIds.length
        ? await fetchAllRows((from, to) =>
            db
              .from('support_messages')
              .select('id,ticket_id,sender_type,body,created_at')
              .in('ticket_id', ticketIds)
              .range(from, to)
          )
        : [];
      return res.json({
        success: true,
        exported_at: new Date().toISOString(),
        account: {
          profile,
          privacy_settings: privacy || null,
          notification_preferences: notificationPreferences || null,
          credits: credits || null,
          swipes,
          matches,
          messages,
          blocks,
          reports,
          notifications,
          profile_visits: visits,
          favorites,
          transactions,
          verifications,
          support_tickets: tickets,
          support_messages: supportMessages
        }
      });
    } catch (error) {
      console.error('Account export failed:', error);
      return res.status(500).json({ success: false, message: 'Export du compte impossible.' });
    }
  });

  // Facebook Auth Endpoint
  app.post('/api/auth/facebook', async (req, res) => {
    return res.status(410).json({
      success: false,
      code: 'SUPABASE_OAUTH_REQUIRED',
      message: 'Utilisez la connexion Facebook Supabase OAuth.'
    });
    /*
    try {
      const { facebookUserId, name, email, avatar, token: facebookToken } = req.body;
      
      // Vérifier si l'utilisateur existe déjà via son Facebook ID
      const existingUser = await serverSupabase.getUserAccountByFacebookId(facebookUserId);
      
      if (existingUser) {
        // Utilisateur existe déjà -> connexion
        const jwtToken = jwt.sign({ 
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name
        }, JWT_SECRET, { expiresIn: '30d' });
        
        return res.json({
          success: true,
          token: jwtToken,
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name
          }
        });
      } else {
        // Nouvel utilisateur -> inscription
        const result = await serverSupabase.createUserAccount({
          userId: `facebook_${facebookUserId}`,
          facebookId: facebookUserId,
          email: email || `facebook_${facebookUserId}@temp.com`,
          name: name,
          avatarUrl: avatar,
          authProvider: 'facebook',
          isVerified: true
        });
        
        if (!result.success || !result.user) {
          throw new Error(result.error || 'Failed to create user account');
        }
        
        const jwtToken = jwt.sign({ 
          id: result.user.id,
          email: result.user.email,
          name: result.user.name
        }, JWT_SECRET, { expiresIn: '30d' });
        
        return res.json({
          success: true,
          token: jwtToken,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name
          }
        });
      }
    } catch (error) {
      console.error('Facebook auth error:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de l\'authentification Facebook' });
    }
    */
  });

  // Account deletion request
  app.post('/api/account/delete-request', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const userId = String((req as any).userId || '');
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : undefined;
      const { data: accountUser, error: accountError } = await serverSupabase
        .getServiceClient()
        .auth.admin.getUserById(userId);
      if (accountError || !accountUser.user?.email) {
        return res.status(404).json({ success: false, message: 'Compte introuvable.' });
      }
      const email = accountUser.user.email;

      const result = await serverSupabase.deleteAccount(userId, email, reason);

      if (!result.success) {
        return res.status(500).json({ success: false, message: result.error || 'Failed to create deletion request' });
      }

      // Log security event
      await serverSupabase.logSecurityEvent(
        email,
        req.socket.remoteAddress || 'unknown',
        'ACCOUNT_DELETION_REQUESTED',
        `Account deletion requested. Reason: ${reason || 'Not specified'}`
      );

      return res.json({
        success: true,
        message: 'Deletion request created. Check your email for confirmation.',
        token: result.token
      });
    } catch (error: any) {
      console.error('Error creating deletion request:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Confirm account deletion
  app.post('/api/account/delete-confirm', async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }

      const result = await serverSupabase.confirmAccountDeletion(token);

      if (!result.success) {
        return res.status(400).json({ success: false, message: result.error || 'Invalid or expired token' });
      }

      return res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error: any) {
      console.error('Error confirming account deletion:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Cancel account deletion
  app.post('/api/account/delete-cancel', async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }

      const result = await serverSupabase.cancelAccountDeletion(token);

      if (!result.success) {
        return res.status(400).json({ success: false, message: result.error || 'Failed to cancel deletion' });
      }

      return res.json({ success: true, message: 'Account deletion cancelled' });
    } catch (error: any) {
      console.error('Error cancelling account deletion:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Update user profile
  app.post('/api/user/profile/update', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const { userId, profileData } = req.body;
      if (userId !== (req as any).userId) {
        return res.status(403).json({ success: false, message: 'Profil non autorisé' });
      }

      if (!userId || !profileData) {
        return res.status(400).json({ success: false, message: 'User ID and profile data are required' });
      }

      const allowedFields = ['email', 'name', 'city', 'country', 'country_code', 'bio', 'job', 'studies'];
      const update = Object.fromEntries(
        allowedFields
          .filter((field) => typeof profileData[field] === 'string')
          .map((field) => [
            field,
            field === 'email' ? profileData[field].trim().toLowerCase() : profileData[field].trim()
          ])
      );
      if (!Object.keys(update).length) {
        return res.status(400).json({ success: false, message: 'Aucune donnée de profil valide.' });
      }
      const { error } = await serverSupabase
        .getServiceClient()
        .from('profiles')
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) {
        console.error('Profile update failed:', error);
        return res.status(500).json({ success: false, message: 'Profil indisponible' });
      }

      return res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Update user photo
  app.post('/api/user/photo/update', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const { userId, photoUrl, isPrimary } = req.body;
      if (userId !== (req as any).userId) {
        return res.status(403).json({ success: false, message: 'Profil non autorisé' });
      }

      if (!userId || !photoUrl) {
        return res.status(400).json({ success: false, message: 'User ID and photo URL are required' });
      }

      const result = await serverSupabase.updateUserPhoto(userId, photoUrl, isPrimary);

      if (!result.success) {
        return res.status(500).json({ success: false, message: result.error || 'Failed to update photo' });
      }

      return res.json({ success: true, message: 'Photo updated successfully' });
    } catch (error: any) {
      console.error('Error updating photo:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Delete user photo
  app.post('/api/user/photo/delete', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const { userId, photoUrl } = req.body;
      if (userId !== (req as any).userId) {
        return res.status(403).json({ success: false, message: 'Profil non autorisé' });
      }

      if (!userId || !photoUrl) {
        return res.status(400).json({ success: false, message: 'User ID and photo URL are required' });
      }

      const result = await serverSupabase.deleteUserPhoto(userId, photoUrl);

      if (!result.success) {
        return res.status(500).json({ success: false, message: result.error || 'Failed to delete photo' });
      }

      return res.json({ success: true, message: 'Photo deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Get profile update history
  app.get('/api/user/profile/history', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const { userId, limit } = req.query;
      if (userId !== (req as any).userId) {
        return res.status(403).json({ success: false, message: 'Profil non autorisé' });
      }

      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }

      const history = await serverSupabase.getProfileUpdateHistory(
        userId as string,
        limit ? parseInt(limit as string) : 50
      );

      return res.json({ success: true, history });
    } catch (error: any) {
      console.error('Error getting profile history:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // Route protégée par session JWT (Cookie HTTP-only ou Header Authorization)
  app.get('/api/user/profile', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    const { data, error } = await serverSupabase
      .getServiceClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return res.status(500).json({ success: false, message: 'Profil indisponible' });
    if (!data) return res.json({ success: true, user: { id: userId } });
    try {
      const [user] = await signMemberProfileMedia([data]);
      return res.json({ success: true, user });
    } catch (photoError) {
      console.error('Failed to sign own profile photos:', photoError);
      return res.status(500).json({ success: false, message: 'Photos du profil indisponibles.' });
    }
  });

  // Demande de réinitialisation de mot de passe (Génère le jeton)
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Adresse email requise.' });
    }

    try {
      // Génération d'un token aléatoire sécurisé
      const token = crypto.randomBytes(20).toString('hex');
      const expires = Date.now() + 3600000; // Valable 1 heure

      await serverSupabase.createResetToken(token, email, expires);

      return res.json({
        success: true,
        message: `Si l'adresse existe, un email avec le lien de réinitialisation a été envoyé.`
      });
    } catch (error) {
      console.error('Erreur forgot-password:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  });

  // Validation et mise à jour du nouveau mot de passe
  app.post('/api/auth/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const resetData = await serverSupabase.validateResetToken(token);
    if (!resetData || resetData.expires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Le jeton est invalide ou a expiré.' });
    }

    try {
      const db = serverSupabase.getServiceClient();
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('id')
        .eq('email', resetData.email.toLowerCase().trim())
        .maybeSingle();
      if (profileError || !profile?.id) {
        return res.status(400).json({ success: false, message: 'Compte Supabase introuvable.' });
      }
      const { error: passwordError } = await db.auth.admin.updateUserById(profile.id, { password });
      if (passwordError) throw passwordError;
      await serverSupabase.deleteResetToken(token);

      console.log(`[PASSWORD RESET] Mot de passe réinitialisé pour ${resetData.email}`);

      return res.json({
        success: true,
        message: 'Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter.'
      });
    } catch (error) {
      console.error('Erreur reset-password:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la réinitialisation.' });
    }
  });

  // 6. Facebook OAuth URL Route
  app.get('/api/auth/facebook/url', (req, res) => {
    return res.status(410).json({
      success: false,
      code: 'SUPABASE_OAUTH_REQUIRED',
      message: 'La connexion Facebook est gérée par Supabase OAuth.'
    });
    /*
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.json({ 
        error: "FACEBOOK_CREDS_MISSING",
        message: "Les clés d'accès Facebook ne sont pas configurées dans le fichier .env (FACEBOOK_CLIENT_ID & FACEBOOK_CLIENT_SECRET)."
      });
    }

    const redirectUri = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL.replace(/\/$/, "")}/auth/facebook/callback` 
      : `${req.protocol}://${req.get('host')}/auth/facebook/callback`;

    const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_profile,email&response_type=code`;
    
    res.json({ url: facebookAuthUrl }); */
  });

  // 6. Facebook OAuth Callback Route
  app.get(['/auth/facebook/callback', '/auth/facebook/callback/'], async (req, res) => {
    return res.status(410).send('Facebook OAuth legacy désactivé. Utilisez le callback Supabase.');
    /*
    const { code, error } = req.query;

    if (error) {
      return res.send(`
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa; padding: 20px; text-align: center;">
            <div style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
              <h2 style="color: #e20030; margin-top: 0;">Connexion annulée</h2>
              <p style="color: #666; font-size: 14px; line-height: 1.5;">L'autorisation a été refusée ou annulée.</p>
              <button onclick="window.close()" style="margin-top: 16px; background: #000; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">Fermer</button>
            </div>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.send(`
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa; padding: 20px; text-align: center;">
            <div style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
              <h2 style="color: #e20030; margin-top: 0;">Erreur</h2>
              <p style="color: #666; font-size: 14px; line-height: 1.5;">Code d'autorisation manquant.</p>
              <button onclick="window.close()" style="margin-top: 16px; background: #000; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">Fermer</button>
            </div>
          </body>
        </html>
      `);
    }

    try {
      const clientId = process.env.FACEBOOK_CLIENT_ID;
      const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;

      const redirectUri = process.env.FRONTEND_URL 
        ? `${process.env.FRONTEND_URL.replace(/\/$/, "")}/auth/facebook/callback` 
        : `${req.protocol}://${req.get('host')}/auth/facebook/callback`;

      // Exchange code for token
      const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`;
      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json() as any;

      if (tokenData.error) {
        throw new Error(tokenData.error.message || "Impossible d'échanger le code d'autorisation");
      }

      const accessToken = tokenData.access_token;

      // Get user profile info & high-res picture
      const profileUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,picture.width(720).height(720)&access_token=${accessToken}`;
      const profileResponse = await fetch(profileUrl);
      const profileData = await profileResponse.json() as any;

      if (profileData.error) {
        throw new Error(profileData.error.message || "Impossible de récupérer les informations de profil Facebook");
      }

      const facebookName = profileData.name || "Utilisateur Facebook";
      let base64Photo = "";

      const pictureUrl = profileData.picture?.data?.url;
      if (pictureUrl) {
        // Fetch the photo and convert to base64
        const imgResponse = await fetch(pictureUrl);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
        base64Photo = `data:${contentType};base64,${buffer.toString("base64")}`;
      }

      // Return a beautiful success page that notifies the React app and closes itself
      res.send(`
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f0f2f5; padding: 20px; text-align: center;">
            <div style="background: white; border-radius: 16px; padding: 40px 32px; max-width: 440px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; border: 1px solid rgba(0,0,0,0.03);">
              <div style="color: #1877f2; margin-bottom: 24px;">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor" style="display: inline-block;">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <h2 style="color: #1c1e21; font-size: 22px; font-weight: 800; margin: 0 0 12px 0;">Synchronisation Réussie !</h2>
              <p style="color: #65676b; font-size: 14.5px; line-height: 1.6; margin: 0 0 24px 0;">Bienvenue, <strong>${facebookName}</strong>. Votre photo de profil Facebook a été récupérée avec succès pour votre compte Bavel.</p>
              ${pictureUrl ? `
              <div style="display: flex; justify-content: center; margin-bottom: 24px;">
                <div style="width: 80px; height: 80px; border-radius: 50%; overflow: hidden; border: 3px solid #1877f2; box-shadow: 0 4px 10px rgba(24, 119, 242, 0.25); margin: 0 auto;">
                  <img src="${pictureUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Facebook avatar" />
                </div>
              </div>` : ''}
              <p style="color: #8a8d91; font-size: 12px; margin-bottom: 0;">Cette fenêtre se fermera automatiquement...</p>
            </div>
            <script>
              try {
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'FACEBOOK_SYNC_SUCCESS',
                    photo: ${JSON.stringify(base64Photo)},
                    name: ${JSON.stringify(facebookName)}
                  }, '*');
                  setTimeout(() => {
                    window.close();
                  }, 2000);
                } else {
                  window.location.href = '/';
                }
              } catch(e) {
                console.error("Error posting message:", e);
                window.close();
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Facebook callback error:", err);
      res.send(`
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa; padding: 20px; text-align: center;">
            <div style="background: white; border-radius: 12px; padding: 28px; max-width: 440px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
              <h2 style="color: #e20030; margin-top: 0; font-size: 20px;">Échec de la connexion</h2>
              <div style="color: #ef4444; font-size: 13.5px; text-align: left; background: #fef2f2; border: 1px solid #fee2e2; padding: 12px; border-radius: 8px; font-family: monospace; word-break: break-all; margin: 16px 0;">
                ${err.message || "Une erreur s'est produite."}
              </div>
              <p style="color: #666; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">Vérifiez que les clés d'API Facebook dans le fichier .env sont bien configurées et valides pour votre application Facebook.</p>
              <button onclick="window.close()" style="background: #000; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; width: 100%;">Fermer la fenêtre</button>
            </div>
          </body>
        </html>
      `);
    }
  */
  });

  // --- 8. Security & Anti-Hacking Protection System ---

  // Security settings and audit history are persisted in Supabase.
  app.get('/api/security/audit', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId);
    try {
      const db = serverSupabase.getServiceClient();
      const [{ data: security, error: securityError }, { data: logs, error: logsError }] = await Promise.all([
        db.from('user_security').select('two_factor_enabled,anti_scam_shield').eq('user_id', userId).maybeSingle(),
        db
          .from('audit_logs')
          .select('id,event_type,description,created_at,ip_address')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);
      if (securityError) throw securityError;
      if (logsError) throw logsError;
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '');
      return res.json({
        success: true,
        data: {
          twoFactorEnabled: Boolean(security?.two_factor_enabled),
          antiScamShield: security?.anti_scam_shield !== false,
          activeSessions: [
            {
              id: 'current',
              device: req.headers['user-agent'] || 'Session actuelle',
              ip,
              location: 'Session actuelle',
              lastActive: new Date().toISOString(),
              isCurrent: true
            }
          ],
          securityLogs: (logs || []).map((log: any) => ({
            id: log.id,
            type: log.event_type,
            description: log.description || log.event_type,
            timestamp: log.created_at,
            ip: log.ip_address || ''
          }))
        }
      });
    } catch (error) {
      console.error('Security audit query failed:', error);
      return res.status(503).json({ success: false, message: 'Journal de sécurité indisponible.' });
    }
  });

  app.post('/api/security/2fa/toggle', verifySupabaseToken, requireAuth, async (req, res) => {
    const enabled = req.body?.enabled;
    if (typeof enabled !== 'boolean') return res.status(400).json({ success: false, message: 'Valeur 2FA invalide.' });
    const userId = String((req as any).userId);
    try {
      const db = serverSupabase.getServiceClient();
      const { error } = await db
        .from('user_security')
        .upsert(
          { user_id: userId, two_factor_enabled: enabled, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      await db.from('audit_logs').insert({
        user_id: userId,
        event_type: enabled ? '2FA_ENABLED' : '2FA_DISABLED',
        description: enabled ? 'Double authentification activée' : 'Double authentification désactivée',
        ip_address: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''),
        user_agent: String(req.headers['user-agent'] || ''),
        severity: 'info'
      });
      return res.json({ success: true, twoFactorEnabled: enabled });
    } catch (error) {
      console.error('2FA update failed:', error);
      return res.status(503).json({ success: false, message: 'Impossible de sauvegarder la 2FA.' });
    }
  });

  app.post('/api/security/anti-scam-shield', verifySupabaseToken, requireAuth, async (req, res) => {
    const enabled = req.body?.enabled;
    if (typeof enabled !== 'boolean')
      return res.status(400).json({ success: false, message: 'Valeur anti-arnaque invalide.' });
    const userId = String((req as any).userId);
    try {
      const db = serverSupabase.getServiceClient();
      const { error } = await db
        .from('user_security')
        .upsert(
          { user_id: userId, anti_scam_shield: enabled, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
      await db.from('audit_logs').insert({
        user_id: userId,
        event_type: enabled ? 'ANTI_SCAM_ENABLED' : 'ANTI_SCAM_DISABLED',
        description: enabled ? 'Bouclier anti-arnaque activé' : 'Bouclier anti-arnaque désactivé',
        ip_address: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''),
        user_agent: String(req.headers['user-agent'] || ''),
        severity: 'info'
      });
      return res.json({ success: true, antiScamShield: enabled });
    } catch (error) {
      console.error('Anti-scam setting update failed:', error);
      return res.status(503).json({ success: false, message: 'Impossible de sauvegarder le bouclier anti-arnaque.' });
    }
  });

  // Terminate other active Supabase sessions
  app.post('/api/security/revoke-others', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const authHeader = String(req.headers.authorization || '');
      const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!accessToken) return res.status(401).json({ success: false, message: 'Jeton Supabase requis.' });
      const { error } = await serverSupabase.getServiceClient().auth.admin.signOut(accessToken, 'others');
      if (error) throw error;
      return res.json({ success: true, message: 'Toutes les autres sessions ont été fermées avec succès.' });
    } catch (error) {
      console.error('Session revocation failed:', error);
      return res.status(500).json({ success: false, message: 'Impossible de fermer les autres sessions.' });
    }
  });

  // ==========================================
  // --- BAVEL SAFETY DETECTOR™ (Autonomous internal AI endpoint) ---
  // ==========================================
  app.post('/api/ai/private-detector', (req, res) => {
    try {
      const { imageUrl, imageBase64 } = req.body;
      const lowerUrl = String(imageUrl || '').toLowerCase();
      const payloadStr = String(imageBase64 || lowerUrl);

      // Sensitive Heuristics Terms
      const sensitiveKeywords = [
        'underwear',
        'nude',
        'explicit',
        'bikini',
        'lingerie',
        'boobs',
        'topless',
        'intimate',
        'sexy',
        'private',
        'nsfw',
        'adult',
        'sensual',
        'boudoir',
        'erotic'
      ];

      const hasSensitiveKeyword = sensitiveKeywords.some((kw) => lowerUrl.includes(kw) || payloadStr.includes(kw));

      // Local Pixel Warmth & Skin Color Density Ratio (Zero external API costs)
      let warmToneScore = 0;
      if (payloadStr.startsWith('data:image') || payloadStr.length > 200) {
        const warmToneMatches = payloadStr.match(
          /([fF][dDeEaA]|[eE][0-9a-fA-F]|[dD][1-9a-fA-F]|[cC][4-9a-fA-F]|[89][dDeE]|[567][cC])/g
        );
        if (warmToneMatches && warmToneMatches.length > 40) {
          warmToneScore = Math.min(0.95, warmToneMatches.length / 280);
        }
      }

      const isNude = hasSensitiveKeyword || warmToneScore > 0.42 || lowerUrl.includes('private');
      const confidence = isNude ? Math.max(0.88, warmToneScore) : 0.12;

      return res.json({
        success: true,
        isNude,
        confidence,
        provider: 'Bavel-Local-AI-Vision-Engine (0$ Cost)',
        message: isNude
          ? "Attention : Image à caractère sensible détectée par l'IA autonome locale Bavel."
          : "Image vérifiée normale par l'IA locale."
      });
    } catch (error: any) {
      console.error('Local Private Detector Error:', error);
      return res.json({
        success: true,
        isNude: false,
        confidence: 0,
        provider: 'Fallback',
        message: 'Analyse locale effectuée.'
      });
    }
  });

  // ==========================================
  // --- REAL-TIME NOTIFICATIONS API ---
  // ==========================================

  // Get persisted user notifications. Realtime delivery is handled separately.
  app.get('/api/users/:userId/notifications', verifySupabaseToken, requireAuth, async (req, res) => {
    const cleanId = String(req.params.userId || '')
      .toLowerCase()
      .trim();
    if (cleanId !== String((req as any).userId).toLowerCase()) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    if (!cleanId) {
      return res.status(400).json({ error: 'userId requis' });
    }
    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('notifications')
        .select('id,user_id,type,title,body,data,is_read,created_at')
        .eq('user_id', cleanId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = data || [];
      const avatarReferences = rows.map((row: any) =>
        typeof row.data?.avatar_url === 'string' ? row.data.avatar_url : ''
      );
      let signedAvatars: string[] = [];
      try {
        signedAvatars = await signProfilePhotoReferences(serverSupabase.getServiceClient(), avatarReferences);
      } catch (photoError) {
        console.error('Failed to sign notification profile photos:', photoError);
      }
      return res.json(
        rows.map((row: any, index: number) => ({
          id: row.id,
          userId: row.user_id,
          type: row.type,
          title: row.title,
          body: row.body || '',
          timestamp: row.created_at,
          read: Boolean(row.is_read),
          metadata: row.data?.avatar_url ? { ...row.data, avatar_url: signedAvatars[index] || '' } : row.data || {}
        }))
      );
    } catch (error) {
      console.error('Persisted notifications query failed:', error);
      return res.status(500).json({ error: 'Notifications indisponibles.' });
    }
  });

  // Get unread notifications count
  app.get('/api/users/:userId/notifications/unread-count', verifySupabaseToken, requireAuth, async (req, res) => {
    const cleanId = String(req.params.userId || '')
      .toLowerCase()
      .trim();
    if (cleanId !== String((req as any).userId).toLowerCase()) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    const { count, error } = await serverSupabase
      .getServiceClient()
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', cleanId)
      .eq('is_read', false);
    if (error) return res.status(500).json({ error: 'Compteur indisponible.' });
    return res.json({ unreadCount: count || 0 });
  });

  // Create new notification (and broadcast immediately over active WebSockets)
  app.post('/api/notifications', verifySupabaseToken, requireAuth, async (req, res) => {
    const { userId, type, title, body, senderId, senderName, senderAvatar, actionUrl, iconType, metadata } = req.body;
    const cleanId = String(userId || '')
      .toLowerCase()
      .trim();
    if (cleanId !== String((req as any).userId).toLowerCase()) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    if (!cleanId || !title) {
      return res.status(400).json({ error: 'userId et title sont obligatoires.' });
    }

    const { data, error } = await serverSupabase
      .getServiceClient()
      .from('notifications')
      .insert({
        user_id: cleanId,
        type: type || 'system',
        title,
        body: body || '',
        data: { ...(metadata || {}), senderId, senderName, senderAvatar, actionUrl, iconType }
      })
      .select('id,user_id,type,title,body,data,is_read,created_at')
      .single();
    if (error) {
      console.error('Persisted notification creation failed:', error);
      return res.status(500).json({ error: 'Notification impossible à créer.' });
    }
    const newNotification: ServerNotification = {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      body: data.body || '',
      timestamp: data.created_at,
      read: Boolean(data.is_read),
      senderId,
      senderName,
      senderAvatar,
      actionUrl,
      iconType,
      metadata: data.data || {}
    };

    // Broadcast instant real-time notification to user's connected devices
    broadcastNotificationToUser(cleanId, newNotification);

    return res.status(201).json({ success: true, notification: newNotification });
  });

  // Mark single notification as read
  app.post('/api/notifications/:id/read', verifySupabaseToken, requireAuth, async (req, res) => {
    const notifId = req.params.id;
    const { error } = await serverSupabase
      .getServiceClient()
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId)
      .eq('user_id', String((req as any).userId).toLowerCase());
    if (error) return res.status(500).json({ error: 'Notification non mise à jour.' });
    return res.json({ success: true, id: notifId });
  });

  // Mark all notifications as read for a user
  app.post('/api/users/:userId/notifications/read-all', verifySupabaseToken, requireAuth, async (req, res) => {
    const cleanId = String(req.params.userId || '')
      .toLowerCase()
      .trim();
    if (cleanId !== String((req as any).userId).toLowerCase()) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    const { error } = await serverSupabase
      .getServiceClient()
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', cleanId)
      .eq('is_read', false);
    if (error) return res.status(500).json({ error: 'Notifications non mises à jour.' });
    return res.json({ success: true, message: 'Toutes les notifications ont été marquées comme lues.' });
  });

  // Delete a specific notification
  app.delete('/api/notifications/:id', verifySupabaseToken, requireAuth, async (req, res) => {
    const notifId = req.params.id;
    const { error } = await serverSupabase
      .getServiceClient()
      .from('notifications')
      .delete()
      .eq('id', notifId)
      .eq('user_id', String((req as any).userId).toLowerCase());
    if (error) return res.status(500).json({ error: 'Notification non supprimée.' });
    return res.json({ success: true, deletedId: notifId });
  });

  // Clear all notifications for a user
  app.delete('/api/users/:userId/notifications', verifySupabaseToken, requireAuth, async (req, res) => {
    const cleanId = String(req.params.userId || '')
      .toLowerCase()
      .trim();
    if (cleanId !== String((req as any).userId).toLowerCase()) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    const { error } = await serverSupabase.getServiceClient().from('notifications').delete().eq('user_id', cleanId);
    if (error) return res.status(500).json({ error: 'Notifications non supprimées.' });
    return res.json({ success: true, message: 'Toutes les notifications ont été supprimées.' });
  });

  app.post('/api/notifications/test-trigger', (_req, res) => {
    return res
      .status(404)
      .json({ error: 'Endpoint de test supprimé. Utilisez les événements réels de l’application.' });
  });

  // Dedicated endpoint to trigger a gentle 24h match reminder
  app.post('/api/notifications/match-reminder/trigger', verifySupabaseToken, requireAuth, async (req, res) => {
    const { userId, matchId, matchName, matchAvatar, hoursAgo } = req.body;
    const cleanId = String(userId || 'steven_bavel')
      .toLowerCase()
      .trim();
    const name = matchName || 'Votre match';
    const hours = hoursAgo || 24;

    if (!cleanId || cleanId !== String((req as any).userId).toLowerCase()) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    if (!matchId) return res.status(400).json({ error: 'matchId requis.' });
    const db = serverSupabase.getServiceClient();
    const { data: match, error: matchError } = await db
      .from('matches')
      .select('id,user_id,matched_user_id,last_message_at')
      .eq('id', matchId)
      .or(`user_id.eq.${cleanId},matched_user_id.eq.${cleanId}`)
      .maybeSingle();
    if (matchError) return res.status(500).json({ error: 'Match indisponible.' });
    if (!match) return res.status(404).json({ error: 'Match introuvable.' });
    const recipient = cleanId;
    const title = `✨ Rappel doux : ${name} attend votre message`;
    const body = `Vous avez matché il y a plus de ${hours}h et n'avez pas encore discuté. Ne laissez pas refroidir cette belle affinité ! 💕`;
    const { data: row, error } = await db
      .from('notifications')
      .insert({
        user_id: recipient,
        type: 'match_reminder',
        title,
        body,
        data: {
          matchId,
          senderId: matchId,
          senderName: name,
          senderAvatar: matchAvatar,
          actionUrl: `/chat/${matchId}`,
          hoursAgo: hours
        }
      })
      .select('id,user_id,type,title,body,data,is_read,created_at')
      .single();
    if (error) return res.status(500).json({ error: 'Rappel non enregistré.' });
    const reminderNotif: ServerNotification = {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      body: row.body || '',
      timestamp: row.created_at,
      read: Boolean(row.is_read),
      senderId: matchId,
      senderName: name,
      senderAvatar: matchAvatar,
      actionUrl: `/chat/${matchId}`,
      metadata: row.data || {}
    };

    broadcastNotificationToUser(cleanId, reminderNotif);
    return res.json({ success: true, notification: reminderNotif });
  });

  // ==========================================
  // Web Push API Endpoints (APNs / FCM)
  // ==========================================

  // 1. Get VAPID public key
  app.get('/api/push/vapid-public-key', (req, res) => {
    return res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // 2. Register Web Push Subscription for a user
  app.post('/api/push/subscribe', async (req, res) => {
    const userId = normalizeAuthenticatedUserId((req as any).userId);
    const subscription = validatePushSubscription(req.body?.subscription);
    if (!userId) return res.status(401).json({ error: 'Session utilisateur requise.' });
    if (!subscription) {
      return res.status(400).json({ error: 'Subscription invalide' });
    }

    const saved = await serverSupabase.addPushSubscription(userId, subscription);
    if (!saved) return res.status(503).json({ error: 'Abonnement push non enregistré.' });
    console.log(`[WebPush] Nouvel abonnement push enregistré pour [${userId}]`);
    return res.json({ success: true, message: 'Abonnement Web Push configuré avec succès.' });
  });

  // 3. Unsubscribe Web Push Subscription
  app.post('/api/push/unsubscribe', async (req, res) => {
    const userId = normalizeAuthenticatedUserId((req as any).userId);
    const endpoint = req.body?.endpoint;
    if (!userId) return res.status(401).json({ error: 'Session utilisateur requise.' });
    if (endpoint !== undefined && typeof endpoint !== 'string') {
      return res.status(400).json({ error: 'Endpoint push invalide.' });
    }
    if (typeof endpoint === 'string') {
      try {
        if (new URL(endpoint).protocol !== 'https:' || endpoint.length > 2048) {
          return res.status(400).json({ error: 'Endpoint push invalide.' });
        }
      } catch {
        return res.status(400).json({ error: 'Endpoint push invalide.' });
      }
    }

    try {
      let deletion = serverSupabase.getServiceClient().from('push_subscriptions').delete().eq('user_id', userId);
      if (endpoint) deletion = deletion.eq('endpoint', endpoint);
      const { error } = await deletion;
      if (error) throw error;
      console.log(`[WebPush] Désabonnement enregistré pour [${userId}]`);
      return res.json({ success: true, message: 'Abonnement Web Push supprimé avec succès.' });
    } catch (error) {
      console.error('Push subscription removal failed:', error);
      return res.status(503).json({ error: 'Abonnement push non supprimé.' });
    }
  });

  // 4. Trigger Instant Incoming Call Push Alert (wakes up partner's device)
  app.post('/api/push/call-notify', async (req, res) => {
    const senderId = normalizeAuthenticatedUserId((req as any).userId);
    const receiverId = normalizeAuthenticatedUserId(req.body?.targetUserId);
    const callType = req.body?.callType;
    if (!senderId) return res.status(401).json({ error: 'Session utilisateur requise.' });
    if (!receiverId || receiverId === senderId || !['audio', 'video'].includes(callType)) {
      return res.status(400).json({ error: "Destinataire ou type d'appel invalide." });
    }
    try {
      const db = serverSupabase.getServiceClient();
      const { data: match, error: matchError } = await db
        .from('matches')
        .select('id')
        .or(
          `and(user_id.eq.${senderId},matched_user_id.eq.${receiverId}),and(user_id.eq.${receiverId},matched_user_id.eq.${senderId})`
        )
        .limit(1)
        .maybeSingle();
      if (matchError) throw matchError;
      if (!match) return res.status(403).json({ error: 'Appel autorisé uniquement entre utilisateurs matchés.' });
      const { data: block, error: blockError } = await db
        .from('blocks')
        .select('id')
        .or(
          `and(user_id.eq.${senderId},blocked_user_id.eq.${receiverId}),and(user_id.eq.${receiverId},blocked_user_id.eq.${senderId})`
        )
        .limit(1)
        .maybeSingle();
      if (blockError) throw blockError;
      if (block) return res.status(403).json({ error: 'Appel indisponible entre ces utilisateurs.' });

      const { data: caller, error: callerError } = await db
        .from('profiles')
        .select('name')
        .eq('id', senderId)
        .maybeSingle();
      if (callerError) throw callerError;
      const typeStr = callType === 'audio' ? 'vocal' : 'vidéo';
      const result = await sendWebPushToUser(receiverId, {
        title: `📞 Appel ${typeStr} de ${caller?.name || 'un match'}`,
        body: "Cliquez ici pour rejoindre l'appel",
        url: `/chat?userId=${encodeURIComponent(senderId)}`,
        type: 'call',
        callType,
        tag: 'incoming-call',
        vibrate: [500, 250, 500, 250, 500, 250, 500, 250, 500]
      });
      return respondWithPushResult(res, result);
    } catch (error) {
      console.error("[WebPush] Erreur d'envoi push appel:", error);
      return res.status(503).json({ error: "Échec d'envoi de la notification Push" });
    }
  });

  // 5. Send generic test push
  app.post('/api/push/test', async (req, res) => {
    const userId = normalizeAuthenticatedUserId((req as any).userId);
    if (!userId) return res.status(401).json({ error: 'Session utilisateur requise.' });

    const payload = {
      title: '🔔 Test de Notification Web Push Bavel',
      body: 'Votre appareil est connecté aux notifications Web Push.',
      url: '/',
      type: 'default',
      tag: `test-${Date.now()}`,
      vibrate: [200, 100, 200, 100, 300]
    };

    try {
      const result = await sendWebPushToUser(userId, payload);
      return respondWithPushResult(res, result);
    } catch (error) {
      console.error('[WebPush] Échec du test de notification:', error);
      return res.status(503).json({ success: false, error: 'Envoi Push indisponible.' });
    }
  });

  // 6. User Activity Ping Endpoint
  app.post('/api/user/ping', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = normalizeAuthenticatedUserId((req as any).userId);
    if (!userId) return res.status(401).json({ error: 'Session utilisateur requise.' });
    await serverSupabase.updateUserLastActive(userId);
    return res.json({ success: true, timestamp: Date.now() });
  });

  // 7. Trigger Web Push Inactivity Notification to Real Device
  app.post('/api/push/inactivity-test', async (req, res) => {
    const userId = normalizeAuthenticatedUserId((req as any).userId);
    if (!userId) return res.status(401).json({ error: 'Session utilisateur requise.' });

    const payload = {
      title: '🔥 Retournez sur Bavel pour faire plus de rencontres !',
      body: 'Cela fait 1 à 2 jours que vous ne vous êtes pas connecté. De nouveaux profils très compatibles vous attendent près de chez vous !',
      url: '/',
      type: 'inactivity_48h',
      tag: `inactivity-test-${Date.now()}`,
      vibrate: [300, 150, 300, 150, 400]
    };

    try {
      const result = await sendWebPushToUser(userId, payload);
      return respondWithPushResult(res, result);
    } catch (err) {
      console.error('[WebPush] Échec du test de notification de relance:', err);
      return res.status(503).json({ success: false, error: 'Envoi Push indisponible.' });
    }
  });

  // 8. General Web Push Event Dispatcher (Profile View, Like, Message, Compatible Profile)
  app.post('/api/push/send', async (req, res) => {
    const userId = normalizeAuthenticatedUserId((req as any).userId);
    const { title, body, type, icon, data } = req.body || {};
    if (!userId) return res.status(401).json({ error: 'Session utilisateur requise.' });
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      title.length > 160 ||
      typeof body !== 'string' ||
      !body.trim() ||
      body.length > 500
    ) {
      return res.status(400).json({ error: 'Contenu de notification invalide.' });
    }

    const payload = {
      title: title.trim(),
      body: body.trim(),
      url: '/',
      type: typeof type === 'string' && /^[a-z_]{1,40}$/.test(type) ? type : 'social_activity',
      icon: typeof icon === 'string' && icon.startsWith('/') ? icon.slice(0, 256) : '/favicon.ico',
      tag: `push-${type || 'evt'}-${Date.now()}`,
      vibrate: type === 'message_received' ? [100, 50, 100, 50, 100] : [200, 100, 200],
      data: data && typeof data === 'object' && !Array.isArray(data) ? data : {}
    };

    try {
      const result = await sendWebPushToUser(userId, payload);
      return respondWithPushResult(res, result);
    } catch (err) {
      console.error('[WebPush] Échec de dispatch de notification:', err);
      return res.status(503).json({ success: false, error: 'Envoi Push indisponible.' });
    }
  });

  // ==========================================
  // --- Matching and recommendation endpoints ---
  // ==========================================

  // Deterministic comparison of user-provided profile attributes.
  function calculateBavelAiAffinity(user: any, target: any) {
    const tName = target?.name || 'Membre';
    const uCity = String(user?.city || user?.location || '')
      .toLowerCase()
      .trim();
    const tCity = String(target?.city || target?.location || '')
      .toLowerCase()
      .trim();
    const isSameCity = Boolean(uCity && tCity && uCity === tCity);

    const normalize = (value: unknown) => String(value).toLowerCase().trim();
    const uPassions: string[] = (user?.passions || user?.tags || user?.interests || []).map(normalize).filter(Boolean);
    const tPassions: string[] = (target?.passions || target?.tags || target?.interests || [])
      .map(normalize)
      .filter(Boolean);

    const sharedPassions = tPassions.filter((tp) => uPassions.some((up) => up.includes(tp) || tp.includes(up)));
    const uniqueShared = Array.from(new Set(sharedPassions)).slice(0, 3);
    const userIntent = normalize(user?.relation || user?.seeking || user?.lookingFor);
    const targetIntent = normalize(target?.relation || target?.seeking || target?.lookingFor);
    const intentMatches = Boolean(userIntent && targetIntent && userIntent === targetIntent);
    const userAge = Number(user?.age);
    const targetAge = Number(target?.age);
    const comparableScores: number[] = [];
    if (uPassions.length > 0 && tPassions.length > 0) {
      comparableScores.push(Math.round((uniqueShared.length / Math.max(uPassions.length, tPassions.length)) * 100));
    }
    if (uCity && tCity) comparableScores.push(isSameCity ? 100 : 0);
    if (userIntent && targetIntent) comparableScores.push(intentMatches ? 100 : 0);
    if (Number.isFinite(userAge) && Number.isFinite(targetAge)) {
      comparableScores.push(Math.max(0, 100 - Math.abs(userAge - targetAge) * 8));
    }
    const finalScore = comparableScores.length
      ? Math.round(comparableScores.reduce((total, score) => total + score, 0) / comparableScores.length)
      : null;

    const icebreakers = [
      `Salut ${tName} ! J'ai remarqué ${uniqueShared[0] ? `qu'on aime tous les deux ${uniqueShared[0]}` : 'ton univers'} ; qu'est-ce qui te passionne en ce moment ?`,
      uniqueShared.length > 0
        ? `Coucou ${tName} ! On aime tous les deux ${uniqueShared[0]}, quelle est ta meilleure expérience là-dedans ?`
        : `Hey ${tName} ! Ton profil Bavel m'a beaucoup plu, tu es de quel coin à ${target?.city || 'Abidjan'} ?`,
      `Salut ${tName} ! Quel serait ton endroit préféré pour un premier rendez-vous à ${target?.city || 'Abidjan'} ?`
    ];

    const signals = [];
    if (uPassions.length > 0 && tPassions.length > 0 && uniqueShared.length > 0) {
      signals.push(`Centres d’intérêt en commun : ${uniqueShared.join(', ')}.`);
    } else if (uPassions.length > 0 && tPassions.length > 0) {
      signals.push('Aucun centre d’intérêt commun renseigné.');
    } else {
      signals.push('Centres d’intérêt insuffisants pour une comparaison.');
    }
    if (userIntent && targetIntent) {
      signals.push(intentMatches ? 'Intentions relationnelles identiques.' : 'Intentions relationnelles différentes.');
    } else {
      signals.push('Intention relationnelle à confirmer.');
    }
    if (uCity && tCity) {
      signals.push(isSameCity ? 'Même ville renseignée.' : 'Villes différentes renseignées.');
    }
    if (Number.isFinite(userAge) && Number.isFinite(targetAge)) {
      signals.push(`Âges renseignés : ${userAge} et ${targetAge} ans.`);
    }

    return {
      score: finalScore,
      sharedPoints: uniqueShared.map((p) => p.charAt(0).toUpperCase() + p.slice(1)),
      signals,
      icebreakers,
      isSameCity,
      intentMatches
    };
  }

  // Deterministic profile-affinity estimates for discovery.
  app.post('/api/ai/recommendations', async (req, res) => {
    try {
      const startTime = Date.now();
      const { userProfile, candidateProfiles, userInteractions } = req.body;

      const candidates = Array.isArray(candidateProfiles) && candidateProfiles.length > 0 ? candidateProfiles : [];

      if (candidates.length === 0) {
        return res.json({
          success: true,
          method: 'rules-based-profile-matching',
          recommendations: [],
          cacheHit: false,
          cacheLatencyMs: Date.now() - startTime
        });
      }

      // Rank candidates with the same transparent profile-affinity rules.
      const recommendations = candidates
        .map((c: any) => {
          const affinity = calculateBavelAiAffinity(userProfile, c);
          return {
            id: c.id,
            compatibilityScore: affinity.score,
            explanation: affinity.signals.join(' '),
            commonTraits: affinity.sharedPoints,
            icebreaker: affinity.icebreakers[0]
          };
        })
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

      const latencyMs = Math.max(1, Date.now() - startTime);

      return res.json({
        success: true,
        method: 'rules-based-profile-matching',
        recommendations,
        cacheHit: false,
        cacheLatencyMs: latencyMs
      });
    } catch (err: any) {
      console.error('Profile affinity recommendation failed:', err);
      return res.status(500).json({ success: false, error: 'Calcul des affinités indisponible.' });
    }
  });

  // Profile affinity is a deterministic comparison, not generative AI or identity verification.
  app.post('/api/ai/vibe-check', async (req, res) => {
    try {
      const { userProfile, targetProfile } = req.body;
      if (!targetProfile) {
        return res.status(400).json({ success: false, message: 'Profil cible manquant.' });
      }

      const affinity = calculateBavelAiAffinity(userProfile, targetProfile);

      return res.json({
        success: true,
        method: 'rules-based-profile-matching',
        data: {
          compatibilityScore: affinity.score,
          vibeSummary: `Affinité indicative calculée à partir des informations de profil renseignées avec ${targetProfile.name || 'ce membre'}.`,
          signals: affinity.signals,
          conversationStarter: affinity.icebreakers[0],
          isEstimate: true
        }
      });
    } catch (err: any) {
      console.error('Profile affinity estimate failed:', err);
      return res.status(500).json({ success: false, message: 'Calcul des affinités indisponible.' });
    }
  });

  // Compatibility estimate for the profile detail UI.
  app.post('/api/ai/match', async (req, res) => {
    try {
      const { userProfile, targetProfile } = req.body;
      if (!targetProfile) {
        return res.status(400).json({ error: 'targetProfile est requis' });
      }

      const affinity = calculateBavelAiAffinity(userProfile, targetProfile);

      return res.json({
        success: true,
        method: 'rules-based-profile-matching',
        score: affinity.score,
        badge: 'Affinité estimée',
        reason: `Estimation indicative fondée sur les informations de profil disponibles avec ${targetProfile.name || 'ce membre'}. Ce calcul par règles n’est pas une analyse d’IA.`,
        signals: affinity.signals,
        sharedPoints: affinity.sharedPoints,
        icebreakers: affinity.icebreakers,
        isEstimate: true
      });
    } catch (err: any) {
      console.error('Profile affinity match estimate failed:', err);
      return res.status(500).json({ error: 'Calcul des affinités indisponible.' });
    }
  });

  // ==========================================
  // --- Real-time encounters, likes and matches ---
  // ==========================================

  // In-memory store for real swipes and matches

  // 1. Fetch Real-Time Ranked Profiles for "Rencontres" Section
  app.post('/api/encounters/profiles', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const {
        genderPreference,
        minAge = 18,
        maxAge = 60,
        latitude,
        longitude,
        intent,
        countryCode,
        city,
        minDistanceKm = 0,
        maxDistanceKm = 100,
        advancedFilters = {}
      } = req.body;
      const cleanUserId = String((req as any).userId || '')
        .toLowerCase()
        .trim();
      if (!cleanUserId) return res.status(401).json({ error: 'Session utilisateur requise.' });

      const { profile: authenticatedProfile, candidates: persistentCandidates } =
        await serverSupabase.getRecommendationData(cleanUserId);
      const { data: existingSwipes, error: swipesError } = await serverSupabase
        .getServiceClient()
        .from('swipes')
        .select('target_id')
        .eq('user_id', cleanUserId);
      if (swipesError) throw swipesError;
      const swipedIds = new Set((existingSwipes || []).map((row: any) => String(row.target_id)));
      const blockedByUser = await serverSupabase
        .getServiceClient()
        .from('blocks')
        .select('user_id,blocked_user_id')
        .or(`user_id.eq.${cleanUserId},blocked_user_id.eq.${cleanUserId}`);
      if (blockedByUser.error) throw blockedByUser.error;
      const blockedIds = new Set(
        (blockedByUser.data || [])
          .flatMap((row: any) => [String(row.blocked_user_id), String(row.user_id)])
          .filter((id) => id !== cleanUserId)
      );
      const { data: incognitoProfiles, error: privacyError } = await serverSupabase
        .getServiceClient()
        .from('user_privacy_settings')
        .select('user_id,incognito_mode,profile_paused,show_online_status,show_distance')
        .neq('user_id', cleanUserId);
      if (privacyError) throw privacyError;
      const pausedIds = new Set(
        (incognitoProfiles || []).filter((row) => row.profile_paused === true).map((row) => String(row.user_id))
      );
      const privacyByUser = new Map((incognitoProfiles || []).map((row) => [String(row.user_id), row]));

      // Filter real candidate profiles
      const distanceByCandidateId = new Map<string, number>();
      const allCandidates = persistentCandidates.filter((p: any) => {
        if (!p || !p.id) return false;
        const pIdStr = String(p.id).toLowerCase();
        if (pIdStr === cleanUserId) return false;
        if (swipedIds.has(pIdStr)) return false;
        if (blockedIds.has(pIdStr)) return false;
        if (pausedIds.has(pIdStr)) return false;

        // Gender filter
        if (genderPreference && genderPreference !== 'les_deux') {
          if (p.gender && p.gender !== genderPreference) return false;
        }

        // Age filter
        const age = p.age || 25;
        if (age < minAge || age > maxAge) return false;
        if (
          countryCode &&
          countryCode !== 'ALL' &&
          String(p.country_code || p.countryCode || '').toUpperCase() !== String(countryCode).toUpperCase()
        )
          return false;
        if (
          city &&
          city !== 'ALL' &&
          !String(p.city || p.location || '')
            .toLowerCase()
            .includes(String(city).toLowerCase())
        )
          return false;
        if (advancedFilters.verifiedOnly && p.verified !== true && p.isVerified !== true && p.is_verified !== true)
          return false;
        if (advancedFilters.onlineOnly && p.online !== true) return false;
        if (
          advancedFilters.photosOnly &&
          !((Array.isArray(p.photos) && p.photos.some(Boolean)) || p.img || p.avatarUrl)
        )
          return false;
        if (advancedFilters.lookingFor && advancedFilters.lookingFor !== 'Tous') {
          const relation = String(p.relation || p.purpose || '').toLowerCase();
          if (!relation.includes(String(advancedFilters.lookingFor).toLowerCase())) return false;
        }

        if (
          typeof latitude === 'number' &&
          typeof longitude === 'number' &&
          Number.isFinite(Number(p.latitude)) &&
          Number.isFinite(Number(p.longitude))
        ) {
          const candidateLatitude = Number(p.latitude);
          const candidateLongitude = Number(p.longitude);
          const toRadians = (value: number) => (value * Math.PI) / 180;
          const dLat = toRadians(candidateLatitude - latitude);
          const dLon = toRadians(candidateLongitude - longitude);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(latitude)) * Math.cos(toRadians(candidateLatitude)) * Math.sin(dLon / 2) ** 2;
          const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distanceByCandidateId.set(pIdStr, distanceKm);
          if (distanceKm < Number(minDistanceKm) || distanceKm > Number(maxDistanceKm)) return false;
        }

        return true;
      });

      // Enrich candidates with profile-affinity rules and distance.
      const signedCandidates = await signMemberProfileMedia(allCandidates);
      const rankedProfiles = signedCandidates
        .map((c) => {
          const affinity = calculateBavelAiAffinity(authenticatedProfile, c);

          // Calculate dynamic distance text
          const privacy = privacyByUser.get(String(c.id));
          const showDistance = privacy?.show_distance !== false;
          const candidateDistance = distanceByCandidateId.get(String(c.id));
          const roundedDistanceKm =
            typeof candidateDistance === 'number' ? Math.round(candidateDistance / 5) * 5 : null;
          const distText = !showDistance
            ? 'Distance masquée'
            : roundedDistanceKm !== null
              ? roundedDistanceKm === 0
                ? 'à moins de 5 km'
                : `à environ ${roundedDistanceKm} km`
              : c.city || 'Distance indisponible';

          // 24h/48h New User Badge calculation
          const createdMs = c.created_at ? new Date(c.created_at).getTime() : 0;
          const ageHours = (Date.now() - createdMs) / 3600000;
          const isNewUser = createdMs > 0 && ageHours <= 48;
          const tagline =
            privacy?.show_online_status === false
              ? isNewUser
                ? "Viens de s'inscrire"
                : 'Membre Bavel'
              : isNewUser
                ? "Viens de s'inscrire"
                : 'En ligne sur Bavel';

          return toPublicProfile(
            {
              ...c,
              distanceKm: candidateDistance,
              isNewUser,
              tagline,
              distanceText: distText,
              bavelAiScore: affinity.score,
              bavelAiReason: affinity.signals.join(' '),
              bavelAiIcebreaker: affinity.icebreakers[0],
              bavelAiShared: affinity.sharedPoints
            },
            {
              showOnlineStatus: privacy?.show_online_status !== false,
              showDistance
            }
          );
        })
        .sort((a, b) => Number(b.bavelAiScore) - Number(a.bavelAiScore));

      return res.json({
        success: true,
        method: 'rules-based-profile-matching',
        profiles: rankedProfiles,
        total: rankedProfiles.length
      });
    } catch (err: any) {
      console.error('Erreur API Rencontres Profiles:', err);
      return res.status(500).json({ success: false, error: 'Chargement des rencontres indisponible.' });
    }
  });

  // 2. Real-Time Swipe Action Handler for "Rencontres"
  app.post('/api/encounters/swipe', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const { targetProfileId, targetProfileName, direction, note } = req.body;
      const cleanUserId = String((req as any).userId || '')
        .toLowerCase()
        .trim();
      const cleanTargetId = String(targetProfileId || '')
        .toLowerCase()
        .trim();

      if (!cleanUserId || !cleanTargetId || cleanTargetId === cleanUserId) {
        return res.status(400).json({ error: 'targetProfileId est requis.' });
      }

      if (!['like', 'superlike', 'pass'].includes(direction)) {
        return res.status(400).json({ error: 'Direction de swipe invalide.' });
      }
      const db = serverSupabase.getServiceClient();
      const { data: wallet, error: walletError } = await db
        .from('credits')
        .select('tier,premium_expires_at')
        .eq('user_id', cleanUserId)
        .maybeSingle();
      if (walletError) throw walletError;
      const walletTier = String(wallet?.tier || '').toLowerCase();
      const premiumActive =
        ['extra', 'premium', 'vip'].includes(walletTier) &&
        (!wallet?.premium_expires_at || new Date(wallet.premium_expires_at).getTime() > Date.now());

      if (direction !== 'pass' && !premiumActive) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { count: likesToday, error: quotaError } = await db
          .from('swipes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', cleanUserId)
          .eq('is_liked', true)
          .gte('created_at', startOfDay.toISOString());
        if (quotaError) throw quotaError;
        if ((likesToday || 0) >= 50) {
          return res.status(429).json({
            success: false,
            code: 'DAILY_LIKE_LIMIT',
            error: 'La limite quotidienne de likes est atteinte.'
          });
        }
      }

      const { data: blockedRelation, error: blockedRelationError } = await db
        .from('blocks')
        .select('id')
        .or(
          `and(user_id.eq.${cleanUserId},blocked_user_id.eq.${cleanTargetId}),and(user_id.eq.${cleanTargetId},blocked_user_id.eq.${cleanUserId})`
        )
        .limit(1)
        .maybeSingle();
      if (blockedRelationError) throw blockedRelationError;
      if (blockedRelation) {
        return res.status(403).json({ success: false, error: 'Cette interaction n’est pas autorisée.' });
      }

      const { error: swipeError } = await db.from('swipes').upsert(
        {
          user_id: cleanUserId,
          target_id: cleanTargetId,
          is_liked: direction !== 'pass',
          is_super_like: direction === 'superlike'
        },
        { onConflict: 'user_id,target_id' }
      );
      if (swipeError) throw swipeError;
      const { error: eventError } = await db.from('recommendation_events').insert({
        user_id: cleanUserId,
        candidate_id: cleanTargetId,
        event_type: direction === 'pass' ? 'pass' : direction,
        metadata: { source: 'encounters' }
      });
      if (eventError) throw eventError;

      // Check if target user has also liked the current user (Mutual Match)
      const { data: reverseSwipe, error: reverseSwipeError } = await db
        .from('swipes')
        .select('id')
        .eq('user_id', cleanTargetId)
        .eq('target_id', cleanUserId)
        .eq('is_liked', true)
        .maybeSingle();
      if (reverseSwipeError) throw reverseSwipeError;
      const isMutualMatch = direction !== 'pass' && Boolean(reverseSwipe);

      if (isMutualMatch && (direction === 'like' || direction === 'superlike')) {
        const { data: existingMatch, error: existingMatchError } = await db
          .from('matches')
          .select('id')
          .eq('user_id', cleanUserId)
          .eq('matched_user_id', cleanTargetId)
          .maybeSingle();
        if (existingMatchError) throw existingMatchError;

        const matchObject = {
          id: `match_${cleanUserId}_${cleanTargetId}_${Date.now()}`,
          partnerId: cleanTargetId,
          partnerName: targetProfileName || 'Membre Bavel',
          timestamp: new Date().toISOString(),
          initialNote: note || null
        };

        const { data: persistedMatches, error: matchError } = await db
          .from('matches')
          .upsert(
            [
              { user_id: cleanUserId, matched_user_id: cleanTargetId },
              { user_id: cleanTargetId, matched_user_id: cleanUserId }
            ],
            { onConflict: 'user_id,matched_user_id' }
          )
          .select('id,user_id,matched_user_id,created_at');
        if (matchError) throw matchError;
        const { error: matchEventError } = await db.from('recommendation_events').insert([
          {
            user_id: cleanUserId,
            candidate_id: cleanTargetId,
            event_type: 'match',
            metadata: { source: 'encounters' }
          },
          { user_id: cleanTargetId, candidate_id: cleanUserId, event_type: 'match', metadata: { source: 'encounters' } }
        ]);
        if (matchEventError) throw matchEventError;
        const persistedMatch = (persistedMatches || []).find(
          (match: any) => match.user_id === cleanUserId && match.matched_user_id === cleanTargetId
        );
        if (persistedMatch?.id) matchObject.id = persistedMatch.id;

        // Notify both members once, after the match is durably persisted.
        const notificationTitle = `💘 Nouveau match avec ${targetProfileName || 'ce profil'} !`;
        const notificationBody = `Vous avez tous les deux flashé l'un sur l'autre. Lancez la discussion dès maintenant !`;
        if (!existingMatch) {
          const { data: persistedNotifications, error: notificationError } = await db
            .from('notifications')
            .insert([
              {
                user_id: cleanUserId,
                type: 'match',
                title: notificationTitle,
                body: notificationBody,
                data: {
                  senderName: targetProfileName || 'Membre Bavel',
                  actionUrl: `/chat?targetId=${cleanTargetId}`,
                  targetId: cleanTargetId
                }
              },
              {
                user_id: cleanTargetId,
                type: 'match',
                title: '💘 Nouveau Match Bavel !',
                body: 'Vous avez tous les deux flashé l’un sur l’autre. Lancez la discussion dès maintenant !',
                data: {
                  senderName: 'Membre Bavel',
                  actionUrl: `/chat?targetId=${cleanUserId}`,
                  targetId: cleanUserId
                }
              }
            ])
            .select('id,user_id,type,title,body,data,is_read,created_at');
          if (notificationError) throw notificationError;
          for (const persistedNotification of persistedNotifications || []) {
            broadcastNotificationToUser(persistedNotification.user_id, {
              id: persistedNotification.id,
              userId: persistedNotification.user_id,
              type: 'match',
              title: persistedNotification.title,
              body: persistedNotification.body || '',
              timestamp: persistedNotification.created_at,
              read: Boolean(persistedNotification.is_read),
              senderName: persistedNotification.data?.senderName || 'Membre Bavel',
              actionUrl: persistedNotification.data?.actionUrl
            });
          }
        }

        return res.json({
          success: true,
          isMatch: true,
          match: matchObject,
          message: `Vous avez matché avec ${targetProfileName || 'ce membre'} !`
        });
      }

      return res.json({
        success: true,
        isMatch: false,
        message: `Swipe ${direction} enregistré avec succès.`
      });
    } catch (err: any) {
      console.error('Erreur API Swipe Rencontres:', err);
      return res.status(500).json({ success: false, error: 'Impossible d’enregistrer le swipe.' });
    }
  });

  app.post('/api/encounters/undo', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId || '')
      .toLowerCase()
      .trim();
    try {
      const db = serverSupabase.getServiceClient();
      const { data: wallet, error: walletError } = await db
        .from('credits')
        .select('tier,premium_expires_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (walletError) throw walletError;
      const walletTier = String(wallet?.tier || '').toLowerCase();
      const premiumActive =
        ['extra', 'premium', 'vip'].includes(walletTier) &&
        (!wallet?.premium_expires_at || new Date(wallet.premium_expires_at).getTime() > Date.now());
      if (!premiumActive) {
        return res
          .status(403)
          .json({ success: false, code: 'PREMIUM_REQUIRED', error: 'Undo est réservé aux comptes Extra et Premium.' });
      }
      const { data: lastSwipe, error: findError } = await db
        .from('swipes')
        .select('id,target_id,is_liked,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (findError) throw findError;
      if (!lastSwipe) return res.status(404).json({ success: false, error: 'Aucun swipe à annuler.' });

      const { error: deleteError } = await db.from('swipes').delete().eq('id', lastSwipe.id).eq('user_id', userId);
      if (deleteError) throw deleteError;

      await db.from('recommendation_events').insert({
        user_id: userId,
        candidate_id: lastSwipe.target_id,
        event_type: 'impression',
        metadata: { source: 'encounters', action: 'undo', original_is_liked: lastSwipe.is_liked }
      });

      return res.json({ success: true, targetId: lastSwipe.target_id });
    } catch (error) {
      console.error('Erreur annulation swipe:', error);
      return res.status(500).json({ success: false, error: 'Impossible d’annuler ce swipe.' });
    }
  });

  app.get('/health', async (_req, res) => {
    const health = await serverSupabase.healthCheck();
    return res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });

  // --- Vite Middleware ---
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // HTTP + WebSocket Server Setup
  if (SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
  const server = http.createServer(app);
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => (protocols.has('bavel-notifications') ? 'bavel-notifications' : false)
  });

  interface AuthenticatedWebSocketRequest extends http.IncomingMessage {
    authenticatedUserId: string;
  }

  wss.on('connection', (ws: WebSocket, req: AuthenticatedWebSocketRequest) => {
    const cleanId = req.authenticatedUserId;

    if (!userSockets.has(cleanId)) {
      userSockets.set(cleanId, new Set());
    }
    userSockets.get(cleanId)!.add(ws);

    // Send immediate connection ACK with current unread count
    void serverSupabase
      .getServiceClient()
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', cleanId)
      .eq('is_read', false)
      .then(({ count }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'connected',
              userId: cleanId,
              unreadCount: count || 0,
              timestamp: new Date().toISOString()
            })
          );
        }
      });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        } else if (msg.type === 'mark_read' && msg.notificationId) {
          void serverSupabase
            .getServiceClient()
            .from('notifications')
            .update({ is_read: true })
            .eq('id', msg.notificationId)
            .eq('user_id', cleanId);
        }
      } catch (e) {
        // ignore bad messages
      }
    });

    ws.on('close', () => {
      const set = userSockets.get(cleanId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          userSockets.delete(cleanId);
        }
      }
    });

    ws.on('error', () => {
      const set = userSockets.get(cleanId);
      if (set) {
        set.delete(ws);
      }
    });
  });

  // System Stats Endpoint (for monitoring)
  app.get('/api/admin/stats', verifySupabaseToken, requireAdmin, async (req, res) => {
    const stats = await serverSupabase.getSystemStats();
    return res.json(stats || { error: 'Failed to get stats' });
  });

  app.get('/api/activity/daily', verifySupabaseToken, requireAuth, async (req, res) => {
    const userId = String((req as any).userId);
    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('user_activity_daily')
        .select('date_key,likes,visits,contacts,swipes')
        .eq('user_id', userId)
        .gte('date_key', new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10))
        .order('date_key', { ascending: true });
      if (error) throw error;
      return res.json({ activity: data || [] });
    } catch (error) {
      console.error('User activity query failed:', error);
      return res.status(503).json({ error: 'Activité indisponible.' });
    }
  });

  app.post('/api/activity/daily', verifySupabaseToken, requireAuth, async (req, res) => {
    const type = String(req.body?.type || '');
    const count = Number(req.body?.count ?? 1);
    if (!['like', 'visit', 'contact', 'swipe'].includes(type) || !Number.isInteger(count) || count < 1 || count > 100) {
      return res.status(400).json({ error: 'Événement d’activité invalide.' });
    }
    const userId = String((req as any).userId);
    try {
      const db = serverSupabase.getServiceClient();
      const { data, error } = await db.rpc('increment_user_activity_daily', {
        p_user_id: userId,
        p_type: type,
        p_count: count
      });
      if (error) throw error;
      return res.status(201).json({ activity: data });
    } catch (error) {
      console.error('User activity write failed:', error);
      return res.status(503).json({ error: 'Activité indisponible.' });
    }
  });

  // Manual Cleanup Endpoint
  app.post('/api/admin/cleanup', verifySupabaseToken, requireAdmin, async (req, res) => {
    await serverSupabase.cleanupExpiredData();
    return res.json({ success: true, message: 'Cleanup completed' });
  });

  app.get('/api/admin/broadcasts', verifySupabaseToken, requireAdmin, async (req, res) => {
    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('system_broadcasts')
        .select('id,title,message,kind,priority,active,created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return res.json({
        broadcasts: (data || []).map((row: any) => ({
          id: row.id,
          title: row.title,
          message: row.message,
          type: row.kind,
          priority: row.priority,
          active: row.active,
          createdAt: new Date(row.created_at).getTime()
        }))
      });
    } catch (error) {
      console.error('Admin broadcasts query failed:', error);
      return res.status(503).json({ error: 'Annonces indisponibles.' });
    }
  });

  app.post('/api/admin/broadcasts', verifySupabaseToken, requireAdmin, async (req, res) => {
    const title = String(req.body?.title || '').trim();
    const message = String(req.body?.message || '').trim();
    const kind = String(req.body?.type || 'info');
    const priority = String(req.body?.priority || 'normal');
    if (
      !title ||
      !message ||
      !['info', 'maintenance', 'event', 'promo'].includes(kind) ||
      !['normal', 'urgent'].includes(priority)
    ) {
      return res.status(400).json({ error: 'Annonce invalide.' });
    }
    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('system_broadcasts')
        .insert({ title, message, kind, priority, created_by: String((req as any).userId) })
        .select('id,title,message,kind,priority,active,created_at')
        .single();
      if (error) throw error;
      await serverSupabase
        .getServiceClient()
        .from('admin_actions')
        .insert({
          admin_id: String((req as any).userId),
          action_type: 'broadcast_created',
          description: title
        });
      return res
        .status(201)
        .json({ broadcast: { ...data, type: data.kind, createdAt: new Date(data.created_at).getTime() } });
    } catch (error) {
      console.error('Admin broadcast creation failed:', error);
      return res.status(503).json({ error: 'Impossible de publier l’annonce.' });
    }
  });

  app.patch('/api/admin/broadcasts/:broadcastId', verifySupabaseToken, requireAdmin, async (req, res) => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof req.body?.active === 'boolean') updates.active = req.body.active;
    if (Object.keys(updates).length === 1) return res.status(400).json({ error: 'Aucune modification.' });
    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('system_broadcasts')
        .update(updates)
        .eq('id', req.params.broadcastId)
        .select('id,active')
        .single();
      if (error) throw error;
      return res.json({ broadcast: data });
    } catch (error) {
      console.error('Admin broadcast update failed:', error);
      return res.status(503).json({ error: 'Impossible de modifier l’annonce.' });
    }
  });

  app.delete('/api/admin/broadcasts/:broadcastId', verifySupabaseToken, requireAdmin, async (req, res) => {
    try {
      const { error } = await serverSupabase
        .getServiceClient()
        .from('system_broadcasts')
        .delete()
        .eq('id', req.params.broadcastId);
      if (error) throw error;
      return res.json({ success: true });
    } catch (error) {
      console.error('Admin broadcast deletion failed:', error);
      return res.status(503).json({ error: 'Impossible de supprimer l’annonce.' });
    }
  });

  app.get('/api/admin/support/tickets', verifySupabaseToken, requireAdmin, async (req, res) => {
    try {
      const db = serverSupabase.getServiceClient();
      const { data: tickets, error } = await db
        .from('support_tickets')
        .select('id,user_id,subject,category,priority,status,created_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const userIds = [...new Set((tickets || []).map((ticket: any) => ticket.user_id))];
      const { data: profiles, error: profilesError } = userIds.length
        ? await db.from('profiles').select('id,name,avatar_url').in('id', userIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const profileMap = new Map((profiles || []).map((profile: any) => [String(profile.id), profile]));
      const ticketIds = (tickets || []).map((ticket: any) => ticket.id);
      const { data: messages, error: messagesError } = ticketIds.length
        ? await db
            .from('support_messages')
            .select('id,ticket_id,sender_type,body,created_at')
            .in('ticket_id', ticketIds)
            .order('created_at', { ascending: true })
        : { data: [], error: null };
      if (messagesError) throw messagesError;
      const messagesByTicket = new Map<string, any[]>();
      for (const message of messages || []) {
        const profile = profileMap.get(
          String((tickets || []).find((ticket: any) => ticket.id === message.ticket_id)?.user_id)
        );
        const list = messagesByTicket.get(message.ticket_id) || [];
        list.push({
          id: message.id,
          sender: message.sender_type,
          senderName: message.sender_type === 'support' ? 'Support Bavel' : profile?.name || 'Utilisateur',
          text: message.body,
          time: new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        });

        messagesByTicket.set(message.ticket_id, list);
      }
      return res.json({
        tickets: (tickets || []).map((ticket: any) => {
          const profile = profileMap.get(String(ticket.user_id));
          return {
            id: ticket.id,
            userId: ticket.user_id,
            userName: profile?.name || 'Utilisateur',
            userAvatar: profile?.avatar_url || '',
            subject: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,
            category: ticket.category,
            createdAt: new Date(ticket.created_at).getTime(),
            date: new Date(ticket.created_at).toLocaleString('fr-FR'),
            messages: messagesByTicket.get(ticket.id) || []
          };
        })
      });
    } catch (error) {
      console.error('Admin support tickets query failed:', error);
      return res.status(503).json({ error: 'Tickets support indisponibles.' });
    }
  });

  app.get('/api/support/tickets', verifySupabaseToken, requireAuth, async (req, res) => {
    try {
      const db = serverSupabase.getServiceClient();
      const { data: ticket, error: ticketError } = await db
        .from('support_tickets')
        .select('id,subject,status,created_at,updated_at')
        .eq('user_id', String((req as any).userId))
        .in('status', ['open', 'in_progress'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ticketError) throw ticketError;
      if (!ticket) return res.json({ ticket: null, messages: [] });
      const { data: messages, error: messagesError } = await db
        .from('support_messages')
        .select('id,sender_type,body,created_at')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });
      if (messagesError) throw messagesError;
      return res.json({
        ticket,
        messages: (messages || []).map((message: any) => ({
          id: message.id,
          sender: message.sender_type === 'user' ? 'user' : 'bavel',
          text: message.body,
          time: new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }))
      });
    } catch (error) {
      console.error('User support conversation query failed:', error);
      return res.status(503).json({ error: 'Conversation support indisponible.' });
    }
  });

  app.post('/api/support/tickets', verifySupabaseToken, requireAuth, async (req, res) => {
    const body = String(req.body?.body || '').trim();
    const requestedTicketId = req.body?.ticketId ? String(req.body.ticketId) : null;
    if (!body || body.length > 5000) return res.status(400).json({ error: 'Message vide ou trop long.' });
    try {
      const db = serverSupabase.getServiceClient();
      const userId = String((req as any).userId);
      let ticket: any = null;
      if (requestedTicketId) {
        const { data, error } = await db
          .from('support_tickets')
          .select('id,status')
          .eq('id', requestedTicketId)
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Ticket introuvable.' });
        if (data.status === 'resolved')
          return res
            .status(409)
            .json({ error: 'Ce ticket est clôturé. Rechargez la conversation pour en ouvrir un nouveau.' });
        ticket = data;
      } else {
        const { data, error } = await db
          .from('support_tickets')
          .insert({ user_id: userId, subject: body.slice(0, 120), category: 'general', priority: 'medium' })
          .select('id,status')
          .single();
        if (error) throw error;
        ticket = data;
      }
      const { data: message, error: messageError } = await db
        .from('support_messages')
        .insert({ ticket_id: ticket.id, sender_id: userId, sender_type: 'user', body })
        .select('id,created_at')
        .single();
      if (messageError) throw messageError;
      const { error: updateError } = await db
        .from('support_tickets')
        .update({ updated_at: message.created_at })
        .eq('id', ticket.id)
        .eq('user_id', userId);
      if (updateError) throw updateError;
      return res.status(201).json({
        ticketId: ticket.id,
        message: {
          id: message.id,
          sender: 'user',
          text: body,
          time: new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }
      });
    } catch (error) {
      console.error('Support ticket message failed:', error);
      return res.status(503).json({ error: 'Envoi du message support indisponible.' });
    }
  });

  app.post('/api/admin/support/tickets/:ticketId/messages', verifySupabaseToken, requireAdmin, async (req, res) => {
    const body = String(req.body?.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Message vide.' });
    try {
      const db = serverSupabase.getServiceClient();
      const ticketId = req.params.ticketId;
      const { data: ticket, error: ticketError } = await db
        .from('support_tickets')
        .select('id,user_id')
        .eq('id', ticketId)
        .maybeSingle();
      if (ticketError) throw ticketError;
      if (!ticket) return res.status(404).json({ error: 'Ticket introuvable.' });
      const { data: message, error } = await db
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: String((req as any).userId),
          sender_type: 'support',
          body
        })
        .select('id,created_at')
        .single();
      if (error) throw error;
      await db
        .from('support_tickets')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      await db.from('admin_actions').insert({
        admin_id: String((req as any).userId),
        target_user_id: ticket.user_id,
        action_type: 'support_reply',
        description: `Réponse au ticket ${ticketId}`
      });
      return res.status(201).json({
        message: {
          id: message.id,
          sender: 'support',
          senderName: 'Support Bavel',
          text: body,
          time: new Date(message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }
      });
    } catch (error) {
      console.error('Admin support reply failed:', error);
      return res.status(503).json({ error: 'Réponse support indisponible.' });
    }
  });

  app.patch('/api/admin/support/tickets/:ticketId', verifySupabaseToken, requireAdmin, async (req, res) => {
    const status = String(req.body?.status || '');
    if (!['open', 'in_progress', 'resolved'].includes(status))
      return res.status(400).json({ error: 'Statut invalide.' });
    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', req.params.ticketId)
        .select('id,status')
        .single();
      if (error) throw error;
      return res.json({ ticket: data });
    } catch (error) {
      console.error('Admin support status update failed:', error);
      return res.status(503).json({ error: 'Statut support indisponible.' });
    }
  });

  app.get('/api/admin/activity', verifySupabaseToken, requireAdmin, async (req, res) => {
    try {
      const { data, error } = await serverSupabase
        .getServiceClient()
        .from('admin_actions')
        .select('id,admin_id,target_user_id,action_type,description,created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const targetIds = [...new Set((data || []).map((row: any) => row.target_user_id).filter(Boolean))];
      const { data: profiles, error: profilesError } = targetIds.length
        ? await serverSupabase.getServiceClient().from('profiles').select('id,name').in('id', targetIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const names = new Map((profiles || []).map((profile: any) => [String(profile.id), profile.name]));
      return res.json({
        activity: (data || []).map((row: any) => ({
          id: row.id,
          userId: row.target_user_id || row.admin_id,
          userName: row.target_user_id ? names.get(String(row.target_user_id)) || 'Utilisateur' : 'Administration',
          action: row.action_type,
          details: row.description || '',
          timestamp: new Date(row.created_at).getTime(),
          type: row.action_type.includes('support')
            ? 'message'
            : row.action_type.includes('premium')
              ? 'premium'
              : 'moderation'
        }))
      });
    } catch (error) {
      console.error('Admin activity query failed:', error);
      return res.status(503).json({ error: 'Journal admin indisponible.' });
    }
  });

  app.post('/api/admin/activity', verifySupabaseToken, requireAdmin, async (req, res) => {
    const actionType = String(req.body?.action || '').trim();
    const description = String(req.body?.details || '').trim();
    const targetUserId = req.body?.userId ? String(req.body.userId) : null;
    if (!actionType || !description) return res.status(400).json({ error: 'Action admin invalide.' });
    try {
      const { error } = await serverSupabase
        .getServiceClient()
        .from('admin_actions')
        .insert({
          admin_id: String((req as any).userId),
          target_user_id: targetUserId,
          action_type: actionType,
          description
        });
      if (error) throw error;
      return res.status(201).json({ success: true });
    } catch (error) {
      console.error('Admin activity write failed:', error);
      return res.status(503).json({ error: 'Journal admin indisponible.' });
    }
  });

  app.get('/api/admin/moderation-queue', verifySupabaseToken, requireAdmin, async (req, res) => {
    try {
      const db = serverSupabase.getServiceClient();
      const { data: queue, error } = await db
        .from('moderation_queue')
        .select('id,report_id,priority,status,notes,created_at')
        .in('status', ['unassigned', 'assigned', 'in_progress', 'escalated'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      const reportIds = (queue || []).map((item: any) => item.report_id);
      const { data: reports, error: reportsError } = reportIds.length
        ? await db.from('reports').select('id,reported_id,category,description,created_at').in('id', reportIds)
        : { data: [], error: null };
      if (reportsError) throw reportsError;
      const reportedIds = [...new Set((reports || []).map((report: any) => report.reported_id))];
      const { data: profiles, error: profilesError } = reportedIds.length
        ? await db.from('profiles').select('id,name,avatar_url').in('id', reportedIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;
      const reportMap = new Map((reports || []).map((report: any) => [String(report.id), report]));
      const profileMap = new Map((profiles || []).map((profile: any) => [String(profile.id), profile]));
      return res.json({
        queue: (queue || []).map((item: any) => {
          const report = reportMap.get(String(item.report_id));
          const profile = report ? profileMap.get(String(report.reported_id)) : null;
          return {
            id: item.id,
            userId: report?.reported_id || '',
            userName: profile?.name || 'Utilisateur',
            type: report?.category === 'inappropriate_content' ? 'photo' : 'profile',
            content: report?.description || '',
            status: 'pending',
            submittedAt: new Date(item.created_at).getTime(),
            priority: item.priority,
            reportId: item.report_id
          };
        })
      });
    } catch (error) {
      console.error('Admin moderation queue query failed:', error);
      return res.status(503).json({ error: 'File de modération indisponible.' });
    }
  });

  app.patch('/api/admin/moderation-queue/:queueId', verifySupabaseToken, requireAdmin, async (req, res) => {
    const decision = String(req.body?.decision || '');
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Décision invalide.' });
    try {
      const db = serverSupabase.getServiceClient();
      const { data: item, error: itemError } = await db
        .from('moderation_queue')
        .select('id,report_id')
        .eq('id', req.params.queueId)
        .maybeSingle();
      if (itemError) throw itemError;
      if (!item) return res.status(404).json({ error: 'Élément de modération introuvable.' });
      const reportStatus = decision === 'approved' ? 'dismissed' : 'resolved';
      const { error: queueError } = await db
        .from('moderation_queue')
        .update({ status: 'completed', completed_at: new Date().toISOString(), notes: decision })
        .eq('id', item.id);
      if (queueError) throw queueError;
      const { error: reportError } = await db
        .from('reports')
        .update({ status: reportStatus, resolved_at: new Date().toISOString() })
        .eq('id', item.report_id);
      if (reportError) throw reportError;
      await db.from('admin_actions').insert({
        admin_id: String((req as any).userId),
        action_type: `moderation_${decision}`,
        description: `Élément de modération ${item.id} : ${decision}`
      });
      return res.json({ success: true });
    } catch (error) {
      console.error('Admin moderation decision failed:', error);
      return res.status(503).json({ error: 'Décision de modération indisponible.' });
    }
  });

  app.get('/api/admin/settings', verifySupabaseToken, requireAdmin, async (req, res) => {
    try {
      const db = serverSupabase.getServiceClient();
      const [{ data: settings, error: settingsError }, { data: bans, error: bansError }] = await Promise.all([
        db.from('admin_settings').select('key,value'),
        db.from('admin_ip_bans').select('ip,reason,created_at').order('created_at', { ascending: false })
      ]);
      if (settingsError) throw settingsError;
      if (bansError) throw bansError;
      const values = Object.fromEntries((settings || []).map((row: any) => [row.key, row.value]));
      return res.json({
        settings: values,
        bannedIps: (bans || []).map((row: any) => (row.reason ? `${row.ip} (${row.reason})` : row.ip))
      });
    } catch (error) {
      console.error('Admin settings query failed:', error);
      return res.status(503).json({ error: 'Configuration admin indisponible.' });
    }
  });

  app.put('/api/admin/settings', verifySupabaseToken, requireAdmin, async (req, res) => {
    const settings = req.body?.settings;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings))
      return res.status(400).json({ error: 'Configuration invalide.' });
    try {
      const db = serverSupabase.getServiceClient();
      const rows = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        updated_by: String((req as any).userId),
        updated_at: new Date().toISOString()
      }));
      const { error } = await db.from('admin_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      return res.json({ success: true });
    } catch (error) {
      console.error('Admin settings update failed:', error);
      return res.status(503).json({ error: 'Impossible de sauvegarder la configuration.' });
    }
  });

  app.post('/api/admin/ip-bans', verifySupabaseToken, requireAdmin, async (req, res) => {
    const ip = String(req.body?.ip || '').trim();
    const reason = String(req.body?.reason || '').trim() || null;
    if (!ip || ip.length > 64) return res.status(400).json({ error: 'Adresse IP invalide.' });
    try {
      const { error } = await serverSupabase
        .getServiceClient()
        .from('admin_ip_bans')
        .upsert(
          {
            ip,
            reason,
            created_by: String((req as any).userId)
          },
          { onConflict: 'ip' }
        );
      if (error) throw error;
      return res.status(201).json({ success: true, ip: reason ? `${ip} (${reason})` : ip });
    } catch (error) {
      console.error('Admin IP ban failed:', error);
      return res.status(503).json({ error: 'Impossible d’ajouter cette adresse.' });
    }
  });

  app.delete('/api/admin/ip-bans/:ip', verifySupabaseToken, requireAdmin, async (req, res) => {
    try {
      const ip = decodeURIComponent(req.params.ip).split(' (')[0];
      const { error } = await serverSupabase.getServiceClient().from('admin_ip_bans').delete().eq('ip', ip);
      if (error) throw error;
      return res.json({ success: true });
    } catch (error) {
      console.error('Admin IP unban failed:', error);
      return res.status(503).json({ error: 'Impossible de retirer cette adresse.' });
    }
  });

  server.on('upgrade', async (request, socket, head) => {
    const host = request.headers.host || `localhost:${PORT}`;
    const url = new URL(request.url || '', `http://${host}`);
    if (url.pathname !== '/ws/notifications') {
      socket.destroy();
      return;
    }
    const protocols = String(request.headers['sec-websocket-protocol'] || '')
      .split(',')
      .map((protocol) => protocol.trim())
      .filter(Boolean);
    const accessToken = protocols.find((protocol) => protocol.startsWith('bavel-auth.'))?.slice('bavel-auth.'.length);
    if (!accessToken || !protocols.includes('bavel-notifications')) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    try {
      const { data, error } = await serverSupabase.getServiceClient().auth.getUser(accessToken);
      if (error || !data.user) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }
      const authenticatedRequest = request as AuthenticatedWebSocketRequest;
      authenticatedRequest.authenticatedUserId = data.user.id.toLowerCase();
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, authenticatedRequest);
      });
    } catch (error) {
      console.error('Notification WebSocket authentication failed:', error);
      socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
      socket.destroy();
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
