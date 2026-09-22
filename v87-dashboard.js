(function EFGCV87Dashboard() {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = () => { try { return session?.uid ? session : null; } catch (_) { return null; } };
  const staff = s => s?.role === 'admin' || (s?.role === 'leader' && s.approval_status === 'approved');
  const fmt = value => new Date(value).toLocaleString('en-ZA', { weekday:'short', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  function ensure() {
    const home = $('#home');
    if (!home) return null;
    let root = $('#v87Today');
    if (!root) {
      root = document.createElement('section');
      root.id = 'v87Today';
      root.setAttribute('aria-label', 'Your EFGC Youth dashboard');
      home.insertBefore(root, home.firstChild);
    }
    let menu = $('#v87MinistryMenu');
    if (!menu) {
      menu = document.createElement('button');
      menu.id = 'v87MinistryMenu';
      menu.className = 'menu-item';
      menu.type = 'button';
      menu.dataset.tab = 'ministry';
      menu.innerHTML = '<span class="nav-glyph">✦</span><span>My Journey</span>';
      const nav = $('#mainMenu');
      if (nav) nav.insertBefore(menu, $('#adminMenu') || null);
    }
    return root;
  }
  let scheduled = null;
  let renderToken = 0;
  function reset() {
    renderToken++;
    if (scheduled !== null) { clearTimeout(scheduled); scheduled = null; }
    $('#v87Today')?.replaceChildren();
    $('#v87MinistryMenu')?.classList.add('hidden');
  }
  // V91 home: paint the full recommended layout synchronously.
  // Event and Admin queries refresh their own regions; none may delay the hero.
  function paint(s) {
    const root = ensure();
    if (!root || !s?.uid) return null;
    const admin = s.role === 'admin';
    const isStaff = staff(s);
    const menu = $('#v87MinistryMenu');
    if (menu) {
      menu.classList.remove('hidden');
      menu.lastElementChild.textContent = admin ? 'Ministry Centre' : isStaff ? 'Leader Hub' : 'My Journey';
    }
    const first = (s.name || 'EFGC Member').trim().split(/\s+/)[0] || 'Friend';
    root.innerHTML = '<article class="v87-intro v88-home-hero">' +
      '<div class="v88-hero-content">' +
      '<div class="v88-hero-eyebrow"><span class="v88-cross" aria-hidden="true">✦</span> EFGC YOUTH • GOD WITH US</div>' +
      '<h2>Shalom, <span>' + esc(first) + '!</span></h2><p>' +
      (admin ? 'Lead with purpose. Keep our Youth family connected and cared for.' :
       isStaff ? 'Serve, inspire and help the next generation shine.' :
       'A place to belong, grow in faith and shine for Jesus.') +
      '</p><span class="v87-pill">' +
      (admin ? 'ADMIN • MAIN YOUTH LEADER' : isStaff ? 'YOUTH LEADER' : 'EFGC YOUTH FAMILY') +
      '</span><p class="v88-hero-verse">“Let your light shine” <b>Matthew 5:16</b></p></div>' +
      '<img class="v91-hero-emblem" src="assets/v74-efgc-logo.webp?v=89.1" alt="" aria-hidden="true">' +
      '</article>' +
      '<div class="v88-content-heading"><div><small>COMING UP</small><h3>Next youth gathering</h3></div>' +
      '<button type="button" data-v87-go="events">View events <span aria-hidden="true">→</span></button></div>' +
      '<div id="v88NextEvent" class="v88-next-event" aria-live="polite">' +
      '<div class="v88-event-content"><div class="v88-date-tile"><strong>EFGC</strong><span>YOUTH</span></div>' +
      '<div class="v88-event-body"><small>UPCOMING EVENT</small><h4>Checking Youth events…</h4>' +
      '<p>Published meeting details appear here.</p></div></div></div>' +
      '<div class="v88-content-heading"><div><small>YOUR SPACE</small><h3>' +
      (admin ? 'Ministry overview' : isStaff ? 'Serving overview' : 'Your faith journey') +
      '</h3></div></div>' +
      '<div id="v87LiveOverview" class="v87-stat-row" aria-live="polite">' +
      (admin ?
        '<article class="v87-mini-stat"><strong>—</strong><span>Active members</span></article>' +
        '<article class="v87-mini-stat"><strong>—</strong><span>Leader approvals</span></article>' +
        '<article class="v87-mini-stat"><strong>—</strong><span>Duty requests</span></article>' :
       isStaff ?
        '<article class="v87-mini-stat"><strong>—</strong><span>Next roster duty</span></article>' +
        '<article class="v87-mini-stat"><strong>—</strong><span>Duty replies</span></article>' :
        '<article class="v87-mini-stat"><span class="v88-stat-icon" aria-hidden="true">✦</span><strong>Faith</strong><span>Bible reading & Scripture</span></article>' +
        '<article class="v87-mini-stat"><span class="v88-stat-icon" aria-hidden="true">♡</span><strong>Fellowship</strong><span>Prayer & Youth news</span></article>') +
      '</div>' +
      '<div class="v88-content-heading"><div><small>ONE TAP AWAY</small><h3>Quick actions</h3></div></div>' +
      '<div class="v87-quick-actions v88-quick-actions">' +
      '<button type="button" data-v87-go="events"><span class="v88-link-icon" aria-hidden="true">▦</span><span>Events</span><span aria-hidden="true">↗</span></button>' +
      '<button type="button" data-v87-go="ministry"><span class="v88-link-icon" aria-hidden="true">♡</span><span>' +
      (admin ? 'Ministry Hub' : isStaff ? 'Leader Hub' : 'My Journey') +
      '</span><span aria-hidden="true">↗</span></button>' +
      '<button type="button" data-v87-go="' + (admin ? 'admin' : isStaff ? 'plannerRoster' : 'mine') +
      '"><span class="v88-link-icon" aria-hidden="true">' + (admin ? '⚙' : isStaff ? '≡' : '✓') +
      '</span><span>' + (admin ? 'Admin Centre' : isStaff ? 'My Roster' : 'My Attendance') +
      '</span><span aria-hidden="true">↗</span></button>' +
      '<button type="button" data-v87-go="scripture"><span class="v88-link-icon" aria-hidden="true">✦</span><span>Scripture Studio</span><span aria-hidden="true">↗</span></button>' +
      '</div>';
    return root;
  }
  async function loadEvent(s, token) {
    const eventPanel = $('#v88NextEvent');
    if (!eventPanel) return;
    try {
      if (!window.EFGCLive?.events) throw Error('Events unavailable');
      const events = await EFGCLive.events();
      if (token !== renderToken || state()?.uid !== s.uid) return;
      const next = (events || []).filter(e => Number.isFinite(new Date(e.event_date).getTime()) &&
        new Date(e.event_date).getTime() >= Date.now())
        .sort((a,b) => new Date(a.event_date) - new Date(b.event_date))[0];
      const label = next ? new Date(next.event_date) : null;
      eventPanel.innerHTML = '<article class="v88-event-content">' +
        '<div class="v88-date-tile"><strong>' +
        (label ? esc(label.toLocaleDateString('en-ZA',{day:'2-digit'})) : 'EFGC') +
        '</strong><span>' +
        (label ? esc(label.toLocaleDateString('en-ZA',{month:'short'}).toUpperCase()) : 'YOUTH') +
        '</span></div><div class="v88-event-body"><small>' +
        (next ? 'UPCOMING YOUTH EVENT' : 'GATHER TOGETHER') + '</small><h4>' +
        (next ? esc(next.title) : 'See you at Youth!') + '</h4><p>' +
        (next ? esc(fmt(next.event_date)) : 'Published events will appear here.') +
        '</p></div><button type="button" data-v87-go="events" aria-label="Open EFGC Youth events">→</button></article>';
    } catch (error) {
      if (token !== renderToken || state()?.uid !== s.uid || !$('#v88NextEvent')) return;
      $('#v88NextEvent').innerHTML =
        '<div class="v88-event-content"><div class="v88-date-tile"><strong>EFGC</strong><span>YOUTH</span></div>' +
        '<div class="v88-event-body"><small>EVENTS</small><h4>Events could not refresh</h4>' +
        '<p>Open Events or retry your connection.</p></div>' +
        '<button type="button" data-v87-go="events" aria-label="Open Events">→</button></div>';
    }
  }
  async function loadOverview(s, token) {
    const root = $('#v87LiveOverview');
    if (!root || !staff(s)) return;
    const admin = s.role === 'admin';
    const results = await Promise.allSettled([
      EFGCLive.planner(), EFGCLive.duties(),
      admin ? EFGCLive.adminProfiles() : Promise.resolve([])
    ]);
    if (token !== renderToken || state()?.uid !== s.uid || !$('#v87LiveOverview')) return;
    const take = i => results[i].status === 'fulfilled' && Array.isArray(results[i].value) ?
      results[i].value : null;
    const plans = take(0), duties = take(1), profiles = take(2);
    const val = (value, label) => '<article class="v87-mini-stat"><strong>' +
      esc(value == null ? '—' : value) + '</strong><span>' + esc(label) + '</span></article>';
    if (admin) {
      root.innerHTML =
        val(profiles && profiles.filter(p => !p.archived_at).length, 'Active members') +
        val(profiles && profiles.filter(p => !p.archived_at && p.role === 'leader' && p.approval_status === 'pending').length,
          'Leader approvals') +
        val(duties && duties.filter(d => d.status === 'replacement_requested').length, 'Duty requests');
    } else {
      const mine = (duties || []).filter(d => d.leader_id === s.uid);
      const future = mine.map(d => ({
        duty:d, plan:(plans || []).find(p => String(p.id) === String(d.planner_id))
      })).filter(row => row.plan && new Date(row.plan.week_start + 'T23:59:59') >= new Date())
        .sort((a,b) => a.plan.week_start.localeCompare(b.plan.week_start));
      root.innerHTML = val(!duties || !plans ? null :
        future.length ? future[0].duty.duty_type : 'No duty assigned','Next roster duty') +
        val(duties && mine.filter(d => d.status === 'pending').length, 'Duties awaiting reply');
    }
  }
  function build() {
    const s = state();
    if (!s) return reset();
    if (!paint(s)) return;
    const token = ++renderToken;
    // Independent requests: a slow leader directory cannot blank Events/Home.
    loadEvent(s, token);
    if (staff(s) && window.EFGCLive) loadOverview(s, token)
      .catch(error => console.warn('EFGC overview could not refresh', error?.message || error));
  }
  document.addEventListener('click', event => {
    const b = event.target.closest?.('[data-v87-go]');
    if (!b || !state()) return;
    const tab = b.dataset.v87Go;
    if (typeof window.showTab === 'function') window.showTab(tab);
    if (tab === 'ministry') window.EFGCV87Ministry?.render?.();
  });
  // V90: Never make the main dashboard contingent on the preceding Admin or
  // live-data waterfall succeeding. Start its static layout immediately when
  // the member session becomes available; load counts independently.
  function scheduleBuild(delay = 0) {
    if (!state()) return;
    ensure();
    if (scheduled !== null) clearTimeout(scheduled);
    scheduled = setTimeout(() => {
      scheduled = null;
      try { build(); }
      catch (error) { console.warn('EFGC dashboard refresh failed', error?.message || error); }
    }, delay);
  }
  const previousLive = window.renderLiveData;
  if (typeof previousLive === 'function') {
    window.renderLiveData = async function (...args) {
      let result;
      try { result = await previousLive.apply(this, args); }
      finally {
        // The member must still see Home when an unrelated module fails.
        scheduleBuild(0);
      }
      return result;
    };
  }
  const previousShell = window.renderShell;
  if (typeof previousShell === 'function') {
    window.renderShell = function (...args) {
      const result = previousShell.apply(this, args);
      if (!state()) reset();
      else {
        try { build(); } catch (error) { console.warn('Dashboard layout did not render', error); }
      }
      return result;
    };
  }
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-tab="home"], [data-v88-route="home"], [data-mock-tab="home"]'))
      scheduleBuild(0);
  });
  const init = () => { ensure(); if (state()) scheduleBuild(0); };
  const watch = new MutationObserver(() => {
    if (!state() || !$('#home')) return;
    if (!$('#v87Today .v88-home-hero')) scheduleBuild(0);
  });
  if (document.body) watch.observe(document.body, {attributes:true,attributeFilter:['class']});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
  window.addEventListener('pageshow', () => {
    if (state() && !$('#v87Today .v88-home-hero')) scheduleBuild(0);
  });
  window.EFGCV87Dashboard = { build, scheduleBuild };
})();
