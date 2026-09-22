/** EFGC Youth v60 — cellphone + password UI. No email collection or email recovery. */
(() => {
  const $ = (s) => document.querySelector(s);
  let authMode = 'signin';

  function message(text) {
    const el = $('#loginMessage');
    if (el) el.textContent = text;
  }

  function ensureModeSwitch() {
    const hint = $('#loginHint');
    if (!hint || $('#noEmailModeSwitch')) return;
    const wrap = document.createElement('div');
    wrap.id = 'noEmailModeSwitch';
    wrap.className = 'no-email-mode-switch';
    wrap.innerHTML = '<button type="button" data-auth-mode="signin" class="active">Sign In</button><button type="button" data-auth-mode="register">New Registration</button>';
    hint.insertAdjacentElement('afterend', wrap);
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-auth-mode]');
      if (!b) return;
      authMode = b.dataset.authMode;
      syncUi();
    });
  }

  function syncUi() {
    ensureModeSwitch();
    const admin = loginRole === 'admin';
    const registering = !admin && authMode === 'register';

    $('#emailField')?.classList.add('hidden');
    $('#passwordRecoveryControls')?.classList.add('hidden');
    $('#passwordResetPanel')?.classList.add('hidden');
    $('#supabaseOtpBox')?.remove();
    $('#passwordField')?.classList.remove('hidden');
    $('#phoneField')?.classList.toggle('hidden', admin);
    $('#nameField')?.classList.toggle('hidden', !registering);
    $('#dobField')?.classList.toggle('hidden', !registering);
    $('#photoField')?.classList.toggle('hidden', !registering);
    $('#roleField')?.classList.toggle('hidden', !(registering && loginRole === 'leader'));
    $('#youthSafeguardingFields')?.classList.toggle('hidden', !(registering && loginRole === 'youth'));
    $('#photoPrivacyNote')?.classList.toggle('hidden', !registering);
    $('#noEmailModeSwitch')?.classList.toggle('hidden', admin);
    document.querySelectorAll('#noEmailModeSwitch [data-auth-mode]').forEach((b) => b.classList.toggle('active', b.dataset.authMode === authMode));

    const password = $('#loginPassword');
    if (password) password.placeholder = admin ? 'Enter your Admin password' : 'Enter your password';
    const button = $('#continueButton');
    if (button) button.textContent = admin ? 'Sign In Securely' : registering ? 'Create Secure Profile' : 'Sign In';

    if (admin) {
      $('#loginHint').textContent = 'Secure Admin sign-in uses your password. No email is required.';
      message('');
    } else if (registering) {
      $('#loginHint').textContent = loginRole === 'leader'
        ? 'Create your Leader profile with cellphone number and password. Leader access remains pending until Admin approval.'
        : 'Create your Youth profile with cellphone number and password. Complete the safeguarding details below.';
      message('');
    } else {
      $('#loginHint').textContent = `Returning ${loginRole === 'leader' ? 'Leaders' : 'Youth'}: sign in with your cellphone number and password.`;
      message('');
    }
  }

  const originalSelectRole = window.selectRole;
  window.selectRole = function(role) {
    originalSelectRole(role);
    authMode = 'signin';
    setTimeout(syncUi, 0);
  };

  async function authBridge(payload) {
    const c = window.EFGC_SUPABASE;
    const headers = { apikey: c.publishableKey, 'Content-Type': 'application/json' };
    const token = window.EFGCAuth?.accessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`${c.url}/functions/v1/member-auth`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(body?.error || 'Authentication request failed.');
      e.status = r.status;
      throw e;
    }
    return body;
  }

  function sessionFromProfile(profile, authUser) {
    return {
      name: profile.full_name || 'EFGC Member',
      phone: profile.phone || '',
      role: profile.role,
      approval_status: profile.approval_status || 'approved',
      uid: profile.id || authUser?.id,
    };
  }

  async function finish(profile, authUser) {
    // Android WebView: dismiss the keyboard before hiding the login form.
    const focused = document.activeElement;
    if (focused && typeof focused.blur === 'function') focused.blur();
    try { navigator.virtualKeyboard?.hide?.(); } catch (_) {}
    const passwordInput = $('#loginPassword');
    if (passwordInput) { passwordInput.value = ''; passwordInput.type = 'password'; }
    const showButton = $('#efgcTogglePassword');
    if (showButton) { showButton.textContent = 'Show'; showButton.setAttribute('aria-pressed', 'false'); }
    session = sessionFromProfile(profile, authUser);
    localStorage.removeItem('efgcYouthSession');
    sessionStorage.removeItem('efgcYouthSession');
    (EFGCAuth.remembersDevice() ? localStorage : sessionStorage).setItem('efgcYouthSession', JSON.stringify(session));
    message(session.role === 'leader' && session.approval_status !== 'approved'
      ? 'Your Leader application is signed in and awaiting Admin approval.'
      : 'Secure sign-in complete.');
    await render();
  }

  function readForm() {
    return {
      name: $('#loginName')?.value.trim() || '',
      phone: $('#loginPhone')?.value.trim() || '',
      password: $('#loginPassword')?.value || '',
      dob: $('#loginDob')?.value || '',
      role: loginRole,
      leaderRole: $('#loginRoleText')?.value.trim() || '',
    };
  }

  function validateRegistration(d) {
    if (!d.name) throw new Error('Enter your full name.');
    if (!d.phone) throw new Error('Enter your cellphone number.');
    if (d.password.length < 10) throw new Error('Use a password with at least 10 characters.');
    if (!d.dob) throw new Error('Date of birth is required.');
    if (!$('#loginPhoto')?.files?.length) throw new Error('A face photo is required for first-time registration.');
    if (d.role === 'youth') {
      if (!$('#parentName')?.value.trim() || !$('#parentPhone')?.value.trim() || !$('#emergencyName')?.value.trim() || !$('#emergencyPhone')?.value.trim()) {
        throw new Error('Parent/guardian and emergency contact details are required.');
      }
    }
  }

  async function completeRegistration(d, result) {
    EFGCAuth.setRememberDevice(Boolean($('#rememberDevice')?.checked));
    EFGCAuth.setSession(result.session);
    const base = result.profile;
    let profile = await EFGCAuth.upsertProfile({
      full_name: d.name,
      phone: EFGCAuth.normalizeZA(d.phone),
      birthday: d.dob,
      face_photo_path: base?.face_photo_path || null,
      role: base.role,
      approval_status: base.approval_status,
      leader_role: base.role === 'leader' ? (d.leaderRole || base.leader_role || 'EFGC Youth Leader') : null,
    });

    const photo = $('#loginPhoto')?.files?.[0];
    if (photo) {
      const path = await EFGCPhotoSecurity.upload(photo);
      profile = await EFGCAuth.upsertProfile({
        full_name: profile.full_name,
        phone: profile.phone,
        birthday: profile.birthday,
        face_photo_path: path,
        role: profile.role,
        approval_status: profile.approval_status,
        leader_role: profile.leader_role,
      }) || profile;
    }

    if (d.role === 'youth') {
      await EFGCAuth.upsertSafeguarding({
        parent_name: $('#parentName').value.trim(),
        parent_phone: $('#parentPhone').value.trim(),
        emergency_name: $('#emergencyName').value.trim(),
        emergency_phone: $('#emergencyPhone').value.trim(),
      });
    }
    return finish(profile, result.session.user);
  }

  async function adminSignIn(d) {
    if (!d.password) throw new Error('Enter your Admin password.');
    const result = await authBridge({ action: 'admin-login', password: d.password });
    EFGCAuth.setRememberDevice(Boolean($('#rememberDevice')?.checked));
    EFGCAuth.setSession(result.session);
    const profile = await EFGCAuth.getMyProfile();
    if (!profile || profile.role !== 'admin' || profile.approval_status !== 'approved') {
      await EFGCAuth.signOut();
      throw new Error('This account does not have approved Admin access.');
    }
    return finish(profile, result.session.user);
  }

  window.loginUser = async () => {
    message('');
    const d = readForm();
    const button = $('#continueButton');
    if (button) button.disabled = true;
    try {
      if (d.role === 'admin') return await adminSignIn(d);
      if (!d.phone) throw new Error('Enter your cellphone number.');
      if (!d.password) throw new Error('Enter your password.');

      if (authMode === 'register') {
        validateRegistration(d);
        const result = await authBridge({
          action: 'register', role: d.role, name: d.name, phone: d.phone,
          password: d.password, leaderRole: d.leaderRole,
        });
        return await completeRegistration(d, result);
      }

      const result = await authBridge({ action: 'login', phone: d.phone, password: d.password });
      EFGCAuth.setRememberDevice(Boolean($('#rememberDevice')?.checked));
      EFGCAuth.setSession(result.session);
      const profile = await EFGCAuth.getMyProfile();
      if (!profile) throw new Error('Your EFGC profile could not be loaded.');
      return await finish(profile, result.session.user);
    } catch (e) {
      message(e.message || 'Sign-in could not be completed.');
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.logoutUser = async () => {
    try { await EFGCAuth.signOut(); }
    finally {
      session = null;
      localStorage.removeItem('efgcYouthSession');
      sessionStorage.removeItem('efgcYouthSession');
      $('#loginPassword').value = '';
      authMode = 'signin';
      showLogin();
      renderShell();
      syncUi();
    }
  };

  function injectAdminPasswordCard() {
    const panel = $('#adminPanel');
    if (!panel || session?.role !== 'admin' || $('#v60AdminPasswordCard')) return;
    const card = document.createElement('article');
    card.id = 'v60AdminPasswordCard';
    card.className = 'card';
    card.innerHTML = '<h3>🔐 Admin Password</h3><p>Change the password for this signed-in Admin account. No email recovery is used.</p><label>New password<input id="v60AdminPassword" type="password" autocomplete="new-password" placeholder="At least 10 characters"></label><label>Confirm password<input id="v60AdminPasswordConfirm" type="password" autocomplete="new-password" placeholder="Re-enter password"></label><button class="primary-login" type="button" onclick="v60ChangeAdminPassword()">Change Password</button><p id="v60AdminPasswordMessage" class="login-message"></p>';
    panel.prepend(card);
  }

  window.v60ChangeAdminPassword = async () => {
    const p = $('#v60AdminPassword')?.value || '';
    const q = $('#v60AdminPasswordConfirm')?.value || '';
    const out = $('#v60AdminPasswordMessage');
    const say = (t) => { if (out) out.textContent = t; };
    if (p.length < 10) return say('Use a password with at least 10 characters.');
    if (p !== q) return say('The passwords do not match.');
    try {
      say('Saving password…');
      await EFGCAuth.updatePassword(p);
      say('Password changed successfully.');
      $('#v60AdminPassword').value = '';
      $('#v60AdminPasswordConfirm').value = '';
    } catch (e) { say(`Password could not be changed: ${e.message}`); }
  };

  function ensureMemberResetModal() {
    if ($('#memberPasswordResetModal')) return $('#memberPasswordResetModal');
    const modal = document.createElement('div');
    modal.id = 'memberPasswordResetModal';
    modal.className = 'member-reset-modal hidden';
    modal.innerHTML = '<div class="member-reset-card" role="dialog" aria-modal="true" aria-labelledby="memberResetTitle"><button class="member-reset-close" type="button" aria-label="Close password reset">×</button><small>ADMIN ONLY</small><h3 id="memberResetTitle">Reset Member Password</h3><p id="memberResetName"></p><label>Temporary password<input id="memberResetPassword" type="password" autocomplete="new-password" placeholder="At least 10 characters"></label><label>Confirm temporary password<input id="memberResetPasswordConfirm" type="password" autocomplete="new-password" placeholder="Re-enter password"></label><button id="memberResetSave" class="primary-login" type="button">Save Temporary Password</button><p id="memberResetMessage" class="login-message"></p><small>Share the temporary password directly with the member and ask them to change it after signing in.</small></div>';
    document.body.appendChild(modal);
    modal.querySelector('.member-reset-close')?.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    $('#memberResetSave')?.addEventListener('click', saveMemberPasswordReset);
    return modal;
  }

  function openMemberPasswordReset(button) {
    if (session?.role !== 'admin') return;
    const modal = ensureMemberResetModal();
    modal.dataset.userId = button.dataset.userId || '';
    $('#memberResetName').textContent = `Account: ${button.dataset.userName || 'EFGC Member'}`;
    $('#memberResetPassword').value = '';
    $('#memberResetPasswordConfirm').value = '';
    $('#memberResetMessage').textContent = '';
    modal.classList.remove('hidden');
    setTimeout(() => $('#memberResetPassword')?.focus(), 0);
  }

  async function saveMemberPasswordReset() {
    const modal = $('#memberPasswordResetModal');
    const userId = modal?.dataset.userId || '';
    const p = $('#memberResetPassword')?.value || '';
    const q = $('#memberResetPasswordConfirm')?.value || '';
    const out = $('#memberResetMessage');
    const button = $('#memberResetSave');
    const say = (t) => { if (out) out.textContent = t; };
    if (p.length < 10) return say('Use a temporary password with at least 10 characters.');
    if (p !== q) return say('The two password entries do not match.');
    if (!userId) return say('Choose a member account first.');
    if (button) button.disabled = true;
    try {
      say('Resetting password securely…');
      const result = await authBridge({ action: 'admin-reset-member-password', userId, newPassword: p });
      say(`${result.member?.full_name || 'Member'} password reset successfully.`);
      $('#memberResetPassword').value = '';
      $('#memberResetPasswordConfirm').value = '';
      setAdminMessage?.('Member password reset completed successfully.');
    } catch (e) {
      say(`Password reset failed: ${e.message}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  const adminPanel = $('#adminPanel');
  if (adminPanel) new MutationObserver(() => setTimeout(injectAdminPasswordCard, 0)).observe(adminPanel, { childList: true });
  document.addEventListener('click', (e) => {
    if (e.target.closest('.login-type')) setTimeout(syncUi, 0);
    if (e.target.closest('[data-tab="admin"]')) setTimeout(injectAdminPasswordCard, 50);
    const reset = e.target.closest('.member-password-reset');
    if (reset) openMemberPasswordReset(reset);
  });

  async function boot() {
    syncUi();
    try {
      const restored = await EFGCAuth.restoreSession();
      if (!restored?.access_token) return;
      const profile = await EFGCAuth.getMyProfile();
      if (!profile) {
        await EFGCAuth.signOut();
        return;
      }
      await finish(profile, restored.user);
    } catch (e) {
      message(`Session could not be restored: ${e.message}`);
    }
  }

  boot();
})();
