/** V62 — supplied artwork, one welcome owner, and separate sign-in/registration. */
(() => {
  const $ = (s) => document.querySelector(s);
  const OFFICIAL_LOGO = 'assets/efgc-logo.svg?v=62.0';
  const currentSession = () => typeof session !== 'undefined' ? session : null;
  function fixBrandLogos() {
    document.querySelectorAll('.brand-logo,.hero-logo,.official-footer-logo,.login-brand-logo').forEach((img) => {
      if (img.getAttribute('src') !== OFFICIAL_LOGO) img.setAttribute('src', OFFICIAL_LOGO);
      img.classList.remove('reference-logo');
      img.classList.add('official-logo');
    });
  }
  function openLogin(role = 'youth', mode = 'login', focus = true) {
    const card = $('#login .login-card');
    if (!card) return;
    $('#login')?.classList.remove('hidden');
    $('#mockWelcome')?.classList.add('hidden');
    card.classList.remove('mock-login-hidden');
    window.EFGCLogin?.setMode(mode);
    selectRole(role);
    if (focus) requestAnimationFrame(() => {
      card.scrollIntoView({ block: 'start', behavior: 'auto' });
      $('#loginEmail')?.focus({ preventScroll: true });
    });
  }
  function showWelcome() {
    if (window.EFGCPasswordRecovery?.isActive()) return;
    $('#login .login-card')?.classList.add('mock-login-hidden');
    $('#mockWelcome')?.classList.remove('hidden');
    $('#v61Login')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  function buildWelcome() {
    fixBrandLogos();
    const login = $('#login');
    const card = $('#login .login-card');
    if (!login || !card) return;
    if (!$('#mockWelcome')) {
      const welcome = document.createElement('div');
      welcome.id = 'mockWelcome';
      welcome.className = 'v61-welcome';
      welcome.innerHTML = `
        <div class="welcome-artwork">
          <img class="welcome-image" src="assets/efgc-youth-welcome.jpg?v=62.0" width="864" height="1536" fetchpriority="high" alt="EFGC Youth. Build, belong, be a light. Let your light shine before men — Matthew 5:16. A generation for His glory.">
          <h1 class="visually-hidden">EFGC Youth</h1>
          <div class="v61-actions">
            <button id="v61Login" type="button" class="v61-login">Login <span aria-hidden="true">→</span></button>
            <button id="v61Create" type="button" class="v61-create">Create Account <span aria-hidden="true">→</span></button>
          </div>
        </div>`;
      login.insertBefore(welcome, card);
      $('#v61Login').addEventListener('click', () => openLogin('youth', 'login'));
      $('#v61Create').addEventListener('click', () => openLogin('youth', 'register'));
      card.classList.add('mock-login-card', 'mock-login-hidden');
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'v61-back ghost-login';
      back.textContent = '← Back to Welcome';
      back.addEventListener('click', showWelcome);
      card.prepend(back);
    }
    if (window.EFGCPasswordRecovery?.isActive()) {
      openLogin('admin', 'login', false);
      window.EFGCPasswordRecovery.showForm();
    } else if (currentSession()?.uid) {
      $('#mockWelcome').classList.add('hidden');
    }
  }
  window.EFGCWelcome = { openLogin, showWelcome };
  document.addEventListener('efgc:auth-form', (event) => {
    buildWelcome();
    openLogin(event.detail?.role || 'youth', event.detail?.mode || 'login', false);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildWelcome, { once: true });
  else buildWelcome();
  window.addEventListener('pageshow', fixBrandLogos);
})();
