/** V98 — Facebook-free WhatsApp sharing. This opens WhatsApp; it never sends. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = () => { try { return session?.uid ? session : null; } catch { return null; } };
  const staff = s => Boolean(s && s.approval_status === 'approved' &&
    (s.role === 'admin' || s.role === 'leader'));
  let requestId = 0, approved = [], verifiedFor = '';
  const visible = () => !$('#whatsappShare')?.classList.contains('hidden');
  const status = msg => { const el = $('#v98WhatsAppStatus'); if (el) el.textContent = msg; };
  function clear() {
    ++requestId;
    approved = []; verifiedFor = '';
    $('#v98WhatsAppApproved')?.replaceChildren();
    status('Open WhatsApp sharing to load your approved messages.');
    $('#whatsappShare')?.classList.add('hidden');
  }
  function sync() {
    const permitted = staff(state());
    $('#whatsappShareMenu')?.classList.toggle('hidden', !permitted);
    if (!permitted) clear();
  }
  function approvedHtml(row) {
    const text = escape(row.content);
    const link = 'https://wa.me/?text=' + encodeURIComponent(row.content);
    return '<article class="v98-whatsapp-message"><span class="v98-whatsapp-approved">'+
      '✓ ADMIN APPROVED</span><p class="v98-whatsapp-text">'+text+'</p>'+
      '<a class="v98-whatsapp-action" href="'+escape(link)+'" '+
      'target="_self" rel="noreferrer" aria-label="Share approved message to WhatsApp">'+
      '<span aria-hidden="true">↗</span> Share to WhatsApp</a></article>';
  }
  function render() {
    if (!visible() || !staff(state()) || verifiedFor !== state().uid) return;
    const host = $('#v98WhatsAppApproved');
    if (!host) return;
    host.innerHTML = approved.length
      ? approved.map(approvedHtml).join('')
      : '<article class="v98-whatsapp-empty"><h3>No approved messages yet</h3>'+
        '<p>Compose a message in the Ministry Centre or Leader Hub. An Admin must approve it before it appears here.</p></article>';
    status(approved.length + ' approved message' + (approved.length === 1 ? '' : 's') +
      ' available to this account. WhatsApp opens only when you tap Share.');
  }
  async function load() {
    const me = state();
    if (!staff(me) || !visible()) { clear(); return; }
    const request = ++requestId, uid = me.uid;
    approved = []; verifiedFor = '';
    $('#v98WhatsAppApproved')?.replaceChildren();
    status('Verifying permissions and loading approved messages…');
    try {
      // UI session is not authority. Supabase RLS also restricts rows by role/author.
      const verified = await window.EFGCAuth.getMyProfile();
      if (request !== requestId || state()?.uid !== uid || !visible()) return;
      if (verified?.id !== uid || verified.archived_at || !staff(verified)) {
        clear();
        $('#whatsappShareMenu')?.classList.add('hidden');
        window.showTab?.('home');
        return;
      }
      const rows = await window.EFGCAuth.rest(
        'whatsapp_message_drafts?select=id,author_id,content,status,created_at' +
        '&status=eq.approved&order=created_at.desc&limit=50');
      if (request !== requestId || state()?.uid !== uid || !visible()) return;
      if (!Array.isArray(rows)) throw new Error('Unexpected message list.');
      approved = rows.filter(row => row?.status === 'approved' &&
        typeof row.content === 'string' && row.content.trim());
      verifiedFor = uid;
      render();
    } catch (error) {
      if (request !== requestId || state()?.uid !== uid) return;
      approved = []; verifiedFor = '';
      $('#v98WhatsAppApproved')?.replaceChildren();
      status('Unable to load approved messages. Check your connection and tap Refresh.');
    }
  }
  const previousShow = window.showTab;
  if (typeof previousShow === 'function') {
    window.showTab = function (tab, ...args) {
      if (tab === 'whatsappShare' && !staff(state())) return;
      const result = previousShow.call(this, tab, ...args);
      if (tab === 'whatsappShare') void load();
      else ++requestId;
      return result;
    };
  }
  const previousShell = window.renderShell;
  if (typeof previousShell === 'function') {
    window.renderShell = function (...args) {
      const result = previousShell.apply(this,args);
      sync();
      return result;
    };
  }
  document.addEventListener('click',event => {
    if (event.target.closest?.('#v98WhatsAppRefresh')) void load();
    if (event.target.closest?.('#v98WhatsAppCompose')) {
      if (staff(state())) window.showTab?.('ministry');
    }
  });
  window.addEventListener('pageshow', () => {
    sync();
    if (staff(state()) && visible()) void load();
  });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();
  window.EFGCV98WhatsApp = {load,sync,clear};
})();