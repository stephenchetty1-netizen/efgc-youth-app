/** EFGC Youth V61 — authenticated app theme only. Welcome/login rendering is owned by v54-stable-welcome.js. */
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const logoAsset = 'assets/efgc-logo.svg?v=62.0';

  function activeSession(){ try { return session || null; } catch { return null; } }

  function applyBrandAssets(){
    document.querySelectorAll('.brand-logo,.hero-logo,.official-footer-logo').forEach(img => {
      if (img.getAttribute('src') !== logoAsset) img.src = logoAsset;
      img.classList.remove('reference-logo');
      img.classList.add('official-logo');
      img.style.objectPosition = 'center center';
    });
    const hero = $('.hero');
    if(hero){
      hero.style.backgroundImage = 'linear-gradient(90deg,rgba(1,19,48,.88),rgba(1,19,48,.16)),url("assets/v49-youth-fellowship.webp?v=62.0")';
      const home = $('#home');
      const heading = home?.querySelector('.v49-heading');
      if(home && heading && hero.parentElement !== home) heading.after(hero);
      hero.setAttribute('aria-label','You are a light — Matthew 5:16');
      hero.classList.add('mockup-hero');
    }
  }

  function icon(name){
    const paths={
      news:'M4 5h16v14H4z M7 8h10 M7 11h10 M7 14h6',
      calendar:'M5 4h14v16H5z M8 2v4 M16 2v4 M5 8h14 M8 11h2 M12 11h2 M16 11h2 M8 15h2 M12 15h2',
      chart:'M5 19V9h3v10 M11 19V5h3v14 M17 19v-7h3v7',
      book:'M4 5c4-2 7 0 8 2v12c-1-2-4-4-8-2z M20 5c-4-2-7 0-8 2v12c1-2 4-4 8-2z',
      users:'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-4 2-7 5-7s5 3 5 7 M11 20c0-4 2-7 5-7s5 3 5 7',
      list:'M8 6h12 M8 12h12 M8 18h12 M4 6h.01 M4 12h.01 M4 18h.01',
      chat:'M4 5h16v11H9l-5 4z M8 9h8 M8 12h5',
      phone:'M7 3l3 5-2 2c2 4 4 6 8 8l2-2 5 3-2 4c-1 2-4 2-8 0C7 17 3 13 3 7c0-2 1-3 4-4z',
      shield:'M12 3l8 3v5c0 5-3 8-8 10-5-2-8-5-8-10V6z M12 8v8 M8 12h8',
      gear:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M19 5l-2 2 M7 17l-2 2',
      home:'M3 11l9-8 9 8 M5 10v10h14V10 M9 20v-6h6v6',
      profile:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-5 3-8 8-8s8 3 8 8'
    };
    return `<svg class="mock-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.news}"/></svg>`;
  }

  function dashboardTiles(){
    const s=activeSession();
    if(!s) return [];
    const staff = s.role==='admin' || (s.role==='leader' && s.approval_status==='approved');
    if(s.role==='admin') return [
      ['Manage Events','calendar','admin','adminEventTitle'],['Record Attendance','users','attendanceAdmin'],['Accounts & Approvals','list','admin','adminPanel'],['Security & Access','shield','security'],['Leaders','users','leaders'],['Duty Roster','calendar','plannerRoster'],['News Feed','news','news'],['Settings','gear','security']
    ];
    if(staff) return [
      ['News Feed','news','news'],['Events','calendar','events'],['Duty Roster','users','plannerRoster'],['Daily Scripture','book','scripture'],['Leaders','users','leaders'],['Profile','profile','profile'],['Security','shield','security'],['Contact Leaders','phone','leaders']
    ];
    return [
      ['News Feed','news','news'],['Events','calendar','events'],['My Attendance','chart','mine'],['Daily Scripture','book','scripture'],['Leaders','users','leaders'],['Profile','profile','profile'],['Security','shield','security'],['Contact Leaders','phone','leaders']
    ];
  }

  function ensureHomeDashboard(){
    const home=$('#home'); if(!home || !activeSession()) return;
    let dash=$('#mockHomeDashboard');
    if(!dash){ dash=document.createElement('div'); dash.id='mockHomeDashboard'; dash.className='mock-dashboard'; home.insertBefore(dash,$('#leaderReminder')||home.firstChild); }
    dash.innerHTML=dashboardTiles().map(([label,ico,tab,anchor])=>`<button class="mock-dashboard-tile" type="button" data-mock-tab="${tab}" ${anchor?`data-mock-anchor="${anchor}"`:''}>${icon(ico)}<span>${esc(label)}</span></button>`).join('');
  }

  function ensureBottomNav(){
    if($('#mockBottomNav')) return;
    const nav=document.createElement('nav'); nav.id='mockBottomNav'; nav.className='mock-bottom-nav hidden'; nav.setAttribute('aria-label','Mobile navigation');
    nav.innerHTML=`<button data-mock-tab="home">${icon('home')}<span>Home</span></button><button data-mock-tab="events">${icon('calendar')}<span>Events</span></button><button data-mock-tab="scripture">${icon('book')}<span>Scripture</span></button><button data-mock-tab="profile">${icon('profile')}<span>Profile</span></button>`;
    document.body.appendChild(nav);
  }

  function syncThemeShell(){
    const signed=Boolean(activeSession()?.uid);
    $('#mockWelcome')?.classList.toggle('hidden', signed);
    $('#mockBottomNav')?.classList.toggle('hidden', !signed);
    document.body.classList.toggle('mock-authenticated',signed);
    applyBrandAssets();
    ensureHomeDashboard();
    ensureAdminDashboard();
  }

  async function renderAttendanceMock(){
    const s=activeSession(); const host=$('#mineList');
    if(!s?.uid || s.role!=='youth' || !host || !window.EFGCLive) return;
    try{
      const rows=await EFGCLive.myAttendance(s.uid);
      const approved=rows.filter(r=>r.events?.attendance_approved);
      const attended=approved.filter(r=>r.status==='present').length;
      const pct=approved.length?Math.round(attended/approved.length*100):0;
      host.innerHTML=`<div class="mock-attendance-summary"><div class="mock-ring" style="--attendance:${pct*3.6}deg"><div><strong>${attended} / ${approved.length}</strong><span>Meetings<br>Attended</span></div></div><div class="mock-stat-grid"><div><strong>${approved.length}</strong><span>Meetings Held</span></div><div><strong>${attended}</strong><span>Meetings Attended</span></div></div></div><h3 class="mock-section-title">Recent Attendance</h3><div class="mock-attendance-list">${approved.slice(0,12).map(r=>`<div class="mock-attendance-item"><span>${esc(new Date(r.events.event_date).toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'}))}</span><b class="${r.status==='present'?'present':'absent'}">${r.status==='present'?'✓ Present':'✕ Absent'}</b></div>`).join('') || '<div class="empty-state">No approved attendance records yet.</div>'}</div>`;
    }catch{}
  }

  function enhanceEventsTabs(){
    const section=$('#events'); const host=$('#eventList'); if(!section||!host||$('#mockEventTabs')) return;
    const tabs=document.createElement('div'); tabs.id='mockEventTabs'; tabs.className='mock-segmented'; tabs.innerHTML='<button class="active" data-event-view="upcoming">Upcoming</button><button data-event-view="past">Past</button>';
    section.insertBefore(tabs,host);
    tabs.addEventListener('click',e=>{ const b=e.target.closest('button[data-event-view]'); if(!b)return; tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b)); host.dataset.view=b.dataset.eventView; filterEventCards(); });
  }

  function filterEventCards(){
    const host=$('#eventList'); if(!host)return;
    const view=host.dataset.view||'upcoming'; const now=Date.now();
    host.querySelectorAll('.event-card[data-event-date]').forEach(card=>{
      const t=new Date(card.dataset.eventDate).getTime();
      card.classList.toggle('hidden',Number.isFinite(t) && (view==='upcoming'?t<now:t>=now));
    });
  }

  function ensureAdminDashboard(){
    const s=activeSession(); if(s?.role!=='admin') return;
    const panel=$('#adminPanel'); if(!panel) return;
    let dash=$('#mockAdminDashboard');
    if(!dash){ dash=document.createElement('div'); dash.id='mockAdminDashboard'; dash.className='mock-admin-dashboard'; panel.prepend(dash); }
    const tiles=[['Manage Events','calendar','admin','adminEventTitle'],['Record Attendance','users','attendanceAdmin'],['Accounts & Approvals','list','admin'],['Security & Access','shield','security'],['Leaders','users','leaders'],['Duty Roster','calendar','plannerRoster'],['News Feed','news','news'],['Settings','gear','security']];
    dash.innerHTML=`<div class="mock-admin-title"><h2>Admin Centre</h2><span>${icon('gear')}</span></div><div class="mock-admin-grid">${tiles.map(([label,ico,tab,anchor])=>`<button type="button" data-mock-tab="${tab}" ${anchor?`data-mock-anchor="${anchor}"`:''}>${icon(ico)}<strong>${label}</strong></button>`).join('')}</div>`;
  }

  function restyleLeaderCards(){ document.querySelectorAll('#leaderList .leader-directory-card').forEach(card=>card.classList.add('mock-leader-row')); }
  async function restyleEventCards(){
    const cards=[...document.querySelectorAll('#eventList .event-card')];
    cards.forEach(card=>card.classList.add('mock-event-row'));
    filterEventCards();
  }
  document.addEventListener('efgc:events-rendered',restyleEventCards);

  function gotoTab(tab,anchor){
    if (!activeSession()?.uid) return;
    try { showTab(tab); } catch {}
    document.querySelectorAll('#mockBottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.mockTab===tab));
    if(anchor) setTimeout(()=>document.getElementById(anchor)?.scrollIntoView({behavior:'smooth',block:'start'}),100);
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-mock-tab]');
    if(b) gotoTab(b.dataset.mockTab,b.dataset.mockAnchor||'');
    if(e.target.closest('.userbar button')) setTimeout(syncThemeShell,250);
  });

  const previousRenderLive=window.renderLiveData;
  const previousRenderShell=window.renderShell;
  window.renderShell=function(...args){ const result=previousRenderShell.apply(this,args); syncThemeShell(); return result; };
  if(typeof previousRenderLive==='function'){
    window.renderLiveData=async function(){
      await previousRenderLive();
      ensureHomeDashboard(); ensureAdminDashboard(); enhanceEventsTabs();
      await renderAttendanceMock(); restyleLeaderCards(); await restyleEventCards(); syncThemeShell();
    };
  }

  document.addEventListener('DOMContentLoaded',()=>{
    applyBrandAssets(); ensureBottomNav(); enhanceEventsTabs(); syncThemeShell();
    setTimeout(async()=>{ applyBrandAssets(); syncThemeShell(); restyleLeaderCards(); await restyleEventCards(); },400);
  });
})();
