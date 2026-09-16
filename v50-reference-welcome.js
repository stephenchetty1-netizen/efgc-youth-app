/** V52 — first approved mockup: logo-first EFGC Youth welcome. */
(() => {
  const $ = (s) => document.querySelector(s);
  const logo = 'assets/efgc-logo.svg?v=52.0';

  function openLogin(role='youth') {
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if (!welcome || !card) return;
    welcome.classList.add('hidden');
    card.classList.remove('mock-login-hidden');
    try { selectRole(role); } catch {}
    card.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
  }

  function applyV52() {
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if (!welcome || !card || welcome.dataset.v52 === '1') return;
    welcome.dataset.v52 = '1';
    welcome.className = 'v52-first-mockup';
    welcome.innerHTML = `
      <div class="v52-inner">
        <div class="v52-logo-orbit">
          <img class="v52-logo" src="${logo}" alt="Emmanuel Full Gospel Church official logo — God with us, Pass on the Baton, Est 1943" fetchpriority="high">
        </div>
        <div class="v52-youth-wrap"><span class="v52-crown" aria-hidden="true">♛</span><h1 class="v52-youth">YOUTH</h1></div>
        <p class="v52-tagline">BUILD <b>•</b> BELONG <b>•</b> BE A LIGHT</p>
        <div class="v52-scripture">
          <p>Let your light shine<br>before men…</p>
          <strong>Matthew 5:16 (KJV)</strong>
        </div>
        <div class="v52-flex"></div>
        <div class="v52-actions">
          <button id="v52Login" class="v52-login" type="button">Login <span>→</span></button>
          <button id="v52Create" class="v52-create" type="button">Create Account <span>→</span></button>
        </div>
        <p class="v52-generation">A GENERATION FOR HIS GLORY</p>
      </div>`;

    $('#v52Login')?.addEventListener('click', () => openLogin('youth'));
    $('#v52Create')?.addEventListener('click', () => openLogin('youth'));
    if (location.hash.includes('access_token') || /type=recovery|code=/.test(location.search)) openLogin('admin');
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(applyV52, 0));
  setTimeout(applyV52, 250);
  setTimeout(applyV52, 900);
})();
