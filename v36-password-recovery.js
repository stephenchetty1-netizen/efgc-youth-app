/** EFGC Youth v42 — reliable Admin password recovery and authenticated password setup. */
(() => {
  const c = window.EFGC_SUPABASE;
  if (!c?.url || !c?.publishableKey || !window.EFGCAuth) return;

  const $ = (s) => document.querySelector(s);
  const setMessage = (text) => { const el = $('#loginMessage'); if (el) el.textContent = text; };
  const PRODUCTION_RECOVERY_URL = 'https://stephenchetty1-netizen.github.io/efgc-youth-app/';
  const callbackUrl = () => location.hostname === 'stephenchetty1-netizen.github.io' ? `${location.origin}${location.pathname}` : PRODUCTION_RECOVERY_URL;
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
    window.EFGCWelcome?.openLogin('admin', 'login', false);
    $('#mockWelcome')?.classList.add('hidden');
    $('#login .login-card')?.classList.remove('mock-login-hidden');
    $('#passwordField')?.classList.add('hidden');
    document.querySelectorAll('#mainMenu,.userbar').forEach((el) => el.classList.add('hidden'));
    $('#passwordRecoveryControls')?.classList.add('hidden');
    $('#passwordResetPanel')?.classList.remove('hidden');
    $('#continueButton')?.classList.add('hidden');
    const email = EFGCAuth.session()?.user?.email;
    if (email && $('#loginEmail')) $('#loginEmail').value = email;
    setMessage('Recovery link verified. Choose a new Admin password below.');
  }

  // Allow the auth UI to explicitly yield to the recovery form instead of auto-opening the app shell.
  window.EFGCPasswordRecovery = {
    isActive: () => sessionStorage.getItem('efgcPasswordRecovery') === '1',
    showForm: showRecoveryForm,
  };

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
    if ($('#forgotPasswordButton')?.disabled) return;
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
        signal: AbortSignal.timeout(20000),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error_description || body?.msg || body?.message || 'Password recovery could not be started.');
      setMessage('Password-reset email requested. Open the secure link in that email; it will return you here to choose a new password.');
    } catch (e) {
      if (/rate limit/i.test(String(e.message))) {
        setMessage('The email limit is still active. Please wait before requesting another reset email.');
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

  async function updateCurrentPassword(password) {
    const auth = EFGCAuth.session();
    if (!auth?.access_token) throw new Error('Your secure Admin session is missing or expired.');
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
    return body;
  }

  async function finishPasswordChange(successText) {
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
    document.querySelectorAll('#newAdminPassword,#confirmAdminPassword,#adminSessionNewPassword,#adminSessionConfirmPassword').forEach(el => { el.value = ''; });
    window.EFGCWelcome?.openLogin('admin', 'login', false);
    window.EFGCLogin?.syncRoleUi();
    setMessage(successText);
  }

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

    try {
      setMessage('Saving your new Admin password…');
      await updateCurrentPassword(password);
      await finishPasswordChange('Password reset complete. Sign in with your new Admin password.');
    } catch (e) {
      setMessage(`Password could not be reset: ${e.message}`);
    }
  };

  function injectAuthenticatedPasswordCard() {
    const panel = $('#adminPanel');
    const auth = EFGCAuth.session();
    if (!panel || !auth?.access_token || typeof session === 'undefined' || session?.role !== 'admin') return;
    if ($('#adminPasswordCard')) return;

    const card = document.createElement('article');
    card.id = 'adminPasswordCard';
    card.className = 'card';
    card.innerHTML = '<h3>🔐 Admin Password</h3><p>Set or change the password for this signed-in Admin account. You will be signed out after saving and must sign in again with the new password.</p><label>New Admin password<input id="adminSessionNewPassword" type="password" autocomplete="new-password" placeholder="At least 10 characters"></label><label>Confirm new password<input id="adminSessionConfirmPassword" type="password" autocomplete="new-password" placeholder="Re-enter new password"></label><button class="primary-login" type="button" onclick="setAdminPasswordFromSession()">Set Admin Password</button><p id="adminPasswordMessage" class="login-message"></p>';
    panel.prepend(card);
  }

  window.setAdminPasswordFromSession = async () => {
    const password = $('#adminSessionNewPassword')?.value || '';
    const confirm = $('#adminSessionConfirmPassword')?.value || '';
    const message = $('#adminPasswordMessage');
    const write = (text) => { if (message) message.textContent = text; };

    if (password.length < 10) return write('Use a password with at least 10 characters.');
    if (password !== confirm) return write('The two password entries do not match.');
    if (typeof session === 'undefined' || session?.role !== 'admin') return write('Approved Admin access is required.');

    try {
      write('Saving the Admin password…');
      await updateCurrentPassword(password);
      await finishPasswordChange('Admin password saved. Sign in with the new password.');
    } catch (e) {
      write(`Password could not be saved: ${e.message}`);
    }
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('.login-type')) setTimeout(syncRecoveryUi, 0);
    if (e.target.closest('[data-tab="admin"]')) setTimeout(injectAuthenticatedPasswordCard, 50);
  });

  const adminPanel = $('#adminPanel');
  if (adminPanel) {
    new MutationObserver(() => setTimeout(injectAuthenticatedPasswordCard, 0))
      .observe(adminPanel, { childList: true, subtree: false });
  }

  injectRecoveryUi();
  if (sessionStorage.getItem('efgcPasswordRecovery') === '1') setTimeout(showRecoveryForm, 600);
  setTimeout(injectAuthenticatedPasswordCard, 1000);
})();
