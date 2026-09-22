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
  async function build() {
    const root = ensure();
    const s = state();
    if (!s || !root) return reset();
    const token = ++renderToken;
    const admin = s.role === 'admin';
    const isStaff = staff(s);
    const menu = $('#v87MinistryMenu');
    if (menu) {
      menu.classList.remove('hidden');
      menu.lastElementChild.textContent = admin ? 'Ministry Centre' : isStaff ? 'Leader Hub' : 'My Journey';
    }
    root.innerHTML = '<article class="v87-intro v88-home-hero">' +
      '<div class="v88-hero-content">' +
      '<div class="v88-hero-eyebrow"><span class="v88-cross" aria-hidden="true">✦</span> EMMANUEL FULL GOSPEL CHURCH</div>' +
      '<h2>Shalom, <span>' + esc((s.name || 'EFGC Member').split(/\s+/)[0]) + '!</span></h2><p>' +
      (admin ? 'Lead with purpose. Keep our Youth family connected and cared for.' :
       isStaff ? 'Serve, inspire and help the next generation shine.' :
       'A place to belong, grow in faith and shine for Jesus.') +
      '</p><span class="v87-pill">' +
      (admin ? 'ADMIN CENTRE' : isStaff ? 'YOUTH LEADER' : 'EFGC YOUTH FAMILY') +
      '</span><p class="v88-hero-verse">“Let your light shine” <b>Matthew 5:16</b></p></div>' +
      '</article>' +
      '<div class="v88-content-heading"><div><small>NEXT UP</small><h3>Your next gathering</h3></div>' +
      '<button type="button" data-v87-go="events">All events <span aria-hidden="true">→</span></button></div>' +
      '<div id="v88NextEvent" class="v88-next-event"><span class="v88-skeleton">Checking the next youth gathering…</span></div>' +
      '<div class="v88-content-heading"><div><small>AT A GLANCE</small><h3>' +
      (admin ? 'Your ministry today' : isStaff ? 'Your serving overview' : 'Your faith journey') +
      '</h3></div></div>' +
      '<div id="v87LiveOverview" class="v87-stat-row"><article class="v87-mini-stat"><strong>Loading…</strong><span>Your latest ministry information</span></article></div>' +
      '<div class="v88-content-heading"><div><small>QUICK LINKS</small><h3>Your space</h3></div></div>' +
      '<div class="v87-quick-actions v88-quick-actions">' +
      '<button type="button" data-v87-go="scripture"><span class="v88-link-icon" aria-hidden="true">✦</span><span>Daily Scripture</span><span aria-hidden="true">↗</span></button>' +
      '<button type="button" data-v87-go="ministry"><span class="v88-link-icon" aria-hidden="true">♡</span><span>' +
      (admin ? 'Ministry Hub' : isStaff ? 'Leader Hub' : 'My Journey') +
      '</span><span aria-hidden="true">↗</span></button>' +
      '<button type="button" data-v87-go="' + (admin ? 'admin' : isStaff ? 'plannerRoster' : 'mine') +
      '"><span class="v88-link-icon" aria-hidden="true">' + (admin ? '⚙' : isStaff ? '≡' : '✓') +
      '</span><span>' + (admin ? 'Admin Centre' : isStaff ? 'My Roster' : 'My Attendance') +
      '</span><span aria-hidden="true">↗</span></button>' +
      '<button type="button" data-v87-go="news"><span class="v88-link-icon" aria-hidden="true">▤</span><span>Youth News</span><span aria-hidden="true">↗</span></button>' +
      '</div>';
    try {
      const [eventsResponse, plansResponse, dutiesResponse, profilesResponse] = await Promise.allSettled([
        EFGCLive.events(),
        isStaff ? EFGCLive.planner() : Promise.resolve([]),
        isStaff ? EFGCLive.duties() : Promise.resolve([]),
        admin ? EFGCLive.adminProfiles() : Promise.resolve([])
      ]);
      if (!state() || state().uid !== s.uid || token !== renderToken || !$('#v87LiveOverview')) return;
      const events = eventsResponse.status === 'fulfilled' ? eventsResponse.value || [] : [];
      const next = events.find(event => new Date(event.event_date).getTime() >= Date.now()) || null;
      const plans = plansResponse.status === 'fulfilled' ? plansResponse.value || [] : [];
      const duties = dutiesResponse.status === 'fulfilled' ? dutiesResponse.value || [] : [];
      const profiles = profilesResponse.status === 'fulfilled' ? profilesResponse.value || [] : [];
      const mine = duties.filter(item => item.leader_id === s.uid);
      const future = mine.map(item => ({
        duty: item, week: plans.find(plan => Number(plan.id) === Number(item.planner_id))
      })).filter(row => row.week && new Date(row.week.week_start + 'T23:59:59').getTime() >= Date.now())
        .sort((a,b) => a.week.week_start.localeCompare(b.week.week_start));
      const eventPanel = $('#v88NextEvent');
      if (eventPanel) {
        if (!next) eventPanel.innerHTML = '<article class="v88-event-content"><div class="v88-date-tile"><strong>EFGC</strong><span>YOUTH</span></div><div class="v88-event-body"><small>COMING TOGETHER</small><h4>See you at Youth!</h4><p>New event details will appear here as soon as they are published.</p></div><button type="button" data-v87-go="events" aria-label="View EFGC events">→</button></article>';
        else {
          const when = new Date(next.event_date);
          eventPanel.innerHTML = '<article class="v88-event-content"><div class="v88-date-tile"><strong>' +
            esc(when.toLocaleDateString('en-ZA',{day:'2-digit'})) +
            '</strong><span>' + esc(when.toLocaleDateString('en-ZA',{month:'short'}).toUpperCase()) +
            '</span></div><div class="v88-event-body"><small>UPCOMING YOUTH EVENT</small><h4>' +
            esc(next.title) + '</h4><p>' + esc(fmt(next.event_date)) +
            '</p></div><button type="button" data-v87-go="events" aria-label="View this event">→</button></article>';
        }
      }
      const tiles = [];
      if (admin) {
        tiles.push('<article class="v87-mini-stat"><strong>' + profiles.filter(p => !p.archived_at).length +
          '</strong><span>Active members</span></article>');
        tiles.push('<article class="v87-mini-stat"><strong>' +
          profiles.filter(p => !p.archived_at && p.role === 'leader' && p.approval_status === 'pending').length +
          '</strong><span>Leader approvals</span></article>');
        tiles.push('<article class="v87-mini-stat"><strong>' +
          duties.filter(d => d.status === 'replacement_requested').length +
          '</strong><span>Duty replacements</span></article>');
      } else if (isStaff) {
        tiles.push('<article class="v87-mini-stat"><strong>' + (future.length ? esc(future[0].duty.duty_type) : 'No duty assigned') +
          '</strong><span>' + (future.length ? esc(future[0].week.week_start) : 'Your next roster duty') + '</span></article>');
        tiles.push('<article class="v87-mini-stat"><strong>' +
          mine.filter(item => item.status === 'pending').length +
          '</strong><span>Your duties awaiting reply</span></article>');
      } else {
        tiles.push('<article class="v87-mini-stat"><span class="v88-stat-icon" aria-hidden="true">✦</span><strong>Faith</strong><span>Daily Scripture & Bible reading</span></article>');
        tiles.push('<article class="v87-mini-stat"><span class="v88-stat-icon" aria-hidden="true">♡</span><strong>Fellowship</strong><span>Prayer, testimonies & Youth news</span></article>');
      }
      $('#v87LiveOverview').innerHTML = tiles.join('');
    } catch (error) {
      if ($('#v87LiveOverview')) $('#v87LiveOverview').textContent =
        'Some information could not load. Use Retry connection to refresh.';
    }
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
      build().catch(error => {
        console.warn('EFGC dashboard refresh failed', error?.message || error);
      });
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
      else scheduleBuild(0);
      return result;
    };
  }
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-tab="home"], [data-v88-route="home"], [data-mock-tab="home"]'))
      scheduleBuild(0);
  });
  const init = () => { ensure(); if (state()) scheduleBuild(0); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
  window.addEventListener('pageshow', () => {
    if (state() && !$('#v87Today .v88-home-hero')) scheduleBuild(0);
  });
  window.EFGCV87Dashboard = { build, scheduleBuild };
})();
