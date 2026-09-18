/** EFGC Youth v66 — WhatsApp OTP password recovery + optional registration verification. */
(() => {
  const $ = (s) => document.querySelector(s);
  const originalLoginUser = window.loginUser;
  let resetToken = '';
  let resetPhone = '';
  let pendingRegistration = null;

  function setLoginMessage(text) {
    const el = $('#loginMessage');
    if (el) el.textContent = text || '';
  }

  async function authBridge(payload) {
    const c = window.EFGC_SUPABASE;
    if (!c?.url || !c?.publishableKey) throw new Error('Authentication service is unavailable.');
    const headers = { apikey: c.publishableKey, 'Content-Type': 'application/json' };
    const token = window.EFGCAuth?.accessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`${c.url}/functions/v1/member-auth`, {
      method: 'POST', headers, body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(body?.error || 'Authentication request failed.');
      e.status = r.status;
      throw e;
    }
    return body;
  }

  function isRegistrationMode() {
    return loginRole !== 'admin' && !$('#nameField')?.classList.contains('hidden');
  }

  function syncForgotButton() {
    let btn = $('#v66ForgotPassword');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'v66ForgotPassword';
      btn.type = 'button';
      btn.className = 'v66-forgot-button';
      btn.innerHTML = '<span>💬</span> Forgot Password? Reset with WhatsApp';
      $('#continueButton')?.insertAdjacentElement('afterend', btn);
      btn.addEventListener('click', openResetModal);
    }
    btn.classList.toggle('hidden', loginRole === 'admin' || isRegistrationMode());
  }

  function ensureResetModal() {
    if ($('#v66ResetModal')) return $('#v66ResetModal');
    const modal = document.createElement('div');
    modal.id = 'v66ResetModal';
    modal.className = 'v66-otp-modal hidden';
    modal.innerHTML = `
      <div class="v66-otp-card" role="dialog" aria-modal="true" aria-labelledby="v66ResetTitle">
        <button type="button" class="v66-close" aria-label="Close">×</button>
        <div class="v66-otp-icon">💬</div>
        <small>SECURE WHATSAPP RECOVERY</small>
        <h2 id="v66ResetTitle">Forgot Password</h2>
        <div id="v66ResetStep1">
          <p>Enter the cellphone number registered to your EFGC Youth account.</p>
          <label>Cellphone number<input id="v66ResetPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="e.g. 071 234 5678"></label>
          <button id="v66SendResetCode" type="button" class="primary-login">Send WhatsApp Code</button>
        </div>
        <div id="v66ResetStep2" class="hidden">
          <p>Enter the 6-digit code sent to WhatsApp. The code expires after 10 minutes.</p>
          <label>Verification code<input id="v66ResetCode" class="v66-code-input" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"></label>
          <button id="v66VerifyResetCode" type="button" class="primary-login">Verify Code</button>
          <button id="v66ResendResetCode" type="button" class="ghost-login">Send a New Code</button>
        </div>
        <div id="v66ResetStep3" class="hidden">
          <p>Verification complete. Choose your new password.</p>
          <label>New password<input id="v66NewPassword" type="password" autocomplete="new-password" placeholder="At least 10 characters"></label>
          <label>Confirm password<input id="v66ConfirmPassword" type="password" autocomplete="new-password" placeholder="Re-enter password"></label>
          <button id="v66CompleteReset" type="button" class="primary-login">Set New Password</button>
        </div>
        <p id="v66ResetMessage" class="login-message" aria-live="polite"></p>
        <p>If you cannot receive a code, ask an EFGC Admin to reset your password.</p>
        <small class="v66-security-note">For security, the app does not reveal whether a cellphone number is registered.</small>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.v66-close')?.addEventListener('click', closeResetModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeResetModal(); });
    $('#v66SendResetCode')?.addEventListener('click', requestResetCode);
    $('#v66VerifyResetCode')?.addEventListener('click', verifyResetCode);
    $('#v66ResendResetCode')?.addEventListener('click', requestResetCode);
    $('#v66CompleteReset')?.addEventListener('click', completeReset);
    return modal;
  }

  function resetMessage(text) { const el = $('#v66ResetMessage'); if (el) el.textContent = text || ''; }
  function showResetStep(step) {
    [1,2,3].forEach(n => $(`#v66ResetStep${n}`)?.classList.toggle('hidden', n !== step));
  }
  function closeResetModal() { $('#v66ResetModal')?.classList.add('hidden'); }

  function openResetModal() {
    const modal = ensureResetModal();
    resetToken = '';
    resetPhone = $('#loginPhone')?.value.trim() || '';
    $('#v66ResetPhone').value = resetPhone;
    $('#v66ResetCode').value = '';
    $('#v66NewPassword').value = '';
    $('#v66ConfirmPassword').value = '';
    resetMessage('');
    showResetStep(1);
    modal.classList.remove('hidden');
    setTimeout(() => $('#v66ResetPhone')?.focus(), 0);
  }

  async function withDisabled(button, fn) {
    if (button) button.disabled = true;
    try { return await fn(); }
    finally { if (button) button.disabled = false; }
  }

  async function requestResetCode() {
    const phone = $('#v66ResetPhone')?.value.trim() || resetPhone;
    if (!phone) return resetMessage('Enter your cellphone number.');
    const button = $('#v66SendResetCode');
    await withDisabled(button, async () => {
      try {
        resetMessage('Requesting a secure WhatsApp code…');
        const result = await authBridge({ action:'request-password-reset', phone });
        resetPhone = phone;
        resetMessage(result.message || 'If this number is registered, a WhatsApp code will arrive shortly.');
        showResetStep(2);
        setTimeout(() => $('#v66ResetCode')?.focus(), 0);
      } catch (e) { resetMessage(e.message || 'Could not request a verification code.'); }
    });
  }

  async function verifyResetCode() {
    const code = $('#v66ResetCode')?.value.trim() || '';
    if (!/^\d{6}$/.test(code)) return resetMessage('Enter the 6-digit verification code.');
    const button = $('#v66VerifyResetCode');
    await withDisabled(button, async () => {
      try {
        resetMessage('Verifying code…');
        const result = await authBridge({ action:'verify-password-reset-otp', phone:resetPhone, code });
        resetToken = result.resetToken || '';
        if (!resetToken) throw new Error('Verification could not be completed.');
        resetMessage('Cellphone verified. Create your new password.');
        showResetStep(3);
        setTimeout(() => $('#v66NewPassword')?.focus(), 0);
      } catch (e) { resetMessage(e.message || 'The code could not be verified.'); }
    });
  }

  async function completeReset() {
    const p = $('#v66NewPassword')?.value || '';
    const q = $('#v66ConfirmPassword')?.value || '';
    if (p.length < 10) return resetMessage('Use a password with at least 10 characters.');
    if (p !== q) return resetMessage('The passwords do not match.');
    const button = $('#v66CompleteReset');
    await withDisabled(button, async () => {
      try {
        resetMessage('Saving your new password…');
        const result = await authBridge({ action:'complete-password-reset', phone:resetPhone, resetToken, newPassword:p });
        resetMessage(result.message || 'Password changed successfully.');
        const loginPhone = $('#loginPhone');
        if (loginPhone) loginPhone.value = resetPhone;
        setTimeout(() => {
          closeResetModal();
          setLoginMessage('Password changed successfully. Sign in with your new password.');
          $('#loginPassword')?.focus();
        }, 900);
      } catch (e) { resetMessage(e.message || 'Password could not be changed.'); }
    });
  }

  function readRegistrationForm() {
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
    EFGCPhotoSecurity.validate($('#loginPhoto').files[0]);
    if (d.role === 'youth' && (!$('#parentName')?.value.trim() || !$('#parentPhone')?.value.trim() || !$('#emergencyName')?.value.trim() || !$('#emergencyPhone')?.value.trim())) {
      throw new Error('Parent/guardian and emergency contact details are required.');
    }
  }

  function ensureRegistrationOtpModal() {
    if ($('#v66RegistrationOtpModal')) return $('#v66RegistrationOtpModal');
    const modal = document.createElement('div');
    modal.id = 'v66RegistrationOtpModal';
    modal.className = 'v66-otp-modal hidden';
    modal.innerHTML = `
      <div class="v66-otp-card" role="dialog" aria-modal="true" aria-labelledby="v66RegistrationOtpTitle">
        <button type="button" class="v66-close" aria-label="Close">×</button>
        <div class="v66-otp-icon">✅</div>
        <small>CELLPHONE VERIFICATION</small>
        <h2 id="v66RegistrationOtpTitle">Verify Your WhatsApp</h2>
        <p>A 6-digit code was sent to the cellphone number on this registration.</p>
        <label>Verification code<input id="v66RegistrationCode" class="v66-code-input" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"></label>
        <button id="v66VerifyRegistrationCode" type="button" class="primary-login">Verify & Create Profile</button>
        <button id="v66ResendRegistrationCode" type="button" class="ghost-login">Send a New Code</button>
        <p id="v66RegistrationMessage" class="login-message" aria-live="polite"></p>
        <small class="v66-security-note">The code expires after 10 minutes and can only be used once.</small>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.v66-close')?.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    $('#v66VerifyRegistrationCode')?.addEventListener('click', verifyAndCompleteRegistration);
    $('#v66ResendRegistrationCode')?.addEventListener('click', resendRegistrationCode);
    return modal;
  }

  function registrationMessage(text) { const el=$('#v66RegistrationMessage'); if(el) el.textContent=text || ''; }

  async function finish(profile, authUser) {
    session = {
      name: profile.full_name || 'EFGC Member',
      phone: profile.phone || '',
      role: profile.role,
      approval_status: profile.approval_status || 'approved',
      uid: profile.id || authUser?.id,
    };
    localStorage.setItem('efgcYouthSession', JSON.stringify(session));
    setLoginMessage(session.role === 'leader' && session.approval_status !== 'approved'
      ? 'Your Leader application is signed in and awaiting Admin approval.'
      : 'Secure sign-in complete.');
    await render();
  }

  async function completeRegistration(d, result) {
    EFGCAuth.setSession(result.session);
    const base = result.profile;
    let profile = await EFGCAuth.upsertProfile({
      full_name:d.name,
      phone:EFGCAuth.normalizeZA(d.phone),
      birthday:d.dob,
      face_photo_path:base?.face_photo_path || null,
      role:base.role,
      approval_status:base.approval_status,
      leader_role:base.role === 'leader' ? (d.leaderRole || base.leader_role || 'EFGC Youth Leader') : null,
    });
    const photo = $('#loginPhoto')?.files?.[0];
    if (photo) {
      const path = await EFGCPhotoSecurity.upload(photo);
      profile = await EFGCAuth.upsertProfile({
        full_name:profile.full_name, phone:profile.phone, birthday:profile.birthday,
        face_photo_path:path, role:profile.role, approval_status:profile.approval_status,
        leader_role:profile.leader_role,
      }) || profile;
    }
    if (d.role === 'youth') {
      await EFGCAuth.upsertSafeguarding({
        parent_name:$('#parentName').value.trim(), parent_phone:$('#parentPhone').value.trim(),
        emergency_name:$('#emergencyName').value.trim(), emergency_phone:$('#emergencyPhone').value.trim(),
      });
    }
    return finish(profile, result.session.user);
  }

  async function createRegistration(d, phoneVerificationToken = null) {
    const result = await authBridge({
      action:'register', role:d.role, name:d.name, phone:d.phone, password:d.password,
      leaderRole:d.leaderRole, phoneVerificationToken,
    });
    return completeRegistration(d, result);
  }

  async function beginRegistrationWithOtp(d) {
    const result = await authBridge({ action:'request-registration-otp', phone:d.phone });
    if (!result.required) return createRegistration(d, null);
    pendingRegistration = d;
    const modal = ensureRegistrationOtpModal();
    $('#v66RegistrationCode').value = '';
    registrationMessage(result.message || 'A WhatsApp verification code has been sent.');
    modal.classList.remove('hidden');
    setTimeout(() => $('#v66RegistrationCode')?.focus(), 0);
  }

  async function resendRegistrationCode() {
    if (!pendingRegistration?.phone) return registrationMessage('Registration details are no longer available. Close this window and try again.');
    const button = $('#v66ResendRegistrationCode');
    await withDisabled(button, async () => {
      try {
        registrationMessage('Sending a new code…');
        const result = await authBridge({ action:'request-registration-otp', phone:pendingRegistration.phone });
        registrationMessage(result.message || 'A new WhatsApp code has been sent.');
      } catch (e) { registrationMessage(e.message || 'Could not send a new code.'); }
    });
  }

  async function verifyAndCompleteRegistration() {
    if (!pendingRegistration) return registrationMessage('Registration details are no longer available. Close this window and try again.');
    const code = $('#v66RegistrationCode')?.value.trim() || '';
    if (!/^\d{6}$/.test(code)) return registrationMessage('Enter the 6-digit verification code.');
    const button = $('#v66VerifyRegistrationCode');
    await withDisabled(button, async () => {
      try {
        registrationMessage('Verifying cellphone…');
        const verified = await authBridge({ action:'verify-registration-otp', phone:pendingRegistration.phone, code });
        registrationMessage('Verified. Creating your secure profile…');
        await createRegistration(pendingRegistration, verified.registrationToken || null);
        $('#v66RegistrationOtpModal')?.classList.add('hidden');
        pendingRegistration = null;
      } catch (e) { registrationMessage(e.message || 'Verification could not be completed.'); }
    });
  }

  window.loginUser = async () => {
    syncForgotButton();
    if (!isRegistrationMode() || loginRole === 'admin') return originalLoginUser();
    const d = readRegistrationForm();
    const button = $('#continueButton');
    if (button) button.disabled = true;
    try {
      setLoginMessage('');
      validateRegistration(d);
      await beginRegistrationWithOtp(d);
    } catch (e) {
      setLoginMessage(e.message || 'Registration could not be completed.');
    } finally {
      if (button) button.disabled = false;
    }
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('.login-type') || e.target.closest('[data-auth-mode]')) setTimeout(syncForgotButton, 20);
  });
  const login = $('#login');
  if (login) new MutationObserver(() => syncForgotButton()).observe(login, { subtree:true, childList:true, attributes:true, attributeFilter:['class'] });
  syncForgotButton();
})();
