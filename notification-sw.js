/* EFGC Youth v62 notification service worker */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', (event) => {
  const target = event.notification?.data?.target || 'news';
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        client.postMessage({ type: 'EFGC_NOTIFICATION_OPEN', target });
        if ('focus' in client) return client.focus();
      } catch {}
    }
    if (self.clients.openWindow) return self.clients.openWindow('./');
    return null;
  })());
});