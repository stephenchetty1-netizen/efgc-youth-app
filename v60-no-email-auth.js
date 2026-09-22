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
    const registering = authMode === 'register';
    $('#emailField')?.classList.add('hidden');
    $('#passwordRecoveryControls')?.classList.add('hidden');
    $('#passwordResetPanel')?.classList.add('hidden');
    $('#supabaseOtpBox')?.remove();
    $('#passwordField')?.classList.remove('hidden');
    $('#phoneField')?.classList.remove('hidden');
    $('#nameField')?.classList.toggle('hidden', !registering);
    $('#dobField')?.classList.toggle('hidden', !registering);
    $('#photoField')?.classList.toggle('hidden', !registering);
    $('#roleField')?.classList.add('hidden');
    $('#youthSafeguardingFields')?.classList.toggle('hidden', !registering);
    $('#photoPrivacyNote')?.classList.toggle('hidden', !registering);
    document.querySelectorAll('#noEmailModeSwitch [data-auth-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.authMode === authMode);
    });
    const phone = $('#loginPhone');
    if (phone) {
      phone.placeholder = registering ? 'e.g. 071 234 5678' : '071 234 5678 or admin';
      phone.autocomplete = registering ? 'tel' : 'username';
    }
    const password = $('#loginPassword');
    if (password) password.placeholder = registering ? 'Create your password' : 'Enter your password';
    const button = $('#continueButton');
    if (button) button.textContent = registering ? 'Create Youth Profile' : 'Sign In';
    $('#loginTitle').textContent = registering ? 'Join EFGC Youth' : 'EFGC Youth Sign In';
    $('#loginHint').textContent = registering
      ? 'Register as Youth. An Admin can approve your account for Leader access later.'
      : 'One secure sign-in for Youth, approved Leaders and Admins. Enter your registered cellphone number and password. Existing Admin without a linked number: use admin as the username.';
  }

  // Compatibility with older welcome artwork: role selection never changes login permissions.
  window.selectRole = function() {
    loginRole = 'youth';
    syncUi();
  };

  async function authBridge(payload) {
    const c = window.EFGC_SUPABASE;
    const headers = { apikey: c.publishableKey, 'Content-Type': 'application/json' };
    const token = window.EFGCAuth?.accessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    let r;
    try {
      r = await fetch(`${c.url}/functions/v1/member-auth`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch (error) {
      window.EFGCNetwork?.notice?.('Could not reach EFGC sign-in. Check mobile data or Wi-Fi, then retry. If the installed APK keeps failing, use the secure EFGC website.');
      throw new Error('EFGC sign-in could not reach the server. Check your connection and try again.');
    }
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

  // Refresh role changes made by an Admin while a member already has the app open.
  // No local role selector or cached role can grant permissions.
  let roleRefreshBusy = false;
  async function refreshAccountAccess() {
    if (roleRefreshBusy || !session?.uid || !EFGCAuth.accessToken()) return;
    roleRefreshBusy = true;
    try {
      const fresh = await EFGCAuth.getMyProfile();
      if (!fresh || fresh.id !== session.uid || fresh.archived_at) {
        await EFGCAuth.signOut();
        session = null;
        renderShell();
        return;
      }
      const updated = sessionFromProfile(fresh, EFGCAuth.session()?.user);
      if (updated.role !== session.role
        || updated.approval_status !== session.approval_status
        || updated.name !== session.name
        || updated.phone !== session.phone) {
        session = updated;
        localStorage.removeItem('efgcYouthSession');
        sessionStorage.removeItem('efgcYouthSession');
        (EFGCAuth.remembersDevice() ? localStorage : sessionStorage)
          .setItem('efgcYouthSession', JSON.stringify(session));
        await render();
      }
    } catch (error) {
      // Temporary network errors do not change the member's stored role.
      console.warn('EFGC account refresh could not complete', error.message || error);
    } finally {
      roleRefreshBusy = false;
    }
  }
  window.refreshEFGCSessionRole = refreshAccountAccess;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshAccountAccess();
  });
  window.addEventListener('pageshow', refreshAccountAccess);

  function readForm() {
    return {
      name: $('#loginName')?.value.trim() || '',
      phone: $('#loginPhone')?.value.trim() || '',
      password: $('#loginPassword')?.value || '',
      dob: $('#loginDob')?.value || '',
      role: 'youth',
    };
  }

  function validateRegistration(d) {
    if (!d.name) throw new Error('Enter your full name.');
    if (!d.phone) throw new Error('Enter your cellphone number.');
    if (d.password.length < 10) throw new Error('Use a password with at least 10 characters.');
    if (!d.dob) throw new Error('Date of birth is required.');
    if (!$('#loginPhoto')?.files?.length) throw new Error('A face photo is required for first-time registration.');
    if (!$('#parentName')?.value.trim() || !$('#parentPhone')?.value.trim() || !$('#emergencyName')?.value.trim() || !$('#emergencyPhone')?.value.trim()) {
      throw new Error('Parent/guardian and emergency contact details are required.');
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
      leader_role: null,
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

    await EFGCAuth.upsertSafeguarding({
      parent_name: $('#parentName').value.trim(),
      parent_phone: $('#parentPhone').value.trim(),
      emergency_name: $('#emergencyName').value.trim(),
      emergency_phone: $('#emergencyPhone').value.trim(),
    });
    return finish(profile, result.session.user);
  }

  async function adminAliasSignIn(d) {
    // Keep the existing Admin account accessible until the Admin links a cellphone.
    // The backend verifies the password and the Admin role against Supabase.
    if (!d.password) throw new Error('Enter your password.');
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
      if (!d.phone) throw new Error('Enter your registered cellphone number or Admin username.');
      if (!d.password) throw new Error('Enter your password.');

      if (authMode === 'register') {
        validateRegistration(d);
        if (!/^\+27\d{9}$/.test(EFGCAuth.normalizeZA(d.phone))) {
          throw new Error('Enter a valid South African cellphone number to register.');
        }
        const result = await authBridge({
          action: 'register', role: 'youth', name: d.name, phone: d.phone,
          password: d.password,
        });
        return await completeRegistration(d, result);
      }

      // One login screen. Admin is a temporary username only for the existing
      // password-only Admin account. Everyone else signs in by cellphone.
      if (d.phone.toLowerCase() === 'admin') return await adminAliasSignIn(d);
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

  window.linkAdminCellphone = async () => {
    const note = $('#adminLinkMessage');
    const button = $('#adminLinkButton');
    const phone = EFGCAuth.normalizeZA($('#adminLinkPhone')?.value || '');
    const passwordInput = $('#adminLinkConfirmPassword');
    const password = passwordInput?.value || '';
    const say = (value) => { if (note) note.textContent = value; };
    if (session?.role !== 'admin' || session?.approval_status !== 'approved') return;
    if (!/^\+27\d{9}$/.test(phone)) return say('Enter a valid South African cellphone number.');
    if (!password) return say('Confirm your current Admin password to link the number.');
    if (button) button.disabled = true;
    try {
      say('Verifying your Admin password and linking the number…');
      // Re-authenticate with the existing Admin account. Never trust a name or role
      // typed in the form to determine access.
      const verified = await authBridge({ action: 'admin-login', password });
      if (verified?.session?.user?.id !== session.uid
        || verified?.profile?.role !== 'admin'
        || verified?.profile?.approval_status !== 'approved') {
        throw new Error('The Admin password does not match your account.');
      }
      const rows = await EFGCAuth.rest(
        'profiles?id=eq.' + encodeURIComponent(session.uid) + '&role=eq.admin&approval_status=eq.approved',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify({ phone }),
        }
      );
      if (!Array.isArray(rows) || rows.length !== 1 || rows[0].phone !== phone) {
        throw new Error('Your account was not updated. Check Admin access.');
      }
      session.phone = phone;
      localStorage.removeItem('efgcYouthSession');
      sessionStorage.removeItem('efgcYouthSession');
      (EFGCAuth.remembersDevice() ? localStorage : sessionStorage)
        .setItem('efgcYouthSession', JSON.stringify(session));
      if (passwordInput) passwordInput.value = '';
      await renderLiveData();
      setAdminMessage('Admin cellphone linked. You can now sign in with that number and your existing password.');
    } catch (error) {
      say(error.message || 'Could not link the cellphone number.');
    } finally {
      if (passwordInput) passwordInput.value = '';
      if (button && button.isConnected) button.disabled = false;
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
