const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ValidPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function normalizeAuthenticatedUserId(userId: unknown): string | null {
  if (typeof userId !== 'string') return null;
  const normalized = userId.trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

export function validatePushSubscription(value: unknown): ValidPushSubscription | null {
  if (!value || typeof value !== 'object') return null;
  const subscription = value as Record<string, unknown>;
  if (typeof subscription.endpoint !== 'string' || subscription.endpoint.length > 2048) return null;
  try {
    const endpoint = new URL(subscription.endpoint);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) return null;
  } catch {
    return null;
  }

  if (!subscription.keys || typeof subscription.keys !== 'object') return null;
  const keys = subscription.keys as Record<string, unknown>;
  if (
    typeof keys.p256dh !== 'string' ||
    !keys.p256dh ||
    keys.p256dh.length > 256 ||
    typeof keys.auth !== 'string' ||
    !keys.auth ||
    keys.auth.length > 256
  ) {
    return null;
  }

  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth }
  };
}
