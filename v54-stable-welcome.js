/** V57 — single-source EFGC Youth welcome screen and official-logo enforcement. */
(() => {
  const $ = (s) => document.querySelector(s);
  const OFFICIAL_LOGO = 'assets/efgc-logo.svg?v=57.0';

  function currentSession() {
    try { return typeof session !== 'undefined' ? session : null; } catch { return null; }
  }

  function fixBrandLogos() {
    document.querySelectorAll('.brand-logo,.hero-logo,.official-footer-logo').forEach((img) => {
      if (img.getAttribute('src') !== OFFICIAL_LOGO) img.setAttribute('src', OFFICIAL_LOGO);
      img.classList.remove('reference-logo');
      img.classList.add('official-logo');
      img.style.objectPosition = 'center center';
    });
  }

  function openLogin(role = 'youth') {
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if (!card) return;
    welcome?.classList.add('hidden');
    card.classList.remove('mock-login-hidden');
    try { selectRole(role); } catch {}
    requestAnimationFrame(() => card.scrollIntoView({ block: 'start' }));
  }

  function showWelcome() {
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if (!welcome || !card) return;
    card.classList.add('mock-login-hidden');
    welcome.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'auto' });
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

    welcome.className = 'v57-welcome';
    welcome.dataset.v57 = '1';
    welcome.innerHTML = `
      <div class="v57-bg" aria-hidden="true"></div>
      <div class="v57-content">
        <section class="v57-brand" aria-label="Emmanuel Full Gospel Church Youth">
          <span class="v57-note v57-note-left">BUILD<br>BELONG<br>BE A LIGHT</span>
          <div class="v57-logo-halo">
            <img src="${OFFICIAL_LOGO}" class="v57-logo" alt="Emmanuel Full Gospel Church — God with us — Pass on the Baton — Est 1943" fetchpriority="high" decoding="async">
          </div>
          <span class="v57-note v57-note-right">GOD<br>WITH<br>US</span>
        </section>

        <section class="v57-youth">
          <span class="v57-crown" aria-hidden="true">♛</span>
          <h1>YOUTH</h1>
          <div class="v57-brush-line" aria-hidden="true"></div>
          <p>BUILD <b>•</b> BELONG <b>•</b> BE A LIGHT</p>
        </section>

        <section class="v57-verse">
          <p>Let your light shine<br>before men...</p>
          <strong>Matthew 5:16 (KJV)</strong>
        </section>

        <div class="v57-spacer" aria-hidden="true"></div>

        <div class="v57-actions">
          <button id="v57Login" type="button" class="v57-login">Login <span aria-hidden="true">→</span></button>
          <button id="v57Create" type="button" class="v57-create">Create Account <span aria-hidden="true">→</span></button>
        </div>
        <p class="v57-generation">A GENERATION FOR HIS GLORY</p>
      </div>`;

    card.classList.add('mock-login-card', 'mock-login-hidden');
    card.querySelectorAll('.v49-back,.v57-back').forEach((el) => el.remove());
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'v57-back ghost-login';
    back.textContent = '← Back to Welcome';
    back.addEventListener('click', showWelcome);
    card.prepend(back);

    $('#v57Login')?.addEventListener('click', () => openLogin('youth'));
    $('#v57Create')?.addEventListener('click', () => openLogin('youth'));

    const recovery = location.hash.includes('access_token') || /type=recovery|code=/.test(location.search);
    const signedIn = Boolean(currentSession()?.uid);
    if (recovery) openLogin('admin');
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
      attempts += 1;
      const ok = buildWelcome();
      if (!ok && attempts < 24) setTimeout(run, 100);
    };
    run();
  }

  const logoObserver = new MutationObserver(() => fixBrandLogos());
  logoObserver.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('pageshow', () => setTimeout(buildWelcome, 0));
  setTimeout(buildWelcome, 250);
  setTimeout(buildWelcome, 1000);
})();
