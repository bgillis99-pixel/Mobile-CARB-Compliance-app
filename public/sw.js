self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.text() : 'New CARB Compliance Alert';
  
  const options = {
    body: data,
    icon: 'https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=icon&color=003366',
    badge: 'https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=icon&color=003366',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {action: 'explore', title: 'Check Status', icon: 'images/checkmark.png'},
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Mobile Carb Check', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type: 'window'}).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow)
        return clients.openWindow('/');
    })
  );
});