/** EFGC Youth v65 — direct Meta WhatsApp Cloud API connection panel. */
(() => {
  const PANEL_ID = 'efgcWhatsAppAdminCard';
  let busy = false;
  let observer = null;

  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalizeResult = (v) => Array.isArray(v) ? (v[0] || {}) : (v || {});

  async function adminProfile(){
    try { return await window.EFGCAuth?.getMyProfile?.(); } catch { return null; }
  }

  function statusMarkup(s){
    const token = Boolean(s?.token_configured);
    const phone = Boolean(s?.phone_number_id);
    const enabled = Boolean(s?.enabled);
    const ready = token && phone && enabled;
    const label = ready ? 'CONNECTED & ENABLED' : token && phone ? 'CONFIGURED — NOT ENABLED' : 'SETUP REQUIRED';
    const cls = ready ? 'connected' : token && phone ? 'configured' : 'required';
    const last = s?.last_delivery;
    return `<div class="wa-status-row">
      <span class="wa-status ${cls}">${label}</span>
      <span class="wa-token ${token ? 'ok' : 'missing'}">${token ? '🔐 Vault token found' : '⚠ Vault token missing'}</span>
    </div>
    ${last ? `<div class="wa-last-delivery"><strong>Last delivery:</strong> ${esc(last.status || 'unknown')}${last.sent_at ? ` • ${esc(new Date(last.sent_at).toLocaleString('en-ZA'))}` : ''}${last.error_message ? `<br><span>${esc(last.error_message)}</span>` : ''}</div>` : ''}`;
  }

  function cardMarkup(s={}){
    return `<section id="${PANEL_ID}" class="wa-admin-card">
      <div class="wa-card-head">
        <div><small>DIRECT META CONNECTION</small><h2>WhatsApp Morning Briefings</h2><p>06:00 briefing generated • 06:02 delivery to each approved Leader.</p></div>
        <div class="wa-cloud">☁️ → 💬</div>
      </div>
      <div id="waConnectionStatus">${statusMarkup(s)}</div>
      <div class="wa-grid">
        <label>Phone Number ID<input id="waPhoneNumberId" inputmode="numeric" value="${esc(s.phone_number_id || '')}" placeholder="Meta Phone Number ID"></label>
        <label>WhatsApp Business Account ID<input id="waWabaId" inputmode="numeric" value="${esc(s.waba_id || '')}" placeholder="WABA ID (optional for sending)"></label>
        <label>Graph API version<input id="waGraphVersion" value="${esc(s.graph_version || '')}" placeholder="e.g. v26.0 — optional"></label>
        <label>Approved template name<input id="waTemplateName" value="${esc(s.template_name || 'efgc_event_morning_briefing')}" placeholder="efgc_event_morning_briefing"></label>
        <label>Template language<input id="waTemplateLanguage" value="${esc(s.template_language || 'en')}" placeholder="en"></label>
        <label class="wa-enable"><input id="waEnabled" type="checkbox" ${s.enabled ? 'checked' : ''}> Enable automatic WhatsApp delivery</label>
      </div>
      <div class="wa-vault-note"><strong>🔐 Access token security</strong><p>Do not paste your Meta access token into ChatGPT or the public app. Add it directly in Supabase Vault with the secret name <code>efgc_whatsapp_access_token</code>. This screen only checks whether the secret exists; it can never display the token.</p></div>
      <details class="wa-template-help"><summary>Required WhatsApp template</summary><p>Create and approve this template in Meta before enabling automatic delivery.</p><pre>Good morning Leaders 🙏
Today's EFGC Youth briefing:
{{1}}

Leader duties:
{{2}}

Youth attending: {{3}}

God bless. BUILD • BELONG • BE A LIGHT.</pre><small>{{1}} = event/meeting name • {{2}} = Leader names and duties • {{3}} = Youth attending count</small></details>
      <div class="wa-actions"><button type="button" class="primary-login" id="waSaveSettings">Save WhatsApp Settings</button><button type="button" class="ghost-login" id="waRefreshStatus">Refresh Status</button></div>
      <p id="waAdminMessage" class="login-message" aria-live="polite"></p>
      <p class="wa-mode-note">Delivery mode: <strong>individual message to every approved Leader</strong>. This does not depend on WhatsApp group API eligibility.</p>
    </section>`;
  }

  async function loadStatus(){
    if (busy || !window.EFGCAuth?.accessToken?.()) return null;
    busy = true;
    try {
      const p = await adminProfile();
      if (!p || p.role !== 'admin' || p.approval_status !== 'approved') return null;
      const data = normalizeResult(await EFGCAuth.rest('rpc/get_whatsapp_admin_status', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:'{}'
      }));
      return data;
    } catch (e) {
      console.warn('WhatsApp admin status', e);
      return { error:e?.message || 'Could not load WhatsApp status.' };
    } finally { busy = false; }
  }

  async function ensurePanel(force=false){
    const host = document.querySelector('#adminPanel');
    if (!host || !window.EFGCAuth?.accessToken?.()) return;
    const p = await adminProfile();
    if (!p || p.role !== 'admin' || p.approval_status !== 'approved') {
      document.getElementById(PANEL_ID)?.remove();
      return;
    }
    if (!force && document.getElementById(PANEL_ID)) return;
    const status = await loadStatus() || {};
    document.getElementById(PANEL_ID)?.remove();
    host.insertAdjacentHTML('afterbegin', cardMarkup(status));
    bind();
    if (status.error) setMessage(status.error, true);
  }

  function setMessage(text, error=false){
    const el = document.querySelector('#waAdminMessage');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('error', Boolean(error));
  }

  async function save(){
    const phone = document.querySelector('#waPhoneNumberId')?.value.trim() || '';
    const waba = document.querySelector('#waWabaId')?.value.trim() || '';
    const version = document.querySelector('#waGraphVersion')?.value.trim() || '';
    const template = document.querySelector('#waTemplateName')?.value.trim() || 'efgc_event_morning_briefing';
    const language = document.querySelector('#waTemplateLanguage')?.value.trim() || 'en';
    const enabled = Boolean(document.querySelector('#waEnabled')?.checked);
    try {
      setMessage('Saving WhatsApp settings…');
      const data = normalizeResult(await EFGCAuth.rest('rpc/save_whatsapp_admin_config', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          p_phone_number_id:phone || null,
          p_waba_id:waba || null,
          p_graph_version:version || null,
          p_template_name:template,
          p_template_language:language,
          p_enabled:enabled
        })
      }));
      const status = document.querySelector('#waConnectionStatus');
      if (status) status.innerHTML = statusMarkup(data);
      setMessage(enabled ? 'WhatsApp settings saved and automatic delivery enabled.' : 'WhatsApp settings saved. Automatic delivery remains disabled.');
    } catch(e){ setMessage(e?.message || 'Could not save WhatsApp settings.', true); }
  }

  function bind(){
    document.querySelector('#waSaveSettings')?.addEventListener('click', save);
    document.querySelector('#waRefreshStatus')?.addEventListener('click', () => ensurePanel(true));
  }

  function observe(){
    if (observer) return;
    const host = document.querySelector('#adminPanel');
    if (!host) return;
    observer = new MutationObserver(() => {
      if (!document.getElementById(PANEL_ID)) setTimeout(() => ensurePanel(), 120);
    });
    observer.observe(host, { childList:true, subtree:false });
  }

  document.addEventListener('click', (e) => {
    const tab = e.target.closest?.('[data-tab="admin"]');
    if (tab) setTimeout(() => ensurePanel(true), 120);
  });

  window.addEventListener('efgc:auth-changed', () => setTimeout(() => ensurePanel(true), 100));
  setInterval(() => { observe(); if (!document.getElementById(PANEL_ID)) ensurePanel(); }, 5000);
  setTimeout(() => { observe(); ensurePanel(); }, 900);
})();
