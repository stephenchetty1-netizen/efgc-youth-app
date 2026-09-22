/** EFGC Youth v67 — Admin controls for WhatsApp authentication OTP. */
(() => {
  const $ = (s) => document.querySelector(s);
  let loading = false;

  function esc(v='') { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function normalize(v){ return Array.isArray(v) ? (v[0] || {}) : (v || {}); }

  async function loadStatus() {
    if (!window.EFGCAuth?.accessToken?.()) return null;
    return normalize(await EFGCAuth.rest('rpc/get_whatsapp_admin_status', {
      method:'POST', headers:{'Content-Type':'application/json'}, body:'{}'
    }));
  }

  function markup(s={}) {
    return `<div id="v67WhatsappOtpAdmin" class="wa-otp-box">
      <h3>🔐 WhatsApp OTP Authentication</h3>
      <p>Use an approved Meta <strong>AUTHENTICATION</strong> template with an OTP button for password recovery and optional registration verification.</p>
      <div class="wa-grid">
        <label>OTP template name<input id="v67OtpTemplate" value="${esc(s.otp_template_name || 'efgc_password_reset_otp')}" placeholder="efgc_password_reset_otp"></label>
        <label>OTP template language<input id="v67OtpLanguage" value="${esc(s.otp_template_language || 'en_US')}" placeholder="en_US"></label>
      </div>
      <label class="wa-otp-check"><input id="v67OtpEnabled" type="checkbox" ${s.otp_enabled ? 'checked' : ''}><span><strong>Enable WhatsApp OTP</strong><br><small>Allows Youth and Leaders to recover their password with a WhatsApp verification code.</small></span></label>
      <label class="wa-otp-check"><input id="v67RequireRegistrationOtp" type="checkbox" ${s.require_registration_otp ? 'checked' : ''}><span><strong>Require OTP for new registrations</strong><br><small>New Youth profiles must verify their cellphone before the account is created. Admins approve Leader access later.</small></span></label>
      <button id="v67SaveOtpSettings" type="button" class="primary-login">Save OTP Settings</button>
      <p id="v67OtpAdminMessage" class="login-message" aria-live="polite"></p>
      <p class="wa-otp-note">OTP codes expire after 10 minutes, are hashed in the database, and are limited to five code attempts.</p>
    </div>`;
  }

  function say(text){ const el=$('#v67OtpAdminMessage'); if(el) el.textContent=text || ''; }

  async function save() {
    const button = $('#v67SaveOtpSettings');
    if (button) button.disabled = true;
    try {
      say('Saving OTP settings…');
      const template = $('#v67OtpTemplate')?.value.trim() || 'efgc_password_reset_otp';
      const language = $('#v67OtpLanguage')?.value.trim() || 'en_US';
      const enabled = Boolean($('#v67OtpEnabled')?.checked);
      const requireRegistration = Boolean($('#v67RequireRegistrationOtp')?.checked);
      const data = normalize(await EFGCAuth.rest('rpc/save_whatsapp_otp_config', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          p_otp_template_name:template,
          p_otp_template_language:language,
          p_otp_enabled:enabled,
          p_require_registration_otp:requireRegistration,
        }),
      }));
      say(data.otp_enabled
        ? `WhatsApp OTP enabled${data.require_registration_otp ? ' and required for new registrations' : ''}.`
        : 'WhatsApp OTP settings saved. OTP is currently disabled.');
    } catch (e) {
      say(e?.message || 'Could not save OTP settings.');
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function ensure() {
    if (loading || $('#v67WhatsappOtpAdmin')) return;
    const card = $('#efgcWhatsAppAdminCard');
    if (!card || !window.EFGCAuth?.accessToken?.()) return;
    loading = true;
    try {
      const profile = await EFGCAuth.getMyProfile();
      if (!profile || profile.role !== 'admin' || profile.approval_status !== 'approved') return;
      const status = await loadStatus() || {};
      const actions = card.querySelector('.wa-actions');
      if (actions) actions.insertAdjacentHTML('beforebegin', markup(status));
      else card.insertAdjacentHTML('beforeend', markup(status));
      $('#v67SaveOtpSettings')?.addEventListener('click', save);
    } catch (e) {
      console.warn('WhatsApp OTP admin panel', e);
    } finally { loading = false; }
  }

  const admin = $('#admin');
  if (admin) new MutationObserver(() => setTimeout(ensure, 20)).observe(admin, {subtree:true, childList:true});
  document.addEventListener('click', (e) => { if (e.target.closest('[data-tab="admin"]')) setTimeout(ensure, 80); });
  setTimeout(ensure, 250);
})();
