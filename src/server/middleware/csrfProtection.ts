import type { RequestHandler } from 'express';
import cors from 'cors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_WEBHOOK_PATHS = new Set(['/payments/webhook/mobile-money', '/payments/webhook/stripe']);
const NATIVE_APP_ORIGINS = ['capacitor://localhost', 'http://localhost', 'https://localhost'];

export function getTrustedClientOrigins(frontendUrl?: string): Set<string> {
  const origins = new Set(NATIVE_APP_ORIGINS);
  if (frontendUrl) origins.add(new URL(frontendUrl).origin);
  return origins;
}

export function createClientCors(frontendUrl?: string) {
  const trustedOrigins = getTrustedClientOrigins(frontendUrl);
  return cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, false);
      return callback(null, trustedOrigins.has(origin) ? origin : false);
    }
  });
}

export function createCsrfProtection(frontendUrl?: string): RequestHandler {
  const trustedOrigins = getTrustedClientOrigins(frontendUrl);

  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method) || EXEMPT_WEBHOOK_PATHS.has(req.path)) return next();

    const origin = req.get('origin');
    const fetchSite = req.get('sec-fetch-site');
    const hasLegacySessionCookie = /(?:^|;\s*)session_token=/.test(req.get('cookie') || '');
    if (!origin) {
      if (fetchSite === 'cross-site' || hasLegacySessionCookie) {
        return res.status(403).json({ error: 'Requête intersite refusée.' });
      }
      return next();
    }

    let requestOrigin: string;
    try {
      if (NATIVE_APP_ORIGINS.includes(origin)) return next();
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.origin !== origin) {
        return res.status(403).json({ error: 'Origine de requête invalide.' });
      }
      requestOrigin = parsedOrigin.origin;
    } catch {
      return res.status(403).json({ error: 'Origine de requête invalide.' });
    }

    const allowedOrigin =
      trustedOrigins.has(requestOrigin) || (!frontendUrl && requestOrigin === `${req.protocol}://${req.get('host')}`);
    if (!allowedOrigin) {
      return res.status(403).json({ error: 'Origine de requête non autorisée.' });
    }
    return next();
  };
}
