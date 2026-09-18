/** EFGC Youth V73 — isolated visual layer. Keeps stable app logic untouched. */
(() => {
  'use strict';
  window.EFGC_V73_ACTIVE = true;

  const PARTS = [
    'assets-src/v73/poster.part00',
    'assets-src/v73/poster.part01',
    'assets-src/v73/poster.part02',
    'assets-src/v73/poster.part03',
    'assets-src/v73/poster.part04'
  ];
  const state = { poster:'', logo:'', ready:false, applying:false };
  const $ = (s) => document.querySelector(s);

  function isSignedIn() {
    if (document.body.classList.contains('mock-authenticated')) return true;
    try { if (typeof session !== 'undefined' && session && session.uid) return true; } catch {}
    const user = $('#currentUser')?.textContent || '';
    return Boolean(user && !/not signed in/i.test(user));
  }

  async function loadPosterData() {
    const texts = await Promise.all(PARTS.map(async (path) => {
      const res = await fetch(path + '?v=73.0', { cache:'no-store' });
      if (!res.ok) throw new Error('Missing V73 poster asset');
      return (await res.text()).trim();
    }));
    const base64 = texts.join('').replace(/\s+/g,'');
    if (!base64.startsWith('UklG') || base64.length < 50000) throw new Error('Invalid V73 poster source');
    const data = 'data:image/webp;base64,' + base64;
    const image = await new Promise((resolve,reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Poster image could not decode'));
      img.src = data;
    });
    state.poster = data;
    state.logo = makeLogo(image);
    state.ready = true;
    window.EFGC_LOGIN_POSTER = state.poster;
    window.EFGC_BRAND_LOGO = state.logo;
  }

  function makeLogo(image) {
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const w = image.naturalWidth || image.width;
    const h = image.naturalHeight || image.height;

    // Crop the actual EFGC emblem from the supplied 9:16 poster by proportion.
    const sx = w * 0.225;
    const sy = h * 0.004;
    const sw = w * 0.55;
    const sh = h * 0.31;

    ctx.clearRect(0,0,640,640);
    ctx.save();
    ctx.beginPath();
    ctx.arc(320,320,312,0,Math.PI*2);
    ctx.clip();
    ctx.drawImage(image,sx,sy,sw,sh,0,0,640,640);
    ctx.restore();
    return canvas.toDataURL('image/webp',0.94);
  }

  function applyLogo(root=document) {
    if (!state.logo || state.applying) return;
    state.applying = true;
    try {
      root.querySelectorAll?.('.brand-logo,.hero-logo,.official-footer-logo,.mock-welcome-logo,.birthday-logo-wrap img').forEach((img) => {
        if (img.src !== state.logo) img.src = state.logo;
        img.classList.add('v73-official-logo');
        img.alt = 'Emmanuel Full Gospel Church official logo';
      });
      root.querySelectorAll?.('img[src*="efgc-logo"]').forEach((img) => {
        if (!img.classList.contains('scripture-theme-photo')) {
          img.src = state.logo;
          img.classList.add('v73-official-logo');
        }
      });
    } finally {
      state.applying = false;
    }
  }

  function showWelcome() {
    if (!state.ready || isSignedIn()) return;
    const login = $('#login');
    const card = login?.querySelector('.login-card');
    if (!login || !card) return;

    document.body.classList.add('v73-welcome-active');
    document.body.classList.remove('v73-form-open');

    let welcome = $('#mockWelcome');
    if (!welcome) {
      welcome = document.createElement('div');
      welcome.id = 'mockWelcome';
      login.insertBefore(welcome,card);
    }

    welcome.className = 'v73-welcome';
    welcome.innerHTML =
      '<div class="v73-poster" role="img" aria-label="EFGC Youth — Build, Belong, Be a Light — Matthew 5:16">' +
        '<button type="button" id="v73Login" class="v73-hotspot v73-login" aria-label="Login to EFGC Youth">Login</button>' +
        '<button type="button" id="v73Create" class="v73-hotspot v73-create" aria-label="Create an EFGC Youth account">Create Account</button>' +
      '</div>';

    const poster = welcome.querySelector('.v73-poster');
    poster.style.backgroundImage = 'url("' + state.poster + '")';
    welcome.classList.remove('hidden');

    card.classList.add('mock-login-card','mock-login-hidden','v73-login-card');
    installBackButton(card);

    $('#v73Login')?.addEventListener('click',() => openForm('signin'));
    $('#v73Create')?.addEventListener('click',() => openForm('register'));
    window.scrollTo({top:0,behavior:'auto'});
  }

  function installBackButton(card) {
    card.querySelectorAll('.v73-back').forEach((b) => b.remove());
    const back = document.createElement('button');
    back.type='button';
    back.className='v73-back ghost-login';
    back.textContent='← Back to Welcome';
    back.addEventListener('click',showWelcome);
    card.prepend(back);
  }

  function openForm(mode) {
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if (!card) return;
    document.body.classList.add('v73-welcome-active','v73-form-open');
    welcome?.classList.add('hidden');
    card.classList.remove('mock-login-hidden');
    try { if (typeof selectRole === 'function') selectRole('youth'); } catch {}
    if (mode === 'register') {
      setTimeout(() => {
        document.querySelector('#noEmailModeSwitch [data-auth-mode="register"]')?.click();
        document.querySelector('[data-auth-mode="register"]')?.click();
      },50);
    }
    requestAnimationFrame(() => {
      card.scrollIntoView({block:'start',behavior:'auto'});
      card.querySelector('input:not([type="hidden"])')?.focus({preventScroll:true});
    });
  }

  function restoreSignedInUi() {
    document.body.classList.remove('v73-welcome-active','v73-form-open');
    $('#mockWelcome')?.classList.add('hidden');
    applyLogo();
  }

  function patchScriptureLogo() {
    // Scripture generator reads this at render time after the tiny V73 patch.
    window.EFGC_BRAND_LOGO = state.logo || window.EFGC_BRAND_LOGO || '';
  }

  async function boot() {
    try {
      await loadPosterData();
      applyLogo();
      patchScriptureLogo();

      if (isSignedIn()) restoreSignedInUi();
      else showWelcome();

      const observer = new MutationObserver(() => {
        if (state.applying) return;
        applyLogo();
        if (isSignedIn()) restoreSignedInUi();
      });
      observer.observe(document.documentElement,{subtree:true,childList:true});

      window.addEventListener('pageshow',() => {
        applyLogo();
        if (isSignedIn()) restoreSignedInUi();
        else showWelcome();
      });
    } catch (err) {
      console.error('EFGC V73 visual layer',err);
      // Fail safely: leave the stable V71 UI in place.
      document.body.classList.remove('v73-welcome-active','v73-form-open');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();