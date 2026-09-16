/** EFGC Youth v28 — email OTP sign-in + first-time profile setup. */
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
    if (session.role === 'leader' && session.approval_status !== 'approved') {
      msg('Your Leader application is signed in and still awaiting Admin approval.');
    } else {
      msg('Secure sign-in complete.');
    }
    await render();
  }

  async function bootAuth() {
    try {
      const a = await EFGCAuth.restoreCallback();
      if (!a?.access_token) return;
      const p = await EFGCAuth.getMyProfile();
      if (p) return finishExistingProfile(p, a.user);
      msg('Your email is verified. Complete profile setup to finish registration.');
    } catch (e) {
      msg(`Session restore notice: ${e.message}`);
    }
  }

  window.loginUser = async () => {
    msg('');
    const d = {
      name: $('#loginName')?.value.trim() || '',
      phone: $('#loginPhone')?.value.trim() || '',
      email: $('#loginEmail')?.value.trim() || '',
      dob: $('#loginDob')?.value || '',
      role: loginRole,
    };
    if (!d.email) return msg('Email address is required.');
    try {
      d.email = await EFGCAuth.requestEmailOtp(d.email);
      pending = d;
      let box = $('#supabaseOtpBox');
      if (!box) {
        box = document.createElement('div');
        box.id = 'supabaseOtpBox';
        box.className = 'otp-box';
        box.innerHTML = '<label><span id="otpLabel">Email verification code</span><input id="supabaseOtp" inputmode="numeric" maxlength="10" placeholder="Enter OTP"></label><button class="primary-login" type="button" onclick="verifySupabaseOtp()">Verify & Continue</button>';
        $('#loginMessage').before(box);
      }
      msg('Verification requested. Check your email and enter the code to continue.');
    } catch (e) {
      if (/email rate limit exceeded/i.test(String(e.message))) {
        const button = $('#continueButton');
        if (button) { button.disabled = true; button.textContent = 'Email limit reached'; }
        msg('The email service has reached its current sending limit. Existing signed-in sessions still work; avoid repeatedly requesting new codes.');
        return;
      }
      const wait = Number(String(e.message).match(/after\s+(\d+)\s+seconds?/i)?.[1]);
      if (wait > 0) {
        const button = $('#continueButton');
        if (!button) return msg(`Please wait ${wait} seconds before requesting another code.`);
        button.disabled = true;
        let remaining = wait;
        const tick = () => {
          if (remaining <= 0) { button.disabled=false; button.textContent='Continue'; msg('You can request a new verification code now.'); return; }
          button.textContent = `Wait ${remaining}s`;
          msg(`For your security, please wait ${remaining} seconds before requesting another code.`);
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
    if (!pending) return msg('Request a verification code first.');
    const token = $('#supabaseOtp')?.value.trim();
    if (!/^\d{6,10}$/.test(token || '')) return msg('Enter the verification code.');
    try {
      const a = await EFGCAuth.verifyEmailOtp(pending.email, token);
      const existing = await EFGCAuth.getMyProfile();

      if (pending.role === 'admin') {
        if (!existing || existing.role !== 'admin' || existing.approval_status !== 'approved') {
          msg('Identity verified, but this account does not have approved Admin access. Contact an existing EFGC Admin.');
          return;
        }
        return finishExistingProfile(existing, a.user);
      }

      if (existing) return finishExistingProfile(existing, a.user);

      if (!pending.name || !pending.phone) return msg('For first-time registration, enter your name and cellphone number, then verify again.');
      if (!pending.dob || !$('#loginPhoto')?.files?.length) return msg('For first-time registration, birthday and a face photo are required.');
      if (pending.role === 'youth' && (!$('#parentName')?.value.trim() || !$('#parentPhone')?.value.trim() || !$('#emergencyName')?.value.trim() || !$('#emergencyPhone')?.value.trim())) {
        return msg('For first-time Youth registration, parent/guardian and emergency contact details are required.');
      }

      const requested = pending.role === 'leader' ? 'leader' : 'youth';
      const approval = requested === 'leader' ? 'pending' : 'approved';
      let profile = await EFGCAuth.upsertProfile({
        full_name: pending.name,
        phone: EFGCAuth.normalizeZA(pending.phone),
        birthday: pending.dob,
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
      await finishExistingProfile(profile, a.user);
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
