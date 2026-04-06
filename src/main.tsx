import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import './index.css'
import App from './App.tsx'

// 🔥 Gestion PWA (update + offline + install)
let deferredPrompt: any = null

// 👉 Capture event install (Play Store style)
window.addEventListener('beforeinstallprompt', (e: any) => {
  console.log('🚀 beforeinstallprompt déclenché - PWA installable!')
  e.preventDefault()
  deferredPrompt = e

  // 👉 On envoie un event global pour afficher la bannière
  window.dispatchEvent(new Event('pwa-install-available'))
})

// 👉 Détection installation réussie
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA installée avec succès!')
  deferredPrompt = null
})

// 👉 Gestion service worker (vite-plugin-pwa)
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('🔄 Nouvelle version disponible')

    // 👉 event global pour UI
    window.dispatchEvent(new Event('pwa-update-available'))
  },

  onOfflineReady() {
    console.log('✅ App prête en offline')
  }
})

// 👉 Fonction globale install (utilisable partout)
;(window as any).installPWA = async () => {
  if (!deferredPrompt) return

  deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice

  if (choice.outcome === 'accepted') {
    console.log('✅ App installée')
  } else {
    console.log('❌ Installation refusée')
  }

  deferredPrompt = null
}

// 👉 Fonction globale update
;(window as any).updatePWA = () => {
  updateSW(true)
}

// 👉 Render app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)