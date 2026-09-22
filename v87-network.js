(function EFGCV87Network() {
  'use strict';
  const $ = (s) => document.querySelector(s);
  let lastIssue = '';
  let busy = false;
  const text = (s) => String(s || '');
  function banner() {
    let root = $('#v87NetworkNotice');
    if (root) return root;
    root = document.createElement('aside');
    root.id = 'v87NetworkNotice';
    root.className = 'v87-network-notice hidden';
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.innerHTML = '<strong>Connection notice</strong><p id="v87NetworkText"></p><button id="v87NetworkRetry" type="button">Retry connection</button>';
    document.querySelector('main')?.prepend(root);
    $('#v87NetworkRetry')?.addEventListener('click', retry);
    return root;
  }
  function notice(value) {
    lastIssue = text(value);
    const box = banner();
    if (!box) return;
    const p = $('#v87NetworkText');
    if (p) p.textContent = lastIssue;
    box.classList.remove('hidden');
  }
  function clear() {
    lastIssue = '';
    $('#v87NetworkNotice')?.classList.add('hidden');
  }
  function networkError(error) {
    const m = text(error?.message || error);
    return /failed to fetch|networkerror|network request failed|load failed|fetch.*failed|internet.*connection/i.test(m);
  }
  async function retry() {
    if (busy) return;
    busy = true;
    const button = $('#v87NetworkRetry');
    if (button) { button.disabled = true; button.textContent = 'Checking…'; }
    try {
      if (!window.EFGCAuth?.accessToken?.()) {
        notice('Check your internet connection, then use Sign In again. No account details were changed.');
        return;
      }
      const current = await window.EFGCAuth.getMyProfile();
      if (!current?.id) throw new Error('Unable to confirm your account. Please sign in again.');
      if (current.archived_at) throw new Error('This account is archived. Contact an EFGC Youth Admin.');
      await window.refreshEFGCSessionRole?.();
      await window.renderLiveData?.();
      clear();
    } catch (error) {
      notice(networkError(error)
        ? 'Could not reach EFGC services. Check Wi-Fi or mobile data. If the installed app keeps failing, try the secure HTTPS website.'
        : text(error.message || 'Could not refresh the app.'));
    } finally {
      busy = false;
      if (button?.isConnected) { button.disabled = false; button.textContent = 'Retry connection'; }
    }
  }
  if (window.EFGCAuth?.rest) {
    const originalRest = window.EFGCAuth.rest.bind(window.EFGCAuth);
    window.EFGCAuth.rest = async (path, options = {}) => {
      try { return await originalRest(path, options); }
      catch (error) {
        if (networkError(error)) {
          notice('EFGC could not reach the server. Check your connection and tap Retry. Your last action may not have completed.');
        }
        throw error;
      }
    };
  }
  window.EFGCNetwork = { notice, clear, retry, networkError };
  const boot = () => {
    banner();
    if (location.protocol !== 'https:' && !['http:', 'capacitor:'].includes(location.protocol)) {
      notice('This installation is not using the secure HTTPS web origin. If sign-in fails, use the secure EFGC website or update the Android wrapper.');
    } else if (navigator.onLine === false) {
      notice('You appear to be offline. Reconnect to open live EFGC features.');
    }
  };
  window.addEventListener('offline', () => notice('Your device is offline. Live EFGC updates need an internet connection.'));
  window.addEventListener('online', () => { if (lastIssue) notice('Connection restored. Tap Retry to refresh your EFGC information.'); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
