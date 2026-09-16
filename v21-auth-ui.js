/** EFGC Youth v34 — email sign-in + magic-link return + first-time profile setup. */
(() => {
  let pending = null;
  const $ = (s) => document.querySelector(s);
  const msg = (t) => { const el=$('#loginMessage'); if(el) el.textContent=t; };

  function sessionFromProfile(p, authUser) {
    return {
      name: p.full_name || 'EFGC Member',
      phone: p.phone || '',
      role: p.role,
      approval_status: p.approval_status || 'approved',
      uid: p.id || authUser?.id,
    };
  }

  async function finishExistingProfile(profile, authUser) {
    session = sessionFromProfile(profile, authUser);
    localStorage.setItem('efgcYouthSession', JSON.stringify(session));
    localStorage.removeItem('efgcPendingRole');
    if (session.role === 'leader' && session.approval_status !== 'approved') {
      msg('Your Leader application is signed in and still awaiting Admin approval.');
    } else {
      msg('Secure sign-in complete.');
    }
    await render();
  }

  function readForm() {
    return {
      name: $('#loginName')?.value.trim() || '',
      phone: $('#loginPhone')?.value.trim() || '',
      email: $('#loginEmail')?.value.trim() || '',
      dob: $('#loginDob')?.value || '',
      role: loginRole,
    };
  }

  async function completeFirstTimeProfile(authUser) {
    const d = pending || readForm();
    if (d.role === 'admin') {
      return msg('This verified account does not have an Admin profile. Admin access must be activated by an existing EFGC Admin.');
    }
    if (!d.name || !d.phone) return msg('For first-time registration, enter your name and cellphone number.');
    if (!d.dob || !$('#loginPhoto')?.files?.length) return msg('For first-time registration, birthday and a face photo are required.');
    if (d.role === 'youth' && (!$('#parentName')?.value.trim() || !$('#parentPhone')?.value.trim() || !$('#emergencyName')?.value.trim() || !$('#emergencyPhone')?.value.trim())) {
      return msg('For first-time Youth registration, parent/guardian and emergency contact details are required.');
    }

    const requested = d.role === 'leader' ? 'leader' : 'youth';
    const approval = requested === 'leader' ? 'pending' : 'approved';
    let profile = await EFGCAuth.upsertProfile({
      full_name: d.name,
      phone: EFGCAuth.normalizeZA(d.phone),
      birthday: d.dob,
      face_photo_path: null,
      role: requested,
      approval_status: approval,
      leader_role: requested === 'leader' ? ($('#loginRoleText')?.value.trim() || 'EFGC Youth Leader') : null,
    });

    const photoFile = $('#loginPhoto')?.files?.[0];
    if (photoFile) {
      const path = await EFGCPhotoSecurity.upload(photoFile);
      profile = await EFGCAuth.upsertProfile({ face_photo_path: path }) || profile;
    }

    if (requested === 'youth') {
      await EFGCAuth.upsertSafeguarding({
        parent_name: $('#parentName').value.trim(),
        parent_phone: $('#parentPhone').value.trim(),
        emergency_name: $('#emergencyName').value.trim(),
        emergency_phone: $('#emergencyPhone').value.trim(),
      });
    }
    await finishExistingProfile(profile, authUser);
  }

  async function bootAuth() {
    try {
      const savedRole = localStorage.getItem('efgcPendingRole');
      if (savedRole && ['youth','leader','admin'].includes(savedRole)) selectRole(savedRole);
      const a = await EFGCAuth.restoreCallback();
      if (!a?.access_token) return;
      const p = await EFGCAuth.getMyProfile();
      if (p) return finishExistingProfile(p, a.user);
      msg('Email verified. Complete the profile form below, then press Continue to finish registration.');
      const button = $('#continueButton');
      if (button) button.textContent = 'Complete Profile';
    } catch (e) {
      msg(`Sign-in could not be completed: ${e.message}`);
    }
  }

  window.loginUser = async () => {
    msg('');
    const d = readForm();
    pending = d;

    try {
      const active = EFGCAuth.session();
      if (active?.access_token) {
        const profile = await EFGCAuth.getMyProfile();
        if (profile) return finishExistingProfile(profile, active.user);
        return completeFirstTimeProfile(active.user);
      }

      if (!d.email) return msg('Email address is required.');
      localStorage.setItem('efgcPendingRole', d.role);
      d.email = await EFGCAuth.requestEmailOtp(d.email, d.role !== 'admin');
      let box = $('#supabaseOtpBox');
      if (!box) {
        box = document.createElement('div');
        box.id = 'supabaseOtpBox';
        box.className = 'otp-box';
        box.innerHTML = '<label><span id="otpLabel">Verification code (if shown in your email)</span><input id="supabaseOtp" inputmode="numeric" maxlength="10" placeholder="Enter 6-digit code"></label><button class="primary-login" type="button" onclick="verifySupabaseOtp()">Verify Code</button>';
        $('#loginMessage').before(box);
      }
      msg('Check your email. If it contains a secure sign-in link, tap that link. If it contains a 6-digit code, enter the code here.');
    } catch (e) {
      if (/email rate limit exceeded|rate limit/i.test(String(e.message))) {
        const button = $('#continueButton');
        if (button) { button.disabled = true; button.textContent = 'Email limit reached'; }
        msg('The email sender has reached its current limit. Do not keep retrying; the app needs a dedicated SMTP sender for reliable sign-in.');
        return;
      }
      const wait = Number(String(e.message).match(/after\s+(\d+)\s+seconds?/i)?.[1]);
      if (wait > 0) {
        const button = $('#continueButton');
        if (!button) return msg(`Please wait ${wait} seconds before requesting another sign-in email.`);
        button.disabled = true;
        let remaining = wait;
        const tick = () => {
          if (remaining <= 0) { button.disabled=false; button.textContent='Continue'; msg('You can request a new sign-in email now.'); return; }
          button.textContent = `Wait ${remaining}s`;
          msg(`For your security, please wait ${remaining} seconds before requesting another sign-in email.`);
          remaining -= 1;
          setTimeout(tick, 1000);
        };
        tick();
        return;
      }
      msg(`Secure sign-in could not start: ${e.message}`);
    }
  };

  window.verifySupabaseOtp = async () => {
    if (!pending) pending = readForm();
    if (!pending.email) return msg('Enter your email address and request a sign-in email first.');
    const token = $('#supabaseOtp')?.value.trim();
    if (!/^\d{6,10}$/.test(token || '')) return msg('Enter the verification code from your email.');
    try {
      const a = await EFGCAuth.verifyEmailOtp(pending.email, token);
      const existing = await EFGCAuth.getMyProfile();

      if (pending.role === 'admin') {
        if (!existing || existing.role !== 'admin' || existing.approval_status !== 'approved') {
          msg('Identity verified, but this account does not have approved Admin access.');
          return;
        }
        return finishExistingProfile(existing, a.user);
      }

      if (existing) return finishExistingProfile(existing, a.user);
      return completeFirstTimeProfile(a.user);
    } catch (e) {
      msg(`Verification failed: ${e.message}`);
    }
  };

  window.logoutUser = async () => {
    try { await EFGCAuth.signOut(); }
    finally { session=null; localStorage.removeItem('efgcYouthSession'); showLogin(); renderShell(); }
  };

  bootAuth();
})();
