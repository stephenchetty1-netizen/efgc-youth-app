/** EFGC Youth v64 — Event RSVP acknowledgement for Youth. */
(() => {
  const POLL_MS = 15000;
  let timer = null;
  let busy = false;
  let refreshPending = false;
  let profile = null;
  const saving = new Set();

  const $ = (s) => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function uid(){ return window.EFGCAuth?.userId?.() || null; }
  function signedIn(){ return Boolean(uid() && window.EFGCAuth?.accessToken?.()); }
  function isYouth(){ return profile?.role === 'youth'; }
  function isStaff(){ return profile?.role === 'admin' || (profile?.role === 'leader' && profile?.approval_status === 'approved'); }
  function eventKey(id){ return `event-rsvp-${Number(id)}`; }

  async function loadProfile(){
    if (!signedIn()) { profile = null; return null; }
    try { profile = await EFGCAuth.getMyProfile(); } catch { profile = null; }
    return profile;
  }

  async function loadOwnResponses(){
    if (!isYouth()) return [];
    const rows = await EFGCAuth.rest(`event_rsvps?select=event_id,response,updated_at&youth_id=eq.${encodeURIComponent(uid())}`);
    return Array.isArray(rows) ? rows : [];
  }

  async function loadStaffResponses(){
    if (!isStaff()) return [];
    const rows = await EFGCAuth.rest('event_rsvps?select=event_id,response');
    return Array.isArray(rows) ? rows : [];
  }

  function responseLabel(value){
    if (value === 'attending') return 'Attending';
    if (value === 'not_attending') return 'Not Attending';
    return 'Awaiting response';
  }

  function youthPanel(event, current){
    const attending = current === 'attending';
    const notAttending = current === 'not_attending';
    return `
      <div class="event-rsvp-panel" id="${eventKey(event.id)}" data-event-id="${Number(event.id)}">
        <div class="event-rsvp-title"><span>📋 Attendance acknowledgement</span><strong>${esc(responseLabel(current))}</strong></div>
        <p>Will you be attending this event?</p>
        <div class="event-rsvp-actions">
          <button type="button" class="event-rsvp-btn attending ${attending ? 'active' : ''}" data-response="attending" aria-pressed="${attending}">✓ Attending</button>
          <button type="button" class="event-rsvp-btn not-attending ${notAttending ? 'active' : ''}" data-response="not_attending" aria-pressed="${notAttending}">✕ Not Attending</button>
        </div>
        <div class="event-rsvp-message" aria-live="polite"></div>
      </div>`;
  }

  function staffPanel(eventId, allResponses){
    const rows = allResponses.filter(r => Number(r.event_id) === Number(eventId));
    const attending = rows.filter(r => r.response === 'attending').length;
    const notAttending = rows.filter(r => r.response === 'not_attending').length;
    return `
      <div class="event-rsvp-panel staff-summary" id="${eventKey(eventId)}">
        <div class="event-rsvp-title"><span>📊 Youth responses</span><strong>${rows.length} received</strong></div>
        <div class="event-rsvp-counts"><span>✓ ${attending} Attending</span><span>✕ ${notAttending} Not Attending</span></div>
      </div>`;
  }

  async function saveResponse(eventId, response, panel){
    if (!isYouth() || !['attending','not_attending'].includes(response)) return;
    const memberId = uid();
    const saveKey = `${memberId}:${eventId}`;
    if (saving.has(saveKey)) return;
    saving.add(saveKey);
    const message = panel?.querySelector('.event-rsvp-message');
    const buttons = [...(panel?.querySelectorAll('.event-rsvp-btn') || [])];
    buttons.forEach(b => b.disabled = true);
    if (message) message.textContent = 'Saving your response…';
    try {
      const now = new Date().toISOString();
      await EFGCAuth.rest('event_rsvps?on_conflict=event_id,youth_id', {
        method:'POST',
        headers:{'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=representation'},
        body:JSON.stringify({event_id:Number(eventId), youth_id:memberId, response, responded_at:now, updated_at:now})
      });
      if (uid() !== memberId) return;
      panel.dataset.rsvpState = JSON.stringify(['youth', response]);
      if (message) message.textContent = response === 'attending' ? 'Thank you — you are marked as attending.' : 'Thank you — you are marked as not attending.';
      buttons.forEach(b => {
        const active = b.dataset.response === response;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      const status = panel?.querySelector('.event-rsvp-title strong');
      if (status) status.textContent = responseLabel(response);
    } catch (e) {
      if (message) message.textContent = `Could not save your response: ${e?.message || 'Please try again.'}`;
    } finally {
      saving.delete(saveKey);
      buttons.forEach(b => b.disabled = false);
    }
  }

  function bindYouthPanels(){
    document.querySelectorAll('.event-rsvp-panel[data-event-id]').forEach(panel => {
      if (panel.dataset.bound === '1') return;
      panel.dataset.bound = '1';
      panel.querySelectorAll('.event-rsvp-btn').forEach(btn => btn.addEventListener('click', () => saveResponse(panel.dataset.eventId, btn.dataset.response, panel)));
    });
  }

  async function enhanceEvents(){
    if (document.hidden || !signedIn() || !window.EFGCAuth?.rest || $('#events')?.classList.contains('hidden')) return;
    if (busy) { refreshPending = true; return; }
    const host = $('#eventList');
    const cards = [...(host?.querySelectorAll('.event-card[data-event-id]') || [])];
    if (!cards.length) return;
    const memberId = uid();
    busy = true;
    try {
      if (!profile || profile.id !== uid()) await loadProfile();
      if (!profile) return;

      let ownMap = new Map();
      let staffResponses = [];
      if (isYouth()) {
        const own = await loadOwnResponses();
        ownMap = new Map(own.map(r => [Number(r.event_id), r.response]));
      } else if (isStaff()) {
        staffResponses = await loadStaffResponses();
      } else return;
      if (memberId !== uid()) return;
      cards.forEach(card => {
        const event = {id:card.dataset.eventId};
        if (!card.isConnected || saving.has(`${memberId}:${event.id}`)) return;
        const current = ownMap.get(Number(event.id)) || null;
        const responses = staffResponses.filter(r => Number(r.event_id) === Number(event.id));
        const signature = JSON.stringify(isYouth() ? ['youth', current] : ['staff', responses.length, responses.filter(r=>r.response==='attending').length]);
        const existing = card.querySelector('.event-rsvp-panel');
        if (existing?.dataset.rsvpState === signature) return;
        existing?.remove();
        const body = card.querySelector('.event-card-body') || card;
        body.insertAdjacentHTML('beforeend', isYouth() ? youthPanel(event, current) : staffPanel(event.id, staffResponses));
        card.querySelector('.event-rsvp-panel').dataset.rsvpState = signature;
      });
      if (isYouth()) bindYouthPanels();
    } catch (e) {
      if (e?.status !== 401) console.warn('Event RSVP panel could not load:', e?.message || e);
    } finally {
      busy = false;
      if (refreshPending) { refreshPending = false; enhanceEvents(); }
    }
  }

  function boot(){
    setTimeout(enhanceEvents, 1800);
    timer = setInterval(enhanceEvents, POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) enhanceEvents(); });
    window.addEventListener('focus', enhanceEvents);
    document.addEventListener('efgc:tab-changed', e => { if(e.detail.tab==='events') enhanceEvents(); });
    document.addEventListener('efgc:events-rendered', enhanceEvents);
    window.addEventListener('storage', (e) => {
      if (e.key === 'efgcYouthSession' || e.key === 'efgcSupabaseAuth') { profile = null; setTimeout(enhanceEvents, 500); }
    });
  }

  window.EFGCEventRSVP = { refresh: enhanceEvents };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
