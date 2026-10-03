const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY before running this diagnostic.');
}

async function testConnection() {
  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase API connection failed with status ${response.status}.`);
  }

  console.log('Supabase API connection successful.');
}

testConnection().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
