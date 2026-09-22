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
  function reset() {
    $('#v87Today')?.replaceChildren();
    $('#v87MinistryMenu')?.classList.add('hidden');
  }
  async function build() {
    const root = ensure();
    const s = state();
    if (!s || !root) return reset();
    const admin = s.role === 'admin';
    const isStaff = staff(s);
    const menu = $('#v87MinistryMenu');
    if (menu) {
      menu.classList.remove('hidden');
      menu.lastElementChild.textContent = admin ? 'Ministry Centre' : isStaff ? 'Leader Hub' : 'My Journey';
    }
    root.innerHTML = '<article class="v87-intro"><small>ONE CHURCH • ONE YOUTH FAMILY</small><h2>Shalom, ' +
      esc((s.name || 'EFGC Member').split(/\s+/)[0]) + '!</h2><p>' +
      (admin ? 'Your EFGC Admin overview.' : isStaff ? 'Thank you for serving our youth.' : 'Build your faith. Belong to the family. Be a light.') +
      '</p><span class="v87-pill">' + (admin ? 'ADMIN' : isStaff ? 'APPROVED LEADER' : 'EFGC YOUTH') + '</span></article>' +
      '<div id="v87LiveOverview" class="v87-stat-row"><article class="v87-mini-stat"><strong>Loading…</strong><span>Your latest ministry information</span></article></div>' +
      '<div class="v87-quick-actions"><button type="button" data-v87-go="events">Upcoming Events</button>' +
      '<button type="button" data-v87-go="ministry">' + (isStaff ? 'My Ministry' : 'My Journey') + '</button>' +
      '<button type="button" data-v87-go="' + (admin ? 'admin' : 'profile') + '">' + (admin ? 'Admin Centre' : 'My Profile') + '</button></div>';
    try {
      const [eventsResponse, plansResponse, dutiesResponse, profilesResponse] = await Promise.allSettled([
        EFGCLive.events(),
        isStaff ? EFGCLive.planner() : Promise.resolve([]),
        isStaff ? EFGCLive.duties() : Promise.resolve([]),
        admin ? EFGCLive.adminProfiles() : Promise.resolve([])
      ]);
      if (!state() || state().uid !== s.uid || !$('#v87LiveOverview')) return;
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
      const tiles = [];
      tiles.push('<article class="v87-mini-stat"><strong>' + (next ? esc(next.title) : 'No event scheduled') + '</strong><span>' +
        (next ? esc(fmt(next.event_date)) : 'Check back for the next Youth meeting') + '</span></article>');
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
        tiles.push('<article class="v87-mini-stat"><strong>Matthew 5:16</strong><span>Let your light shine</span></article>');
        tiles.push('<article class="v87-mini-stat"><strong>Prayer & growth</strong><span>Your private ministry journey</span></article>');
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
  const previousLive = window.renderLiveData;
  if (typeof previousLive === 'function') {
    window.renderLiveData = async function (...args) {
      const result = await previousLive.apply(this, args);
      await build();
      return result;
    };
  }
  const previousShell = window.renderShell;
  if (typeof previousShell === 'function') {
    window.renderShell = function (...args) {
      const result = previousShell.apply(this, args);
      if (!state()) reset();
      else ensure();
      return result;
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure, {once:true});
  else ensure();
  window.EFGCV87Dashboard = { build };
})();
