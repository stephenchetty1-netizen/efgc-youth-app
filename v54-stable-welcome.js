/** V56 — robust welcome bootstrap. It creates its own UI and does not depend on older welcome scripts. */
(() => {
  const $ = (s) => document.querySelector(s);

  function currentSession() {
    try { return typeof session !== 'undefined' ? session : null; } catch { return null; }
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

  function buildWelcome() {
    const login = $('#login');
    const card = $('#login .login-card');
    if (!login || !card) return false;

    let welcome = $('#mockWelcome');
    if (!welcome) {
      welcome = document.createElement('div');
      welcome.id = 'mockWelcome';
      login.insertBefore(welcome, card);
    }

    welcome.className = 'v54-welcome';
    welcome.dataset.v56 = '1';
    welcome.innerHTML = `
      <div class="v54-backdrop" aria-hidden="true"></div>
      <div class="v54-content">
        <div class="v54-brand-zone">
          <div class="v54-logo-glow">
            <img src="assets/efgc-logo.svg?v=56.0" alt="Emmanuel Full Gospel Church — God with us — Pass on the Baton — Est 1943" class="v54-logo" decoding="async" fetchpriority="high">
          </div>
          <span class="v54-side-note v54-left-note">BUILD<br>BELONG<br>BE A LIGHT</span>
          <span class="v54-side-note v54-right-note">GOD<br>WITH<br>US</span>
        </div>
        <div class="v54-youth-zone">
          <span class="v54-crown" aria-hidden="true">♛</span>
          <h1>YOUTH</h1>
          <div class="v54-gold-stroke" aria-hidden="true"></div>
          <p>BUILD <b>•</b> BELONG <b>•</b> BE A LIGHT</p>
        </div>
        <div class="v54-verse">
          <p>Let your light shine<br>before men...</p>
          <strong>Matthew 5:16 (KJV)</strong>
        </div>
        <div class="v54-fill" aria-hidden="true"></div>
        <div class="v54-actions">
          <button id="v54Login" type="button" class="v54-login">Login <span aria-hidden="true">→</span></button>
          <button id="v54Create" type="button" class="v54-create">Create Account <span aria-hidden="true">→</span></button>
        </div>
        <p class="v54-generation">A GENERATION FOR HIS GLORY</p>
      </div>`;

    card.classList.add('mock-login-card', 'mock-login-hidden');

    $('#v54Login')?.addEventListener('click', () => openLogin('youth'));
    $('#v54Create')?.addEventListener('click', () => openLogin('youth'));

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
      if (!ok && attempts < 20) setTimeout(run, 100);
    };
    run();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.addEventListener('pageshow', () => setTimeout(buildWelcome, 0));
  setTimeout(buildWelcome, 250);
  setTimeout(buildWelcome, 1000);
})();
