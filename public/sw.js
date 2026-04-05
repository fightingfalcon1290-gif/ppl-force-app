const CACHE = 'ppl-force-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// ─── Push受信 ──────────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;

  const data = e.data.json();
  const { title, body, workout, notificationId } = data;

  const options = {
    body: body ?? `${workout}トレーニングの時間です！`,
    icon: '/icon.png',
    badge: '/badge.png',
    tag: notificationId ?? 'ppl-push',
    actions: [
      { action: 'start',  title: '▶ 今すぐ開始'   },
      { action: 'snooze', title: '⏰ スヌーズ 10分' }
    ],
    data: { workout, notificationId, url: `/?action=start&workout=${encodeURIComponent(workout)}` },
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300]
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ─── 通知クリック ────────────────────────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  const { action } = e;
  const { workout, notificationId, url } = e.notification.data ?? {};
  e.notification.close();

  if (action === 'snooze') {
    e.waitUntil(
      fetch('/.netlify/functions/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, workout })
      }).then(() => {
        return self.registration.showNotification('PPL FORCE — スヌーズ設定完了', {
          body: `${workout}の通知を10分後に再送します`,
          icon: '/icon.png',
          tag: 'snooze-confirm'
        });
      }).catch(console.error)
    );
    return;
  }

  // 開始 or タップ
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'START_TIMER', workout });
          return client.focus();
        }
      }
      return clients.openWindow(url ?? '/');
    })
  );
});
