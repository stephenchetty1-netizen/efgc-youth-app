/** V54 — stable, asset-based welcome screen. Removes fragile embedded data-image rendering. */
(() => {
  const $ = (s) => document.querySelector(s);

  function openLogin(role = 'youth') {
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if (!welcome || !card) return;
    welcome.classList.add('hidden');
    card.classList.remove('mock-login-hidden');
    try { selectRole(role); } catch {}
    card.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    });
  }

  function applyV54() {
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if (!welcome || !card) return;
    if (welcome.dataset.v54 === '1') return;

    welcome.dataset.v54 = '1';
    welcome.className = 'v54-welcome';
    welcome.innerHTML = `
      <div class="v54-backdrop" aria-hidden="true"></div>
      <div class="v54-content">
        <div class="v54-brand-zone">
          <div class="v54-logo-glow">
            <img src="assets/efgc-logo.svg?v=54.0" alt="Emmanuel Full Gospel Church — God with us — Pass on the Baton — Est 1943" class="v54-logo" decoding="async" fetchpriority="high">
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

    $('#v54Login')?.addEventListener('click', () => openLogin('youth'));
    $('#v54Create')?.addEventListener('click', () => openLogin('youth'));

    if (location.hash.includes('access_token') || /type=recovery|code=/.test(location.search)) {
      openLogin('admin');
    }
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(applyV54, 0));
  setTimeout(applyV54, 120);
  setTimeout(applyV54, 600);
  setTimeout(applyV54, 1400);
})();
