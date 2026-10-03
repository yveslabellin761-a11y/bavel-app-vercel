import 'dotenv/config';

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET',
  'FRONTEND_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_DSN',
  'VITE_SENTRY_DSN'
];

const providerGroups = [
  ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_EMAIL'],
  ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  ['MOBILE_MONEY_CHECKOUT_URL', 'MOBILE_MONEY_API_KEY', 'MOBILE_MONEY_MERCHANT_ID', 'MOBILE_MONEY_WEBHOOK_SECRET']
];

const value = (name) => process.env[name]?.trim() || '';
const missing = required.filter((name) => !value(name));
const templateMarkers = ['placeholder', 'replace-with', 'your-', '...', 'clé-publique', 'o000000', '/000000'];
const placeholders = [
  'your-project.supabase.co',
  'your-anon-key-placeholder',
  'your-service-role-key-placeholder',
  'replace-with-at-least-32-random-characters',
  'bavel_super_secret'
];
const insecure = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'].filter(
  (name) => !value(name) || placeholders.some((placeholder) => value(name).includes(placeholder))
);
const errors = [
  ...missing.map((name) => `${name} is missing`),
  ...insecure.map((name) => `${name} is missing or still contains a placeholder`),
  ...required
    .filter((name) => value(name) && templateMarkers.some((marker) => value(name).toLowerCase().includes(marker)))
    .map((name) => `${name} still contains a template value`),
  ...(value('JWT_SECRET').length < 32 ? ['JWT_SECRET must contain at least 32 characters'] : []),
  ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value('JWT_SECRET'))
    ? ['JWT_SECRET must not be a UUID or other short identifier; generate at least 32 random bytes']
    : [])
];

for (const group of providerGroups) {
  const configured = group.filter((name) => value(name));
  if (configured.length > 0 && configured.length !== group.length) {
    errors.push(`provider configuration incomplete: ${group.join(' + ')}`);
  }
}

const stripeConfigured = Boolean(value('STRIPE_SECRET_KEY') && value('STRIPE_WEBHOOK_SECRET'));
const mobileMoneyConfigured = Boolean(
  value('MOBILE_MONEY_CHECKOUT_URL') &&
  value('MOBILE_MONEY_API_KEY') &&
  value('MOBILE_MONEY_MERCHANT_ID') &&
  value('MOBILE_MONEY_WEBHOOK_SECRET')
);
if (!stripeConfigured && !mobileMoneyConfigured) {
  errors.push('configure at least one complete payment provider (Stripe or Mobile Money) before production');
}
if (value('STRIPE_SECRET_KEY') && !value('STRIPE_SECRET_KEY').startsWith('sk_live_')) {
  errors.push('STRIPE_SECRET_KEY must be a live-mode Stripe secret key in production');
}
if (value('STRIPE_WEBHOOK_SECRET') && !/^whsec_.{16,}$/.test(value('STRIPE_WEBHOOK_SECRET'))) {
  errors.push('STRIPE_WEBHOOK_SECRET must be a valid Stripe webhook signing secret');
}

if (
  value('VAPID_PUBLIC_KEY') &&
  value('VITE_VAPID_PUBLIC_KEY') &&
  value('VAPID_PUBLIC_KEY') !== value('VITE_VAPID_PUBLIC_KEY')
) {
  errors.push('VITE_VAPID_PUBLIC_KEY must match VAPID_PUBLIC_KEY');
}

if (
  value('GOOGLE_CLIENT_ID') &&
  value('VITE_GOOGLE_CLIENT_ID') &&
  value('GOOGLE_CLIENT_ID') !== value('VITE_GOOGLE_CLIENT_ID')
) {
  errors.push('GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID must match when both are configured');
}

for (const name of [
  'SUPABASE_URL',
  'FRONTEND_URL',
  'UPSTASH_REDIS_REST_URL',
  'SENTRY_DSN',
  'VITE_SENTRY_DSN',
  'MOBILE_MONEY_CHECKOUT_URL'
]) {
  if (!value(name)) continue;
  try {
    const url = new URL(value(name));
    const isSentryDsn = name === 'SENTRY_DSN' || name === 'VITE_SENTRY_DSN';
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== 'https:' ||
      url.password ||
      (!isSentryDsn && url.username) ||
      (isSentryDsn && (!url.username || url.pathname === '/')) ||
      hostname.endsWith('.example') ||
      (!isSentryDsn &&
        (['my_app_url', 'your-domain', 'example.com'].some((placeholder) => hostname.includes(placeholder)) ||
          hostname === 'localhost'))
    ) {
      errors.push(
        isSentryDsn
          ? `${name} must be a valid HTTPS Sentry DSN including its public key and project path`
          : `${name} must be an HTTPS URL without embedded credentials`
      );
    }
  } catch {
    errors.push(`${name} must be an absolute URL`);
  }
}

if (errors.length) {
  console.error(`Production configuration invalid:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

if (process.env.NODE_ENV !== 'production') {
  console.warn('Configuration check passed, but NODE_ENV is not production.');
} else {
  console.log('Production configuration passed. Secret values were not displayed.');
}
