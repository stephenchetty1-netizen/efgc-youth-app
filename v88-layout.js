/** EFGC Youth V88 — responsive navigation and coherent role-aware visual shell. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = () => { try { return session?.uid ? session : null; } catch { return null; } };
  // Android Chrome may report a 980px desktop viewport on a real phone.
  // Select the handset shell from device capabilities, not viewport alone.
  function syncHandsetLayout() {
    const ua = navigator.userAgent || '';
    const edge = Math.min(screen.width || 9999, screen.height || 9999);
    const coarse = Boolean(navigator.maxTouchPoints > 0 ||
      window.matchMedia?.('(pointer:coarse)')?.matches);
    const mobile = navigator.userAgentData?.mobile === true ||
      /Android.*Mobile|iPhone|iPod|Mobile Safari/i.test(ua) ||
      (/Android/i.test(ua) && coarse && edge <= 1200) ||
      (coarse && edge <= 600) ||
      (coarse && edge <= 1200 && screen.height >= screen.width * 1.35 &&
        (window.devicePixelRatio || 1) >= 1.5);
    document.body.classList.toggle('v92-phone', mobile);
    return mobile;
  }
  let currentTab = 'home';
  let lastTrigger = null;
  const path = {
    home:'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-7h6v7',
    events:'M5 4h14v17H5zM8 2v4M16 2v4M5 9h14M8 13h3M13 13h3M8 17h3',
    ministry:'M12 20s-8-4.9-8-10a4.4 4.4 0 0 1 8-2.6A4.4 4.4 0 0 1 20 10c0 5.1-8 10-8 10Z',
    news:'M5 3h13v16H5zM8 7h7M8 11h7M8 15h4M18 7h2v14H6',
    more:'M5 7h14M5 12h14M5 17h14',
    account:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4.7 3.2-7 8-7s8 2.3 8 7',
    shield:'M12 2 20 6v5c0 5-3.2 8.4-8 11-4.8-2.6-8-6-8-11V6Z',
    exit:'M13 4h7v16h-7M10 7l5 5-5 5M15 12H4'
  };
  const icon = name => '<svg class="v88-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path[name]+'"></path></svg>';
  function ensure() {
    if (!$('#v88MobileNav')) {
      const nav=document.createElement('nav');
      nav.id='v88MobileNav';
      nav.className='v88-mobile-nav hidden';
      nav.setAttribute('aria-label','Primary app navigation');
      nav.innerHTML=[
        ['home','Home'],['events','Events'],['ministry','My Journey'],['news','News']
      ].map(([key,label]) => '<button type="button" data-v88-route="'+key+'">'+icon(key)+'<span>'+label+'</span></button>').join('')+
        '<button type="button" data-v88-more aria-expanded="false" aria-controls="v88MoreBackdrop">'+icon('more')+'<span>More</span></button>';
      document.body.appendChild(nav);
    }
    if (!$('#v88MoreBackdrop')) {
      const root=document.createElement('div');
      root.id='v88MoreBackdrop';
      root.className='v88-more-backdrop hidden';
      root.innerHTML='<div class="v88-more-sheet" role="dialog" aria-modal="true" aria-labelledby="v88MoreTitle">'+
        '<div class="v88-sheet-grip" aria-hidden="true"></div><div class="v88-sheet-top">'+
        '<div><small>EFGC YOUTH</small><h2 id="v88MoreTitle">Explore the app</h2></div>'+
        '<button type="button" id="v88MoreClose" aria-label="Close menu">✕</button></div>'+
        '<div id="v88MoreIdentity" class="v88-more-identity"></div><div id="v88MoreLinks" class="v88-more-links"></div>'+
        '<div class="v88-more-bottom"><button type="button" id="v88MoreLogout">'+icon('exit')+'<span>Sign out</span></button></div></div>';
      document.body.appendChild(root);
    }
    if (!$('#v88RoleBadge')) {
      const badge=document.createElement('span');
      badge.id='v88RoleBadge';badge.className='v88-role-badge hidden';
      $('.brand')?.appendChild(badge);
    }
  }
  function closeMore(returnFocus=true) {
    const sheet=$('#v88MoreBackdrop');
    if (!sheet || sheet.classList.contains('hidden')) return;
    sheet.classList.add('hidden');
    $('#v88MobileNav [data-v88-more]')?.setAttribute('aria-expanded','false');
    document.body.classList.remove('v88-modal-open');
    setActive(currentTab);
    if (returnFocus) lastTrigger?.focus?.();
  }
  // Never derive labels from badge counts: the hidden planner menu contains "0".
  const routeLabels = Object.freeze({
    scripture:'Daily Scripture', leaders:'Leaders', profile:'Profile',
    security:'Security', plannerRoster:'Planner & Roster',
    attendanceAdmin:'Attendance Register', admin:'Admin Centre',
    mine:'My Attendance', birthdayStudio:'Birthday Studio'
  });
  function labelFor(button) {
    if (button.id==='v87MinistryMenu') return state()?.role==='admin'?'Ministry Centre':
      state()?.role==='leader'?'Leader Hub':'My Journey';
    return routeLabels[button.dataset.tab] ||
      (button.textContent||'').replace(/^[^a-zA-Z]*/,'').trim().replace(/\s*\d+$/,'').replace(/\s+/g,' ') ||
      button.dataset.tab;
  }
  function fillMore() {
    const s=state(), list=$('#v88MoreLinks');
    if(!s || !list) return;
    const role=s.role==='admin'?'ADMIN':s.role==='leader'&&s.approval_status==='approved'?'LEADER':'YOUTH';
    $('#v88MoreIdentity').innerHTML='<span class="v88-person-mark">'+icon('account')+'</span>'+
      '<span><b>'+esc(s.name||'EFGC member')+'</b><small>'+role+' ACCOUNT</small></span>';
    const routeList=[...document.querySelectorAll('#mainMenu button[data-tab]')]
      .filter(b=>!b.classList.contains('hidden')&&
        !['home','events','ministry','news'].includes(b.dataset.tab));
    list.innerHTML=routeList.map(b=>'<button type="button" data-v88-route="'+esc(b.dataset.tab)+'">'+
      '<span class="v88-more-symbol" aria-hidden="true">'+
      (b.querySelector('.nav-glyph')?.textContent||'✦')+'</span>'+
      '<span>'+esc(labelFor(b))+'</span><span class="v88-more-arrow" aria-hidden="true">→</span></button>').join('');
    // Birthday Studio uses an Admin-only menu handler without data-tab. Expose it
    // explicitly instead of dropping it from the bottom sheet.
    const birthday=$('#birthdayStudioMenu');
    if(s.role==='admin' && birthday && !birthday.classList.contains('hidden')){
      list.insertAdjacentHTML('beforeend',
        '<button type="button" data-v88-route="birthdayStudio"><span class="v88-more-symbol" aria-hidden="true">✦</span>'+
        '<span>Birthday Studio</span><span class="v88-more-arrow" aria-hidden="true">→</span></button>');
    }
  }
  function openMore(button) {
    if(!state())return;
    ensure();
    fillMore();
    lastTrigger=button;
    $('#v88MoreBackdrop')?.classList.remove('hidden');
    $('#v88MobileNav [data-v88-more]')?.setAttribute('aria-expanded','true');
    document.body.classList.add('v88-modal-open');
    $('#v88MoreClose')?.focus();
    setActive('more');
  }
  function setActive(tab) {
    if(tab && tab!=='more') currentTab=tab;
    const sheetIsOpen=!$('#v88MoreBackdrop')?.classList.contains('hidden');
    const activeRoot=['home','events','ministry','news'].includes(currentTab)?currentTab:'more';
    document.querySelectorAll('#v88MobileNav button').forEach(button=>{
      const selected=button.dataset.v88Route === (sheetIsOpen?'none':activeRoot) ||
        (button.hasAttribute('data-v88-more')&&(sheetIsOpen||activeRoot==='more'));
      button.classList.toggle('active',selected);
      if (selected) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
  }
  function sync() {
    syncHandsetLayout();
    ensure();
    const s=state();
    const active=Boolean(s);
    document.body.classList.toggle('v88-ready',active);
    $('#v88MobileNav')?.classList.toggle('hidden',!active);
    const badge=$('#v88RoleBadge');
    if(badge) {
      badge.textContent=s?.role==='admin'?'ADMIN':s?.role==='leader'&&s.approval_status==='approved'?'LEADER':'YOUTH';
      badge.classList.toggle('hidden',!active);
    }
    const journey=$('#v88MobileNav [data-v88-route="ministry"] span');
    if(journey)journey.textContent=s?.role==='admin'?'Ministry':s?.role==='leader'&&s.approval_status==='approved'?'Leader Hub':'Journey';
    if(!active)closeMore(false);
    if(active) {
      const visible=[...document.querySelectorAll('main > section.tab')].find(el=>!el.classList.contains('hidden')&&el.id!=='login');
      setActive(visible?.id||currentTab);
    }
  }
  function route(tab) {
    const s=state();
    if(!s)return;
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(tab))return;
    const source=tab==='birthdayStudio' ? $('#birthdayStudioMenu') :
      $('#mainMenu button[data-tab="'+tab+'"]');
    if (!source || source.classList.contains('hidden'))return;
    if (tab==='birthdayStudio' && s.role!=='admin')return;
    closeMore(false);
    source.click();
    setActive(tab==='birthdayStudio'?'admin':tab);
    // The original menu click already routes through the existing EFGC handlers.
    // Do not duplicate prayer requests or Admin fetches by rendering each screen twice.
    if(tab==='plannerRoster')window.renderPlannerRoster?.();
    if(tab==='attendanceAdmin')window.renderAttendanceAdmin?.();
    window.scrollTo?.({top:0,behavior:'auto'});
  }
  document.addEventListener('click',e=>{
    const routeButton=e.target.closest?.('#v88MobileNav [data-v88-route], #v88MoreBackdrop [data-v88-route]');
    if(routeButton) {route(routeButton.dataset.v88Route);return;}
    const more=e.target.closest?.('#v88MobileNav [data-v88-more]');
    if(more){openMore(more);return;}
    if(e.target.closest?.('#v88MoreClose')){closeMore();return;}
    if(e.target.id==='v88MoreBackdrop'){closeMore();return;}
    if(e.target.closest?.('#v88MoreLogout')){
      closeMore(false);
      $('.userbar button')?.click();
      return;
    }
    const nav=e.target.closest?.('#mainMenu [data-tab], [data-v87-go], [data-mock-tab]');
    if(nav) {
      const tab=nav.dataset.tab||nav.dataset.v87Go||nav.dataset.mockTab;
      if(tab)setActive(tab);
      const target=nav.dataset.v94Target;
      if(target && state()?.role==='admin' && /^admin(?:EventTitle|NewsContent)$/.test(target)){
        setTimeout(()=>{
          const field=document.getElementById(target);
          if(field && !document.getElementById('admin')?.classList.contains('hidden')){
            field.scrollIntoView({block:'center',behavior:'smooth'});
            field.focus({preventScroll:true});
          }
        },150);
      }
    }
  });
  document.addEventListener('keydown',e=>{
    const sheet=$('#v88MoreBackdrop');
    if(!sheet || sheet.classList.contains('hidden'))return;
    if(e.key==='Escape'){e.preventDefault();closeMore();return;}
    if(e.key!=='Tab')return;
    const controls=[...sheet.querySelectorAll('button:not([disabled]),a[href]')];
    if(!controls.length)return;
    if(e.shiftKey && document.activeElement===controls[0]){e.preventDefault();controls[controls.length-1].focus();}
    if(!e.shiftKey && document.activeElement===controls[controls.length-1]){e.preventDefault();controls[0].focus();}
  });
  const oldShow=window.showTab;
  if(typeof oldShow==='function')window.showTab=function(id,...args){
    const result=oldShow.call(this,id,...args);
    setActive(id);
    return result;
  };
  const oldShell=window.renderShell;
  if(typeof oldShell==='function')window.renderShell=function(...args){
    const result=oldShell.apply(this,args);
    sync();
    return result;
  };
  const oldLive=window.renderLiveData;
  if(typeof oldLive==='function')window.renderLiveData=async function(...args){
    const result=await oldLive.apply(this,args);
    sync();
    return result;
  };
  const init=()=>sync();
  window.addEventListener('resize',syncHandsetLayout,{passive:true});
  window.addEventListener('orientationchange',syncHandsetLayout,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  window.EFGCV88Layout={sync,route,openMore,closeMore,syncHandsetLayout};
})();
