/** EFGC Youth v39 — Supabase Auth + REST adapter.
 * Browser-safe only: project URL + publishable key. RLS remains authoritative.
 */
(() => {
  const c = window.EFGC_SUPABASE;
  if (!c) throw new Error('EFGC Supabase configuration missing');
  const A = `${c.url}/auth/v1`;
  const R = `${c.url}/rest/v1`;
  const S = `${c.url}/storage/v1`;
  const K = 'efgcSupabaseAuth';
  const PRODUCTION_URL = 'https://stephenchetty1-netizen.github.io/efgc-youth-app/';
  const H = (token, extra = {}) => ({ apikey: c.publishableKey, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra });
  const read = () => { try { return JSON.parse(localStorage.getItem(K) || 'null'); } catch { return null; } };
  let sessionVersion = 0;
  let refreshInFlight = null;
  const write = (v) => { sessionVersion += 1; return v ? localStorage.setItem(K, JSON.stringify(v)) : localStorage.removeItem(K); };
  // Never generate production auth emails that return to localhost/preview hosts.
  const callbackUrl = () => PRODUCTION_URL;

  async function req(url, options = {}) {
    const r = await fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(20000) });
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
    if (refreshInFlight) return refreshInFlight;
    const s = read(); if (!s?.refresh_token) return null;
    const version = sessionVersion;
    const stillCurrent = () => version === sessionVersion && read()?.user?.id === s.user?.id && read()?.refresh_token === s.refresh_token;
    refreshInFlight = (async () => {
      try {
        const data = await req(`${A}/token?grant_type=refresh_token`, { method:'POST', headers:{...H(null),'Content-Type':'application/json'}, body:JSON.stringify({refresh_token:s.refresh_token}) });
        if (!stillCurrent()) return null;
        write(data); return data;
      } catch (e) {
        if ([400,401,403].includes(e.status) && stillCurrent()) write(null);
        throw e;
      } finally { refreshInFlight = null; }
    })();
    return refreshInFlight;
  }
  async function authed(url, options={}) {
    let s=read(); if(!s?.access_token) throw new Error('Authentication required');
    const userId = s.user?.id;
    const assertCurrent = () => {
      if (!userId || read()?.user?.id !== userId) throw new Error('Your session changed. Sign in again.');
    };
    assertCurrent();
    try {
      const result = await req(url,{...options,headers:{...H(s.access_token),...(options.headers||{})}});
      assertCurrent();
      return result;
    }
    catch(e){
      assertCurrent();
      if(e.status!==401||!s.refresh_token) throw e;
      s=await refresh();
      assertCurrent();
      if(!s?.access_token || s.user?.id !== userId) throw e;
      const result = await req(url,{...options,headers:{...H(s.access_token),...(options.headers||{})}});
      assertCurrent();
      return result;
    }
  }
  function normalizeZA(phone){ const d=String(phone||'').replace(/[^\d+]/g,''); if(d.startsWith('+'))return d;if(d.startsWith('0'))return `+27${d.slice(1)}`;if(d.startsWith('27'))return `+${d}`;return d; }

  async function restoreCallback(){
    const url=new URL(location.href); const hash=new URLSearchParams(url.hash.replace(/^#/,''));
    const callbackError=hash.get('error_description')||hash.get('error')||url.searchParams.get('error_description')||url.searchParams.get('error');
    if(callbackError){ ['error','error_description','error_code'].forEach(key => url.searchParams.delete(key)); history.replaceState(null,'',url.pathname+url.search); throw new Error(callbackError); }
    const access_token=hash.get('access_token'), refresh_token=hash.get('refresh_token');
    if(access_token){ const user=await req(`${A}/user`,{headers:H(access_token)}); const s={access_token,refresh_token,token_type:hash.get('token_type')||'bearer',expires_in:Number(hash.get('expires_in')||3600),expires_at:Number(hash.get('expires_at')||0),user}; write(s); history.replaceState(null,'',location.pathname+location.search); return s; }
    const token_hash=url.searchParams.get('token_hash'); const type=url.searchParams.get('type')||'email';
    if(token_hash){ const data=await req(`${A}/verify`,{method:'POST',headers:{...H(null),'Content-Type':'application/json'},body:JSON.stringify({token_hash,type})}); write(data); url.searchParams.delete('token_hash');url.searchParams.delete('type');history.replaceState(null,'',url.pathname+(url.search?url.search:''));return data; }
    const existing=read(); if(existing?.access_token){ try{await req(`${A}/user`,{headers:H(existing.access_token)});return existing;}catch(e){if(e.status===401&&existing.refresh_token)return refresh();if([401,403].includes(e.status)){write(null);return null;}throw e;} } return null;
  }

  window.EFGCAuth={session:read,restoreCallback,refresh,normalizeZA,callbackUrl,userId(){return read()?.user?.id||null;},accessToken(){return read()?.access_token||null;},
    async requestEmailOtp(email,createUser=true){email=String(email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');await req(`${A}/otp?redirect_to=${encodeURIComponent(PRODUCTION_URL)}`,{method:'POST',headers:{...H(null),'Content-Type':'application/json'},body:JSON.stringify({email,create_user:Boolean(createUser)})});return email;},
    async verifyEmailOtp(email,token){const data=await req(`${A}/verify`,{method:'POST',headers:{...H(null),'Content-Type':'application/json'},body:JSON.stringify({type:'email',email:String(email).trim().toLowerCase(),token:String(token).trim()})});write(data);return data;},
    async getMyProfile(){const s=read();if(!s?.access_token||!s.user?.id)return null;const rows=await authed(`${R}/profiles?id=eq.${encodeURIComponent(s.user.id)}&select=*`);return rows?.[0]||null;},
    async upsertProfile(v){const s=read();if(!s?.access_token||!s.user?.id)throw new Error('Authentication required');const rows=await authed(`${R}/profiles?on_conflict=id`,{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({id:s.user.id,...v})});return rows?.[0]||null;},
    async upsertSafeguarding(v){const s=read();if(!s?.access_token||!s.user?.id)throw new Error('Authentication required');const rows=await authed(`${R}/safeguarding_contacts?on_conflict=youth_id`,{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({youth_id:s.user.id,...v})});return rows?.[0]||null;},
    async rest(path,options={}){return authed(`${R}/${path.replace(/^\//,'')}`,options);},
    async uploadPrivatePhoto(file){const s=read();if(!s?.access_token||!s.user?.id)throw new Error('Authentication required');if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Use JPG, PNG or WebP.');if(file.size>5*1024*1024)throw new Error('Photo must be 5 MB or smaller.');const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=`${s.user.id}/profile-${Date.now()}.${ext}`;const encoded=path.split('/').map(encodeURIComponent).join('/');await authed(`${S}/object/member-photos/${encoded}`,{method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});return path;},
    async signOut(){const s=read();write(null);localStorage.removeItem('efgcYouthSession');if(s?.access_token){try{await fetch(`${A}/logout`,{method:'POST',headers:H(s.access_token),signal:AbortSignal.timeout(10000)});}catch{}}}
  };
})();
