/** EFGC Youth V74 — isolated, functional login artwork controller. */
(() => {
  'use strict';
  window.EFGC_V74_ACTIVE = true;

  const $ = (s) => document.querySelector(s);
  const LOGIN_ART = 'assets/v74-login-poster.webp?v=74.0';
  const LOGO = 'assets/v74-efgc-logo.png?v=74.0';

  function sessionActive() {
    try {
      if (typeof session !== 'undefined' && session?.uid) return true;
    } catch (_) {}
    return document.body.classList.contains('mock-authenticated');
  }

  function forceCorrectLogos(root = document) {
    root.querySelectorAll?.('.brand-logo,.hero-logo,.official-footer-logo,.mock-welcome-logo,.birthday-logo-wrap img').forEach((img) => {
      if (!img.src.includes('v74-efgc-logo.png')) img.src = LOGO;
      img.classList.add('v74-official-logo');
      img.alt = 'Emmanuel Full Gospel Church official logo';
    });
  }

  function ensureWelcome() {
    const login = $('#login');
    const card = login?.querySelector('.login-card');
    if (!login || !card || sessionActive()) return;

    login.classList.remove('hidden');
    document.body.classList.add('v74-signed-out');
    document.body.classList.remove('v74-form-open');

    let welcome = $('#v74Welcome');
    if (!welcome) {
      welcome = document.createElement('div');
      welcome.id = 'v74Welcome';
      welcome.className = 'v74-welcome';
      welcome.innerHTML = `
        <div class="v74-poster-frame">
          <img class="v74-login-art" src="${LOGIN_ART}" alt="EFGC Youth — Build, Belong, Be a Light — Matthew 5:16">
          <button id="v74LoginButton" class="v74-art-button v74-login-button" type="button" aria-label="Login to EFGC Youth">Login</button>
          <button id="v74CreateButton" class="v74-art-button v74-create-button" type="button" aria-label="Create an EFGC Youth account">Create Account</button>
        </div>`;
      login.insertBefore(welcome, card);
      $('#v74LoginButton')?.addEventListener('click', () => openForm('signin'));
      $('#v74CreateButton')?.addEventListener('click', () => openForm('register'));
    }

    welcome.classList.remove('hidden');
    card.classList.add('mock-login-hidden');
    card.classList.remove('v74-card-visible');
    card.style.removeProperty('display');
    installBack(card);
    window.scrollTo({ top:0, behavior:'auto' });
  }

  function installBack(card) {
    card.querySelectorAll('.v74-back').forEach((el) => el.remove());
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'v74-back ghost-login';
    back.textContent = '← Back to Welcome';
    back.addEventListener('click', ensureWelcome);
    card.prepend(back);
  }

  function chooseAuthMode(mode) {
    try { if (typeof selectRole === 'function') selectRole('youth'); } catch (_) {}
    const attempt = () => {
      const target = document.querySelector(
        mode === 'register'
          ? '#noEmailModeSwitch [data-auth-mode="register"], [data-auth-mode="register"]'
          : '#noEmailModeSwitch [data-auth-mode="signin"], [data-auth-mode="signin"]'
      );
      if (target) target.click();
    };
    attempt();
    setTimeout(attempt, 100);
    setTimeout(attempt, 350);
  }

  function openForm(mode) {
    const login = $('#login');
    const card = login?.querySelector('.login-card');
    if (!login || !card) return;

    login.classList.remove('hidden');
    document.body.classList.add('v74-signed-out','v74-form-open');
    $('#v74Welcome')?.classList.add('hidden');

    card.classList.remove('mock-login-hidden','hidden');
    card.classList.add('v74-card-visible');
    card.style.setProperty('display','block','important');

    chooseAuthMode(mode);
    requestAnimationFrame(() => {
      card.scrollIntoView({ block:'start', behavior:'auto' });
      setTimeout(() => card.querySelector('input:not([type="hidden"])')?.focus({ preventScroll:true }), 40);
    });
  }

  function authenticatedState() {
    document.body.classList.remove('v74-signed-out','v74-form-open');
    $('#v74Welcome')?.classList.add('hidden');
    const card = $('#login .login-card');
    if (card) {
      card.style.removeProperty('display');
      card.classList.remove('v74-card-visible');
    }
    forceCorrectLogos();
  }

  function reconcile() {
    forceCorrectLogos();
    if (sessionActive()) authenticatedState();
    else ensureWelcome();
  }

  function wrapLogout() {
    if (typeof window.logoutUser !== 'function' || window.logoutUser.__v74Wrapped) return;
    const original = window.logoutUser;
    const wrapped = function(...args) {
      const result = original.apply(this,args);
      setTimeout(reconcile,50);
      setTimeout(reconcile,250);
      return result;
    };
    wrapped.__v74Wrapped = true;
    window.logoutUser = wrapped;
  }

  function boot() {
    wrapLogout();
    reconcile();

    const observer = new MutationObserver(() => {
      clearTimeout(observer.__timer);
      observer.__timer = setTimeout(() => {
        wrapLogout();
        forceCorrectLogos();
        if (!sessionActive() && !document.body.classList.contains('v74-form-open')) ensureWelcome();
        if (sessionActive()) authenticatedState();
      },40);
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});

    window.addEventListener('pageshow',reconcile);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();