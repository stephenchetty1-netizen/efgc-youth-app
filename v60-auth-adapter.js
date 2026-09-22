/** EFGC Youth v60 — no-email Supabase session + RLS adapter. */
(() => {
  const c = window.EFGC_SUPABASE;
  if (!c) throw new Error('EFGC Supabase configuration missing');
  const A = `${c.url}/auth/v1`;
  const R = `${c.url}/rest/v1`;
  const S = `${c.url}/storage/v1`;
  const K = 'efgcSupabaseAuth';
  const REMEMBER_KEY = 'efgcRememberDevice';
  const remembersDevice = () => localStorage.getItem(REMEMBER_KEY) === '1';
  const H = (token, extra = {}) => ({ apikey: c.publishableKey, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra });
  // Persist auth tokens only after the member explicitly opts into Remember me.
  // Never write the password to either storage area.
  const read = () => {
    try { return JSON.parse((remembersDevice() ? localStorage : sessionStorage).getItem(K) || 'null'); }
    catch { return null; }
  };
  const write = (v) => {
    localStorage.removeItem(K);
    sessionStorage.removeItem(K);
    if (v) (remembersDevice() ? localStorage : sessionStorage).setItem(K, JSON.stringify(v));
  };

  async function req(url, options = {}) {
    const r = await fetch(url, options);
    let body = null;
    const ct = r.headers.get('content-type') || '';
    try { body = ct.includes('json') ? await r.json() : await r.text(); } catch { body = null; }
    if (!r.ok) {
      const message = body?.msg || body?.message || body?.error_description || body?.error || (typeof body === 'string' && body) || `Request failed (${r.status})`;
      const e = new Error(message); e.status = r.status; throw e;
    }
    return body;
  }

  async function refresh() {
    const s = read();
    if (!s?.refresh_token) return null;
    const data = await req(`${A}/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { ...H(null), 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    write(data);
    return data;
  }

  async function authed(url, options = {}) {
    let s = read();
    if (!s?.access_token) throw new Error('Authentication required');
    try {
      return await req(url, { ...options, headers: { ...H(s.access_token), ...(options.headers || {}) } });
    } catch (e) {
      if (e.status !== 401 || !s.refresh_token) throw e;
      s = await refresh();
      if (!s?.access_token) throw e;
      return req(url, { ...options, headers: { ...H(s.access_token), ...(options.headers || {}) } });
    }
  }

  function normalizeZA(phone) {
    let d = String(phone || '').trim().replace(/[^\d+]/g, '');
    if (d.startsWith('00')) d = `+${d.slice(2)}`;
    if (d.startsWith('0')) d = `+27${d.slice(1)}`;
    if (d.startsWith('27')) d = `+${d}`;
    return d;
  }

  async function restoreSession() {
    const existing = read();
    if (!existing?.access_token) return null;
    try {
      const user = await req(`${A}/user`, { headers: H(existing.access_token) });
      const next = { ...existing, user };
      write(next);
      return next;
    } catch (e) {
      if (e.status === 401 && existing.refresh_token) return refresh();
      write(null);
      return null;
    }
  }

  window.EFGCAuth = {
    session: read,
    restoreSession,
    restoreCallback: restoreSession,
    refresh,
    normalizeZA,
    remembersDevice,
    setRememberDevice(enabled) {
      const previous = read();
      localStorage.setItem(REMEMBER_KEY, enabled ? '1' : '0');
      write(previous);
    },
    setSession(data) {
      if (!data?.access_token || !data?.user?.id) throw new Error('Invalid authentication session.');
      write(data);
      return data;
    },
    userId() { return read()?.user?.id || null; },
    accessToken() { return read()?.access_token || null; },
    async getMyProfile() {
      const s = read();
      if (!s?.access_token || !s.user?.id) return null;
      const rows = await authed(`${R}/profiles?id=eq.${encodeURIComponent(s.user.id)}&select=*`);
      return rows?.[0] || null;
    },
    async upsertProfile(v) {
      const s = read();
      if (!s?.access_token || !s.user?.id) throw new Error('Authentication required');
      const rows = await authed(`${R}/profiles?on_conflict=id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ id: s.user.id, ...v }),
      });
      return rows?.[0] || null;
    },
    async upsertSafeguarding(v) {
      const s = read();
      if (!s?.access_token || !s.user?.id) throw new Error('Authentication required');
      const rows = await authed(`${R}/safeguarding_contacts?on_conflict=youth_id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ youth_id: s.user.id, ...v }),
      });
      return rows?.[0] || null;
    },
    async rest(path, options = {}) { return authed(`${R}/${path.replace(/^\//, '')}`, options); },
    async uploadPrivatePhoto(file) {
      const s = read();
      if (!s?.access_token || !s.user?.id) throw new Error('Authentication required');
      if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Use JPG, PNG or WebP.');
      if (file.size > 5 * 1024 * 1024) throw new Error('Photo must be 5 MB or smaller.');
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${s.user.id}/profile-${Date.now()}.${ext}`;
      const encoded = path.split('/').map(encodeURIComponent).join('/');
      await authed(`${S}/object/member-photos/${encoded}`, {
        method: 'POST',
        headers: { 'Content-Type': file.type, 'x-upsert': 'false' },
        body: file,
      });
      return path;
    },
    async updatePassword(password) {
      if (String(password || '').length < 10) throw new Error('Use a password with at least 10 characters.');
      const s = read();
      if (!s?.access_token) throw new Error('Authentication required');
      return authed(`${A}/user`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
    },
    async signOut() {
      const s = read();
      if (s?.access_token) {
        try { await fetch(`${A}/logout`, { method: 'POST', headers: H(s.access_token) }); } catch {}
      }
      write(null);
      localStorage.removeItem('efgcYouthSession');
      sessionStorage.removeItem('efgcYouthSession');
    },
  };
})();
