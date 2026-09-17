const fs = require('fs');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const adapter = fs.readFileSync('backend-adapter.js', 'utf8');
  const url = adapter.match(/url:'([^']+)'/)?.[1];
  const key = adapter.match(/publishableKey:'([^']+)'/)?.[1];

  assert(url && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url), 'Supabase URL is missing or invalid');
  assert(key && key.startsWith('sb_publishable_'), 'Supabase publishable key is missing or invalid');
  assert(!/service_role|sb_secret_/i.test(adapter), 'Browser adapter contains a forbidden secret/service-role key');

  const headers = { apikey: key };

  const auth = await fetch(`${url}/auth/v1/settings`, { headers });
  assert(auth.ok, `Supabase Auth settings request failed with HTTP ${auth.status}`);
  const authJson = await auth.json();
  assert(authJson && typeof authJson === 'object', 'Supabase Auth settings did not return JSON');

  // This app intentionally protects its data API behind authenticated sessions/RLS.
  // A 401/403 here is acceptable and confirms that anonymous access is not open.
  const rest = await fetch(`${url}/rest/v1/`, { headers });
  assert([200, 401, 403].includes(rest.status), `Supabase REST endpoint returned unexpected HTTP ${rest.status}`);

  console.log(`Supabase connectivity smoke passed. Auth HTTP ${auth.status}; REST HTTP ${rest.status}. No data was written or changed.`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
