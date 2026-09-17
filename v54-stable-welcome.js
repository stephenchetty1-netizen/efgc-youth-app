/** V61 — single-source EFGC Youth welcome screen and official-logo enforcement. */
(() => {
  const $ = (s) => document.querySelector(s);
  const OFFICIAL_LOGO = 'assets/efgc-logo.svg?v=61.0';

  function currentSession() { try { return typeof session !== 'undefined' ? session : null; } catch { return null; } }

  function fixBrandLogos() {
    document.querySelectorAll('.brand-logo,.hero-logo,.official-footer-logo').forEach((img) => {
      img.setAttribute('src', OFFICIAL_LOGO);
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
    requestAnimationFrame(() => card.scrollIntoView({ block: 'start', behavior: 'auto' }));
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

    welcome.className = 'v61-welcome';
    welcome.dataset.v61 = '1';
    welcome.innerHTML = `
      <div class="v61-bg" aria-hidden="true"></div>
      <div class="v61-content">
        <section class="v61-brand" aria-label="Emmanuel Full Gospel Church Youth">
          <span class="v61-note v61-note-left">BUILD<br>BELONG<br>BE A LIGHT</span>
          <div class="v61-logo-halo"><img src="${OFFICIAL_LOGO}" class="v61-logo" alt="Emmanuel Full Gospel Church — God with us — Pass on the Baton — Est 1943" fetchpriority="high"></div>
          <span class="v61-note v61-note-right">GOD<br>WITH<br>US</span>
        </section>
        <section class="v61-youth"><span class="v61-crown" aria-hidden="true">♛</span><h1>YOUTH</h1><div class="v61-brush-line"></div><p>BUILD <b>•</b> BELONG <b>•</b> BE A LIGHT</p></section>
        <section class="v61-verse"><p>Let your light shine<br>before men...</p><strong>Matthew 5:16 (KJV)</strong></section>
        <div class="v61-spacer"></div>
        <div class="v61-actions"><button id="v61Login" type="button" class="v61-login">Login <span>→</span></button><button id="v61Create" type="button" class="v61-create">Create Account <span>→</span></button></div>
        <p class="v61-generation">A GENERATION FOR HIS GLORY</p>
      </div>`;

    card.classList.add('mock-login-card','mock-login-hidden');
    card.querySelectorAll('.v49-back,.v57-back,.v61-back').forEach((el) => el.remove());
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'v61-back ghost-login';
    back.textContent = '← Back to Welcome';
    back.addEventListener('click', showWelcome);
    card.prepend(back);

    $('#v61Login')?.addEventListener('click', () => openLogin('youth'));
    $('#v61Create')?.addEventListener('click', () => openLogin('youth'));

    const recovery = location.hash.includes('access_token') || /type=recovery|code=/.test(location.search);
    const signedIn = Boolean(currentSession()?.uid);
    if (recovery) {
      openLogin('admin');
    } else if (!signedIn) {
      login.classList.remove('hidden');
      welcome.classList.remove('hidden');
      card.classList.add('mock-login-hidden');
    } else {
      welcome.classList.add('hidden');
    }
    return true;
  }

  function boot() {
    buildWelcome();
    setTimeout(fixBrandLogos, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener('pageshow', () => {
    fixBrandLogos();
    if (!currentSession()?.uid) buildWelcome();
  });
})();