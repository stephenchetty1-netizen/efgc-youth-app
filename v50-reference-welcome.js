/** V50 — apply the user-approved welcome composition while preserving auth flows. */
(() => {
  const $ = (s) => document.querySelector(s);
  const logo = 'assets/efgc-logo-reference.webp?v=50.0';

  function openLogin(role='youth'){
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if(!welcome || !card) return;
    welcome.classList.add('hidden');
    card.classList.remove('mock-login-hidden');
    try { selectRole(role); } catch {}
    card.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }

  function applyReferenceWelcome(){
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if(!welcome || !card || welcome.dataset.v50==='1') return;
    welcome.dataset.v50='1';
    welcome.className = 'v50-reference-welcome';
    welcome.innerHTML = `
      <div class="v50-welcome-inner">
        <div class="v50-logo-shell"><img class="v50-logo" src="${logo}" alt="Emmanuel Full Gospel Church official logo" decoding="async" fetchpriority="high"></div>
        <h1 class="v50-youth">YOUTH.</h1>
        <p class="v50-tagline">BUILD • BELONG • BE A LIGHT</p>
        <div class="v50-spacer" aria-hidden="true"></div>
        <p class="v50-statement">Your faith.<br>Your people.<br>Your <em>purpose.</em></p>
        <div class="v50-actions">
          <button id="v50LoginButton" class="v50-login" type="button">Login</button>
          <button id="v50CreateButton" class="v50-create" type="button">Create Account</button>
        </div>
        <p class="v50-generation">A GENERATION FOR HIS GLORY</p>
      </div>`;
    $('#v50LoginButton')?.addEventListener('click',()=>openLogin('youth'));
    $('#v50CreateButton')?.addEventListener('click',()=>openLogin('youth'));
    if(location.hash.includes('access_token') || /type=recovery|code=/.test(location.search)) openLogin('admin');
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(applyReferenceWelcome,0));
  setTimeout(applyReferenceWelcome,250);
  setTimeout(applyReferenceWelcome,900);
})();
