import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const configuredUrl = env.VITE_API_BASE_URL?.trim();
const configuredSupabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim();
const configuredSupabaseKey = (env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '').trim();

if (!configuredSupabaseUrl) {
  console.error('Native build blocked: set VITE_SUPABASE_URL to the HTTPS URL of the Supabase project.');
  process.exit(1);
}

if (!configuredSupabaseKey || /your[-_ ]|placeholder|example|change[-_ ]?me/i.test(configuredSupabaseKey)) {
  console.error('Native build blocked: set VITE_SUPABASE_ANON_KEY to the project public anon/publishable key.');
  process.exit(1);
}

let supabaseUrl;
try {
  supabaseUrl = new URL(configuredSupabaseUrl);
} catch {
  console.error('Native build blocked: VITE_SUPABASE_URL must be a valid HTTPS URL.');
  process.exit(1);
}

const supabaseHostname = supabaseUrl.hostname.toLowerCase();
if (
  supabaseUrl.protocol !== 'https:' ||
  supabaseUrl.username ||
  supabaseUrl.password ||
  supabaseUrl.pathname !== '/' ||
  supabaseUrl.search ||
  supabaseUrl.hash ||
  supabaseHostname === 'localhost' ||
  supabaseHostname.endsWith('.local') ||
  supabaseHostname.endsWith('.test') ||
  supabaseHostname.endsWith('.example') ||
  supabaseHostname.startsWith('your-')
) {
  console.error('Native build blocked: VITE_SUPABASE_URL must be a real HTTPS origin without credentials or a path.');
  process.exit(1);
}

if (!configuredUrl) {
  console.error('Native build blocked: set VITE_API_BASE_URL to the HTTPS origin of the Bavel API in .env.local.');
  process.exit(1);
}

let apiUrl;
try {
  apiUrl = new URL(configuredUrl);
} catch {
  console.error('Native build blocked: VITE_API_BASE_URL must be a valid URL.');
  process.exit(1);
}

const hostname = apiUrl.hostname.toLowerCase();
const isLocalOrPlaceholder =
  hostname === 'localhost' ||
  hostname.endsWith('.local') ||
  hostname.endsWith('.test') ||
  hostname.endsWith('.example') ||
  hostname.startsWith('your-');

if (
  apiUrl.protocol !== 'https:' ||
  apiUrl.username ||
  apiUrl.password ||
  apiUrl.pathname !== '/' ||
  apiUrl.search ||
  apiUrl.hash ||
  isLocalOrPlaceholder
) {
  console.error(
    'Native build blocked: VITE_API_BASE_URL must be a real HTTPS origin with no path, query, fragment, or credentials.'
  );
  process.exit(1);
}

console.log(`Native API origin configured: ${apiUrl.origin}`);
