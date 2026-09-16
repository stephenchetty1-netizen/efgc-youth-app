/** EFGC Youth v46 — image quality, Gen Z hero, navigation and media polish. */
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const HERO = 'assets/efgc-home-hero.webp?v=46';
  const LOGO = 'assets/efgc-logo-reference.webp?v=46';

  function currentSession(){ try { return session || null; } catch { return null; } }

  function upgradeHero(){
    const hero=$('.hero'); if(!hero) return;
    hero.classList.add('v46-hero');
    hero.style.backgroundImage=`url("${HERO}")`;
    const copy=$('.hero-copy',hero); if(copy){
      copy.innerHTML='<small>EMMANUEL FULL GOSPEL CHURCH • EFGC YOUTH</small><h1>YOU ARE<br>A LIGHT!</h1><p>Matthew 5:16 • Build • Belong • Be a Light</p>';
    }
    const logo=$('.hero-logo',hero); if(logo){ logo.src=LOGO; logo.loading='eager'; logo.decoding='async'; logo.fetchPriority='high'; }
  }

  function upgradeBrand(){
    $$('.brand-logo,.official-footer-logo').forEach((img,i)=>{
      img.src=LOGO; img.decoding='async'; img.loading=i===0?'eager':'lazy';
      if(i===0) img.fetchPriority='high';
    });
  }

  function tuneWelcome(){
    const welcome=$('#mockWelcome'); if(!welcome) return;
    const logo=$('.mock-welcome-logo',welcome); if(logo){ logo.src=LOGO; logo.decoding='async'; logo.loading='eager'; logo.fetchPriority='high'; }
    const word=$('.mock-youth-word',welcome); if(word) word.textContent='YOUTH';
    const generation=$('.mock-generation',welcome); if(generation) generation.textContent='A GENERATION FOR HIS GLORY';
  }

  function makeImageSmooth(img){
    if(!img || img.dataset.v46Quality==='1') return;
    img.dataset.v46Quality='1';
    img.classList.add('v46-img');
    if(!img.hasAttribute('loading') && !img.classList.contains('brand-logo') && !img.classList.contains('hero-logo') && !img.classList.contains('mock-welcome-logo')) img.loading='lazy';
    img.decoding='async';
    const done=()=>{
      img.classList.add('v46-loaded');
      img.closest('.v46-image-shell')?.classList.add('v46-ready');
    };
    if(img.complete && img.naturalWidth>0) done(); else img.addEventListener('load',done,{once:true});
    img.addEventListener('error',()=>img.classList.add('v46-loaded'),{once:true});
  }

  function improveImages(root=document){
    $$('img',root).forEach(img=>{
      const parent=img.parentElement;
      if(parent && (img.classList.contains('event-cover') || img.classList.contains('profile-photo'))) parent.classList.add('v46-image-shell');
      makeImageSmooth(img);
    });
  }

  function addHomeWelcome(){
    const home=$('#home'); const s=currentSession(); if(!home||!s?.uid) return;
    let bar=$('#v46WelcomeBar');
    if(!bar){
      bar=document.createElement('section'); bar.id='v46WelcomeBar'; bar.className='v46-welcome-bar';
      home.insertBefore(bar,$('#mockHomeDashboard')||home.firstChild);
    }
    const first=(s.name||'EFGC Youth').trim().split(/\s+/)[0];
    const role=s.role==='admin'?'Main Youth Leader • Admin':s.role==='leader'?'Youth Leader':'EFGC Youth';
    bar.innerHTML=`<div><span class="v46-eyebrow">BUILD • BELONG • BE A LIGHT</span><h2>Shalom, ${esc(first)} 👋</h2><p>${esc(role)} • Passing on the Baton</p></div><span class="v46-live-dot"><i></i>LIVE</span>`;
  }

  function labelDashboardTiles(){
    $$('.mock-dashboard-tile').forEach((tile,index)=>{
      tile.style.setProperty('--v46-delay',`${Math.min(index*30,210)}ms`);
      tile.classList.add('v46-enter');
    });
  }

  function upgradeEventCards(){
    $$('#eventList .event-card').forEach(card=>{
      const img=$('.event-cover',card);
      if(img){ img.loading='lazy'; img.decoding='async'; img.classList.add('v46-event-photo'); }
      const body=$('.event-card-body',card); if(body && !$('.v46-event-action',body)){
        const row=document.createElement('div'); row.className='v46-event-action'; row.innerHTML='<span>EFGC YOUTH</span><span>✦ YOU ARE A LIGHT</span>';
        body.appendChild(row);
      }
    });
  }

  function upgradeLeaderCards(){
    $$('#leaderList .leader-directory-card').forEach(card=>{
      card.classList.add('v46-leader-card');
      const img=$('.profile-photo',card); if(img){img.loading='lazy';img.decoding='async'}
    });
    const own=$('#profileCard .leader-self-card'); if(own) own.classList.add('v46-self-card');
  }

  function upgradePlanner(){
    $$('#plannerRosterHost .v44-roster-row').forEach(row=>{
      const week=$('.v44-week strong',row)?.textContent||'';
      row.dataset.week=week;
    });
  }

  function addGenZAccent(){
    if($('#v46Accent')) return;
    const accent=document.createElement('div'); accent.id='v46Accent'; accent.className='v46-accent'; accent.setAttribute('aria-hidden','true');
    accent.innerHTML='<i></i><i></i><i></i>';
    document.body.appendChild(accent);
  }

  function pulseCurrentNav(){
    $$('#mockBottomNav button').forEach(btn=>btn.classList.toggle('v46-current',btn.classList.contains('active')));
  }

  function refreshV46(root=document){
    upgradeBrand(); upgradeHero(); tuneWelcome(); addHomeWelcome(); labelDashboardTiles(); upgradeEventCards(); upgradeLeaderCards(); upgradePlanner(); improveImages(root); addGenZAccent(); pulseCurrentNav();
  }

  const previousLive=window.renderLiveData;
  if(typeof previousLive==='function'){
    window.renderLiveData=async function(){ await previousLive(); refreshV46(); };
  }

  const previousPlanner=window.renderPlannerRoster;
  if(typeof previousPlanner==='function'){
    window.renderPlannerRoster=async function(){ await previousPlanner(); refreshV46($('#plannerRosterHost')||document); };
  }

  const observer=new MutationObserver(mutations=>{
    let should=false;
    for(const m of mutations){ if(m.addedNodes?.length){should=true;break;} }
    if(should) requestAnimationFrame(()=>refreshV46());
  });

  document.addEventListener('DOMContentLoaded',()=>{
    refreshV46();
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(refreshV46,350); setTimeout(refreshV46,1100);
  });
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-tab],[data-mock-tab]')) setTimeout(()=>{refreshV46();pulseCurrentNav();},40);
  });
})();
