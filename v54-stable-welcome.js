/** V72 — exact supplied EFGC Youth login poster + inserted-picture logo enforcement. */
(() => {
  const $ = (s) => document.querySelector(s);
  const OFFICIAL_LOGO = 'assets/v72-efgc-logo.webp?v=72.0';

  function currentSession() {
    try { return typeof session !== 'undefined' ? session : null; }
    catch { return null; }
  }

  function fixBrandLogos() {
    document.querySelectorAll('.brand-logo,.hero-logo,.official-footer-logo').forEach((img) => {
      if (img.getAttribute('src') !== OFFICIAL_LOGO) img.setAttribute('src', OFFICIAL_LOGO);
      img.classList.remove('reference-logo');
      img.classList.add('official-logo');
      img.style.objectPosition = 'center center';
    });
  }

  function openLogin(role = 'youth', mode = 'signin') {
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if (!card) return;
    welcome?.classList.add('hidden');
    card.classList.remove('mock-login-hidden');
    try { selectRole(role); } catch {}
    if (mode === 'register') {
      setTimeout(() => document.querySelector('#noEmailModeSwitch [data-auth-mode="register"]')?.click(), 20);
    }
    requestAnimationFrame(() => card.scrollIntoView({ block:'start', behavior:'auto' }));
  }

  function showWelcome() {
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if (!welcome || !card) return;
    card.classList.add('mock-login-hidden');
    welcome.classList.remove('hidden');
    window.scrollTo({ top:0, behavior:'auto' });
  }

  function buildWelcome() {
    fixBrandLogos();
    const login = $('#login');
    const card = $('#login .login-card');
    if (!login || !card) return false;

    let welcome = $('#mockWelcome');
    if (!welcome) {
      welcome = document.createElement('div');
      welcome.id = 'mockWelcome';
      login.insertBefore(welcome, card);
    }

    welcome.className = 'v72-welcome';
    welcome.dataset.v72 = '1';
    welcome.innerHTML = `
      <div class="v72-poster" role="img" aria-label="EFGC Youth — Build, Belong, Be a Light — Matthew 5:16">
        <button id="v72Login" type="button" class="v72-hotspot v72-login-hotspot" aria-label="Login to EFGC Youth">Login</button>
        <button id="v72Create" type="button" class="v72-hotspot v72-create-hotspot" aria-label="Create an EFGC Youth account">Create Account</button>
      </div>`;

    card.classList.add('mock-login-card','mock-login-hidden');
    card.querySelectorAll('.v49-back,.v57-back,.v72-back').forEach((el) => el.remove());

    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'v72-back ghost-login';
    back.textContent = '← Back to Welcome';
    back.addEventListener('click', showWelcome);
    card.prepend(back);

    $('#v72Login')?.addEventListener('click', () => openLogin('youth','signin'));
    $('#v72Create')?.addEventListener('click', () => openLogin('youth','register'));

    const recovery = location.hash.includes('access_token') || /type=recovery|code=/.test(location.search);
    const signedIn = Boolean(currentSession()?.uid);
    if (recovery) openLogin('admin','signin');
    else if (!signedIn) {
      login.classList.remove('hidden');
      welcome.classList.remove('hidden');
      card.classList.add('mock-login-hidden');
    }
    return true;
  }

  function boot() {
    let attempts = 0;
    const run = () => {
      attempts++;
      const ok = buildWelcome();
      if (!ok && attempts < 24) setTimeout(run,100);
    };
    run();
  }

  const logoObserver = new MutationObserver(() => fixBrandLogos());
  logoObserver.observe(document.documentElement,{
    subtree:true,
    childList:true,
    attributes:true,
    attributeFilter:['src']
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.addEventListener('pageshow',() => setTimeout(buildWelcome,0));
  setTimeout(buildWelcome,250);
  setTimeout(buildWelcome,1000);
})();

/** V61 — automated EFGC birthday wish poster enhancer for News Feed. */
(() => {
  const LOGO = 'assets/v72-efgc-logo.webp?v=72.0';
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

  function installBirthdayStyles() {
    if (document.getElementById('efgcBirthdayPosterStyles')) return;
    const style = document.createElement('style');
    style.id = 'efgcBirthdayPosterStyles';
    style.textContent = `
      .birthday-poster-card{position:relative;overflow:hidden;padding:0!important;border:1px solid rgba(224,183,70,.7)!important;background:linear-gradient(145deg,#061b3a 0%,#0b5fa9 52%,#d19a31 150%)!important;color:#fff!important;box-shadow:0 18px 42px rgba(0,31,70,.28)!important;min-height:390px;isolation:isolate}
      .birthday-poster-card::before{content:'';position:absolute;inset:-25%;z-index:-1;background:radial-gradient(circle at 20% 18%,rgba(255,225,125,.28),transparent 27%),radial-gradient(circle at 82% 15%,rgba(255,255,255,.16),transparent 24%),radial-gradient(circle at 78% 85%,rgba(255,215,90,.18),transparent 28%);transform:rotate(-8deg)}
      .birthday-poster-card::after{content:'✦  ✧  ✦  ✧  ✦';position:absolute;left:0;right:0;bottom:18px;text-align:center;color:#f7d56d;font-size:18px;letter-spacing:12px;opacity:.8}
      .birthday-poster-inner{display:flex;min-height:390px;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:34px 24px 58px;position:relative}
      .birthday-logo-wrap{width:86px;height:86px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.96);border:3px solid #e4bc50;box-shadow:0 10px 30px rgba(0,0,0,.24);margin-bottom:18px}
      .birthday-logo-wrap img{width:76px;height:76px;object-fit:contain}
      .birthday-eyebrow{font-size:11px;font-weight:900;letter-spacing:2.6px;color:#f7d56d;margin-bottom:9px}
      .birthday-poster-card h3{margin:0!important;font-size:clamp(34px,8vw,54px)!important;line-height:.96!important;color:#fff!important;text-shadow:0 3px 18px rgba(0,20,55,.45)}
      .birthday-name{display:block;margin-top:8px;font-size:clamp(24px,6vw,38px);font-weight:900;color:#ffe58d;line-height:1.05}
      .birthday-blessing{max-width:680px;margin:20px auto 0!important;color:#f5f9ff!important;font-size:15px;line-height:1.65}
      .birthday-signoff{margin-top:16px;font-size:13px;font-weight:800;letter-spacing:.4px;color:#fff}
      .birthday-date{margin-top:10px;color:#cfe5fb!important;font-size:11px!important}
      @media(max-width:600px){.birthday-poster-card{min-height:360px}.birthday-poster-inner{min-height:360px;padding:28px 18px 54px}.birthday-logo-wrap{width:78px;height:78px}.birthday-logo-wrap img{width:68px;height:68px}.birthday-blessing{font-size:14px}}
    `;
    document.head.appendChild(style);
  }

  function enhanceBirthdayCard(card) {
    if (!card || card.dataset.birthdayEnhanced === '1') return;
    const paragraph = card.querySelector('p');
    if (!paragraph) return;
    const fullMessage = paragraph.textContent.trim();
    const match = fullMessage.match(/^Happy Birthday,\s+(.+?)!\s*(.*)$/i);
    if (!match) return;

    const memberName = match[1].trim();
    const blessing = (match[2] || '').replace(/\s*With love from EFGC Youth\.?\s*$/i, '').trim();
    const dateText = card.querySelector('small')?.textContent?.trim() || '';
    card.dataset.birthdayEnhanced = '1';
    card.classList.add('birthday-poster-card');
    card.innerHTML = `
      <div class="birthday-poster-inner" role="group" aria-label="Happy birthday ${escapeHtml(memberName)}">
        <div class="birthday-logo-wrap"><img src="${LOGO}" alt="Emmanuel Full Gospel Church official logo"></div>
        <div class="birthday-eyebrow">EFGC YOUTH CELEBRATES YOU</div>
        <h3>HAPPY BIRTHDAY</h3>
        <span class="birthday-name">${escapeHtml(memberName)}</span>
        <p class="birthday-blessing">${escapeHtml(blessing || 'May the Lord bless you and keep you, strengthen you, guide you and fill this new year of your life with joy, purpose and His presence.')}</p>
        <div class="birthday-signoff">With love from EFGC Youth</div>
        ${dateText ? `<small class="birthday-date">${escapeHtml(dateText)}</small>` : ''}
      </div>`;
  }

  function scanBirthdayCards(root = document) {
    ['#newsList', '#homeNews'].forEach((selector) => {
      const host = root.matches?.(selector) ? root : root.querySelector?.(selector);
      if (!host) return;
      host.querySelectorAll('.card').forEach(enhanceBirthdayCard);
    });
  }

  function bootBirthdayCards() {
    installBirthdayStyles();
    scanBirthdayCards(document);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches('#newsList,#homeNews')) scanBirthdayCards(node);
          if (node.matches('.card')) enhanceBirthdayCard(node);
          node.querySelectorAll?.('.card').forEach(enhanceBirthdayCard);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootBirthdayCards, { once:true });
  else bootBirthdayCards();
})();