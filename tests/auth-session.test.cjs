// Request-race regression checks use in-memory sessions and no network or church data.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('auth-adapter.js', 'utf8');
const session = (id, suffix = '') => ({ user: { id }, access_token: `fixture-${id}${suffix}`, refresh_token: `refresh-${id}${suffix}` });
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function setup(fetch) {
  const values = new Map([['efgcSupabaseAuth', JSON.stringify(session('A'))]]);
  const localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  const window = { EFGC_SUPABASE: { url: 'https://fixture.invalid', publishableKey: 'fixture-public-key' } };
  vm.runInNewContext(source, { window, localStorage, fetch, AbortSignal });
  return { auth: window.EFGCAuth, switchTo: value => localStorage.setItem('efgcSupabaseAuth', JSON.stringify(value)) };
}

test('a delayed 401 never retries the old request under another account', async () => {
  const first = deferred(); let calls = 0;
  const { auth, switchTo } = setup(() => { calls++; return calls === 1 ? first.promise : Promise.resolve(response(session('B', '-new'))); });
  const request = auth.rest('profiles?select=*');
  switchTo(session('B'));
  first.resolve(response({ message: 'Expired' }, 401));
  await assert.rejects(request, /session changed/i);
  assert.equal(calls, 1, 'No refresh or replay may run as the replacement account');
});

test('a retried data response is discarded after logout', async () => {
  const retryStarted = deferred(), retry = deferred(); let reads = 0;
  const { auth } = setup(async url => {
    if (url.includes('/logout')) return response({});
    if (url.includes('/token?')) return response(session('A', '-new'));
    if (++reads === 1) return response({ message: 'Expired' }, 401);
    retryStarted.resolve(); return retry.promise;
  });
  const request = auth.rest('safeguarding_contacts?select=*');
  await retryStarted.promise;
  await auth.signOut();
  retry.resolve(response([{ youth_id: 'A', parent_name: 'Synthetic contact' }]));
  await assert.rejects(request, /session changed/i);
  assert.equal(auth.session(), null);
});

test('a delayed refresh cannot overwrite an account changed in another tab', async () => {
  const pending = deferred();
  const { auth, switchTo } = setup(() => pending.promise);
  const refresh = auth.refresh();
  switchTo(session('B'));
  pending.resolve(response(session('A', '-new')));
  assert.equal(await refresh, null);
  assert.equal(auth.userId(), 'B');
});

test('a rejected old refresh cannot clear the replacement account', async () => {
  const pending = deferred();
  const { auth, switchTo } = setup(() => pending.promise);
  const refresh = auth.refresh();
  switchTo(session('B'));
  pending.resolve(response({ message: 'Invalid refresh token' }, 400));
  await assert.rejects(refresh, /Invalid refresh token/);
  assert.equal(auth.userId(), 'B');
});

test('concurrent expired requests share one refresh and both complete normally', async () => {
  let refreshes = 0;
  const { auth } = setup(async (url, options) => {
    if (url.includes('/token?')) { refreshes++; return response(session('A', '-new')); }
    return options.headers.Authorization === 'Bearer fixture-A-new' ? response([{ id: 'A' }]) : response({ message: 'Expired' }, 401);
  });
  const rows = await Promise.all([auth.rest('profiles'), auth.rest('profiles')]);
  assert.equal(refreshes, 1);
  assert.equal(rows[0][0].id, 'A');
  assert.equal(rows[1][0].id, 'A');
});
