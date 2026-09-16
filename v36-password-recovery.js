/** EFGC Youth v37 — reliable Supabase password recovery controls for Admin. */
(() => {
  const c = window.EFGC_SUPABASE;
  if (!c?.url || !c?.publishableKey || !window.EFGCAuth) return;

  const $ = (s) => document.querySelector(s);
  const setMessage = (text) => { const el = $('#loginMessage'); if (el) el.textContent = text; };
  const callbackUrl = () => `${location.origin}${location.pathname}`;
  const initialHash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const initialQuery = new URL(location.href).searchParams;
  const arrivingFromRecovery = initialHash.get('type') === 'recovery' || initialQuery.get('type') === 'recovery';

  function bindRecoveryButton() {
    const button = $('#forgotPasswordButton');
    if (!button || button.dataset.bound === '1') return;
    button.dataset.bound = '1';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.requestAdminPasswordReset();
    });
  }

  function injectRecoveryUi() {
    const passwordField = $('#passwordField');
    if (!passwordField) return;

    let controls = $('#passwordRecoveryControls');
    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'passwordRecoveryControls';
      controls.className = 'hidden';
      controls.innerHTML = '<button id="forgotPasswordButton" class="ghost-login recovery-action" type="button" aria-label="Reset Admin password">Forgot password?</button>';
      passwordField.insertAdjacentElement('afterend', controls);
    }

    let panel = $('#passwordResetPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'passwordResetPanel';
      panel.className = 'hidden otp-box';
      panel.innerHTML = '<div class="required-section"><strong>🔐 Set a new Admin password</strong><small>Choose a new password after opening the secure recovery link sent by Supabase.</small></div><label>New password<input id="newAdminPassword" type="password" autocomplete="new-password" placeholder="At least 10 characters"></label><label>Confirm new password<input id="confirmAdminPassword" type="password" autocomplete="new-password" placeholder="Re-enter new password"></label><button class="primary-login" type="button" onclick="completeAdminPasswordReset()">Set New Password</button>';
      controls.insertAdjacentElement('afterend', panel);
    }

    bindRecoveryButton();
    syncRecoveryUi();
  }

  function syncRecoveryUi() {
    const isAdmin = typeof loginRole !== 'undefined' && loginRole === 'admin';
    $('#passwordRecoveryControls')?.classList.toggle('hidden', !isAdmin || sessionStorage.getItem('efgcPasswordRecovery') === '1');
    if (!isAdmin && sessionStorage.getItem('efgcPasswordRecovery') !== '1') {
      $('#passwordResetPanel')?.classList.add('hidden');
    }
    bindRecoveryButton();
  }

  function showRecoveryForm() {
    injectRecoveryUi();
    try { selectRole('admin'); } catch {}
    try { showLogin(); } catch {}
    document.querySelectorAll('#mainMenu,.userbar').forEach((el) => el.classList.add('hidden'));
    $('#passwordRecoveryControls')?.classList.add('hidden');
    $('#passwordResetPanel')?.classList.remove('hidden');
    $('#continueButton')?.classList.add('hidden');
    const email = EFGCAuth.session()?.user?.email;
    if (email && $('#loginEmail')) $('#loginEmail').value = email;
    setMessage('Recovery link verified. Choose a new Admin password below.');
  }

  const originalRestoreCallback = EFGCAuth.restoreCallback;
  EFGCAuth.restoreCallback = async (...args) => {
    const result = await originalRestoreCallback(...args);
    if (arrivingFromRecovery && result?.access_token) {
      sessionStorage.setItem('efgcPasswordRecovery', '1');
      setTimeout(showRecoveryForm, 350);
    }
    return result;
  };

  window.requestAdminPasswordReset = async () => {
    const email = String($('#loginEmail')?.value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage('Enter the Admin email address first.');
      $('#loginEmail')?.focus();
      return;
    }

    const button = $('#forgotPasswordButton');
    if (button) {
      button.disabled = true;
      button.textContent = 'Requesting reset…';
    }

    try {
      setMessage('Requesting a secure password-reset email…');
      const r = await fetch(`${c.url}/auth/v1/recover?redirect_to=${encodeURIComponent(callbackUrl())}`, {
        method: 'POST',
        headers: { apikey: c.publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error_description || body?.msg || body?.message || 'Password recovery could not be started.');
      setMessage('Password-reset email requested. Open the secure link in that email; it will return you here to choose a new password.');
    } catch (e) {
      if (/rate limit/i.test(String(e.message))) {
        setMessage('The Supabase email limit is still active. Please try again after the hourly email window clears.');
      } else {
        setMessage(`Password reset could not start: ${e.message}`);
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Forgot password?';
      }
    }
  };

  window.completeAdminPasswordReset = async () => {
    const password = $('#newAdminPassword')?.value || '';
    const confirm = $('#confirmAdminPassword')?.value || '';
    if (password.length < 10) {
      setMessage('Use a new password with at least 10 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('The two new-password entries do not match.');
      return;
    }
    const auth = EFGCAuth.session();
    if (!auth?.access_token) {
      setMessage('The recovery session is missing or expired. Request a new password-reset email.');
      return;
    }

    try {
      setMessage('Saving your new Admin password…');
      const r = await fetch(`${c.url}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: c.publishableKey,
          Authorization: `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error_description || body?.msg || body?.message || 'Password could not be updated.');

      sessionStorage.removeItem('efgcPasswordRecovery');
      try { await EFGCAuth.signOut(); } catch {}
      try { session = null; } catch {}
      localStorage.removeItem('efgcYouthSession');
      $('#passwordResetPanel')?.classList.add('hidden');
      $('#continueButton')?.classList.remove('hidden');
      try { selectRole('admin'); } catch {}
      try { renderShell(); } catch {}
      syncRecoveryUi();
      if ($('#loginPassword')) $('#loginPassword').value = '';
      setMessage('Password reset complete. Sign in with your new Admin password.');
    } catch (e) {
      setMessage(`Password could not be reset: ${e.message}`);
    }
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('.login-type')) setTimeout(syncRecoveryUi, 0);
  });

  injectRecoveryUi();
  if (sessionStorage.getItem('efgcPasswordRecovery') === '1') setTimeout(showRecoveryForm, 600);
})();
