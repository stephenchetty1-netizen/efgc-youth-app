/** V51 — selected logo-first welcome mockup, preserving the existing auth flow. */
(() => {
  const $ = (s) => document.querySelector(s);
  const logo = 'assets/efgc-logo-reference.webp?v=51.0';

  function openLogin(role='youth') {
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if (!welcome || !card) return;
    welcome.classList.add('hidden');
    card.classList.remove('mock-login-hidden');
    try { selectRole(role); } catch {}
    card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function applySelectedMockup() {
    const welcome = $('#mockWelcome');
    const card = $('#login .login-card');
    if (!welcome || !card || welcome.dataset.v51 === '1') return;
    welcome.dataset.v51 = '1';
    welcome.className = 'v51-selected-welcome';
    welcome.innerHTML = `
      <div class="v51-welcome-inner">
        <div class="v51-logo-stage">
          <img class="v51-logo" src="${logo}" alt="Emmanuel Full Gospel Church official logo" decoding="async" fetchpriority="high">
        </div>
        <div class="v51-youth-wrap">
          <span class="v51-crown" aria-hidden="true">♛</span>
          <h1 class="v51-youth">YOUTH</h1>
        </div>
        <p class="v51-tagline">BUILD <i>•</i> BELONG <i>•</i> BE A LIGHT</p>
        <p class="v51-verse"><strong>Matthew 5:16</strong> (KJV)</p>
        <div class="v51-spacer" aria-hidden="true"></div>
        <p class="v51-light-line">LET YOUR <strong>LIGHT</strong> SHINE<br>BEFORE MEN…</p>
        <div class="v51-actions">
          <button id="v51LoginButton" class="v51-login" type="button">Login</button>
          <button id="v51CreateButton" class="v51-create" type="button">Create Account</button>
        </div>
        <p class="v51-generation">A GENERATION FOR HIS GLORY</p>
      </div>`;

    $('#v51LoginButton')?.addEventListener('click', () => openLogin('youth'));
    $('#v51CreateButton')?.addEventListener('click', () => openLogin('youth'));
    if (location.hash.includes('access_token') || /type=recovery|code=/.test(location.search)) openLogin('admin');
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(applySelectedMockup, 0));
  setTimeout(applySelectedMockup, 250);
  setTimeout(applySelectedMockup, 900);
})();
