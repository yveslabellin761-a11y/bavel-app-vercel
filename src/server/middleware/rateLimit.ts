import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export interface RateLimitResult {
  count: number;
  resetTime: number;
}

export interface RateLimitStore {
  consume(key: string, windowMs: number): Promise<RateLimitResult>;
}

export async function verifyRateLimitStoreConnectivity(store: RateLimitStore): Promise<void> {
  await store.consume(`startup-probe:${randomUUID()}`, 60_000);
}

const buckets = new Map<string, RateLimitResult>();
let requestsSinceCleanup = 0;

export const localRateLimitStore: RateLimitStore = {
  async consume(key, windowMs) {
    const now = Date.now();
    requestsSinceCleanup += 1;
    if (requestsSinceCleanup >= 1000) {
      requestsSinceCleanup = 0;
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetTime <= now) buckets.delete(bucketKey);
      }
    }

    const previous = buckets.get(key);
    const bucket =
      previous && previous.resetTime > now
        ? { count: previous.count + 1, resetTime: previous.resetTime }
        : { count: 1, resetTime: now + windowMs };
    buckets.set(key, bucket);
    return bucket;
  }
};

const INCREMENT_SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
  "return {count, redis.call('PTTL', KEYS[1])}"
].join('\n');

export function createUpstashRateLimitStore(
  restUrl: string,
  token: string,
  fetcher: typeof fetch = fetch
): RateLimitStore {
  const endpoint = new URL(restUrl);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) {
    throw new Error('UPSTASH_REDIS_REST_URL must be an HTTPS URL without embedded credentials.');
  }
  if (!token.trim()) throw new Error('UPSTASH_REDIS_REST_TOKEN is required.');
  endpoint.pathname = `${endpoint.pathname.replace(/\/+$/, '')}/pipeline`;

  return {
    async consume(key, windowMs) {
      const hashedKey = createHash('sha256').update(key).digest('hex');
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify([['EVAL', INCREMENT_SCRIPT, '1', `bavel:rate-limit:${hashedKey}`, String(windowMs)]]),
        signal: AbortSignal.timeout(2000)
      });
      if (!response.ok) throw new Error(`Rate-limit store returned HTTP ${response.status}.`);

      const payload: unknown = await response.json();
      if (!Array.isArray(payload) || payload.length !== 1) {
        throw new Error('Rate-limit store returned an invalid response.');
      }
      const result = payload[0]?.result;
      if (!Array.isArray(result) || result.length !== 2) {
        throw new Error('Rate-limit store returned an invalid counter.');
      }
      const count = Number(result[0]);
      const ttlMs = Number(result[1]);
      if (!Number.isSafeInteger(count) || count < 1 || !Number.isFinite(ttlMs) || ttlMs < 0) {
        throw new Error('Rate-limit store returned invalid counter values.');
      }
      return { count, resetTime: Date.now() + ttlMs };
    }
  };
}

export function createRateLimiter(
  maxRequests: number,
  windowMs: number = 60_000,
  prefix: string = 'general',
  store: RateLimitStore = localRateLimitStore
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const bucket = await store.consume(`${prefix}:${clientIp}`, windowMs);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - bucket.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetTime / 1000));

      if (bucket.count > maxRequests) {
        res.setHeader('Retry-After', Math.max(1, Math.ceil((bucket.resetTime - Date.now()) / 1000)));
        return res.status(429).json({
          success: false,
          error: 'TOO_MANY_REQUESTS',
          message:
            'Trop de requêtes détectées. Pour votre sécurité contre les attaques par force brute, veuillez patienter une minute.'
        });
      }
      next();
    } catch (error) {
      console.error('[RateLimit] Shared rate-limit store unavailable:', error);
      return res.status(503).json({
        success: false,
        error: 'RATE_LIMIT_UNAVAILABLE',
        message: 'Le service de sécurité est temporairement indisponible. Réessayez dans quelques instants.'
      });
    }
  };
}
