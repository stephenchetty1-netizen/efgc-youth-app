/** EFGC V97: two live, read-only member lists for approved staff only.
 * Browser display rules add to, but never replace, Supabase RLS.
 * Fetch only display-safe directory columns, not DOB, safeguarding or photo paths.
 */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = () => { try { return session?.uid ? session : null; } catch { return null; } };
  const authorised = s => Boolean(s &&
    ((s.role === 'admin' && s.approval_status === 'approved') ||
      (s.role === 'leader' && s.approval_status === 'approved')));
  let generation = 0, tab = 'youth', members = [], verifiedAccount = null;
  const root = () => $('#staffDirectory');
  const status = message => { const el = $('#v97DirectoryStatus'); if (el) el.textContent = message; };

  function empty() {
    generation++;
    members = [];
    verifiedAccount = null;
    const host = $('#v97DirectoryRows');
    if (host) host.replaceChildren();
    const page = root();
    if (page) page.classList.add('hidden');
  }
  function sync() {
    const s = state();
    const allow = authorised(s);
    $('#staffDirectoryMenu')?.classList.toggle('hidden', !allow);
    if (!allow) empty();
    const preview = $('#photoPreview');
    if (preview) {
      const registering = Boolean($('#noEmailModeSwitch [data-auth-mode="register"].active'));
      preview.classList.toggle('hidden', !registering);
    }
  }
  function renderRows() {
    const host = $('#v97DirectoryRows');
    if (!host || !authorised(state()) || !verifiedAccount ||
        verifiedAccount !== state().uid) return;
    const term = ($('#v97DirectorySearch')?.value || '').toLocaleLowerCase().trim();
    const youth = members.filter(p => p.role === 'youth' && p.approval_status === 'approved');
    const leaders = members.filter(p => p.role === 'admin' ||
      (p.role === 'leader' && p.approval_status === 'approved'));
    const pending = members.filter(p => p.role === 'leader' && p.approval_status === 'pending');
    $('#v97YouthCount').textContent = String(youth.length);
    $('#v97LeaderCount').textContent = String(leaders.length);
    $('#v97PendingNote').textContent = state().role === 'admin' && pending.length ?
      pending.length + ' Leader application(s) awaiting Admin review in Admin Centre.' : '';
    const showing = (tab === 'youth' ? youth : leaders).filter(p =>
      (p.full_name || '').toLocaleLowerCase().includes(term) ||
      (p.leader_role || '').toLocaleLowerCase().includes(term));
    host.innerHTML = showing.length ? showing.map(p => {
      const initials = (p.full_name || 'EFGC').trim().split(/\s+/)
        .slice(0,2).map(w => w[0] || '').join('').toLocaleUpperCase();
      const leader = p.role === 'admin' || p.role === 'leader';
      const title = leader
        ? (p.leader_role || (p.role === 'admin' ? 'EFGC Admin' : 'Youth Leader'))
        : 'Youth Member';
      return '<article class="v97-person"><span class="v97-person-avatar" aria-hidden="true">'+
        esc(initials)+'</span><div class="v97-person-details"><strong>'+esc(p.full_name || 'EFGC member')+
        '</strong><small>'+esc(title)+'</small></div><span class="v97-person-badge">'+
        (p.role === 'admin' ? 'ADMIN' : leader ? 'LEADER' : 'YOUTH')+'</span></article>';
    }).join('') : '<article class="v97-empty"><h3>No '+
      (tab === 'youth' ? 'Youth' : 'approved Leaders')+' found</h3><p>'+
      (term ? 'Try another name in the search box.' :
        tab === 'youth' ? 'Registered Youth members will appear here.' :
          'Leaders appear after Admin approval.')+'</p></article>';
    $('#v97YouthTab')?.setAttribute('aria-selected',String(tab === 'youth'));
    $('#v97LeaderTab')?.setAttribute('aria-selected',String(tab === 'leaders'));
    $('#v97YouthTab')?.classList.toggle('active',tab === 'youth');
    $('#v97LeaderTab')?.classList.toggle('active',tab === 'leaders');
    status('Directory refreshed. Names and approved roles only.');
  }

  async function load() {
    const s = state(), page = root();
    if (!page || !authorised(s)) { empty(); return; }
    const id = s.uid, request = ++generation;
    members = []; verifiedAccount = null;
    $('#v97DirectoryRows')?.replaceChildren();
    status('Checking your access and loading the member directory…');
    try {
      // The UI's cached role is NOT permission to view other members.
      const myProfile = await window.EFGCAuth.getMyProfile();
      if (request !== generation || state()?.uid !== id || !root() ||
          root().classList.contains('hidden')) return;
      if (myProfile?.id !== id || myProfile.archived_at || !authorised(myProfile)) {
        empty();
        $('#staffDirectoryMenu')?.classList.add('hidden');
        if (typeof window.showTab === 'function') window.showTab('home');
        return;
      }
      const rows = await window.EFGCAuth.rest(
        'profiles?select=id,full_name,role,approval_status,leader_role&archived_at=is.null&order=full_name.asc'
      );
      if (request !== generation || state()?.uid !== id || !root() ||
          root().classList.contains('hidden')) return;
      if (!Array.isArray(rows)) throw new Error('Unexpected response from the member directory.');
      verifiedAccount = id;
      members = rows.filter(p => p && ['youth','leader','admin'].includes(p.role));
      renderRows();
    } catch (error) {
      if (request !== generation || state()?.uid !== id) return;
      verifiedAccount = null;
      members = [];
      $('#v97DirectoryRows')?.replaceChildren();
      status('Could not load members: ' + (error?.message || 'Check your connection and retry.'));
    }
  }
  const oldShow = window.showTab;
  if (typeof oldShow === 'function') window.showTab = function (id, ...args) {
    if (id === 'staffDirectory' && !authorised(state())) return;
    const result = oldShow.call(this,id,...args);
    if (id === 'staffDirectory') void load();
    else generation++;
    return result;
  };
  const oldShell = window.renderShell;
  if (typeof oldShell === 'function') window.renderShell = function (...args) {
    const result = oldShell.apply(this,args);
    sync();
    return result;
  };
  const oldLive = window.renderLiveData;
  if (typeof oldLive === 'function') window.renderLiveData = async function (...args) {
    const result = await oldLive.apply(this,args);
    sync();
    if (authorised(state()) && !root()?.classList.contains('hidden')) await load();
    return result;
  };
  document.addEventListener('click',event => {
    const nav = event.target.closest?.('#mainMenu [data-tab="staffDirectory"]');
    if (nav && authorised(state())) {
      // The legacy menu's click handler routes before this handler.
      if (!root()?.classList.contains('hidden')) void load();
    }
    const select = event.target.closest?.('#v97DirectoryTabs button[data-kind]');
    if (select) { tab = select.dataset.kind === 'leaders' ? 'leaders' : 'youth'; renderRows(); }
    if (event.target.closest?.('#v97DirectoryRetry')) void load();
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'v97DirectorySearch') renderRows();
  });
  document.addEventListener('click',event => {
    if (event.target.closest?.('#noEmailModeSwitch [data-auth-mode]'))
      queueMicrotask(sync);
  });
  window.addEventListener('pageshow', () => {
    sync();
    if (authorised(state()) && !root()?.classList.contains('hidden')) void load();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();
  window.EFGCV97Directory = {load,sync,clear:empty,renderRows};
})();