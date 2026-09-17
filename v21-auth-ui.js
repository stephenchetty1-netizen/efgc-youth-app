/** V62 — separate account flows, verified profile restoration, and guarded submissions. */
(() => {
  const $ = (s) => document.querySelector(s);
  const msg = (t) => { if ($('#loginMessage')) $('#loginMessage').textContent = t; };
  let mode = 'login', pending = null, busy = false, cooldownUntil = 0, cooldownTimer = null;
  let completingProfile = false, partialProfile = null;

  function syncSubmit() {
    const button = $('#continueButton');
    if (!button) return;
    const wait = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
    const waiting = loginRole !== 'admin' && !completingProfile && wait > 0;
    button.disabled = busy || waiting;
    button.textContent = busy ? 'Please wait…' : waiting ? `Send again in ${wait}s` : loginRole === 'admin' ? 'Sign In Securely' : completingProfile ? 'Complete Profile' : 'Send sign-in email';
    document.querySelectorAll('.login-type,#loginModeSwitch,#verifyOtpButton').forEach(el => { el.disabled = busy; });
    $('#login')?.setAttribute('aria-busy', String(busy));
  }
  function cooldown(seconds) {
    cooldownUntil = Date.now() + seconds * 1000;
    clearInterval(cooldownTimer);
    syncSubmit();
    cooldownTimer = setInterval(() => {
      syncSubmit();
      if (Date.now() >= cooldownUntil) { clearInterval(cooldownTimer); cooldownTimer = null; }
    }, 1000);
  }
  function syncRoleUi() {
    const admin = loginRole === 'admin';
    const register = !admin && mode === 'register';
    ['nameField','phoneField','photoField','dobField','photoPrivacyNote','photoPreview'].forEach(id => $('#'+id)?.classList.toggle('hidden', !register));
    $('#youthSafeguardingFields')?.classList.toggle('hidden', !register || loginRole !== 'youth');
    $('#roleField')?.classList.toggle('hidden', !register || loginRole !== 'leader');
    $('#passwordField')?.classList.toggle('hidden', !admin || Boolean(window.EFGCPasswordRecovery?.isActive()));
    $('#passwordRecoveryControls')?.classList.toggle('hidden', !admin || Boolean(window.EFGCPasswordRecovery?.isActive()));
    $('#loginTitle').textContent = admin ? 'Admin Login' : completingProfile ? 'Complete your profile' : register ? (loginRole === 'leader' ? 'Apply as a Leader' : 'Create your account') : (loginRole === 'leader' ? 'Leader Login' : 'Youth Login');
    $('#loginHint').textContent = admin ? 'Sign in with your approved Admin email and password.' : register ? (completingProfile ? 'Your email is verified. Add the details below to finish.' : 'Verify your email to join EFGC Youth. Leader applications need Admin approval.') : 'Enter your registered email. We’ll send you a secure sign-in link or code.';
    const toggle = $('#loginModeSwitch');
    if (toggle) {
      toggle.classList.toggle('hidden', admin || completingProfile);
      toggle.textContent = register ? 'Already have an account? Log in' : 'New here? Create an account';
    }
    syncSubmit();
  }
  function setMode(value) {
    mode = completingProfile ? 'register' : value === 'register' ? 'register' : 'login';
    syncRoleUi();
  }
  const originalSelectRole = window.selectRole;
  window.selectRole = (role) => {
    if (busy || !['youth','leader','admin'].includes(role)) return;
    if (completingProfile && partialProfile) role = partialProfile.role;
    if (loginRole !== role) { pending = null; $('#supabaseOtpBox')?.remove(); msg(''); }
    originalSelectRole(role);
    syncRoleUi();
  };
  const toggle = document.createElement('button');
  toggle.id = 'loginModeSwitch'; toggle.type = 'button'; toggle.className = 'login-mode-switch';
  toggle.addEventListener('click', () => { pending = null; $('#supabaseOtpBox')?.remove(); msg(''); setMode(mode === 'register' ? 'login' : 'register'); });
  $('#continueButton').after(toggle);
  $('#login .ghost-login[onclick]')?.remove();
  window.EFGCLogin = { setMode, syncRoleUi };

  function readForm() {
    return { name: $('#loginName').value.trim(), phone: $('#loginPhone').value.trim(), email: $('#loginEmail').value.trim().toLowerCase(), password: $('#loginPassword').value, dob: $('#loginDob').value, role: loginRole };
  }
  function openForm(role, nextMode) {
    document.dispatchEvent(new CustomEvent('efgc:auth-form', { detail: { role, mode: nextMode } }));
  }
  async function finishExistingProfile(profile, authUser) {
    if (window.EFGCPasswordRecovery?.isActive()) return window.EFGCPasswordRecovery.showForm();
    if (!['youth','leader','admin'].includes(profile.role)) throw new Error('This profile needs a leader to check its account role.');
    if (profile.role === 'admin' && profile.approval_status !== 'approved') throw new Error('This account does not have approved Admin access.');
    session = { name: profile.full_name || 'EFGC Member', phone: profile.phone || '', role: profile.role, approval_status: profile.approval_status || 'pending', uid: profile.id || authUser?.id };
    completingProfile = false; partialProfile = null; pending = null;
    localStorage.setItem('efgcYouthSession', JSON.stringify(session));
    localStorage.removeItem('efgcPendingRole');
    $('#loginPassword').value = '';
    msg('Sign-in complete.');
    await render();
  }
  async function finishOrComplete(profile, authUser) {
    if (profile?.role === 'admin') return finishExistingProfile(profile, authUser);
    let contactsReady = true;
    if (profile?.role === 'youth') {
      const rows = await EFGCAuth.rest(`safeguarding_contacts?youth_id=eq.${encodeURIComponent(profile.id)}&select=youth_id&limit=1`);
      contactsReady = Boolean(rows?.length);
    }
    if (profile?.full_name && profile?.phone && profile?.birthday && profile?.face_photo_path && contactsReady) return finishExistingProfile(profile, authUser);
    completingProfile = true; partialProfile = profile; pending = null;
    // The verified account owns the form; do not apply a selected role to an existing profile.
    const role = profile?.role || localStorage.getItem('efgcPendingRole') || 'youth';
    originalSelectRole(['youth','leader'].includes(role) ? role : 'youth');
    mode = 'register';
    if (authUser?.email) $('#loginEmail').value = authUser.email;
    for (const [id,key] of [['loginName','full_name'],['loginPhone','phone'],['loginDob','birthday']]) if (profile?.[key]) $('#'+id).value = profile[key];
    syncRoleUi(); openForm(loginRole, 'register');
    msg('Email verified. Complete your profile below, then select Complete Profile.');
  }
  async function adminPasswordSignIn(d) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return msg('Enter a valid Admin email address.');
    if (!d.password) return msg('Enter your Admin password.');
    const c = window.EFGC_SUPABASE;
    const r = await fetch(`${c.url}/auth/v1/token?grant_type=password`, { method:'POST', headers:{ apikey:c.publishableKey, 'Content-Type':'application/json' }, body:JSON.stringify({ email:d.email, password:d.password }), signal:AbortSignal.timeout(20000) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.access_token) throw new Error(data.error_description || data.msg || data.message || 'Invalid email or password.');
    localStorage.setItem('efgcSupabaseAuth', JSON.stringify(data));
    const profile = await EFGCAuth.getMyProfile();
    if (!profile || profile.role !== 'admin' || profile.approval_status !== 'approved') {
      await EFGCAuth.signOut();
      throw new Error('This account does not have approved Admin access.');
    }
    return finishExistingProfile(profile, data.user);
  }
  async function completeFirstTimeProfile(authUser) {
    const d = readForm();
    if (d.role === 'admin') return msg('Admin accounts must already exist and be approved.');
    if (!d.name || !d.phone) return msg('Enter your full name and cellphone number.');
    if (!/^\+27\d{9}$/.test(EFGCAuth.normalizeZA(d.phone))) return msg('Enter a valid South African cellphone number.');
    if (!d.dob || Number.isNaN(new Date(d.dob).getTime()) || new Date(d.dob) > new Date()) return msg('Enter a valid date of birth.');
    const photo = $('#loginPhoto').files?.[0];
    if (!photo && !partialProfile?.face_photo_path) return msg('Choose a face photo to complete your profile.');
    if (photo) EFGCPhotoSecurity.validate(photo);
    if (d.role === 'youth') {
      if (!$('#parentName').value.trim() || !$('#emergencyName').value.trim()) return msg('Enter parent/guardian and emergency contact names.');
      if (!['parentPhone','emergencyPhone'].every(id => /^\+27\d{9}$/.test(EFGCAuth.normalizeZA($('#'+id).value)))) return msg('Enter valid South African parent/guardian and emergency contact numbers.');
    }
    const requested = partialProfile?.role || (d.role === 'leader' ? 'leader' : 'youth');
    const values = { full_name:d.name, phone:EFGCAuth.normalizeZA(d.phone), birthday:d.dob, leader_role:requested === 'leader' ? ($('#loginRoleText').value.trim() || 'EFGC Youth Leader') : null };
    if (!partialProfile) Object.assign(values, { role:requested, approval_status:requested === 'leader' ? 'pending' : 'approved' });
    let profile = await EFGCAuth.upsertProfile(values);
    partialProfile = profile;
    if (photo) {
      const path = await EFGCPhotoSecurity.upload(photo);
      profile = await EFGCAuth.upsertProfile({ face_photo_path:path }) || profile;
      partialProfile = profile;
    }
    if (requested === 'youth') await EFGCAuth.upsertSafeguarding({ parent_name:$('#parentName').value.trim(), parent_phone:EFGCAuth.normalizeZA($('#parentPhone').value), emergency_name:$('#emergencyName').value.trim(), emergency_phone:EFGCAuth.normalizeZA($('#emergencyPhone').value) });
    await finishExistingProfile(profile, authUser);
  }
  function showOtp() {
    if ($('#supabaseOtpBox')) return;
    const box = document.createElement('div'); box.id = 'supabaseOtpBox'; box.className = 'otp-box';
    box.innerHTML = '<label>Verification code (if provided in your email)<input id="supabaseOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="Enter your email code"></label><button id="verifyOtpButton" class="primary-login" type="button">Verify Code</button>';
    $('#loginMessage').before(box);
    $('#verifyOtpButton').addEventListener('click', window.verifySupabaseOtp);
  }
  window.loginUser = async () => {
    if (busy || (loginRole !== 'admin' && !completingProfile && Date.now() < cooldownUntil)) return;
    msg(''); const d = readForm(); busy = true; syncSubmit();
    try {
      if (d.role === 'admin') return await adminPasswordSignIn(d);
      const active = EFGCAuth.session();
      if (active?.access_token) {
        if (completingProfile) return await completeFirstTimeProfile(active.user);
        return await finishOrComplete(await EFGCAuth.getMyProfile(), active.user);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return msg('Enter a valid email address.');
      localStorage.setItem('efgcPendingRole', d.role);
      d.email = await EFGCAuth.requestEmailOtp(d.email, mode === 'register');
      pending = d; showOtp(); cooldown(60);
      msg('Check your email for a sign-in link or code. Open the link, or enter the code below. Check your spam folder too.');
    } catch (e) {
      if (/rate limit|after\s+\d+\s+seconds?/i.test(e.message)) {
        cooldown(Number(String(e.message).match(/after\s+(\d+)\s+seconds?/i)?.[1]) || 60);
        msg('Email requests are temporarily limited. Please wait before trying again. If this continues, contact an EFGC leader.');
      } else msg(`Sign-in could not be completed: ${e.name === 'TimeoutError' ? 'The connection timed out. Please try again.' : e.message}`);
    } finally { busy = false; syncSubmit(); }
  };
  window.verifySupabaseOtp = async () => {
    if (busy) return;
    if (!pending?.email) return msg('Request a sign-in email first.');
    const token = $('#supabaseOtp')?.value.trim();
    if (!/^\d{6,10}$/.test(token || '')) return msg('Enter the verification code from your email.');
    busy = true; syncSubmit();
    try {
      const auth = await EFGCAuth.verifyEmailOtp(pending.email, token);
      await finishOrComplete(await EFGCAuth.getMyProfile(), auth.user);
    } catch (e) { msg(`Verification failed: ${e.message}`); }
    finally { busy = false; syncSubmit(); }
  };
  window.logoutUser = async () => {
    session = null; pending = null; partialProfile = null; completingProfile = false;
    localStorage.removeItem('efgcYouthSession'); localStorage.removeItem('efgcPendingRole');
    sessionStorage.removeItem('efgcPasswordRecovery');
    $('#passwordResetPanel')?.classList.add('hidden'); $('#continueButton')?.classList.remove('hidden');
    $('#supabaseOtpBox')?.remove();
    document.querySelectorAll('#login input').forEach(input => { input.value = ''; });
    $('#photoPreview').innerHTML = '';
    document.querySelectorAll('#adminPanel,#profileCard,#leaderPrivateYouthDirectory,#plannerRosterHost,#attendanceAdminHost,#mineList,#leaderList,#eventList,#newsList,#homeNews,#leaderReminder,#leaderPost,#leaderYearPlanner').forEach(el => { el.innerHTML = ''; });
    setMode('login'); selectRole('youth'); msg(''); renderShell(); window.EFGCWelcome?.showWelcome();
    await EFGCAuth.signOut();
  };
  $('#login').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('input:not([type="file"])') && !window.EFGCPasswordRecovery?.isActive()) {
      event.preventDefault();
      if (event.target.id === 'supabaseOtp') window.verifySupabaseOtp(); else window.loginUser();
    }
  });
  async function bootAuth() {
    try {
      const role = localStorage.getItem('efgcPendingRole');
      if (['youth','leader'].includes(role)) selectRole(role);
      syncRoleUi();
      const auth = await EFGCAuth.restoreCallback();
      if (!auth?.access_token) return;
      if (window.EFGCPasswordRecovery?.isActive()) return window.EFGCPasswordRecovery.showForm();
      await finishOrComplete(await EFGCAuth.getMyProfile(), auth.user);
    } catch (e) { openForm('youth', 'login'); msg(`Sign-in could not be completed: ${e.message}`); }
  }
  bootAuth();
})();
