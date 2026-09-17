/** EFGC Youth v61 — safe smoke-test login for Youth and Leader roles. */
(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('smoke') !== '1') return;

  const $ = (s) => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let smokeRole = params.get('role') === 'leader' ? 'leader' : 'youth';

  function normalizePhone(v) {
    return window.EFGCAuth?.normalizeZA ? EFGCAuth.normalizeZA(v) : String(v || '').trim();
  }

  function setStatus(text, kind='') {
    const el = $('#smokeStatus');
    if (!el) return;
    el.textContent = text;
    el.className = `smoke-status ${kind}`.trim();
  }

  function syncRole() {
    document.querySelectorAll('[data-smoke-role]').forEach((b) => {
      b.classList.toggle('active', b.dataset.smokeRole === smokeRole);
    });
    const title = $('#smokeRoleTitle');
    if (title) title.textContent = smokeRole === 'leader' ? 'Leader Login Test' : 'Youth Login Test';
    const button = $('#smokeLoginButton');
    if (button) button.textContent = smokeRole === 'leader' ? 'Run Leader Login Test' : 'Run Youth Login Test';
    setStatus('');
  }

  async function callMemberAuth(body) {
    const c = window.EFGC_SUPABASE;
    if (!c?.url || !c?.publishableKey) throw new Error('Supabase configuration is unavailable.');
    const r = await fetch(`${c.url}/functions/v1/member-auth`, {
      method: 'POST',
      headers: { apikey: c.publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(data?.error || `Authentication failed (${r.status}).`);
      e.status = r.status;
      throw e;
    }
    return data;
  }

  async function checkAuthService() {
    const button = $('#smokeServiceButton');
    if (button) button.disabled = true;
    try {
      setStatus('Checking production authentication service…');
      const c = window.EFGC_SUPABASE;
      if (!c?.url || !c?.publishableKey) throw new Error('Supabase configuration is unavailable.');
      const r = await fetch(`${c.url}/functions/v1/member-auth`, {
        method: 'OPTIONS',
        headers: { apikey: c.publishableKey },
      });
      if (!r.ok) throw new Error(`Auth service returned ${r.status}.`);
      setStatus('Authentication service is reachable.', 'ok');
    } catch (e) {
      setStatus(`Service check failed: ${e.message}`, 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function runSmokeLogin() {
    const phone = normalizePhone($('#smokePhone')?.value || '');
    const password = $('#smokePassword')?.value || '';
    const button = $('#smokeLoginButton');
    if (!/^\+27\d{9}$/.test(phone)) return setStatus('Enter a valid South African cellphone number.', 'error');
    if (!password) return setStatus('Enter the account password.', 'error');

    if (button) button.disabled = true;
    try {
      setStatus(`Testing ${smokeRole === 'leader' ? 'Leader' : 'Youth'} authentication…`);
      const result = await callMemberAuth({ action: 'login', phone, password });
      if (!result?.session?.access_token || !result?.session?.user?.id) throw new Error('Authentication returned an incomplete session.');

      EFGCAuth.setSession(result.session);
      const profile = await EFGCAuth.getMyProfile();
      if (!profile) throw new Error('Authenticated, but the EFGC profile could not be loaded.');
      if (profile.role !== smokeRole) {
        await EFGCAuth.signOut();
        throw new Error(`This account is registered as ${profile.role}, not ${smokeRole}.`);
      }

      session = {
        name: profile.full_name || 'EFGC Member',
        phone: profile.phone || '',
        role: profile.role,
        approval_status: profile.approval_status || 'approved',
        uid: profile.id || result.session.user.id,
      };
      localStorage.setItem('efgcYouthSession', JSON.stringify(session));

      if (profile.role === 'leader' && profile.approval_status !== 'approved') {
        setStatus('PASS — Leader authentication works. Account is pending Admin approval, so staff tools remain restricted.', 'warn');
      } else {
        setStatus(`PASS — ${profile.role === 'leader' ? 'Leader' : 'Youth'} authentication and profile verification succeeded.`, 'ok');
      }

      await render();
      setTimeout(() => {
        $('#smokeLoginOverlay')?.classList.add('smoke-minimized');
      }, 900);
    } catch (e) {
      try { await EFGCAuth?.signOut?.(); } catch {}
      setStatus(`FAIL — ${e.message || 'Login test failed.'}`, 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function exitSmokeMode() {
    const url = new URL(location.href);
    url.searchParams.delete('smoke');
    url.searchParams.delete('role');
    location.href = url.toString();
  }

  function buildSmokeScreen() {
    if ($('#smokeLoginOverlay')) return;
    const overlay = document.createElement('section');
    overlay.id = 'smokeLoginOverlay';
    overlay.className = 'smoke-login-overlay';
    overlay.innerHTML = `
      <div class="smoke-login-shell">
        <div class="smoke-brand-row">
          <img src="assets/efgc-logo.svg?v=60.0" alt="Emmanuel Full Gospel Church official logo">
          <div><span>EFGC YOUTH</span><strong>SMOKE TEST LOGIN</strong></div>
        </div>
        <p class="smoke-note">Production authentication test. This screen does not bypass Supabase, passwords, approvals or role permissions.</p>
        <div class="smoke-role-switch">
          <button type="button" data-smoke-role="youth">Youth</button>
          <button type="button" data-smoke-role="leader">Leader</button>
        </div>
        <h2 id="smokeRoleTitle">Youth Login Test</h2>
        <label>Cellphone number<input id="smokePhone" type="tel" inputmode="tel" autocomplete="username" placeholder="e.g. 071 234 5678"></label>
        <label>Password<input id="smokePassword" type="password" autocomplete="current-password" placeholder="Enter test account password"></label>
        <button id="smokeLoginButton" class="primary-login" type="button">Run Youth Login Test</button>
        <button id="smokeServiceButton" class="ghost-login smoke-service-button" type="button">Check Auth Service</button>
        <p id="smokeStatus" class="smoke-status" aria-live="polite"></p>
        <div class="smoke-footer-actions">
          <button id="smokeRestore" class="ghost-login hidden" type="button">Restore Smoke Panel</button>
          <button id="smokeExit" class="smoke-exit" type="button">Exit Smoke Test</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('[data-smoke-role]').forEach((b) => b.addEventListener('click', () => {
      smokeRole = b.dataset.smokeRole;
      syncRole();
    }));
    $('#smokeLoginButton')?.addEventListener('click', runSmokeLogin);
    $('#smokeServiceButton')?.addEventListener('click', checkAuthService);
    $('#smokeExit')?.addEventListener('click', exitSmokeMode);
    $('#smokeRestore')?.addEventListener('click', () => overlay.classList.remove('smoke-minimized'));
    $('#smokePassword')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSmokeLogin(); });
    syncRole();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildSmokeScreen, { once:true });
  else buildSmokeScreen();
})();