self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch to satisfy PWA requirements
});

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: {
        chatId: data.chatId
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );

    // If supported, set App Badge
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge().catch(console.error);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Clear the badge when clicked
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(console.error);
  }

  // Open the app or focus if already open
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      const urlToOpen = new URL('/inbox' + (event.notification.data.chatId ? '?chatId=' + event.notification.data.chatId : ''), self.location.origin).href;
      
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
