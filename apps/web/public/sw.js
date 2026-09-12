/* CCT Intelligence — Web Push service worker */
self.addEventListener('push', (event) => {
  let data = { title: 'CCT Intelligence', body: 'Nova notificação', url: '/alertas' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'CCT Intelligence', {
      body: data.body || '',
      tag: data.tag || 'cct-alert',
      data: { url: data.url || '/alertas' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/alertas';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
