// Exemple minimal pour push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const title = data.title || 'Nouvelle notification'
  const options = {
    body: data.body || 'Vous avez un message.',
    icon: 'pwa-192x192.png',
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Update automatique
self.addEventListener('install', (event) => {
  self.skipWaiting() // force l'installation du SW
})

self.addEventListener('activate', (event) => {
  clients.claim() // active le SW immédiatement
})