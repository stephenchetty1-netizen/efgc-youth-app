/** EFGC Youth V74 — isolated, functional login artwork controller. */
(() => {
  'use strict';
  window.EFGC_V74_ACTIVE = true;

  const $ = (s) => document.querySelector(s);
  const LOGIN_ART = 'assets/v74-login-poster.webp?v=87.0';
  const LOGO = 'assets/v74-efgc-logo.webp?v=87.0';

  function sessionActive() {
    try {
      if (typeof session !== 'undefined' && session?.uid) return true;
    } catch (_) {}
    return document.body.classList.contains('mock-authenticated');
  }

  function forceCorrectLogos(root = document) {
    root.querySelectorAll?.('.brand-logo,.hero-logo,.official-footer-logo,.mock-welcome-logo,.birthday-logo-wrap img').forEach((img) => {
      if (!img.src.includes('v74-efgc-logo.webp')) img.src = LOGO;
      img.classList.add('v74-official-logo');
      img.alt = 'Emmanuel Full Gospel Church official logo';
    });
  }

  function syncWelcomeViewport() {
    const welcome = $('#v74Welcome');
    const frame = welcome?.querySelector('.v74-poster-frame');
    const art = welcome?.querySelector('.v74-login-art');
    const loginButton = $('#v74LoginButton');
    const createButton = $('#v74CreateButton');
    if (!welcome || !frame || !art || !loginButton || !createButton || sessionActive()) return;

    const vv = window.visualViewport;
    const width = Math.max(1, Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth || 360));
    const height = Math.max(1, Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight || 640));

    for (const [prop,value] of [
      ['position','fixed'],['left','0px'],['top','0px'],['right','auto'],['bottom','auto'],
      ['width',width+'px'],['height',height+'px'],['min-height','0px'],['max-height','none'],
      ['overflow','hidden'],['z-index','30'],['pointer-events','auto']
    ]) welcome.style.setProperty(prop,value,'important');

    for (const [prop,value] of [
      ['position','absolute'],['inset','0px'],['width','100%'],['height','100%'],
      ['max-width','none'],['aspect-ratio','auto'],['overflow','hidden'],['pointer-events','auto']
    ]) frame.style.setProperty(prop,value,'important');

    for (const [prop,value] of [
      ['width','100%'],['height','100%'],['object-fit','contain'],['object-position','center center'],
      ['pointer-events','none']
    ]) art.style.setProperty(prop,value,'important');

    const placeHitbox = (button, rect) => {
      const iw = art.naturalWidth || 1080;
      const ih = art.naturalHeight || 1920;
      const scale = Math.min(width / iw, height / ih);
      const renderedW = iw * scale;
      const renderedH = ih * scale;
      const offsetX = (width - renderedW) / 2;
      const offsetY = (height - renderedH) / 2;

      const left = offsetX + rect.x * iw * scale;
      const top = offsetY + rect.y * ih * scale;
      const boxWidth = rect.w * iw * scale;
      const boxHeight = rect.h * ih * scale;

      for (const [prop,value] of [
        ['position','absolute'],
        ['left',Math.round(left)+'px'],
        ['top',Math.round(top)+'px'],
        ['right','auto'],
        ['bottom','auto'],
        ['width',Math.round(boxWidth)+'px'],
        ['height',Math.round(boxHeight)+'px'],
        ['display','block'],
        ['z-index','80'],
        ['pointer-events','auto'],
        ['touch-action','manipulation']
      ]) button.style.setProperty(prop,value,'important');
    };

    // Match the uploaded 864 x 1536 poster's buttons, including letterboxing.
    placeHitbox(loginButton,  { x:0.195, y:0.753, w:0.610, h:0.048 });
    placeHitbox(createButton, { x:0.195, y:0.804, w:0.610, h:0.048 });
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
      $('#v74LoginButton')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openForm('signin');
      });
      $('#v74CreateButton')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openForm('register');
      });
    }

    welcome.classList.remove('hidden');
    welcome.style.removeProperty('display');
    welcome.style.removeProperty('pointer-events');
    if (welcome.querySelector('.v74-login-art')?.complete) syncWelcomeViewport();
    else welcome.querySelector('.v74-login-art')?.addEventListener('load',syncWelcomeViewport,{once:true});
    requestAnimationFrame(syncWelcomeViewport);
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
    const welcome = $('#v74Welcome');
    if (welcome) {
      welcome.classList.add('hidden');
      welcome.style.setProperty('display','none','important');
      welcome.style.setProperty('pointer-events','none','important');
    }

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
    const welcome = $('#v74Welcome');
    if (welcome) {
      welcome.classList.add('hidden');
      welcome.style.setProperty('display','none','important');
      welcome.style.setProperty('pointer-events','none','important');
    }
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

    document.addEventListener('click',(event) => {
      const button = event.target.closest?.('#v74LoginButton,#v74CreateButton');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      openForm(button.id === 'v74CreateButton' ? 'register' : 'signin');
    },true);

    window.addEventListener('pageshow',reconcile);
    window.addEventListener('resize',syncWelcomeViewport,{passive:true});
    window.visualViewport?.addEventListener('resize',syncWelcomeViewport,{passive:true});
    window.visualViewport?.addEventListener('scroll',syncWelcomeViewport,{passive:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();