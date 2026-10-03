const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY before running this diagnostic.');
}

async function runTests() {
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
  });

  const { error } = await client.auth.getSession();
  if (error) {
    throw new Error(`Supabase connection failed: ${error.message}`);
  }

  console.log('Supabase connection successful.');
}

runTests().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
