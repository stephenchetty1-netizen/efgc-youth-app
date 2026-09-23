/** EFGC Youth v62 — live News/Event alert system. */
(() => {
  const POLL_VISIBLE_MS = 15000;
  const POLL_HIDDEN_MS = 60000;
  const HISTORY_LIMIT = 25;
  const SNAPSHOT_LIMIT = 80;
  const KEY_PREFIX = 'efgcNotificationsV62';
  const deviceSupported = () => ('Notification' in window) && window.isSecureContext;
  let timer = null;
  let busy = false;
  let initializedUser = null;

  const $ = (s) => document.querySelector(s);
  const escHtml = (v = '') => String(v).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  function userId() { return window.EFGCAuth?.userId?.() || null; }
  function key(name) { return `${KEY_PREFIX}:${userId() || 'guest'}:${name}`; }
  function readJSON(name, fallback) {
    try { return JSON.parse(localStorage.getItem(key(name)) || 'null') ?? fallback; } catch { return fallback; }
  }
  function writeJSON(name, value) { localStorage.setItem(key(name), JSON.stringify(value)); }

  function isSignedIn() {
    return Boolean(userId() && window.EFGCAuth?.accessToken?.());
  }

  function permissionText() {
    if (!deviceSupported()) return 'In-app News and Event alerts are active while EFGC Youth is open. Device push notifications are not supported in this installation.';
    if (Notification.permission === 'granted') return 'Device notifications are enabled.';
    if (Notification.permission === 'denied') return 'Device notifications are blocked in browser settings.';
    return 'Enable device notifications to receive alerts while the app is open or running in the background.';
  }

  function updateBell() {
    const unread = Number(readJSON('unread', 0)) || 0;
    const badge = $('#efgcNotifyBadge');
    if (badge) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.classList.toggle('hidden', unread < 1);
    }
    const status = $('#efgcNotifyPermission');
    if (status) status.textContent = permissionText();
    const enable = $('#efgcEnableNotifications');
    if (enable) {
      enable.textContent = !deviceSupported() ? 'In-app alerts active' : Notification.permission === 'granted' ? 'Device notifications enabled' : 'Enable device notifications';
      enable.disabled = !deviceSupported() || Notification.permission === 'granted';
    }
  }

  function renderHistory() {
    const host = $('#efgcNotifyList');
    if (!host) return;
    const history = readJSON('history', []);
    if (!history.length) {
      host.innerHTML = '<div class="efgc-notify-empty">No new alerts yet.</div>';
      return;
    }
    host.innerHTML = history.map((n) => `
      <button type="button" class="efgc-notify-item" data-target="${escHtml(n.target || 'news')}">
        <span class="efgc-notify-item-icon">${n.kind === 'event' ? '📅' : n.kind === 'birthday' ? '🎉' : '🔔'}</span>
        <span><strong>${escHtml(n.title)}</strong><small>${escHtml(n.body)}</small><time>${escHtml(n.timeLabel || '')}</time></span>
      </button>`).join('');
    host.querySelectorAll('.efgc-notify-item').forEach((b) => b.addEventListener('click', () => {
      closePanel();
      openTarget(b.dataset.target || 'news');
    }));
  }

  function markAllRead() {
    writeJSON('unread', 0);
    updateBell();
  }

  function openPanel() {
    const panel = $('#efgcNotifyPanel');
    if (!panel) return;
    renderHistory();
    updateBell();
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    markAllRead();
  }

  function closePanel() {
    const panel = $('#efgcNotifyPanel');
    if (!panel) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  function openTarget(target) {
    const tab = target === 'events' ? 'events' : 'news';
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    if (btn) btn.click();
    else if (typeof window.showTab === 'function') window.showTab(tab);
  }

  function toast(n) {
    const wrap = $('#efgcNotifyToasts');
    if (!wrap) return;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'efgc-notify-toast';
    el.innerHTML = `<span>${n.kind === 'event' ? '📅' : n.kind === 'birthday' ? '🎉' : '🔔'}</span><div><strong>${escHtml(n.title)}</strong><small>${escHtml(n.body)}</small></div>`;
    el.addEventListener('click', () => { openTarget(n.target); el.remove(); });
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 7500);
  }

  async function deviceNotify(n) {
    if (!deviceSupported() || Notification.permission !== 'granted') return;
    const options = {
      body: n.body,
      icon: 'assets/efgc-logo.svg?v=60.0',
      badge: 'assets/efgc-logo.svg?v=60.0',
      tag: `efgc-${n.kind}-${n.id}`,
      renotify: false,
      data: { target: n.target },
    };
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(n.title, options);
        return;
      }
    } catch {}
    try {
      const note = new Notification(n.title, options);
      note.onclick = () => { window.focus(); openTarget(n.target); note.close(); };
    } catch {}
  }

  function addAlert(n) {
    const history = readJSON('history', []);
    history.unshift(n);
    writeJSON('history', history.slice(0, HISTORY_LIMIT));
    writeJSON('unread', (Number(readJSON('unread', 0)) || 0) + 1);
    updateBell();
    renderHistory();
    toast(n);
    deviceNotify(n);
  }

  function labelTime(iso) {
    const d = iso ? new Date(iso) : new Date();
    try { return d.toLocaleString('en-ZA', { dateStyle:'medium', timeStyle:'short' }); } catch { return d.toLocaleString(); }
  }

  function newsAlert(row) {
    const birthday = row.post_type === 'birthday';
    const body = birthday && row.member_name
      ? `Happy Birthday, ${row.member_name}! A birthday message has been posted.`
      : String(row.content || 'A new EFGC Youth post is available.').replace(/\s+/g, ' ').trim().slice(0, 150);
    return {
      id: row.id,
      kind: birthday ? 'birthday' : 'news',
      title: birthday ? 'EFGC Birthday Celebration 🎉' : 'New EFGC Youth Post',
      body,
      target: 'news',
      createdAt: row.published_at || new Date().toISOString(),
      timeLabel: labelTime(row.published_at),
    };
  }

  function eventAlert(row) {
    const date = row.event_date ? new Date(`${row.event_date}T00:00:00`).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' }) : '';
    return {
      id: row.id,
      kind: 'event',
      title: 'New EFGC Youth Event',
      body: `${row.title || 'New event'}${date ? ` • ${date}` : ''}`,
      target: 'events',
      createdAt: row.created_at || new Date().toISOString(),
      timeLabel: labelTime(row.created_at),
    };
  }

  async function fetchLatest() {
    const [news, events] = await Promise.all([
      EFGCAuth.rest('news_posts?select=id,content,published_at,post_type,member_name&is_published=eq.true&order=published_at.desc&limit=50'),
      EFGCAuth.rest('events?select=id,title,event_date,created_at&order=created_at.desc&limit=50'),
    ]);
    return { news: Array.isArray(news) ? news : [], events: Array.isArray(events) ? events : [] };
  }

  function snapshotIds(rows) { return rows.map((r) => String(r.id)).slice(0, SNAPSHOT_LIMIT); }

  async function poll() {
    if (busy || !isSignedIn() || !window.EFGCAuth?.rest) return;
    busy = true;
    try {
      const uid = userId();
      const account = typeof session!=='undefined' ? session : null;
      const { news, events } = await fetchLatest();
      if(userId()!==uid || (typeof session!=='undefined' ? session : null)!==account) return;
      const seenNews = readJSON('seenNews', null);
      const seenEvents = readJSON('seenEvents', null);

      if (initializedUser !== uid || !Array.isArray(seenNews) || !Array.isArray(seenEvents)) {
        writeJSON('seenNews', snapshotIds(news));
        writeJSON('seenEvents', snapshotIds(events));
        initializedUser = uid;
        return;
      }

      const seenNewsSet = new Set(seenNews);
      const seenEventsSet = new Set(seenEvents);
      const newNews = news.filter((r) => !seenNewsSet.has(String(r.id))).reverse();
      const newEvents = events.filter((r) => !seenEventsSet.has(String(r.id))).reverse();

      writeJSON('seenNews', snapshotIds(news));
      writeJSON('seenEvents', snapshotIds(events));

      const alerts = [...newNews.map(newsAlert), ...newEvents.map(eventAlert)]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      if (alerts.length > 4) {
        const latest = alerts[alerts.length - 1];
        addAlert({
          id: `batch-${Date.now()}`,
          kind: 'news',
          title: `${alerts.length} new EFGC Youth updates`,
          body: `There are new posts and events waiting for you. Latest: ${latest.title}`,
          target: 'news',
          createdAt: new Date().toISOString(),
          timeLabel: labelTime(new Date().toISOString()),
        });
      } else {
        alerts.forEach(addAlert);
      }
    } catch (e) {
      if (e?.status !== 401) console.warn('EFGC notifications poll failed:', e?.message || e);
    } finally {
      busy = false;
    }
  }

  function schedule() {
    clearInterval(timer);
    timer = setInterval(poll, document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS);
  }

  async function enableDeviceNotifications() {
    if (!deviceSupported()) {
      updateBell();
      return;
    }
    try {
      const p = await Notification.requestPermission();
      updateBell();
      if (p === 'granted') {
        addAlert({ id:`enabled-${Date.now()}`, kind:'news', title:'EFGC Youth Notifications Enabled', body:'You will receive alerts for new posts and events while the app is active.', target:'news', createdAt:new Date().toISOString(), timeLabel:labelTime(new Date().toISOString()) });
      }
    } catch (e) {
      const text = $('#efgcNotifyPermission');
      if (text) text.textContent = 'Device notifications could not be enabled. In-app alerts remain active while this app is open.';
    }
  }

  function injectUI() {
    if ($('#efgcNotifyBell')) return;
    const header = document.querySelector('header');
    if (!header) return;

    const bell = document.createElement('button');
    bell.id = 'efgcNotifyBell';
    bell.className = 'efgc-notify-bell';
    bell.type = 'button';
    bell.setAttribute('aria-label', 'Notifications');
    bell.innerHTML = '<span aria-hidden="true">🔔</span><b id="efgcNotifyBadge" class="efgc-notify-badge hidden">0</b>';
    bell.addEventListener('click', openPanel);
    header.appendChild(bell);

    const panel = document.createElement('aside');
    panel.id = 'efgcNotifyPanel';
    panel.className = 'efgc-notify-panel';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = `
      <div class="efgc-notify-panel-head"><div><small>EFGC YOUTH</small><h3>Notifications</h3></div><button id="efgcNotifyClose" type="button" aria-label="Close notifications">×</button></div>
      <p id="efgcNotifyPermission" class="efgc-notify-permission"></p>
      <button id="efgcEnableNotifications" class="efgc-notify-enable" type="button">Enable Notifications</button>
      <div id="efgcNotifyList" class="efgc-notify-list"></div>`;
    document.body.appendChild(panel);
    $('#efgcNotifyClose')?.addEventListener('click', closePanel);
    $('#efgcEnableNotifications')?.addEventListener('click', enableDeviceNotifications);

    const toastWrap = document.createElement('div');
    toastWrap.id = 'efgcNotifyToasts';
    toastWrap.className = 'efgc-notify-toasts';
    document.body.appendChild(toastWrap);

    const securityGrid = document.querySelector('#security .security-grid');
    if (securityGrid) {
      const card = document.createElement('article');
      card.className = 'card efgc-notify-security-card';
      card.innerHTML = '<h3>🔔 Post & Event Alerts</h3><p>In-app alerts appear while EFGC Youth is open. Device push is available only in supported installations.</p><button id="efgcEnableNotificationsSecurity" class="primary-login" type="button">Notification settings</button>';
      securityGrid.appendChild(card);
      $('#efgcEnableNotificationsSecurity')?.addEventListener('click', enableDeviceNotifications);
    }

    updateBell();
    const securityButton = $('#efgcEnableNotificationsSecurity');
    if (securityButton && !deviceSupported()) {
      securityButton.disabled = true;
      securityButton.textContent = 'In-app alerts active';
    }
    renderHistory();
  }

  async function registerServiceWorker() {
    if (!deviceSupported() || !('serviceWorker' in navigator)) return;
    try { await navigator.serviceWorker.register('notification-sw.js?v=62.0', { scope: './' }); } catch (e) { console.warn('Notification service worker unavailable:', e?.message || e); }
  }

  function boot() {
    injectUI();
    registerServiceWorker();
    setTimeout(poll, 2500);
    schedule();
    document.addEventListener('visibilitychange', () => { schedule(); if (!document.hidden) poll(); });
    window.addEventListener('focus', poll);
    window.addEventListener('storage', (e) => {
      if (e.key === 'efgcYouthSession' || e.key === 'efgcSupabaseAuth') setTimeout(poll, 700);
    });
    navigator.serviceWorker?.addEventListener?.('message', (e) => {
      if (e.data?.type === 'EFGC_NOTIFICATION_OPEN') openTarget(e.data.target || 'news');
    });
  }

  window.EFGCNotifications = { poll, openPanel, enableDeviceNotifications };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();