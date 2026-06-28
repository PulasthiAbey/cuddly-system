self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {
        title: "Fasting Update! ⏱️",
        body: "Your 16-hour fasting window is officially complete. Ready to break-fast!"
    };

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/app_icon.png',
            badge: '/app_icon.png',
            tag: 'fasting-complete',
            requireInteraction: true // Keeps the notification on the lock screen until dismissed
        })
    );
});

// Listener for when you tap the lock-screen notification
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    // Bring the user directly to the nutrition tab of your PWA
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/nutrition');
            }
        })
    );
});
